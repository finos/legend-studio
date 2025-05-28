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

import type { CommandRegistrar } from '@finos/legend-application';
import {
  DepotScope,
  isSnapshotVersion,
  projectIdHandlerFunc,
  resolveVersion,
  StoredSummaryEntity,
  StoreProjectData,
  VersionedProjectData,
  type DepotServerClient,
} from '@finos/legend-server-depot';
import { action, computed, flow, makeObservable, observable } from 'mobx';
import type { LegendMarketplaceApplicationStore } from '../LegendMarketplaceBaseStore.js';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  guaranteeType,
  uuid,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import {
  CORE_PURE_PATH,
  DataProductArtifactGeneration,
  GraphDataWithOrigin,
  GraphManagerState,
  LegendSDLC,
  V1_DataProduct,
  V1_dataProductModelSchema,
  V1_deserializePackageableElement,
  V1_LakehouseDiscoveryEnvironmentResponse,
} from '@finos/legend-graph';
import { deserialize } from 'serializr';
import {
  GAV_DELIMITER,
  generateGAVCoordinates,
  parseGAVCoordinates,
  type Entity,
  type StoredFileGeneration,
} from '@finos/legend-storage';
import { DataProductViewerState } from './DataProductViewerState.js';
import { EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl } from '../../__lib__/LegendMarketplaceNavigation.js';
import type { AuthContextProps } from 'react-oidc-context';
import type {
  LakehouseContractServerClient,
  LakehouseIngestServerClient,
  LakehousePlatformServerClient,
} from '@finos/legend-server-marketplace';

const ARTIFACT_GENERATION_DAT_PRODUCT_KEY = 'dataProduct';

export class DataProductEntity {
  product: V1_DataProduct | undefined;
  groupId!: string;
  artifactId!: string;
  versionId!: string;
  path!: string;

  loadingEntityState = ActionState.create();

  constructor(
    groupId: string,
    artifactId: string,
    versionId: string,
    path: string,
  ) {
    this.groupId = groupId;
    this.artifactId = artifactId;
    this.versionId = versionId;
    this.path = path;

    makeObservable(this, {
      groupId: observable,
      artifactId: observable,
      versionId: observable,
      path: observable,
      product: observable,
      loadingEntityState: observable,
      setProduct: action,
    });
  }

  setProduct(product: V1_DataProduct | undefined): void {
    this.product = product;
  }
}

export enum DataProductType {
  LAKEHOUSE = 'LAKEHOUSE',
  UNKNOWN = 'UNKNOWN',
}

export class DataProductState {
  readonly state: MarketplaceLakehouseStore;
  id: string;
  productEntityMap: Map<string, DataProductEntity>;
  currentProductEntity: DataProductEntity | undefined;

  constructor(state: MarketplaceLakehouseStore) {
    this.id = uuid();
    this.state = state;
    this.productEntityMap = new Map<string, DataProductEntity>();

    makeObservable(this, {
      id: observable,
      productEntityMap: observable,
      currentProductEntity: observable,
      accessTypes: computed,
      setCurrentProductEntity: action,
      setProductEntity: action,
      isLoading: computed,
    });
  }

  get accessTypes(): DataProductType {
    return DataProductType.LAKEHOUSE;
  }

  get isLoading(): boolean {
    return this.productEntityMap
      .values()
      .some((entity) => entity.loadingEntityState.isInProgress);
  }

  setCurrentProductEntity(productEntity: DataProductEntity | undefined): void {
    this.currentProductEntity = productEntity;
  }

  setProductEntity(versionId: string, productEntity: DataProductEntity): void {
    this.productEntityMap.set(versionId, productEntity);
  }
}

class DataProductFilters {
  releaseFilter;
  snapshotFilter;
  search?: string | undefined;

  constructor(
    releaseFilter: boolean,
    snapshotFilter: boolean,
    search?: string | undefined,
  ) {
    makeObservable(this, {
      releaseFilter: observable,
      snapshotFilter: observable,
      search: observable,
    });
    this.releaseFilter = releaseFilter;
    this.snapshotFilter = snapshotFilter;
    this.search = search;
  }

