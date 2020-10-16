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

import { assertNonEmptyString, assertNonNullable, guaranteeNonNullable, assertTrue, assertType, UnsupportedOperationError } from 'Utilities/GeneralUtil';
import { PRIMITIVE_TYPE } from 'MetaModelConst';
import { fromElementPathToMappingElementId } from 'MetaModelUtility';
import { Type as MM_Type } from 'MM/model/packageableElements/domain/Type';
import { Mapping as MM_Mapping } from 'MM/model/packageableElements/mapping/Mapping';
import { EnumerationMapping as MM_EnumerationMapping } from 'MM/model/packageableElements/mapping/EnumerationMapping';
import { Enumeration as MM_Enumeration } from 'MM/model/packageableElements/domain/Enumeration';
import { EnumValueMapping as MM_EnumValueMapping, SourceValue as MM_SourceValue } from 'MM/model/packageableElements/mapping/EnumValueMapping';
import { MappingTest as MM_MappingTest } from 'MM/model/packageableElements/mapping/MappingTest';
import { Lambda as MM_Lambda } from 'MM/model/valueSpecification/raw/Lambda';
import { ObjectInputData as MM_ObjectInputData, getObjectInputType as MM_getObjectInputType } from 'MM/model/packageableElements/store/modelToModel/mapping/ObjectInputData';
import { InputData as MM_InputData } from 'MM/model/packageableElements/mapping/InputData';
import { ExpectedOutputMappingTestAssert as MM_ExpectedOutputMappingTestAssert } from 'MM/model/packageableElements/mapping/ExpectedOutputMappingTestAssert';
import { Class as MM_Class } from 'MM/model/packageableElements/domain/Class';
import { InferableMappingElementIdImplicitValue as MM_InferableMappingElementIdImplicitValue } from 'MM/model/packageableElements/mapping/InferableMappingElementId';
import { PackageableElementImplicitReference as MM_PackageableElementImplicitReference, OptionalPackageableElementImplicitReference as MM_OptionalPackageableElementImplicitReference } from 'MM/model/packageableElements/PackageableElementReference';
import { EnumValueExplicitReference as MM_EnumValueExplicitReference } from 'MM/model/packageableElements/domain/EnumValueReference';
import { MappingInclude as MM_MappingInclude } from 'MM/model/packageableElements/mapping/MappingInclude';
import { SubstituteStore as MM_SubstituteStore } from 'MM/model/packageableElements/mapping/SubstituteStore';
import { GraphBuilderContext } from './GraphBuilderContext';
import { EnumValueMapping, getEnumValueMappingSourceValueType } from 'V1/model/packageableElements/mapping/EnumValueMapping';
import { EnumerationMapping } from 'V1/model/packageableElements/mapping/EnumerationMapping';
import { MappingTest } from 'V1/model/packageableElements/mapping/MappingTest';
import { ExpectedOutputMappingTestAssert } from 'V1/model/packageableElements/mapping/ExpectedOutputMappingTestAssert';
import { InputData } from 'V1/model/packageableElements/mapping/InputData';
import { ObjectInputData } from 'V1/model/packageableElements/store/modelToModel/mapping/ObjectInputData';
import { ClassMapping } from 'V1/model/packageableElements/mapping/ClassMapping';
import { MappingInclude } from 'V1/model/packageableElements/mapping/MappingInclude';

export const getInferredClassMappingId = (_class: MM_Class, classMapping: ClassMapping): MM_InferableMappingElementIdImplicitValue => MM_InferableMappingElementIdImplicitValue.create(classMapping.id ?? fromElementPathToMappingElementId(_class.path), _class.path, classMapping.id);

const processEnumValueMapping = (srcEnumValueMapping: EnumValueMapping, enumeration: MM_PackageableElementImplicitReference<MM_Enumeration>, sourceType?: MM_Type): MM_EnumValueMapping => {
  assertNonNullable(srcEnumValueMapping.enumValue, `Enum value mapping enum value name is missing`);
  const enumValueMapping = new MM_EnumValueMapping(MM_EnumValueExplicitReference.create(enumeration.value.getValue(srcEnumValueMapping.enumValue)));
  // We will support processing for enumeration mappings with and without source type
  // Enumeration Mappings without source types will be limited to string/integer and not support an enumeration as the sourcetype since
  // there is no indicator of what enumeration the enum value belongs to
  if (sourceType === undefined || sourceType instanceof MM_Type && (sourceType.name === PRIMITIVE_TYPE.INTEGER || sourceType.name === PRIMITIVE_TYPE.STRING)) {
    enumValueMapping.sourceValues = srcEnumValueMapping.sourceValues.map(sourceValue => new MM_SourceValue(sourceValue.value as string | number));
  } else if (sourceType instanceof MM_Enumeration) {
    enumValueMapping.sourceValues = (srcEnumValueMapping.sourceValues.map(sourceValue => sourceValue.value) as string[])
      .map(sourceValue => {
        const matchingEnum = sourceType.values.find(value => value.name === sourceValue);
        return new MM_SourceValue(guaranteeNonNullable(matchingEnum, `Can't find enum value '${sourceValue}' in enumeration '${sourceType.path}'`));
      });
  }
  return enumValueMapping;
};

