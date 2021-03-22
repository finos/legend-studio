/**
 * Copyright Goldman Sachs
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
  IllegalStateError,
  guaranteeNonNullable,
  addUniqueEntry,
  deleteEntry,
  changeEntry,
} from '@finos/legend-studio-shared';
import type { Hashable } from '@finos/legend-studio-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import { DataType } from './DataType';
import type { Enum } from './Enum';
import type { Stubable } from '../../../model/Stubable';
import { isStubArray } from '../../../model/Stubable';
import type { PackageableElementVisitor } from '../../../model/packageableElements/PackageableElement';
import type { Type } from './Type';
import type { StereotypeReference } from '../../../model/packageableElements/domain/StereotypeReference';
import type { TaggedValue } from '../../../model/packageableElements/domain/TaggedValue';

export class Enumeration extends DataType implements Hashable, Stubable {
  values: Enum[] = [];
  stereotypes: StereotypeReference[] = [];
  taggedValues: TaggedValue[] = [];

  constructor(name: string) {
    super(name);

    makeObservable(this, {
      values: observable,
      stereotypes: observable,
      taggedValues: observable,
      addValue: action,
      deleteValue: action,
      deleteTaggedValue: action,
      addTaggedValue: action,
      deleteStereotype: action,
      changeStereotype: action,
      addStereotype: action,
      isStub: computed,
      hashCode: computed({ keepAlive: true }),
    });
  }

  getValueNames = (): string[] =>
    this.values.map((value) => value.name).filter(Boolean);
  getValue = (name: string): Enum =>
    guaranteeNonNullable(
      this.values.find((value) => value.name === name),
      `Can't find enum value '${name}' in enumeration '${this.path}'`,
    );

  addValue(value: Enum): void {
    addUniqueEntry(this.values, value);
  }
  deleteValue(value: Enum): void {
    deleteEntry(this.values, value);
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

  static createStub = (): Enumeration => new Enumeration('');
  get isStub(): boolean {
    return super.isStub && isStubArray(this.values);
  }

  isSuperType(type: Type): boolean {
    return false;
  }
  isSubType(type: Type): boolean {
    return false;
  }

  get hashCode(): string {
    if (this._isDisposed) {
      throw new IllegalStateError(`Element '${this.path}' is already disposed`);
    }
    if (this._isImmutable) {
      throw new IllegalStateError(
        `Readonly element '${this.path}' is modified`,
      );
    }
    return hashArray([
      CORE_HASH_STRUCTURE.ENUMERATION,
      super.hashCode,
      hashArray(this.values),
      hashArray(
        this.stereotypes.map((stereotype) => stereotype.pointerHashCode),
      ),
      hashArray(this.taggedValues),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_Enumeration(this);
  }
}
