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
import { IllegalStateError, guaranteeNonNullable, addUniqueEntry, deleteEntry, changeEntry } from 'Utilities/GeneralUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE } from 'MetaModelConst';
import { DataType } from './DataType';
import { Enum } from './Enum';
import { isStubArray, Stubable } from 'MM/Stubable';
import { PackageableElementVisitor } from 'MM/model/packageableElements/PackageableElement';
import { Type } from './Type';
import { StereotypeReference } from 'MM/model/packageableElements/domain/StereotypeReference';
import { TaggedValue } from 'MM/model/packageableElements/domain/TaggedValue';

export class Enumeration extends DataType implements Hashable, Stubable {
  @observable values: Enum[] = [];
  @observable stereotypes: StereotypeReference[] = [];
  @observable taggedValues: TaggedValue[] = [];

  getValueNames = (): string[] => this.values.map(value => value.name).filter(Boolean);
  getValue = (name: string): Enum => guaranteeNonNullable(this.values.find(value => value.name === name), `Can't find enum value '${name}' in enumeration '${this.path}'`);

  @action addValue(value: Enum): void { addUniqueEntry(this.values, value) }
  @action deleteValue(value: Enum): void { deleteEntry(this.values, value) }
  @action deleteTaggedValue(value: TaggedValue): void { deleteEntry(this.taggedValues, value) }
  @action addTaggedValue(value: TaggedValue): void { addUniqueEntry(this.taggedValues, value) }
  @action deleteStereotype(value: StereotypeReference): void { deleteEntry(this.stereotypes, value) }
  @action changeStereotype(oldValue: StereotypeReference, newValue: StereotypeReference): void { changeEntry(this.stereotypes, oldValue, newValue) }
  @action addStereotype(value: StereotypeReference): void { addUniqueEntry(this.stereotypes, value) }

  static createStub = (): Enumeration => new Enumeration('');
  @computed get isStub(): boolean { return super.isStub && isStubArray(this.values) }

  isSuperType(type: Type): boolean { return false }
  isSubType(type: Type): boolean { return false }

  @computed({ keepAlive: true }) get hashCode(): string {
    if (this._isDisposed) { throw new IllegalStateError(`Element '${this.path}' is already disposed`) }
    if (this._isImmutable) { throw new IllegalStateError(`Readonly element '${this.path}' is modified`) }
    return hashArray([
      HASH_STRUCTURE.ENUMERATION,
      super.hashCode,
      hashArray(this.values),
      hashArray(this.stereotypes.map(stereotype => stereotype.pointerHashCode)),
      hashArray(this.taggedValues),
    ]);
  }

  accept_PackageableElementVisitor<T>(visitor: PackageableElementVisitor<T>): T {
    return visitor.visit_Enumeration(this);
  }
}
