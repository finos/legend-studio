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
  HammerIcon,
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
  HackerIcon,
  ControlledDropdownMenu,
  MenuContent,
  MenuContentItem,
  MenuContentItemIcon,
  MenuContentItemLabel,
  CheckIcon,
  CaretDownIcon,
  DiffIcon,
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
  SerializeIcon,
  DataAccessIcon,
  AssistantIcon,
  clsx,
  DocumentationIcon,
  CodeIcon,
  QuestionIcon,
} from '@finos/legend-art';
import { QueryBuilderFilterPanel } from './filter/QueryBuilderFilterPanel.js';
import { QueryBuilderExplorerPanel } from './explorer/QueryBuilderExplorerPanel.js';
import { QueryBuilderSidebar } from './QueryBuilderSideBar.js';
import { QueryBuilderResultPanel } from './result/QueryBuilderResultPanel.js';
import { QueryBuilderTextEditor } from './QueryBuilderTextEditor.js';
import {
  QUERY_BUILDER_LAMBDA_WRITER_MODE,
  type QueryBuilderState,
} from '../stores/QueryBuilderState.js';
import { QueryBuilderTextEditorMode } from '../stores/QueryBuilderTextEditorState.js';
import { QueryBuilderFetchStructurePanel } from './fetch-structure/QueryBuilderFetchStructurePanel.js';
import { QUERY_BUILDER_TEST_ID } from '../__lib__/QueryBuilderTesting.js';
import { flowResult } from 'mobx';
import { QueryBuilderUnsupportedQueryEditor } from './QueryBuilderUnsupportedQueryEditor.js';
import {
  BackdropContainer,
  useCommands,
  ActionAlertActionType,
  ActionAlertType,
  useApplicationStore,
} from '@finos/legend-application';
import { QueryBuilderParametersPanel } from './QueryBuilderParametersPanel.js';
import { QueryBuilderFunctionsExplorerPanel } from './explorer/QueryBuilderFunctionsExplorerPanel.js';
import { QueryBuilderTDSState } from '../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { QueryBuilderDiffViewPanelDiaglog } from './QueryBuilderDiffPanel.js';
import { guaranteeType, returnUndefOnError } from '@finos/legend-shared';
import { QueryBuilderGraphFetchTreeState } from '../stores/fetch-structure/graph-fetch/QueryBuilderGraphFetchTreeState.js';
import { QueryBuilderPostTDSPanel } from './fetch-structure/QueryBuilderPostTDSPanel.js';
import { QueryBuilderConstantExpressionPanel } from './QueryBuilderConstantExpressionPanel.js';
import { QUERY_BUILDER_SETTING_KEY } from '../__lib__/QueryBuilderSetting.js';
import { QUERY_BUILDER_COMPONENT_ELEMENT_ID } from './QueryBuilderComponentElement.js';
import { DataAccessOverview } from './data-access/DataAccessOverview.js';
import { QueryChat } from './QueryChat.js';
import { Fragment, useEffect, useRef } from 'react';
import { RedoButton, UndoButton } from '@finos/legend-lego/application';
import { FETCH_STRUCTURE_IMPLEMENTATION } from '../stores/fetch-structure/QueryBuilderFetchStructureImplementationState.js';
import { onChangeFetchStructureImplementation } from '../stores/fetch-structure/QueryBuilderFetchStructureState.js';
import type { QueryBuilder_LegendApplicationPlugin_Extension } from '../stores/QueryBuilder_LegendApplicationPlugin_Extension.js';
import { QUERY_BUILDER_DOCUMENTATION_KEY } from '../__lib__/QueryBuilderDocumentation.js';
import { QueryBuilderTelemetryHelper } from '../__lib__/QueryBuilderTelemetryHelper.js';
import { QueryBuilderDataCubeDialog } from './data-cube/QueryBuilderDataCube.js';

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
                disabled={
                  !queryBuilderState.changeDetectionState.hasChanged ||
                  !queryBuilderState.canBuildQuery
                }
                onClick={showDiff}
                tabIndex={-1}
                title={
                  !queryBuilderState.canBuildQuery
                    ? 'Please fix query errors to show changes'
                    : queryBuilderState.changeDetectionState.hasChanged
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
            disabled={!queryBuilderState.canBuildQuery}
            title={
              !queryBuilderState.canBuildQuery
                ? 'Please fix query errors to show query protocol'
                : 'Show Query Protocol'
            }
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
            disabled={!queryBuilderState.canBuildQuery}
            title={
              !queryBuilderState.canBuildQuery
                ? 'Please fix query errors to edit in Pure'
                : 'Edit Pure'
            }
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
            disabled={
              applicationStore.config.TEMPORARY__disableVirtualAssistant
            }
            title={
              applicationStore.config.TEMPORARY__disableVirtualAssistant
                ? 'Virtual Assistant is disabled'
                : 'Toggle assistant'
            }
          >
            <AssistantIcon />
          </button>
        </div>
      </div>
    );
  },
);

