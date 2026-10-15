/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { action, computed, makeObservable, observable } from 'mobx';
import { type CubeJsonNode, readCubeJson } from './CubeJson.js';

/**
 * Open JSON (PLAN §11.20): one Variant cell's document, shown as a tree in a
 * dialog, from the cell's menu
 */
export class CubeJsonViewerState {
  /** The cell's column, for the title; `undefined` while closed */
  column: string | undefined;
  /** The cell's text, as the engine sent it */
  text: string | undefined;

  constructor() {
    makeObservable(this, {
      column: observable,
      text: observable,
      isOpen: computed,
      document: computed,
      open: action,
      close: action,
    });
  }

  get isOpen(): boolean {
    return this.text !== undefined;
  }

  /** The document; `undefined` for text that isn't JSON, shown as it is */
  get document(): CubeJsonNode | undefined {
    return this.text === undefined ? undefined : readCubeJson(this.text);
  }

  open(column: string, text: string): void {
    this.column = column;
    this.text = text;
  }

  close(): void {
    this.column = undefined;
    this.text = undefined;
  }
}
