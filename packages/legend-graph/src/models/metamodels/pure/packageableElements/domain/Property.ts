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
import {
  type GenericTypeReference,
  GenericTypeExplicitReference,
} from './GenericTypeReference';
import { Multiplicity } from './Multiplicity';
import { GenericType } from './GenericType';
import type { Class } from './Class';
import type { AbstractProperty, PropertyOwner } from './AbstractProperty';
import type { AnnotatedElement } from './AnnotatedElement';
import type { TaggedValue } from './TaggedValue';
import { type Stubable, isStubArray } from '../../../../../helpers/Stubable';
import type { Type } from './Type';
import type { StereotypeReference } from './StereotypeReference';

export class Property
  implements AbstractProperty, AnnotatedElement, Hashable, Stubable
{
  readonly uuid = uuid();
  owner: PropertyOwner; // readonly

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
    this.owner = owner;
  }

  static createStub = (type: Type, _class: Class): Property =>
    new Property(
      '',
      new Multiplicity(1, 1),
      GenericTypeExplicitReference.create(new GenericType(type)),
      _class,
    );
  get isStub(): boolean {
    return (
      !this.name &&
      this.genericType.isStub &&
      isStubArray(this.stereotypes) &&
      isStubArray(this.taggedValues)
    );
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
