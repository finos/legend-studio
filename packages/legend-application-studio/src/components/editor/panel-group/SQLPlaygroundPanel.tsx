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
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
  CustomSelectorInput,
  type SelectComponent,
  createFilter,
  PURE_ConnectionIcon,
  BlankPanelPlaceholder,
  PanelDropZone,
  ResizablePanelSplitterLine,
  PlayIcon,
  PanelLoadingIndicator,
  BlankPanelContent,
  PURE_DatabaseIcon,
  SyncIcon,
  clsx,
  CheckSquareIcon,
  SquareIcon,
} from '@finos/legend-art';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  useApplicationStore,
  useCommands,
  useConditionedApplicationNavigationContext,
} from '@finos/legend-application';
import { flowResult } from 'mobx';
import {
  CODE_EDITOR_LANGUAGE,
  CODE_EDITOR_THEME,
  getBaseCodeEditorOptions,
} from '@finos/legend-code-editor';
import {
  editor as monacoEditorAPI,
  languages as monacoLanguagesAPI,
  type IDisposable,
  type IPosition,
} from 'monaco-editor';
import {
  PackageableConnection,
  RelationalDatabaseConnection,
} from '@finos/legend-graph';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../__lib__/LegendStudioApplicationNavigationContext.js';
import { type SQLPlaygroundPanelState } from '../../../stores/editor/panel-group/SQLPlaygroundPanelState.js';
import { useEditorStore } from '../EditorStoreProvider.js';
import { PANEL_MODE } from '../../../stores/editor/EditorConfig.js';
import { useDrag, useDrop } from 'react-dnd';
import {
  CORE_DND_TYPE,
  type ElementDragSource,
} from '../../../stores/editor/utils/DnDUtils.js';
import {
  DataGrid,
  type DataGridCellRendererParams,
  type DataGridColumnDefinition,
  type DataGridGetContextMenuItemsParams,
  type DataGridMenuItemDef,
} from '@finos/legend-lego/data-grid';
import {
  getNonNullableEntry,
  getNullableEntry,
  getNullableLastEntry,
  isNonNullable,
  isNumber,
  isString,
  isValidURL,
  parseCSVString,
  prettyDuration,
  uniqBy,
} from '@finos/legend-shared';
import {
  DatabaseSchemaExplorer,
  DatabaseSchemaExplorerTreeNodeContainer,
  type DatabaseSchemaExplorerTreeNodeContainerProps,
} from '../editor-group/connection-editor/DatabaseSchemaExplorer.js';
import { DatabaseSchemaExplorerTreeTableNodeData } from '../../../stores/editor/editor-state/element-editor-state/connection/DatabaseBuilderState.js';
import {
  buildRelationalDatabaseConnectionOption,
  type RelationalDatabaseConnectionOption,
} from '../editor-group/connection-editor/RelationalDatabaseConnectionEditor.js';

const DATABASE_NODE_DND_TYPE = 'DATABASE_NODE_DND_TYPE';
type DatabaseNodeDragType = { text: string };

const SQLPlaygroundDatabaseSchemaExplorerTreeNodeContainer = observer(
  (props: DatabaseSchemaExplorerTreeNodeContainerProps) => {
    const { node } = props;

    const [, nodeDragRef] = useDrag<DatabaseNodeDragType>(
      () => ({
        type: DATABASE_NODE_DND_TYPE,
        item: {
          text:
            node instanceof DatabaseSchemaExplorerTreeTableNodeData
              ? `${node.owner.name}.${node.label}`
              : node.label,
        },
      }),
      [node],
    );

    return (
      <DatabaseSchemaExplorerTreeNodeContainer {...props} ref={nodeDragRef} />
    );
  },
);

