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
  createModelSchema,
  deserialize,
  primitive,
  custom,
  list,
  serialize,
  optional,
} from 'serializr';
import {
  type PlainObject,
  usingConstantValueSchema,
  deserializeArray,
  assertTrue,
  UnsupportedOperationError,
  serializeArray,
  usingModelSchema,
  customEquivalentList,
} from '@finos/legend-shared';
import { V1_FlatData } from '../../../model/packageableElements/store/flatData/model/V1_FlatData.js';
import { V1_FlatDataProperty } from '../../../model/packageableElements/store/flatData/model/V1_FlatDataProperty.js';
import {
  type V1_FlatDataDataType,
  V1_FlatDataDecimal,
  V1_FlatDataDate,
  V1_FlatDataDateTime,
  V1_FlatDataRecordType,
  V1_RootFlatDataRecordType,
  V1_FlatDataStrictDate,
  V1_FlatDataFloat,
  V1_FlatDataBoolean,
  V1_FlatDataInteger,
  V1_FlatDataNumber,
  V1_FlatDataRecordField,
  V1_FlatDataString,
} from '../../../model/packageableElements/store/flatData/model/V1_FlatDataDataType.js';
import { V1_FlatDataSection } from '../../../model/packageableElements/store/flatData/model/V1_FlatDataSection.js';

// ------------------------------------------ Flat Data ------------------------------------------

export const V1_FLAT_DATA_ELEMENT_PROTOCOL_TYPE = 'flatData';

enum V1_FlatDataDataTypeType {
  FLAT_DATA_DATE = 'date',
  FLAT_DATA_DATE_TIME = 'dateTime',
  FLAT_DATA_STRICT_DATE = 'strictDate',
  FLAT_DATA_BOOLEAN = 'boolean',
  FLAT_DATA_STRING = 'string',
  FLAT_DATA_NUMBER = 'number',
  FLAT_DATA_INTEGER = 'integer',
  FLAT_DATA_DECIMAL = 'decimal',
  FLAT_DATA_FLOAT = 'float',
  FLAT_DATA_ROOT_RECORD_TYPE = 'rootRecordType',
  FLAT_DATA_RECORD_TYPE = 'recordType',
}

const V1_flatDataBooleanSchema = createModelSchema(V1_FlatDataBoolean, {
  _type: usingConstantValueSchema(V1_FlatDataDataTypeType.FLAT_DATA_BOOLEAN),
  falseString: optional(primitive()),
  trueString: optional(primitive()),
});

