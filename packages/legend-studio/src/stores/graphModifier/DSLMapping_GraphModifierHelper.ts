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
  getOwnClassMappingsByClass,
  type JsonModelConnection,
  type Connection,
  type PackageableConnection,
  type PackageableRuntime,
  type EngineRuntime,
  StoreConnections,
  type IdentifiedConnection,
  type PackageableElementReference,
  PackageableElementExplicitReference,
  type Store,
  type RuntimePointer,
  type XmlModelConnection,
  type Class,
  type PureInstanceSetImplementation,
  type PurePropertyMapping,
  type ObjectInputData,
} from '@finos/legend-graph';
import {
  addUniqueEntry,
  assertTrue,
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
    owner.root.value = val;
  },
);

//
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

// --------------------------------------------- Enumeration Mapping -------------------------------------

export const enumMapping_setId = action(
  (eM: EnumerationMapping, val: string): void => {
    eM.id.value = val;
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

// --------------------------------------------- Mapping Test -------------------------------------

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
export const expectedOutputMappingTestAssert_setExpectedOutput = action(
  (e: ExpectedOutputMappingTestAssert, val: string): void => {
    e.expectedOutput = val;
  },
);

// --------------------------------------------- Operation Mapping -------------------------------------

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

// --------------------------------------------- Root Resolution -------------------------------------

/**
 * If this is the only mapping element for the target class, automatically mark it as root,
 * otherwise, if there is another set implementation make it non-root,
 * otherwise, leave other set implementation root status as-is.
 * NOTE: use get `OWN` class mappings as we are smartly updating the current mapping in the form editor,
 * which does not support `include` mappings as of now.
 */
export const setImpl_updateRootOnCreate = action(
  (setImp: SetImplementation): void => {
    const classMappingsWithSimilarTarget = getOwnClassMappingsByClass(
      setImp.parent,
      setImp.class.value,
    ).filter((si) => si !== setImp);
    if (classMappingsWithSimilarTarget.length) {
      setImpl_setRoot(setImp, false);
      if (classMappingsWithSimilarTarget.length === 1) {
        setImpl_setRoot(
          classMappingsWithSimilarTarget[0] as SetImplementation,
          false,
        );
      }
    } else {
      setImpl_setRoot(setImp, true);
    }
  },
);

/**
 * If only one set implementation remained, it will be nominated as the new root
 * NOTE: use get `OWN` class mappings as we are smartly updating the current mapping in the form editor,
 * which does not support `include` mappings as of now.
 */
export const setImpl_updateRootOnDelete = action(
  (setImp: SetImplementation): void => {
    const classMappingsWithSimilarTarget = getOwnClassMappingsByClass(
      setImp.parent,
      setImp.class.value,
    ).filter((si) => si !== setImp);
    if (classMappingsWithSimilarTarget.length === 1) {
      setImpl_setRoot(
        classMappingsWithSimilarTarget[0] as SetImplementation,
        false,
      );
    }
  },
);

/**
 * Make the nominated set implementation root and flip the root flag of all other
 * set implementations with the same target
 * NOTE: use get `OWN` class mappings as we are smartly updating the current mapping in the form editor,
 * which does not support `include` mappings as of now.
 */
export const setImpl_nominateRoot = action(
  (setImp: SetImplementation): void => {
    const classMappingsWithSimilarTarget = getOwnClassMappingsByClass(
      setImp.parent,
      setImp.class.value,
    );
    classMappingsWithSimilarTarget.forEach((si) => {
      if (si !== setImp) {
        setImpl_setRoot(si, false);
      }
    });
    setImpl_setRoot(setImp, true);
  },
);

// --------------------------------------------- M2M -------------------------------------

export const objectInputData_setData = (
  o: ObjectInputData,
  val: string,
): void => {
  o.data = val;
};

export const pureInstanceSetImpl_setPropertyMappings = (
  val: PureInstanceSetImplementation,
  value: PurePropertyMapping[],
): void => {
  val.propertyMappings = value;
};
export const pureInstanceSetImpl_setSrcClass = (
  val: PureInstanceSetImplementation,
  value: Class | undefined,
): void => {
  val.srcClass.setValue(value);
};
export const pureInstanceSetImpl_setMappingFilter = (
  val: PureInstanceSetImplementation,
  value: RawLambda | undefined,
): void => {
  val.filter = value;
};

export const purePropertyMapping_setTransformer = (
  val: PurePropertyMapping,
  value: EnumerationMapping | undefined,
): void => {
  val.transformer = value;
};

// --------------------------------------------- Connection -------------------------------------

export const connection_setStore = action(
  (con: Connection, val: PackageableElementReference<Store>): void => {
    con.store = val;
  },
);
export const modelConnection_setClass = action(
  (val: JsonModelConnection | XmlModelConnection, value: Class): void => {
    val.class.value = value;
  },
);
export const modelConnection_setUrl = action(
  (val: JsonModelConnection | XmlModelConnection, value: string): void => {
    val.url = value;
  },
);
export const packageableConnection_setConnectionValue = action(
  (pc: PackageableConnection, connection: Connection): void => {
    pc.connectionValue = connection;
  },
);

// --------------------------------------------- Runtime -------------------------------------

export const packageableRuntime_setRuntimeValue = action(
  (pr: PackageableRuntime, value: EngineRuntime): void => {
    pr.runtimeValue = value;
  },
);
export const runtime_addIdentifiedConnection = action(
  (eR: EngineRuntime, value: IdentifiedConnection): void => {
    const store = value.connection.store;
    const storeConnections =
      eR.connections.find((sc) => sc.store.value === store.value) ??
      new StoreConnections(store);
    addUniqueEntry(eR.connections, storeConnections);
    assertTrue(
      !storeConnections.storeConnections
        .map((connection) => connection.id)
        .includes(value.id),
      `Can't add identified connection as a connection with the same ID '${value.id} already existed'`,
    );
    addUniqueEntry(storeConnections.storeConnections, value);
  },
);
export const runtime_deleteIdentifiedConnection = action(
  (eR: EngineRuntime, value: IdentifiedConnection): void => {
    const storeConnections = eR.connections.find(
      (sc) => sc.store.value === value.connection.store.value,
    );
    if (storeConnections) {
      deleteEntry(storeConnections.storeConnections, value);
    }
  },
);
export const runtime_addUniqueStoreConnectionsForStore = action(
  (eR: EngineRuntime, value: Store): void => {
    if (!eR.connections.find((sc) => sc.store.value === value)) {
      eR.connections.push(
        new StoreConnections(PackageableElementExplicitReference.create(value)),
      );
    }
  },
);
export const runtime_setMappings = action(
  (eR: EngineRuntime, value: PackageableElementReference<Mapping>[]): void => {
    eR.mappings = value;
  },
);
export const runtime_addMapping = action(
  (eR: EngineRuntime, value: PackageableElementReference<Mapping>): void => {
    addUniqueEntry(eR.mappings, value);
  },
);
export const runtime_deleteMapping = action(
  (eR: EngineRuntime, value: PackageableElementReference<Mapping>): void => {
    deleteEntry(eR.mappings, value);
  },
);

export const setPackageableRuntime = action(
  (rP: RuntimePointer, value: PackageableRuntime): void => {
    rP.packageableRuntime.value = value;
  },
);
