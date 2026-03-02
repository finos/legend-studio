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
import { PanelDropZone } from '@finos/legend-art';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCommands } from '@finos/legend-application';
import {
  CODE_EDITOR_LANGUAGE,
  CODE_EDITOR_THEME,
  getBaseCodeEditorOptions,
} from '@finos/legend-code-editor';
import {
  editor as monacoEditorAPI,
  languages as monacoLanguagesAPI,
  type IDisposable,
} from 'monaco-editor';
import { useDrop } from 'react-dnd';
import { isString } from '@finos/legend-shared';
import type { AbstractSQLPlaygroundState } from './store/AbstractSQLPlaygroundState.js';
import type { SQLPlaygroundDataProductExplorerState } from './store/SqlPlaygroundDataProductExplorerState.js';

type SqlEditorNodeDragType = { text: string };
const SQL_DROP_NODE_DND_TYPE = 'SQL_DROP_NODE_DND_TYPE';

export interface SQLPlaygroundPanelProps {
  playgroundState: AbstractSQLPlaygroundState;
  advancedMode: boolean;
  disableDragDrop?: boolean;
  enableDarkMode?: boolean;
  schemaExplorerState?: SQLPlaygroundDataProductExplorerState;
  showSchemaExplorer?: boolean;
}

const toCompletionItems = (
  labels: string[],
): monacoLanguagesAPI.CompletionItem[] =>
  labels.map(
    (label) =>
      ({
        label,
        kind: monacoLanguagesAPI.CompletionItemKind.Keyword,
        insertTextRules:
          monacoLanguagesAPI.CompletionItemInsertTextRule.InsertAsSnippet,
        insertText: `${label} `,
      }) as monacoLanguagesAPI.CompletionItem,
  );

export const PlaygroundSQLCodeEditor = observer(
  (props: SQLPlaygroundPanelProps) => {
    const {
      playgroundState,
      disableDragDrop = false,
      enableDarkMode = false,
    } = props;
    const codeEditorRef = useRef<HTMLDivElement>(null);
    const sqlIdentifierSuggestionProviderDisposer = useRef<
      IDisposable | undefined
    >(undefined);
    const [editor, setEditor] = useState<
      monacoEditorAPI.IStandaloneCodeEditor | undefined
    >();
    useEffect(() => {
      if (!editor && codeEditorRef.current) {
        const element = codeEditorRef.current;
        playgroundState.setTheme(enableDarkMode ? 'dark' : 'light');
        const newEditor = monacoEditorAPI.create(element, {
          ...getBaseCodeEditorOptions(),
          theme:
            playgroundState.theme === 'light'
              ? CODE_EDITOR_THEME.GITHUB_LIGHT
              : CODE_EDITOR_THEME.DEFAULT_DARK,
          language: CODE_EDITOR_LANGUAGE.SQL,
          padding: {
            top: 10,
          },
        });

        newEditor.onDidChangeModelContent(() => {
          const currentVal = newEditor.getValue();
          playgroundState.setSQLText(currentVal);
        });
        newEditor.setModel(playgroundState.sqlEditorTextModel);
        if (playgroundState.sqlEditorViewState) {
          newEditor.restoreViewState(playgroundState.sqlEditorViewState);
        }
        newEditor.focus();
        playgroundState.setSQLEditor(newEditor);
        setEditor(newEditor);
      }
    }, [playgroundState, editor, enableDarkMode]);
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
                const labels = playgroundState.getCodeCompletionSuggestions();
                suggestions = suggestions.concat(toCompletionItems(labels));
              }
              return { suggestions };
            },
          },
        );
    }
    useEffect(
      () => (): void => {
        if (editor) {
          playgroundState.setSQLEditorViewState(
            editor.saveViewState() ?? undefined,
          );
          editor.dispose();

          sqlIdentifierSuggestionProviderDisposer.current?.dispose();
        }
      },
      [playgroundState, editor],
    );

    const handleSqlEditorNodeDrop = useCallback(
      (item: SqlEditorNodeDragType): void => {
        if (isString(item.text)) {
          if (playgroundState.sqlEditor) {
            const currentValue = playgroundState.sqlEditorTextModel.getValue();
            const lines = currentValue.split('\n');
            const position = playgroundState.sqlEditor.getPosition() ?? {
              lineNumber: lines.length,
              column: lines.at(-1)?.length ?? 0,
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
      SqlEditorNodeDragType,
      void,
      { isDatabaseNodeDragOver: boolean }
    >(
      () => ({
        accept: [SQL_DROP_NODE_DND_TYPE],
        drop: (item): void => handleSqlEditorNodeDrop(item),
        collect: (monitor) => ({
          isDatabaseNodeDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleSqlEditorNodeDrop],
    );

    return (
      <div className="sql-playground__code-editor">
        <PanelDropZone
          className="sql-playground__code-editor__content"
          isDragOver={isDatabaseNodeDragOver}
          dropTargetConnector={dropConnector}
          disabled={disableDragDrop}
        >
          <div className="code-editor__container">
            <div className="code-editor__body" ref={codeEditorRef} />
          </div>
        </PanelDropZone>
      </div>
    );
  },
);
