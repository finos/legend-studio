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
import { type Class, QueryTaggedValue } from '@finos/legend-graph';
import type { Entity } from '@finos/legend-model-storage';
import {
  type QuerySetupStore,
  QuerySetupState,
  generateCreateQueryRoute,
} from '@finos/legend-query';
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

export interface DataSpaceContext {
  groupId: string;
  artifactId: string;
  versionId: string;
  path: string;
}

const QUERY_PROFILE_PATH = 'meta::pure::profiles::query';
const QUERY_PROFILE_TAG_DATA_SPACE = 'dataSpace';

export const createQueryDataSpaceTaggedValue = (
  dataSpacePath: string,
): QueryTaggedValue => {
  const taggedValue = new QueryTaggedValue();
  taggedValue.profile = QUERY_PROFILE_PATH;
  taggedValue.tag = QUERY_PROFILE_TAG_DATA_SPACE;
  taggedValue.value = dataSpacePath;
  return taggedValue;
};

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
    if (this.queryStore.initState.isInInitialState) {
      yield flowResult(this.queryStore.initialize());
    } else if (this.queryStore.initState.isInProgress) {
      return;
    }
    const isValidSearchString = searchText.length >= 3;
    this.loadDataSpacesState.inProgress();
    try {
      this.dataSpaces = (
        (yield this.queryStore.depotServerClient.getEntitiesByClassifierPath(
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
      this.queryStore.applicationStore.notifyError(error);
    }
  }

  *loadDataSpace(dataSpace: DataSpaceContext): GeneratorFn<void> {
    if (this.queryStore.initState.isInInitialState) {
      yield flowResult(this.queryStore.initialize());
    } else if (this.queryStore.initState.isInProgress) {
      return;
    }
    this.loadDataSpaceState.inProgress();
    try {
      const project = ProjectData.serialization.fromJson(
        (yield flowResult(
          this.queryStore.depotServerClient.getProject(
            dataSpace.groupId,
            dataSpace.artifactId,
          ),
        )) as PlainObject<ProjectData>,
      );
      const entities = (yield this.queryStore.depotServerClient.getEntities(
        project,
        dataSpace.versionId,
      )) as Entity[];
      const dependencyEntitiesIndex = (yield flowResult(
        this.queryStore.depotServerClient.getIndexedDependencyEntities(
          project,
          dataSpace.versionId,
        ),
      )) as Map<string, Entity[]>;

      const analysisResult = (yield getDSLDataSpaceGraphManagerExtension(
        this.queryStore.graphManagerState.graphManager,
      ).analyzeDataSpace(
        dataSpace.path,
        entities,
        dependencyEntitiesIndex,
      )) as DataSpaceAnalysisResult;

      this.dataSpaceViewerState = new DataSpaceViewerState(
        this.queryStore.graphManagerState,
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
            this.queryStore.viewStudioProject(
              groupId,
              artifactId,
              versionId,
              entityPath,
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
      this.queryStore.applicationStore.notifyError(error);
    }
  }

  *proceedToCreateQuery(_class?: Class): GeneratorFn<void> {
    if (this.dataSpaceViewerState) {
      this.queryStore.applicationStore.navigator.goTo(
        generateCreateQueryRoute(
          this.dataSpaceViewerState.groupId,
          this.dataSpaceViewerState.artifactId,
          this.dataSpaceViewerState.versionId,
          this.dataSpaceViewerState.currentExecutionContext.mapping.path,
          this.dataSpaceViewerState.currentRuntime.path,
          _class?.path,
        ),
      );
      this.setupStore.setSetupState(undefined);
    }
  }
}
