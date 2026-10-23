/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { buildCodeEditorTheme } from '../themes/MonacoEditorThemeUtils.js';
import {
  GITHUB_DARK_DIMMED_THEME,
  GITHUB_DARK_THEME,
  GITHUB_LIGHT_THEME,
  MATERIAL_DARKER_THEME,
  MATERIAL_DEFAULT_THEME,
  ONE_DARK_PRO_DARKER_THEME,
  ONE_DARK_PRO_THEME,
  SOLARIZED_DARK_THEME,
} from '../CodeEditorTheme.js';

// `monaco-editor` throws when applying a theme with a token color it can't parse
// See https://github.com/microsoft/vscode/blob/main/src/vs/editor/common/languages/supports/tokenization.ts
const MONACO_TOKEN_COLOR_PATTERN = /^#?[0-9A-Fa-f]{6}(?:[0-9A-Fa-f]{2})?$/;

test(
  unitTest('VS Code theme token colors are turned into code editor rules'),
  () => {
    const theme = buildCodeEditorTheme(
      {
        colors: {
          'editor.background': '#ffffff',
          'editor.foreground': ['#000000', '#111111'],
        },
        tokenColors: [
          { name: 'Global settings', settings: { foreground: '#24292e' } },
          {
            scope: ',comment, string.comment,',
            settings: { foreground: '#6a737d', fontStyle: 'italic' },
          },
          {
            scope: ['keyword', 'storage'],
            settings: { foreground: '#d73a49' },
          },
          {
            scope: 'markup.deleted',
            settings: { foreground: '#b31d28', background: '#ffeef0' },
          },
          { scope: 'meta.without-settings' },
          { scope: 'meta.without-colors', settings: {} },
        ],
      },
      'vs',
      { 'editor.background': '#fafafa' },
      [{ token: 'keyword', foreground: '0000ff' }],
    );

    expect(theme).toEqual({
      base: 'vs',
      inherit: true,
      colors: {
        'editor.background': '#fafafa',
        'editor.foreground': '#000000',
      },
      rules: [
        { token: '', foreground: '#24292e' },
        { token: 'comment', foreground: '#6a737d', fontStyle: 'italic' },
        { token: 'string.comment', foreground: '#6a737d', fontStyle: 'italic' },
        { token: 'keyword', foreground: '#d73a49' },
        { token: 'storage', foreground: '#d73a49' },
        {
          token: 'markup.deleted',
          foreground: '#b31d28',
          background: '#ffeef0',
        },
        { token: 'keyword', foreground: '0000ff' },
      ],
    });
  },
);

test(
  unitTest(
    'Code editor themes built from VS Code themes keep their syntax colors',
  ),
  () => {
    expect(GITHUB_LIGHT_THEME.rules).toContainEqual({
      token: 'keyword',
      foreground: '#cf222e',
    });

    Object.entries({
      GITHUB_LIGHT_THEME,
      GITHUB_DARK_THEME,
      GITHUB_DARK_DIMMED_THEME,
      SOLARIZED_DARK_THEME,
      MATERIAL_DEFAULT_THEME,
      MATERIAL_DARKER_THEME,
      ONE_DARK_PRO_THEME,
      ONE_DARK_PRO_DARKER_THEME,
    }).forEach(([name, theme]) => {
      const invalidColors = theme.rules
        .flatMap((rule) => [rule.foreground, rule.background])
        .filter(
          (color): color is string =>
            color !== undefined && !MONACO_TOKEN_COLOR_PATTERN.test(color),
        );
      expect({
        name,
        hasRules: theme.rules.length > 0,
        invalidColors,
      }).toEqual({ name, hasRules: true, invalidColors: [] });
    });
  },
);