// List of most popular SQL keywords
// See https://www.w3schools.com/sql/sql_ref_keywords.asp
const SQL_KEYWORDS = [
  'AND',
  'AS',
  'ASC',
  'BETWEEN',
  'DESC',
  'DISTINCT',
  'EXEC',
  'EXISTS',
  'FROM',
  'FULL OUTER JOIN',
  'GROUP BY',
  'HAVING',
  'IN',
  'INNER JOIN',
  'IS NULL',
  'IS NOT NULL',
  'JOIN',
  'LEFT JOIN',
  'LIKE',
  'LIMIT',
  'NOT',
  'NOT NULL',
  'OR',
  'ORDER BY',
  'OUTER JOIN',
  'RIGHT JOIN',
  'SELECT',
  'SELECT DISTINCT',
  'SELECT INTO',
  'SELECT TOP',
  'TOP',
  'UNION',
  'UNION ALL',
  'UNIQUE',
  'WHERE',
];

const getKeywordSuggestions = async (
  position: IPosition,
  model: monacoEditorAPI.ITextModel,
): Promise<monacoLanguagesAPI.CompletionItem[]> =>
  SQL_KEYWORDS.map(
    (keyword) =>
      ({
        label: keyword,
        kind: monacoLanguagesAPI.CompletionItemKind.Keyword,
        insertTextRules:
          monacoLanguagesAPI.CompletionItemInsertTextRule.InsertAsSnippet,
        insertText: `${keyword} `,
      }) as monacoLanguagesAPI.CompletionItem,
  );

const getDatabaseSchemaEntities = async (
  position: IPosition,
  model: monacoEditorAPI.ITextModel,
  playgroundState: SQLPlaygroundPanelState,
): Promise<monacoLanguagesAPI.CompletionItem[]> => {
  if (playgroundState.schemaExplorerState?.treeData) {
    return uniqBy(
      Array.from(
        playgroundState.schemaExplorerState.treeData.nodes.values(),
      ).map(
        (value) =>
          ({
            label: value.label,
            kind: monacoLanguagesAPI.CompletionItemKind.Field,
            insertTextRules:
              monacoLanguagesAPI.CompletionItemInsertTextRule.InsertAsSnippet,
            insertText: `${value.label} `,
          }) as monacoLanguagesAPI.CompletionItem,
      ),
      (val) => val.label,
    );
  }
  return [];
};

