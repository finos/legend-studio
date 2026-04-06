/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { action, computed, flow, makeObservable, observable } from 'mobx';
import type { LegendMarketplaceBaseStore } from '../LegendMarketplaceBaseStore.js';
import {
  ActionState,
  assertErrorThrown,
  type GeneratorFn,
} from '@finos/legend-shared';
import {
  type ServiceDetail,
  ServiceOwnershipType,
  DeploymentOwnershipDetail,
  UserListOwnershipDetail,
} from '@finos/legend-graph';
import { LegendMarketplaceTelemetryHelper } from '../../__lib__/LegendMarketplaceTelemetryHelper.js';

export enum LegendServiceSort {
  DEFAULT = 'Default',
  NAME_ALPHABETICAL = 'Name A-Z',
  NAME_REVERSE_ALPHABETICAL = 'Name Z-A',
}

export enum ServicesViewMode {
  LIST = 'list',
  TILE = 'tile',
}

export class LegendServiceCardState {
  readonly service: ServiceDetail;

  constructor(service: ServiceDetail) {
    this.service = service;
  }

  get title(): string {
    if (this.service.title) {
      return this.service.title;
    } else if (this.service.name) {
      return this.service.name;
    } else {
      const parts = this.patternPath.split('/');
      return parts[parts.length - 1] ?? this.service.pattern;
    }
  }

  get patternPath(): string {
    return this.service.pattern.replace(/^\//u, '');
  }

  get description(): string {
    return this.service.documentation || '';
  }

  get owners(): string[] {
    const ownership = this.service.ownership;
    if (
      ownership instanceof UserListOwnershipDetail &&
      ownership.users.length > 0
    ) {
      return ownership.users;
    }
    if (ownership instanceof DeploymentOwnershipDetail) {
      return [ownership.identifier];
    }
    return [];
  }

  get ownershipType(): ServiceOwnershipType | undefined {
    const ownership = this.service.ownership;
    if (ownership instanceof DeploymentOwnershipDetail) {
      return ServiceOwnershipType.DEPLOYMENT_OWNERSHIP;
    }
    if (ownership instanceof UserListOwnershipDetail) {
      return ServiceOwnershipType.USER_LIST_OWNERSHIP;
    }
    return undefined;
  }

  get guid(): string {
    return this.service.pattern;
  }

  private static hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = Math.trunc(hash * 31 + (str.codePointAt(i) ?? 0));
    }
    return Math.abs(hash);
  }

  get displayImage(): string {
    const GENERIC_IMAGE_COUNT = 20;
    const index =
      LegendServiceCardState.hashString(this.guid) % GENERIC_IMAGE_COUNT;
    return `/assets/images${index + 1}.jpg`;
  }
}

const LEGEND_MARKETPLACE_SETTING_KEY_OWNER_FILTERS =
  'marketplace.data-apis.ownerFilters';
const LEGEND_MARKETPLACE_SETTING_KEY_DEPLOYMENT_ID_FILTERS =
  'marketplace.data-apis.deploymentIdFilters';
const LEGEND_MARKETPLACE_SETTING_KEY_SERVICES_VIEW_MODE =
  'marketplace.data-apis.viewMode';
const LEGEND_MARKETPLACE_SETTING_KEY_SHOW_OWN_SERVICES =
  'marketplace.data-apis.showOwnServicesOnly';

export class LegendMarketplaceDataAPIsStore {
  readonly marketplaceBaseStore: LegendMarketplaceBaseStore;

  searchQuery = '';
  sort: LegendServiceSort = LegendServiceSort.DEFAULT;
  viewMode: ServicesViewMode;
  showOwnServicesOnly: boolean;
  serviceCardStates: LegendServiceCardState[] = [];
  page = 1;
  itemsPerPage = 12;

  ownerFilters: string[] = [];
  deploymentIdFilters: string[] = [];

  readonly fetchingServicesState = ActionState.create();

