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
export * from './graph/metamodel/pure/Reference.js';
export * from './graph/metamodel/pure/packageableElements/PackageableElement.js';
export * from './graph/metamodel/pure/packageableElements/PackageableElementReference.js';
export * from './graph/metamodel/pure/packageableElements/mapping/SetImplementationReference.js';
export { SectionIndex } from './graph/metamodel/pure/packageableElements/section/SectionIndex.js';

export { createExplicitRelationReference } from './graph/metamodel/pure/packageableElements/store/relational/model/RelationReference.js';

export { Multiplicity } from './graph/metamodel/pure/packageableElements/domain/Multiplicity.js';
export { Type } from './graph/metamodel/pure/packageableElements/domain/Type.js';
export { DataType } from './graph/metamodel/pure/packageableElements/domain/DataType.js';
export { PrimitiveType } from './graph/metamodel/pure/packageableElements/domain/PrimitiveType.js';
export {
  GenericTypeReference,
  GenericTypeExplicitReference,
} from './graph/metamodel/pure/packageableElements/domain/GenericTypeReference.js';
export { GenericType } from './graph/metamodel/pure/packageableElements/domain/GenericType.js';
export { Class } from './graph/metamodel/pure/packageableElements/domain/Class.js';
export { type AnnotatedElement } from './graph/metamodel/pure/packageableElements/domain/AnnotatedElement.js';
export { Package } from './graph/metamodel/pure/packageableElements/domain/Package.js';
export { Constraint } from './graph/metamodel/pure/packageableElements/domain/Constraint.js';
export { Association } from './graph/metamodel/pure/packageableElements/domain/Association.js';
export { Enumeration } from './graph/metamodel/pure/packageableElements/domain/Enumeration.js';
export { Enum } from './graph/metamodel/pure/packageableElements/domain/Enum.js';
export { TaggedValue } from './graph/metamodel/pure/packageableElements/domain/TaggedValue.js';
export { Tag } from './graph/metamodel/pure/packageableElements/domain/Tag.js';
export { Profile } from './graph/metamodel/pure/packageableElements/domain/Profile.js';
export { Stereotype } from './graph/metamodel/pure/packageableElements/domain/Stereotype.js';
export {
  Measure,
  Unit,
} from './graph/metamodel/pure/packageableElements/domain/Measure.js';
export {
  EnumValueReference,
  EnumValueExplicitReference,
} from './graph/metamodel/pure/packageableElements/domain/EnumValueReference.js';
export { type AbstractProperty } from './graph/metamodel/pure/packageableElements/domain/AbstractProperty.js';
export { DerivedProperty } from './graph/metamodel/pure/packageableElements/domain/DerivedProperty.js';
export { Property } from './graph/metamodel/pure/packageableElements/domain/Property.js';
export {
  PropertyReference,
  PropertyExplicitReference,
} from './graph/metamodel/pure/packageableElements/domain/PropertyReference.js';
export { ConcreteFunctionDefinition } from './graph/metamodel/pure/packageableElements/domain/ConcreteFunctionDefinition.js';
export {
  StereotypeReference,
  StereotypeExplicitReference,
} from './graph/metamodel/pure/packageableElements/domain/StereotypeReference.js';
export {
  TagReference,
  TagExplicitReference,
} from './graph/metamodel/pure/packageableElements/domain/TagReference.js';
export {
  RuntimePointer,
  StoreConnections,
} from './graph/metamodel/pure/packageableElements/runtime/Runtime.js';
// relational packageable elements
export { Database } from './graph/metamodel/pure/packageableElements/store/relational/model/Database.js';
// metamodel external formats
export { Binding } from './graph/metamodel/pure/packageableElements/externalFormat/store/DSLExternalFormat_Binding.js';
export { ModelUnit } from './graph/metamodel/pure/packageableElements/externalFormat/store/DSLExternalFormat_ModelUnit.js';
export { SchemaSet } from './graph/metamodel/pure/packageableElements/externalFormat/schemaSet/DSLExternalFormat_SchemaSet.js';
export { Schema as ExternalFormatSchema } from './graph/metamodel/pure/packageableElements/externalFormat/schemaSet/DSLExternalFormat_Schema.js';
export { ExternalFormatConnection } from './graph/metamodel/pure/packageableElements/externalFormat/connection/DSLExternalFormat_ExternalFormatConnection.js';
export { UrlStream } from './graph/metamodel/pure/packageableElements/externalFormat/connection/DSLExternalFormat_UrlStream.js';
export { DSLExternalFormat_GraphPreset } from './DSLExternalFormat_Extension.js';
export { BindingTransformer } from './graph/metamodel/pure/packageableElements/externalFormat/store/DSLExternalFormat_BindingTransformer.js';
export * from './graphManager/DSLExternalFormat_PureGraphManagerPlugin.js';
// V1 protocols
export * from './graphManager/protocol/pure/v1/model/packageableElements/V1_PackageableElement.js';
export { V1_StereotypePtr } from './graphManager/protocol/pure/v1/model/packageableElements/domain/V1_StereotypePtr.js';
export { V1_TaggedValue } from './graphManager/protocol/pure/v1/model/packageableElements/domain/V1_TaggedValue.js';
export { V1_PropertyPointer } from './graphManager/protocol/pure/v1/model/packageableElements/domain/V1_PropertyPointer.js';
export { V1_SectionIndex } from './graphManager/protocol/pure/v1/model/packageableElements/section/V1_SectionIndex.js';

