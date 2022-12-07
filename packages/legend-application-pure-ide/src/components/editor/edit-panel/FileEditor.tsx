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

import { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  editor as monacoEditorAPI,
  languages as monacoLanguagesAPI,
  type IRange,
  type Token,
  type IDisposable,
} from 'monaco-editor';
import type { FileEditorState } from '../../../stores/FileEditorState.js';
import {
  EDITOR_LANGUAGE,
  EDITOR_THEME,
  getBaseTokenType,
  getInlineSnippetSuggestions,
  getParserElementSnippetSuggestions,
  getParserKeywordSuggestions,
  PURE_GRAMMAR_TOKEN,
  useApplicationStore,
  useCommands,
} from '@finos/legend-application';
import {
  clsx,
  getBaseTextEditorOptions,
  moveCursorToPosition,
  useResizeDetector,
  WordWrapIcon,
} from '@finos/legend-art';
import { useEditorStore } from '../EditorStoreProvider.js';
import {
  collectExtraInlineSnippetSuggestions,
  collectParserElementSnippetSuggestions,
  collectParserKeywordSuggestions,
} from '../../../stores/FileEditorUtils.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { FileCoordinate } from '../../../server/models/PureFile.js';

export const FileEditor = observer(
  (props: { editorState: FileEditorState }) => {
    const { editorState } = props;
    const suggestionProviderDisposer = useRef<IDisposable | undefined>(
      undefined,
    );
    const definitionProviderDisposer = useRef<IDisposable | undefined>(
      undefined,
    );
    const textInputRef = useRef<HTMLDivElement>(null);
    const [editor, setEditor] = useState<
      monacoEditorAPI.IStandaloneCodeEditor | undefined
    >();
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const content = editorState.file.content;
    const { ref, width, height } = useResizeDetector<HTMLDivElement>();

    useEffect(() => {
      if (!editor && textInputRef.current) {
        const element = textInputRef.current;
        const newEditor = monacoEditorAPI.create(element, {
          ...getBaseTextEditorOptions(),
          language: EDITOR_LANGUAGE.PURE,
          theme: EDITOR_THEME.LEGEND,
          wordWrap: editorState.textEditorState.wrapText ? 'on' : 'off',
        });
        // NOTE: (hacky) hijack the editor service so we can alternate the behavior of goto definition
        // since we cannot really override the editor service anymore, but must provide a full editor service
        // implementation in place, which is not practical for now
        // See https://github.com/microsoft/monaco-editor/issues/852
        // See https://github.com/microsoft/monaco-editor/issues/2000#issuecomment-649622966
        (
          newEditor as monacoEditorAPI.IEditorOverrideServices
        )._codeEditorService.openCodeEditor = async () => {
          const currentPosition = newEditor.getPosition();
          if (currentPosition) {
            flowResult(
              editorStore.executeNavigation(
                new FileCoordinate(
                  editorState.filePath,
                  currentPosition.lineNumber,
                  currentPosition.column,
                ),
              ),
            ).catch(applicationStore.alertUnhandledError);
          }
        };
        // NOTE: with the way we create suggestion tokens, there's a problem
        // where for the definition coming from the same URI, the goto-definition
        // action will by default just go to the token, i.e. do nothing in our case
        // as such, we have to override `gotoLocation.alternativeDefinitionCommand`
        // in order for `editorService.openCodeEditor` to be called
        // See https://github.com/microsoft/vscode/issues/110060
        // See https://github.com/microsoft/vscode/issues/107841
        newEditor.updateOptions({
          gotoLocation: {
            multiple: 'goto',
            multipleDefinitions: 'goto',
            alternativeDefinitionCommand: 'DUMMY',
          },
        });

        newEditor.onDidChangeModelContent(() => {
          const currentVal = newEditor.getValue();
          if (currentVal !== editorState.file.content) {
            // the assertion above is to ensure we don't accidentally clear error on initialization of the editor
            editorState.clearError(); // clear error on content change/typing
          }
          editorState.file.setContent(currentVal);
        });
        // Restore the editor model and view state
        newEditor.setModel(editorState.textEditorState.model);
        if (editorState.textEditorState.viewState) {
          newEditor.restoreViewState(editorState.textEditorState.viewState);
        }
        newEditor.focus(); // focus on the editor initially
        editorState.textEditorState.setEditor(newEditor);
        setEditor(newEditor);
      }
    }, [editorStore, applicationStore, editorState, editor]);

    if (editor) {
      // Set the value of the editor
      const currentValue = editor.getValue();
      if (currentValue !== content) {
        editor.setValue(content);
      }
      if (editorState.textEditorState.forcedCursorPosition) {
        moveCursorToPosition(
          editor,
          editorState.textEditorState.forcedCursorPosition,
        );
        editorState.textEditorState.setForcedCursorPosition(undefined);
      }
    }

    const textTokens = editor
      ? monacoEditorAPI.tokenize(editor.getValue(), EDITOR_LANGUAGE.PURE)
      : [];
    definitionProviderDisposer.current?.dispose();
    definitionProviderDisposer.current =
      monacoLanguagesAPI.registerDefinitionProvider(EDITOR_LANGUAGE.PURE, {
        provideDefinition: (model, position) => {
          // NOTE: there is a quirky problem with monaco-editor or our integration with it
          // where sometimes, hovering the mouse on the right half of the last character of a definition token
          // and then hitting Ctrl/Cmd key will not be trigger definition provider. We're not quite sure what
          // to do with that for the time being.
          const lineTokens = guaranteeNonNullable(
            textTokens[position.lineNumber - 1],
          );
          let currentToken: Token | undefined = undefined;
          let currentTokenRange: IRange | undefined = undefined;
          for (let i = 1; i < lineTokens.length; ++i) {
            const token = guaranteeNonNullable(lineTokens[i]);
            if (token.offset + 1 > position.column) {
              currentToken = guaranteeNonNullable(lineTokens[i - 1]);
              // this is the selection of text from another file for peeking/preview the definition
              // We can't really do much here since we do goto-definition asynchronously, we will
              // show the token itself
              currentTokenRange = {
                startLineNumber: position.lineNumber,
                startColumn: currentToken.offset + 1,
                endLineNumber: position.lineNumber,
                endColumn: token.offset + 1, // NOTE: seems like this needs to be exclusive
              };
              break;
            }
          }
          if (
            currentToken &&
            currentTokenRange &&
            // NOTE: only allow goto definition for these tokens
            (
              [
                PURE_GRAMMAR_TOKEN.TYPE,
                PURE_GRAMMAR_TOKEN.VARIABLE,
                PURE_GRAMMAR_TOKEN.PROPERTY,
                PURE_GRAMMAR_TOKEN.IDENTIFIER,
              ] as string[]
            ).includes(getBaseTokenType(currentToken.type))
          ) {
            return [
              {
                uri: editorState.textEditorState.model.uri,
                range: currentTokenRange,
              },
            ];
          }
          return [];
        },
      });

    // suggestion
    suggestionProviderDisposer.current?.dispose();
    suggestionProviderDisposer.current =
      monacoLanguagesAPI.registerCompletionItemProvider(EDITOR_LANGUAGE.PURE, {
        // NOTE: we need to specify this to show suggestions for section
        // because by default, only alphanumeric characters trigger completion item provider
        // See https://microsoft.github.io/monaco-editor/api/interfaces/monaco.languages.CompletionContext.html#triggerCharacter
        // See https://github.com/microsoft/monaco-editor/issues/2530#issuecomment-861757198
        triggerCharacters: ['#'],
        provideCompletionItems: (model, position) => {
          let suggestions: monacoLanguagesAPI.CompletionItem[] = [];

          // suggestions for parser keyword
          suggestions = suggestions.concat(
            getParserKeywordSuggestions(
              position,
              model,
              collectParserKeywordSuggestions(),
            ),
          );

          // suggestions for parser element snippets
          suggestions = suggestions.concat(
            getParserElementSnippetSuggestions(
              position,
              model,
              (parserName: string) =>
                collectParserElementSnippetSuggestions(parserName),
            ),
          );

          // add inline code snippet suggestions
          suggestions = suggestions.concat(
            getInlineSnippetSuggestions(
              position,
              model,
              collectExtraInlineSnippetSuggestions(),
            ),
          );

          return { suggestions };
        },
      });

    useCommands(editorState);

    useEffect(() => {
      if (width !== undefined && height !== undefined) {
        editor?.layout({ width, height });
      }
    }, [editor, width, height]);

    // clean up
    useEffect(
      () => (): void => {
        if (editor) {
          // persist editor view state (cursor, scroll, etc.) to restore on re-open
          editorState.textEditorState.setViewState(
            editor.saveViewState() ?? undefined,
          );
          // NOTE: dispose the editor to prevent potential memory-leak
          editor.dispose();
        }

        definitionProviderDisposer.current?.dispose();
        suggestionProviderDisposer.current?.dispose();
      },
      [editorState, editor],
    );

    return (
      <div className="panel edit-panel file-editor">
        <div className="panel__header file-editor__header">
          <div className="file-editor__header__actions">
            <button
              className={clsx('file-editor__header__action', {
                'file-editor__header__action--active':
                  editorState.textEditorState.wrapText,
              })}
              tabIndex={-1}
              onClick={(): void =>
                editorState.textEditorState.setWrapText(
                  !editorState.textEditorState.wrapText,
                )
              }
              title="Toggle Text Wrap"
            >
              <WordWrapIcon className="file-editor__icon--text-wrap" />
            </button>
          </div>
        </div>
        <div className="panel__content file-editor__content">
          <div ref={ref} className="text-editor__container">
            <div className="text-editor__body" ref={textInputRef} />
          </div>
        </div>
      </div>
    );
  },
);
