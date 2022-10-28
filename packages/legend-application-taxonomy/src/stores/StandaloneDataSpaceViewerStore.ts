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

import { TAB_SIZE } from '@finos/legend-application';
import {
  type DataSpaceAnalysisResult,
  DataSpaceViewerState,
  DSL_DataSpace_getGraphManagerExtension,
  retrieveAnalyticsResultCache,
  retrieveDependencyEntities,
} from '@finos/legend-extension-dsl-data-space';
import type { ClassView } from '@finos/legend-extension-dsl-diagram';
import { BasicGraphManagerState } from '@finos/legend-graph';
import { type Entity, parseGAVCoordinates } from '@finos/legend-storage';
import {
  type DepotServerClient,
  ProjectData,
} from '@finos/legend-server-depot';
import {
  type GeneratorFn,
  type PlainObject,
  ActionState,
  assertErrorThrown,
} from '@finos/legend-shared';
import { makeObservable, flow, observable, flowResult } from 'mobx';
import type { LegendTaxonomyPluginManager } from '../application/LegendTaxonomyPluginManager.js';
import type { LegendTaxonomyApplicationStore } from './LegendTaxonomyBaseStore.js';
import {
  EXTERNAL_APPLICATION_NAVIGATION__generateDataSpaceQueryEditorUrl,
  type LegendTaxonomyStandaloneDataSpaceViewerPathParams,
} from './LegendTaxonomyRouter.js';
import {
  createViewProjectHandler,
  createViewSDLCProjectHandler,
} from './LegendTaxonomyDataSpaceViewerHelper.js';

export class StandaloneDataSpaceViewerStore {
  applicationStore: LegendTaxonomyApplicationStore;
  depotServerClient: DepotServerClient;
  graphManagerState: BasicGraphManagerState;
  pluginManager: LegendTaxonomyPluginManager;

  initState = ActionState.create();
  viewerState?: DataSpaceViewerState | undefined;

  constructor(
    applicationStore: LegendTaxonomyApplicationStore,
    depotServerClient: DepotServerClient,
  ) {
    makeObservable(this, {
      viewerState: observable,
      initialize: flow,
    });
    this.applicationStore = applicationStore;
    this.depotServerClient = depotServerClient;
    this.graphManagerState = new BasicGraphManagerState(
      applicationStore.pluginManager,
      applicationStore.log,
    );
    this.pluginManager = applicationStore.pluginManager;
  }

  *initialize(
    params: LegendTaxonomyStandaloneDataSpaceViewerPathParams,
  ): GeneratorFn<void> {
    this.initState.inProgress();
    this.initState.setMessage(`Initializing...`);
    try {
      const { gav, dataSpacePath } = params;
      const { groupId, artifactId, versionId } = parseGAVCoordinates(gav);

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
      this.initState.setMessage(`Fetching project...`);
      const project = ProjectData.serialization.fromJson(
        (yield flowResult(
          this.depotServerClient.getProject(groupId, artifactId),
        )) as PlainObject<ProjectData>,
      );

      // fetch entities
      this.initState.setMessage(`Fetching entities...`);
      const entities = (yield this.depotServerClient.getEntities(
        project,
        versionId,
      )) as Entity[];

      // analyze data space
      const analysisResult = (yield DSL_DataSpace_getGraphManagerExtension(
        this.graphManagerState.graphManager,
      ).analyzeDataSpace(
        dataSpacePath,
        entities,
        () =>
          retrieveDependencyEntities(
            project,
            versionId,
            this.depotServerClient,
          ),
        () =>
          retrieveAnalyticsResultCache(
            project.groupId,
            project.artifactId,
            versionId,
            dataSpacePath,
            this.depotServerClient,
          ),
        this.initState,
      )) as DataSpaceAnalysisResult;

      this.viewerState = new DataSpaceViewerState(
        this.applicationStore,
        groupId,
        artifactId,
        versionId,
        analysisResult,
        {
          viewProject: createViewProjectHandler(this.applicationStore),
          viewSDLCProject: createViewSDLCProjectHandler(
            this.applicationStore,
            this.depotServerClient,
          ),
          onDiagramClassDoubleClick: (classView: ClassView): void =>
            this.queryDataSpace(classView.class.value.path),
        },
      );
      this.initState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.initState.fail();
      this.applicationStore.notifyError(error);
    } finally {
      this.initState.setMessage(undefined);
    }
  }

  queryDataSpace(classPath?: string | undefined): void {
    if (this.viewerState) {
      this.applicationStore.navigator.visitAddress(
        EXTERNAL_APPLICATION_NAVIGATION__generateDataSpaceQueryEditorUrl(
          this.applicationStore.config.queryUrl,
          this.viewerState.groupId,
          this.viewerState.artifactId,
          this.viewerState.versionId,
          this.viewerState.dataSpaceAnalysisResult.path,
          this.viewerState.currentExecutionContext.name,
          this.viewerState.currentRuntime ===
            this.viewerState.currentExecutionContext.defaultRuntime
            ? undefined
            : this.viewerState.currentRuntime.path,
          classPath,
        ),
      );
    }
  }
}
