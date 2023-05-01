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
import type { LightQuery } from '@finos/legend-graph';
import {
  debounce,
  formatDistanceToNow,
  guaranteeNonNullable,
  quantifyList,
} from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useRef, useState, useMemo, useEffect } from 'react';
import {
  QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT,
  type QueryLoaderState,
} from '../stores/QueryLoaderState.js';

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

export const QueryLoader = observer(
  (props: { queryLoaderState: QueryLoaderState; loadActionLabel: string }) => {
    const { queryLoaderState, loadActionLabel } = props;
    const applicationStore = useApplicationStore();
    const searchInputRef = useRef<HTMLInputElement>(null);
    const queryRenameInputRef = useRef<HTMLInputElement>(null);
    const results = queryLoaderState.queries;
    const [isMineOnly, setIsMineOnly] = useState(false);
    const [showQueryNameEditInput, setShowQueryNameEditInput] = useState<
      number | undefined
    >();
    useEffect(() => {
      queryRenameInputRef.current?.focus();
      queryRenameInputRef.current?.select();
    }, [showQueryNameEditInput]);
    const [queryNameInputValue, setQueryNameInputValue] = useState<string>('');
    const showEditQueryNameInput =
      (value: string, idx: number): (() => void) =>
      (): void => {
        setQueryNameInputValue(value);
        setShowQueryNameEditInput(idx);
      };
    const hideEditQueryNameInput = (): void => {
      setShowQueryNameEditInput(undefined);
      setQueryNameInputValue('');
    };
    const changeQueryNameInputValue: React.ChangeEventHandler<
      HTMLInputElement
    > = (event) => setQueryNameInputValue(event.target.value);

    // search text
    const debouncedLoadQueries = useMemo(
      () =>
        debounce((input: string): void => {
          flowResult(queryLoaderState.searchQueries(input)).catch(
            applicationStore.alertUnhandledError,
          );
        }, 500),
      [applicationStore.alertUnhandledError, queryLoaderState],
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

    useEffect(() => {
      flowResult(queryLoaderState.searchQueries('')).catch(
        applicationStore.alertUnhandledError,
      );
    }, [applicationStore, queryLoaderState]);

    useEffect(() => {
      searchInputRef.current?.focus();
    }, [queryLoaderState]);

    // actions
    const renameQuery =
      (query: LightQuery): (() => void) =>
      (): void => {
        if (!queryLoaderState.isReadOnly) {
          flowResult(
            queryLoaderState.renameQuery(query.id, queryNameInputValue),
          )
            .catch(applicationStore.alertUnhandledError)
            .finally(() => hideEditQueryNameInput());
        }
      };

    const deleteQuery =
      (query: LightQuery): (() => void) =>
      (): void => {
        if (!queryLoaderState.isReadOnly) {
          flowResult(queryLoaderState.deleteQuery(query.id)).catch(
            applicationStore.alertUnhandledError,
          );
        }
      };

    const showPreview = (queryId: string): void => {
      flowResult(queryLoaderState.getPreviewQueryContent(queryId)).catch(
        applicationStore.alertUnhandledError,
      );
      queryLoaderState.setShowPreviewViewer(true);
    };

    return (
      <div className="query-loader">
        <div className="query-loader__header">
          <div className="query-loader__search">
            <div className="query-loader__search__input__container">
              <input
                ref={searchInputRef}
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
              queryLoaderState.searchQueriesState.isInProgress ||
              queryLoaderState.renameQueryState.isInProgress ||
              queryLoaderState.deleteQueryState.isInProgress ||
              queryLoaderState.previewQueryState.isInProgress
            }
          />

          <div className="query-loader__results">
            {queryLoaderState.searchQueriesState.hasCompleted && (
              <>
                <div className="query-loader__results__summary">
                  {queryLoaderState.showingDefaultQueries ? (
                    queryLoaderState.generateDefaultQueriesSummaryText?.(
                      results,
                    ) ?? 'Refine your search to get better matches'
                  ) : results.length >= QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT ? (
                    <>
                      {`Found ${QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT}+ matches`}{' '}
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
                  .slice(0, QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT)
                  .map((query, idx) => (
                    <div
                      className="query-loader__result"
                      title={`Click to ${loadActionLabel}...`}
                      key={query.id}
                      onClick={() => queryLoaderState.loadQuery(query)}
                    >
                      <div className="query-loader__result__content">
                        {showQueryNameEditInput === idx ? (
                          <div className="query-loader__result__title__editor">
                            <input
                              className="query-loader__result__title__editor__input input--dark"
                              spellCheck={false}
                              ref={queryRenameInputRef}
                              value={queryNameInputValue}
                              onChange={changeQueryNameInputValue}
                              onKeyDown={(event) => {
                                if (event.code === 'Enter') {
                                  renameQuery(query)();
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
                            {!queryLoaderState.isReadOnly && (
                              <MenuContentItem
                                disabled={!query.isCurrentUserQuery}
                                onClick={deleteQuery(query)}
                              >
                                Delete
                              </MenuContentItem>
                            )}
                            {!queryLoaderState.isReadOnly && (
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

export const QueryLoaderDialog = observer(
  (props: {
    queryLoaderState: QueryLoaderState;
    title: string;
    loadActionLabel?: string | undefined;
  }) => {
    const { queryLoaderState, title, loadActionLabel } = props;

    const close = (): void => {
      queryLoaderState.setQueryLoaderDialogOpen(false);
      queryLoaderState.reset();
    };

    return (
      <Dialog
        open={queryLoaderState.isQueryLoaderDialogOpen}
        onClose={close}
        classes={{
          root: 'query-loader__dialog',
          container: 'query-loader__dialog__container',
        }}
        PaperProps={{
          classes: { root: 'query-loader__dialog__body' },
        }}
      >
        <Modal
          darkMode={true}
          className="modal query-loader__dialog__body__content"
        >
          <div className="modal query-loader__dialog__header">
            <ModalTitle
              className="query-loader__dialog__header__title"
              title={title}
            />
            <button
              className="query-loader__dialog__header__close-btn"
              title="Close"
              onClick={close}
            >
              <TimesIcon />
            </button>
          </div>
          <div className="modal query-loader__dialog__content">
            <QueryLoader
              queryLoaderState={queryLoaderState}
              loadActionLabel={loadActionLabel ?? title.toLowerCase()}
            />
          </div>
        </Modal>
      </Dialog>
    );
  },
);
