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
import type {
  SearchResultCoordinate,
  SearchResultEntry,
} from '../../server/models/SearchEntry.js';
import {
  FileCoordinate,
  trimPathLeadingSlash,
} from '../../server/models/File.js';
import { flowResult } from 'mobx';
import {
  CaseSensitiveIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CloseIcon,
  clsx,
  CollapseTreeIcon,
  ExpandTreeIcon,
  FileAltIcon,
  PanelLoadingIndicator,
  RefreshIcon,
  RegexIcon,
  TimesIcon,
} from '@finos/legend-art';
import { useApplicationStore } from '@finos/legend-application';
import { usePureIDEStore } from '../PureIDEStoreProvider.js';
import type { TextSearchResult } from '../../stores/TextSearchState.js';
import { useEffect, useMemo, useRef } from 'react';
import { debounce } from '@finos/legend-shared';
import { PANEL_MODE } from '../../stores/PureIDEConfig.js';

const TextSearchResultEntryDisplay = observer(
  (props: { searchResult: TextSearchResult; result: SearchResultEntry }) => {
    const { searchResult, result } = props;
    const ideStore = usePureIDEStore();
    const applicationStore = useApplicationStore();
    const goToResult =
      (coordinate: SearchResultCoordinate): (() => void) =>
      (): Promise<void> =>
        flowResult(
          ideStore.loadFile(
            result.sourceId,
            new FileCoordinate(
              result.sourceId,
              coordinate.startLine,
              coordinate.startColumn,
            ),
          ),
        ).catch(applicationStore.alertUnhandledError);
    const dismissResultForFile = (): void =>
      searchResult.dismissSearchEntry(result);
    const dismissCoordinate =
      (coordinate: SearchResultCoordinate): (() => void) =>
      (): void => {
        result.dismissCoordinate(coordinate);
        if (!result.coordinates.length) {
          searchResult.dismissSearchEntry(result);
        }
      };

    return (
      <div className="text-search-panel__entry">
        <div
          className="text-search-panel__entry__header"
          onClick={() => result.setIsExpanded(!result.isExpanded)}
        >
          <div className="text-search-panel__entry__header__title">
            <div className="text-search-panel__entry__header__title__expander">
              {result.isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
            </div>
            <div className="text-search-panel__entry__header__title__label">
              <FileAltIcon />
            </div>
            <div className="text-search-panel__entry__header__title__content">
              {trimPathLeadingSlash(result.sourceId)}
            </div>
          </div>
          <div className="text-search-panel__entry__header__actions">
            <div className="text-search-panel__entry__header__action text-search-panel__entry__header__action--with-counter">
              <div className="text-search-panel__entry__header__action__counter">
                {result.coordinates.length}
              </div>
            </div>
            <button
              className="text-search-panel__entry__header__action text-search-panel__entry__header__action--hidden"
              tabIndex={-1}
              title="Dismiss"
              onClick={dismissResultForFile}
            >
              <TimesIcon />
            </button>
          </div>
        </div>
        {result.isExpanded && (
          <div className="text-search-panel__entry__content">
            {result.coordinates.map((coordinate) => (
              <div
                key={coordinate.uuid}
                className="text-search-panel__entry__content__item"
              >
                <div
                  className="text-search-panel__entry__content__item__label text-search-panel__entry__content__item__label--full"
                  title={
                    coordinate.preview
                      ? `${
                          coordinate.preview.before
                        }${coordinate.preview.found.replaceAll(
                          /\n/g,
                          '\u21B5',
                        )}${coordinate.preview.after}`
                      : 'Go To Result'
                  }
                  onClick={goToResult(coordinate)}
                >
                  {coordinate.preview && (
                    <div className="text-search-panel__entry__content__item__label__content">
                      <div className="text-search-panel__entry__content__item__label__coordinates">
                        {`[${coordinate.startLine}:${coordinate.startColumn}]`}
                      </div>
                      <div className="text-search-panel__entry__content__item__label__preview">
                        <span className="text-search-panel__entry__content__item__label__preview__text">
                          {coordinate.preview.before}
                        </span>
                        <span className="text-search-panel__entry__content__item__label__preview__text text-search-panel__entry__content__item__label__preview__text--found">
                          {coordinate.preview.found.replaceAll(/\n/g, '\u21B5')}
                        </span>
                        <span className="text-search-panel__entry__content__item__label__preview__text">
                          {coordinate.preview.after}
                        </span>
                      </div>
                    </div>
                  )}
                  {!coordinate.preview && (
                    <>
                      {`line: ${coordinate.startLine} - column: ${coordinate.startColumn}`}
                    </>
                  )}
                </div>
                <div className="text-search-panel__entry__content__item__actions">
                  <button
                    className="text-search-panel__entry__content__item__action text-search-panel__entry__content__item__action--hidden"
                    tabIndex={-1}
                    title="Dismiss"
                    onClick={dismissCoordinate(coordinate)}
                  >
                    <TimesIcon />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);

const TextSearchResultDisplay = observer(
  (props: { searchResult: TextSearchResult }) => {
    const { searchResult } = props;
    const ideStore = usePureIDEStore();
    const applicationStore = useApplicationStore();
    const showExpandAction = searchResult.searchEntries.some(
      (entry) => !entry.isExpanded,
    );
    const refresh = (): void => {
      flowResult(ideStore.textSearchState.search()).catch(
        applicationStore.alertUnhandledError,
      );
    };
    const clear = (): void => {
      ideStore.textSearchState.setText('');
      ideStore.textSearchState.setResult(undefined);
    };
    const expandAll = (): void => {
      searchResult.searchEntries.forEach((entry) => entry.setIsExpanded(true));
    };
    const collapseAll = (): void => {
      searchResult.searchEntries.forEach((entry) => entry.setIsExpanded(false));
    };

    return (
      <div className="text-search-panel__content">
        <div className="text-search-panel__content__header">
          <div className="text-search-panel__content__header__title">
            {!searchResult.searchEntries.length
              ? `No result`
              : `${searchResult.numberOfResults} result(s) in ${searchResult.numberOfFiles} files`}
          </div>
          <div className="text-search-panel__content__header__actions">
            <button
              className="text-search-panel__content__header__action"
              tabIndex={-1}
              title="Refresh"
              onClick={refresh}
            >
              <RefreshIcon />
            </button>
            <button
              className="text-search-panel__content__header__action"
              tabIndex={-1}
              title="Clear"
              onClick={clear}
            >
              <CloseIcon />
            </button>
            {!showExpandAction && (
              <button
                className="text-search-panel__content__header__action"
                tabIndex={-1}
                title="Collapse All"
                onClick={collapseAll}
              >
                <CollapseTreeIcon />
              </button>
            )}
            {showExpandAction && (
              <button
                className="text-search-panel__content__header__action"
                tabIndex={-1}
                title="Expand All"
                onClick={expandAll}
              >
                <ExpandTreeIcon />
              </button>
            )}
          </div>
        </div>
        <div className="text-search-panel__content__results">
          {searchResult.searchEntries.map((searchEntry) => (
            <TextSearchResultEntryDisplay
              key={searchEntry.uuid}
              searchResult={searchResult}
              result={searchEntry}
            />
          ))}
        </div>
      </div>
    );
  },
);

export const TextSearchPanel = observer(() => {
  const ideStore = usePureIDEStore();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchState = ideStore.textSearchState;
  const toggleCaseSensitive = (): void =>
    searchState.setCaseSensitive(!searchState.isCaseSensitive);
  const toggleRegExp = (): void => searchState.setRegExp(!searchState.isRegExp);
  const debouncedSearch = useMemo(
    () => debounce(() => searchState.search(), 300),
    [searchState],
  );
  const onSearchTextChange: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ): void => {
    const value = event.target.value;
    searchState.setText(value);
    debouncedSearch.cancel();
    if (!value) {
      searchState.setResult(undefined);
    } else {
      debouncedSearch();
    }
  };
  const onSearchKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (
    event,
  ) => {
    if (event.code === 'Enter') {
      debouncedSearch.cancel();
      if (searchState.text) {
        debouncedSearch();
      }
    } else if (event.code === 'Escape') {
      searchInputRef.current?.select();
    }
  };

  useEffect(() => {
    if (searchInputRef.current) {
      searchState.setSearchInput(searchInputRef.current);
    }
    return () => searchState.setSearchInput(undefined);
  }, [searchState]);

  useEffect(() => {
    if (
      ideStore.panelGroupDisplayState.isOpen &&
      ideStore.activePanelMode === PANEL_MODE.SEARCH
    ) {
      searchState.focus();
    }
  }, [
    searchState,
    ideStore.panelGroupDisplayState.isOpen,
    ideStore.activePanelMode,
  ]);

  return (
    <div className="text-search-panel">
      <PanelLoadingIndicator
        isLoading={ideStore.textSearchState.loadState.isInProgress}
      />
      <div className="text-search-panel__header">
        <div className="text-search-panel__searcher__input__container">
          <input
            ref={searchInputRef}
            autoFocus={true}
            className="text-search-panel__searcher__input input--dark"
            onChange={onSearchTextChange}
            onKeyDown={onSearchKeyDown}
            value={searchState.text}
            placeholder="Search"
          />
          <div className="text-search-panel__searcher__input__actions">
            <button
              className={clsx('text-search-panel__searcher__input__action', {
                'text-search-panel__searcher__input__action--active':
                  searchState.isCaseSensitive,
              })}
              tabIndex={-1}
              title="Match Case"
              onClick={toggleCaseSensitive}
            >
              <CaseSensitiveIcon />
            </button>
            <button
              className={clsx('text-search-panel__searcher__input__action', {
                'text-search-panel__searcher__input__action--active':
                  searchState.isRegExp,
              })}
              tabIndex={-1}
              title="Use Regular Expression"
              onClick={toggleRegExp}
            >
              <RegexIcon />
            </button>
          </div>
        </div>
      </div>
      {ideStore.textSearchState.result && (
        <TextSearchResultDisplay
          searchResult={ideStore.textSearchState.result}
        />
      )}
    </div>
  );
});
