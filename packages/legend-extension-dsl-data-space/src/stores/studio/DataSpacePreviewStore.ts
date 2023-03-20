/**
 * Copyright (c) 2020-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  retrieveProjectEntitiesWithDependencies,
  type DepotServerClient,
  ProjectData,
} from '@finos/legend-server-depot';
import type { LegendStudioApplicationStore } from '@finos/legend-application-studio';
import {
  ActionState,
  assertErrorThrown,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import { flow, flowResult, makeObservable, observable } from 'mobx';
import { DataSpaceViewerState } from '../DataSpaceViewerState.js';
import { DSL_DataSpace_getGraphManagerExtension } from '../../graphManager/protocol/pure/DSL_DataSpace_PureGraphManagerExtension.js';
import { BasicGraphManagerState } from '@finos/legend-graph';
import { retrieveAnalyticsResultCache } from '../../graphManager/action/analytics/DataSpaceAnalysisHelper.js';
import type { DataSpaceAnalysisResult } from '../../graphManager/action/analytics/DataSpaceAnalysis.js';
import type { ClassView } from '@finos/legend-extension-dsl-diagram';
import { TAB_SIZE } from '@finos/legend-application';

export class DataSpacePreviewStore {
  readonly applicationStore: LegendStudioApplicationStore;
  readonly depotServerClient: DepotServerClient;
  readonly graphManagerState: BasicGraphManagerState;

  readonly groupId: string;
  readonly artifactId: string;
  readonly versionId: string;
  readonly dataSpacePath: string;

  readonly loadDataSpaceState = ActionState.create();
  dataSpaceViewerState?: DataSpaceViewerState | undefined;

  constructor(
    applicationStore: LegendStudioApplicationStore,
    depotServerClient: DepotServerClient,
    groupId: string,
    artifactId: string,
    versionId: string,
    dataSpacePath: string,
  ) {
    makeObservable(this, {
      dataSpaceViewerState: observable,
      initialize: flow,
    });

    this.applicationStore = applicationStore;
    this.applicationStore.assistantService.setIsHidden(true);

    this.depotServerClient = depotServerClient;
    this.graphManagerState = new BasicGraphManagerState(
      applicationStore.pluginManager,
      applicationStore.logService,
    );

    this.groupId = groupId;
    this.artifactId = artifactId;
    this.versionId = versionId;
    this.dataSpacePath = dataSpacePath;
  }

  *initialize(): GeneratorFn<void> {
    this.loadDataSpaceState.inProgress();
    this.loadDataSpaceState.setMessage(`Initializing...`);

    try {
      const groupId = this.groupId;
      const artifactId = this.artifactId;
      const versionId = this.versionId;

      // initialize
      yield this.graphManagerState.graphManager.initialize(
        {
          env: this.applicationStore.config.env,
          tabSize: TAB_SIZE,
          clientConfig: {
            baseUrl: this.applicationStore.config.engineServerUrl,
            queryBaseUrl: this.applicationStore.config.engineQueryServerUrl,
            enableCompression: true,
          },
        },
        {
          tracerService: this.applicationStore.tracerService,
        },
      );

      // fetch project
      this.loadDataSpaceState.setMessage(`Fetching project...`);
      const project = ProjectData.serialization.fromJson(
        (yield flowResult(
          this.depotServerClient.getProject(groupId, artifactId),
        )) as PlainObject<ProjectData>,
      );

      // analyze data space
      const analysisResult = (yield DSL_DataSpace_getGraphManagerExtension(
        this.graphManagerState.graphManager,
      ).analyzeDataSpace(
        this.dataSpacePath,
        () =>
          retrieveProjectEntitiesWithDependencies(
            project,
            versionId,
            this.depotServerClient,
          ),
        () =>
          retrieveAnalyticsResultCache(
            project,
            versionId,
            this.dataSpacePath,
            this.depotServerClient,
          ),
        this.loadDataSpaceState,
      )) as DataSpaceAnalysisResult;

      this.dataSpaceViewerState = new DataSpaceViewerState(
        this.applicationStore,
        this.graphManagerState,
        groupId,
        artifactId,
        versionId,
        analysisResult,
        {
          viewProject: () => {
            this.applicationStore.notificationService.notifyWarning(
              'This feature is not supported in preview mode',
            );
          },
          viewSDLCProject: async () => {
            this.applicationStore.notificationService.notifyWarning(
              'This feature is not supported in preview mode',
            );
          },
          onDiagramClassDoubleClick: (classView: ClassView): void => {
            this.applicationStore.notificationService.notifyWarning(
              'This feature is not supported in preview mode',
            );
          },
        },
        {
          HACKY__previewExperimentalFeatures:
            this.applicationStore.config.options
              .HACKY__previewExperimentalFeatures,
        },
      );
      this.loadDataSpaceState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.loadDataSpaceState.fail();
      this.applicationStore.notificationService.notifyError(error);
    } finally {
      this.loadDataSpaceState.setMessage(undefined);
    }
  }
}
