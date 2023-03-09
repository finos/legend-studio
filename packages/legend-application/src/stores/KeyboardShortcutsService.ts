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

import { isNonNullable } from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import type { GenericLegendApplicationStore } from './ApplicationStore.js';

export class KeyboardShortcutsService {
  readonly applicationStore: GenericLegendApplicationStore;
  /**
   * NOTE: with this design, the relationship between command and key is many-to-many
   * We can have multiple commands being mapped to the same key combination, and vice versa
   */
  readonly keyMap = new Map<string, string[]>();
  readonly commandKeyMap = new Map<string, string[]>();
  isHotkeysBlocked = false;

  constructor(applicationStore: GenericLegendApplicationStore) {
    makeObservable(this, {
      keyMap: observable,
      commandKeyMap: observable,
      isHotkeysBlocked: observable,
      addHotkey: action,
      blockGlobalHotkeys: action,
      unblockGlobalHotkeys: action,
    });

    this.applicationStore = applicationStore;
    this.applicationStore.pluginManager
      .getApplicationPlugins()
      .flatMap((plugin) => plugin.getExtraKeyedCommandConfigEntries?.() ?? [])
      .forEach((entry) => {
        // NOTE: since we allow mapping multiple commands to the same key combination
        // and when dispatching the command with a particular key combination, we only
        // execute the first matching command, if we override the config, we would need
        // to add them to the beginning of this list.
        // TODO: do validation on hot keys, hot keys which consist only of modifier keys, e.g. `Shift Shift` should not be supported
        const shortcuts = [
          entry.content.defaultKeyboardShortcut,
          ...(entry.content.additionalKeyboardShortcuts ?? []),
        ].filter(isNonNullable);
        if (shortcuts.length) {
          shortcuts.forEach((shortcut) => this.addHotkey(entry.key, shortcut));
        } else {
          if (!this.commandKeyMap.has(entry.key)) {
            this.commandKeyMap.set(entry.key, []);
          }
        }
      });
  }

  blockGlobalHotkeys(): void {
    this.isHotkeysBlocked = true;
  }

  unblockGlobalHotkeys(): void {
    this.isHotkeysBlocked = false;
  }

  addHotkey(commandKey: string, keyCombination: string): void {
    // add shortcut to command key map
    this.commandKeyMap.set(commandKey, [
      ...(this.commandKeyMap.get(commandKey) ?? []),
      keyCombination,
    ]);
    // add new key map
    this.keyMap.set(keyCombination, [
      ...(this.keyMap.get(keyCombination) ?? []).filter(
        (key) => key !== commandKey,
      ),
      commandKey,
    ]);
  }

  dispatch(keyCombination: string): void {
    if (this.isHotkeysBlocked) {
      return;
    }
    const mappedCommandKeys = this.keyMap.get(keyCombination) ?? [];
    for (const commandKey of mappedCommandKeys) {
      // find the first command that works then escape
      if (this.applicationStore.commandService.runCommand(commandKey)) {
        return;
      }
    }
  }
}