// --------------------------------------------- VALUE SPECIFICATION --------------------------------------------------

// metamodels
export { RawLambda } from './graph/metamodel/pure/rawValueSpecification/RawLambda.js';
export { RawVariableExpression } from './graph/metamodel/pure/rawValueSpecification/RawVariableExpression.js';
export { INTERNAL__UnknownValueSpecification } from './graph/metamodel/pure/valueSpecification/INTERNAL__UnknownValueSpecification.js';
export { VariableExpression } from './graph/metamodel/pure/valueSpecification/VariableExpression.js';
export {
  AbstractPropertyExpression,
  SimpleFunctionExpression,
  FunctionExpression,
} from './graph/metamodel/pure/valueSpecification/SimpleFunctionExpression.js';
export {
  FunctionType,
  LambdaFunction,
  LambdaFunctionInstanceValue,
} from './graph/metamodel/pure/valueSpecification/LambdaFunction.js';
export { AlloySerializationConfigInstanceValue } from './graph/metamodel/pure/valueSpecification/AlloySerializationConfig.js';
export {
  EnumValueInstanceValue,
  MappingInstanceValue,
  PairInstanceValue,
  PureListInstanceValue,
  RuntimeInstanceValue,
  InstanceValue,
  CollectionInstanceValue,
  PrimitiveInstanceValue,
} from './graph/metamodel/pure/valueSpecification/InstanceValue.js';
export { INTERNAL__PropagatedValue } from './graph/metamodel/pure/valueSpecification/INTERNAL__PropagatedValue.js';
export {
  ValueSpecification,
  type ValueSpecificationVisitor,
} from './graph/metamodel/pure/valueSpecification/ValueSpecification.js';
export {
  GraphFetchTree,
  PropertyGraphFetchTree,
  RootGraphFetchTree,
  GraphFetchTreeInstanceValue,
  PropertyGraphFetchTreeInstanceValue,
  RootGraphFetchTreeInstanceValue,
} from './graph/metamodel/pure/valueSpecification/GraphFetchTree.js';
export { V1_PureGraphManager } from './graphManager/protocol/pure/v1/V1_PureGraphManager.js';

// V1 protocols
export { V1_Class } from './graphManager/protocol/pure/v1/model/packageableElements/domain/V1_Class.js';
export { V1_AppliedFunction } from './graphManager/protocol/pure/v1/model/valueSpecification/application/V1_AppliedFunction.js';
export { V1_AppliedProperty } from './graphManager/protocol/pure/v1/model/valueSpecification/application/V1_AppliedProperty.js';
export { V1_Collection } from './graphManager/protocol/pure/v1/model/valueSpecification/raw/V1_Collection.js';
export { V1_Lambda } from './graphManager/protocol/pure/v1/model/valueSpecification/raw/V1_Lambda.js';
export { V1_Variable } from './graphManager/protocol/pure/v1/model/valueSpecification/V1_Variable.js';
export { V1_ValueSpecification } from './graphManager/protocol/pure/v1/model/valueSpecification/V1_ValueSpecification.js';
export { V1_Multiplicity } from './graphManager/protocol/pure/v1/model/packageableElements/domain/V1_Multiplicity.js';
export { V1_ExternalFormatDescription } from './graphManager/protocol/pure/v1/engine/externalFormat/V1_ExternalFormatDescription.js';
export { V1_ExternalFormatModelGenerationInput } from './graphManager/protocol/pure/v1/engine/externalFormat/V1_ExternalFormatModelGeneration.js';

// --------------------------------------------- EXECUTION PLAN --------------------------------------------------

