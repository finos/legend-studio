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

import { DISPLAY_ANSI_ESCAPE } from '@finos/legend-application';
import { assertErrorThrown, getNullableFirstEntry } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { deserialize } from 'serializr';
import {
  ConceptNode,
  PackageConceptAttribute,
} from '../server/models/ConceptTree.js';
import { DirectoryNode } from '../server/models/DirectoryTree.js';
import { FileCoordinate } from '../server/models/File.js';
import {
  HOME_DIRECTORY_PATH,
  ROOT_PACKAGE_PATH,
  WELCOME_FILE_PATH,
} from './PureIDEConfig.js';
import type { PureIDEStore } from './PureIDEStore.js';
import { LEGEND_PURE_IDE_TERMINAL_COMMAND } from '../__lib__/LegendPureIDECommand.js';

const PACKAGE_PATH_PATTERN = /^(?:(?:\w[\w$]*)::)*\w[\w$]*$/;
const FILE_PATH_PATTERN = /^\/?(?:\w+\/)*\w+(?:\.\w+)*$/;
const LEGEND_PURE_IDE_TERMINAL_WEBLINK_REGEX =
  /(?:(?<url>https?:[/]{2}[^\s"'!*(){}|\\^<>`]*[^\s"':,.!?{}|\\^~[\]`()<>])|(?<path>resource:(?<path_sourceId>\/?(?:\w+\/)*\w+(?:\.\w+)*) (?:line:(?<path_line>\d+)) (?:column:(?<path_column>\d+))))/;

export const setupTerminal = (ideStore: PureIDEStore): void => {
  ideStore.applicationStore.terminalService.terminal.setup({
    webLinkProvider: {
      handler: (event, text) => {
        const match = text.match(LEGEND_PURE_IDE_TERMINAL_WEBLINK_REGEX);
        if (match?.groups?.url) {
          ideStore.applicationStore.navigationService.navigator.visitAddress(
            match.groups.url,
          );
        } else if (
          match?.groups?.path &&
          match.groups.path_sourceId &&
          match.groups.path_column &&
          match.groups.path_line
        ) {
          flowResult(
            ideStore.loadFile(
              match.groups.path_sourceId,
              new FileCoordinate(
                match.groups.path_sourceId,
                Number.parseInt(match.groups.path_line, 10),
                Number.parseInt(match.groups.path_column, 10),
              ),
            ),
          ).catch(ideStore.applicationStore.alertUnhandledError);
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
        description: 'Run the go() function in welcome file',
        usage: 'go',
        aliases: ['compile', 'executeGo'],
        handler: async (args: string[]): Promise<void> =>
          flowResult(ideStore.executeGo()).catch(
            ideStore.applicationStore.alertUnhandledError,
          ),
      },
      {
        command: LEGEND_PURE_IDE_TERMINAL_COMMAND.TEST,
        description: 'Run the test suite (by path if specified)',
        usage: 'test [/some/path]',
        handler: async (args: string[]): Promise<void> => {
          const path = getNullableFirstEntry(args);
          if (path) {
            if (!path.match(PACKAGE_PATH_PATTERN)) {
              ideStore.applicationStore.terminalService.terminal.fail(
                `command requires a valid package/concept path`,
              );
              return;
            }
          }
          await flowResult(
            ideStore.executeTests(path ?? ROOT_PACKAGE_PATH),
          ).catch(ideStore.applicationStore.alertUnhandledError);
        },
      },

      // io
      {
        command: LEGEND_PURE_IDE_TERMINAL_COMMAND.REMOVE,
        description: 'Remove a file or directory',
        usage: 'rm /some/path',
        handler: async (args: string[]): Promise<void> => {
          const path = getNullableFirstEntry(args);
          if (!path?.match(FILE_PATH_PATTERN)) {
            ideStore.applicationStore.terminalService.terminal.fail(
              `rm command requires a valid file/directory path`,
            );
            return;
          }
          await flowResult(
            ideStore.deleteDirectoryOrFile(path, undefined, undefined),
          ).catch(ideStore.applicationStore.alertUnhandledError);
        },
      },
      {
        command: LEGEND_PURE_IDE_TERMINAL_COMMAND.MOVE,
        description: 'Move a file',
        usage: 'mv /old/path /new/path',
        handler: async (args: string[]): Promise<void> => {
          const oldPath = args[0];
          if (!oldPath?.match(FILE_PATH_PATTERN)) {
            ideStore.applicationStore.terminalService.terminal.fail(
              `command requires a valid old file path`,
            );
            return;
          }
          const newPath = args[1];
          if (!newPath?.match(FILE_PATH_PATTERN)) {
            ideStore.applicationStore.terminalService.terminal.fail(
              `command requires a valid new file path`,
            );
            return;
          }
          await flowResult(ideStore.renameFile(oldPath, newPath)).catch(
            ideStore.applicationStore.alertUnhandledError,
          );
        },
      },
      {
        command: LEGEND_PURE_IDE_TERMINAL_COMMAND.NEW_DIRECTORY,
        description: 'Create a new directory',
        usage: 'mkdir /some/path',
        handler: async (args: string[]): Promise<void> => {
          const path = args[0];
          if (!path?.match(FILE_PATH_PATTERN)) {
            ideStore.applicationStore.terminalService.terminal.fail(
              `command requires a valid directory path`,
            );
            return;
          }
          await flowResult(ideStore.createNewDirectory(path)).catch(
            ideStore.applicationStore.alertUnhandledError,
          );
        },
      },
      {
        command: LEGEND_PURE_IDE_TERMINAL_COMMAND.NEW_FILE,
        description: 'Create a new file',
        usage: 'touch /some/path',
        handler: async (args: string[]): Promise<void> => {
          const path = args[0];
          if (!path?.match(FILE_PATH_PATTERN)) {
            ideStore.applicationStore.terminalService.terminal.fail(
              `command requires a valid path`,
            );
            return;
          }
          await flowResult(ideStore.createNewDirectory(path)).catch(
            ideStore.applicationStore.alertUnhandledError,
          );
        },
      },

      // navigation
      {
        command: LEGEND_PURE_IDE_TERMINAL_COMMAND.WELCOME,
        description: 'Open the welcome file',
        usage: 'welcome',
        aliases: ['start'],
        handler: async (): Promise<void> => {
          await flowResult(ideStore.loadFile(WELCOME_FILE_PATH)).catch(
            ideStore.applicationStore.alertUnhandledError,
          );
        },
      },
      {
        command: LEGEND_PURE_IDE_TERMINAL_COMMAND.OPEN_FILE,
        description: 'Open a file',
        usage: 'open /some/file/path',
        aliases: ['edit', 'code', 'vi'],
        handler: async (args: string[]): Promise<void> => {
          const path = args[0];
          if (!path?.match(PACKAGE_PATH_PATTERN)) {
            ideStore.applicationStore.terminalService.terminal.fail(
              `command requires a valid file path`,
            );
            return;
          }

          await flowResult(ideStore.loadFile(path)).catch(
            ideStore.applicationStore.alertUnhandledError,
          );
        },
      },
      {
        command: LEGEND_PURE_IDE_TERMINAL_COMMAND.OPEN_DIRECTORY,
        description: 'Open a directory or a package',
        usage: 'cd /some/directory/path | cd some::package::path',
        handler: async (args: string[]): Promise<void> => {
          const path = args[0];
          if (
            !path ||
            !(path.match(FILE_PATH_PATTERN) ?? path.match(PACKAGE_PATH_PATTERN))
          ) {
            ideStore.applicationStore.terminalService.terminal.fail(
              `command requires a valid directory or concept path`,
            );
            return;
          }

          try {
            // NOTE: favor concept/package path over directory path
            if (path.match(PACKAGE_PATH_PATTERN)) {
              await flowResult(
                ideStore.conceptTreeState.revealConcept(path, {
                  forceOpenExplorerPanel: true,
                  packageOnly: true,
                }),
              );
            } else {
              await flowResult(
                ideStore.directoryTreeState.revealPath(path, {
                  forceOpenExplorerPanel: true,
                  directoryOnly: true,
                }),
              );
            }
          } catch (error) {
            assertErrorThrown(error);
            ideStore.applicationStore.terminalService.terminal.fail(
              error.message,
            );
          }
        },
      },
      {
        command: LEGEND_PURE_IDE_TERMINAL_COMMAND.LIST_DIRECTORY,
        description: 'List children of a directory or package',
        usage: 'cd /some/directory/path | cd some::package::path | cd ::',
        handler: async (args: string[]): Promise<void> => {
          const path = args[0];
          if (
            !path ||
            !(
              path.match(FILE_PATH_PATTERN) ??
              path.match(PACKAGE_PATH_PATTERN) ??
              [HOME_DIRECTORY_PATH, ROOT_PACKAGE_PATH].includes(path)
            )
          ) {
            ideStore.applicationStore.terminalService.terminal.fail(
              `command requires a valid directory or package path`,
            );
            return;
          }

          try {
            // NOTE: favor concept/package path over directory path
            if (
              path.match(PACKAGE_PATH_PATTERN) ||
              path === ROOT_PACKAGE_PATH
            ) {
              ideStore.applicationStore.terminalService.terminal.output(
                (await ideStore.client.getConceptChildren(path))
                  .map((child) => deserialize(ConceptNode, child))
                  .map((child) =>
                    child.li_attr instanceof PackageConceptAttribute
                      ? `${DISPLAY_ANSI_ESCAPE.BRIGHT_CYAN}${child.text}${DISPLAY_ANSI_ESCAPE.RESET}`
                      : child.text,
                  )
                  .join('\n'),
              );
            } else {
              ideStore.applicationStore.terminalService.terminal.output(
                (await ideStore.client.getDirectoryChildren(path))
                  .map((child) => deserialize(DirectoryNode, child))
                  .map((child) =>
                    child.isFolderNode
                      ? `${DISPLAY_ANSI_ESCAPE.BRIGHT_CYAN}${child.text}${DISPLAY_ANSI_ESCAPE.RESET}`
                      : child.text,
                  )
                  .join('\n'),
              );
            }
          } catch (error) {
            assertErrorThrown(error);
            ideStore.applicationStore.terminalService.terminal.fail(
              error.message,
            );
          }
        },
      },

      // utility
      {
        command: LEGEND_PURE_IDE_TERMINAL_COMMAND.CLEAR,
        description: 'Clear the terminal',
        usage: 'clear',
        handler: async (args: string[]): Promise<void> => {
          ideStore.applicationStore.terminalService.terminal.clear();
        },
      },
      {
        command: LEGEND_PURE_IDE_TERMINAL_COMMAND.ECHO,
        description: 'Print text',
        usage: `echo 'some string'`,
        handler: async (
          args: string[],
          command: string,
          text: string,
        ): Promise<void> => {
          const content = text
            .substring(text.indexOf(command) + command.length)
            .trim();
          ideStore.applicationStore.terminalService.terminal.output(
            content.replaceAll(/\\u001b/g, '\u001b'),
          );
        },
      },
      {
        command: LEGEND_PURE_IDE_TERMINAL_COMMAND.ANSI,
        description: 'Show common ANSI escape sequences used for styling',
        usage: 'ansi',
        handler: async (args: string[]): Promise<void> => {
          ideStore.applicationStore.terminalService.terminal.showCommonANSIEscapeSequences();
          return Promise.resolve();
        },
      },
      {
        command: LEGEND_PURE_IDE_TERMINAL_COMMAND.DEBUG,
        description:
          'Introsptect debug state.  When passing no parameters, will show display summary of available variables',
        usage: 'debug [abort | var varName | eval expression]',
        aliases: [],
        handler: async (args: string[]): Promise<void> => {
          const option = getNullableFirstEntry(args);
          let command = { command: 'summary', args: [] as string[] };
          if (option) {
            command = { command: option, args: args.slice(1) };
          }
          flowResult(ideStore.debugState(command)).catch(
            ideStore.applicationStore.alertUnhandledError,
          );
        },
      },
      {
        command: LEGEND_PURE_IDE_TERMINAL_COMMAND.HELP,
        description: 'Show help',
        usage: 'help',
        handler: async (args: string[]): Promise<void> => {
          ideStore.applicationStore.terminalService.terminal.showHelp();
          return Promise.resolve();
        },
      },
    ],
  });
};
