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

import type { Diagram } from '@finos/legend-extension-dsl-diagram';
import { getDiagram } from '@finos/legend-extension-dsl-diagram';
import type {
  Mapping,
  PackageableElementReference,
  PackageableRuntime,
  PureModel,
} from '@finos/legend-graph';
import { PackageableElementExplicitReference } from '@finos/legend-graph';
import type { Entity } from '@finos/legend-model-storage';
import type { QueryStore } from '@finos/legend-query';
import { QuerySetupState } from '@finos/legend-query';
import type { StoredEntity } from '@finos/legend-server-depot';
import { ProjectData } from '@finos/legend-server-depot';
import type { GeneratorFn, PlainObject } from '@finos/legend-shared';
import {
  assertTrue,
  guaranteeNonEmptyString,
  isObject,
  isString,
} from '@finos/legend-shared';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import type { DataSpaceSupportInfo } from '../../models/metamodels/pure/model/packageableElements/dataSpace/DataSpace';
import { DataSpaceSupportEmail } from '../../models/metamodels/pure/model/packageableElements/dataSpace/DataSpace';
import { DATA_SPACE_ELEMENT_CLASSIFIER_PATH } from '../../models/protocols/pure/DSLDataSpace_PureProtocolProcessorPlugin';

export type LightDataSpace = Entity & {
  path: string;
  content: {
    groupId: string;
    artifactId: string;
    versionId: string;
  };
};

export class ResolvedDataSpaceExecutionContext {
  name!: string;
  description?: string | undefined;
  mapping!: PackageableElementReference<Mapping>;
  defaultRuntime!: PackageableElementReference<PackageableRuntime>;
}

export class ResolvedDataSpace {
  groupId!: string;
  artifactId!: string;
  versionId!: string;
  executionContexts: ResolvedDataSpaceExecutionContext[] = [];
  defaultExecutionContext!: ResolvedDataSpaceExecutionContext;
  featuredDiagrams: PackageableElementReference<Diagram>[] = [];
  description?: string | undefined;
  supportInfo?: DataSpaceSupportInfo | undefined;
}

