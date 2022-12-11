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

import type { PureGrammarTextSuggestion } from '@finos/legend-application';
import { PURE_ELEMENT_NAME, PURE_PARSER } from '@finos/legend-graph';
import { languages as monacoLanguagesAPI } from 'monaco-editor';
import {
  BLANK_CLASS_SNIPPET,
  BLANK_FUNCTION_SNIPPET,
  BLANK_MAPPING_SNIPPET,
  BLANK_RELATIONAL_DATABASE_SNIPPET,
  CLASS_WITH_CONSTRAINT_SNIPPET,
  CLASS_WITH_INHERITANCE_SNIPPET,
  CLASS_WITH_PROPERTY_SNIPPET,
  MAPPING_WITH_ENUMERATION_MAPPING_SNIPPET,
  MAPPING_WITH_M2M_CLASS_MAPPING_SNIPPET,
  MAPPING_WITH_RELATIONAL_CLASS_MAPPING_SNIPPET,
  SIMPLE_ASSOCIATION_SNIPPET,
  SIMPLE_ENUMERATION_SNIPPET,
  SIMPLE_FUNCTION_SNIPPET,
  SIMPLE_PROFILE_SNIPPET,
  BLANK_DIAGRAM_SNIPPET,
  COPYRIGHT_HEADER_SNIPPET,
} from './LegendPureIDECodeSnippets.js';

// NOTE: these are technically different parsers compared to the ones we have in `Legend Engine` so we will
// not try to reuse the constants from DSL diagram
const PURE_GRAMMAR_DIAGRAM_PARSER_NAME = 'Diagram';
const PURE_GRAMMAR_DIAGRAM_ELEMENT_TYPE_LABEL = 'Diagram';

export const collectParserKeywordSuggestions =
  (): PureGrammarTextSuggestion[] => [
    {
      text: PURE_PARSER.PURE,
      description: `(core Pure)`,
      insertText: PURE_PARSER.PURE,
    },
    {
      text: PURE_PARSER.MAPPING,
      description: `(dsl)`,
      insertText: PURE_PARSER.MAPPING,
    },
    {
      text: PURE_PARSER.CONNECTION,
      description: `(dsl)`,
      insertText: PURE_PARSER.CONNECTION,
    },
    {
      text: PURE_PARSER.RUNTIME,
      description: `(dsl)`,
      insertText: PURE_PARSER.RUNTIME,
    },
    {
      text: PURE_PARSER.RELATIONAL,
      description: `(external store)`,
      insertText: PURE_PARSER.RELATIONAL,
    },
    // NOTE: these are technically different parsers compared to the ones we have in `Legend Engine` so we will
    // not try to reuse the constants from DSL diagram
    {
      text: PURE_GRAMMAR_DIAGRAM_PARSER_NAME,
      description: `(dsl)`,
      insertText: PURE_GRAMMAR_DIAGRAM_ELEMENT_TYPE_LABEL,
    },
  ];

export const collectParserElementSnippetSuggestions = (
  parserKeyword: string,
): PureGrammarTextSuggestion[] => {
  switch (parserKeyword) {
    case PURE_PARSER.PURE: {
      return [
        // class
        {
          text: PURE_ELEMENT_NAME.CLASS,
          description: '(blank)',
          insertText: BLANK_CLASS_SNIPPET,
        },
        {
          text: PURE_ELEMENT_NAME.CLASS,
          description: 'with property',
          insertText: CLASS_WITH_PROPERTY_SNIPPET,
        },
        {
          text: PURE_ELEMENT_NAME.CLASS,
          description: 'with inheritance',
          insertText: CLASS_WITH_INHERITANCE_SNIPPET,
        },
        {
          text: PURE_ELEMENT_NAME.CLASS,
          description: 'with constraint',
          insertText: CLASS_WITH_CONSTRAINT_SNIPPET,
        },
        // profile
        {
          text: PURE_ELEMENT_NAME.PROFILE,
          insertText: SIMPLE_PROFILE_SNIPPET,
        },
        // enumeration
        {
          text: PURE_ELEMENT_NAME.ENUMERATION,
          insertText: SIMPLE_ENUMERATION_SNIPPET,
        },
        // association
        {
          text: PURE_ELEMENT_NAME.ASSOCIATION,
          insertText: SIMPLE_ASSOCIATION_SNIPPET,
        },
        // function
        {
          text: PURE_ELEMENT_NAME.FUNCTION,
          description: '(blank)',
          insertText: BLANK_FUNCTION_SNIPPET,
        },
        {
          text: PURE_ELEMENT_NAME.FUNCTION,
          insertText: SIMPLE_FUNCTION_SNIPPET,
        },
      ];
    }
    case PURE_PARSER.MAPPING: {
      return [
        {
          text: PURE_ELEMENT_NAME.MAPPING,
          description: '(blank)',
          insertText: BLANK_MAPPING_SNIPPET,
        },
        {
          text: PURE_ELEMENT_NAME.MAPPING,
          description: 'with model-to-model mapping',
          insertText: MAPPING_WITH_M2M_CLASS_MAPPING_SNIPPET,
        },
        {
          text: PURE_ELEMENT_NAME.MAPPING,
          description: 'with relational mapping',
          insertText: MAPPING_WITH_RELATIONAL_CLASS_MAPPING_SNIPPET,
        },
        {
          text: PURE_ELEMENT_NAME.MAPPING,
          description: 'with enumeration mapping',
          insertText: MAPPING_WITH_ENUMERATION_MAPPING_SNIPPET,
        },
      ];
    }
    case PURE_PARSER.RELATIONAL: {
      return [
        {
          text: PURE_ELEMENT_NAME.DATABASE,
          description: '(blank)',
          insertText: BLANK_RELATIONAL_DATABASE_SNIPPET,
        },
      ];
    }
    case PURE_GRAMMAR_DIAGRAM_PARSER_NAME: {
      return [
        {
          text: PURE_GRAMMAR_DIAGRAM_ELEMENT_TYPE_LABEL,
          description: '(blank)',
          insertText: BLANK_DIAGRAM_SNIPPET,
        },
      ];
    }
    default: {
      return [];
    }
  }
};

export const collectExtraInlineSnippetSuggestions =
  (): PureGrammarTextSuggestion[] => [
    {
      text: 'print',
      description: '(io)',
      insertText: `print(\${1:})`,
    },
    {
      text: 'println',
      description: '(io)',
      insertText: `println(\${1:})`,
    },
  ];

export const getCopyrightHeaderSuggestions =
  (): monacoLanguagesAPI.CompletionItem[] => {
    const results: monacoLanguagesAPI.CompletionItem[] = [];

    results.push({
      label: {
        label: `#copyright`,
        description: `(copyright header)`,
      },
      kind: monacoLanguagesAPI.CompletionItemKind.Snippet,
      insertTextRules:
        monacoLanguagesAPI.CompletionItemInsertTextRule.InsertAsSnippet,
      insertText: COPYRIGHT_HEADER_SNIPPET,
      // NOTE: only show this suggestion when the cursor is on the first line of the file
      range: {
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1000,
      },
    } as monacoLanguagesAPI.CompletionItem);

    return results;
  };
