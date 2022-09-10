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
  type Runtime,
  type Class,
} from '@finos/legend-graph';
import {
  QueryEditorStore,
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
  guaranteeNonNullable,
  guaranteeType,
  uuid,
} from '@finos/legend-shared';
import {
  QUERY_PROFILE_PATH,
  QUERY_PROFILE_TAG_DATA_SPACE,
} from '../../DSLDataSpace_Const.js';
import { getDataSpace } from '../../graphManager/DSLDataSpace_GraphManagerHelper.js';
import { DataSpaceQueryBuilderState } from './DataSpaceQueryBuilderState.js';
import type { DataSpaceInfo } from './DataSpaceInfo.js';
import { generateDataSpaceQueryCreatorRoute } from './DSLDataSpace_LegendQueryRouter.js';
import type { DataSpaceExecutionContext } from '../../graph/metamodel/pure/model/packageableElements/dataSpace/DSLDataSpace_DataSpace.js';

export const createQueryDataSpaceTaggedValue = (
  dataSpacePath: string,
): QueryTaggedValue => {
  const taggedValue = new QueryTaggedValue();
  taggedValue.profile = QUERY_PROFILE_PATH;
  taggedValue.tag = QUERY_PROFILE_TAG_DATA_SPACE;
  taggedValue.value = dataSpacePath;
  return taggedValue;
};

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

  getProjectInfo(): ProjectGAVCoordinates {
    return {
      groupId: this.groupId,
      artifactId: this.artifactId,
      versionId: this.versionId,
    };
  }

  async initializeQueryBuilderState(): Promise<QueryBuilderState> {
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
    const queryBuilderState = new DataSpaceQueryBuilderState(
      this.applicationStore,
      this.graphManagerState,
      this.depotServerClient,
      dataSpace,
      executionContext,
      this.groupId,
      this.artifactId,
      this.versionId,
      (dataSpaceInfo: DataSpaceInfo) => {
        if (dataSpaceInfo.defaultExecutionContext) {
          this.applicationStore.navigator.jumpTo(
            generateDataSpaceQueryCreatorRoute(
              dataSpaceInfo.groupId,
              dataSpaceInfo.artifactId,
              dataSpaceInfo.versionId,
              dataSpaceInfo.path,
              dataSpaceInfo.defaultExecutionContext,
              undefined,
              undefined,
            ),
          );
        } else {
          this.applicationStore.notifyWarning(
            `Can't switch data space: default execution context not specified`,
          );
        }
      },
      (ec: DataSpaceExecutionContext) => {
        // runtime should already be set
        const runtimePointer = guaranteeType(
          queryBuilderState.runtimeValue,
          RuntimePointer,
        );
        this.applicationStore.navigator.goTo(
          generateDataSpaceQueryCreatorRoute(
            this.groupId,
            this.artifactId,
            this.versionId,
            dataSpace.path,
            ec.name,
            runtimePointer.packageableRuntime.value ===
              queryBuilderState.executionContext.defaultRuntime.value
              ? undefined
              : runtimePointer.packageableRuntime.value.path,
            queryBuilderState.class?.path,
          ),
        );
      },
      (runtimeValue: Runtime) => {
        const runtimePointer = guaranteeType(runtimeValue, RuntimePointer);
        queryBuilderState.applicationStore.navigator.goTo(
          generateDataSpaceQueryCreatorRoute(
            queryBuilderState.groupId,
            queryBuilderState.artifactId,
            queryBuilderState.versionId,
            queryBuilderState.dataSpace.path,
            queryBuilderState.executionContext.name,
            runtimePointer.packageableRuntime.value ===
              queryBuilderState.executionContext.defaultRuntime.value
              ? undefined
              : runtimePointer.packageableRuntime.value.path,
            queryBuilderState.class?.path,
          ),
        );
      },
      (_class: Class) => {
        // runtime should already be set
        const runtimePointer = guaranteeType(
          queryBuilderState.runtimeValue,
          RuntimePointer,
        );
        queryBuilderState.applicationStore.navigator.goTo(
          generateDataSpaceQueryCreatorRoute(
            queryBuilderState.groupId,
            queryBuilderState.artifactId,
            queryBuilderState.versionId,
            queryBuilderState.dataSpace.path,
            queryBuilderState.executionContext.name,
            runtimePointer.packageableRuntime.value ===
              queryBuilderState.executionContext.defaultRuntime.value
              ? undefined
              : runtimePointer.packageableRuntime.value.path,
            _class.path,
          ),
        );
      },
    );
    queryBuilderState.setExecutionContext(executionContext);
    queryBuilderState.propagateExecutionContextChange(executionContext);

    // set runtime if already chosen
    if (this.runtimePath) {
      queryBuilderState.changeRuntime(
        new RuntimePointer(
          PackageableElementExplicitReference.create(
            this.graphManagerState.graph.getRuntime(this.runtimePath),
          ),
        ),
      );
    }

    // set class if already chosen
    if (this.classPath) {
      queryBuilderState.changeClass(
        this.graphManagerState.graph.getClass(this.classPath),
      );
    }

    return queryBuilderState;
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
