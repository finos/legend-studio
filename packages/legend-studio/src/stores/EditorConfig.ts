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

export enum EDITOR_MODE {
  STANDARD = 'STANDARD',
  CONFLICT_RESOLUTION = 'CONFLICT_RESOLUTION',
  REVIEW = 'REVIEW',
  VIEWER = 'VIEWER',
}

export enum HOTKEY {
  SYNC_WITH_WORKSPACE = 'SYNC_WITH_WORKSPACE',
  CREATE_ELEMENT = 'CREATE_ELEMENT',
  OPEN_ELEMENT = 'OPEN_ELEMENT',
  TOGGLE_TEXT_MODE = 'TOGGLE_TEXT_MODE',
  GENERATE = 'GENERATE',
  COMPILE = 'COMPILE',
  TOGGLE_AUX_PANEL = 'TOGGLE_AUX_PANEL',
  TOGGLE_MODEL_LOADER = 'TOGGLE_MODEL_LOADER',
  TOGGLE_SIDEBAR_EXPLORER = 'TOGGLE_SIDEBAR_EXPLORER',
  TOGGLE_SIDEBAR_CHANGES = 'TOGGLE_SIDEBAR_CHANGES',
  TOGGLE_SIDEBAR_WORKSPACE_REVIEW = 'TOGGLE_SIDEBAR_WORKSPACE_REVIEW',
  TOGGLE_SIDEBAR_WORKSPACE_UPDATER = 'TOGGLE_SIDEBAR_WORKSPACE_UPDATER',
}

export const HOTKEY_MAP = Object.freeze({
  [HOTKEY.SYNC_WITH_WORKSPACE]: 'ctrl+s',
  [HOTKEY.CREATE_ELEMENT]: 'ctrl+shift+n',
  [HOTKEY.OPEN_ELEMENT]: 'ctrl+p',
  [HOTKEY.TOGGLE_MODEL_LOADER]: 'f2',
  [HOTKEY.TOGGLE_TEXT_MODE]: 'f8',
  [HOTKEY.COMPILE]: 'f9',
  [HOTKEY.GENERATE]: 'f10',
  [HOTKEY.TOGGLE_AUX_PANEL]: 'ctrl+`',
  [HOTKEY.TOGGLE_SIDEBAR_EXPLORER]: 'ctrl+shift+x',
  [HOTKEY.TOGGLE_SIDEBAR_CHANGES]: 'ctrl+shift+g',
  [HOTKEY.TOGGLE_SIDEBAR_WORKSPACE_REVIEW]: 'ctrl+shift+m',
  [HOTKEY.TOGGLE_SIDEBAR_WORKSPACE_UPDATER]: 'ctrl+shift+u',
});

export enum ACTIVITY_MODE {
  EXPLORER = 'EXPLORER',
  CHANGES = 'CHANGES',
  WORKSPACE_REVIEW = 'WORKSPACE_REVIEW',
  WORKSPACE_UPDATER = 'WORKSPACE_UPDATER',
  CONFLICT_RESOLUTION = 'CONFLICT_RESOLUTION',
  SETTINGS = 'SETTINGS',
  REVIEW = 'REVIEW',
  PROJECT_OVERVIEW = 'PROJECT_OVERVIEW',
  WORKSPACE_BUILDS = 'WORKSPACE_BUILD',
}

export enum AUX_PANEL_MODE {
  CONSOLE = 'COMPILE',
  DEV_TOOL = 'DEV_TOOL',
}

export enum ELEMENT_NATIVE_VIEW_MODE {
  FORM = 'Form',
  JSON = 'JSON',
  GRAMMAR = 'Grammar',
}

export enum GRAPH_EDITOR_MODE {
  FORM = 'FORM',
  GRAMMAR_TEXT = 'GRAMMAR_TEXT',
}
