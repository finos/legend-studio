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

import type { KeyMap } from 'react-hotkeys';

export class HotkeyConfiguration {
  name: string;
  keyBinds: string[];
  handler: (event?: KeyboardEvent) => void;

  constructor(
    name: string,
    keyBinds: string[],
    handler: (event?: KeyboardEvent) => void,
  ) {
    this.name = name;
    this.keyBinds = keyBinds;
    this.handler = handler;
  }
}

export const buildReactHotkeysConfiguration = (
  hotkeys: HotkeyConfiguration[],
): [KeyMap, { [key: string]: (keyEvent?: KeyboardEvent) => void }] => {
  const keyMap: Record<PropertyKey, string[]> = {};
  hotkeys.forEach((hotkey) => {
    keyMap[hotkey.name] = hotkey.keyBinds;
  });
  const handlers: Record<PropertyKey, (keyEvent?: KeyboardEvent) => void> = {};
  hotkeys.forEach((hotkey) => {
    handlers[hotkey.name] = hotkey.handler;
  });
  return [keyMap, handlers];
};
