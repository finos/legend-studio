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
  MenuContentItemLabel,
  BlankPanelContent,
  PanelLoadingIndicator,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  UserIcon,
  ChevronRightIcon,
  LastModifiedIcon,
  MoreVerticalIcon,
} from '@finos/legend-art';
import type { AbstractPureGraphManager, LightQuery } from '@finos/legend-graph';
import {
  ActionState,
  debounce,
  formatDistanceToNow,
  guaranteeNonNullable,
  prettyCONSTName,
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
    moreOptions?:
      | {
          loadAsDialog?: boolean;
          isDeleteSupported?: boolean;
          includeDefaultQueries?: boolean;
        }
      | undefined;
    currentQueryId?: string | undefined;
  }) => {
    const {
      queryLoaderState,
      graphManager,
      loadQuery,
      renameQuery,
      modalTitle,
      moreOptions,
      currentQueryId,
    } = props;
    const applicationStore = useApplicationStore();
    const inputRef = useRef<HTMLInputElement>(null);
    const [isMineOnly, setIsMineOnly] = useState(false);
    const [showQueryNameEditInput, setShowQueryNameEditInput] = useState<
      boolean | number
    >(false);
    const [queryNameInputValue, setQueryNameInputValue] = useState<string>('');
    const showEditQueryNameInput =
      (value: string, idx: number): (() => void) =>
      (): void => {
        inputRef.current?.focus();
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
            queryLoaderState.loadQueries(
              input,
              graphManager,
              moreOptions?.includeDefaultQueries,
            ),
          ).catch(applicationStore.alertUnhandledError);
        }, 500),
      [
        applicationStore.alertUnhandledError,
        graphManager,
        moreOptions?.includeDefaultQueries,
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
        queryLoaderState.loadQueries(
          '',
          graphManager,
          moreOptions?.includeDefaultQueries,
        ),
      ).catch(applicationStore.alertUnhandledError);
    }, [
      applicationStore,
      graphManager,
      moreOptions?.includeDefaultQueries,
      queryLoaderState,
    ]);

    return (
      <>
        <div className="query-loader__search-section">
          <div className="query-loader__search-section__input__container">
            <input
              className={clsx(
                'query-loader__search-section__input input--dark',
                {
                  'query-loader__search-section__input--searching':
                    queryLoaderState.searchText,
                },
              )}
              onChange={onSearchTextChange}
              value={queryLoaderState.searchText}
              placeholder="Search a query by name"
            />
            {!queryLoaderState.searchText ? (
              <div className="query-loader__search-section__input__search__icon">
                <SearchIcon />
              </div>
            ) : (
              <>
                <button
                  className="query-loader__search-section__input__clear-btn"
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
        <div className="query-loader__filter-section">
          <div className="query-loader__filter-section__toggler">
            <button
              className={clsx('query-loader__filter-section__toggler__btn', {
                'query-loader__filter-section__toggler__btn--toggled':
                  isMineOnly,
              })}
              onClick={toggleShowCurrentUserQueriesOnly}
              tabIndex={-1}
            >
              Mine Only
            </button>
            {queryLoaderState.extraFilterOptions.length > 0 && (
              <div className="query-loader__filter-section__extra__filters">
                {Array.from(queryLoaderState.extraFilters.entries()).map(
                  ([key, value]) => (
                    <button
                      key={key}
                      className={clsx(
                        'query-loader__filter-section__extra__filter__toggler__btn',
                        {
                          'query-loader__filter-section__extra__filter__toggler__btn--toggled':
                            value,
                        },
                      )}
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
        <div className="query-loader__body">
          {queryLoaderState.loadQueriesState.hasCompleted && (
            <>
              {queryLoaderState.queries.map((query, idx) => (
                <div
                  className="query-loader__result__section"
                  title={
                    showQueryNameEditInput !== idx
                      ? `Click to ${modalTitle ?? 'load query'}...`
                      : ''
                  }
                  key={query.id}
                  onClick={(): void => loadSelectedQuery(query, idx)}
                >
                  <div className="query-loader__result__content__section">
                    {showQueryNameEditInput === idx ? (
                      <div className="query-loader__result__title__editor">
                        <input
                          className="query-loader__result__title__editor__input"
                          spellCheck={false}
                          ref={inputRef}
                          value={queryNameInputValue}
                          onChange={changeQueryNameInputValue}
                        />
                        <div className="query-loader__result__title__editor__actions">
                          <button
                            className="query-loader__result__title__editor__save-btn btn btn--dark"
                            onClick={updateQueryName(query)}
                            tabIndex={-1}
                          >
                            Rename
                          </button>
                          <button
                            className="query-loader__result__title__editor__cancel-btn btn btn--dark"
                            onClick={hideEditQueryNameInput}
                            tabIndex={-1}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="query-loader__result__title">
                        {query.name}
                      </div>
                    )}
                    <div className="query-loader__result__description">
                      {query.lastUpdatedAt && (
                        <>
                          <div className="query-loader__result__description__author">
                            <LastModifiedIcon />
                          </div>
                          <div className="query-loader__result__description__modified__date">
                            {query.lastUpdatedAt
                              ? `${formatDistanceToNow(
                                  new Date(query.lastUpdatedAt),
                                )} ago`
                              : ''}
                          </div>
                        </>
                      )}
                      <div className="query-loader__result__description__author">
                        <UserIcon />
                      </div>
                      <div
                        className={clsx(
                          'query-loader__result__description__author__name',
                          {
                            'query-loader__result__description__author__name--owner':
                              isMineOnly,
                          },
                        )}
                      >
                        {query.owner}
                      </div>
                    </div>
                  </div>
                  <div className="query-loader__result__section__action-btn">
                    <DropdownMenu
                      className="query-loader__result__description__action-btn"
                      title="More Options..."
                      content={
                        <MenuContent>
                          <MenuContentItem
                            onClick={(): void => showPreview(query.id)}
                          >
                            <MenuContentItemLabel>
                              Show Query Preview
                            </MenuContentItemLabel>
                          </MenuContentItem>
                          {moreOptions?.isDeleteSupported && (
                            <MenuContentItem
                              onClick={deleteQuery(query)}
                              disabled={
                                query.owner !==
                                  queryLoaderState.currentUserId ||
                                currentQueryId === query.id
                              }
                            >
                              <MenuContentItemLabel>
                                Delete
                              </MenuContentItemLabel>
                            </MenuContentItem>
                          )}
                          {renameQuery && (
                            <MenuContentItem
                              onClick={showEditQueryNameInput(query.name, idx)}
                              disabled={
                                query.owner !== queryLoaderState.currentUserId
                              }
                            >
                              <MenuContentItemLabel>
                                Rename
                              </MenuContentItemLabel>
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
                    <ChevronRightIcon />
                  </div>
                </div>
              ))}
              {queryLoaderState.queries.length === 0 && (
                <BlankPanelContent>
                  Search by name to find the relevant queries
                </BlankPanelContent>
              )}
              {queryLoaderState.queries.length >=
                DEFAULT_TYPEAHEAD_SEARCH_LIMIT && (
                <div className="query-loader__result__section__message">
                  Too many matching queries found, truncating list to be more
                  specific
                </div>
              )}
            </>
          )}
          <PanelLoadingIndicator
            isLoading={
              !queryLoaderState.loadQueriesState.hasCompleted ||
              renameQueryState.isInProgress
            }
          />
          {!queryLoaderState.loadQueriesState.hasCompleted && (
            <BlankPanelContent>Loading queries...</BlankPanelContent>
          )}
        </div>
      </>
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
    moreOptions?:
      | {
          loadAsDialog?: boolean;
          isDeleteSupported?: boolean;
          includeDefaultQueries?: boolean;
        }
      | undefined;
    currentQueryId?: string | undefined;
  }) => {
    const {
      queryLoaderState,
      graphManager,
      loadQuery,
      renameQuery,
      modalTitle,
      moreOptions,
      currentQueryId,
    } = props;
    if (moreOptions?.loadAsDialog) {
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
            {queryLoaderState.showPreviewViewer &&
              queryLoaderState.queryPreviewContent && (
                <QueryPreviewViewer queryLoaderState={queryLoaderState} />
              )}
            <QueryLoaderBody
              queryLoaderState={queryLoaderState}
              graphManager={graphManager}
              loadQuery={loadQuery}
              renameQuery={renameQuery}
              modalTitle={modalTitle}
              moreOptions={moreOptions}
              currentQueryId={currentQueryId}
            />
          </Modal>
        </Dialog>
      );
    } else {
      return (
        <>
          <QueryLoaderBody
            queryLoaderState={queryLoaderState}
            graphManager={graphManager}
            loadQuery={loadQuery}
            renameQuery={renameQuery}
            modalTitle={modalTitle}
            moreOptions={moreOptions}
            currentQueryId={currentQueryId}
          />
          {queryLoaderState.showPreviewViewer &&
            queryLoaderState.queryPreviewContent && (
              <QueryPreviewViewer queryLoaderState={queryLoaderState} />
            )}
        </>
      );
    }
  },
);
