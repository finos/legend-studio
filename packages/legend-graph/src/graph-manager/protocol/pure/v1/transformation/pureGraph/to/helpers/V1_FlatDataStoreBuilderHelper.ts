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
  assertNonEmptyString,
  UnsupportedOperationError,
  assertNonNullable,
  assertTrue,
  isNumber,
  isBoolean,
  isString,
  guaranteeType,
} from '@finos/legend-shared';
import { FlatDataSection } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/flatData/model/FlatDataSection.js';
import {
  type FlatDataDataType,
  FlatDataString,
  FlatDataBoolean,
  FlatDataNumber,
  FlatDataInteger,
  FlatDataDecimal,
  FlatDataFloat,
  FlatDataDate,
  FlatDataDateTime,
  FlatDataStrictDate,
  FlatDataRecordType,
  RootFlatDataRecordType,
  FlatDataRecordField,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/store/flatData/model/FlatDataDataType.js';
import type { FlatData } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/flatData/model/FlatData.js';
import { FlatDataProperty } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/flatData/model/FlatDataProperty.js';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext.js';
import type { V1_FlatDataSection } from '../../../../model/packageableElements/store/flatData/model/V1_FlatDataSection.js';
import {
  type V1_FlatDataDataType,
  type V1_FlatDataRecordField,
  V1_FlatDataString,
  V1_FlatDataBoolean,
  V1_FlatDataNumber,
  V1_FlatDataInteger,
  V1_FlatDataDecimal,
  V1_FlatDataFloat,
  V1_FlatDataDate,
  V1_FlatDataDateTime,
  V1_FlatDataStrictDate,
  V1_FlatDataRecordType,
  V1_RootFlatDataRecordType,
} from '../../../../model/packageableElements/store/flatData/model/V1_FlatDataDataType.js';
import type { V1_FlatDataProperty } from '../../../../model/packageableElements/store/flatData/model/V1_FlatDataProperty.js';
import { PrimitiveType } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/PrimitiveType.js';

const buildFlatDataDataType = (
  type: V1_FlatDataDataType,
  parentSection: FlatDataSection,
  context: V1_GraphBuilderContext,
): FlatDataDataType => {
  const buildFlatDataField = (
    field: V1_FlatDataRecordField,
  ): FlatDataRecordField => {
    assertNonEmptyString(
      field.label,
      `Flat-data record field 'label' field is missing or empty`,
    );
    assertNonNullable(
      field.flatDataDataType,
      `Flat-data record field 'flatDataDataType' field is missing`,
    );
    assertNonNullable(
      field.optional,
      `Flat-data record field 'optional' field is missing`,
    );
    const recordField = new FlatDataRecordField(
      field.label,
      buildFlatDataDataType(field.flatDataDataType, parentSection, context),
      field.optional,
    );
    recordField.address = field.address;
    return recordField;
  };
  if (type instanceof V1_FlatDataString) {
    return new FlatDataString(PrimitiveType.STRING);
  } else if (type instanceof V1_FlatDataBoolean) {
    const booleanType = new FlatDataBoolean(PrimitiveType.BOOLEAN);
    booleanType.trueString = type.trueString;
    booleanType.falseString = type.falseString;
    return booleanType;
  } else if (type instanceof V1_FlatDataNumber) {
    if (type instanceof V1_FlatDataInteger) {
      return new FlatDataInteger(PrimitiveType.INTEGER);
    } else if (type instanceof V1_FlatDataDecimal) {
      return new FlatDataDecimal(PrimitiveType.DECIMAL);
    } else if (type instanceof V1_FlatDataFloat) {
      return new FlatDataFloat(PrimitiveType.FLOAT);
    }
    return new FlatDataNumber(PrimitiveType.NUMBER);
  } else if (type instanceof V1_FlatDataDate) {
    let timeType: FlatDataDate;
    if (type instanceof V1_FlatDataStrictDate) {
      timeType = new FlatDataStrictDate(PrimitiveType.STRICTDATE);
    } else if (type instanceof V1_FlatDataDateTime) {
      timeType = new FlatDataDateTime(PrimitiveType.DATETIME);
    } else {
      timeType = new FlatDataDate(PrimitiveType.DATE);
    }
    timeType.dateFormat = type.dateFormat;
    timeType.timeZone = type.timeZone;
    return timeType;
  } else if (type instanceof V1_FlatDataRecordType) {
    let recordType = new FlatDataRecordType();
    if (type instanceof V1_RootFlatDataRecordType) {
      recordType = new RootFlatDataRecordType(parentSection);
    }
    recordType.fields = type.fields.map((field) => buildFlatDataField(field));
    return recordType;
  }
  throw new UnsupportedOperationError('Unsupported flat-data data type');
};

const buildFlatDataRecordType = (
  recordType: V1_RootFlatDataRecordType,
  parentSection: FlatDataSection,
  context: V1_GraphBuilderContext,
): RootFlatDataRecordType =>
  guaranteeType(
    buildFlatDataDataType(recordType, parentSection, context),
    RootFlatDataRecordType,
  );

const buildFlatDataProperty = (
  property: V1_FlatDataProperty,
): FlatDataProperty => {
  assertNonEmptyString(
    property.name,
    `Flat-data property 'name' field is missing or empty`,
  );
  assertNonNullable(
    property.value,
    `Flat-data property 'value' field is missing`,
  );
  assertTrue(
    property.value.every(
      (value) => isString(value) || isNumber(value) || isBoolean(value),
    ),
    `Flat-data property value must be either a string, a boolean, or a number`,
  );
  return new FlatDataProperty(property.name, property.value);
};

export const V1_buildFlatDataSection = (
  section: V1_FlatDataSection,
  parentFlatData: FlatData,
  context: V1_GraphBuilderContext,
): FlatDataSection => {
  assertNonEmptyString(
    section.name,
    `Flat-data section 'name' field is missing or empty`,
  );
  assertNonEmptyString(
    section.driverId,
    `Flat-data section 'driverId' field is missing`,
  );
  const flatDataSection = new FlatDataSection(
    section.driverId,
    section.name,
    parentFlatData,
  );
  flatDataSection.sectionProperties = section.sectionProperties.map(
    (sectionProperty) => buildFlatDataProperty(sectionProperty),
  );
  if (section.recordType) {
    flatDataSection.recordType = buildFlatDataRecordType(
      section.recordType,
      flatDataSection,
      context,
    );
  }
  return flatDataSection;
};
