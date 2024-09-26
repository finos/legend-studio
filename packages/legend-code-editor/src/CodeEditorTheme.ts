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

import { PURE_GRAMMAR_TOKEN } from './PureLanguage.js';
import type { editor as monacoEditorAPI } from 'monaco-editor';
import { buildCodeEditorTheme } from './themes/MonacoEditorThemeUtils.js';
import SOLARIZED_DARK_THEME_DATA from './themes/solarized-dark-color-theme.json' with { type: 'json' };
import GITHUB_DARK_THEME_DATA from './themes/Github-Theme-dark.json' with { type: 'json' };
import GITHUB_DARK_DIMMED_THEME_DATA from './themes/Github-Theme-dark-dimmed.json' with { type: 'json' };
import GITHUB_LIGHT_THEME_DATA from './themes/Github-Theme-light.json' with { type: 'json' };
import MATERIAL_DEFAULT_THEME_DATA from './themes/Material-Theme-Default.json' with { type: 'json' };
import MATERIAL_DARKER_THEME_DATA from './themes/Material-Theme-Darker.json' with { type: 'json' };
import ONE_DARK_PRO_THEME_DATA from './themes/OneDark-Pro.json' with { type: 'json' };
import ONE_DARK_PRO_DARKER_THEME_DATA from './themes/OneDark-Pro-darker.json' with { type: 'json' };

const BASE_PURE_LANGUAGE_COLOR_TOKENS: monacoEditorAPI.ITokenThemeRule[] = [
  // NOTE: `monaco-editor` only accepts HEX values, not CSS variables
  { token: PURE_GRAMMAR_TOKEN.IDENTIFIER, foreground: 'dcdcaa' },
  { token: PURE_GRAMMAR_TOKEN.NUMBER, foreground: 'b5cea8' },
  { token: PURE_GRAMMAR_TOKEN.DATE, foreground: 'b5cea8' },
  { token: PURE_GRAMMAR_TOKEN.COLOR, foreground: 'b5cea8' },
  { token: PURE_GRAMMAR_TOKEN.PACKAGE, foreground: '808080' },
  { token: PURE_GRAMMAR_TOKEN.PARSER, foreground: 'c586c0' },
  { token: PURE_GRAMMAR_TOKEN.LANGUAGE_STRUCT, foreground: 'c586c0' },
  { token: PURE_GRAMMAR_TOKEN.MULTIPLICITY, foreground: '2d796b' },
  { token: PURE_GRAMMAR_TOKEN.GENERICS, foreground: '2d796b' },
  { token: PURE_GRAMMAR_TOKEN.PROPERTY, foreground: '9cdcfe' },
  { token: PURE_GRAMMAR_TOKEN.PARAMETER, foreground: '9cdcfe' },
  { token: PURE_GRAMMAR_TOKEN.VARIABLE, foreground: '4fc1ff' },
  { token: PURE_GRAMMAR_TOKEN.TYPE, foreground: '3dc9b0' },
  { token: `${PURE_GRAMMAR_TOKEN.STRING}.escape`, foreground: 'd7ba7d' },
];

export enum CODE_EDITOR_THEME {
  DEFAULT_DARK = 'default-dark',
  GITHUB_LIGHT = 'github-light',
  GITHUB_DARK = 'github-dark',
  GITHUB_DARK_DIMMED = 'github-dark-dimmed',
  SOLARIZED_DARK = 'solarized-dark',
  ONE_DARK_PRO = 'one-dark-pro',
  ONE_DARK_PRO_DARKER = 'one-dark-pro-darker',
  MATERIAL_DEFAULT = 'material-default',
  MATERIAL_DARKER = 'material-darker',

  // default themes in Monaco editor
  // See https://github.com/microsoft/vscode/blob/main/src/vs/editor/standalone/common/themes.ts
  BUILT_IN__VSCODE_LIGHT = 'vs',
  BUILT_IN__VSCODE_DARK = 'vs-dark',
  BUILT_IN__VSCODE_HC_BLACK = 'hc-black',
  BUILT_IN__VSCODE_HC_LIGHT = 'hc-light',
}

