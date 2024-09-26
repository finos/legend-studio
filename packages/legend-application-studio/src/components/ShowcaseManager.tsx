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

import { useApplicationStore } from '@finos/legend-application';
import { observer } from 'mobx-react-lite';
import {
  BlankPanelContent,
  Panel,
  PanelLoadingIndicator,
  TreeView,
  type TreeNodeContainerProps,
  ChevronDownIcon,
  ChevronRightIcon,
  GenericTextFileIcon,
  FolderIcon,
  FolderOpenIcon,
  HomeIcon,
  SearchIcon,
  TimesIcon,
  CodeIcon,
  clsx,
  CopyIcon,
  compareLabelFn,
} from '@finos/legend-art';
import {
  SHOWCASE_MANAGER_SEARCH_CATEGORY,
  SHOWCASE_MANAGER_VIEW,
  ShowcaseManagerState,
  type ShowcaseTextSearchMatchResult,
  type ShowcasesExplorerTreeNodeData,
} from '../stores/ShowcaseManagerState.js';
import { debounce, isNonNullable } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import type { Showcase } from '@finos/legend-server-showcase';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor } from '@finos/legend-lego/code-editor';
import React, { useEffect, useMemo, useRef } from 'react';
import { generateShowcasePath } from '../__lib__/LegendStudioNavigation.js';

const ShowcasesExplorerTreeNodeContainer = observer(
  (
    props: TreeNodeContainerProps<
      ShowcasesExplorerTreeNodeData,
      {
        showcaseManagerState: ShowcaseManagerState;
        toggleExpandNode: (node: ShowcasesExplorerTreeNodeData) => void;
      }
    >,
  ) => {
    const { node, level, innerProps } = props;
    const { toggleExpandNode, showcaseManagerState } = innerProps;
    const applicationStore = useApplicationStore();

    const expandIcon = !node.metadata ? (
      node.isOpen ? (
        <ChevronDownIcon />
      ) : (
        <ChevronRightIcon />
      )
    ) : (
      <div />
    );
    const nodeIcon = !node.metadata ? (
      node.isOpen ? (
        <FolderOpenIcon />
      ) : (
        <FolderIcon />
      )
    ) : (
      <GenericTextFileIcon />
    );
    const onNodeClick = (): void => {
      if (!node.metadata) {
        toggleExpandNode(node);
      } else {
        flowResult(showcaseManagerState.openShowcase(node.metadata)).catch(
          applicationStore.alertUnhandledError,
        );
      }
    };

    return (
      <div
        className="tree-view__node__container showcase-manager__explorer__node__container"
        style={{
          paddingLeft: `${(level - 1) * 1.4}rem`,
          display: 'flex',
        }}
        onClick={onNodeClick}
      >
        <div className="showcase-manager__explorer__node__expand-icon">
          {expandIcon}
        </div>
        <div className="showcase-manager__explorer__node__type-icon">
          {nodeIcon}
        </div>
        <div
          className="tree-view__node__label showcase-manager__explorer__node__label"
          title={
            node.metadata
              ? `${
                  node.metadata.description
                    ? `${node.metadata.description}\n\n`
                    : ''
                }Click to open showcase`
              : undefined
          }
        >
          {node.label}
        </div>
      </div>
    );
  },
);

