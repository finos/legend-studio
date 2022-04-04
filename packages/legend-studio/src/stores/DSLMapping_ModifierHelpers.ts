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
  type AssociationImplementation,
  type Enum,
  type EnumerationMapping,
  type EnumValueMapping,
  type InputData,
  type InstanceSetImplementation,
  type Mapping,
  type MappingTest,
  type MappingTestAssert,
  type PropertyMapping,
  type RawLambda,
  type SetImplementation,
  type ExpectedOutputMappingTestAssert,
  type OperationSetImplementation,
  type OperationType,
  type SetImplementationContainer,
  Enumeration,
  PRIMITIVE_TYPE,
  SourceValue,
  Type,
} from '@finos/legend-graph';
import {
  addUniqueEntry,
  changeEntry,
  deleteEntry,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { action } from 'mobx';

export const mapping_setPropertyMappings = action(
  (si: InstanceSetImplementation, pm: PropertyMapping[]): void => {
    si.propertyMappings = pm;
  },
);
export const setImpl_setRoot = action(
  (owner: SetImplementation, val: boolean): void => {
    owner.root.setValue(val);
  },
);

export const mapping_addClassMapping = action(
  (mapping: Mapping, val: SetImplementation): void => {
    addUniqueEntry(mapping.classMappings, val);
  },
);
export const mapping_deleteClassMapping = action(
  (mapping: Mapping, val: SetImplementation): void => {
    deleteEntry(mapping.classMappings, val);
  },
);
export const mapping_addEnumerationMapping = action(
  (mapping: Mapping, val: EnumerationMapping): void => {
    addUniqueEntry(mapping.enumerationMappings, val);
  },
);
export const mapping_deleteEnumerationMapping = action(
  (mapping: Mapping, val: EnumerationMapping): void => {
    deleteEntry(mapping.enumerationMappings, val);
  },
);
export const mapping_addAssociationMapping = action(
  (mapping: Mapping, val: AssociationImplementation): void => {
    addUniqueEntry(mapping.associationMappings, val);
  },
);
export const mapping_deleteAssociationMapping = action(
  (mapping: Mapping, val: AssociationImplementation): void => {
    deleteEntry(mapping.associationMappings, val);
  },
);
export const mapping_deleteTest = action(
  (mapping: Mapping, val: MappingTest): void => {
    deleteEntry(mapping.tests, val);
  },
);
export const mapping_addTest = action(
  (mapping: Mapping, val: MappingTest): void => {
    addUniqueEntry(mapping.tests, val);
  },
);

export const mappingTest_setName = action(
  (test: MappingTest, value: string): void => {
    test.name = value;
  },
);

export const mappingTest_setInputData = action(
  (test: MappingTest, value: InputData[]): void => {
    test.inputData = value;
  },
);

export const mappingTest_setQuery = action(
  (test: MappingTest, value: RawLambda): void => {
    test.query = value;
  },
);

export const mappingTest_setAssert = action(
  (test: MappingTest, value: MappingTestAssert): void => {
    test.assert = value;
  },
);
export const enumMapping_setId = action(
  (eM: EnumerationMapping, value: string): void => {
    eM.id.setValue(value);
  },
);

export const enumMapping_setSourceType = action(
  (eM: EnumerationMapping, value: Type | undefined): void => {
    eM.sourceType.setValue(value);
  },
);

export const enumMapping_setEnumValueMappings = action(
  (eM: EnumerationMapping, value: EnumValueMapping[]): void => {
    eM.enumValueMappings = value;
  },
);
export const enumMapping_updateSourceType = action(
  (eM: EnumerationMapping, type: Type | undefined): void => {
    if (eM.sourceType.value !== type) {
      enumMapping_setSourceType(eM, type);
      eM.enumValueMappings = eM.enumValueMappings.map((enumValueMapping) => {
        enumValueMapping.sourceValues = [];
        enumValueMapping.sourceValues.push(new SourceValue(undefined));
        return enumValueMapping;
      });
    }
  },
);
export const sourceValue_setValue = action(
  (sv: SourceValue, value: Enum | string | number | undefined): void => {
    sv.value = value;
  },
);
export const enumValueMapping_addSourceValue = action(
  (enumMapping: EnumValueMapping): void => {
    enumMapping.sourceValues.push(new SourceValue(undefined));
  },
);
export const enumValueMapping_setSourceValues = action(
  (enumMapping: EnumValueMapping, value: SourceValue[]): void => {
    enumMapping.sourceValues = value;
  },
);
export const enumValueMapping_deleteSourceValue = action(
  (enumMapping: EnumValueMapping, idx: number): void => {
    enumMapping.sourceValues.splice(idx, 1);
  },
);
export const enumValueMapping_updateSourceValue = action(
  (
    enumMapping: EnumValueMapping,
    idx: number,
    val: Enum | string | undefined,
    sourceType: Type | undefined,
  ): void => {
    const sourceValue = guaranteeNonNullable(enumMapping.sourceValues[idx]);
    // If the source type is an enumeration but the value does NOT match an enum value (most likely user is mid typing an enum value)
    // we move on to update the source value with the string value
    if (
      sourceType instanceof Enumeration &&
      typeof val === 'string' &&
      sourceType.getValueNames().includes(val)
    ) {
      sourceValue_setValue(sourceValue, sourceType.getValue(val));
    } else {
      // Here we update the source values depending on the source type.
      sourceValue_setValue(
        sourceValue,
        sourceType instanceof Type && sourceType.name === PRIMITIVE_TYPE.INTEGER
          ? parseInt(val as string)
          : val,
      );
    }
  },
);
export const expectedOutputMappingTestAssert_setExpectedOutput = action(
  (e: ExpectedOutputMappingTestAssert, val: string): void => {
    e.expectedOutput = val;
  },
);
export const operationMapping_setOperation = action(
  (oI: OperationSetImplementation, value: OperationType): void => {
    oI.operation = value;
  },
);
export const operationMapping_setParameters = action(
  (
    oI: OperationSetImplementation,
    value: SetImplementationContainer[],
  ): void => {
    oI.parameters = value;
  },
);
export const operationMapping_addParameter = action(
  (oI: OperationSetImplementation, value: SetImplementationContainer): void => {
    addUniqueEntry(oI.parameters, value);
  },
);
export const operationMapping_changeParameter = action(
  (
    oI: OperationSetImplementation,
    oldValue: SetImplementationContainer,
    newValue: SetImplementationContainer,
  ): void => {
    changeEntry(oI.parameters, oldValue, newValue);
  },
);
export const operationMapping_deleteParameter = action(
  (oI: OperationSetImplementation, value: SetImplementationContainer): void => {
    deleteEntry(oI.parameters, value);
  },
);
