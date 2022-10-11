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
import { GlobalHotKeys } from 'react-hotkeys';
import {
  clsx,
  Backdrop,
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
  CogIcon,
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
import { useApplicationStore } from '@finos/legend-application';
import { QueryBuilderParametersPanel } from './QueryBuilderParametersPanel.js';
import { QueryBuilderPostFilterPanel } from './fetch-structure/QueryBuilderPostFilterPanel.js';
import { QueryBuilderFunctionsExplorerPanel } from './explorer/QueryBuilderFunctionsExplorerPanel.js';
import { QueryBuilderProjectionState } from '../stores/fetch-structure/projection/QueryBuilderProjectionState.js';
import { QueryBuilderDiffViewPanel } from './QueryBuilderDiffPanel.js';

enum QUERY_BUILDER_HOTKEY {
  COMPILE = 'COMPILE',
}

const QUERY_BUILDER_HOTKEY_MAP = Object.freeze({
  [QUERY_BUILDER_HOTKEY.COMPILE]: 'f9',
});

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

export const QueryBuilder = observer(
  (props: { queryBuilderState: QueryBuilderState }) => {
    const { queryBuilderState } = props;
    const applicationStore = useApplicationStore();
    const isQuerySupported = queryBuilderState.isQuerySupported;

    // Hotkeys
    const keyMap = {
      [QUERY_BUILDER_HOTKEY.COMPILE]: [QUERY_BUILDER_HOTKEY_MAP.COMPILE],
    };
    const handlers = {
      [QUERY_BUILDER_HOTKEY.COMPILE]: (
        event: KeyboardEvent | undefined,
      ): void => {
        event?.preventDefault();
        flowResult(queryBuilderState.compileQuery()).catch(
          applicationStore.alertUnhandledError,
        );
      },
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
    const toggleShowPostFilterPanel = (): void => {
      if (
        queryBuilderState.fetchStructureState.implementation instanceof
        QueryBuilderProjectionState
      ) {
        const projectionState =
          queryBuilderState.fetchStructureState.implementation;
        projectionState.setShowPostFilterPanel(
          !projectionState.showPostFilterPanel,
        );
      }
    };

    // settings
    // NOTE: this is temporary until we find a better home for these settings in query builder
    const engineConfig =
      queryBuilderState.graphManagerState.graphManager.TEMPORARY__getEngineConfig();
    const toggleEngineClientRequestPayloadCompression = (): void =>
      engineConfig.setUseClientRequestPayloadCompression(
        !engineConfig.useClientRequestPayloadCompression,
      );

    return (
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER}
        className="query-builder"
      >
        <div className="query-builder__sub-header">
          <div className="query-builder__sub-header__actions">
            <DropdownMenu
              className="query-builder__sub-header__custom-action"
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
                  {/* TODO?: consider hiding this menu option when the fetch-structure is not projection */}
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
                    onClick={toggleShowPostFilterPanel}
                    disabled={
                      !queryBuilderState.isQuerySupported ||
                      !(
                        queryBuilderState.fetchStructureState
                          .implementation instanceof QueryBuilderProjectionState
                      ) ||
                      Array.from(
                        queryBuilderState.fetchStructureState.implementation.postFilterState.nodes.values(),
                      ).length > 0
                    }
                  >
                    <MenuContentItemIcon>
                      {queryBuilderState.fetchStructureState
                        .implementation instanceof
                        QueryBuilderProjectionState &&
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
              <button
                className="query-builder__sub-header__custom-action__label"
                title="Show Advanced Menu..."
              >
                Advanced
              </button>
              <CaretDownIcon className="query-builder__sub-header__custom-action__icon" />
            </DropdownMenu>
          </div>
        </div>
        <GlobalHotKeys keyMap={keyMap} handlers={handlers}>
          <Backdrop
            className="backdrop"
            open={queryBuilderState.showBackdrop}
          />
          <div className="query-builder__content">
            <div className="query-builder__activity-bar">
              <div className="query-builder__activity-bar__items"></div>
              <DropdownMenu
                className="query-builder__activity-bar__setting"
                content={
                  <MenuContent>
                    <MenuContentItem
                      onClick={toggleEngineClientRequestPayloadCompression}
                    >
                      <MenuContentItemIcon>
                        {engineConfig.useClientRequestPayloadCompression ? (
                          <CheckIcon />
                        ) : null}
                      </MenuContentItemIcon>
                      <MenuContentItemLabel>
                        Compress request payload
                      </MenuContentItemLabel>
                    </MenuContentItem>
                  </MenuContent>
                }
                menuProps={{
                  anchorOrigin: { vertical: 'center', horizontal: 'center' },
                  transformOrigin: { vertical: 'bottom', horizontal: 'left' },
                  elevation: 7,
                }}
              >
                <button
                  className="query-builder__activity-bar__item"
                  tabIndex={-1}
                  title="Settings..."
                >
                  <CogIcon />
                </button>
              </DropdownMenu>
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
                      <ResizablePanelSplitter />
                      <ResizablePanel minSize={300}>
                        {(!(
                          queryBuilderState.fetchStructureState
                            .implementation instanceof
                          QueryBuilderProjectionState
                        ) ||
                          !queryBuilderState.fetchStructureState.implementation
                            .showPostFilterPanel) && (
                          <QueryBuilderFilterPanel
                            queryBuilderState={queryBuilderState}
                          />
                        )}
                        {queryBuilderState.fetchStructureState
                          .implementation instanceof
                          QueryBuilderProjectionState &&
                          queryBuilderState.fetchStructureState.implementation
                            .showPostFilterPanel && (
                            <ResizablePanelGroup orientation="horizontal">
                              <ResizablePanel minSize={300}>
                                <QueryBuilderFilterPanel
                                  queryBuilderState={queryBuilderState}
                                />
                              </ResizablePanel>
                              <ResizablePanelSplitter />
                              <ResizablePanel>
                                <QueryBuilderPostFilterPanel
                                  queryBuilderState={queryBuilderState}
                                />
                              </ResizablePanel>
                            </ResizablePanelGroup>
                          )}
                      </ResizablePanel>
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
          <QueryBuilderStatusBar queryBuilderState={queryBuilderState} />
          {queryBuilderState.textEditorState.mode && (
            <QueryBuilderTextEditor queryBuilderState={queryBuilderState} />
          )}
        </GlobalHotKeys>
      </div>
    );
  },
);