const PlaygroundSQLCodeEditor = observer(() => {
  const editorStore = useEditorStore();
  const playgroundState = editorStore.sqlPlaygroundState;
  const applicationStore = useApplicationStore();
  const codeEditorRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<
    monacoEditorAPI.IStandaloneCodeEditor | undefined
  >();
  const sqlIdentifierSuggestionProviderDisposer = useRef<
    IDisposable | undefined
  >(undefined);

  useEffect(() => {
    if (!editor && codeEditorRef.current) {
      const element = codeEditorRef.current;
      const newEditor = monacoEditorAPI.create(element, {
        ...getBaseCodeEditorOptions(),
        theme: CODE_EDITOR_THEME.DEFAULT_DARK,
        language: CODE_EDITOR_LANGUAGE.SQL,
        padding: {
          top: 10,
        },
      });

      newEditor.onDidChangeModelContent(() => {
        const currentVal = newEditor.getValue();
        playgroundState.setSQLText(currentVal);
      });

      // Restore the editor model and view state
      newEditor.setModel(playgroundState.sqlEditorTextModel);
      if (playgroundState.sqlEditorViewState) {
        newEditor.restoreViewState(playgroundState.sqlEditorViewState);
      }
      newEditor.focus(); // focus on the editor initially
      playgroundState.setSQLEditor(newEditor);
      setEditor(newEditor);
    }
  }, [playgroundState, applicationStore, editor]);

  useCommands(playgroundState);

  if (editor) {
    sqlIdentifierSuggestionProviderDisposer.current?.dispose();
    sqlIdentifierSuggestionProviderDisposer.current =
      monacoLanguagesAPI.registerCompletionItemProvider(
        CODE_EDITOR_LANGUAGE.SQL,
        {
          triggerCharacters: [],
          provideCompletionItems: async (model, position, context) => {
            let suggestions: monacoLanguagesAPI.CompletionItem[] = [];
            if (
              context.triggerKind ===
              monacoLanguagesAPI.CompletionTriggerKind.Invoke
            ) {
              // keywords
              suggestions = suggestions.concat(
                await getKeywordSuggestions(position, model),
              );

              // database schema entities
              suggestions = suggestions.concat(
                await getDatabaseSchemaEntities(
                  position,
                  model,
                  playgroundState,
                ),
              );
            }

            return { suggestions };
          },
        },
      );
  }

  // clean up
  useEffect(
    () => (): void => {
      if (editor) {
        // persist editor view state (cursor, scroll, etc.) to restore on re-open
        playgroundState.setSQLEditorViewState(
          editor.saveViewState() ?? undefined,
        );
        editor.dispose();

        // Dispose the providers properly to avoid ending up with duplicated suggestions
        sqlIdentifierSuggestionProviderDisposer.current?.dispose();
      }
    },
    [playgroundState, editor],
  );

  const handleDatabaseNodeDrop = useCallback(
    (item: DatabaseNodeDragType): void => {
      if (isString(item.text)) {
        if (playgroundState.sqlEditor) {
          const currentValue = playgroundState.sqlEditorTextModel.getValue();
          const lines = currentValue.split('\n');
          const position = playgroundState.sqlEditor.getPosition() ?? {
            lineNumber: lines.length,
            column: getNullableLastEntry(lines)?.length ?? 0,
          };
          playgroundState.sqlEditor.executeEdits('', [
            {
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column,
              },
              text: item.text,
              forceMoveMarkers: true,
            },
          ]);
          playgroundState.setSQLText(
            playgroundState.sqlEditorTextModel.getValue(),
          );
        }
      }
    },
    [playgroundState],
  );
  const [{ isDatabaseNodeDragOver }, dropConnector] = useDrop<
    DatabaseNodeDragType,
    void,
    { isDatabaseNodeDragOver: boolean }
  >(
    () => ({
      accept: DATABASE_NODE_DND_TYPE,
      drop: (item): void => handleDatabaseNodeDrop(item),
      collect: (monitor) => ({
        isDatabaseNodeDragOver: monitor.isOver({ shallow: true }),
      }),
    }),
    [handleDatabaseNodeDrop],
  );

  return (
    <div className="sql-playground__code-editor">
      <PanelDropZone
        className="sql-playground__code-editor__content"
        isDragOver={isDatabaseNodeDragOver}
        dropTargetConnector={dropConnector}
      >
        <div className="code-editor__container">
          <div className="code-editor__body" ref={codeEditorRef} />
        </div>
      </PanelDropZone>
    </div>
  );
});

const parseExecutionResultData = (
  data: string,
): { rowData: Record<string, string>[]; columns: string[] } | undefined => {
  const lines = data.split('\n').filter((line) => line.trim().length);
  if (lines.length) {
    const columns = parseCSVString(getNonNullableEntry(lines, 0)) ?? [];
    const rowData = lines
      .slice(1)
      .map((item) => {
        const rowItems = parseCSVString(item);
        if (!rowItems) {
          return undefined;
        }
        const row: Record<string, string> = {};
        columns.forEach((column, idx) => {
          row[column] = getNullableEntry(rowItems, idx) ?? '';
        });
        return row;
      })
      .filter(isNonNullable);
    return { rowData, columns };
  }
  return undefined;
};

const TDSResultCellRenderer = observer((params: DataGridCellRendererParams) => {
  const cellValue = params.value as string;
  const formattedCellValue = (): string => {
    if (isNumber(cellValue)) {
      return Intl.NumberFormat('en-US', {
        maximumFractionDigits: 4,
      }).format(Number(cellValue));
    }
    return cellValue;
  };
  const cellValueUrlLink =
    isString(cellValue) && isValidURL(cellValue) ? cellValue : undefined;

  return (
    <div className={clsx('query-builder__result__values__table__cell')}>
      {cellValueUrlLink ? (
        <a href={cellValueUrlLink} target="_blank" rel="noreferrer">
          {cellValueUrlLink}
        </a>
      ) : (
        <span>{formattedCellValue()}</span>
      )}
    </div>
  );
});

