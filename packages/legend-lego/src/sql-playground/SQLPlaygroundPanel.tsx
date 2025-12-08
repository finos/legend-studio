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
  CheckSquareIcon,
  clsx,
  PlayIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  SquareIcon,
} from '@finos/legend-art';
import { prettyDuration } from '@finos/legend-shared';
import {
  PlaygroundSQLCodeEditor,
  type SQLPlaygroundPanelProps,
} from './SQLPlaygroundEditor.js';
import { PlayGroundSQLExecutionResultGrid } from './SQLPlaygroundGrid.js';

export const SQLPlaygroundEditorResultPanel = observer(
  (props: SQLPlaygroundPanelProps) => {
    const {
      playgroundState,
      advancedMode,
      disableDragDrop = false,
      enableDarkMode = false,
    } = props;

    const executeRawSQL = (): void => {
      playgroundState.executeRawSQL();
    };
    const resultDescription = playgroundState.sqlExecutionResult
      ? `query ran in ${prettyDuration(
          playgroundState.sqlExecutionResult.sqlDuration,
          {
            ms: true,
          },
        )}`
      : undefined;
    const toggleLocalMode = (): void => {
      playgroundState.toggleIsLocalModeEnabled();
    };

    return (
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel>
          <div className="panel sql-playground__sql-editor">
            <ResizablePanelGroup orientation="horizontal">
              <ResizablePanel>
                <PlaygroundSQLCodeEditor
                  playgroundState={playgroundState}
                  advancedMode={advancedMode}
                  disableDragDrop={disableDragDrop}
                  enableDarkMode={enableDarkMode}
                />
              </ResizablePanel>
              <ResizablePanelSplitter>
                <ResizablePanelSplitterLine color="var(--color-dark-grey-250)" />
              </ResizablePanelSplitter>
              <ResizablePanel size={300}>
                <div className="panel__header">
                  <div className="panel__header__title">
                    <div className="panel__header__title__label">result</div>

                    {playgroundState.executeRawSQLState.isInProgress && (
                      <div className="panel__header__title__label__status">
                        Running SQL...
                      </div>
                    )}

                    <div className="query-builder__result__analytics">
                      {resultDescription ?? ''}
                    </div>
                  </div>
                  <div className={!enableDarkMode ? 'light-mode' : ''}>
                    <div className="panel__header__actions query-builder__result__header__actions">
                      {advancedMode && (
                        <div className="query-builder__result__advanced__mode">
                          <div className="query-builder__result__advanced__mode__label">
                            Local Mode
                          </div>
                          <button
                            className={clsx(
                              'query-builder__result__advanced__mode__toggler__btn',
                              {
                                'query-builder__result__advanced__mode__toggler__btn--toggled':
                                  playgroundState.isLocalModeEnabled,
                              },
                            )}
                            onClick={toggleLocalMode}
                            tabIndex={-1}
                          >
                            {playgroundState.isLocalModeEnabled ? (
                              <CheckSquareIcon />
                            ) : (
                              <SquareIcon />
                            )}
                          </button>
                        </div>
                      )}
                      <div className="query-builder__result__execute-btn btn__dropdown-combo btn__dropdown-combo--primary">
                        <button
                          className="btn__dropdown-combo__label"
                          onClick={executeRawSQL}
                          disabled={
                            playgroundState.executeRawSQLState.isInProgress
                          }
                          tabIndex={-1}
                        >
                          <PlayIcon className="btn__dropdown-combo__label__icon" />
                          <div className="btn__dropdown-combo__label__title">
                            Run Query
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                {playgroundState.sqlExecutionResult !== undefined && (
                  <PlayGroundSQLExecutionResultGrid
                    result={playgroundState.sqlExecutionResult.value}
                    useAdvancedGrid={advancedMode}
                    useLocalMode={playgroundState.isLocalModeEnabled}
                    enableDarkMode={enableDarkMode}
                  />
                )}
                {playgroundState.sqlExecutionResult === undefined && <div />}
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  },
);
