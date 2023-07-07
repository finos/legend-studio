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

/* eslint-disable prefer-named-capture-group */
import { PURE_ELEMENT_NAME, PURE_CONNECTION_NAME } from '@finos/legend-graph';
import { languages as monacoLanguagesAPI } from 'monaco-editor';
import { PURE_GRAMMAR_TOKEN } from './PureLanguage.js';
import { CODE_EDITOR_LANGUAGE } from './CodeEditorUtils.js';

/**
 * The postfix to be added to all token types, i.e. identifier.pure, number.pure, etc.
 */
const PURE_GRAMMAR_TOKEN_POSTFIX = '.pure';

// Taken from `monaco-languages` configuration for Java in order to do propert brace matching
// See https://github.com/microsoft/monaco-languages/blob/master/src/java/java.ts
const configuration: monacoLanguagesAPI.LanguageConfiguration = {
  // NOTE: Pure identifier includes $ but not in the first position (as that is parsed as a variable)
  wordPattern:
    /(-?\d*\.\d\w*)|([^`~!@#%^$&*()\-=+[{\]}\\|;:'",.<>/?\s][^`~!@#%^&*()\-=+[{\]}\\|;:'",.<>/?\s]*)/,
  comments: {
    lineComment: '//',
    blockComment: ['/*', '*/'],
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
    { open: '<', close: '>' },
    { open: '<<', close: '>>' },
  ],
  folding: {
    markers: {
      start: new RegExp('^\\s*//\\s*(?:(?:#?region\\b)|(?:<editor-fold\\b))'),
      end: new RegExp('^\\s*//\\s*(?:(?:#?endregion\\b)|(?:</editor-fold>))'),
    },
  },
};

/**
 * Create new monarch definition to support syntax-highlighting
 * See https://microsoft.github.io/monaco-editor/monarch.html
 *
 * The way SQL monarch definition is organized is good and worth learning from
 * See https://github.com/microsoft/monaco-languages/blob/master/src/sql/sql.ts
 *
 * NOTE: using `monarch` only allows fairly very basic syntax-highlighting
 * to actually do full AST analysis, we might need something more serious like
 * using TextMate grammar which is used by VSCode itself
 * See https://github.com/microsoft/monaco-editor#faq
 * See https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide
 */
const generateLanguageMonarch = (
  extraKeywords: string[],
): monacoLanguagesAPI.IMonarchLanguage =>
  // TODO: complete syntax-highlighter for core features like constraint, derived properties, etc.
  // TODO: add syntax highlighting for modules/plugins (come up with a plugin mechanism to do this).
  ({
    defaultToken: 'invalid',
    tokenPostfix: PURE_GRAMMAR_TOKEN_POSTFIX,

    keywords: [
      ...extraKeywords,
      // relational
      'Schema',
      'Table',
      'Join',
      'View',
      'primaryKey',
      'groupBy',
      'mainTable',
      // native
      'let',
      'extends',
      'true',
      'false',
      'projects',
      // elements
      PURE_ELEMENT_NAME.CLASS,
      PURE_ELEMENT_NAME.ASSOCIATION,
      PURE_ELEMENT_NAME.ENUMERATION,
      PURE_ELEMENT_NAME.MEASURE,
      PURE_ELEMENT_NAME.PROFILE,
      PURE_ELEMENT_NAME.FUNCTION,
      PURE_ELEMENT_NAME.MAPPING,
      PURE_ELEMENT_NAME.RUNTIME,
      PURE_ELEMENT_NAME.CONNECTION,
      PURE_ELEMENT_NAME.FILE_GENERATION,
      PURE_ELEMENT_NAME.GENERATION_SPECIFICATION,
      PURE_ELEMENT_NAME.DATA_ELEMENT,
      // connections
      PURE_CONNECTION_NAME.JSON_MODEL_CONNECTION,
      PURE_CONNECTION_NAME.MODEL_CHAIN_CONNECTION,
      PURE_CONNECTION_NAME.XML_MODEL_CONNECTION,
      // mapping
      'include',
      'EnumerationMapping',
      'Pure',
      'AssociationMapping',
      'XStore',
      'AggregationAware',
      /**
       * @modularize
       * See https://github.com/finos/legend-studio/issues/65
       */
      PURE_ELEMENT_NAME.SERVICE,
      PURE_ELEMENT_NAME.FLAT_DATA,
      PURE_ELEMENT_NAME.DATABASE,
      PURE_CONNECTION_NAME.FLAT_DATA_CONNECTION,
      PURE_CONNECTION_NAME.RELATIONAL_DATABASE_CONNECTION,
      'Relational',
    ],

    operators: [
      '=',
      '>',
      '<',
      '!',
      '~',
      '?',
      ':',
      '==',
      '<=',
      '>=',
      '&&',
      '||',
      '++',
      '--',
      '+',
      '-',
      '*',
      '/',
      '&',
      '|',
      '^',
      '%',
      '->',
      '#{',
      '}#',
      '@',
      '<<',
      '>>',
    ],

    languageStructs: ['import', 'native'],

    // common regular expressions to be used in tokenizer
    identifier: /[a-zA-Z_$][\w$]*/,
    symbols: /[=><!~?:&|+\-*/^%#@]+/,
    escapes:
      /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    digits: /\d+(_+\d+)*/,
    octaldigits: /[0-7]+(_+[0-7]+)*/,
    binarydigits: /[0-1]+(_+[0-1]+)*/,
    hexdigits: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,
    multiplicity: /\[(?:[a-zA-Z0-9]+(?:\.\.(?:[a-zA-Z0-9]+|\*|))?|\*)\]/,
    package: /(?:[\w_]+::)+/,
    // NOTE: generics is a little tricky because in order to do it right, we have to
    // do some sort of bracket matching, but we just can use a simple tokenizer here
    // so to account for cases like `<Nil,Any|*>)->` `Function<{T[1]->Boolean[1]}>[1]`
    // we have to make sure the content does not contain any `:` or `.` characters
    // in order to avoid the accidental greedy match with inputs like
    // `function doSomething<T>(a: Function<T[1]->Boolean[1]>)`
    // nor we want to make sure the last character of the content is not `-` to avoid
    // accidentally matching `->` as the end of the generics
    generics: /(?:(?:<\w+>)|(?:<[^:.@^()]+[^-]>))/,
    date: /%-?\d+(?:-\d+(?:-\d+(?:T(?:\d+(?::\d+(?::\d+(?:.\d+)?)?)?)(?:[+-][0-9]{4})?)))/,
    time: /%\d+(?::\d+(?::\d+(?:.\d+)?)?)?/,

    tokenizer: {
      root: [
        // NOTE: since `monaco-editor` Monarch is only meant for tokenizing
        // and the need to highlight Pure syntax is more than just token-based,
        // but semantic/syntax-based we have to create these complex rules.
        // the things to note here is these are not meant to match multilines
        // and they must be placed before identifier rules since token matching
        // is run in order
        // See https://github.com/microsoft/monaco-editor/issues/316#issuecomment-273555698
        // See https://github.com/microsoft/monaco-editor/issues/571#issuecomment-342555050
        // See https://microsoft.github.io/monaco-editor/monarch.html
        { include: '@pure' },

        { include: '@date' },
        { include: '@color' },

        // parser markers
        [
          // NOTE: any leading whitespace to the section header is considered invalid syntax
          /^\s*###[\w]+/,
          PURE_GRAMMAR_TOKEN.PARSER,
        ],

        // identifiers and keywords
        [
          /(@identifier)/,
          {
            cases: {
              '@languageStructs': PURE_GRAMMAR_TOKEN.LANGUAGE_STRUCT,
              '@keywords': `${PURE_GRAMMAR_TOKEN.KEYWORD}.$0`,
              // function descriptor
              '([a-zA-Z_$][\\w$]*)_((\\w+_(([a-zA-Z0-9]+)|(\\$[a-zA-Z0-9]+_[a-zA-Z0-9]+\\$)))__)*(\\w+_(([a-zA-Z0-9]+)|(\\$[a-zA-Z0-9]+_[a-zA-Z0-9]+\\$)))_':
                PURE_GRAMMAR_TOKEN.TYPE,
              '@default': PURE_GRAMMAR_TOKEN.IDENTIFIER,
            },
          },
        ],

        // whitespace
        { include: '@whitespace' },

        // delimiters and operators
        [/[{}()[\]]/, '@brackets'],
        [/[<>](?!@symbols)/, '@brackets'],
        [
          /@symbols/,
          {
            cases: {
              '@operators': PURE_GRAMMAR_TOKEN.OPERATOR,
              '@default': PURE_GRAMMAR_TOKEN.IDENTIFIER,
            },
          },
        ],

        { include: '@number' },

        // delimiter: after number because of .\d floats
        [/[;,.]/, PURE_GRAMMAR_TOKEN.DELIMITER],

        // strings
        // NOTE: including non-teminated string so as people type ', we can start showing them that they're working on a string
        [/'([^'\\]|\\.)*$/, `${PURE_GRAMMAR_TOKEN.STRING}.invalid`],
        [/'/, PURE_GRAMMAR_TOKEN.STRING, '@string'],

        { include: '@characters' },
      ],

      pure: [
        // type
        [/(@package\*)/, [PURE_GRAMMAR_TOKEN.PACKAGE]], // import path
        [
          /(@package?)(@identifier)(@generics?)(\s*)(@multiplicity)/,
          [
            PURE_GRAMMAR_TOKEN.PACKAGE,
            PURE_GRAMMAR_TOKEN.TYPE,
            PURE_GRAMMAR_TOKEN.GENERICS,
            PURE_GRAMMAR_TOKEN.WHITESPACE,
            PURE_GRAMMAR_TOKEN.MULTIPLICITY,
          ],
        ],
        [
          /(@package)(@identifier)(@generics?)/,
          [
            PURE_GRAMMAR_TOKEN.PACKAGE,
            PURE_GRAMMAR_TOKEN.TYPE,
            PURE_GRAMMAR_TOKEN.GENERICS,
          ],
        ],

        // special operators that uses type (e.g. constructor, cast)
        [
          /([@^])(\s*)(@package?)(@identifier)(@generics?)(@multiplicity?)/,
          [
            `${PURE_GRAMMAR_TOKEN.TYPE}.operator`,
            PURE_GRAMMAR_TOKEN.WHITESPACE,
            PURE_GRAMMAR_TOKEN.PACKAGE,
            PURE_GRAMMAR_TOKEN.TYPE,
            PURE_GRAMMAR_TOKEN.GENERICS,
            PURE_GRAMMAR_TOKEN.MULTIPLICITY,
          ],
        ],

        // property / parameter
        [
          /(\.\s*)(@identifier)/,
          [PURE_GRAMMAR_TOKEN.DELIMITER, PURE_GRAMMAR_TOKEN.PROPERTY],
        ],
        [
          /(@identifier)(\s*=)/,
          [PURE_GRAMMAR_TOKEN.PROPERTY, PURE_GRAMMAR_TOKEN.OPERATOR],
        ],
        [
          /(@identifier)(\.)(@identifier)/,
          [
            PURE_GRAMMAR_TOKEN.TYPE,
            PURE_GRAMMAR_TOKEN.OPERATOR,
            PURE_GRAMMAR_TOKEN.PROPERTY,
          ],
        ], // could be: property chain, profile tag, and stereotype
        [
          /(@identifier)(\s*:)/,
          [PURE_GRAMMAR_TOKEN.PARAMETER, PURE_GRAMMAR_TOKEN.OPERATOR],
        ],

        // variables
        [
          /(let)(\s+)(@identifier)(\s*=)/,
          [
            PURE_GRAMMAR_TOKEN.KEYWORD,
            PURE_GRAMMAR_TOKEN.WHITESPACE,
            PURE_GRAMMAR_TOKEN.VARIABLE,
            PURE_GRAMMAR_TOKEN.OPERATOR,
          ],
        ],
        [/(\$@identifier)/, [`${PURE_GRAMMAR_TOKEN.VARIABLE}.reference`]],
      ],

      date: [
        [/(%latest)/, [`${PURE_GRAMMAR_TOKEN.DATE}.latest`]],
        [/(@date)/, [PURE_GRAMMAR_TOKEN.DATE]],
        [/(@time)/, [`${PURE_GRAMMAR_TOKEN.DATE}.time`]],
      ],

      color: [[/(#[0-9a-fA-F]{6})/, [PURE_GRAMMAR_TOKEN.COLOR]]],

      number: [
        [
          /(@digits)[eE]([-+]?(@digits))?[fFdD]?/,
          `${PURE_GRAMMAR_TOKEN.NUMBER}.float`,
        ],
        [
          /(@digits)\.(@digits)([eE][-+]?(@digits))?[fFdD]?/,
          `${PURE_GRAMMAR_TOKEN.NUMBER}.float`,
        ],
        [/0[xX](@hexdigits)[Ll]?/, `${PURE_GRAMMAR_TOKEN.NUMBER}.hex`],
        [/0(@octaldigits)[Ll]?/, `${PURE_GRAMMAR_TOKEN.NUMBER}.octal`],
        [/0[bB](@binarydigits)[Ll]?/, `${PURE_GRAMMAR_TOKEN.NUMBER}.binary`],
        [/(@digits)[fFdD]/, `${PURE_GRAMMAR_TOKEN.NUMBER}.float`],
        [/(@digits)[lL]?/, PURE_GRAMMAR_TOKEN.NUMBER],
      ],

      whitespace: [
        [/[ \t\r\n]+/, PURE_GRAMMAR_TOKEN.WHITESPACE],
        [/\/\*\*(?!\/)/, `${PURE_GRAMMAR_TOKEN.COMMENT}.doc`, '@doc'],
        [/\/\*/, PURE_GRAMMAR_TOKEN.COMMENT, '@comment'],
        [/\/\/.*$/, PURE_GRAMMAR_TOKEN.COMMENT],
      ],

      comment: [
        [/[^/*]+/, PURE_GRAMMAR_TOKEN.COMMENT],
        // [/\/\*/, PURE_GRAMMAR_TOKEN.COMMENT, '@push' ],    // nested comment not allowed :-(
        // [/\/\*/, ${PURE_GRAMMAR_TOKEN.COMMENT}.invalid` ],    // this breaks block comments in the shape of /* //*/
        [/\*\//, PURE_GRAMMAR_TOKEN.COMMENT, '@pop'],
        [/[/*]/, PURE_GRAMMAR_TOKEN.COMMENT],
      ],

      // Identical copy of comment above, except for the addition of .doc
      doc: [
        [/[^/*]+/, `${PURE_GRAMMAR_TOKEN.COMMENT}.doc`],
        // [/\/\*/, `${PURE_GRAMMAR_TOKEN.COMMENT}.doc`, '@push' ],    // nested comment not allowed :-(
        [/\/\*/, `${PURE_GRAMMAR_TOKEN.COMMENT}.doc.invalid`],
        [/\*\//, `${PURE_GRAMMAR_TOKEN.COMMENT}.doc`, '@pop'],
        [/[/*]/, `${PURE_GRAMMAR_TOKEN.COMMENT}.doc`],
      ],

      string: [
        [/[^\\']+/, PURE_GRAMMAR_TOKEN.STRING],
        [/@escapes/, `${PURE_GRAMMAR_TOKEN.STRING}.escape`],
        [/\\./, `${PURE_GRAMMAR_TOKEN.STRING}.escape.invalid`],
        [/'/, PURE_GRAMMAR_TOKEN.STRING, '@pop'],
      ],

      characters: [
        [/'[^\\']'/, PURE_GRAMMAR_TOKEN.STRING],
        [
          /(')(@escapes)(')/,
          [
            PURE_GRAMMAR_TOKEN.STRING,
            `${PURE_GRAMMAR_TOKEN.STRING}.escape`,
            PURE_GRAMMAR_TOKEN.STRING,
          ],
        ],
        [/'/, `${PURE_GRAMMAR_TOKEN.STRING}.invalid`],
      ],
    },
  }) as monacoLanguagesAPI.IMonarchLanguage;

export function setupPureLanguageService(options?: {
  extraKeywords?: string[] | undefined;
}): void {
  monacoLanguagesAPI.register({ id: CODE_EDITOR_LANGUAGE.PURE });
  monacoLanguagesAPI.setLanguageConfiguration(
    CODE_EDITOR_LANGUAGE.PURE,
    configuration,
  );
  monacoLanguagesAPI.setMonarchTokensProvider(
    CODE_EDITOR_LANGUAGE.PURE,
    generateLanguageMonarch(options?.extraKeywords ?? []),
  );
}
