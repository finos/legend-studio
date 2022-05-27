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
  type IReactionDisposer,
  action,
  makeObservable,
  observable,
  reaction,
} from 'mobx';
import type {
  LegendApplicationContextualDocumentationEntry,
  LegendApplicationDocumentationEntry,
} from './LegendApplicationDocumentationService';
import type { LegendApplicationConfig } from './LegendApplicationConfig';
import type { ApplicationStore } from './ApplicationStore';
import Fuse from 'fuse.js';
import {
  type MarkdownText,
  guaranteeNonEmptyString,
  uuid,
  isNonNullable,
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
  relevantDocEntries: VirtualAssistantDocumentationEntry[];

  constructor(
    contextualDocEntry: LegendApplicationContextualDocumentationEntry,
    relevantDocEntries: VirtualAssistantDocumentationEntry[],
  ) {
    this.context = contextualDocEntry._context;
    this.title = contextualDocEntry.title;
    this.content = contextualDocEntry.markdownText ?? contextualDocEntry.text;
    this.url = contextualDocEntry.url;
    this.relevantDocEntries = relevantDocEntries;
  }
}

export class LegendApplicationAssistantService {
  readonly applicationStore: ApplicationStore<LegendApplicationConfig>;
  private readonly searchEngine: Fuse<LegendApplicationDocumentationEntry>;
  private contextualDocReaction?: IReactionDisposer | undefined;
  private docSearchReaction?: IReactionDisposer | undefined;
  currentContextualDocumentationEntry:
    | VirtualAssistantContextualDocumentationEntry
    | undefined;
  isHidden = false;
  isOpen = false;
  selectedTab = VIRTUAL_ASSISTANT_TAB.SEARCH;
  searchResults: VirtualAssistantDocumentationEntry[] = [];
  searchText = '';

  constructor(applicationStore: ApplicationStore<LegendApplicationConfig>) {
    makeObservable(this, {
      isHidden: observable,
      isOpen: observable,
      selectedTab: observable,
      searchText: observable,
      currentContextualDocumentationEntry: observable,
      searchResults: observable,
      setIsHidden: action,
      setIsOpen: action,
      setSelectedTab: action,
      setSearchText: action,
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

  start(): void {
    this.contextualDocReaction?.();
    this.docSearchReaction?.();

    // NOTE: since sometimes, we modify the context stack in clean up methods of `useEffect`, we could
    // end up with having React complaining about bad state, as such, we de-couple that by using
    // `reaction`. Also, it gains a slight performance benefit as we now throttle the rate of refresh
    // in assistant service when context changes
    this.contextualDocReaction = reaction(
      () => this.applicationStore.navigationContextService.currentContext,
      () => {
        const currentContextualDocumentationEntry = this.applicationStore
          .navigationContextService.currentContext
          ? this.applicationStore.documentationService.getContextualDocEntry(
              this.applicationStore.navigationContextService.currentContext
                .value,
            )
          : undefined;
        this.currentContextualDocumentationEntry =
          currentContextualDocumentationEntry
            ? new VirtualAssistantContextualDocumentationEntry(
                currentContextualDocumentationEntry,
                currentContextualDocumentationEntry.relevantDocEntries
                  .map((entry) =>
                    this.applicationStore.documentationService.getDocEntry(
                      entry,
                    ),
                  )
                  .filter(isNonNullable)
                  .filter(
                    (entry) =>
                      // NOTE: since we're searching for user-friendly docs, we will discard anything that
                      // doesn't come with a title, or does not have any content/url
                      entry.title &&
                      (entry.url ?? entry.text ?? entry.markdownText),
                  )
                  .map(
                    (entry) => new VirtualAssistantDocumentationEntry(entry),
                  ),
              )
            : undefined;
      },
      {
        fireImmediately: true,
        /**
         * It seems like the reaction action is not always called in tests, causing fluctuation in
         * code coverage report for this file. As such, for test, we would want to disable throttling
         * to avoid timing issue.
         *
         * See https://docs.codecov.io/docs/unexpected-coverage-changes
         * See https://community.codecov.io/t/codecov-reporting-impacted-files-for-unchanged-and-completely-unrelated-file/2635
         */
        // eslint-disable-next-line no-process-env
        delay: process.env.NODE_ENV === 'test' ? 0 : 100,
      },
    );

    // NOTE: we have this as a reaction and throttle because the doc registry can get huge
    // so we need to optimize this a bit
    // also, if we make this a `computed` and having the component uses it, when the component is
    // unmounted, the computation will be done again, leading to losing doc entry states
    this.docSearchReaction = reaction(
      () => this.searchText,
      () => {
        this.searchResults = Array.from(
          this.searchEngine.search(this.searchText).values(),
        ).map((result) => new VirtualAssistantDocumentationEntry(result.item));
      },
      {
        fireImmediately: true,
        /**
         * It seems like the reaction action is not always called in tests, causing fluctuation in
         * code coverage report for this file. As such, for test, we would want to disable throttling
         * to avoid timing issue.
         *
         * See https://docs.codecov.io/docs/unexpected-coverage-changes
         * See https://community.codecov.io/t/codecov-reporting-impacted-files-for-unchanged-and-completely-unrelated-file/2635
         */
        // eslint-disable-next-line no-process-env
        delay: process.env.NODE_ENV === 'test' ? 0 : 100,
      },
    );
  }

  stop(): void {
    this.contextualDocReaction?.();
    this.docSearchReaction?.();
    this.currentContextualDocumentationEntry = undefined;
    this.searchResults = [];
    this.searchText = '';
  }

  setIsHidden(val: boolean): void {
    this.isHidden = val;
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
}
