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
} from '@finos/legend-art';
import { QueryBuilderFilterPanel } from './filter/QueryBuilderFilterPanel.js';
import { QueryBuilderExplorerPanel } from './explorer/QueryBuilderExplorerPanel.js';
import { QueryBuilderSidebar } from './QueryBuilderSideBar.js';
import { QueryBuilderResultPanel } from './QueryBuilderResultPanel.js';
import { QueryBuilderTextEditor } from './QueryBuilderTextEditor.js';
import type { QueryBuilderState } from '../stores/QueryBuilderState.js';
import { QueryBuilderTextEditorMode } from '../stores/QueryBuilderTextEditorState.js';
import { QueryBuilderFetchStructurePanel } from './fetch-structure/QueryBuilderFetchStructurePanel.js';
import { QUERY_BUILDER_TEST_ID } from './QueryBuilder_TestID.js';
import { flowResult } from 'mobx';
import { QueryBuilderUnsupportedQueryEditor } from './QueryBuilderUnsupportedQueryEditor.js';
import {
  BackdropContainer,
  useApplicationStore,
  useCommands,
  LEGEND_APPLICATION_DOCUMENTATION_KEY,
} from '@finos/legend-application';
import { QueryBuilderParametersPanel } from './QueryBuilderParametersPanel.js';
import { QueryBuilderFunctionsExplorerPanel } from './explorer/QueryBuilderFunctionsExplorerPanel.js';
import { QueryBuilderTDSState } from '../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { QueryBuilderDiffViewPanel } from './QueryBuilderDiffPanel.js';
import { guaranteeType } from '@finos/legend-shared';
import { QueryBuilderGraphFetchTreeState } from '../stores/fetch-structure/graph-fetch/QueryBuilderGraphFetchTreeState.js';
import { QueryBuilderPostTDSPanel } from './fetch-structure/QueryBuilderPostTDSPanel.js';
import { QueryBuilderWatermarkEditor } from './watermark/QueryBuilderWatermark.js';
import { QueryBuilderConstantExpressionPanel } from './QueryBuilderConstantExpressionPanel.js';
import { QueryBuilder_LegendApplicationPlugin } from './QueryBuilder_LegendApplicationPlugin.js';

export const QUERY_BUILDER_BACKDROP_CONTAINER_ID =
  'query-builder.backdrop-container';

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
                <QueryBuilderDiffViewPanel
                  diffViewState={
                    queryBuilderState.changeDetectionState.diffViewState
                  }
                />
              )}
            </>
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

const renderCheckEntitlementsEditor = (
  queryBuilderState: QueryBuilderState,
  plugins: QueryBuilder_LegendApplicationPlugin[],
): React.ReactNode => {
  const checkEntitlementsEditorRenderers = plugins.flatMap(
    (plugin) => plugin.getCheckEntitlementsEditorRender() ?? [],
  );
  for (const editorRenderer of checkEntitlementsEditorRenderers) {
    const editor = editorRenderer(queryBuilderState);
    if (editor) {
      return editor;
    }
  }

  const handleClose = (): void => {
    queryBuilderState.checkEntitlementsState.setIsCheckingEntitlements(false);
  };

  return (
    <Dialog
      open={queryBuilderState.checkEntitlementsState.isCheckingEntitlements}
      onClose={handleClose}
      classes={{
        root: 'editor-modal__root-container',
        container: 'editor-modal__container',
        paper: 'editor-modal__content',
      }}
    >
      <Modal darkMode={true} className="editor-modal">
        <ModalHeader title="Query Entitlements" />
        <ModalBody>
          <BlankPanelContent>
            Check Entitlements is not supported yet
          </BlankPanelContent>
        </ModalBody>
        <ModalFooter>
          <ModalFooterButton text="Close" onClick={handleClose} />
        </ModalFooter>
      </Modal>
    </Dialog>
  );
};

