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

import { action, computed, makeObservable, observable } from 'mobx';
import type {
  LegendApplicationContextualDocumentationEntry,
  LegendApplicationDocumentationService,
} from './LegendApplicationDocumentationService';
import type { LegendApplicationEventService } from './LegendApplicationEventService';

export class LegendApplicationVirtualAssistant {
  readonly documentationService: LegendApplicationDocumentationService;
  readonly eventService: LegendApplicationEventService;
  isHidden = false;
  // isOpen
  // selectedTab
  // searchText = '';

  constructor(
    documentationService: LegendApplicationDocumentationService,
    eventManagerService: LegendApplicationEventService,
  ) {
    makeObservable(this, {
      isHidden: observable,
      hide: action,
      currentContextualDocumentationEntry: computed,
    });

    this.documentationService = documentationService;
    this.eventService = eventManagerService;
  }

  hide(val: boolean): void {
    this.isHidden = val;
  }

  get currentContextualDocumentationEntry():
    | LegendApplicationContextualDocumentationEntry
    | undefined {
    if (this.eventService.latestEvent) {
      return this.documentationService.getContextualDocEntry(
        this.eventService.latestEvent,
      );
    }
    return undefined;
  }
}
