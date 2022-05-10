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

import { type Hashable, uuid, isNumber, hashArray } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import { Enum } from '../domain/Enum';
import type { Stubable } from '../../../../../helpers/Stubable';
import type { EnumValueReference } from '../domain/EnumValueReference';

export class SourceValue implements Stubable {
  readonly _UUID = uuid();

  value: Enum | string | number | undefined;

  constructor(value: Enum | string | number | undefined) {
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
    this.enum = enumValue;
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
              ? `${value._OWNER.path}.${value.name}`
              : value ?? '';
          }),
      ),
    ]);
  }
}
