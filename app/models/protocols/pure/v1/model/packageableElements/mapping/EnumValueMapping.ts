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

import { serializable, list, custom, SKIP, deserialize } from 'serializr';
import { hashArray } from 'Utilities/HashUtil';
import { isNonNullable, assertTrue, UnsupportedOperationError, guaranteeType, IllegalStateError, shallowStringify, guaranteeIsString, guaranteeIsNumber } from 'Utilities/GeneralUtil';
import { Hashable } from 'MetaModelUtility';
import { HASH_STRUCTURE, PRIMITIVE_TYPE } from 'MetaModelConst';
import { EnumerationMapping } from './EnumerationMapping';

export enum EnumValueMappingSourceValueType {
  STRING = 'stringSourceValue',
  INTEGER = 'integerSourceValue',
  ENUM = 'enumSourceValue',
}

export abstract class EnumValueMappingSourceValue {
  @serializable _type!: EnumValueMappingSourceValueType;
  value!: unknown; // Any
}

export class EnumValueMappingStringSourceValue extends EnumValueMappingSourceValue {
  @serializable _type!: EnumValueMappingSourceValueType; // remove when we use visitor for deserializer - this is a `serilizr` polymorphism bug - see https://github.com/mobxjs/serializr/issues/98
  @serializable value!: string;
}

export class EnumValueMappingIntegerSourceValue extends EnumValueMappingSourceValue {
  @serializable _type!: EnumValueMappingSourceValueType; // remove when we use visitor for deserializer - this is a `serilizr` polymorphism bug - see https://github.com/mobxjs/serializr/issues/98
  @serializable value!: number;
}

export class EnumValueMappingEnumSourceValue extends EnumValueMappingSourceValue {
  @serializable _type!: EnumValueMappingSourceValueType; // remove when we use visitor for deserializer - this is a `serilizr` polymorphism bug - see https://github.com/mobxjs/serializr/issues/98
  @serializable enumeration!: string
  @serializable value!: string;
}

export const getEnumValueMappingSourceValueType = (sourceValue: EnumValueMappingSourceValue): string => {
  switch (sourceValue._type) {
    case EnumValueMappingSourceValueType.STRING: return PRIMITIVE_TYPE.STRING;
    case EnumValueMappingSourceValueType.INTEGER: return PRIMITIVE_TYPE.INTEGER;
    default: return guaranteeType(sourceValue, EnumValueMappingEnumSourceValue).enumeration;
  }
};

export class EnumValueMapping implements Hashable {
  @serializable enumValue!: string;
  @serializable(list(custom(
    () => SKIP,
    (value, context) => {
      if (context.parentContext?.target) {
        // NOTE: we cannot use `instanceof` here since it will cause circular dependency
        const parentEnumerationMapping = context.parentContext.target as EnumerationMapping;
        if (parentEnumerationMapping.sourceType) {
          switch (parentEnumerationMapping.sourceType) {
            case PRIMITIVE_TYPE.STRING: {
              const sourceValue = new EnumValueMappingStringSourceValue();
              sourceValue.value = guaranteeIsString(value, 'Enum value mapping string source value must be a string');
              return sourceValue;
            }
            case PRIMITIVE_TYPE.INTEGER: {
              const sourceValue = new EnumValueMappingIntegerSourceValue();
              sourceValue.value = guaranteeIsNumber(value, 'Enum value mapping integer source value must be a number');
              return sourceValue;
            }
            default: {
              const sourceValue = new EnumValueMappingEnumSourceValue();
              assertTrue(isNonNullable(parentEnumerationMapping.sourceType) && typeof parentEnumerationMapping.sourceType === 'string', 'Enum value mapping enumeration source value enumeration must be a string');
              sourceValue.enumeration = parentEnumerationMapping.sourceType;
              sourceValue.value = guaranteeIsString(value, 'Enum value mapping enumeration source value must be a string');
              return sourceValue;
            }
          }
        }
        switch (value._type) {
          case EnumValueMappingSourceValueType.STRING: return deserialize(EnumValueMappingStringSourceValue, value);
          case EnumValueMappingSourceValueType.INTEGER: return deserialize(EnumValueMappingIntegerSourceValue, value);
          case EnumValueMappingSourceValueType.ENUM: return deserialize(EnumValueMappingEnumSourceValue, value);
          // NOTE: we might need to work on this since this is not backward compatible
          default: throw new UnsupportedOperationError(`Unsupported enum value mapping source value type '${value._type}'`);
        }
      }
      throw new IllegalStateError(`Deserialization parent context is not defined. Got: ${shallowStringify(context)}`);
    }
  ))) sourceValues: EnumValueMappingSourceValue[] = [];

  get hashCode(): string {
    return hashArray([
      HASH_STRUCTURE.ENUM_VALUE_MAPPING,
      this.enumValue,
      hashArray(this.sourceValues.map(sourceValue => sourceValue instanceof EnumValueMappingIntegerSourceValue
        ? sourceValue.value.toString()
        : sourceValue instanceof EnumValueMappingEnumSourceValue
          ? `${sourceValue.enumeration}.${sourceValue.value}`
          : sourceValue.value as string
      ))
    ]);
  }
}
