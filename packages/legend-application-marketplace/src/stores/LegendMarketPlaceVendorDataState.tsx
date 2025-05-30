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
  ProviderResult,
  type LightDataProduct,
  type MarketplaceServerClient,
} from '@finos/legend-server-marketplace';
import { flow, makeObservable, observable } from 'mobx';
import type {
  LegendMarketplaceApplicationStore,
  LegendMarketplaceBaseStore,
} from './LegendMarketplaceBaseStore.js';
import type { GeneratorFn } from '@finos/legend-shared';
import { VendorDataProviderType } from '../pages/VendorData/LegendMarketplaceVendorData.js';

export class LegendMarketPlaceVendorDataState {
  readonly applicationStore: LegendMarketplaceApplicationStore;
  readonly store: LegendMarketplaceBaseStore;
  marketplaceServerClient: MarketplaceServerClient;

  responseLimit = 10;

  dataFeedProviders: ProviderResult[] = [];
  terminalProviders: ProviderResult[] = [];
  terminalProvidersAsDataProducts: LightDataProduct[] = [];
  addOnProviders: ProviderResult[] = [];

  providerDisplayState: VendorDataProviderType = VendorDataProviderType.ALL;

  constructor(
    applicationStore: LegendMarketplaceApplicationStore,
    store: LegendMarketplaceBaseStore,
  ) {
    makeObservable(this, {
      dataFeedProviders: observable,
      terminalProviders: observable,
      addOnProviders: observable,
      populateProviders: observable,
      providerDisplayState: observable,
      setProviderDisplayState: observable,
      terminalProvidersAsDataProducts: observable,
      init: flow,
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
  }

  setProviderDisplayState(value: VendorDataProviderType): void {
    this.providerDisplayState = value;
  }

  async populateProviders(): Promise<void> {
    try {
      this.dataFeedProviders = (
        await this.marketplaceServerClient.getVendorsByCategory(
          encodeURIComponent('Periodic Datafeed'),
          this.responseLimit,
        )
      ).map((json) => ProviderResult.serialization.fromJson(json));

      this.terminalProviders = (
        await this.marketplaceServerClient.getVendorsByCategory(
          encodeURIComponent('Desktop'),
          this.responseLimit,
        )
      ).map((json) => ProviderResult.serialization.fromJson(json));

      this.addOnProviders = (
        await this.marketplaceServerClient.getVendorsByCategory(
          encodeURIComponent('Add-on'),
          this.responseLimit,
        )
      ).map((json) => ProviderResult.serialization.fromJson(json));
    } catch (error) {
      this.applicationStore.notificationService.notifyError(
        `Failed to fetch vendors: ${error}`,
      );
    }
  }
}
