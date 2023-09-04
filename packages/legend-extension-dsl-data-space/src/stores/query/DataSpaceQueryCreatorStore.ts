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
  type RawLambda,
} from '@finos/legend-graph';
import {
  QueryEditorStore,
  type QueryPersistConfiguration,
  type LegendQueryApplicationStore,
  createViewProjectHandler,
  createViewSDLCProjectHandler,
} from '@finos/legend-application-query';
import {
  type DepotServerClient,
  StoreProjectData,
} from '@finos/legend-server-depot';
import {
  guaranteeNonNullable,
  guaranteeType,
  uuid,
} from '@finos/legend-shared';
import {
  QUERY_PROFILE_PATH,
  QUERY_PROFILE_TAG_CLASS,
  QUERY_PROFILE_TAG_DATA_SPACE,
} from '../../graph/DSL_DataSpace_MetaModelConst.js';
import { getDataSpace } from '../../graph-manager/DSL_DataSpace_GraphManagerHelper.js';
import {
  DataSpaceQueryBuilderState,
  DataSpaceProjectInfo,
} from './DataSpaceQueryBuilderState.js';
import type { DataSpaceInfo } from './DataSpaceInfo.js';
import { generateDataSpaceQueryCreatorRoute } from '../../__lib__/query/DSL_DataSpace_LegendQueryNavigation.js';
import type { DataSpaceExecutionContext } from '../../graph/metamodel/pure/model/packageableElements/dataSpace/DSL_DataSpace_DataSpace.js';
import type { QueryBuilderState } from '@finos/legend-query-builder';
import type { ProjectGAVCoordinates } from '@finos/legend-storage';
import { DSL_DataSpace_getGraphManagerExtension } from '../../graph-manager/protocol/pure/DSL_DataSpace_PureGraphManagerExtension.js';
import { retrieveAnalyticsResultCache } from '../../graph-manager/action/analytics/DataSpaceAnalysisHelper.js';

export const createQueryDataSpaceTaggedValue = (
  dataSpacePath: string,
): QueryTaggedValue => {
  const taggedValue = new QueryTaggedValue();
  taggedValue.profile = QUERY_PROFILE_PATH;
  taggedValue.tag = QUERY_PROFILE_TAG_DATA_SPACE;
  taggedValue.value = dataSpacePath;
  return taggedValue;
};

export const createQueryClassTaggedValue = (
  classPath: string,
): QueryTaggedValue => {
  const taggedValue = new QueryTaggedValue();
  taggedValue.profile = QUERY_PROFILE_PATH;
  taggedValue.tag = QUERY_PROFILE_TAG_CLASS;
  taggedValue.value = classPath;
  return taggedValue;
};

export class DataSpaceQueryCreatorStore extends QueryEditorStore {
  readonly groupId: string;
  readonly artifactId: string;
  readonly versionId: string;
  readonly dataSpacePath: string;
  readonly executionContext: string;
  readonly runtimePath: string | undefined;
  readonly classPath: string | undefined;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
    groupId: string,
    artifactId: string,
    versionId: string,
    dataSpacePath: string,
    executionContext: string,
    runtimePath: string | undefined,
    executionKey: string | undefined,
  ) {
    super(applicationStore, depotServerClient);

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
    let dataSpaceAnalysisResult;
    try {
      const project = StoreProjectData.serialization.fromJson(
        await this.depotServerClient.getProject(this.groupId, this.artifactId),
      );
      dataSpaceAnalysisResult = await DSL_DataSpace_getGraphManagerExtension(
        this.graphManagerState.graphManager,
      ).retrieveDataSpaceAnalysisFromCache(() =>
        retrieveAnalyticsResultCache(
          project,
          this.versionId,
          dataSpace.path,
          this.depotServerClient,
        ),
      );
    } catch {
      // do nothing
    }
    const projectInfo = new DataSpaceProjectInfo(
      this.groupId,
      this.artifactId,
      this.versionId,
      createViewProjectHandler(this.applicationStore),
      createViewSDLCProjectHandler(
        this.applicationStore,
        this.depotServerClient,
      ),
    );
    const queryBuilderState = new DataSpaceQueryBuilderState(
      this.applicationStore,
      this.graphManagerState,
      this.depotServerClient,
      dataSpace,
      executionContext,
      (dataSpaceInfo: DataSpaceInfo) => {
        if (dataSpaceInfo.defaultExecutionContext) {
          this.applicationStore.navigationService.navigator.goToLocation(
            generateDataSpaceQueryCreatorRoute(
              guaranteeNonNullable(dataSpaceInfo.groupId),
              guaranteeNonNullable(dataSpaceInfo.artifactId),
              guaranteeNonNullable(dataSpaceInfo.versionId),
              dataSpaceInfo.path,
              dataSpaceInfo.defaultExecutionContext,
              undefined,
              undefined,
            ),
          );
        } else {
          this.applicationStore.notificationService.notifyWarning(
            `Can't switch data space: default execution context not specified`,
          );
        }
      },
      true,
      dataSpaceAnalysisResult,
      (ec: DataSpaceExecutionContext) => {
        // runtime should already be set
        const runtimePointer = guaranteeType(
          queryBuilderState.executionContextState.runtimeValue,
          RuntimePointer,
        );
        this.applicationStore.navigationService.navigator.updateCurrentLocation(
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
        queryBuilderState.applicationStore.navigationService.navigator.updateCurrentLocation(
          generateDataSpaceQueryCreatorRoute(
            guaranteeNonNullable(queryBuilderState.projectInfo).groupId,
            guaranteeNonNullable(queryBuilderState.projectInfo).artifactId,
            guaranteeNonNullable(queryBuilderState.projectInfo).versionId,
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
          queryBuilderState.executionContextState.runtimeValue,
          RuntimePointer,
        );
        queryBuilderState.applicationStore.navigationService.navigator.updateCurrentLocation(
          generateDataSpaceQueryCreatorRoute(
            guaranteeNonNullable(queryBuilderState.projectInfo).groupId,
            guaranteeNonNullable(queryBuilderState.projectInfo).artifactId,
            guaranteeNonNullable(queryBuilderState.projectInfo).versionId,
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
      projectInfo,
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

  getPersistConfiguration(
    lambda: RawLambda,
    options?: { update?: boolean | undefined },
  ): QueryPersistConfiguration {
    return {
      defaultName: options?.update
        ? `${extractElementNameFromPath(this.dataSpacePath)}`
        : `New Query for ${extractElementNameFromPath(this.dataSpacePath)}[${
            this.executionContext
          }]`,
      decorator: (query: Query): void => {
        query.id = uuid();
        query.groupId = this.groupId;
        query.artifactId = this.artifactId;
        query.versionId = this.versionId;
        query.taggedValues = [
          createQueryDataSpaceTaggedValue(this.dataSpacePath),
          createQueryClassTaggedValue(
            guaranteeNonNullable(this.queryBuilderState?.class?.path),
          ),
        ];
      },
    };
  }
}
