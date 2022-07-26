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
import type { Class } from '@finos/legend-graph';
import type { Entity } from '@finos/legend-storage';
import {
  type QuerySetupStore,
  QuerySetupState,
  generateStudioProjectViewUrl,
} from '@finos/legend-application-query';
import {
  type StoredEntity,
  DepotScope,
  ProjectData,
  SNAPSHOT_VERSION_ALIAS,
} from '@finos/legend-server-depot';
import {
  type GeneratorFn,
  type PlainObject,
  ActionState,
  assertErrorThrown,
} from '@finos/legend-shared';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import type { DataSpaceAnalysisResult } from '../../graphManager/action/analytics/DataSpaceAnalysis.js';
import { getDSLDataSpaceGraphManagerExtension } from '../../graphManager/protocol/DSLDataSpace_PureGraphManagerExtension.js';
import { DATA_SPACE_ELEMENT_CLASSIFIER_PATH } from '../../models/protocols/pure/DSLDataSpace_PureProtocolProcessorPlugin.js';
import { DataSpaceViewerState } from '../DataSpaceViewerState.js';
import { generateDataSpaceQueryEditorRoute } from './DSLDataSpace_LegendQueryRouter.js';

export interface DataSpaceContext {
  groupId: string;
  artifactId: string;
  versionId: string;
  path: string;
}

export class DataSpaceQuerySetupState extends QuerySetupState {
  dataSpaces: DataSpaceContext[] = [];
  loadDataSpacesState = ActionState.create();
  loadDataSpaceState = ActionState.create();
  currentDataSpace?: DataSpaceContext | undefined;
  dataSpaceViewerState?: DataSpaceViewerState | undefined;
  toGetSnapShot = false;

  constructor(setupStore: QuerySetupStore) {
    super(setupStore);

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
  }

  setCurrentDataSpace(val: DataSpaceContext | undefined): void {
    this.currentDataSpace = val;
  }

  setDataSpaceViewerState(val: DataSpaceViewerState | undefined): void {
    this.dataSpaceViewerState = val;
  }

  setToGetSnapShot(val: boolean): void {
    this.toGetSnapShot = val;
  }

  *loadDataSpaces(searchText: string): GeneratorFn<void> {
    const isValidSearchString = searchText.length >= 3;
    this.loadDataSpacesState.inProgress();
    try {
      this.dataSpaces = (
        (yield this.setupStore.depotServerClient.getEntitiesByClassifierPath(
          DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
          {
            search: isValidSearchString ? searchText : undefined,
            scope: this.toGetSnapShot
              ? DepotScope.SNAPSHOT
              : DepotScope.RELEASES,
            limit: 10,
          },
        )) as StoredEntity[]
      ).map((storedEntity) => ({
        groupId: storedEntity.groupId,
        artifactId: storedEntity.artifactId,
        versionId: this.toGetSnapShot
          ? SNAPSHOT_VERSION_ALIAS
          : storedEntity.versionId,
        path: storedEntity.entity.path,
      }));
      this.loadDataSpacesState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.loadDataSpacesState.fail();
      this.setupStore.applicationStore.notifyError(error);
    }
  }

  *loadDataSpace(dataSpace: DataSpaceContext): GeneratorFn<void> {
    this.loadDataSpaceState.inProgress();
    this.loadDataSpaceState.setMessage(`Initializing...`);

    try {
      // fetch project
      this.loadDataSpaceState.setMessage(`Fetching project...`);
      const project = ProjectData.serialization.fromJson(
        (yield flowResult(
          this.setupStore.depotServerClient.getProject(
            dataSpace.groupId,
            dataSpace.artifactId,
          ),
        )) as PlainObject<ProjectData>,
      );

      // fetch entities
      this.loadDataSpaceState.setMessage(`Fetching entities...`);
      const entities = (yield this.setupStore.depotServerClient.getEntities(
        project,
        dataSpace.versionId,
      )) as Entity[];

      // fetch dependencies
      this.loadDataSpaceState.setMessage(`Fetching dependencies...`);
      const dependencyEntitiesIndex = (yield flowResult(
        this.setupStore.depotServerClient.getIndexedDependencyEntities(
          project,
          dataSpace.versionId,
        ),
      )) as Map<string, Entity[]>;

      // analyze data space
      this.loadDataSpaceState.setMessage(`Analyzing data space...`);
      const analysisResult = (yield getDSLDataSpaceGraphManagerExtension(
        this.setupStore.graphManagerState.graphManager,
      ).analyzeDataSpace(
        dataSpace.path,
        entities,
        dependencyEntitiesIndex,
      )) as DataSpaceAnalysisResult;

      this.dataSpaceViewerState = new DataSpaceViewerState(
        dataSpace.groupId,
        dataSpace.artifactId,
        dataSpace.versionId,
        analysisResult,
        {
          viewProject: (
            groupId: string,
            artifactId: string,
            versionId: string,
            entityPath: string | undefined,
          ): void =>
            this.setupStore.applicationStore.navigator.openNewWindow(
              generateStudioProjectViewUrl(
                this.setupStore.applicationStore.config.studioUrl,
                groupId,
                artifactId,
                versionId,
                entityPath,
              ),
            ),
          onDiagramClassDoubleClick: (classView: ClassView): void => {
            this.proceedToCreateQuery(classView.class.value);
          },
        },
      );
      this.loadDataSpaceState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.loadDataSpaceState.fail();
      this.setupStore.applicationStore.notifyError(error);
    } finally {
      this.loadDataSpaceState.setMessage(undefined);
    }
  }

  *proceedToCreateQuery(_class?: Class): GeneratorFn<void> {
    if (this.dataSpaceViewerState) {
      this.setupStore.applicationStore.navigator.goTo(
        generateDataSpaceQueryEditorRoute(
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
      this.setupStore.setSetupState(undefined);
    }
  }
}
