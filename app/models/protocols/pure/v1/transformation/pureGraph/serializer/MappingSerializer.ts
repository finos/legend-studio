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

import { list, createSimpleSchema, custom, SKIP, alias, serialize, primitive } from 'serializr';
import { tryToMinifyJSONString } from 'Utilities/FormatterUtil';
import { UnsupportedOperationError } from 'Utilities/GeneralUtil';
import { SetImplementationVisitor as MM_SetImplementationVisitor, SetImplementation as MM_SetImplementation } from 'MM/model/packageableElements/mapping/SetImplementation';
import { PropertyMappingVisitor as MM_PropertyMappingVisitor, PropertyMapping as MM_PropertyMapping } from 'MM/model/packageableElements/mapping/PropertyMapping';
import { PurePropertyMapping as MM_PurePropertyMapping } from 'MM/model/packageableElements/store/modelToModel/mapping/PurePropertyMapping';
import { Enum as MM_Enum } from 'MM/model/packageableElements/domain/Enum';
import { EnumValueMapping as MM_EnumValueMapping, SourceValue as MM_SourceValue } from 'MM/model/packageableElements/mapping/EnumValueMapping';
import { EnumerationMapping as MM_EnumerationMapping } from 'MM/model/packageableElements/mapping/EnumerationMapping';
import { InputData as MM_InputData } from 'MM/model/packageableElements/mapping/InputData';
import { MappingTestAssert as MM_MappingTestAssert } from 'MM/model/packageableElements/mapping/MappingTestAssert';
import { ObjectInputData as MM_ObjectInputData } from 'MM/model/packageableElements/store/modelToModel/mapping/ObjectInputData';
import { ExpectedOutputMappingTestAssert as MM_ExpectedOutputMappingTestAssert } from 'MM/model/packageableElements/mapping/ExpectedOutputMappingTestAssert';
import { PureInstanceSetImplementation as MM_PureInstanceSetImplementation } from 'MM/model/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation';
import { OperationSetImplementation as MM_OperationSetImplementation } from 'MM/model/packageableElements/mapping/OperationSetImplementation';
import { InferableMappingElementIdValue as MM_InferableMappingElementIdValue } from 'MM/model/packageableElements/mapping/InferableMappingElementId';
import { EnumValueReference as MM_EnumValueReference } from 'MM/model/packageableElements/domain/EnumValueReference';
import { SetImplementationContainer as MM_SetImplementationContainer } from 'MM/model/packageableElements/mapping/SetImplementationContainer';
import { MappingInclude as MM_MappingInclude } from 'MM/model/packageableElements/mapping/MappingInclude';
import { EnumValueMappingSourceValueType } from 'V1/model/packageableElements/mapping/EnumValueMapping';
import { PropertyMappingType } from 'V1/model/packageableElements/mapping/PropertyMapping';
import { PackageableElementType } from 'V1/model/packageableElements/PackageableElement';
import { ClassMappingType } from 'V1/model/packageableElements/mapping/ClassMapping';
import { InputDataType } from 'V1/model/packageableElements/mapping/InputData';
import { MappingTestAssertType } from 'V1/model/packageableElements/mapping/MappingTestAssert';
import { constant, usingModelSchema, packagePathSerializer, SKIP_FN, elementReferenceSerializer, optionalElementReferenceSerializer, optionalPrimitiveSerializer } from './CoreSerializerHelper';
import { propertyPtrSerializationSchema } from './DomainSerializerHelper';
import { valueSpecificationSerializer, optionalValueSpecificationSerializer } from 'V1/transformation/pureGraph/serializer/ValueSpecificationSerializer';

const optionalPropertyMappingTransformerSerializer = alias('enumMappingId', custom((value: MM_EnumerationMapping | undefined) => value?.id.value ?? SKIP, SKIP_FN));
const mappingElementIdSerializer = custom((value: MM_InferableMappingElementIdValue): string | typeof SKIP => value.valueForSerialization ?? SKIP, SKIP_FN);
const propertyMappingSourceSerializer = alias('source', custom((value: MM_SetImplementation): string => value.id.value, SKIP_FN));
const propertyMappingTargetSerializer = alias('target', custom((value: MM_SetImplementation | undefined): string | typeof SKIP => value?.id.value ?? SKIP, SKIP_FN));
const classMappingPropertyMappingsSerializer = custom((values: MM_PropertyMapping[]) => values.filter(value => !value.isStub).map(serializeProperyMapping), SKIP_FN);

const expectedOutputMappingTestAssertSchema = createSimpleSchema({
  _type: constant(MappingTestAssertType.EXPECTED_OUTPUT_MAPPING_TEST_ASSERT),
  expectedOutput: custom((value: string) => tryToMinifyJSONString(value), SKIP_FN)
});

const transformTestAssert = (mappingTestAssert: MM_MappingTestAssert): Record<PropertyKey, unknown> => {
  if (mappingTestAssert instanceof MM_ExpectedOutputMappingTestAssert) {
    return serialize(expectedOutputMappingTestAssertSchema, mappingTestAssert);
  }
  throw new UnsupportedOperationError(`Can't serialize unsupported mapping test assert type '${mappingTestAssert.constructor.name}'`);
};

const objectInputDataSchema = createSimpleSchema({
  _type: constant(InputDataType.OBJECT),
  data: custom((value: string) => tryToMinifyJSONString(value), SKIP_FN),
  inputType: primitive(),
  sourceClass: elementReferenceSerializer,
});

