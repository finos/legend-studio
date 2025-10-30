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
  type DataProduct,
  TerminalResult,
  type Filter,
  type LightDataProduct,
  type MarketplaceServerClient,
} from '@finos/legend-server-marketplace';
import { action, flow, makeObservable, observable } from 'mobx';
import type {
  LegendMarketplaceApplicationStore,
  LegendMarketplaceBaseStore,
} from './LegendMarketplaceBaseStore.js';
import { ActionState, type GeneratorFn } from '@finos/legend-shared';
import { toastManager } from '../components/Toast/CartToast.js';

export enum VendorDataProviderType {
  ALL = 'All',
  TERMINAL_LICENSE = 'Terminal License',
  ADD_ONS = 'Add-Ons',
}

export class LegendMarketPlaceVendorDataStore {
  readonly applicationStore: LegendMarketplaceApplicationStore;
  readonly store: LegendMarketplaceBaseStore;
  marketplaceServerClient: MarketplaceServerClient;

  responseLimit = 6;

  currentUser = '';

  readonly fetchingProvidersState = ActionState.create();

  //Vendor Data Page
  terminalProviders: TerminalResult[] = [];
  terminalProvidersAsDataProducts: LightDataProduct[] = [];
  addOnProviders: TerminalResult[] = [];
  providers: TerminalResult[] = [];

  // Data Products Page
  dataProducts: DataProduct[] = [];

  //Home Page
  homeDataProducts: LightDataProduct[] = [];

  providersFilters: Filter[] = [];

  providerDisplayState: VendorDataProviderType = VendorDataProviderType.ALL;

  constructor(
    applicationStore: LegendMarketplaceApplicationStore,
    store: LegendMarketplaceBaseStore,
  ) {
    makeObservable(this, {
      terminalProviders: observable,
      addOnProviders: observable,
      populateProviders: action,
      providerDisplayState: observable,
      setProviderDisplayState: action,
      terminalProvidersAsDataProducts: observable,
      providers: observable,
      setProviders: action,
      init: flow,
      homeDataProducts: observable,
      providersFilters: observable,
      setProvidersFilters: action,
    });

    this.applicationStore = applicationStore;
    this.store = store;
    this.marketplaceServerClient = store.marketplaceServerClient;
  }

  *init(): GeneratorFn<void> {
    try {
      this.currentUser = this.applicationStore.identityService.currentUser;
    } catch (error) {
      this.applicationStore.notificationService.notifyError(
        `Failed to get current user: ${error}`,
      );
    }

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

      this.fetchingProvidersState.inProgress();

      this.terminalProviders = (
        await this.marketplaceServerClient.getVendorsByCategory(
          this.currentUser,
          encodeURIComponent('desktop'),
          'landing',
          filters,
          this.responseLimit,
        )
      ).map((json) => {
        return TerminalResult.serialization.fromJson(json);
      });

      this.addOnProviders = (
        await this.marketplaceServerClient.getVendorsByCategory(
          this.currentUser,
          encodeURIComponent('addon'),
          'landing',
          filters,
          this.responseLimit,
        )
      ).map((json) => TerminalResult.serialization.fromJson(json));
    } catch (error) {
      this.applicationStore.notificationService.notifyError(
        `Failed to fetch vendors: ${error}`,
      );
    } finally {
      this.fetchingProvidersState.complete();
    }
  }

  setProviders(category: string): void {
    this.providers = [];
    const filters: string = this.providersFilters
      .map((filter) => `&${filter.label}=${encodeURIComponent(filter.value)}`)
      .join('');

    this.fetchingProvidersState.inProgress();
    this.marketplaceServerClient
      .getVendorsByCategory(
        this.currentUser,
        encodeURIComponent(category),
        'list',
        filters,
        this.responseLimit,
      )
      .then((response) => {
        this.providers = response.map((json) => {
          return TerminalResult.serialization.fromJson(json);
        });
        this.fetchingProvidersState.complete();
      })
      .catch((error) => {
        toastManager.error(`Failed to fetch vendors: ${error.message}`);
        this.fetchingProvidersState.fail();
      });
  }
}
