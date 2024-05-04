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
  clsx,
  HammerIcon,
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
  HackerIcon,
  DiffIcon,
  AssistantIcon,
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  BlankPanelContent,
  ModalFooterButton,
  ChatIcon,
  PanelLoadingIndicator,
} from '@finos/legend-art';
import { QueryBuilderFilterPanel } from './filter/QueryBuilderFilterPanel.js';
import { QueryBuilderExplorerPanel } from './explorer/QueryBuilderExplorerPanel.js';
import { QueryBuilderSidebar } from './QueryBuilderSideBar.js';
import { QueryBuilderResultPanel } from './result/QueryBuilderResultPanel.js';
import { QueryBuilderTextEditor } from './QueryBuilderTextEditor.js';
import type { QueryBuilderState } from '../stores/QueryBuilderState.js';
import { QueryBuilderTextEditorMode } from '../stores/QueryBuilderTextEditorState.js';
import { QueryBuilderFetchStructurePanel } from './fetch-structure/QueryBuilderFetchStructurePanel.js';
import { QUERY_BUILDER_TEST_ID } from '../__lib__/QueryBuilderTesting.js';
import { flowResult } from 'mobx';
import { QueryBuilderUnsupportedQueryEditor } from './QueryBuilderUnsupportedQueryEditor.js';
import {
  BackdropContainer,
  useApplicationStore,
  useCommands,
} from '@finos/legend-application';
import { QueryBuilderParametersPanel } from './QueryBuilderParametersPanel.js';
import { QueryBuilderFunctionsExplorerPanel } from './explorer/QueryBuilderFunctionsExplorerPanel.js';
import { QueryBuilderTDSState } from '../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { QueryBuilderDiffViewPanelDiaglog } from './QueryBuilderDiffPanel.js';
import { QueryBuilderGraphFetchTreeState } from '../stores/fetch-structure/graph-fetch/QueryBuilderGraphFetchTreeState.js';
import { QueryBuilderPostTDSPanel } from './fetch-structure/QueryBuilderPostTDSPanel.js';
import { QueryBuilderConstantExpressionPanel } from './QueryBuilderConstantExpressionPanel.js';
import { QUERY_BUILDER_COMPONENT_ELEMENT_ID } from './QueryBuilderComponentElement.js';
import { DataAccessOverview } from './data-access/DataAccessOverview.js';
import { QueryChat } from './QueryChat.js';
import { Fragment, useEffect, useRef } from 'react';
import { QueryBuilder_LegendApplicationPlugin } from './QueryBuilder_LegendApplicationPlugin.js';
import { QueryBuilderWatermarkEditor } from './watermark/QueryBuilderWatermark.js';

