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
  guaranteeNonEmptyString,
  IllegalStateError,
  isNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import type { Mapping } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/Mapping.js';
import type {
  SetImplementationVisitor,
  SetImplementation,
} from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/SetImplementation.js';
import type {
  PropertyMappingVisitor,
  PropertyMapping,
} from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/PropertyMapping.js';
import { PurePropertyMapping } from '../../../../../../../graph/metamodel/pure/packageableElements/store/modelToModel/mapping/PurePropertyMapping.js';
import { Enum } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/Enum.js';
import type { EnumValueMapping } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/EnumValueMapping.js';
import type { EnumerationMapping } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/EnumerationMapping.js';
import { extractLine } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/RelationalOperationElement.js';
import { FlatDataPropertyMapping } from '../../../../../../../graph/metamodel/pure/packageableElements/store/flatData/mapping/FlatDataPropertyMapping.js';
import type { EmbeddedFlatDataPropertyMapping } from '../../../../../../../graph/metamodel/pure/packageableElements/store/flatData/mapping/EmbeddedFlatDataPropertyMapping.js';
import type { PureInstanceSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation.js';
import {
  type OperationSetImplementation,
  OperationType,
} from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/OperationSetImplementation.js';
import type { FlatDataInstanceSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/store/flatData/mapping/FlatDataInstanceSetImplementation.js';
import type { RelationalInstanceSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/RelationalInstanceSetImplementation.js';
import type { RootRelationalInstanceSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation.js';
import { RelationalPropertyMapping } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/RelationalPropertyMapping.js';
import type { EmbeddedRelationalInstanceSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/EmbeddedRelationalInstanceSetImplementation.js';
import type { InlineEmbeddedRelationalInstanceSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/InlineEmbeddedRelationalInstanceSetImplementation.js';
import type { OtherwiseEmbeddedRelationalInstanceSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/OtherwiseEmbeddedRelationalInstanceSetImplementation.js';
import type { InferableMappingElementIdValue } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/InferableMappingElementId.js';
import { MappingIncludeMapping } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/MappingIncludeMapping.js';
import { INTERNAL__UnknownMappingInclude } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/INTERNAL__UnknownMappingInclude.js';
import type { MappingInclude } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/MappingInclude.js';
import {
  type DEPRECATED__MappingTest,
  type DEPRECATED__InputData,
  type DEPRECATED__MappingTestAssert,
  DEPRECATED__ExpectedOutputMappingTestAssert,
  DEPRECATED__ObjectInputData,
  DEPRECATED__FlatDataInputData,
  ObjectInputType,
  DEPRECATED__RelationalInputData,
} from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/DEPRECATED__MappingTest.js';
import type { AssociationImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/AssociationImplementation.js';
import { RelationalAssociationImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/RelationalAssociationImplementation.js';
import type { PropertyReference } from '../../../../../../../graph/metamodel/pure/packageableElements/domain/PropertyReference.js';
import type { AggregationAwareSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/aggregationAware/AggregationAwareSetImplementation.js';
import type { AggregationAwarePropertyMapping } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/aggregationAware/AggregationAwarePropertyMapping.js';
import type { AggregateSetImplementationContainer } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/aggregationAware/AggregateSetImplementationContainer.js';
import type { AggregateSpecification } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/aggregationAware/AggregateSpecification.js';
import type { AggregationFunctionSpecification } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/aggregationAware/AggregationFunctionSpecification.js';
import type { GroupByFunctionSpecification } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/aggregationAware/GroupByFunctionSpecification.js';
import type { V1_RawLambda } from '../../../model/rawValueSpecification/V1_RawLambda.js';
import {
  V1_initPackageableElement,
  V1_transformElementReferencePointer,
  V1_transformMultiplicity,
} from './V1_CoreTransformerHelper.js';
import { V1_Mapping } from '../../../model/packageableElements/mapping/V1_Mapping.js';
import {
  V1_EnumValueMapping,
  V1_EnumValueMappingEnumSourceValue,
  V1_EnumValueMappingIntegerSourceValue,
  V1_EnumValueMappingStringSourceValue,
} from '../../../model/packageableElements/mapping/V1_EnumValueMapping.js';
import type { V1_PropertyMapping } from '../../../model/packageableElements/mapping/V1_PropertyMapping.js';
import type { V1_ClassMapping } from '../../../model/packageableElements/mapping/V1_ClassMapping.js';
import type { V1_AssociationMapping } from '../../../model/packageableElements/mapping/V1_AssociationMapping.js';
import { V1_RelationalAssociationMapping } from '../../../model/packageableElements/store/relational/mapping/V1_RelationalAssociationMapping.js';
import {
  type V1_DEPRECATED__MappingTestAssert,
  type V1_DEPRECATED__InputData,
  V1_DEPRECATED__MappingTest,
  V1_DEPRECATED__ObjectInputData,
  V1_DEPRECATED__ObjectInputType,
  V1_DEPRECATED__FlatDataInputData,
  V1_DEPRECATED__ExpectedOutputMappingTestAssert,
  V1_DEPRECATED__RelationalInputData,
} from '../../../model/packageableElements/mapping/V1_DEPRECATED__MappingTest.js';
import { V1_RawValueSpecificationTransformer } from './V1_RawValueSpecificationTransformer.js';
import {
  type V1_MappingInclude,
  V1_MappingIncludeMapping,
} from '../../../model/packageableElements/mapping/V1_MappingInclude.js';
import { V1_INTERNAL__UnknownMappingInclude } from '../../../model/packageableElements/mapping/V1_INTERNAL__UnknownMappingInclude.js';
import { V1_EnumerationMapping } from '../../../model/packageableElements/mapping/V1_EnumerationMapping.js';
import { V1_FlatDataPropertyMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_FlatDataPropertyMapping.js';
import { V1_PropertyPointer } from '../../../model/packageableElements/domain/V1_PropertyPointer.js';
import { V1_EmbeddedFlatDataPropertyMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_EmbeddedFlatDataPropertyMapping.js';
import { V1_PurePropertyMapping } from '../../../model/packageableElements/store/modelToModel/mapping/V1_PurePropertyMapping.js';
import { V1_RelationalPropertyMapping } from '../../../model/packageableElements/store/relational/mapping/V1_RelationalPropertyMapping.js';
import {
  V1_transformRelationalOperationElement,
  V1_transformTableAliasToTablePointer,
} from './V1_DatabaseTransformer.js';
import { V1_EmbeddedRelationalPropertyMapping } from '../../../model/packageableElements/store/relational/mapping/V1_EmbeddedRelationalPropertyMapping.js';
import { V1_InlineEmbeddedPropertyMapping } from '../../../model/packageableElements/store/relational/mapping/V1_InlineEmbeddedPropertyMapping.js';
import { V1_OtherwiseEmbeddedRelationalPropertyMapping } from '../../../model/packageableElements/store/relational/mapping/V1_OtherwiseEmbeddedRelationalPropertyMapping.js';
import { V1_RelationalClassMapping } from '../../../model/packageableElements/store/relational/mapping/V1_RelationalClassMapping.js';
import {
  V1_MappingOperationType,
  V1_OperationClassMapping,
} from '../../../model/packageableElements/mapping/V1_OperationClassMapping.js';
import { V1_PureInstanceClassMapping } from '../../../model/packageableElements/store/modelToModel/mapping/V1_PureInstanceClassMapping.js';
import { V1_RootFlatDataClassMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_RootFlatDataClassMapping.js';
import { V1_RootRelationalClassMapping } from '../../../model/packageableElements/store/relational/mapping/V1_RootRelationalClassMapping.js';
import { V1_AggregationAwareClassMapping } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregationAwareClassMapping.js';
import { V1_AggregationAwarePropertyMapping } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregationAwarePropertyMapping.js';
import { V1_AggregateSetImplementationContainer } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregateSetImplementationContainer.js';
import { V1_AggregateSpecification } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregateSpecification.js';
import { V1_AggregateFunction } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregateFunction.js';
import { V1_GroupByFunction } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_GroupByFunction.js';
import type { XStorePropertyMapping } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/xStore/XStorePropertyMapping.js';
import { V1_XStorePropertyMapping } from '../../../model/packageableElements/mapping/xStore/V1_XStorePropertyMapping.js';
import { XStoreAssociationImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/xStore/XStoreAssociationImplementation.js';
import { V1_XStoreAssociationMapping } from '../../../model/packageableElements/mapping/xStore/V1_XStoreAssociationMapping.js';
import { V1_LocalMappingPropertyInfo } from '../../../model/packageableElements/mapping/V1_LocalMappingPropertyInfo.js';
import type { LocalMappingPropertyInfo } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/LocalMappingPropertyInfo.js';
import { V1_FilterMapping } from '../../../model/packageableElements/store/relational/mapping/V1_FilterMapping.js';
import { V1_FilterPointer } from '../../../model/packageableElements/store/relational/mapping/V1_FilterPointer.js';
import { V1_JoinPointer } from '../../../model/packageableElements/store/relational/model/V1_JoinPointer.js';
import type { V1_RawRelationalOperationElement } from '../../../model/packageableElements/store/relational/model/V1_RawRelationalOperationElement.js';
import { PackageableElementPointerType } from '../../../../../../../graph/MetaModelConst.js';
import type { V1_GraphTransformerContext } from './V1_GraphTransformerContext.js';
import type { DSL_Mapping_PureProtocolProcessorPlugin_Extension } from '../../../../extensions/DSL_Mapping_PureProtocolProcessorPlugin_Extension.js';
import type { InstanceSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/InstanceSetImplementation.js';
import type { SubstituteStore } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/SubstituteStore.js';
import { V1_BindingTransformer } from '../../../model/packageableElements/externalFormat/store/V1_DSL_ExternalFormat_BindingTransformer.js';
import { V1_MergeOperationClassMapping } from '../../../model/packageableElements/mapping/V1_MergeOperationClassMapping.js';
import { MergeOperationSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/MergeOperationSetImplementation.js';
import type { INTERNAL__UnresolvedSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/INTERNAL__UnresolvedSetImplementation.js';
import { isStubbed_EnumValueMapping } from '../../../../../../../graph/helpers/creator/DSL_Mapping_ModelCreatorHelper.js';
import { isStubbed_RawLambda } from '../../../../../../../graph/helpers/creator/RawValueSpecificationCreatorHelper.js';
import { isStubbed_RawRelationalOperationElement } from '../../../../../../../graph/helpers/creator/STO_Relational_ModelCreatorHelper.js';
import { pruneSourceInformation } from '../../../../../../../graph/MetaModelUtils.js';
import { FlatDataAssociationImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/store/flatData/mapping/FlatDataAssociationImplementation.js';
import { V1_FlatDataAssociationMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_FlatDataAssociationMapping.js';
import type { FlatDataAssociationPropertyMapping } from '../../../../../../../graph/metamodel/pure/packageableElements/store/flatData/mapping/FlatDataAssociationPropertyMapping.js';
import { V1_FlatDataAssociationPropertyMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_FlatDataAssociationPropertyMapping.js';
import { V1_MappingTest } from '../../../model/packageableElements/mapping/V1_MappingTest.js';
import {
  V1_transformAtomicTest,
  V1_transformTestAssertion,
  V1_transformTestSuite,
} from './V1_TestTransformer.js';
import type { MappingTest } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/MappingTest.js';
import { type MappingTestSuite } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/MappingTestSuite.js';
import { V1_MappingTestSuite } from '../../../model/packageableElements/mapping/V1_MappingTestSuite.js';
import type { StoreTestData } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/MappingStoreTestData.js';
import { V1_MappingStoreTestData } from '../../../model/packageableElements/mapping/V1_MappingStoreTestData.js';
import { V1_transformEmbeddedData } from './V1_DataElementTransformer.js';
import { INTERNAL__UnknownPropertyMapping } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/INTERNAL__UnknownPropertyMapping.js';
import { V1_INTERNAL__UnknownPropertyMapping } from '../../../model/packageableElements/mapping/V1_INTERNAL__UnknownPropertyMapping.js';
import type { INTERNAL__UnknownSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/INTERNAL__UnknownSetImplementation.js';
import { V1_INTERNAL__UnknownClassMapping } from '../../../model/packageableElements/mapping/V1_INTERNAL__UnknownClassMapping.js';

export const V1_transformPropertyReference = (
  element: PropertyReference,
  options?: {
    isTransformingEmbeddedPropertyMapping?: boolean;
    isTransformingLocalPropertyMapping?: boolean;
  },
): V1_PropertyPointer => {
  const property = new V1_PropertyPointer();
  property.class =
    options?.isTransformingEmbeddedPropertyMapping ||
    options?.isTransformingLocalPropertyMapping
      ? undefined
      : (element.ownerReference.valueForSerialization ?? '');
  property.property = element.value.name;
  return property;
};

const mappingElementIdSerializer = (
  value: InferableMappingElementIdValue,
): string | undefined => value.valueForSerialization;

const transformLocalPropertyInfo = (
  value: LocalMappingPropertyInfo,
): V1_LocalMappingPropertyInfo => {
  const localPropertyInfo = new V1_LocalMappingPropertyInfo();
  localPropertyInfo.type =
    value.localMappingPropertyType.valueForSerialization ?? '';
  localPropertyInfo.multiplicity = V1_transformMultiplicity(
    value.localMappingPropertyMultiplicity,
  );
  return localPropertyInfo;
};

const transformEnumValueMapping = (
  element: EnumValueMapping,
): V1_EnumValueMapping => {
  const enumValueMapping = new V1_EnumValueMapping();
  enumValueMapping.enumValue = element.enum.value.name;
  enumValueMapping.sourceValues = element.sourceValues
    .filter(isNonNullable)
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
        _enum.enumeration = value.value._OWNER.path;
        return _enum;
      }
      throw new UnsupportedOperationError(
        `Can't transform enum value mapping`,
        value,
      );
    });
  return enumValueMapping;
};

const transformEnumerationMapping = (
  element: EnumerationMapping,
): V1_EnumerationMapping => {
  const enumerationMapping = new V1_EnumerationMapping();
  enumerationMapping.enumValueMappings = element.enumValueMappings
    .filter((e) => !isStubbed_EnumValueMapping(e))
    .map(transformEnumValueMapping);
  enumerationMapping.enumeration =
    element.enumeration.valueForSerialization ?? '';
  enumerationMapping.id = mappingElementIdSerializer(element.id);
  return enumerationMapping;
};

// Mapping Test

export const V1_getObjectInputType = (
  type: string,
): V1_DEPRECATED__ObjectInputType => {
  switch (type) {
    case ObjectInputType.JSON:
      return V1_DEPRECATED__ObjectInputType.JSON;
    case ObjectInputType.XML:
      return V1_DEPRECATED__ObjectInputType.XML;
    default:
      throw new UnsupportedOperationError(
        `Encountered unsupported object input type '${type}'`,
      );
  }
};

const transformObjectInputData = (
  element: DEPRECATED__ObjectInputData,
): V1_DEPRECATED__ObjectInputData => {
  const inputData = new V1_DEPRECATED__ObjectInputData();
  inputData.data = element.data;
  inputData.inputType = V1_getObjectInputType(element.inputType);
  inputData.sourceClass = element.sourceClass.valueForSerialization ?? '';
  return inputData;
};

const transformFlatDataInputData = (
  element: DEPRECATED__FlatDataInputData,
): V1_DEPRECATED__FlatDataInputData => {
  const inputData = new V1_DEPRECATED__FlatDataInputData();
  inputData.data = element.data;
  inputData.sourceFlatData = V1_transformElementReferencePointer(
    PackageableElementPointerType.STORE,
    element.sourceFlatData,
  );
  return inputData;
};

const transformRelationalInputData = (
  element: DEPRECATED__RelationalInputData,
): V1_DEPRECATED__RelationalInputData => {
  const inputData = new V1_DEPRECATED__RelationalInputData();
  inputData.data = element.data;
  inputData.inputType = element.inputType;
  inputData.database = element.database.valueForSerialization ?? '';
  return inputData;
};

const transformExpectedOutputMappingTestAssert = (
  element: DEPRECATED__ExpectedOutputMappingTestAssert,
): V1_DEPRECATED__ExpectedOutputMappingTestAssert => {
  const assert = new V1_DEPRECATED__ExpectedOutputMappingTestAssert();
  assert.expectedOutput = element.expectedOutput;
  return assert;
};

const transformMappingTestInputData = (
  inputData: DEPRECATED__InputData,
): V1_DEPRECATED__InputData => {
  if (inputData instanceof DEPRECATED__ObjectInputData) {
    return transformObjectInputData(inputData);
  } else if (inputData instanceof DEPRECATED__FlatDataInputData) {
    return transformFlatDataInputData(inputData);
  } else if (inputData instanceof DEPRECATED__RelationalInputData) {
    return transformRelationalInputData(inputData);
  }
  throw new UnsupportedOperationError(
    `Can't transform mapping test input data`,
    inputData,
  );
};

const transformTestAssert = (
  mappingTestAssert: DEPRECATED__MappingTestAssert,
): V1_DEPRECATED__MappingTestAssert => {
  if (
    mappingTestAssert instanceof DEPRECATED__ExpectedOutputMappingTestAssert
  ) {
    return transformExpectedOutputMappingTestAssert(mappingTestAssert);
  }
  throw new UnsupportedOperationError(
    `Can't transform mapping test assert`,
    mappingTestAssert,
  );
};

const transformMappingTestLegacy = (
  element: DEPRECATED__MappingTest,
  context: V1_GraphTransformerContext,
): V1_DEPRECATED__MappingTest => {
  const test = new V1_DEPRECATED__MappingTest();
  test.assert = transformTestAssert(element.assert);
  test.inputData = element.inputData.map(transformMappingTestInputData);
  test.name = element.name;
  test.query = element.query.accept_RawValueSpecificationVisitor(
    new V1_RawValueSpecificationTransformer(context),
  ) as V1_RawLambda;
  return test;
};

const transformMappingStoreTestData = (
  element: StoreTestData,
  context: V1_GraphTransformerContext,
): V1_MappingStoreTestData => {
  const testData = new V1_MappingStoreTestData();
  testData.data = V1_transformEmbeddedData(element.data, context);
  testData.store = element.store.valueForSerialization ?? '';
  return testData;
};

export const V1_transformMappingTest = (
  element: MappingTest,
  context: V1_GraphTransformerContext,
): V1_MappingTest => {
  const mappingTest = new V1_MappingTest();
  mappingTest.id = element.id;
  mappingTest.doc = element.doc;
  mappingTest.assertions = element.assertions.map((assertion) =>
    V1_transformTestAssertion(assertion),
  );
  mappingTest.storeTestData = element.storeTestData.map((testData) =>
    transformMappingStoreTestData(testData, context),
  );
  return mappingTest;
};

export const V1_transformMappingTestSuite = (
  element: MappingTestSuite,
  context: V1_GraphTransformerContext,
): V1_MappingTestSuite => {
  const mappingTestSuite = new V1_MappingTestSuite();
  mappingTestSuite.id = element.id;
  mappingTestSuite.doc = element.doc;
  mappingTestSuite.func = element.func.accept_RawValueSpecificationVisitor(
    new V1_RawValueSpecificationTransformer(context),
  ) as V1_RawLambda;
  mappingTestSuite.tests = element.tests.map((test) =>
    V1_transformAtomicTest(test, context),
  );
  return mappingTestSuite;
};

// Include Mapping
const transformMappingInclude = (
  element: MappingInclude,
  context: V1_GraphTransformerContext,
): V1_MappingInclude => {
  if (element instanceof INTERNAL__UnknownMappingInclude) {
    const protocol = new V1_INTERNAL__UnknownMappingInclude();
    protocol.content = element.content;
    return protocol;
  } else if (element instanceof MappingIncludeMapping) {
    const mappingInclude = new V1_MappingIncludeMapping();
    mappingInclude.includedMapping =
      element.included.valueForSerialization ?? '';
    mappingInclude.sourceDatabasePath = element.storeSubstitutions.length
      ? ((element.storeSubstitutions[0] as SubstituteStore).original
          .valueForSerialization ?? '')
      : undefined;
    mappingInclude.targetDatabasePath = element.storeSubstitutions.length
      ? ((element.storeSubstitutions[0] as SubstituteStore).substitute
          .valueForSerialization ?? '')
      : undefined;
    return mappingInclude;
  }
  const extraIncludeMappingTransformers = context.plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Mapping_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraMappingIncludeTransformers?.() ?? [],
  );
  for (const transformer of extraIncludeMappingTransformers) {
    const mappingInclude = transformer(element, context);
    if (mappingInclude) {
      return mappingInclude;
    }
  }
  throw new UnsupportedOperationError(
    `Can't transform mapping include: no compatible transformer available from plugins`,
    element,
  );
};

// Class Mapping

const transformClassMappingPropertyMappings = (
  values: PropertyMapping[],
  isTransformingEmbeddedPropertyMapping: boolean,
  context: V1_GraphTransformerContext,
): V1_PropertyMapping[] =>
  values
    .filter((value) => {
      if (value instanceof INTERNAL__UnknownPropertyMapping) {
        return true;
      } else if (value instanceof PurePropertyMapping) {
        return !isStubbed_RawLambda(value.transform);
      } else if (value instanceof FlatDataPropertyMapping) {
        return !isStubbed_RawLambda(value.transform);
      } else if (value instanceof RelationalPropertyMapping) {
        return !isStubbed_RawRelationalOperationElement(
          value.relationalOperation,
        );
      }
      const checkerResult = context.plugins
        .flatMap(
          (plugin) =>
            (
              plugin as DSL_Mapping_PureProtocolProcessorPlugin_Extension
            ).getExtraPropertyMappingTransformationExcludabilityCheckers?.() ??
            [],
        )
        .map((checker) => checker(value))
        .filter(isNonNullable);
      return !checkerResult.length || checkerResult.some(Boolean);
    })
    .map((value) =>
      transformProperyMapping(
        value,
        isTransformingEmbeddedPropertyMapping,
        context,
      ),
    );

const transformSimpleFlatDataPropertyMapping = (
  element: FlatDataPropertyMapping,
  context: V1_GraphTransformerContext,
): V1_FlatDataPropertyMapping => {
  const flatDataPropertyMapping = new V1_FlatDataPropertyMapping();
  flatDataPropertyMapping.enumMappingId =
    element.transformer?.valueForSerialization;
  flatDataPropertyMapping.property = V1_transformPropertyReference(
    element.property,
  );
  flatDataPropertyMapping.source =
    element.sourceSetImplementation.valueForSerialization;
  flatDataPropertyMapping.target =
    element.targetSetImplementation?.valueForSerialization;
  if (!isStubbed_RawLambda(element.transform)) {
    flatDataPropertyMapping.transform =
      element.transform.accept_RawValueSpecificationVisitor(
        new V1_RawValueSpecificationTransformer(context),
      ) as V1_RawLambda;
  }
  return flatDataPropertyMapping;
};

const transformFlatDataAssociationPropertyMapping = (
  element: FlatDataAssociationPropertyMapping,
  context: V1_GraphTransformerContext,
): V1_FlatDataAssociationPropertyMapping => {
  const flatDataAssociationPropertyMapping =
    new V1_FlatDataAssociationPropertyMapping();

  flatDataAssociationPropertyMapping.property = V1_transformPropertyReference(
    element.property,
  );
  flatDataAssociationPropertyMapping.source =
    element.sourceSetImplementation.valueForSerialization;
  flatDataAssociationPropertyMapping.target =
    element.targetSetImplementation?.valueForSerialization;

  flatDataAssociationPropertyMapping.flatData = element.flatData;

  flatDataAssociationPropertyMapping.sectionName = element.sectionName;

  return flatDataAssociationPropertyMapping;
};

const transformEmbeddedFlatDataPropertyMapping = (
  element: EmbeddedFlatDataPropertyMapping,
  context: V1_GraphTransformerContext,
): V1_EmbeddedFlatDataPropertyMapping => {
  const embedded = new V1_EmbeddedFlatDataPropertyMapping();
  const id = mappingElementIdSerializer(element.id);
  if (id) {
    embedded.id = id;
  }
  embedded.class = element.class.valueForSerialization ?? '';
  embedded.property = V1_transformPropertyReference(element.property); // TODO: we might ned to turn 'isTransformingEmbeddedPropertyMapping' on in the future once we start working on the gramar roundtrip for flat-data
  embedded.propertyMappings = transformClassMappingPropertyMappings(
    element.propertyMappings,
    false, // TODO: we might ned to turn this on in the future once we start working on the gramar roundtrip for flat-data
    context,
  );
  embedded.root = false;
  embedded.source = element.sourceSetImplementation.valueForSerialization;
  embedded.target = element.targetSetImplementation?.valueForSerialization;
  return embedded;
};

const transformPurePropertyMapping = (
  element: PurePropertyMapping,
  context: V1_GraphTransformerContext,
): V1_PurePropertyMapping => {
  const purePropertyMapping = new V1_PurePropertyMapping();
  purePropertyMapping.enumMappingId =
    element.transformer?.valueForSerialization;
  purePropertyMapping.property = V1_transformPropertyReference(
    element.property,
    {
      isTransformingLocalPropertyMapping: Boolean(element.localMappingProperty),
    },
  );
  purePropertyMapping.source =
    element.sourceSetImplementation.valueForSerialization;
  purePropertyMapping.target =
    element.targetSetImplementation?.valueForSerialization;
  if (!isStubbed_RawLambda(element.transform)) {
    purePropertyMapping.transform =
      element.transform.accept_RawValueSpecificationVisitor(
        new V1_RawValueSpecificationTransformer(context),
      ) as V1_RawLambda;
  }
  if (element.localMappingProperty) {
    purePropertyMapping.localMappingProperty = transformLocalPropertyInfo(
      element.localMappingProperty,
    );
  }
  purePropertyMapping.explodeProperty = element.explodeProperty;
  return purePropertyMapping;
};

const transformRelationalPropertyMapping = (
  element: RelationalPropertyMapping,
  isTransformingEmbeddedPropertyMapping: boolean,
  context: V1_GraphTransformerContext,
): V1_RelationalPropertyMapping => {
  const propertyMapping = new V1_RelationalPropertyMapping();
  propertyMapping.enumMappingId = element.transformer?.valueForSerialization;
  propertyMapping.property = V1_transformPropertyReference(element.property, {
    isTransformingEmbeddedPropertyMapping:
      isTransformingEmbeddedPropertyMapping,
    isTransformingLocalPropertyMapping: Boolean(element.localMappingProperty),
  });
  // Prune source information from the operation
  // NOTE: if in the future, source information is stored under different key,
  // e.g. { "classPointerSourceInformation": ... }
  // we need to use the prune source information method from `V1_PureGraphManager`
  propertyMapping.relationalOperation = (
    context.keepSourceInformation
      ? element.relationalOperation
      : pruneSourceInformation(element.relationalOperation)
  ) as V1_RawRelationalOperationElement;
  propertyMapping.source =
    element.sourceSetImplementation.valueForSerialization;
  propertyMapping.target =
    element.targetSetImplementation?.valueForSerialization;
  if (element.bindingTransformer?.binding) {
    const bindingTransformer = new V1_BindingTransformer();
    bindingTransformer.binding = guaranteeNonEmptyString(
      element.bindingTransformer.binding.valueForSerialization,
    );
    propertyMapping.bindingTransformer = bindingTransformer;
  }
  if (element.localMappingProperty) {
    propertyMapping.localMappingProperty = transformLocalPropertyInfo(
      element.localMappingProperty,
    );
  }
  return propertyMapping;
};

const transformEmbeddedRelationalPropertyMapping = (
  element: EmbeddedRelationalInstanceSetImplementation,
  isTransformingEmbeddedPropertyMapping: boolean,
  context: V1_GraphTransformerContext,
): V1_EmbeddedRelationalPropertyMapping => {
  const embedded = new V1_EmbeddedRelationalPropertyMapping();
  embedded.property = V1_transformPropertyReference(element.property, {
    isTransformingEmbeddedPropertyMapping:
      isTransformingEmbeddedPropertyMapping,
  });
  embedded.source = element.sourceSetImplementation.valueForSerialization;
  embedded.target = element.targetSetImplementation?.valueForSerialization;
  const classMapping = new V1_RelationalClassMapping();
  classMapping.primaryKey = element.primaryKey.map((pk) =>
    V1_transformRelationalOperationElement(pk, context),
  );
  classMapping.propertyMappings = transformClassMappingPropertyMappings(
    element.propertyMappings,
    true,
    context,
  );
  classMapping.root = element.root.valueForSerialization;
  /**
   * Omit this information during protocol transformation as it can be
   * interpreted while building the graph; and will help grammar-roundtrip
   * tests (involving engine) to pass. Ideally, this requires grammar parser
   * and composer in engine to be more consistent.
   *
   * @discrepancy grammar-roundtrip
   */
  classMapping.class = undefined;
  embedded.classMapping = classMapping;
  if (element.localMappingProperty) {
    embedded.localMappingProperty = transformLocalPropertyInfo(
      element.localMappingProperty,
    );
  }
  return embedded;
};

const transformInlineEmbeddedRelationalPropertyMapping = (
  element: InlineEmbeddedRelationalInstanceSetImplementation,
  isTransformingEmbeddedPropertyMapping: boolean,
): V1_InlineEmbeddedPropertyMapping => {
  const embedded = new V1_InlineEmbeddedPropertyMapping();
  embedded.property = V1_transformPropertyReference(element.property, {
    isTransformingEmbeddedPropertyMapping:
      isTransformingEmbeddedPropertyMapping,
  });
  embedded.source = element.sourceSetImplementation.valueForSerialization;
  embedded.target = element.targetSetImplementation?.valueForSerialization;
  embedded.setImplementationId = element.inlineSetImplementation.id.value;
  if (element.localMappingProperty) {
    embedded.localMappingProperty = transformLocalPropertyInfo(
      element.localMappingProperty,
    );
  }
  return embedded;
};

const transformOtherwiseEmbeddedRelationalPropertyMapping = (
  element: OtherwiseEmbeddedRelationalInstanceSetImplementation,
  isTransformingEmbeddedPropertyMapping: boolean,
  context: V1_GraphTransformerContext,
): V1_OtherwiseEmbeddedRelationalPropertyMapping => {
  const embedded = new V1_OtherwiseEmbeddedRelationalPropertyMapping();
  embedded.property = V1_transformPropertyReference(element.property, {
    isTransformingEmbeddedPropertyMapping:
      isTransformingEmbeddedPropertyMapping,
  });
  embedded.source = element.sourceSetImplementation.valueForSerialization;
  embedded.target = element.targetSetImplementation?.valueForSerialization;
  const classMapping = new V1_RelationalClassMapping();
  classMapping.primaryKey = element.primaryKey.map((pk) =>
    V1_transformRelationalOperationElement(pk, context),
  );
  classMapping.propertyMappings = transformClassMappingPropertyMappings(
    element.propertyMappings,
    true,
    context,
  );
  classMapping.root = element.root.valueForSerialization;
  /**
   * Omit this information during protocol transformation as it can be
   * interpreted while building the graph; and will help grammar-roundtrip
   * tests (involving engine) to pass. Ideally, this requires grammar parser
   * and composer in engine to be more consistent.
   *
   * @discrepancy grammar-roundtrip
   */
  classMapping.class = undefined;
  embedded.classMapping = classMapping;
  embedded.otherwisePropertyMapping = transformProperyMapping(
    element.otherwisePropertyMapping,
    true,
    context,
  ) as V1_RelationalPropertyMapping;
  // use the same property as the parent otherwise
  embedded.otherwisePropertyMapping.property = embedded.property;
  if (element.localMappingProperty) {
    embedded.localMappingProperty = transformLocalPropertyInfo(
      element.localMappingProperty,
    );
  }
  return embedded;
};

const transformXStorePropertyMapping = (
  element: XStorePropertyMapping,
  context: V1_GraphTransformerContext,
): V1_XStorePropertyMapping => {
  const xstore = new V1_XStorePropertyMapping();
  xstore.property = V1_transformPropertyReference(element.property);
  xstore.source = element.sourceSetImplementation.valueForSerialization;
  xstore.target = element.targetSetImplementation?.valueForSerialization;
  if (!isStubbed_RawLambda(element.crossExpression)) {
    xstore.crossExpression =
      element.crossExpression.accept_RawValueSpecificationVisitor(
        new V1_RawValueSpecificationTransformer(context),
      ) as V1_RawLambda;
  }
  if (element.localMappingProperty) {
    xstore.localMappingProperty = transformLocalPropertyInfo(
      element.localMappingProperty,
    );
  }
  return xstore;
};

const transformAggregationAwarePropertyMapping = (
  element: AggregationAwarePropertyMapping,
): V1_AggregationAwarePropertyMapping => {
  const propertyMapping = new V1_AggregationAwarePropertyMapping();
  propertyMapping.property = V1_transformPropertyReference(element.property);
  propertyMapping.source =
    element.sourceSetImplementation.valueForSerialization;
  propertyMapping.target =
    element.targetSetImplementation?.valueForSerialization;
  if (element.localMappingProperty) {
    propertyMapping.localMappingProperty = transformLocalPropertyInfo(
      element.localMappingProperty,
    );
  }
  return propertyMapping;
};

class PropertyMappingTransformer
  implements PropertyMappingVisitor<V1_PropertyMapping>
{
  isTransformingEmbeddedPropertyMapping = false;
  context: V1_GraphTransformerContext;

  constructor(
    isTransformingEmbeddedPropertyMapping: boolean,
    context: V1_GraphTransformerContext,
  ) {
    this.isTransformingEmbeddedPropertyMapping =
      isTransformingEmbeddedPropertyMapping;
    this.context = context;
  }

  visit_PropertyMapping(propertyMapping: PropertyMapping): V1_PropertyMapping {
    const extraPropertyMappingTransformers = this.context.plugins.flatMap(
      (plugin) =>
        (
          plugin as DSL_Mapping_PureProtocolProcessorPlugin_Extension
        ).V1_getExtraPropertyMappingTransformers?.() ?? [],
    );
    for (const transformer of extraPropertyMappingTransformers) {
      const propertyMappingProtocol = transformer(
        propertyMapping,
        this.context,
      );
      if (propertyMappingProtocol) {
        return propertyMappingProtocol;
      }
    }
    throw new UnsupportedOperationError(
      `Can't transform property mapping: no compatible transformer available from plugins`,
      propertyMapping,
    );
  }

  visit_INTERNAL__UnknownPropertyMapping(
    propertyMapping: INTERNAL__UnknownPropertyMapping,
  ): V1_PropertyMapping {
    const protocol = new V1_INTERNAL__UnknownPropertyMapping();
    protocol.content = propertyMapping.content;
    return protocol;
  }

  visit_PurePropertyMapping(
    propertyMapping: PurePropertyMapping,
  ): V1_PurePropertyMapping {
    return transformPurePropertyMapping(propertyMapping, this.context);
  }
  visit_FlatDataPropertyMapping(
    propertyMapping: FlatDataPropertyMapping,
  ): V1_PropertyMapping {
    return transformSimpleFlatDataPropertyMapping(
      propertyMapping,
      this.context,
    );
  }
  visit_FlatDataAssociationPropertyMapping(
    propertyMapping: FlatDataAssociationPropertyMapping,
  ): V1_PropertyMapping {
    return transformFlatDataAssociationPropertyMapping(
      propertyMapping,
      this.context,
    );
  }
  visit_EmbeddedFlatDataPropertyMapping(
    propertyMapping: EmbeddedFlatDataPropertyMapping,
  ): V1_PropertyMapping {
    return transformEmbeddedFlatDataPropertyMapping(
      propertyMapping,
      this.context,
    );
  }
  visit_RelationalPropertyMapping(
    propertyMapping: RelationalPropertyMapping,
  ): V1_PropertyMapping {
    return transformRelationalPropertyMapping(
      propertyMapping,
      this.isTransformingEmbeddedPropertyMapping,
      this.context,
    );
  }
  visit_EmbeddedRelationalPropertyMapping(
    propertyMapping: EmbeddedRelationalInstanceSetImplementation,
  ): V1_PropertyMapping {
    return transformEmbeddedRelationalPropertyMapping(
      propertyMapping,
      this.isTransformingEmbeddedPropertyMapping,
      this.context,
    );
  }
  visit_InlineEmbeddedRelationalPropertyMapping(
    propertyMapping: InlineEmbeddedRelationalInstanceSetImplementation,
  ): V1_PropertyMapping {
    return transformInlineEmbeddedRelationalPropertyMapping(
      propertyMapping,
      this.isTransformingEmbeddedPropertyMapping,
    );
  }
  visit_OtherwiseEmbeddedRelationalPropertyMapping(
    propertyMapping: OtherwiseEmbeddedRelationalInstanceSetImplementation,
  ): V1_PropertyMapping {
    return transformOtherwiseEmbeddedRelationalPropertyMapping(
      propertyMapping,
      this.isTransformingEmbeddedPropertyMapping,
      this.context,
    );
  }
  visit_XStorePropertyMapping(
    propertyMapping: XStorePropertyMapping,
  ): V1_PropertyMapping {
    return transformXStorePropertyMapping(propertyMapping, this.context);
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
    case OperationType.INHERITANCE:
      return V1_MappingOperationType.INHERITANCE;
    case OperationType.MERGE:
      return V1_MappingOperationType.MERGE;
    default:
      throw new UnsupportedOperationError(
        `Can't transform operation type`,
        value,
      );
  }
};

const transformOperationSetImplementation = (
  element: OperationSetImplementation,
): V1_OperationClassMapping => {
  const classMapping = new V1_OperationClassMapping();
  classMapping.class = element.class.valueForSerialization ?? '';
  classMapping.id = mappingElementIdSerializer(element.id);
  classMapping.operation = transformOperationType(element.operation);
  classMapping.parameters = element.parameters.map(
    (e) => e.setImplementation.value.id.value,
  );
  classMapping.root = element.root.valueForSerialization;
  classMapping.extendsClassMappingId = element.superSetImplementationId;
  return classMapping;
};

const transformMergeOperationSetImplementation = (
  element: MergeOperationSetImplementation,
  context: V1_GraphTransformerContext,
): V1_MergeOperationClassMapping => {
  const classMapping = new V1_MergeOperationClassMapping();
  classMapping.class = element.class.valueForSerialization ?? '';
  classMapping.id = mappingElementIdSerializer(element.id);
  classMapping.operation = transformOperationType(element.operation);
  classMapping.validationFunction =
    element.validationFunction.accept_RawValueSpecificationVisitor(
      new V1_RawValueSpecificationTransformer(context),
    ) as V1_RawLambda;
  classMapping.parameters = element.parameters.map(
    (e) => e.setImplementation.value.id.value,
  );
  classMapping.extendsClassMappingId = element.superSetImplementationId;
  classMapping.root = element.root.valueForSerialization;
  return classMapping;
};

const transformPureInstanceSetImplementation = (
  element: PureInstanceSetImplementation,
  context: V1_GraphTransformerContext,
): V1_PureInstanceClassMapping => {
  const classMapping = new V1_PureInstanceClassMapping();
  classMapping.class = element.class.valueForSerialization ?? '';
  if (element.filter) {
    classMapping.filter = element.filter.accept_RawValueSpecificationVisitor(
      new V1_RawValueSpecificationTransformer(context),
    ) as V1_RawLambda;
  }
  classMapping.id = mappingElementIdSerializer(element.id);
  classMapping.propertyMappings = transformClassMappingPropertyMappings(
    element.propertyMappings,
    true,
    context,
  );
  classMapping.extendsClassMappingId = element.superSetImplementationId;
  classMapping.root = element.root.valueForSerialization;
  classMapping.srcClass = element.srcClass?.valueForSerialization;
  return classMapping;
};

const transformFlatDataInstanceSetImpl = (
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
  classMapping.id = mappingElementIdSerializer(element.id);
  classMapping.propertyMappings = transformClassMappingPropertyMappings(
    element.propertyMappings,
    true,
    context,
  );
  classMapping.root = element.root.valueForSerialization;
  classMapping.extendsClassMappingId = element.superSetImplementationId;
  classMapping.sectionName = element.sourceRootRecordType.value._OWNER.name;
  return classMapping;
};

const transformRootRelationalSetImpl = (
  element: RootRelationalInstanceSetImplementation,
  context: V1_GraphTransformerContext,
): V1_RootRelationalClassMapping => {
  const classMapping = new V1_RootRelationalClassMapping();
  classMapping.class = element.class.valueForSerialization ?? '';
  classMapping.distinct = element.distinct ?? false;
  classMapping.id = mappingElementIdSerializer(element.id);
  if (element.mainTableAlias) {
    classMapping.mainTable = V1_transformTableAliasToTablePointer(
      element.mainTableAlias,
    );
  }
  classMapping.extendsClassMappingId = element.superSetImplementationId;
  classMapping.primaryKey = element.primaryKey.map((pk) =>
    V1_transformRelationalOperationElement(pk, context),
  );

  if (element.groupBy) {
    classMapping.groupBy = element.groupBy.columns.map((pk) =>
      V1_transformRelationalOperationElement(pk, context),
    );
  }

  if (element.filter) {
    const filter = new V1_FilterMapping();
    const filterPointer = new V1_FilterPointer();
    filterPointer.db = element.filter.database.path;
    filterPointer.name = element.filter.filterName;
    filter.filter = filterPointer;
    filter.joins = element.filter.joinTreeNode
      ? extractLine(element.filter.joinTreeNode).map((node) => {
          const joinPtr = new V1_JoinPointer();
          joinPtr.db = node.join.ownerReference.valueForSerialization ?? '';
          joinPtr.joinType = node.joinType;
          joinPtr.name = node.join.value.name;
          return joinPtr;
        })
      : [];
    classMapping.filter = filter;
  }
  classMapping.propertyMappings = transformClassMappingPropertyMappings(
    element.propertyMappings,
    false,
    context,
  );
  classMapping.root = element.root.valueForSerialization;
  return classMapping;
};

const transformRelationalInstanceSetImpl = (
  element: RelationalInstanceSetImplementation,
  context: V1_GraphTransformerContext,
): V1_RelationalClassMapping => {
  const classMapping = new V1_RelationalClassMapping();
  classMapping.primaryKey = element.primaryKey.map((pk) =>
    V1_transformRelationalOperationElement(pk, context),
  );
  classMapping.extendsClassMappingId = element.superSetImplementationId;
  classMapping.propertyMappings = transformClassMappingPropertyMappings(
    element.propertyMappings,
    true,
    context,
  );
  classMapping.root = element.root.valueForSerialization;
  /**
   * Omit this information during protocol transformation as it can be
   * interpreted while building the graph; and will help grammar-roundtrip
   * tests (involving engine) to pass. Ideally, this requires grammar parser
   * and composer in engine to be more consistent.
   *
   * @discrepancy grammar-roundtrip
   */
  classMapping.class = undefined;
  return classMapping;
};

const transformAggregationFunctionSpecification = (
  element: AggregationFunctionSpecification,
  context: V1_GraphTransformerContext,
): V1_AggregateFunction => {
  const func = new V1_AggregateFunction();
  if (!isStubbed_RawLambda(element.mapFn)) {
    func.mapFn = element.mapFn.accept_RawValueSpecificationVisitor(
      new V1_RawValueSpecificationTransformer(context),
    ) as V1_RawLambda;
  }
  if (!isStubbed_RawLambda(element.aggregateFn)) {
    func.aggregateFn = element.aggregateFn.accept_RawValueSpecificationVisitor(
      new V1_RawValueSpecificationTransformer(context),
    ) as V1_RawLambda;
  }
  return func;
};

const transformGroupByFunctionSpec = (
  element: GroupByFunctionSpecification,
  context: V1_GraphTransformerContext,
): V1_GroupByFunction => {
  const func = new V1_GroupByFunction();
  if (!isStubbed_RawLambda(element.groupByFn)) {
    func.groupByFn = element.groupByFn.accept_RawValueSpecificationVisitor(
      new V1_RawValueSpecificationTransformer(context),
    ) as V1_RawLambda;
  }
  return func;
};

const transformAggregateSpecification = (
  element: AggregateSpecification,
  context: V1_GraphTransformerContext,
): V1_AggregateSpecification => {
  const aggregateSpec = new V1_AggregateSpecification();
  aggregateSpec.canAggregate = element.canAggregate;
  aggregateSpec.groupByFunctions = element.groupByFunctions.map((groupByFunc) =>
    transformGroupByFunctionSpec(groupByFunc, context),
  );
  aggregateSpec.aggregateValues = element.aggregateValues.map(
    (aggregateValue) =>
      transformAggregationFunctionSpecification(aggregateValue, context),
  );
  return aggregateSpec;
};

const transformAggSetImplContainer = (
  element: AggregateSetImplementationContainer,
  context: V1_GraphTransformerContext,
): V1_AggregateSetImplementationContainer => {
  const setImplContainer = new V1_AggregateSetImplementationContainer();
  setImplContainer.index = element.index;
  const classMapping = transformSetImplementation(
    element.setImplementation,
    context,
  );
  if (classMapping) {
    setImplContainer.setImplementation = classMapping;
  }
  setImplContainer.aggregateSpecification = transformAggregateSpecification(
    element.aggregateSpecification,
    context,
  );
  return setImplContainer;
};

const transformAggregationAwareSetImplementation = (
  element: AggregationAwareSetImplementation,
  context: V1_GraphTransformerContext,
): V1_AggregationAwareClassMapping => {
  const classMapping = new V1_AggregationAwareClassMapping();
  classMapping.id = mappingElementIdSerializer(element.id);
  classMapping.class = element.class.valueForSerialization ?? '';
  classMapping.root = element.root.valueForSerialization;
  const mainSetImplementation = transformSetImplementation(
    element.mainSetImplementation,
    context,
  );
  if (mainSetImplementation) {
    classMapping.mainSetImplementation = mainSetImplementation;
  }
  classMapping.propertyMappings = transformClassMappingPropertyMappings(
    element.propertyMappings,
    false,
    context,
  );
  classMapping.extendsClassMappingId = element.superSetImplementationId;
  classMapping.aggregateSetImplementations =
    element.aggregateSetImplementations.map((aggregateSetImpl) =>
      transformAggSetImplContainer(aggregateSetImpl, context),
    );
  return classMapping;
};

// NOTE: this needs to be a function to avoid error with using before declaration for embedded property mappings due to the hoisting behavior in ES
function transformProperyMapping(
  propertyMapping: PropertyMapping,
  isTransformingEmbeddedPropertyMapping: boolean,
  context: V1_GraphTransformerContext,
): V1_PropertyMapping {
  return propertyMapping.accept_PropertyMappingVisitor(
    new PropertyMappingTransformer(
      isTransformingEmbeddedPropertyMapping,
      context,
    ),
  );
}

export class V1_SetImplementationTransformer
  implements SetImplementationVisitor<V1_ClassMapping | undefined>
{
  context: V1_GraphTransformerContext;

  constructor(context: V1_GraphTransformerContext) {
    this.context = context;
  }

  visit_SetImplementation(
    setImplementation: InstanceSetImplementation,
  ): V1_ClassMapping | undefined {
    const extraClassMappingTransformers = this.context.plugins.flatMap(
      (plugin) =>
        (
          plugin as DSL_Mapping_PureProtocolProcessorPlugin_Extension
        ).V1_getExtraClassMappingTransformers?.() ?? [],
    );
    for (const transformer of extraClassMappingTransformers) {
      const classMapping = transformer(setImplementation, this.context);
      if (classMapping) {
        return classMapping;
      }
    }
    throw new UnsupportedOperationError(
      `Can't transform class mapping: no compatible transformer available from plugins`,
      setImplementation,
    );
  }

  visit_INTERNAL__UnknownSetImplementation(
    setImplementation: INTERNAL__UnknownSetImplementation,
  ): V1_ClassMapping | undefined {
    const protocol = new V1_INTERNAL__UnknownClassMapping();
    protocol.class = setImplementation.class.valueForSerialization ?? '';
    protocol.id = mappingElementIdSerializer(setImplementation.id);
    protocol.root = setImplementation.root.valueForSerialization;
    protocol.content = setImplementation.content;
    return protocol;
  }

  visit_OperationSetImplementation(
    setImplementation: OperationSetImplementation,
  ): V1_ClassMapping | undefined {
    if (setImplementation instanceof MergeOperationSetImplementation) {
      return transformMergeOperationSetImplementation(
        setImplementation,
        this.context,
      );
    } else {
      return transformOperationSetImplementation(setImplementation);
    }
  }

  visit_MergeOperationSetImplementation(
    setImplementation: MergeOperationSetImplementation,
  ): V1_ClassMapping | undefined {
    return transformMergeOperationSetImplementation(
      setImplementation,
      this.context,
    );
  }

  visit_PureInstanceSetImplementation(
    setImplementation: PureInstanceSetImplementation,
  ): V1_ClassMapping | undefined {
    return transformPureInstanceSetImplementation(
      setImplementation,
      this.context,
    );
  }
  visit_FlatDataInstanceSetImplementation(
    setImplementation: FlatDataInstanceSetImplementation,
  ): V1_ClassMapping | undefined {
    return transformFlatDataInstanceSetImpl(setImplementation, this.context);
  }
  visit_EmbeddedFlatDataSetImplementation(
    setImplementation: EmbeddedFlatDataPropertyMapping,
  ): V1_ClassMapping | undefined {
    // NOTE: we currently don't support this and flat-data would probably be deprecated
    // in the future in favor of schema-set/binding
    return undefined;
  }

  visit_RootRelationalInstanceSetImplementation(
    setImplementation: RootRelationalInstanceSetImplementation,
  ): V1_ClassMapping | undefined {
    return transformRootRelationalSetImpl(setImplementation, this.context);
  }
  visit_RelationalInstanceSetImplementation(
    setImplementation: RelationalInstanceSetImplementation,
  ): V1_ClassMapping | undefined {
    return transformRelationalInstanceSetImpl(setImplementation, this.context);
  }
  visit_AggregationAwareSetImplementation(
    setImplementation: AggregationAwareSetImplementation,
  ): V1_ClassMapping | undefined {
    return transformAggregationAwareSetImplementation(
      setImplementation,
      this.context,
    );
  }

  /**
   * This test is skipped because we want to temporarily relax graph building algorithm
   * to ease Pure -> Legend migration push.
   * See https://github.com/finos/legend-studio/issues/880
   *
   * @discrepancy graph-building
   */
  visit_INTERNAL__UnresolvedSetImplementation(
    setImplementation: INTERNAL__UnresolvedSetImplementation,
  ): V1_ClassMapping | undefined {
    throw new IllegalStateError(
      `Can't transform unresolved set implementation. This type of set implementation should only show up in references.`,
    );
  }
}

function transformSetImplementation(
  setImplementation: SetImplementation,
  context: V1_GraphTransformerContext,
): V1_ClassMapping | undefined {
  return setImplementation.accept_SetImplementationVisitor(
    new V1_SetImplementationTransformer(context),
  );
}

// Association V1_Mapping
const transformRelationalAssociationImplementation = (
  element: RelationalAssociationImplementation,
  context: V1_GraphTransformerContext,
): V1_RelationalAssociationMapping => {
  const relationalMapping = new V1_RelationalAssociationMapping();
  relationalMapping.stores = element.stores.map(
    (store) => store.valueForSerialization ?? '',
  );
  relationalMapping.association =
    element.association.valueForSerialization ?? '';
  relationalMapping.propertyMappings = transformClassMappingPropertyMappings(
    element.propertyMappings,
    true,
    context,
  );
  relationalMapping.id = mappingElementIdSerializer(element.id);
  return relationalMapping;
};

const transformFlatDataAssociationImplementation = (
  element: FlatDataAssociationImplementation,
  context: V1_GraphTransformerContext,
): V1_FlatDataAssociationMapping => {
  const flatDataAssociationMapping = new V1_FlatDataAssociationMapping();
  flatDataAssociationMapping.stores = element.stores.map(
    (store) => store.valueForSerialization ?? '',
  );
  flatDataAssociationMapping.association =
    element.association.valueForSerialization ?? '';
  flatDataAssociationMapping.propertyMappings =
    transformClassMappingPropertyMappings(
      element.propertyMappings,
      true,
      context,
    );
  flatDataAssociationMapping.id = mappingElementIdSerializer(element.id);
  return flatDataAssociationMapping;
};

const transformXStorelAssociationImplementation = (
  element: XStoreAssociationImplementation,
  context: V1_GraphTransformerContext,
): V1_XStoreAssociationMapping => {
  const xStoreMapping = new V1_XStoreAssociationMapping();
  xStoreMapping.stores = element.stores.map(
    (store) => store.valueForSerialization ?? '',
  );
  xStoreMapping.association = element.association.valueForSerialization ?? '';
  xStoreMapping.propertyMappings = transformClassMappingPropertyMappings(
    element.propertyMappings,
    false,
    context,
  );
  xStoreMapping.id = mappingElementIdSerializer(element.id);
  return xStoreMapping;
};

const transformAssociationImplementation = (
  element: AssociationImplementation,
  context: V1_GraphTransformerContext,
): V1_AssociationMapping => {
  if (element instanceof RelationalAssociationImplementation) {
    return transformRelationalAssociationImplementation(element, context);
  } else if (element instanceof XStoreAssociationImplementation) {
    return transformXStorelAssociationImplementation(element, context);
  } else if (element instanceof FlatDataAssociationImplementation) {
    return transformFlatDataAssociationImplementation(element, context);
  }
  throw new UnsupportedOperationError(
    `Can't transform association implementation`,
    element,
  );
};

export const V1_transformMapping = (
  element: Mapping,
  context: V1_GraphTransformerContext,
): V1_Mapping => {
  const mapping = new V1_Mapping();
  V1_initPackageableElement(mapping, element);
  mapping.includedMappings = element.includes.map((include) =>
    transformMappingInclude(include, context),
  );
  mapping.enumerationMappings = element.enumerationMappings.map(
    transformEnumerationMapping,
  );
  mapping.classMappings = element.classMappings
    .map((classMapping) => transformSetImplementation(classMapping, context))
    .filter(isNonNullable);
  mapping.associationMappings = element.associationMappings.map(
    (associationMapping) =>
      transformAssociationImplementation(associationMapping, context),
  );
  mapping.tests = element.test.map((test) =>
    transformMappingTestLegacy(test, context),
  );
  mapping.testSuites = element.tests.map((testSuite) =>
    V1_transformTestSuite(testSuite, context),
  );
  return mapping;
};
