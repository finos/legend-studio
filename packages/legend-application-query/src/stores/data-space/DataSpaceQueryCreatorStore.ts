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
  type QuerySearchSpecification,
  type RawLambda,
  type FunctionAnalysisInfo,
  extractElementNameFromPath,
  RuntimePointer,
  PackageableElementExplicitReference,
  QueryProjectCoordinates,
  CORE_PURE_PATH,
  V1_deserializePackageableElement,
  V1_ConcreteFunctionDefinition,
  V1_buildFunctionInfoAnalysis,
} from '@finos/legend-graph';
import {
  type DepotServerClient,
  StoreProjectData,
  LATEST_VERSION_ALIAS,
} from '@finos/legend-server-depot';
import {
  LogEvent,
  assertErrorThrown,
  assertTrue,
  guaranteeNonNullable,
  guaranteeType,
  returnUndefOnError,
  uuid,
  type GeneratorFn,
} from '@finos/legend-shared';
import {
  QueryBuilderDataBrowserWorkflow,
  type QueryBuilderState,
} from '@finos/legend-query-builder';
import {
  parseGACoordinates,
  type Entity,
  type ProjectGAVCoordinates,
} from '@finos/legend-storage';
import {
  type DataSpaceAnalysisResult,
  type DataSpaceExecutionContext,
  DSL_DataSpace_getGraphManagerExtension,
  getDataSpace,
  retrieveAnalyticsResultCache,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  QueryBuilderActionConfig_QueryApplication,
  QueryEditorStore,
  type QueryPersistConfiguration,
} from '../QueryEditorStore.js';
import type { LegendQueryApplicationStore } from '../LegendQueryBaseStore.js';
import {
  DataSpaceQueryBuilderState,
  createQueryClassTaggedValue,
  createQueryDataSpaceTaggedValue,
  type DataSpaceInfo,
} from '@finos/legend-extension-dsl-data-space/application';
import { LegendQueryUserDataHelper } from '../../__lib__/LegendQueryUserDataHelper.js';
import {
  createVisitedDataSpaceId,
  hasDataSpaceInfoBeenVisited,
  createSimpleVisitedDataspace,
  type VisitedDataspace,
} from '../../__lib__/LegendQueryUserDataSpaceHelper.js';
import { LEGEND_QUERY_APP_EVENT } from '../../__lib__/LegendQueryEvent.js';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import { DataSpaceQuerySetupState } from './DataSpaceQuerySetupState.js';
import {
  createDataSpaceDepoRepo,
  createViewProjectHandler,
  createViewSDLCProjectHandler,
} from './DataSpaceQueryBuilderHelper.js';

export type QueryableDataSpace = {
  groupId: string;
  artifactId: string;
  versionId: string;
  dataSpacePath: string;
  executionContext: string;
  runtimePath?: string | undefined;
  classPath?: string | undefined;
};

type DataSpaceVisitedEntity = {
  visited: VisitedDataspace;
  entity: Entity;
};

