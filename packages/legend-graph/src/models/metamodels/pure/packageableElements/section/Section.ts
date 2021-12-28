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

import { observable, computed, makeObservable } from 'mobx';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import { hashArray, type Hashable } from '@finos/legend-shared';
import type { PackageableElement } from '../PackageableElement';
import type { Package } from '../domain/Package';
import type { SectionIndex } from './SectionIndex';
import type { PackageableElementExplicitReference } from '../PackageableElementReference';

export enum SectionType {
  IMPORT_AWARE = 'importAware',
  DEFAULT = 'default',
}

export abstract class Section implements Hashable {
  parent: SectionIndex;
  parserName: string;
  elements: PackageableElementExplicitReference<PackageableElement>[] = [];

  constructor(parserName: string, parent: SectionIndex) {
    makeObservable(this, {
      parent: observable,
      parserName: observable,
      elements: observable,
    });

    this.parserName = parserName;
    this.parent = parent;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SECTION,
      this.parserName,
      hashArray(this.elements.map((e) => e.hashValue)),
    ]);
  }
}

export class ImportAwareCodeSection extends Section {
  imports: PackageableElementExplicitReference<Package>[] = [];

  constructor(parserName: string, parent: SectionIndex) {
    super(parserName, parent);

    makeObservable(this, {
      imports: observable,
      hashCode: computed,
    });
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.IMPORT_AWARE_CODE_SECTION,
      super.hashCode,
      hashArray(this.imports.map((e) => e.hashValue)),
    ]);
  }
}

export class DefaultCodeSection extends Section {
  constructor(parserName: string, parent: SectionIndex) {
    super(parserName, parent);

    makeObservable(this, {
      hashCode: computed,
    });
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DEFAULT_CODE_SECTION,
      super.hashCode,
    ]);
  }
}
