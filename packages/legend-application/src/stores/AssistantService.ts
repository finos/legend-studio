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

import { action, makeObservable, observable, computed } from 'mobx';
import type { DocumentationEntry } from './DocumentationService.js';
import type { GenericLegendApplicationStore } from './ApplicationStore.js';
import { Fuse } from './CJS__Fuse.cjs';
import {
  type MarkdownText,
  guaranteeNonEmptyString,
  uuid,
  isNonNullable,
  ActionState,
} from '@finos/legend-shared';

export enum VIRTUAL_ASSISTANT_TAB {
  SEARCH = 'SEARCH',
  CONTEXTUAL_SUPPORT = 'CONTEXTUAL_SUPPORT',
}

export const DOCUMENTATION_SEARCH_RESULTS_LIMIT = 100;

export class VirtualAssistantDocumentationEntry {
  uuid = uuid();
  documentationKey: string;
  title: string;
  content?: string | MarkdownText | undefined;
  url?: string | undefined;
  isOpen = false;

  constructor(docEntry: DocumentationEntry) {
    makeObservable(this, {
      isOpen: observable,
      setIsOpen: action,
    });

    this.documentationKey = docEntry._documentationKey;
    this.title = guaranteeNonEmptyString(docEntry.title);
    this.content = docEntry.markdownText ?? docEntry.text;
    this.url = docEntry.url;
  }

  setIsOpen(val: boolean): void {
    this.isOpen = val;
  }
}

export class VirtualAssistantContextualDocumentationEntry {
  uuid = uuid();
  context: string;
  title?: string | undefined;
  content?: string | MarkdownText | undefined;
  url?: string | undefined;
  related: VirtualAssistantDocumentationEntry[];

  constructor(
    context: string,
    docEntry: DocumentationEntry,
    related: VirtualAssistantDocumentationEntry[],
  ) {
    this.context = context;
    this.title = docEntry.title;
    this.content = docEntry.markdownText ?? docEntry.text;
    this.url = docEntry.url;
    this.related = related;
  }
}

export enum SEARCH_MODE {
  NORMAL = 'normal',
  INCLUDE = 'include match',
  EXACT = 'exact match',
  INVERSE = 'excludes exact match',
}
export class AssistantService {
  readonly applicationStore: GenericLegendApplicationStore;
  private readonly searchEngine: Fuse<DocumentationEntry>;
  /**
   * This key is used to allow programmatic re-rendering of the assistant panel
   */
  panelRenderingKey = uuid();
  isHidden = false;
  isOpen = false;
  selectedTab = VIRTUAL_ASSISTANT_TAB.SEARCH;

  isSearchPanelTipsOpen = false;

  searchResults: VirtualAssistantDocumentationEntry[] = [];
  searchState = ActionState.create().pass();
  searchText = '';

  isOverSearchLimit: boolean;

  modeOfSearch: SEARCH_MODE;
  modeOfSearchOptions: SEARCH_MODE[];

  constructor(applicationStore: GenericLegendApplicationStore) {
    makeObservable(this, {
      isHidden: observable,
      isOpen: observable,
      panelRenderingKey: observable,
      isSearchPanelTipsOpen: observable,
      modeOfSearch: observable,
      isOverSearchLimit: observable,
      selectedTab: observable,
      searchText: observable,
      searchResults: observable,
      currentContextualDocumentationEntry: computed,
      setIsHidden: action,
      setIsOpen: action,
      setSelectedTab: action,
      setIsSearchPanelTipsOpen: action,
      setSearchText: action,
      resetSearch: action,
      search: action,
      refreshPanelRendering: action,
      changeModeOfSearch: action,
      setIsOverSearchLimit: action,
    });

    this.applicationStore = applicationStore;

    this.modeOfSearch = SEARCH_MODE.NORMAL;
    this.isOverSearchLimit = false;
    this.isSearchPanelTipsOpen = false;

    this.modeOfSearchOptions = [
      SEARCH_MODE.NORMAL,
      SEARCH_MODE.INCLUDE,
      SEARCH_MODE.EXACT,
      SEARCH_MODE.INVERSE,
    ];

    this.searchEngine = new Fuse(
      this.applicationStore.documentationService.getAllDocEntries().filter(
        (entry) =>
          // NOTE: since we're searching for user-friendly docs, we will discard anything that
          // doesn't come with a title, or does not have any content/url
          entry.title && (entry.url ?? entry.text ?? entry.markdownText),
      ),
      {
        includeScore: true,
        shouldSort: true,
        // Ignore location when computing the search score
        // See https://fusejs.io/concepts/scoring-theory.html
        ignoreLocation: true,
        // This specifies the point the search gives up
        // `0.0` means exact match where `1.0` would match anything
        // We set a relatively low threshold to filter out irrelevant results
        threshold: 0.2,
        keys: [
          {
            // NOTE: for now, we would weight title the most
            name: 'title',
            weight: 4,
          },
          {
            name: 'text',
            weight: 1,
          },
          {
            name: 'markdownText.value',
            weight: 1,
          },
        ],
        // extended search allows for exact word match through single quote
        // See https://fusejs.io/examples.html#extended-search
        useExtendedSearch: true,
      },
    );
  }

