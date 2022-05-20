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
import type { LegendApplicationDocumentationRegistry } from './LegendApplicationDocumentationRegistry';

export class LegendApplicationVirtualAssistantKnowledgeEntry {
  readonly uuid = uuid();
  markdownText?: MarkdownText | undefined;
  title?: string | undefined;
  text?: string | undefined;
  url?: string | undefined;
  relevantDocEntries: string[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(LegendApplicationVirtualAssistantKnowledgeEntry, {
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

export interface LegendApplicationKeyedVirtualAssistantKnowledgeEntry {
  key: string;
  content: LegendApplicationVirtualAssistantKnowledgeEntry;
}

export const collectKeyedVirtualAssistantKnowledgeEntriesFromConfig = (
  rawEntries: Record<
    string,
    PlainObject<LegendApplicationKeyedVirtualAssistantKnowledgeEntry>
  >,
): LegendApplicationKeyedVirtualAssistantKnowledgeEntry[] =>
  Object.entries(rawEntries).map((entry) => ({
    key: entry[0],
    content:
      LegendApplicationVirtualAssistantKnowledgeEntry.serialization.fromJson(
        entry[1],
      ),
  }));

export class LegendApplicationVirtualAssistant {
  private readonly knowledgeBase = new Map<
    string,
    LegendApplicationVirtualAssistantKnowledgeEntry
  >();
  private latestEvent?: string | undefined;
  private readonly docRegistry: LegendApplicationDocumentationRegistry;
  isHidden = false;
  // isOpen
  // selectedTab
  // searchText = '';

  constructor(docRegistry: LegendApplicationDocumentationRegistry) {
    makeObservable<
      LegendApplicationVirtualAssistant,
      'knowledgeBase' | 'latestEvent'
    >(this, {
      knowledgeBase: observable,
      latestEvent: observable,
      isHidden: observable,
      registerKnowledgeEntry: action,
      postEvent: action,
      hide: action,
      relevantKnowledgeEntry: computed,
    });

    this.docRegistry = docRegistry;
  }

  registerKnowledgeEntry(
    eventKey: string,
    entry: LegendApplicationVirtualAssistantKnowledgeEntry,
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
    | LegendApplicationVirtualAssistantKnowledgeEntry
    | undefined {
    return undefined;
  }
}
