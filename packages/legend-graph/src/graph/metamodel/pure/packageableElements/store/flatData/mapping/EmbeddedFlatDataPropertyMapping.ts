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
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import type { Mapping } from '../../../mapping/Mapping.js';
import { AbstractFlatDataPropertyMapping } from './AbstractFlatDataPropertyMapping.js';
import type {
  PropertyMapping,
  PropertyMappingVisitor,
} from '../../../mapping/PropertyMapping.js';
import type { SetImplementationVisitor } from '../../../mapping/SetImplementation.js';
import type { Class } from '../../../domain/Class.js';
import type { InstanceSetImplementation } from '../../../mapping/InstanceSetImplementation.js';
import type { PropertyMappingsImplementation } from '../../../mapping/PropertyMappingsImplementation.js';
import type { PropertyReference } from '../../../domain/PropertyReference.js';
import type { InferableMappingElementIdValue } from '../../../mapping/InferableMappingElementId.js';
import type { PackageableElementReference } from '../../../PackageableElementReference.js';
import { InferableMappingElementRootExplicitValue } from '../../../mapping/InferableMappingElementRoot.js';
import type { MappingClass } from '../../../mapping/MappingClass.js';
import { FlatDataPropertyMapping } from './FlatDataPropertyMapping.js';
import type { SetImplementationReference } from '../../../mapping/SetImplementationReference.js';

/**
 * We can think of embedded property mappings as a 'gateway' from one set of property mappings to another. They are in a sense
 * both an `InstanceSetImplementation` (since they hold property mappings that map to a class) and a `PropertyMapping` (as it holds a property).
 * The property's owner class belongs to the orginal/root `InstanceSetImplementation`. The property's type is the class mapped as part of the embedded property mapping
 *
 * NOTE: We model this class differently than what we do in Pure metamodel. We make it only implement `SetImplementation`, not extending it for 2 reasons:
 * 1. Javascript only support single inheritance unlike Pure
 * 2. In the general mental model, it is more sensible to think of embedded property mapping as a property mapping rather than a class mapping because
 * despite the fact that it has the shape similar to a class mapping and it can contain multiple property mappings, it itselt is not a class mapping, it must
 * exist "embedded" within a property mapping.
 */
export class EmbeddedFlatDataPropertyMapping
  extends AbstractFlatDataPropertyMapping
  implements InstanceSetImplementation, Hashable
{
  readonly _PARENT: Mapping;
  override readonly _isEmbedded = true;

  root = InferableMappingElementRootExplicitValue.create(false);
  class: PackageableElementReference<Class>;
  id: InferableMappingElementIdValue;
  propertyMappings: PropertyMapping[] = [];
  rootInstanceSetImplementation: InstanceSetImplementation; // in Pure we call this `setMappingOwner`
  mappingClass?: MappingClass | undefined;

  constructor(
    owner: PropertyMappingsImplementation,
    property: PropertyReference,
    rootInstanceSetImplementation: InstanceSetImplementation,
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

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.EMBEDDED_FLAT_DATA_PROPERTY_MAPPING,
      super.hashCode,
      this.id.valueForSerialization ?? '',
      this.class.value.path,
      // skip `root` since we disregard it in embedded property mappings
      hashArray(
        this.propertyMappings.filter(
          // TODO: we should also handle of other property mapping types
          // using some form of extension mechanism
          // This is a rather optimistic check as we make assumption on the type of property mapping included here
          (propertyMapping) => {
            if (propertyMapping instanceof FlatDataPropertyMapping) {
              // TODO: use `isStubbed_RawLambda` when we move this out of the metamodel
              return (
                Boolean(propertyMapping.transform.parameters) ||
                Boolean(propertyMapping.transform.body)
              );
            }
            return true;
          },
        ),
      ),
    ]);
  }

  accept_SetImplementationVisitor<T>(visitor: SetImplementationVisitor<T>): T {
    return visitor.visit_EmbeddedFlatDataSetImplementation(this);
  }

  accept_PropertyMappingVisitor<T>(visitor: PropertyMappingVisitor<T>): T {
    return visitor.visit_EmbeddedFlatDataPropertyMapping(this);
  }
}
