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
  TOGGLE_TERMINAL_PANEL = 'editor.toggle-terminal-panel',
  EXECUTE = 'editor.execute',
  FULL_RECOMPILE = 'editor.full-compile',
  FULL_RECOMPILE_WITH_FULL_INIT = 'editor.full-compile.with-init',
  RUN_ALL_TESTS = 'editor.run-all-tests',
  RUN_RELAVANT_TESTS = 'editor.run-relavant-tests',
}

export const LEGEND_PURE_IDE_COMMAND_CONFIG: CommandConfigData = {
  [LEGEND_PURE_IDE_COMMAND_KEY.SEARCH_FILE]: {
    title: 'Search for file',
    defaultKeyboardShortcut: 'Control+Shift+KeyN',
    additionalKeyboardShortcuts: ['Control+KeyP', 'Meta+KeyP'],
  },
  [LEGEND_PURE_IDE_COMMAND_KEY.SEARCH_TEXT]: {
    title: 'Search text',
    defaultKeyboardShortcut: 'Control+Shift+KeyF',
    additionalKeyboardShortcuts: ['Meta+Shift+KeyF'],
  },
  [LEGEND_PURE_IDE_COMMAND_KEY.GO_TO_FILE]: {
    title: 'Go to file',
    defaultKeyboardShortcut: 'Control+F1',
  },
  [LEGEND_PURE_IDE_COMMAND_KEY.TOGGLE_TERMINAL_PANEL]: {
    title: 'Toggle terminal',
    defaultKeyboardShortcut: 'Control+Backquote',
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
};

export enum LEGEND_PURE_IDE_DIAGRAM_EDITOR_COMMAND_KEY {
  RECENTER = 'editor.diagram-editor.recenter',
  USE_ZOOM_TOOL = 'editor.diagram-editor.use-zoom-tool',
  USE_VIEW_TOOL = 'editor.diagram-editor.use-view-tool',
  USE_PAN_TOOL = 'editor.diagram-editor.use-pan-tool',
}

export const LEGEND_PURE_IDE_DIAGRAM_EDITOR_COMMAND_CONFIG: CommandConfigData =
  {
    [LEGEND_PURE_IDE_DIAGRAM_EDITOR_COMMAND_KEY.RECENTER]: {
      title: 'Diagram Editor: Recenter',
      defaultKeyboardShortcut: 'KeyR',
    },
    [LEGEND_PURE_IDE_DIAGRAM_EDITOR_COMMAND_KEY.USE_ZOOM_TOOL]: {
      title: 'Diagram Editor: Use zoom tool',
      defaultKeyboardShortcut: 'KeyZ',
    },
    [LEGEND_PURE_IDE_DIAGRAM_EDITOR_COMMAND_KEY.USE_VIEW_TOOL]: {
      title: 'Diagram Editor: Use view tool',
      defaultKeyboardShortcut: 'KeyV',
    },
    [LEGEND_PURE_IDE_DIAGRAM_EDITOR_COMMAND_KEY.USE_PAN_TOOL]: {
      title: 'Diagram Editor: Use pan tool',
      defaultKeyboardShortcut: 'KeyM',
    },
  };

export enum LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY {
  TOGGLE_TEXT_WRAP = 'editor.file-editor.toggle-text-wrap',
  REVEAL_CONCEPT_IN_TREE = 'editor.file-editor.reveal-concept-in-tree',
  GO_TO_DEFINITION = 'editor.file-editor.go-to-definition',
  GO_BACK = 'editor.file-editor.go-back',
  FIND_USAGES = 'editor.file-editor.find-usage',
  RENAME_CONCEPT = 'editor.file-editor.rename-concept',
  GO_TO_LINE = 'editor.file-editor.go-to-line',
  DELETE_LINE = 'editor.file-editor.delete-line',
}

export const LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_CONFIG: CommandConfigData =
  {
    [LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY.TOGGLE_TEXT_WRAP]: {
      title: 'Toggle Text-wrap (File)',
      defaultKeyboardShortcut: 'Alt+KeyZ',
    },
    [LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY.REVEAL_CONCEPT_IN_TREE]: {
      title: 'Reveal Concept in Tree (File)',
      defaultKeyboardShortcut: 'Control+Shift+KeyB',
    },
    [LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY.GO_TO_DEFINITION]: {
      title: 'Go to Definition (File)',
      defaultKeyboardShortcut: 'Control+KeyB',
    },
    [LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY.GO_BACK]: {
      title: 'Go Back (File)',
      defaultKeyboardShortcut: 'Control+Alt+KeyB',
    },
    [LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY.FIND_USAGES]: {
      title: 'Find Usages (File)',
      defaultKeyboardShortcut: 'Alt+F7',
    },
    [LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY.RENAME_CONCEPT]: {
      title: 'Rename Concept (File)',
      defaultKeyboardShortcut: 'F2',
    },
    [LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY.GO_TO_LINE]: {
      title: 'Go to Line (File)',
      defaultKeyboardShortcut: 'Control+KeyG',
    },
    [LEGEND_PURE_IDE_PURE_FILE_EDITOR_COMMAND_KEY.DELETE_LINE]: {
      title: 'Delete Line (File)',
      defaultKeyboardShortcut: 'Control+KeyD',
    },
  };

export enum LEGEND_PURE_IDE_TERMINAL_COMMAND {
  GO = 'go',

  TEST = 'test',

  REMOVE = 'rm',
  MOVE = 'mv',
  NEW_DIRECTORY = 'mkdir',
  NEW_FILE = 'touch',

  OPEN_FILE = 'open',
  OPEN_DIRECTORY = 'cd',
  LIST_DIRECTORY = 'ls',
  WELCOME = 'welcome',

  ECHO = 'echo',
  CLEAR = 'clear',
  ANSI = 'ansi',
  HELP = 'help',
  DEBUG = 'debug',
}
