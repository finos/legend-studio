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
} from '@finos/legend-studio-shared';
import { PRIMITIVE_TYPE } from '../../../../../../../MetaModelConst';
import { FlatDataSection } from '../../../../../../../metamodels/pure/model/packageableElements/store/flatData/model/FlatDataSection';
import type { FlatDataDataType } from '../../../../../../../metamodels/pure/model/packageableElements/store/flatData/model/FlatDataDataType';
import {
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
} from '../../../../../../../metamodels/pure/model/packageableElements/store/flatData/model/FlatDataDataType';
import type { FlatData } from '../../../../../../../metamodels/pure/model/packageableElements/store/flatData/model/FlatData';
import { FlatDataProperty } from '../../../../../../../metamodels/pure/model/packageableElements/store/flatData/model/FlatDataProperty';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext';
import type { V1_FlatDataSection } from '../../../../model/packageableElements/store/flatData/model/V1_FlatDataSection';
import type {
  V1_FlatDataDataType,
  V1_FlatDataRecordField,
} from '../../../../model/packageableElements/store/flatData/model/V1_FlatDataDataType';
import {
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
} from '../../../../model/packageableElements/store/flatData/model/V1_FlatDataDataType';
import type { V1_FlatDataProperty } from '../../../../model/packageableElements/store/flatData/model/V1_FlatDataProperty';

const processFlatDataDataType = (
  type: V1_FlatDataDataType,
  parentSection: FlatDataSection,
  context: V1_GraphBuilderContext,
): FlatDataDataType => {
  const processFlatDataField = (
    field: V1_FlatDataRecordField,
  ): FlatDataRecordField => {
    assertNonEmptyString(
      field.label,
      'Flat-data record field label is missing',
    );
    assertNonNullable(
      field.flatDataDataType,
      'Flat-data record field type is missing',
    );
    assertNonNullable(
      field.optional,
      'Flat-data record field optional flag is missing',
    );
    const recordField = new FlatDataRecordField(
      field.label,
      processFlatDataDataType(field.flatDataDataType, parentSection, context),
      field.optional,
    );
    recordField.setAddress(field.address);
    return recordField;
  };
  if (type instanceof V1_FlatDataString) {
    return new FlatDataString(
      context.graph.getPrimitiveType(PRIMITIVE_TYPE.STRING),
    );
  } else if (type instanceof V1_FlatDataBoolean) {
    const booleanType = new FlatDataBoolean(
      context.graph.getPrimitiveType(PRIMITIVE_TYPE.BOOLEAN),
    );
    booleanType.trueString = type.trueString;
    booleanType.falseString = type.falseString;
    return booleanType;
  } else if (type instanceof V1_FlatDataNumber) {
    if (type instanceof V1_FlatDataInteger) {
      return new FlatDataInteger(
        context.graph.getPrimitiveType(PRIMITIVE_TYPE.INTEGER),
      );
    } else if (type instanceof V1_FlatDataDecimal) {
      return new FlatDataDecimal(
        context.graph.getPrimitiveType(PRIMITIVE_TYPE.DECIMAL),
      );
    } else if (type instanceof V1_FlatDataFloat) {
      return new FlatDataFloat(
        context.graph.getPrimitiveType(PRIMITIVE_TYPE.FLOAT),
      );
    }
    return new FlatDataNumber(
      context.graph.getPrimitiveType(PRIMITIVE_TYPE.NUMBER),
    );
  } else if (type instanceof V1_FlatDataDate) {
    let timeType: FlatDataDate;
    if (type instanceof V1_FlatDataStrictDate) {
      timeType = new FlatDataStrictDate(
        context.graph.getPrimitiveType(PRIMITIVE_TYPE.STRICTDATE),
      );
    } else if (type instanceof V1_FlatDataDateTime) {
      timeType = new FlatDataDateTime(
        context.graph.getPrimitiveType(PRIMITIVE_TYPE.DATETIME),
      );
    } else {
      timeType = new FlatDataDate(
        context.graph.getPrimitiveType(PRIMITIVE_TYPE.DATE),
      );
    }
    timeType.dateFormat = type.dateFormat;
    timeType.timeZone = type.timeZone;
    return timeType;
  } else if (type instanceof V1_FlatDataRecordType) {
    let recordType = new FlatDataRecordType();
    if (type instanceof V1_RootFlatDataRecordType) {
      recordType = new RootFlatDataRecordType(parentSection);
    }
    recordType.fields = type.fields.map((field) => processFlatDataField(field));
    return recordType;
  }
  throw new UnsupportedOperationError('Unsupported flat-data data type');
};

const processFlatDataRecordType = (
  recordType: V1_RootFlatDataRecordType,
  parentSection: FlatDataSection,
  context: V1_GraphBuilderContext,
): RootFlatDataRecordType =>
  guaranteeType(
    processFlatDataDataType(recordType, parentSection, context),
    RootFlatDataRecordType,
  );

const processFlatDataProperty = (
  property: V1_FlatDataProperty,
): FlatDataProperty => {
  assertNonEmptyString(property.name, 'Flat-data property name is missing');
  assertNonNullable(property.value, 'Flat-data property value is missing');
  assertTrue(
    isString(property.value) ||
      isNumber(property.value) ||
      isBoolean(property.value),
    `Flat-data property value must be either a string, a boolean, or a number`,
  );
  return new FlatDataProperty(property.name, property.value);
};

export const V1_processFlatDataSection = (
  section: V1_FlatDataSection,
  parentFlatData: FlatData,
  context: V1_GraphBuilderContext,
): FlatDataSection => {
  assertNonEmptyString(section.name, 'Flat-data section name is missing');
  assertNonEmptyString(section.driverId, 'Flat-data driver ID is missing');
  const flatDataSection = new FlatDataSection(
    section.driverId,
    section.name,
    parentFlatData,
  );
  flatDataSection.sectionProperties = section.sectionProperties.map(
    (sectionProperty) => processFlatDataProperty(sectionProperty),
  );
  if (section.recordType) {
    flatDataSection.recordType = processFlatDataRecordType(
      section.recordType,
      flatDataSection,
      context,
    );
  }
  return flatDataSection;
};
