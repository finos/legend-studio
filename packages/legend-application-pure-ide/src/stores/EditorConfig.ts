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

export enum IDE_HOTKEY {
  SEARCH_FILE = 'SEARCH_FILE',
  SEARCH_TEXT = 'SEARCH_TEXT',
  EXECUTE = 'EXECUTE',
  TOGGLE_AUX_PANEL = 'TOGGLE_AUX_PANEL',
  GO_TO_FILE = 'GO_TO_FILE',
  FULL_RECOMPILE = 'FULL_RECOMPILE',
  RUN_TEST = 'RUN_TEST',
  TOGGLE_OPEN_TABS_MENU = 'TOGGLE_OPEN_TABS_MENU',
}

// TODO-BEFORE-PR
export const IDE_HOTKEY_MAP: Record<IDE_HOTKEY, string[]> = Object.freeze({
  [IDE_HOTKEY.SEARCH_FILE]: ['ctrl+p', 'ctrl+shift+n'],
  [IDE_HOTKEY.SEARCH_TEXT]: ['ctrl+shift+f'],
  [IDE_HOTKEY.TOGGLE_AUX_PANEL]: ['ctrl+`'],
  [IDE_HOTKEY.EXECUTE]: ['f9'],
  [IDE_HOTKEY.GO_TO_FILE]: ['ctrl+f1'],
  [IDE_HOTKEY.FULL_RECOMPILE]: ['f11', 'ctrl+f11', 'shift+f11'],
  [IDE_HOTKEY.RUN_TEST]: ['f10', 'shift+f10'],
  [IDE_HOTKEY.TOGGLE_OPEN_TABS_MENU]: ['ctrl+alt+tab'],
});

export enum ACTIVITY_MODE {
  CONCEPT = 'CONCEPT',
  FILE = 'FILE',
}

export enum AUX_PANEL_MODE {
  CONSOLE = 'CONSOLE',
  SEARCH_RESULT = 'SEARCH_RESULT',
  TEST_RUNNER = 'TEST_RUNNER',
}
