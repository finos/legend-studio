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
import {
  type GraphManagerPluginManager,
  PARSER_SECTION_MARKER,
  PURE_ELEMENT_NAME,
  PURE_CONNECTION_NAME,
  PURE_PARSER,
} from '@finos/legend-graph';
import {
  editor as monacoEditorAPI,
  KeyCode,
  KeyMod,
  languages as monacoLanguagesAPI,
} from 'monaco-editor';
import { EDITOR_LANGUAGE, EDITOR_THEME } from '../const.js';

const theme: monacoEditorAPI.IStandaloneThemeData = {
  base: 'vs-dark', // can also be vs-dark or hc-black
  inherit: true, // can also be false to completely replace the builtin rules
  colors: {},
  rules: [
    // NOTE: unfortunately, `monaco-editor` only accepts HEX values, not CSS variables
    { token: 'identifier', foreground: 'dcdcaa' },
    { token: 'number', foreground: 'b5cea8' },
    { token: 'date', foreground: 'b5cea8' },
    { token: 'color', foreground: 'b5cea8' },
    { token: 'package', foreground: '808080' },
    { token: 'parser-marker', foreground: 'c586c0' },
    { token: 'function', foreground: 'dcdcaa' },
    { token: 'language-struct', foreground: 'c586c0' },
    { token: 'multiplicity', foreground: '2d796b' },
    { token: 'generics', foreground: '2d796b' },
    { token: 'property', foreground: '9cdcfe' },
    { token: 'variable', foreground: '4fc1ff' },
    { token: 'type', foreground: '3dc9b0' },
    { token: 'type-operator', foreground: '3dc9b0' },
  ],
};

