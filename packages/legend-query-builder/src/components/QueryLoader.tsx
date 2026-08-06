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
  useApplicationStore,
  ActionAlertType,
  ActionAlertActionType,
} from '@finos/legend-application';
import { CODE_EDITOR_LANGUAGE } from '@finos/legend-code-editor';
import { CodeEditor, CodeDiffView } from '@finos/legend-lego/code-editor';
import {
  Dialog,
  Modal,
  ModalTitle,
  clsx,
  SearchIcon,
  TimesIcon,
  ControlledDropdownMenu,
  MenuContent,
  MenuContentItem,
  PanelLoadingIndicator,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalFooterButton,
  UserIcon,
  LastModifiedIcon,
  MoreVerticalIcon,
  ThinChevronRightIcon,
  ArrowLeftIcon,
  InfoCircleIcon,
  CustomSelectorInput,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  BlankPanelContent,
} from '@finos/legend-art';
import type { LightQuery, RawLambda } from '@finos/legend-graph';
import {
  debounce,
  formatDistanceToNow,
  guaranteeNonNullable,
  isNonNullable,
  quantifyList,
} from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useRef, useState, useMemo, useEffect, type ReactNode } from 'react';
import {
  QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT,
  SORT_BY_OPTIONS,
  type QueryLoaderState,
  type QueryRevisionDiffInput,
  type SortByOption,
} from '../stores/QueryLoaderState.js';

const LATEST_REVISION_KEY = 'latest';

// Numeric ordering key for a revision `version`. The value is typed as a string
// but can arrive as a number at runtime, so coerce before parsing (e.g. 4 -> 4,
// "rev-2" -> 2); undefined/unparseable versions sort last.
const revisionSortKey = (version: string | undefined): number => {
  const match = String(version ?? '').match(/\d+/);
  return match ? Number(match[0]) : Number.NEGATIVE_INFINITY;
};

// Shared "last updated · owner" line rendered under a result title, used by both
// the query search results and the version-history rows. The owner is shown as a
// highlighted "Me" tag when it belongs to the current user.
const QueryResultDescription = observer(
  (props: {
    lastUpdatedAt: number | undefined;
    owner: string | undefined;
    isCurrentUser: boolean;
  }) => {
    const { lastUpdatedAt, owner, isCurrentUser } = props;
    return (
      <div className="query-loader__result__description">
        <div className="query-loader__result__description__date__icon">
          <LastModifiedIcon />
        </div>
        <div className="query-loader__result__description__date">
          {lastUpdatedAt !== undefined
            ? formatDistanceToNow(new Date(lastUpdatedAt), {
                includeSeconds: true,
                addSuffix: true,
              })
            : '(unknown)'}
        </div>
        <div
          className={clsx('query-loader__result__description__author__icon', {
            'query-loader__result__description__author__icon--owner':
              isCurrentUser,
          })}
        >
          <UserIcon />
        </div>
        <div className="query-loader__result__description__author__name">
          {isCurrentUser ? (
            <div
              title={owner}
              className="query-loader__result__description__owner"
            >
              Me
            </div>
          ) : (
            (owner ?? '(unknown)')
          )}
        </div>
      </div>
    );
  },
);

// Shared read-only code modal (Pure grammar) used by the query preview and the
// version-history grammar diff — same shell, only the title and body differ.
const QueryLoaderCodeModal = observer(
  (props: {
    queryLoaderState: QueryLoaderState;
    open: boolean;
    title: string;
    onClose: () => void;
    children: ReactNode;
  }) => {
    const { queryLoaderState, open, title, onClose, children } = props;
    return (
      <Dialog
        open={open}
        onClose={onClose}
        classes={{
          root: 'editor-modal__root-container',
          container: 'editor-modal__container',
          paper: 'editor-modal__content',
        }}
      >
        <Modal
          className="editor-modal"
          darkMode={
            !queryLoaderState.applicationStore.layoutService
              .TEMPORARY__isLightColorThemeEnabled
          }
        >
          <ModalHeader title={title} />
          <ModalBody>{children}</ModalBody>
          <ModalFooter>
            <ModalFooterButton
              onClick={onClose}
              text="Close"
              type="secondary"
            />
          </ModalFooter>
        </Modal>
      </Dialog>
    );
  },
);

