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

import type { SettingConfigurationData } from '@finos/legend-application';

export enum LEGEND_STUDIO_SETTING_KEY {
  EDITOR_STRICT_MODE = 'editor.strictMode',
  EDITOR_WRAP_TEXT = 'editor.wrapText',
}

export const LEGEND_STUDIO_SETTING_CONFIG: SettingConfigurationData = {
  [LEGEND_STUDIO_SETTING_KEY.EDITOR_STRICT_MODE]: {
    defaultValue: false,
  },
  [LEGEND_STUDIO_SETTING_KEY.EDITOR_WRAP_TEXT]: {
    defaultValue: false,
  },
};
