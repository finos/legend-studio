/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { observable, computed } from 'mobx';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { PackageableElement } from 'MM/model/packageableElements/PackageableElement';
import { Package } from 'MM/model/packageableElements/domain/Package';
import { SectionIndex } from './SectionIndex';
import { PackageableElementExplicitReference } from 'MM/model/packageableElements/PackageableElementReference';

export enum SectionType {
  IMPORT_AWARE = 'importAware',
  DEFAULT = 'default'
}

export abstract class Section implements Hashable {
  @observable parent: SectionIndex;
  @observable parserName: string;
  @observable elements: PackageableElementExplicitReference<PackageableElement>[] = [];

  constructor(parserName: string, parent: SectionIndex) {
    this.parserName = parserName;
    this.parent = parent;
  }

  @computed get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.SECTION,
      this.parserName,
      hashArray(this.elements.map(e => e.valueForSerialization)),
    ]);
  }
}

export class ImportAwareCodeSection extends Section {
  @observable imports: PackageableElementExplicitReference<Package>[] = [];

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.IMPORT_AWARE_CODE_SECTION,
      super.hashCode,
      hashArray(this.imports.map(e => e.valueForSerialization))
    ]);
  }
}

export class DefaultCodeSection extends Section {

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.DEFAULT_CODE_SECTION,
      super.hashCode
    ]);
  }
}