export const processEnumerationMapping = (srcEnumerationMapping: EnumerationMapping, context: GraphBuilderContext, parentMapping: MM_Mapping): MM_EnumerationMapping => {
  assertNonEmptyString(srcEnumerationMapping.enumeration, 'Enumeration mapping enumeration is missing');
  const targetEnumeration = context.resolveEnumeration(srcEnumerationMapping.enumeration);
  const possibleSourceTypes = new Set(srcEnumerationMapping.enumValueMappings.flatMap(enumValueMapping => enumValueMapping.sourceValues.map(getEnumValueMappingSourceValueType)));
  assertTrue(possibleSourceTypes.size <= 1, 'Enumeration mapping contains mixed type source values');
  const sourceTypeInput = possibleSourceTypes.size !== 0 ? Array.from(possibleSourceTypes.values())[0] : undefined;
  const sourceTypeReference = sourceTypeInput ? context.resolveType(sourceTypeInput) : undefined;
  const enumerationMapping = new MM_EnumerationMapping(MM_InferableMappingElementIdImplicitValue.create(srcEnumerationMapping.id ?? fromElementPathToMappingElementId(targetEnumeration.value.path), targetEnumeration.value.path, srcEnumerationMapping.id), targetEnumeration, parentMapping, MM_OptionalPackageableElementImplicitReference.create(sourceTypeReference?.value, sourceTypeInput, context.section, sourceTypeReference?.isResolvedFromAutoImports));
  enumerationMapping.enumValueMappings = srcEnumerationMapping.enumValueMappings.map(enumValueMapping => processEnumValueMapping(enumValueMapping, targetEnumeration, sourceTypeReference?.value));
  return enumerationMapping;
};

export const processMappingInclude = (mappingInclude: MappingInclude, context: GraphBuilderContext, parentMapping: MM_Mapping): MM_MappingInclude => {
  const includedMapping = new MM_MappingInclude(parentMapping, context.resolveMapping(mappingInclude.includedMappingPath));
  if (mappingInclude.sourceDatabasePath && mappingInclude.targetDatabasePath) {
    includedMapping.addStoreSubstitution(new MM_SubstituteStore(includedMapping, context.resolveStore(mappingInclude.sourceDatabasePath), context.resolveStore(mappingInclude.targetDatabasePath)));
  }
  return includedMapping;
};

export const processMappingTestInputData = (inputData: InputData, context: GraphBuilderContext): MM_InputData => {
  if (inputData instanceof ObjectInputData) {
    assertNonNullable(inputData.sourceClass, 'Mapping test object input data source class is missing');
    assertNonNullable(inputData.inputType, 'Mapping test object input data input type is missing');
    assertNonNullable(inputData.data, 'Mapping test object input data data is missing');
    return new MM_ObjectInputData(context.resolveClass(inputData.sourceClass), MM_getObjectInputType(inputData.inputType), inputData.data);
  }
  throw new UnsupportedOperationError();
};

export const processMappingTest = (mappingTest: MappingTest, context: GraphBuilderContext): MM_MappingTest => {
  assertNonEmptyString(mappingTest.name, 'Mapping test name is missing');
  assertNonNullable(mappingTest.query);
  const query = new MM_Lambda(mappingTest.query.parameters, mappingTest.query.body);
  // TODO: fix this when we support another mapping test type
  assertType(mappingTest.assert, ExpectedOutputMappingTestAssert, `Unsupported mapping test assert type '${mappingTest.assert}'`);
  const modelAssert = new MM_ExpectedOutputMappingTestAssert(mappingTest.assert.expectedOutput);
  const inputData = mappingTest.inputData.map(input => processMappingTestInputData(input, context));
  // TODO: maybe we want to validate the graph fetch tree here so we can throw user into
  // text mode to resolve the issue but as of now, we don't do that because it's just test
  return new MM_MappingTest(mappingTest.name, query, inputData, modelAssert);
};