export * from './graph/metamodel/pure/executionPlan/ExecutionPlan.js';
export { ExecutionNode } from './graph/metamodel/pure/executionPlan/nodes/ExecutionNode.js';
export { SQLExecutionNode } from './graph/metamodel/pure/executionPlan/nodes/SQLExecutionNode.js';
export { SQLResultColumn } from './graph/metamodel/pure/executionPlan/nodes/SQLResultColumn.js';
export { RelationalTDSInstantiationExecutionNode } from './graph/metamodel/pure/executionPlan/nodes/RelationalInstantiationExecutionNode.js';
export { ResultType } from './graph/metamodel/pure/executionPlan/result/ResultType.js';
export { TDSResultType } from './graph/metamodel/pure/executionPlan/result/TDSResultType.js';

// --------------------------------------------- HELPER --------------------------------------------------

export * from './graph/MetaModelUtils.js';
export * from './graph/MetaModelConst.js';

export * from './graph/Core_HashUtils.js';

export * from './graph/helpers/DomainHelper.js';
export * from './graph/helpers/DSLMapping_Helper.js';
export * from './graph/helpers/StoreRelational_Helper.js';
export * from './graph/helpers/StoreFlatData_Helper.js';
export * from './graph/helpers/DSLGeneration_Helper.js';
export * from './graph/helpers/ValueSpecificationHelper.js';

export * from './graph/helpers/PureLanguageHelper.js';

export * from './graph/helpers/creator/DomainModelCreatorHelper.js';
export * from './graph/helpers/creator/DSLMapping_ModelCreatorHelper.js';
export * from './graph/helpers/creator/RawValueSpecificationCreatorHelper.js';
export * from './graph/helpers/creator/StoreRelational_ModelCreatorHelper.js';

export * from './graphManager/helpers/DSLData_GraphManagerHelper.js';
export * from './graphManager/helpers/ValueSpecificationGraphManagerHelper.js';

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

export { type GraphManagerPluginManager } from './graphManager/GraphManagerPluginManager.js';
export { Core_PureGraphManagerPlugin } from './graphManager/Core_PureGraphManagerPlugin.js';
export {
  BasicGraphManagerState,
  GraphManagerState,
} from './graphManager/GraphManagerState.js';
export * from './graphManager/GraphManagerStateProvider.js';
export * from './graphManager/GraphManagerTestUtils.js';
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
export * from './graphManager/DSLGeneration_PureGraphManagerPlugin_Extension.js';
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
export * from './graphManager/action/generation/DatabaseBuilderInput.js';
export * from './graphManager/action/generation/GenerationConfigurationDescription.js';
export { GenerationOutput } from './graphManager/action/generation/GenerationOutput.js';
export { ServiceExecutionMode } from './graphManager/action/service/ServiceExecutionMode.js';
export { ServiceRegistrationResult } from './graphManager/action/service/ServiceRegistrationResult.js';
export { DEPRECATED__ServiceTestResult } from './graphManager/action/service/DEPRECATED__ServiceTestResult.js';
export { SourceInformation } from './graphManager/action/SourceInformation.js';
export * from './graphManager/protocol/pure/PureProtocolProcessorPlugin.js';

// --------------------------------------------- TRANSFORMATION --------------------------------------------------

