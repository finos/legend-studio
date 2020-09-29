/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* eslint-disable prefer-named-capture-group */
import { editor as monacoEditorAPI, languages as monacoLanguagesAPI } from 'monaco-editor';

/* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
export enum GRAMMAR_ELEMENT_TYPE_LABEL {
  PROFILE = 'Profile',
  CLASS = 'Class',
  ENUMERATION = 'Enum',
  MEASURE = 'Measure',
  ASSOCIATION = 'Association',
  MAPPING = 'Mapping',
  DIAGRAM = 'Diagram',
  FUNCTION = 'function',
  TEXT = 'Text',
  RUNTIME = 'Runtime',
  CONNECTION = 'Connection',
  FILE_GENERATION = 'FileGeneration',
  GENERATION_SPECIFICATION = 'GenerationSpecification',
  /* @MARKER: NEW CONNECTION TYPE SUPPORT --- consider adding connection type handler here whenever support for a new one is added to the app */
  JSON_MODEL_CONNECTION = 'JsonModelConnection',
  XML_MODEL_CONNECTION = 'XmlModelConnection',
  /* @MARKER: NEW FILE GENERATION TYPE SUPPORT --- consider adding new file generation type handler here whenever support for a new file generation type is added to the app */
  // FIXME: we should add more grammar keyword for file generation types so that we can locate them correctly in hackermode
}

/* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
export const getGrammarElementTypeLabelRegexString = (typeLabel: string, elementPath: string): string =>
  (`^([^\\S\\n])*${typeLabel}` // start with type label (accounted for spaces, but not newline)
    + `(\\s+<<.*>>)?` // account for stereotype
    + `(\\s+\\{.*\\})?` // account for tagged value
    + `\\s+${elementPath}` // element path
    + `[\\s\\n]`) // account for termination after element path
    .replace(/\$/g, '\\$'); // replace special character $ by \\$

export const theme: monacoEditorAPI.IStandaloneThemeData = {
  base: 'vs-dark', // can also be vs-dark or hc-black
  inherit: true, // can also be false to completely replace the builtin rules
  colors: {},
  rules: [
    { token: 'package', foreground: '808080' },
    { token: 'parser-marker', foreground: 'c586c0' },
    { token: 'property', foreground: 'dcdcaa' },
    { token: 'function', foreground: 'dcdcaa' },
    { token: 'language-struct', foreground: 'c586c0' },
    // { token: 'multiplicity', foreground: '2d796b' },
    { token: 'attribute', foreground: '9cdcfe' },
    { token: 'cast', foreground: 'f98a00' },
  ]
};

// Taken from `monaco-languages` configuration for Java in order to do propert brace matching
// See https://github.com/microsoft/monaco-languages/blob/master/src/java/java.ts
export const configuration: monacoLanguagesAPI.LanguageConfiguration = {
  // the default separators except `@$`
  wordPattern: /(-?\d*\.\d\w*)|([^`~!#%^&*()-=+[{]}\\\|;:'",\.<>\/\?\s]+)/g,
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
    { open: '\'', close: '\'' },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: '\'', close: '\'' },
    { open: '<', close: '>' },
  ],
  folding: {
    markers: {
      start: new RegExp('^\\s*//\\s*(?:(?:#?region\\b)|(?:<editor-fold\\b))'),
      end: new RegExp('^\\s*//\\s*(?:(?:#?endregion\\b)|(?:</editor-fold>))')
    }
  }
};

