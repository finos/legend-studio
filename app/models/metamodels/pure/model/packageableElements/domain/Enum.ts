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
import { uuid, deleteEntry, addUniqueEntry, changeEntry } from 'Utilities/GeneralUtil';
import { hashArray } from 'Utilities/HashUtil';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { Hashable } from 'MetaModelUtility';
import { Enumeration } from './Enumeration';
import { TaggedValue } from './TaggedValue';
import { AnnotatedElement } from './AnnotatedElement';
import { Stubable } from 'MM/Stubable';
import { StereotypeReference } from './StereotypeReference';

export class Enum implements AnnotatedElement, Hashable, Stubable {
  uuid = uuid();
  owner: Enumeration;
  @observable name: string;
  @observable stereotypes: StereotypeReference[] = [];
  @observable taggedValues: TaggedValue[] = [];

  constructor(name: string, owner: Enumeration) {
    this.name = name;
    this.owner = owner;
  }

  @action setName(value: string): void { this.name = value }
  @action deleteTaggedValue(value: TaggedValue): void { deleteEntry(this.taggedValues, value) }
  @action addTaggedValue(value: TaggedValue): void { addUniqueEntry(this.taggedValues, value) }
  @action deleteStereotype(value: StereotypeReference): void { deleteEntry(this.stereotypes, value) }
  @action changeStereotype(oldValue: StereotypeReference, newValue: StereotypeReference): void { changeEntry(this.stereotypes, oldValue, newValue) }
  @action addStereotype(value: StereotypeReference): void { addUniqueEntry(this.stereotypes, value) }

  static createStub = (parentEnumeration: Enumeration): Enum => new Enum('', parentEnumeration);
  @computed get isStub(): boolean { return !this.name }

  @computed get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.ENUM_VALUE,
      this.name,
      hashArray(this.stereotypes.map(val => val.pointerHashCode)),
      hashArray(this.taggedValues)
    ]);
  }
}
