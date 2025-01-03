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
  APPLICATION_EVENT,
  DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH,
  type GenericLegendApplicationStore,
} from '@finos/legend-application';
import {
  type LightPersistentDataCubeQuery,
  QuerySearchSpecification,
  QuerySearchSortBy,
  type V1_PureGraphManager,
} from '@finos/legend-graph';
import { ActionState, assertErrorThrown, LogEvent } from '@finos/legend-shared';
import { makeObservable, observable, action } from 'mobx';
import type { LegendDataCubeQueryBuilderStore } from './LegendDataCubeQueryBuilderStore.js';
import { LegendDataCubeUserDataKey } from '../../__lib__/LegendDataCubeUserData.js';
import {
  type DataCubeAlertService,
  DEFAULT_TOOL_PANEL_WINDOW_CONFIG,
  type DisplayState,
} from '@finos/legend-data-cube';
import { LegendDataCubeQueryLoader } from '../../components/query-builder/LegendDataCubeQueryLoader.js';
import { generateQueryBuilderRoute } from '../../__lib__/LegendDataCubeNavigation.js';

export const DATA_CUBE_QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT = 50;
export const DATA_CUBE_QUERY_LOADER_DEFAULT_QUERY_SEARCH_LIMIT = 10;

export enum DataCubeQuerySortByType {
  LAST_CREATED = 'Last Created',
  LAST_VIEWED = 'Last Viewed',
  LAST_UPDATED = 'Last Updated',
}

export class LegendDataCubeQueryLoaderState {
  private readonly _application: GenericLegendApplicationStore;
  private readonly _store: LegendDataCubeQueryBuilderStore;
  private readonly _graphManager: V1_PureGraphManager;
  private readonly _alertService: DataCubeAlertService;

  readonly display: DisplayState;
  readonly searchState = ActionState.create();
  readonly finalizeState = ActionState.create();

  queries: LightPersistentDataCubeQuery[] = [];
  selectedQuery?: LightPersistentDataCubeQuery | undefined;

  searchText = '';
  showCurrentUserQueriesOnly = false;
  showingDefaultQueries = true;
  sortBy = DataCubeQuerySortByType.LAST_VIEWED;

  constructor(store: LegendDataCubeQueryBuilderStore) {
    makeObservable(this, {
      showingDefaultQueries: observable,
      setShowingDefaultQueries: action,

      searchText: observable,
      setSearchText: action,

      queries: observable,
      setQueries: action,

      showCurrentUserQueriesOnly: observable,
      setShowCurrentUserQueriesOnly: action,

      sortBy: observable,
      setSortBy: action,

      selectedQuery: observable,
      setSelectedQuery: action,
    });

    this._application = store.application;
    this._store = store;
    this._graphManager = store.graphManager;
    this._alertService = store.alertService;

    this.display = store.layoutService.newDisplay(
      'Load Query',
      () => <LegendDataCubeQueryLoader />,
      {
        ...DEFAULT_TOOL_PANEL_WINDOW_CONFIG,
        width: 500,
        minWidth: 500,
      },
    );
  }

  setSearchText(val: string) {
    this.searchText = val;
  }

  setQueries(val: LightPersistentDataCubeQuery[]) {
    this.queries = val;
  }

  setShowingDefaultQueries(val: boolean) {
    this.showingDefaultQueries = val;
  }

  setShowCurrentUserQueriesOnly(val: boolean): void {
    this.showCurrentUserQueriesOnly = val;
  }

  setSortBy(val: DataCubeQuerySortByType) {
    this.sortBy = val;
  }

  private getQuerySearchSortBy(sortByValue: string) {
    switch (sortByValue) {
      case DataCubeQuerySortByType.LAST_CREATED:
        return QuerySearchSortBy.SORT_BY_CREATE;
      case DataCubeQuerySortByType.LAST_UPDATED:
        return QuerySearchSortBy.SORT_BY_UPDATE;
      case DataCubeQuerySortByType.LAST_VIEWED:
        return QuerySearchSortBy.SORT_BY_VIEW;
      default:
        return undefined;
    }
  }

