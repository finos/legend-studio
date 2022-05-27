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
  type Writable,
  deserializeMarkdownText,
  SerializationFactory,
} from '@finos/legend-shared';
import {
  createModelSchema,
  custom,
  list,
  optional,
  primitive,
  SKIP,
} from 'serializr';

export type LegendApplicationDocumentationEntryConfig = {
  markdownText?: MarkdownText | undefined;
  title?: string | undefined;
  text?: string | undefined;
  url?: string | undefined;
};

export class LegendApplicationDocumentationEntry {
  readonly _documentationKey!: string;

  markdownText?: MarkdownText | undefined;
  title?: string | undefined;
  text?: string | undefined;
  url?: string | undefined;

  private static readonly serialization = new SerializationFactory(
    createModelSchema(LegendApplicationDocumentationEntry, {
      markdownText: custom(
        () => SKIP,
        (val) => deserializeMarkdownText(val),
      ),
      title: optional(primitive()),
      text: optional(primitive()),
      url: optional(primitive()),
    }),
  );

  static create(
    json: PlainObject<LegendApplicationDocumentationEntry>,
    documentationKey: string,
  ): LegendApplicationDocumentationEntry {
    const entry =
      LegendApplicationDocumentationEntry.serialization.fromJson(json);
    (entry as Writable<LegendApplicationDocumentationEntry>)._documentationKey =
      documentationKey;
    return entry;
  }
}

export type LegendApplicationContextualDocumentationEntryConfig =
  LegendApplicationDocumentationEntryConfig & {
    relevantDocEntries: string[];
  };

export class LegendApplicationContextualDocumentationEntry {
  readonly _context!: string;

  markdownText?: MarkdownText | undefined;
  title?: string | undefined;
  text?: string | undefined;
  url?: string | undefined;
  relevantDocEntries: string[] = [];

  private static readonly serialization = new SerializationFactory(
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

  static create(
    json: PlainObject<LegendApplicationContextualDocumentationEntry>,
    context: string,
  ): LegendApplicationContextualDocumentationEntry {
    const entry =
      LegendApplicationContextualDocumentationEntry.serialization.fromJson(
        json,
      );
    (
      entry as Writable<LegendApplicationContextualDocumentationEntry>
    )._context = context;
    return entry;
  }
}

export interface LegendApplicationKeyedContextualDocumentationEntry {
  key: string;
  content: LegendApplicationContextualDocumentationEntry;
}

export const collectKeyedContextualDocumentationEntriesFromConfig = (
  rawEntries: Record<
    string,
    LegendApplicationContextualDocumentationEntryConfig
  >,
): LegendApplicationKeyedContextualDocumentationEntry[] =>
  Object.entries(rawEntries).map((entry) => ({
    key: entry[0],
    content: LegendApplicationContextualDocumentationEntry.create(
      entry[1],
      entry[0],
    ),
  }));

export interface LegendApplicationKeyedDocumentationEntry {
  key: string;
  content: LegendApplicationDocumentationEntry;
}

export const collectKeyedDocumnetationEntriesFromConfig = (
  rawEntries: Record<string, LegendApplicationDocumentationEntryConfig>,
): LegendApplicationKeyedDocumentationEntry[] =>
  Object.entries(rawEntries).map((entry) => ({
    key: entry[0],
    content: LegendApplicationDocumentationEntry.create(entry[1], entry[0]),
  }));

export class LegendApplicationDocumentationService {
  url?: string | undefined;

  private docRegistry = new Map<string, LegendApplicationDocumentationEntry>();
  private contextualDocRegistry = new Map<
    string,
    LegendApplicationContextualDocumentationEntry
  >();

  addDocEntry(key: string, value: LegendApplicationDocumentationEntry): void {
    this.docRegistry.set(key, value);
  }

  getDocEntry(key: string): LegendApplicationDocumentationEntry | undefined {
    return this.docRegistry.get(key);
  }

  hasDocEntry(key: string): boolean {
    return this.docRegistry.has(key);
  }

  getAllDocEntries(): LegendApplicationDocumentationEntry[] {
    return Array.from(this.docRegistry.values());
  }

  addContextualDocEntry(
    key: string,
    value: LegendApplicationContextualDocumentationEntry,
  ): void {
    this.contextualDocRegistry.set(key, value);
  }

  getContextualDocEntry(
    key: string,
  ): LegendApplicationContextualDocumentationEntry | undefined {
    return this.contextualDocRegistry.get(key);
  }

  hasContextualDocEntry(key: string): boolean {
    return this.contextualDocRegistry.has(key);
  }
}
