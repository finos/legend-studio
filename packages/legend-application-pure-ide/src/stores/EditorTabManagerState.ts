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

import { TabManagerState, TabState } from '@finos/legend-application';
import { assertTrue } from '@finos/legend-shared';
import type { EditorStore } from './EditorStore.js';

export abstract class EditorTabState extends TabState {
  readonly editorStore: EditorStore;

  constructor(editorStore: EditorStore) {
    super();
    this.editorStore = editorStore;
  }
}

export class EditorTabManagerState extends TabManagerState {
  readonly editorStore: EditorStore;

  declare currentTab?: EditorTabState | undefined;
  declare tabs: EditorTabState[];

  constructor(editorStore: EditorStore) {
    super();

    this.editorStore = editorStore;
  }

  get dndType(): string {
    return 'editor.tab-manager.tab';
  }

  closeTab(tab: EditorTabState): void {
    const elementIndex = this.tabs.findIndex((e) => e === tab);
    assertTrue(elementIndex !== -1, `Can't close a tab which is not opened`);
    this.tabs.splice(elementIndex, 1);
    if (this.currentTab === tab) {
      if (this.tabs.length) {
        const openIndex = elementIndex - 1;
        this.setCurrentTab(
          openIndex >= 0 ? this.tabs[openIndex] : this.tabs[0],
        );
      } else {
        this.setCurrentTab(undefined);
      }
    }
  }

  openTab(tab: EditorTabState): void {
    const existingTab = this.tabs.find((t) => t === tab);
    if (!existingTab) {
      if (this.currentTab) {
        const currIndex = this.tabs.findIndex((e) => e === this.currentTab);
        this.tabs.splice(currIndex + 1, 0, tab);
      } else {
        this.tabs.push(tab);
      }
    }
    this.setCurrentTab(tab);
  }
}
