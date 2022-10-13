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

import { addUniqueEntry, LogEvent } from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import { APPLICATION_EVENT } from './ApplicationEvent.js';
import type { GenericLegendApplicationStore } from './ApplicationStore.js';

export class KeyboardShortcutsService {
  readonly applicationStore: GenericLegendApplicationStore;
  readonly keyMap = new Map<string, string[]>();
  /**
   * NOTE: we want to leave the value of the map as optional because we want
   * to use this map to quickly construct the key-binding view: some commands
   * don't already have a hotkey
   */
  readonly commandKeyMap = new Map<string, string | undefined>();
  isHotkeysBlocked = false;

  constructor(applicationStore: GenericLegendApplicationStore) {
    makeObservable(this, {
      keyMap: observable,
      commandKeyMap: observable,
      isHotkeysBlocked: observable,
      updateHotkey: action,
      blockGlobalHotkeys: action,
      unblockGlobalHotkeys: action,
    });

    this.applicationStore = applicationStore;
    const commandsWithMultipleKeyBindings: string[] = [];
    this.applicationStore.pluginManager
      .getApplicationPlugins()
      .flatMap((plugin) => plugin.getExtraKeyedCommandConfigEntries?.() ?? [])
      .forEach((entry) => {
        if (
          entry.content.defaultKeyboardShortcut &&
          this.commandKeyMap.get(entry.key)
        ) {
          addUniqueEntry(commandsWithMultipleKeyBindings, entry.key);
        }
        this.updateHotkey(entry.key, entry.content.defaultKeyboardShortcut);
      });

    if (commandsWithMultipleKeyBindings.length) {
      this.applicationStore.log.warn(
        LogEvent.create(
          APPLICATION_EVENT.APPLICATION_KEYBOARD_SHORTCUTS_CONFIGURATION_CHECK_FAILURE,
        ),
        `Found multiple key bindings in configuration for commands:\n${commandsWithMultipleKeyBindings
          .map((key) => `- ${key}`)
          .join('\n')}`,
      );
    }
  }

  blockGlobalHotkeys(): void {
    this.isHotkeysBlocked = true;
  }

  unblockGlobalHotkeys(): void {
    this.isHotkeysBlocked = false;
  }

  updateHotkey(commandKey: string, keyCombination: string | undefined): void {
    const currentKeyCombination = this.commandKeyMap.get(commandKey);
    this.commandKeyMap.set(commandKey, keyCombination);
    // remove old key map
    if (currentKeyCombination) {
      this.keyMap.set(
        currentKeyCombination,
        (this.keyMap.get(currentKeyCombination) ?? []).filter(
          (key) => key === commandKey,
        ),
      );
    }
    // add new key map
    if (keyCombination) {
      this.keyMap.set(keyCombination, [
        ...(this.keyMap.get(keyCombination) ?? []).filter(
          (key) => key === commandKey,
        ),
        commandKey,
      ]);
    }
  }

  dispatch(keyCombination: string): void {
    const mappedCommandKeys = this.keyMap.get(keyCombination) ?? [];
    for (const commandKey of mappedCommandKeys) {
      // find the first command that works then escape
      if (this.applicationStore.commandCenter.runCommand(commandKey)) {
        return;
      }
    }
  }
}
