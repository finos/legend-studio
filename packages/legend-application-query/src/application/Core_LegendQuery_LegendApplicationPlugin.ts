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

import {
  Core_LegendApplicationPlugin,
  LEGEND_APPLICATION_COLOR_THEME,
  LEGEND_APPLICATION_SETTING_KEY,
  collectKeyedCommandConfigEntriesFromConfig,
  collectSettingConfigurationEntriesFromConfig,
  type KeyedCommandConfigEntry,
  type SettingConfigurationEntry,
} from '@finos/legend-application';
import { LEGEND_CUBE_COMMAND_CONFIG } from '@finos/legend-cube-builder';

export const LEGEND_QUERY_APPLICATION_SETTING_CONFIG = {
  [LEGEND_APPLICATION_SETTING_KEY.COLOR_THEME]: {
    // default application query to light mode
    defaultValue: LEGEND_APPLICATION_COLOR_THEME.LEGACY_LIGHT,
  },
};

export class Core_LegendQuery_LegendApplicationPlugin extends Core_LegendApplicationPlugin {
  override getExtraSettingConfigurationEntries(): SettingConfigurationEntry[] {
    return collectSettingConfigurationEntriesFromConfig(
      LEGEND_QUERY_APPLICATION_SETTING_CONFIG,
    );
  }

  /**
   * The Cube page's shortcuts (F9, Ctrl/Cmd+Z): a Legend application binds
   * keys only through its plugins, and the page registers the commands only
   * while it is open (PLAN §3.5)
   */
  override getExtraKeyedCommandConfigEntries(): KeyedCommandConfigEntry[] {
    return collectKeyedCommandConfigEntriesFromConfig(
      LEGEND_CUBE_COMMAND_CONFIG,
    );
  }
}
