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

import { test, expect, jest } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { editor as monacoEditorAPI } from 'monaco-editor';
import { CODE_EDITOR_THEME } from '../CodeEditorTheme.js';
import {
  claimCodeEditorTheme,
  setBaseCodeEditorTheme,
} from '../CodeEditorThemeScope.js';

const LIGHT = CODE_EDITOR_THEME.GITHUB_LIGHT;
const DARK = CODE_EDITOR_THEME.DEFAULT_DARK;

const getCurrentTheme = (setTheme: { mock: { calls: unknown[][] } }) =>
  setTheme.mock.calls.at(-1)?.[0];

test(
  unitTest('Claimed code editor theme overrides the base theme until released'),
  () => {
    const setTheme = jest.spyOn(monacoEditorAPI, 'setTheme');

    setBaseCodeEditorTheme(LIGHT);
    expect(getCurrentTheme(setTheme)).toBe(LIGHT);

    const first = claimCodeEditorTheme(DARK);
    expect(getCurrentTheme(setTheme)).toBe(DARK);

    // the base theme changing while claimed doesn't override the claim
    setBaseCodeEditorTheme(CODE_EDITOR_THEME.GITHUB_DARK);
    expect(getCurrentTheme(setTheme)).toBe(DARK);

    // claims follow theme changes
    first.update(LIGHT);
    expect(getCurrentTheme(setTheme)).toBe(LIGHT);

    // the most recent claim wins, and releasing it falls back to the previous one
    const second = claimCodeEditorTheme(DARK);
    expect(getCurrentTheme(setTheme)).toBe(DARK);
    second.release();
    expect(getCurrentTheme(setTheme)).toBe(LIGHT);

    // the base theme is restored once the last claim is released
    first.release();
    expect(getCurrentTheme(setTheme)).toBe(CODE_EDITOR_THEME.GITHUB_DARK);

    // releasing twice is a no-op
    const callCount = setTheme.mock.calls.length;
    first.release();
    expect(setTheme.mock.calls.length).toBe(callCount);
  },
);