  constructor(marketplaceBaseStore: LegendMarketplaceBaseStore) {
    this.marketplaceBaseStore = marketplaceBaseStore;

    this.ownerFilters =
      (this.marketplaceBaseStore.applicationStore.settingService.getObjectValue(
        LEGEND_MARKETPLACE_SETTING_KEY_OWNER_FILTERS,
      ) as string[] | undefined) ?? [];
    this.deploymentIdFilters =
      (this.marketplaceBaseStore.applicationStore.settingService.getObjectValue(
        LEGEND_MARKETPLACE_SETTING_KEY_DEPLOYMENT_ID_FILTERS,
      ) as string[] | undefined) ?? [];

    const persistedViewMode =
      this.marketplaceBaseStore.applicationStore.settingService.getStringValue(
        LEGEND_MARKETPLACE_SETTING_KEY_SERVICES_VIEW_MODE,
      );
    this.viewMode = Object.values(ServicesViewMode).includes(
      persistedViewMode as ServicesViewMode,
    )
      ? (persistedViewMode as ServicesViewMode)
      : ServicesViewMode.LIST;

    const persistedShowOwn =
      this.marketplaceBaseStore.applicationStore.settingService.getBooleanValue(
        LEGEND_MARKETPLACE_SETTING_KEY_SHOW_OWN_SERVICES,
      );
    this.showOwnServicesOnly = persistedShowOwn ?? false;

    makeObservable(this, {
      searchQuery: observable,
      sort: observable,
      viewMode: observable,
      showOwnServicesOnly: observable,
      serviceCardStates: observable,
      page: observable,
      itemsPerPage: observable,
      ownerFilters: observable,
      deploymentIdFilters: observable,
      setSearchQuery: action,
      setSort: action,
      setViewMode: action,
      setShowOwnServicesOnly: action,
      setPage: action,
      setItemsPerPage: action,
      addOwnerFilter: action,
      removeOwnerFilter: action,
      addDeploymentIdFilter: action,
      removeDeploymentIdFilter: action,
      clearAllFilters: action,
      filteredSortedServices: computed,
      paginatedServices: computed,
      totalFilteredCount: computed,
      hasActiveFilters: computed,
      isLoading: computed,
      fetchAllServices: flow,
    });
  }

  setSearchQuery(query: string): void {
    this.searchQuery = query;
    this.page = 1;
  }

  setSort(sort: LegendServiceSort): void {
    this.sort = sort;
  }

  setViewMode(mode: ServicesViewMode): void {
    this.viewMode = mode;
    this.marketplaceBaseStore.applicationStore.settingService.persistValue(
      LEGEND_MARKETPLACE_SETTING_KEY_SERVICES_VIEW_MODE,
      mode,
    );
  }

  setShowOwnServicesOnly(value: boolean): void {
    this.showOwnServicesOnly = value;
    this.page = 1;
    this.marketplaceBaseStore.applicationStore.settingService.persistValue(
      LEGEND_MARKETPLACE_SETTING_KEY_SHOW_OWN_SERVICES,
      value,
    );
  }

  setPage(value: number): void {
    this.page = value;
  }

  setItemsPerPage(value: number): void {
    this.itemsPerPage = value;
    this.page = 1;
  }

  private persistOwnerFilters(): void {
    this.marketplaceBaseStore.applicationStore.settingService.persistValue(
      LEGEND_MARKETPLACE_SETTING_KEY_OWNER_FILTERS,
      this.ownerFilters,
    );
  }

  private persistDeploymentIdFilters(): void {
    this.marketplaceBaseStore.applicationStore.settingService.persistValue(
      LEGEND_MARKETPLACE_SETTING_KEY_DEPLOYMENT_ID_FILTERS,
      this.deploymentIdFilters,
    );
  }

  addOwnerFilter(value: string): void {
    const trimmed = value.trim();
    if (trimmed && !this.ownerFilters.includes(trimmed)) {
      this.ownerFilters.push(trimmed);
      this.page = 1;
      this.persistOwnerFilters();
      LegendMarketplaceTelemetryHelper.logEvent_FilterServices(
        this.marketplaceBaseStore.applicationStore.telemetryService,
        'owner',
        trimmed,
        'add',
      );
    }
  }

  removeOwnerFilter(value: string): void {
    this.ownerFilters = this.ownerFilters.filter((v) => v !== value);
    this.page = 1;
    this.persistOwnerFilters();
    LegendMarketplaceTelemetryHelper.logEvent_FilterServices(
      this.marketplaceBaseStore.applicationStore.telemetryService,
      'owner',
      value,
      'remove',
    );
  }

  addDeploymentIdFilter(value: string): void {
    const trimmed = value.trim();
    if (trimmed && !this.deploymentIdFilters.includes(trimmed)) {
      this.deploymentIdFilters.push(trimmed);
      this.page = 1;
      this.persistDeploymentIdFilters();
      LegendMarketplaceTelemetryHelper.logEvent_FilterServices(
        this.marketplaceBaseStore.applicationStore.telemetryService,
        'deploymentId',
        trimmed,
        'add',
      );
    }
  }

