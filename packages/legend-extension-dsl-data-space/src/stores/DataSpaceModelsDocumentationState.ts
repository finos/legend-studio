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

import { action, makeObservable, observable } from 'mobx';
import type { DataSpaceViewerState } from './DataSpaceViewerState.js';
import { TextSearchAdvancedConfigState } from '@finos/legend-application';
import { FuzzySearchEngine } from '@finos/legend-art';
import { ActionState } from '@finos/legend-shared';
import type { NormalizedDataSpaceDocumentationEntry } from '../graphManager/action/analytics/DataSpaceAnalysis.js';

export class DataSpaceViewerModelsDocumentationState {
  readonly dataSpaceViewerState: DataSpaceViewerState;

  showHumanizedForm = true;

  // search text
  private readonly searchEngine: FuzzySearchEngine<NormalizedDataSpaceDocumentationEntry>;
  searchConfigurationState: TextSearchAdvancedConfigState;
  readonly searchState = ActionState.create();
  searchText: string;
  searchResults: NormalizedDataSpaceDocumentationEntry[] = [];
  showSearchConfigurationMenu = false;

  constructor(dataSpaceViewerState: DataSpaceViewerState) {
    makeObservable(this, {
      showHumanizedForm: observable,
      searchText: observable,
      // NOTE: we use `observable.struct` here to avoid unnecessary re-rendering
      searchResults: observable.struct,
      showSearchConfigurationMenu: observable,
      setShowHumanizedForm: action,
      setSearchText: action,
      resetSearch: action,
      search: action,
      setShowSearchConfigurationMenu: action,
    });

    this.dataSpaceViewerState = dataSpaceViewerState;
    this.searchEngine = new FuzzySearchEngine(
      this.dataSpaceViewerState.dataSpaceAnalysisResult.elementDocs,
      {
        includeScore: true,
        // shouldSort: true,
        // Ignore location when computing the search score
        // See https://fusejs.io/concepts/scoring-theory.html
        ignoreLocation: true,
        // This specifies the point the search gives up
        // `0.0` means exact match where `1.0` would match anything
        // We set a relatively low threshold to filter out irrelevant results
        threshold: 0.2,
        keys: [
          {
            name: 'text',
            weight: 3,
          },
          {
            name: 'entry.name',
            weight: 2,
          },
          {
            name: 'documentation',
            weight: 1,
          },
        ],
        // extended search allows for exact word match through single quote
        // See https://fusejs.io/examples.html#extended-search
        useExtendedSearch: true,
      },
    );
    this.searchConfigurationState = new TextSearchAdvancedConfigState(
      (): void => this.search(),
    );
    this.searchText = '';
    this.searchResults =
      this.dataSpaceViewerState.dataSpaceAnalysisResult.elementDocs;
  }

  setShowHumanizedForm(val: boolean): void {
    this.showHumanizedForm = val;
  }

  setSearchText(val: string): void {
    this.searchText = val;
  }

  resetSearch(): void {
    this.searchText = '';
    this.searchResults =
      this.dataSpaceViewerState.dataSpaceAnalysisResult.elementDocs;
    this.searchState.complete();
  }

  search(): void {
    if (!this.searchText) {
      this.searchResults =
        this.dataSpaceViewerState.dataSpaceAnalysisResult.elementDocs;
      return;
    }
    this.searchState.inProgress();
    this.searchResults = Array.from(
      this.searchEngine
        .search(
          this.searchConfigurationState.generateSearchText(this.searchText),
        )
        .values(),
    ).map((result) => result.item);

    this.searchState.complete();
  }

  setShowSearchConfigurationMenu(val: boolean): void {
    this.showSearchConfigurationMenu = val;
  }
}
