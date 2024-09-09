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

import type { DocumentationEntry } from '@finos/legend-application';
import { PARSER_SECTION_MARKER, PURE_PARSER } from '@finos/legend-graph';
import {
  getNullableFirstEntry,
  guaranteeNonNullable,
  hasWhiteSpace,
} from '@finos/legend-shared';
import {
  type editor as monacoEditorAPI,
  languages as monacoLanguagesAPI,
  type IPosition,
} from 'monaco-editor';

/**
 * This snippet suggestion is meant for an embedded content of an element
 * In other words, it is used to construct element snippet suggestions
 *
 * Because of that, it is expected that there are text content wrapping around
 * this snippet, so the first suggestion might not start from index 1.
 */
export interface ElementEmbeddedContentSnippetSuggestion {
  /**
   * Brief description about the suggestion item to enable the users to quickly
   * differentiate between one suggestions from another
   */
  description?: string | undefined;
  /**
   * The snippet text to be embedded in the full snippet suggestion text for the element
   *
   * NOTE: The snippet syntax follows that of `monaco-editor`
   * See https://code.visualstudio.com/docs/editor/userdefinedsnippets#_create-your-own-snippets
   */
  text: string;
}

/**
 * This mirrors `monaco-editor` completion item structure
 * See https://microsoft.github.io/monaco-editor/api/interfaces/monaco.languages.CompletionItem.html
 */
export interface PureGrammarTextSuggestion {
  /**
   * The text label of the suggestion.
   */
  text: string;
  /**
   * Brief description about the suggestion item to enable the users to quickly
   * differentiate between one suggestions from another
   */
  description?: string | undefined;
  /**
   * Detailed documentation that explains/elaborates the suggestion item.
   */
  documentation?: DocumentationEntry | undefined;
  /**
   * A string or snippet that should be inserted when selecting this suggestion.
   *
   * NOTE: The snippet syntax follows that of `monaco-editor`
   * See https://code.visualstudio.com/docs/editor/userdefinedsnippets#_create-your-own-snippets
   */
  insertText: string;
}

export const getParserKeywordSuggestions = (
  position: IPosition,
  model: monacoEditorAPI.ITextModel,
  suggestions: PureGrammarTextSuggestion[],
): monacoLanguagesAPI.CompletionItem[] => {
  const results: monacoLanguagesAPI.CompletionItem[] = [];
  const currentWord = model.getWordUntilPosition(position);

  // suggestions for parser keyword
  const lineTextIncludingWordRange = {
    startLineNumber: position.lineNumber,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: currentWord.endColumn,
  };
  const lineTextIncludingWord = model.getValueInRange(
    lineTextIncludingWordRange,
  );

  // NOTE: make sure parser keyword suggestions only show up when the current word is the
  // the first word of the line since parser section header must not be preceded by anything
  if (!hasWhiteSpace(lineTextIncludingWord.trim())) {
    suggestions.forEach((suggestion) => {
      results.push({
        label: {
          label: `${PARSER_SECTION_MARKER}${suggestion.text}`,
          description: suggestion.description,
        },
        kind: monacoLanguagesAPI.CompletionItemKind.Keyword,
        insertText: `${PARSER_SECTION_MARKER}${suggestion.insertText}\n`,
        range: lineTextIncludingWordRange,
        documentation: suggestion.documentation
          ? suggestion.documentation.markdownText
            ? {
                value: suggestion.documentation.markdownText.value,
              }
            : suggestion.documentation.text
          : undefined,
      } as monacoLanguagesAPI.CompletionItem);
    });
  }

  return results;
};

export const getSectionParserNameFromLineText = (
  lineText: string,
): string | undefined => {
  if (lineText.startsWith(PARSER_SECTION_MARKER)) {
    return lineText.substring(PARSER_SECTION_MARKER.length).split(' ')[0];
  }
  // NOTE: since leading whitespace to parser name is considered invalid, we will return `undefined`
  return undefined;
};

export const getParserElementSnippetSuggestions = (
  position: IPosition,
  model: monacoEditorAPI.ITextModel,
  suggestionsGetter: (parserName: string) => PureGrammarTextSuggestion[],
): monacoLanguagesAPI.CompletionItem[] => {
  const results: monacoLanguagesAPI.CompletionItem[] = [];
  const currentWord = model.getWordUntilPosition(position);

  // suggestions for parser element snippets
  const textUntilPosition = model.getValueInRange({
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  });
  const allParserSectionHeaders =
    // NOTE: since `###Pure` is implicitly considered as the first section, we prepend it to the text
    `${PARSER_SECTION_MARKER}${PURE_PARSER.PURE}\n${textUntilPosition}`
      .split('\n')
      .filter((line) => line.startsWith(PARSER_SECTION_MARKER));
  const currentParserName = getSectionParserNameFromLineText(
    allParserSectionHeaders[allParserSectionHeaders.length - 1] ?? '',
  );

  if (currentParserName) {
    suggestionsGetter(currentParserName).forEach((snippetSuggestion) => {
      results.push({
        label: {
          label: snippetSuggestion.text,
          description: snippetSuggestion.description,
        },
        kind: monacoLanguagesAPI.CompletionItemKind.Snippet,
        insertTextRules:
          monacoLanguagesAPI.CompletionItemInsertTextRule.InsertAsSnippet,
        insertText: `${snippetSuggestion.insertText}\n`,
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
      } as monacoLanguagesAPI.CompletionItem);
    });
  }

  return results;
};

export const getInlineSnippetSuggestions = (
  position: IPosition,
  model: monacoEditorAPI.ITextModel,
  extraSnippetSuggestions: PureGrammarTextSuggestion[] = [],
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
        text: 'filter',
        description: '(collection)',
        insertText: `filter(x|\${1:})`,
      },
      {
        text: 'fold',
        description: '(collection)',
        insertText: `fold({a, b| \${1:$a + $b}}, \${2:0})`,
      },
      {
        text: 'filter',
        description: '(collection)',
        insertText: `filter(x|\${1:})`,
      },
      {
        text: 'sort',
        description: '(collection)',
        insertText: `sort()`,
      },
      {
        text: 'in',
        description: '(collection)',
        insertText: `in()`,
      },
      {
        text: 'slice',
        description: '(collection)',
        insertText: `slice(\${1:1},$\{2:2})`,
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
      // string
      {
        text: 'endsWith',
        description: '(string)',
        insertText: `endsWith()`,
      },
      {
        text: 'startsWith',
        description: '(string)',
        insertText: `startsWith()`,
      },
      ...extraSnippetSuggestions,
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

export const isTokenOneOf = (
  token: string,
  baseTokens: string[],
  exact = false,
): boolean => {
  if (exact) {
    return baseTokens.map((baseToken) => `${baseToken}.pure`).includes(token);
  }
  const baseToken = guaranteeNonNullable(
    getNullableFirstEntry(token.split('.')),
  );
  return baseTokens.includes(baseToken);
};

export const PURE_CODE_EDITOR_WORD_SEPARATORS =
  '`~!@#%^&*()-=+[{]}\\|;:\'",.<>/?'; // omit $ from default word separators
