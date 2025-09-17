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

import { DEFAULT_TAB_SIZE } from '@finos/legend-application';
import { action, computed, flow, makeObservable, observable } from 'mobx';
import type { LegendMarketplaceBaseStore } from '../LegendMarketplaceBaseStore.js';
import {
  ActionState,
  assertErrorThrown,
  type GeneratorFn,
} from '@finos/legend-shared';
import {
  extractElementNameFromPath,
  extractPackagePathFromPath,
  V1_AdHocDeploymentDataProductOrigin,
  V1_entitlementsDataProductDetailsResponseToDataProductDetails,
  V1_EntitlementsLakehouseEnvironmentType,
  V1_IngestEnvironmentClassification,
  V1_PureGraphManager,
  V1_SdlcDeploymentDataProductOrigin,
} from '@finos/legend-graph';
import { LegendMarketplaceUserDataHelper } from '../../__lib__/LegendMarketplaceUserDataHelper.js';
import type { BaseProductCardState } from './dataProducts/BaseProductCardState.js';
import { DataProductCardState } from './dataProducts/DataProductCardState.js';
import {
  DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
  V1_deserializeDataSpace,
} from '@finos/legend-extension-dsl-data-space/graph';
import { LegacyDataProductCardState } from './dataProducts/LegacyDataProductCardState.js';
import {
  type StoredSummaryEntity,
  DepotScope,
} from '@finos/legend-server-depot';

export enum DataProductFilterType {
  MODELED_DATA_PRODUCTS = 'MODELED_DATA_PRODUCTS',
  UNMODELED_DATA_PRODUCTS = 'UNMODELED_DATA_PRODUCTS',
  UNMODELED_DATA_PRODUCTS__DEPLOY_TYPE = 'UNMODELED_DATA_PRODUCTS.DEPLOY_TYPE',
  UNMODELED_DATA_PRODUCTS__ENVIRONMENT_CLASSIFICATION = 'UNMODELED_DATA_PRODUCTS.ENVIRONMENT_CLASSIFICATION',
}

export enum UnmodeledDataProductDeployType {
  SDLC = 'SDLC',
  SANDBOX = 'SANDBOX',
}

export interface DataProductFilterConfig {
  modeledDataProducts?: boolean;
  unmodeledDataProducts?: boolean;
  unmodeledDataProductsConfig?: {
    sdlcDeploy: boolean;
    sandboxDeploy: boolean;
    devEnvironmentClassification: boolean;
    prodParallelEnvironmentClassification: boolean;
    prodEnvironmentClassification: boolean;
  };
}

class DataProductFilterState {
  modeledDataProducts: boolean;
  unmodeledDataProducts: boolean;
  unmodeledDataProductsConfig: {
    sdlcDeploy: boolean;
    sandboxDeploy: boolean;
    devEnvironmentClassification: boolean;
    prodParallelEnvironmentClassification: boolean;
    prodEnvironmentClassification: boolean;
  };
  search?: string | undefined;

  constructor(
    defaultBooleanFilters: DataProductFilterConfig,
    search?: string | undefined,
  ) {
    makeObservable(this, {
      modeledDataProducts: observable,
      unmodeledDataProducts: observable,
      unmodeledDataProductsConfig: observable,
      search: observable,
    });
    this.modeledDataProducts =
      defaultBooleanFilters.modeledDataProducts ??
      DataProductFilterState.default().modeledDataProducts;
    this.unmodeledDataProducts =
      defaultBooleanFilters.unmodeledDataProducts ??
      DataProductFilterState.default().unmodeledDataProducts;
    this.unmodeledDataProductsConfig =
      defaultBooleanFilters.unmodeledDataProductsConfig ??
      DataProductFilterState.default().unmodeledDataProductsConfig;
    this.search = search;
  }

  static default(): DataProductFilterState {
    return new DataProductFilterState(
      {
        modeledDataProducts: false,
        unmodeledDataProducts: true,
        unmodeledDataProductsConfig: {
          sdlcDeploy: true,
          sandboxDeploy: false,
          devEnvironmentClassification: false,
          prodParallelEnvironmentClassification: false,
          prodEnvironmentClassification: true,
        },
      },
      undefined,
    );
  }

  get currentFilterValues(): DataProductFilterConfig {
    return {
      modeledDataProducts: this.modeledDataProducts,
      unmodeledDataProducts: this.unmodeledDataProducts,
      unmodeledDataProductsConfig: {
        sdlcDeploy: this.unmodeledDataProductsConfig.sdlcDeploy,
        sandboxDeploy: this.unmodeledDataProductsConfig.sandboxDeploy,
        devEnvironmentClassification:
          this.unmodeledDataProductsConfig.devEnvironmentClassification,
        prodParallelEnvironmentClassification:
          this.unmodeledDataProductsConfig
            .prodParallelEnvironmentClassification,
        prodEnvironmentClassification:
          this.unmodeledDataProductsConfig.prodEnvironmentClassification,
      },
    };
  }
}

