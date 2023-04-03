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

import packageJson from '../../package.json';
import type { LegendApplicationPluginManager } from '../application/LegendApplicationPluginManager.js';
import { LEGEND_APPLICATION_SETTING_CONFIG } from '../application/LegendApplicationSetting.js';
import {
  HIGH_CONTRAST_LIGHT_COLOR_THEME,
  LEGACY_LIGHT_COLOR_THEME,
} from '../application/LegendApplicationTheme.js';
import type { ColorTheme } from './LayoutService.js';
import { LegendApplicationPlugin } from './LegendApplicationPlugin.js';
import {
  collectSettingConfigurationEntriesFromConfig,
  type SettingConfigurationEntry,
} from './SettingService.js';

export class Core_LegendApplicationPlugin extends LegendApplicationPlugin {
  static NAME = packageJson.extensions.applicationPlugin;

  constructor() {
    super(Core_LegendApplicationPlugin.NAME, packageJson.version);
  }

  install(
    pluginManager: LegendApplicationPluginManager<LegendApplicationPlugin>,
  ): void {
    pluginManager.registerApplicationPlugin(this);
  }

  override getExtraColorThemes(): ColorTheme[] {
    return [LEGACY_LIGHT_COLOR_THEME, HIGH_CONTRAST_LIGHT_COLOR_THEME];
  }

  override getExtraSettingConfigurationEntries(): SettingConfigurationEntry[] {
    return collectSettingConfigurationEntriesFromConfig(
      LEGEND_APPLICATION_SETTING_CONFIG,
    );
  }
}
