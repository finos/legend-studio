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

import {
  type Hashable,
  hashArray,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import { DataType } from './DataType';
import type { Enum } from './Enum';
import { type Stubable, isStubArray } from '../../../../../helpers/Stubable';
import type { PackageableElementVisitor } from '../PackageableElement';
import type { Type } from './Type';
import type { StereotypeReference } from './StereotypeReference';
import type { TaggedValue } from './TaggedValue';

export class Enumeration extends DataType implements Hashable, Stubable {
  values: Enum[] = [];
  stereotypes: StereotypeReference[] = [];
  taggedValues: TaggedValue[] = [];

  getValueNames = (): string[] =>
    this.values.map((value) => value.name).filter(Boolean);
  getValue = (name: string): Enum =>
    guaranteeNonNullable(
      this.values.find((value) => value.name === name),
      `Can't find enum value '${name}' in enumeration '${this.path}'`,
    );
  static createStub = (): Enumeration => new Enumeration('');

  override get isStub(): boolean {
    return super.isStub && isStubArray(this.values);
  }

  isSuperType(type: Type): boolean {
    return false;
  }

  isSubType(type: Type): boolean {
    return false;
  }

  protected override get _elementHashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.ENUMERATION,
      this.path,
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
