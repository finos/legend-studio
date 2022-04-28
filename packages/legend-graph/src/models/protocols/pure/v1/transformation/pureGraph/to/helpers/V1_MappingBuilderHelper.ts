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
import { PRIMITIVE_TYPE } from '../../../../../../../../MetaModelConst';
import { fromElementPathToMappingElementId } from '../../../../../../../../MetaModelUtils';
import { Type } from '../../../../../../../metamodels/pure/packageableElements/domain/Type';
import type { Mapping } from '../../../../../../../metamodels/pure/packageableElements/mapping/Mapping';
import { EnumerationMapping } from '../../../../../../../metamodels/pure/packageableElements/mapping/EnumerationMapping';
import { Enumeration } from '../../../../../../../metamodels/pure/packageableElements/domain/Enumeration';
import {
  EnumValueMapping,
  SourceValue,
} from '../../../../../../../metamodels/pure/packageableElements/mapping/EnumValueMapping';
import { MappingTest } from '../../../../../../../metamodels/pure/packageableElements/mapping/MappingTest';
import {
  ObjectInputData,
  getObjectInputType,
} from '../../../../../../../metamodels/pure/packageableElements/store/modelToModel/mapping/ObjectInputData';
import type { InputData } from '../../../../../../../metamodels/pure/packageableElements/mapping/InputData';
import { FlatDataInputData } from '../../../../../../../metamodels/pure/packageableElements/store/flatData/mapping/FlatDataInputData';
import { ExpectedOutputMappingTestAssert } from '../../../../../../../metamodels/pure/packageableElements/mapping/ExpectedOutputMappingTestAssert';
import type { Class } from '../../../../../../../metamodels/pure/packageableElements/domain/Class';
import { InferableMappingElementIdImplicitValue } from '../../../../../../../metamodels/pure/packageableElements/mapping/InferableMappingElementId';
import {
  type PackageableElementImplicitReference,
  toOptionalPackageableElementReference,
} from '../../../../../../../metamodels/pure/packageableElements/PackageableElementReference';
import { EnumValueImplicitReference } from '../../../../../../../metamodels/pure/packageableElements/domain/EnumValueReference';
import { MappingInclude } from '../../../../../../../metamodels/pure/packageableElements/mapping/MappingInclude';
import { SubstituteStore } from '../../../../../../../metamodels/pure/packageableElements/mapping/SubstituteStore';
import type { SetImplementation } from '../../../../../../../metamodels/pure/packageableElements/mapping/SetImplementation';
import { InferableMappingElementRootImplicitValue } from '../../../../../../../metamodels/pure/packageableElements/mapping/InferableMappingElementRoot';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext';
import {
  type V1_EnumValueMapping,
  V1_getEnumValueMappingSourceValueType,
} from '../../../../model/packageableElements/mapping/V1_EnumValueMapping';
import type { V1_EnumerationMapping } from '../../../../model/packageableElements/mapping/V1_EnumerationMapping';
import type { V1_MappingTest } from '../../../../model/packageableElements/mapping/V1_MappingTest';
import { V1_ExpectedOutputMappingTestAssert } from '../../../../model/packageableElements/mapping/V1_ExpectedOutputMappingTestAssert';
import type { V1_InputData } from '../../../../model/packageableElements/mapping/V1_InputData';
import { V1_ObjectInputData } from '../../../../model/packageableElements/store/modelToModel/mapping/V1_ObjectInputData';
import { V1_FlatDataInputData } from '../../../../model/packageableElements/store/flatData/mapping/V1_FlatDataInputData';
import type { V1_ClassMapping } from '../../../../model/packageableElements/mapping/V1_ClassMapping';
import type { V1_MappingInclude } from '../../../../model/packageableElements/mapping/V1_MappingInclude';
import { V1_buildRawLambdaWithResolvedPaths } from './V1_ValueSpecificationPathResolver';
import { V1_RelationalInputData } from '../../../../model/packageableElements/store/relational/mapping/V1_RelationalInputData';
import {
  getRelationalInputType,
  RelationalInputData,
} from '../../../../../../../metamodels/pure/packageableElements/store/relational/mapping/RelationalInputData';
import { getAllClassMappings } from '../../../../../../../../helpers/MappingHelper';

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
      enumerationReference.value.getValue(srcEnumValueMapping.enumValue),
    ),
  );
  // We will support processing for enumeration mappings with and without source type
  // Enumeration Mappings without source types will be limited to string/integer and not support an enumeration as the sourcetype since
  // there is no indicator of what enumeration the enum value belongs to
  if (
    sourceType === undefined ||
    (sourceType instanceof Type &&
      (sourceType.name === PRIMITIVE_TYPE.INTEGER ||
        sourceType.name === PRIMITIVE_TYPE.STRING))
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
    srcEnumerationMapping.enumeration,
    `Enumeration mapping 'enumeration' field is missing or empty`,
  );
  const targetEnumeration = context.resolveEnumeration(
    srcEnumerationMapping.enumeration,
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
    toOptionalPackageableElementReference(sourceTypeReference),
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
  mappingInclude: V1_MappingInclude,
  context: V1_GraphBuilderContext,
  parentMapping: Mapping,
): MappingInclude => {
  const includedMapping = new MappingInclude(
    parentMapping,
    context.resolveMapping(mappingInclude.includedMappingPath),
  );
  if (mappingInclude.sourceDatabasePath && mappingInclude.targetDatabasePath) {
    includedMapping.storeSubstitutions.push(
      new SubstituteStore(
        includedMapping,
        context.resolveStore(mappingInclude.sourceDatabasePath),
        context.resolveStore(mappingInclude.targetDatabasePath),
      ),
    );
  }
  return includedMapping;
};

