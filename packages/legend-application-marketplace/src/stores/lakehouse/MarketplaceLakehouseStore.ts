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
import type { LakehouseContractServerClient } from '../LakehouseContractServerClient.js';
import { action, computed, flow, makeObservable, observable } from 'mobx';
import type { LegendMarketplaceApplicationStore } from '../LegendMarketplaceBaseStore.js';
import {
  ActionState,
  assertErrorThrown,
  guaranteeNonNullable,
  guaranteeType,
  returnUndefOnError,
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
  resolvePackagePathAndElementName,
  V1_DataProduct,
  V1_dataProductModelSchema,
  V1_deserializePackageableElement,
} from '@finos/legend-graph';
import { deserialize } from 'serializr';
import {
  parseGAVCoordinates,
  type Entity,
  type StoredFileGeneration,
} from '@finos/legend-storage';
import { DataProductViewerState } from './DataProductViewerState.js';
import { EXTERNAL_APPLICATION_NAVIGATION__generateStudioSDLCProjectViewUrl } from '../../__lib__/LegendMarketplaceNavigation.js';
import type { AuthContextProps } from 'react-oidc-context';

const ARTIFACT_GENERATION_DAT_PRODUCT_KEY = 'dataProduct';
interface DataProductEntity {
  product: V1_DataProduct | undefined;
  groupId: string;
  artifactId: string;
  versionId: string;
  path: string;
}

export enum DataProductType {
  LAKEHOUSE = 'LAKEHOUSE',
  UNKNOWN = 'UNKNOWN',
}

export class DataProductState {
  readonly state: MarketplaceLakehouseStore;
  id: string;
  productEntity: DataProductEntity;

  constructor(product: DataProductEntity, state: MarketplaceLakehouseStore) {
    this.id = uuid();
    this.productEntity = product;
    this.state = state;
  }

  get packageAndName(): [string | undefined, string] {
    const val = returnUndefOnError(() =>
      resolvePackagePathAndElementName(this.productEntity.path),
    );
    return val ?? [undefined, this.productEntity.path];
  }

  get accessTypes(): DataProductType {
    return DataProductType.LAKEHOUSE;
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
  readonly lakehouseServerClient: LakehouseContractServerClient;
  productStates: DataProductState[] | undefined;
  loadingProductsState = ActionState.create();
  filter: DataProductFilters = DataProductFilters.default();

  //
  dataProductViewer: DataProductViewerState | undefined;

  constructor(
    applicationStore: LegendMarketplaceApplicationStore,
    lakehouseServerClient: LakehouseContractServerClient,
    depotServerClient: DepotServerClient,
  ) {
    this.applicationStore = applicationStore;
    this.lakehouseServerClient = lakehouseServerClient;
    this.depotServerClient = depotServerClient;
    makeObservable(this, {
      init: flow,
      initWithProduct: flow,
      productStates: observable,
      setProducts: action,
      dataProductViewer: observable,
      handleFilterChange: observable,
      handleSearch: action,
      filterProducts: computed,
      setDataProductViewerState: action,
      filter: observable,
    });
  }

  get filterProducts(): DataProductState[] | undefined {
    return this.productStates?.filter((dataProductState) => {
      const isSnapshot = isSnapshotVersion(
        dataProductState.productEntity.versionId,
      );
      // Check if product matches release/snapshot filter
      const versionMatch =
        (this.filter.snapshotFilter && isSnapshot) ||
        (this.filter.releaseFilter && !isSnapshot);
      // Check if product title matches search filter
      const dataProductTitle =
        dataProductState.productEntity.product?.title ??
        dataProductState.productEntity.path.split('::').pop() ??
        '';
      const titleMatch =
        this.filter.search === undefined ||
        this.filter.search === '' ||
        dataProductTitle
          .toLowerCase()
          .includes(this.filter.search.toLowerCase());
      return versionMatch && titleMatch;
    });
  }

  setProducts(data: DataProductState[] | undefined): void {
    this.productStates = data;
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

  *init(): GeneratorFn<void> {
    try {
      this.loadingProductsState.inProgress();
      // we will show both released and snapshot versions for now to support deployment via workspaces
      const dataProductEntitySummaries = (yield Promise.all([
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
      ]))
        .flat()
        .map((e: PlainObject<StoredSummaryEntity>) =>
          StoredSummaryEntity.serialization.fromJson(e),
        ) as StoredSummaryEntity[];
      // TODO: explore a different way to get data product content to avoid overloading metadata server
      // as the number of data products increases.
      const dataProductEntities = (yield Promise.all(
        dataProductEntitySummaries.map(async (entitySummary) => {
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
          return {
            groupId: entitySummary.groupId,
            artifactId: entitySummary.artifactId,
            versionId: entitySummary.versionId,
            path: entitySummary.path,
            product: dataProduct,
          };
        }),
      )) as DataProductEntity[];
      const dataProductStates = dataProductEntities
        .sort(
          (a, b) =>
            a.product?.title?.localeCompare(b.product?.title ?? '') ?? 0,
        )
        .map(
          (dataProductEntity) => new DataProductState(dataProductEntity, this),
        );

      this.setProducts(dataProductStates);
      this.loadingProductsState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Unable to load products: ${error.message}`,
      );
      this.loadingProductsState.fail();
    }
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
        this.lakehouseServerClient,
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
