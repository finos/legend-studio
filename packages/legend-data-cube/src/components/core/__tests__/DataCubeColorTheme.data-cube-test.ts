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

import { unitTest } from '@finos/legend-shared/test';
import { describe, expect, test } from '@jest/globals';
import { CODE_EDITOR_THEME } from '@finos/legend-code-editor';
import {
  DataCubeColorTheme,
  getDataCubeCodeEditorTheme,
  getDataCubeColorThemeClassName,
  getThemedGridColor,
} from '../DataCubeColorTheme.js';
import {
  DEFAULT_FOREGROUND_COLOR,
  DEFAULT_GRID_LINE_COLOR,
  DEFAULT_ROW_BACKGROUND_COLOR,
  DEFAULT_ROW_HIGHLIGHT_BACKGROUND_COLOR,
} from '../../../stores/core/DataCubeQueryEngine.js';

describe('DataCube color theme', () => {
  test(unitTest('Light theme keeps every grid color as-is'), () => {
    [
      DEFAULT_FOREGROUND_COLOR,
      DEFAULT_ROW_BACKGROUND_COLOR,
      DEFAULT_GRID_LINE_COLOR,
      '#ff00aa',
    ].forEach((color) =>
      expect(getThemedGridColor(color, DataCubeColorTheme.LIGHT)).toBe(color),
    );
    expect(getDataCubeColorThemeClassName(DataCubeColorTheme.LIGHT)).toBe('');
    expect(getDataCubeCodeEditorTheme(DataCubeColorTheme.LIGHT)).toBe(
      CODE_EDITOR_THEME.GITHUB_LIGHT,
    );
  });

  test(
    unitTest('Dark theme maps default grid colors but keeps custom colors'),
    () => {
      expect(
        getThemedGridColor(DEFAULT_FOREGROUND_COLOR, DataCubeColorTheme.DARK),
      ).toBe('var(--tw-color-black)');
      expect(
        getThemedGridColor(
          DEFAULT_ROW_BACKGROUND_COLOR,
          DataCubeColorTheme.DARK,
        ),
      ).toBe('var(--tw-color-white)');
      expect(
        getThemedGridColor(
          DEFAULT_ROW_HIGHLIGHT_BACKGROUND_COLOR.toUpperCase(),
          DataCubeColorTheme.DARK,
        ),
      ).toBe('var(--tw-color-sky-50)');
      expect(getThemedGridColor('#ff00aa', DataCubeColorTheme.DARK)).toBe(
        '#ff00aa',
      );
      expect(getDataCubeColorThemeClassName(DataCubeColorTheme.DARK)).toBe(
        'data-cube-theme--dark',
      );
      expect(getDataCubeCodeEditorTheme(DataCubeColorTheme.DARK)).toBe(
        CODE_EDITOR_THEME.DEFAULT_DARK,
      );
    },
  );
});
