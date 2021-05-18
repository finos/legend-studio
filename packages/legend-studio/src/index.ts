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

// application
export * from './application/Studio';
export * from './application/PluginManager';

// network
export * from './stores/network/Telemetry';
export * from './stores/network/Tracer';

// metamodels
export * from './models/metamodels/pure/graph/PureGraphExtension';
export * from './models/metamodels/pure/graph/PureGraphManagerPlugin';
export * from './models/MetaModelUtility';
export {
  PRIMITIVE_TYPE,
  CLIENT_VERSION,
  LAMBDA_START,
  DEFAULT_SOURCE_PARAMETER_NAME,
  CORE_ELEMENT_PATH,
  TYPICAL_MULTIPLICITY_TYPE,
  MULTIPLICITY_INFINITE,
} from './models/MetaModelConst';
export * from './models/metamodels/pure/model/Stubable'; // TODO: to be removed
export { BasicModel } from './models/metamodels/pure/graph/BasicModel';
export { PureModel } from './models/metamodels/pure/graph/PureModel';
export {
  freeze,
  freezeArray,
} from './models/metamodels/pure/action/freezer/GraphFreezerHelper';
export * from './models/metamodels/pure/action/EngineError';
export * from './models/metamodels/pure/model/packageableElements/PackageableElement';
export * from './models/metamodels/pure/model/packageableElements/PackageableElementReference';
export { Multiplicity } from './models/metamodels/pure/model/packageableElements/domain/Multiplicity';
export { Type } from './models/metamodels/pure/model/packageableElements/domain/Type';
export { PrimitiveType } from './models/metamodels/pure/model/packageableElements/domain/PrimitiveType';
export { GenericTypeExplicitReference } from './models/metamodels/pure/model/packageableElements/domain/GenericTypeReference';
export { GenericType } from './models/metamodels/pure/model/packageableElements/domain/GenericType';
export {
  Class,
  CLASS_PROPERTY_TYPE,
  getClassPropertyType,
} from './models/metamodels/pure/model/packageableElements/domain/Class';
export { Enumeration } from './models/metamodels/pure/model/packageableElements/domain/Enumeration';
export { Enum } from './models/metamodels/pure/model/packageableElements/domain/Enum';
export * from './models/metamodels/pure/model/packageableElements/domain/EnumValueReference';
export type { AbstractProperty } from './models/metamodels/pure/model/packageableElements/domain/AbstractProperty';
export { DerivedProperty } from './models/metamodels/pure/model/packageableElements/domain/DerivedProperty';
export { Property } from './models/metamodels/pure/model/packageableElements/domain/Property';
export { RawLambda } from './models/metamodels/pure/model/rawValueSpecification/RawLambda';
export { VariableExpression } from './models/metamodels/pure/model/valueSpecification/VariableExpression';
export {
  AbstractPropertyExpression,
  SimpleFunctionExpression,
  getAllFunction,
  SUPPORTED_FUNCTIONS,
  FunctionExpression,
} from './models/metamodels/pure/model/valueSpecification/SimpleFunctionExpression';
export {
  FunctionType,
  LambdaFunction,
  LambdaFunctionInstanceValue,
} from './models/metamodels/pure/model/valueSpecification/LambdaFunction';
export { AlloySerializationConfigInstanceValue } from './models/metamodels/pure/model/valueSpecification/AlloySerializationConfig';
export {
  EnumerationInstanceValue,
  EnumValueInstanceValue,
  MappingInstanceValue,
  PairInstanceValue,
  PureListInstanceValue,
  RuntimeInstanceValue,
  InstanceValue,
  CollectionInstanceValue,
  PrimitiveInstanceValue,
  ClassInstanceValue,
} from './models/metamodels/pure/model/valueSpecification/InstanceValue';
export { ValueSpecification } from './models/metamodels/pure/model/valueSpecification/ValueSpecification';
export type { ValueSpecificationVisitor } from './models/metamodels/pure/model/valueSpecification/ValueSpecification';
export type { ExecutionPlan } from './models/metamodels/pure/action/execution/ExecutionResult';
export {
  ExecutionResult,
  TdsExecutionResult,
} from './models/metamodels/pure/action/execution/ExecutionResult';
export {
  GraphFetchTree,
  PropertyGraphFetchTree,
  RootGraphFetchTree,
  GraphFetchTreeInstanceValue,
  PropertyGraphFetchTreeInstanceValue,
  RootGraphFetchTreeInstanceValue,
} from './models/metamodels/pure/model/valueSpecification/GraphFetchTree';
export * from './models/metamodels/pure/model/packageableElements/domain/PropertyReference';

