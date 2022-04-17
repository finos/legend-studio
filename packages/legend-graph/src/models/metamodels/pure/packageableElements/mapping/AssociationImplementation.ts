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
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type {
  PackageableElementExplicitReference,
  PackageableElementReference,
} from '../PackageableElementReference';
import type { PropertyMappingsImplementation } from './PropertyMappingsImplementation';
import type { Association } from '../domain/Association';
import type { Mapping } from './Mapping';
import type { Store } from '../store/Store';
import type { PropertyMapping } from './PropertyMapping';
import type { InferableMappingElementIdValue } from './InferableMappingElementId';

export abstract class AssociationImplementation
  implements PropertyMappingsImplementation, Hashable
{
  association: PackageableElementReference<Association>;
  id: InferableMappingElementIdValue;
  parent: Mapping;
  stores: PackageableElementReference<Store>[] = [];
  propertyMappings: PropertyMapping[] = [];

  constructor(
    id: InferableMappingElementIdValue,
    parent: Mapping,
    association: PackageableElementExplicitReference<Association>,
  ) {
    this.id = id;
    this.parent = parent;
    this.association = association;
  }

  get isStub(): boolean {
    return !this.id.value;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.ASSOCIATION_IMPLEMENTATION,
      this.association.value.path,
      this.id.valueForSerialization ?? '',
      hashArray(this.stores.map((e) => e.hashValue)),
    ]);
  }
}
