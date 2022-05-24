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
  type MarkdownText,
  type PlainObject,
  deserializeMarkdownText,
  SerializationFactory,
  uuid,
} from '@finos/legend-shared';
import { action, computed, makeObservable, observable } from 'mobx';
import {
  createModelSchema,
  custom,
  list,
  optional,
  primitive,
  SKIP,
} from 'serializr';
import type { LegendApplicationDocumentationService } from './LegendApplicationDocumentationService';

export class LegendApplicationContextualDocumentationEntry {
  readonly uuid = uuid();
  markdownText?: MarkdownText | undefined;
  title?: string | undefined;
  text?: string | undefined;
  url?: string | undefined;
  relevantDocEntries: string[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(LegendApplicationContextualDocumentationEntry, {
      markdownText: custom(
        () => SKIP,
        (val) => deserializeMarkdownText(val),
      ),
      title: optional(primitive()),
      text: optional(primitive()),
      url: optional(primitive()),
      relevantDocEntries: list(primitive()),
    }),
  );
}

export interface LegendApplicationKeyedContextualDocumentationEntry {
  key: string;
  content: LegendApplicationContextualDocumentationEntry;
}

export const collectKeyedKnowledgeBaseEntriesFromConfig = (
  rawEntries: Record<
    string,
    PlainObject<LegendApplicationKeyedContextualDocumentationEntry>
  >,
): LegendApplicationKeyedContextualDocumentationEntry[] =>
  Object.entries(rawEntries).map((entry) => ({
    key: entry[0],
    content:
      LegendApplicationContextualDocumentationEntry.serialization.fromJson(
        entry[1],
      ),
  }));

export class LegendApplicationVirtualAssistant {
  private readonly knowledgeBase = new Map<
    string,
    LegendApplicationContextualDocumentationEntry
  >();
  private latestEvent?: string | undefined;
  private readonly docRegistry: LegendApplicationDocumentationService;
  isHidden = false;
  // isOpen
  // selectedTab
  // searchText = '';

  constructor(docRegistry: LegendApplicationDocumentationService) {
    makeObservable<
      LegendApplicationVirtualAssistant,
      'knowledgeBase' | 'latestEvent'
    >(this, {
      knowledgeBase: observable,
      latestEvent: observable,
      isHidden: observable,
      registerKnowledgeBaseEntry: action,
      postEvent: action,
      hide: action,
      relevantKnowledgeEntry: computed,
    });

    this.docRegistry = docRegistry;
  }

  registerKnowledgeBaseEntry(
    eventKey: string,
    entry: LegendApplicationContextualDocumentationEntry,
  ): void {
    this.knowledgeBase.set(eventKey, entry);
  }

  postEvent(eventKey: string | undefined): void {
    this.latestEvent = eventKey;
  }

  hide(val: boolean): void {
    this.isHidden = val;
  }

  get relevantKnowledgeEntry():
    | LegendApplicationContextualDocumentationEntry
    | undefined {
    return undefined;
  }
}
