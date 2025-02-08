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
  type LightPersistentDataCube,
  QuerySearchSpecification,
  QuerySearchSortBy,
  type V1_PureGraphManager,
} from '@finos/legend-graph';
import { ActionState, assertErrorThrown, LogEvent } from '@finos/legend-shared';
import { makeObservable, observable, action } from 'mobx';
import type { LegendDataCubeBuilderStore } from './LegendDataCubeBuilderStore.js';
import { LegendDataCubeUserDataKey } from '../../__lib__/LegendDataCubeUserData.js';
import {
  type DataCubeAlertService,
  DEFAULT_TOOL_PANEL_WINDOW_CONFIG,
  type DisplayState,
} from '@finos/legend-data-cube';
import { LegendDataCubeLoader } from '../../components/builder/LegendDataCubeLoader.js';
import { generateBuilderRoute } from '../../__lib__/LegendDataCubeNavigation.js';

export const DATA_CUBE_LOADER_TYPEAHEAD_SEARCH_LIMIT = 50;
export const DATA_CUBE_LOADER_DEFAULT_SEARCH_LIMIT = 10;

export enum DataCubeSortByType {
  LAST_CREATED = 'Last Created',
  LAST_VIEWED = 'Last Viewed',
  LAST_UPDATED = 'Last Updated',
}

export class LegendDataCubeLoaderState {
  private readonly _application: GenericLegendApplicationStore;
  private readonly _store: LegendDataCubeBuilderStore;
  private readonly _graphManager: V1_PureGraphManager;
  private readonly _alertService: DataCubeAlertService;

  readonly display: DisplayState;
  readonly searchState = ActionState.create();
  readonly finalizeState = ActionState.create();

  searchResults: LightPersistentDataCube[] = [];
  selectedResult?: LightPersistentDataCube | undefined;

  searchText = '';
  showCurrentUserResultsOnly = false;
  showingDefaultResults = true;
  sortBy = DataCubeSortByType.LAST_VIEWED;

  constructor(store: LegendDataCubeBuilderStore) {
    makeObservable(this, {
      showingDefaultResults: observable,
      setShowingDefaultResults: action,

      searchText: observable,
      setSearchText: action,

      searchResults: observable,
      setSearchResults: action,

      selectedResult: observable,
      setSelectedResult: action,

      showCurrentUserResultsOnly: observable,
      setShowCurrentUserResultsOnly: action,

      sortBy: observable,
      setSortBy: action,
    });

    this._application = store.application;
    this._store = store;
    this._graphManager = store.graphManager;
    this._alertService = store.alertService;

    this.display = store.layoutService.newDisplay(
      'Load DataCube',
      () => <LegendDataCubeLoader />,
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

  setSearchResults(results: LightPersistentDataCube[]) {
    this.searchResults = results;
  }

  setSelectedResult(result: LightPersistentDataCube | undefined) {
    this.selectedResult = result;
  }

  setShowingDefaultResults(val: boolean) {
    this.showingDefaultResults = val;
  }

  setShowCurrentUserResultsOnly(val: boolean): void {
    this.showCurrentUserResultsOnly = val;
  }

  setSortBy(val: DataCubeSortByType) {
    this.sortBy = val;
  }

  private getSearchSortBy(sortByValue: string) {
    switch (sortByValue) {
      case DataCubeSortByType.LAST_CREATED:
        return QuerySearchSortBy.SORT_BY_CREATE;
      case DataCubeSortByType.LAST_UPDATED:
        return QuerySearchSortBy.SORT_BY_UPDATE;
      case DataCubeSortByType.LAST_VIEWED:
        return QuerySearchSortBy.SORT_BY_VIEW;
      default:
        return undefined;
    }
  }

  canPerformAdvancedSearch(searchText: string) {
    return !(
      searchText.length < DEFAULT_TYPEAHEAD_SEARCH_MINIMUM_SEARCH_LENGTH &&
      !this.showCurrentUserResultsOnly
    );
  }

  async searchDataCubes(searchText: string) {
    // for the initial search, i.e. no search config is specified, fetch the default entries if possible
    if (!this.canPerformAdvancedSearch(searchText)) {
      if (!searchText) {
        this.setShowingDefaultResults(true);
        this.searchState.inProgress();
        this.setSearchResults([]);
        let defaultResults: LightPersistentDataCube[] = [];
        try {
          // first, try to fetch recently viewed entries
          try {
            const recentlyViewedDataCubeIDs =
              this._store.getRecentlyViewedDataCubes();
            if (recentlyViewedDataCubeIDs.length) {
              defaultResults = await this._graphManager.getDataCubes(
                recentlyViewedDataCubeIDs,
              );
            }
          } catch (error) {
            assertErrorThrown(error);
            // if there's an error fetching recently viewed entries, most likely because
            // some entries have been removed, just remove them all from the cached user data
            this._application.userDataService.persistValue(
              LegendDataCubeUserDataKey.RECENTLY_VIEWED_DATA_CUBES,
              undefined,
            );
          }
          // if there's no recently viewed entries, just fetch entries of the current user
          if (!defaultResults.length) {
            const searchSpecification = new QuerySearchSpecification();
            searchSpecification.limit = DATA_CUBE_LOADER_DEFAULT_SEARCH_LIMIT;
            searchSpecification.showCurrentUserQueriesOnly = true;
            defaultResults =
              await this._graphManager.searchDataCubes(searchSpecification);
          }
          this.setSearchResults(defaultResults);
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

    this.setShowingDefaultResults(false);
    this.searchState.inProgress();

    try {
      const searchSpecification =
        QuerySearchSpecification.createDefault(searchText);
      searchSpecification.limit = DATA_CUBE_LOADER_TYPEAHEAD_SEARCH_LIMIT + 1;
      searchSpecification.showCurrentUserQueriesOnly =
        this.showCurrentUserResultsOnly;
      const searchSortBy = this.getSearchSortBy(this.sortBy);
      if (searchSortBy) {
        searchSpecification.sortByOption = searchSortBy;
      }
      this.setSearchResults(
        await this._graphManager.searchDataCubes(searchSpecification),
      );

      // if sorting is not configured, sort by name
      if (!searchSortBy) {
        this.setSearchResults(
          this.searchResults.toSorted((a, b) => a.name.localeCompare(b.name)),
        );
      }

      this.searchState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this._alertService.alertError(error, {
        message: `DataCube Search Failure: ${error.message}`,
      });
      this.searchState.fail();
    }
  }

  async finalize() {
    if (!this.selectedResult) {
      return;
    }

    this.finalizeState.inProgress();
    try {
      // just simply change the route here and the new DataCube ID will get picked up
      // and handled by the builder to load the new DataCube.
      this._application.navigationService.navigator.updateCurrentLocation(
        generateBuilderRoute(this.selectedResult.id),
      );

      // reset
      this.setSelectedResult(undefined);
      this.display.close();
      this.finalizeState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this._alertService.alertError(error, {
        message: `DataCube Load Failure: ${error.message}`,
      });
      this.finalizeState.fail();
    }
  }
}
