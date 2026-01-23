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
  TerminalResult,
  type Filter,
  type MarketplaceServerClient,
  type TerminalServicesResponse,
  ProductType,
  type FetchProductsParams,
} from '@finos/legend-server-marketplace';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import type {
  LegendMarketplaceApplicationStore,
  LegendMarketplaceBaseStore,
} from './LegendMarketplaceBaseStore.js';
import {
  ActionState,
  type GeneratorFn,
  LegendUser,
  assertErrorThrown,
} from '@finos/legend-shared';

export enum VendorDataProviderType {
  ALL = 'All',
  TERMINAL_LICENSE = 'Terminal License',
  ADD_ONS = 'Add-Ons',
}

export class LegendMarketPlaceVendorDataStore {
  readonly applicationStore: LegendMarketplaceApplicationStore;
  readonly store: LegendMarketplaceBaseStore;
  marketplaceServerClient: MarketplaceServerClient;

  selectedUser: LegendUser = new LegendUser();

  readonly fetchingProvidersState = ActionState.create();

  terminalProviders: TerminalResult[] = [];
  addOnProviders: TerminalResult[] = [];
  providers: TerminalResult[] = [];

  page = 1;
  itemsPerPage = 24;
  totalTerminalItems = 0;
  totalAddOnItems = 0;
  totalItems = 0;

  searchTerm = '';

  providersFilters: Filter[] = [];

  providerDisplayState: VendorDataProviderType = VendorDataProviderType.ALL;

  constructor(
    applicationStore: LegendMarketplaceApplicationStore,
    store: LegendMarketplaceBaseStore,
  ) {
    makeObservable(this, {
      selectedUser: observable,
      terminalProviders: observable,
      addOnProviders: observable,
      providers: observable,
      page: observable,
      itemsPerPage: observable,
      totalTerminalItems: observable,
      totalAddOnItems: observable,
      totalItems: observable,
      searchTerm: observable,
      providerDisplayState: observable,
      providersFilters: observable,
      setProviderDisplayState: action,
      setProvidersFilters: action,
      setPage: action,
      setItemsPerPage: action,
      setSearchTerm: action,
      setSelectedUser: action,
      resetSelectedUser: action,
      init: flow,
      refresh: flow,
      populateProviders: flow,
    });

    this.applicationStore = applicationStore;
    this.store = store;
    this.marketplaceServerClient = store.marketplaceServerClient;
  }

  *init(): GeneratorFn<void> {
    try {
      this.selectedUser = new LegendUser();
      this.selectedUser.id = this.applicationStore.identityService.currentUser;
    } catch (error) {
      this.applicationStore.notificationService.notifyError(
        `Failed to get current user: ${error}`,
      );
    }
    this.refresh();
  }

  *refresh(): GeneratorFn<void> {
    try {
      yield flowResult(this.populateProviders());
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Failed to initialize vendors: ${error.message}`,
      );
    }
  }

  setProviderDisplayState(value: VendorDataProviderType): void {
    this.providerDisplayState = value;
    this.page = 1;
  }

  setProvidersFilters(value: Filter[]): void {
    this.providersFilters = value;
    this.page = 1;
  }

  setPage(value: number): void {
    this.page = value;
  }

  setItemsPerPage(value: number): void {
    this.itemsPerPage = value;
    this.page = 1;
  }

  setSearchTerm(value: string): void {
    this.searchTerm = value;
    this.page = 1;
  }

  setSelectedUser(user: LegendUser): void {
    this.selectedUser = user;
    this.refresh();
  }

  resetSelectedUser(): void {
    this.selectedUser = new LegendUser();
    this.selectedUser.id = this.applicationStore.identityService.currentUser;
    this.refresh();
  }

  *populateProviders(): GeneratorFn<void> {
    try {
      this.fetchingProvidersState.inProgress();

      if (this.providerDisplayState === VendorDataProviderType.ALL) {
        const params: FetchProductsParams = {
          kerberos: this.selectedUser.id,
          product_type: ProductType.ALL,
          preferred_products: true,
          page_size: this.itemsPerPage,
          search: this.searchTerm,
        };
        const response = (yield this.marketplaceServerClient.fetchProducts(
          params,
        )) as TerminalServicesResponse;

        this.terminalProviders = (response.vendor_profiles ?? []).map((json) =>
          TerminalResult.serialization.fromJson(json),
        );

        this.addOnProviders = (response.service_pricing ?? []).map((json) =>
          TerminalResult.serialization.fromJson(json),
        );

        this.totalTerminalItems = response.vendor_profiles_total_count ?? 0;
        this.totalAddOnItems = response.service_pricing_total_count ?? 0;
      } else if (
        this.providerDisplayState === VendorDataProviderType.TERMINAL_LICENSE
      ) {
        const params: FetchProductsParams = {
          kerberos: this.selectedUser.id,
          product_type: ProductType.VENDOR_PROFILE,
          preferred_products: false,
          page_size: this.itemsPerPage,
          search: this.searchTerm,
          page_number: this.page,
        };
        const response = (yield this.marketplaceServerClient.fetchProducts(
          params,
        )) as TerminalServicesResponse;

        this.providers = (response.vendor_profiles ?? []).map((json) =>
          TerminalResult.serialization.fromJson(json),
        );

        this.totalItems = response.total_count ?? 0;
      } else {
        const params: FetchProductsParams = {
          kerberos: this.selectedUser.id,
          product_type: ProductType.SERVICE_PRICING,
          preferred_products: false,
          page_size: this.itemsPerPage,
          search: this.searchTerm,
          page_number: this.page,
        };
        const response = (yield this.marketplaceServerClient.fetchProducts(
          params,
        )) as TerminalServicesResponse;

        this.providers = (response.service_pricing ?? []).map((json) =>
          TerminalResult.serialization.fromJson(json),
        );

        this.totalItems = response.total_count ?? 0;
      }

      this.fetchingProvidersState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Failed to fetch vendors: ${error.message}`,
      );
      this.fetchingProvidersState.fail();
    }
  }
}
