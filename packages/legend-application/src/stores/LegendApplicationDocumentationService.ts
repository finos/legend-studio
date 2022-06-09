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
  SerializationFactory,
  LogEvent,
  uniq,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import {
  createModelSchema,
  custom,
  list,
  optional,
  primitive,
} from 'serializr';
import { APPLICATION_EVENT } from './ApplicationEvent.js';
import type { ApplicationStore } from './ApplicationStore.js';
import type { LegendApplicationConfig } from './LegendApplicationConfig.js';

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

  static readonly serialization = new SerializationFactory(
    createModelSchema(LegendApplicationDocumentationEntry, {
      markdownText: custom(
        (val) => val,
        (val) => (val.value ? val : undefined),
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
    related?: string[];
  };

export class LegendApplicationContextualDocumentationEntry {
  readonly _context!: string;

  markdownText?: MarkdownText | undefined;
  title?: string | undefined;
  text?: string | undefined;
  url?: string | undefined;
  related: string[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(LegendApplicationContextualDocumentationEntry, {
      markdownText: custom(
        (val) => val,
        (val) => (val.value ? val : undefined),
      ),
      title: optional(primitive()),
      text: optional(primitive()),
      url: optional(primitive()),
      related: list(primitive()),
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

  constructor(applicationStore: ApplicationStore<LegendApplicationConfig>) {
    applicationStore.pluginManager
      .getApplicationPlugins()
      .flatMap((plugin) => plugin.getExtraKeyedDocumentationEntries?.() ?? [])
      .forEach((entry) => {
        // Entries specified natively will not override each other. This is to prevent entries from extensions
        // overriding entries from core.
        if (this.hasDocEntry(entry.key)) {
          applicationStore.log.warn(
            LogEvent.create(
              APPLICATION_EVENT.APPLICATION_DOCUMTENTION_LOAD_SKIPPED,
            ),
            entry.key,
          );
        } else {
          this.docRegistry.set(entry.key, entry.content);
        }
      });
    // entries from config will override entries specified natively
    applicationStore.config.keyedDocumentationEntries.forEach((entry) =>
      this.docRegistry.set(entry.key, entry.content),
    );

    // Contextual Documentation
    applicationStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          plugin.getExtraKeyedContextualDocumentationEntries?.() ?? [],
      )
      .forEach((entry) => {
        // Entries specified natively will not override each other. This is to prevent entries from extensions
        // overriding entries from core. However, we will merge the list of related doc entries. This allows
        // extensions to broaden related doc entries for certain contexts
        if (this.hasContextualDocEntry(entry.key)) {
          applicationStore.log.warn(
            LogEvent.create(
              APPLICATION_EVENT.APPLICATION_CONTEXTUAL_DOCUMTENTION_LOAD_SKIPPED,
            ),
            entry.key,
          );
          const existingEntry = guaranteeNonNullable(
            this.getContextualDocEntry(entry.key),
          );
          existingEntry.related = uniq([
            ...existingEntry.related,
            ...entry.content.related,
          ]);
        } else {
          this.contextualDocRegistry.set(entry.key, entry.content);
        }
      });
    // entries from config will override entries specified natively
    // however, we will keep merging related doc entries list
    applicationStore.config.keyedContextualDocumentationEntries.forEach(
      (entry) => {
        const existingEntry = this.getContextualDocEntry(entry.key);
        if (existingEntry) {
          entry.content.related = uniq([
            ...existingEntry.related,
            ...entry.content.related,
          ]);
        }
        this.contextualDocRegistry.set(entry.key, entry.content);
      },
    );
    this.url = applicationStore.config.documentationUrl;
  }

  getDocEntry(key: string): LegendApplicationDocumentationEntry | undefined {
    return this.docRegistry.get(key);
  }

  hasDocEntry(key: string): boolean {
    return this.docRegistry.has(key);
  }

  getContextualDocEntry(
    key: string,
  ): LegendApplicationContextualDocumentationEntry | undefined {
    return this.contextualDocRegistry.get(key);
  }

  hasContextualDocEntry(key: string): boolean {
    return this.contextualDocRegistry.has(key);
  }

  getAllDocEntries(): LegendApplicationDocumentationEntry[] {
    return Array.from(this.docRegistry.values());
  }

  publishDocRegistry(): Record<
    string,
    LegendApplicationDocumentationEntryConfig
  > {
    const result: Record<string, LegendApplicationDocumentationEntryConfig> =
      {};
    this.docRegistry.forEach((value, key) => {
      result[key] =
        LegendApplicationDocumentationEntry.serialization.toJson(value);
    });
    return result;
  }

  publishContextualDocRegistry(): object {
    const result: Record<
      string,
      LegendApplicationContextualDocumentationEntryConfig
    > = {};
    this.contextualDocRegistry.forEach((value, key) => {
      result[key] =
        LegendApplicationContextualDocumentationEntry.serialization.toJson(
          value,
        );
    });
    return result;
  }
}