// protocols
export * from './models/protocols/pure/PureProtocolProcessorPlugin';
export type { V1_PureModelContextData } from './models/protocols/pure/v1/model/context/V1_PureModelContextData';
export * from './models/protocols/pure/v1/model/packageableElements/V1_PackageableElement';
export * from './models/protocols/pure/v1/transformation/pureGraph/to/V1_GraphBuilderContext';
export * from './models/protocols/pure/v1/transformation/pureGraph/to/V1_ElementBuilder';
export { V1_RawLambda } from './models/protocols/pure/v1/model/rawValueSpecification/V1_RawLambda';
export {
  V1_initPackageableElement,
  V1_transformElementReference,
} from './models/protocols/pure/v1/transformation/pureGraph/from/V1_CoreTransformerHelper';
export { V1_RawValueSpecificationTransformer } from './models/protocols/pure/v1/transformation/pureGraph/from/V1_RawValueSpecificationTransformer';
export { V1_rawLambdaModelSchema } from './models/protocols/pure/v1/transformation/pureProtocol/serializationHelpers/V1_RawValueSpecificationSerializationHelper';
export { V1_EngineServerClient } from './models/protocols/pure/v1/engine/V1_EngineServerClient';
export { V1_Engine } from './models/protocols/pure/v1/engine/V1_Engine';
export {
  V1_pureModelContextDataPropSchema,
  V1_deserializePureModelContextData as V1_jsonToPureModelContextData,
} from './models/protocols/pure/v1/transformation/pureProtocol/V1_PureProtocolSerialization';
export { V1_StereotypePtr } from './models/protocols/pure/v1/model/packageableElements/domain/V1_StereotypePtr';
export { V1_PropertyPointer } from './models/protocols/pure/v1/model/packageableElements/domain/V1_PropertyPointer';
export {
  V1_propertyPointerModelSchema,
  V1_stereotypePtrSchema,
} from './models/protocols/pure/v1/transformation/pureProtocol/serializationHelpers/V1_DomainSerializationHelper';

// SDLC
export { Entity } from './models/sdlc/models/entity/Entity';
export { EntityChangeType } from './models/sdlc/models/entity/EntityChange';
export { Build, BuildStatus } from './models/sdlc/models/build/Build';
export { Project, ProjectType } from './models/sdlc/models/project/Project';

// stores
export * from './stores/EditorPlugin';
export * from './stores/ApplicationStore';
export * from './stores/EditorStore';
export * from './stores/EditorConfig';
export * from './stores/editor-state/element-editor-state/ElementEditorState';
export * from './stores/editor-state/UnsupportedElementEditorState';
export { NewElementState, NewElementDriver } from './stores/NewElementState';
export { LambdaEditorState } from './stores/editor-state/element-editor-state/LambdaEditorState';
export type { TransformDropTarget } from './stores/shared/DnDUtil';
export {
  CORE_DND_TYPE,
  ElementDragSource,
  TypeDragSource,
} from './stores/shared/DnDUtil';
export { ExplorerTreeRootPackageLabel } from './stores/ExplorerTreeState';

// components
export * from './components/shared/TextInputEditor';
export * from './components/shared/AppHeader';
export * from './components/shared/Icon'; // TODO: we might want to move all of these to @finos/legend-studio-components
export { AppHeaderMenu } from './components/editor/header/AppHeaderMenu';
export { getElementIcon, getElementTypeIcon } from './components/shared/Icon';
export { TypeTree } from './components/shared/TypeTree';
export { LambdaEditor } from './components/shared/LambdaEditor';

export * from './utils/Logger'; // TODO: to be removed when we move this to @finos/legend-studio-shared

// test
export { CORE_TEST_ID } from './const';
export {
  getTestApplicationConfig,
  getTestEditorStore,
  checkBuildingElementsRoundtrip,
} from './stores/StoreTestUtils';
export {
  getMockedApplicationStore,
  getMockedEditorStore,
  setUpEditor,
  setUpEditorWithDefaultSDLCData,
} from './components/ComponentTestUtils';

// --------------------------------------------- TO BE MODULARIZED --------------------------------------------------

export * from './DSLMapping_Exports';
export * from './DSLService_Exports';
export * from './DSLGenerationSpecification_Exports';
export * from './StoreFlatData_Exports';
export * from './StoreRelational_Exports';
