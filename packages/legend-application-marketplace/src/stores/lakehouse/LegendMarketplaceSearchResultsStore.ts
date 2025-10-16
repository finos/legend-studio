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
  V1_entitlementsDataProductDetailsResponseToDataProductDetails,
  V1_EntitlementsLakehouseEnvironmentType,
  V1_PureGraphManager,
} from '@finos/legend-graph';
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

class DataProductFilterState {
  search?: string | undefined;

  constructor(search?: string | undefined) {
    makeObservable(this, {
      search: observable,
    });

    this.search = search;
  }

  static default(): DataProductFilterState {
    return new DataProductFilterState();
  }
}

export enum DataProductSort {
  NAME_ALPHABETICAL = 'Name A-Z',
  NAME_REVERSE_ALPHABETICAL = 'Name Z-A',
}

export class LegendMarketplaceSearchResultsStore {
  readonly marketplaceBaseStore: LegendMarketplaceBaseStore;
  readonly displayImageMap = new Map<string, string>();
  dataProductCardStates: DataProductCardState[] = [];
  legacyDataProductCardStates: LegacyDataProductCardState[] = [];
  filterState: DataProductFilterState;
  sort: DataProductSort = DataProductSort.NAME_ALPHABETICAL;

  loadingAllProductsState = ActionState.create();

  constructor(marketplaceBaseStore: LegendMarketplaceBaseStore) {
    this.marketplaceBaseStore = marketplaceBaseStore;

    this.filterState = DataProductFilterState.default();

    makeObservable(this, {
      dataProductCardStates: observable,
      legacyDataProductCardStates: observable,
      filterState: observable,
      sort: observable,
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
      this.dataProductCardStates.filter((dataProductCardState) => {
        // Check if product matches environment
        const siteEnv = this.marketplaceBaseStore.applicationStore.config.env;

        switch (siteEnv) {
          case 'prod':
            return (
              dataProductCardState.environmentClassification ===
              V1_EntitlementsLakehouseEnvironmentType.PRODUCTION
            );
          case 'prod-par':
            return (
              dataProductCardState.environmentClassification ===
              V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL
            );
          default:
            return true;
        }
      }) as BaseProductCardState[]
    )
      .concat(this.legacyDataProductCardStates as BaseProductCardState[])
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
        .sort((a, b) => a.id.localeCompare(b.id))
        .map(
          (dataProductDetail) =>
            new DataProductCardState(
              this.marketplaceBaseStore,
              graphManager,
              dataProductDetail,
              this.displayImageMap,
            ),
        );
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
            this.displayImageMap,
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
