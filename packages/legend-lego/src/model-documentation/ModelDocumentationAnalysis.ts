/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import type { Multiplicity } from '@finos/legend-graph';
import { prettyCONSTName, uuid } from '@finos/legend-shared';

export class BasicDocumentationEntry {
  name!: string;
  docs: string[] = [];

  get humanizedName(): string {
    return prettyCONSTName(this.name);
  }
}

export class ModelDocumentationEntry extends BasicDocumentationEntry {
  path!: string;
}

export class ClassDocumentationEntry extends ModelDocumentationEntry {
  properties: PropertyDocumentationEntry[] = [];
  milestoning?: string | undefined;
}

export class PropertyDocumentationEntry extends BasicDocumentationEntry {
  milestoning?: string | undefined;
  /**
   * Make this optional for backward compatibility
   *
   * @backwardCompatibility
   */
  type?: string | undefined;
  /**
   * Make this optional for backward compatibility
   *
   * @backwardCompatibility
   */
  multiplicity?: Multiplicity | undefined;
}

export class NormalizedDocumentationEntry {
  readonly uuid = uuid();
  readonly text: string;
  readonly documentation: string;
  readonly elementEntry: ModelDocumentationEntry;
  readonly entry: BasicDocumentationEntry;

  constructor(
    text: string,
    documentation: string,
    elementEntry: ModelDocumentationEntry,
    entry: BasicDocumentationEntry,
  ) {
    this.text = text;
    this.documentation = documentation;
    this.elementEntry = elementEntry;
    this.entry = entry;
  }

  get humanizedText(): string {
    return prettyCONSTName(this.text);
  }
}

export class EnumerationDocumentationEntry extends ModelDocumentationEntry {
  enumValues: BasicDocumentationEntry[] = [];
}

export class AssociationDocumentationEntry extends ModelDocumentationEntry {
  properties: PropertyDocumentationEntry[] = [];
}
