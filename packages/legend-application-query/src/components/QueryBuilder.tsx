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
} from '@finos/legend-art';
import { QueryBuilderFilterPanel } from './QueryBuilderFilterPanel.js';
import { QueryBuilderExplorerPanel } from './QueryBuilderExplorerPanel.js';
import { QueryBuilderSetupPanel } from './QueryBuilderSetupPanel.js';
import { QueryBuilderResultPanel } from './QueryBuilderResultPanel.js';
import { QueryBuilderTextEditor } from './QueryBuilderTextEditor.js';
import type { QueryBuilderState } from '../stores/QueryBuilderState.js';
import { QueryTextEditorMode } from '../stores/QueryTextEditorState.js';
import { QueryBuilderFetchStructurePanel } from './QueryBuilderFetchStructurePanel.js';
import { QUERY_BUILDER_TEST_ID } from './QueryBuilder_TestID.js';
import { flowResult } from 'mobx';
import { QueryBuilderUnsupportedQueryEditor } from './QueryBuilderUnsupportedQueryEditor.js';
import { useApplicationStore } from '@finos/legend-application';
import { QueryBuilderParameterPanel } from './QueryBuilderParameterPanel.js';
import { QueryBuilderPostFilterPanel } from './QueryBuilderPostFilterPanel.js';
import { QueryBuilderFunctionsExplorerPanel } from './QueryBuilderFunctionsExplorerPanel.js';

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
    const openLambdaEditor = (mode: QueryTextEditorMode): void =>
      queryBuilderState.queryTextEditorState.openModal(mode);
    const compile = applicationStore.guardUnhandledError(() =>
      flowResult(queryBuilderState.compileQuery()),
    );

    return (
      <div className="query-builder__status-bar">
        <div className="query-builder__status-bar__left"></div>
        <div className="query-builder__status-bar__right">
          <button
            className={clsx(
              'query-builder__status-bar__action query-builder__status-bar__compile-btn',
              {
                'query-builder__status-bar__compile-btn--wiggling':
                  queryBuilderState.isCompiling,
              },
            )}
            disabled={queryBuilderState.isCompiling}
            onClick={compile}
            tabIndex={-1}
            title="Compile (F9)"
          >
            <HammerIcon />
          </button>
          <button
            className={clsx(
              'query-builder__status-bar__action query-builder__status-bar__action__toggler',
            )}
            onClick={(): void => openLambdaEditor(QueryTextEditorMode.JSON)}
            tabIndex={-1}
            title="View Query JSON"
          >{`{ }`}</button>
          <button
            className={clsx(
              'query-builder__status-bar__action query-builder__status-bar__action__toggler',
            )}
            onClick={(): void => openLambdaEditor(QueryTextEditorMode.TEXT)}
            tabIndex={-1}
            title="View Pure Query"
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
    const isQuerySupported = queryBuilderState.isQuerySupported();

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
      queryBuilderState.setShowFunctionPanel(
        !queryBuilderState.showFunctionPanel,
      );
    };
    const toggleShowParameterPanel = (): void => {
      queryBuilderState.setShowParameterPanel(
        !queryBuilderState.showParameterPanel,
      );
    };
    const toggleShowPostFilterPanel = (): void => {
      queryBuilderState.setShowPostFilterPanel(
        !queryBuilderState.showPostFilterPanel,
      );
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
                  <MenuContentItem onClick={toggleShowFunctionPanel}>
                    <MenuContentItemIcon>
                      {queryBuilderState.showFunctionPanel ? (
                        <CheckIcon />
                      ) : null}
                    </MenuContentItemIcon>
                    <MenuContentItemLabel className="query-builder__sub-header__menu-content">
                      Show Function(s)
                    </MenuContentItemLabel>
                  </MenuContentItem>
                  <MenuContentItem
                    onClick={toggleShowParameterPanel}
                    disabled={
                      queryBuilderState.queryParametersState.parameterStates
                        .length > 0
                    }
                  >
                    <MenuContentItemIcon>
                      {queryBuilderState.showParameterPanel ? (
                        <CheckIcon />
                      ) : null}
                    </MenuContentItemIcon>
                    <MenuContentItemLabel className="query-builder__sub-header__menu-content">
                      Show Parameter(s)
                    </MenuContentItemLabel>
                  </MenuContentItem>
                  <MenuContentItem
                    onClick={toggleShowPostFilterPanel}
                    disabled={
                      queryBuilderState.fetchStructureState.isGraphFetchMode() ||
                      Array.from(
                        queryBuilderState.postFilterState.nodes.values(),
                      ).length > 0
                    }
                  >
                    <MenuContentItemIcon>
                      {queryBuilderState.showPostFilterPanel ? (
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
          <Backdrop className="backdrop" open={queryBuilderState.backdrop} />
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
                        <ResizablePanelGroup orientation="horizontal">
                          {queryBuilderState.querySetupState.showSetupPanel && (
                            <ResizablePanel minSize={40} direction={1}>
                              <QueryBuilderSetupPanel
                                queryBuilderState={queryBuilderState}
                              />
                            </ResizablePanel>
                          )}
                          {!queryBuilderState.querySetupState
                            .showSetupPanel && (
                            <ResizablePanel
                              minSize={40}
                              size={40}
                              direction={1}
                            >
                              <QueryBuilderSetupPanel
                                queryBuilderState={queryBuilderState}
                              />
                            </ResizablePanel>
                          )}
                          <ResizablePanelSplitter />
                          <ResizablePanel minSize={40} direction={[1, -1]}>
                            <QueryBuilderExplorerPanel
                              queryBuilderState={queryBuilderState}
                            />
                          </ResizablePanel>
                          <ResizablePanelSplitter />
                          {queryBuilderState.showFunctionPanel && (
                            <ResizablePanel
                              minSize={40}
                              direction={
                                queryBuilderState.showParameterPanel
                                  ? [1, -1]
                                  : -1
                              }
                            >
                              <QueryBuilderFunctionsExplorerPanel
                                queryBuilderState={queryBuilderState}
                              />
                            </ResizablePanel>
                          )}
                          {queryBuilderState.showFunctionPanel &&
                          queryBuilderState.showParameterPanel ? (
                            <ResizablePanelSplitter />
                          ) : null}
                          {queryBuilderState.showParameterPanel && (
                            <ResizablePanel minSize={40} direction={-1}>
                              <QueryBuilderParameterPanel
                                queryBuilderState={queryBuilderState}
                              />
                            </ResizablePanel>
                          )}
                        </ResizablePanelGroup>
                      </ResizablePanel>
                      <ResizablePanelSplitter />
                      <ResizablePanel minSize={300}>
                        <QueryBuilderFetchStructurePanel
                          queryBuilderState={queryBuilderState}
                        />
                      </ResizablePanel>
                      <ResizablePanelSplitter />
                      <ResizablePanel minSize={300}>
                        {!queryBuilderState.showPostFilterPanel && (
                          <QueryBuilderFilterPanel
                            queryBuilderState={queryBuilderState}
                          />
                        )}
                        {queryBuilderState.showPostFilterPanel && (
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
                {queryBuilderState.mode.isResultPanelHidden ? null : (
                  <ResizablePanelSplitter />
                )}
                {queryBuilderState.mode.isResultPanelHidden ? null : (
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
          {queryBuilderState.queryTextEditorState.mode && (
            <QueryBuilderTextEditor queryBuilderState={queryBuilderState} />
          )}
        </GlobalHotKeys>
      </div>
    );
  },
);
