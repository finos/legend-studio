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

// --------------------------------------------- PACKAGEABLE ELEMENT --------------------------------------------------

// metamodels
export * from './models/metamodels/pure/Reference';
export * from './models/metamodels/pure/packageableElements/connection/Connection';
export * from './models/metamodels/pure/packageableElements/PackageableElement';
export * from './models/metamodels/pure/packageableElements/PackageableElementReference';
export { SectionIndex } from './models/metamodels/pure/packageableElements/section/SectionIndex';

export { Multiplicity } from './models/metamodels/pure/packageableElements/domain/Multiplicity';
export { Type } from './models/metamodels/pure/packageableElements/domain/Type';
export { DataType } from './models/metamodels/pure/packageableElements/domain/DataType';
export { PrimitiveType } from './models/metamodels/pure/packageableElements/domain/PrimitiveType';
export {
  GenericTypeReference,
  GenericTypeExplicitReference,
} from './models/metamodels/pure/packageableElements/domain/GenericTypeReference';
export { GenericType } from './models/metamodels/pure/packageableElements/domain/GenericType';
export {
  Class,
  CLASS_PROPERTY_TYPE,
  getClassPropertyType,
} from './models/metamodels/pure/packageableElements/domain/Class';
export { type AnnotatedElement } from './models/metamodels/pure/packageableElements/domain/AnnotatedElement';
export { Package } from './models/metamodels/pure/packageableElements/domain/Package';
export { Constraint } from './models/metamodels/pure/packageableElements/domain/Constraint';
export { Association } from './models/metamodels/pure/packageableElements/domain/Association';
export { Enumeration } from './models/metamodels/pure/packageableElements/domain/Enumeration';
export { Enum } from './models/metamodels/pure/packageableElements/domain/Enum';
export { TaggedValue } from './models/metamodels/pure/packageableElements/domain/TaggedValue';
export { Tag } from './models/metamodels/pure/packageableElements/domain/Tag';
export { Profile } from './models/metamodels/pure/packageableElements/domain/Profile';
export { Stereotype } from './models/metamodels/pure/packageableElements/domain/Stereotype';
export {
  Measure,
  Unit,
} from './models/metamodels/pure/packageableElements/domain/Measure';
export {
  EnumValueReference,
  EnumValueExplicitReference,
} from './models/metamodels/pure/packageableElements/domain/EnumValueReference';
export { type AbstractProperty } from './models/metamodels/pure/packageableElements/domain/AbstractProperty';
export { DerivedProperty } from './models/metamodels/pure/packageableElements/domain/DerivedProperty';
export { Property } from './models/metamodels/pure/packageableElements/domain/Property';
export {
  PropertyReference,
  PropertyExplicitReference,
} from './models/metamodels/pure/packageableElements/domain/PropertyReference';
export { ConcreteFunctionDefinition } from './models/metamodels/pure/packageableElements/domain/ConcreteFunctionDefinition';
export {
  StereotypeReference,
  StereotypeExplicitReference,
} from './models/metamodels/pure/packageableElements/domain/StereotypeReference';
export {
  TagReference,
  TagExplicitReference,
} from './models/metamodels/pure/packageableElements/domain/TagReference';
export {
  RuntimePointer,
  StoreConnections,
} from './models/metamodels/pure/packageableElements/runtime/Runtime';
// metamodel external formats
export { Binding } from './models/metamodels/pure/packageableElements/externalFormat/store/DSLExternalFormat_Binding';
export { ModelUnit } from './models/metamodels/pure/packageableElements/externalFormat/store/DSLExternalFormat_ModelUnit';
export { SchemaSet } from './models/metamodels/pure/packageableElements/externalFormat/schemaSet/DSLExternalFormat_SchemaSet';
export { Schema as ExternalFormatSchema } from './models/metamodels/pure/packageableElements/externalFormat/schemaSet/DSLExternalFormat_Schema';
export { ExternalFormatConnection } from './models/metamodels/pure/packageableElements/externalFormat/connection/DSLExternalFormat_ExternalFormatConnection';
export { UrlStream } from './models/metamodels/pure/packageableElements/externalFormat/connection/DSLExternalFormat_UrlStream';
export { DSLExternalFormat_GraphPreset } from './graph/DSLExternalFormat_Extension';
export { BindingTransformer } from './models/metamodels/pure/packageableElements/externalFormat/store/DSLExternalFormat_BindingTransformer';
// V1 protocols
export * from './models/protocols/pure/v1/model/packageableElements/V1_PackageableElement';
export { V1_StereotypePtr } from './models/protocols/pure/v1/model/packageableElements/domain/V1_StereotypePtr';
export { V1_TaggedValue } from './models/protocols/pure/v1/model/packageableElements/domain/V1_TaggedValue';
export { V1_PropertyPointer } from './models/protocols/pure/v1/model/packageableElements/domain/V1_PropertyPointer';
export { V1_SectionIndex } from './models/protocols/pure/v1/model/packageableElements/section/V1_SectionIndex';

