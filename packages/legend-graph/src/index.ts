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
export * from './models/metamodels/pure/Reference.js';
export * from './models/metamodels/pure/packageableElements/PackageableElement.js';
export * from './models/metamodels/pure/packageableElements/PackageableElementReference.js';
export * from './models/metamodels/pure/packageableElements/mapping/SetImplementationReference.js';
export { SectionIndex } from './models/metamodels/pure/packageableElements/section/SectionIndex.js';

export { Multiplicity } from './models/metamodels/pure/packageableElements/domain/Multiplicity.js';
export { Type } from './models/metamodels/pure/packageableElements/domain/Type.js';
export { DataType } from './models/metamodels/pure/packageableElements/domain/DataType.js';
export { PrimitiveType } from './models/metamodels/pure/packageableElements/domain/PrimitiveType.js';
export {
  GenericTypeReference,
  GenericTypeExplicitReference,
} from './models/metamodels/pure/packageableElements/domain/GenericTypeReference.js';
export { GenericType } from './models/metamodels/pure/packageableElements/domain/GenericType.js';
export { Class } from './models/metamodels/pure/packageableElements/domain/Class.js';
export { type AnnotatedElement } from './models/metamodels/pure/packageableElements/domain/AnnotatedElement.js';
export { Package } from './models/metamodels/pure/packageableElements/domain/Package.js';
export { Constraint } from './models/metamodels/pure/packageableElements/domain/Constraint.js';
export { Association } from './models/metamodels/pure/packageableElements/domain/Association.js';
export { Enumeration } from './models/metamodels/pure/packageableElements/domain/Enumeration.js';
export { Enum } from './models/metamodels/pure/packageableElements/domain/Enum.js';
export { TaggedValue } from './models/metamodels/pure/packageableElements/domain/TaggedValue.js';
export { Tag } from './models/metamodels/pure/packageableElements/domain/Tag.js';
export { Profile } from './models/metamodels/pure/packageableElements/domain/Profile.js';
export { Stereotype } from './models/metamodels/pure/packageableElements/domain/Stereotype.js';
export {
  Measure,
  Unit,
} from './models/metamodels/pure/packageableElements/domain/Measure.js';
export {
  EnumValueReference,
  EnumValueExplicitReference,
} from './models/metamodels/pure/packageableElements/domain/EnumValueReference.js';
export { type AbstractProperty } from './models/metamodels/pure/packageableElements/domain/AbstractProperty.js';
export { DerivedProperty } from './models/metamodels/pure/packageableElements/domain/DerivedProperty.js';
export { Property } from './models/metamodels/pure/packageableElements/domain/Property.js';
export {
  PropertyReference,
  PropertyExplicitReference,
} from './models/metamodels/pure/packageableElements/domain/PropertyReference.js';
export { ConcreteFunctionDefinition } from './models/metamodels/pure/packageableElements/domain/ConcreteFunctionDefinition.js';
export {
  StereotypeReference,
  StereotypeExplicitReference,
} from './models/metamodels/pure/packageableElements/domain/StereotypeReference.js';
export {
  TagReference,
  TagExplicitReference,
} from './models/metamodels/pure/packageableElements/domain/TagReference.js';
export {
  RuntimePointer,
  StoreConnections,
} from './models/metamodels/pure/packageableElements/runtime/Runtime.js';
// relational packageable elements
export { Database } from './models/metamodels/pure/packageableElements/store/relational/model/Database.js';
// metamodel external formats
export { Binding } from './models/metamodels/pure/packageableElements/externalFormat/store/DSLExternalFormat_Binding.js';
export { ModelUnit } from './models/metamodels/pure/packageableElements/externalFormat/store/DSLExternalFormat_ModelUnit.js';
export { SchemaSet } from './models/metamodels/pure/packageableElements/externalFormat/schemaSet/DSLExternalFormat_SchemaSet.js';
export { Schema as ExternalFormatSchema } from './models/metamodels/pure/packageableElements/externalFormat/schemaSet/DSLExternalFormat_Schema.js';
export { ExternalFormatConnection } from './models/metamodels/pure/packageableElements/externalFormat/connection/DSLExternalFormat_ExternalFormatConnection.js';
export { UrlStream } from './models/metamodels/pure/packageableElements/externalFormat/connection/DSLExternalFormat_UrlStream.js';
export { DSLExternalFormat_GraphPreset } from './graph/DSLExternalFormat_Extension.js';
export { BindingTransformer } from './models/metamodels/pure/packageableElements/externalFormat/store/DSLExternalFormat_BindingTransformer.js';
export * from './graphManager/DSLExternalFormat_PureGraphManagerPlugin.js';
// V1 protocols
export * from './models/protocols/pure/v1/model/packageableElements/V1_PackageableElement.js';
export { V1_StereotypePtr } from './models/protocols/pure/v1/model/packageableElements/domain/V1_StereotypePtr.js';
export { V1_TaggedValue } from './models/protocols/pure/v1/model/packageableElements/domain/V1_TaggedValue.js';
export { V1_PropertyPointer } from './models/protocols/pure/v1/model/packageableElements/domain/V1_PropertyPointer.js';
export { V1_SectionIndex } from './models/protocols/pure/v1/model/packageableElements/section/V1_SectionIndex.js';

