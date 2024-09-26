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
  type PureGrammarTextSuggestion,
  CODE_EDITOR_LANGUAGE,
  isTokenOneOf,
  PURE_GRAMMAR_TOKEN,
} from '@finos/legend-code-editor';
import {
  ELEMENT_PATH_DELIMITER,
  extractElementNameFromPath,
  PARSER_SECTION_MARKER,
  PURE_ELEMENT_NAME,
  PURE_PARSER,
} from '@finos/legend-graph';
import {
  guaranteeNonNullable,
  isNonNullable,
  returnUndefOnError,
} from '@finos/legend-shared';
import {
  languages as monacoLanguagesAPI,
  type IPosition,
  editor as monacoEditorAPI,
} from 'monaco-editor';
import { deserialize } from 'serializr';
import { ConceptType } from '../server/models/ConceptTree.js';
import {
  AttributeSuggestion,
  ClassSuggestion,
  ElementSuggestion,
  VariableSuggestion,
} from '../server/models/Suggestion.js';
import type { PureIDEStore } from './PureIDEStore.js';
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
  getCopyrightHeaderSnippet,
} from '../__lib__/LegendPureIDECodeSnippet.js';

// NOTE: these are technically different parsers compared to the ones we have in `Legend Engine` so we will
// not try to reuse the constants from DSL diagram
export const PURE_GRAMMAR_DIAGRAM_PARSER_NAME = 'Diagram';
export const PURE_GRAMMAR_DIAGRAM_ELEMENT_TYPE_LABEL = 'Diagram';

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
    {
      text: 'NULL',
      description: '(nullish value)',
      insertText: `[]`,
    },
  ];

export const getCopyrightHeaderSuggestions = (
  position: IPosition,
  model: monacoEditorAPI.ITextModel,
): monacoLanguagesAPI.CompletionItem[] => {
  const results: monacoLanguagesAPI.CompletionItem[] = [];
  const textUntilPosition = model
    .getValueInRange({
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: position.lineNumber,
      endColumn: position.column,
    })
    .trimStart();

  if (['', '/'].includes(textUntilPosition)) {
    results.push({
      label: {
        label: `/copyright`,
        description: `(copyright header)`,
      },
      kind: monacoLanguagesAPI.CompletionItemKind.Snippet,
      insertTextRules:
        monacoLanguagesAPI.CompletionItemInsertTextRule.InsertAsSnippet,
      insertText: getCopyrightHeaderSnippet(),
      // NOTE: only show this suggestion when the cursor is on the first line of the file
      range: {
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1000,
      },
    } as monacoLanguagesAPI.CompletionItem);
  }

  return results;
};

const constructorClassSuggestionToCompletionItem = (suggestion: {
  pureId: string;
  pureName: string;
  requiredClassProperties: string[];
}): monacoLanguagesAPI.CompletionItem =>
  ({
    label: {
      label: suggestion.pureName,
      description: suggestion.pureId,
    },
    kind: monacoLanguagesAPI.CompletionItemKind.Class,
    filterText: suggestion.pureName,
    insertTextRules:
      monacoLanguagesAPI.CompletionItemInsertTextRule.InsertAsSnippet,
    insertText: `${suggestion.pureName}(${suggestion.requiredClassProperties
      .map((property, idx) => `${property}=\${${idx + 1}:}`)
      .join(',')})`,
  }) as monacoLanguagesAPI.CompletionItem;

const createFunctionInvocationSnippet = (
  functionName: string,
  functionPureId: string,
  useArrowForm: boolean,
): string => {
  const fn = extractElementNameFromPath(functionPureId);
  const functionType = returnUndefOnError(() =>
    fn.substring(fn.indexOf('_'), fn.length - 1),
  );
  // NOTE: remove the return type and if use arrow function form, remove the first parameter
  const parameters = functionType?.split('__') ?? [];
  parameters.pop();
  if (useArrowForm) {
    parameters.shift();
  }
  return `${functionName}(${parameters
    .map((param, idx) => `\${${idx + 1}:}`)
    .join(',')})`;
};

