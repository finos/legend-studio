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
  ActionState,
  assertErrorThrown,
  deleteEntry,
  type GeneratorFn,
  type PlainObject,
} from '@finos/legend-shared';
import { action, computed, flow, makeObservable, observable } from 'mobx';
import type { PureIDEStore } from './PureIDEStore.js';
import {
  getSearchResultEntry,
  type SearchEntry,
  type SearchResultEntry,
} from '../server/models/SearchEntry.js';

export class TextSearchResult {
  readonly searchState: TextSearchState;

  searchEntries: SearchResultEntry[] = [];

  constructor(
    searchState: TextSearchState,
    searchEntries: SearchResultEntry[],
  ) {
    makeObservable(this, {
      searchEntries: observable,
      numberOfFiles: computed,
      numberOfResults: computed,
    });

    this.searchState = searchState;
    this.searchEntries = searchEntries;
  }

  dismissSearchEntry(value: SearchEntry): void {
    deleteEntry(this.searchEntries, value);
    if (!this.searchEntries.length) {
      this.searchState.setResult(undefined);
    }
  }

  get numberOfFiles(): number {
    return this.searchEntries.length;
  }

  get numberOfResults(): number {
    return this.searchEntries.flatMap((entry) => entry.coordinates).length;
  }
}

export class TextSearchState {
  readonly ideStore: PureIDEStore;
  readonly loadState = ActionState.create();

  private searchInput?: HTMLInputElement | undefined;

  text = '';
  isCaseSensitive = false;
  isRegExp = false;
  result?: TextSearchResult | undefined;

  constructor(ideStore: PureIDEStore) {
    makeObservable(this, {
      text: observable,
      isCaseSensitive: observable,
      isRegExp: observable,
      result: observable,
      setText: action,
      setCaseSensitive: action,
      setRegExp: action,
      setResult: action,
      search: flow,
    });

    this.ideStore = ideStore;
  }

  setSearchInput(el: HTMLInputElement | undefined): void {
    this.searchInput = el;
  }

  focus(): void {
    this.searchInput?.focus();
  }

  select(): void {
    this.searchInput?.select();
  }

  *search(): GeneratorFn<void> {
    if (this.loadState.isInProgress || this.text.length <= 3) {
      return;
    }
    this.loadState.inProgress();
    try {
      const results = (
        (yield this.ideStore.client.searchText(
          this.text,
          this.isCaseSensitive,
          this.isRegExp,
        )) as PlainObject<SearchResultEntry>[]
      ).map((result) => getSearchResultEntry(result));
      this.setResult(new TextSearchResult(this, results));
      this.loadState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.ideStore.applicationStore.notificationService.notifyError(error);
      this.loadState.fail();
    }
  }

  setText(value: string): void {
    this.text = value;
  }

  setCaseSensitive(value: boolean): void {
    this.isCaseSensitive = value;
  }

  setRegExp(value: boolean): void {
    this.isRegExp = value;
  }

  setResult(val: TextSearchResult | undefined): void {
    this.result = val;
  }
}