export const DEFAULT_DARK_THEME: monacoEditorAPI.IStandaloneThemeData = {
  base: 'vs-dark',
  inherit: true,
  colors: {},
  rules: [
    ...BASE_PURE_LANGUAGE_COLOR_TOKENS,
    // NOTE: correct a problem with syntax highlighting of string in SQL
    { token: 'string.sql', foreground: 'ce9178' },
    { token: 'white.sql', foreground: 'd4d4d4' },
    { token: 'identifier.sql', foreground: 'd4d4d4' },
    { token: 'operator.sql', foreground: 'd4d4d4' },
  ],
};

export const SOLARIZED_DARK_THEME = buildCodeEditorTheme(
  SOLARIZED_DARK_THEME_DATA,
  CODE_EDITOR_THEME.BUILT_IN__VSCODE_DARK,
  {},
  [],
);

export const GITHUB_DARK_THEME = buildCodeEditorTheme(
  GITHUB_DARK_THEME_DATA,
  CODE_EDITOR_THEME.BUILT_IN__VSCODE_DARK,
  {},
  [],
);

export const GITHUB_LIGHT_THEME = buildCodeEditorTheme(
  GITHUB_LIGHT_THEME_DATA,
  CODE_EDITOR_THEME.BUILT_IN__VSCODE_LIGHT,
  {},
  [
    // NOTE: `monaco-editor` only accepts HEX values, not CSS variables
    // { token: PURE_GRAMMAR_TOKEN.IDENTIFIER, foreground: '000000' },
    // { token: PURE_GRAMMAR_TOKEN.NUMBER, foreground: 'b5cea8' },
    // { token: PURE_GRAMMAR_TOKEN.DATE, foreground: 'b5cea8' },
    // { token: PURE_GRAMMAR_TOKEN.COLOR, foreground: 'b5cea8' },
    // { token: PURE_GRAMMAR_TOKEN.PACKAGE, foreground: '808080' },
    // { token: PURE_GRAMMAR_TOKEN.PARSER, foreground: 'c586c0' },
    // { token: PURE_GRAMMAR_TOKEN.LANGUAGE_STRUCT, foreground: 'c586c0' },
    // { token: PURE_GRAMMAR_TOKEN.MULTIPLICITY, foreground: '2d796b' },
    // { token: PURE_GRAMMAR_TOKEN.GENERICS, foreground: '2d796b' },
    // { token: PURE_GRAMMAR_TOKEN.PROPERTY, foreground: '9cdcfe' },
    // { token: PURE_GRAMMAR_TOKEN.PARAMETER, foreground: '9cdcfe' },
    // { token: PURE_GRAMMAR_TOKEN.VARIABLE, foreground: '4fc1ff' },
    // { token: PURE_GRAMMAR_TOKEN.TYPE, foreground: '3dc9b0' },
    // { token: `${PURE_GRAMMAR_TOKEN.STRING}.escape`, foreground: 'd7ba7d' },
    // TODO: handle SQL formatting like in dark theme?
  ],
);

export const GITHUB_DARK_DIMMED_THEME = buildCodeEditorTheme(
  GITHUB_DARK_DIMMED_THEME_DATA,
  CODE_EDITOR_THEME.BUILT_IN__VSCODE_DARK,
  {},
  [],
);

export const MATERIAL_DEFAULT_THEME = buildCodeEditorTheme(
  MATERIAL_DEFAULT_THEME_DATA,
  CODE_EDITOR_THEME.BUILT_IN__VSCODE_DARK,
  {},
  [],
);

export const MATERIAL_DARKER_THEME = buildCodeEditorTheme(
  MATERIAL_DARKER_THEME_DATA,
  CODE_EDITOR_THEME.BUILT_IN__VSCODE_DARK,
  {},
  [],
);

export const ONE_DARK_PRO_THEME = buildCodeEditorTheme(
  ONE_DARK_PRO_THEME_DATA,
  CODE_EDITOR_THEME.BUILT_IN__VSCODE_DARK,
  {},
  [],
);

export const ONE_DARK_PRO_DARKER_THEME = buildCodeEditorTheme(
  ONE_DARK_PRO_DARKER_THEME_DATA,
  CODE_EDITOR_THEME.BUILT_IN__VSCODE_DARK,
  {},
  [],
);
