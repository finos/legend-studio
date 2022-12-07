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
  UnmatchedFunctionResult,
  UnmatchedResult,
} from '../server/models/Execution.js';
import {
  type SearchEntry,
  SearchResultCoordinate,
  SearchResultEntry,
} from '../server/models/SearchEntry.js';
import type { Usage, UsageConcept } from '../server/models/Usage.js';
import type { EditorStore } from './EditorStore.js';
import { deleteEntry, guaranteeNonNullable } from '@finos/legend-shared';

export abstract class SearchState {
  readonly editorStore: EditorStore;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
  }
}

export abstract class SearchResultState extends SearchState {
  searchEntries: SearchResultEntry[] = [];

  constructor(editorStore: EditorStore, searchEntries: SearchResultEntry[]) {
    super(editorStore);

    makeObservable(this, {
      searchEntries: observable,
      numberOfFiles: computed,
      numberOfResults: computed,
    });

    this.searchEntries = searchEntries;
  }

  dismissSearchEntry(value: SearchEntry): void {
    deleteEntry(this.searchEntries, value);
    if (!this.searchEntries.length) {
      this.editorStore.setSearchState(undefined);
    }
  }

  get numberOfFiles(): number {
    return this.searchEntries.length;
  }
  get numberOfResults(): number {
    return this.searchEntries.flatMap((entry) => entry.coordinates).length;
  }
}

export class TextSearchResultState extends SearchResultState {}

export class UsageResultState extends SearchResultState {
  usageConcept: UsageConcept;

  constructor(
    editorStore: EditorStore,
    usageConcept: UsageConcept,
    references: Usage[],
  ) {
    const fileMap = new Map<string, SearchResultEntry>();
    references.forEach((ref) => {
      let entry: SearchResultEntry;
      if (fileMap.has(ref.source)) {
        entry = guaranteeNonNullable(fileMap.get(ref.source));
      } else {
        entry = new SearchResultEntry();
        entry.sourceId = ref.source;
        fileMap.set(ref.source, entry);
      }
      entry.coordinates.push(
        new SearchResultCoordinate(
          ref.startLine,
          ref.startColumn,
          ref.endLine,
          ref.endColumn,
        ),
      );
    });
    super(
      editorStore,
      Array.from(fileMap.keys())
        .sort((f1, f2) => f1.localeCompare(f2))
        .map((file) => {
          const entry = guaranteeNonNullable(fileMap.get(file));
          // NOTE: sorting the list of coordinates (line has higher precendence than column)
          entry.setCoordinates(
            entry.coordinates
              .sort((c1, c2) => c1.startColumn - c2.startColumn)
              .sort((c1, c2) => c1.startLine - c2.startLine),
          );
          return entry;
        }),
    );
    this.usageConcept = usageConcept;
  }
}

export class UnmatchedFunctionExecutionResultState extends SearchState {
  readonly result: UnmatchedFunctionResult;

  constructor(editorStore: EditorStore, result: UnmatchedFunctionResult) {
    super(editorStore);
    this.result = result;
  }
}

export class UnmatchExecutionResultState extends SearchState {
  readonly result: UnmatchedResult;

  constructor(editorStore: EditorStore, result: UnmatchedResult) {
    super(editorStore);
    this.result = result;
  }
}