const ShowcaseManagerExplorer = observer(
  (props: { showcaseManagerState: ShowcaseManagerState }) => {
    const { showcaseManagerState } = props;
    const treeData = showcaseManagerState.explorerTreeData;
    const getChildNodes = (
      node: ShowcasesExplorerTreeNodeData,
    ): ShowcasesExplorerTreeNodeData[] => {
      if (treeData) {
        return node.childrenIds
          .map((id) => treeData.nodes.get(id))
          .filter(isNonNullable)
          .sort(compareLabelFn);
      }
      return [];
    };
    const toggleExpandNode = (node: ShowcasesExplorerTreeNodeData): void => {
      if (treeData) {
        node.isOpen = !node.isOpen;
        showcaseManagerState.setExplorerTreeData({ ...treeData });
      }
    };

    return (
      <div className="showcase-manager__view">
        <div className="showcase-manager__view__header">
          <div className="showcase-manager__view__breadcrumbs">
            <div className="showcase-manager__view__breadcrumb">
              <div className="showcase-manager__view__breadcrumb__icon">
                <HomeIcon />
              </div>
              <div className="showcase-manager__view__breadcrumb__text">
                Showcases
              </div>
            </div>
            <div className="showcase-manager__view__breadcrumb__arrow">
              <ChevronRightIcon />
            </div>
            <div className="showcase-manager__view__breadcrumb">
              <div className="showcase-manager__view__breadcrumb__text">
                Explorer
              </div>
            </div>
          </div>
          <button
            className="showcase-manager__view__search-action"
            tabIndex={-1}
            title="Search"
            onClick={() => {
              showcaseManagerState.closeShowcase();
              showcaseManagerState.setCurrentView(SHOWCASE_MANAGER_VIEW.SEARCH);
            }}
          >
            <SearchIcon />
          </button>
        </div>
        <div className="showcase-manager__view__content">
          <div className="showcase-manager__explorer">
            {showcaseManagerState.explorerTreeData && (
              <TreeView
                components={{
                  TreeNodeContainer: ShowcasesExplorerTreeNodeContainer,
                }}
                treeData={showcaseManagerState.explorerTreeData}
                getChildNodes={getChildNodes}
                innerProps={{
                  toggleExpandNode,
                  showcaseManagerState,
                }}
              />
            )}
          </div>
        </div>
      </div>
    );
  },
);

const renderPreviewLine = (
  line: number,
  text: string,
  result: ShowcaseTextSearchMatchResult,
): React.ReactNode => {
  const lineMatches = result.match.matches
    .filter((match) => match.line === line)
    .sort((a, b) => a.startColumn - b.startColumn);
  const chunks: React.ReactNode[] = [];
  let currentIdx = 0;
  lineMatches.forEach((match, idx) => {
    if (currentIdx < match.startColumn - 1) {
      chunks.push(text.substring(currentIdx, match.startColumn - 1));
    }
    chunks.push(
      <span className="showcase-manager__search__code-result__content__line__text--highlighted">
        {text.substring(match.startColumn - 1, match.endColumn - 1)}
      </span>,
    );
    currentIdx = match.endColumn - 1;
  });
  if (currentIdx < text.length) {
    chunks.push(text.substring(currentIdx, text.length));
  }
  return (
    <>
      {chunks.map((chunk, idx) => (
        // eslint-disable-next-line react/no-array-index-key
        <React.Fragment key={idx}>{chunk}</React.Fragment>
      ))}
    </>
  );
};

