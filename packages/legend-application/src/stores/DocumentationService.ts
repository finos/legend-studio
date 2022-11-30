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
} from '@finos/legend-shared';
import {
  createModelSchema,
  custom,
  list,
  optional,
  primitive,
} from 'serializr';
import { APPLICATION_EVENT } from './ApplicationEvent.js';
import type { GenericLegendApplicationStore } from './ApplicationStore.js';

export type DocumentationRegistryEntry = {
  url: string;
  /**
   * Sometimes, we don't need to expose an endpoint to get the documentation data
   * we support the `simple` mode where the endpoint is really just a JSON
   *
   * The caveat about this mode is that the endpoint must have CORS enabled
   * ideally, the CORS-enabled endpoint should be setup with "Access-Control-Allow-Origin", "*"
   * (e.g. Github Pages - See https://stackoverflow.com/questions/26416727/cross-origin-resource-sharing-on-github-pages)
   * With that, the network client used to fetch this request must also be simplified to not include credential
   * See https://stackoverflow.com/questions/19743396/cors-cannot-use-wildcard-in-access-control-allow-origin-when-credentials-flag-i
   *
   * During development, an option is to use our mock-server or some sort of CORS proxies, for example `cors-anywhere`
   * See https://cors-anywhere.herokuapp.com/
   */
  simple?: boolean | undefined;
  /**
   * Optional list of wildcard patterns to be matched against documentation entries' keys to
   * narrow the scope of inclusion
   */
  includes?: string[];
};

export type DocumentationRegistryData = {
  entries: Record<string, DocumentationConfigEntry>;
};

export type DocumentationConfigEntry = {
  markdownText?: MarkdownText | undefined;
  title?: string | undefined;
  text?: string | undefined;
  url?: string | undefined;
  related?: string[] | undefined;
};

export class DocumentationEntry {
  readonly _documentationKey!: string;

  markdownText?: MarkdownText | undefined;
  title?: string | undefined;
  text?: string | undefined;
  url?: string | undefined;
  related?: string[] | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DocumentationEntry, {
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
    json: PlainObject<DocumentationEntry>,
    documentationKey: string,
  ): DocumentationEntry {
    const entry = DocumentationEntry.serialization.fromJson(json);
    (entry as Writable<DocumentationEntry>)._documentationKey =
      documentationKey;
    return entry;
  }
}

export interface KeyedDocumentationEntry {
  key: string;
  content: DocumentationEntry;
}

export const collectKeyedDocumnetationEntriesFromConfig = (
  rawEntries: Record<string, DocumentationConfigEntry>,
): KeyedDocumentationEntry[] =>
  Object.entries(rawEntries).map((entry) => ({
    key: entry[0],
    content: DocumentationEntry.create(entry[1], entry[0]),
  }));

export type ContextualDocumentationConfig = Record<string, string>;
export type ContextualDocumentationEntry = {
  context: string;
  documentationKey: string;
};
export const collectContextualDocumnetationEntries = (
  config: ContextualDocumentationConfig,
): ContextualDocumentationEntry[] =>
  Object.entries(config).map((entry) => ({
    context: entry[0],
    documentationKey: entry[1],
  }));

export class DocumentationService {
  readonly url?: string | undefined;

  private readonly docRegistry = new Map<string, DocumentationEntry>();
  private readonly contextualDocIndex = new Map<string, DocumentationEntry>();