const V1_flatDataStringSchema = createModelSchema(V1_FlatDataString, {
  _type: usingConstantValueSchema(V1_FlatDataDataTypeType.FLAT_DATA_STRING),
});
const V1_flatDataNumberSchema = createModelSchema(V1_FlatDataNumber, {
  _type: usingConstantValueSchema(V1_FlatDataDataTypeType.FLAT_DATA_NUMBER),
});
const V1_flatDataIntegerSchema = createModelSchema(V1_FlatDataInteger, {
  _type: usingConstantValueSchema(V1_FlatDataDataTypeType.FLAT_DATA_INTEGER),
});
const V1_flatDataFloatSchema = createModelSchema(V1_FlatDataFloat, {
  _type: usingConstantValueSchema(V1_FlatDataDataTypeType.FLAT_DATA_FLOAT),
});
const V1_flatDataDecimalSchema = createModelSchema(V1_FlatDataDecimal, {
  _type: usingConstantValueSchema(V1_FlatDataDataTypeType.FLAT_DATA_DECIMAL),
});
const V1_flatDataDateSchema = createModelSchema(V1_FlatDataDate, {
  _type: usingConstantValueSchema(V1_FlatDataDataTypeType.FLAT_DATA_DATE),
  dateFormat: custom(
    (val) => (Array.isArray(val) ? serializeArray(val, (v) => v) : [val]),
    (val) => (Array.isArray(val) ? deserializeArray(val, (v) => v) : [val]),
  ),
  timeZone: optional(primitive()),
});
const V1_flatDataDateTimeSchema = createModelSchema(V1_FlatDataDateTime, {
  _type: usingConstantValueSchema(V1_FlatDataDataTypeType.FLAT_DATA_DATE_TIME),
  dateFormat: custom(
    (val) => (Array.isArray(val) ? serializeArray(val, (v) => v) : [val]),
    (val) => (Array.isArray(val) ? deserializeArray(val, (v) => v) : [val]),
  ),
  timeZone: optional(primitive()),
});
const V1_flatDataStrictDateSchema = createModelSchema(V1_FlatDataStrictDate, {
  _type: usingConstantValueSchema(
    V1_FlatDataDataTypeType.FLAT_DATA_STRICT_DATE,
  ),
  dateFormat: custom(
    (val) => (Array.isArray(val) ? serializeArray(val, (v) => v) : [val]),
    (val) => (Array.isArray(val) ? deserializeArray(val, (v) => v) : [val]),
  ),
  timeZone: optional(primitive()),
});
const V1_flatDataRecordTypeSchema = createModelSchema(V1_FlatDataRecordType, {
  _type: usingConstantValueSchema(
    V1_FlatDataDataTypeType.FLAT_DATA_RECORD_TYPE,
  ),
  fields: list(
    custom(
      (val) => V1_serializeFlatDataRecordField(val),
      (val) => V1_deserializeFlatDataRecordField(val),
    ),
  ),
});
const V1_rootFlatDataRecordTypeSchema = createModelSchema(
  V1_RootFlatDataRecordType,
  {
    _type: usingConstantValueSchema(
      V1_FlatDataDataTypeType.FLAT_DATA_ROOT_RECORD_TYPE,
    ),
    fields: list(
      custom(
        (val) => V1_serializeFlatDataRecordField(val),
        (val) => V1_deserializeFlatDataRecordField(val),
      ),
    ),
  },
);

const V1_serializeFlatDataDataType = (
  protocol: V1_FlatDataDataType,
): PlainObject<V1_FlatDataDataType> => {
  if (protocol instanceof V1_FlatDataBoolean) {
    return serialize(V1_flatDataBooleanSchema, protocol);
  } else if (protocol instanceof V1_FlatDataString) {
    return serialize(V1_flatDataStringSchema, protocol);
  } else if (protocol instanceof V1_FlatDataInteger) {
    return serialize(V1_flatDataIntegerSchema, protocol);
  } else if (protocol instanceof V1_FlatDataDecimal) {
    return serialize(V1_flatDataDecimalSchema, protocol);
  } else if (protocol instanceof V1_FlatDataFloat) {
    return serialize(V1_flatDataFloatSchema, protocol);
    // since number is the supertype of numeric types, it has to go after
  } else if (protocol instanceof V1_FlatDataNumber) {
    return serialize(V1_flatDataNumberSchema, protocol);
  } else if (protocol instanceof V1_FlatDataDateTime) {
    return serialize(V1_flatDataDateTimeSchema, protocol);
  } else if (protocol instanceof V1_FlatDataStrictDate) {
    return serialize(V1_flatDataStrictDateSchema, protocol);
  } else if (protocol instanceof V1_FlatDataDate) {
    // since date is the supertype of date-related types, it has to go after
    return serialize(V1_flatDataDateSchema, protocol);
  } else if (protocol instanceof V1_RootFlatDataRecordType) {
    return serialize(V1_rootFlatDataRecordTypeSchema, protocol);
  } else if (protocol instanceof V1_FlatDataRecordType) {
    // since flat data record type is the super type of root flat data record type, it has to go after
    return serialize(V1_flatDataRecordTypeSchema, protocol);
  }
  throw new UnsupportedOperationError(
    `Can't serialize flat-data data type`,
    protocol,
  );
};