const ShowcaseManagerCodeSearchResult = observer(
  (props: {
    showcaseManagerState: ShowcaseManagerState;
    result: ShowcaseTextSearchMatchResult;
  }) => {
    const { showcaseManagerState, result } = props;
    const applicationStore = useApplicationStore();

    return (
      <div className="showcase-manager__search__code-result">
        <div
          className="showcase-manager__search__code-result__header"
          title={`Showcase: ${result.showcase.title}\n\n${
            result.showcase.description ?? '(no description)'
          }\n\nClick to open showcase`}
          onClick={() => {
            flowResult(
              showcaseManagerState.openShowcase(result.showcase),
            ).catch(applicationStore.alertUnhandledError);
          }}
        >
          <div className="showcase-manager__search__code-result__header__icon">
            <GenericTextFileIcon />
          </div>
          <div className="showcase-manager__search__code-result__header__title">
            {result.showcase.path}
          </div>
        </div>
        <div className="showcase-manager__search__code-result__content">
          {result.match.preview.map((entry) => (
            <div
              key={entry.line}
              className="showcase-manager__search__code-result__content__line"
              onClick={() => {
                flowResult(
                  showcaseManagerState.openShowcase(
                    result.showcase,
                    entry.line,
                  ),
                ).catch(applicationStore.alertUnhandledError);
              }}
            >
              <div
                className={clsx(
                  'showcase-manager__search__code-result__content__line__gutter',
                  {
                    'showcase-manager__search__code-result__content__line__gutter--highlighted':
                      Boolean(
                        result.match.matches.find(
                          (match) => match.line === entry.line,
                        ),
                      ),
                  },
                )}
              >
                {entry.line}
              </div>
              <div className="showcase-manager__search__code-result__content__line__text">
                {renderPreviewLine(entry.line, entry.text, result)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  },
);

const ShowcaseManagerSearchPanel = observer(
  (props: { showcaseManagerState: ShowcaseManagerState }) => {
    const { showcaseManagerState } = props;
    const applicationStore = useApplicationStore();
    const searchTextInpurRef = useRef<HTMLInputElement>(null);
    const debouncedSearch = useMemo(
      () =>
        debounce(
          () =>
            flowResult(showcaseManagerState.search()).catch(
              applicationStore.alertUnhandledError,
            ),
          300,
        ),
      [applicationStore, showcaseManagerState],
    );
    const clearSearchText = (): void => {
      debouncedSearch.cancel();
      showcaseManagerState.resetSearch();
    };
    const onSearchTextChange: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ): void => {
      const value = event.target.value;
      showcaseManagerState.setSearchText(value);
      debouncedSearch.cancel();
      if (!value) {
        showcaseManagerState.resetSearch();
      } else {
        debouncedSearch()?.catch(applicationStore.alertUnhandledError);
      }
    };
    const onSearchKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (
      event,
    ) => {
      if (event.code === 'Enter') {
        debouncedSearch.cancel();
        if (showcaseManagerState.searchText) {
          debouncedSearch()?.catch(applicationStore.alertUnhandledError);
        }
      } else if (event.code === 'Escape') {
        searchTextInpurRef.current?.select();
      }
    };

    useEffect(() => {
      searchTextInpurRef.current?.select();
      searchTextInpurRef.current?.focus();
    }, []);

    return (
      <div className="showcase-manager__view">
        <div className="showcase-manager__view__header">
          <div className="showcase-manager__view__breadcrumbs">
            <div
              className="showcase-manager__view__breadcrumb"
              onClick={() => {
                showcaseManagerState.closeShowcase();
                showcaseManagerState.setCurrentView(
                  SHOWCASE_MANAGER_VIEW.EXPLORER,
                );
              }}
            >
              <div className="showcase-manager__view__breadcrumb__icon">
                <HomeIcon />
              </div>
              <div className="showcase-manager__view__breadcrumb__text">
                Showcases
              </div>
            </div>
            <div className="showcase-manager__view__breadcrumb__arrow">
              <ChevronRightIcon />
            </div>
            <div className="showcase-manager__view__breadcrumb">
              <div className="showcase-manager__view__breadcrumb__text">
                Search
              </div>
            </div>
          </div>
          <button
            className="showcase-manager__view__search-action"
            tabIndex={-1}
            title="Search"
            onClick={() => {
              // since we're already on the search tab, clicking this will just focus the search input
              searchTextInpurRef.current?.select();
            }}
          >
            <SearchIcon />
          </button>
        </div>
        <div className="showcase-manager__view__content">
          <div className="showcase-manager__search__header">
            <input
              ref={searchTextInpurRef}
              className="showcase-manager__search__input input--dark"
              spellCheck={false}
              placeholder="Search for showcase, code, etc."
              value={showcaseManagerState.searchText}
              onChange={onSearchTextChange}
              onKeyDown={onSearchKeyDown}
            />
            {!showcaseManagerState.searchText ? (
              <div className="showcase-manager__search__input__search__icon">
                <SearchIcon />
              </div>
            ) : (
              <button
                className="showcase-manager__search__input__clear-btn"
                tabIndex={-1}
                onClick={clearSearchText}
                title="Clear"
              >
                <TimesIcon />
              </button>
            )}
          </div>
          <div className="showcase-manager__search__results">
            <div className="showcase-manager__search__results__categories">
              <div
                className={clsx('showcase-manager__search__results__category', {
                  'showcase-manager__search__results__category--active':
                    showcaseManagerState.currentSearchCaterogy ===
                    SHOWCASE_MANAGER_SEARCH_CATEGORY.SHOWCASE,
                })}
                onClick={() =>
                  showcaseManagerState.setCurrentSearchCategory(
                    SHOWCASE_MANAGER_SEARCH_CATEGORY.SHOWCASE,
                  )
                }
                title="Click to select category"
              >
                <div className="showcase-manager__search__results__category__content">
                  <div className="showcase-manager__search__results__category__icon">
                    <GenericTextFileIcon />
                  </div>
                  <div className="showcase-manager__search__results__category__label">
                    Showcases
                  </div>
                </div>
                <div className="showcase-manager__search__results__category__counter">
                  {showcaseManagerState.showcaseSearchResults?.length ?? 0}
                </div>
              </div>
              <div
                className={clsx('showcase-manager__search__results__category', {
                  'showcase-manager__search__results__category--active':
                    showcaseManagerState.currentSearchCaterogy ===
                    SHOWCASE_MANAGER_SEARCH_CATEGORY.CODE,
                })}
                onClick={() =>
                  showcaseManagerState.setCurrentSearchCategory(
                    SHOWCASE_MANAGER_SEARCH_CATEGORY.CODE,
                  )
                }
                title="Click to select category"
              >
                <div className="showcase-manager__search__results__category__content">
                  <div className="showcase-manager__search__results__category__icon">
                    <CodeIcon />
                  </div>
                  <div className="showcase-manager__search__results__category__label">
                    Code
                  </div>
                </div>
                <div className="showcase-manager__search__results__category__counter">
                  {showcaseManagerState.textSearchResults?.length ?? 0}
                </div>
              </div>
            </div>
            <div className="showcase-manager__search__results__list">
              {showcaseManagerState.currentSearchCaterogy ===
                SHOWCASE_MANAGER_SEARCH_CATEGORY.SHOWCASE && (
                <>
                  {!showcaseManagerState.showcaseSearchResults?.length && (
                    <BlankPanelContent>No results</BlankPanelContent>
                  )}
                  {showcaseManagerState.showcaseSearchResults?.map(
                    (showcase) => (
                      <div
                        key={showcase.uuid}
                        className="showcase-manager__search__showcase-result"
                        title={`Showcase: ${showcase.title}\n\n${
                          showcase.description ?? '(no description)'
                        }\n\nClick to open showcase`}
                        onClick={() => {
                          flowResult(
                            showcaseManagerState.openShowcase(showcase),
                          ).catch(applicationStore.alertUnhandledError);
                        }}
                      >
                        <div className="showcase-manager__search__showcase-result__title">
                          {showcase.title}
                        </div>
                        <div className="showcase-manager__search__showcase-result__description">
                          {showcase.description ?? '(no description)'}
                        </div>
                      </div>
                    ),
                  )}
                </>
              )}
              {showcaseManagerState.currentSearchCaterogy ===
                SHOWCASE_MANAGER_SEARCH_CATEGORY.CODE && (
                <>
                  {!showcaseManagerState.textSearchResults?.length && (
                    <BlankPanelContent>No results</BlankPanelContent>
                  )}
                  {showcaseManagerState.textSearchResults?.map((result) => (
                    <ShowcaseManagerCodeSearchResult
                      key={result.showcase.uuid}
                      showcaseManagerState={showcaseManagerState}
                      result={result}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

const ShowcaseViewer = observer(
  (props: {
    showcaseManagerState: ShowcaseManagerState;
    showcase: Showcase;
  }) => {
    const { showcaseManagerState, showcase } = props;
    const prettyPath = showcase.path.replaceAll(/\s*\/\s*/g, ' / ');
    const launchShowcase = (): void => {
      const applicationStore = showcaseManagerState.applicationStore;
      applicationStore.navigationService.navigator.visitAddress(
        applicationStore.navigationService.navigator.generateAddress(
          generateShowcasePath(showcase.path),
        ),
      );
    };
    const handleCopy =
      showcaseManagerState.applicationStore.guardUnhandledError(() =>
        showcaseManagerState.applicationStore.clipboardService.copyTextToClipboard(
          showcase.code,
          {
            notifySuccessMessage: 'Showcase grammar copied to clipboard',
          },
        ),
      );
    return (
      <div className="showcase-manager__view">
        <div className="showcase-manager__view__header">
          <div className="showcase-manager__view__breadcrumbs">
            <div
              className="showcase-manager__view__breadcrumb"
              onClick={() => {
                showcaseManagerState.closeShowcase();
                showcaseManagerState.setCurrentView(
                  SHOWCASE_MANAGER_VIEW.EXPLORER,
                );
              }}
            >
              <div className="showcase-manager__view__breadcrumb__icon">
                <HomeIcon />
              </div>
              <div className="showcase-manager__view__breadcrumb__text">
                Showcases
              </div>
            </div>
            <div className="showcase-manager__view__breadcrumb__arrow">
              <ChevronRightIcon />
            </div>
            <div className="showcase-manager__view__breadcrumb">
              <div className="showcase-manager__view__breadcrumb__icon">
                <GenericTextFileIcon />
              </div>
              <div className="showcase-manager__view__breadcrumb__text">
                {showcase.title}
              </div>
            </div>
          </div>
          <button
            className="showcase-manager__view__search-action"
            tabIndex={-1}
            title="Search"
            onClick={() => {
              showcaseManagerState.closeShowcase();
              showcaseManagerState.setCurrentView(SHOWCASE_MANAGER_VIEW.SEARCH);
            }}
          >
            <SearchIcon />
          </button>
        </div>
        <div className="showcase-manager__view__content showcase-manager__viewer__content">
          <div className="showcase-manager__viewer__title">
            <div className="showcase-manager__viewer__title__label">
              {showcase.title}
            </div>
            <div className="showcase-manager__viewer__title__action">
              <div className="btn__dropdown-combo btn__dropdown-combo--primary showcase-manager__viewer__title__action-btn">
                <button
                  className="btn__dropdown-combo__label"
                  onClick={launchShowcase}
                  title="Open Showcase Project"
                  tabIndex={-1}
                >
                  <div className="btn__dropdown-combo__label__title">
                    Launch
                  </div>
                </button>
              </div>
            </div>
            <div className="showcase-manager__viewer__title__action">
              <div
                onClick={handleCopy}
                className="showcase-manager__viewer__title__action-icon"
              >
                <CopyIcon />
              </div>
            </div>
          </div>
          <div className="showcase-manager__viewer__path">{prettyPath}</div>
          <div className="showcase-manager__viewer__code">
            <CodeEditor
              language={CODE_EDITOR_LANGUAGE.PURE}
              inputValue={showcase.code}
              isReadOnly={true}
              lineToScroll={showcaseManagerState.showcaseLineToScroll}
            />
          </div>
        </div>
      </div>
    );
  },
);

const ShowcaseManagerContent = observer(
  (props: { showcaseManagerState: ShowcaseManagerState }) => {
    const { showcaseManagerState } = props;
    const currentShowcase = showcaseManagerState.currentShowcase;
    const currentView = showcaseManagerState.currentView;

    return (
      <div className="showcase-manager">
        {currentShowcase && (
          <ShowcaseViewer
            showcaseManagerState={showcaseManagerState}
            showcase={currentShowcase}
          />
        )}
        {!currentShowcase && (
          <>
            {currentView === SHOWCASE_MANAGER_VIEW.EXPLORER && (
              <ShowcaseManagerExplorer
                showcaseManagerState={showcaseManagerState}
              />
            )}
            {currentView === SHOWCASE_MANAGER_VIEW.SEARCH && (
              <ShowcaseManagerSearchPanel
                showcaseManagerState={showcaseManagerState}
              />
            )}
          </>
        )}
      </div>
    );
  },
);

export const ShowcaseManager = observer(() => {
  const applicationStore = useApplicationStore();
  const showcaseManagerState =
    ShowcaseManagerState.retrieveNullableState(applicationStore);

  if (!showcaseManagerState) {
    return null;
  }

  return (
    <Panel>
      <PanelLoadingIndicator
        isLoading={showcaseManagerState.initState.isInProgress}
      />
      {showcaseManagerState.initState.isInProgress && (
        <BlankPanelContent>Initializing...</BlankPanelContent>
      )}
      {showcaseManagerState.initState.hasFailed && (
        <BlankPanelContent>Failed to initialize</BlankPanelContent>
      )}
      {showcaseManagerState.initState.hasSucceeded && (
        <ShowcaseManagerContent showcaseManagerState={showcaseManagerState} />
      )}
    </Panel>
  );
});
