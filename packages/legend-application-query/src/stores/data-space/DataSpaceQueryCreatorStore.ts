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
  extractElementNameFromPath,
  RuntimePointer,
  PackageableElementExplicitReference,
  QueryProjectCoordinates,
  CORE_PURE_PATH,
  type V1_DataProduct,
} from '@finos/legend-graph';
import {
  DepotScope,
  type DepotServerClient,
  extractDepotEntityInfo,
  LATEST_VERSION_ALIAS,
  type StoredEntity,
  type StoredSummaryEntity,
} from '@finos/legend-server-depot';
import {
  ActionState,
  LogEvent,
  assertErrorThrown,
  assertTrue,
  guaranteeNonNullable,
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
  type DepotEntityWithOrigin,
} from '@finos/legend-storage';
import {
  DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
  type DataSpaceExecutionContext,
  extractDataSpaceInfo,
  getDataSpace,
  type V1_DataSpace,
} from '@finos/legend-extension-dsl-data-space/graph';
import {
  QueryBuilderActionConfig_QueryApplication,
  QueryEditorStore,
  type QueryPersistConfiguration,
} from '../QueryEditorStore.js';
import type { LegendQueryApplicationStore } from '../LegendQueryBaseStore.js';
import {
  type DataSpaceQueryBuilderState,
  ResolvedDataSpaceEntityWithOrigin,
  createQueryClassTaggedValue,
  createQueryDataSpaceTaggedValue,
} from '@finos/legend-extension-dsl-data-space/application';
import { LegendQueryUserDataHelper } from '../../__lib__/LegendQueryUserDataHelper.js';
import {
  type VisitedDataProduct,
  createVisitedDataSpaceId,
  hasDataSpaceInfoBeenVisited,
  createSimpleVisitedDataspace,
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
import {
  APPLICATION_EVENT,
  type GenericLegendApplicationStore,
} from '@finos/legend-application';
import { LegendQueryBareQueryBuilderState } from './LegendQueryBareQueryBuilderState.js';
import type { DataSpaceOption } from '@finos/legend-extension-dsl-data-space/application-query';
import { LegendQueryDataSpaceQueryBuilderState } from './query-builder/LegendQueryDataSpaceQueryBuilderState.js';

export type QueryableDataProduct = {
  classifier:
    | typeof DATA_SPACE_ELEMENT_CLASSIFIER_PATH
    | CORE_PURE_PATH.DATA_PRODUCT;
  groupId: string;
  artifactId: string;
  versionId: string;
  dataSpacePath: string;
  executionContext: string;
  runtimePath?: string | undefined;
  classPath?: string | undefined;
};

type DataSpaceVisitedEntity = {
  visited: VisitedDataProduct;
  defaultExecKey: string;
  entity: Entity;
  classifier:
    | CORE_PURE_PATH.DATA_PRODUCT
    | typeof DATA_SPACE_ELEMENT_CLASSIFIER_PATH;
};

export type DataProductOption = {
  label: string;
  value: DepotEntityWithOrigin;
};

export type DataProductWithLegacyOption = DataSpaceOption | DataProductOption;

// Helper function to build option for both DataSpace and DataProduct
const buildDataSpaceOrProductOption = (
  value: ResolvedDataSpaceEntityWithOrigin | DepotEntityWithOrigin,
): DataProductWithLegacyOption => {
  // For ResolvedDataSpaceEntityWithOrigin, use title if available, otherwise name
  // For DepotEntityWithOrigin, just use name
  const label =
    value instanceof ResolvedDataSpaceEntityWithOrigin
      ? (value.title ?? value.name)
      : value.name;
  return {
    label,
    value: value,
  };
};

export class DataProductSelectorState {
  legacyDataProducts: ResolvedDataSpaceEntityWithOrigin[] | undefined;
  dataProducts: DepotEntityWithOrigin[] | undefined;
  readonly loadProductsState = ActionState.create();
  readonly depotServerClient: DepotServerClient;
  readonly applicationStore: GenericLegendApplicationStore;
  disableDataProducts = true;

  constructor(
    depotServerClient: DepotServerClient,
    applicationStore: GenericLegendApplicationStore,
  ) {
    makeObservable(this, {
      legacyDataProducts: observable,
      dataProducts: observable,
      loadProductsState: observable,
      loadProducts: flow,
      setLegacyDataProducts: action,
      setDataProducts: action,
      clearProducts: action,
    });
    this.applicationStore = applicationStore;
    this.depotServerClient = depotServerClient;
  }

  setLegacyDataProducts(val: ResolvedDataSpaceEntityWithOrigin[]): void {
    this.legacyDataProducts = val;
  }

  setDataProducts(val: DepotEntityWithOrigin[]): void {
    this.dataProducts = val;
  }

  clearProducts(): void {
    this.legacyDataProducts = undefined;
    this.dataProducts = undefined;
  }

  get isFetchingProducts(): boolean {
    return this.loadProductsState.isInProgress;
  }

  get isCompletelyLoaded(): boolean {
    return Boolean(this.legacyDataProducts) && Boolean(this.dataProducts);
  }

  *loadProducts(): GeneratorFn<void> {
    this.loadProductsState.inProgress();
    try {
      // Load DataSpaces
      const dataSpaces = (
        (yield this.depotServerClient.getEntitiesByClassifier(
          DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
          {
            scope: DepotScope.RELEASES,
          },
        )) as StoredEntity[]
      ).map((storedEntity) => {
        return extractDataSpaceInfo(storedEntity, false);
      });
      const dataProducts = this.disableDataProducts
        ? []
        : (
            (yield this.depotServerClient.getEntitiesSummaryByClassifier(
              CORE_PURE_PATH.DATA_PRODUCT,
              {
                scope: DepotScope.RELEASES,
                summary: true,
              },
            )) as StoredSummaryEntity[]
          ).map((storedEntity) => {
            return extractDepotEntityInfo(storedEntity, false);
          });
      // Set both lists separately
      this.legacyDataProducts = dataSpaces;
      this.dataProducts = dataProducts;
      this.loadProductsState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.loadProductsState.fail();
      this.applicationStore.notificationService.notifyError(error);
      this.applicationStore.logService.error(
        LogEvent.create(APPLICATION_EVENT.GENERIC_FAILURE),
        error,
      );
    }
  }

  get dataProductOptions(): DataProductWithLegacyOption[] {
    return [
      ...(this.legacyDataProducts?.map(buildDataSpaceOrProductOption) ?? []),
      ...(this.dataProducts?.map(buildDataSpaceOrProductOption) ?? []),
    ];
  }
}

export class DataSpaceQueryCreatorStore extends QueryEditorStore {
  queryableDataSpace: QueryableDataProduct | undefined;
  productSelectorState: DataProductSelectorState;
  declare queryBuilderState?: DataSpaceQueryBuilderState | undefined;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
    queryableDataSpace: QueryableDataProduct | undefined,
  ) {
    super(applicationStore, depotServerClient);
    makeObservable(this, {
      changeDataSpace: flow,
      productSelectorState: observable,
      queryableDataSpace: observable,
      setQueryableDataSpace: action,
      canPersistToSavedQuery: computed,
    });
    this.queryableDataSpace = queryableDataSpace;
    this.productSelectorState = new DataProductSelectorState(
      depotServerClient,
      applicationStore,
    );
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

  setQueryableDataSpace(val: QueryableDataProduct | undefined): void {
    this.queryableDataSpace = val;
  }

  reConfigureWithDataSpaceInfo(
    info: ResolvedDataSpaceEntityWithOrigin,
  ): boolean {
    if (info.origin && info.defaultExecutionContext) {
      this.queryableDataSpace = {
        groupId: info.origin.groupId,
        artifactId: info.origin.artifactId,
        versionId: LATEST_VERSION_ALIAS,
        dataSpacePath: info.path,
        executionContext: info.defaultExecutionContext,
        classifier: DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
      };
      return true;
    }
    return false;
  }

  reConfigureWithDataProductInfo(info: DepotEntityWithOrigin): boolean {
    if (info.origin) {
      this.queryableDataSpace = {
        groupId: info.origin.groupId,
        artifactId: info.origin.artifactId,
        versionId: LATEST_VERSION_ALIAS,
        dataSpacePath: info.path,
        executionContext: '',
        classifier: CORE_PURE_PATH.DATA_PRODUCT,
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
          executionContext: hydrated.defaultExecKey,
          classifier: hydrated.classifier,
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
      const queryBuilderState = new LegendQueryBareQueryBuilderState(
        this,
        this.applicationStore,
        this.graphManagerState,
        this.depotServerClient,
        {
          onDataSpaceChange: (
            dataSpaceInfo: ResolvedDataSpaceEntityWithOrigin,
          ) => {
            if (dataSpaceInfo.defaultExecutionContext) {
              this.changeDataSpace(dataSpaceInfo);
            } else {
              this.applicationStore.notificationService.notifyWarning(
                `Can't switch data product: default execution context not specified`,
              );
            }
          },
          onDataProductChange: (dataProductInfo: DepotEntityWithOrigin) => {
            // TODO: Implement data product change logic
            this.applicationStore.notificationService.notifyWarning(
              `Data product change not yet implemented`,
            );
          },
        },
        this.applicationStore.config.options.queryBuilderConfig,
        this.productSelectorState,
      );
      return queryBuilderState;
    }
  }

  async redirectIfPossible(): Promise<DataSpaceVisitedEntity | undefined> {
    const visitedQueries =
      LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(
        this.applicationStore.userDataService,
      );

    for (const visited of visitedQueries) {
      const hydrated = await this.verifyDataSpaceExists(visited);
      if (hydrated) {
        return hydrated;
      }
    }

    return undefined;
  }

  async verifyDataSpaceExists(
    visited: VisitedDataProduct,
  ): Promise<DataSpaceVisitedEntity | undefined> {
    try {
      const entity = (await this.depotServerClient.getVersionEntity(
        visited.groupId,
        visited.artifactId,
        visited.versionId ?? LATEST_VERSION_ALIAS,
        visited.path,
      )) as unknown as Entity;
      const classifierPath = entity.classifierPath;
      if (classifierPath === CORE_PURE_PATH.DATA_PRODUCT) {
        const entityContent = entity.content as unknown as V1_DataProduct;
        const native = guaranteeNonNullable(entityContent.nativeModelAccess);
        if (visited.execContext) {
          const executionContextExists =
            native.nativeModelExecutionContexts.some(
              (context) => context.key === visited.execContext,
            );

          // If execution context no longer exists, clear it but still return the entity
          if (!executionContextExists) {
            visited.execContext = undefined;
          }
        }
        return {
          defaultExecKey: native.defaultExecutionContext,
          visited,
          entity,
          classifier: CORE_PURE_PATH.DATA_PRODUCT,
        };
      } else {
        const entityContent = entity.content as unknown as V1_DataSpace;

        // Verify the execution context still exists
        if (visited.execContext) {
          const executionContextExists = entityContent.executionContexts.some(
            (context) => context.name === visited.execContext,
          );

          // If execution context no longer exists, clear it but still return the entity
          if (!executionContextExists) {
            visited.execContext = undefined;
          }
        }
        return {
          defaultExecKey: entityContent.defaultExecutionContext,
          visited,
          entity,
          classifier: DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
        };
      }
    } catch (error) {
      assertErrorThrown(error);
      // If the data space no longer exists, remove it from visited list
      LegendQueryUserDataHelper.removeRecentlyViewedDataSpace(
        this.applicationStore.userDataService,
        visited.id,
      );
      return undefined;
    }
  }

  async initializeQueryBuilderStateWithQueryableDataSpace(
    queryableDataSpace: QueryableDataProduct,
  ): Promise<QueryBuilderState> {
    const { dataSpaceAnalysisResult, isLightGraphEnabled } =
      await this.buildGraphAndDataspaceAnalyticsResult(
        queryableDataSpace.groupId,
        queryableDataSpace.artifactId,
        queryableDataSpace.versionId,
        queryableDataSpace.executionContext,
        queryableDataSpace.dataSpacePath,
      );
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
    const queryBuilderState = new LegendQueryDataSpaceQueryBuilderState(
      this.applicationStore,
      this.graphManagerState,
      QueryBuilderDataBrowserWorkflow.INSTANCE,
      new QueryBuilderActionConfig_QueryApplication(this),
      dataSpace,
      executionContext,
      isLightGraphEnabled,
      this.depotServerClient,
      {
        groupId: queryableDataSpace.groupId,
        artifactId: queryableDataSpace.artifactId,
        versionId: queryableDataSpace.versionId,
      },
      (dataSpaceInfo: ResolvedDataSpaceEntityWithOrigin) =>
        hasDataSpaceInfoBeenVisited(dataSpaceInfo, visitedDataSpaces),
      async (dataSpaceInfo: ResolvedDataSpaceEntityWithOrigin) => {
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
    ).withOptions(
      this.productSelectorState.legacyDataProducts,
      this.productSelectorState.dataProducts,
    );
    queryBuilderState.setExecutionContext(executionContext);
    await queryBuilderState.propagateExecutionContextChange(true);

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

  *changeDataSpace(val: ResolvedDataSpaceEntityWithOrigin): GeneratorFn<void> {
    try {
      assertTrue(
        this.reConfigureWithDataSpaceInfo(val),
        'Data product selected does not contain valid inputs, groupId, artifactId, and version',
      );
      this.initState.inProgress();
      this.graphManagerState.resetGraph();
      yield flowResult(this.buildGraph());
      this.queryBuilderState =
        (yield this.initializeQueryBuilderState()) as DataSpaceQueryBuilderState;
      this.queryLoaderState.initialize(this.queryBuilderState);
      this.initState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notify(
        `Can't to change data product: ${error.message}`,
      );
      this.applicationStore.logService.error(
        LogEvent.create(APPLICATION_EVENT.GENERIC_FAILURE),
        error,
      );
      this.onInitializeFailure();
      this.initState.fail();
    }
  }

  *changeDataProduct(val: DepotEntityWithOrigin): GeneratorFn<void> {
    try {
      assertTrue(
        this.reConfigureWithDataProductInfo(val),
        'Data product selected does not contain valid inputs, groupId, artifactId, and version',
      );
      this.initState.inProgress();
      this.graphManagerState.resetGraph();
      yield flowResult(this.buildGraph());
      this.queryBuilderState =
        (yield this.initializeQueryBuilderState()) as DataSpaceQueryBuilderState;
      this.queryLoaderState.initialize(this.queryBuilderState);
      this.initState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notify(
        `Can't to change data product: ${error.message}`,
      );
      this.applicationStore.logService.error(
        LogEvent.create(APPLICATION_EVENT.GENERIC_FAILURE),
        error,
      );
      this.onInitializeFailure();
      this.initState.fail();
    }
  }

  override *buildGraph(): GeneratorFn<void> {
    // do nothing
  }

  addVisitedDataSpace(queryableDataSpace: QueryableDataProduct): void {
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