// --------------------------------------------- VALUE SPECIFICATION --------------------------------------------------

// metamodels
export { RawLambda } from './models/metamodels/pure/rawValueSpecification/RawLambda.js';
export { RawVariableExpression } from './models/metamodels/pure/rawValueSpecification/RawVariableExpression.js';
export { INTERNAL__UnknownValueSpecification } from './models/metamodels/pure/valueSpecification/INTERNAL__UnknownValueSpecification.js';
export { VariableExpression } from './models/metamodels/pure/valueSpecification/VariableExpression.js';
export {
  AbstractPropertyExpression,
  SimpleFunctionExpression,
  FunctionExpression,
} from './models/metamodels/pure/valueSpecification/SimpleFunctionExpression.js';
export {
  FunctionType,
  LambdaFunction,
  LambdaFunctionInstanceValue,
} from './models/metamodels/pure/valueSpecification/LambdaFunction.js';
export { AlloySerializationConfigInstanceValue } from './models/metamodels/pure/valueSpecification/AlloySerializationConfig.js';
export {
  EnumValueInstanceValue,
  MappingInstanceValue,
  PairInstanceValue,
  PureListInstanceValue,
  RuntimeInstanceValue,
  InstanceValue,
  CollectionInstanceValue,
  PrimitiveInstanceValue,
} from './models/metamodels/pure/valueSpecification/InstanceValue.js';
export { INTERNAL__PropagatedValue } from './models/metamodels/pure/valueSpecification/INTERNAL__PropagatedValue.js';
export {
  ValueSpecification,
  type ValueSpecificationVisitor,
} from './models/metamodels/pure/valueSpecification/ValueSpecification.js';
export {
  GraphFetchTree,
  PropertyGraphFetchTree,
  RootGraphFetchTree,
  GraphFetchTreeInstanceValue,
  PropertyGraphFetchTreeInstanceValue,
  RootGraphFetchTreeInstanceValue,
} from './models/metamodels/pure/valueSpecification/GraphFetchTree.js';
export { V1_PureGraphManager } from './models/protocols/pure/v1/V1_PureGraphManager.js';

// V1 protocols
export { V1_AppliedFunction } from './models/protocols/pure/v1/model/valueSpecification/application/V1_AppliedFunction.js';
export { V1_AppliedProperty } from './models/protocols/pure/v1/model/valueSpecification/application/V1_AppliedProperty.js';
export { V1_Collection } from './models/protocols/pure/v1/model/valueSpecification/raw/V1_Collection.js';
export { V1_Lambda } from './models/protocols/pure/v1/model/valueSpecification/raw/V1_Lambda.js';
export { V1_Variable } from './models/protocols/pure/v1/model/valueSpecification/V1_Variable.js';
export { V1_ValueSpecification } from './models/protocols/pure/v1/model/valueSpecification/V1_ValueSpecification.js';
export { V1_Multiplicity } from './models/protocols/pure/v1/model/packageableElements/domain/V1_Multiplicity.js';
export { V1_ExternalFormatDescription } from './models/protocols/pure/v1/engine/externalFormat/V1_ExternalFormatDescription.js';
export { V1_ExternalFormatModelGenerationInput } from './models/protocols/pure/v1/engine/externalFormat/V1_ExternalFormatModelGeneration.js';

