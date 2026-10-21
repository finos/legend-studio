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
import {
  CODE_EDITOR_THEME,
  DEFAULT_DARK_THEME,
  GITHUB_LIGHT_THEME,
  getCodeEditorThemeForAppTheme,
} from '../CodeEditorTheme.js';
import { PURE_GRAMMAR_TOKEN } from '../PureLanguage.js';

// WCAG 2 contrast ratio, see https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio
const getRelativeLuminance = (hex: string): number => {
  const [red, green, blue] = [0, 2, 4].map((offset) => {
    const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};
const getContrastRatio = (hex1: string, hex2: string): number => {
  const [lighter, darker] = [
    getRelativeLuminance(hex1),
    getRelativeLuminance(hex2),
  ].sort((a, b) => b - a) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
};

const PURE_TOKENS = new Set<string>([
  ...Object.values(PURE_GRAMMAR_TOKEN),
  `${PURE_GRAMMAR_TOKEN.STRING}.escape`,
]);

test(
  unitTest('Light code editor theme colors every Pure token the dark one does'),
  () => {
    const darkPureTokens = DEFAULT_DARK_THEME.rules
      .map((rule) => rule.token)
      .filter((token) => PURE_TOKENS.has(token));
    const lightPureTokens = GITHUB_LIGHT_THEME.rules
      .map((rule) => rule.token)
      .filter((token) => PURE_TOKENS.has(token));

    expect(darkPureTokens.length).toBeGreaterThan(0);
    expect(lightPureTokens).toEqual(darkPureTokens);
  },
);

test(
  unitTest('Light code editor theme Pure token colors are readable on white'),
  () => {
    GITHUB_LIGHT_THEME.rules
      .filter((rule) => PURE_TOKENS.has(rule.token))
      .forEach((rule) => {
        expect({
          token: rule.token,
          readable:
            getContrastRatio(
              (rule.foreground ?? '').replace('#', ''),
              'ffffff',
            ) >= 4.5,
        }).toEqual({ token: rule.token, readable: true });
      });
  },
);

test(unitTest('Code editor theme follows the application theme'), () => {
  expect(getCodeEditorThemeForAppTheme(true)).toBe(
    CODE_EDITOR_THEME.GITHUB_LIGHT,
  );
  expect(getCodeEditorThemeForAppTheme(false)).toBe(
    CODE_EDITOR_THEME.DEFAULT_DARK,
  );
});
