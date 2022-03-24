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
  CreateQueryInfoState,
  QuerySetupState,
  generateCreateQueryRoute,
} from '@finos/legend-query';
import {
  type StoredEntity,
  generateGAVCoordinates,
  DepotScope,
  ProjectData,
  SNAPSHOT_VERSION_ALIAS,
} from '@finos/legend-server-depot';
import {
  type GeneratorFn,
  type PlainObject,
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import {
  DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
  getResolvedDataSpace,
} from '../../models/protocols/pure/DSLDataSpace_PureProtocolProcessorPlugin';
import { DataSpaceViewerState } from '../DataSpaceViewerState';

export type LightDataSpace = Entity & {
  groupId: string;
  artifactId: string;
  versionId: string;
  path: string;
  content: {
    groupId: string;
    artifactId: string;
    versionId: string;
  };
};

const QUERY_PROFILE_PATH = 'meta::pure::profiles::query';
const QUERY_PROFILE_TAG_DATA_SPACE = 'dataSpace';
const DATA_SPACE_ID_DELIMITER = '@';

export const createQueryDataSpaceTaggedValue = (
  dataSpacePath: string,
  groupId: string,
  artifactId: string,
  versionId: string,
): QueryTaggedValue => {
  const taggedValue = new QueryTaggedValue();
  taggedValue.profile = QUERY_PROFILE_PATH;
  taggedValue.tag = QUERY_PROFILE_TAG_DATA_SPACE;
  taggedValue.value = `${generateGAVCoordinates(
    groupId,
    artifactId,
    versionId,
  )}${DATA_SPACE_ID_DELIMITER}${dataSpacePath}`;
  return taggedValue;
};

export class DataSpaceQuerySetupState extends QuerySetupState {
  dataSpaces: LightDataSpace[] = [];
  loadDataSpacesState = ActionState.create();
  setUpDataSpaceState = ActionState.create();
  currentDataSpace?: LightDataSpace | undefined;
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
      setUpDataSpace: flow,
      proceedToCreateQuery: flow,
    });
  }

  setCurrentDataSpace(val: LightDataSpace | undefined): void {
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
      ).map(
        (storedEntity) =>
          ({
            ...storedEntity.entity,
            groupId: storedEntity.groupId,
            artifactId: storedEntity.artifactId,
            versionId: this.toGetSnapShot
              ? SNAPSHOT_VERSION_ALIAS
              : storedEntity.versionId,
            path: storedEntity.entity.path,
            content: {
              ...storedEntity.entity.content,
              groupId: guaranteeNonNullable(
                storedEntity.entity.content.groupId,
                `Data space 'groupId' field is missing`,
              ),
              artifactId: guaranteeNonNullable(
                storedEntity.entity.content.artifactId,
                `Data space 'artifactId' field is missing`,
              ),
              versionId: guaranteeNonNullable(
                storedEntity.entity.content.versionId,
                `Data space 'versionId' field is missing`,
              ),
            },
          } as LightDataSpace),
      );
      this.loadDataSpacesState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.loadDataSpacesState.fail();
      this.queryStore.applicationStore.notifyError(error);
    }
  }

  *setUpDataSpace(dataSpace: LightDataSpace): GeneratorFn<void> {
    if (this.queryStore.initState.isInInitialState) {
      yield flowResult(this.queryStore.initialize());
    } else if (this.queryStore.initState.isInProgress) {
      return;
    }
    this.setUpDataSpaceState.inProgress();
    try {
      const projectData = ProjectData.serialization.fromJson(
        (yield flowResult(
          this.queryStore.depotServerClient.getProject(
            dataSpace.content.groupId,
            dataSpace.content.artifactId,
          ),
        )) as PlainObject<ProjectData>,
      );

      yield flowResult(
        this.queryStore.buildGraph(projectData, dataSpace.content.versionId),
      );
      const resolvedDataSpace = getResolvedDataSpace(
        dataSpace.content,
        this.queryStore.graphManagerState.graph,
      );
      this.dataSpaceViewerState = new DataSpaceViewerState(
        this.queryStore.graphManagerState,
        dataSpace.groupId,
        dataSpace.artifactId,
        dataSpace.versionId,
        resolvedDataSpace,
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
      this.setUpDataSpaceState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.setUpDataSpaceState.fail();
      this.queryStore.applicationStore.notifyError(error);
    }
  }

  *proceedToCreateQuery(_class?: Class): GeneratorFn<void> {
    if (this.dataSpaceViewerState) {
      const projectData = ProjectData.serialization.fromJson(
        (yield flowResult(
          this.queryStore.depotServerClient.getProject(
            this.dataSpaceViewerState.dataSpace.groupId,
            this.dataSpaceViewerState.dataSpace.artifactId,
          ),
        )) as PlainObject<ProjectData>,
      );
      const queryInfoState = new CreateQueryInfoState(
        this.queryStore,
        projectData,
        this.dataSpaceViewerState.dataSpace.versionId,
        this.dataSpaceViewerState.currentExecutionContext.mapping.value,
        this.dataSpaceViewerState.currentRuntime,
      );
      queryInfoState.taggedValues = [
        createQueryDataSpaceTaggedValue(
          this.dataSpaceViewerState.dataSpace.path,
          this.dataSpaceViewerState.dataSpaceGroupId,
          this.dataSpaceViewerState.dataSpaceArtifactId,
          this.dataSpaceViewerState.dataSpaceVersionId,
        ),
      ];
      this.queryStore.setQueryInfoState(queryInfoState);
      this.queryStore.applicationStore.navigator.goTo(
        generateCreateQueryRoute(
          this.dataSpaceViewerState.dataSpace.groupId,
          this.dataSpaceViewerState.dataSpace.artifactId,
          this.dataSpaceViewerState.dataSpace.versionId,
          this.dataSpaceViewerState.currentExecutionContext.mapping.value.path,
          this.dataSpaceViewerState.currentRuntime.path,
          _class?.path,
        ),
      );
      this.setupStore.setSetupState(undefined);
    }
  }
}
