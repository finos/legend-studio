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

import { LogEvent } from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import { APPLICATION_EVENT } from './ApplicationEvent.js';
import type { GenericLegendApplicationStore } from './ApplicationStore.js';

export interface CommandRegistrar {
  registerCommands(): void;
  deregisterCommands(): void;
}
export type CommandConfigEntry = {
  title?: string;
  defaultKeyboardShortcut?: string;
  when?: string;
};
export type KeyedCommandConfigEntry = {
  key: string;
  content: CommandConfigEntry;
};
export type CommandConfigData = Record<string, CommandConfigEntry>;
export const collectKeyedCommandConfigEntriesFromConfig = (
  rawEntries: Record<string, CommandConfigEntry>,
): KeyedCommandConfigEntry[] =>
  Object.entries(rawEntries).map((entry) => ({
    key: entry[0],
    content: entry[1],
  }));
export type Command = {
  key: string;
  trigger?: () => boolean;
  action?: () => void;
};

export class CommandCenter {
  readonly applicationStore: GenericLegendApplicationStore;
  readonly commandRegistry = new Map<string, Command>();

  constructor(applicationStore: GenericLegendApplicationStore) {
    makeObservable(this, {
      commandRegistry: observable,
      registerCommand: action,
      deregisterCommand: action,
    });

    this.applicationStore = applicationStore;
  }

  registerCommand(command: Command): void {
    const commandKey = command.key;
    if (this.commandRegistry.has(commandKey)) {
      this.applicationStore.log.warn(
        LogEvent.create(
          APPLICATION_EVENT.APPLICATION_COMMAND_CENTER_REGISTRATION_FAILURE,
        ),
        `Can't register command: command is already registered`,
      );
      return;
    }
    this.commandRegistry.set(commandKey, command);
  }

  deregisterCommand(commandKey: string): void {
    this.commandRegistry.delete(commandKey);
  }

  runCommand(commandKey: string): boolean {
    const command = this.commandRegistry.get(commandKey);
    if (command && (!command.trigger || command.trigger())) {
      command.action?.();
      return true;
    }
    return false;
  }
}
