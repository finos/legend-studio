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

import { observable, action, computed, makeObservable } from 'mobx';
import {
  hashArray,
  uuid,
  deleteEntry,
  addUniqueEntry,
  changeEntry,
} from '@finos/legend-studio-shared';
import { hashLambda } from '../../../../../MetaModelUtility';
import {
  CORE_HASH_STRUCTURE,
  SOURCR_ID_LABEL,
} from '../../../../../MetaModelConst';
import type { Hashable } from '@finos/legend-studio-shared';
import { Multiplicity } from './Multiplicity';
import type { TaggedValue } from './TaggedValue';
import type { AbstractProperty, PropertyOwner } from './AbstractProperty';
import type { AnnotatedElement } from './AnnotatedElement';
import { GenericType } from './GenericType';
import type { Class } from '../../../model/packageableElements/domain/Class';
import type { Type } from './Type';
import type { Stubable } from '../../../model/Stubable';
import type { StereotypeReference } from './StereotypeReference';
import type { GenericTypeReference } from './GenericTypeReference';
import { GenericTypeExplicitReference } from './GenericTypeReference';

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
  body?: object; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process lambda
  parameters?: object; // @MARKER GENERATED MODEL DISCREPANCY --- Studio does not process lambda

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
      setName: action,
      setGenericType: action,
      setMultiplicity: action,
      deleteTaggedValue: action,
      addTaggedValue: action,
      deleteStereotype: action,
      changeStereotype: action,
      addStereotype: action,
      setBody: action,
      setParameters: action,
      lambdaId: computed,
      isStub: computed,
      hashCode: computed,
    });

    this.name = name;
    this.multiplicity = multiplicity;
    this.genericType = genericType;
    this.owner = owner;
  }

  setName(value: string): void {
    this.name = value;
  }
  setGenericType(value: GenericType): void {
    this.genericType.setValue(value);
  }
  setMultiplicity(value: Multiplicity): void {
    this.multiplicity = value;
  }
  deleteTaggedValue(value: TaggedValue): void {
    deleteEntry(this.taggedValues, value);
  }
  addTaggedValue(value: TaggedValue): void {
    addUniqueEntry(this.taggedValues, value);
  }
  deleteStereotype(value: StereotypeReference): void {
    deleteEntry(this.stereotypes, value);
  }
  changeStereotype(
    oldValue: StereotypeReference,
    newValue: StereotypeReference,
  ): void {
    changeEntry(this.stereotypes, oldValue, newValue);
  }
  addStereotype(value: StereotypeReference): void {
    addUniqueEntry(this.stereotypes, value);
  }
  setBody(value: object | undefined): void {
    this.body = value;
  }
  setParameters(value: object | undefined): void {
    this.parameters = value;
  }

  get lambdaId(): string {
    // NOTE: Added the index here just in case but the order needs to be checked carefully as bugs may result from inaccurate orderings
    return `${this.owner.path}-${SOURCR_ID_LABEL.DERIVED_PROPERTY}-${
      this.name
    }[${this.owner.derivedProperties.indexOf(this)}]`;
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
      this.genericType.ownerReference.valueForSerialization,
      hashArray(this.stereotypes.map((val) => val.pointerHashCode)),
      hashArray(this.taggedValues),
      hashLambda(this.parameters, this.body),
    ]);
  }
}
