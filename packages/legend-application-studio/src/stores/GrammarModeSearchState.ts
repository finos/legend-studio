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
  deleteEntry,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import type { EditorStore } from './EditorStore.js';
import { action, makeObservable, observable } from 'mobx';

const MAXIMUM_SEARCH_RESULTS = 500;

export class SearchResultSourceInformation {
  startLine!: number;
  startColumn!: number;
  resultLine!: string;
  constructor(startLine: number, startColumn: number, resultLine: string) {
    this.startLine = startLine;
    this.startColumn = startColumn;
    this.resultLine = resultLine;
  }
}

export class SearchResult {
  entityPath!: string;
  indices: SearchResultSourceInformation[] = [];

  constructor(entityPath: string) {
    this.entityPath = entityPath;
    makeObservable(this, {
      indices: observable,
      entityPath: observable,
    });
  }
}

export class GrammarModeSearchState {
  editorStore: EditorStore;

  // search
  searchState = ActionState.create();
  searchText = '';
  resultsLength = 0;
  searchResults: SearchResult[] = [];

  constructor(editorStore: EditorStore) {
    makeObservable(this, {
      searchText: observable,
      searchResults: observable,
      resultsLength: observable,
      setSearchText: action,
      searchForText: action,
      setResultsLength: action,
      resetSearchText: action,
      deleteSearchResult: action,
      deleteSearchResultIndex: action,
    });

    this.editorStore = editorStore;
  }

  setSearchText(val: string): void {
    this.searchText = val;
  }

  setResultsLength(val: number): void {
    this.resultsLength = val;
  }

  deleteSearchResult(searchResult: SearchResult): void {
    deleteEntry(this.searchResults, searchResult);
  }

  deleteSearchResultIndex(
    searchResult: SearchResult,
    searchResultIndex: SearchResultSourceInformation,
  ): void {
    deleteEntry(searchResult.indices, searchResultIndex);
  }

  searchEachEntity(entityPath: string, text: string): void {
    const lines = text.split('\n');
    const searchResult = new SearchResult(entityPath);
    for (let i = 0; i < lines.length; i++) {
      const line = guaranteeNonNullable(lines[i]).toLowerCase();
      const lineNumber = i + 1;
      const searchStringLen = this.searchText.length;
      let lastMatchIndex = -searchStringLen;
      while (
        (lastMatchIndex = line.indexOf(
          this.searchText.toLowerCase(),
          lastMatchIndex + searchStringLen,
        )) !== -1 &&
        this.resultsLength < MAXIMUM_SEARCH_RESULTS
      ) {
        searchResult.indices.push(
          new SearchResultSourceInformation(
            lineNumber,
            lastMatchIndex + 1,
            line,
          ),
        );
        this.resultsLength++;
      }
      if (this.resultsLength >= MAXIMUM_SEARCH_RESULTS) {
        break;
      }
    }
    if (searchResult.indices.length) {
      this.searchResults.push(searchResult);
    }
  }

  resetSearchText(): void {
    this.searchText = '';
    this.searchResults = [];
    this.resultsLength = 0;
  }

  searchForText(): void {
    this.searchResults = [];
    this.searchState.inProgress();
    Array.from(
      this.editorStore.grammarModeManagerState.currentGrammarElements.entries(),
    ).map(([key, text]) => this.searchEachEntity(key, text));
    this.searchState.complete();
  }
}
