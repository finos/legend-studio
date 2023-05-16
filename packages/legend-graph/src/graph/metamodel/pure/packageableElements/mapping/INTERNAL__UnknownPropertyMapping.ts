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
  hashArray,
  type Hashable,
  type PlainObject,
} from '@finos/legend-shared';
import {
  PropertyMapping,
  type PropertyMappingVisitor,
} from './PropertyMapping.js';
import {
  CORE_HASH_STRUCTURE,
  hashObjectWithoutSourceInformation,
} from '../../../../Core_HashUtils.js';
import { INTERNAL__PseudoInstanceSetImplementation } from './INTERNAL__PseudoInstanceSetImplementation.js';
import { PropertyExplicitReference } from '../domain/PropertyReference.js';
import { Property } from '../domain/Property.js';
import { Multiplicity } from '../domain/Multiplicity.js';
import { GenericTypeExplicitReference } from '../domain/GenericTypeReference.js';
import { GenericType } from '../domain/GenericType.js';
import { INTERNAL__PseudoClass } from '../domain/INTERNAL__PseudoClass.js';
import { SetImplementationExplicitReference } from './SetImplementationReference.js';

export class INTERNAL__UnknownPropertyMapping
  extends PropertyMapping
  implements Hashable
{
  content!: PlainObject;

  constructor() {
    super(
      INTERNAL__PseudoInstanceSetImplementation.INSTANCE,
      PropertyExplicitReference.create(
        new Property(
          '',
          Multiplicity.ONE,
          GenericTypeExplicitReference.create(
            new GenericType(INTERNAL__PseudoClass.INSTANCE),
          ),
          INTERNAL__PseudoClass.INSTANCE,
        ),
      ),
      SetImplementationExplicitReference.create(
        INTERNAL__PseudoInstanceSetImplementation.INSTANCE,
      ),
      undefined,
    );
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.INTERNAL__UNKNOWN_PROPERTY_MAPPING,
      this.property.pointerHashCode,
      hashObjectWithoutSourceInformation(this.content),
    ]);
  }

  accept_PropertyMappingVisitor<T>(visitor: PropertyMappingVisitor<T>): T {
    return visitor.visit_INTERNAL__UnknownPropertyMapping(this);
  }
}