// --------------------------------------------- VALUE SPECIFICATION --------------------------------------------------

// metamodels
export { RawLambda } from './models/metamodels/pure/rawValueSpecification/RawLambda';
export { RawVariableExpression } from './models/metamodels/pure/rawValueSpecification/RawVariableExpression';
export { INTERNAL__UnknownValueSpecification } from './models/metamodels/pure/valueSpecification/INTERNAL__UnknownValueSpecification';
export { VariableExpression } from './models/metamodels/pure/valueSpecification/VariableExpression';
export {
  AbstractPropertyExpression,
  SimpleFunctionExpression,
  FunctionExpression,
} from './models/metamodels/pure/valueSpecification/SimpleFunctionExpression';
export {
  FunctionType,
  LambdaFunction,
  LambdaFunctionInstanceValue,
} from './models/metamodels/pure/valueSpecification/LambdaFunction';
export { AlloySerializationConfigInstanceValue } from './models/metamodels/pure/valueSpecification/AlloySerializationConfig';
export {
  EnumValueInstanceValue,
  MappingInstanceValue,
  PairInstanceValue,
  PureListInstanceValue,
  RuntimeInstanceValue,
  InstanceValue,
  CollectionInstanceValue,
  PrimitiveInstanceValue,
} from './models/metamodels/pure/valueSpecification/InstanceValue';
export {
  ValueSpecification,
  type ValueSpecificationVisitor,
} from './models/metamodels/pure/valueSpecification/ValueSpecification';
export {
  GraphFetchTree,
  PropertyGraphFetchTree,
  RootGraphFetchTree,
  GraphFetchTreeInstanceValue,
  PropertyGraphFetchTreeInstanceValue,
  RootGraphFetchTreeInstanceValue,
} from './models/metamodels/pure/valueSpecification/GraphFetchTree';
export { V1_PureGraphManager } from './models/protocols/pure/v1/V1_PureGraphManager';

// V1 protocols
export { V1_AppliedFunction } from './models/protocols/pure/v1/model/valueSpecification/application/V1_AppliedFunction';
export { V1_AppliedProperty } from './models/protocols/pure/v1/model/valueSpecification/application/V1_AppliedProperty';
export { V1_Collection } from './models/protocols/pure/v1/model/valueSpecification/raw/V1_Collection';
export { V1_Lambda } from './models/protocols/pure/v1/model/valueSpecification/raw/V1_Lambda';
export { V1_Variable } from './models/protocols/pure/v1/model/valueSpecification/V1_Variable';
export { V1_ValueSpecification } from './models/protocols/pure/v1/model/valueSpecification/V1_ValueSpecification';
export { V1_Multiplicity } from './models/protocols/pure/v1/model/packageableElements/domain/V1_Multiplicity';
export { V1_ExternalFormatDescription } from './models/protocols/pure/v1/engine/externalFormat/V1_ExternalFormatDescription';
export { V1_ExternalFormatModelGenerationInput } from './models/protocols/pure/v1/engine/externalFormat/V1_ExternalFormatModelGeneration';

// --------------------------------------------- EXECUTION PLAN --------------------------------------------------

export * from './models/metamodels/pure/executionPlan/ExecutionPlan';
export { ExecutionNode } from './models/metamodels/pure/executionPlan/nodes/ExecutionNode';
export { SQLExecutionNode } from './models/metamodels/pure/executionPlan/nodes/SQLExecutionNode';
export { SQLResultColumn } from './models/metamodels/pure/executionPlan/nodes/SQLResultColumn';
export { RelationalTDSInstantiationExecutionNode } from './models/metamodels/pure/executionPlan/nodes/RelationalInstantiationExecutionNode';
export { ResultType } from './models/metamodels/pure/executionPlan/result/ResultType';
export { TDSResultType } from './models/metamodels/pure/executionPlan/result/TDSResultType';