  static default(): DataProductFilters {
    return new DataProductFilters(true, true, undefined);
  }
}

export class MarketplaceLakehouseStore implements CommandRegistrar {
  readonly applicationStore: LegendMarketplaceApplicationStore;
  readonly depotServerClient: DepotServerClient;
  readonly lakehouseContractServerClient: LakehouseContractServerClient;
  readonly lakehousePlatformServerClient: LakehousePlatformServerClient;
  readonly lakehouseIngestServerClient: LakehouseIngestServerClient;
  // To consolidate all versions of a data product, we use a map from group:artifact:path to a DataProductState object, which contains
  // a map of all the verions of the data product.
  productStatesMap: Map<string, DataProductState>;
  lakehouseIngestEnvironmentSummaries: V1_LakehouseDiscoveryEnvironmentResponse[] =
    [];
  loadingProductsState = ActionState.create();
  loadingLakehouseEnvironmentsState = ActionState.create();
  filter: DataProductFilters = DataProductFilters.default();
  dataProductViewer: DataProductViewerState | undefined;

  constructor(
    applicationStore: LegendMarketplaceApplicationStore,
    lakehouseServerClient: LakehouseContractServerClient,
    lakehousePlatformServerClient: LakehousePlatformServerClient,
    lakehouseIngestServerClient: LakehouseIngestServerClient,
    depotServerClient: DepotServerClient,
  ) {
    this.applicationStore = applicationStore;
    this.lakehouseContractServerClient = lakehouseServerClient;
    this.lakehousePlatformServerClient = lakehousePlatformServerClient;
    this.lakehouseIngestServerClient = lakehouseIngestServerClient;

    this.depotServerClient = depotServerClient;
    this.productStatesMap = new Map<string, DataProductState>();
    makeObservable(this, {
      init: flow,
      initWithProduct: flow,
      productStatesMap: observable,
      lakehouseIngestEnvironmentSummaries: observable,
      dataProductViewer: observable,
      handleFilterChange: observable,
      handleSearch: action,
      filterProducts: computed,
      setDataProductViewerState: action,
      setLakehouseIngestEnvironmentSummaries: action,
      filter: observable,
    });
  }

  get filterProducts(): DataProductState[] | undefined {
    return Array.from(
      this.productStatesMap.values().filter((dataProductState) => {
        if (dataProductState.currentProductEntity === undefined) {
          return false; // Skip if no current product entity
        }
        const isSnapshot = isSnapshotVersion(
          dataProductState.currentProductEntity.versionId,
        );
        // Check if product matches release/snapshot filter
        const versionMatch =
          (this.filter.snapshotFilter && isSnapshot) ||
          (this.filter.releaseFilter && !isSnapshot);
        // Check if product title matches search filter
        const dataProductTitle =
          dataProductState.currentProductEntity.product?.title ??
          dataProductState.currentProductEntity.path.split('::').pop() ??
          '';
        const titleMatch =
          this.filter.search === undefined ||
          this.filter.search === '' ||
          dataProductTitle
            .toLowerCase()
            .includes(this.filter.search.toLowerCase());
        return versionMatch && titleMatch;
      }),
    );
  }

  setLakehouseIngestEnvironmentSummaries(
    summaries: V1_LakehouseDiscoveryEnvironmentResponse[],
  ): void {
    this.lakehouseIngestEnvironmentSummaries = summaries;
  }

  setDataProductViewerState(val: DataProductViewerState | undefined): void {
    this.dataProductViewer = val;
  }

  handleFilterChange(val: DepotScope | undefined): void {
    if (val === DepotScope.RELEASES) {
      this.filter.releaseFilter = !this.filter.releaseFilter;
    } else if (val === DepotScope.SNAPSHOT) {
      this.filter.snapshotFilter = !this.filter.snapshotFilter;
    }
  }

  handleSearch(query: string | undefined) {
    this.filter.search = query;
  }

