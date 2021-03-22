/**
 * Copyright Goldman Sachs
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

import { observable, action, makeObservable } from 'mobx';
import {
  hashArray,
  getNullableFirstElement,
  addUniqueEntry,
} from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type { PackageableElementReference } from '../../../model/packageableElements/PackageableElementReference';
import type { Mapping } from '../../../model/packageableElements/mapping/Mapping';
import type { SubstituteStore } from './SubstituteStore';

export class MappingInclude {
  owner: Mapping;
  included: PackageableElementReference<Mapping>;
  storeSubstitutions: SubstituteStore[] = [];

  constructor(owner: Mapping, included: PackageableElementReference<Mapping>) {
    makeObservable(this, {
      owner: observable,
      included: observable,
      storeSubstitutions: observable,
      addStoreSubstitution: action,
    });

    this.owner = owner;
    this.included = included;
  }

  addStoreSubstitution(value: SubstituteStore): void {
    addUniqueEntry(this.storeSubstitutions, value);
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MAPPING_INCLUDE,
      this.included.valueForSerialization,
      getNullableFirstElement(this.storeSubstitutions)?.original
        .valueForSerialization ?? '',
      getNullableFirstElement(this.storeSubstitutions)?.substitute
        .valueForSerialization ?? '',
    ]);
  }
}
