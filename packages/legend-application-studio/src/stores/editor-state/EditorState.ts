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

import type { EditorStore } from '../EditorStore.js';
import { uuid } from '@finos/legend-shared';
import type { TabState } from '@finos/legend-application';

export abstract class EditorState implements TabState {
  /**
   * NOTE: used to detect when an element editor state changes so we can force a remount of the editor component
   */
  readonly uuid = uuid();

  readonly editorStore: EditorStore;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
  }

  abstract get headerName(): string;

  /**
   * Check if the specified tab this tab or not.
   * This is often used when checking if a tab is already opened.
   */
  abstract match(tab: EditorState): boolean;
}
