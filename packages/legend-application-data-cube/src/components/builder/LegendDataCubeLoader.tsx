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

import { observer } from 'mobx-react-lite';
import { cn, DataCubeIcon, useDropdownMenu } from '@finos/legend-art';
import {
  debounce,
  formatDistanceToNow,
  quantifyList,
} from '@finos/legend-shared';
import { useRef, useMemo, useEffect } from 'react';
import {
  FormButton,
  FormCheckbox,
  FormDropdownMenu,
  FormDropdownMenuItem,
  FormDropdownMenuTrigger,
  FormTextInput,
} from '@finos/legend-data-cube';
import { useLegendDataCubeBuilderStore } from './LegendDataCubeBuilderStoreProvider.js';
import {
  DATA_CUBE_LOADER_TYPEAHEAD_SEARCH_LIMIT,
  DataCubeSortByType,
} from '../../stores/builder/LegendDataCubeLoaderState.js';

const LegendDataCubeSearcher = observer(() => {
  const store = useLegendDataCubeBuilderStore();
  const state = store.loader;

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResults = state.searchResults;

  useEffect(() => {
    searchInputRef.current?.focus();
  }, [state]);

  // search text
  const debouncedLoader = useMemo(
    () =>
      debounce((input: string) => {
        state
          .searchDataCubes(input)
          .catch((error) => store.alertService.alertUnhandledError(error));
      }, 500),
    [store, state],
  );
  const onSearchTextChange: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => {
    if (event.target.value !== state.searchText) {
      state.setSearchText(event.target.value);
      debouncedLoader.cancel();
      debouncedLoader(event.target.value);
    }
  };
  const clearSearches = () => {
    state.setSearchText('');
    debouncedLoader.cancel();
    debouncedLoader('');
  };

  // filter and sort
  const toggleShowCurrentUserResultsOnly = () => {
    state.setShowCurrentUserResultsOnly(!state.showCurrentUserResultsOnly);
    debouncedLoader.cancel();
    debouncedLoader(state.searchText);
  };

  const [
    openSortDropdown,
    closeSortDropdown,
    sortDropdownProps,
    sortDropdownPropsOpen,
  ] = useDropdownMenu();
  const applySort = (value: DataCubeSortByType) => {
    state.setSortBy(value);
    debouncedLoader.cancel();
    debouncedLoader(state.searchText);
  };

  useEffect(() => {
    state
      .searchDataCubes('')
      .catch((error) => store.alertService.alertUnhandledError(error));
  }, [store, state]);

  return (
    <div className="h-full">
      <div className="p-1.5">
        <div className="relative flex h-6 w-full items-center justify-between">
          <FormTextInput
            ref={searchInputRef}
            className={cn('h-6 w-full pl-6 pr-1', {
              'pr-6': Boolean(state.searchText),
            })}
            onChange={onSearchTextChange}
            value={state.searchText}
            placeholder="Search for DataCubes by name or ID"
          />
          <div className="absolute flex aspect-square h-full items-center justify-center">
            <DataCubeIcon.Search className="text-lg text-neutral-600" />
          </div>
          {Boolean(state.searchText) && (
            <>
              <button
                className="absolute right-0 flex aspect-square h-full items-center justify-center"
                tabIndex={-1}
                onClick={clearSearches}
                title="Clear"
              >
                <DataCubeIcon.X />
              </button>
            </>
          )}
        </div>
        <div className="mt-1 flex h-6 w-full items-center">
          <div className="flex w-[calc(100%_-_128px)] items-center">
            <div className="w-10 text-sm">Filters:</div>
            <div className="flex h-6 w-[calc(100%_-_40px)] overflow-x-auto">
              <FormCheckbox
                label="Mine Only"
                checked={state.showCurrentUserResultsOnly}
                onChange={toggleShowCurrentUserResultsOnly}
              />
            </div>
          </div>

          <div>
            <FormDropdownMenuTrigger
              className="w-32"
              onClick={openSortDropdown}
              open={sortDropdownPropsOpen}
              disabled={!state.canPerformAdvancedSearch(state.searchText)}
            >
              Sort by: {state.sortBy}
            </FormDropdownMenuTrigger>
            <FormDropdownMenu className="w-32" {...sortDropdownProps}>
              {Object.values(DataCubeSortByType).map((option) => (
                <FormDropdownMenuItem
                  key={option}
                  onClick={() => {
                    applySort(option);
                    closeSortDropdown();
                  }}
                  autoFocus={option === state.sortBy}
                >
                  {option}
                </FormDropdownMenuItem>
              ))}
            </FormDropdownMenu>
          </div>
        </div>
      </div>
      <div className="mx-1.5 mb-1 h-[1px] bg-neutral-200" />
      <div className="h-[calc(100%_-_71px)]">
        <div className="h-full overflow-y-auto">
          {state.searchState.hasCompleted && (
            <>
              <div className="mb-1 flex h-5 w-full items-center px-1.5 text-sm text-neutral-600">
                {state.showingDefaultResults ? (
                  `Refine your search to get better matches`
                ) : searchResults.length >=
                  DATA_CUBE_LOADER_TYPEAHEAD_SEARCH_LIMIT ? (
                  <>
                    {`Found ${DATA_CUBE_LOADER_TYPEAHEAD_SEARCH_LIMIT}+ matches`}{' '}
                    <DataCubeIcon.AlertInfo
                      className="ml-1 text-lg"
                      title="Some DataCubes are not listed, refine your search to get better matches"
                    />
                  </>
                ) : (
                  `Found ${quantifyList(searchResults, 'match', 'matches')}`
                )}
              </div>
              {searchResults
                .slice(0, DATA_CUBE_LOADER_TYPEAHEAD_SEARCH_LIMIT)
                .map((result, idx) => (
                  <div
                    className="mx-1.5 mb-0.5 flex h-[42px] w-[calc(100%_-_12px)] cursor-pointer border border-neutral-200 bg-neutral-100 hover:bg-neutral-200"
                    key={result.id}
                    title="Click to choose DataCube"
                    onClick={() => state.setSelectedResult(result)}
                  >
                    <div className="w-[calc(100%_-_16px)]">
                      <div className="h-6 w-4/5 overflow-hidden text-ellipsis whitespace-nowrap px-1.5 leading-6">
                        {result.name}
                      </div>
                      <div className="flex h-[18px] items-start justify-between px-1.5">
                        <div className="flex">
                          <DataCubeIcon.ClockEdit className="text-sm text-neutral-500" />
                          <div className="ml-1 text-sm text-neutral-500">
                            {result.lastUpdatedAt
                              ? formatDistanceToNow(
                                  new Date(result.lastUpdatedAt),
                                  {
                                    includeSeconds: true,
                                    addSuffix: true,
                                  },
                                )
                              : '(unknown)'}
                          </div>
                        </div>
                        <div className="flex">
                          <DataCubeIcon.User className="text-sm text-neutral-500" />
                          <div className="ml-1 text-sm text-neutral-500">
                            {result.owner}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex h-full w-4 items-center justify-center">
                      <DataCubeIcon.ChevronRight className="text-neutral-600" />
                    </div>
                  </div>
                ))}
            </>
          )}
          {!state.searchState.hasCompleted && (
            <div className="mb-1 flex h-5 w-full items-center px-1.5 text-sm text-neutral-600">
              <DataCubeIcon.Loader className="animate-spin stroke-2 text-lg" />
              <span className="ml-1">Searching...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export const LegendDataCubeLoader = observer(() => {
  const store = useLegendDataCubeBuilderStore();
  const state = store.loader;
  const selectedResult = state.selectedResult;

  return (
    <>
      <div className="h-[calc(100%_-_40px)] w-full px-2 pt-2">
        <div className="h-full w-full overflow-auto border border-neutral-300 bg-white">
          {!selectedResult ? (
            <LegendDataCubeSearcher />
          ) : (
            <div className="h-full w-full p-1.5">
              <div className="mb-0.5 flex h-[42px] w-full border border-neutral-200 bg-neutral-100">
                <div className="w-full">
                  <div className="h-6 w-4/5 overflow-hidden text-ellipsis whitespace-nowrap px-1.5 leading-6">
                    {selectedResult.name}
                  </div>
                  <div className="flex h-[18px] items-start justify-between px-1.5">
                    <div className="flex">
                      <DataCubeIcon.ClockEdit className="text-sm text-neutral-500" />
                      <div className="ml-1 text-sm text-neutral-500">
                        {selectedResult.lastUpdatedAt
                          ? formatDistanceToNow(
                              new Date(selectedResult.lastUpdatedAt),
                              {
                                includeSeconds: true,
                                addSuffix: true,
                              },
                            )
                          : '(unknown)'}
                      </div>
                    </div>
                    <div className="flex">
                      <DataCubeIcon.User className="text-sm text-neutral-500" />
                      <div className="ml-1 text-sm text-neutral-500">
                        {selectedResult.owner}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <FormButton
                className="mt-1.5"
                onClick={() => state.setSelectedResult(undefined)}
              >
                Select Another DataCube
              </FormButton>
            </div>
          )}
        </div>
      </div>
      <div className="flex h-10 items-center justify-end px-2">
        <FormButton onClick={() => state.display.close()}>Cancel</FormButton>
        <FormButton
          className="ml-2"
          disabled={!selectedResult || state.finalizeState.isInProgress}
          onClick={() => {
            state
              .finalize()
              .catch((error) => store.alertService.alertUnhandledError(error));
          }}
        >
          OK
        </FormButton>
      </div>
    </>
  );
});