const QueryPreviewViewer = observer(
  (props: { queryLoaderState: QueryLoaderState }) => {
    const { queryLoaderState } = props;
    const content = guaranteeNonNullable(queryLoaderState.queryPreviewContent);
    return (
      <QueryLoaderCodeModal
        queryLoaderState={queryLoaderState}
        open={queryLoaderState.showPreviewViewer}
        title={content.name}
        onClose={(): void => queryLoaderState.setShowPreviewViewer(false)}
      >
        <CodeEditor
          inputValue={content.content}
          isReadOnly={true}
          language={CODE_EDITOR_LANGUAGE.PURE}
        />
      </QueryLoaderCodeModal>
    );
  },
);

const QueryHistoryDiffViewer = observer(
  (props: { queryLoaderState: QueryLoaderState }) => {
    const { queryLoaderState } = props;
    const labels = queryLoaderState.historyDiffLabels;
    const grammars = queryLoaderState.historyDiffGrammars;
    return (
      <QueryLoaderCodeModal
        queryLoaderState={queryLoaderState}
        open={queryLoaderState.showHistoryDiff}
        title={labels ? `${labels.from}  →  ${labels.to}` : 'Grammar Diff'}
        onClose={(): void => queryLoaderState.setShowHistoryDiff(false)}
      >
        <PanelLoadingIndicator
          isLoading={queryLoaderState.queryHistoryDiffState.isInProgress}
        />
        <div className="query-loader__history__diff">
          <CodeDiffView
            language={CODE_EDITOR_LANGUAGE.PURE}
            from={grammars?.from ?? ''}
            to={grammars?.to ?? ''}
          />
        </div>
      </QueryLoaderCodeModal>
    );
  },
);