  async fetchDataProducts(): Promise<void> {
    try {
      this.loadingProductsState.inProgress();
      // we will show both released and snapshot versions for now to support deployment via workspaces
      const dataProductEntitySummaries = (
        await Promise.all([
          this.depotServerClient.getEntitiesSummaryByClassifier(
            CORE_PURE_PATH.DATA_PRODUCT,
            {
              scope: DepotScope.RELEASES,
              summary: true,
            },
          ),
          this.depotServerClient.getEntitiesSummaryByClassifier(
            CORE_PURE_PATH.DATA_PRODUCT,
            {
              scope: DepotScope.SNAPSHOT,
              summary: true,
            },
          ),
        ])
      )
        .flat()
        .map((e: PlainObject<StoredSummaryEntity>) =>
          StoredSummaryEntity.serialization.fromJson(e),
        ) as StoredSummaryEntity[];
      // Store summary information in the product state map
      dataProductEntitySummaries.forEach((entitySummary) => {
        const key =
          generateGAVCoordinates(
            entitySummary.groupId,
            entitySummary.artifactId,
            undefined,
          ) +
          GAV_DELIMITER +
          entitySummary.path;
        if (!this.productStatesMap.has(key)) {
          this.productStatesMap.set(key, new DataProductState(this));
        }
        const productState = guaranteeNonNullable(
          this.productStatesMap.get(key),
        );
        productState.setProductEntity(
          entitySummary.versionId,
          new DataProductEntity(
            entitySummary.groupId,
            entitySummary.artifactId,
            entitySummary.versionId,
            entitySummary.path,
          ),
        );
      });
      // Set the currentProductEntity for each product state to the latest version (or if no released versions, just pick the first snapshot version)
      this.productStatesMap.forEach((dataProductState) => {
        const productEntities = Array.from(
          dataProductState.productEntityMap.values(),
        );
        const latestReleasedEntity = productEntities
          .filter((entity) => !isSnapshotVersion(entity.versionId))
          .sort((a, b) => b.versionId.localeCompare(a.versionId))[0];
        if (latestReleasedEntity) {
          dataProductState.setCurrentProductEntity(latestReleasedEntity);
        } else {
          dataProductState.setCurrentProductEntity(productEntities[0]);
        }
      });
      this.loadingProductsState.complete();
      // Asynchronously fetch the data product content for each entity summary and update the product state map.
      Promise.all(
        // TODO: explore a different way to get data product content to avoid overloading metadata server
        // as the number of data products increases.
        dataProductEntitySummaries.map(async (entitySummary) => {
          const key =
            generateGAVCoordinates(
              entitySummary.groupId,
              entitySummary.artifactId,
              undefined,
            ) +
            GAV_DELIMITER +
            entitySummary.path;
          const dataProductEntity = this.productStatesMap
            .get(key)
            ?.productEntityMap?.get(entitySummary.versionId);
          if (dataProductEntity) {
            dataProductEntity.loadingEntityState.inProgress();
            try {
              const entity = await this.depotServerClient.getVersionEntity(
                entitySummary.groupId,
                entitySummary.artifactId,
                entitySummary.versionId,
                entitySummary.path,
              );
              const dataProduct = guaranteeType(
                V1_deserializePackageableElement(
                  entity.content as PlainObject<V1_DataProduct>,
                  [],
                ),
                V1_DataProduct,
              );
              dataProductEntity.setProduct(dataProduct);
            } finally {
              dataProductEntity.loadingEntityState.complete();
            }
          }
        }),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Unable to load products: ${error.message}`,
      );
      this.loadingProductsState.fail();
    }
  }

  async fetchLakehouseEnvironments(token: string | undefined): Promise<void> {
    try {
      this.loadingLakehouseEnvironmentsState.inProgress();
      const discoveryEnvironments = (
        await this.lakehousePlatformServerClient.getIngestEnvironments(token)
      ).map((e: PlainObject<V1_LakehouseDiscoveryEnvironmentResponse>) =>
        V1_LakehouseDiscoveryEnvironmentResponse.serialization.fromJson(e),
      ) as V1_LakehouseDiscoveryEnvironmentResponse[];
      this.setLakehouseIngestEnvironmentSummaries(discoveryEnvironments);
      const ingestDefinitions = await Promise.all(
        discoveryEnvironments.map(async (env) =>
          this.lakehouseIngestServerClient.getDeployedIngestDefinitions(
            env.ingestServerUrl,
            token,
          ),
        ),
      );
      console.log('ingestDefinitions', ingestDefinitions);
      this.loadingLakehouseEnvironmentsState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Unable to load lakehouse environments: ${error.message}`,
      );
      this.loadingLakehouseEnvironmentsState.fail();
    }
  }

