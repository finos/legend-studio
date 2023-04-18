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
import {
  type SearchEntry,
  SearchResultCoordinate,
  SearchResultEntry,
} from '../server/models/SearchEntry.js';
import type { Usage, ConceptInfo } from '../server/models/Usage.js';
import type { PureIDEStore } from './PureIDEStore.js';
import { deleteEntry, guaranteeNonNullable } from '@finos/legend-shared';

export class ReferenceUsageResult {
  readonly ideStore: PureIDEStore;
  readonly usageConcept: ConceptInfo;

  searchEntries: SearchResultEntry[] = [];

  constructor(
    ideStore: PureIDEStore,
    usageConcept: ConceptInfo,
    references: Usage[],
    searchResultCoordinates: SearchResultCoordinate[],
  ) {
    makeObservable(this, {
      searchEntries: observable,
      numberOfFiles: computed,
      numberOfResults: computed,
    });

    this.ideStore = ideStore;
    this.usageConcept = usageConcept;

    const fileMap = new Map<string, SearchResultEntry>();
    references.forEach((ref, idx) => {
      let entry: SearchResultEntry;
      if (fileMap.has(ref.source)) {
        entry = guaranteeNonNullable(fileMap.get(ref.source));
      } else {
        entry = new SearchResultEntry();
        entry.sourceId = ref.source;
        fileMap.set(ref.source, entry);
      }
      const coordinates = new SearchResultCoordinate(
        ref.source,
        ref.startLine,
        ref.startColumn,
        ref.endLine,
        ref.endColumn,
      );
      coordinates.preview = searchResultCoordinates.find(
        (result) =>
          result.sourceId === ref.source &&
          result.startLine === ref.startLine &&
          result.startColumn === ref.startColumn &&
          result.endLine === ref.endLine &&
          result.endColumn === ref.endColumn,
      )?.preview;
      entry.coordinates.push(coordinates);
    });

    this.searchEntries = Array.from(fileMap.keys())
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
      });
  }

  dismissSearchEntry(value: SearchEntry): void {
    deleteEntry(this.searchEntries, value);
    if (!this.searchEntries.length) {
      this.ideStore.setReferenceUsageResult(undefined);
    }
  }

  get numberOfFiles(): number {
    return this.searchEntries.length;
  }

  get numberOfResults(): number {
    return this.searchEntries.flatMap((entry) => entry.coordinates).length;
  }
}
