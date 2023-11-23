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

export enum LEGEND_STUDIO_COMMAND_KEY {
  SYNC_WITH_WORKSPACE = 'editor.sync-workspace',
  CREATE_ELEMENT = 'editor.create-new-element',
  SEARCH_ELEMENT = 'editor.search-element',
  OPEN_SHOWCASES = 'editor.show-showcases',
  TOGGLE_TEXT_MODE = 'editor.toggle-text-mode',
  GENERATE = 'editor.generate',
  COMPILE = 'editor.compile',
  TOGGLE_PANEL_GROUP = 'editor.toggle-panel-group',
  TOGGLE_MODEL_LOADER = 'editor.toggle-model-loader',
  TOGGLE_SIDEBAR_EXPLORER = 'editor.sidebar.toggle-explorer',
  TOGGLE_SIDEBAR_LOCAL_CHANGES = 'editor.sidebar.toggle-local-changes',
  TOGGLE_SIDEBAR_WORKSPACE_REVIEW = 'editor.sidebar.toggle-workspace-review',
  TOGGLE_SIDEBAR_WORKSPACE_UPDATER = 'editor.sidebar.toggle-workspace-updater',
}

export const LEGEND_STUDIO_COMMAND_CONFIG: CommandConfigData = {
  [LEGEND_STUDIO_COMMAND_KEY.SYNC_WITH_WORKSPACE]: {
    title: 'Sync with workspace',
    defaultKeyboardShortcut: 'Control+KeyS',
  },
  [LEGEND_STUDIO_COMMAND_KEY.CREATE_ELEMENT]: {
    title: 'Create new element',
    defaultKeyboardShortcut: 'Control+Shift+KeyN',
  },
  [LEGEND_STUDIO_COMMAND_KEY.SEARCH_ELEMENT]: {
    title: 'Search for element',
    defaultKeyboardShortcut: 'Control+KeyP',
  },
  [LEGEND_STUDIO_COMMAND_KEY.TOGGLE_MODEL_LOADER]: {
    title: 'Toggle model loader',
    defaultKeyboardShortcut: 'F2',
  },
  [LEGEND_STUDIO_COMMAND_KEY.OPEN_SHOWCASES]: {
    title: 'Open Showcases',
    defaultKeyboardShortcut: 'F7',
  },
  [LEGEND_STUDIO_COMMAND_KEY.TOGGLE_TEXT_MODE]: {
    title: 'Toggle text mode',
    defaultKeyboardShortcut: 'F8',
  },
  [LEGEND_STUDIO_COMMAND_KEY.COMPILE]: {
    title: 'Compile',
    defaultKeyboardShortcut: 'F9',
  },
  [LEGEND_STUDIO_COMMAND_KEY.GENERATE]: {
    title: 'Generate',
    defaultKeyboardShortcut: 'F10',
  },
  [LEGEND_STUDIO_COMMAND_KEY.TOGGLE_PANEL_GROUP]: {
    title: 'Toggle panel',
    defaultKeyboardShortcut: 'Control+Backquote',
  },
  [LEGEND_STUDIO_COMMAND_KEY.TOGGLE_SIDEBAR_EXPLORER]: {
    title: 'Toggle explorer sidebar',
    defaultKeyboardShortcut: 'Control+Shift+KeyX',
  },
  [LEGEND_STUDIO_COMMAND_KEY.TOGGLE_SIDEBAR_LOCAL_CHANGES]: {
    title: 'Toggle local changes sidebar',
    defaultKeyboardShortcut: 'Control+Shift+KeyG',
  },
  [LEGEND_STUDIO_COMMAND_KEY.TOGGLE_SIDEBAR_WORKSPACE_REVIEW]: {
    title: 'Toggle workspace review sidebar',
    defaultKeyboardShortcut: 'Control+Shift+KeyM',
  },
  [LEGEND_STUDIO_COMMAND_KEY.TOGGLE_SIDEBAR_WORKSPACE_UPDATER]: {
    title: 'Toggle workspace updater sidebar',
    defaultKeyboardShortcut: 'Control+Shift+KeyU',
  },
};