const elementSuggestionToCompletionItem = (
  suggestion: ElementSuggestion,
  options?: {
    preferArrowFunctionForm?: boolean;
  },
): monacoLanguagesAPI.CompletionItem => {
  const type = suggestion.pureType;
  const insertText =
    type === ConceptType.FUNCTION || type === ConceptType.NATIVE_FUNCTION
      ? createFunctionInvocationSnippet(
          suggestion.pureName,
          suggestion.pureId,
          Boolean(options?.preferArrowFunctionForm),
        )
      : suggestion.pureName;
  const kind =
    type === ConceptType.PACKAGE
      ? monacoLanguagesAPI.CompletionItemKind.Folder
      : type === ConceptType.CLASS
        ? monacoLanguagesAPI.CompletionItemKind.Class
        : type === ConceptType.FUNCTION
          ? monacoLanguagesAPI.CompletionItemKind.Function
          : type === ConceptType.ENUMERATION
            ? monacoLanguagesAPI.CompletionItemKind.Enum
            : type === ConceptType.PROFILE
              ? monacoLanguagesAPI.CompletionItemKind.Module
              : type === ConceptType.ASSOCIATION
                ? monacoLanguagesAPI.CompletionItemKind.Interface
                : monacoLanguagesAPI.CompletionItemKind.Value;
  return {
    label: {
      label: suggestion.pureName,
      description: suggestion.text,
    },
    kind,
    filterText: suggestion.pureName,
    insertTextRules:
      monacoLanguagesAPI.CompletionItemInsertTextRule.InsertAsSnippet,
    insertText,
    // attempt to push package suggestions to the bottom of the list
    sortText:
      type === ConceptType.PACKAGE
        ? `zzzz_${suggestion.text}`
        : suggestion.text,
  } as monacoLanguagesAPI.CompletionItem;
};

const INCOMPLETE_PATH_PATTERN = /(?<incompletePath>(?:\w[\w$]*::)+$)/;

const ARROW_FUNCTION_USAGE_WITH_INCOMPLETE_PATH_PATTERN =
  /->\s*(?:\w[\w$]*::)+$/;
const CONSTRUCTOR_USAGE_WITH_INCOMPLETE_PATH_PATTERN = /\^\s*(?:\w[\w$]*::)+$/;

export const getIncompletePathSuggestions = async (
  position: IPosition,
  model: monacoEditorAPI.ITextModel,
  ideStore: PureIDEStore,
): Promise<monacoLanguagesAPI.CompletionItem[]> => {
  const incompletePathMatch = model
    .getLineContent(position.lineNumber)
    .substring(0, position.column - 1)
    .match(INCOMPLETE_PATH_PATTERN);
  if (incompletePathMatch?.groups?.incompletePath) {
    const isUsingArrowFunction = Boolean(
      model
        .getLineContent(position.lineNumber)
        .substring(0, position.column - 1)
        .match(ARROW_FUNCTION_USAGE_WITH_INCOMPLETE_PATH_PATTERN),
    );
    const isUsingConstructor = Boolean(
      model
        .getLineContent(position.lineNumber)
        .substring(0, position.column - 1)
        .match(CONSTRUCTOR_USAGE_WITH_INCOMPLETE_PATH_PATTERN),
    );

    let suggestions: ElementSuggestion[] = [];
    try {
      suggestions = (
        await ideStore.client.getSuggestionsForIncompletePath(
          incompletePathMatch.groups.incompletePath.substring(
            0,
            incompletePathMatch.groups.incompletePath.length -
              ELEMENT_PATH_DELIMITER.length,
          ),
          isUsingConstructor
            ? [ConceptType.CLASS]
            : isUsingArrowFunction
              ? [ConceptType.FUNCTION, ConceptType.NATIVE_FUNCTION]
              : [],
        )
      ).map((child) => deserialize(ElementSuggestion, child));
    } catch {
      // do nothing: provide no suggestions when error ocurred
    }
    return suggestions.map((suggestion) =>
      isUsingConstructor
        ? constructorClassSuggestionToCompletionItem(suggestion)
        : elementSuggestionToCompletionItem(suggestion, {
            preferArrowFunctionForm: isUsingArrowFunction,
          }),
    );
  }

  return [];
};