const QueryHistoryViewer = observer(
  (props: { queryLoaderState: QueryLoaderState }) => {
    const { queryLoaderState } = props;
    const applicationStore = queryLoaderState.applicationStore;
    const query = queryLoaderState.historyQuery;
    const revisions = queryLoaderState.queryHistoryRevisions;
    const selectedKeys = queryLoaderState.selectedRevisionKeysForDiff;

    // Selectable snapshots for the grammar diff: the current (latest) version
    // followed by each historical revision, newest first (highest `version`).
    // The latest version's content is not part of the `/history` payload, so it
    // is resolved lazily when comparing.
    const orderedRevisions = [...revisions].sort(
      (a, b) => revisionSortKey(b.version) - revisionSortKey(a.version),
    );
    const diffEntries = [
      {
        key: LATEST_REVISION_KEY,
        label: 'Latest revision',
        isLatest: true,
        content: undefined as string | undefined,
        revisionId: undefined as string | undefined,
        lastUpdatedAt: query?.lastUpdatedAt,
        owner: query?.owner,
      },
      ...orderedRevisions.map((revision, idx) => ({
        key: revision.version ?? `revision-${idx}`,
        label: `Revision ${revision.version}`,
        isLatest: false,
        content: revision.content as string | undefined,
        revisionId: revision.version,
        lastUpdatedAt: revision.lastUpdatedAt,
        owner: revision.owner,
      })),
    ];

    const back = (): void => {
      queryLoaderState.setShowHistoryViewer(false);
      queryLoaderState.clearHistoryDiffSelection();
    };
    const openRevision = (revisionId: string | undefined): void => {
      queryLoaderState.setShowHistoryViewer(false);
      queryLoaderState.setQueryLoaderDialogOpen(false);
      queryLoaderState.loadQuery(guaranteeNonNullable(query), revisionId);
    };
    const compareSelected = (): void => {
      // `diffEntries` runs newest → oldest, so ordering the two picks by their
      // position here always diffs the older revision (from) into the newer one
      // (to). This keeps the diff reading forward in time — additions show as
      // additions — regardless of the order the checkboxes were ticked.
      const [newer, older] = diffEntries.filter((entry) =>
        selectedKeys.includes(entry.key),
      );
      if (newer && older) {
        flowResult(
          queryLoaderState.computeHistoryDiff(
            older as QueryRevisionDiffInput,
            newer as QueryRevisionDiffInput,
          ),
        ).catch(applicationStore.alertUnhandledError);
      }
    };
    const confirmRevert = (label: string, revisionId: string): void => {
      applicationStore.alertService.setActionAlertInfo({
        message: `Revert this query to "${label}"? This saves the selected revision as the current version. Your version history is preserved, so you can revert back later.`,
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Revert',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler: applicationStore.guardUnhandledError(() =>
              flowResult(queryLoaderState.revertToRevision(revisionId)),
            ),
          },
          {
            label: 'Cancel',
            type: ActionAlertActionType.PROCEED,
            default: true,
          },
        ],
      });
    };

    return (
      <>
        <div className="query-loader__header query-loader__header--history">
          {!queryLoaderState.isHistoryViewerStandalone && (
            <button
              className="query-loader__history__back-btn"
              title="Back to results"
              onClick={back}
            >
              <ArrowLeftIcon />
            </button>
          )}
          <div className="query-loader__history__title">
            {`Query History${query ? ` - ${query.name}` : ''}`}
          </div>
          <button
            className="query-loader__history__compare-btn"
            title={
              selectedKeys.length === 2
                ? 'Compare the grammar of the two selected revisions'
                : 'Select two revisions to compare their grammar'
            }
            disabled={selectedKeys.length !== 2}
            onClick={compareSelected}
          >
            Compare
          </button>
        </div>
        <div className="query-loader__content">
          <PanelLoadingIndicator
            isLoading={
              queryLoaderState.queryHistoryState.isInProgress ||
              queryLoaderState.queryHistoryDiffState.isInProgress
            }
          />
          <div className="query-loader__results">
            {/* The `/history` endpoint only returns non-current revisions, so
                the latest (current) version is surfaced explicitly. */}
            {diffEntries.map((entry) => (
              <div
                key={entry.key}
                className="query-loader__result query-loader__result--history"
              >
                <label
                  className="query-loader__result__diff-select"
                  title="Select this revision for a grammar diff"
                >
                  <input
                    type="checkbox"
                    checked={selectedKeys.includes(entry.key)}
                    onChange={(): void =>
                      queryLoaderState.toggleRevisionForDiff(entry.key)
                    }
                  />
                </label>
                <div
                  className="query-loader__result__content"
                  title={
                    entry.isLatest
                      ? 'Load the latest revision'
                      : 'Load this revision'
                  }
                  onClick={(): void => openRevision(entry.revisionId)}
                >
                  <div className="query-loader__result__title">
                    {entry.label}
                  </div>
                  <QueryResultDescription
                    lastUpdatedAt={entry.lastUpdatedAt}
                    owner={entry.owner}
                    isCurrentUser={
                      entry.owner ===
                      applicationStore.identityService.currentUser
                    }
                  />
                </div>
                {!queryLoaderState.isReadOnly &&
                  !entry.isLatest &&
                  entry.revisionId !== undefined && (
                    <button
                      className="query-loader__result__revert-btn"
                      title="Revert the query to this revision (saves it as the current version)"
                      onClick={(): void =>
                        confirmRevert(
                          entry.label,
                          guaranteeNonNullable(entry.revisionId),
                        )
                      }
                    >
                      Revert
                    </button>
                  )}
                <div
                  className="query-loader__result__arrow"
                  title={
                    entry.isLatest
                      ? 'Load the latest revision'
                      : 'Load this revision'
                  }
                  onClick={(): void => openRevision(entry.revisionId)}
                >
                  <ThinChevronRightIcon />
                </div>
              </div>
            ))}
          </div>
          {queryLoaderState.queryHistoryState.hasCompleted &&
            revisions.length === 0 && (
              <BlankPanelContent>
                No earlier revisions available
              </BlankPanelContent>
            )}
        </div>
        {queryLoaderState.showHistoryDiff && (
          <QueryHistoryDiffViewer queryLoaderState={queryLoaderState} />
        )}
      </>
    );
  },
);

