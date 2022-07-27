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
  UnsupportedOperationError,
  hashArray,
  type Hashable,
  isEmpty,
} from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import type { RelationalOperationElement } from '../model/RelationalOperationElement.js';
import type { EmbeddedSetImplementation } from '../../../mapping/EmbeddedSetImplementation.js';
import type { Class } from '../../../domain/Class.js';
import type { Mapping } from '../../../mapping/Mapping.js';
import type { SetImplementationVisitor } from '../../../mapping/SetImplementation.js';
import type { PropertyMappingsImplementation } from '../../../mapping/PropertyMappingsImplementation.js';
import {
  type PropertyMappingVisitor,
  PropertyMapping,
} from '../../../mapping/PropertyMapping.js';
import type { RootRelationalInstanceSetImplementation } from './RootRelationalInstanceSetImplementation.js';
import type { InferableMappingElementIdValue } from '../../../mapping/InferableMappingElementId.js';
import type { PackageableElementReference } from '../../../PackageableElementReference.js';
import type { PropertyReference } from '../../../domain/PropertyReference.js';
import type { RelationalInstanceSetImplementation } from './RelationalInstanceSetImplementation.js';
import { InferableMappingElementRootExplicitValue } from '../../../mapping/InferableMappingElementRoot.js';
import type { MappingClass } from '../../../mapping/MappingClass.js';
import { RelationalPropertyMapping } from './RelationalPropertyMapping.js';
import type { SetImplementationReference } from '../../../mapping/SetImplementationReference.js';

export class EmbeddedRelationalInstanceSetImplementation
  extends PropertyMapping
  implements
    EmbeddedSetImplementation,
    RelationalInstanceSetImplementation,
    Hashable
{
  readonly _PARENT: Mapping;
  override readonly _isEmbedded = true;

  root = InferableMappingElementRootExplicitValue.create(false);
  id: InferableMappingElementIdValue;
  propertyMappings: PropertyMapping[] = [];
  class: PackageableElementReference<Class>;
  rootInstanceSetImplementation: RootRelationalInstanceSetImplementation; // in Pure we call this `setMappingOwner`
  primaryKey: RelationalOperationElement[] = [];
  mappingClass?: MappingClass | undefined;

  constructor(
    owner: PropertyMappingsImplementation,
    property: PropertyReference,
    rootInstanceSetImplementation: RootRelationalInstanceSetImplementation,
    source: SetImplementationReference,
    _class: PackageableElementReference<Class>,
    id: InferableMappingElementIdValue,
    target: SetImplementationReference | undefined,
  ) {
    super(owner, property, source, target);
    this.class = _class;
    this.id = id;
    this.rootInstanceSetImplementation = rootInstanceSetImplementation;
    this._PARENT = rootInstanceSetImplementation._PARENT;
  }

  accept_PropertyMappingVisitor<T>(visitor: PropertyMappingVisitor<T>): T {
    return visitor.visit_EmbeddedRelationalPropertyMapping(this);
  }

  accept_SetImplementationVisitor<T>(visitor: SetImplementationVisitor<T>): T {
    throw new UnsupportedOperationError();
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.EMBEDDED_REALTIONAL_PROPERTY_MAPPING,
      super.hashCode,
      this.class.valueForSerialization ?? '',
      hashArray(this.primaryKey),
      // skip `root` since we disregard it in embedded property mappings
      hashArray(
        this.propertyMappings.filter((propertyMapping) => {
          // TODO: we should also handle of other property mapping types
          // using some form of extension mechanism
          // This is a rather optimistic check as we make assumption on the type of property mapping included here
          if (propertyMapping instanceof RelationalPropertyMapping) {
            // TODO: use `isStubbed_RawRelationalOperationElement` when we move this out of the metamodel
            return !isEmpty(propertyMapping.relationalOperation);
          }
          return true;
        }),
      ),
    ]);
  }
}
