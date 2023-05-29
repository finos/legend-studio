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
  type TreeNodeContainerProps,
  ResizablePanelGroup,
  ResizablePanel,
  ResizablePanelSplitter,
  clsx,
  TreeView,
  PURE_DatabaseSchemaIcon,
  PURE_DatabaseTableIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  KeyIcon,
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
  TrashIcon,
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
} from '@finos/legend-lego/code-editor';
import {
  editor as monacoEditorAPI,
  languages as monacoLanguagesAPI,
  type IDisposable,
  type IPosition,
} from 'monaco-editor';
import {
  PackageableConnection,
  RelationalDatabaseConnection,
  guaranteeRelationalDatabaseConnection,
  stringifyDataType,
} from '@finos/legend-graph';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../__lib__/LegendStudioApplicationNavigationContext.js';
import {
  DatabaseSchemaExplorerTreeColumnNodeData,
  DatabaseSchemaExplorerTreeSchemaNodeData,
  DatabaseSchemaExplorerTreeTableNodeData,
  type DatabaseSchemaExplorerTreeData,
  type DatabaseSchemaExplorerTreeNodeData,
  type SQLPlaygroundPanelState,
} from '../../../stores/editor/panel-group/SQLPlaygroundPanelState.js';
import { renderColumnTypeIcon } from '../editor-group/connection-editor/DatabaseEditorHelper.js';
import { useEditorStore } from '../EditorStoreProvider.js';
import { PANEL_MODE } from '../../../stores/editor/EditorConfig.js';
import { useDrag, useDrop } from 'react-dnd';
import {
  CORE_DND_TYPE,
  type ElementDragSource,
} from '../../../stores/editor/utils/DnDUtils.js';
import { DataGrid } from '@finos/legend-lego/data-grid';
import {
  getNonNullableEntry,
  getNullableEntry,
  getNullableLastEntry,
  isNonNullable,
  isString,
  parseCSVString,
} from '@finos/legend-shared';

const getDatabaseSchemaNodeIcon = (
  node: DatabaseSchemaExplorerTreeNodeData,
): React.ReactNode => {
  if (node instanceof DatabaseSchemaExplorerTreeSchemaNodeData) {
    return (
      <div className="sql-playground__database-schema-explorer-tree__icon--schema">
        <PURE_DatabaseSchemaIcon />
      </div>
    );
  } else if (node instanceof DatabaseSchemaExplorerTreeTableNodeData) {
    return (
      <div className="sql-playground__database-schema-explorer-tree__icon--table">
        <PURE_DatabaseTableIcon />
      </div>
    );
  } else if (node instanceof DatabaseSchemaExplorerTreeColumnNodeData) {
    return renderColumnTypeIcon(node.column.type);
  }
  return null;
};

const DATABASE_NODE_DND_TYPE = 'DATABASE_NODE_DND_TYPE';
type DatabaseNodeDragType = { text: string };

const DatabaseSchemaExplorerTreeNodeContainer: React.FC<
  TreeNodeContainerProps<
    DatabaseSchemaExplorerTreeNodeData,
    {
      // empty
    }
  >
> = (props) => {
  const { node, level, stepPaddingInRem, onNodeSelect } = props;
  const isExpandable =
    Boolean(!node.childrenIds || node.childrenIds.length) &&
    !(node instanceof DatabaseSchemaExplorerTreeColumnNodeData);
  const nodeExpandIcon = isExpandable ? (
    node.isOpen ? (
      <ChevronDownIcon />
    ) : (
      <ChevronRightIcon />
    )
  ) : (
    <div />
  );
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
  const nodeTypeIcon = getDatabaseSchemaNodeIcon(node);
  const toggleExpandNode = (): void => onNodeSelect?.(node);
  const isPrimaryKeyColumn =
    node instanceof DatabaseSchemaExplorerTreeColumnNodeData &&
    node.owner.primaryKey.includes(node.column);

  return (
    <div
      className={clsx('tree-view__node__container')}
      style={{
        paddingLeft: `${level * (stepPaddingInRem ?? 1)}rem`,
        display: 'flex',
      }}
      ref={nodeDragRef}
      onClick={toggleExpandNode}
    >
      <div className="tree-view__node__icon sql-playground__database-schema-explorer-tree__node__icon__group">
        <div className="sql-playground__database-schema-explorer-tree__expand-icon">
          {nodeExpandIcon}
        </div>
        <div className="sql-playground__database-schema-explorer-tree__type-icon">
          {nodeTypeIcon}
        </div>
      </div>
      <div className="tree-view__node__label sql-playground__database-schema-explorer-tree__node__label">
        {node.label}
        {node instanceof DatabaseSchemaExplorerTreeColumnNodeData && (
          <div className="sql-playground__database-schema-explorer-tree__node__type">
            <div className="sql-playground__database-schema-explorer-tree__node__type__label">
              {stringifyDataType(node.column.type)}
            </div>
          </div>
        )}
        {isPrimaryKeyColumn && (
          <div
            className="sql-playground__database-schema-explorer-tree__node__pk"
            title="Primary Key"
          >
            <KeyIcon />
          </div>
        )}
      </div>
    </div>
  );
};

