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
  LEGEND_APPLICATION_COLOR_THEME,
  TAB_SIZE,
  type NavigationZone,
} from '@finos/legend-application';
import {
  type DataSpaceAnalysisResult,
  DataSpaceViewerState,
  DSL_DataSpace_getGraphManagerExtension,
  retrieveAnalyticsResultCache,
} from '@finos/legend-extension-dsl-data-space';
import type { ClassView } from '@finos/legend-extension-dsl-diagram';
import { BasicGraphManagerState } from '@finos/legend-graph';
import { parseGAVCoordinates } from '@finos/legend-storage';
import {
  type DepotServerClient,
  ProjectData,
  retrieveProjectEntitiesWithDependencies,
} from '@finos/legend-server-depot';
import {
  type GeneratorFn,
  type PlainObject,
  ActionState,
  assertErrorThrown,
} from '@finos/legend-shared';
import { makeObservable, flow, observable, flowResult } from 'mobx';
import type { LegendTaxonomyPluginManager } from '../../application/LegendTaxonomyPluginManager.js';
import type { LegendTaxonomyApplicationStore } from '../LegendTaxonomyBaseStore.js';
import { EXTERNAL_APPLICATION_NAVIGATION__generateDataSpaceQueryEditorUrl } from '../../application/LegendTaxonomyNavigation.js';
import {
  createViewProjectHandler,
  createViewSDLCProjectHandler,
} from '../LegendTaxonomyDataSpaceViewerHelper.js';

export class DataSpacePreviewStore {
  readonly applicationStore: LegendTaxonomyApplicationStore;
  readonly depotServerClient: DepotServerClient;
  readonly graphManagerState: BasicGraphManagerState;
  readonly pluginManager: LegendTaxonomyPluginManager;

  readonly initState = ActionState.create();

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
      applicationStore.logService,
    );
    this.pluginManager = applicationStore.pluginManager;
  }

  *initialize(gav: string, dataSpacePath: string): GeneratorFn<void> {
    // set up the application
    this.applicationStore.assistantService.setIsHidden(true);
    this.applicationStore.layoutService.setColorTheme(
      LEGEND_APPLICATION_COLOR_THEME.HIGH_CONTRAST_LIGHT,
    );

    this.initState.inProgress();
    this.initState.setMessage(`Initializing...`);

    try {
      const { groupId, artifactId, versionId } = parseGAVCoordinates(gav);

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
      this.initState.setMessage(`Fetching project...`);
      const project = ProjectData.serialization.fromJson(
        (yield flowResult(
          this.depotServerClient.getProject(groupId, artifactId),
        )) as PlainObject<ProjectData>,
      );

      // analyze data space
      const analysisResult = (yield DSL_DataSpace_getGraphManagerExtension(
        this.graphManagerState.graphManager,
      ).analyzeDataSpace(
        dataSpacePath,
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
            dataSpacePath,
            this.depotServerClient,
          ),
        this.initState,
      )) as DataSpaceAnalysisResult;

      this.viewerState = new DataSpaceViewerState(
        this.applicationStore,
        this.graphManagerState,
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
          onZoneChange: (zone: NavigationZone | undefined): void => {
            if (zone === undefined) {
              this.applicationStore.navigationService.navigator.resetZone();
            } else {
              this.applicationStore.navigationService.navigator.updateCurrentZone(
                zone,
              );
            }
          },
        },
      );
      this.initState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.initState.fail();
      this.applicationStore.notificationService.notifyError(error);
    } finally {
      this.initState.setMessage(undefined);
    }
  }

  queryDataSpace(classPath?: string | undefined): void {
    if (this.viewerState) {
      this.applicationStore.navigationService.navigator.visitAddress(
        EXTERNAL_APPLICATION_NAVIGATION__generateDataSpaceQueryEditorUrl(
          this.applicationStore.config.queryApplicationUrl,
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
