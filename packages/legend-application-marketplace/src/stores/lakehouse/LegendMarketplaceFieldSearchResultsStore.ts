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
  isNonEmptyString,
  LogEvent,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import {
  FieldSearchType,
  type FieldSearchRequest,
  GroupedFieldSearchResponse,
  type GroupedFieldSearchResponseMetadata,
} from '@finos/legend-server-marketplace';
import type { DataProductTypeFilter } from './LegendMarketplaceSearchResultsStore.js';
import { LEGEND_MARKETPLACE_APP_EVENT } from '../../__lib__/LegendMarketplaceAppEvent.js';
import { LegendMarketplaceTelemetryHelper } from '../../__lib__/LegendMarketplaceTelemetryHelper.js';
import { FieldSearchResultState } from './fieldSearch/FieldSearchResultState.js';

export class LegendMarketplaceFieldSearchResultsStore {
  readonly marketplaceBaseStore: LegendMarketplaceBaseStore;
  searchQuery: string | undefined = undefined;
  fieldSearchResultStates: FieldSearchResultState[] = [];
  responseMetadata: GroupedFieldSearchResponseMetadata | undefined = undefined;
  page = 1;
  itemsPerPage = 12;
  errorMessage: string | undefined = undefined;
  selectedProductTypes: Set<DataProductTypeFilter> =
    new Set<DataProductTypeFilter>();
  expandedRows: Set<string> = new Set<string>();
  readonly loadState = ActionState.create();
  private _currentFetchToken = 0;
  private _abortController: AbortController | undefined = undefined;

  constructor(marketplaceBaseStore: LegendMarketplaceBaseStore) {
    this.marketplaceBaseStore = marketplaceBaseStore;

    makeObservable<
      LegendMarketplaceFieldSearchResultsStore,
      '_currentFetchToken' | '_abortController'
    >(this, {
      searchQuery: observable,
      fieldSearchResultStates: observable,
      responseMetadata: observable,
      page: observable,
      itemsPerPage: observable,
      errorMessage: observable,
      selectedProductTypes: observable,
      expandedRows: observable,
      _currentFetchToken: false,
      _abortController: false,
      setSearchQuery: action,
      setFieldSearchResultStates: action,
      setResponseMetadata: action,
      setPage: action,
      setItemsPerPage: action,
      setErrorMessage: action,
      toggleProductType: action,
      clearAllFilters: action,
      toggleExpandRow: action,
      clearExpandedRows: action,
      fieldSearchRequest: computed,
      tableRows: computed,
      totalItems: computed,
      totalFieldMatches: computed,
      lakehouseCount: computed,
      legacyCount: computed,
      hasActiveFilters: computed,
      isLoading: computed,
      hasFailed: computed,
      executeSearch: flow,
      changePageAndFetch: flow,
      changeItemsPerPageAndFetch: flow,
      toggleProductTypeAndFetch: flow,
      clearAllFiltersAndFetch: flow,
    });
  }

  setSearchQuery(query: string | undefined): void {
    this.searchQuery = query;
    this.page = 1;
  }

  setFieldSearchResultStates(results: FieldSearchResultState[]): void {
    this.fieldSearchResultStates = results;
  }

  setResponseMetadata(
    value: GroupedFieldSearchResponseMetadata | undefined,
  ): void {
    this.responseMetadata = value;
  }

  setPage(value: number): void {
    this.page = value;
  }

  setItemsPerPage(value: number): void {
    this.itemsPerPage = value;
    this.page = 1;
  }

  setErrorMessage(value: string | undefined): void {
    this.errorMessage = value;
  }

  toggleProductType(productType: DataProductTypeFilter): void {
    const wasSelected = this.selectedProductTypes.has(productType);
    if (wasSelected) {
      this.selectedProductTypes.delete(productType);
    } else {
      this.selectedProductTypes.add(productType);
    }
    this.page = 1;
    LegendMarketplaceTelemetryHelper.logEvent_ApplySearchFilter(
      this.marketplaceBaseStore.applicationStore.telemetryService,
      'dataProductType',
      productType,
      wasSelected ? 'deselect' : 'select',
      this.searchQuery,
    );
  }

  clearAllFilters(): void {
    this.selectedProductTypes.clear();
    this.page = 1;
    LegendMarketplaceTelemetryHelper.logEvent_ClearSearchFilters(
      this.marketplaceBaseStore.applicationStore.telemetryService,
      this.searchQuery,
    );
  }

