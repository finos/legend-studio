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
import type { GenericLegendApplicationStore } from './ApplicationStore.js';
import {
  type MarkdownText,
  guaranteeNonEmptyString,
  uuid,
  isNonNullable,
  ActionState,
  FuzzySearchEngine,
  FuzzySearchAdvancedConfigState,
  type DocumentationEntry,
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

    this.documentationKey = docEntry.key;
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

/**
 * NOTE: since we're displaying the documentation entry in virtual assistant
 * we want only user-friendly docs, we will discard anything that doesn't
 * come with a title, or does not have any content/url
 */
export const isValidVirtualAssistantDocumentationEntry = (
  entry: DocumentationEntry,
): boolean =>
  Boolean(entry.title && (entry.url ?? entry.text ?? entry.markdownText));

/**
 * Check if the documentation entry should be displayed in virtual assistant,
 * i.e. it has some text content, rather just a link
 */
export const shouldDisplayVirtualAssistantDocumentationEntry = (
  entry: DocumentationEntry,
): boolean =>
  isValidVirtualAssistantDocumentationEntry(entry) &&
  Boolean(entry.text ?? entry.markdownText);

export class AssistantService {
  readonly applicationStore: GenericLegendApplicationStore;
  /**
   * This key is used to allow programmatic re-rendering of the assistant panel
   */
  panelRenderingKey = uuid();
  isHidden = true; // hide by default unless specified by the application to show
  isOpen = false;
  isPanelMaximized = false;
  selectedTab: string = VIRTUAL_ASSISTANT_TAB.SEARCH;
  currentDocumentationEntry: VirtualAssistantDocumentationEntry | undefined;

  // search text
  private readonly searchEngine: FuzzySearchEngine<DocumentationEntry>;
  searchConfigurationState: FuzzySearchAdvancedConfigState;
  readonly searchState = ActionState.create();
  searchText = '';
  searchResults: VirtualAssistantDocumentationEntry[] = [];
  showSearchConfigurationMenu = false;
  isOverSearchLimit = false;

  constructor(applicationStore: GenericLegendApplicationStore) {
    makeObservable(this, {
      isHidden: observable,
      isOpen: observable,
      isPanelMaximized: observable,
      panelRenderingKey: observable,
      isOverSearchLimit: observable,
      selectedTab: observable,
      searchText: observable,
      searchResults: observable,
      currentDocumentationEntry: observable,
      showSearchConfigurationMenu: observable,
      currentContextualDocumentationEntry: computed,
      setIsHidden: action,
      setIsOpen: action,
      setIsPanelMaximized: action,
      setSelectedTab: action,
      setSearchText: action,
      resetSearch: action,
      search: action,
      openDocumentationEntry: action,
      refreshPanelRendering: action,
      setShowSearchConfigurationMenu: action,
    });

    this.applicationStore = applicationStore;
    this.searchEngine = new FuzzySearchEngine(
      this.applicationStore.documentationService
        .getAllDocEntries()
        .filter(isValidVirtualAssistantDocumentationEntry),
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
    this.searchConfigurationState = new FuzzySearchAdvancedConfigState(() => {
      this.search();
    });
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
            .filter(isValidVirtualAssistantDocumentationEntry)
            .map((entry) => new VirtualAssistantDocumentationEntry(entry)),
        )
      : undefined;
  }

  openDocumentationEntry(key: string): void {
    const entry = this.applicationStore.documentationService.getDocEntry(key);

    if (entry) {
      this.setIsOpen(true);
      this.setIsHidden(false);
      this.currentDocumentationEntry = new VirtualAssistantDocumentationEntry(
        entry,
      );
      this.currentDocumentationEntry.setIsOpen(true);
      this.resetSearch();
    }
  }

  openDocumentationEntryLink(key: string): void {
    const entry = this.applicationStore.documentationService.getDocEntry(key);
    if (entry) {
      if (shouldDisplayVirtualAssistantDocumentationEntry(entry)) {
        this.openDocumentationEntry(entry.key);
      } else if (entry.url) {
        this.applicationStore.navigationService.navigator.visitAddress(
          entry.url,
        );
      }
    }
  }

  setIsHidden(val: boolean): void {
    this.isHidden = val;
  }

  setIsPanelMaximized(val: boolean): void {
    this.isPanelMaximized = val;
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

  setSelectedTab(val: string): void {
    this.selectedTab = val;
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

  search(): void {
    if (!this.searchText) {
      this.searchResults = [];
      return;
    }
    this.currentDocumentationEntry = undefined;
    this.searchState.inProgress();
    this.searchResults = Array.from(
      this.searchEngine
        .search(
          this.searchConfigurationState.generateSearchText(this.searchText),
          {
            // NOTE: search for limit + 1 item so we can know if there are more search results
            limit: DOCUMENTATION_SEARCH_RESULTS_LIMIT + 1,
          },
        )
        .values(),
    ).map((result) => new VirtualAssistantDocumentationEntry(result.item));

    // check if the search results exceed the limit
    if (this.searchResults.length > DOCUMENTATION_SEARCH_RESULTS_LIMIT) {
      this.isOverSearchLimit = true;
      this.searchResults = this.searchResults.slice(
        0,
        DOCUMENTATION_SEARCH_RESULTS_LIMIT,
      );
    } else {
      this.isOverSearchLimit = false;
    }

    this.searchState.complete();
  }

  setShowSearchConfigurationMenu(val: boolean): void {
    this.showSearchConfigurationMenu = val;
  }
}
