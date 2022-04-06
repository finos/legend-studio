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
  type Binding,
  type Connection,
  type ExternalFormatSchema,
  type ModelUnit,
  type PackageableConnection,
  type PackageableElement,
  type PackageableElementReference,
  type SchemaSet,
  type Store,
  type UrlStream,
  type BindingTransformer,
  type ConfigurationProperty,
  type GenerationSpecification,
  type PackageableRuntime,
  type EngineRuntime,
  type RuntimePointer,
  type Class,
  type FlatDataConnection,
  type FlatDataInstanceSetImplementation,
  type JsonModelConnection,
  type Multiplicity,
  type RawVariableExpression,
  type RootFlatDataRecordType,
  type Type,
  type XmlModelConnection,
  type IdentifiedConnection,
  type Mapping,
  type FlatDataInputData,
  type FlatDataPropertyMapping,
  type EnumerationMapping,
  type ObjectInputData,
  type PureInstanceSetImplementation,
  type PurePropertyMapping,
  type RawLambda,
  StoreConnections,
  FileGenerationSpecification,
  GenerationTreeNode,
  PackageableElementExplicitReference,
  ModelGenerationSpecification,
} from '@finos/legend-graph';
import {
  addUniqueEntry,
  assertTrue,
  changeEntry,
  deleteEntry,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { action } from 'mobx';

// --------------------------------------------- Connection -------------------------------------

export const connection_setStore = action(
  (con: Connection, val: PackageableElementReference<Store>): void => {
    con.store = val;
  },
);
export const packageableConnection_setConnectionValue = action(
  (pc: PackageableConnection, connection: Connection): void => {
    pc.connectionValue = connection;
  },
);

// --------------------------------------------- External Format -------------------------------------

export const externalFormat_urlStream_setUrl = action(
  (us: UrlStream, val: string): void => {
    us.url = val;
  },
);
export const externalFormat_schema_setId = action(
  (s: ExternalFormatSchema, value: string): void => {
    s.id = value;
  },
);
export const externalFormat_schema_setLocation = action(
  (s: ExternalFormatSchema, value: string): void => {
    s.location = value;
  },
);
export const externalFormat_schema_setContent = action(
  (s: ExternalFormatSchema, value: string): void => {
    s.content = value;
  },
);
export const externalFormat_schemaSet_setFormat = action(
  (ss: SchemaSet, value: string): void => {
    ss.format = value;
  },
);
export const externalFormat_schemaSet_addSchema = action(
  (ss: SchemaSet, value: ExternalFormatSchema): void => {
    addUniqueEntry(ss.schemas, value);
  },
);
export const externalFormat_schemaSet_deleteSchema = action(
  (ss: SchemaSet, value: ExternalFormatSchema): void => {
    deleteEntry(ss.schemas, value);
  },
);
export const externalFormat_BindingTransformer_setBinding = action(
  (
    bt: BindingTransformer,
    value: PackageableElementReference<Binding>,
  ): void => {
    bt.binding = value;
  },
);
export const externalFormat_Binding_setSchemaSet = action(
  (binding: Binding, value: SchemaSet | undefined): void => {
    binding.schemaSet.setValue(value);
  },
);
export const externalFormat_Binding_setSchemaId = action(
  (binding: Binding, value: string | undefined): void => {
    binding.schemaId = value;
  },
);
export const externalFormat_Binding_setContentType = action(
  (binding: Binding, value: string): void => {
    binding.contentType = value;
  },
);
export const externalFormat_Binding_setModelUnit = action(
  (binding: Binding, value: ModelUnit): void => {
    binding.modelUnit = value;
  },
);
export const externalFormat_modelUnit_addPackageableElementIncludes = action(
  (
    mU: ModelUnit,
    value: PackageableElementReference<PackageableElement>,
  ): void => {
    addUniqueEntry(mU.packageableElementIncludes, value);
  },
);
export const externalFormat_modelUnit_deletePackageableElementIncludes = action(
  (
    mU: ModelUnit,
    value: PackageableElementReference<PackageableElement>,
  ): void => {
    deleteEntry(mU.packageableElementIncludes, value);
  },
);
export const externalFormat_modelUnit_updatePackageableElementIncludes = action(
  (
    mU: ModelUnit,
    oldValue: PackageableElementReference<PackageableElement>,
    newValue: PackageableElementReference<PackageableElement>,
  ): void => {
    changeEntry(mU.packageableElementIncludes, oldValue, newValue);
  },
);
export const externalFormat_modelUnit_addPackageableElementExcludes = action(
  (
    mU: ModelUnit,
    value: PackageableElementReference<PackageableElement>,
  ): void => {
    addUniqueEntry(mU.packageableElementExcludes, value);
  },
);
export const externalFormat_modelUnit_deletePackageableElementExcludes = action(
  (
    mU: ModelUnit,
    value: PackageableElementReference<PackageableElement>,
  ): void => {
    deleteEntry(mU.packageableElementExcludes, value);
  },
);
export const externalFormat_modelUnit_updatePackageableElementExcludes = action(
  (
    mU: ModelUnit,
    oldValue: PackageableElementReference<PackageableElement>,
    newValue: PackageableElementReference<PackageableElement>,
  ): void => {
    changeEntry(mU.packageableElementExcludes, oldValue, newValue);
  },
);

// --------------------------------------------- File Generation -------------------------------------

export const configurationProperty_setValue = action(
  (cp: ConfigurationProperty, value: unknown): void => {
    cp.value = value;
  },
);
export const fileGeneration_setType = action(
  (fg: FileGenerationSpecification, value: string): void => {
    fg.type = value;
  },
);
export const fileGeneration_setGenerationOutputPath = action(
  (fg: FileGenerationSpecification, val?: string): void => {
    fg.generationOutputPath = val;
  },
);
export const fileGeneration_setScopeElements = action(
  (
    fg: FileGenerationSpecification,
    value: (PackageableElementReference<PackageableElement> | string)[],
  ): void => {
    fg.scopeElements = value;
  },
);
export const fileGeneration_addScopeElement = action(
  (
    fg: FileGenerationSpecification,
    value: PackageableElementReference<PackageableElement> | string,
  ): void => {
    addUniqueEntry(fg.scopeElements, value);
  },
);
export const fileGeneration_deleteScopeElement = action(
  (
    fg: FileGenerationSpecification,
    value: PackageableElementReference<PackageableElement> | string,
  ): void => {
    deleteEntry(fg.scopeElements, value);
  },
);
export const fileGeneration_changeScopeElement = action(
  (
    fg: FileGenerationSpecification,
    oldValue: PackageableElementReference<PackageableElement> | string,
    newValue: PackageableElementReference<PackageableElement> | string,
  ): void => {
    changeEntry(fg.scopeElements, oldValue, newValue);
  },
);

// -------------------------------- Generation Specification -------------------------------------

export const generationSpecification_addNode = action(
  (genSpec: GenerationSpecification, value: GenerationTreeNode): void => {
    addUniqueEntry(genSpec.generationNodes, value);
  },
);
export const generationSpecification_addFileGeneration = action(
  (
    genSpec: GenerationSpecification,
    value: FileGenerationSpecification,
  ): void => {
    addUniqueEntry(
      genSpec.fileGenerations,
      PackageableElementExplicitReference.create(value),
    );
  },
);
export const generationSpecification_deleteFileGeneration = action(
  (
    genSpec: GenerationSpecification,
    value: PackageableElementReference<FileGenerationSpecification>,
  ): void => {
    deleteEntry(genSpec.fileGenerations, value);
  },
);
export const generationSpecification_setId = action(
  (treeNode: GenerationTreeNode, val: string): void => {
    treeNode.id = val;
  },
);
export const generationSpecification_deleteGenerationNode = action(
  (genSpec: GenerationSpecification, value: GenerationTreeNode): void => {
    deleteEntry(genSpec.generationNodes, value);
  },
);

// NOTE as of now the generation specification only supports model generation elements i.e elements that generate another graph compatabile with the current graph.
export const generationSpecification_addGenerationElement = action(
  (genSpec: GenerationSpecification, element: PackageableElement): void => {
    if (
      !(
        element instanceof ModelGenerationSpecification ||
        element instanceof FileGenerationSpecification
      )
    ) {
      throw new UnsupportedOperationError(
        `Can't add generation element: only model generation elements can be added to the generation specification`,
        element,
      );
    }
    if (element instanceof FileGenerationSpecification) {
      generationSpecification_addFileGeneration(genSpec, element);
    } else {
      generationSpecification_addNode(
        genSpec,
        new GenerationTreeNode(
          PackageableElementExplicitReference.create(element),
        ),
      );
    }
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

// --------------------------------------------- Raw Value Specification -------------------------------------

export const rawVariableExpression_setName = action(
  (rV: RawVariableExpression, value: string): void => {
    rV.name = value;
  },
);
export const rawVariableExpression_setType = action(
  (rV: RawVariableExpression, value: Type): void => {
    rV.type.value = value;
  },
);
export const rawVariableExpression_setMultiplicity = action(
  (rV: RawVariableExpression, value: Multiplicity): void => {
    rV.multiplicity = value;
  },
);

// --------------------------------------------- Connection -------------------------------------

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
export const flatData_setUrl = action(
  (fD: FlatDataConnection, url: string): void => {
    fD.url = url;
  },
);

// --------------------------------------------- Flat Data -------------------------------------

export const flatData_setSourceRootRecordType = action(
  (
    fl: FlatDataInstanceSetImplementation,
    value: RootFlatDataRecordType,
  ): void => {
    fl.sourceRootRecordType.value = value;
  },
);

export const flatData_setData = (
  input: FlatDataInputData,
  value: string,
): void => {
  input.data = value;
};

export const flatDataPropertyMapping_setTransformer = (
  val: FlatDataPropertyMapping,
  value: EnumerationMapping | undefined,
): void => {
  val.transformer = value;
};

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
