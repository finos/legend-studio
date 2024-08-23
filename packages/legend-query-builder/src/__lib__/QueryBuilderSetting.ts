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

export enum QUERY_BUILDER_SETTING_KEY {
  SHOW_POST_FILTER_PANEL = 'query-builder.showPostFilterPanel',
  SHOW_QUERY_CHAT_PANEL = 'query-builder.showQueryChatPanel',
}

export const QUERY_BUILDER_SETTING_CONFIG: SettingConfigurationData = {
  [QUERY_BUILDER_SETTING_KEY.SHOW_POST_FILTER_PANEL]: {
    defaultValue: false,
  },
  [QUERY_BUILDER_SETTING_KEY.SHOW_QUERY_CHAT_PANEL]: {
    defaultValue: false,
  },
};
