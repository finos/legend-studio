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
  guaranteeNonNullable,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import { V1_PureGraphManager } from '@finos/legend-graph';
import { LegendMarketplaceUserDataHelper } from '../../__lib__/LegendMarketplaceUserDataHelper.js';
import {
  DataProductSearchResult,
  type MarketplaceServerClient,
} from '@finos/legend-server-marketplace';
import { ProductCardState } from './dataProducts/ProductCardState.js';

export interface DataProductFilterConfig {
  modeledDataProducts?: boolean;
}

class DataProductFilterState {
  modeledDataProducts: boolean;
  search?: string | undefined;

  constructor(
    defaultBooleanFilters: DataProductFilterConfig,
    search?: string | undefined,
  ) {
    makeObservable(this, {
      modeledDataProducts: observable,
      search: observable,
    });
    this.modeledDataProducts =
      defaultBooleanFilters.modeledDataProducts ??
      DataProductFilterState.default().modeledDataProducts;
    this.search = search;
  }

  static default(): DataProductFilterState {
    return new DataProductFilterState(
      {
        modeledDataProducts: false,
      },
      undefined,
    );
  }

  get currentFilterValues(): DataProductFilterConfig {
    return {
      modeledDataProducts: this.modeledDataProducts,
    };
  }
}

export enum DataProductSort {
  DEFAULT = 'Default',
  NAME_ALPHABETICAL = 'Name A-Z',
  NAME_REVERSE_ALPHABETICAL = 'Name Z-A',
}

export class LegendMarketplaceSearchResultsStore {
  readonly marketplaceBaseStore: LegendMarketplaceBaseStore;
  readonly marketplaceServerClient: MarketplaceServerClient;
  readonly displayImageMap = new Map<string, string>();
  productCardStates: ProductCardState[] = [];
  filterState: DataProductFilterState;
  sort: DataProductSort = DataProductSort.DEFAULT;
  graphManager: V1_PureGraphManager | undefined;

  executingSearchState = ActionState.create();

  constructor(marketplaceBaseStore: LegendMarketplaceBaseStore) {
    this.marketplaceBaseStore = marketplaceBaseStore;
    this.marketplaceServerClient = marketplaceBaseStore.marketplaceServerClient;

    const savedFilterConfig =
      LegendMarketplaceUserDataHelper.getSavedDataProductFilterConfig(
        this.marketplaceBaseStore.applicationStore.userDataService,
      );
    this.filterState = savedFilterConfig
      ? new DataProductFilterState(savedFilterConfig, undefined)
      : DataProductFilterState.default();

    makeObservable(this, {
      productCardStates: observable,
      filterState: observable,
      sort: observable,
      handleModeledDataProductsFilterToggle: action,
      handleSearch: action,
      setProductCardStates: action,
      setSort: action,
      filterSortProducts: computed,
      executeSearch: flow,
    });
  }

  get filterSortProducts(): ProductCardState[] | undefined {
    return this.productCardStates
      .filter((productCardState) =>
        this.marketplaceBaseStore.envState.filterDataProduct(
          productCardState,
          this.filterState.modeledDataProducts,
        ),
      )
      .sort((a, b) => {
        switch (this.sort) {
          case DataProductSort.DEFAULT:
            return b.searchResult.similarity - a.searchResult.similarity;
          case DataProductSort.NAME_ALPHABETICAL:
            return a.searchResult.data_product_name.localeCompare(
              b.searchResult.data_product_name,
            );
          case DataProductSort.NAME_REVERSE_ALPHABETICAL:
            return b.searchResult.data_product_name.localeCompare(
              a.searchResult.data_product_name,
            );
          default:
            return 0;
        }
      });
  }

  setProductCardStates(dataProductCardStates: ProductCardState[]): void {
    this.productCardStates = dataProductCardStates;
  }

  handleModeledDataProductsFilterToggle(): void {
    this.filterState.modeledDataProducts =
      !this.filterState.modeledDataProducts;
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

  *executeSearch(query: string, token: string | undefined): GeneratorFn<void> {
    try {
      this.executingSearchState.inProgress();
      const rawResults = (yield this.marketplaceServerClient.dataProductSearch(
        query,
      )) as PlainObject<DataProductSearchResult>[];
      const results = rawResults.map((result) =>
        DataProductSearchResult.serialization.fromJson(result),
      );

      if (this.graphManager === undefined) {
        // Crete graph manager for parsing ad-hoc deployed data products
        const graphManager = new V1_PureGraphManager(
          this.marketplaceBaseStore.applicationStore.pluginManager,
          this.marketplaceBaseStore.applicationStore.logService,
          this.marketplaceBaseStore.remoteEngine,
        );
        yield graphManager.initialize(
          {
            env: this.marketplaceBaseStore.applicationStore.config.env,
            tabSize: DEFAULT_TAB_SIZE,
            clientConfig: {
              baseUrl:
                this.marketplaceBaseStore.applicationStore.config
                  .engineServerUrl,
            },
          },
          { engine: this.marketplaceBaseStore.remoteEngine },
        );
        this.graphManager = graphManager;
      }

      // Create data product card states
      const dataProductCardStates: ProductCardState[] = results.map(
        (result) =>
          new ProductCardState(
            this.marketplaceBaseStore,
            result,
            guaranteeNonNullable(
              this.graphManager,
              'Graph manager is not initialized',
            ),
            this.displayImageMap,
          ),
      );
      this.setProductCardStates(dataProductCardStates);

      this.productCardStates.forEach((dataProductCardState) =>
        dataProductCardState.init(token),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.marketplaceBaseStore.applicationStore.notificationService.notifyError(
        `Error executing search: ${error.message}`,
      );
    } finally {
      this.executingSearchState.complete();
    }
  }
}