export const QueryBuilder = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const isQuerySupported = queryBuilderState.isQuerySupported;
    const fetchStructureState = queryBuilderState.fetchStructureState;
    const isTDSState =
      fetchStructureState.implementation instanceof QueryBuilderTDSState;
    const applicationStore = queryBuilderState.applicationStore;
    const openLambdaEditor = (mode: QueryBuilderTextEditorMode): void =>
      queryBuilderState.textEditorState.openModal(mode);
    const toggleAssistant = (): void =>
      applicationStore.assistantService.toggleAssistant();
    const queryDocEntry = applicationStore.documentationService.getDocEntry(
      LEGEND_APPLICATION_DOCUMENTATION_KEY.TUTORIAL_QUERY_BUILDER,
    );
    const openQueryTutorial = (): void => {
      if (queryDocEntry?.url) {
        applicationStore.navigator.visitAddress(queryDocEntry.url);
      }
    };
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
      }
    };

    const openWatermark = (): void => {
      queryBuilderState.watermarkState.setIsEditingWatermark(true);
    };
    const editQueryInPure = (): void => {
      openLambdaEditor(QueryBuilderTextEditorMode.TEXT);
    };
    const showQueryProtocol = (): void => {
      openLambdaEditor(QueryBuilderTextEditorMode.JSON);
    };

    const openCheckEntitlmentsEditor = (): void => {
      queryBuilderState.checkEntitlementsState.setIsCheckingEntitlements(true);
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
    return (
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER}
        className="query-builder"
      >
        <BackdropContainer elementID={QUERY_BUILDER_BACKDROP_CONTAINER_ID} />
        <div className="query-builder__body">
          <div className="query-builder__content">
            <div className="query-builder__sub-header">
              <div className="query-builder__sub-header__content__icons">
                {queryBuilderState.watermarkState.value && (
                  <>
                    <button
                      className="panel__header__action"
                      onClick={openWatermark}
                      tabIndex={-1}
                      title="Show Watermark"
                    >
                      <WaterDropIcon />
                    </button>
                  </>
                )}
                {queryBuilderState.watermarkState.isEditingWatermark && (
                  <QueryBuilderWatermarkEditor
                    queryBuilderState={queryBuilderState}
                  />
                )}
              </div>
              <div className="query-builder__sub-header__content__actions">
                <div className="query-builder__sub-header__actions">
                  <DropdownMenu
                    className="query-builder__sub-header__custom-action"
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
                          <MenuContentItemLabel className="query-builder__sub-header__menu-content">
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
                            <MenuContentItemLabel className="query-builder__sub-header__menu-content">
                              Show Parameter(s)
                            </MenuContentItemLabel>
                          </MenuContentItem>
                        )}
                        {
                          <MenuContentItem
                            onClick={toggleConstantPanel}
                            disabled={
                              !queryBuilderState.isQuerySupported ||
                              queryBuilderState.constantState.constants.length >
                                0
                            }
                          >
                            <MenuContentItemIcon>
                              {queryBuilderState.constantState
                                .showConstantPanel ? (
                                <CheckIcon />
                              ) : null}
                            </MenuContentItemIcon>
                            <MenuContentItemLabel className="query-builder__sub-header__menu-content">
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
                          <MenuContentItemLabel className="query-builder__sub-header__menu-content">
                            Show Filter
                          </MenuContentItemLabel>
                        </MenuContentItem>
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
                          <MenuContentItemLabel className="query-builder__sub-header__menu-content">
                            Show Window Funcs
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
                          <MenuContentItemLabel className="query-builder__sub-header__menu-content">
                            Show Post-Filter
                          </MenuContentItemLabel>
                        </MenuContentItem>
                        <MenuContentItem onClick={openWatermark}>
                          <MenuContentItemIcon>{null}</MenuContentItemIcon>
                          <MenuContentItemLabel className="query-builder__sub-header__menu-content">
                            Show Watermark
                          </MenuContentItemLabel>
                        </MenuContentItem>
                        <MenuContentItem
                          onClick={openCheckEntitlmentsEditor}
                          disabled={
                            !(
                              queryBuilderState.fetchStructureState
                                .implementation instanceof QueryBuilderTDSState
                            ) ||
                            queryBuilderState.fetchStructureState.implementation
                              .projectionColumns.length === 0
                          }
                        >
                          <MenuContentItemIcon>{null}</MenuContentItemIcon>
                          <MenuContentItemLabel className="query-builder__sub-header__menu-content">
                            Check Entitlements
                          </MenuContentItemLabel>
                        </MenuContentItem>
                        <MenuContentDivider />
                        <MenuContentItem onClick={editQueryInPure}>
                          <MenuContentItemIcon>{null}</MenuContentItemIcon>
                          <MenuContentItemLabel className="query-builder__sub-header__menu-content">
                            Edit Query in Pure
                          </MenuContentItemLabel>
                        </MenuContentItem>
                        <MenuContentItem onClick={showQueryProtocol}>
                          <MenuContentItemIcon>{null}</MenuContentItemIcon>
                          <MenuContentItemLabel className="query-builder__sub-header__menu-content">
                            Show Query Protocol
                          </MenuContentItemLabel>
                        </MenuContentItem>
                        <MenuContentDivider />
                        {queryDocEntry && (
                          <MenuContentItem onClick={openQueryTutorial}>
                            <MenuContentItemIcon>{null}</MenuContentItemIcon>
                            <MenuContentItemLabel className="query-builder__sub-header__menu-content">
                              Open Documentation
                            </MenuContentItemLabel>
                          </MenuContentItem>
                        )}
                        <MenuContentItem onClick={toggleAssistant}>
                          <MenuContentItemIcon>
                            {!applicationStore.assistantService.isHidden ? (
                              <CheckIcon />
                            ) : null}
                          </MenuContentItemIcon>
                          <MenuContentItemLabel className="query-builder__sub-header__menu-content">
                            Show Virtual Assistant
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
                    <div className="query-builder__sub-header__custom-action__label">
                      Advanced
                    </div>
                    <CaretDownIcon className="query-builder__sub-header__custom-action__icon" />
                  </DropdownMenu>
                </div>
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
          {queryBuilderState.checkEntitlementsState.isCheckingEntitlements &&
            renderCheckEntitlementsEditor(
              queryBuilderState,
              applicationStore.pluginManager
                .getApplicationPlugins()
                .filter(
                  (plugin) =>
                    plugin instanceof QueryBuilder_LegendApplicationPlugin,
                ) as QueryBuilder_LegendApplicationPlugin[],
            )}
        </div>
        <QueryBuilderStatusBar queryBuilderState={queryBuilderState} />
      </div>
    );
  },
);
