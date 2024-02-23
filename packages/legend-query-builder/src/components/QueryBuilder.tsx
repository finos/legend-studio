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
  DropdownMenu,
  MenuContent,
  MenuContentItem,
  MenuContentItemIcon,
  MenuContentItemLabel,
  CheckIcon,
  CaretDownIcon,
  DiffIcon,
  WaterDropIcon,
  AssistantIcon,
  MenuContentDivider,
  Dialog,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  BlankPanelContent,
  ModalFooterButton,
  CalendarClockIcon,
  ChatIcon,
  PanelLoadingIndicator,
  UndoIcon,
  RedoIcon,
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
  ActionAlertActionType,
  ActionAlertType,
} from '@finos/legend-application';
import { QueryBuilderParametersPanel } from './QueryBuilderParametersPanel.js';
import { QueryBuilderFunctionsExplorerPanel } from './explorer/QueryBuilderFunctionsExplorerPanel.js';
import { QueryBuilderTDSState } from '../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { QueryBuilderDiffViewPanelDiaglog } from './QueryBuilderDiffPanel.js';
import { guaranteeType } from '@finos/legend-shared';
import { QueryBuilderGraphFetchTreeState } from '../stores/fetch-structure/graph-fetch/QueryBuilderGraphFetchTreeState.js';
import { QueryBuilderPostTDSPanel } from './fetch-structure/QueryBuilderPostTDSPanel.js';
import { QueryBuilderWatermarkEditor } from './watermark/QueryBuilderWatermark.js';
import { QueryBuilderConstantExpressionPanel } from './QueryBuilderConstantExpressionPanel.js';
import { QUERY_BUILDER_SETTING_KEY } from '../__lib__/QueryBuilderSetting.js';
import { QUERY_BUILDER_COMPONENT_ELEMENT_ID } from './QueryBuilderComponentElement.js';
import { DataAccessOverview } from './data-access/DataAccessOverview.js';
import { QueryChat } from './QueryChat.js';
import { useCallback, useEffect, useRef } from 'react';

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
    const queryBuilderRef = useRef<HTMLDivElement>(null);
    const isQuerySupported = queryBuilderState.isQuerySupported;
    const fetchStructureState = queryBuilderState.fetchStructureState;
    const isTDSState =
      fetchStructureState.implementation instanceof QueryBuilderTDSState;
    const openLambdaEditor = (mode: QueryBuilderTextEditorMode): void =>
      queryBuilderState.textEditorState.openModal(mode);
    const toggleShowFunctionPanel = (): void => {
      queryBuilderState.setShowFunctionsExplorerPanel(
        !queryBuilderState.showFunctionsExplorerPanel,
      );
    };
    const toggleShowParameterPanel = (): void => {
      queryBuilderState.setShowParametersPanel(
        !queryBuilderState.showParametersPanel,
      );
    };
    const toggleConstantPanel = (): void => {
      queryBuilderState.constantState.setShowConstantPanel(
        !queryBuilderState.constantState.showConstantPanel,
      );
    };
    const toggleShowFilterPanel = (): void => {
      queryBuilderState.filterState.setShowPanel(
        !queryBuilderState.filterState.showPanel,
      );
    };
    const toggleShowPostFilterPanel = (): void => {
      if (
        queryBuilderState.fetchStructureState.implementation instanceof
        QueryBuilderTDSState
      ) {
        const tdsState = queryBuilderState.fetchStructureState.implementation;
        tdsState.setShowPostFilterPanel(!tdsState.showPostFilterPanel);
        queryBuilderState.applicationStore.settingService.persistValue(
          QUERY_BUILDER_SETTING_KEY.SHOW_POST_FILTER_PANEL,
          tdsState.showPostFilterPanel,
        );
      }
    };

    const openWatermark = (): void => {
      queryBuilderState.watermarkState.setIsEditingWatermark(true);
    };

    const toggleEnableCalendar = (): void => {
      if (queryBuilderState.isCalendarEnabled) {
        queryBuilderState.applicationStore.alertService.setActionAlertInfo({
          message:
            'You are about to disable calendar aggregation operations. This will remove all the calendar aggreagtions you added to the query.',
          prompt: ' Do you want to proceed?',
          type: ActionAlertType.CAUTION,
          actions: [
            {
              label: 'Proceed',
              type: ActionAlertActionType.PROCEED_WITH_CAUTION,
              handler: (): void => {
                if (
                  queryBuilderState.fetchStructureState
                    .implementation instanceof QueryBuilderTDSState
                ) {
                  queryBuilderState.fetchStructureState.implementation.aggregationState.disableCalendar();
                }
              },
            },
            {
              label: 'Cancel',
              type: ActionAlertActionType.PROCEED,
              default: true,
            },
          ],
        });
      } else {
        queryBuilderState.applicationStore.alertService.setActionAlertInfo({
          message:
            'You are about to enable calendar aggregation operations. This will let you add calendar functions to the aggregation operations that you perform on projection columns, but this would require your calendar database to be included in your database.',
          prompt: ' Do you want to proceed?',
          type: ActionAlertType.CAUTION,
          actions: [
            {
              label: 'Proceed',
              type: ActionAlertActionType.PROCEED_WITH_CAUTION,
              handler: (): void => queryBuilderState.setIsCalendarEnabled(true),
            },
            {
              label: 'Cancel',
              type: ActionAlertActionType.PROCEED,
              default: true,
            },
          ],
        });
      }
    };

    const editQueryInPure = (): void => {
      openLambdaEditor(QueryBuilderTextEditorMode.TEXT);
    };
    const showQueryProtocol = (): void => {
      openLambdaEditor(QueryBuilderTextEditorMode.JSON);
    };

    const openCheckEntitlmentsEditor = (): void => {
      queryBuilderState.checkEntitlementsState.setShowCheckEntitlementsViewer(
        true,
      );
    };
    const handleClose = (): void => {
      queryBuilderState.checkEntitlementsState.setShowCheckEntitlementsViewer(
        false,
      );
    };
    useCommands(queryBuilderState);
    const toggleShowOLAPGroupByPanel = (): void => {
      if (isTDSState) {
        const tdsState = guaranteeType(
          queryBuilderState.fetchStructureState.implementation,
          QueryBuilderTDSState,
        );
        tdsState.setShowWindowFuncPanel(!tdsState.showWindowFuncPanel);
      }
    };
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

    const undo = useCallback((): void => {
      queryBuilderState.changeHistoryState.undo();
    }, [queryBuilderState.changeHistoryState]);

    const redo = useCallback((): void => {
      queryBuilderState.changeHistoryState.redo();
    }, [queryBuilderState.changeHistoryState]);

    useEffect(() => {
      // this condition is for passing all exisitng tests because when we initialize a queryBuilderState for a test,
      // we use a empty RawLambda with an empty class and this useEffect is called earlier than initializeWithQuery()
      if (
        (queryBuilderState.isQuerySupported && queryBuilderState.class) ||
        !queryBuilderState.isQuerySupported
      ) {
        queryBuilderState.changeHistoryState.cacheNewQuery(
          queryBuilderState.buildQuery(),
        );
      }
    }, [queryBuilderState, queryBuilderState.hashCode]);

    // bind ctl + z to undo, ctl + y to redo
    useEffect(() => {
      const onCtrlZ = (event: KeyboardEvent): void => {
        if (
          event.ctrlKey &&
          event.key === 'z' &&
          // make undo/redo is contextual e.g. if there is a new modal open e.g. parameter modal, it won't close this modal and modify underlying query
          queryBuilderRef.current &&
          (queryBuilderRef.current === document.activeElement ||
            document.activeElement?.contains(queryBuilderRef.current))
        ) {
          event.preventDefault();
          undo();
        }
      };
      const onCtrlY = (event: KeyboardEvent): void => {
        if (
          event.ctrlKey &&
          event.key === 'y' &&
          // make undo/redo is contextual e.g. if there is a new modal open e.g. parameter modal, it won't close this modal and modify underlying query
          queryBuilderRef.current &&
          (queryBuilderRef.current === document.activeElement ||
            document.activeElement?.contains(queryBuilderRef.current))
        ) {
          event.preventDefault();
          redo();
        }
      };
      if (
        queryBuilderRef.current &&
        (queryBuilderRef.current === document.activeElement ||
          document.activeElement?.contains(queryBuilderRef.current))
      ) {
        document.addEventListener('keydown', onCtrlZ);
        document.addEventListener('keydown', onCtrlY);
      }
      return () => {
        document.removeEventListener('keydown', onCtrlZ);
        document.addEventListener('keydown', onCtrlY);
      };
    }, [redo, undo]);

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
            <div className="query-builder__header">
              <div className="query-builder__header__statuses">
                {queryBuilderState.watermarkState.value && (
                  <button
                    className="query-builder__header__status query-builder__header__status--action"
                    onClick={openWatermark}
                    tabIndex={-1}
                    title="Used watermark"
                  >
                    <WaterDropIcon />
                  </button>
                )}
                {queryBuilderState.isCalendarEnabled && (
                  <div
                    className="query-builder__header__status"
                    title="Used calendar aggregation"
                  >
                    <CalendarClockIcon className="query-builder__header__status__icon--calendar" />
                  </div>
                )}
                {queryBuilderState.watermarkState.isEditingWatermark && (
                  <QueryBuilderWatermarkEditor
                    queryBuilderState={queryBuilderState}
                  />
                )}
              </div>
              <div className="query-builder__header__actions">
                <div className="query-builder__header__actions__undo-redo">
                  <button
                    className="query-builder__header__actions__undo-redo__button"
                    onClick={undo}
                    tabIndex={-1}
                    disabled={!queryBuilderState.changeHistoryState.canUndo}
                  >
                    <UndoIcon />
                    <div className="query-builder__header__actions__undo-redo__button__label">
                      Undo
                    </div>
                  </button>
                  <button
                    className="query-builder__header__actions__undo-redo__button"
                    onClick={redo}
                    tabIndex={-1}
                    disabled={!queryBuilderState.changeHistoryState.canRedo}
                  >
                    <RedoIcon />
                    <div className="query-builder__header__actions__undo-redo__button__label">
                      Redo
                    </div>
                  </button>
                </div>
                <DropdownMenu
                  className="query-builder__header__advanced-dropdown"
                  title="Show Advanced Menu..."
                  content={
                    <MenuContent>
                      <MenuContentItem
                        onClick={toggleShowFunctionPanel}
                        disabled={!queryBuilderState.isQuerySupported}
                      >
                        <MenuContentItemIcon>
                          {queryBuilderState.showFunctionsExplorerPanel ? (
                            <CheckIcon />
                          ) : null}
                        </MenuContentItemIcon>
                        <MenuContentItemLabel>
                          Show Function(s)
                        </MenuContentItemLabel>
                      </MenuContentItem>
                      {!queryBuilderState.isParameterSupportDisabled && (
                        <MenuContentItem
                          onClick={toggleShowParameterPanel}
                          disabled={
                            !queryBuilderState.isQuerySupported ||
                            queryBuilderState.parametersState.parameterStates
                              .length > 0
                          }
                        >
                          <MenuContentItemIcon>
                            {queryBuilderState.showParametersPanel ? (
                              <CheckIcon />
                            ) : null}
                          </MenuContentItemIcon>
                          <MenuContentItemLabel>
                            Show Parameter(s)
                          </MenuContentItemLabel>
                        </MenuContentItem>
                      )}
                      {
                        <MenuContentItem
                          onClick={toggleConstantPanel}
                          disabled={
                            !queryBuilderState.isQuerySupported ||
                            queryBuilderState.constantState.constants.length > 0
                          }
                        >
                          <MenuContentItemIcon>
                            {queryBuilderState.constantState
                              .showConstantPanel ? (
                              <CheckIcon />
                            ) : null}
                          </MenuContentItemIcon>
                          <MenuContentItemLabel>
                            Show Constant(s)
                          </MenuContentItemLabel>
                        </MenuContentItem>
                      }
                      <MenuContentItem
                        onClick={toggleShowFilterPanel}
                        disabled={
                          !queryBuilderState.isQuerySupported ||
                          Array.from(
                            queryBuilderState.filterState.nodes.values(),
                          ).length > 0
                        }
                      >
                        <MenuContentItemIcon>
                          {queryBuilderState.filterState.showPanel ? (
                            <CheckIcon />
                          ) : null}
                        </MenuContentItemIcon>
                        <MenuContentItemLabel>Show Filter</MenuContentItemLabel>
                      </MenuContentItem>
                      <MenuContentDivider />
                      <MenuContentItem
                        onClick={toggleShowOLAPGroupByPanel}
                        disabled={
                          !queryBuilderState.isQuerySupported ||
                          !(
                            queryBuilderState.fetchStructureState
                              .implementation instanceof QueryBuilderTDSState
                          ) ||
                          queryBuilderState.fetchStructureState.implementation
                            .windowState.windowColumns.length > 0
                        }
                      >
                        <MenuContentItemIcon>
                          {isTDSState &&
                          guaranteeType(
                            queryBuilderState.fetchStructureState
                              .implementation,
                            QueryBuilderTDSState,
                          ).showWindowFuncPanel ? (
                            <CheckIcon />
                          ) : null}
                        </MenuContentItemIcon>
                        <MenuContentItemLabel>
                          Show Window Function(s)
                        </MenuContentItemLabel>
                      </MenuContentItem>
                      <MenuContentItem
                        onClick={toggleShowPostFilterPanel}
                        disabled={
                          !queryBuilderState.isQuerySupported ||
                          !(
                            queryBuilderState.fetchStructureState
                              .implementation instanceof QueryBuilderTDSState
                          ) ||
                          Array.from(
                            queryBuilderState.fetchStructureState.implementation.postFilterState.nodes.values(),
                          ).length > 0
                        }
                      >
                        <MenuContentItemIcon>
                          {queryBuilderState.fetchStructureState
                            .implementation instanceof QueryBuilderTDSState &&
                          queryBuilderState.fetchStructureState.implementation
                            .showPostFilterPanel ? (
                            <CheckIcon />
                          ) : null}
                        </MenuContentItemIcon>
                        <MenuContentItemLabel>
                          Show Post-Filter
                        </MenuContentItemLabel>
                      </MenuContentItem>
                      <MenuContentItem onClick={openWatermark}>
                        <MenuContentItemIcon>{null}</MenuContentItemIcon>
                        <MenuContentItemLabel>
                          Show Watermark
                        </MenuContentItemLabel>
                      </MenuContentItem>
                      <MenuContentItem
                        onClick={toggleEnableCalendar}
                        disabled={
                          !queryBuilderState.isQuerySupported ||
                          !(
                            queryBuilderState.fetchStructureState
                              .implementation instanceof QueryBuilderTDSState
                          )
                        }
                      >
                        <MenuContentItemIcon>
                          {queryBuilderState.isCalendarEnabled ? (
                            <CheckIcon />
                          ) : null}
                        </MenuContentItemIcon>
                        <MenuContentItemLabel>
                          Enable Calendar
                        </MenuContentItemLabel>
                      </MenuContentItem>
                      <MenuContentDivider />
                      <MenuContentItem
                        onClick={openCheckEntitlmentsEditor}
                        disabled={
                          queryBuilderState.isQuerySupported &&
                          queryBuilderState.fetchStructureState
                            .implementation instanceof QueryBuilderTDSState &&
                          queryBuilderState.fetchStructureState.implementation
                            .projectionColumns.length === 0
                        }
                      >
                        <MenuContentItemIcon />
                        <MenuContentItemLabel>
                          Check Entitlements
                        </MenuContentItemLabel>
                      </MenuContentItem>
                      <MenuContentItem onClick={editQueryInPure}>
                        <MenuContentItemIcon />
                        <MenuContentItemLabel>
                          Edit Query in Pure
                        </MenuContentItemLabel>
                      </MenuContentItem>
                      <MenuContentItem onClick={showQueryProtocol}>
                        <MenuContentItemIcon />
                        <MenuContentItemLabel>
                          Show Query Protocol
                        </MenuContentItemLabel>
                      </MenuContentItem>
                    </MenuContent>
                  }
                  menuProps={{
                    anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                    transformOrigin: { vertical: 'top', horizontal: 'right' },
                    elevation: 7,
                  }}
                >
                  <div className="query-builder__header__advanced-dropdown__label">
                    Advanced
                  </div>
                  <CaretDownIcon className="query-builder__header__advanced-dropdown__icon" />
                </DropdownMenu>
              </div>
            </div>
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
              <Modal darkMode={true} className="editor-modal">
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
                  <ModalFooterButton text="Close" onClick={handleClose} />
                </ModalFooter>
              </Modal>
            </Dialog>
          )}
        </div>
        <QueryBuilderStatusBar queryBuilderState={queryBuilderState} />
      </div>
    );
  },
);