export enum DataProductSort {
  NAME_ALPHABETICAL = 'Name A-Z',
  NAME_REVERSE_ALPHABETICAL = 'Name Z-A',
}

export class LegendMarketplaceSearchResultsStore {
  readonly marketplaceBaseStore: LegendMarketplaceBaseStore;
  dataProductCardStates: DataProductCardState[] = [];
  legacyDataProductCardStates: LegacyDataProductCardState[] = [];
  filterState: DataProductFilterState;
  sort: DataProductSort = DataProductSort.NAME_ALPHABETICAL;

  loadingAllProductsState = ActionState.create();

  constructor(marketplaceBaseStore: LegendMarketplaceBaseStore) {
    this.marketplaceBaseStore = marketplaceBaseStore;

    const savedFilterConfig =
      LegendMarketplaceUserDataHelper.getSavedDataProductFilterConfig(
        this.marketplaceBaseStore.applicationStore.userDataService,
      );
    this.filterState = savedFilterConfig
      ? new DataProductFilterState(savedFilterConfig, undefined)
      : DataProductFilterState.default();

    makeObservable(this, {
      dataProductCardStates: observable,
      legacyDataProductCardStates: observable,
      filterState: observable,
      sort: observable,
      handleFilterChange: action,
      handleSearch: action,
      setDataProductCardStates: action,
      setLegacyDataProductCardStates: action,
      setSort: action,
      filterSortProducts: computed,
      init: flow,
    });
  }

  get filterSortProducts(): BaseProductCardState[] | undefined {
    return (
      (this.filterState.unmodeledDataProducts
        ? this.dataProductCardStates
        : []
      ).filter((dataProductCardState) => {
        // Check if product matches deploy type filter
        const deployMatch =
          (this.filterState.unmodeledDataProductsConfig.sdlcDeploy &&
            dataProductCardState.dataProductDetails.origin instanceof
              V1_SdlcDeploymentDataProductOrigin) ||
          (this.filterState.unmodeledDataProductsConfig.sandboxDeploy &&
            dataProductCardState.dataProductDetails.origin instanceof
              V1_AdHocDeploymentDataProductOrigin);
        // Check if product matches environment classification filter
        const environmentClassificationMatch =
          (this.filterState.unmodeledDataProductsConfig
            .devEnvironmentClassification &&
            dataProductCardState.environmentClassification ===
              V1_EntitlementsLakehouseEnvironmentType.DEVELOPMENT) ||
          (this.filterState.unmodeledDataProductsConfig
            .prodParallelEnvironmentClassification &&
            dataProductCardState.environmentClassification ===
              V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL) ||
          (this.filterState.unmodeledDataProductsConfig
            .prodEnvironmentClassification &&
            dataProductCardState.environmentClassification ===
              V1_EntitlementsLakehouseEnvironmentType.PRODUCTION);
        return deployMatch && environmentClassificationMatch;
      }) as BaseProductCardState[]
    )
      .concat(
        this.filterState.modeledDataProducts
          ? (this.legacyDataProductCardStates as BaseProductCardState[])
          : [],
      )
      .filter((productCardState) => {
        // Check if product title matches search filter
        const titleMatch =
          this.filterState.search === undefined ||
          this.filterState.search === '' ||
          productCardState.title
            .toLowerCase()
            .includes(this.filterState.search.toLowerCase());
        return titleMatch;
      })
      .sort((a, b) => {
        if (this.sort === DataProductSort.NAME_ALPHABETICAL) {
          return a.title.localeCompare(b.title);
        } else {
          return b.title.localeCompare(a.title);
        }
      });
  }

  setDataProductCardStates(
    dataProductCardStates: DataProductCardState[],
  ): void {
    this.dataProductCardStates = dataProductCardStates;
  }

  setLegacyDataProductCardStates(
    legacyDataProductCardStates: LegacyDataProductCardState[],
  ): void {
    this.legacyDataProductCardStates = legacyDataProductCardStates;
  }

