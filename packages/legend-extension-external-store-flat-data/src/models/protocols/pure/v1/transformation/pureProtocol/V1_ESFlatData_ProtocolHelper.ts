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
  alias,
  SKIP,
} from 'serializr';
import {
  type PlainObject,
  usingConstantValueSchema,
  deserializeArray,
  assertTrue,
  UnsupportedOperationError,
  serializeArray,
  usingModelSchema,
} from '@finos/legend-shared';
import { V1_FlatDataProperty } from '../../model/store/flatData/model/V1_ESFlataData_FlatDataProperty.js';
import { V1_FlatData } from '../../model/store/flatData/model/V1_ESFlatData_FlatData.js';
import {
  V1_FlatDataBoolean,
  V1_FlatDataString,
  V1_FlatDataNumber,
  V1_FlatDataInteger,
  V1_FlatDataFloat,
  V1_FlatDataDecimal,
  V1_FlatDataDate,
  V1_FlatDataDateTime,
  V1_FlatDataStrictDate,
  V1_FlatDataRecordType,
  V1_RootFlatDataRecordType,
  type V1_FlatDataDataType,
  V1_FlatDataRecordField,
} from '../../model/store/flatData/model/V1_ESFlatData_FlatDataDataType.js';
import { V1_FlatDataSection } from '../../model/store/flatData/model/V1_ESFlatData_FlatDataSection.js';
import { V1_FlatDataConnection } from '../../model/store/flatData/connection/V1_ESFlatData_FlatDataConnection.js';
import {
  V1_localMappingPropertyInfoModelSchema,
  V1_packageableElementPointerDeserializerSchema,
  V1_propertyPointerModelSchema,
  V1_rawLambdaModelSchema,
} from '@finos/legend-graph';
import type { V1_AbstractFlatDataPropertyMapping } from '../../model/store/flatData/mapping/V1_ESFlatData_AbstractFlatDataPropertyMapping.js';
import { V1_EmbeddedFlatDataPropertyMapping } from '../../model/store/flatData/mapping/V1_ESFlatData_EmbeddedFlatDataPropertyMapping.js';
import { V1_FlatDataPropertyMapping } from '../../model/store/flatData/mapping/V1_ESFlatData_FlatDataPropertyMapping.js';
import { V1_RootFlatDataClassMapping } from '../../model/store/flatData/mapping/V1_ESFlatData_RootFlatDataClassMapping.js';
import { V1_FlatDataInputData } from '../../model/store/flatData/mapping/V1_ESFlatData_FlatDataInputData.js';

// ------------------------------------------ Flat Data ------------------------------------------

export const V1_FLAT_DATA_ELEMENT_PROTOCOL_TYPE = 'flatData';
export const V1_FLAT_DATA_CLASS_MAPPING_PROTOCOL_TYPE = 'flatData';
export const V1_FLAT_DATA_INPUT_DATA_PROTOCOL_TYPE = 'flatData';
export const V1_FLAT_DATA_PROPERTY_MAPPING_PROTOCOL_TYPE =
  'flatDataPropertyMapping';
export const V1_EMBEDDED_FLAT_DATA_PROPERTY_MAPPING_PROTOCOL_TYPE =
  'embeddedFlatDataPropertyMapping';
export const V1_FLAT_DATA_CONNECTION_PROTOCOL_TYPE = 'FlatDataConnection';

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
  dateFormat: optional(primitive()),
  timeZone: optional(primitive()),
});

const V1_flatDataDateTimeSchema = createModelSchema(V1_FlatDataDateTime, {
  _type: usingConstantValueSchema(V1_FlatDataDataTypeType.FLAT_DATA_DATE_TIME),
  dateFormat: optional(primitive()),
  timeZone: optional(primitive()),
});

