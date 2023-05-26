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

import type { CommandConfigData } from '@finos/legend-application';

export enum STO_RELATIONAL_LEGEND_STUDIO_COMMAND_KEY {
  SQL_PLAYGROUND_EXECUTE = 'editor.panel-group.sql-playground.execute',
}

export const STO_RELATIONAL_LEGEND_STUDIO_COMMAND_CONFIG: CommandConfigData = {
  [STO_RELATIONAL_LEGEND_STUDIO_COMMAND_KEY.SQL_PLAYGROUND_EXECUTE]: {
    title: 'Execute SQL (SQL Playground)',
    defaultKeyboardShortcut: 'Control+Enter',
    additionalKeyboardShortcuts: ['Meta+Enter'],
    when: 'When SQL playground is active',
  },
};