// --------------------------------------------- EXECUTION PLAN --------------------------------------------------

export * from './models/metamodels/pure/executionPlan/ExecutionPlan.js';
export { ExecutionNode } from './models/metamodels/pure/executionPlan/nodes/ExecutionNode.js';
export { SQLExecutionNode } from './models/metamodels/pure/executionPlan/nodes/SQLExecutionNode.js';
export { SQLResultColumn } from './models/metamodels/pure/executionPlan/nodes/SQLResultColumn.js';
export { RelationalTDSInstantiationExecutionNode } from './models/metamodels/pure/executionPlan/nodes/RelationalInstantiationExecutionNode.js';
export { ResultType } from './models/metamodels/pure/executionPlan/result/ResultType.js';
export { TDSResultType } from './models/metamodels/pure/executionPlan/result/TDSResultType.js';

// --------------------------------------------- HELPER --------------------------------------------------

export * from './MetaModelUtils.js';
export * from './MetaModelConst.js';

export * from './helpers/DomainHelper.js';
export * from './helpers/Testable_Helper.js';
export * from './helpers/DSLMapping_Helper.js';
export * from './helpers/StoreRelational_Helper.js';
export * from './helpers/StoreFlatData_Helper.js';
export * from './helpers/DSLGeneration_Helper.js';
export * from './helpers/ValueSpecificationHelper.js';

export * from './helpers/PureLanguageHelper.js';

// --------------------------------------------- GRAPH --------------------------------------------------

export { DependencyManager } from './graph/DependencyManager.js';
export { BasicModel } from './graph/BasicModel.js';
export {
  CoreModel,
  SystemModel,
  GenerationModel,
  PureModel,
} from './graph/PureModel.js';
export * from './graph/PureGraphExtension.js';
export * from './graph/PureGraphPlugin.js';

// --------------------------------------------- GRAPH MANAGER --------------------------------------------------

export { type GraphPluginManager } from './GraphPluginManager.js';
export { CorePureGraphManagerPlugin } from './graphManager/CorePureGraphManagerPlugin.js';
export {
  BasicGraphManagerState,
  GraphManagerState,
} from './GraphManagerState.js';
export * from './GraphManagerStateProvider.js';
export * from './GraphManagerTestUtils.js';
export {
  AbstractPureGraphManagerExtension,
  AbstractPureGraphManager,
  type GraphBuilderOptions,
} from './graphManager/AbstractPureGraphManager.js';
export { GraphBuilderReport } from './graphManager/GraphBuilderReport.js';
export { GraphManagerTelemetry } from './graphManager/GraphManagerTelemetry.js';
export * from './graphManager/GraphManagerUtils.js';
export * from './graphManager/GraphManagerEvent.js';
export * from './graphManager/DSLMapping_PureGraphManagerPlugin_Extension.js';
export * from './graphManager/DSLGenerationSpecification_PureGraphManagerPlugin_Extension.js';
export {
  ExecutionResult,
  TdsExecutionResult,
  RawExecutionResult,
  EXECUTION_SERIALIZATION_FORMAT,
} from './graphManager/action/execution/ExecutionResult.js';
export { ExternalFormatDescription } from './graphManager/action/externalFormat/ExternalFormatDescription.js';
export * from './graphManager/action/execution/ExecutionResultHelper.js';
export * from './graphManager/PureGraphManagerPlugin.js';
export * from './graphManager/action/query/Query.js';
export * from './graphManager/action/query/QuerySearchSpecification.js';
export * from './graphManager/action/EngineError.js';
export * from './graphManager/action/SourceInformationHelper.js';
export * from './graphManager/action/generation/ImportConfigurationDescription.js';
export * from './graphManager/action/generation/DatabaseBuilderInput.js';
export * from './graphManager/action/generation/GenerationConfigurationDescription.js';
export { GenerationOutput } from './graphManager/action/generation/GenerationOutput.js';
export { ServiceExecutionMode } from './graphManager/action/service/ServiceExecutionMode.js';
export { ServiceRegistrationResult } from './graphManager/action/service/ServiceRegistrationResult.js';
export { DEPRECATED__ServiceTestResult } from './graphManager/action/service/DEPRECATED__ServiceTestResult.js';
export { SourceInformation } from './graphManager/action/SourceInformation.js';
export * from './models/protocols/pure/PureProtocolProcessorPlugin.js';

