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
  createModelSchema,
  custom,
  list,
  optional,
  primitive,
} from 'serializr';
import type { MarkdownText } from '../markdown/MarkdownUtils.js';
import { SerializationFactory } from './SerializationUtils.js';
import type { PlainObject, Writable } from '../CommonUtils.js';

export class DocumentationEntry {
  readonly key!: string;

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
    (entry as Writable<DocumentationEntry>).key = documentationKey;
    return entry;
  }
}