const V1_deserializeFlatDataDataType = (
  json: PlainObject<V1_FlatDataDataType>,
): V1_FlatDataDataType => {
  switch (json._type) {
    case V1_FlatDataDataTypeType.FLAT_DATA_BOOLEAN:
      return deserialize(V1_flatDataBooleanSchema, json);
    case V1_FlatDataDataTypeType.FLAT_DATA_STRING:
      return deserialize(V1_flatDataStringSchema, json);
    case V1_FlatDataDataTypeType.FLAT_DATA_NUMBER:
      return deserialize(V1_flatDataNumberSchema, json);
    case V1_FlatDataDataTypeType.FLAT_DATA_INTEGER:
      return deserialize(V1_flatDataIntegerSchema, json);
    case V1_FlatDataDataTypeType.FLAT_DATA_DECIMAL:
      return deserialize(V1_flatDataDecimalSchema, json);
    case V1_FlatDataDataTypeType.FLAT_DATA_FLOAT:
      return deserialize(V1_flatDataFloatSchema, json);
    case V1_FlatDataDataTypeType.FLAT_DATA_DATE:
      return deserialize(V1_flatDataDateSchema, json);
    case V1_FlatDataDataTypeType.FLAT_DATA_DATE_TIME:
      return deserialize(V1_flatDataDateTimeSchema, json);
    case V1_FlatDataDataTypeType.FLAT_DATA_STRICT_DATE:
      return deserialize(V1_flatDataStrictDateSchema, json);
    case V1_FlatDataDataTypeType.FLAT_DATA_RECORD_TYPE:
      return deserialize(V1_flatDataRecordTypeSchema, json);
    case V1_FlatDataDataTypeType.FLAT_DATA_ROOT_RECORD_TYPE:
      return deserialize(V1_rootFlatDataRecordTypeSchema, json);
    default:
      throw new UnsupportedOperationError(
        `Can't deserialize flat-data data type of type '${json._type}'`,
      );
  }
};

const V1_flatDataRecordFieldModelSchema = createModelSchema(
  V1_FlatDataRecordField,
  {
    address: optional(primitive()),
    flatDataDataType: custom(
      (val) => V1_serializeFlatDataDataType(val),
      (val) => V1_deserializeFlatDataDataType(val),
    ),
    label: primitive(),
    optional: primitive(),
  },
);

function V1_serializeFlatDataRecordField(
  protocol: V1_FlatDataRecordField,
): PlainObject<V1_FlatDataRecordField> {
  return serialize(V1_flatDataRecordFieldModelSchema, protocol);
}

function V1_deserializeFlatDataRecordField(
  json: PlainObject<V1_FlatDataRecordField>,
): V1_FlatDataRecordField {
  return deserialize(V1_flatDataRecordFieldModelSchema, json);
}

const V1_flatDataPropertyModelSchema = createModelSchema(V1_FlatDataProperty, {
  name: primitive(),
  value: custom(
    (values) =>
      Array.isArray(values)
        ? serializeArray(values, (value) => value)
        : [values],
    (values) => {
      if (Array.isArray(values)) {
        return deserializeArray(values, (value) => {
          assertTrue(
            typeof value === 'boolean' ||
              typeof value === 'string' ||
              typeof value === 'number',
            `Can't deserialize flat-data property value '${value}'`,
          );
          return value;
        });
      } else {
        return [values];
      }
    },
  ),
});

const V1_flatDataSectionSchema = createModelSchema(V1_FlatDataSection, {
  driverId: primitive(),
  name: primitive(),
  recordType: usingModelSchema(V1_rootFlatDataRecordTypeSchema),
  sectionProperties: list(usingModelSchema(V1_flatDataPropertyModelSchema)),
});

function V1_flatDataSectionDeserializer(value: {
  driverId: string;
  name: string;
  recordType?: V1_RootFlatDataRecordType | undefined;
  recordTypes?: V1_RootFlatDataRecordType[];
  sectionProperties: V1_FlatDataProperty[];
}): V1_FlatDataSection {
  if (value.recordTypes && value.recordTypes.length > 0) {
    value.recordType = value.recordTypes[0];
  }
  return deserialize(V1_flatDataSectionSchema, value);
}

export const V1_flatDataModelSchema = createModelSchema(V1_FlatData, {
  _type: usingConstantValueSchema(V1_FLAT_DATA_ELEMENT_PROTOCOL_TYPE),
  includedStores: customEquivalentList(),
  name: primitive(),
  package: primitive(),
  sections: list(
    custom(
      (value) => serialize(V1_flatDataSectionSchema, value),
      V1_flatDataSectionDeserializer,
    ),
  ),
});