  *init(auth: AuthContextProps): GeneratorFn<void> {
    yield Promise.all([
      (() => {
        if (!this.loadingProductsState.hasCompleted) {
          this.fetchDataProducts();
        }
      })(),
      (() => {
        if (!this.loadingLakehouseEnvironmentsState.hasCompleted) {
          this.fetchLakehouseEnvironments(auth.user?.access_token);
        }
      })(),
    ]);
  }

  *initWithProduct(
    gav: string,
    path: string,
    auth: AuthContextProps,
  ): GeneratorFn<void> {
    try {
      this.loadingProductsState.inProgress();
      const projectData = VersionedProjectData.serialization.fromJson(
        parseGAVCoordinates(gav) as unknown as PlainObject,
      );
      const storeProject = new StoreProjectData();
      storeProject.groupId = projectData.groupId;
      storeProject.artifactId = projectData.artifactId;
      const v1DataProduct = deserialize(
        V1_dataProductModelSchema,
        (
          (yield this.depotServerClient.getVersionEntity(
            projectData.groupId,
            projectData.artifactId,
            resolveVersion(projectData.versionId),
            path,
          )) as Entity
        ).content,
      );
      const files = (yield this.depotServerClient.getGenerationFilesByType(
        storeProject,
        resolveVersion(projectData.versionId),
        ARTIFACT_GENERATION_DAT_PRODUCT_KEY,
      )) as StoredFileGeneration[];
      const fileGen = files.filter((e) => e.path === v1DataProduct.path)[0]
        ?.file.content;
      let parsed: DataProductArtifactGeneration | undefined = undefined;
      if (fileGen) {
        const content: PlainObject = JSON.parse(fileGen) as PlainObject;
        const gen =
          DataProductArtifactGeneration.serialization.fromJson(content);
        gen.content = content;
        parsed = gen;
      }
      const stateViewer = new DataProductViewerState(
        this.applicationStore,
        new GraphManagerState(
          this.applicationStore.pluginManager,
          this.applicationStore.logService,
        ),
        this.lakehouseContractServerClient,
        projectData,
        v1DataProduct,
        parsed,
        {
          retrieveGraphData: () => {
            const sdlc = new LegendSDLC(
              projectData.groupId,
              projectData.artifactId,
              projectData.versionId,
            );
            return new GraphDataWithOrigin(sdlc);
          },

          viewSDLCProject: () => {
            return projectIdHandlerFunc(
              projectData.groupId,
              projectData.artifactId,
              projectData.versionId,
              this.depotServerClient,
              (projectId: string, resolvedId: string) => {
                const studioUrl = guaranteeNonNullable(
                  this.applicationStore.config.studioServerUrl,
                  'studio url required',
                );
                this.applicationStore.navigationService.navigator.visitAddress(
                  EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl(
                    studioUrl,
                    projectId,
                    resolvedId,
                    path,
                  ),
                );
              },
            );
          },
          onZoneChange: undefined,
        },
      );
      this.setDataProductViewerState(stateViewer);
      stateViewer.fetchContracts(auth.user?.access_token);
      this.loadingProductsState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Unable to load product ${path}: ${error.message}`,
      );
      this.loadingProductsState.fail();
    }
  }

  registerCommands(): void {
    throw new Error('Method not implemented.');
  }
  deregisterCommands(): void {
    throw new Error('Method not implemented.');
  }
}
