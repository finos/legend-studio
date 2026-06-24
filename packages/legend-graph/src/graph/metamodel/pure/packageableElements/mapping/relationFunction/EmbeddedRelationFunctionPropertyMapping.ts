/**
 * Copyright (c) 2026-present, Goldman Sachs
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
} from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../Core_HashUtils.js';
import type { EmbeddedSetImplementation } from '../../mapping/EmbeddedSetImplementation.js';
import type { Class } from '../../domain/Class.js';
import type { Mapping } from '../../mapping/Mapping.js';
import type { SetImplementationVisitor } from '../../mapping/SetImplementation.js';
import type { PropertyMappingsImplementation } from '../../mapping/PropertyMappingsImplementation.js';
import {
  type PropertyMappingVisitor,
  PropertyMapping,
} from '../../mapping/PropertyMapping.js';
import type { InferableMappingElementIdValue } from '../../mapping/InferableMappingElementId.js';
import type { PackageableElementReference } from '../../PackageableElementReference.js';
import type { PropertyReference } from '../../domain/PropertyReference.js';
import { InferableMappingElementRootExplicitValue } from '../../mapping/InferableMappingElementRoot.js';
import type { MappingClass } from '../../mapping/MappingClass.js';
import type { SetImplementationReference } from '../../mapping/SetImplementationReference.js';
import type { RelationFunctionInstanceSetImplementation } from './RelationFunctionInstanceSetImplementation.js';

export class EmbeddedRelationFunctionPropertyMapping
  extends PropertyMapping
  implements EmbeddedSetImplementation, Hashable
{
  readonly _PARENT: Mapping;
  override readonly _isEmbedded = true;

  root = InferableMappingElementRootExplicitValue.create(false);
  id: InferableMappingElementIdValue;
  propertyMappings: PropertyMapping[] = [];
  class: PackageableElementReference<Class>;
  rootInstanceSetImplementation: RelationFunctionInstanceSetImplementation;
  mappingClass?: MappingClass | undefined;

  constructor(
    owner: PropertyMappingsImplementation,
    property: PropertyReference,
    rootInstanceSetImplementation: RelationFunctionInstanceSetImplementation,
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
    return visitor.visit_RelationFunctionEmbeddedPropertyMapping(this);
  }

  accept_SetImplementationVisitor<T>(visitor: SetImplementationVisitor<T>): T {
    throw new UnsupportedOperationError();
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATION_FUNCTION_EMBEDDED_PROPERTY_MAPPING,
      super.hashCode,
      this.class.valueForSerialization ?? '',
      hashArray(this.propertyMappings),
    ]);
  }
}