const QueryBuilderStatusBar = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const showDiff = (): void =>
      queryBuilderState.changeDetectionState.showDiffViewPanel();
    const openLambdaEditor = (mode: QueryBuilderTextEditorMode): void =>
      queryBuilderState.textEditorState.openModal(mode);
    const compile = applicationStore.guardUnhandledError(() =>
      flowResult(queryBuilderState.compileQuery()),
    );
    const toggleAssistant = (): void =>
      applicationStore.assistantService.toggleAssistant();
    const openQueryChat = (): void =>
      queryBuilderState.setIsQueryChatOpened(true);

    return (
      <div className="query-builder__status-bar">
        <div className="query-builder__status-bar__left"></div>
        <div className="query-builder__status-bar__right">
          {queryBuilderState.changeDetectionState.initState.hasCompleted && (
            <>
              <button
                className={clsx(
                  'query-builder__status-bar__action query-builder__status-bar__view-diff-btn',
                )}
                disabled={!queryBuilderState.changeDetectionState.hasChanged}
                onClick={showDiff}
                tabIndex={-1}
                title={
                  queryBuilderState.changeDetectionState.hasChanged
                    ? 'Show changes'
                    : 'Query has not been changed'
                }
              >
                <DiffIcon />
              </button>
              {queryBuilderState.changeDetectionState.diffViewState && (
                <QueryBuilderDiffViewPanelDiaglog
                  diffViewState={
                    queryBuilderState.changeDetectionState.diffViewState
                  }
                />
              )}
            </>
          )}
          {queryBuilderState.isQueryChatOpened && (
            <QueryChat queryBuilderState={queryBuilderState} />
          )}
          {!queryBuilderState.config?.TEMPORARY__disableQueryBuilderChat && (
            <button
              className={clsx(
                'query-builder__status-bar__action query-builder__status-bar__action__toggler',
                {
                  'query-builder__status-bar__action__toggler--toggled':
                    queryBuilderState.isQueryChatOpened === true,
                },
              )}
              onClick={openQueryChat}
              tabIndex={-1}
              title="Open Query Chat"
            >
              <ChatIcon />
            </button>
          )}
          <button
            className={clsx(
              'query-builder__status-bar__action query-builder__status-bar__compile-btn',
              {
                'query-builder__status-bar__compile-btn--wiggling':
                  queryBuilderState.queryCompileState.isInProgress,
              },
            )}
            disabled={queryBuilderState.queryCompileState.isInProgress}
            onClick={compile}
            tabIndex={-1}
            title="Compile (F9)"
          >
            <HammerIcon />
          </button>
          <button
            className={clsx(
              'query-builder__status-bar__action query-builder__status-bar__action__toggler',
              {
                'query-builder__status-bar__action__toggler--toggled':
                  queryBuilderState.textEditorState.mode ===
                  QueryBuilderTextEditorMode.JSON,
              },
            )}
            onClick={(): void =>
              openLambdaEditor(QueryBuilderTextEditorMode.JSON)
            }
            tabIndex={-1}
            title="View Query Protocol"
          >{`{ }`}</button>
          <button
            className={clsx(
              'query-builder__status-bar__action query-builder__status-bar__action__toggler',
              {
                'query-builder__status-bar__action__toggler--toggled':
                  queryBuilderState.textEditorState.mode ===
                  QueryBuilderTextEditorMode.TEXT,
              },
            )}
            onClick={(): void =>
              openLambdaEditor(QueryBuilderTextEditorMode.TEXT)
            }
            tabIndex={-1}
            title="View Query in Pure"
          >
            <HackerIcon />
          </button>
          <button
            className={clsx(
              'query-builder__status-bar__action query-builder__status-bar__action__toggler',
              {
                'query-builder__status-bar__action__toggler--toggled':
                  !applicationStore.assistantService.isHidden,
              },
            )}
            onClick={toggleAssistant}
            tabIndex={-1}
            title="Toggle assistant"
          >
            <AssistantIcon />
          </button>
        </div>
      </div>
    );
  },
);

const QueryBuilderPostGraphFetchPanel = observer(
  (props: { graphFetchState: QueryBuilderGraphFetchTreeState }) => {
    const { graphFetchState } = props;

    if (!graphFetchState.TEMPORARY__showPostFetchStructurePanel) {
      return null;
    }
    return (
      <QueryBuilderFilterPanel
        queryBuilderState={graphFetchState.queryBuilderState}
      />
    );
  },
);

