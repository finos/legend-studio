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
import { hashArray, hashLambda } from 'Utilities/HashUtil';
import { HASH_STRUCTURE, SOURCR_ID_LABEL } from 'MetaModelConst';
import { Hashable } from 'MetaModelUtility';
import { uuid, deleteEntry, addUniqueEntry, changeEntry } from 'Utilities/GeneralUtil';
import { Multiplicity } from './Multiplicity';
import { TaggedValue } from './TaggedValue';
import { AbstractProperty, PropertyOwner } from './AbstractProperty';
import { AnnotatedElement } from './AnnotatedElement';
import { GenericType } from './GenericType';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { Type } from './Type';
import { Stubable } from 'MM/Stubable';
import { StereotypeReference } from './StereotypeReference';
import { GenericTypeReference, GenericTypeExplicitReference } from './GenericTypeReference';

export class DerivedProperty implements AbstractProperty, AnnotatedElement, Hashable, Stubable {
  uuid = uuid();
  owner: PropertyOwner; // readonly
  @observable name: string;
  genericType: GenericTypeReference;
  @observable multiplicity: Multiplicity;
  @observable stereotypes: StereotypeReference[] = [];
  @observable taggedValues: TaggedValue[] = [];
  // Lambda
  @observable.ref body?: object;
  @observable.ref parameters?: object;

  constructor(name: string, multiplicity: Multiplicity, genericType: GenericTypeReference, owner: PropertyOwner) {
    this.name = name;
    this.multiplicity = multiplicity;
    this.genericType = genericType;
    this.owner = owner;
  }

  @action setName(value: string): void { this.name = value }
  @action setGenericType(value: GenericType): void { this.genericType.setValue(value) }
  @action setMultiplicity(value: Multiplicity): void { this.multiplicity = value }
  @action deleteTaggedValue(value: TaggedValue): void { deleteEntry(this.taggedValues, value) }
  @action addTaggedValue(value: TaggedValue): void { addUniqueEntry(this.taggedValues, value) }
  @action deleteStereotype(value: StereotypeReference): void { deleteEntry(this.stereotypes, value) }
  @action changeStereotype(oldValue: StereotypeReference, newValue: StereotypeReference): void { changeEntry(this.stereotypes, oldValue, newValue) }
  @action addStereotype(value: StereotypeReference): void { addUniqueEntry(this.stereotypes, value) }
  @action setBody(value: object | undefined): void { this.body = value }
  @action setParameters(value: object | undefined): void { this.parameters = value }

  @computed get lambdaId(): string {
    // NOTE: Added the index here just in case but the order needs to be checked carefully as bugs may result from inaccurate orderings
    return `${this.owner.path}-${SOURCR_ID_LABEL.DERIVED_PROPERTY}-${this.name}[${this.owner.derivedProperties.indexOf(this)}]`;
  }

  static createStub = (type: Type, _class: Class): DerivedProperty => new DerivedProperty('', new Multiplicity(1, 1), GenericTypeExplicitReference.create(new GenericType(type)), _class);
  // the derived property is considered stub if it doesn't have a body in the lambda because without a body, it is not parsable, and should be discarded in transformer
  @computed get isStub(): boolean { return !this.body }

  @computed get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.DERIVED_PROPERTY,
      this.name,
      this.multiplicity,
      this.genericType.ownerReference.valueForSerialization,
      hashArray(this.stereotypes.map(val => val.pointerHashCode)),
      hashArray(this.taggedValues),
      hashLambda(this.parameters, this.body),
    ]);
  }
}
