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
  BasicValueSpecificationEditor,
  buildV1PrimitiveValueSpecification,
  QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT,
  SORT_BY_OPTIONS,
  V1_BasicValueSpecificationEditor,
  type QueryLoaderState,
} from '@finos/legend-query-builder';
import type { LegendQueryDataCubeSourceBuilderState } from '../../../stores/builder/source/LegendQueryDataCubeSourceBuilderState.js';
import { generateGAVCoordinates } from '@finos/legend-storage';
import { cn, DataCubeIcon, useDropdownMenu } from '@finos/legend-art';
import {
  debounce,
  formatDistanceToNow,
  guaranteeNonNullable,
  guaranteeType,
  quantifyList,
} from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { useRef, useState, useMemo, useEffect } from 'react';
import {
  FormButton,
  FormCheckbox,
  FormCodeEditor,
  FormDropdownMenu,
  FormDropdownMenuItem,
  FormDropdownMenuTrigger,
  FormTextInput,
} from '@finos/legend-data-cube';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { useLegendDataCubeBuilderStore } from '../LegendDataCubeBuilderStoreProvider.js';
import { useApplicationStore } from '@finos/legend-application';
import {
  CoreModel,
  PureModel,
  SystemModel,
  V1_buildValueSpecification,
  V1_PackageableType,
  V1_ValueSpecification,
  V1_ValueSpecificationBuilder,
  type V1_Variable,
} from '@finos/legend-graph';

