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
import type { LegendApplicationContextualDocumentationEntry } from './LegendApplicationDocumentationService';
import type { LegendApplicationConfig } from './LegendApplicationConfig';
import type { ApplicationStore } from './ApplicationStore';

export class LegendApplicationAssistantService {
  readonly applicationStore: ApplicationStore<LegendApplicationConfig>;
  private contextualDocReaction?: IReactionDisposer | undefined;
  currentContextualDocumentationEntry:
    | LegendApplicationContextualDocumentationEntry
    | undefined;
  isHidden = false;
  isOpen = false;
  // selectedTab
  // searchText = '';

  constructor(applicationStore: ApplicationStore<LegendApplicationConfig>) {
    makeObservable(this, {
      isHidden: observable,
      isOpen: observable,
      setIsHidden: action,
      setIsOpen: action,
      currentContextualDocumentationEntry: observable,
    });

    this.applicationStore = applicationStore;
  }

  start(): void {
    this.contextualDocReaction?.();

    this.contextualDocReaction = reaction(
      () => this.applicationStore.navigationContextService.currentContext,
      () => {
        this.currentContextualDocumentationEntry = this.applicationStore
          .navigationContextService.currentContext
          ? this.applicationStore.documentationService.getContextualDocEntry(
              this.applicationStore.navigationContextService.currentContext
                .value,
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
  }

  stop(): void {
    this.contextualDocReaction?.();
    this.currentContextualDocumentationEntry = undefined;
  }

  setIsHidden(val: boolean): void {
    this.isHidden = val;
  }

  setIsOpen(val: boolean): void {
    this.isOpen = val;
  }
}
