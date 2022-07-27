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

import { hashArray, type Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../graph/Core_HashUtils.js';
import type {
  PackageableElementExplicitReference,
  PackageableElementReference,
} from '../PackageableElementReference.js';
import type { PropertyMappingsImplementation } from './PropertyMappingsImplementation.js';
import type { Association } from '../domain/Association.js';
import type { Mapping } from './Mapping.js';
import type { Store } from '../store/Store.js';
import type { PropertyMapping } from './PropertyMapping.js';
import type { InferableMappingElementIdValue } from './InferableMappingElementId.js';

export abstract class AssociationImplementation
  implements PropertyMappingsImplementation, Hashable
{
  readonly _PARENT: Mapping;

  association: PackageableElementReference<Association>;
  id: InferableMappingElementIdValue;
  stores: PackageableElementReference<Store>[] = [];
  propertyMappings: PropertyMapping[] = [];

  constructor(
    id: InferableMappingElementIdValue,
    parent: Mapping,
    association: PackageableElementExplicitReference<Association>,
  ) {
    this.id = id;
    this._PARENT = parent;
    this.association = association;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.ASSOCIATION_IMPLEMENTATION,
      this.association.value.path,
      this.id.valueForSerialization ?? '',
      hashArray(this.stores.map((e) => e.valueForSerialization ?? '')),
    ]);
  }
}