const IMPORT_STATEMENT_PATTERN =
  /^\s*import\s+(?:(?<importPath>(?:(?:\w[\w$]*)::)*\w[\w$]*)::*)/;

const getCurrentSectionImportPaths = (
  position: IPosition,
  model: monacoEditorAPI.ITextModel,
): string[] => {
  const textUntilPosition = model.getValueInRange({
    startLineNumber: 1,
    startColumn: 1,
    endLineNumber: position.lineNumber,
    endColumn: position.column,
  });
  const lines =
    // NOTE: since `###Pure` is implicitly considered as the first section, we prepend it to the text
    `${PARSER_SECTION_MARKER}${PURE_PARSER.PURE}\n${textUntilPosition}`.split(
      '\n',
    );
  return lines
    .slice(
      lines
        .map((line) => line.startsWith(PARSER_SECTION_MARKER))
        .lastIndexOf(true),
    )
    .map((line) => line.match(IMPORT_STATEMENT_PATTERN)?.groups?.importPath)
    .filter(isNonNullable);
};

const ARROW_FUNCTION_USAGE_PATTERN = /->\s*(?:\w[\w$]*)?$/;
const CONSTRUCTOR_USAGE_PATTERN = /\^\s*(?:\w[\w$]*)?$/;

export const getIdentifierSuggestions = async (
  position: IPosition,
  model: monacoEditorAPI.ITextModel,
  ideStore: PureIDEStore,
): Promise<monacoLanguagesAPI.CompletionItem[]> => {
  const importPaths = getCurrentSectionImportPaths(position, model);
  const isUsingArrowFunction = Boolean(
    model
      .getLineContent(position.lineNumber)
      .substring(0, position.column - 1)
      .match(ARROW_FUNCTION_USAGE_PATTERN),
  );
  const isUsingConstructor = Boolean(
    model
      .getLineContent(position.lineNumber)
      .substring(0, position.column - 1)
      .match(CONSTRUCTOR_USAGE_PATTERN),
  );

  let suggestions: ElementSuggestion[] = [];
  try {
    suggestions = (
      await ideStore.client.getSuggestionsForIdentifier(
        importPaths,
        isUsingConstructor
          ? [ConceptType.CLASS]
          : isUsingArrowFunction
            ? [ConceptType.FUNCTION, ConceptType.NATIVE_FUNCTION]
            : [],
      )
    ).map((child) => deserialize(ElementSuggestion, child));
  } catch {
    // do nothing: provide no suggestions when error ocurred
  }
  return suggestions.map((suggestion) =>
    isUsingConstructor
      ? constructorClassSuggestionToCompletionItem(suggestion)
      : elementSuggestionToCompletionItem(suggestion, {
          preferArrowFunctionForm: isUsingArrowFunction,
        }),
  );
};

export const getArrowFunctionSuggestions = async (
  position: IPosition,
  model: monacoEditorAPI.ITextModel,
  ideStore: PureIDEStore,
): Promise<monacoLanguagesAPI.CompletionItem[]> => {
  const importPaths = getCurrentSectionImportPaths(position, model);
  let suggestions: ElementSuggestion[] = [];
  try {
    suggestions = (
      await ideStore.client.getSuggestionsForIdentifier(importPaths, [
        ConceptType.FUNCTION,
        ConceptType.NATIVE_FUNCTION,
      ])
    ).map((child) => deserialize(ElementSuggestion, child));
  } catch {
    // do nothing: provide no suggestions when error ocurred
  }

  return suggestions.map((suggestion) =>
    elementSuggestionToCompletionItem(suggestion, {
      preferArrowFunctionForm: true,
    }),
  );
};

