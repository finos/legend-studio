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

import type { GenericLegendApplicationStore } from '../ApplicationStore.js';
import { action, makeObservable, observable } from 'mobx';

export abstract class Terminal {
  readonly applicationStore: GenericLegendApplicationStore;

  searchRegex = false;
  searchWholeWord = false;
  searchCaseSensitive = false;

  preserveLog = false;

  constructor(applicationStore: GenericLegendApplicationStore) {
    makeObservable(this, {
      searchRegex: observable,
      searchWholeWord: observable,
      searchCaseSensitive: observable,
      preserveLog: observable,
      setSearchRegex: action,
      setSearchWholeWord: action,
      setSearchCaseSensitive: action,
      setPreserveLog: action,
    });

    this.applicationStore = applicationStore;
  }

  setSearchRegex(val: boolean): void {
    this.searchRegex = val;
  }

  setSearchWholeWord(val: boolean): void {
    this.searchWholeWord = val;
  }

  setSearchCaseSensitive(val: boolean): void {
    this.searchCaseSensitive = val;
  }

  setPreserveLog(val: boolean): void {
    this.preserveLog = val;
  }

  abstract mount(container: HTMLElement): void;
  abstract autoResize(): void;
  abstract focus(): void;

  showHelp(): void {
    // do nothing
  }

  abstract clear(): void;
  abstract write(val: string): void;
  abstract writeln(val: string): void;
}
