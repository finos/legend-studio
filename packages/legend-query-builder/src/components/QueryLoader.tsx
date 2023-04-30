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
  DEFAULT_TYPEAHEAD_SEARCH_LIMIT,
  useApplicationStore,
} from '@finos/legend-application';
import {
  CODE_EDITOR_LANGUAGE,
  CodeEditor,
} from '@finos/legend-lego/code-editor';
import {
  Dialog,
  Modal,
  ModalTitle,
  clsx,
  SearchIcon,
  TimesIcon,
  DropdownMenu,
  MenuContent,
  MenuContentItem,
  BlankPanelContent,
  PanelLoadingIndicator,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  UserIcon,
  LastModifiedIcon,
  MoreVerticalIcon,
  ThinChevronRightIcon,
  InfoCircleIcon,
} from '@finos/legend-art';
import type { AbstractPureGraphManager, LightQuery } from '@finos/legend-graph';
import {
  ActionState,
  debounce,
  formatDistanceToNow,
  guaranteeNonNullable,
  prettyCONSTName,
  quantifyList,
} from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useRef, useState, useMemo, useEffect } from 'react';
import type { QueryLoaderState } from '../stores/QueryLoaderState.js';

const QueryPreviewViewer = observer(
  (props: { queryLoaderState: QueryLoaderState }) => {
    const { queryLoaderState } = props;
    const close = (): void => {
      queryLoaderState.setShowPreviewViewer(false);
    };
    return (
      <Dialog
        open={queryLoaderState.showPreviewViewer}
        onClose={close}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <Modal className="editor-modal" darkMode={true}>
          <ModalHeader
            title={
              guaranteeNonNullable(queryLoaderState.queryPreviewContent).name
            }
          />
          <ModalBody>
            <CodeEditor
              inputValue={
                guaranteeNonNullable(queryLoaderState.queryPreviewContent)
                  .content
              }
              isReadOnly={true}
              language={CODE_EDITOR_LANGUAGE.PURE}
              showMiniMap={true}
            />
          </ModalBody>
          <ModalFooter>
            <ModalFooterButton onClick={close} text="Close" />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

const QueryLoaderBody = observer(
  (props: {
    queryLoaderState: QueryLoaderState;
    graphManager: AbstractPureGraphManager;
    loadQuery: (selectedQuery: LightQuery) => void;
    renameQuery?:
      | ((
          selectedQuery: LightQuery,
          updatedQueryName: string,
          renameQueryState: ActionState,
        ) => Promise<void>)
      | undefined;
    modalTitle?: string | undefined;
    options?:
      | {
          isDeleteSupported?: boolean;
          includeDefaultQueries?: boolean;
        }
      | undefined;
  }) => {
    const {
      queryLoaderState,
      graphManager,
      loadQuery,
      renameQuery,
      modalTitle,
      options,
    } = props;
    const applicationStore = useApplicationStore();
    const inputRef = useRef<HTMLInputElement>(null);
    const results = queryLoaderState.queries;
    const [isMineOnly, setIsMineOnly] = useState(false);
    const [showQueryNameEditInput, setShowQueryNameEditInput] = useState<
      boolean | number
    >(false);
    useEffect(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, [showQueryNameEditInput]);
    const [queryNameInputValue, setQueryNameInputValue] = useState<string>('');
    const showEditQueryNameInput =
      (value: string, idx: number): (() => void) =>
      (): void => {
        setQueryNameInputValue(value);
        setShowQueryNameEditInput(idx);
      };
    const hideEditQueryNameInput = (): void => {
      setShowQueryNameEditInput(false);
      setQueryNameInputValue('');
    };
    const changeQueryNameInputValue: React.ChangeEventHandler<
      HTMLInputElement
    > = (event) => setQueryNameInputValue(event.target.value);
    const [renameQueryState] = useState(ActionState.create());

    const updateQueryName =
      (query: LightQuery): (() => void) =>
      async (): Promise<void> => {
        if (renameQuery) {
          await renameQuery(query, queryNameInputValue, renameQueryState);
        }
        hideEditQueryNameInput();
      };

    const showPreview = (id: string): void => {
      flowResult(
        queryLoaderState.getPreviewQueryContent(id, graphManager),
      ).catch(applicationStore.alertUnhandledError);
      queryLoaderState.setShowPreviewViewer(true);
    };

    // search text
    const debouncedLoadQueries = useMemo(
      () =>
        debounce((input: string): void => {
          flowResult(
            queryLoaderState.searchQueries(
              input,
              graphManager,
              options?.includeDefaultQueries,
            ),
          ).catch(applicationStore.alertUnhandledError);
        }, 500),
      [
        applicationStore.alertUnhandledError,
        graphManager,
        options?.includeDefaultQueries,
        queryLoaderState,
      ],
    );
    const onSearchTextChange: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      if (event.target.value !== queryLoaderState.searchText) {
        queryLoaderState.setSearchText(event.target.value);
        debouncedLoadQueries.cancel();
        debouncedLoadQueries(event.target.value);
      }
    };
    const clearQuerySearching = (): void => {
      queryLoaderState.setSearchText('');
      debouncedLoadQueries.cancel();
      debouncedLoadQueries('');
    };
    const toggleShowCurrentUserQueriesOnly = (): void => {
      queryLoaderState.setShowCurrentUserQueriesOnly(
        !queryLoaderState.showCurrentUserQueriesOnly,
      );
      setIsMineOnly(!isMineOnly);
      debouncedLoadQueries.cancel();
      debouncedLoadQueries(queryLoaderState.searchText);
    };
    const toggleExtraFilters = (key: string): void => {
      queryLoaderState.extraFilters.set(
        key,
        !queryLoaderState.extraFilters.get(key),
      );
      debouncedLoadQueries.cancel();
      debouncedLoadQueries(queryLoaderState.searchText);
    };

    const loadSelectedQuery = (selctedQuery: LightQuery, idx: number): void => {
      if (idx !== showQueryNameEditInput) {
        queryLoaderState.onLoadQuery?.(
          queryLoaderState.intialQueries,
          selctedQuery,
          applicationStore,
        );
        loadQuery(selctedQuery);
      }
    };

    const deleteQuery =
      (query: LightQuery): (() => void) =>
      async (): Promise<void> => {
        const index = queryLoaderState.intialQueries.findIndex(
          (idx) => idx === query.id,
        );
        queryLoaderState.onDeleteQuery?.(
          queryLoaderState.intialQueries,
          index,
          queryLoaderState.applicationStore,
        );
        queryLoaderState.deleteQuery(query);
        await graphManager.deleteQuery(query.id);
        applicationStore.notificationService.notify(
          'Query deleted successfully',
        );
      };

    useEffect(() => {
      flowResult(
        queryLoaderState.searchQueries(
          '',
          graphManager,
          options?.includeDefaultQueries,
        ),
      ).catch(applicationStore.alertUnhandledError);
    }, [
      applicationStore,
      graphManager,
      options?.includeDefaultQueries,
      queryLoaderState,
    ]);

    return (
      <div className="query-loader">
        <div className="query-loader__header">
          <div className="query-loader__search">
            <div className="query-loader__search__input__container">
              <input
                className={clsx('query-loader__search__input input--dark', {
                  'query-loader__search__input--searching':
                    queryLoaderState.searchText,
                })}
                onChange={onSearchTextChange}
                value={queryLoaderState.searchText}
                placeholder="Search for queries by name or ID"
              />
              {!queryLoaderState.searchText ? (
                <div className="query-loader__search__input__search__icon">
                  <SearchIcon />
                </div>
              ) : (
                <>
                  <button
                    className="query-loader__search__input__clear-btn"
                    tabIndex={-1}
                    onClick={clearQuerySearching}
                    title="Clear"
                  >
                    <TimesIcon />
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="query-loader__filter">
            <div className="query-loader__filter__toggler">
              <button
                className={clsx('query-loader__filter__toggler__btn', {
                  'query-loader__filter__toggler__btn--toggled': isMineOnly,
                })}
                onClick={toggleShowCurrentUserQueriesOnly}
                tabIndex={-1}
              >
                Mine Only
              </button>
              {queryLoaderState.extraFilterOptions.length > 0 && (
                <div className="query-loader__filter__extra__filters">
                  {Array.from(queryLoaderState.extraFilters.entries()).map(
                    ([key, value]) => (
                      <button
                        key={key}
                        className={clsx('query-loader__filter__toggler__btn', {
                          'query-loader__filter__toggler__btn--toggled': value,
                        })}
                        onClick={(): void => toggleExtraFilters(key)}
                        tabIndex={-1}
                      >
                        {key}
                      </button>
                    ),
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="query-loader__content">
          <PanelLoadingIndicator
            isLoading={
              !queryLoaderState.searchQueriesState.hasCompleted ||
              renameQueryState.isInProgress
            }
          />

          <div className="query-loader__results">
            {queryLoaderState.searchQueriesState.hasCompleted && (
              <>
                <div className="query-loader__results__summary">
                  {queryLoaderState.showingRecentlyViewedQueries ? (
                    results.length ? (
                      `Showing ${quantifyList(
                        results,
                        'recently viewed query',
                        'recently viewed queries',
                      )}`
                    ) : (
                      `No recently viewed queries`
                    )
                  ) : results.length >= DEFAULT_TYPEAHEAD_SEARCH_LIMIT ? (
                    <>
                      {`Found ${DEFAULT_TYPEAHEAD_SEARCH_LIMIT}+ matches`}{' '}
                      <InfoCircleIcon
                        title="Some queries are not listed, refine your search to get better matches"
                        className="query-loader__results__summary__info"
                      />
                    </>
                  ) : (
                    `Found ${quantifyList(results, 'match', 'matches')}`
                  )}
                </div>
                {results
                  .slice(0, DEFAULT_TYPEAHEAD_SEARCH_LIMIT)
                  .map((query, idx) => (
                    <div
                      className="query-loader__result"
                      title={
                        showQueryNameEditInput !== idx
                          ? `Click to ${modalTitle ?? 'load query'}...`
                          : ''
                      }
                      key={query.id}
                      onClick={(): void => loadSelectedQuery(query, idx)}
                    >
                      <div className="query-loader__result__content">
                        {showQueryNameEditInput === idx ? (
                          <div className="query-loader__result__title__editor">
                            <input
                              className="query-loader__result__title__editor__input input--dark"
                              spellCheck={false}
                              ref={inputRef}
                              value={queryNameInputValue}
                              onChange={changeQueryNameInputValue}
                              onKeyDown={(event) => {
                                if (event.code === 'Enter') {
                                  updateQueryName(query)();
                                } else if (event.code === 'Escape') {
                                  hideEditQueryNameInput();
                                }
                              }}
                              onBlur={() => hideEditQueryNameInput()}
                            />
                          </div>
                        ) : (
                          <div
                            className="query-loader__result__title"
                            title={query.name}
                          >
                            {query.name}
                          </div>
                        )}
                        <div className="query-loader__result__description">
                          <div className="query-loader__result__description__date__icon">
                            <LastModifiedIcon />
                          </div>
                          <div className="query-loader__result__description__date">
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
                          <div
                            className={clsx(
                              'query-loader__result__description__author__icon',
                              {
                                'query-loader__result__description__author__icon--owner':
                                  query.isCurrentUserQuery,
                              },
                            )}
                          >
                            <UserIcon />
                          </div>
                          <div className="query-loader__result__description__author__name">
                            {query.isCurrentUserQuery ? (
                              <div
                                title={query.owner}
                                className="query-loader__result__description__owner"
                              >
                                Me
                              </div>
                            ) : (
                              query.owner
                            )}
                          </div>
                        </div>
                      </div>
                      <DropdownMenu
                        className="query-loader__result__actions-menu"
                        title="More Actions..."
                        content={
                          <MenuContent>
                            <MenuContentItem
                              onClick={(): void => showPreview(query.id)}
                            >
                              Show Query Preview
                            </MenuContentItem>
                            {options?.isDeleteSupported && (
                              <MenuContentItem
                                disabled={!query.isCurrentUserQuery}
                                onClick={deleteQuery(query)}
                              >
                                Delete
                              </MenuContentItem>
                            )}
                            {renameQuery && (
                              <MenuContentItem
                                disabled={!query.isCurrentUserQuery}
                                onClick={showEditQueryNameInput(
                                  query.name,
                                  idx,
                                )}
                              >
                                Rename
                              </MenuContentItem>
                            )}
                          </MenuContent>
                        }
                        menuProps={{
                          anchorOrigin: {
                            vertical: 'bottom',
                            horizontal: 'left',
                          },
                          transformOrigin: {
                            vertical: 'top',
                            horizontal: 'left',
                          },
                          elevation: 7,
                        }}
                      >
                        <MoreVerticalIcon />
                      </DropdownMenu>
                      <div className="query-loader__result__arrow">
                        <ThinChevronRightIcon />
                      </div>
                    </div>
                  ))}
              </>
            )}
            {!queryLoaderState.searchQueriesState.hasCompleted && (
              <BlankPanelContent>Loading queries...</BlankPanelContent>
            )}
          </div>
          {queryLoaderState.showPreviewViewer &&
            queryLoaderState.queryPreviewContent && (
              <QueryPreviewViewer queryLoaderState={queryLoaderState} />
            )}
        </div>
      </div>
    );
  },
);

export const QueryLoader = observer(
  (props: {
    queryLoaderState: QueryLoaderState;
    graphManager: AbstractPureGraphManager;
    loadQuery: (selectedQuery: LightQuery) => void;
    renameQuery?:
      | ((
          selectedQuery: LightQuery,
          updatedQueryName: string,
          renameQueryState: ActionState,
        ) => Promise<void>)
      | undefined;
    modalTitle?: string | undefined;
    options?:
      | {
          loadAsDialog?: boolean;
          isDeleteSupported?: boolean;
          includeDefaultQueries?: boolean;
        }
      | undefined;
  }) => {
    const {
      queryLoaderState,
      graphManager,
      loadQuery,
      renameQuery,
      modalTitle,
      options,
    } = props;

    if (options?.loadAsDialog) {
      const close = (): void => {
        queryLoaderState.setIsQueryLoaderOpen(false);
        queryLoaderState.reset();
      };
      return (
        <Dialog
          open={queryLoaderState.isQueryLoaderOpen}
          onClose={close}
          classes={{ container: 'query-loader__search-modal__container' }}
          PaperProps={{
            classes: { root: 'query-loader__search-modal__inner-container' },
          }}
        >
          <Modal darkMode={true} className="query-loader__search-modal">
            <ModalTitle
              className="query-loader__title"
              title={`${
                modalTitle ? prettyCONSTName(modalTitle) : 'Load Query'
              }`}
            />
            <button
              className="query-loader__search-modal__actions"
              title="Close"
              onClick={close}
            >
              <TimesIcon />
            </button>
            <QueryLoaderBody
              queryLoaderState={queryLoaderState}
              graphManager={graphManager}
              loadQuery={loadQuery}
              renameQuery={renameQuery}
              modalTitle={modalTitle}
              options={options}
            />
          </Modal>
        </Dialog>
      );
    } else {
      return (
        <QueryLoaderBody
          queryLoaderState={queryLoaderState}
          graphManager={graphManager}
          loadQuery={loadQuery}
          renameQuery={renameQuery}
          modalTitle={modalTitle}
          options={options}
        />
      );
    }
  },
);
