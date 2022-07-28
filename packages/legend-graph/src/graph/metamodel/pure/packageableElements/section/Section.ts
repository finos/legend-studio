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

import { CORE_HASH_STRUCTURE } from '../../../../../graph/Core_HashUtils.js';
import { hashArray, type Hashable } from '@finos/legend-shared';
import type { PackageableElement } from '../PackageableElement.js';
import type { Package } from '../domain/Package.js';
import type { SectionIndex } from './SectionIndex.js';
import type { PackageableElementExplicitReference } from '../PackageableElementReference.js';

export abstract class Section implements Hashable {
  readonly _OWNER: SectionIndex;

  parserName: string;
  elements: PackageableElementExplicitReference<PackageableElement>[] = [];

  constructor(parserName: string, owner: SectionIndex) {
    this.parserName = parserName;
    this._OWNER = owner;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SECTION,
      this.parserName,
      hashArray(this.elements.map((e) => e.valueForSerialization ?? '')),
    ]);
  }
}

export class ImportAwareCodeSection extends Section {
  imports: PackageableElementExplicitReference<Package>[] = [];

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.IMPORT_AWARE_CODE_SECTION,
      super.hashCode,
      hashArray(this.imports.map((e) => e.valueForSerialization ?? '')),
    ]);
  }
}

export class DefaultCodeSection extends Section {
  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DEFAULT_CODE_SECTION,
      super.hashCode,
    ]);
  }
}
