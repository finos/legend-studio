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
  uuid,
  hashArray,
  deleteEntry,
  addUniqueEntry,
  changeEntry,
} from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type { Hashable } from '@finos/legend-studio-shared';
import type { Enumeration } from './Enumeration';
import type { TaggedValue } from './TaggedValue';
import type { AnnotatedElement } from './AnnotatedElement';
import type { Stubable } from '../../../model/Stubable';
import type { StereotypeReference } from './StereotypeReference';

export class Enum implements AnnotatedElement, Hashable, Stubable {
  uuid = uuid();
  owner: Enumeration;
  name: string;
  stereotypes: StereotypeReference[] = [];
  taggedValues: TaggedValue[] = [];

  constructor(name: string, owner: Enumeration) {
    makeObservable(this, {
      name: observable,
      stereotypes: observable,
      taggedValues: observable,
      setName: action,
      deleteTaggedValue: action,
      addTaggedValue: action,
      deleteStereotype: action,
      changeStereotype: action,
      addStereotype: action,
      isStub: computed,
      hashCode: computed,
    });

    this.name = name;
    this.owner = owner;
  }

  setName(value: string): void {
    this.name = value;
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

  static createStub = (parentEnumeration: Enumeration): Enum =>
    new Enum('', parentEnumeration);
  get isStub(): boolean {
    return !this.name;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.ENUM_VALUE,
      this.name,
      hashArray(this.stereotypes.map((val) => val.pointerHashCode)),
      hashArray(this.taggedValues),
    ]);
  }
}
