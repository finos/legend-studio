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

import type { CommandConfigData } from '@finos/legend-application';

// The Cube page's keyboard shortcuts (spec §17.12, PLAN §3.5). A Legend
// application binds keys only through its plugins, so the host contributes
// this config from one of its plugins (`getExtraKeyedCommandConfigEntries`);
// the page registers the commands while it is open.

export enum LEGEND_CUBE_COMMAND_KEY {
  EXECUTE = 'legend-cube.execute',
  UNDO = 'legend-cube.undo',
  VALIDATE_EXPRESSIONS = 'legend-cube.validate-expressions',
}

/** Keys as `KeyboardEvent.code` names */
export const LEGEND_CUBE_COMMAND_CONFIG: CommandConfigData = {
  [LEGEND_CUBE_COMMAND_KEY.EXECUTE]: {
    title: 'Execute the query',
    defaultKeyboardShortcut: 'F9',
  },
  [LEGEND_CUBE_COMMAND_KEY.UNDO]: {
    title: 'Undo the last change',
    defaultKeyboardShortcut: 'Control+KeyZ',
    additionalKeyboardShortcuts: ['Meta+KeyZ'],
  },
  [LEGEND_CUBE_COMMAND_KEY.VALIDATE_EXPRESSIONS]: {
    title: "Validate the Extend's expressions",
    defaultKeyboardShortcut: 'F10',
  },
};

/** How the buttons' tooltips name the shortcuts */
export const EXECUTE_SHORTCUT_LABEL = 'F9';
export const UNDO_SHORTCUT_LABEL = 'Ctrl+Z / Cmd+Z';
