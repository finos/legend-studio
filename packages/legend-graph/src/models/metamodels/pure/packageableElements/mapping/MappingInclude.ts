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

import { hashArray, getNullableFirstElement } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst.js';
import type { PackageableElementReference } from '../PackageableElementReference.js';
import type { Mapping } from './Mapping.js';
import type { SubstituteStore } from './SubstituteStore.js';

export class MappingInclude {
  readonly _OWNER: Mapping;

  included: PackageableElementReference<Mapping>;
  storeSubstitutions: SubstituteStore[] = [];

  constructor(owner: Mapping, included: PackageableElementReference<Mapping>) {
    this._OWNER = owner;
    this.included = included;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MAPPING_INCLUDE,
      this.included.hashValue,
      getNullableFirstElement(this.storeSubstitutions)?.original.hashValue ??
        '',
      getNullableFirstElement(this.storeSubstitutions)?.substitute.hashValue ??
        '',
    ]);
  }
}
