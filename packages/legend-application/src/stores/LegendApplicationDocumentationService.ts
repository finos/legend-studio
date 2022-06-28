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
  related?: string[] | undefined;
};

export class LegendApplicationDocumentationEntry {
  readonly _documentationKey!: string;

  markdownText?: MarkdownText | undefined;
  title?: string | undefined;
  text?: string | undefined;
  url?: string | undefined;
  related?: string[] | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(LegendApplicationDocumentationEntry, {
      markdownText: custom(
        (val) => val,
        (val) => (val.value ? val : undefined),
      ),
      related: optional(list(primitive())),
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

export type LegendApplicationContextualDocumentationMapConfig = Record<
  string,
  string
>;
export type LegendApplicationContextualDocumentationEntry = {
  context: string;
  documentationKey: string;
};
export const collectContextualDocumnetationEntry = (
  contextualDocMap: LegendApplicationContextualDocumentationMapConfig,
): LegendApplicationContextualDocumentationEntry[] =>
  Object.entries(contextualDocMap).map((entry) => ({
    context: entry[0],
    documentationKey: entry[1],
  }));

export class LegendApplicationDocumentationService {
  url?: string | undefined;

  private docRegistry = new Map<string, LegendApplicationDocumentationEntry>();
  private contextualDocMap = new Map<
    string,
    LegendApplicationDocumentationEntry
  >();

  constructor(applicationStore: ApplicationStore<LegendApplicationConfig>) {
    // set the main documenation site url
    this.url = applicationStore.config.documentationUrl;

    // build doc registry
    applicationStore.pluginManager
      .getApplicationPlugins()
      .flatMap((plugin) => plugin.getExtraKeyedDocumentationEntries?.() ?? [])
      .forEach((entry) => {
        // Entries specified natively will not override each other. This is to prevent entries from extensions
        // accidentally overide entries from core.
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
        (plugin) => plugin.getExtraContextualDocumentationEntries?.() ?? [],
      )
      .forEach((entry) => {
        // NOTE: Entries specified natively will not override each other. This is to prevent entries from extensions
        // overriding entries from core.
        //
        // However, it might be useful to allow extending the list of related doc entries.
        // This allows extensions to broaden related doc entries for contextual docs
        // If we need to support this behavior, we could create a dedicated extension method
        if (this.hasContextualDocEntry(entry.context)) {
          applicationStore.log.warn(
            LogEvent.create(
              APPLICATION_EVENT.APPLICATION_CONTEXTUAL_DOCUMTENTION_LOAD_SKIPPED,
            ),
            entry.context,
          );
        } else {
          const existingDocEntry = this.getDocEntry(entry.documentationKey);
          if (existingDocEntry) {
            this.contextualDocMap.set(entry.context, existingDocEntry);
          }
        }
      });

    // entries from config will override entries specified natively
    applicationStore.config.contextualDocEntries.forEach((entry) => {
      const existingDocEntry = this.getDocEntry(entry.documentationKey);
      if (existingDocEntry) {
        this.contextualDocMap.set(entry.context, existingDocEntry);
      }
    });
  }

  getDocEntry(key: string): LegendApplicationDocumentationEntry | undefined {
    return this.docRegistry.get(key);
  }

  hasDocEntry(key: string): boolean {
    return this.docRegistry.has(key);
  }

  getContextualDocEntry(
    key: string,
  ): LegendApplicationDocumentationEntry | undefined {
    return this.contextualDocMap.get(key);
  }

  hasContextualDocEntry(key: string): boolean {
    return this.contextualDocMap.has(key);
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

  publishContextualDocMap(): LegendApplicationContextualDocumentationMapConfig {
    const result: LegendApplicationContextualDocumentationMapConfig = {};
    this.contextualDocMap.forEach((value, key) => {
      result[key] = value._documentationKey;
    });
    return result;
  }
}
