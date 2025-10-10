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
  assertNonNullable,
  guaranteeNonNullable,
  assertTrue,
  assertType,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { fromElementPathToMappingElementId } from '../../../../../../../../graph/MetaModelUtils.js';
import type { Type } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Type.js';
import type { Mapping } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/Mapping.js';
import { EnumerationMapping } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/EnumerationMapping.js';
import { Enumeration } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Enumeration.js';
import {
  EnumValueMapping,
  SourceValue,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/EnumValueMapping.js';
import {
  DEPRECATED__MappingTest,
  type DEPRECATED__InputData,
  DEPRECATED__ObjectInputData,
  DEPRECATED__ExpectedOutputMappingTestAssert,
  DEPRECATED__FlatDataInputData,
  DEPRECATED__RelationalInputData,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/DEPRECATED__MappingTest.js';
import type { Class } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/Class.js';
import { InferableMappingElementIdImplicitValue } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/InferableMappingElementId.js';
import {
  type PackageableElementImplicitReference,
  PackageableElementExplicitReference,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';
import { EnumValueImplicitReference } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/EnumValueReference.js';
import type { MappingInclude } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/MappingInclude.js';
import { MappingIncludeMapping } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/MappingIncludeMapping.js';
import { MappingIncludeDataProduct } from '../../../../../../../../graph/metamodel/pure/dataProduct/MappingIncludeDataProduct.js';
import { INTERNAL__UnknownMappingInclude } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/INTERNAL__UnknownMappingInclude.js';
import { SubstituteStore } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/SubstituteStore.js';
import type { SetImplementation } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/SetImplementation.js';
import { InferableMappingElementRootImplicitValue } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/InferableMappingElementRoot.js';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext.js';
import {
  type V1_EnumValueMapping,
  V1_getEnumValueMappingSourceValueType,
} from '../../../../model/packageableElements/mapping/V1_EnumValueMapping.js';
import type { V1_EnumerationMapping } from '../../../../model/packageableElements/mapping/V1_EnumerationMapping.js';
import {
  type V1_DEPRECATED__MappingTest,
  type V1_DEPRECATED__InputData,
  V1_DEPRECATED__ObjectInputData,
  V1_DEPRECATED__FlatDataInputData,
  V1_DEPRECATED__ExpectedOutputMappingTestAssert,
  V1_DEPRECATED__RelationalInputData,
} from '../../../../model/packageableElements/mapping/V1_DEPRECATED__MappingTest.js';
import type { V1_ClassMapping } from '../../../../model/packageableElements/mapping/V1_ClassMapping.js';
import {
  type V1_MappingInclude,
  V1_MappingIncludeMapping,
} from '../../../../model/packageableElements/mapping/V1_MappingInclude.js';
import { V1_MappingIncludeDataProduct } from '../../../../model/packageableElements/dataProduct/V1_MappingIncludeDataProduct.js';
import { V1_INTERNAL__UnknownMappingInclude } from '../../../../model/packageableElements/mapping/V1_INTERNAL__UnknownMappingInclude.js';
import { V1_buildRawLambdaWithResolvedPaths } from './V1_ValueSpecificationPathResolver.js';
import {
  getAllClassMappings,
  getObjectInputType,
} from '../../../../../../../../graph/helpers/DSL_Mapping_Helper.js';
import { getRelationalInputType } from '../../../../../../../../graph/helpers/STO_Relational_Helper.js';
import { getEnumValue } from '../../../../../../../../graph/helpers/DomainHelper.js';
import { PrimitiveType } from '../../../../../../../../graph/metamodel/pure/packageableElements/domain/PrimitiveType.js';
import { type V1_MappingTestSuite } from '../../../../model/packageableElements/mapping/V1_MappingTestSuite.js';
import { MappingTestSuite } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/MappingTestSuite.js';
import { V1_MappingTest } from '../../../../model/packageableElements/mapping/V1_MappingTest.js';
import type { TestSuite } from '../../../../../../../../graph/metamodel/pure/test/Test.js';
import { MappingTest } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/MappingTest.js';
import { V1_buildTestAssertion } from './V1_TestBuilderHelper.js';
import type { V1_MappingStoreTestData } from '../../../../model/packageableElements/mapping/V1_MappingStoreTestData.js';
import { StoreTestData } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/MappingStoreTestData.js';
import { V1_buildEmbeddedData } from './V1_DataElementBuilderHelper.js';
import { ModelStore } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/modelToModel/model/ModelStore.js';
import type { DSL_Mapping_PureProtocolProcessorPlugin_Extension } from '../../../../../extensions/DSL_Mapping_PureProtocolProcessorPlugin_Extension.js';
import { ModelAccessPointGroup } from '../../../../../../../../graph/metamodel/pure/dataProduct/DataProduct.js';

export const V1_getInferredClassMappingId = (
  _class: Class,
  classMapping: V1_ClassMapping,
): InferableMappingElementIdImplicitValue =>
  InferableMappingElementIdImplicitValue.create(
    classMapping.id ?? fromElementPathToMappingElementId(_class.path),
    _class.path,
    classMapping.id,
  );

const buildEnumValueMapping = (
  srcEnumValueMapping: V1_EnumValueMapping,
  enumerationReference: PackageableElementImplicitReference<Enumeration>,
  sourceType?: Type,
): EnumValueMapping => {
  assertNonNullable(
    srcEnumValueMapping.enumValue,
    `Enum value mapping 'enumValue' field is missing`,
  );
  const enumValueMapping = new EnumValueMapping(
    EnumValueImplicitReference.create(
      enumerationReference,
      getEnumValue(enumerationReference.value, srcEnumValueMapping.enumValue),
    ),
  );
  // We will support processing for enumeration mappings with and without source type
  // Enumeration Mappings without source types will be limited to string/integer and not support an enumeration as the sourcetype since
  // there is no indicator of what enumeration the enum value belongs to
  if (
    sourceType === undefined ||
    sourceType === PrimitiveType.INTEGER ||
    sourceType === PrimitiveType.STRING
  ) {
    enumValueMapping.sourceValues = srcEnumValueMapping.sourceValues.map(
      (sourceValue) => new SourceValue(sourceValue.value as string | number),
    );
  } else if (sourceType instanceof Enumeration) {
    enumValueMapping.sourceValues = (
      srcEnumValueMapping.sourceValues.map(
        (sourceValue) => sourceValue.value,
      ) as string[]
    ).map((sourceValue) => {
      const matchingEnum = sourceType.values.find(
        (value) => value.name === sourceValue,
      );
      return new SourceValue(
        guaranteeNonNullable(
          matchingEnum,
          `Can't find enum value '${sourceValue}' in enumeration '${sourceType.path}'`,
        ),
      );
    });
  }
  return enumValueMapping;
};

export const V1_buildEnumerationMapping = (
  srcEnumerationMapping: V1_EnumerationMapping,
  context: V1_GraphBuilderContext,
  parentMapping: Mapping,
): EnumerationMapping => {
  assertNonEmptyString(
    srcEnumerationMapping.enumeration.path,
    `Enumeration mapping 'enumeration' field is missing or empty`,
  );
  const targetEnumeration = context.resolveEnumeration(
    srcEnumerationMapping.enumeration.path,
  );
  const possibleSourceTypes = new Set(
    srcEnumerationMapping.enumValueMappings.flatMap((enumValueMapping) =>
      enumValueMapping.sourceValues.map(V1_getEnumValueMappingSourceValueType),
    ),
  );
  assertTrue(
    possibleSourceTypes.size <= 1,
    `Enumeration mapping contains mixed type source values`,
  );
  const sourceTypeInput =
    possibleSourceTypes.size !== 0
      ? Array.from(possibleSourceTypes.values())[0]
      : undefined;
  const sourceTypeReference = sourceTypeInput
    ? context.resolveType(sourceTypeInput)
    : undefined;
  const enumerationMapping = new EnumerationMapping(
    InferableMappingElementIdImplicitValue.create(
      srcEnumerationMapping.id ??
        fromElementPathToMappingElementId(targetEnumeration.value.path),
      targetEnumeration.value.path,
      srcEnumerationMapping.id,
    ),
    targetEnumeration,
    parentMapping,
    sourceTypeReference,
  );
  enumerationMapping.enumValueMappings =
    srcEnumerationMapping.enumValueMappings.map((enumValueMapping) =>
      buildEnumValueMapping(
        enumValueMapping,
        targetEnumeration,
        sourceTypeReference?.value,
      ),
    );
  return enumerationMapping;
};

export const V1_buildMappingInclude = (
  protocol: V1_MappingInclude,
  context: V1_GraphBuilderContext,
  parentMapping: Mapping,
): MappingInclude => {
  if (protocol instanceof V1_INTERNAL__UnknownMappingInclude) {
    const metamodel = new INTERNAL__UnknownMappingInclude(parentMapping);
    metamodel.content = protocol.content;
    return metamodel;
  } else if (protocol instanceof V1_MappingIncludeDataProduct) {
    const dataProduct = context.graph.getDataProduct(
      protocol.includedDataProduct,
    );
    const modelAPG = guaranteeNonNullable(
      dataProduct.accessPointGroups
        .filter((apg) => apg instanceof ModelAccessPointGroup)
        .at(0),
      `include dataproduct requires Model AccessPoint Group. Can't find a Model AccessPoint Group for the dataproduct ${protocol.includedDataProduct}`,
    );
    const includedMapping = new MappingIncludeDataProduct(
      parentMapping,
      modelAPG.mapping,
      context.resolveDataProduct(protocol.includedDataProduct),
    );
    return includedMapping;
  } else if (protocol instanceof V1_MappingIncludeMapping) {
    const includedMapping = new MappingIncludeMapping(
      parentMapping,
      context.resolveMapping(protocol.includedMapping),
    );
    if (protocol.sourceDatabasePath && protocol.targetDatabasePath) {
      includedMapping.storeSubstitutions.push(
        new SubstituteStore(
          includedMapping,
          context.resolveStore(protocol.sourceDatabasePath),
          context.resolveStore(protocol.targetDatabasePath),
        ),
      );
    }
    return includedMapping;
  }
  const extraIncludeMappingBuilders = context.extensions.plugins.flatMap(
    (plugin) =>
      (
        plugin as DSL_Mapping_PureProtocolProcessorPlugin_Extension
      ).V1_getExtraMappingIncludeBuilders?.() ?? [],
  );
  for (const builder of extraIncludeMappingBuilders) {
    const builtInclude = builder(protocol, parentMapping, context);
    if (builtInclude) {
      return builtInclude;
    }
  }
  throw new UnsupportedOperationError(
    `Can't transform mapping include: no compatible transformer available from plugins`,
    protocol,
  );
};

const buildMappingStoreTestData = (
  element: V1_MappingStoreTestData,
  context: V1_GraphBuilderContext,
): StoreTestData => {
  const mappingStoreTestData = new StoreTestData();
  if (element.store.path === ModelStore.NAME) {
    mappingStoreTestData.store = PackageableElementExplicitReference.create(
      ModelStore.INSTANCE,
    );
  } else {
    mappingStoreTestData.store = context.resolveStore(element.store.path);
  }
  mappingStoreTestData.data = V1_buildEmbeddedData(element.data, context);
  return mappingStoreTestData;
};

export const V1_buildMappingTest = (
  element: V1_MappingTest,
  parentSuite: TestSuite,
  context: V1_GraphBuilderContext,
): MappingTest => {
  const mappingTest = new MappingTest();
  mappingTest.id = element.id;
  mappingTest.__parent = parentSuite;
  mappingTest.doc = element.doc;
  mappingTest.assertions = element.assertions.map((assertion) =>
    V1_buildTestAssertion(assertion, mappingTest, context),
  );
  mappingTest.storeTestData = element.storeTestData.map((testData) =>
    buildMappingStoreTestData(testData, context),
  );
  return mappingTest;
};

export const V1_buildMappingTestSuite = (
  element: V1_MappingTestSuite,
  context: V1_GraphBuilderContext,
): MappingTestSuite => {
  const mappingTestSuite = new MappingTestSuite();
  mappingTestSuite.id = element.id;
  mappingTestSuite.func = V1_buildRawLambdaWithResolvedPaths(
    element.func.parameters,
    element.func.body,
    context,
  );
  mappingTestSuite.tests = element.tests.map((test) => {
    if (test instanceof V1_MappingTest) {
      return V1_buildMappingTest(test, mappingTestSuite, context);
    }
    throw new UnsupportedOperationError(
      'Unable to build mapping test: Unsupported mapping test type',
    );
  });
  return mappingTestSuite;
};

const V1_buildMappingTestInputData = (
  inputData: V1_DEPRECATED__InputData,
  context: V1_GraphBuilderContext,
): DEPRECATED__InputData => {
  if (inputData instanceof V1_DEPRECATED__ObjectInputData) {
    assertNonNullable(
      inputData.sourceClass,
      `Object input data 'sourceClass' field is missing`,
    );
    assertNonNullable(
      inputData.inputType,
      `Object input data 'inputType' field is missing`,
    );
    assertNonNullable(
      inputData.data,
      `Object input data 'data' field is missing`,
    );
    return new DEPRECATED__ObjectInputData(
      context.resolveClass(inputData.sourceClass),
      getObjectInputType(inputData.inputType),
      inputData.data,
    );
  } else if (inputData instanceof V1_DEPRECATED__FlatDataInputData) {
    assertNonNullable(
      inputData.sourceFlatData,
      `Flat-data input data 'sourceFlatData' field is missing`,
    );
    assertNonNullable(
      inputData.data,
      `Flat-data input data 'data' field is missing`,
    );
    return new DEPRECATED__FlatDataInputData(
      context.resolveFlatDataStore(inputData.sourceFlatData.path),
      inputData.data,
    );
  } else if (inputData instanceof V1_DEPRECATED__RelationalInputData) {
    assertNonNullable(
      inputData.database,
      `Relational input data 'database' field is missing`,
    );
    assertNonNullable(
      inputData.inputType,
      `Relational input data 'inputType' field is missing`,
    );
    assertNonNullable(
      inputData.data,
      `Relational input data 'data' field is missing`,
    );
    return new DEPRECATED__RelationalInputData(
      context.resolveDatabase(inputData.database),
      inputData.data,
      getRelationalInputType(inputData.inputType),
    );
  }
  throw new UnsupportedOperationError(
    `Can't build mapping test input data`,
    inputData,
  );
};

export const V1_buildMappingTestLegacy = (
  mappingTest: V1_DEPRECATED__MappingTest,
  context: V1_GraphBuilderContext,
): DEPRECATED__MappingTest => {
  assertNonEmptyString(
    mappingTest.name,
    `Mapping test 'name' field is missing or empty`,
  );
  assertNonNullable(mappingTest.query, `Mapping test 'query' field is missing`);
  const query = V1_buildRawLambdaWithResolvedPaths(
    mappingTest.query.parameters,
    mappingTest.query.body,
    context,
  );
  // TODO: fix this when we support another mapping test type
  assertType(
    mappingTest.assert,
    V1_DEPRECATED__ExpectedOutputMappingTestAssert,
    `Can't build mapping test assert of type '${mappingTest.assert}'`,
  );
  const modelAssert = new DEPRECATED__ExpectedOutputMappingTestAssert(
    mappingTest.assert.expectedOutput,
  );
  const inputData = mappingTest.inputData.map((input) =>
    V1_buildMappingTestInputData(input, context),
  );
  // TODO: maybe we want to validate the graph fetch tree here so we can throw user into
  // text mode to resolve the issue but as of now, we don't do that because it's just test
  return new DEPRECATED__MappingTest(
    mappingTest.name,
    query,
    inputData,
    modelAssert,
  );
};

export const V1_resolveClassMappingRoot = (mapping: Mapping): void => {
  const index = new Map<Class, Set<SetImplementation>>();
  getAllClassMappings(mapping).forEach((setImpl) => {
    const targetClass = guaranteeNonNullable(setImpl.class.value);
    const setImplsWithTargetClass = index.get(targetClass);
    if (setImplsWithTargetClass) {
      setImplsWithTargetClass.add(setImpl);
    } else {
      const _set = new Set<SetImplementation>();
      _set.add(setImpl);
      index.set(targetClass, _set);
    }
  });
  Array.from(index.entries()).forEach((entries) => {
    const _classMappings = entries[1];
    if (_classMappings.size === 1) {
      const classMapping = Array.from(
        _classMappings.values(),
      )[0] as SetImplementation;
      // ensure you are only altering current mapping
      if (
        classMapping.root.value === false &&
        classMapping._PARENT === mapping
      ) {
        classMapping.root = InferableMappingElementRootImplicitValue.create(
          true,
          classMapping.root.value,
        );
      }
    }
  });
};
