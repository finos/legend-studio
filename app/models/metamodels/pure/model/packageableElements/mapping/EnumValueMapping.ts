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
import { uuid, isNumber } from 'Utilities/GeneralUtil';
import { hashArray } from 'Utilities/HashUtil';
import { HASH_STRUCTURE, PRIMITIVE_TYPE } from 'MetaModelConst';
import { Hashable } from 'MetaModelUtility';
import { Enum } from 'MM/model/packageableElements/domain/Enum';
import { Stubable } from 'MM/Stubable';
import { Type } from 'MM/model/packageableElements/domain/Type';
import { Enumeration } from 'MM/model/packageableElements/domain/Enumeration';
import { EnumValueReference } from 'MM/model/packageableElements/domain/EnumValueReference';

export class SourceValue implements Stubable {
  uuid = uuid();
  @observable value: Enum | string | number | undefined;

  constructor(value: Enum | string | number | undefined) {
    this.value = value;
  }

  @action setValue(value: Enum | string | number | undefined): void { this.value = value }

  @computed get isStub(): boolean { return this.value === undefined }
}

export class EnumValueMapping implements Hashable, Stubable {
  enum: EnumValueReference;
  @observable sourceValues: SourceValue[] = [];

  constructor(enumValue: EnumValueReference) {
    this.enum = enumValue;
  }

  @action addSourceValue(): void { this.sourceValues.push(new SourceValue(undefined)) }
  @action setSourceValues(value: SourceValue[]): void { this.sourceValues = value }
  @action deleteSourceValue(idx: number): void { this.sourceValues.splice(idx, 1) }
  @action updateSourceValue(idx: number, val: Enum | string | undefined, sourceType: Type | undefined): void {
    const sourceValue = this.sourceValues[idx];
    // If the source type is an enumeration but the value does NOT match an enum value (most likely user is mid typing an enum value)
    // we move on to update the source value with the string value
    if (sourceType instanceof Enumeration && typeof val === 'string' && sourceType.getValueNames().includes(val)) {
      sourceValue.setValue(sourceType.getValue(val));
    } else {
      // Here we update the source values depending on the source type.
      sourceValue.setValue(sourceType instanceof Type && sourceType.name === PRIMITIVE_TYPE.INTEGER ? parseInt(val as string) : val);
    }
  }

  @computed get isStub(): boolean { return !this.sourceValues.filter(value => !value.isStub).length }

  @computed get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.ENUM_VALUE_MAPPING,
      this.enum.value.name,
      hashArray(this.sourceValues.filter(value => !value.isStub).map(
        sourceValue => {
          const value = sourceValue.value;
          return isNumber(value)
            ? value.toString()
            : value instanceof Enum
              ? `${value.owner.path}.${value.name}`
              : value ?? '';
        }
      ))
    ]);
  }
}