// --------------------------------------------- TRANSFORMATION --------------------------------------------------

export { V1_transformConnection } from './models/protocols/pure/v1/transformation/pureGraph/from/V1_ConnectionTransformer.js';
export { V1_transformRuntime } from './models/protocols/pure/v1/transformation/pureGraph/from/V1_RuntimeTransformer.js';
export { V1_transformPackageableElement } from './models/protocols/pure/v1/transformation/pureGraph/from/V1_PackageableElementTransformer.js';
export {
  V1_transformStereotype,
  V1_transformTaggedValue,
} from './models/protocols/pure/v1/transformation/pureGraph/from/V1_DomainTransformer.js';
export { V1_buildTaggedValue } from './models/protocols/pure/v1/transformation/pureGraph/to/helpers/V1_DomainBuilderHelper.js';
export { V1_PureModelContextData } from './models/protocols/pure/v1/model/context/V1_PureModelContextData.js';
export * from './models/protocols/pure/v1/transformation/pureGraph/to/V1_GraphBuilderContext.js';
export * from './models/protocols/pure/v1/transformation/pureGraph/to/helpers/V1_ValueSpecificationPathResolver.js';
export * from './models/protocols/pure/v1/transformation/pureGraph/to/V1_ElementBuilder.js';
export { V1_RawLambda } from './models/protocols/pure/v1/model/rawValueSpecification/V1_RawLambda.js';
export { V1_ProcessingContext } from './models/protocols/pure/v1/transformation/pureGraph/to/helpers/V1_ProcessingContext.js';
export * from './models/protocols/pure/v1/transformation/pureGraph/from/V1_GraphTransformerContext.js';
export * from './models/protocols/pure/v1/transformation/pureGraph/from/V1_CoreTransformerHelper.js';
export {
  V1_RawValueSpecificationTransformer,
  V1_transformRawLambda,
} from './models/protocols/pure/v1/transformation/pureGraph/from/V1_RawValueSpecificationTransformer.js';
export {
  V1_rawLambdaModelSchema,
  V1_deserializeRawValueSpecification,
  V1_serializeRawValueSpecification,
} from './models/protocols/pure/v1/transformation/pureProtocol/serializationHelpers/V1_RawValueSpecificationSerializationHelper.js';
export { V1_transformPropertyReference } from './models/protocols/pure/v1/transformation/pureGraph/from/V1_MappingTransformer.js';
export { V1_EngineServerClient } from './models/protocols/pure/v1/engine/V1_EngineServerClient.js';
export { V1_Engine } from './models/protocols/pure/v1/engine/V1_Engine.js';
export {
  V1_PureModelContextType,
  V1_entitiesToPureModelContextData,
  V1_deserializePureModelContextData,
} from './models/protocols/pure/v1/transformation/pureProtocol/V1_PureProtocolSerialization.js';
export {
  V1_propertyPointerModelSchema,
  V1_stereotypePtrSchema,
  V1_taggedValueSchema,
} from './models/protocols/pure/v1/transformation/pureProtocol/serializationHelpers/V1_DomainSerializationHelper.js';
export {
  V1_deserializeValueSpecification,
  V1_serializeValueSpecification,
} from './models/protocols/pure/v1/transformation/pureProtocol/serializationHelpers/V1_ValueSpecificationSerializer.js';
export { V1_transformRootValueSpecification } from './models/protocols/pure/v1/transformation/pureGraph/from/V1_ValueSpecificationTransformer.js';
export {
  V1_buildValueSpecification,
  V1_ValueSpecificationBuilder,
  V1_buildGenericFunctionExpression,
  V1_buildBaseSimpleFunctionExpression,
} from './models/protocols/pure/v1/transformation/pureGraph/to/helpers/V1_ValueSpecificationBuilderHelper.js';
export * from './models/protocols/pure/v1/transformation/pureProtocol/serializationHelpers/V1_CoreSerializationHelper.js';
export * from './models/protocols/pure/v1/transformation/pureGraph/to/V1_DSLExternalFormat_GraphBuilderHelper.js';
export * from './models/ModelGenerationConfiguration.js';
export * from './models/protocols/pure/MappingGeneration_PureProtocolProcessorPlugin_Extension.js';

