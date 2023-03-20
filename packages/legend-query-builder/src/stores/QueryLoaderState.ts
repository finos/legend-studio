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
  DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH,
  DEFAULT_TYPEAHEAD_SEARCH_LIMIT,
  type GenericLegendApplicationStore,
} from '@finos/legend-application';
import {
  type LightQuery,
  QuerySearchSpecification,
  type AbstractPureGraphManager,
  type QueryProjectCoordinates,
  V1_PureGraphManager,
  type Query,
  type QueryInfo,
} from '@finos/legend-graph';
import {
  ActionState,
  type GeneratorFn,
  assertErrorThrown,
  guaranteeType,
  deleteEntry,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { makeObservable, observable, action, flow, flowResult } from 'mobx';
import type { QueryBuilderState } from './QueryBuilderState.js';
import type {
  LoadQueryFilterOption,
  QueryBuilder_LegendApplicationPlugin_Extension,
} from './QueryBuilder_LegendApplicationPlugin_Extension.js';

export class QueryLoaderState {
  readonly applicationStore: GenericLegendApplicationStore;
  readonly loadQueriesState = ActionState.create();
  queries: LightQuery[] = [];
  isQueryLoaderOpen = false;
  searchText = '';
  showCurrentUserQueriesOnly = false;
  showPreviewViewer = false;
  queryPreviewContent?: QueryInfo;
  extraFilters = new Map<string, boolean>();
  extraFilterOptions: LoadQueryFilterOption[] = [];
  searchSpecificationProjectCoordinates?: QueryProjectCoordinates[];
  currentUserId: string | undefined;
  queryBuilderState?: QueryBuilderState | undefined;
  intialQueries: string[];
  onDeleteQuery?:
    | ((
        intialQueries: string[],
        idx: number,
        applicationStore: GenericLegendApplicationStore,
      ) => void)
    | undefined;
  onLoadQuery?:
    | ((
        intialQueries: string[],
        val: LightQuery | Query,
        applicationStore: GenericLegendApplicationStore,
      ) => void)
    | undefined;

  constructor(
    applicationStore: GenericLegendApplicationStore,
    intialQueries?: string[],
    onLoadQuery?: (
      intialQueries: string[],
      val: LightQuery | Query,
      applicationStore: GenericLegendApplicationStore,
    ) => void,
    onDeleteQuery?: (
      intialQueries: string[],
      idx: number,
      applicationStore: GenericLegendApplicationStore,
    ) => void,
  ) {
    makeObservable(this, {
      isQueryLoaderOpen: observable,
      queryPreviewContent: observable,
      queries: observable,
      showCurrentUserQueriesOnly: observable,
      showPreviewViewer: observable,
      searchText: observable,
      setSearchText: action,
      setIsQueryLoaderOpen: action,
      setQueries: action,
      deleteQuery: action,
      setShowCurrentUserQueriesOnly: action,
      setShowPreviewViewer: action,
      loadQueries: flow,
      getPreviewQueryContent: flow,
      initializeWithCustomQueries: flow,
      initialize: flow,
    });
    this.applicationStore = applicationStore;
    this.intialQueries = intialQueries ?? [];
    this.onDeleteQuery = onDeleteQuery;
    this.onLoadQuery = onLoadQuery;
  }

  setSearchText(val: string): void {
    this.searchText = val;
  }

  setIsQueryLoaderOpen(val: boolean): void {
    this.isQueryLoaderOpen = val;
  }

  setQueries(val: LightQuery[]): void {
    this.queries = val;
  }

  setShowPreviewViewer(val: boolean): void {
    this.showPreviewViewer = val;
  }

  setShowCurrentUserQueriesOnly(val: boolean): void {
    this.showCurrentUserQueriesOnly = val;
  }

  deleteQuery(query: LightQuery): void {
    deleteEntry(this.queries, query);
  }

  *getPreviewQueryContent(
    queryId: string,
    graphManager: AbstractPureGraphManager,
  ): GeneratorFn<void> {
    const queryInfo = (yield graphManager.getQueryInfo(queryId)) as QueryInfo;
    this.queryPreviewContent = queryInfo;
    this.queryPreviewContent.content = (yield graphManager.prettyLambdaContent(
      queryInfo.content,
    )) as string;
  }

  *initialize(queryBuilderState: QueryBuilderState): GeneratorFn<void> {
    if (!this.currentUserId) {
      this.currentUserId = (yield flowResult(
        guaranteeType(
          queryBuilderState.graphManagerState.graphManager,
          V1_PureGraphManager,
        )
          .engine.getEngineServerClient()
          .getCurrentUserId(),
      )) as string;
    }
    this.queryBuilderState = queryBuilderState;
    this.extraFilterOptions = this.applicationStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as QueryBuilder_LegendApplicationPlugin_Extension
          ).getExtraLoadQueryFilterOptions?.() ?? [],
      );
    const extraFilters = this.extraFilterOptions.map((filterOption) =>
      filterOption.label(guaranteeNonNullable(this.queryBuilderState)),
    );
    extraFilters.forEach(
      (filter) => filter && this.extraFilters.set(filter, false),
    );
  }

  /**
   * Whenever user tries to open the query loader we try to load the queryIds
   * stored in the local cache and list of queries which are relevant to the
   * workflow where query loader is getting used.
   */
  *initializeWithCustomQueries(
    graphManager: AbstractPureGraphManager,
    includeDefaultQueries?: boolean | undefined,
  ): GeneratorFn<void> {
    this.loadQueriesState.inProgress();
    this.queries = [];
    try {
      for (const [idx, queryId] of this.intialQueries.entries()) {
        let lightQuery;
        try {
          lightQuery = (yield flowResult(
            graphManager.getLightQuery(queryId),
          )) as LightQuery;
        } catch (error) {
          assertErrorThrown(error);
          // do nothing
        }
        if (lightQuery) {
          this.queries.push(lightQuery);
        } else {
          this.onDeleteQuery?.(this.intialQueries, idx, this.applicationStore);
        }
      }
      if (includeDefaultQueries) {
        const searchSpecification = new QuerySearchSpecification();
        searchSpecification.limit = DEFAULT_TYPEAHEAD_SEARCH_LIMIT;
        searchSpecification.projectCoordinates =
          this.searchSpecificationProjectCoordinates ?? [];
        const queries = (yield graphManager.searchQueries(
          searchSpecification,
        )) as LightQuery[];
        queries.forEach((query) => {
          if (!this.queries.find((q) => q.id === query.id)) {
            this.queries.push(query);
          }
        });
      }
      this.loadQueriesState.pass();
    } catch (error) {
      this.loadQueriesState.fail();
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(error);
    }
  }

  *loadQueries(
    searchText: string,
    graphManager: AbstractPureGraphManager,
    includeDefaultQueries?: boolean | undefined,
  ): GeneratorFn<void> {
    if (!this.currentUserId) {
      this.currentUserId = (yield flowResult(
        guaranteeType(graphManager, V1_PureGraphManager)
          .engine.getEngineServerClient()
          .getCurrentUserId(),
      )) as string;
    }
    if (
      !searchText &&
      !this.showCurrentUserQueriesOnly &&
      Array.from(this.extraFilters.values()).every((value) => value === false)
    ) {
      this.initializeWithCustomQueries(graphManager, includeDefaultQueries);
    } else {
      if (
        searchText.length < DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH &&
        !this.showCurrentUserQueriesOnly &&
        Array.from(this.extraFilters.values()).every((value) => value === false)
      ) {
        return;
      }
      this.loadQueriesState.inProgress();
      try {
        let searchSpecification = new QuerySearchSpecification();
        searchSpecification.searchTerm = searchText;
        searchSpecification.limit = DEFAULT_TYPEAHEAD_SEARCH_LIMIT;
        searchSpecification.showCurrentUserQueriesOnly =
          this.showCurrentUserQueriesOnly;
        if (this.queryBuilderState) {
          Array.from(this.extraFilters.entries()).forEach(([key, value]) => {
            if (value) {
              const filterOption = this.extraFilterOptions.find(
                (option) =>
                  option.label(guaranteeNonNullable(this.queryBuilderState)) ===
                  key,
              );
              if (filterOption) {
                searchSpecification = filterOption.filterFunction(
                  searchSpecification,
                  guaranteeNonNullable(this.queryBuilderState),
                );
              }
            }
          });
        }
        searchSpecification.projectCoordinates =
          this.searchSpecificationProjectCoordinates ?? [];
        this.queries = (yield graphManager.searchQueries(
          searchSpecification,
        )) as LightQuery[];
        this.loadQueriesState.pass();
      } catch (error) {
        this.loadQueriesState.fail();
        assertErrorThrown(error);
        this.applicationStore.notificationService.notifyError(error);
      }
    }
  }

  reset(): void {
    this.setShowCurrentUserQueriesOnly(false);
  }
}
