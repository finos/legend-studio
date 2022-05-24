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

  private registry = new Map<string, LegendApplicationDocumentationEntry>();

  registerEntry(key: string, value: LegendApplicationDocumentationEntry): void {
    this.registry.set(key, value);
  }

  getEntry(key: string): LegendApplicationDocumentationEntry | undefined {
    return this.registry.get(key);
  }

  hasEntry(key: string): boolean {
    return this.registry.has(key);
  }
}
