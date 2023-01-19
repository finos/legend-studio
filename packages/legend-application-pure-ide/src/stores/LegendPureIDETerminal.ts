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
  getNullableFirstElement,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { FileCoordinate } from '../server/models/File.js';
import type { EditorStore } from './EditorStore.js';
import { LEGEND_PURE_IDE_TERMINAL_COMMAND } from './LegendPureIDECommand.js';

const PACKAGE_PATH_PATTERN = /^(?:(?:\w[\w$]*)::)*\w[\w$]*$/;
const FILE_PATH_PATTERN = /^\/?(?:\w\/)*\w+(?:.\w+)*$/;
const LEGEND_PURE_IDE_TERMINAL_WEBLINK_REGEX =
  /(?:(?<url>https?:[/]{2}[^\s"'!*(){}|\\^<>`]*[^\s"':,.!?{}|\\^~[\]`()<>])|(?<path>resource:(?<path_sourceId>\/?(?:\w\/)*\w+(?:.\w+)*) (?:line:(?<path_line>\d+)) (?:column:(?<path_column>\d+))))/;

export const setupTerminal = (editorStore: EditorStore): void => {
  editorStore.applicationStore.terminalService.terminal.setup({
    webLinkProvider: {
      handler: (event, text) => {
        const match = text.match(LEGEND_PURE_IDE_TERMINAL_WEBLINK_REGEX);
        if (match?.groups?.url) {
          editorStore.applicationStore.navigator.visitAddress(match.groups.url);
        } else if (
          match?.groups?.path &&
          match.groups.path_sourceId &&
          match.groups.path_column &&
          match.groups.path_line
        ) {
          flowResult(
            editorStore.loadFile(
              match.groups.path_sourceId,
              new FileCoordinate(
                match.groups.path_sourceId,
                Number.parseInt(match.groups.path_line, 10),
                Number.parseInt(match.groups.path_column, 10),
              ),
            ),
          ).catch(editorStore.applicationStore.alertUnhandledError);
        }
      },
      regex: LEGEND_PURE_IDE_TERMINAL_WEBLINK_REGEX,
    },
    // TODO: for these, we can potentially use `runCommand`, but we need to refactor
    // command to return promises
    // that is the cleaner way to do this and make us able to move terminal plugins/extension mechanism
    // to LegendApplicationPlugin for example, rather than being application specific like this
    // as for example, this requires access to `EditorStore` right now
    commands: [
      {
        command: LEGEND_PURE_IDE_TERMINAL_COMMAND.GO,
        description: 'Run the go() function in /welcome.pure. Usage: go',
        aliases: [
          LEGEND_PURE_IDE_TERMINAL_COMMAND.EXECUTE_GO,
          LEGEND_PURE_IDE_TERMINAL_COMMAND.COMPILE,
        ],
        handler: async (args: string[]): Promise<void> =>
          flowResult(editorStore.executeGo()).catch(
            editorStore.applicationStore.alertUnhandledError,
          ),
      },
      {
        command: LEGEND_PURE_IDE_TERMINAL_COMMAND.TEST,
        description: 'Run the test suite. Usage: test [/some/path]',
        handler: async (args: string[]): Promise<void> => {
          const path = getNullableFirstElement(args);
          if (path) {
            if (!path.match(PACKAGE_PATH_PATTERN)) {
              editorStore.applicationStore.terminalService.terminal.fail(
                `${LEGEND_PURE_IDE_TERMINAL_COMMAND.TEST} command requires a valid Pure path`,
              );
              return;
            }
          }
          await flowResult(editorStore.executeTests(path ?? '::')).catch(
            editorStore.applicationStore.alertUnhandledError,
          );
        },
      },

      // io
      {
        command: LEGEND_PURE_IDE_TERMINAL_COMMAND.REMOVE,
        description: 'Remove a file or directory. Usage: rm /some/path',
        handler: async (args: string[]): Promise<void> => {
          const path = getNullableFirstElement(args);
          if (!path || !path.match(FILE_PATH_PATTERN)) {
            editorStore.applicationStore.terminalService.terminal.fail(
              `rm command requires a valid file/directory path`,
            );
            return;
          }
          await flowResult(
            editorStore.deleteDirectoryOrFile(path, undefined, undefined),
          ).catch(editorStore.applicationStore.alertUnhandledError);
        },
      },
      {
        command: LEGEND_PURE_IDE_TERMINAL_COMMAND.MOVE,
        description: 'Move a file. Usage: mv /old/path /new/path',
        handler: async (args: string[]): Promise<void> => {
          const oldPath = guaranteeNonNullable(args[0]);
          if (!oldPath || !oldPath.match(FILE_PATH_PATTERN)) {
            editorStore.applicationStore.terminalService.terminal.fail(
              `${LEGEND_PURE_IDE_TERMINAL_COMMAND.MOVE} command requires a valid old file path`,
            );
            return;
          }
          const newPath = guaranteeNonNullable(args[1]);
          if (!newPath || !newPath.match(FILE_PATH_PATTERN)) {
            editorStore.applicationStore.terminalService.terminal.fail(
              `${LEGEND_PURE_IDE_TERMINAL_COMMAND.MOVE} command requires a valid new file path`,
            );
            return;
          }
          await flowResult(editorStore.renameFile(oldPath, newPath)).catch(
            editorStore.applicationStore.alertUnhandledError,
          );
        },
      },
      {
        command: LEGEND_PURE_IDE_TERMINAL_COMMAND.NEW_DIRECTORY,
        description: 'Create a new directory. Usage: mkdir /some/path',
        handler: async (args: string[]): Promise<void> => {
          const path = guaranteeNonNullable(args[0]);
          if (!path || !path.match(FILE_PATH_PATTERN)) {
            editorStore.applicationStore.terminalService.terminal.fail(
              `${LEGEND_PURE_IDE_TERMINAL_COMMAND.NEW_DIRECTORY} command requires a valid old file path`,
            );
            return;
          }
          await flowResult(editorStore.createNewDirectory(path)).catch(
            editorStore.applicationStore.alertUnhandledError,
          );
        },
      },
      {
        command: LEGEND_PURE_IDE_TERMINAL_COMMAND.NEW_FILE,
        description: 'Create a new file. Usage: touch /some/path',
        handler: async (args: string[]): Promise<void> => {
          const path = guaranteeNonNullable(args[0]);
          if (!path || !path.match(FILE_PATH_PATTERN)) {
            editorStore.applicationStore.terminalService.terminal.fail(
              `${LEGEND_PURE_IDE_TERMINAL_COMMAND.NEW_FILE} command requires a valid old file path`,
            );
            return;
          }
          await flowResult(editorStore.createNewDirectory(path)).catch(
            editorStore.applicationStore.alertUnhandledError,
          );
        },
      },

      // utility
      {
        command: LEGEND_PURE_IDE_TERMINAL_COMMAND.CLEAR,
        description: 'Clear the terminal. Usage: clear',
        handler: async (args: string[]): Promise<void> => {
          editorStore.applicationStore.terminalService.terminal.clear();
        },
      },
      {
        command: LEGEND_PURE_IDE_TERMINAL_COMMAND.ANSI,
        description: 'Show common ANSI escape sequences. Usage: ansi',
        handler: async (args: string[]): Promise<void> => {
          editorStore.applicationStore.terminalService.terminal.showCommonANSIEscapeSequences();
          return Promise.resolve();
        },
      },
      {
        command: LEGEND_PURE_IDE_TERMINAL_COMMAND.HELP,
        description: 'Show help. Usage: help',
        handler: async (args: string[]): Promise<void> => {
          editorStore.applicationStore.terminalService.terminal.showHelp();
          return Promise.resolve();
        },
      },
    ],
  });
};
