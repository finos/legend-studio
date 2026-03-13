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
  type DataProductAccessType,
  type V1_DataProductArtifact,
} from '@finos/legend-graph';
import {
  type DepotServerClient,
  LATEST_VERSION_ALIAS,
} from '@finos/legend-server-depot';
import {
  LogEvent,
  assertErrorThrown,
  assertNonNullable,
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
  type ProjectGAVCoordinates,
  type DepotEntityWithOrigin,
} from '@finos/legend-storage';
import {
  type DataSpaceExecutionContext,
  getDataSpace,
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
import { DataProductSelectorState } from './DataProductSelectorState.js';
import { LegendQueryUserDataHelper } from '../../__lib__/LegendQueryUserDataHelper.js';
import {
  type VisitedLegacyDataProduct,
  type VisitedDataProduct,
  createVisitedDataSpaceId,
  createVisitedDataProductId,
  hasDataSpaceInfoBeenVisited,
  createSimpleVisitedDataspace,
  createSimpleVisitedDataProduct,
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
import { APPLICATION_EVENT } from '@finos/legend-application';
import { LegendQueryBareQueryBuilderState } from './LegendQueryBareQueryBuilderState.js';
import { LegendQueryDataSpaceQueryBuilderState } from './query-builder/LegendQueryDataSpaceQueryBuilderState.js';
import type { LegendQueryDataProductQueryBuilderState } from '../data-product/query-builder/LegendQueryDataProductQueryBuilderState.js';
import { resolveDefaultDataProductAccessType } from '../data-product/query-builder/DataProductArtifactHelper.js';

export abstract class LegendQueryableElement {
  readonly groupId: string;
  readonly artifactId: string;
  readonly versionId: string;

  constructor(groupId: string, artifactId: string, versionId: string) {
    this.groupId = groupId;
    this.artifactId = artifactId;
    this.versionId = versionId;
  }

  abstract get path(): string;
  abstract get execContext(): string;
}

// TODO:
// 1. handle route to data product
// 2. handle hyration
export class QueryableLegacyDataProduct extends LegendQueryableElement {
  readonly dataSpacePath: string;
  readonly executionContext: string;
  readonly runtimePath?: string | undefined;
  readonly classPath?: string | undefined;

  constructor(
    groupId: string,
    artifactId: string,
    versionId: string,
    dataSpacePath: string,
    executionContext: string,
    runtimePath?: string | undefined,
    classPath?: string | undefined,
  ) {
    super(groupId, artifactId, versionId);
    this.dataSpacePath = dataSpacePath;
    this.executionContext = executionContext;
    this.runtimePath = runtimePath;
    this.classPath = classPath;
  }

  get path(): string {
    return this.dataSpacePath;
  }

  get execContext(): string {
    return this.executionContext;
  }
}

export class QueryableDataProduct extends LegendQueryableElement {
  readonly dataProductPath: string;
  readonly dataProductType: string;
  readonly id: string;

  constructor(
    groupId: string,
    artifactId: string,
    versionId: string,
    dataProductPath: string,
    dataProductType: string,
    id: string,
  ) {
    super(groupId, artifactId, versionId);
    this.dataProductPath = dataProductPath;
    this.dataProductType = dataProductType;
    this.id = id;
  }

  get path(): string {
    return this.dataProductPath;
  }

  get execContext(): string {
    return this.id;
  }
}

const enum VisitedEntityType {
  DATASPACE = 'DATASPACE',
  DATAPRODUCT = 'DATAPRODUCT',
}

export class DataProductQueryCreatorStore extends QueryEditorStore {
  queryableElement: LegendQueryableElement | undefined;
  productSelectorState: DataProductSelectorState;
  declare queryBuilderState:
    | DataSpaceQueryBuilderState
    | LegendQueryDataProductQueryBuilderState
    | LegendQueryBareQueryBuilderState
    | undefined;

  constructor(
    applicationStore: LegendQueryApplicationStore,
    depotServerClient: DepotServerClient,
    queryableElement: LegendQueryableElement | undefined,
  ) {
    super(applicationStore, depotServerClient);
    makeObservable(this, {
      changeDataSpace: flow,
      changeDataProduct: flow,
      productSelectorState: observable,
      queryableElement: observable,
      setQueryableElement: action,
      canPersistToSavedQuery: computed,
    });
    this.queryableElement = queryableElement;
    this.productSelectorState = new DataProductSelectorState(
      depotServerClient,
      applicationStore,
    );
  }

  override get canPersistToSavedQuery(): boolean {
    return Boolean(this.queryableElement);
  }

  override get isViewProjectActionDisabled(): boolean {
    return !this.queryableElement;
  }

  getProjectInfo(): ProjectGAVCoordinates | undefined {
    return this.queryableElement;
  }

  setQueryableElement(val: LegendQueryableElement | undefined): void {
    this.queryableElement = val;
  }

  reConfigureWithDataSpaceInfo(
    info: ResolvedDataSpaceEntityWithOrigin,
  ): boolean {
    if (info.origin && info.defaultExecutionContext) {
      this.queryableElement = new QueryableLegacyDataProduct(
        info.origin.groupId,
        info.origin.artifactId,
        LATEST_VERSION_ALIAS,
        info.path,
        info.defaultExecutionContext,
      );
      return true;
    }
    return false;
  }

  reConfigureWithDataProductInfo(
    info: DepotEntityWithOrigin,
    artifact: V1_DataProductArtifact,
  ): QueryableDataProduct | undefined {
    if (info.origin) {
      const resolved = resolveDefaultDataProductAccessType(artifact);
      const queryableElement = new QueryableDataProduct(
        info.origin.groupId,
        info.origin.artifactId,
        LATEST_VERSION_ALIAS,
        info.path,
        resolved.type,
        resolved.id,
      );
      this.queryableElement = queryableElement;
      return queryableElement;
    }
    return undefined;
  }

  override *initialize(): GeneratorFn<void> {
    if (!this.queryableElement) {
      const mostRecent = this.getMostRecentlyVisited();
      if (mostRecent) {
        if (mostRecent.type === VisitedEntityType.DATAPRODUCT) {
          const visited = mostRecent.visited as VisitedDataProduct;
          this.setQueryableElement(
            new QueryableDataProduct(
              visited.groupId,
              visited.artifactId,
              visited.versionId ?? LATEST_VERSION_ALIAS,
              visited.path,
              visited.dataProductAccessType ?? '',
              visited.accessId ?? '',
            ),
          );
        } else {
          const visited = mostRecent.visited as VisitedLegacyDataProduct;
          this.setQueryableElement(
            new QueryableLegacyDataProduct(
              visited.groupId,
              visited.artifactId,
              visited.versionId ?? LATEST_VERSION_ALIAS,
              visited.path,
              visited.execContext ?? '',
            ),
          );
        }
      }
    }
    // Kick off product loading so dropdown data is available for all flows
    if (!this.productSelectorState.isCompletelyLoaded) {
      flowResult(this.productSelectorState.loadProducts()).catch(
        this.applicationStore.alertUnhandledError,
      );
    }
    yield flowResult(super.initialize());
  }

  async initializeQueryBuilderState(): Promise<QueryBuilderState> {
    if (this.queryableElement) {
      if (this.queryableElement instanceof QueryableDataProduct) {
        return this.initializeQueryBuilderStateWithDataProduct(
          this.queryableElement,
          undefined,
        );
      }
      return this.initializeQueryBuilderStateWithQueryableDataSpace(
        this.queryableElement as QueryableLegacyDataProduct,
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
            flowResult(this.changeDataProduct(dataProductInfo)).catch(
              this.applicationStore.alertUnhandledError,
            );
          },
        },
        this.applicationStore.config.options.queryBuilderConfig,
        this.productSelectorState,
      );
      return queryBuilderState;
    }
  }

  /**
   * Returns the most recently visited entity (data product or data space)
   * based on `lastViewedAt` timestamp. No network verification is performed;
   * if the entity no longer exists, `onInitializeFailure()` will handle
   * cleanup and fall back to the bare selector UI.
   */
  getMostRecentlyVisited():
    | {
        type: VisitedEntityType;
        visited: VisitedLegacyDataProduct | VisitedDataProduct;
      }
    | undefined {
    const visitedDataSpaces =
      LegendQueryUserDataHelper.getRecentlyVisitedDataSpaces(
        this.applicationStore.userDataService,
      );
    const visitedDataProducts =
      LegendQueryUserDataHelper.getRecentlyVisitedDataProducts(
        this.applicationStore.userDataService,
      );

    const allVisited: {
      type: VisitedEntityType;
      visited: VisitedLegacyDataProduct | VisitedDataProduct;
    }[] = [
      ...visitedDataSpaces.map((v) => ({
        type: VisitedEntityType.DATASPACE as const,
        visited: v,
      })),
      ...visitedDataProducts.map((v) => ({
        type: VisitedEntityType.DATAPRODUCT as const,
        visited: v,
      })),
    ].sort(
      (a, b) => (b.visited.lastViewedAt ?? 0) - (a.visited.lastViewedAt ?? 0),
    );

    return allVisited[0];
  }

  async initializeQueryBuilderStateWithDataProduct(
    queryableDataProduct: QueryableDataProduct,
    _artifact: V1_DataProductArtifact | undefined,
  ): Promise<QueryBuilderState> {
    const artifact =
      _artifact ??
      (await this.fetchDataProductArtifact(
        queryableDataProduct.groupId,
        queryableDataProduct.artifactId,
        queryableDataProduct.versionId,
        queryableDataProduct.dataProductPath,
      ));

    const queryBuilderState = await this.buildDataProductQueryBuilderState(
      queryableDataProduct.groupId,
      queryableDataProduct.artifactId,
      queryableDataProduct.versionId,
      queryableDataProduct.dataProductPath,
      artifact,
      queryableDataProduct.id,
      queryableDataProduct.dataProductType as DataProductAccessType,
      async (dataProductInfo: DepotEntityWithOrigin) => {
        if (dataProductInfo instanceof ResolvedDataSpaceEntityWithOrigin) {
          flowResult(this.changeDataSpace(dataProductInfo)).catch(
            this.applicationStore.alertUnhandledError,
          );
        } else {
          flowResult(this.changeDataProduct(dataProductInfo)).catch(
            this.applicationStore.alertUnhandledError,
          );
        }
      },
      this.productSelectorState,
    );

    // add to visited data products
    this.addVisitedProduct(queryableDataProduct, artifact);

    return queryBuilderState;
  }

  async initializeQueryBuilderStateWithQueryableDataSpace(
    queryableDataSpace: QueryableLegacyDataProduct,
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
      this.productSelectorState,
      (dataProductInfo: DepotEntityWithOrigin) => {
        flowResult(this.changeDataProduct(dataProductInfo)).catch(
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
      const origin = guaranteeNonNullable(
        val.origin,
        'Missing origin information for selected data product',
      );
      const artifact = (yield this.fetchDataProductArtifact(
        origin.groupId,
        origin.artifactId,
        origin.versionId,
        val.path,
      )) as V1_DataProductArtifact;
      const queryableDataProduct = this.reConfigureWithDataProductInfo(
        val,
        artifact,
      );
      assertNonNullable(
        queryableDataProduct,
        'Data product selected does not contain valid inputs, groupId, artifactId, and version',
      );
      this.initState.inProgress();
      this.graphManagerState.resetGraph();
      this.queryBuilderState =
        (yield this.initializeQueryBuilderStateWithDataProduct(
          queryableDataProduct,
          artifact,
        )) as LegendQueryDataProductQueryBuilderState;
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

  addVisitedProduct(
    element: QueryableDataProduct,
    artifact?: V1_DataProductArtifact | undefined,
  ): void {
    try {
      LegendQueryUserDataHelper.addVisitedDataProduct(
        this.applicationStore.userDataService,
        createSimpleVisitedDataProduct(
          element.groupId,
          element.artifactId,
          element.versionId,
          element.path,
          element.id,
          element.dataProductType,
          artifact?.dataProduct.title,
          artifact?.dataProduct.description,
          artifact?.dataProduct.deploymentId,
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

  addVisitedDataSpace(element: LegendQueryableElement): void {
    try {
      LegendQueryUserDataHelper.addVisitedDatspace(
        this.applicationStore.userDataService,
        createSimpleVisitedDataspace(
          element.groupId,
          element.artifactId,
          element.versionId,
          element.path,
          element.execContext,
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
    const element = this.queryableElement;
    if (element) {
      return {
        defaultName: options?.update
          ? `${extractElementNameFromPath(element.path)}`
          : `New Query for ${extractElementNameFromPath(element.path)}[${element.execContext}]`,
        decorator: (query: Query): void => {
          query.id = uuid();
          query.groupId = element.groupId;
          query.artifactId = element.artifactId;
          query.versionId = element.versionId;
          const taggedValues = [];
          if (this.queryBuilderState?.class) {
            taggedValues.push(
              createQueryClassTaggedValue(this.queryBuilderState.class.path),
            );
          }
          taggedValues.push(createQueryDataSpaceTaggedValue(element.path));
          query.taggedValues = taggedValues;
        },
      };
    }
    return undefined;
  }

  override onInitializeFailure(): void {
    // Remove the stale entry from the visited list
    if (this.queryableElement) {
      if (this.queryableElement instanceof QueryableDataProduct) {
        LegendQueryUserDataHelper.removeRecentlyViewedDataProduct(
          this.applicationStore.userDataService,
          createVisitedDataProductId(
            this.queryableElement.groupId,
            this.queryableElement.artifactId,
            this.queryableElement.path,
          ),
        );
      } else {
        LegendQueryUserDataHelper.removeRecentlyViewedDataSpace(
          this.applicationStore.userDataService,
          createVisitedDataSpaceId(
            this.queryableElement.groupId,
            this.queryableElement.artifactId,
            this.queryableElement.path,
          ),
        );
      }
    }
    // Reset so the user sees the bare selector with the data product /
    // data space dropdown instead of a blank panel.
    this.setQueryableElement(undefined);
    const bareState = new LegendQueryBareQueryBuilderState(
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
          flowResult(this.changeDataProduct(dataProductInfo)).catch(
            this.applicationStore.alertUnhandledError,
          );
        },
      },
      this.applicationStore.config.options.queryBuilderConfig,
      this.productSelectorState,
    );
    this.queryBuilderState = bareState;
    this.queryLoaderState.initialize(bareState);
    // Mark as passed so the UI renders the query builder (with selector)
    // instead of the loading/blank panel.
    this.initState.pass();
  }

  override decorateSearchSpecification(
    val: QuerySearchSpecification,
  ): QuerySearchSpecification {
    if (this.queryableElement) {
      const currentProjectCoordinates = new QueryProjectCoordinates();
      currentProjectCoordinates.groupId = this.queryableElement.groupId;
      currentProjectCoordinates.artifactId = this.queryableElement.artifactId;
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
        createQueryDataSpaceTaggedValue(this.queryableElement.path),
      ];
      val.combineTaggedValuesCondition = true;
    }

    return val;
  }
}
