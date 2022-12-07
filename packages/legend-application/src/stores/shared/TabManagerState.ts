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
  assertNonNullable,
  assertTrue,
  swapEntry,
  uuid,
} from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';

export abstract class TabState {
  readonly uuid = uuid();

  abstract get label(): string;

  get description(): string | undefined {
    return undefined;
  }

  match(tab: TabState): boolean {
    return this === tab;
  }

  onOpen(): void {
    // do nothing
  }

  onClose(): void {
    // do nothing
  }
}

export abstract class TabManagerState {
  currentTab?: TabState | undefined;
  tabs: TabState[] = [];

  constructor() {
    makeObservable(this, {
      currentTab: observable,
      tabs: observable,
      setCurrentTab: action,
      closeTab: action,
      closeAllTabs: action,
      closeAllOtherTabs: action,
      openTab: action,
      swapTabs: action,
    });
  }

  setCurrentTab(val: TabState | undefined): void {
    this.currentTab = val;
  }

  closeAllOtherTabs(tab: TabState): void {
    assertNonNullable(
      this.tabs.find((e) => e === tab),
      'Specified tab should be currently opened',
    );
    this.setCurrentTab(tab);
    this.tabs = [tab];
  }

  closeAllTabs(): void {
    this.setCurrentTab(undefined);
    this.tabs = [];
  }

  swapTabs(tab1: TabState, tab2: TabState): void {
    swapEntry(this.tabs, tab1, tab2);
  }

  /**
   * The unique drag and drop type
   * See https://react-dnd.github.io/react-dnd/docs/overview#items-and-types
   */
  abstract get dndType(): string;

  openTab(tab: TabState): void {
    const existingTab = this.tabs.find((t) => t.match(tab));
    if (!existingTab) {
      if (this.currentTab) {
        const currIndex = this.tabs.findIndex((e) => e === this.currentTab);
        this.tabs.splice(currIndex + 1, 0, tab);
      } else {
        this.tabs.push(tab);
      }
    }
    this.setCurrentTab(tab);

    tab.onOpen();
  }

  closeTab(tab: TabState): void {
    const tabIndex = this.tabs.findIndex((t) => t.match(tab));
    assertTrue(tabIndex !== -1, `Can't close a tab which is not opened`);
    this.tabs.splice(tabIndex, 1);
    if (this.currentTab === tab) {
      if (this.tabs.length) {
        const openIndex = tabIndex - 1;
        this.setCurrentTab(
          openIndex >= 0 ? this.tabs[openIndex] : this.tabs[0],
        );
      } else {
        this.setCurrentTab(undefined);
      }
    }

    tab.onClose();
  }
}
