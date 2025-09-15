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
  type PlainObject,
} from '@finos/legend-shared';
import {
  V1_entitlementsDataProductDetailsResponseToDataProductDetails,
  V1_EntitlementsLakehouseEnvironmentType,
  V1_IngestEnvironmentClassification,
  V1_PureGraphManager,
} from '@finos/legend-graph';
import { LegendMarketplaceUserDataHelper } from '../../__lib__/LegendMarketplaceUserDataHelper.js';
import type { BaseProductCardState } from './dataProducts/BaseProductCardState.js';
import { DataProductCardState } from './dataProducts/DataProductCardState.js';
import {
  DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
  V1_deserializeDataSpace,
} from '@finos/legend-extension-dsl-data-space/graph';
import { LegacyDataProductCardState } from './dataProducts/LegacyDataProductCardState.js';
import { type StoredEntity, DepotScope } from '@finos/legend-server-depot';
import type { Entity } from '@finos/legend-storage';

export enum DataProductFilterType {
  DEPLOY_TYPE = 'DEPLOY_TYPE',
  ENVIRONMENT_CLASSIFICATION = 'ENVIRONMENT_CLASSIFICATION',
}

export enum DeployType {
  SDLC = 'SDLC',
  SANDBOX = 'SANDBOX',
  UNKNOWN = 'UNKNOWN',
}

export interface DataProductFilterConfig {
  sdlcDeployFilter: boolean;
  sandboxDeployFilter: boolean;
  unknownDeployFilter: boolean;
  devEnvironmentClassificationFilter: boolean;
  prodParallelEnvironmentClassificationFilter: boolean;
  prodEnvironmentClassificationFilter: boolean;
  unknownEnvironmentClassificationFilter: boolean;
}

class DataProductFilters {
  sdlcDeployFilter: boolean;
  sandboxDeployFilter: boolean;
  unknownDeployFilter: boolean;
  devEnvironmentClassificationFilter: boolean;
  prodParallelEnvironmentClassificationFilter: boolean;
  prodEnvironmentClassificationFilter: boolean;
  unknownEnvironmentClassificationFilter: boolean;
  search?: string | undefined;

  constructor(
    defaultBooleanFilters: DataProductFilterConfig,
    search?: string | undefined,
  ) {
    makeObservable(this, {
      sdlcDeployFilter: observable,
      sandboxDeployFilter: observable,
      unknownDeployFilter: observable,
      devEnvironmentClassificationFilter: observable,
      prodParallelEnvironmentClassificationFilter: observable,
      prodEnvironmentClassificationFilter: observable,
      unknownEnvironmentClassificationFilter: observable,
      search: observable,
    });
    this.sdlcDeployFilter = defaultBooleanFilters.sdlcDeployFilter;
    this.sandboxDeployFilter = defaultBooleanFilters.sandboxDeployFilter;
    this.unknownDeployFilter = defaultBooleanFilters.unknownDeployFilter;
    this.devEnvironmentClassificationFilter =
      defaultBooleanFilters.devEnvironmentClassificationFilter;
    this.prodParallelEnvironmentClassificationFilter =
      defaultBooleanFilters.prodParallelEnvironmentClassificationFilter;
    this.prodEnvironmentClassificationFilter =
      defaultBooleanFilters.prodEnvironmentClassificationFilter;
    this.unknownEnvironmentClassificationFilter =
      defaultBooleanFilters.unknownEnvironmentClassificationFilter;
    this.search = search;
  }

  static default(): DataProductFilters {
    return new DataProductFilters(
      {
        sdlcDeployFilter: true,
        sandboxDeployFilter: true,
        unknownDeployFilter: false,
        devEnvironmentClassificationFilter: false,
        prodParallelEnvironmentClassificationFilter: false,
        prodEnvironmentClassificationFilter: true,
        unknownEnvironmentClassificationFilter: false,
      },
      undefined,
    );
  }