export const QueryLoader = observer(
  (props: { queryLoaderState: QueryLoaderState; loadActionLabel: string }) => {
    const { queryLoaderState, loadActionLabel } = props;
    const applicationStore = useApplicationStore();
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchResults = queryLoaderState.queries;

    // curated template queries
    const curatedTemplateQueries = [
      ...queryLoaderState.curatedTemplateQuerySpecifications
        .map((s) =>
          queryLoaderState.queryBuilderState
            ? s.getCuratedTemplateQueries(queryLoaderState.queryBuilderState)
            : [],
        )
        .flat(),
    ].sort((a, b) => a.title.localeCompare(b.title));
    const loadCuratedTemplateQuery =
      queryLoaderState.curatedTemplateQuerySpecifications
        // already using an arrow function suggested by @typescript-eslint/unbound-method
        // eslint-disable-next-line
        .map((s) => () => s.loadCuratedTemplateQuery)
        .filter(isNonNullable)[0];

    // search filters
    const sortOptions = Object.values(SORT_BY_OPTIONS).map((op) => ({
      label: op,
      value: op,
    }));
    const [isMineOnly, setIsMineOnly] = useState(false);
    const [showQueryNameEditInput, setShowQueryNameEditInput] = useState<
      number | undefined
    >();

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
    const clearSearchResults = (): void => {
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
    const applySort = (option: SortByOption): void => {
      queryLoaderState.setSortBy(option.value);
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
    const toggleCuratedTemplate = (): void => {
      Array.from(queryLoaderState.extraFilters).forEach(([key, value]) =>
        queryLoaderState.extraFilters.set(key, false),
      );
      queryLoaderState.setShowCurrentUserQueriesOnly(false);
      setIsMineOnly(false);
      queryLoaderState.extraQueryFilterOptionsRelatedToTemplateQuery.forEach(
        (op) =>
          queryLoaderState.extraFilters.set(
            op,
            !queryLoaderState.isCuratedTemplateToggled,
          ),
      );
      queryLoaderState.showingDefaultQueries =
        queryLoaderState.isCuratedTemplateToggled;
      queryLoaderState.setIsCuratedTemplateToggled(
        !queryLoaderState.isCuratedTemplateToggled,
      );
    };
    useEffect(() => {
      flowResult(queryLoaderState.searchQueries('')).catch(
        applicationStore.alertUnhandledError,
      );
    }, [applicationStore, queryLoaderState]);

    useEffect(() => {
      searchInputRef.current?.focus();
    }, [queryLoaderState]);

    // query rename
    const queryRenameInputRef = useRef<HTMLInputElement>(null);
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

    // other actions
    const deleteQuery =
      (query: LightQuery): (() => void) =>
      (): void => {
        if (!queryLoaderState.isReadOnly) {
          flowResult(queryLoaderState.deleteQuery(query.id)).catch(
            applicationStore.alertUnhandledError,
          );
        }
      };
    const showPreview = (
      queryId: string | undefined,
      template?: {
        queryName: string;
        queryContent: RawLambda;
      },
    ): void => {
      flowResult(
        queryLoaderState.getPreviewQueryContent(queryId, template),
      ).catch(applicationStore.alertUnhandledError);
      queryLoaderState.setShowPreviewViewer(true);
    };
    const showHistory = (query: LightQuery): void => {
      flowResult(queryLoaderState.getQueryHistory(query)).catch(
        applicationStore.alertUnhandledError,
      );
    };

    return (
      <div className="query-loader">
        {queryLoaderState.showHistoryViewer ? (
          <QueryHistoryViewer queryLoaderState={queryLoaderState} />
        ) : (
          <>
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
                        onClick={clearSearchResults}
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
                    disabled={queryLoaderState.isCuratedTemplateToggled}
                    title={
                      queryLoaderState.isCuratedTemplateToggled
                        ? 'current fitler is disabled when `Curated Template Query` is on'
                        : 'click to add filter'
                    }
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
                            className={clsx(
                              'query-loader__filter__toggler__btn',
                              {
                                'query-loader__filter__toggler__btn--toggled':
                                  value,
                              },
                            )}
                            disabled={queryLoaderState.isCuratedTemplateToggled}
                            title={
                              queryLoaderState.isCuratedTemplateToggled
                                ? 'current fitler is disabled when `Curated Template Query` is on'
                                : 'click to add filter'
                            }
                            onClick={(): void => toggleExtraFilters(key)}
                            tabIndex={-1}
                          >
                            {key}
                          </button>
                        ),
                      )}
                    </div>
                  )}
                  {queryLoaderState
                    .extraQueryFilterOptionsRelatedToTemplateQuery.length >
                    0 && (
                    <div className="query-loader__filter__extra__filters">
                      <button
                        className={clsx('query-loader__filter__toggler__btn', {
                          'query-loader__filter__toggler__btn--toggled':
                            queryLoaderState.isCuratedTemplateToggled,
                        })}
                        onClick={toggleCuratedTemplate}
                        tabIndex={-1}
                      >
                        Curated Template Query
                      </button>
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
                        (queryLoaderState.generateDefaultQueriesSummaryText?.(
                          searchResults,
                        ) ?? 'Refine your search to get better matches')
                      ) : !queryLoaderState.isCuratedTemplateToggled ? (
                        searchResults.length >=
                        QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT ? (
                          <>
                            {`Found ${QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT}+ matches`}{' '}
                            <InfoCircleIcon
                              title="Some queries are not listed, refine your search to get better matches"
                              className="query-loader__results__summary__info"
                            />
                          </>
                        ) : (
                          `Found ${quantifyList(searchResults, 'match', 'matches')}`
                        )
                      ) : curatedTemplateQueries.length >=
                        QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT ? (
                        <>
                          {`Found ${QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT}+ matches`}{' '}
                          <InfoCircleIcon
                            title="Some queries are not listed, refine your search to get better matches"
                            className="query-loader__results__summary__info"
                          />
                        </>
                      ) : (
                        `Found ${quantifyList(
                          curatedTemplateQueries,
                          'match',
                          'matches',
                        )}`
                      )}
                      {queryLoaderState.canPerformAdvancedSearch(
                        queryLoaderState.searchText,
                      ) &&
                        !queryLoaderState.isCuratedTemplateToggled && (
                          <div className="query-loader__results__sort-by">
                            <div className="query-loader__results__sort-by__name">
                              Sort By
                            </div>
                            <CustomSelectorInput
                              className="query-loader__results__sort-by__selector"
                              options={sortOptions}
                              onChange={(option: SortByOption) => {
                                applySort(option);
                              }}
                              value={{
                                label: queryLoaderState.sortBy,
                                value: queryLoaderState.sortBy,
                              }}
                              darkMode={
                                !applicationStore.layoutService
                                  .TEMPORARY__isLightColorThemeEnabled
                              }
                            />
                          </div>
                        )}
                    </div>
                    {!queryLoaderState.isCuratedTemplateToggled &&
                      searchResults
                        .slice(0, QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT)
                        .map((query, idx) => (
                          <div className="query-loader__result" key={query.id}>
                            <div
                              className="query-loader__result__content"
                              title={`Click to ${loadActionLabel}...`}
                              onClick={() => queryLoaderState.loadQuery(query)}
                            >
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
                                        event.stopPropagation();
                                        renameQuery(query)();
                                      } else if (event.code === 'Escape') {
                                        event.stopPropagation();
                                        hideEditQueryNameInput();
                                      }
                                    }}
                                    onBlur={() => hideEditQueryNameInput()}
                                    // avoid clicking on the input causing the call to load query
                                    onClick={(event) => event.stopPropagation()}
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
                              <QueryResultDescription
                                lastUpdatedAt={query.lastUpdatedAt}
                                owner={query.owner}
                                isCurrentUser={query.isCurrentUserQuery}
                              />
                            </div>
                            <ControlledDropdownMenu
                              className="query-loader__result__actions-menu"
                              title="More Actions..."
                              content={
                                <MenuContent>
                                  <MenuContentItem
                                    onClick={(): void => showPreview(query.id)}
                                  >
                                    Show Query Preview
                                  </MenuContentItem>
                                  <MenuContentItem
                                    onClick={(): void => showHistory(query)}
                                  >
                                    Show Query History
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
                            </ControlledDropdownMenu>
                            <div
                              className="query-loader__result__arrow"
                              title={`Click to ${loadActionLabel}...`}
                              onClick={() => queryLoaderState.loadQuery(query)}
                            >
                              <ThinChevronRightIcon />
                            </div>
                          </div>
                        ))}
                    {queryLoaderState.queryBuilderState &&
                      queryLoaderState.isCuratedTemplateToggled &&
                      loadCuratedTemplateQuery &&
                      curatedTemplateQueries
                        .slice(0, QUERY_LOADER_TYPEAHEAD_SEARCH_LIMIT)
                        .map((templateQuery) => {
                          const loadTemplateQuery = (): void => {
                            flowResult(
                              loadCuratedTemplateQuery()(
                                templateQuery,
                                guaranteeNonNullable(
                                  queryLoaderState.queryBuilderState,
                                ),
                              ),
                            );
                            queryLoaderState.setQueryLoaderDialogOpen(false);
                          };
                          return (
                            <div
                              className="query-loader__result"
                              key={templateQuery.title}
                            >
                              <div
                                className="query-loader__result__content"
                                title={`Click to ${loadActionLabel}...`}
                                onClick={loadTemplateQuery}
                              >
                                <div
                                  className="query-loader__result__title"
                                  title={templateQuery.title}
                                >
                                  {templateQuery.title}
                                </div>
                                <div className="query-loader__result__description">
                                  {templateQuery.description}
                                </div>
                              </div>
                              <ControlledDropdownMenu
                                className="query-loader__result__actions-menu"
                                title="More Actions..."
                                content={
                                  <MenuContent>
                                    <MenuContentItem
                                      onClick={(): void =>
                                        showPreview(undefined, {
                                          queryContent: templateQuery.query,
                                          queryName: templateQuery.title,
                                        })
                                      }
                                    >
                                      Show Query Preview
                                    </MenuContentItem>
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
                              </ControlledDropdownMenu>
                              <div
                                className="query-loader__result__arrow"
                                title={`Click to ${loadActionLabel}...`}
                                onClick={loadTemplateQuery}
                              >
                                <ThinChevronRightIcon />
                              </div>
                            </div>
                          );
                        })}
                  </>
                )}
                {!queryLoaderState.searchQueriesState.hasCompleted && (
                  <CubesLoadingIndicator
                    isLoading={
                      !queryLoaderState.searchQueriesState.hasCompleted
                    }
                  >
                    <CubesLoadingIndicatorIcon />
                  </CubesLoadingIndicator>
                )}
              </div>
            </div>
          </>
        )}
        {queryLoaderState.showPreviewViewer &&
          queryLoaderState.queryPreviewContent && (
            <QueryPreviewViewer queryLoaderState={queryLoaderState} />
          )}
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
    const applicationStore = queryLoaderState.applicationStore;

    const close = (): void => {
      // while the grammar-diff dialog is open, a dismiss (Close/Escape/backdrop)
      // that reaches this parent should only close the diff and return to the
      // history list — not tear down the whole loader
      if (queryLoaderState.showHistoryDiff) {
        queryLoaderState.setShowHistoryDiff(false);
        return;
      }
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
        slotProps={{
          paper: {
            classes: {
              root: 'query-loader__dialog__body',
            },
          },
        }}
      >
        <Modal
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
          className="modal query-loader__dialog__body__content"
        >
          <div className="modal query-loader__dialog__header">
            <ModalTitle
              className="query-loader__dialog__header__title"
              title={
                queryLoaderState.isHistoryViewerStandalone
                  ? 'Query History'
                  : title
              }
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
