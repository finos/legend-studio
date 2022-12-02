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

export enum LEGEND_PURE_IDE_COMMAND_KEY {
  SEARCH_FILE = 'editor.search.file',
  SEARCH_TEXT = 'editor.search.text',
  GO_TO_FILE = 'editor.go-to-file',
  TOGGLE_AUX_PANEL = 'editor.toggle-auxiliary-panel',
  EXECUTE = 'editor.execute',
  FULL_RECOMPILE = 'editor.full-compile',
  FULL_RECOMPILE_WITH_FULL_INIT = 'editor.full-compile.with-init',
  RUN_ALL_TESTS = 'editor.run-all-tests',
  RUN_RELAVANT_TESTS = 'editor.run-relavant-tests',
  GO_TO_DEFINITION = 'editor.file-editor.go-to-definition',
  GO_BACK = 'editor.file-editor.go-back',
  FIND_USAGES = 'editor.file-editor.find-usage',
}

export const LEGEND_PURE_IDE_COMMAND_CONFIG: CommandConfigData = {
  [LEGEND_PURE_IDE_COMMAND_KEY.SEARCH_FILE]: {
    title: 'Search for file',
    defaultKeyboardShortcut: 'Control+Shift+KeyN',
  },
  [LEGEND_PURE_IDE_COMMAND_KEY.SEARCH_TEXT]: {
    title: 'Search text',
    defaultKeyboardShortcut: 'Control+Shift+KeyF',
  },
  [LEGEND_PURE_IDE_COMMAND_KEY.GO_TO_FILE]: {
    title: 'Go to file',
    defaultKeyboardShortcut: 'Control+F1',
  },
  [LEGEND_PURE_IDE_COMMAND_KEY.TOGGLE_AUX_PANEL]: {
    title: 'Toggle auxiliary panel',
    defaultKeyboardShortcut: 'Control+`',
  },
  [LEGEND_PURE_IDE_COMMAND_KEY.EXECUTE]: {
    title: 'Execute',
    defaultKeyboardShortcut: 'F9',
  },
  [LEGEND_PURE_IDE_COMMAND_KEY.FULL_RECOMPILE]: {
    title: 'Run full re-compilation',
    defaultKeyboardShortcut: 'F11',
  },
  [LEGEND_PURE_IDE_COMMAND_KEY.FULL_RECOMPILE_WITH_FULL_INIT]: {
    title: 'Run full re-compilation',
    defaultKeyboardShortcut: 'Shift+F11',
  },
  [LEGEND_PURE_IDE_COMMAND_KEY.RUN_ALL_TESTS]: {
    title: 'Run all tests',
    defaultKeyboardShortcut: 'F10',
  },
  [LEGEND_PURE_IDE_COMMAND_KEY.RUN_RELAVANT_TESTS]: {
    title: 'Run relavant tests',
    defaultKeyboardShortcut: 'Shift+F10',
  },
  [LEGEND_PURE_IDE_COMMAND_KEY.GO_TO_DEFINITION]: {
    title: 'Go to definition (File)',
    defaultKeyboardShortcut: 'Control+KeyB',
  },
  [LEGEND_PURE_IDE_COMMAND_KEY.GO_BACK]: {
    title: 'Go back (File)',
    // defaultKeyboardShortcut: 'Control+Alt+b',
    defaultKeyboardShortcut: 'Control+Alt+KeyB',
  },
  [LEGEND_PURE_IDE_COMMAND_KEY.FIND_USAGES]: {
    title: 'Find Usages (File)',
    defaultKeyboardShortcut: 'Alt+F7',
  },
};