const PlayGroundSQLExecutionResultGrid = observer(
  (props: {
    result: string;
    useAdvancedGrid?: boolean;
    useLocalMode?: boolean;
  }) => {
    const { result, useAdvancedGrid, useLocalMode } = props;
    const data = parseExecutionResultData(result);
    const applicationStore = useApplicationStore();
    const darkMode =
      !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;

    if (!data) {
      return (
        <BlankPanelContent>{`Can't parse result, displaying raw form:\n${result}`}</BlankPanelContent>
      );
    }
    if (useAdvancedGrid) {
      if (useLocalMode) {
        const localcolDefs = data.columns.map(
          (colName) =>
            ({
              minWidth: 50,
              sortable: true,
              resizable: true,
              field: colName,
              flex: 1,
              enablePivot: true,
              enableRowGroup: true,
              enableValue: true,
              allowedAggFuncs: ['count'],
            }) as DataGridColumnDefinition,
        );

        return (
          <div
            className={clsx('sql-playground__result__grid', {
              'ag-theme-balham': !darkMode,
              'ag-theme-balham-dark': darkMode,
            })}
          >
            <DataGrid
              rowData={data.rowData}
              gridOptions={{
                suppressScrollOnNewData: true,
                rowSelection: {
                  mode: 'multiRow',
                  checkboxes: false,
                  headerCheckbox: false,
                },
                pivotPanelShow: 'always',
                rowGroupPanelShow: 'always',
                cellSelection: true,
              }}
              // NOTE: when column definition changed, we need to force refresh the cell to make sure the cell renderer is updated
              // See https://stackoverflow.com/questions/56341073/how-to-refresh-an-ag-grid-when-a-change-occurs-inside-a-custom-cell-renderer-com
              onRowDataUpdated={(params) => {
                params.api.refreshCells({ force: true });
              }}
              suppressFieldDotNotation={true}
              suppressContextMenu={false}
              columnDefs={localcolDefs}
              sideBar={['columns', 'filters']}
            />
          </div>
        );
      }
      const colDefs = data.columns.map(
        (colName) =>
          ({
            minWidth: 50,
            sortable: true,
            resizable: true,
            field: colName,
            flex: 1,
            cellRenderer: TDSResultCellRenderer,
            filter: true,
          }) as DataGridColumnDefinition,
      );
      const getContextMenuItems = useCallback(
        (
          params: DataGridGetContextMenuItemsParams<{
            [key: string]: string;
          }>,
        ): (string | DataGridMenuItemDef)[] => [
          'copy',
          'copyWithHeaders',
          {
            name: 'Copy Row Value',
            action: () => {
              params.api.copySelectedRowsToClipboard();
            },
          },
        ],
        [],
      );
      return (
        <div
          className={clsx('sql-playground__result__grid', {
            'ag-theme-balham': !darkMode,
            'ag-theme-balham-dark': darkMode,
          })}
        >
          <DataGrid
            rowData={data.rowData}
            overlayNoRowsTemplate={`<div class="sql-playground__result__grid--empty">No results</div>`}
            gridOptions={{
              suppressScrollOnNewData: true,
              rowSelection: {
                mode: 'multiRow',
                checkboxes: false,
                headerCheckbox: false,
              },
              cellSelection: true,
            }}
            onRowDataUpdated={(params) => {
              params.api.refreshCells({ force: true });
            }}
            suppressFieldDotNotation={true}
            suppressClipboardPaste={false}
            suppressContextMenu={false}
            columnDefs={colDefs}
            getContextMenuItems={(params): (string | DataGridMenuItemDef)[] =>
              getContextMenuItems(params)
            }
          />
        </div>
      );
    }

    return (
      <div
        className={clsx('sql-playground__result__grid', {
          'ag-theme-balham': !darkMode,
          'ag-theme-balham-dark': darkMode,
        })}
      >
        <DataGrid
          rowData={data.rowData}
          overlayNoRowsTemplate={`<div class="sql-playground__result__grid--empty">No results</div>`}
          alwaysShowVerticalScroll={true}
          suppressFieldDotNotation={true}
          columnDefs={data.columns.map((column) => ({
            minWidth: 50,
            sortable: true,
            resizable: true,
            headerName: column,
            field: column,
            flex: 1,
          }))}
        />
      </div>
    );
  },
);