  setSelectedQuery(query: LightPersistentDataCubeQuery | undefined) {
    this.selectedQuery = query;
  }

  canPerformAdvancedSearch(searchText: string) {
    return !(
      searchText.length < DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH &&
      !this.showCurrentUserQueriesOnly
    );
  }

  async searchQueries(searchText: string) {
    // for the initial search, i.e. no search config is specified, fetch the default queries if possible
    if (!this.canPerformAdvancedSearch(searchText)) {
      if (!searchText) {
        this.setShowingDefaultQueries(true);
        this.searchState.inProgress();
        this.setQueries([]);
        let defaultQueries: LightPersistentDataCubeQuery[] = [];
        try {
          // first, try to fetch recently viewed queries
          try {
            const recentlyViewedQueryIDs =
              this._store.getRecentlyViewedQueries();
            if (recentlyViewedQueryIDs.length) {
              defaultQueries = await this._graphManager.getDataCubeQueries(
                recentlyViewedQueryIDs,
              );
            }
          } catch (error) {
            assertErrorThrown(error);
            // if there's an error fetching recently viewed queries, most likely because
            // some queries have been removed, just remove them all from the cached user data
            this._application.userDataService.persistValue(
              LegendDataCubeUserDataKey.RECENTLY_VIEWED_QUERIES,
              undefined,
            );
          }
          // if there's no recently viewed queries, just fetch queries of the current user
          if (!defaultQueries.length) {
            const searchSpecification = new QuerySearchSpecification();
            searchSpecification.limit =
              DATA_CUBE_QUERY_LOADER_DEFAULT_QUERY_SEARCH_LIMIT;
            searchSpecification.showCurrentUserQueriesOnly = true;
            defaultQueries =
              await this._graphManager.searchDataCubeQueries(
                searchSpecification,
              );
          }
          this.setQueries(defaultQueries);
          this.searchState.pass();
        } catch (error) {
          assertErrorThrown(error);
          this._application.logService.error(
            LogEvent.create(APPLICATION_EVENT.GENERIC_FAILURE),
            error,
          );
          this.searchState.fail();
        }
      }
      return;
    }

    this.setShowingDefaultQueries(false);
    this.searchState.inProgress();

    try {
      const searchSpecification =
        QuerySearchSpecification.createDefault(searchText);
      searchSpecification.limit =
        DATA_CUBE_QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT + 1;
      searchSpecification.showCurrentUserQueriesOnly =
        this.showCurrentUserQueriesOnly;
      const querySearchSortBy = this.getQuerySearchSortBy(this.sortBy);
      if (querySearchSortBy) {
        searchSpecification.sortByOption = querySearchSortBy;
      }
      this.setQueries(
        await this._graphManager.searchDataCubeQueries(searchSpecification),
      );

      // if sorting is not configured, sort by name
      if (!querySearchSortBy) {
        this.setQueries(
          this.queries.toSorted((a, b) => a.name.localeCompare(b.name)),
        );
      }

      this.searchState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this._alertService.alertError(error, {
        message: `Query Search Failure: ${error.message}`,
      });
      this.searchState.fail();
    }
  }

  async finalize() {
    if (!this.selectedQuery) {
      return;
    }

    this.finalizeState.inProgress();
    try {
      // just simply change the route here and the new query ID will get picked up
      // and handled by the query builder to load the new query.
      this._application.navigationService.navigator.updateCurrentLocation(
        generateQueryBuilderRoute(this.selectedQuery.id),
      );

      // reset
      this.setSelectedQuery(undefined);
      this.display.close();
      this.finalizeState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this._alertService.alertError(error, {
        message: `Query Load Failure: ${error.message}`,
      });
      this.finalizeState.fail();
    }
  }
}