// --------------------------------------------- HELPER --------------------------------------------------

export * from './MetaModelUtils';
export * from './MetaModelConst';

export * from './helpers/ServiceHelper';
export * from './helpers/DatabaseHelper';
export * from './helpers/MappingHelper';
export * from './helpers/ValidationHelper';
export * from './helpers/Stubable'; // TODO: to be removed
export * from './helpers/DomainHelper';
export * from './helpers/PureLanguageHelper';

// --------------------------------------------- GRAPH --------------------------------------------------

export { DependencyManager } from './graph/DependencyManager';
export { BasicModel } from './graph/BasicModel';
export {
  CoreModel,
  SystemModel,
  GenerationModel,
  PureModel,
} from './graph/PureModel';
export * from './graph/PureGraphExtension';
export * from './graph/PureGraphPlugin';

// --------------------------------------------- GRAPH MANAGER --------------------------------------------------

export { type GraphPluginManager } from './GraphPluginManager';
export { CorePureGraphManagerPlugin } from './graphManager/CorePureGraphManagerPlugin';
export { GraphManagerState } from './GraphManagerState';
export * from './GraphManagerStateProvider';
export * from './GraphManagerTestUtils';
export {
  AbstractPureGraphManager,
  type GraphBuilderOptions,
} from './graphManager/AbstractPureGraphManager';
export { GraphBuilderReport } from './graphManager/GraphBuilderReport';
export { GraphManagerTelemetry } from './graphManager/GraphManagerTelemetry';
export * from './graphManager/GraphManagerUtils';
export * from './graphManager/GraphManagerEvent';
export * from './graphManager/DSLMapping_PureGraphManagerPlugin_Extension';
export * from './graphManager/DSLGenerationSpecification_PureGraphManagerPlugin_Extension';
export {
  ExecutionResult,
  TdsExecutionResult,
  RawExecutionResult,
  EXECUTION_SERIALIZATION_FORMAT,
} from './graphManager/action/execution/ExecutionResult';
export { ExternalFormatDescription } from './graphManager/action/externalFormat/ExternalFormatDescription';
export * from './graphManager/action/execution/ExecutionResultHelper';
export * from './graphManager/PureGraphManagerPlugin';
export * from './graphManager/action/query/Query';
export * from './graphManager/action/query/QuerySearchSpecification';
export * from './graphManager/action/EngineError';
export * from './graphManager/action/SourceInformationHelper';
export * from './graphManager/action/generation/ImportConfigurationDescription';
export * from './graphManager/action/generation/DatabaseBuilderInput';
export * from './graphManager/action/generation/GenerationConfigurationDescription';
export { GenerationOutput } from './graphManager/action/generation/GenerationOutput';
export { ServiceExecutionMode } from './graphManager/action/service/ServiceExecutionMode';
export { ServiceRegistrationResult } from './graphManager/action/service/ServiceRegistrationResult';
export { ServiceTestResult } from './graphManager/action/service/ServiceTestResult';
export { SourceInformation } from './graphManager/action/SourceInformation';

export { getGraphManager } from './models/protocols/pure/Pure';
export * from './models/protocols/pure/PureProtocolProcessorPlugin';

// --------------------------------------------- TRANSFORMATION --------------------------------------------------