const attributeSuggestionToCompletionItem = (
  suggestion: AttributeSuggestion,
): monacoLanguagesAPI.CompletionItem => {
  const type = suggestion.pureType;
  const insertText =
    type === ConceptType.PROPERTY || type === ConceptType.QUALIFIED_PROPERTY
      ? `${suggestion.pureName}(\${1:})`
      : suggestion.pureName;
  const kind =
    type === ConceptType.PROPERTY
      ? monacoLanguagesAPI.CompletionItemKind.Property
      : type === ConceptType.QUALIFIED_PROPERTY
        ? monacoLanguagesAPI.CompletionItemKind.Method
        : type === ConceptType.TAG
          ? monacoLanguagesAPI.CompletionItemKind.Constant
          : type === ConceptType.STEREOTYPE
            ? monacoLanguagesAPI.CompletionItemKind.Value
            : type === ConceptType.ENUM_VALUE
              ? monacoLanguagesAPI.CompletionItemKind.Enum
              : monacoLanguagesAPI.CompletionItemKind.Value;
  return {
    label: {
      label: suggestion.pureName,
      description: `${suggestion.owner}.${suggestion.pureName}`,
    },
    kind,
    filterText: suggestion.pureName,
    insertTextRules:
      monacoLanguagesAPI.CompletionItemInsertTextRule.InsertAsSnippet,
    insertText,
  } as monacoLanguagesAPI.CompletionItem;
};

const ATTRIBUTE_ACCESSOR_PATTERN =
  /^(?<owner>(?:(?:\w[\w$]*)::)*\w[\w$]*)\s*.$/;

export const getAttributeSuggestions = async (
  position: IPosition,
  model: monacoEditorAPI.ITextModel,
  ideStore: PureIDEStore,
): Promise<monacoLanguagesAPI.CompletionItem[]> => {
  const attributeAccessorMatch = model
    .getLineContent(position.lineNumber)
    .substring(0, position.column - 1)
    .match(ATTRIBUTE_ACCESSOR_PATTERN);
  const importPaths = getCurrentSectionImportPaths(position, model);

  if (attributeAccessorMatch?.groups?.owner) {
    let suggestions: AttributeSuggestion[] = [];
    try {
      suggestions = (
        await ideStore.client.getSuggestionsForAttribute(
          importPaths,
          attributeAccessorMatch.groups.owner,
        )
      ).map((child) => deserialize(AttributeSuggestion, child));
    } catch {
      // do nothing: provide no suggestions when error ocurred
    }

    return suggestions.map((suggestion) =>
      attributeSuggestionToCompletionItem(suggestion),
    );
  }

  return [];
};

export const getConstructorClassSuggestions = async (
  position: IPosition,
  model: monacoEditorAPI.ITextModel,
  ideStore: PureIDEStore,
): Promise<monacoLanguagesAPI.CompletionItem[]> => {
  const importPaths = getCurrentSectionImportPaths(position, model);
  let suggestions: ClassSuggestion[] = [];
  try {
    suggestions = (
      await ideStore.client.getSuggestionsForClass(importPaths)
    ).map((child) => deserialize(ClassSuggestion, child));
  } catch {
    // do nothing: provide no suggestions when error ocurred
  }

  return suggestions.map((suggestion) =>
    constructorClassSuggestionToCompletionItem(suggestion),
  );
};

const castingClassSuggestionToCompletionItem = (
  suggestion: ClassSuggestion,
): monacoLanguagesAPI.CompletionItem =>
  ({
    label: {
      label: suggestion.pureName,
      description: suggestion.pureId,
    },
    kind: monacoLanguagesAPI.CompletionItemKind.Class,
    filterText: suggestion.pureName,
    insertTextRules:
      monacoLanguagesAPI.CompletionItemInsertTextRule.InsertAsSnippet,
    insertText: suggestion.pureName,
  }) as monacoLanguagesAPI.CompletionItem;

