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

import type { ClassView } from '@finos/legend-extension-dsl-diagram';
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
  ProjectData,
  retrieveProjectEntitiesWithDependencies,
} from '@finos/legend-server-depot';
import {
  type GeneratorFn,
  type PlainObject,
  ActionState,
  assertErrorThrown,
} from '@finos/legend-shared';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import { DSL_DataSpace_getGraphManagerExtension } from '../../graphManager/protocol/pure/DSL_DataSpace_PureGraphManagerExtension.js';
import { DATA_SPACE_ELEMENT_CLASSIFIER_PATH } from '../../graphManager/protocol/pure/DSL_DataSpace_PureProtocolProcessorPlugin.js';
import { DataSpaceViewerState } from '../DataSpaceViewerState.js';
import { generateDataSpaceQueryCreatorRoute } from '../../application/query/DSL_DataSpace_LegendQueryNavigation.js';
import { type DataSpaceInfo, extractDataSpaceInfo } from './DataSpaceInfo.js';
import {
  DEFAULT_TYPEAHEAD_SEARCH_LIMIT,
  DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH,
  type GenericLegendApplicationStore,
} from '@finos/legend-application';
import { retrieveAnalyticsResultCache } from '../../graphManager/action/analytics/DataSpaceAnalysisHelper.js';
import type { DataSpaceAnalysisResult } from '../../graphManager/action/analytics/DataSpaceAnalysis.js';

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

  *loadDataSpaces(searchText: string): GeneratorFn<void> {
    const isValidSearchString =
      searchText.length >= DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH;
    this.loadDataSpacesState.inProgress();
    try {
      this.dataSpaces = (
        (yield this.depotServerClient.getEntitiesByClassifierPath(
          DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
          {
            search: isValidSearchString ? searchText : undefined,
            scope: this.toGetSnapShot
              ? DepotScope.SNAPSHOT
              : DepotScope.RELEASES,
            limit: DEFAULT_TYPEAHEAD_SEARCH_LIMIT,
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
      // fetch project
      this.loadDataSpaceState.setMessage(`Fetching project...`);
      const project = ProjectData.serialization.fromJson(
        (yield flowResult(
          this.depotServerClient.getProject(
            dataSpace.groupId,
            dataSpace.artifactId,
          ),
        )) as PlainObject<ProjectData>,
      );
      // analyze data space
      const analysisResult = (yield DSL_DataSpace_getGraphManagerExtension(
        this.graphManagerState.graphManager,
      ).analyzeDataSpace(
        dataSpace.path,
        () =>
          retrieveProjectEntitiesWithDependencies(
            project,
            dataSpace.versionId,
            this.depotServerClient,
          ),
        () =>
          retrieveAnalyticsResultCache(
            project,
            dataSpace.versionId,
            dataSpace.path,
            this.depotServerClient,
          ),
        this.loadDataSpaceState,
      )) as DataSpaceAnalysisResult;
      this.dataSpaceViewerState = new DataSpaceViewerState(
        this.applicationStore,
        this.graphManagerState,
        dataSpace.groupId,
        dataSpace.artifactId,
        dataSpace.versionId,
        analysisResult,
        {
          retriveGraphData: () =>
            new GraphDataWithOrigin(
              new LegendSDLC(
                dataSpace.groupId,
                dataSpace.artifactId,
                dataSpace.versionId,
              ),
            ),
          viewProject: this.viewProject,
          viewSDLCProject: this.viewSDLCProject,
          onDiagramClassDoubleClick: (classView: ClassView): void => {
            this.proceedToCreateQuery(classView.class.value);
          },
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
