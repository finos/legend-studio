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
  type Query,
  extractElementNameFromPath,
  QueryTaggedValue,
  RuntimePointer,
  PackageableElementExplicitReference,
  getAllClassMappings,
  isSystemElement,
  type GraphManagerState,
} from '@finos/legend-graph';
import {
  QueryEditorStore,
  BasicQueryBuilderState,
  type QueryExportConfiguration,
  type LegendQueryPluginManager,
  type LegendQueryApplicationStore,
  type QueryBuilderState,
} from '@finos/legend-application-query';
import type {
  DepotServerClient,
  ProjectGAVCoordinates,
} from '@finos/legend-server-depot';
import {
  getNullableFirstElement,
  guaranteeNonNullable,
  uuid,
} from '@finos/legend-shared';
import {
  QUERY_PROFILE_PATH,
  QUERY_PROFILE_TAG_DATA_SPACE,
} from '../../DSLDataSpace_Const.js';
import { getDataSpace } from '../../graphManager/DSLDataSpace_GraphManagerHelper.js';
import type { GenericLegendApplicationStore } from '@finos/legend-application';

const createQueryDataSpaceTaggedValue = (
  dataSpacePath: string,
): QueryTaggedValue => {
  const taggedValue = new QueryTaggedValue();
  taggedValue.profile = QUERY_PROFILE_PATH;
  taggedValue.tag = QUERY_PROFILE_TAG_DATA_SPACE;
  taggedValue.value = dataSpacePath;
  return taggedValue;
};

class DataSpaceQueryCreatorState extends BasicQueryBuilderState {
  _isClassReadOnly: boolean;

  constructor(
    applicationStore: GenericLegendApplicationStore,
    graphManagerState: GraphManagerState,
    _isClassReadOnly: boolean,
  ) {
    super(applicationStore, graphManagerState);
    this._isClassReadOnly = _isClassReadOnly;
  }

  override get isClassReadOnly(): boolean {
    return this._isClassReadOnly;
  }

  override get isMappingReadOnly(): boolean {
    return true;
  }

  override get isRuntimeReadOnly(): boolean {
    return true;
  }
}

export class DataSpaceQueryCreatorStore extends QueryEditorStore {
  groupId: string;
  artifactId: string;
  versionId: string;
  dataSpacePath: string;
  executionContext: string;
  runtimePath: string | undefined;
  classPath: string | undefined;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
    pluginManager: LegendQueryPluginManager,
    groupId: string,
    artifactId: string,
    versionId: string,
    dataSpacePath: string,
    executionContext: string,
    runtimePath: string | undefined,
    executionKey: string | undefined,
  ) {
    super(applicationStore, depotServerClient, pluginManager);

    this.groupId = groupId;
    this.artifactId = artifactId;
    this.versionId = versionId;
    this.dataSpacePath = dataSpacePath;
    this.executionContext = executionContext;
    this.runtimePath = runtimePath;
    this.classPath = executionKey;
  }

  protected createQueryBuilderState(): QueryBuilderState {
    return new DataSpaceQueryCreatorState(
      this.applicationStore,
      this.graphManagerState,
      Boolean(this.classPath),
    );
  }

  getProjectInfo(): ProjectGAVCoordinates {
    return {
      groupId: this.groupId,
      artifactId: this.artifactId,
      versionId: this.versionId,
    };
  }

  async setUpBuilderState(): Promise<void> {
    const dataSpace = getDataSpace(
      this.dataSpacePath,
      this.graphManagerState.graph,
    );
    const executionContext = guaranteeNonNullable(
      dataSpace.executionContexts.find(
        (context) => context.name === this.executionContext,
      ),
      `Can't find execution context '${this.executionContext}'`,
    );
    this.queryBuilderState.setupState.setMapping(
      executionContext.mapping.value,
    );
    this.queryBuilderState.setupState.setRuntimeValue(
      new RuntimePointer(
        PackageableElementExplicitReference.create(
          this.runtimePath
            ? this.graphManagerState.graph.getRuntime(this.runtimePath)
            : executionContext.defaultRuntime.value,
        ),
      ),
    );

    if (this.classPath) {
      this.queryBuilderState.changeClass(
        this.queryBuilderState.graphManagerState.graph.getClass(this.classPath),
      );
    } else {
      // try to find a class to set
      // first, find classes which is mapped by the mapping
      // then, find any classes except for class coming from system
      // if none found, default to a dummy blank query
      const defaultClass =
        getNullableFirstElement(
          this.queryBuilderState.setupState.mapping
            ? getAllClassMappings(
                this.queryBuilderState.setupState.mapping,
              ).map((classMapping) => classMapping.class.value)
            : [],
        ) ??
        getNullableFirstElement(
          this.queryBuilderState.graphManagerState.graph.classes.filter(
            (el) => !isSystemElement(el),
          ),
        );
      if (defaultClass) {
        this.queryBuilderState.changeClass(defaultClass);
      } else {
        this.queryBuilderState.initialize(
          this.queryBuilderState.graphManagerState.graphManager.createDefaultBasicRawLambda(),
        );
      }
    }
  }

  async getExportConfiguration(): Promise<QueryExportConfiguration> {
    return {
      defaultName: `New Query for ${extractElementNameFromPath(
        this.dataSpacePath,
      )}[${this.executionContext}]`,
      decorator: (query: Query): void => {
        query.id = uuid();
        query.groupId = this.groupId;
        query.artifactId = this.artifactId;
        query.versionId = this.versionId;
        query.taggedValues = [
          createQueryDataSpaceTaggedValue(this.dataSpacePath),
        ];
      },
    };
  }
}
