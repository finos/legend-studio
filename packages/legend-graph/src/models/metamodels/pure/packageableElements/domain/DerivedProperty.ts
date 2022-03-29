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

import { observable, computed, makeObservable } from 'mobx';
import { type Hashable, hashArray, uuid } from '@finos/legend-shared';
import { hashLambda } from '../../../../../MetaModelUtils';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import { Multiplicity } from './Multiplicity';
import type { TaggedValue } from './TaggedValue';
import type { AbstractProperty, PropertyOwner } from './AbstractProperty';
import type { AnnotatedElement } from './AnnotatedElement';
import { GenericType } from './GenericType';
import type { Class } from './Class';
import type { Type } from './Type';
import type { Stubable } from '../../../../../helpers/Stubable';
import type { StereotypeReference } from './StereotypeReference';
import {
  type GenericTypeReference,
  GenericTypeExplicitReference,
} from './GenericTypeReference';

export class DerivedProperty
  implements AbstractProperty, AnnotatedElement, Hashable, Stubable
{
  uuid = uuid();
  owner: PropertyOwner; // readonly
  name: string;
  genericType: GenericTypeReference;
  multiplicity: Multiplicity;
  stereotypes: StereotypeReference[] = [];
  taggedValues: TaggedValue[] = [];
  body?: object | undefined; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process lambda
  parameters?: object | undefined; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process lambda

  constructor(
    name: string,
    multiplicity: Multiplicity,
    genericType: GenericTypeReference,
    owner: PropertyOwner,
  ) {
    makeObservable(this, {
      name: observable,
      multiplicity: observable,
      stereotypes: observable,
      taggedValues: observable,
      body: observable.ref,
      parameters: observable.ref,
      isStub: computed,
      hashCode: computed,
    });

    this.name = name;
    this.multiplicity = multiplicity;
    this.genericType = genericType;
    this.owner = owner;
  }
  static createStub = (type: Type, _class: Class): DerivedProperty =>
    new DerivedProperty(
      '',
      new Multiplicity(1, 1),
      GenericTypeExplicitReference.create(new GenericType(type)),
      _class,
    );
  // the derived property is considered stub if it doesn't have a body in the lambda because without a body, it is not parsable, and should be discarded in transformer
  get isStub(): boolean {
    return !this.body;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.DERIVED_PROPERTY,
      this.name,
      this.multiplicity,
      this.genericType.ownerReference.hashValue,
      hashArray(this.stereotypes.map((val) => val.pointerHashCode)),
      hashArray(this.taggedValues),
      hashLambda(this.parameters, this.body),
    ]);
  }
}