export { V1_transformConnection } from './graphManager/protocol/pure/v1/transformation/pureGraph/from/V1_ConnectionTransformer.js';
export { V1_transformRuntime } from './graphManager/protocol/pure/v1/transformation/pureGraph/from/V1_RuntimeTransformer.js';
export { V1_transformPackageableElement } from './graphManager/protocol/pure/v1/transformation/pureGraph/from/V1_PackageableElementTransformer.js';
export {
  V1_transformStereotype,
  V1_transformTaggedValue,
} from './graphManager/protocol/pure/v1/transformation/pureGraph/from/V1_DomainTransformer.js';
export { V1_buildTaggedValue } from './graphManager/protocol/pure/v1/transformation/pureGraph/to/helpers/V1_DomainBuilderHelper.js';
export { V1_PureModelContextData } from './graphManager/protocol/pure/v1/model/context/V1_PureModelContextData.js';
export * from './graphManager/protocol/pure/v1/transformation/pureGraph/to/V1_GraphBuilderContext.js';
export * from './graphManager/protocol/pure/v1/transformation/pureGraph/to/helpers/V1_ValueSpecificationPathResolver.js';
export * from './graphManager/protocol/pure/v1/transformation/pureGraph/to/V1_ElementBuilder.js';
export { V1_RawLambda } from './graphManager/protocol/pure/v1/model/rawValueSpecification/V1_RawLambda.js';
export { V1_ProcessingContext } from './graphManager/protocol/pure/v1/transformation/pureGraph/to/helpers/V1_ProcessingContext.js';
export * from './graphManager/protocol/pure/v1/transformation/pureGraph/from/V1_GraphTransformerContext.js';
export * from './graphManager/protocol/pure/v1/transformation/pureGraph/from/V1_CoreTransformerHelper.js';
export {
  V1_RawValueSpecificationTransformer,
  V1_transformRawLambda,
} from './graphManager/protocol/pure/v1/transformation/pureGraph/from/V1_RawValueSpecificationTransformer.js';
export {
  V1_rawLambdaModelSchema,
  V1_deserializeRawValueSpecification,
  V1_serializeRawValueSpecification,
} from './graphManager/protocol/pure/v1/transformation/pureProtocol/serializationHelpers/V1_RawValueSpecificationSerializationHelper.js';
export { V1_transformPropertyReference } from './graphManager/protocol/pure/v1/transformation/pureGraph/from/V1_MappingTransformer.js';
export { V1_EngineServerClient } from './graphManager/protocol/pure/v1/engine/V1_EngineServerClient.js';
export { V1_Engine } from './graphManager/protocol/pure/v1/engine/V1_Engine.js';
export {
  V1_PureModelContextType,
  V1_entitiesToPureModelContextData,
  V1_deserializePureModelContextData,
} from './graphManager/protocol/pure/v1/transformation/pureProtocol/V1_PureProtocolSerialization.js';
export {
  V1_propertyPointerModelSchema,
  V1_stereotypePtrSchema,
  V1_taggedValueSchema,
} from './graphManager/protocol/pure/v1/transformation/pureProtocol/serializationHelpers/V1_DomainSerializationHelper.js';
export {
  V1_deserializeValueSpecification,
  V1_serializeValueSpecification,
} from './graphManager/protocol/pure/v1/transformation/pureProtocol/serializationHelpers/V1_ValueSpecificationSerializer.js';
export { V1_transformRootValueSpecification } from './graphManager/protocol/pure/v1/transformation/pureGraph/from/V1_ValueSpecificationTransformer.js';
export {
  V1_buildValueSpecification,
  V1_ValueSpecificationBuilder,
  V1_buildGenericFunctionExpression,
  V1_buildBaseSimpleFunctionExpression,
} from './graphManager/protocol/pure/v1/transformation/pureGraph/to/helpers/V1_ValueSpecificationBuilderHelper.js';
export * from './graphManager/protocol/pure/v1/transformation/pureProtocol/serializationHelpers/V1_CoreSerializationHelper.js';
export * from './graphManager/protocol/pure/v1/transformation/pureGraph/to/V1_DSLExternalFormat_GraphBuilderHelper.js';

// --------------------------------------------- TESTING --------------------------------------------------

export * from './graph/metamodel/pure/test/Testable.js';
export * from './graph/metamodel/pure/test/result/RunTestsTestableInput.js';
export * from './graph/metamodel/pure/test/result/TestResult.js';
export * from './graph/metamodel/pure/test/assertion/status/AssertionStatus.js';
export * from './graph/metamodel/pure/test/assertion/status/AssertFail.js';
export * from './graph/metamodel/pure/test/assertion/status/AssertPass.js';
export * from './graph/metamodel/pure/test/assertion/status/EqualToJsonAssertFail.js';
export * from './graph/metamodel/pure/test/assertion/TestAssertion.js';
export * from './graph/metamodel/pure/test/Test.js';
export * from './graph/metamodel/pure/test/assertion/EqualTo.js';
export * from './graph/metamodel/pure/test/assertion/EqualToJson.js';
export * from './graph/metamodel/pure/test/assertion/EqualToTDS.js';
export * from './graph/metamodel/pure/test/result/AtomicTestId.js';

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
export * from './graphManager/action/changeDetection/DSLGeneration_ObserverHelper.js';
export * from './graphManager/action/changeDetection/Testable_ObserverHelper.js';

export * from './graphManager/action/changeDetection/EngineObserverHelper.js';

// --------------------------------------------- DSL --------------------------------------------------

export * from './DSLMapping_Exports.js';
export * from './DSLGeneration_Exports.js';
export * from './DSLData_Exports.js';

/**
 * @modularize
 * See https://github.com/finos/legend-studio/issues/65
 */
export * from './DSLService_Exports.js';
export * from './StoreFlatData_Exports.js';
export * from './StoreRelational_Exports.js';