const V1_flatDataStrictDateSchema = createModelSchema(V1_FlatDataStrictDate, {
  _type: usingConstantValueSchema(
    V1_FlatDataDataTypeType.FLAT_DATA_STRICT_DATE,
  ),
  dateFormat: optional(primitive()),
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
    (val) => val,
    (value: boolean | string | number): boolean | string | number => {
      assertTrue(
        typeof value === 'boolean' ||
          typeof value === 'string' ||
          typeof value === 'number',
        `Can't deserialize flat-data property value '${value}'`,
      );
      return value;
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
  includedStores: custom(
    (values) =>
      serializeArray(values, (value: string) => value, {
        skipIfEmpty: true,
        INTERNAL__forceReturnEmptyInTest: true,
      }),
    (values) =>
      deserializeArray(values, (value) => value, {
        skipIfEmpty: false,
      }),
  ),
  name: primitive(),
  package: primitive(),
  sections: list(
    custom(
      (value) => serialize(V1_flatDataSectionSchema, value),
      V1_flatDataSectionDeserializer,
    ),
  ),
});

// ------------------------------------- Flat-data Mapping -------------------------------------

const flatDataPropertyMappingModelSchema = createModelSchema(
  V1_FlatDataPropertyMapping,
  {
    _type: usingConstantValueSchema(
      V1_FLAT_DATA_PROPERTY_MAPPING_PROTOCOL_TYPE,
    ),
    enumMappingId: optional(primitive()),
    localMappingProperty: usingModelSchema(
      V1_localMappingPropertyInfoModelSchema,
    ),
    property: usingModelSchema(V1_propertyPointerModelSchema),
    source: primitive(),
    target: optional(primitive()),
    transform: usingModelSchema(V1_rawLambdaModelSchema),
  },
);

const embeddedFlatDataPropertyMappingModelSchema = createModelSchema(
  V1_EmbeddedFlatDataPropertyMapping,
  {
    _type: usingConstantValueSchema(
      V1_EMBEDDED_FLAT_DATA_PROPERTY_MAPPING_PROTOCOL_TYPE,
    ),
    class: primitive(),
    id: optional(primitive()),
    localMappingProperty: usingModelSchema(
      V1_localMappingPropertyInfoModelSchema,
    ),
    property: usingModelSchema(V1_propertyPointerModelSchema),
    propertyMappings: list(
      custom(
        (val) => V1_serializeFlatDataPropertyMapping(val),
        (val) => V1_deserializeFlatDataPropertyMapping(val),
      ),
    ),
    root: primitive(),
    source: primitive(),
    target: optional(primitive()),
  },
);

function V1_serializeFlatDataPropertyMapping(
  protocol: V1_AbstractFlatDataPropertyMapping,
): PlainObject<V1_AbstractFlatDataPropertyMapping> | typeof SKIP {
  if (protocol instanceof V1_FlatDataPropertyMapping) {
    return serialize(flatDataPropertyMappingModelSchema, protocol);
  } else if (protocol instanceof V1_EmbeddedFlatDataPropertyMapping) {
    return serialize(embeddedFlatDataPropertyMappingModelSchema, protocol);
  }
  return SKIP;
}

function V1_deserializeFlatDataPropertyMapping(
  json: PlainObject<V1_AbstractFlatDataPropertyMapping>,
): V1_AbstractFlatDataPropertyMapping | typeof SKIP {
  switch (json._type) {
    case V1_FLAT_DATA_PROPERTY_MAPPING_PROTOCOL_TYPE:
      return deserialize(flatDataPropertyMappingModelSchema, json);
    case V1_EMBEDDED_FLAT_DATA_PROPERTY_MAPPING_PROTOCOL_TYPE:
      return deserialize(embeddedFlatDataPropertyMappingModelSchema, json);
    default:
      return SKIP;
  }
}

export const V1_rootFlatDataClassMappingModelSchema = createModelSchema(
  V1_RootFlatDataClassMapping,
  {
    _type: usingConstantValueSchema(V1_FLAT_DATA_CLASS_MAPPING_PROTOCOL_TYPE),
    class: primitive(),
    extendsClassMappingId: optional(primitive()),
    filter: usingModelSchema(V1_rawLambdaModelSchema),
    flatData: primitive(),
    id: optional(primitive()),
    propertyMappings: list(
      custom(
        (val) => V1_serializeFlatDataPropertyMapping(val),
        (val) => V1_deserializeFlatDataPropertyMapping(val),
      ),
    ),
    root: primitive(),
    sectionName: primitive(),
  },
);

// ------------------------------------- Flat-data Connection -------------------------------------

export const V1_flatDataConnectionModelSchema = createModelSchema(
  V1_FlatDataConnection,
  {
    _type: usingConstantValueSchema(V1_FLAT_DATA_CONNECTION_PROTOCOL_TYPE),
    store: alias('element', primitive()),
    url: primitive(),
  },
);

// ------------------------------------- Flat-data Input data -------------------------------------

export const V1_flatDataInputData = createModelSchema(V1_FlatDataInputData, {
  _type: usingConstantValueSchema(V1_FLAT_DATA_INPUT_DATA_PROTOCOL_TYPE),
  data: primitive(),
  sourceFlatData: usingModelSchema(
    V1_packageableElementPointerDeserializerSchema,
  ),
});