  get currentContextualDocumentationEntry():
    | VirtualAssistantContextualDocumentationEntry
    | undefined {
    if (!this.applicationStore.navigationContextService.currentContext) {
      return undefined;
    }
    const currentContext =
      this.applicationStore.navigationContextService.currentContext.key;
    const currentContextualDocumentationEntry =
      this.applicationStore.documentationService.getContextualDocEntry(
        currentContext,
      );
    return currentContextualDocumentationEntry
      ? new VirtualAssistantContextualDocumentationEntry(
          currentContext,
          currentContextualDocumentationEntry,
          (currentContextualDocumentationEntry.related ?? [])
            .map((entry) =>
              this.applicationStore.documentationService.getDocEntry(entry),
            )
            .filter(isNonNullable)
            .filter(
              (entry) =>
                // NOTE: since we're searching for user-friendly docs, we will discard anything that
                // doesn't come with a title, or does not have any content/url
                //
                // We could also consider having a flag in each documentation entry to be hidden from users
                entry.title && (entry.url ?? entry.text ?? entry.markdownText),
            )
            .map((entry) => new VirtualAssistantDocumentationEntry(entry)),
        )
      : undefined;
  }

  setIsHidden(val: boolean): void {
    this.isHidden = val;
  }

  setIsOverSearchLimit(val: boolean): void {
    this.isOverSearchLimit = val;
  }

  hideAssistant(): void {
    this.setIsHidden(true);
    this.setIsOpen(false);
  }

  toggleAssistant(): void {
    const newVal = !this.isHidden;
    if (newVal) {
      this.hideAssistant();
    } else {
      this.setIsHidden(false);
    }
  }

  setIsOpen(val: boolean): void {
    this.isOpen = val;
  }

  setSelectedTab(val: VIRTUAL_ASSISTANT_TAB): void {
    this.selectedTab = val;
  }

  setIsSearchPanelTipsOpen(val: boolean): void {
    this.isSearchPanelTipsOpen = val;
  }

  changeModeOfSearch(val: SEARCH_MODE): void {
    this.modeOfSearch = val;
    this.search();
  }

  refreshPanelRendering(): void {
    this.panelRenderingKey = uuid();
  }

  setSearchText(val: string): void {
    this.searchText = val;
  }

  resetSearch(): void {
    this.searchText = '';
    this.searchResults = [];
    this.searchState.complete();
  }

  getSearchText(val: string): string {
    switch (this.modeOfSearch) {
      case SEARCH_MODE.INCLUDE: {
        return `'${val}`;
      }
      case SEARCH_MODE.EXACT: {
        return `="${val}"`;
      }
      case SEARCH_MODE.INVERSE: {
        return `!${val}`;
      }
      default: {
        return val;
      }
    }
  }

  search(): void {
    this.searchState.inProgress();
    this.searchResults = Array.from(
      this.searchEngine
        .search(this.getSearchText(this.searchText), {
          limit: DOCUMENTATION_SEARCH_RESULTS_LIMIT + 1,
        })
        .values(),
    ).map((result) => new VirtualAssistantDocumentationEntry(result.item));

    if (this.searchResults.length > DOCUMENTATION_SEARCH_RESULTS_LIMIT) {
      this.setIsOverSearchLimit(true);
      this.searchResults = this.searchResults.slice(
        0,
        DOCUMENTATION_SEARCH_RESULTS_LIMIT,
      );
    } else {
      this.setIsOverSearchLimit(false);
    }

    this.searchState.complete();
  }
}
