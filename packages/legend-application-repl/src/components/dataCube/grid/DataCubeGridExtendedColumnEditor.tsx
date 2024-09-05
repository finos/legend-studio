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
import type { DataCubeGridExtendedColumnCreatorState } from '../../../stores/dataCube/grid/DataCubeGridExtendedColumnEditorState.js';
import {
  editor as monacoEditorAPI,
  languages as monacoLanguagesAPI,
  type IRange,
  type Token,
  type IDisposable,
  type IPosition,
} from 'monaco-editor';
import { useEffect, useRef, useState } from 'react';
import {
  CODE_EDITOR_LANGUAGE,
  CODE_EDITOR_THEME,
  getBaseCodeEditorOptions,
  type PureGrammarTextSuggestion,
} from '@finos/legend-lego/code-editor';

const getInlineSnippetSuggestions = (
  position: IPosition,
  model: monacoEditorAPI.ITextModel,
): monacoLanguagesAPI.CompletionItem[] => {
  const currentWord = model.getWordUntilPosition(position);

  return (
    [
      {
        text: 'let',
        description: 'new variable',
        insertText: `let \${1:} = \${2:};`,
      },
      {
        text: 'let',
        description: 'new collection',
        insertText: `let \${1:} = [\${2:}];`,
      },
      {
        text: 'cast',
        description: 'type casting',
        insertText: `cast(@\${1:model::SomeClass})`,
      },
      // conditionals
      {
        text: 'if',
        description: '(conditional)',
        insertText: `if(\${1:'true'}, | \${2:/* if true do this */}, | \${3:/* if false do this */})`,
      },
      {
        text: 'case',
        description: '(conditional)',
        insertText: `case(\${1:}, \${2:'true'}, \${3:'false'})`,
      },
      {
        text: 'match',
        description: '(conditional)',
        insertText: `match([x:\${1:String[1]}, \${2:''}])`,
      },
      // collection
      {
        text: 'map',
        description: '(collection)',
        insertText: `map(x|\${1:})`,
      },
      {
        text: 'fold',
        description: '(collection)',
        insertText: `fold({a, b| \${1:$a + $b}}, \${2:0})`,
      },
      {
        text: 'slice',
        description: '(collection)',
        insertText: `slice(\${1:1},$\{2:2})`,
      },
      {
        text: 'at',
        description: '(collection)',
        insertText: `at(\${1:1})`,
      },
      {
        text: 'removeDuplicates',
        description: '(collection)',
        insertText: `removeDuplicates()`,
      },
      {
        text: 'toOne',
        description: '(collection)',
        insertText: `toOne(\${1:})`,
      },
      {
        text: 'toOneMany',
        description: '(collection)',
        insertText: `toOneMany(\${1:})`,
      },
      {
        text: 'isEmpty',
        description: '(collection)',
        insertText: `isEmpty()`,
      },
    ] as PureGrammarTextSuggestion[]
  ).map(
    (snippetSuggestion) =>
      ({
        label: {
          label: snippetSuggestion.text,
          description: snippetSuggestion.description,
        },
        kind: monacoLanguagesAPI.CompletionItemKind.Snippet,
        insertTextRules:
          monacoLanguagesAPI.CompletionItemInsertTextRule.InsertAsSnippet,
        insertText: snippetSuggestion.insertText,
        range: {
          startLineNumber: position.lineNumber,
          startColumn: currentWord.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: currentWord.endColumn,
        },
        documentation: snippetSuggestion.documentation
          ? snippetSuggestion.documentation.markdownText
            ? {
                value: snippetSuggestion.documentation.markdownText.value,
              }
            : snippetSuggestion.documentation.text
          : undefined,
      }) as monacoLanguagesAPI.CompletionItem,
  );
};

export const DataCubeGridExtendedColumnCreator = observer(
  (props: { state: DataCubeGridExtendedColumnCreatorState }) => {
    const { state } = props;
    const suggestionProvider = useRef<IDisposable | undefined>(undefined);
    const codeEditorRef = useRef<HTMLDivElement>(null);
    const [editor, setEditor] = useState<
      monacoEditorAPI.IStandaloneCodeEditor | undefined
    >();

    useEffect(() => {
      if (!editor && codeEditorRef.current) {
        const element = codeEditorRef.current;
        const newEditor = monacoEditorAPI.create(element, {
          ...getBaseCodeEditorOptions(),
          language: CODE_EDITOR_LANGUAGE.PURE,
          theme: CODE_EDITOR_THEME.DEFAULT_DARK,
          wordSeparators: '`~!@#%^&*()-=+[{]}\\|;:\'",.<>/?', // omit $ from default word separators
          // wordWrap: editorState.textEditorState.wrapText ? 'on' : 'off',
          // readOnly: editorState.file.RO,
          // NOTE: since things like context-menus, tooltips are mounted into Shadow DOM
          // by default, we can't override their CSS by design, we need to disable Shadow DOM
          // to style them to our needs
          // See https://github.com/microsoft/monaco-editor/issues/2396
          // See https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM
          useShadowDOM: false,
        });

        newEditor.onDidChangeModelContent(() => {
          const currentVal = newEditor.getValue();
          if (currentVal !== state.code) {
            // the assertion above is to ensure we don't accidentally clear error on initialization of the editor
            // TODO
            // editorState.clearError(); // clear error on content change/typing
          }
          state.setCode(currentVal);
        });
        newEditor.focus(); // focus on the editor initially
        state.setEditor(newEditor);
        setEditor(newEditor);
      }
    }, [state, editor]);

    suggestionProvider.current?.dispose();
    suggestionProvider.current =
      monacoLanguagesAPI.registerCompletionItemProvider(
        CODE_EDITOR_LANGUAGE.PURE,
        {
          triggerCharacters: [],
          provideCompletionItems: async (model, position, context) => {
            let suggestions: monacoLanguagesAPI.CompletionItem[] = [];

            if (
              context.triggerKind ===
              monacoLanguagesAPI.CompletionTriggerKind.Invoke
            ) {
              // code snippet suggestions
              suggestions = suggestions.concat(
                getInlineSnippetSuggestions(position, model),
              );

              // TODO: support contextual suggestions with just the identifier, i.e. auto-complete
              // which Pure IDE server has not supported at the moment
            }

            return { suggestions };
          },
        },
      );

    // clean up
    useEffect(
      () => (): void => {
        if (editor) {
          editor.dispose();

          suggestionProvider.current?.dispose();
        }
      },
      [editor],
    );

    return (
      <>
        <div className="relative h-[calc(100%_-_40px)] w-full px-2 pt-2">
          <div className="h-full w-full overflow-auto border border-neutral-300 bg-white">
            <div className="h-full w-full select-none p-2">
              <div className="relative flex h-full w-full">
                <div
                  className="absolute left-0 top-0 h-full w-full overflow-hidden"
                  ref={codeEditorRef}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex h-10 items-center justify-end px-2">
          <button
            className="h-6 w-20 border border-neutral-400 bg-neutral-300 px-2 hover:brightness-95"
            onClick={() => {
              // editor.applyChanges();
              state.display.close();
            }}
          >
            OK
          </button>
          <button
            className="ml-2 h-6 w-20 border border-neutral-400 bg-neutral-300 px-2 hover:brightness-95"
            onClick={() => state.display.close()}
          >
            Cancel
          </button>
        </div>
      </>
    );
  },
);
