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

import { useRef, useEffect, useState, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { clsx } from '@finos/legend-art';
import {
  getBaseCodeEditorOptions,
  getCodeEditorValue,
  normalizeLineEnding,
  clearMarkers,
  setErrorMarkers,
  CODE_EDITOR_LANGUAGE,
  CODE_EDITOR_THEME,
  disposeCodeEditor,
} from '@finos/legend-lego/code-editor';
import { SourceInformation, type ParserError } from '@finos/legend-graph';
import { debounce, uuid } from '@finos/legend-shared';
import { action, flowResult, makeObservable, observable } from 'mobx';
import { DEFAULT_TAB_SIZE } from '@finos/legend-application';
import { useREPLGridClientStore } from './REPLGridClientStoreProvider.js';
import {
  editor as monacoEditorAPI,
  type IDisposable,
  languages as monacoLanguagesAPI,
} from 'monaco-editor';

export class QueryEditorState {
  uuid = uuid();
  query: string;
  parserError?: ParserError | undefined;

  constructor(query: string) {
    makeObservable(this, {
      query: observable,
      parserError: observable,
      setQuery: action,
      setParserError: action,
    });

    this.query = query;
  }

  setQuery(val: string): void {
    this.query = val;
  }

  setParserError(parserError: ParserError | undefined): void {
    // account for the lambda prefix offset in source information
    if (parserError?.sourceInformation) {
      parserError.sourceInformation = this.processSourceInformation(
        parserError.sourceInformation,
      );
    }
    this.parserError = parserError;
  }

  processSourceInformation(
    sourceInformation: SourceInformation,
  ): SourceInformation {
    const { sourceId, startLine, startColumn, endLine, endColumn } =
      sourceInformation;
    const lineOffset = 0;
    const columnOffset = 0;
    return new SourceInformation(
      sourceId,
      startLine + lineOffset,
      startColumn - (startLine === 1 ? columnOffset : 0),
      endLine + lineOffset,
      endColumn - (endLine === 1 ? columnOffset : 0),
    );
  }
}

export const QueryEditor = observer(() => {
  const editorStore = useREPLGridClientStore();
  const applicationStore = editorStore.applicationStore;
  const queryEditorState = editorStore.replGridState.queryEditorState;
  const onDidChangeModelContentEventDisposer = useRef<IDisposable | undefined>(
    undefined,
  );
  const value = normalizeLineEnding(queryEditorState.query);
  const parserError = queryEditorState.parserError;
  const [editor, setEditor] = useState<
    monacoEditorAPI.IStandaloneCodeEditor | undefined
  >();
  const textInputRef = useRef<HTMLDivElement>(null);
  const autoCompleteSuggestionProviderDisposer = useRef<
    IDisposable | undefined
  >(undefined);

  const debouncedParseQuery = useMemo(
    () =>
      debounce((): void => {
        flowResult(editorStore.parseQuery()).catch(
          editorStore.applicationStore.alertUnhandledError,
        );
      }, 1000),
    [editorStore],
  );

  if (editor) {
    onDidChangeModelContentEventDisposer.current?.dispose();
    onDidChangeModelContentEventDisposer.current =
      editor.onDidChangeModelContent(() => {
        const currentVal = getCodeEditorValue(editor);
        if (currentVal !== value) {
          queryEditorState.setQuery(currentVal);
          debouncedParseQuery.cancel();
          debouncedParseQuery();
        }
      });

    // Set the text value
    const currentValue = getCodeEditorValue(editor);
    const editorModel = editor.getModel();

    if (currentValue !== value) {
      editor.setValue(value);
    }

    // auto complete suggestions
    autoCompleteSuggestionProviderDisposer.current?.dispose();
    autoCompleteSuggestionProviderDisposer.current =
      monacoLanguagesAPI.registerCompletionItemProvider(
        CODE_EDITOR_LANGUAGE.PURE,
        {
          triggerCharacters: ['>', '.', '$', '~'],
          provideCompletionItems: async (model, position, context) => {
            const suggestions: monacoLanguagesAPI.CompletionItem[] =
              await editorStore.getTypeaheadResults(position, model);
            return { suggestions };
          },
        },
      );

    // Set the errors
    if (editorModel) {
      editorModel.updateOptions({ tabSize: DEFAULT_TAB_SIZE });
      const error = parserError;
      if (error?.sourceInformation) {
        setErrorMarkers(editorModel, [
          {
            message: error.message,
            startLineNumber: error.sourceInformation.startLine,
            startColumn: error.sourceInformation.startColumn,
            endLineNumber: error.sourceInformation.endLine,
            endColumn: error.sourceInformation.endColumn,
          },
        ]);
      } else {
        clearMarkers();
      }
    }
  }

  useEffect(() => {
    if (!editor && textInputRef.current) {
      const element = textInputRef.current;
      const _editor = monacoEditorAPI.create(element, {
        ...getBaseCodeEditorOptions(),
        language: CODE_EDITOR_LANGUAGE.PURE,
        theme: applicationStore.layoutService
          .TEMPORARY__isLightColorThemeEnabled
          ? CODE_EDITOR_THEME.BUILT_IN__VSCODE_LIGHT
          : CODE_EDITOR_THEME.DEFAULT_DARK,
      });
      setEditor(_editor);
    }
  }, [
    applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled,
    editor,
  ]);

  // dispose editor
  useEffect(
    () => (): void => {
      if (editor) {
        disposeCodeEditor(editor);

        onDidChangeModelContentEventDisposer.current?.dispose();
      }
    },
    [editor],
  );

  return (
    <div className={clsx('repl__query__content__editor__content')}>
      <div className="code-editor__body" ref={textInputRef} />
    </div>
  );
});
