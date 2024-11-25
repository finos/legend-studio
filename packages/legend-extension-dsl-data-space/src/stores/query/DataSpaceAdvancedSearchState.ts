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
  GraphDataWithOrigin,
  type Class,
  type GraphManagerState,
  LegendSDLC,
} from '@finos/legend-graph';
import {
  type StoredEntity,
  type DepotServerClient,
  DepotScope,
  StoreProjectData,
  retrieveProjectEntitiesWithDependencies,
} from '@finos/legend-server-depot';
import {
  type GeneratorFn,
  type PlainObject,
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import { DSL_DataSpace_getGraphManagerExtension } from '../../graph-manager/protocol/pure/DSL_DataSpace_PureGraphManagerExtension.js';
import { DATA_SPACE_ELEMENT_CLASSIFIER_PATH } from '../../graph-manager/protocol/pure/DSL_DataSpace_PureProtocolProcessorPlugin.js';
import { DataSpaceViewerState } from '../DataSpaceViewerState.js';
import {
  type DataSpaceInfo,
  extractDataSpaceInfo,
} from '../shared/DataSpaceInfo.js';
import { type GenericLegendApplicationStore } from '@finos/legend-application';
import { retrieveAnalyticsResultCache } from '../../graph-manager/action/analytics/DataSpaceAnalysisHelper.js';
import type { DataSpaceAnalysisResult } from '../../graph-manager/action/analytics/DataSpaceAnalysis.js';
import {
  generateDataSpaceQueryCreatorRoute,
  generateServiceQueryCreatorRoute,
} from '../../__lib__/to-delete/DSL_DataSpace_LegendQueryNavigation_to_delete.js';

export class DataSpaceAdvancedSearchState {
  readonly applicationStore: GenericLegendApplicationStore;
  readonly graphManagerState: GraphManagerState;
  readonly depotServerClient: DepotServerClient;
  readonly viewProject: (
    groupId: string,
    artifactId: string,
    versionId: string,
    entityPath: string | undefined,
  ) => void;
  readonly viewSDLCProject: (
    groupId: string,
    artifactId: string,
    entityPath: string | undefined,
  ) => Promise<void>;

  dataSpaces: DataSpaceInfo[] = [];
  readonly loadDataSpacesState = ActionState.create();
  readonly loadDataSpaceState = ActionState.create();
  currentDataSpace?: DataSpaceInfo | undefined;
  dataSpaceViewerState?: DataSpaceViewerState | undefined;
  toGetSnapShot = false;

  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
    depotServerClient: DepotServerClient,
    actions: {
      viewProject: (
        groupId: string,
        artifactId: string,
        versionId: string,
        entityPath: string | undefined,
      ) => void;
      viewSDLCProject: (
        groupId: string,
        artifactId: string,
        entityPath: string | undefined,
      ) => Promise<void>;
    },
    currentDataSpace?: DataSpaceInfo | undefined,
    toGetSnapshot?: boolean | undefined,
  ) {
    makeObservable(this, {
      dataSpaces: observable,
      currentDataSpace: observable.ref,
      dataSpaceViewerState: observable,
      toGetSnapShot: observable,
      setCurrentDataSpace: action,
      setDataSpaceViewerState: action,
      setToGetSnapShot: action,
      loadDataSpaces: flow,
      loadDataSpace: flow,
      proceedToCreateQuery: flow,
    });

    this.applicationStore = applicationStore;
    this.graphManagerState = graphManagerState;
    this.depotServerClient = depotServerClient;
    this.viewProject = actions.viewProject;
    this.viewSDLCProject = actions.viewSDLCProject;
    this.currentDataSpace = currentDataSpace;
    if (toGetSnapshot !== undefined) {
      this.toGetSnapShot = toGetSnapshot;
    }
  }

  setCurrentDataSpace(val: DataSpaceInfo | undefined): void {
    this.currentDataSpace = val;
  }

  setDataSpaceViewerState(val: DataSpaceViewerState | undefined): void {
    this.dataSpaceViewerState = val;
  }

  setToGetSnapShot(val: boolean): void {
    this.toGetSnapShot = val;
  }

  *loadDataSpaces(): GeneratorFn<void> {
    this.loadDataSpacesState.inProgress();
    try {
      this.dataSpaces = (
        (yield this.depotServerClient.getEntitiesByClassifier(
          DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
          {
            scope: this.toGetSnapShot
              ? DepotScope.SNAPSHOT
              : DepotScope.RELEASES,
          },
        )) as StoredEntity[]
      ).map((storedEntity) =>
        extractDataSpaceInfo(storedEntity, this.toGetSnapShot),
      );
      this.loadDataSpacesState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.loadDataSpacesState.fail();
      this.applicationStore.notificationService.notifyError(error);
    }
  }

  *loadDataSpace(dataSpace: DataSpaceInfo): GeneratorFn<void> {
    this.loadDataSpaceState.inProgress();
    this.loadDataSpaceState.setMessage(`Initializing...`);
    try {
      const groupId = guaranteeNonNullable(dataSpace.groupId);
      const artifactId = guaranteeNonNullable(dataSpace.artifactId);
      const versionId = guaranteeNonNullable(dataSpace.versionId);
      // fetch project
      this.loadDataSpaceState.setMessage(`Fetching project...`);
      const project = StoreProjectData.serialization.fromJson(
        (yield flowResult(
          this.depotServerClient.getProject(groupId, artifactId),
        )) as PlainObject<StoreProjectData>,
      );
      // analyze data product
      const analysisResult = (yield DSL_DataSpace_getGraphManagerExtension(
        this.graphManagerState.graphManager,
      ).analyzeDataSpace(
        dataSpace.path,
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
            dataSpace.path,
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
          retrieveGraphData: () =>
            new GraphDataWithOrigin(
              new LegendSDLC(groupId, artifactId, versionId),
            ),
          queryDataSpace: (executionContextKey: string) =>
            generateDataSpaceQueryCreatorRoute(
              groupId,
              artifactId,
              versionId,
              analysisResult.path,
              executionContextKey,
            ),
          viewProject: (path: string | undefined) =>
            this.viewProject(groupId, artifactId, versionId, path),
          viewSDLCProject: (path: string | undefined) =>
            this.viewSDLCProject(groupId, artifactId, path),
          queryClass: (_class: Class): void => {
            this.proceedToCreateQuery(_class);
          },
          openServiceQuery: (servicePath: string): void =>
            this.applicationStore.navigationService.navigator.visitAddress(
              generateServiceQueryCreatorRoute(
                groupId,
                artifactId,
                versionId,
                servicePath,
              ),
            ),
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

  *proceedToCreateQuery(_class?: Class): GeneratorFn<void> {
    if (this.dataSpaceViewerState) {
      this.applicationStore.navigationService.navigator.goToLocation(
        generateDataSpaceQueryCreatorRoute(
          this.dataSpaceViewerState.groupId,
          this.dataSpaceViewerState.artifactId,
          this.dataSpaceViewerState.versionId,
          this.dataSpaceViewerState.dataSpaceAnalysisResult.path,
          this.dataSpaceViewerState.currentExecutionContext.name,
          this.dataSpaceViewerState.currentRuntime ===
            this.dataSpaceViewerState.currentExecutionContext.defaultRuntime
            ? undefined
            : this.dataSpaceViewerState.currentRuntime.path,
          _class?.path,
        ),
      );
    }
  }
}