export const QueryBuilder = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = queryBuilderState.applicationStore;
    const queryBuilderRef = useRef<HTMLDivElement>(null);
    const isQuerySupported = queryBuilderState.isQuerySupported;
    const fetchStructureState = queryBuilderState.fetchStructureState;
    const isTDSState =
      fetchStructureState.implementation instanceof QueryBuilderTDSState;
    const openLambdaEditor = (mode: QueryBuilderTextEditorMode): void =>
      queryBuilderState.textEditorState.openModal(mode);
    const openPure = (): void =>
      queryBuilderState.textEditorState.openModal(
        QueryBuilderTextEditorMode.TEXT,
        true,
      );
    const toggleShowFunctionPanel = (): void => {
      QueryBuilderTelemetryHelper.logEvent_TogglePanelFunctionExplorer(
        applicationStore.telemetryService,
      );
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

    const toggleTypedRelation = (): void => {
      if (queryBuilderState.isFetchStructureTyped) {
        queryBuilderState.setLambdaWriteMode(
          QUERY_BUILDER_LAMBDA_WRITER_MODE.STANDARD,
        );
      } else {
        queryBuilderState.applicationStore.alertService.setActionAlertInfo({
          message:
            'You are about to change to use typed TDS functions. Please proceed with caution as this is still an experimental feature.',
          prompt: ' Do you want to proceed?',
          type: ActionAlertType.CAUTION,
          actions: [
            {
              label: 'Proceed',
              type: ActionAlertActionType.PROCEED_WITH_CAUTION,
              handler: (): void =>
                queryBuilderState.setLambdaWriteMode(
                  QUERY_BUILDER_LAMBDA_WRITER_MODE.TYPED_FETCH_STRUCTURE,
                ),
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

    const editPure = (): void => {
      openLambdaEditor(QueryBuilderTextEditorMode.TEXT);
    };
    const showPure = (): void => {
      openPure();
    };
    const showProtocol = (): void => {
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

    const undo = (): void => {
      queryBuilderState.changeHistoryState.undo();
    };

    const redo = (): void => {
      queryBuilderState.changeHistoryState.redo();
    };

    const queryDocEntry = applicationStore.documentationService.getDocEntry(
      QUERY_BUILDER_DOCUMENTATION_KEY.TUTORIAL_QUERY_BUILDER,
    );
    const frequentlyAskedQuestionEntry =
      applicationStore.documentationService.getDocEntry(
        QUERY_BUILDER_DOCUMENTATION_KEY.FREQUENTLY_ASKED_QUESTIONS,
      );
    const supportTicketsEntry =
      applicationStore.documentationService.getDocEntry(
        QUERY_BUILDER_DOCUMENTATION_KEY.SUPPORT_TICKETS_LINK,
      );
    const openQueryTutorial = (): void => {
      if (queryDocEntry?.url) {
        applicationStore.navigationService.navigator.visitAddress(
          queryDocEntry.url,
        );
      }
    };
    const openFrequentlyAskedQuestions = (): void => {
      if (frequentlyAskedQuestionEntry?.url) {
        applicationStore.navigationService.navigator.visitAddress(
          frequentlyAskedQuestionEntry.url,
        );
      }
    };
    const openSupportTickets = (): void => {
      if (supportTicketsEntry?.url) {
        applicationStore.navigationService.navigator.visitAddress(
          supportTicketsEntry.url,
        );
      }
    };

    const toggleAssistant = (): void =>
      applicationStore.assistantService.toggleAssistant();

    const extraHelpMenuContentItems = applicationStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as QueryBuilder_LegendApplicationPlugin_Extension
          ).getExtraQueryBuilderHelpMenuActionConfigurations?.() ?? [],
      )
      .filter((item) => !item.disableFunc?.(queryBuilderState))
      .map((item) => (
        <MenuContentItem
          key={item.key}
          title={item.title ?? ''}
          disabled={item.disableFunc?.(queryBuilderState) ?? false}
          onClick={() => item.onClick(queryBuilderState)}
        >
          {item.icon && <MenuContentItemIcon>{item.icon}</MenuContentItemIcon>}
          <MenuContentItemLabel>{item.label}</MenuContentItemLabel>
        </MenuContentItem>
      ));

    const compileQuery = applicationStore.guardUnhandledError(() =>
      flowResult(queryBuilderState.compileQuery()),
    );
    const showDiff = (): void =>
      queryBuilderState.changeDetectionState.showDiffViewPanel();

    useEffect(() => {
      // this condition is for passing all exisitng tests because when we initialize a queryBuilderState for a test,
      // we use an empty RawLambda with an empty class and this useEffect is called earlier than initializeWithQuery()
      if (
        queryBuilderState.isQuerySupported &&
        queryBuilderState.class &&
        queryBuilderState.canBuildQuery
      ) {
        const calculatedQuery = returnUndefOnError(() =>
          queryBuilderState.buildQuery(),
        );
        if (calculatedQuery) {
          queryBuilderState.changeHistoryState.cacheNewQuery(calculatedQuery);
        }
      }
    }, [queryBuilderState, queryBuilderState.hashCode]);

    return (
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER}
        className="query-builder"
        ref={queryBuilderRef}
      >
        <BackdropContainer
          elementId={QUERY_BUILDER_COMPONENT_ELEMENT_ID.BACKDROP_CONTAINER}
        />
        <div
          className={clsx('query-builder__body', {
            'query-builder__body__status-bar':
              queryBuilderState.workflowState.showStatusBar,
          })}
        >
          <PanelLoadingIndicator
            isLoading={queryBuilderState.resultState.exportState.isInProgress}
          />
          <div className="query-builder__content">
            <div
              data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_ACTIONS}
              className="query-builder__header"
            >
              <div className="query-builder__header__statuses">
                {queryBuilderState.isCalendarEnabled && (
                  <div
                    className="query-builder__header__status"
                    title="Used calendar aggregation"
                  >
                    <CalendarClockIcon className="query-builder__header__status__icon--calendar" />
                  </div>
                )}
                {applicationStore.pluginManager
                  .getApplicationPlugins()
                  .flatMap(
                    (plugin) =>
                      (
                        plugin as QueryBuilder_LegendApplicationPlugin_Extension
                      ).getExtraQueryBuilderHeaderTitleConfigurations?.() ?? [],
                  )
                  .map((actionConfig) => (
                    <Fragment key={actionConfig.key}>
                      {actionConfig.renderer(queryBuilderState)}
                    </Fragment>
                  ))}
              </div>
              <div className="query-builder__header__actions">
                <div className="query-builder__header__actions__undo-redo">
                  <UndoButton
                    parent={queryBuilderRef}
                    canUndo={
                      queryBuilderState.changeHistoryState.canUndo &&
                      queryBuilderState.isQuerySupported
                    }
                    undo={undo}
                  />
                  <RedoButton
                    parent={queryBuilderRef}
                    canRedo={
                      queryBuilderState.changeHistoryState.canRedo &&
                      queryBuilderState.isQuerySupported
                    }
                    redo={redo}
                  />
                </div>
                {applicationStore.pluginManager
                  .getApplicationPlugins()
                  .flatMap(
                    (plugin) =>
                      (
                        plugin as QueryBuilder_LegendApplicationPlugin_Extension
                      ).getExtraQueryBuilderHeaderActionConfigurations?.() ??
                      [],
                  )
                  .sort((A, B) => B.category - A.category)
                  .map((actionConfig) => (
                    <Fragment key={actionConfig.key}>
                      {actionConfig.renderer(queryBuilderState)}
                    </Fragment>
                  ))}
                <ControlledDropdownMenu
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
                            queryBuilderState.parametersState.parameterStates.filter(
                              (paramState) =>
                                !queryBuilderState.milestoningState.isMilestoningParameter(
                                  paramState.parameter,
                                ),
                            ).length > 0
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
                      <MenuContentItem
                        onClick={onChangeFetchStructureImplementation(
                          isTDSState
                            ? FETCH_STRUCTURE_IMPLEMENTATION.GRAPH_FETCH
                            : FETCH_STRUCTURE_IMPLEMENTATION.TABULAR_DATA_STRUCTURE,
                          fetchStructureState,
                        )}
                        disabled={!queryBuilderState.isQuerySupported}
                      >
                        <MenuContentItemIcon>
                          {isTDSState ? <CheckIcon /> : null}
                        </MenuContentItemIcon>
                        <MenuContentItemLabel>
                          Tabular Data Structure
                        </MenuContentItemLabel>
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
                          ) : (
                            <CalendarClockIcon />
                          )}
                        </MenuContentItemIcon>
                        <MenuContentItemLabel>
                          Enable Calendar
                        </MenuContentItemLabel>
                      </MenuContentItem>
                      <MenuContentItem
                        onClick={toggleTypedRelation}
                        disabled={
                          !queryBuilderState.isQuerySupported ||
                          !(
                            queryBuilderState.fetchStructureState
                              .implementation instanceof QueryBuilderTDSState
                          )
                        }
                      >
                        <MenuContentItemIcon>
                          {queryBuilderState.isFetchStructureTyped ? (
                            <CheckIcon />
                          ) : null}
                        </MenuContentItemIcon>
                        <MenuContentItemLabel>
                          Enable Typed TDS (BETA)
                        </MenuContentItemLabel>
                      </MenuContentItem>
                      <MenuContentDivider />
                      <MenuContentItem
                        onClick={openCheckEntitlmentsEditor}
                        disabled={
                          (queryBuilderState.isQuerySupported &&
                            queryBuilderState.fetchStructureState
                              .implementation instanceof QueryBuilderTDSState &&
                            queryBuilderState.fetchStructureState.implementation
                              .projectionColumns.length === 0) ||
                          !queryBuilderState.canBuildQuery
                        }
                        title={
                          !queryBuilderState.canBuildQuery
                            ? 'Please fix query errors to check entitlements'
                            : ''
                        }
                      >
                        <MenuContentItemIcon>
                          <DataAccessIcon />
                        </MenuContentItemIcon>
                        <MenuContentItemLabel>
                          Check Entitlements
                        </MenuContentItemLabel>
                      </MenuContentItem>
                      <MenuContentItem
                        onClick={editPure}
                        disabled={!queryBuilderState.canBuildQuery}
                        title={
                          !queryBuilderState.canBuildQuery
                            ? 'Please fix query errors to edit in Pure'
                            : undefined
                        }
                      >
                        <MenuContentItemIcon>
                          <HackerIcon />
                        </MenuContentItemIcon>
                        <MenuContentItemLabel>Edit Pure</MenuContentItemLabel>
                      </MenuContentItem>
                      <MenuContentItem
                        onClick={showPure}
                        disabled={!queryBuilderState.canBuildQuery}
                        title={
                          !queryBuilderState.canBuildQuery
                            ? 'Please fix query errors to edit in Pure'
                            : undefined
                        }
                      >
                        <MenuContentItemIcon>
                          <CodeIcon />
                        </MenuContentItemIcon>
                        <MenuContentItemLabel>Show Pure</MenuContentItemLabel>
                      </MenuContentItem>
                      <MenuContentItem
                        onClick={showProtocol}
                        disabled={!queryBuilderState.canBuildQuery}
                        title={
                          !queryBuilderState.canBuildQuery
                            ? 'Please fix query errors to show query protocol'
                            : undefined
                        }
                      >
                        <MenuContentItemIcon>
                          <SerializeIcon />
                        </MenuContentItemIcon>
                        <MenuContentItemLabel>
                          Show Protocol
                        </MenuContentItemLabel>
                      </MenuContentItem>
                      <MenuContentItem onClick={compileQuery}>
                        <MenuContentItemIcon>
                          <HammerIcon />
                        </MenuContentItemIcon>
                        <MenuContentItemLabel>
                          Compile Query (F9)
                        </MenuContentItemLabel>
                      </MenuContentItem>
                      {queryBuilderState.changeDetectionState.initState
                        .hasCompleted && (
                        <MenuContentItem
                          disabled={
                            !queryBuilderState.changeDetectionState.hasChanged
                          }
                          onClick={showDiff}
                          title={
                            queryBuilderState.changeDetectionState.hasChanged
                              ? 'Show changes'
                              : 'Query has not been changed'
                          }
                        >
                          <MenuContentItemIcon>
                            <DiffIcon />
                          </MenuContentItemIcon>
                          <MenuContentItemLabel>
                            Show Query Diff
                          </MenuContentItemLabel>
                        </MenuContentItem>
                      )}
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
                </ControlledDropdownMenu>
                <ControlledDropdownMenu
                  className="query-builder__header__advanced-dropdown"
                  content={
                    <MenuContent>
                      {extraHelpMenuContentItems}
                      {queryDocEntry && (
                        <MenuContentItem onClick={openQueryTutorial}>
                          <MenuContentItemIcon>
                            <DocumentationIcon />
                          </MenuContentItemIcon>
                          <MenuContentItemLabel>
                            Open Documentation
                          </MenuContentItemLabel>
                        </MenuContentItem>
                      )}
                      {frequentlyAskedQuestionEntry && (
                        <MenuContentItem onClick={openFrequentlyAskedQuestions}>
                          <MenuContentItemIcon>
                            <QuestionIcon />
                          </MenuContentItemIcon>
                          <MenuContentItemLabel>
                            Frequently Asked Questions
                          </MenuContentItemLabel>
                        </MenuContentItem>
                      )}
                      {supportTicketsEntry && (
                        <MenuContentItem onClick={openSupportTickets}>
                          <MenuContentItemIcon>
                            <QuestionIcon />
                          </MenuContentItemIcon>
                          <MenuContentItemLabel>
                            Open Support Tickets
                          </MenuContentItemLabel>
                        </MenuContentItem>
                      )}
                      <MenuContentItem
                        onClick={toggleAssistant}
                        disabled={
                          applicationStore.config
                            .TEMPORARY__disableVirtualAssistant
                        }
                        title={
                          applicationStore.config
                            .TEMPORARY__disableVirtualAssistant
                            ? 'Virtual Assistant is disabled'
                            : ''
                        }
                      >
                        <MenuContentItemIcon>
                          {!applicationStore.assistantService.isHidden ? (
                            <CheckIcon />
                          ) : (
                            <AssistantIcon />
                          )}
                        </MenuContentItemIcon>
                        <MenuContentItemLabel>
                          Show Virtual Assistant
                        </MenuContentItemLabel>
                      </MenuContentItem>
                    </MenuContent>
                  }
                >
                  <div
                    className="query-builder__header__advanced-dropdown__label"
                    title="See more options"
                  >
                    Help...
                  </div>
                  <CaretDownIcon className="query-builder__header__advanced-dropdown__icon" />
                </ControlledDropdownMenu>
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
                      {queryBuilderState.isQueryChatOpened && (
                        <ResizablePanelSplitter />
                      )}
                      {queryBuilderState.isQueryChatOpened && (
                        <ResizablePanel size={450}>
                          <QueryChat queryBuilderState={queryBuilderState} />
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
          {queryBuilderState.changeDetectionState.diffViewState && (
            <QueryBuilderDiffViewPanelDiaglog
              diffViewState={
                queryBuilderState.changeDetectionState.diffViewState
              }
            />
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
          {queryBuilderState.isCubeEnabled && (
            <QueryBuilderDataCubeDialog queryBuilderState={queryBuilderState} />
          )}
        </div>
        {queryBuilderState.workflowState.showStatusBar ? (
          <QueryBuilderStatusBar queryBuilderState={queryBuilderState} />
        ) : null}
      </div>
    );
  },
);
