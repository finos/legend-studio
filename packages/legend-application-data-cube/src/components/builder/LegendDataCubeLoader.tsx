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
import {
  cn,
  DataCubeIcon,
  DropdownMenu,
  DropdownMenuItem,
  useDropdownMenu,
} from '@finos/legend-art';
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
import { useApplicationStore } from '@finos/legend-application';

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
      <div className="p-2">
        <div className="relative flex h-6 w-full items-center justify-between">
          <FormTextInput
            ref={searchInputRef}
            className={cn('h-6 w-full pl-6 pr-1', {
              'pr-6': Boolean(state.searchText),
            })}
            onChange={onSearchTextChange}
            value={state.searchText}
            placeholder="Search for DataCube(s) by name or ID"
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
            <div className="flex h-5 w-[calc(100%_-_40px)] overflow-x-auto">
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
      <div className="h-[calc(100%_-_75px)]">
        <div className="h-full overflow-y-auto">
          {state.searchState.hasCompleted && (
            <>
              <div className="mb-1 flex h-5 w-full items-center px-2 text-sm text-neutral-600">
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
                    className="mx-2 mb-0.5 flex h-[42px] w-[calc(100%_-_16px)] cursor-pointer border border-neutral-200 bg-neutral-100 hover:bg-neutral-200"
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
  const application = useApplicationStore();
  const state = store.loader;
  const selectedResult = state.selectedResult;
  const [openManageDropdown, closeManageDropdown, manageDropdownProps] =
    useDropdownMenu();

  return (
    <>
      <div className="h-[calc(100%_-_40px)] w-full px-2 pt-2">
        <div className="h-full w-full overflow-auto border border-neutral-300 bg-white">
          {!selectedResult ? (
            <LegendDataCubeSearcher />
          ) : (
            <div className="h-full w-full p-2">
              <div className="relative mb-0.5 flex h-[42px] w-full border border-neutral-200 bg-neutral-100">
                <div className="w-full">
                  <div className="h-6 w-4/5 overflow-hidden text-ellipsis whitespace-nowrap px-1.5 leading-6">
                    {selectedResult.name}
                  </div>
                  <button
                    className="absolute right-0.5 top-0.5 flex aspect-square w-5 items-center justify-center text-neutral-500"
                    title="Copy ID to clipboard"
                    onClick={() => {
                      application.clipboardService
                        .copyTextToClipboard(selectedResult.id)
                        .catch((error) =>
                          store.alertService.alertUnhandledError(error),
                        );
                    }}
                  >
                    <DataCubeIcon.Clipboard />
                  </button>
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

              <div className="mt-2 flex justify-between">
                <FormButton
                  className="flex items-center pl-1"
                  onClick={() => state.setSelectedResult(undefined)}
                >
                  <DataCubeIcon.ChevronLeft className="mr-0.5" />
                  Go Back
                </FormButton>

                {store.canCurrentUserManageDataCube(selectedResult) && (
                  <>
                    <FormButton
                      className="flex w-[138px] items-center justify-start px-0"
                      onClick={openManageDropdown}
                    >
                      <div className="px-2.5">Manage DataCube</div>
                      <div className="flex h-4 w-4 items-center justify-center border-l border-neutral-400">
                        <DataCubeIcon.CaretDown className="text-sm" />
                      </div>
                    </FormButton>
                    <DropdownMenu
                      {...manageDropdownProps}
                      menuProps={{
                        classes: {
                          paper: 'rounded-none mt-[1px]',
                          list: 'w-[138px] p-0 rounded-none border border-neutral-400 bg-white max-h-40 overflow-y-auto py-0.5',
                        },
                      }}
                    >
                      <DropdownMenuItem
                        className="flex h-[22px] w-full items-center px-2.5 text-base hover:bg-neutral-100 focus:bg-neutral-100"
                        onClick={() => {
                          store.setDataCubeToDelete(selectedResult);
                          store.deleteConfirmationDisplay.open();
                          closeManageDropdown();
                        }}
                      >
                        Delete...
                      </DropdownMenuItem>
                    </DropdownMenu>
                  </>
                )}
              </div>
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
