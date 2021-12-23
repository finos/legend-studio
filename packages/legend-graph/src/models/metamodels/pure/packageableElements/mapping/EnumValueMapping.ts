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
  type Hashable,
  uuid,
  isNumber,
  hashArray,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import {
  CORE_HASH_STRUCTURE,
  PRIMITIVE_TYPE,
} from '../../../../../MetaModelConst';
import { Enum } from '../domain/Enum';
import type { Stubable } from '../../../../../helpers/Stubable';
import { Type } from '../domain/Type';
import { Enumeration } from '../domain/Enumeration';
import type { EnumValueReference } from '../domain/EnumValueReference';

export class SourceValue implements Stubable {
  uuid = uuid();
  value: Enum | string | number | undefined;

  constructor(value: Enum | string | number | undefined) {
    makeObservable(this, {
      value: observable,
      setValue: action,
      isStub: computed,
    });

    this.value = value;
  }

  setValue(value: Enum | string | number | undefined): void {
    this.value = value;
  }

  get isStub(): boolean {
    return this.value === undefined;
  }
}

export class EnumValueMapping implements Hashable, Stubable {
  enum: EnumValueReference;
  sourceValues: SourceValue[] = [];

  constructor(enumValue: EnumValueReference) {
    makeObservable(this, {
      sourceValues: observable,
      addSourceValue: action,
      setSourceValues: action,
      deleteSourceValue: action,
      updateSourceValue: action,
      isStub: computed,
      hashCode: computed,
    });

    this.enum = enumValue;
  }

  addSourceValue(): void {
    this.sourceValues.push(new SourceValue(undefined));
  }
  setSourceValues(value: SourceValue[]): void {
    this.sourceValues = value;
  }
  deleteSourceValue(idx: number): void {
    this.sourceValues.splice(idx, 1);
  }
  updateSourceValue(
    idx: number,
    val: Enum | string | undefined,
    sourceType: Type | undefined,
  ): void {
    const sourceValue = guaranteeNonNullable(this.sourceValues[idx]);
    // If the source type is an enumeration but the value does NOT match an enum value (most likely user is mid typing an enum value)
    // we move on to update the source value with the string value
    if (
      sourceType instanceof Enumeration &&
      typeof val === 'string' &&
      sourceType.getValueNames().includes(val)
    ) {
      sourceValue.setValue(sourceType.getValue(val));
    } else {
      // Here we update the source values depending on the source type.
      sourceValue.setValue(
        sourceType instanceof Type && sourceType.name === PRIMITIVE_TYPE.INTEGER
          ? parseInt(val as string)
          : val,
      );
    }
  }

  get isStub(): boolean {
    return !this.sourceValues.filter((value) => !value.isStub).length;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.ENUM_VALUE_MAPPING,
      this.enum.value.name,
      hashArray(
        this.sourceValues
          .filter((value) => !value.isStub)
          .map((sourceValue) => {
            const value = sourceValue.value;
            return isNumber(value)
              ? value.toString()
              : value instanceof Enum
              ? `${value.owner.path}.${value.name}`
              : value ?? '';
          }),
      ),
    ]);
  }
}