const V1_buildMappingTestInputData = (
  inputData: V1_InputData,
  context: V1_GraphBuilderContext,
): InputData => {
  if (inputData instanceof V1_ObjectInputData) {
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
    return new ObjectInputData(
      context.resolveClass(inputData.sourceClass),
      getObjectInputType(inputData.inputType),
      inputData.data,
    );
  } else if (inputData instanceof V1_FlatDataInputData) {
    assertNonNullable(
      inputData.sourceFlatData,
      `Flat-data input data 'sourceFlatData' field is missing`,
    );
    assertNonNullable(
      inputData.data,
      `Flat-data input data 'data' field is missing`,
    );
    return new FlatDataInputData(
      context.resolveFlatDataStore(inputData.sourceFlatData.path),
      inputData.data,
    );
  } else if (inputData instanceof V1_RelationalInputData) {
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
    return new RelationalInputData(
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

export const V1_buildMappingTest = (
  mappingTest: V1_MappingTest,
  context: V1_GraphBuilderContext,
): MappingTest => {
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
    V1_ExpectedOutputMappingTestAssert,
    `Can't build mapping test assert of type '${mappingTest.assert}'`,
  );
  const modelAssert = new ExpectedOutputMappingTestAssert(
    mappingTest.assert.expectedOutput,
  );
  const inputData = mappingTest.inputData.map((input) =>
    V1_buildMappingTestInputData(input, context),
  );
  // TODO: maybe we want to validate the graph fetch tree here so we can throw user into
  // text mode to resolve the issue but as of now, we don't do that because it's just test
  return new MappingTest(mappingTest.name, query, inputData, modelAssert);
};

export const V1_resolveClassMappingRoot = (mapping: Mapping): void => {
  const classToSetImplMap = new Map<Class, Set<SetImplementation>>();
  getAllClassMappings(mapping).forEach((setImpl) => {
    const targetClass = guaranteeNonNullable(setImpl.class.value);
    const setImplsWithTargetClass = classToSetImplMap.get(targetClass);
    if (setImplsWithTargetClass) {
      setImplsWithTargetClass.add(setImpl);
    } else {
      const _set = new Set<SetImplementation>();
      _set.add(setImpl);
      classToSetImplMap.set(targetClass, _set);
    }
  });
  Array.from(classToSetImplMap.entries()).forEach((entries) => {
    const _classMappings = entries[1];
    if (_classMappings.size === 1) {
      const classMapping = Array.from(
        _classMappings.values(),
      )[0] as SetImplementation;
      // ensure you are only altering current mapping
      if (
        classMapping.root.value === false &&
        classMapping.parent === mapping
      ) {
        classMapping.root = InferableMappingElementRootImplicitValue.create(
          true,
          classMapping.root.value,
        );
      }
    }
  });
};