export { V1_transformConnection } from './models/protocols/pure/v1/transformation/pureGraph/from/V1_ConnectionTransformer';
export {
  V1_transformStereotype,
  V1_transformTaggedValue,
} from './models/protocols/pure/v1/transformation/pureGraph/from/V1_DomainTransformer';
export { V1_buildTaggedValue } from './models/protocols/pure/v1/transformation/pureGraph/to/helpers/V1_DomainBuilderHelper';
export { V1_PureModelContextData } from './models/protocols/pure/v1/model/context/V1_PureModelContextData';
export * from './models/protocols/pure/v1/transformation/pureGraph/to/V1_GraphBuilderContext';
export * from './models/protocols/pure/v1/transformation/pureGraph/to/helpers/V1_ValueSpecificationPathResolver';
export * from './models/protocols/pure/v1/transformation/pureGraph/to/V1_ElementBuilder';
export { V1_RawLambda } from './models/protocols/pure/v1/model/rawValueSpecification/V1_RawLambda';
export { V1_ProcessingContext } from './models/protocols/pure/v1/transformation/pureGraph/to/helpers/V1_ProcessingContext';
export { V1_ProtocolToMetaModelConnectionBuilder } from './models/protocols/pure/v1/transformation/pureGraph/to/V1_ProtocolToMetaModelConnectionBuilder';
export * from './models/protocols/pure/v1/transformation/pureGraph/from/V1_GraphTransformerContext';
export {
  V1_initPackageableElement,
  V1_transformElementReference,
} from './models/protocols/pure/v1/transformation/pureGraph/from/V1_CoreTransformerHelper';
export {
  V1_RawValueSpecificationTransformer,
  V1_transformRawLambda,
} from './models/protocols/pure/v1/transformation/pureGraph/from/V1_RawValueSpecificationTransformer';
export {
  V1_deserializeConnectionValue,
  V1_serializeConnectionValue,
} from './models/protocols/pure/v1/transformation/pureProtocol/serializationHelpers/V1_ConnectionSerializationHelper';
export {
  V1_rawLambdaModelSchema,
  V1_deserializeRawValueSpecification,
  V1_serializeRawValueSpecification,
} from './models/protocols/pure/v1/transformation/pureProtocol/serializationHelpers/V1_RawValueSpecificationSerializationHelper';
export { V1_transformPropertyReference } from './models/protocols/pure/v1/transformation/pureGraph/from/V1_MappingTransformer';
export { V1_EngineServerClient } from './models/protocols/pure/v1/engine/V1_EngineServerClient';
export { V1_Engine } from './models/protocols/pure/v1/engine/V1_Engine';
export * from './models/protocols/pure/v1/engine/V1_EngineEvent';
export {
  V1_entitiesToPureModelContextData,
  V1_deserializePureModelContextData,
} from './models/protocols/pure/v1/transformation/pureProtocol/V1_PureProtocolSerialization';
export {
  V1_propertyPointerModelSchema,
  V1_stereotypePtrSchema,
  V1_taggedValueSchema,
} from './models/protocols/pure/v1/transformation/pureProtocol/serializationHelpers/V1_DomainSerializationHelper';
export { V1_serializeValueSpecification } from './models/protocols/pure/v1/transformation/pureProtocol/serializationHelpers/V1_ValueSpecificationSerializer';
export { V1_ValueSpecificationBuilder } from './models/protocols/pure/v1/transformation/pureGraph/to/helpers/V1_ValueSpecificationBuilderHelper';
export * from './models/protocols/pure/v1/transformation/pureProtocol/serializationHelpers/V1_CoreSerializationHelper';
export * from './models/protocols/pure/v1/transformation/pureGraph/to/V1_DSLExternalFormat_GraphBuilderHelper';
export * from './models/ModelGenerationConfiguration';
export * from './models/protocols/pure/MappingGeneration_PureProtocolProcessorPlugin_Extension';

// --------------------------------------------- OBSERVER --------------------------------------------------

export * from './graphManager/action/changeDetection/PackageableElementObserver';
export * from './graphManager/action/changeDetection/CoreObserverHelper';
export * from './graphManager/action/changeDetection/DomainObserverHelper';
export * from './graphManager/action/changeDetection/DSLMapping_ObserverHelper';
export * from './graphManager/action/changeDetection/RawValueSpecificationObserver';
export * from './graphManager/action/changeDetection/ValueSpecificationObserver';
export * from './graphManager/action/changeDetection/StoreRelational_ObserverHelper';
export * from './graphManager/action/changeDetection/StoreFlatData_ObserverHelper';
export * from './graphManager/action/changeDetection/GraphObserverHelper';
export * from './graphManager/action/changeDetection/DSLExternalFormat_ObserverHelper';
export * from './graphManager/action/changeDetection/DSLService_ObserverHelper';
export * from './graphManager/action/changeDetection/DSLGenerationSpecification_ObserverHelper';

// --------------------------------------------- TO BE MODULARIZED --------------------------------------------------

export * from './DSLMapping_Exports';
export * from './DSLService_Exports';
export * from './DSLGenerationSpecification_Exports';
export * from './StoreFlatData_Exports';
export * from './StoreRelational_Exports';
export * from './Test_Exports';
export * from './DSLData_Exports';
