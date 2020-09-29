/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { observable, action, computed } from 'mobx';
import { hashArray } from 'Utilities/HashUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { uuid, deleteEntry, addUniqueEntry, changeEntry } from 'Utilities/GeneralUtil';
import { GenericTypeReference, GenericTypeExplicitReference } from 'MM/model/packageableElements/domain/GenericTypeReference';
import { Multiplicity } from './Multiplicity';
import { GenericType } from './GenericType';
import { Class } from './Class';
import { AbstractProperty, PropertyOwner } from './AbstractProperty';
import { AnnotatedElement } from './AnnotatedElement';
import { TaggedValue } from './TaggedValue';
import { Stubable, isStubArray } from 'MM/Stubable';
import { Type } from './Type';
import { StereotypeReference } from './StereotypeReference';

export class Property implements AbstractProperty, AnnotatedElement, Hashable, Stubable {
  uuid = uuid();
  owner: PropertyOwner; // readonly
  @observable name: string;
  @observable multiplicity: Multiplicity;
  genericType: GenericTypeReference;
  @observable stereotypes: StereotypeReference[] = [];
  @observable taggedValues: TaggedValue[] = [];

  constructor(name: string, multiplicity: Multiplicity, genericType: GenericTypeReference, owner: PropertyOwner) {
    this.name = name;
    this.multiplicity = multiplicity;
    this.genericType = genericType;
    this.owner = owner;
  }

  @action setName(value: string): void { this.name = value }
  @action setGenericType(value: GenericType): void { this.genericType.setValue(value) }
  @action setMultiplicity(value: Multiplicity): void { this.multiplicity = value }
  @action addTaggedValue(value: TaggedValue): void { addUniqueEntry(this.taggedValues, value) }
  @action deleteTaggedValue(value: TaggedValue): void { deleteEntry(this.taggedValues, value) }
  @action addStereotype(value: StereotypeReference): void { addUniqueEntry(this.stereotypes, value) }
  @action changeStereotype(oldValue: StereotypeReference, newValue: StereotypeReference): void { changeEntry(this.stereotypes, oldValue, newValue) }
  @action deleteStereotype(value: StereotypeReference): void { deleteEntry(this.stereotypes, value) }

  static createStub = (type: Type, _class: Class): Property => new Property('', new Multiplicity(1, 1), GenericTypeExplicitReference.create(new GenericType(type)), _class);
  @computed get isStub(): boolean { return !this.name && this.genericType.isStub && isStubArray(this.stereotypes) && isStubArray(this.taggedValues) }

  @computed get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.PROPERTY,
      this.name,
      this.multiplicity,
      this.genericType.ownerReference.valueForSerialization,
      hashArray(this.stereotypes.map(val => val.pointerHashCode)),
      hashArray(this.taggedValues)
    ]);
  }
}
