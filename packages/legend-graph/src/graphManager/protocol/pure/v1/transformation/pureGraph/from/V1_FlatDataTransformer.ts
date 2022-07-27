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

import { UnsupportedOperationError } from '@finos/legend-shared';
import type { FlatData } from '../../../../../../../graph/metamodel/pure/packageableElements/store/flatData/model/FlatData.js';
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
  RootFlatDataRecordType,
  FlatDataRecordType,
  type FlatDataDataType,
  type FlatDataRecordField,
} from '../../../../../../../graph/metamodel/pure/packageableElements/store/flatData/model/FlatDataDataType.js';
import type { FlatDataSection } from '../../../../../../../graph/metamodel/pure/packageableElements/store/flatData/model/FlatDataSection.js';
import { V1_FlatDataSection } from '../../../model/packageableElements/store/flatData/model/V1_FlatDataSection.js';
import { V1_FlatData } from '../../../model/packageableElements/store/flatData/model/V1_FlatData.js';
import {
  type V1_FlatDataDataType,
  V1_FlatDataRecordField,
  V1_RootFlatDataRecordType,
  V1_FlatDataRecordType,
  V1_FlatDataDate,
  V1_FlatDataStrictDate,
  V1_FlatDataDateTime,
  V1_FlatDataNumber,
  V1_FlatDataFloat,
  V1_FlatDataDecimal,
  V1_FlatDataInteger,
  V1_FlatDataBoolean,
  V1_FlatDataString,
} from '../../../model/packageableElements/store/flatData/model/V1_FlatDataDataType.js';
import { V1_initPackageableElement } from './V1_CoreTransformerHelper.js';
import { V1_FlatDataProperty } from '../../../model/packageableElements/store/flatData/model/V1_FlatDataProperty.js';

function transformFlatDataType(type: FlatDataDataType): V1_FlatDataDataType {
  const transformFlatDataRecordField = (
    metamodel: FlatDataRecordField,
  ): V1_FlatDataRecordField => {
    const protocol = new V1_FlatDataRecordField();
    protocol.address = metamodel.address;
    protocol.label = metamodel.label;
    protocol.optional = metamodel.optional;
    protocol.flatDataDataType = transformFlatDataType(
      metamodel.flatDataDataType,
    );
    return protocol;
  };

  if (type instanceof FlatDataString) {
    return new V1_FlatDataString();
  } else if (type instanceof FlatDataBoolean) {
    const protocol = new V1_FlatDataBoolean();
    protocol.falseString = type.falseString;
    protocol.trueString = type.trueString;
    return protocol;
  } else if (type instanceof FlatDataInteger) {
    return new V1_FlatDataInteger();
  } else if (type instanceof FlatDataDecimal) {
    return new V1_FlatDataDecimal();
  } else if (type instanceof FlatDataFloat) {
    return new V1_FlatDataFloat();
  } else if (type instanceof FlatDataNumber) {
    // since number is the supertype of numeric types, it has to go after
    return new V1_FlatDataNumber();
  } else if (type instanceof FlatDataDateTime) {
    const protocol = new V1_FlatDataDateTime();
    protocol.dateFormat = type.dateFormat;
    protocol.timeZone = type.timeZone;
    return protocol;
  } else if (type instanceof FlatDataStrictDate) {
    const protocol = new V1_FlatDataStrictDate();
    protocol.dateFormat = type.dateFormat;
    protocol.timeZone = type.timeZone;
    return protocol;
  } else if (type instanceof FlatDataDate) {
    // since date is the supertype of date-related types, it has to go after
    const protocol = new V1_FlatDataDate();
    protocol.dateFormat = type.dateFormat;
    protocol.timeZone = type.timeZone;
    return protocol;
  } else if (type instanceof RootFlatDataRecordType) {
    const protocol = new V1_RootFlatDataRecordType();
    protocol.fields = type.fields.map(transformFlatDataRecordField);
    return protocol;
  } else if (type instanceof FlatDataRecordType) {
    // since flat data record type is the super type of root flat data record type, it has to go after
    const protocol = new V1_FlatDataRecordType();
    protocol.fields = type.fields.map(transformFlatDataRecordField);
    return protocol;
  }
  throw new UnsupportedOperationError(
    `Can't transform flat-data data type`,
    type,
  );
}

const transformSection = (element: FlatDataSection): V1_FlatDataSection => {
  const section = new V1_FlatDataSection();
  section.driverId = element.driverId;
  section.name = element.name;
  if (element.recordType) {
    section.recordType = transformFlatDataType(
      element.recordType,
    ) as V1_RootFlatDataRecordType;
  }
  section.sectionProperties = element.sectionProperties.map((p) => {
    const property = new V1_FlatDataProperty();
    property.name = p.name;
    property.value = p.value;
    return property;
  });

  return section;
};

export const V1_transformFlatData = (element: FlatData): V1_FlatData => {
  const flatData = new V1_FlatData();
  V1_initPackageableElement(flatData, element);
  flatData.sections = element.sections.map(transformSection);
  return flatData;
};
