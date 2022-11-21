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

import { assertNonNullable, swapEntry } from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';

export interface TabState {
  uuid: string;

  get headerName(): string;
}

export abstract class TabManagerState {
  abstract currentTab?: TabState | undefined;
  abstract tabs: TabState[];

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

  abstract openTab(tab: TabState): void;
  abstract closeTab(tab: TabState): void;
}
