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
  hashArray,
  UnsupportedOperationError,
  type Hashable,
} from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import { PRIMITIVE_TYPE } from '../../../../../../../graph/MetaModelConst.js';

export abstract class V1_EnumValueMappingSourceValue {
  value!: unknown; // Any
}

export class V1_EnumValueMappingStringSourceValue extends V1_EnumValueMappingSourceValue {
  declare value: string;
}

export class V1_EnumValueMappingIntegerSourceValue extends V1_EnumValueMappingSourceValue {
  declare value: number;
}

export class V1_EnumValueMappingEnumSourceValue extends V1_EnumValueMappingSourceValue {
  declare value: string;
  enumeration!: string;
}

export const V1_getEnumValueMappingSourceValueType = (
  sourceValue: V1_EnumValueMappingSourceValue,
): string => {
  if (sourceValue instanceof V1_EnumValueMappingStringSourceValue) {
    return PRIMITIVE_TYPE.STRING;
  } else if (sourceValue instanceof V1_EnumValueMappingIntegerSourceValue) {
    return PRIMITIVE_TYPE.INTEGER;
  } else if (sourceValue instanceof V1_EnumValueMappingEnumSourceValue) {
    return sourceValue.enumeration;
  }
  throw new UnsupportedOperationError(
    `Can't classify enum value mapping source value`,
    sourceValue,
  );
};

export class V1_EnumValueMapping implements Hashable {
  enumValue!: string;
  sourceValues: V1_EnumValueMappingSourceValue[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.ENUM_VALUE_MAPPING,
      this.enumValue,
      hashArray(
        this.sourceValues.map((sourceValue) =>
          sourceValue instanceof V1_EnumValueMappingIntegerSourceValue
            ? sourceValue.value.toString()
            : sourceValue instanceof V1_EnumValueMappingEnumSourceValue
              ? `${sourceValue.enumeration}.${sourceValue.value}`
              : (sourceValue.value as string),
        ),
      ),
    ]);
  }
}