export class DataSpaceQueryCreatorStore extends QueryEditorStore {
  queryableDataSpace: QueryableDataSpace | undefined;
  dataSpaceCache: DataSpaceInfo[] | undefined;
  declare queryBuilderState?: DataSpaceQueryBuilderState | undefined;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
    queryableDataSpace: QueryableDataSpace | undefined,
  ) {
    super(applicationStore, depotServerClient);
    makeObservable(this, {
      changeDataSpace: flow,
      dataSpaceCache: observable,
      queryableDataSpace: observable,
      setDataSpaceCache: action,
      setQueryableDataSpace: action,
      canPersistToSavedQuery: computed,
    });
    this.queryableDataSpace = queryableDataSpace;
  }

  override get canPersistToSavedQuery(): boolean {
    return Boolean(this.queryableDataSpace);
  }

  override get isViewProjectActionDisabled(): boolean {
    return !this.queryableDataSpace;
  }

  getProjectInfo(): ProjectGAVCoordinates | undefined {
    return this.queryableDataSpace;
  }

  setDataSpaceCache(val: DataSpaceInfo[]): void {
    this.dataSpaceCache = val;
  }

  setQueryableDataSpace(val: QueryableDataSpace | undefined): void {
    this.queryableDataSpace = val;
  }

  reConfigureWithDataSpaceInfo(info: DataSpaceInfo): boolean {
    if (
      info.groupId &&
      info.artifactId &&
      info.versionId &&
      info.defaultExecutionContext
    ) {
      this.queryableDataSpace = {
        groupId: info.groupId,
        artifactId: info.artifactId,
        versionId: LATEST_VERSION_ALIAS,
        dataSpacePath: info.path,
        executionContext: info.defaultExecutionContext,
      };
      return true;
    }
    return false;
  }

  override *initialize(): GeneratorFn<void> {
    if (!this.queryableDataSpace) {
      const hydrated = (yield flowResult(this.redirectIfPossible())) as
        | DataSpaceVisitedEntity
        | undefined;
      if (hydrated) {
        this.setQueryableDataSpace({
          groupId: hydrated.visited.groupId,
          artifactId: hydrated.visited.artifactId,
          versionId: hydrated.visited.versionId ?? LATEST_VERSION_ALIAS,
          dataSpacePath: hydrated.visited.path,
          executionContext: hydrated.entity.content
            .defaultExecutionContext as string,
        });
      }
    }
    super.initialize();
  }

  async initializeQueryBuilderState(): Promise<QueryBuilderState> {
    if (this.queryableDataSpace) {
      return this.initializeQueryBuilderStateWithQueryableDataSpace(
        this.queryableDataSpace,
      );
    } else {
      const queryBuilderState = new DataSpaceQuerySetupState(
        this,
        this.applicationStore,
        this.graphManagerState,
        this.depotServerClient,
        (dataSpaceInfo: DataSpaceInfo) => {
          if (dataSpaceInfo.defaultExecutionContext) {
            this.changeDataSpace(dataSpaceInfo);
          } else {
            this.applicationStore.notificationService.notifyWarning(
              `Can't switch data space: default execution context not specified`,
            );
          }
        },
        createViewProjectHandler(this.applicationStore),
        createViewSDLCProjectHandler(
          this.applicationStore,
          this.depotServerClient,
        ),
        this.applicationStore.config.options.queryBuilderConfig,
      );
      if (this.dataSpaceCache?.length) {
        queryBuilderState.configureDataSpaceOptions(this.dataSpaceCache);
      }
      return queryBuilderState;
    }
  }

  async redirectIfPossible(): Promise<DataSpaceVisitedEntity | undefined> {
    const visitedQueries =
      LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(
        this.applicationStore.userDataService,
      );
    let redirect: DataSpaceVisitedEntity | undefined = undefined;
    for (let i = 0; i < visitedQueries.length; i++) {
      const visited = visitedQueries[i];
      if (visited) {
        const hydrated = await this.hyrdateVisitedDataSpace(visited);
        if (hydrated) {
          redirect = hydrated;
          break;
        }
      }
    }
    return redirect;
  }

  async hyrdateVisitedDataSpace(
    visited: VisitedDataspace,
  ): Promise<DataSpaceVisitedEntity | undefined> {
    try {
      const entity = (await this.depotServerClient.getVersionEntity(
        visited.groupId,
        visited.artifactId,
        visited.versionId ?? LATEST_VERSION_ALIAS,
        visited.path,
      )) as unknown as Entity;
      const content = entity.content as {
        executionContexts: { name: string }[];
      };
      if (visited.execContext) {
        const found = content.executionContexts.find(
          (e) => e.name === visited.execContext,
        );
        if (!found) {
          visited.execContext = undefined;
          return {
            visited,
            entity,
          };
        }
      }
      return {
        visited,
        entity,
      };
    } catch (error) {
      assertErrorThrown(error);
      LegendQueryUserDataHelper.removeRecentlyViewedDataSpace(
        this.applicationStore.userDataService,
        visited.id,
      );
    }
    return undefined;
  }

  async initializeQueryBuilderStateWithQueryableDataSpace(
    queryableDataSpace: QueryableDataSpace,
  ): Promise<QueryBuilderState> {
    const dataSpace = getDataSpace(
      queryableDataSpace.dataSpacePath,
      this.graphManagerState.graph,
    );
    const executionContext = guaranteeNonNullable(
      dataSpace.executionContexts.find(
        (context) => context.name === queryableDataSpace.executionContext,
      ),
      `Can't find execution context '${queryableDataSpace.executionContext}'`,
    );
    let dataSpaceAnalysisResult;
    try {
      const project = StoreProjectData.serialization.fromJson(
        await this.depotServerClient.getProject(
          queryableDataSpace.groupId,
          queryableDataSpace.artifactId,
        ),
      );
      dataSpaceAnalysisResult = await DSL_DataSpace_getGraphManagerExtension(
        this.graphManagerState.graphManager,
      ).retrieveDataSpaceAnalysisFromCache(() =>
        retrieveAnalyticsResultCache(
          project,
          queryableDataSpace.versionId,
          dataSpace.path,
          this.depotServerClient,
        ),
      );
    } catch {
      // do nothing
    }
    const sourceInfo = {
      groupId: queryableDataSpace.groupId,
      artifactId: queryableDataSpace.artifactId,
      versionId: queryableDataSpace.versionId,
      dataSpace: dataSpace.path,
    };
    const visitedDataSpaces =
      LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(
        this.applicationStore.userDataService,
      );
    const queryBuilderState = new DataSpaceQueryBuilderState(
      this.applicationStore,
      this.graphManagerState,
      QueryBuilderDataBrowserWorkflow.INSTANCE,
      new QueryBuilderActionConfig_QueryApplication(this),
      dataSpace,
      executionContext,
      createDataSpaceDepoRepo(
        this,
        queryableDataSpace.groupId,
        queryableDataSpace.artifactId,
        queryableDataSpace.versionId,
        (dataSpaceInfo: DataSpaceInfo) =>
          hasDataSpaceInfoBeenVisited(dataSpaceInfo, visitedDataSpaces),
      ),
      (dataSpaceInfo: DataSpaceInfo) => {
        flowResult(this.changeDataSpace(dataSpaceInfo)).catch(
          this.applicationStore.alertUnhandledError,
        );
      },
      dataSpaceAnalysisResult,
      (ec: DataSpaceExecutionContext) => {
        returnUndefOnError(() =>
          LegendQueryUserDataHelper.updateVisitedDataSpaceExecContext(
            this.applicationStore.userDataService,
            queryableDataSpace.groupId,
            queryableDataSpace.artifactId,
            dataSpace.path,
            ec.name,
          ),
        );
      },
      undefined,
      undefined,
      this.applicationStore.config.options.queryBuilderConfig,
      sourceInfo,
    );
    if (this.dataSpaceCache?.length) {
      queryBuilderState.dataSpaceRepo.configureDataSpaceOptions(
        this.dataSpaceCache,
      );
    }
    queryBuilderState.setExecutionContext(executionContext);
    queryBuilderState.propagateExecutionContextChange(executionContext);

    // set runtime if already chosen
    if (queryableDataSpace.runtimePath) {
      queryBuilderState.changeRuntime(
        new RuntimePointer(
          PackageableElementExplicitReference.create(
            this.graphManagerState.graph.getRuntime(
              queryableDataSpace.runtimePath,
            ),
          ),
        ),
      );
    }

    // set class if already chosen
    if (queryableDataSpace.classPath) {
      queryBuilderState.changeClass(
        this.graphManagerState.graph.getClass(queryableDataSpace.classPath),
      );
    }

    // add to visited dataspaces
    this.addVisitedDataSpace(queryableDataSpace);
    return queryBuilderState;
  }

  // build function analysis info by fetching functions within this project from metadata when building minimal graph
  async processFunctionForMinimalGraph(
    project: StoreProjectData,
    queryableDataSpace: QueryableDataSpace,
    dataSpaceAnalysisResult: DataSpaceAnalysisResult,
  ): Promise<void> {
    const functionEntities = await this.depotServerClient.getEntities(
      project,
      queryableDataSpace.versionId,
      CORE_PURE_PATH.FUNCTION,
    );
    const functionProtocols = functionEntities.map((func) =>
      guaranteeType(
        V1_deserializePackageableElement(
          (func.entity as Entity).content,
          this.graphManagerState.graphManager.pluginManager.getPureProtocolProcessorPlugins(),
        ),
        V1_ConcreteFunctionDefinition,
      ),
    );
    const dependencyFunctionEntities =
      await this.depotServerClient.getDependencyEntities(
        queryableDataSpace.groupId,
        queryableDataSpace.artifactId,
        queryableDataSpace.versionId,
        false,
        false,
        CORE_PURE_PATH.FUNCTION,
      );
    const dependencyFunctionProtocols = dependencyFunctionEntities.map((func) =>
      guaranteeType(
        V1_deserializePackageableElement(
          (func.entity as Entity).content,
          this.graphManagerState.graphManager.pluginManager.getPureProtocolProcessorPlugins(),
        ),
        V1_ConcreteFunctionDefinition,
      ),
    );
    const functionInfos = V1_buildFunctionInfoAnalysis(
      functionProtocols,
      this.graphManagerState.graph,
    );
    const dependencyFunctionInfos = V1_buildFunctionInfoAnalysis(
      dependencyFunctionProtocols,
      this.graphManagerState.graph,
    );
    if (functionInfos.length > 0) {
      const functionInfoMap = new Map<string, FunctionAnalysisInfo>();
      functionInfos.forEach((funcInfo) => {
        functionInfoMap.set(funcInfo.functionPath, funcInfo);
      });
      dataSpaceAnalysisResult.functionInfos = functionInfoMap;
    }
    if (dependencyFunctionInfos.length > 0) {
      const dependencyFunctionInfoMap = new Map<string, FunctionAnalysisInfo>();
      functionInfos.forEach((funcInfo) => {
        dependencyFunctionInfoMap.set(funcInfo.functionPath, funcInfo);
      });
      dataSpaceAnalysisResult.dependencyFunctionInfos =
        dependencyFunctionInfoMap;
    }
  }

  *changeDataSpace(val: DataSpaceInfo): GeneratorFn<void> {
    try {
      assertTrue(
        this.reConfigureWithDataSpaceInfo(val),
        'Dataspace selected does not contain valid inputs, groupId, artifactId, and version',
      );
      this.initState.inProgress();
      if (
        this.queryBuilderState instanceof DataSpaceQueryBuilderState &&
        this.queryBuilderState.dataSpaceRepo.dataSpaces?.length
      ) {
        this.setDataSpaceCache(this.queryBuilderState.dataSpaceRepo.dataSpaces);
      }
      this.graphManagerState.resetGraph();
      yield flowResult(this.buildGraph());
      this.queryBuilderState =
        (yield this.initializeQueryBuilderState()) as DataSpaceQueryBuilderState;
      this.queryLoaderState.initialize(this.queryBuilderState);
      this.initState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notify(
        `Unable to change dataspace: ${error.message}`,
      );
      this.onInitializeFailure();
      this.initState.fail();
    }
  }

  addVisitedDataSpace(queryableDataSpace: QueryableDataSpace): void {
    try {
      LegendQueryUserDataHelper.addVisitedDatspace(
        this.applicationStore.userDataService,
        createSimpleVisitedDataspace(
          queryableDataSpace.groupId,
          queryableDataSpace.artifactId,
          queryableDataSpace.versionId,
          queryableDataSpace.dataSpacePath,
          queryableDataSpace.executionContext,
        ),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.logService.warn(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.LOCAL_STORAGE_PERSIST_ERROR),
        error.message,
      );
    }
  }

  getPersistConfiguration(
    lambda: RawLambda,
    options?: { update?: boolean | undefined },
  ): QueryPersistConfiguration | undefined {
    const queryableDataSpace = this.queryableDataSpace;
    if (queryableDataSpace) {
      return {
        defaultName: options?.update
          ? `${extractElementNameFromPath(queryableDataSpace.dataSpacePath)}`
          : `New Query for ${extractElementNameFromPath(queryableDataSpace.dataSpacePath)}[${
              queryableDataSpace.executionContext
            }]`,
        decorator: (query: Query): void => {
          query.id = uuid();
          query.groupId = queryableDataSpace.groupId;
          query.artifactId = queryableDataSpace.artifactId;
          query.versionId = queryableDataSpace.versionId;
          if (this.queryBuilderState?.class) {
            query.taggedValues = [
              createQueryClassTaggedValue(this.queryBuilderState.class.path),
            ];
          }
        },
      };
    }
    return undefined;
  }

  override onInitializeFailure(): void {
    if (this.queryableDataSpace) {
      LegendQueryUserDataHelper.removeRecentlyViewedDataSpace(
        this.applicationStore.userDataService,
        createVisitedDataSpaceId(
          this.queryableDataSpace.groupId,
          this.queryableDataSpace.artifactId,
          this.queryableDataSpace.dataSpacePath,
        ),
      );
    }
  }

  override decorateSearchSpecification(
    val: QuerySearchSpecification,
  ): QuerySearchSpecification {
    if (this.queryableDataSpace) {
      const currentProjectCoordinates = new QueryProjectCoordinates();
      currentProjectCoordinates.groupId = this.queryableDataSpace.groupId;
      currentProjectCoordinates.artifactId = this.queryableDataSpace.artifactId;
      val.projectCoordinates = [
        // either get queries for the current project
        currentProjectCoordinates,
        // or any of its dependencies
        ...Array.from(
          this.graphManagerState.graph.dependencyManager.projectDependencyModelsIndex.keys(),
        ).map((dependencyKey) => {
          const { groupId, artifactId } = parseGACoordinates(dependencyKey);
          const coordinates = new QueryProjectCoordinates();
          coordinates.groupId = groupId;
          coordinates.artifactId = artifactId;
          return coordinates;
        }),
      ];
      val.taggedValues = [
        createQueryDataSpaceTaggedValue(this.queryableDataSpace.dataSpacePath),
      ];
      val.combineTaggedValuesCondition = true;
    }

    return val;
  }
}