const transformMappingTestInputData = (inputData: MM_InputData): Record<PropertyKey, unknown> => {
  if (inputData instanceof MM_ObjectInputData) {
    return serialize(objectInputDataSchema, inputData);
  }
  throw new UnsupportedOperationError(`Can't serialize unsupported mapping test input data type '${inputData.constructor.name}'`);
};

const mappingTestSchema = createSimpleSchema({
  assert: custom(transformTestAssert, SKIP_FN),
  inputData: list(custom(transformMappingTestInputData, SKIP_FN)),
  name: primitive(),
  query: valueSpecificationSerializer,
});

const purePropertyMappingSchema = createSimpleSchema({
  _type: constant(PropertyMappingType.PURE),
  transformer: optionalPropertyMappingTransformerSerializer,
  property: usingModelSchema(propertyPtrSerializationSchema),
  sourceSetImplementation: propertyMappingSourceSerializer,
  targetSetImplementation: propertyMappingTargetSerializer,
  transform: valueSpecificationSerializer,
  explodeProperty: optionalPrimitiveSerializer
});

class PropertyMappingSerializer implements MM_PropertyMappingVisitor<object> {

  visit_PurePropertyMapping(propertyMapping: MM_PurePropertyMapping): Record<PropertyKey, unknown> {
    return serialize(purePropertyMappingSchema, propertyMapping);
  }
}

// NOTE: this needs to be a function to avoid error with using before declaration for embedded property mappings due to the hoisting behavior in ES
function serializeProperyMapping(propertyMapping: MM_PropertyMapping): Record<PropertyKey, unknown> {
  return propertyMapping.accept_PropertyMappingVisitor(new PropertyMappingSerializer());
}

const pureInstanceClassMappingSchema = createSimpleSchema({
  _type: constant(ClassMappingType.PUREINSTANCE),
  class: elementReferenceSerializer,
  filter: optionalValueSpecificationSerializer,
  id: mappingElementIdSerializer,
  propertyMappings: classMappingPropertyMappingsSerializer,
  root: primitive(),
  srcClass: optionalElementReferenceSerializer,
});

const operationSetImplementationSchema = createSimpleSchema({
  _type: constant(ClassMappingType.OPERATION),
  class: elementReferenceSerializer,
  id: mappingElementIdSerializer,
  operation: primitive(),
  parameters: list(custom((value: MM_SetImplementationContainer) => value.setImplementation.value.id.value, SKIP_FN)),
  root: primitive(),
});

export class SetImplementationSerializer implements MM_SetImplementationVisitor<object | typeof SKIP> {

  visit_OperationSetImplementation(setImplementation: MM_OperationSetImplementation): Record<PropertyKey, unknown> | typeof SKIP {
    return serialize(operationSetImplementationSchema, setImplementation);
  }

  visit_PureInstanceSetImplementation(setImplementation: MM_PureInstanceSetImplementation): Record<PropertyKey, unknown> | typeof SKIP {
    return serialize(pureInstanceClassMappingSchema, setImplementation);
  }

}

const serializeSetImplementation = (setImplementation: MM_SetImplementation): Record<PropertyKey, unknown> | typeof SKIP => setImplementation.accept_SetImplementationVisitor(new SetImplementationSerializer());

const enumValueMappingSchema = createSimpleSchema({
  enum: alias('enumValue', custom((value: MM_EnumValueReference) => value.value.name, SKIP_FN)),
  sourceValues: custom(values => values.filter((value: MM_SourceValue) => !value.isStub).map((value: MM_SourceValue) => {
    if (typeof value.value === 'string') {
      return { _type: EnumValueMappingSourceValueType.STRING, value: value.value };
    } else if (typeof value.value === 'number') {
      return { _type: EnumValueMappingSourceValueType.INTEGER, value: value.value };
    } else if (value.value instanceof MM_Enum) {
      return { _type: EnumValueMappingSourceValueType.ENUM, enumeration: value.value.owner.path, value: value.value.name };
    }
    throw new UnsupportedOperationError(`Can't serialize unsupported enum value type '${value.constructor.name}'`);
  }), SKIP_FN)
});

const enumerationMappingSchema = createSimpleSchema({
  enumValueMappings: custom((values: MM_EnumValueMapping[]) => values.filter(value => !value.isStub).map(value => serialize(enumValueMappingSchema, value)), SKIP_FN),
  enumeration: elementReferenceSerializer,
  id: mappingElementIdSerializer,
});

const serializeMappingInclude = (mappingInclude: MM_MappingInclude): Record<PropertyKey, unknown> | typeof SKIP => ({
  includedMapping: mappingInclude.included.valueForSerialization
});

export const mappingSerializationSchema = createSimpleSchema({
  _type: constant(PackageableElementType.MAPPING),
  includes: alias('includedMappings', list(custom(serializeMappingInclude, SKIP_FN))),
  classMappings: custom((values: MM_SetImplementation[]) => values.map(serializeSetImplementation).filter(value => value !== SKIP), SKIP_FN),
  enumerationMappings: list(usingModelSchema(enumerationMappingSchema)),
  name: primitive(),
  package: packagePathSerializer,
  tests: list(usingModelSchema(mappingTestSchema)),
  // associationMappings: list(custom(transformAssociationMapping, SKIP_FN)),
});