// Taken from `monaco-languages` configuration for Java in order to do propert brace matching
// See https://github.com/microsoft/monaco-languages/blob/master/src/java/java.ts
const configuration: monacoLanguagesAPI.LanguageConfiguration = {
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
  extraParsers: string[],
): monacoLanguagesAPI.IMonarchLanguage =>
  // TODO: complete syntax-highlighter for core features like constraint, derived properties, etc.
  // TODO: add syntax highlighting for modules/plugins (come up with a plugin mechanism to do this).
  ({
    defaultToken: 'invalid',
    tokenPostfix: '.pure',

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

    parsers: (
      [
        PURE_PARSER.PURE,
        PURE_PARSER.CONNECTION,
        PURE_PARSER.RUNTIME,
        PURE_PARSER.MAPPING,
        PURE_PARSER.SERVICE,
        PURE_PARSER.FLATDATA,
        PURE_PARSER.RELATIONAL,
        PURE_PARSER.GENERATION_SPECIFICATION,
        PURE_PARSER.FILE_GENERATION_SPECIFICATION,
        PURE_PARSER.DATA,
      ] as string[]
    )
      .concat(extraParsers)
      .map((parser) => `${PARSER_SECTION_MARKER}${parser}`),

    // common regular expressions to be used in tokenizer
    identifier: /[a-zA-Z_$][\w$]*/,
    symbols: /[=><!~?:&|+\-*/^%#@]+/,
    escapes:
      /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    digits: /\d+(_+\d+)*/,
    octaldigits: /[0-7]+(_+[0-7]+)*/,
    binarydigits: /[0-1]+(_+[0-1]+)*/,
    hexdigits: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,
    multiplicity: /\[(?:\d+(?:\.\.(?:\d+|\*|))?|\*)\]/,
    package: /(?:[\w_]+::)+/,
    generics: /<.+>/,
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
          {
            cases: {
              '@parsers': 'parser-marker',
              '@default': 'invalid',
            },
          },
        ],

        // identifiers and keywords
        [
          /(@identifier)/,
          {
            cases: {
              '@languageStructs': 'language-struct',
              '@keywords': 'keyword.$0',
              '[A-Z][\\w$]*': 'type',
              '@default': 'identifier',
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
              '@operators': 'operator',
              '@default': 'identifier',
            },
          },
        ],

        { include: '@number' },

        // delimiter: after number because of .\d floats
        [/[;,.]/, 'delimiter'],

        // strings
        // NOTE: including non-teminated string so as people type ', we can start showing them that they're working on a string
        [/'([^'\\]|\\.)*$/, 'string.invalid'],
        [/'/, 'string', '@string'],

        { include: '@characters' },
      ],

      pure: [
        // type
        [/(@package)(\*)/, ['package', 'package']], // import path
        [
          /(@package?)(@identifier)(@generics?)(\s*)(@multiplicity)/,
          ['package', 'type', 'generics', '', 'multiplicity'],
        ],
        [
          /(@package)(@identifier)(@generics?)/,
          ['package', 'type', 'generics'],
        ],

        // special operators that uses type (e.g. constructor, cast)
        [
          /([@^])(?:\s*)(@package?)(@identifier)(@generics?)(@multiplicity?)/,
          ['type-operator', 'package', 'type', 'generics', 'multiplicity'],
        ],

        // property / parameter
        [/(\.\s*)(@identifier)/, ['delimiter', 'property']],
        [/(@identifier)(\s*[:=])/, ['property', '']],
        [/(@identifier)(\.)(@identifier)/, ['type', '', 'property']], // profile tag and stereotype

        // variables
        [/(let)(\s*)(@identifier)(\s*[:=])/, ['keyword', '', 'variable', '']],
        [/(\$@identifier)/, ['variable']],
      ],

      date: [
        [/(%latest)/, ['date']],
        [/(@date)/, ['date']],
        [/(@time)/, ['date']],
      ],

      color: [[/(#[0-9a-fA-F]{6})/, ['color']]],

      number: [
        [/(@digits)[eE]([-+]?(@digits))?[fFdD]?/, 'number.float'],
        [/(@digits)\.(@digits)([eE][-+]?(@digits))?[fFdD]?/, 'number.float'],
        [/0[xX](@hexdigits)[Ll]?/, 'number.hex'],
        [/0(@octaldigits)[Ll]?/, 'number.octal'],
        [/0[bB](@binarydigits)[Ll]?/, 'number.binary'],
        [/(@digits)[fFdD]/, 'number.float'],
        [/(@digits)[lL]?/, 'number'],
      ],

      whitespace: [
        [/[ \t\r\n]+/, ''],
        [/\/\*\*(?!\/)/, 'comment.doc', '@doc'],
        [/\/\*/, 'comment', '@comment'],
        [/\/\/.*$/, 'comment'],
      ],

      comment: [
        [/[^/*]+/, 'comment'],
        // [/\/\*/, 'comment', '@push' ],    // nested comment not allowed :-(
        // [/\/\*/,    'comment.invalid' ],    // this breaks block comments in the shape of /* //*/
        [/\*\//, 'comment', '@pop'],
        [/[/*]/, 'comment'],
      ],

      // Identical copy of comment above, except for the addition of .doc
      doc: [
        [/[^/*]+/, 'comment.doc'],
        // [/\/\*/, 'comment.doc', '@push' ],    // nested comment not allowed :-(
        [/\/\*/, 'comment.doc.invalid'],
        [/\*\//, 'comment.doc', '@pop'],
        [/[/*]/, 'comment.doc'],
      ],

      string: [
        [/[^\\']+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/'/, 'string', '@pop'],
      ],

      characters: [
        [/'[^\\']'/, 'string'],
        [/(')(@escapes)(')/, ['string', 'string.escape', 'string']],
        [/'/, 'string.invalid'],
      ],
    },
  } as monacoLanguagesAPI.IMonarchLanguage);

export const setupPureLanguageService = (
  pluginManager: GraphManagerPluginManager,
): void => {
  // register Pure language in `monaco-editor`
  monacoEditorAPI.defineTheme(EDITOR_THEME.LEGEND, theme);
  // Override `monaco-editor` native hotkeys
  // See https://github.com/microsoft/monaco-editor/issues/102#issuecomment-1282897640
  monacoEditorAPI.addKeybindingRules([
    {
      // disable cursor move (core command)
      keybinding: KeyMod.WinCtrl | KeyCode.KeyB,
      command: null,
    },
    {
      // disable cursor move (core command)
      keybinding: KeyMod.WinCtrl | KeyCode.KeyO,
      command: null,
    },
    {
      // disable cursor move (core command)
      keybinding: KeyMod.WinCtrl | KeyCode.KeyP,
      command: null,
    },
    {
      // disable show command center
      keybinding: KeyCode.F1,
      command: null,
    },
    {
      // disable show error command
      keybinding: KeyCode.F8,
      command: null,
    },
    {
      // disable toggle debugger breakpoint
      keybinding: KeyCode.F9,
      command: null,
    },
    {
      // disable toggle debugger breakpoint
      keybinding: KeyMod.Shift | KeyCode.F10,
      command: null,
    },
  ]);
  monacoLanguagesAPI.register({ id: EDITOR_LANGUAGE.PURE });
  monacoLanguagesAPI.setLanguageConfiguration(
    EDITOR_LANGUAGE.PURE,
    configuration,
  );
  monacoLanguagesAPI.setMonarchTokensProvider(
    EDITOR_LANGUAGE.PURE,
    generateLanguageMonarch(
      pluginManager
        .getPureGraphManagerPlugins()
        .flatMap((plugin) => plugin.getExtraPureGrammarKeywords?.() ?? []),
      pluginManager
        .getPureGraphManagerPlugins()
        .flatMap((plugin) => plugin.getExtraPureGrammarParserNames?.() ?? []),
    ),
  );
};