export const DatabaseSchemaExplorer = observer(
  (props: {
    treeData: DatabaseSchemaExplorerTreeData;
    playgroundState: SQLPlaygroundPanelState;
  }) => {
    const { treeData, playgroundState } = props;
    const applicationStore = useApplicationStore();

    const onNodeSelect = (node: DatabaseSchemaExplorerTreeNodeData): void => {
      flowResult(playgroundState.onNodeSelect(node, treeData)).catch(
        applicationStore.alertUnhandledError,
      );
    };

    const getChildNodes = (
      node: DatabaseSchemaExplorerTreeNodeData,
    ): DatabaseSchemaExplorerTreeNodeData[] =>
      playgroundState
        .getChildNodes(node, treeData)
        ?.sort((a, b) => a.label.localeCompare(b.label)) ?? [];

    return (
      <TreeView
        className="sql-playground__database-schema-explorer-tree"
        components={{
          TreeNodeContainer: DatabaseSchemaExplorerTreeNodeContainer,
        }}
        innerProps={{}}
        treeData={treeData}
        onNodeSelect={onNodeSelect}
        getChildNodes={getChildNodes}
      />
    );
  },
);

type RelationalDatabaseConnectionOption = {
  label: React.ReactNode;
  value: PackageableConnection;
};
const buildRelationalDatabaseConnectionOption = (
  connection: PackageableConnection,
): RelationalDatabaseConnectionOption => {
  const connectionValue = guaranteeRelationalDatabaseConnection(connection);
  return {
    value: connection,
    label: (
      <div className="sql-playground__config__connection-selector__option">
        <div className="sql-playground__config__connection-selector__option__label">
          {connection.name}
        </div>
        <div className="sql-playground__config__connection-selector__option__type">
          {connectionValue.type}
        </div>
      </div>
    ),
  };
};

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
      } as monacoLanguagesAPI.CompletionItem),
  );

const PlaygroundSQLCodeEditor = observer(() => {
  const editorStore = useEditorStore();
  const playgroundState = editorStore.sqlPlaygroundState;
  const applicationStore = useApplicationStore();
  const codeEditorRef = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<
    monacoEditorAPI.IStandaloneCodeEditor | undefined
  >();
  const sqlConstructSuggestionProviderDisposer = useRef<
    IDisposable | undefined
  >(undefined);
  const sqlIdentifierSuggestionProviderDisposer = useRef<
    IDisposable | undefined
  >(undefined);

  const executeRawSQL = (): void => {
    flowResult(playgroundState.executeRawSQL()).catch(
      applicationStore.alertUnhandledError,
    );
  };
  const reset = (): void => {
    playgroundState.resetSQL();
  };

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
    // suggestions
    sqlConstructSuggestionProviderDisposer.current?.dispose();
    sqlConstructSuggestionProviderDisposer.current =
      monacoLanguagesAPI.registerCompletionItemProvider(
        CODE_EDITOR_LANGUAGE.SQL,
        {
          triggerCharacters: ['.'],
          provideCompletionItems: async (model, position, context) => {
            const suggestions: monacoLanguagesAPI.CompletionItem[] = [];
            // if (
            //   context.triggerKind ===
            //   monacoLanguagesAPI.CompletionTriggerKind.TriggerCharacter
            // ) {
            //   switch (context.triggerCharacter) {
            //     case '.': {
            //       suggestions = suggestions.concat(
            //         await getAttributeSuggestions(position, model, ideStore),
            //       );
            //       break;
            //     }
            //     default:
            //       break;
            //   }
            // }

            return { suggestions };
          },
        },
      );

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
              // suggestions
              suggestions = suggestions.concat(
                await getKeywordSuggestions(position, model),
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
        sqlConstructSuggestionProviderDisposer.current?.dispose();
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
      <PanelLoadingIndicator isLoading={playgroundState.isExecutingRawSQL} />
      <div className="sql-playground__code-editor__header">
        <div className="sql-playground__code-editor__header__actions">
          <button
            className="sql-playground__code-editor__header__action"
            tabIndex={-1}
            onClick={executeRawSQL}
            disabled={playgroundState.isExecutingRawSQL}
            title="Execute (Ctrl + Enter)"
          >
            <PlayIcon />
          </button>
          <button
            className="sql-playground__code-editor__header__action"
            tabIndex={-1}
            onClick={reset}
            title="Reset"
          >
            <TrashIcon />
          </button>
        </div>
      </div>
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

const PlayGroundSQLExecutionResultGrid = observer(
  (props: { result: string }) => {
    const { result } = props;
    const data = parseExecutionResultData(result);

    if (!data) {
      return (
        <BlankPanelContent>{`Can't parse result, displaying raw form:\n${result}`}</BlankPanelContent>
      );
    }
    return (
      <div className="sql-playground__result__grid ag-theme-balham-dark">
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

  useEffect(() => {
    flowResult(playgroundState.fetchDatabaseMetadata()).catch(
      applicationStore.alertUnhandledError,
    );
  }, [playgroundState, applicationStore, playgroundState.connection]);

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
                    darkMode={true}
                    placeholder="Choose a connection..."
                    filterOption={connectionFilterOption}
                  />
                </div>
                <div className="sql-playground__config__schema-explorer">
                  {playgroundState.treeData && (
                    <DatabaseSchemaExplorer
                      treeData={playgroundState.treeData}
                      playgroundState={playgroundState}
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
                    {playgroundState.sqlExecutionResult !== undefined && (
                      <PlayGroundSQLExecutionResultGrid
                        result={playgroundState.sqlExecutionResult}
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
            text="Pick a connection to start"
            clickActionType="add"
            tooltipText="Drop a connection to start..."
            isDropZoneActive={isConnectionDragOver}
          />
        )}
      </div>
    </PanelDropZone>
  );
});
