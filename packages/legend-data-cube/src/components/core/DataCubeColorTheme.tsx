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

import { createContext, useContext, useEffect } from 'react';
import { getCodeEditorThemeForAppTheme } from '@finos/legend-code-editor';
import {
  DEFAULT_ERROR_FOREGROUND_COLOR,
  DEFAULT_FOREGROUND_COLOR,
  DEFAULT_GRID_LINE_COLOR,
  DEFAULT_NEGATIVE_FOREGROUND_COLOR,
  DEFAULT_ROW_BACKGROUND_COLOR,
  DEFAULT_ROW_HIGHLIGHT_BACKGROUND_COLOR,
  DEFAULT_ZERO_FOREGROUND_COLOR,
} from '../../stores/core/DataCubeQueryEngine.js';

export enum DataCubeColorTheme {
  LIGHT = 'light',
  DARK = 'dark',
}

const DataCubeColorThemeContext = createContext<DataCubeColorTheme>(
  DataCubeColorTheme.LIGHT,
);

export const DataCubeColorThemeProvider = DataCubeColorThemeContext.Provider;

/**
 * NOTE: defaults to the light theme since some of these components (e.g. form components)
 * are also rendered by the hosting application, outside of DataCube.
 */
export const useDataCubeColorTheme = () =>
  useContext(DataCubeColorThemeContext);

/**
 * NOTE: popups (e.g. dropdown menus, popovers) are portaled outside of the DataCube
 * DOM subtree, so besides the DataCube root, their roots must carry this class too.
 */
export const getDataCubeColorThemeClassName = (
  theme: DataCubeColorTheme,
): string => (theme === DataCubeColorTheme.DARK ? 'data-cube-theme--dark' : '');

const DATA_CUBE_PAGE_CLASS_NAME = 'data-cube-page';

/**
 * Marks the page as owned by DataCube, i.e. DataCube is the whole page rather than embedded.
 *
 * NOTE: popups portaled by shared components (e.g. selector menus) can't carry the theme class,
 * so the dark theme styles them with page-wide rules, as well as the page background. These rules
 * only apply to a page marked as owned by DataCube, so they never re-theme the host's own popups.
 */
export const useDataCubeOwnsPage = (): void => {
  useEffect(() => {
    document.body.classList.add(DATA_CUBE_PAGE_CLASS_NAME);
    return () => document.body.classList.remove(DATA_CUBE_PAGE_CLASS_NAME);
  }, []);
};

export const getDataCubeCodeEditorTheme = (theme: DataCubeColorTheme) =>
  getCodeEditorThemeForAppTheme(theme !== DataCubeColorTheme.DARK);

/**
 * The configuration stores concrete default colors (e.g. a black foreground), which would be
 * unreadable in dark mode. Only these defaults are remapped so colors a user picked are respected.
 *
 * NOTE: since only the color values are stored, a custom color which happens to be identical
 * to its default is treated as the default.
 */
const DARK_THEME_GRID_COLORS = new Map<string, string>([
  [DEFAULT_FOREGROUND_COLOR, 'var(--tw-color-black)'],
  [DEFAULT_ROW_BACKGROUND_COLOR, 'var(--tw-color-white)'],
  [DEFAULT_GRID_LINE_COLOR, 'var(--tw-color-neutral-300)'],
  [DEFAULT_ROW_HIGHLIGHT_BACKGROUND_COLOR, 'var(--tw-color-sky-50)'],
  [DEFAULT_NEGATIVE_FOREGROUND_COLOR, 'var(--tw-color-red-500)'],
  [DEFAULT_ZERO_FOREGROUND_COLOR, 'var(--tw-color-neutral-500)'],
  [DEFAULT_ERROR_FOREGROUND_COLOR, 'var(--tw-color-blue-600)'],
]);

export const getThemedGridColor = (
  color: string,
  theme: DataCubeColorTheme,
): string =>
  theme === DataCubeColorTheme.DARK
    ? (DARK_THEME_GRID_COLORS.get(color.toLowerCase()) ?? color)
    : color;
