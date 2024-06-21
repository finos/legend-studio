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
  type DEPRECATED__InputData,
  type InstanceSetImplementation,
  type Mapping,
  type DEPRECATED__MappingTest,
  type DEPRECATED__MappingTestAssert,
  type PropertyMapping,
  type RawLambda,
  type SetImplementation,
  type DEPRECATED__ExpectedOutputMappingTestAssert,
  type OperationSetImplementation,
  type OperationType,
  type SetImplementationContainer,
  type JsonModelConnection,
  type Connection,
  type PackageableConnection,
  type PackageableRuntime,
  type EngineRuntime,
  StoreConnections,
  type IdentifiedConnection,
  type PackageableElementReference,
  type Store,
  type RuntimePointer,
  type XmlModelConnection,
  type Class,
  type PureInstanceSetImplementation,
  type PurePropertyMapping,
  type DEPRECATED__ObjectInputData,
  type ObserverContext,
  type Type,
  PackageableElementExplicitReference,
  Enumeration,
  SourceValue,
  getOwnClassMappingsByClass,
  observe_SetImplementation,
  observe_EnumerationMapping,
  observe_AssociationImplementation,
  observe_MappingTest_Legacy,
  observe_SourceValue,
  observe_MappingTestAssert,
  observe_SetImplementationContainer,
  observe_IdentifiedConnection,
  observe_StoreConnections,
  observe_PackageableElementReference,
  observe_PackageableRuntime,
  observe_PropertyMapping,
  observe_EnumValueMapping,
  observe_InputData,
  observe_RawLambda,
  observe_PurePropertyMapping,
  observe_Class,
  observe_Connection,
  observe_EngineRuntime,
  getEnumValueNames,
  getEnumValue,
  observe_EnumerationMappingReference,
  type EnumerationMappingReference,
  type SourceValueType,
  PrimitiveType,
  type MappingTestSuite,
  observe_MappingTestSuite,
  type StoreTestData,
  type MappingTest,
  type EmbeddedData,
  observe_EmbeddedData,
} from '@finos/legend-graph';
import {
  addUniqueEntry,
  assertTrue,
  changeEntry,
  deleteEntry,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { action } from 'mobx';

export const instanceSetImplementation_setPropertyMappings = action(
  (
    si: InstanceSetImplementation,
    pm: PropertyMapping[],
    observeContext: ObserverContext,
  ): void => {
    si.propertyMappings = pm.map((p) =>
      observe_PropertyMapping(p, observeContext),
    );
  },
);

export const instanceSetImplementation_deletePropertyMapping = action(
  (si: InstanceSetImplementation, pm: PropertyMapping): void => {
    deleteEntry(si.propertyMappings, pm);
  },
);

export const setImplementation_setRoot = action(
  (owner: SetImplementation, val: boolean): void => {
    owner.root.value = val;
  },
);

export const mapping_addClassMapping = action(
  (
    mapping: Mapping,
    val: SetImplementation,
    observer: ObserverContext,
  ): void => {
    addUniqueEntry(
      mapping.classMappings,
      observe_SetImplementation(val, observer),
    );
  },
);
export const mapping_deleteClassMapping = action(
  (mapping: Mapping, val: SetImplementation): void => {
    deleteEntry(mapping.classMappings, val);
  },
);
export const mapping_addEnumerationMapping = action(
  (mapping: Mapping, val: EnumerationMapping): void => {
    addUniqueEntry(
      mapping.enumerationMappings,
      observe_EnumerationMapping(val),
    );
  },
);
export const mapping_deleteEnumerationMapping = action(
  (mapping: Mapping, val: EnumerationMapping): void => {
    deleteEntry(mapping.enumerationMappings, val);
  },
);
export const mapping_addAssociationMapping = action(
  (
    mapping: Mapping,
    val: AssociationImplementation,
    observerContext: ObserverContext,
  ): void => {
    addUniqueEntry(
      mapping.associationMappings,
      observe_AssociationImplementation(val, observerContext),
    );
  },
);
export const mapping_deleteAssociationMapping = action(
  (mapping: Mapping, val: AssociationImplementation): void => {
    deleteEntry(mapping.associationMappings, val);
  },
);
export const mapping_deleteTest = action(
  (mapping: Mapping, val: DEPRECATED__MappingTest): void => {
    deleteEntry(mapping.test, val);
  },
);
export const mapping_addDEPRECATEDTest = action(
  (
    mapping: Mapping,
    val: DEPRECATED__MappingTest,
    observerContext: ObserverContext,
  ): void => {
    addUniqueEntry(
      mapping.test,
      observe_MappingTest_Legacy(val, observerContext),
    );
  },
);

// --------------------------------------------- Testable -------------------------------------
export const mapping_addTestSuite = action(
  (
    mapping: Mapping,
    val: MappingTestSuite,
    observerContext: ObserverContext,
  ): void => {
    addUniqueEntry(
      mapping.tests,
      observe_MappingTestSuite(val, observerContext),
    );
  },
);

export const mapping_deleteTestSuite = action(
  (mapping: Mapping, val: MappingTestSuite): void => {
    deleteEntry(mapping.tests, val);
  },
);

export const mappingTestable_setQuery = action(
  (test: MappingTestSuite, value: RawLambda): void => {
    test.func = observe_RawLambda(value);
  },
);

export const mappingTestable_deleteStoreTestData = action(
  (dataHolder: MappingTest, val: StoreTestData): void => {
    deleteEntry(dataHolder.storeTestData, val);
  },
);

export const mappingTestable_setEmbeddedData = action(
  (
    store: StoreTestData,
    embeddedData: EmbeddedData,
    observerContext: ObserverContext,
  ): void => {
    store.data = observe_EmbeddedData(embeddedData, observerContext);
  },
);

export const mappingTestable_addStoreTestData = action(
  (dataHolder: MappingTest, val: StoreTestData): void => {
    addUniqueEntry(dataHolder.storeTestData, val);
  },
);

// --------------------------------------------- Enumeration Mapping -------------------------------------

export const enumerationMapping_setId = action(
  (eM: EnumerationMapping, val: string): void => {
    eM.id.value = val;
  },
);

export const enumerationMapping_setSourceType = action(
  (
    eM: EnumerationMapping,
    value: PackageableElementReference<Type> | undefined,
  ): void => {
    eM.sourceType = value
      ? observe_PackageableElementReference(value)
      : undefined;
  },
);

export const enumerationMapping_setEnumValueMappings = action(
  (eM: EnumerationMapping, value: EnumValueMapping[]): void => {
    eM.enumValueMappings = value.map(observe_EnumValueMapping);
  },
);
export const enumerationMapping_updateSourceType = action(
  (
    eM: EnumerationMapping,
    value: PackageableElementReference<Type> | undefined,
  ): void => {
    if (eM.sourceType?.value !== value?.value) {
      enumerationMapping_setSourceType(eM, value);
      eM.enumValueMappings = eM.enumValueMappings.map((enumValueMapping) => {
        enumValueMapping.sourceValues = [];
        enumValueMapping.sourceValues.push(
          observe_SourceValue(new SourceValue(undefined)),
        );
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
  (enumMapping: EnumValueMapping, sourceValue: SourceValueType): void => {
    enumMapping.sourceValues.push(
      observe_SourceValue(new SourceValue(sourceValue)),
    );
  },
);
export const enumValueMapping_setSourceValues = action(
  (enumMapping: EnumValueMapping, value: SourceValue[]): void => {
    enumMapping.sourceValues = value.map(observe_SourceValue);
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
      getEnumValueNames(sourceType).includes(val)
    ) {
      sourceValue_setValue(sourceValue, getEnumValue(sourceType, val));
    } else {
      // Here we update the source values depending on the source type.
      sourceValue_setValue(
        sourceValue,
        sourceType === PrimitiveType.INTEGER
          ? parseInt(val as string, 10)
          : val,
      );
    }
  },
);

// --------------------------------------------- Mapping Test -------------------------------------

export const mappingTest_setName = action(
  (test: DEPRECATED__MappingTest, value: string): void => {
    test.name = value;
  },
);

export const mappingTest_setInputData = action(
  (
    test: DEPRECATED__MappingTest,
    value: DEPRECATED__InputData[],
    observeContext: ObserverContext,
  ): void => {
    test.inputData = value.map((i) => observe_InputData(i, observeContext));
  },
);

export const DEPRECATED_mappingTest_setQuery = action(
  (test: DEPRECATED__MappingTest, value: RawLambda): void => {
    test.query = observe_RawLambda(value);
  },
);

export const mappingTest_setAssert = action(
  (
    test: DEPRECATED__MappingTest,
    value: DEPRECATED__MappingTestAssert,
    observerContext: ObserverContext,
  ): void => {
    test.assert = observe_MappingTestAssert(value, observerContext);
  },
);
export const expectedOutputMappingTestAssert_setExpectedOutput = action(
  (e: DEPRECATED__ExpectedOutputMappingTestAssert, val: string): void => {
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
    oI.parameters = value.map(observe_SetImplementationContainer);
  },
);
export const operationMapping_addParameter = action(
  (oI: OperationSetImplementation, value: SetImplementationContainer): void => {
    addUniqueEntry(oI.parameters, observe_SetImplementationContainer(value));
  },
);
export const operationMapping_changeParameter = action(
  (
    oI: OperationSetImplementation,
    oldValue: SetImplementationContainer,
    newValue: SetImplementationContainer,
  ): void => {
    changeEntry(
      oI.parameters,
      oldValue,
      observe_SetImplementationContainer(newValue),
    );
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
      setImp._PARENT,
      setImp.class.value,
    ).filter((si) => si !== setImp);
    if (classMappingsWithSimilarTarget.length) {
      setImplementation_setRoot(setImp, false);
      if (classMappingsWithSimilarTarget.length === 1) {
        setImplementation_setRoot(
          classMappingsWithSimilarTarget[0] as SetImplementation,
          false,
        );
      }
    } else {
      setImplementation_setRoot(setImp, true);
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
      setImp._PARENT,
      setImp.class.value,
    ).filter((si) => si !== setImp);
    if (classMappingsWithSimilarTarget.length === 1) {
      setImplementation_setRoot(
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
      setImp._PARENT,
      setImp.class.value,
    );
    classMappingsWithSimilarTarget.forEach((si) => {
      if (si !== setImp) {
        setImplementation_setRoot(si, false);
      }
    });
    setImplementation_setRoot(setImp, true);
  },
);

// --------------------------------------------- M2M -------------------------------------

export const objectInputData_setData = action(
  (o: DEPRECATED__ObjectInputData, val: string): void => {
    o.data = val;
  },
);

export const pureInstanceSetImpl_setPropertyMappings = action(
  (
    val: PureInstanceSetImplementation,
    value: PurePropertyMapping[],
    observeContext: ObserverContext,
  ): void => {
    val.propertyMappings = value.map((pm) =>
      observe_PurePropertyMapping(pm, observeContext),
    );
  },
);

export const pureInstanceSetImpl_setSrcClass = action(
  (
    val: PureInstanceSetImplementation,
    value: PackageableElementReference<Class> | undefined,
  ): void => {
    val.srcClass = value
      ? observe_PackageableElementReference(value)
      : undefined;
  },
);

export const pureInstanceSetImpl_setMappingFilter = action(
  (val: PureInstanceSetImplementation, value: RawLambda | undefined): void => {
    val.filter = value ? observe_RawLambda(value) : undefined;
  },
);

export const purePropertyMapping_setTransformer = action(
  (
    val: PurePropertyMapping,
    value: EnumerationMappingReference | undefined,
  ): void => {
    val.transformer = value
      ? observe_EnumerationMappingReference(value)
      : undefined;
  },
);

// --------------------------------------------- Connection -------------------------------------

export const connection_setStore = action(
  (con: Connection, val: PackageableElementReference<Store>): void => {
    con.store = observe_PackageableElementReference(val);
  },
);
export const modelConnection_setClass = action(
  (val: JsonModelConnection | XmlModelConnection, value: Class): void => {
    val.class.value = observe_Class(value);
  },
);
export const modelConnection_setUrl = action(
  (val: JsonModelConnection | XmlModelConnection, value: string): void => {
    val.url = value;
  },
);
export const packageableConnection_setConnectionValue = action(
  (
    pc: PackageableConnection,
    connection: Connection,
    observeContext: ObserverContext,
  ): void => {
    pc.connectionValue = observe_Connection(connection, observeContext);
  },
);

// --------------------------------------------- Runtime -------------------------------------

export const packageableRuntime_setRuntimeValue = action(
  (
    pr: PackageableRuntime,
    value: EngineRuntime,
    observeContext: ObserverContext,
  ): void => {
    pr.runtimeValue = observe_EngineRuntime(value, observeContext);
  },
);
export const runtime_addIdentifiedConnection = action(
  (
    eR: EngineRuntime,
    value: IdentifiedConnection,
    observerContext: ObserverContext,
  ): void => {
    observe_IdentifiedConnection(value, observerContext);
    const store = value.connection.store;
    if (store) {
      const storeConnections =
        eR.connections.find((sc) => sc.store.value === store.value) ??
        observe_StoreConnections(new StoreConnections(store), observerContext);
      addUniqueEntry(eR.connections, storeConnections);
      assertTrue(
        !storeConnections.storeConnections
          .map((connection) => connection.id)
          .includes(value.id),
        `Can't add identified connection as a connection with the same ID '${value.id} already existed'`,
      );
      addUniqueEntry(storeConnections.storeConnections, value);
    }
  },
);
export const runtime_deleteIdentifiedConnection = action(
  (eR: EngineRuntime, value: IdentifiedConnection): void => {
    const storeConnections = eR.connections.find(
      (sc) => sc.store.value === value.connection.store?.value,
    );
    if (storeConnections) {
      deleteEntry(storeConnections.storeConnections, value);
    }
  },
);
export const runtime_addUniqueStoreConnectionsForStore = action(
  (eR: EngineRuntime, value: Store, observerContext: ObserverContext): void => {
    if (!eR.connections.find((sc) => sc.store.value === value)) {
      eR.connections.push(
        observe_StoreConnections(
          new StoreConnections(
            PackageableElementExplicitReference.create(value),
          ),
          observerContext,
        ),
      );
    }
  },
);
export const runtime_setMappings = action(
  (eR: EngineRuntime, value: PackageableElementReference<Mapping>[]): void => {
    eR.mappings = value.map(observe_PackageableElementReference);
  },
);
export const runtime_addMapping = action(
  (eR: EngineRuntime, value: PackageableElementReference<Mapping>): void => {
    addUniqueEntry(eR.mappings, observe_PackageableElementReference(value));
  },
);
export const runtime_deleteMapping = action(
  (eR: EngineRuntime, value: PackageableElementReference<Mapping>): void => {
    deleteEntry(eR.mappings, value);
  },
);

export const setPackageableRuntime = action(
  (
    rP: RuntimePointer,
    value: PackageableRuntime,
    context: ObserverContext,
  ): void => {
    rP.packageableRuntime.value = observe_PackageableRuntime(value, context);
  },
);