  removeDeploymentIdFilter(value: string): void {
    this.deploymentIdFilters = this.deploymentIdFilters.filter(
      (v) => v !== value,
    );
    this.page = 1;
    this.persistDeploymentIdFilters();
    LegendMarketplaceTelemetryHelper.logEvent_FilterServices(
      this.marketplaceBaseStore.applicationStore.telemetryService,
      'deploymentId',
      value,
      'remove',
    );
  }

  clearAllFilters(): void {
    this.ownerFilters = [];
    this.deploymentIdFilters = [];
    this.page = 1;
    this.persistOwnerFilters();
    this.persistDeploymentIdFilters();
    LegendMarketplaceTelemetryHelper.logEvent_FilterServices(
      this.marketplaceBaseStore.applicationStore.telemetryService,
      'all',
      '',
      'clear',
    );
  }

  get hasActiveFilters(): boolean {
    return this.ownerFilters.length > 0 || this.deploymentIdFilters.length > 0;
  }

  get filteredSortedServices(): LegendServiceCardState[] {
    let results = this.serviceCardStates;

    if (this.showOwnServicesOnly) {
      const currentUser =
        this.marketplaceBaseStore.applicationStore.identityService.currentUser;
      if (currentUser) {
        const userId = currentUser.toLowerCase();
        results = results.filter((card) =>
          card.owners.some((owner) => owner.toLowerCase() === userId),
        );
      }
    }

    if (this.searchQuery) {
      const query = this.searchQuery.replace(/^\//u, '').toLowerCase();
      results = results.filter(
        (card) =>
          card.title.toLowerCase().includes(query) ||
          card.patternPath.toLowerCase().includes(query) ||
          card.description.toLowerCase().includes(query),
      );
    }

    const hasOwnerFilters = this.ownerFilters.length > 0;
    const hasDeploymentFilters = this.deploymentIdFilters.length > 0;
    if (hasOwnerFilters || hasDeploymentFilters) {
      const ownerQueries = this.ownerFilters.map((q) => q.toLowerCase());
      const deploymentQueries = this.deploymentIdFilters.map((q) =>
        q.toLowerCase(),
      );

      results = results.filter((card) => {
        const matchesOwners =
          hasOwnerFilters &&
          card.ownershipType !== ServiceOwnershipType.DEPLOYMENT_OWNERSHIP &&
          ownerQueries.every((q) =>
            card.owners.some((owner) => owner.toLowerCase().includes(q)),
          );

        const matchesDeployment =
          hasDeploymentFilters &&
          (() => {
            const ownership = card.service.ownership;
            if (ownership instanceof DeploymentOwnershipDetail) {
              return deploymentQueries.every((q) =>
                ownership.identifier.toLowerCase().includes(q),
              );
            }
            return false;
          })();

        return matchesOwners || matchesDeployment;
      });
    }

    return results.slice().sort((a, b) => {
      switch (this.sort) {
        case LegendServiceSort.NAME_ALPHABETICAL:
          return a.title.localeCompare(b.title);
        case LegendServiceSort.NAME_REVERSE_ALPHABETICAL:
          return b.title.localeCompare(a.title);
        case LegendServiceSort.DEFAULT:
        default:
          return a.patternPath.localeCompare(b.patternPath);
      }
    });
  }

  get paginatedServices(): LegendServiceCardState[] {
    const start = (this.page - 1) * this.itemsPerPage;
    return this.filteredSortedServices.slice(start, start + this.itemsPerPage);
  }

  get totalFilteredCount(): number {
    return this.filteredSortedServices.length;
  }

  get isLoading(): boolean {
    return this.fetchingServicesState.isInProgress;
  }

  *fetchAllServices(): GeneratorFn<void> {
    this.fetchingServicesState.inProgress();
    try {
      const engineClient = this.marketplaceBaseStore.engineServerClient;

      const services =
        (yield engineClient.getServicesInfo()) as ServiceDetail[];
      const serviceCards: LegendServiceCardState[] = [];
      for (const svc of services) {
        serviceCards.push(new LegendServiceCardState(svc));
      }

      this.serviceCardStates = serviceCards;
      this.fetchingServicesState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.marketplaceBaseStore.applicationStore.notificationService.notifyError(
        `Error fetching services: ${error.message}`,
      );
      this.fetchingServicesState.fail();
    }
  }
}