export const QueryBuilder = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = queryBuilderState.applicationStore;
    const hideQueryBuilderHeader = applicationStore.pluginManager
      .getApplicationPlugins()
      .flatMap((plugin) => plugin.hideBuiltInQueryBuilderActionHeader)
      .reduce((acc, currentValue) => acc || currentValue, false);
    const queryBuilderRef = useRef<HTMLDivElement>(null);
    const isQuerySupported = queryBuilderState.isQuerySupported;
    const fetchStructureState = queryBuilderState.fetchStructureState;
    const showPostFetchStructurePanel =
      queryBuilderState.fetchStructureState.implementation
        .TEMPORARY__showPostFetchStructurePanel;
    const renderPostFetchStructure = (): React.ReactNode => {
      if (fetchStructureState.implementation instanceof QueryBuilderTDSState) {
        return (
          <QueryBuilderPostTDSPanel
            tdsState={fetchStructureState.implementation}
          />
        );
      } else if (
        fetchStructureState.implementation instanceof
        QueryBuilderGraphFetchTreeState
      ) {
        return (
          <QueryBuilderPostGraphFetchPanel
            graphFetchState={fetchStructureState.implementation}
          />
        );
      }
      return null;
    };

    const handleClose = (): void => {
      queryBuilderState.checkEntitlementsState.setShowCheckEntitlementsViewer(
        false,
      );
    };

    useCommands(queryBuilderState);

    useEffect(() => {
      // this condition is for passing all exisitng tests because when we initialize a queryBuilderState for a test,
      // we use an empty RawLambda with an empty class and this useEffect is called earlier than initializeWithQuery()
      if (queryBuilderState.isQuerySupported && queryBuilderState.class) {
        queryBuilderState.changeHistoryState.cacheNewQuery(
          queryBuilderState.buildQuery(),
        );
      }
    }, [queryBuilderState, queryBuilderState.hashCode]);

    useEffect(() => {
      queryBuilderState.setQueryBuilderRef(queryBuilderRef);
    }, [queryBuilderRef, queryBuilderState]);

    return (
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER}
        className="query-builder"
        ref={queryBuilderRef}
      >
        <BackdropContainer
          elementId={QUERY_BUILDER_COMPONENT_ELEMENT_ID.BACKDROP_CONTAINER}
        />
        <div className="query-builder__body">
          <PanelLoadingIndicator
            isLoading={queryBuilderState.resultState.exportState.isInProgress}
          />
          <div className="query-builder__content">
            {!hideQueryBuilderHeader && (
              <div className="query-builder__header">
                <div className="query-builder__header__statuses">
                  {applicationStore.pluginManager
                    .getApplicationPlugins()
                    .filter(
                      (plugin) =>
                        plugin instanceof QueryBuilder_LegendApplicationPlugin,
                    )
                    .flatMap((plugin) =>
                      (
                        plugin as QueryBuilder_LegendApplicationPlugin
                      ).getCoreQueryBuilderStatusConfigurations(),
                    )
                    .map((actionConfig) => (
                      <Fragment key={actionConfig.key}>
                        {actionConfig.renderer(queryBuilderState)}
                      </Fragment>
                    ))}
                </div>
                <div className="query-builder__header__actions">
                  {applicationStore.pluginManager
                    .getApplicationPlugins()
                    .filter(
                      (plugin) =>
                        plugin instanceof QueryBuilder_LegendApplicationPlugin,
                    )
                    .flatMap((plugin) =>
                      (
                        plugin as QueryBuilder_LegendApplicationPlugin
                      ).getCoreQueryBuilderActionConfigurations(),
                    )
                    .map((actionConfig) => (
                      <Fragment key={actionConfig.key}>
                        {actionConfig.renderer(queryBuilderState)}
                      </Fragment>
                    ))}
                </div>
              </div>
            )}
            <div className="query-builder__main">
              <ResizablePanelGroup orientation="horizontal">
                <ResizablePanel minSize={120}>
                  {isQuerySupported ? (
                    <ResizablePanelGroup orientation="vertical">
                      <ResizablePanel size={450} minSize={300}>
                        <QueryBuilderSidebar
                          queryBuilderState={queryBuilderState}
                        >
                          <ResizablePanelGroup orientation="horizontal">
                            {/* explorer panel */}
                            <ResizablePanel minSize={40} direction={1}>
                              <QueryBuilderExplorerPanel
                                queryBuilderState={queryBuilderState}
                              />
                            </ResizablePanel>
                            {/* functions panel */}
                            {queryBuilderState.showFunctionsExplorerPanel && (
                              <ResizablePanelSplitter />
                            )}
                            {queryBuilderState.showFunctionsExplorerPanel && (
                              <ResizablePanel
                                minSize={40}
                                direction={
                                  queryBuilderState.showParametersPanel
                                    ? [1, -1]
                                    : -1
                                }
                              >
                                <QueryBuilderFunctionsExplorerPanel
                                  queryBuilderState={queryBuilderState}
                                />
                              </ResizablePanel>
                            )}
                            {/* parameters panel */}
                            {queryBuilderState.showParametersPanel && (
                              <ResizablePanelSplitter />
                            )}
                            {queryBuilderState.showParametersPanel && (
                              <ResizablePanel minSize={40} direction={-1}>
                                <QueryBuilderParametersPanel
                                  queryBuilderState={queryBuilderState}
                                />
                              </ResizablePanel>
                            )}
                            {/* constants panel */}
                            {queryBuilderState.constantState
                              .showConstantPanel && <ResizablePanelSplitter />}
                            {queryBuilderState.constantState
                              .showConstantPanel && (
                              <ResizablePanel minSize={40} direction={-1}>
                                <QueryBuilderConstantExpressionPanel
                                  queryBuilderState={queryBuilderState}
                                />
                              </ResizablePanel>
                            )}
                          </ResizablePanelGroup>
                        </QueryBuilderSidebar>
                      </ResizablePanel>
                      <ResizablePanelSplitter />
                      <ResizablePanel minSize={300}>
                        <QueryBuilderFetchStructurePanel
                          queryBuilderState={queryBuilderState}
                        />
                      </ResizablePanel>
                      {showPostFetchStructurePanel && (
                        <ResizablePanelSplitter />
                      )}
                      {showPostFetchStructurePanel && (
                        <ResizablePanel minSize={300}>
                          {renderPostFetchStructure()}
                        </ResizablePanel>
                      )}
                    </ResizablePanelGroup>
                  ) : (
                    <QueryBuilderUnsupportedQueryEditor
                      queryBuilderState={queryBuilderState}
                    />
                  )}
                </ResizablePanel>
                {queryBuilderState.isResultPanelHidden ? null : (
                  <ResizablePanelSplitter />
                )}
                {queryBuilderState.isResultPanelHidden ? null : (
                  <ResizablePanel size={300} minSize={40}>
                    <QueryBuilderResultPanel
                      queryBuilderState={queryBuilderState}
                    />
                  </ResizablePanel>
                )}
              </ResizablePanelGroup>
            </div>
          </div>
          {queryBuilderState.textEditorState.mode && (
            <QueryBuilderTextEditor queryBuilderState={queryBuilderState} />
          )}
          {queryBuilderState.checkEntitlementsState
            .showCheckEntitlementsViewer && (
            <Dialog
              open={
                queryBuilderState.checkEntitlementsState
                  .showCheckEntitlementsViewer
              }
              onClose={handleClose}
              classes={{
                root: 'editor-modal__root-container',
                container: 'editor-modal__container',
                paper: 'editor-modal__content',
              }}
            >
              <Modal
                darkMode={
                  !applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled
                }
                className="editor-modal"
              >
                <ModalHeader title="Query Entitlements" />
                <ModalBody className="query-builder__data-access-overview">
                  <div className="query-builder__data-access-overview__container">
                    {queryBuilderState.checkEntitlementsState
                      .dataAccessState ? (
                      <DataAccessOverview
                        dataAccessState={
                          queryBuilderState.checkEntitlementsState
                            .dataAccessState
                        }
                      />
                    ) : (
                      <BlankPanelContent>
                        No data access information available
                      </BlankPanelContent>
                    )}
                  </div>
                </ModalBody>
                <ModalFooter>
                  <ModalFooterButton
                    text="Close"
                    onClick={handleClose}
                    type="secondary"
                  />
                </ModalFooter>
              </Modal>
            </Dialog>
          )}
          {queryBuilderState.watermarkState.isEditingWatermark && (
            <QueryBuilderWatermarkEditor
              queryBuilderState={queryBuilderState}
            />
          )}
        </div>
        <QueryBuilderStatusBar queryBuilderState={queryBuilderState} />
      </div>
    );
  },
);
