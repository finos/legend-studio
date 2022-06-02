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
import type {
  LegendApplicationContextualDocumentationEntry,
  LegendApplicationDocumentationEntry,
} from './LegendApplicationDocumentationService.js';
import type { LegendApplicationConfig } from './LegendApplicationConfig.js';
import type { ApplicationStore } from './ApplicationStore.js';
import Fuse from 'fuse.js';
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

export class VirtualAssistantDocumentationEntry {
  uuid = uuid();
  documentationKey: string;
  title: string;
  content?: string | MarkdownText | undefined;
  url?: string | undefined;
  isOpen = false;

  constructor(docEntry: LegendApplicationDocumentationEntry) {
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
    contextualDocEntry: LegendApplicationContextualDocumentationEntry,
    related: VirtualAssistantDocumentationEntry[],
  ) {
    this.context = contextualDocEntry._context;
    this.title = contextualDocEntry.title;
    this.content = contextualDocEntry.markdownText ?? contextualDocEntry.text;
    this.url = contextualDocEntry.url;
    this.related = related;
  }
}

export class LegendApplicationAssistantService {
  readonly applicationStore: ApplicationStore<LegendApplicationConfig>;
  private readonly searchEngine: Fuse<LegendApplicationDocumentationEntry>;
  isHidden = false;
  isOpen = false;
  selectedTab = VIRTUAL_ASSISTANT_TAB.SEARCH;

  searchResults: VirtualAssistantDocumentationEntry[] = [];
  searchState = ActionState.create().pass();
  searchText = '';

  constructor(applicationStore: ApplicationStore<LegendApplicationConfig>) {
    makeObservable(this, {
      isHidden: observable,
      isOpen: observable,
      selectedTab: observable,
      searchText: observable,
      searchResults: observable,
      currentContextualDocumentationEntry: computed,
      setIsHidden: action,
      setIsOpen: action,
      setSelectedTab: action,
      setSearchText: action,
      resetSearch: action,
      search: action,
    });

    this.applicationStore = applicationStore;
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
      },
    );
  }

  get currentContextualDocumentationEntry():
    | VirtualAssistantContextualDocumentationEntry
    | undefined {
    const currentContextualDocumentationEntry = this.applicationStore
      .navigationContextService.currentContext
      ? this.applicationStore.documentationService.getContextualDocEntry(
          this.applicationStore.navigationContextService.currentContext.value,
        )
      : undefined;
    return currentContextualDocumentationEntry
      ? new VirtualAssistantContextualDocumentationEntry(
          currentContextualDocumentationEntry,
          currentContextualDocumentationEntry.related
            .map((entry) =>
              this.applicationStore.documentationService.getDocEntry(entry),
            )
            .filter(isNonNullable)
            .filter(
              (entry) =>
                // NOTE: since we're searching for user-friendly docs, we will discard anything that
                // doesn't come with a title, or does not have any content/url
                entry.title && (entry.url ?? entry.text ?? entry.markdownText),
            )
            .map((entry) => new VirtualAssistantDocumentationEntry(entry)),
        )
      : undefined;
  }

  setIsHidden(val: boolean): void {
    this.isHidden = val;
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

  setSearchText(val: string): void {
    this.searchText = val;
  }

  resetSearch(): void {
    this.searchText = '';
    this.searchResults = [];
    this.searchState.complete();
  }

  search(): void {
    this.searchState.inProgress();
    this.searchResults = Array.from(
      this.searchEngine.search(this.searchText).values(),
    ).map((result) => new VirtualAssistantDocumentationEntry(result.item));
    this.searchState.complete();
  }
}