  toggleExpandRow(rowId: string): void {
    if (this.expandedRows.has(rowId)) {
      this.expandedRows.delete(rowId);
    } else {
      this.expandedRows.add(rowId);
    }
  }

  clearExpandedRows(): void {
    this.expandedRows.clear();
  }

  isRowExpanded(rowId: string): boolean {
    return this.expandedRows.has(rowId);
  }

  get fieldSearchRequest(): FieldSearchRequest | undefined {
    if (!isNonEmptyString(this.searchQuery)) {
      return undefined;
    }
    return {
      query: this.searchQuery,
      searchType: FieldSearchType.HYBRID,
      pageSize: this.itemsPerPage,
      pageNumber: this.page,
      ...(this.selectedProductTypes.size > 0
        ? { dataProductTypes: Array.from(this.selectedProductTypes) }
        : {}),
    };
  }

  get tableRows(): FieldSearchResultState[] {
    return this.fieldSearchResultStates;
  }

  get totalItems(): number {
    return this.responseMetadata?.total_count ?? 0;
  }

  get totalFieldMatches(): number {
    return this.responseMetadata?.total_field_matches ?? 0;
  }

  get lakehouseCount(): number {
    return this.responseMetadata?.lakehouse_count ?? 0;
  }

  get legacyCount(): number {
    return this.responseMetadata?.legacy_count ?? 0;
  }

  get hasActiveFilters(): boolean {
    return this.selectedProductTypes.size > 0;
  }

  get isLoading(): boolean {
    return (
      isNonEmptyString(this.searchQuery) &&
      (this.loadState.isInInitialState || this.loadState.isInProgress)
    );
  }

  get hasFailed(): boolean {
    return this.loadState.hasFailed;
  }

  *executeSearch(): GeneratorFn<void> {
    yield* this.fetchFieldSearchResultsInternal();
  }

  *changePageAndFetch(page: number): GeneratorFn<void> {
    this.setPage(page);
    yield* this.fetchFieldSearchResultsInternal();
  }

  *changeItemsPerPageAndFetch(itemsPerPage: number): GeneratorFn<void> {
    this.setItemsPerPage(itemsPerPage);
    yield* this.fetchFieldSearchResultsInternal();
  }

  *toggleProductTypeAndFetch(
    productType: DataProductTypeFilter,
  ): GeneratorFn<void> {
    this.toggleProductType(productType);
    yield* this.fetchFieldSearchResultsInternal();
  }

  *clearAllFiltersAndFetch(): GeneratorFn<void> {
    this.clearAllFilters();
    yield* this.fetchFieldSearchResultsInternal();
  }

  private *fetchFieldSearchResultsInternal(): GeneratorFn<void> {
    const request = this.fieldSearchRequest;
    const fetchToken = ++this._currentFetchToken;

    if (!request) {
      this.setFieldSearchResultStates([]);
      this.setResponseMetadata(undefined);
      this.setErrorMessage(undefined);
      this.clearExpandedRows();
      this.loadState.complete();
      return;
    }

    this._abortController?.abort();
    this._abortController = new AbortController();
    const { signal } = this._abortController;

    this.loadState.inProgress();
    this.setErrorMessage(undefined);
    this.clearExpandedRows();

    try {
      const rawResponse =
        (yield this.marketplaceBaseStore.marketplaceServerClient.fieldSearch(
          this.marketplaceBaseStore.envState.lakehouseEnvironment,
          request,
          signal,
        )) as PlainObject<GroupedFieldSearchResponse>;

      if (fetchToken !== this._currentFetchToken) {
        return;
      }

      const response =
        GroupedFieldSearchResponse.serialization.fromJson(rawResponse);
      const results = response.results.map(
        (entry) => new FieldSearchResultState(entry),
      );

      this.setFieldSearchResultStates(results);
      this.setResponseMetadata(response.metadata);
      this.loadState.complete();
    } catch (error: unknown) {
      if (fetchToken !== this._currentFetchToken) {
        return;
      }

      assertErrorThrown(error);
      this.marketplaceBaseStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_MARKETPLACE_APP_EVENT.FIELD_SEARCH_FAILURE),
        error,
      );
      this.marketplaceBaseStore.applicationStore.notificationService.notifyError(
        `Error fetching field search results: ${error.message}`,
      );
      this.setFieldSearchResultStates([]);
      this.setResponseMetadata(undefined);
      this.setErrorMessage(error.message);
      this.loadState.fail();
    }
  }

  dispose(): void {
    this._abortController?.abort();
    this._abortController = undefined;
  }
}
