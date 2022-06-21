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
  isStubbed_RawLambda,
  PackageableElementPointerType,
  type V1_GraphTransformerContext,
  V1_initPackageableElement,
  type V1_RawLambda,
  V1_RawValueSpecificationTransformer,
  V1_transformClassMappingPropertyMappings,
  V1_transformElementReferencePointer,
  V1_transformPropertyReference,
} from '@finos/legend-graph';
import { UnsupportedOperationError } from '@finos/legend-shared';
import type { EmbeddedFlatDataPropertyMapping } from '../../../../../metamodels/pure/model/store/flatData/mapping/ESFlatData_EmbeddedFlatDataPropertyMapping.js';
import type { FlatDataInputData } from '../../../../../metamodels/pure/model/store/flatData/mapping/ESFlatData_FlatDataInputData.js';
import type { FlatDataInstanceSetImplementation } from '../../../../../metamodels/pure/model/store/flatData/mapping/ESFlatData_FlatDataInstanceSetImplementation.js';
import type { FlatDataPropertyMapping } from '../../../../../metamodels/pure/model/store/flatData/mapping/ESFlatData_FlatDataPropertyMapping.js';
import type { FlatData } from '../../../../../metamodels/pure/model/store/flatData/model/ESFlatData_FlatData.js';
import {
  type FlatDataDataType,
  type FlatDataRecordField,
  FlatDataString,
  FlatDataBoolean,
  FlatDataInteger,
  FlatDataDecimal,
  FlatDataFloat,
  FlatDataNumber,
  FlatDataDateTime,
  FlatDataStrictDate,
  FlatDataDate,
  RootFlatDataRecordType,
  FlatDataRecordType,
} from '../../../../../metamodels/pure/model/store/flatData/model/ESFlatData_FlatDataDataType.js';
import type { FlatDataSection } from '../../../../../metamodels/pure/model/store/flatData/model/ESFlatData_FlatDataSection.js';
import { V1_EmbeddedFlatDataPropertyMapping } from '../../model/store/flatData/mapping/V1_ESFlatData_EmbeddedFlatDataPropertyMapping.js';
import { V1_FlatDataInputData } from '../../model/store/flatData/mapping/V1_ESFlatData_FlatDataInputData.js';
import { V1_FlatDataPropertyMapping } from '../../model/store/flatData/mapping/V1_ESFlatData_FlatDataPropertyMapping.js';
import { V1_RootFlatDataClassMapping } from '../../model/store/flatData/mapping/V1_ESFlatData_RootFlatDataClassMapping.js';
import { V1_FlatDataProperty } from '../../model/store/flatData/model/V1_ESFlataData_FlatDataProperty.js';
import { V1_FlatData } from '../../model/store/flatData/model/V1_ESFlatData_FlatData.js';
import {
  type V1_FlatDataDataType,
  V1_FlatDataRecordField,
  V1_FlatDataString,
  V1_FlatDataBoolean,
  V1_FlatDataInteger,
  V1_FlatDataDecimal,
  V1_FlatDataFloat,
  V1_FlatDataNumber,
  V1_FlatDataDateTime,
  V1_FlatDataStrictDate,
  V1_FlatDataDate,
  V1_RootFlatDataRecordType,
  V1_FlatDataRecordType,
} from '../../model/store/flatData/model/V1_ESFlatData_FlatDataDataType.js';
import { V1_FlatDataSection } from '../../model/store/flatData/model/V1_ESFlatData_FlatDataSection.js';

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

export const V1_transformFlatDataInputData = (
  element: FlatDataInputData,
): V1_FlatDataInputData => {
  const inputData = new V1_FlatDataInputData();
  inputData.data = element.data;
  inputData.sourceFlatData = V1_transformElementReferencePointer(
    PackageableElementPointerType.STORE,
    element.sourceFlatData,
  );
  return inputData;
};

export const V1_transformSimpleFlatDataPropertyMapping = (
  element: FlatDataPropertyMapping,
  context: V1_GraphTransformerContext,
): V1_FlatDataPropertyMapping => {
  const flatDataPropertyMapping = new V1_FlatDataPropertyMapping();
  flatDataPropertyMapping.enumMappingId =
    element.transformer.valueForSerialization;
  flatDataPropertyMapping.property = V1_transformPropertyReference(
    element.property,
  );
  flatDataPropertyMapping.source = element.sourceSetImplementation.id.value;
  flatDataPropertyMapping.target = element.targetSetImplementation?.id.value;
  if (!isStubbed_RawLambda(element.transform)) {
    flatDataPropertyMapping.transform =
      element.transform.accept_RawValueSpecificationVisitor(
        new V1_RawValueSpecificationTransformer(context),
      ) as V1_RawLambda;
  }
  return flatDataPropertyMapping;
};

export const V1_transformEmbeddedFlatDataPropertyMapping = (
  element: EmbeddedFlatDataPropertyMapping,
  context: V1_GraphTransformerContext,
): V1_EmbeddedFlatDataPropertyMapping => {
  const embedded = new V1_EmbeddedFlatDataPropertyMapping();
  const id = element.id.valueForSerialization;
  if (id) {
    embedded.id = id;
  }
  embedded.class = element.class.valueForSerialization ?? '';
  embedded.property = V1_transformPropertyReference(element.property); // TODO: we might ned to turn 'isTransformingEmbeddedPropertyMapping' on in the future once we start working on the gramar roundtrip for flat-data
  embedded.propertyMappings = V1_transformClassMappingPropertyMappings(
    element.propertyMappings,
    false, // TODO: we might ned to turn this on in the future once we start working on the gramar roundtrip for flat-data
    context,
    false,
  );
  embedded.root = false;
  embedded.source = element.sourceSetImplementation.id.value;
  embedded.target = element.targetSetImplementation?.id.value;
  return embedded;
};

export const V1_transformFlatDataInstanceSetImpl = (
  element: FlatDataInstanceSetImplementation,
  context: V1_GraphTransformerContext,
): V1_RootFlatDataClassMapping => {
  const classMapping = new V1_RootFlatDataClassMapping();
  classMapping.class = element.class.valueForSerialization ?? '';
  if (element.filter) {
    classMapping.filter = element.filter.accept_RawValueSpecificationVisitor(
      new V1_RawValueSpecificationTransformer(context),
    ) as V1_RawLambda;
  }
  classMapping.flatData =
    element.sourceRootRecordType.ownerReference.valueForSerialization ?? '';
  classMapping.id = element.id.valueForSerialization;
  classMapping.propertyMappings = V1_transformClassMappingPropertyMappings(
    element.propertyMappings,
    true,
    context,
    false,
  );
  classMapping.root = element.root.valueForSerialization;
  classMapping.extendsClassMappingId = element.superSetImplementationId;
  classMapping.sectionName = element.sourceRootRecordType.value._OWNER.name;
  return classMapping;
};