type SQLPlaygroundPanelDropTarget = ElementDragSource;

export const SQLPlaygroundPanel = observer(() => {
  const editorStore = useEditorStore();
  const playgroundState = editorStore.sqlPlaygroundState;
  const applicationStore = useApplicationStore();

  // connection
  const connectionSelectorRef = useRef<SelectComponent>(null);
  const connectionFilterOption = createFilter({
    ignoreCase: true,
    ignoreAccents: false,
    stringify: (option: RelationalDatabaseConnectionOption): string =>
      option.value.path,
  });
  const connectionOptions = editorStore.graphManagerState.usableConnections
    .filter(
      (connection) =>
        connection.connectionValue instanceof RelationalDatabaseConnection,
    )
    .map(buildRelationalDatabaseConnectionOption);
  const selectedConnectionOption = playgroundState.connection
    ? buildRelationalDatabaseConnectionOption(playgroundState.connection)
    : null;
  const changeConnection = (val: RelationalDatabaseConnectionOption): void => {
    if (val.value === playgroundState.connection) {
      return;
    }
    playgroundState.setConnection(val.value);
  };
  const onPickConnection = (): void => {
    editorStore.setQuickInputState({
      title: 'Connection picker',
      placeholder: 'Select a connection...',
      options: connectionOptions,
      getSearchValue: (option: RelationalDatabaseConnectionOption): string =>
        option.value.path,
      onSelect: changeConnection,
    });
  };

  const handleConnectionDrop = useCallback(
    (item: SQLPlaygroundPanelDropTarget): void => {
      if (item.data.packageableElement instanceof PackageableConnection) {
        if (
          item.data.packageableElement.connectionValue instanceof
          RelationalDatabaseConnection
        ) {
          playgroundState.setConnection(item.data.packageableElement);
        } else {
          applicationStore.notificationService.notifyWarning(
            `Can't use SQL playground with non-relational database connection`,
          );
        }
      }
    },
    [playgroundState, applicationStore],
  );
  const [{ isConnectionDragOver }, dropConnector] = useDrop<
    ElementDragSource,
    void,
    { isConnectionDragOver: boolean }
  >(
    () => ({
      accept: CORE_DND_TYPE.PROJECT_EXPLORER_CONNECTION,
      drop: (item) => handleConnectionDrop(item),
      collect: (monitor) => ({
        isConnectionDragOver: monitor.isOver({ shallow: true }),
      }),
    }),
    [handleConnectionDrop],
  );

  const updateDatabase = (): void => {
    if (playgroundState.schemaExplorerState) {
      flowResult(playgroundState.schemaExplorerState.updateDatabase()).catch(
        applicationStore.alertUnhandledError,
      );
    }
  };

  const executeRawSQL = (): void => {
    flowResult(playgroundState.executeRawSQL()).catch(
      applicationStore.alertUnhandledError,
    );
  };
  const advancedMode = Boolean(
    editorStore.applicationStore.config.options.queryBuilderConfig
      ?.TEMPORARY__enableGridEnterpriseMode,
  );
  const resultDescription = playgroundState.sqlExecutionResult
    ? `query ran in ${prettyDuration(
        playgroundState.sqlExecutionResult.sqlDuration,
        {
          ms: true,
        },
      )}`
    : undefined;
  const toggleocalMode = (): void => {
    playgroundState.toggleIsLocalModeEnabled();
  };
  useEffect(() => {
    if (playgroundState.schemaExplorerState) {
      flowResult(
        playgroundState.schemaExplorerState.fetchDatabaseMetadata(),
      ).catch(applicationStore.alertUnhandledError);
    }
  }, [playgroundState, applicationStore, playgroundState.schemaExplorerState]);

  useConditionedApplicationNavigationContext(
    LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.SQL_PLAYGROUND,
    editorStore.activePanelMode === PANEL_MODE.SQL_PLAYGROUND,
  );
  return (
    <PanelDropZone
      isDragOver={isConnectionDragOver}
      dropTargetConnector={dropConnector}
    >
      <div className="sql-playground">
        {playgroundState.connection && (
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel size={300}>
              <div className="sql-playground__config">
                <div className="sql-playground__config__setup">
                  <div className="sql-playground__config__connection-selector">
                    <div className="sql-playground__config__connection-selector__icon">
                      <PURE_ConnectionIcon />
                    </div>
                    <CustomSelectorInput
                      ref={connectionSelectorRef}
                      className="sql-playground__config__connection-selector__input"
                      options={connectionOptions}
                      onChange={changeConnection}
                      value={selectedConnectionOption}
                      darkMode={
                        !applicationStore.layoutService
                          .TEMPORARY__isLightColorThemeEnabled
                      }
                      placeholder="Choose a connection..."
                      filterOption={connectionFilterOption}
                    />
                  </div>
                  <div className="sql-playground__config__database-selector">
                    <div className="sql-playground__config__database-selector__icon">
                      <PURE_DatabaseIcon />
                    </div>
                    <CustomSelectorInput
                      ref={connectionSelectorRef}
                      className="sql-playground__config__database-selector__input"
                      options={connectionOptions}
                      onChange={changeConnection}
                      value={selectedConnectionOption}
                      darkMode={
                        !applicationStore.layoutService
                          .TEMPORARY__isLightColorThemeEnabled
                      }
                      placeholder="Choose a connection..."
                      filterOption={connectionFilterOption}
                    />
                    <button
                      className="sql-playground__config__database-selector__update-btn btn--sm btn--dark"
                      disabled={!playgroundState.database}
                      onClick={updateDatabase}
                      title="Update database"
                    >
                      <SyncIcon />
                    </button>
                  </div>
                </div>
                <div className="sql-playground__config__schema-explorer">
                  <PanelLoadingIndicator
                    isLoading={Boolean(
                      playgroundState.schemaExplorerState?.isGeneratingDatabase,
                    )}
                  />
                  {playgroundState.schemaExplorerState?.treeData && (
                    <DatabaseSchemaExplorer
                      treeData={playgroundState.schemaExplorerState.treeData}
                      schemaExplorerState={playgroundState.schemaExplorerState}
                      treeNodeContainerComponent={
                        SQLPlaygroundDatabaseSchemaExplorerTreeNodeContainer
                      }
                    />
                  )}
                </div>
              </div>
            </ResizablePanel>
            <ResizablePanelSplitter />
            <ResizablePanel>
              <div className="panel sql-playground__sql-editor">
                <ResizablePanelGroup orientation="horizontal">
                  <ResizablePanel>
                    <PlaygroundSQLCodeEditor />
                  </ResizablePanel>
                  <ResizablePanelSplitter>
                    <ResizablePanelSplitterLine color="var(--color-dark-grey-250)" />
                  </ResizablePanelSplitter>
                  <ResizablePanel size={300}>
                    <div className="panel__header">
                      <div className="panel__header__title">
                        <div className="panel__header__title__label">
                          result
                        </div>

                        {playgroundState.executeRawSQLState.isInProgress && (
                          <div className="panel__header__title__label__status">
                            Running SQL...
                          </div>
                        )}

                        <div className="query-builder__result__analytics">
                          {resultDescription ?? ''}
                        </div>
                      </div>
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
                              onClick={toggleocalMode}
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
                    {playgroundState.sqlExecutionResult !== undefined && (
                      <PlayGroundSQLExecutionResultGrid
                        result={playgroundState.sqlExecutionResult.value}
                        useAdvancedGrid={advancedMode}
                        useLocalMode={playgroundState.isLocalModeEnabled}
                      />
                    )}
                    {playgroundState.sqlExecutionResult === undefined && (
                      <div />
                    )}
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        )}
        {!playgroundState.connection && (
          <BlankPanelPlaceholder
            onClick={onPickConnection}
            clickActionType="add"
            text="Pick a connection to start"
            tooltipText="Drop a connection to start..."
            isDropZoneActive={isConnectionDragOver}
          />
        )}
      </div>
    </PanelDropZone>
  );
});
