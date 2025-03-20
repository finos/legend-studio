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

import {
  type editor as monacoEditorAPI,
  languages as monacoLanguagesAPI,
  type IPosition,
} from 'monaco-editor';
import type {
  CompletionItem,
  DataCubeEngine,
} from '../../stores/core/DataCubeEngine.js';
import type { V1_Lambda } from '@finos/legend-graph';
import type { PlainObject } from '@finos/legend-shared';
import type { DataCubeSource } from '../../stores/core/model/DataCubeSource.js';

// Since we render the editor in a window which has been CSS transformed, and monaco-editor renders
// the widgets with position=fixed, the position of the widgets will be off, we need to move the root
// which monaco-editor uses to calculate the offset to outside of the transformed container
// See https://dev.to/salilnaik/the-uncanny-relationship-between-position-fixed-and-transform-property-32f6
// See https://github.com/microsoft/monaco-editor/issues/2793#issuecomment-999337740
export const MONACO_EDITOR_OVERFLOW_WIDGETS_ROOT_ID =
  'monaco-editor-overflow-widgets-root';
export function INTERNAL__MonacoEditorWidgetsRoot() {
  return (
    <div
      id={MONACO_EDITOR_OVERFLOW_WIDGETS_ROOT_ID}
      className="monaco-editor" // keep this root class so widgets can be styled properly
    />
  );
}

export async function getCodeSuggestions(
  position: IPosition,
  model: monacoEditorAPI.ITextModel,
  prefix: string | undefined,
  engine: DataCubeEngine,
  source: DataCubeSource | PlainObject,
  baseQueryBuilder: () => V1_Lambda,
) {
  const textUntilPosition = model.getValueInRange({
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  });
  const currentWord = model.getWordAtPosition(position);

  let suggestions: CompletionItem[] = [];

  try {
    suggestions = await engine.getQueryTypeahead(
      (prefix ?? '') + textUntilPosition,
      baseQueryBuilder(),
      source,
    );
  } catch {
    // do nothing: provide no suggestions when error ocurred
  }
  return suggestions.map(
    (suggestion) =>
      ({
        label: suggestion.display,
        kind: monacoLanguagesAPI.CompletionItemKind.Text, // TODO?: the engine should provide this information
        filterText: suggestion.display,
        insertTextRules:
          monacoLanguagesAPI.CompletionItemInsertTextRule.InsertAsSnippet,
        insertText: suggestion.completion,
        // NOTE: the following replace range is equivalent to the current word range, if there is a current word,
        // replace this word with the suggestions, otherwise, if there is no current word, we use the current position
        // as insertion point for the suggestion. This is due to the fact that the auto-completer gives full word
        // suggestions even when the user is typing the middle of that word
        //
        // For example, if the current input is 'a' and the suggestion is 'abc', we need to make sure
        // the suggestion is inserted so that the final result is 'abc', not 'aabc'
        range: {
          startLineNumber: position.lineNumber,
          startColumn: currentWord?.startColumn ?? position.column,
          endLineNumber: position.lineNumber,
          endColumn: currentWord?.endColumn ?? position.column,
        },
      }) as monacoLanguagesAPI.CompletionItem,
  );
}
