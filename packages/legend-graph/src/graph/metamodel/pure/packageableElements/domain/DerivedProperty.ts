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

import { type Hashable, hashArray, uuid } from '@finos/legend-shared';
import {
  CORE_HASH_STRUCTURE,
  hashRawLambda,
} from '../../../../../graph/Core_HashUtils.js';
import type { Multiplicity } from './Multiplicity.js';
import type { TaggedValue } from './TaggedValue.js';
import type { AbstractProperty, PropertyOwner } from './AbstractProperty.js';
import type { AnnotatedElement } from './AnnotatedElement.js';
import type { StereotypeReference } from './StereotypeReference.js';
import type { GenericTypeReference } from './GenericTypeReference.js';

export class DerivedProperty
  implements AbstractProperty, AnnotatedElement, Hashable
{
  readonly _UUID = uuid();
  readonly _OWNER: PropertyOwner;

  name: string;
  genericType: GenericTypeReference;
  multiplicity: Multiplicity;
  stereotypes: StereotypeReference[] = [];
  taggedValues: TaggedValue[] = [];
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  body?: object | undefined;
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  parameters?: object | undefined;

  defaultValue = undefined;

  constructor(
    name: string,
    multiplicity: Multiplicity,
    genericType: GenericTypeReference,
    owner: PropertyOwner,
  ) {
    this.name = name;
    this.multiplicity = multiplicity;
    this.genericType = genericType;
    this._OWNER = owner;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DERIVED_PROPERTY,
      this.name,
      this.multiplicity,
      this.genericType.ownerReference.valueForSerialization ?? '',
      hashArray(this.stereotypes.map((val) => val.pointerHashCode)),
      hashArray(this.taggedValues),
      hashRawLambda(this.parameters, this.body),
    ]);
  }
}