  get currentFilterValues(): DataProductFilterConfig {
    return {
      sdlcDeployFilter: this.sdlcDeployFilter,
      sandboxDeployFilter: this.sandboxDeployFilter,
      unknownDeployFilter: this.unknownDeployFilter,
      devEnvironmentClassificationFilter:
        this.devEnvironmentClassificationFilter,
      prodParallelEnvironmentClassificationFilter:
        this.prodParallelEnvironmentClassificationFilter,
      prodEnvironmentClassificationFilter:
        this.prodEnvironmentClassificationFilter,
      unknownEnvironmentClassificationFilter:
        this.unknownEnvironmentClassificationFilter,
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
  filter: DataProductFilters;
  sort: DataProductSort = DataProductSort.NAME_ALPHABETICAL;

  loadingAllProductsState = ActionState.create();

  constructor(marketplaceBaseStore: LegendMarketplaceBaseStore) {
    this.marketplaceBaseStore = marketplaceBaseStore;

    const savedFilterConfig =
      LegendMarketplaceUserDataHelper.getSavedDataProductFilterConfig(
        this.marketplaceBaseStore.applicationStore.userDataService,
      );
    this.filter = savedFilterConfig
      ? new DataProductFilters(savedFilterConfig, undefined)
      : DataProductFilters.default();

    makeObservable(this, {
      dataProductCardStates: observable,
      legacyDataProductCardStates: observable,
      filter: observable,
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
    return [...this.dataProductCardStates, ...this.legacyDataProductCardStates]
      .filter((productCardState) => {
        // Check if product matches deploy type filter
        const deployMatch =
          (this.filter.sdlcDeployFilter && productCardState.isSdlcDeployed) ||
          (this.filter.sandboxDeployFilter &&
            productCardState.isAdHocDeployed) ||
          (this.filter.unknownDeployFilter &&
            productCardState instanceof DataProductCardState &&
            productCardState.dataProductDetails.origin === null);
        // Check if product matches environment classification filter
        const environmentClassificationMatch =
          (this.filter.devEnvironmentClassificationFilter &&
            productCardState.environmentClassification ===
              V1_EntitlementsLakehouseEnvironmentType.DEVELOPMENT) ||
          (this.filter.prodParallelEnvironmentClassificationFilter &&
            productCardState.environmentClassification ===
              V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL) ||
          (this.filter.prodEnvironmentClassificationFilter &&
            productCardState.environmentClassification ===
              V1_EntitlementsLakehouseEnvironmentType.PRODUCTION) ||
          (this.filter.unknownEnvironmentClassificationFilter &&
            productCardState.environmentClassification === undefined);
        // Check if product title matches search filter
        const titleMatch =
          this.filter.search === undefined ||
          this.filter.search === '' ||
          productCardState.title
            .toLowerCase()
            .includes(this.filter.search.toLowerCase());
        return deployMatch && environmentClassificationMatch && titleMatch;
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
      | DeployType
      | V1_IngestEnvironmentClassification
      | 'UNKNOWN'
      | undefined,
  ): void {
    if (filterType === DataProductFilterType.DEPLOY_TYPE) {
      if (val === DeployType.SDLC) {
        this.filter.sdlcDeployFilter = !this.filter.sdlcDeployFilter;
      } else if (val === DeployType.SANDBOX) {
        this.filter.sandboxDeployFilter = !this.filter.sandboxDeployFilter;
      } else if (val === DeployType.UNKNOWN) {
        this.filter.unknownDeployFilter = !this.filter.unknownDeployFilter;
      }
    } else {
      if (val === V1_IngestEnvironmentClassification.DEV) {
        this.filter.devEnvironmentClassificationFilter =
          !this.filter.devEnvironmentClassificationFilter;
      } else if (val === V1_IngestEnvironmentClassification.PROD_PARALLEL) {
        this.filter.prodParallelEnvironmentClassificationFilter =
          !this.filter.prodParallelEnvironmentClassificationFilter;
      } else if (val === V1_IngestEnvironmentClassification.PROD) {
        this.filter.prodEnvironmentClassificationFilter =
          !this.filter.prodEnvironmentClassificationFilter;
      } else if (val === 'UNKNOWN') {
        this.filter.unknownEnvironmentClassificationFilter =
          !this.filter.unknownEnvironmentClassificationFilter;
      }
    }
    LegendMarketplaceUserDataHelper.saveDataProductFilterConfig(
      this.marketplaceBaseStore.applicationStore.userDataService,
      this.filter.currentFilterValues,
    );
  }

  handleSearch(query: string | undefined) {
    this.filter.search = query;
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
      const dataSpaceEntities =
        (await this.marketplaceBaseStore.depotServerClient.getEntitiesByClassifier(
          DATA_SPACE_ELEMENT_CLASSIFIER_PATH,
          {
            scope: DepotScope.RELEASES,
          },
        )) as unknown as StoredEntity[];
      const legacyDataProductCardStates = dataSpaceEntities.map((entity) => {
        const dataSpace = V1_deserializeDataSpace(
          entity.entity as unknown as PlainObject<Entity>,
        );
        return new LegacyDataProductCardState(
          this.marketplaceBaseStore,
          dataSpace,
          entity.groupId,
          entity.artifactId,
          entity.versionId,
        );
      });
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