  handleFilterChange(
    filterType: DataProductFilterType,
    val:
      | UnmodeledDataProductDeployType
      | V1_IngestEnvironmentClassification
      | undefined,
  ): void {
    switch (filterType) {
      case DataProductFilterType.MODELED_DATA_PRODUCTS:
        this.filterState.modeledDataProducts =
          !this.filterState.modeledDataProducts;
        break;
      case DataProductFilterType.UNMODELED_DATA_PRODUCTS:
        this.filterState.unmodeledDataProducts =
          !this.filterState.unmodeledDataProducts;
        break;
      case DataProductFilterType.UNMODELED_DATA_PRODUCTS__DEPLOY_TYPE:
        switch (val) {
          case UnmodeledDataProductDeployType.SDLC:
            this.filterState.unmodeledDataProductsConfig.sdlcDeploy =
              !this.filterState.unmodeledDataProductsConfig.sdlcDeploy;
            break;
          case UnmodeledDataProductDeployType.SANDBOX:
            this.filterState.unmodeledDataProductsConfig.sandboxDeploy =
              !this.filterState.unmodeledDataProductsConfig.sandboxDeploy;
            break;
          default:
            break;
        }
        break;
      case DataProductFilterType.UNMODELED_DATA_PRODUCTS__ENVIRONMENT_CLASSIFICATION:
        switch (val) {
          case V1_IngestEnvironmentClassification.DEV:
            this.filterState.unmodeledDataProductsConfig.devEnvironmentClassification =
              !this.filterState.unmodeledDataProductsConfig
                .devEnvironmentClassification;
            break;
          case V1_IngestEnvironmentClassification.PROD_PARALLEL:
            this.filterState.unmodeledDataProductsConfig.prodParallelEnvironmentClassification =
              !this.filterState.unmodeledDataProductsConfig
                .prodParallelEnvironmentClassification;
            break;
          case V1_IngestEnvironmentClassification.PROD:
            this.filterState.unmodeledDataProductsConfig.prodEnvironmentClassification =
              !this.filterState.unmodeledDataProductsConfig
                .prodEnvironmentClassification;
            break;
          default:
            break;
        }
        break;
      default:
        break;
    }
    LegendMarketplaceUserDataHelper.saveDataProductFilterConfig(
      this.marketplaceBaseStore.applicationStore.userDataService,
      this.filterState.currentFilterValues,
    );
  }

  handleSearch(query: string | undefined) {
    this.filterState.search = query;
  }

  setSort(sort: DataProductSort): void {
    this.sort = sort;
  }

  async fetchDataProducts(token: string | undefined): Promise<void> {
    try {
      const rawResponse =
        await this.marketplaceBaseStore.lakehouseContractServerClient.getDataProducts(
          token,
        );
      const dataProductDetails =
        V1_entitlementsDataProductDetailsResponseToDataProductDetails(
          rawResponse,
        );

      // Crete graph manager for parsing ad-hoc deployed data products
      const graphManager = new V1_PureGraphManager(
        this.marketplaceBaseStore.applicationStore.pluginManager,
        this.marketplaceBaseStore.applicationStore.logService,
        this.marketplaceBaseStore.remoteEngine,
      );
      await graphManager.initialize(
        {
          env: this.marketplaceBaseStore.applicationStore.config.env,
          tabSize: DEFAULT_TAB_SIZE,
          clientConfig: {
            baseUrl:
              this.marketplaceBaseStore.applicationStore.config.engineServerUrl,
          },
        },
        { engine: this.marketplaceBaseStore.remoteEngine },
      );

      const dataProductCardStates = dataProductDetails
        .map(
          (dataProductDetail) =>
            new DataProductCardState(
              this.marketplaceBaseStore,
              graphManager,
              dataProductDetail,
            ),
        )
        .sort((a, b) => a.title.localeCompare(b.title));
      this.setDataProductCardStates(dataProductCardStates);
      this.dataProductCardStates.forEach((dataProductCardState) =>
        dataProductCardState.init(),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.marketplaceBaseStore.applicationStore.notificationService.notifyError(
        `Unable to load products: ${error.message}`,
      );
    }
  }

  async fetchLegacyDataProducts(): Promise<void> {
    try {
      const dataSpaceEntitySummaries =
        (await this.marketplaceBaseStore.depotServerClient.getEntitiesSummaryByClassifier(
          DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
          {
            scope: DepotScope.RELEASES,
            summary: true,
          },
        )) as unknown as StoredSummaryEntity[];
      const legacyDataProductCardStates = dataSpaceEntitySummaries.map(
        (entity) => {
          const dataSpace = V1_deserializeDataSpace({
            executionContexts: [],
            defaultExecutionContext: '',
            package: extractPackagePathFromPath(entity.path) ?? entity.path,
            name: extractElementNameFromPath(entity.path),
          });
          return new LegacyDataProductCardState(
            this.marketplaceBaseStore,
            dataSpace,
            entity.groupId,
            entity.artifactId,
            entity.versionId,
          );
        },
      );
      this.setLegacyDataProductCardStates(legacyDataProductCardStates);
      this.legacyDataProductCardStates.forEach((legacyDataProductCardState) =>
        legacyDataProductCardState.init(),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.marketplaceBaseStore.applicationStore.notificationService.notifyError(
        `Unable to load legacy products: ${error.message}`,
      );
    }
  }

  *init(token?: string | undefined): GeneratorFn<void> {
    if (!this.loadingAllProductsState.hasCompleted) {
      try {
        this.loadingAllProductsState.inProgress();
        yield Promise.all([
          this.fetchDataProducts(token),
          this.fetchLegacyDataProducts(),
        ]);
      } finally {
        this.loadingAllProductsState.complete();
      }
    }
  }
}
