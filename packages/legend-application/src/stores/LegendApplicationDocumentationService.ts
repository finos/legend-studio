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
  markdownText?: MarkdownText | undefined;
  title?: string | undefined;
  text?: string | undefined;
  url?: string | undefined;

  static readonly serialization = new SerializationFactory(
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
}

export type LegendApplicationContextualDocumentationEntryConfig =
  LegendApplicationDocumentationEntryConfig & {
    relevantDocEntries: string[];
  };

export class LegendApplicationContextualDocumentationEntry {
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

export const collectKeyedContextualDocumentationEntriesFromConfig = (
  rawEntries: Record<
    string,
    LegendApplicationContextualDocumentationEntryConfig
  >,
): LegendApplicationKeyedContextualDocumentationEntry[] =>
  Object.entries(rawEntries).map((entry) => ({
    key: entry[0],
    content:
      LegendApplicationContextualDocumentationEntry.serialization.fromJson(
        entry[1],
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
    content: LegendApplicationDocumentationEntry.serialization.fromJson(
      entry[1],
    ),
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