const LegendQuerySearcher = observer((props: { state: QueryLoaderState }) => {
  const { state } = props;
  const store = useLegendDataCubeBuilderStore();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchResults = state.queries;

  useEffect(() => {
    searchInputRef.current?.focus();
  }, [state]);

  // search text
  const debouncedLoader = useMemo(
    () =>
      debounce((input: string) => {
        flowResult(state.searchQueries(input)).catch((error) =>
          store.alertService.alertUnhandledError(error),
        );
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
  const [isMineOnly, setIsMineOnly] = useState(false);
  const toggleShowCurrentUserQueriesOnly = () => {
    state.setShowCurrentUserQueriesOnly(!state.showCurrentUserQueriesOnly);
    setIsMineOnly(!isMineOnly);
    debouncedLoader.cancel();
    debouncedLoader(state.searchText);
  };

  const [
    openSortDropdown,
    closeSortDropdown,
    sortDropdownProps,
    sortDropdownPropsOpen,
  ] = useDropdownMenu();
  const applySort = (value: SORT_BY_OPTIONS) => {
    state.setSortBy(value);
    debouncedLoader.cancel();
    debouncedLoader(state.searchText);
  };

  useEffect(() => {
    flowResult(state.searchQueries('')).catch((error) =>
      store.alertService.alertUnhandledError(error),
    );
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
            placeholder="Search for queries by name or ID"
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
                checked={isMineOnly}
                onChange={toggleShowCurrentUserQueriesOnly}
              />
            </div>
            {/* TODO?: support extra filters */}
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
              {Object.values(SORT_BY_OPTIONS).map((option) => (
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
          {state.searchQueriesState.hasCompleted && (
            <>
              <div className="mb-1 flex h-5 w-full items-center px-2 text-sm text-neutral-600">
                {state.showingDefaultQueries ? (
                  (state.generateDefaultQueriesSummaryText?.(searchResults) ??
                  `Refine your search to get better matches`)
                ) : searchResults.length >=
                  QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT ? (
                  <>
                    {`Found ${QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT}+ matches`}{' '}
                    <DataCubeIcon.AlertInfo
                      className="ml-1 text-lg"
                      title="Some queries are not listed, refine your search to get better matches"
                    />
                  </>
                ) : (
                  `Found ${quantifyList(searchResults, 'match', 'matches')}`
                )}
              </div>
              {searchResults
                .slice(0, QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT)
                .map((query, idx) => (
                  <div
                    className="mx-2 mb-0.5 flex h-[42px] w-[calc(100%_-_16px)] cursor-pointer border border-neutral-200 bg-neutral-100 hover:bg-neutral-200"
                    key={query.id}
                    title="Click to choose query"
                    onClick={() => state.loadQuery(query)}
                  >
                    <div className="w-[calc(100%_-_16px)]">
                      <div className="h-6 w-4/5 overflow-hidden text-ellipsis whitespace-nowrap px-1.5 leading-6">
                        {query.name}
                      </div>
                      <div className="flex h-[18px] items-start justify-between px-1.5">
                        <div className="flex">
                          <DataCubeIcon.ClockEdit className="text-sm text-neutral-500" />
                          <div className="ml-1 text-sm text-neutral-500">
                            {query.lastUpdatedAt
                              ? formatDistanceToNow(
                                  new Date(query.lastUpdatedAt),
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
                            {query.owner}
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
          {!state.searchQueriesState.hasCompleted && (
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

export const LegendQueryDataCubeSourceBuilder = observer(
  (props: { sourceBuilder: LegendQueryDataCubeSourceBuilderState }) => {
    const { sourceBuilder } = props;
    const application = useApplicationStore();
    const store = useLegendDataCubeBuilderStore();
    const query = sourceBuilder.query;

    if (!query) {
      return <LegendQuerySearcher state={sourceBuilder.queryLoader} />;
    }
    return (
      <div className="h-full w-full p-2">
        <div className="relative mb-0.5 flex h-[60px] w-full border border-neutral-200 bg-neutral-100">
          <div className="w-full">
            <div className="h-6 w-4/5 overflow-hidden text-ellipsis whitespace-nowrap px-1.5 leading-6">
              {query.name}
            </div>
            <button
              className="absolute right-1 top-1 flex aspect-square w-5 items-center justify-center text-neutral-500"
              title="Copy ID to clipboard"
              onClick={() => {
                application.clipboardService
                  .copyTextToClipboard(query.id)
                  .catch((error) =>
                    store.alertService.alertUnhandledError(error),
                  );
              }}
            >
              <DataCubeIcon.Clipboard />
            </button>
            <div className="flex h-[18px] items-start justify-between px-1.5 text-sm text-neutral-500">
              {`[ ${generateGAVCoordinates(
                query.groupId,
                query.artifactId,
                query.versionId,
              )} ]`}
            </div>
            <div className="flex h-[18px] items-start justify-between px-1.5">
              <div className="flex">
                <DataCubeIcon.ClockEdit className="text-sm text-neutral-500" />
                <div className="ml-1 text-sm text-neutral-500">
                  {query.lastUpdatedAt
                    ? formatDistanceToNow(new Date(query.lastUpdatedAt), {
                        includeSeconds: true,
                        addSuffix: true,
                      })
                    : '(unknown)'}
                </div>
              </div>
              <div className="flex">
                <DataCubeIcon.User className="text-sm text-neutral-500" />
                <div className="ml-1 text-sm text-neutral-500">
                  {query.owner}
                </div>
              </div>
            </div>
          </div>
        </div>
        {sourceBuilder.queryCode !== undefined && (
          <div className="mt-2 h-40 w-full">
            <FormCodeEditor
              value={sourceBuilder.queryCode}
              title="Query Code"
              isReadOnly={true}
              language={CODE_EDITOR_LANGUAGE.PURE}
              hidePadding={true}
            />
          </div>
        )}
        {sourceBuilder.queryParameters?.length && (
          <div className="mt-2 h-40 w-full">
            {sourceBuilder.queryParameterValues &&
              Object.entries(sourceBuilder.queryParameterValues).map(
                ([name, value]) => {
                  return (
                    <V1_BasicValueSpecificationEditor
                      key={name}
                      valueSpecification={
                        value as unknown as V1_ValueSpecification
                      }
                      typeCheckOption={{
                        expectedType: 'String',
                      }}
                      setValueSpecification={(val: V1_ValueSpecification) => {
                        console.log('setValueSpecification', val);
                      }}
                      resetValue={() => null}
                    />
                  );
                },
              )}
          </div>
        )}
        <FormButton
          className="mt-2 flex items-center pl-1"
          onClick={() => sourceBuilder.unsetQuery()}
        >
          <DataCubeIcon.ChevronLeft className="mr-0.5" />
          Go Back
        </FormButton>
      </div>
    );
  },
);
