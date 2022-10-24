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
} from '@finos/legend-application';
import { QueryBuilderParametersPanel } from './QueryBuilderParametersPanel.js';
import { QueryBuilderFunctionsExplorerPanel } from './explorer/QueryBuilderFunctionsExplorerPanel.js';
import { QueryBuilderTDSState } from '../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { QueryBuilderDiffViewPanel } from './QueryBuilderDiffPanel.js';
import { guaranteeType } from '@finos/legend-shared';
import { QueryBuilderGraphFetchTreeState } from '../stores/fetch-structure/graph-fetch/QueryBuilderGraphFetchTreeState.js';
import { QueryBuilderPostTDSPanel } from './fetch-structure/QueryBuilderPostTDSPanel.js';

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
            title="View Query JSON"
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
    const isQuerySupported = queryBuilderState.isQuerySupported;
    const fetchStructureState = queryBuilderState.fetchStructureState;
    const isTDSState =
      fetchStructureState.implementation instanceof QueryBuilderTDSState;
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

    useCommands(queryBuilderState);
    const toggleShowOlapGroupByPanel = (): void => {
      if (isTDSState) {
        const tdsState = guaranteeType(
          queryBuilderState.fetchStructureState.implementation,
          QueryBuilderTDSState,
        );
        tdsState.setShowOlapGroupByPanel(!tdsState.showOlapGroupByPanel);
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
                      {/* TODO?: consider hiding this menu option when the fetch-structure is not TDS */}
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
                        onClick={toggleShowOlapGroupByPanel}
                        disabled={
                          !queryBuilderState.isQuerySupported ||
                          !(
                            queryBuilderState.fetchStructureState
                              .implementation instanceof QueryBuilderTDSState
                          ) ||
                          queryBuilderState.fetchStructureState.implementation
                            .olapGroupByState.olapColumns.length > 0
                        }
                      >
                        <MenuContentItemIcon>
                          {isTDSState &&
                          guaranteeType(
                            queryBuilderState.fetchStructureState
                              .implementation,
                            QueryBuilderTDSState,
                          ).showOlapGroupByPanel ? (
                            <CheckIcon />
                          ) : null}
                        </MenuContentItemIcon>
                        <MenuContentItemLabel className="query-builder__sub-header__menu-content">
                          Show OLAP GroupBy
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
        </div>
        <QueryBuilderStatusBar queryBuilderState={queryBuilderState} />
      </div>
    );
  },
);