// --------------------------------------------- TESTING --------------------------------------------------

export * from './models/metamodels/pure/test/Testable.js';
export * from './models/metamodels/pure/test/result/RunTestsTestableInput.js';
export * from './models/metamodels/pure/test/result/TestResult.js';
export * from './models/metamodels/pure/test/assertion/status/AssertionStatus.js';
export * from './models/metamodels/pure/test/assertion/status/AssertFail.js';
export * from './models/metamodels/pure/test/assertion/status/AssertPass.js';
export * from './models/metamodels/pure/test/assertion/status/EqualToJsonAssertFail.js';
export * from './models/metamodels/pure/test/assertion/TestAssertion.js';
export * from './models/metamodels/pure/test/Test.js';
export * from './models/metamodels/pure/test/assertion/EqualTo.js';
export * from './models/metamodels/pure/test/assertion/EqualToJson.js';
export * from './models/metamodels/pure/test/assertion/EqualToTDS.js';
export * from './models/metamodels/pure/test/result/AtomicTestId.js';

// --------------------------------------------- VALIDATION --------------------------------------------------

export * from './graphManager/action/validation/ValidationHelper.js';
export * from './graphManager/action/validation/DSLService_ValidationHelper.js';
export * from './graphManager/action/validation/DSLMapping_ValidationHelper.js';

// --------------------------------------------- OBSERVER --------------------------------------------------

export * from './graphManager/action/changeDetection/PackageableElementObserver.js';
export * from './graphManager/action/changeDetection/CoreObserverHelper.js';
export * from './graphManager/action/changeDetection/DomainObserverHelper.js';
export * from './graphManager/action/changeDetection/DSLMapping_ObserverHelper.js';
export * from './graphManager/action/changeDetection/RawValueSpecificationObserver.js';
export * from './graphManager/action/changeDetection/ValueSpecificationObserver.js';
export * from './graphManager/action/changeDetection/StoreRelational_ObserverHelper.js';
export * from './graphManager/action/changeDetection/StoreFlatData_ObserverHelper.js';
export * from './graphManager/action/changeDetection/GraphObserverHelper.js';
export * from './graphManager/action/changeDetection/DSLExternalFormat_ObserverHelper.js';
export * from './graphManager/action/changeDetection/DSLService_ObserverHelper.js';
export * from './graphManager/action/changeDetection/DSLGenerationSpecification_ObserverHelper.js';
export * from './graphManager/action/changeDetection/Testable_ObserverHelper.js';

export * from './graphManager/action/changeDetection/EngineObserverHelper.js';

// --------------------------------------------- CREATOR --------------------------------------------------

export * from './graphManager/action/creation/DomainModelCreatorHelper.js';
export * from './graphManager/action/creation/DSLMapping_ModelCreatorHelper.js';
export * from './graphManager/action/creation/RawValueSpecificationCreatorHelper.js';
export * from './graphManager/action/creation/StoreRelational_ModelCreatorHelper.js';

// --------------------------------------------- DSL --------------------------------------------------
/**
 * @modularize
 * See https://github.com/finos/legend-studio/issues/65
 */

export * from './DSLMapping_Exports.js';
export * from './DSLService_Exports.js';
export * from './DSLGenerationSpecification_Exports.js';
export * from './StoreFlatData_Exports.js';
export * from './StoreRelational_Exports.js';
export * from './DSLData_Exports.js';
