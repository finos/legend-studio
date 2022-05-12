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
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type { GenericTypeReference } from './GenericTypeReference';
import type { Multiplicity } from './Multiplicity';
import type { AbstractProperty, PropertyOwner } from './AbstractProperty';
import type { AnnotatedElement } from './AnnotatedElement';
import type { TaggedValue } from './TaggedValue';
import type { StereotypeReference } from './StereotypeReference';

export class Property implements AbstractProperty, AnnotatedElement, Hashable {
  readonly _UUID = uuid();
  readonly _OWNER: PropertyOwner;

  name: string;
  multiplicity: Multiplicity;
  genericType: GenericTypeReference;
  stereotypes: StereotypeReference[] = [];
  taggedValues: TaggedValue[] = [];

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
      CORE_HASH_STRUCTURE.PROPERTY,
      this.name,
      this.multiplicity,
      this.genericType.ownerReference.hashValue,
      hashArray(this.stereotypes.map((val) => val.pointerHashCode)),
      hashArray(this.taggedValues),
    ]);
  }
}
