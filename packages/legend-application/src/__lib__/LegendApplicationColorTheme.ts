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

import type { ColorTheme } from '../stores/LayoutService.js';

export enum LEGEND_APPLICATION_COLOR_THEME {
  DEFAULT_DARK = 'default-dark',
  LEGACY_LIGHT = 'legacy-light',
  HIGH_CONTRAST_LIGHT = 'hc-light',
}

export const DEFAULT_DARK_COLOR_THEME: ColorTheme = {
  name: 'Default Dark (default)',
  key: LEGEND_APPLICATION_COLOR_THEME.DEFAULT_DARK,
  TEMPORARY__globalCSSClassName: 'theme__default-dark',
  colors: {
    'data-access-overview.chart.access-granted': '#6a9955',
    'data-access-overview.chart.access-approved': '#007acc',
    'data-access-overview.chart.access-requested': '#fbbc05',
    'data-access-overview.chart.access-not-granted': '#ea4646',
    'data-access-overview.chart.unsupported-access': '#2d2d2d',
  },
};

export const LEGACY_LIGHT_COLOR_THEME: ColorTheme = {
  name: 'Legacy Light',
  key: LEGEND_APPLICATION_COLOR_THEME.LEGACY_LIGHT,
  TEMPORARY__globalCSSClassName: 'theme__legacy-light',
};

export const HIGH_CONTRAST_LIGHT_COLOR_THEME: ColorTheme = {
  name: 'High-Contrast Light',
  key: LEGEND_APPLICATION_COLOR_THEME.HIGH_CONTRAST_LIGHT,
  TEMPORARY__globalCSSClassName: 'theme__hc-light',
  colors: {
    'data-access-overview.chart.access-granted': '#52a31d',
    'data-access-overview.chart.access-approved': '#3d8df5',
    'data-access-overview.chart.access-requested': '#f5c518',
    'data-access-overview.chart.access-not-granted': '#fa5343',
    'data-access-overview.chart.unsupported-access': '#e1e7ea',
  },
};
