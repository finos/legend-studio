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
  ChevronDownIcon,
  ChevronRightIcon,
  clsx,
  PanelContent,
  PanelLoadingIndicator,
  RefreshIcon,
  SearchIcon,
  TimesIcon,
} from '@finos/legend-art';
import { debounce } from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ACTIVITY_MODE } from '../../../stores/EditorConfig.js';
import type {
  SearchResult,
  SearchResultSourceInformation,
  GrammarModeSearchState,
} from '../../../stores/GrammarModeSearchState.js';
import { useEditorStore } from '../EditorStoreProvider.js';

const getElementName = (path: string): string | undefined => {
  const _names = path.split('::');
  const length = _names.length;
  return _names[length - 1];
};

export const SearchResultSideBarItem = observer(
  (props: {
    textSearchState: GrammarModeSearchState;
    searchResult: SearchResult;
  }) => {
    const { textSearchState, searchResult } = props;
    const editorStore = useEditorStore();
    const [expandResult, setExpandResult] = useState<boolean>(true);
    const nodeExpandIcon = expandResult ? (
      <ChevronDownIcon />
    ) : (
      <ChevronRightIcon />
    );
    const goToSource = (index: SearchResultSourceInformation): void => {
      editorStore.grammarModeManagerState.openGrammarTextEditor(
        index,
        searchResult.entityPath,
      );
    };
    return (
      <>
        <div
          className="search-bar__panel__item"
          tabIndex={-1}
          onClick={(): void => setExpandResult(!expandResult)}
        >
          <div
            className="search-bar__item__info"
            title={searchResult.entityPath}
          >
            <span className="search-bar__item__info-name">
              {nodeExpandIcon}
            </span>
            <span className="search-bar__item__info-name">
              {getElementName(searchResult.entityPath) ??
                searchResult.entityPath}
            </span>
          </div>
          <div className="search-bar__search-count">
            {searchResult.indices.length}
          </div>
          <button
            className="search-bar__delete-btn"
            tabIndex={-1}
            title="Dismiss( Delete )"
            onClick={(): void =>
              textSearchState.deleteSearchResult(searchResult)
            }
          >
            <TimesIcon />
          </button>
        </div>
        {expandResult &&
          searchResult.indices.map((index) => (
            <div
              key={`${index.startLine}${index.startColumn}`}
              className="search-bar__item__index"
              onClick={(): void => goToSource(index)}
            >
              <span
                className="search-bar__item__info-path"
                title={index.resultLine}
              >
                {index.resultLine}
              </span>
              <button
                className="search-bar__index-delete-btn"
                style={{ marginRight: '0.7rem' }}
                tabIndex={-1}
                title="Dismiss( Delete )"
                onClick={(): void =>
                  textSearchState.deleteSearchResultIndex(searchResult, index)
                }
              >
                <TimesIcon />
              </button>
            </div>
          ))}
      </>
    );
  },
);

export const GrammarModeSearchBar = observer(() => {
  const editorStore = useEditorStore();
  const textSearchState =
    editorStore.grammarModeManagerState.grammarModeSearchState;

  // search text
  const debouncedSearchText = useMemo(
    () => debounce(() => textSearchState.searchForText(), 100),
    [textSearchState],
  );
  const onSearchTextChange: React.ChangeEventHandler<HTMLInputElement> = (
    event,
  ) => {
    textSearchState.setSearchText(event.target.value);
    textSearchState.setResultsLength(0);
    debouncedSearchText();
  };
  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editorStore.activeActivity === ACTIVITY_MODE.SEARCH_TEXT) {
      searchInputRef.current?.focus();
    }
  }, [editorStore.activeActivity]);

  return (
    <div className="panel search-bar-main">
      <div className="panel__header search-bar-main__header">
        <div className="panel__header__title search-bar-main__header__title">
          <div className="panel__header__title__content search-bar-main__header__title__content">
            SEARCH
          </div>
        </div>
        <div className="panel__header__actions search-bar-main__header__actions">
          <button
            className={clsx(
              'panel__header__action side-bar__header__action search-bar-main__refresh-btn',
            )}
            onClick={(): void => textSearchState.resetSearchText()}
            tabIndex={-1}
            title="Refresh"
          >
            <RefreshIcon />
          </button>
        </div>
      </div>
      <div className="panel__content search-bar-main__content">
        <div className="panel search-bar-main__content">
          {textSearchState.searchState.isInProgress && (
            <PanelLoadingIndicator isLoading={true} />
          )}
          <div className="search-bar-main__title">
            <div className="search-bar-main__title__content">
              <input
                className="search-bar-main__title__content__input input--dark"
                spellCheck={false}
                ref={searchInputRef}
                value={textSearchState.searchText}
                onChange={onSearchTextChange}
                placeholder="Search"
              />
            </div>
            <button
              className={clsx('btn--dark btn--sm', {})}
              title="Search for text"
            >
              <SearchIcon />
            </button>
          </div>
          <div className="panel side-bar__panel search-bar-main__results">
            <div className="panel__header">
              <div className="panel__header__title">
                <div className="panel__header__title__content">
                  SEARCH RESULTS
                </div>
              </div>
              <div className="search-bar-main__results__count">
                {textSearchState.resultsLength}
              </div>
            </div>
            <PanelContent>
              {textSearchState.searchResults.map((searchResult) => (
                <SearchResultSideBarItem
                  key={searchResult.entityPath}
                  textSearchState={textSearchState}
                  searchResult={searchResult}
                />
              ))}
            </PanelContent>
          </div>
        </div>
      </div>
    </div>
  );
});