// Monarch definition for tokenization
// See https://microsoft.github.io/monaco-editor/monarch.html
// The way SQL monarch definition is organized is good and worth learning from
// See https://github.com/microsoft/monaco-languages/blob/master/src/sql/sql.ts
export const language = {
  defaultToken: 'invalid',
  tokenPostfix: '.pure',
  keywords: [
    'extends',
    'function',
    'projects',
    /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
    GRAMMAR_ELEMENT_TYPE_LABEL.CLASS,
    GRAMMAR_ELEMENT_TYPE_LABEL.ASSOCIATION,
    GRAMMAR_ELEMENT_TYPE_LABEL.ENUMERATION,
    GRAMMAR_ELEMENT_TYPE_LABEL.MEASURE,
    GRAMMAR_ELEMENT_TYPE_LABEL.PROFILE,
    GRAMMAR_ELEMENT_TYPE_LABEL.MAPPING,
    GRAMMAR_ELEMENT_TYPE_LABEL.DIAGRAM,
    GRAMMAR_ELEMENT_TYPE_LABEL.TEXT,
    GRAMMAR_ELEMENT_TYPE_LABEL.RUNTIME,
    GRAMMAR_ELEMENT_TYPE_LABEL.CONNECTION,
    GRAMMAR_ELEMENT_TYPE_LABEL.FILE_GENERATION,
    GRAMMAR_ELEMENT_TYPE_LABEL.GENERATION_SPECIFICATION,
    /* @MARKER: NEW CONNECTION TYPE SUPPORT --- consider adding connection type handler here whenever support for a new one is added to the app */
    GRAMMAR_ELEMENT_TYPE_LABEL.JSON_MODEL_CONNECTION,
    GRAMMAR_ELEMENT_TYPE_LABEL.XML_MODEL_CONNECTION,
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
    '->'
  ],
  languageStructs: [
    'import',
    'native',
    'if',
    'fold'
  ],
  parsers: [
    /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
    '###Pure',
    '###Mapping',
    '###Diagram',
    '###Text',
    '###Connection',
    '###Runtime',
    '###FileGeneration',
    '###GenerationSpecification',
  ],

  // common regular expressions to be used in tokenizer
  symbols: /[=><!~?:&|+\-*/^%]+/,
  escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
  digits: /\d+(_+\d+)*/,
  octaldigits: /[0-7]+(_+[0-7]+)*/,
  binarydigits: /[0-1]+(_+[0-1]+)*/,
  hexdigits: /[[0-9a-fA-F]+(_+[0-9a-fA-F]+)*/,
  multiplicity: /\[(?:\d+(?:\.\.(?:\d+|\*|))?|\*)\]/,
  package: /(?:[\w_]+::)+/,

  // TODO
  // Enum ui::meta::pure::mapping::modelToModel::test::shared::dest::Side
  // {
  //    Buy,Sell
  // }

  // Profile apps::pure::transition::rmd::cerebro::profiles::Aggregation
  // {
  //    stereotypes: [];
  //    tags: [];
  // }

  // Derived properties
  // car(s:String[1]){$s + 'a'->toString()} : String[*];

  // Multiplicity will screw array of number
  // [1,2]

  // Constraints
  //   Class ui::meta::pure::constraints::tests::model::GSEmployee extends ui::meta::pure::constraints::tests::model::Person
  // [
  //     nameStartsWithGS: $this.firm.legalName->startsWith('MC'),
  //     hasDegrees: $this.degreesHeld->contains(ui::meta::pure::constraints::tests::model::Degree->extractEnumValue('BSc')),
  //     shouldBeSmart: $this.isSmart,
  //     3: $this.application->isEmpty()->not() && $this.application->toOne().legalName->startsWith('MC')
  // ]
  // {
  //     firm : ui::meta::pure::constraints::tests::model::Firm[1];
  // }

  // Mapping Test
  // Diagram
  // Deep/Graph fetch tree

  tokenizer: {
    root: [

      // multiplicity
      [/@multiplicity/, 'multiplicity'],

      // packages
      { include: '@package' },

      // properties
      [/(\.)([\w_]+)/, ['delimiter', 'property']],

      // functions
      { include: '@function' },

      // parser markers
      [/^###[\w]+/, {
        cases: {
          '@parsers': 'parser-marker',
          '@default': 'invalid'
        }
      }],

      // identifiers and keywords
      [/[a-zA-Z_$][\w$]*/, {
        cases: {
          '@languageStructs': 'language-struct',
          '@keywords': 'keyword.$0',
          '@default': 'identifier'
        }
      }],

      // whitespace
      { include: '@whitespace' },

      // delimiters and operators
      [/[{}()[\]]/, '@brackets'],
      [/[<>](?!@symbols)/, '@brackets'],
      [/@symbols/, {
        cases: {
          '@operators': 'delimiter',
          '@default': ''
        }
      }],

      // numbers
      { include: '@number' },

      // delimiter: after number because of .\d floats
      [/[;,.]/, 'delimiter'],

      // strings
      // NOTE: including non-teminated string so as people type ', we can start showing them that they're working on a string
      [/'([^'\\]|\\.)*$/, 'string.invalid'],
      [/'/, 'string', '@string'],

      // characters
      { include: '@characters' },
    ],

    number: [
      [/(@digits)[eE]([-+]?(@digits))?[fFdD]?/, 'number.float'],
      [/(@digits)\.(@digits)([eE][-+]?(@digits))?[fFdD]?/, 'number.float'],
      [/0[xX](@hexdigits)[Ll]?/, 'number.hex'],
      [/0(@octaldigits)[Ll]?/, 'number.octal'],
      [/0[bB](@binarydigits)[Ll]?/, 'number.binary'],
      [/(@digits)[fFdD]/, 'number.float'],
      [/(@digits)[lL]?/, 'number']
    ],

    function: [
      [/(cast)(\()(@)/, ['function', '', 'cast']],
      [/(->\s*)(cast)(\()(@)/, ['', 'function', '', 'cast']],
      [/(->\s*)([\w_]+)(\s*\()/, ['', 'function', '']],
      [/([\w_]+)(\s*\()/, ['function', '']],
      [/(->\s*)([\w_]+)/, ['', 'function']],
    ],

    package: [
      [/(@package)(\*)/, ['package', 'tag']],
      [/(@package)([\w_]+)/, ['package', 'type']],
      [/(@package)([\w_]+)(@multiplicity)/, ['package', 'type', 'multiplicity']],
      [/([\w_]+)(\s*:\s*)(@package)([\w_]+)(@multiplicity)/, ['attribute', '', 'package', 'type', 'multiplicity']],
      [/([\w_]+)(\s*:\s*)([\w_]+)(@multiplicity)/, ['attribute', '', 'type', 'multiplicity']],
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
      [/[/*]/, 'comment']
    ],
    //Identical copy of comment above, except for the addition of .doc
    doc: [
      [/[^/*]+/, 'comment.doc'],
      // [/\/\*/, 'comment.doc', '@push' ],    // nested comment not allowed :-(
      [/\/\*/, 'comment.doc.invalid'],
      [/\*\//, 'comment.doc', '@pop'],
      [/[/*]/, 'comment.doc']
    ],

    string: [
      [/[^\\']+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [/'/, 'string', '@pop']
    ],

    characters: [
      [/'[^\\']'/, 'string'],
      [/(')(@escapes)(')/, ['string', 'string.escape', 'string']],
      [/'/, 'string.invalid'],
    ]
  },
} as monacoLanguagesAPI.IMonarchLanguage;
