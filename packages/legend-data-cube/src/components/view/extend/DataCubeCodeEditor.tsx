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

import { cn } from '@finos/legend-art';
import {
  getBaseCodeEditorOptions,
  CODE_EDITOR_LANGUAGE,
  CODE_EDITOR_THEME,
  PURE_CODE_EDITOR_WORD_SEPARATORS,
} from '@finos/legend-code-editor';
import {
  debounce,
  guaranteeNonNullable,
  isNonNullable,
} from '@finos/legend-shared';
import { observer } from 'mobx-react-lite';
import { useRef, useState, useMemo, useEffect } from 'react';
import {
  MONACO_EDITOR_OVERFLOW_WIDGETS_ROOT_ID,
  getCodeSuggestions,
} from '../../core/DataCubePureCodeEditorUtils.js';
import {
  editor as monacoEditorAPI,
  languages as monacoLanguagesAPI,
  type IDisposable,
} from 'monaco-editor';
import type { DataCubeCodeEditorState } from './DataCubeCodeEditorState.js';
import { runInAction } from 'mobx';

export const DataCubeCodeEditor = observer(
  (props: { state: DataCubeCodeEditorState }) => {
    const { state } = props;

    const editorRef = useRef<HTMLDivElement>(null);
    const [editor, setEditor] = useState<
      monacoEditorAPI.IStandaloneCodeEditor | undefined
    >();

    const suggestionsProvider = useRef<IDisposable | undefined>(undefined);

    const debouncedCheckReturnType = useMemo(
      () =>
        debounce((): void => {
          state.getReturnType().catch((error) => {
            state.alertHandler(error);
          });
        }, 500),
      [state],
    );

    useEffect(() => {
      if (!editor && editorRef.current) {
        const element = editorRef.current;
        const widgetRoot = document.getElementById(
          MONACO_EDITOR_OVERFLOW_WIDGETS_ROOT_ID,
        );
        const newEditor = monacoEditorAPI.create(element, {
          ...getBaseCodeEditorOptions(),
          fontSize: 12,
          language: CODE_EDITOR_LANGUAGE.PURE,
          theme: CODE_EDITOR_THEME.GITHUB_LIGHT,
          wordSeparators: PURE_CODE_EDITOR_WORD_SEPARATORS,
          // Make sure the widgets (tooltips, menus) are not clipped by the container bounds
          // and fix the problem where widgets are rendered with position=fixed not working well with parent
          // containers (i.e. the draggable window) which has been transformed
          // See https://dev.to/salilnaik/the-uncanny-relationship-between-position-fixed-and-transform-property-32f6
          // See https://github.com/microsoft/monaco-editor/issues/2793#issuecomment-999337740
          fixedOverflowWidgets: true,
          ...(isNonNullable(widgetRoot)
            ? { overflowWidgetsDomNode: widgetRoot }
            : {}),
        });

        // NOTE: since engine suggestions are computed based on the current text content
        // we put it in this block to simplify the flow and really to "bend" monaco-editor
        // suggestion provider to our needs. But we also need to make sure this suggestion
        // provider is scoped to the current editor only by checking the editor model
        suggestionsProvider.current?.dispose();
        suggestionsProvider.current =
          monacoLanguagesAPI.registerCompletionItemProvider(
            CODE_EDITOR_LANGUAGE.PURE,
            {
              // NOTE: this is a hack to fetch suggestions from engine for every keystroke
              triggerCharacters: [...PURE_CODE_EDITOR_WORD_SEPARATORS, '$'],
              provideCompletionItems: async (model, position, context) => {
                let suggestions: monacoLanguagesAPI.CompletionItem[] = [];

                if (model.uri === state.editorModelUri) {
                  suggestions = suggestions.concat(
                    await getCodeSuggestions(
                      position,
                      model,
                      state.codePrefix,
                      state.engine,
                      guaranteeNonNullable(state.model),
                      state.queryLambda,
                    ),
                  );
                }

                return { suggestions };
              },
            },
          );

        newEditor.setModel(state.editorModel);
        newEditor.onDidChangeModelContent(() => {
          state.currentlyEditing = true;
          const currentVal = newEditor.getValue();
          if (currentVal !== state.code) {
            runInAction(() => {
              state.code = currentVal;
            });
            // clear error on content change/typing
            state.clearError();
            state.setReturnType(undefined);
            debouncedCheckReturnType.cancel();
            debouncedCheckReturnType();
          }
        });
        // focus on the editor initially and set the cursor to the end
        // since we're trying to create a new column
        newEditor.focus();
        newEditor.setPosition({
          lineNumber: 1,
          column: state.code.length + 1,
        });
        state.setEditor(newEditor);
        setEditor(newEditor);
      }
    }, [state, editor, debouncedCheckReturnType]);

    // clean up
    useEffect(
      () => (): void => {
        if (editor) {
          editor.dispose();

          suggestionsProvider.current?.dispose();
        }
      },
      [editor],
    );

    useEffect(() => {
      state.editor?.updateOptions({
        readOnly: state.finalizationState.isInProgress,
      });
    }, [state, state.finalizationState.isInProgress]);

    return (
      <div
        className={cn('relative h-full w-full border border-neutral-200', {
          'border-red-500': state.hasErrors,
        })}
      >
        <div className="absolute left-0 top-0 h-full w-full overflow-hidden" />
        <div ref={editorRef} style={{ height: '100%', width: '100%' }} />
      </div>
    );
  },
);