export const getCastingClassSuggestions = async (
  position: IPosition,
  model: monacoEditorAPI.ITextModel,
  ideStore: PureIDEStore,
): Promise<monacoLanguagesAPI.CompletionItem[]> => {
  const importPaths = getCurrentSectionImportPaths(position, model);
  let suggestions: ClassSuggestion[] = [];
  try {
    suggestions = (
      await ideStore.client.getSuggestionsForClass(importPaths)
    ).map((child) => deserialize(ClassSuggestion, child));
  } catch {
    // do nothing: provide no suggestions when error ocurred
  }

  return suggestions.map((suggestion) =>
    castingClassSuggestionToCompletionItem(suggestion),
  );
};

const variableSuggestionToCompletionItem = (
  suggestion: VariableSuggestion,
  isFromCompiledSource: boolean,
): monacoLanguagesAPI.CompletionItem =>
  ({
    label: suggestion.name,
    kind: monacoLanguagesAPI.CompletionItemKind.Variable,
    insertTextRules:
      monacoLanguagesAPI.CompletionItemInsertTextRule.InsertAsSnippet,
    // if suggestions coming from compiled source, they are ranked higher
    sortText: !isFromCompiledSource
      ? `zzzz_${suggestion.name}`
      : suggestion.name,
    insertText: suggestion.name,
  }) as monacoLanguagesAPI.CompletionItem;

const VARIABLE_SUGGESTION_SCANNING_RANGE = 10;

export const getVariableSuggestions = async (
  position: IPosition,
  model: monacoEditorAPI.ITextModel,
  filePath: string,
  ideStore: PureIDEStore,
): Promise<monacoLanguagesAPI.CompletionItem[]> => {
  let suggestions: VariableSuggestion[] = [];

  // get suggestions from compiled source
  try {
    suggestions = (
      await ideStore.client.getSuggestionsForVariable(
        filePath,
        position.lineNumber,
        position.column,
      )
    ).map((child) => deserialize(VariableSuggestion, child));
  } catch {
    // do nothing: provide no suggestions when error ocurred
  }
  // NOTE: potentially, we could scan for all tokens that come before the current position
  // and filter out variable suggestions that nolonger available

  // get suggestions from current (potentially non-compiled) source
  const varNames = new Set<string>();

  let stopSearching = false;
  for (
    let i = position.lineNumber - 1;
    i >
    Math.max(0, position.lineNumber - 1 - VARIABLE_SUGGESTION_SCANNING_RANGE);
    --i
  ) {
    // NOTE: stop searching after reaching function definition or section marker
    if (stopSearching) {
      break;
    }
    const line = model.getLineContent(i + 1);
    if (line.match(/^\s*function\s+/) || line.match(/^\s*###\w+/)) {
      stopSearching = true;
    }

    // scan for potential variable/parameter declarations
    const lineTokens = guaranteeNonNullable(
      monacoEditorAPI.tokenize(
        model.getLineContent(i + 1),
        CODE_EDITOR_LANGUAGE.PURE,
      )[0],
    );
    lineTokens.forEach((token, lineIndex) => {
      if (
        // must come before the current position
        (i !== position.lineNumber - 1 || token.offset < position.column) &&
        isTokenOneOf(
          token.type,
          [PURE_GRAMMAR_TOKEN.VARIABLE, PURE_GRAMMAR_TOKEN.PARAMETER],
          true,
        )
      ) {
        varNames.add(
          model.getValueInRange({
            startLineNumber: i + 1,
            startColumn: token.offset + 1,
            endLineNumber: i + 1,
            endColumn:
              lineIndex === lineTokens.length - 1
                ? Number.MAX_SAFE_INTEGER
                : guaranteeNonNullable(lineTokens[lineIndex + 1]).offset + 1,
          }),
        );
      }
    });
  }
  const variablesFoundFromSuggestions = suggestions.map(
    (suggestion) => suggestion.name,
  );

  return suggestions
    .map((suggestion) => variableSuggestionToCompletionItem(suggestion, true))
    .concat(
      Array.from(varNames)
        .filter((varName) => !variablesFoundFromSuggestions.includes(varName))
        .map((varName) => {
          const suggestion = new VariableSuggestion();
          suggestion.name = varName;
          return suggestion;
        })
        .map((suggestion) =>
          variableSuggestionToCompletionItem(suggestion, false),
        ),
    );
};