const resolveDataSpace = (
  lightDataSpace: LightDataSpace,
  graph: PureModel,
): ResolvedDataSpace => {
  const data = lightDataSpace.content;
  const dataSpace = new ResolvedDataSpace();
  dataSpace.groupId = guaranteeNonEmptyString(
    data.groupId,
    `Data space 'groupId' field is missing or empty`,
  );
  dataSpace.artifactId = guaranteeNonEmptyString(
    data.artifactId,
    `Data space 'artifactId' field is missing or empty`,
  );
  dataSpace.versionId = guaranteeNonEmptyString(
    data.versionId,
    `Data space 'versionId' field is missing or empty`,
  );
  assertTrue(
    Array.isArray(data.executionContexts),
    `Data space 'executionContexts' field must be a list`,
  );
  dataSpace.executionContexts = (
    guaranteeNonNullable(
      data.executionContexts,
      `Data space 'executionContexts' field is missing`,
    ) as Record<PropertyKey, unknown>[]
  ).map((contextData) => {
    const context = new ResolvedDataSpaceExecutionContext();
    assertTrue(
      isString(contextData.name),
      `Data space execution context 'name' field must be a string`,
    );
    context.name = guaranteeNonEmptyString(
      contextData.name as string,
      `Data space execution context 'name' field is missing or empty`,
    );
    context.description = contextData.description as string | undefined;
    assertTrue(
      isObject(contextData.mapping) &&
        isString((contextData.mapping as Record<PropertyKey, unknown>).path),
      `Data space execution context 'mapping' field must be an element pointer`,
    );
    context.mapping = PackageableElementExplicitReference.create(
      graph.getMapping(
        (contextData.mapping as Record<PropertyKey, unknown>).path as string,
      ),
    );
    assertTrue(
      isObject(contextData.defaultRuntime) &&
        isString(
          (contextData.defaultRuntime as Record<PropertyKey, unknown>).path,
        ),
      `Data space execution context 'defaultRuntime' field must be an element pointer`,
    );
    context.defaultRuntime = PackageableElementExplicitReference.create(
      graph.getRuntime(
        (contextData.defaultRuntime as Record<PropertyKey, unknown>)
          .path as string,
      ),
    );
    return context;
  });
  assertTrue(
    isString(data.defaultExecutionContext),
    `Data space 'defaultExecutionContext' field must be a string`,
  );
  dataSpace.defaultExecutionContext = guaranteeNonNullable(
    dataSpace.executionContexts.find(
      (context) =>
        context.name ===
        guaranteeNonEmptyString(
          data.defaultExecutionContext as string,
          `Data space 'defaultExecutionContext' field is missing or empty`,
        ),
    ),
    `Can't find default execution context '${data.defaultExecutionContext}'`,
  );
  dataSpace.description = data.description as string | undefined;
  if (data.featuredDiagrams) {
    assertTrue(
      Array.isArray(data.featuredDiagrams),
      `Data space 'featuredDiagrams' field must be a list`,
    );
    dataSpace.featuredDiagrams = (
      (data.featuredDiagrams as Record<PropertyKey, unknown>[]) ?? []
    ).map((pointer) => {
      assertTrue(
        isObject(pointer) &&
          isString((pointer as Record<PropertyKey, unknown>).path),
        `Data space 'featuredDiagrams' field must be a list of element pointers`,
      );
      return PackageableElementExplicitReference.create(
        getDiagram(
          (pointer as Record<PropertyKey, unknown>).path as string,
          graph,
        ),
      );
    });
  }
  if (data.supportInfo) {
    switch ((data.supportInfo as Record<PropertyKey, unknown>)._type) {
      case 'asd': {
        const supportEmail = new DataSpaceSupportEmail();
        supportEmail.address = guaranteeNonEmptyString(
          (data.supportInfo as Record<PropertyKey, unknown>).address as string,
          `Data space support email 'address' field is missing or empty`,
        );
        dataSpace.supportInfo = supportEmail;
        break;
      }
      default: {
        break;
      }
    }
  }
  return dataSpace;
};

export class DataSpaceQuerySetupState extends QuerySetupState {
  dataSpaces: LightDataSpace[] = [];
  loadDataSpacesState = ActionState.create();
  setUpDataSpaceState = ActionState.create();
  currentDataSpace?: LightDataSpace | undefined;
  currentResolvedDataSpace?: ResolvedDataSpace | undefined;

  constructor(queryStore: QueryStore) {
    super(queryStore);

    makeObservable(this, {
      dataSpaces: observable,
      currentDataSpace: observable.ref,
      currentResolvedDataSpace: observable,
      setCurrentDataSpace: action,
      loadDataSpaces: flow,
      setUpDataSpace: flow,
    });
  }

  setCurrentDataSpace(val: LightDataSpace | undefined): void {
    this.currentDataSpace = val;
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
            limit: 10,
          },
        )) as StoredEntity[]
      )
        .map((storedEntity) => storedEntity.entity)
        .map(
          (entity) =>
            ({
              ...entity,
              path: entity.path,
              content: {
                ...entity.content,
                groupId: guaranteeNonNullable(
                  entity.content.groupId,
                  `Data space 'groupId' field is missing`,
                ),
                artifactId: guaranteeNonNullable(
                  entity.content.artifactId,
                  `Data space 'artifactId' field is missing`,
                ),
                versionId: guaranteeNonNullable(
                  entity.content.versionId,
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
      const resolvedDataSpace = resolveDataSpace(
        dataSpace,
        this.queryStore.graphManagerState.graph,
      );
      this.currentResolvedDataSpace = resolvedDataSpace;
      this.setUpDataSpaceState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.setUpDataSpaceState.fail();
      this.queryStore.applicationStore.notifyError(error);
    }
  }
}
