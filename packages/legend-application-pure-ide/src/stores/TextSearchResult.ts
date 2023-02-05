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

import { computed, makeObservable, observable } from 'mobx';
import type {
  SearchEntry,
  SearchResultEntry,
} from '../server/models/SearchEntry.js';
import type { EditorStore } from './EditorStore.js';
import { deleteEntry } from '@finos/legend-shared';

export class TextSearchResult {
  readonly editorStore: EditorStore;

  searchEntries: SearchResultEntry[] = [];

  constructor(editorStore: EditorStore, searchEntries: SearchResultEntry[]) {
    makeObservable(this, {
      searchEntries: observable,
      numberOfFiles: computed,
      numberOfResults: computed,
    });

    this.editorStore = editorStore;
    this.searchEntries = searchEntries;
  }

  dismissSearchEntry(value: SearchEntry): void {
    deleteEntry(this.searchEntries, value);
    if (!this.searchEntries.length) {
      this.editorStore.setTextSearchResult(undefined);
    }
  }

  get numberOfFiles(): number {
    return this.searchEntries.length;
  }
  get numberOfResults(): number {
    return this.searchEntries.flatMap((entry) => entry.coordinates).length;
  }
}
