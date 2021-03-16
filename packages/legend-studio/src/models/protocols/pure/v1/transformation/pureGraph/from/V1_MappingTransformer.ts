/**
 * Copyright 2020 Goldman Sachs
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
  getClass,
  isNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-studio-shared';
import type { Mapping } from '../../../../../../metamodels/pure/model/packageableElements/mapping/Mapping';
import type {
  SetImplementationVisitor,
  SetImplementation,
} from '../../../../../../metamodels/pure/model/packageableElements/mapping/SetImplementation';
import type {
  PropertyMappingVisitor,
  PropertyMapping,
} from '../../../../../../metamodels/pure/model/packageableElements/mapping/PropertyMapping';
import type { PurePropertyMapping } from '../../../../../../metamodels/pure/model/packageableElements/store/modelToModel/mapping/PurePropertyMapping';
import { Enum } from '../../../../../../metamodels/pure/model/packageableElements/domain/Enum';
import type { EnumValueMapping } from '../../../../../../metamodels/pure/model/packageableElements/mapping/EnumValueMapping';
import type { EnumerationMapping } from '../../../../../../metamodels/pure/model/packageableElements/mapping/EnumerationMapping';
import type { InputData } from '../../../../../../metamodels/pure/model/packageableElements/mapping/InputData';
import type { MappingTestAssert } from '../../../../../../metamodels/pure/model/packageableElements/mapping/MappingTestAssert';
import {
  ObjectInputData,
  OBJECT_INPUT_TYPE,
} from '../../../../../../metamodels/pure/model/packageableElements/store/modelToModel/mapping/ObjectInputData';
import { FlatDataInputData } from '../../../../../../metamodels/pure/model/packageableElements/store/flatData/mapping/FlatDataInputData';
import { ExpectedOutputMappingTestAssert } from '../../../../../../metamodels/pure/model/packageableElements/mapping/ExpectedOutputMappingTestAssert';
import type { FlatDataPropertyMapping } from '../../../../../../metamodels/pure/model/packageableElements/store/flatData/mapping/FlatDataPropertyMapping';
import type { EmbeddedFlatDataPropertyMapping } from '../../../../../../metamodels/pure/model/packageableElements/store/flatData/mapping/EmbeddedFlatDataPropertyMapping';
import type { PureInstanceSetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation';
import type { OperationSetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/mapping/OperationSetImplementation';
import { OperationType } from '../../../../../../metamodels/pure/model/packageableElements/mapping/OperationSetImplementation';
import type { FlatDataInstanceSetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/store/flatData/mapping/FlatDataInstanceSetImplementation';
import type { RelationalInstanceSetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/mapping/RelationalInstanceSetImplementation';
import type { RootRelationalInstanceSetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation';
import type { RelationalPropertyMapping } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/mapping/RelationalPropertyMapping';
import type { EmbeddedRelationalInstanceSetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/mapping/EmbeddedRelationalInstanceSetImplementation';
import type { InlineEmbeddedRelationalInstanceSetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/mapping/InlineEmbeddedRelationalInstanceSetImplementation';
import type { OtherwiseEmbeddedRelationalInstanceSetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/mapping/OtherwiseEmbeddedRelationalInstanceSetImplementation';
import type { InferableMappingElementIdValue } from '../../../../../../metamodels/pure/model/packageableElements/mapping/InferableMappingElementId';
import type { MappingInclude } from '../../../../../../metamodels/pure/model/packageableElements/mapping/MappingInclude';
import type { InferableMappingElementRoot } from '../../../../../../metamodels/pure/model/packageableElements/mapping/InferableMappingElementRoot';
import type { MappingTest } from '../../../../../../metamodels/pure/model/packageableElements/mapping/MappingTest';
import type { AssociationImplementation } from '../../../../../../metamodels/pure/model/packageableElements/mapping/AssociationImplementation';
import { RelationalAssociationImplementation } from '../../../../../../metamodels/pure/model/packageableElements/mapping/RelationalAssociationImplementation';
import type { PropertyReference } from '../../../../../../metamodels/pure/model/packageableElements/domain/PropertyReference';
import type { AggregationAwareSetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/mapping/aggregationAware/AggregationAwareSetImplementation';
import type { AggregationAwarePropertyMapping } from '../../../../../../metamodels/pure/model/packageableElements/mapping/aggregationAware/AggregationAwarePropertyMapping';
import type { AggregateSetImplementationContainer } from '../../../../../../metamodels/pure/model/packageableElements/mapping/aggregationAware/AggregateSetImplementationContainer';
import type { AggregateSpecification } from '../../../../../../metamodels/pure/model/packageableElements/mapping/aggregationAware/AggregateSpecification';
import type { AggregationFunctionSpecification } from '../../../../../../metamodels/pure/model/packageableElements/mapping/aggregationAware/AggregationFunctionSpecification';
import type { GroupByFunctionSpecification } from '../../../../../../metamodels/pure/model/packageableElements/mapping/aggregationAware/GroupByFunctionSpecification';
import type { V1_RawLambda } from '../../../model/rawValueSpecification/V1_RawLambda';
import {
  V1_initPackageableElement,
  V1_transformElementReference,
  V1_transformElementReferencePointer,
  V1_transformOptionalElementReference,
} from './V1_CoreTransformerHelper';
import { V1_Mapping } from '../../../model/packageableElements/mapping/V1_Mapping';
import {
  V1_EnumValueMapping,
  V1_EnumValueMappingEnumSourceValue,
  V1_EnumValueMappingIntegerSourceValue,
  V1_EnumValueMappingStringSourceValue,
} from '../../../model/packageableElements/mapping/V1_EnumValueMapping';
import type { V1_PropertyMapping } from '../../../model/packageableElements/mapping/V1_PropertyMapping';
import { V1_PackageableElementPointerType } from '../../../model/packageableElements/V1_PackageableElement';
import type { V1_ClassMapping } from '../../../model/packageableElements/mapping/V1_ClassMapping';
import type { V1_InputData } from '../../../model/packageableElements/mapping/V1_InputData';
import type { V1_AssociationMapping } from '../../../model/packageableElements/mapping/V1_AssociationMapping';
import { V1_RelationalAssociationMapping } from '../../../model/packageableElements/store/relational/mapping/V1_RelationalAssociationMapping';
import type { V1_MappingTestAssert } from '../../../model/packageableElements/mapping/V1_MappingTestAssert';
import {
  V1_ObjectInputData,
  V1_ObjectInputType,
} from '../../../model/packageableElements/store/modelToModel/mapping/V1_ObjectInputData';
import { V1_FlatDataInputData } from '../../../model/packageableElements/store/flatData/mapping/V1_FlatDataInputData';
import { V1_ExpectedOutputMappingTestAssert } from '../../../model/packageableElements/mapping/V1_ExpectedOutputMappingTestAssert';
import { V1_MappingTest } from '../../../model/packageableElements/mapping/V1_MappingTest';
import { V1_RawValueSpecificationTransformer } from './V1_RawValueSpecificationTransformer';
import { V1_MappingInclude } from '../../../model/packageableElements/mapping/V1_MappingInclude';
import { V1_EnumerationMapping } from '../../../model/packageableElements/mapping/V1_EnumerationMapping';
import { V1_FlatDataPropertyMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_FlatDataPropertyMapping';
import { V1_PropertyPointer } from '../../../model/packageableElements/domain/V1_PropertyPointer';
import { V1_EmbeddedFlatDataPropertyMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_EmbeddedFlatDataPropertyMapping';
import { V1_PurePropertyMapping } from '../../../model/packageableElements/store/modelToModel/mapping/V1_PurePropertyMapping';
import { V1_RelationalPropertyMapping } from '../../../model/packageableElements/store/relational/mapping/V1_RelationalPropertyMapping';
import {
  V1_transformRelationalOperationElement,
  V1_transformTableAliasToTablePointer,
} from './V1_DatabaseTransformer';
import { V1_EmbeddedRelationalPropertyMapping } from '../../../model/packageableElements/store/relational/mapping/V1_EmbeddedRelationalPropertyMapping';
import { V1_InlineEmbeddedPropertyMapping } from '../../../model/packageableElements/store/relational/mapping/V1_InlineEmbeddedPropertyMapping';
import { V1_OtherwiseEmbeddedRelationalPropertyMapping } from '../../../model/packageableElements/store/relational/mapping/V1_OtherwiseEmbeddedRelationalPropertyMapping';
import { V1_RelationalClassMapping } from '../../../model/packageableElements/store/relational/mapping/V1_RelationalClassMapping';
import {
  V1_MappingOperationType,
  V1_OperationClassMapping,
} from '../../../model/packageableElements/mapping/V1_OperationClassMapping';
import { V1_PureInstanceClassMapping } from '../../../model/packageableElements/store/modelToModel/mapping/V1_PureInstanceClassMapping';
import { V1_RootFlatDataClassMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_RootFlatDataClassMapping';
import { V1_RootRelationalClassMapping } from '../../../model/packageableElements/store/relational/mapping/V1_RootRelationalClassMapping';
import { V1_AggregationAwareClassMapping } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregationAwareClassMapping';
import { V1_AggregationAwarePropertyMapping } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregationAwarePropertyMapping';
import { V1_AggregateSetImplementationContainer } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregateSetImplementationContainer';
import { V1_AggregateSpecification } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregateSpecification';
import { V1_AggregateFunction } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregateFunction';
import { V1_GroupByFunction } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_GroupByFunction';
import type { XStorePropertyMapping } from '../../../../../../metamodels/pure/model/packageableElements/mapping/xStore/XStorePropertyMapping';
import { V1_XStorePropertyMapping } from '../../../model/packageableElements/mapping/xStore/V1_XStorePropertyMapping';
import { XStoreAssociationImplementation } from '../../../../../../metamodels/pure/model/packageableElements/mapping/xStore/XStoreAssociationImplementation';
import { V1_XStoreAssociationMapping } from '../../../model/packageableElements/mapping/xStore/V1_XStoreAssociationMapping';

export const V1_transformPropertyReference = (
  element: PropertyReference,
): V1_PropertyPointer => {
  const property = new V1_PropertyPointer();
  property.class = V1_transformElementReference(element.ownerReference);
  property.property = element.value.name;
  return property;
};

const mappingElementIdSerializer = (
  value: InferableMappingElementIdValue,
): string | undefined => value.valueForSerialization;

const transformEnumValueMapping = (
  element: EnumValueMapping,
): V1_EnumValueMapping => {
  const enumValueMapping = new V1_EnumValueMapping();
  enumValueMapping.enumValue = element.enum.value.name;
  enumValueMapping.sourceValues = element.sourceValues
    .filter((s) => !s.isStub)
    .map((value) => {
      if (typeof value.value === 'string') {
        const _string = new V1_EnumValueMappingStringSourceValue();
        _string.value = value.value;
        return _string;
      } else if (typeof value.value === 'number') {
        const _integer = new V1_EnumValueMappingIntegerSourceValue();
        _integer.value = value.value;
        return _integer;
      } else if (value.value instanceof Enum) {
        const _enum = new V1_EnumValueMappingEnumSourceValue();
        _enum.value = value.value.name;
        _enum.enumeration = value.value.owner.path;
        return _enum;
      }
      throw new UnsupportedOperationError(
        `Can't serialize enum value of type '${getClass(value).name}'`,
      );
    });
  return enumValueMapping;
};

const transformEnumerationMapping = (
  element: EnumerationMapping,
): V1_EnumerationMapping => {
  const enumerationMapping = new V1_EnumerationMapping();
  enumerationMapping.enumValueMappings = element.enumValueMappings
    .filter((e) => !e.isStub)
    .map(transformEnumValueMapping);
  enumerationMapping.enumeration = V1_transformElementReference(
    element.enumeration,
  );
  enumerationMapping.id = mappingElementIdSerializer(element.id);
  return enumerationMapping;
};

// V1_Mapping Test

export const V1_getObjectInputType = (type: string): V1_ObjectInputType => {
  switch (type) {
    case OBJECT_INPUT_TYPE.JSON:
      return V1_ObjectInputType.JSON;
    case OBJECT_INPUT_TYPE.XML:
      return V1_ObjectInputType.XML;
    default:
      throw new UnsupportedOperationError(
        `Encountered unsupproted object input type '${type}'`,
      );
  }
};

const transformObjectInputData = (
  element: ObjectInputData,
): V1_ObjectInputData => {
  const inputData = new V1_ObjectInputData();
  inputData.data = element.data;
  inputData.inputType = V1_getObjectInputType(element.inputType);
  inputData.sourceClass = V1_transformElementReference(element.sourceClass);
  return inputData;
};

const transformFlatDataInputData = (
  element: FlatDataInputData,
): V1_FlatDataInputData => {
  const inputData = new V1_FlatDataInputData();
  inputData.data = element.data;
  inputData.sourceFlatData = V1_transformElementReferencePointer(
    V1_PackageableElementPointerType.STORE,
    element.sourceFlatData,
  );
  return inputData;
};

const transformExpectedOutputMappingTestAssert = (
  element: ExpectedOutputMappingTestAssert,
): V1_ExpectedOutputMappingTestAssert => {
  const assert = new V1_ExpectedOutputMappingTestAssert();
  assert.expectedOutput = element.expectedOutput;
  return assert;
};

const transformMappingTestInputData = (inputData: InputData): V1_InputData => {
  if (inputData instanceof ObjectInputData) {
    return transformObjectInputData(inputData);
  } else if (inputData instanceof FlatDataInputData) {
    return transformFlatDataInputData(inputData);
  }
  throw new UnsupportedOperationError(
    `Can't serialize mapping test input data of type '${
      getClass(inputData).name
    }'`,
  );
};

const transformTestAssert = (
  mappingTestAssert: MappingTestAssert,
): V1_MappingTestAssert => {
  if (mappingTestAssert instanceof ExpectedOutputMappingTestAssert) {
    return transformExpectedOutputMappingTestAssert(mappingTestAssert);
  }
  throw new UnsupportedOperationError(
    `Can't serialize mapping test assert of type '${
      getClass(mappingTestAssert).name
    }'`,
  );
};

const transformMappingTest = (element: MappingTest): V1_MappingTest => {
  const test = new V1_MappingTest();
  test.assert = transformTestAssert(element.assert);
  test.inputData = element.inputData.map(transformMappingTestInputData);
  test.name = element.name;
  test.query = element.query.accept_ValueSpecificationVisitor(
    new V1_RawValueSpecificationTransformer(),
  ) as V1_RawLambda;
  return test;
};

// Include V1_Mapping

const transformMappingInclude = (
  element: MappingInclude,
): V1_MappingInclude => {
  const mappingInclude = new V1_MappingInclude();
  mappingInclude.includedMapping = element.included.valueForSerialization;
  mappingInclude.sourceDatabasePath = element.storeSubstitutions.length
    ? element.storeSubstitutions[0].original.valueForSerialization
    : undefined;
  mappingInclude.targetDatabasePath = element.storeSubstitutions.length
    ? element.storeSubstitutions[0].substitute.valueForSerialization
    : undefined;
  return mappingInclude;
};

// Class V1_Mapping

const transformOptionalPropertyMappingTransformer = (
  value: EnumerationMapping | undefined,
): string | undefined => value?.id.value;
const transformMappingElementRoot = (
  value: InferableMappingElementRoot,
): boolean | undefined => value.valueForSerialization;
const transformPropertyMappingSource = (value: SetImplementation): string =>
  value.id.value;
const transformPropertyMappingTarget = (
  value: SetImplementation | undefined,
): string | undefined => value?.id.value;
const classMappingPropertyMappingsSerializer = (
  values: PropertyMapping[],
): V1_PropertyMapping[] =>
  values.filter((value) => !value.isStub).map(serializeProperyMapping);

const transformSimpleFlatDataPropertyMapping = (
  element: FlatDataPropertyMapping,
): V1_FlatDataPropertyMapping => {
  const flatDataPropertyMapping = new V1_FlatDataPropertyMapping();
  flatDataPropertyMapping.enumMappingId = transformOptionalPropertyMappingTransformer(
    element.transformer,
  );
  flatDataPropertyMapping.property = V1_transformPropertyReference(
    element.property,
  );
  flatDataPropertyMapping.source = transformPropertyMappingSource(
    element.sourceSetImplementation,
  );
  flatDataPropertyMapping.target = transformPropertyMappingTarget(
    element.targetSetImplementation,
  );
  if (!element.transform.isStub) {
    flatDataPropertyMapping.transform = element.transform.accept_ValueSpecificationVisitor(
      new V1_RawValueSpecificationTransformer(),
    ) as V1_RawLambda;
  }
  return flatDataPropertyMapping;
};

const transformEmbeddedFlatDataPropertyMapping = (
  element: EmbeddedFlatDataPropertyMapping,
): V1_EmbeddedFlatDataPropertyMapping => {
  const embedded = new V1_EmbeddedFlatDataPropertyMapping();
  const id = mappingElementIdSerializer(element.id);
  if (id) {
    embedded.id = id;
  }
  embedded.class = V1_transformElementReference(element.class);
  embedded.property = V1_transformPropertyReference(element.property);
  embedded.propertyMappings = classMappingPropertyMappingsSerializer(
    element.propertyMappings,
  );
  embedded.root = false;
  embedded.source = transformPropertyMappingSource(
    element.sourceSetImplementation,
  );
  embedded.target = transformPropertyMappingTarget(
    element.targetSetImplementation,
  );
  return embedded;
};

const transformPurePropertyMapping = (
  element: PurePropertyMapping,
): V1_PurePropertyMapping => {
  const purePropertyMapping = new V1_PurePropertyMapping();
  purePropertyMapping.enumMappingId = transformOptionalPropertyMappingTransformer(
    element.transformer,
  );
  purePropertyMapping.property = V1_transformPropertyReference(
    element.property,
  );
  purePropertyMapping.source = transformPropertyMappingSource(
    element.sourceSetImplementation,
  );
  purePropertyMapping.target = transformPropertyMappingTarget(
    element.targetSetImplementation,
  );
  if (!element.transform.isStub) {
    purePropertyMapping.transform = element.transform.accept_ValueSpecificationVisitor(
      new V1_RawValueSpecificationTransformer(),
    ) as V1_RawLambda;
  }
  purePropertyMapping.explodeProperty = element.explodeProperty;
  return purePropertyMapping;
};

const transformRelationalPropertyMapping = (
  element: RelationalPropertyMapping,
): V1_RelationalPropertyMapping => {
  const propertyMapping = new V1_RelationalPropertyMapping();
  propertyMapping.enumMappingId = transformOptionalPropertyMappingTransformer(
    element.transformer,
  );
  propertyMapping.property = V1_transformPropertyReference(element.property);
  propertyMapping.relationalOperation = V1_transformRelationalOperationElement(
    element.relationalOperation,
  );
  propertyMapping.source = transformPropertyMappingSource(
    element.sourceSetImplementation,
  );
  propertyMapping.target = transformPropertyMappingTarget(
    element.targetSetImplementation,
  );
  return propertyMapping;
};

const transformEmbeddedRelationalPropertyMapping = (
  element: EmbeddedRelationalInstanceSetImplementation,
): V1_EmbeddedRelationalPropertyMapping => {
  const embedded = new V1_EmbeddedRelationalPropertyMapping();
  embedded.property = V1_transformPropertyReference(element.property);
  embedded.source = transformPropertyMappingSource(
    element.sourceSetImplementation,
  );
  embedded.target = transformPropertyMappingTarget(
    element.targetSetImplementation,
  );
  const classMapping = new V1_RelationalClassMapping();
  classMapping.primaryKey = element.primaryKey.map(
    V1_transformRelationalOperationElement,
  );
  classMapping.propertyMappings = classMappingPropertyMappingsSerializer(
    element.propertyMappings,
  );
  const root = transformMappingElementRoot(element.root);
  if (root !== undefined) {
    classMapping.root = root;
  }
  classMapping.class = V1_transformElementReference(element.class);
  embedded.classMapping = classMapping;
  return embedded;
};

const transformInlineEmbeddedRelationalPropertyMapping = (
  element: InlineEmbeddedRelationalInstanceSetImplementation,
): V1_InlineEmbeddedPropertyMapping => {
  const embedded = new V1_InlineEmbeddedPropertyMapping();
  embedded.property = V1_transformPropertyReference(element.property);
  embedded.source = transformPropertyMappingSource(
    element.sourceSetImplementation,
  );
  embedded.target = transformPropertyMappingTarget(
    element.targetSetImplementation,
  );
  const id = mappingElementIdSerializer(element.id);
  if (id) {
    embedded.id = id;
  }
  embedded.setImplementationId = element.inlineSetImplementation.id.value;
  return embedded;
};

const transformXStorePropertyMapping = (
  element: XStorePropertyMapping,
): V1_XStorePropertyMapping => {
  const xstore = new V1_XStorePropertyMapping();
  xstore.property = V1_transformPropertyReference(element.property);
  xstore.source = transformPropertyMappingSource(
    element.sourceSetImplementation,
  );
  xstore.target = transformPropertyMappingTarget(
    element.targetSetImplementation,
  );
  if (!element.crossExpression.isStub) {
    xstore.crossExpression = element.crossExpression.accept_ValueSpecificationVisitor(
      new V1_RawValueSpecificationTransformer(),
    ) as V1_RawLambda;
  }
  return xstore;
};

const transformOtherwiseEmbeddedRelationalPropertyMapping = (
  element: OtherwiseEmbeddedRelationalInstanceSetImplementation,
): V1_OtherwiseEmbeddedRelationalPropertyMapping => {
  const embedded = new V1_OtherwiseEmbeddedRelationalPropertyMapping();
  embedded.property = V1_transformPropertyReference(element.property);
  embedded.source = transformPropertyMappingSource(
    element.sourceSetImplementation,
  );
  embedded.target = transformPropertyMappingTarget(
    element.targetSetImplementation,
  );
  const classMapping = new V1_RelationalClassMapping();
  classMapping.primaryKey = element.primaryKey.map(
    V1_transformRelationalOperationElement,
  );
  classMapping.propertyMappings = classMappingPropertyMappingsSerializer(
    element.propertyMappings,
  );
  const root = transformMappingElementRoot(element.root);
  if (root !== undefined) {
    classMapping.root = root;
  }
  classMapping.class = V1_transformElementReference(element.class);
  embedded.classMapping = classMapping;
  embedded.otherwisePropertyMapping = serializeProperyMapping(
    element.otherwisePropertyMapping,
  ) as V1_RelationalPropertyMapping;
  return embedded;
};

const transformAggregationAwarePropertyMapping = (
  element: AggregationAwarePropertyMapping,
): V1_AggregationAwarePropertyMapping => {
  const propertyMapping = new V1_AggregationAwarePropertyMapping();
  propertyMapping.property = V1_transformPropertyReference(element.property);
  propertyMapping.source = transformPropertyMappingSource(
    element.sourceSetImplementation,
  );
  propertyMapping.target = transformPropertyMappingTarget(
    element.targetSetImplementation,
  );
  return propertyMapping;
};

class PropertyMappingSerializer
  implements PropertyMappingVisitor<V1_PropertyMapping> {
  visit_PurePropertyMapping(
    propertyMapping: PurePropertyMapping,
  ): V1_PurePropertyMapping {
    return transformPurePropertyMapping(propertyMapping);
  }
  visit_FlatDataPropertyMapping(
    propertyMapping: FlatDataPropertyMapping,
  ): V1_PropertyMapping {
    return transformSimpleFlatDataPropertyMapping(propertyMapping);
  }
  visit_EmbeddedFlatDataPropertyMapping(
    propertyMapping: EmbeddedFlatDataPropertyMapping,
  ): V1_PropertyMapping {
    return transformEmbeddedFlatDataPropertyMapping(propertyMapping);
  }
  visit_RelationalPropertyMapping(
    propertyMapping: RelationalPropertyMapping,
  ): V1_PropertyMapping {
    return transformRelationalPropertyMapping(propertyMapping);
  }
  visit_EmbeddedRelationalPropertyMapping(
    propertyMapping: EmbeddedRelationalInstanceSetImplementation,
  ): V1_PropertyMapping {
    return transformEmbeddedRelationalPropertyMapping(propertyMapping);
  }
  visit_InlineEmbeddedRelationalPropertyMapping(
    propertyMapping: InlineEmbeddedRelationalInstanceSetImplementation,
  ): V1_PropertyMapping {
    return transformInlineEmbeddedRelationalPropertyMapping(propertyMapping);
  }
  visit_OtherwiseEmbeddedRelationalPropertyMapping(
    propertyMapping: OtherwiseEmbeddedRelationalInstanceSetImplementation,
  ): V1_PropertyMapping {
    return transformOtherwiseEmbeddedRelationalPropertyMapping(propertyMapping);
  }
  visit_XStorePropertyMapping(
    propertyMapping: XStorePropertyMapping,
  ): V1_PropertyMapping {
    return transformXStorePropertyMapping(propertyMapping);
  }
  visit_AggregationAwarePropertyMapping(
    propertyMapping: AggregationAwarePropertyMapping,
  ): V1_PropertyMapping {
    return transformAggregationAwarePropertyMapping(propertyMapping);
  }
}

const transformOperationType = (
  value: OperationType,
): V1_MappingOperationType => {
  switch (value) {
    case OperationType.ROUTER_UNION:
      return V1_MappingOperationType.ROUTER_UNION;
    case OperationType.STORE_UNION:
      return V1_MappingOperationType.STORE_UNION;
    default:
      return V1_MappingOperationType.ROUTER_UNION;
  }
};

const transformOperationSetImplementation = (
  element: OperationSetImplementation,
): V1_OperationClassMapping => {
  const classMapping = new V1_OperationClassMapping();
  classMapping.class = V1_transformElementReference(element.class);
  classMapping.id = mappingElementIdSerializer(element.id);
  classMapping.operation = transformOperationType(element.operation);
  classMapping.parameters = element.parameters.map(
    (e) => e.setImplementation.value.id.value,
  );
  const root = transformMappingElementRoot(element.root);
  if (root !== undefined) {
    classMapping.root = root;
  }
  return classMapping;
};

const transformPureInstanceSetImplementation = (
  element: PureInstanceSetImplementation,
): V1_PureInstanceClassMapping => {
  const classMapping = new V1_PureInstanceClassMapping();
  classMapping.class = V1_transformElementReference(element.class);
  if (element.filter) {
    classMapping.filter = element.filter.accept_ValueSpecificationVisitor(
      new V1_RawValueSpecificationTransformer(),
    ) as V1_RawLambda;
  }
  classMapping.id = mappingElementIdSerializer(element.id);
  classMapping.propertyMappings = classMappingPropertyMappingsSerializer(
    element.propertyMappings,
  );
  const root = transformMappingElementRoot(element.root);
  if (root !== undefined) {
    classMapping.root = root;
  }
  classMapping.srcClass = V1_transformOptionalElementReference(
    element.srcClass,
  );
  return classMapping;
};

const transformFlatDataInstanceSetImpl = (
  element: FlatDataInstanceSetImplementation,
): V1_RootFlatDataClassMapping => {
  const classMapping = new V1_RootFlatDataClassMapping();
  classMapping.class = V1_transformElementReference(element.class);
  if (element.filter) {
    classMapping.filter = element.filter.accept_ValueSpecificationVisitor(
      new V1_RawValueSpecificationTransformer(),
    ) as V1_RawLambda;
  }
  classMapping.flatData =
    element.sourceRootRecordType.ownerReference.valueForSerialization;
  classMapping.id = mappingElementIdSerializer(element.id);
  classMapping.propertyMappings = classMappingPropertyMappingsSerializer(
    element.propertyMappings,
  );
  const root = transformMappingElementRoot(element.root);
  if (root !== undefined) {
    classMapping.root = root;
  }
  classMapping.sectionName = element.sourceRootRecordType.value.owner.name;
  return classMapping;
};

const transformRootRelationalSetImpl = (
  element: RootRelationalInstanceSetImplementation,
): V1_RootRelationalClassMapping => {
  const classMapping = new V1_RootRelationalClassMapping();
  classMapping.class = V1_transformElementReference(element.class);
  classMapping.distinct = element.distinct ?? false;
  classMapping.id = mappingElementIdSerializer(element.id);
  classMapping.mainTable = V1_transformTableAliasToTablePointer(
    element.mainTableAlias,
  );
  classMapping.primaryKey = element.primaryKey.map(
    V1_transformRelationalOperationElement,
  );
  classMapping.propertyMappings = classMappingPropertyMappingsSerializer(
    element.propertyMappings,
  );
  const root = transformMappingElementRoot(element.root);
  if (root !== undefined) {
    classMapping.root = root;
  }
  return classMapping;
};

const transsformRelationalInstanceSetImpl = (
  element: RelationalInstanceSetImplementation,
): V1_RelationalClassMapping => {
  const classMapping = new V1_RelationalClassMapping();
  classMapping.primaryKey = element.primaryKey.map(
    V1_transformRelationalOperationElement,
  );
  classMapping.propertyMappings = classMappingPropertyMappingsSerializer(
    element.propertyMappings,
  );
  const root = transformMappingElementRoot(element.root);
  if (root !== undefined) {
    classMapping.root = root;
  }
  classMapping.class = V1_transformElementReference(element.class);
  return classMapping;
};

const transformAggregationFunctionSpecification = (
  element: AggregationFunctionSpecification,
): V1_AggregateFunction => {
  const func = new V1_AggregateFunction();
  if (!element.mapFn.isStub) {
    func.mapFn = element.mapFn.accept_ValueSpecificationVisitor(
      new V1_RawValueSpecificationTransformer(),
    ) as V1_RawLambda;
  }
  if (!element.aggregateFn.isStub) {
    func.aggregateFn = element.aggregateFn.accept_ValueSpecificationVisitor(
      new V1_RawValueSpecificationTransformer(),
    ) as V1_RawLambda;
  }
  return func;
};

const transformGroupByFunctionSpec = (
  element: GroupByFunctionSpecification,
): V1_GroupByFunction => {
  const func = new V1_GroupByFunction();
  if (!element.groupByFn.isStub) {
    func.groupByFn = element.groupByFn.accept_ValueSpecificationVisitor(
      new V1_RawValueSpecificationTransformer(),
    ) as V1_RawLambda;
  }
  return func;
};

const transformAggregateSpecification = (
  element: AggregateSpecification,
): V1_AggregateSpecification => {
  const aggregateSpec = new V1_AggregateSpecification();
  aggregateSpec.canAggregate = element.canAggregate;
  aggregateSpec.groupByFunctions = element.groupByFunctions.map(
    transformGroupByFunctionSpec,
  );
  aggregateSpec.aggregateValues = element.aggregateValues.map(
    transformAggregationFunctionSpecification,
  );
  return aggregateSpec;
};

const transformAggSetImplContainer = (
  element: AggregateSetImplementationContainer,
): V1_AggregateSetImplementationContainer => {
  const setImplContainer = new V1_AggregateSetImplementationContainer();
  setImplContainer.index = element.index;
  const classMapping = transformSetImplementation(element.setImplementation);
  if (classMapping) {
    setImplContainer.setImplementation = classMapping;
  }
  setImplContainer.aggregateSpecification = transformAggregateSpecification(
    element.aggregateSpecification,
  );
  return setImplContainer;
};

const transformAggregationAwareSetImplementation = (
  element: AggregationAwareSetImplementation,
): V1_AggregationAwareClassMapping => {
  const classMapping = new V1_AggregationAwareClassMapping();
  const root = transformMappingElementRoot(element.root);
  if (root !== undefined) {
    classMapping.root = root;
  }
  const mainSetImplementation = transformSetImplementation(
    element.mainSetImplementation,
  );
  if (mainSetImplementation) {
    classMapping.mainSetImplementation = mainSetImplementation;
  }
  classMapping.propertyMappings = classMappingPropertyMappingsSerializer(
    element.propertyMappings,
  );
  classMapping.aggregateSetImplementations = element.aggregateSetImplementations.map(
    transformAggSetImplContainer,
  );
  return classMapping;
};

// NOTE: this needs to be a function to avoid error with using before declaration for embedded property mappings due to the hoisting behavior in ES
function serializeProperyMapping(
  propertyMapping: PropertyMapping,
): V1_PropertyMapping {
  return propertyMapping.accept_PropertyMappingVisitor(
    new PropertyMappingSerializer(),
  );
}

export class V1_SetImplementationSerializer
  implements SetImplementationVisitor<V1_ClassMapping | undefined> {
  visit_OperationSetImplementation(
    setImplementation: OperationSetImplementation,
  ): V1_ClassMapping | undefined {
    return transformOperationSetImplementation(setImplementation);
  }
  visit_PureInstanceSetImplementation(
    setImplementation: PureInstanceSetImplementation,
  ): V1_ClassMapping | undefined {
    return transformPureInstanceSetImplementation(setImplementation);
  }
  visit_FlatDataInstanceSetImplementation(
    setImplementation: FlatDataInstanceSetImplementation,
  ): V1_ClassMapping | undefined {
    return transformFlatDataInstanceSetImpl(setImplementation);
  }
  visit_EmbeddedFlatDataSetImplementation(
    setImplementation: EmbeddedFlatDataPropertyMapping,
  ): V1_ClassMapping | undefined {
    // FIXME?
    return undefined;
  }

  visit_RootRelationalInstanceSetImplementation(
    setImplementation: RootRelationalInstanceSetImplementation,
  ): V1_ClassMapping | undefined {
    return transformRootRelationalSetImpl(setImplementation);
  }
  visit_RelationalInstanceSetImplementation(
    setImplementation: RelationalInstanceSetImplementation,
  ): V1_ClassMapping | undefined {
    return transsformRelationalInstanceSetImpl(setImplementation);
  }
  visit_AggregationAwareSetImplementation(
    setImplementation: AggregationAwareSetImplementation,
  ): V1_ClassMapping | undefined {
    return transformAggregationAwareSetImplementation(setImplementation);
  }
}

function transformSetImplementation(
  setImplementation: SetImplementation,
): V1_ClassMapping | undefined {
  return setImplementation.accept_SetImplementationVisitor(
    new V1_SetImplementationSerializer(),
  );
}

// Association V1_Mapping
const transformRelationalAssociationImplementation = (
  element: RelationalAssociationImplementation,
): V1_RelationalAssociationMapping => {
  const relationalMapping = new V1_RelationalAssociationMapping();
  relationalMapping.stores = element.stores.map(V1_transformElementReference);
  relationalMapping.association = V1_transformElementReference(
    element.association,
  );
  relationalMapping.propertyMappings = classMappingPropertyMappingsSerializer(
    element.propertyMappings,
  );
  relationalMapping.id = mappingElementIdSerializer(element.id);
  return relationalMapping;
};

const transformXStorelAssociationImplementation = (
  element: XStoreAssociationImplementation,
): V1_XStoreAssociationMapping => {
  const xStoreMapping = new V1_XStoreAssociationMapping();
  xStoreMapping.stores = element.stores.map(V1_transformElementReference);
  xStoreMapping.association = V1_transformElementReference(element.association);
  xStoreMapping.propertyMappings = classMappingPropertyMappingsSerializer(
    element.propertyMappings,
  );
  xStoreMapping.id = mappingElementIdSerializer(element.id);
  return xStoreMapping;
};

const transformAssociationImplementation = (
  element: AssociationImplementation,
): V1_AssociationMapping => {
  if (element instanceof RelationalAssociationImplementation) {
    return transformRelationalAssociationImplementation(element);
  } else if (element instanceof XStoreAssociationImplementation) {
    return transformXStorelAssociationImplementation(element);
  }
  throw new UnsupportedOperationError(
    `Can't transform association implementation of type '${
      getClass(element).name
    }'`,
  );
};

// Main
export const V1_transformMapping = (element: Mapping): V1_Mapping => {
  const mapping = new V1_Mapping();
  V1_initPackageableElement(mapping, element);
  mapping.includedMappings = element.includes.map(transformMappingInclude);
  mapping.enumerationMappings = element.enumerationMappings.map(
    transformEnumerationMapping,
  );
  mapping.classMappings = element.classMappings
    .map(transformSetImplementation)
    .filter(isNonNullable);
  mapping.associationMappings = element.associationMappings.map(
    transformAssociationImplementation,
  );
  mapping.tests = element.tests.map(transformMappingTest);
  return mapping;
};
