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
  useREPLGridClientStore,
  withEditorStore,
} from './REPLGridClientStoreProvider.js';
import { AgGridComponent } from './AgGrid.js';
import { useEffect } from 'react';
import { flowResult } from 'mobx';
import { getTDSRowData } from '../components/grid/GridUtils.js';
import { ServerSideDataSource } from '../components/grid/ServerSideDataSource.js';
import { LEGEND_APPLICATION_COLOR_THEME } from '@finos/legend-application';
import {
  CODE_EDITOR_LANGUAGE,
  CODE_EDITOR_THEME,
  CodeDiffView,
  CodeEditor,
} from '@finos/legend-lego/code-editor';

export const Editor = withEditorStore(
  observer(() => {
    const editorStore = useREPLGridClientStore();
    const selectDarkTheme = (): void => {
      editorStore.applicationStore.layoutService.setColorTheme(
        LEGEND_APPLICATION_COLOR_THEME.DEFAULT_DARK,
        { persist: true },
      );
    };
    const title = `Current Query <-> Current Row Group Sub Query`;
    const selectLightTheme = (): void => {
      editorStore.applicationStore.layoutService.setColorTheme(
        LEGEND_APPLICATION_COLOR_THEME.LEGACY_LIGHT,
        { persist: true },
      );
    };
    const isLightTheme =
      editorStore.applicationStore.layoutService
        .TEMPORARY__isLightColorThemeEnabled;

    useEffect(() => {
      flowResult(editorStore.getInitialREPLGridServerResult()).catch(
        editorStore.applicationStore.alertUnhandledError,
      );
    }, [editorStore]);

    return (
      <div className="repl">
        <div className="repl__header">
          <div className="repl__header__content">
            <div className="repl__header__content__title">REPL Grid</div>
            <div className="repl__header__actions">
              <button
                className={
                  isLightTheme
                    ? 'repl__header__action'
                    : 'repl__header__action repl__header__action--toggled'
                }
                onClick={selectDarkTheme}
              >
                Dark
              </button>
              <button
                className={
                  isLightTheme
                    ? 'repl__header__action repl__header__action--toggled'
                    : 'repl__header__action'
                }
                onClick={selectLightTheme}
              >
                Light
              </button>
            </div>
          </div>
        </div>
        {editorStore.replGridState.initialResult &&
          editorStore.replGridState.columns && (
            <div className="repl__content">
              {editorStore.replGridState.currentSubQuery !== undefined && (
                <>
                  <div className="repl__query__label">{title}</div>
                  <div className="repl__query__content">
                    <CodeDiffView
                      language={CODE_EDITOR_LANGUAGE.PURE}
                      from={editorStore.replGridState.currentQuery}
                      to={editorStore.replGridState.currentSubQuery}
                    />
                  </div>
                </>
              )}
              {editorStore.replGridState.currentSubQuery === undefined && (
                <div className="repl__query">
                  <div className="repl__query__editor">
                    <div className="repl__query__label">Curent Query</div>
                    <div className="repl__query__content">
                      <CodeEditor
                        lightTheme={
                          isLightTheme
                            ? CODE_EDITOR_THEME.BUILT_IN__VSCODE_HC_LIGHT
                            : CODE_EDITOR_THEME.BUILT_IN__VSCODE_HC_BLACK
                        }
                        language={CODE_EDITOR_LANGUAGE.PURE}
                        inputValue={
                          editorStore.replGridState.currentQuery ?? ''
                        }
                        hideActionBar={true}
                        isReadOnly={true}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div className="repl__query__label">Result</div>
              <AgGridComponent
                className={
                  editorStore.applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled
                    ? 'ag-theme-balham'
                    : 'ag-theme-balham-dark'
                }
                gridOptions={
                  editorStore.replGridState.licenseKey
                    ? {
                        serverSideDatasource: new ServerSideDataSource(
                          getTDSRowData(
                            editorStore.replGridState.initialResult.result,
                          ),
                          editorStore.replGridState.initialResult.builder.columns,
                          editorStore,
                        ),
                      }
                    : {}
                }
                licenseKey={editorStore.replGridState.licenseKey ?? ''}
                rowData={editorStore.replGridState.rowData}
                columnDefs={editorStore.replGridState.columnDefs}
              />
            </div>
          )}
      </div>
    );
  }),
);
