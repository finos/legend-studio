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
  DataProduct,
  ProviderResult,
  type Filter,
  type LightDataProduct,
  type MarketplaceServerClient,
} from '@finos/legend-server-marketplace';
import { action, flow, makeObservable, observable } from 'mobx';
import type {
  LegendMarketplaceApplicationStore,
  LegendMarketplaceBaseStore,
} from './LegendMarketplaceBaseStore.js';
import type { GeneratorFn } from '@finos/legend-shared';

export enum VendorDataProviderType {
  ALL = 'All',
  DATAFEEDS = 'Datafeeds',
  TERMINAL_LICENSE = 'Terminal License',
  ADD_ONS = 'Add-Ons',
}

export class LegendMarketPlaceVendorDataStore {
  readonly applicationStore: LegendMarketplaceApplicationStore;
  readonly store: LegendMarketplaceBaseStore;
  marketplaceServerClient: MarketplaceServerClient;

  responseLimit = 6;

  dataFeedProviders: ProviderResult[] = [];
  terminalProviders: ProviderResult[] = [];
  terminalProvidersAsDataProducts: LightDataProduct[] = [];
  addOnProviders: ProviderResult[] = [];
  dataProducts: DataProduct[] = [];
  homeDataProducts: LightDataProduct[] = [];
  providersFilters: Filter[] = [];

  providerDisplayState: VendorDataProviderType = VendorDataProviderType.ALL;

  constructor(
    applicationStore: LegendMarketplaceApplicationStore,
    store: LegendMarketplaceBaseStore,
  ) {
    makeObservable(this, {
      dataFeedProviders: observable,
      terminalProviders: observable,
      addOnProviders: observable,
      populateProviders: action,
      providerDisplayState: observable,
      setProviderDisplayState: action,
      terminalProvidersAsDataProducts: observable,
      init: flow,
      dataProducts: observable,
      homeDataProducts: observable,
      populateDataProducts: action,
      providersFilters: observable,
      setProvidersFilters: action,
    });

    this.applicationStore = applicationStore;
    this.store = store;
    this.marketplaceServerClient = store.marketplaceServerClient;
  }

  *init(): GeneratorFn<void> {
    try {
      yield this.populateProviders();
      this.terminalProvidersAsDataProducts = this.terminalProviders.map(
        (provider) =>
          ({
            description: provider.description,
            provider: provider.providerName,
            type: 'vendor',
          }) as LightDataProduct,
      );
    } catch (error) {
      this.applicationStore.notificationService.notifyError(
        `Failed to initialize vendors: ${error}`,
      );
    }

    try {
      yield this.populateDataProducts();
      this.homeDataProducts = this.dataProducts.map(
        (product) =>
          ({
            description: product.description,
            provider: product.productName,
            type: product.provider,
          }) as LightDataProduct,
      );
    } catch (error) {
      this.applicationStore.notificationService.notifyError(
        `Failed to initialize data products: ${error}`,
      );
    }
  }

  setProviderDisplayState(value: VendorDataProviderType): void {
    this.providerDisplayState = value;
  }

  setProvidersFilters(value: Filter[]): void {
    this.providersFilters = value;
    this.populateData();
  }

  populateData(): void {
    this.populateProviders()
      .then(() =>
        this.applicationStore.notificationService.notifySuccess(
          'Data populated successfully.',
        ),
      )
      .catch((error: Error) =>
        this.applicationStore.notificationService.notifyError(
          `Failed to populate Data: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
      );
  }

  async populateProviders(): Promise<void> {
    try {
      const filters: string = this.providersFilters
        .map((filter) => `&${filter.label}=${encodeURIComponent(filter.value)}`)
        .join('');
      this.dataFeedProviders = (
        await this.marketplaceServerClient.getVendorsByCategory(
          encodeURIComponent('Periodic Datafeed'),
          filters,
          this.responseLimit,
        )
      ).map((json) => ProviderResult.serialization.fromJson(json));

      this.terminalProviders = (
        await this.marketplaceServerClient.getVendorsByCategory(
          encodeURIComponent('Desktop'),
          filters,
          this.responseLimit,
        )
      ).map((json) => ProviderResult.serialization.fromJson(json));

      this.addOnProviders = (
        await this.marketplaceServerClient.getVendorsByCategory(
          encodeURIComponent('Add-on'),
          filters,
          this.responseLimit,
        )
      ).map((json) => ProviderResult.serialization.fromJson(json));
    } catch (error) {
      this.applicationStore.notificationService.notifyError(
        `Failed to fetch vendors: ${error}`,
      );
    }
  }

  async populateDataProducts(): Promise<void> {
    try {
      this.dataProducts = (
        await this.marketplaceServerClient.getDataProducts(this.responseLimit)
      ).map((json) => DataProduct.serialization.fromJson(json));
    } catch (error) {
      this.applicationStore.notificationService.notifyError(
        `Failed to fetch data products: ${error}`,
      );
    }
  }
}