  constructor(applicationStore: GenericLegendApplicationStore) {
    // set the main documenation site url
    this.url = applicationStore.config.documentationUrl;

    /**
     * NOTE: the order of documentation entry overidding is (the later override the former):
     * 1. Natively specified: specified in the codebase (no overriding allowed within this group of documentation entries):
     *    since we have extension mechanism, the order of plugins matter,
     *    we do not allow overriding, i.e. so the first specification for a documentation key wins
     * 2. Fetched from documentation registries (no overriding allowed within this group of documentation entries):
     *    since we have extension mechanism and allow specifying multiple registry URLS,
     *    we do not allow overriding, i.e. so the first specification for a documentation key wins
     * 3. Configured in application config (overiding allowed within this group)
     */

    // build doc registry
    applicationStore.pluginManager
      .getApplicationPlugins()
      .flatMap((plugin) => plugin.getExtraKeyedDocumentationEntries?.() ?? [])
      .forEach((entry) => {
        // NOTE: Entries specified natively will not override each other. This is to prevent entries from extensions
        // accidentally overide entries from core.
        if (this.hasDocEntry(entry.key)) {
          applicationStore.log.warn(
            LogEvent.create(
              APPLICATION_EVENT.APPLICATION_DOCUMENTATION_LOAD_SKIPPED,
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

    const contextualDocEntries = applicationStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) => plugin.getExtraContextualDocumentationEntries?.() ?? [],
      );

    // verify that required documentations are available
    const missingDocumentationEntries: string[] = [];
    uniq(
      applicationStore.pluginManager
        .getApplicationPlugins()
        .flatMap((plugin) => plugin.getExtraRequiredDocumentationKeys?.() ?? [])
        .concat(contextualDocEntries.map((entry) => entry.documentationKey)),
    ).forEach((key) => {
      if (!this.docRegistry.has(key)) {
        missingDocumentationEntries.push(key);
      }
    });
    if (missingDocumentationEntries.length) {
      applicationStore.log.warn(
        LogEvent.create(
          APPLICATION_EVENT.APPLICATION_DOCUMENTATION_REQUIREMENT_CHECK_FAILURE,
        ),
        `Can't find corresponding documentation entry for keys:\n${missingDocumentationEntries
          .map((key) => `- ${key}`)
          .join('\n')}`,
      );
    }

    // Contextual Documentation
    contextualDocEntries.forEach((entry) => {
      // NOTE: Entries specified natively will not override each other. This is to prevent entries from extensions
      // overriding entries from core.
      //
      // However, it might be useful to allow extending the list of related doc entries.
      // This allows extensions to broaden related doc entries for contextual docs
      // If we need to support this behavior, we could create a dedicated extension method
      if (this.hasContextualDocEntry(entry.context)) {
        applicationStore.log.warn(
          LogEvent.create(
            APPLICATION_EVENT.APPLICATION_CONTEXTUAL_DOCUMENTATION_LOAD_SKIPPED,
          ),
          entry.context,
        );
      } else {
        const existingDocEntry = this.getDocEntry(entry.documentationKey);
        if (existingDocEntry) {
          this.contextualDocIndex.set(entry.context, existingDocEntry);
        }
      }
    });

    // entries from config will override entries specified natively
    applicationStore.config.contextualDocEntries.forEach((entry) => {
      const existingDocEntry = this.getDocEntry(entry.documentationKey);
      if (existingDocEntry) {
        this.contextualDocIndex.set(entry.context, existingDocEntry);
      }
    });
  }

  getDocEntry(key: string): DocumentationEntry | undefined {
    return this.docRegistry.get(key);
  }

  hasDocEntry(key: string): boolean {
    return this.docRegistry.has(key);
  }

  getContextualDocEntry(key: string): DocumentationEntry | undefined {
    return this.contextualDocIndex.get(key);
  }

  hasContextualDocEntry(key: string): boolean {
    return this.contextualDocIndex.has(key);
  }

  getAllDocEntries(): DocumentationEntry[] {
    return Array.from(this.docRegistry.values());
  }

  publishDocRegistry(): Record<string, DocumentationConfigEntry> {
    const result: Record<string, DocumentationConfigEntry> = {};
    this.docRegistry.forEach((value, key) => {
      result[key] = DocumentationEntry.serialization.toJson(value);
    });
    return result;
  }

  publishContextualDocIndex(): ContextualDocumentationConfig {
    const result: ContextualDocumentationConfig = {};
    this.contextualDocIndex.forEach((value, key) => {
      result[key] = value._documentationKey;
    });
    return result;
  }
}
