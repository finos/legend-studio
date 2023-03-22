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

export { Multiplicity } from './graph/metamodel/pure/packageableElements/domain/Multiplicity.js';
export { Type } from './graph/metamodel/pure/packageableElements/domain/Type.js';
export { DataType } from './graph/metamodel/pure/packageableElements/domain/DataType.js';
export { PrimitiveType } from './graph/metamodel/pure/packageableElements/domain/PrimitiveType.js';
export {
  GenericTypeReference,
  GenericTypeExplicitReference,
} from './graph/metamodel/pure/packageableElements/domain/GenericTypeReference.js';
export { GenericType } from './graph/metamodel/pure/packageableElements/domain/GenericType.js';
export type { Function } from './graph/metamodel/pure/packageableElements/domain/Function.js';
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
export { AggregationKind } from './graph/metamodel/pure/packageableElements/domain/AggregationKind.js';
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
} from './graph/metamodel/pure/valueSpecification/Expression.js';
export {
  FunctionType,
  LambdaFunction,
  LambdaFunctionInstanceValue,
} from './graph/metamodel/pure/valueSpecification/LambdaFunction.js';
export {
  EnumValueInstanceValue,
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
export { V1_ExecuteInput } from './graphManager/protocol/pure/v1/engine/execution/V1_ExecuteInput.js';
export { V1_buildExecutionResult } from './graphManager/protocol/pure/v1/engine/execution/V1_ExecutionHelper.js';
export { V1_serializeExecutionResult } from './graphManager/protocol/pure/v1/engine/execution/V1_ExecutionResult.js';

// --------------------------------------------- EXECUTION PLAN --------------------------------------------------

export * from './graph/metamodel/pure/executionPlan/ExecutionPlan.js';
export { ExecutionNode } from './graph/metamodel/pure/executionPlan/nodes/ExecutionNode.js';
export { ResultType } from './graph/metamodel/pure/executionPlan/result/ResultType.js';
export { TDSResultType } from './graph/metamodel/pure/executionPlan/result/TDSResultType.js';

// --------------------------------------------- HELPER --------------------------------------------------

export * from './graph/MetaModelUtils.js';
export * from './graph/MetaModelConst.js';

export * from './graph/Core_HashUtils.js';

export * from './graph/helpers/DomainHelper.js';
export * from './graph/helpers/DSL_Mapping_Helper.js';
export * from './graph/helpers/STO_Relational_Helper.js';
export * from './graph/helpers/STO_FlatData_Helper.js';
export * from './graph/helpers/DSL_Generation_Helper.js';

export * from './graph/helpers/PureLanguageHelper.js';

export * from './graph/helpers/creator/DomainModelCreatorHelper.js';
export * from './graph/helpers/creator/DSL_Mapping_ModelCreatorHelper.js';
export * from './graph/helpers/creator/RawValueSpecificationCreatorHelper.js';
export * from './graph/helpers/creator/STO_Relational_ModelCreatorHelper.js';
export * from './graph/helpers/ArtifactGenerationExtensionHelper.js';

export * from './graphManager/helpers/DSL_Data_GraphManagerHelper.js';
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
export { Core_GraphManagerPreset } from './Core_GraphManagerPreset.js';
export { Core_PureGraphManagerPlugin } from './graphManager/extensions/Core_PureGraphManagerPlugin.js';
export {
  BasicGraphManagerState,
  GraphManagerState,
} from './graphManager/GraphManagerState.js';
export * from './graphManager/GraphManagerTestUtils.js';
export {
  AbstractPureGraphManagerExtension,
  AbstractPureGraphManager,
  type GraphBuilderOptions,
} from './graphManager/AbstractPureGraphManager.js';
export * from './graphManager/GraphManagerStatistics.js';
export * from './graphManager/GraphManagerUtils.js';
export * from './graphManager/GraphManagerEvent.js';
export {
  ExecutionResult,
  TDSExecutionResult as TDSExecutionResult,
  RawExecutionResult,
  EXECUTION_SERIALIZATION_FORMAT,
} from './graphManager/action/execution/ExecutionResult.js';
export { ExternalFormatDescription } from './graphManager/action/externalFormat/ExternalFormatDescription.js';
export * from './graphManager/action/execution/ExecutionResultHelper.js';
export * from './graphManager/PureGraphManagerPlugin.js';
export * from './graphManager/action/query/Query.js';
export * from './graphManager/action/query/QuerySearchSpecification.js';
export * from './graphManager/action/EngineError.js';
export * from './graphManager/action/compilation/CompilationWarning.js';
export * from './graphManager/action/compilation/CompilationResult.js';

export * from './graphManager/action/SourceInformationHelper.js';
export * from './graphManager/action/generation/DatabaseBuilderInput.js';
export * from './graphManager/action/generation/GenerationConfigurationDescription.js';
export { GenerationOutput } from './graphManager/action/generation/GenerationOutput.js';
export { ServiceExecutionMode } from './graphManager/action/service/ServiceExecutionMode.js';
export { ServiceRegistrationResult } from './graphManager/action/service/ServiceRegistrationResult.js';
export {
  BulkServiceRegistrationResult,
  BulkRegistrationResultFail,
  BulkRegistrationResultSuccess,
} from './graphManager/action/service/BulkServiceRegistrationResult.js';
export { DEPRECATED__ServiceTestResult } from './graphManager/action/service/DEPRECATED__ServiceTestResult.js';
export { SourceInformation } from './graphManager/action/SourceInformation.js';
export * from './graphManager/protocol/pure/PureProtocolProcessorPlugin.js';

// --------------------------------------------- TRANSFORMATION --------------------------------------------------

export { V1_transformConnection } from './graphManager/protocol/pure/v1/transformation/pureGraph/from/V1_ConnectionTransformer.js';
export { V1_transformRuntime } from './graphManager/protocol/pure/v1/transformation/pureGraph/from/V1_RuntimeTransformer.js';
export * from './graphManager/protocol/pure/v1/transformation/pureGraph/from/V1_TestTransformer.js';
export { V1_transformPackageableElement } from './graphManager/protocol/pure/v1/transformation/pureGraph/from/V1_PackageableElementTransformer.js';
export {
  V1_transformStereotype,
  V1_transformTaggedValue,
} from './graphManager/protocol/pure/v1/transformation/pureGraph/from/V1_DomainTransformer.js';
export { V1_buildTaggedValue } from './graphManager/protocol/pure/v1/transformation/pureGraph/to/helpers/V1_DomainBuilderHelper.js';
export { V1_PureModelContextData } from './graphManager/protocol/pure/v1/model/context/V1_PureModelContextData.js';
export { V1_PureModelContext } from './graphManager/protocol/pure/v1/model/context/V1_PureModelContext.js';
export { V1_LegendSDLC } from './graphManager/protocol/pure/v1/model/context/V1_SDLC.js';
export { V1_Protocol } from './graphManager/protocol/pure/v1/model/V1_Protocol.js';
export { V1_PureModelContextPointer } from './graphManager/protocol/pure/v1/model/context/V1_PureModelContextPointer.js';
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
export * from './graphManager/protocol/pure/v1/transformation/pureGraph/from/V1_DataElementTransformer.js';
export { V1_EngineServerClient } from './graphManager/protocol/pure/v1/engine/V1_EngineServerClient.js';
export { V1_Engine } from './graphManager/protocol/pure/v1/engine/V1_Engine.js';
export {
  V1_PureModelContextType,
  V1_pureModelContextPropSchema,
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
export * from './graphManager/protocol/pure/v1/transformation/pureGraph/to/helpers/V1_TestBuilderHelper.js';
export * from './graphManager/protocol/pure/v1/transformation/pureProtocol/serializationHelpers/V1_CoreSerializationHelper.js';
export * from './graphManager/protocol/pure/v1/transformation/pureGraph/to/V1_DSL_ExternalFormat_GraphBuilderHelper.js';
export * from './graphManager/protocol/pure/v1/transformation/pureProtocol/serializationHelpers/V1_ServiceSerializationHelper.js';
export * from './graphManager/protocol/pure/v1/transformation/pureProtocol/serializationHelpers/V1_TestSerializationHelper.js';
export * from './graphManager/protocol/pure/v1/transformation/pureProtocol/serializationHelpers/V1_DataElementSerializationHelper.js';

// --------------------------------------------- TESTING --------------------------------------------------

export * from './graph/metamodel/pure/test/Testable.js';
export * from './graphManager/protocol/pure/extensions/Testable_PureProtocolProcessorPlugin_Extension.js';
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
export * from './graph/metamodel/pure/test/result/UniqueTestId.js';
export * from './graphManager/protocol/pure/v1/model/test/V1_AtomicTest.js';
export * from './graphManager/protocol/pure/v1/model/test/assertion/V1_EqualToJson.js';
export * from './graphManager/protocol/pure/v1/model/test/assertion/V1_TestAssertion.js';
export * from './graphManager/protocol/pure/v1/model/test/assertion/status/V1_AssertionStatus.js';
export * from './graphManager/extensions/Testable_PureGraphManagerPlugin_Extension.js';

// --------------------------------------------- VALIDATION --------------------------------------------------

export * from './graphManager/action/validation/ValidationHelper.js';
export * from './graphManager/action/validation/DSL_Service_ValidationHelper.js';
export * from './graphManager/action/validation/DSL_Mapping_ValidationHelper.js';

// --------------------------------------------- OBSERVER --------------------------------------------------

export * from './graphManager/action/changeDetection/PackageableElementObserver.js';
export * from './graphManager/action/changeDetection/CoreObserverHelper.js';
export * from './graphManager/action/changeDetection/DomainObserverHelper.js';
export * from './graphManager/action/changeDetection/DSL_Mapping_ObserverHelper.js';
export * from './graphManager/action/changeDetection/RawValueSpecificationObserver.js';
export * from './graphManager/action/changeDetection/ValueSpecificationObserver.js';
export * from './graphManager/action/changeDetection/STO_Relational_ObserverHelper.js';
export * from './graphManager/action/changeDetection/STO_FlatData_ObserverHelper.js';
export * from './graphManager/action/changeDetection/GraphObserverHelper.js';
export * from './graphManager/action/changeDetection/DSL_ExternalFormat_ObserverHelper.js';
export * from './graphManager/action/changeDetection/DSL_Service_ObserverHelper.js';
export * from './graphManager/action/changeDetection/DSL_Generation_ObserverHelper.js';
export * from './graphManager/action/changeDetection/Testable_ObserverHelper.js';

export * from './graphManager/action/changeDetection/EngineObserverHelper.js';

// ------------------------------------- DSL Data --------------------------------------------

export { DataElement } from './graph/metamodel/pure/packageableElements/data/DataElement.js';
export { V1_DataElement } from './graphManager/protocol/pure/v1/model/packageableElements/data/V1_DataElement.js';
export {
  EmbeddedData,
  ModelStoreData,
  DataElementReference,
  ExternalFormatData,
  type EmbeddedDataVisitor,
} from './graph/metamodel/pure/data/EmbeddedData.js';
export {
  V1_EmbeddedData,
  V1_ExternalFormatData,
  type V1_EmbeddedDataVisitor,
} from './graphManager/protocol/pure/v1/model/data/V1_EmbeddedData.js';
export * from './graphManager/protocol/pure/extensions/DSL_Data_PureProtocolProcessorPlugin_Extension.js';
export * from './graphManager/extensions/DSL_Data_PureGraphManagerPlugin_Extension.js';
export { V1_buildEmbeddedData } from './graphManager/protocol/pure/v1/transformation/pureGraph/to/helpers/V1_DataElementBuilderHelper.js';
export {
  observe_ExternalFormatData,
  observe_EmbeddedData,
  observe_RelationalDataTable,
  observe_DataElement,
} from './graphManager/action/changeDetection/DSL_Data_ObserverHelper.js';
export { V1_transformExternalFormatData } from './graphManager/protocol/pure/v1/transformation/pureGraph/from/V1_DataElementTransformer.js';
export { V1_externalFormatDataModelSchema } from './graphManager/protocol/pure/v1/transformation/pureProtocol/serializationHelpers/V1_DataElementSerializationHelper.js';

// --------------------------------------------- DSL External Format --------------------------------------------------

export { Binding } from './graph/metamodel/pure/packageableElements/externalFormat/store/DSL_ExternalFormat_Binding.js';
export { ModelUnit } from './graph/metamodel/pure/packageableElements/externalFormat/store/DSL_ExternalFormat_ModelUnit.js';
export { SchemaSet } from './graph/metamodel/pure/packageableElements/externalFormat/schemaSet/DSL_ExternalFormat_SchemaSet.js';
export { Schema as ExternalFormatSchema } from './graph/metamodel/pure/packageableElements/externalFormat/schemaSet/DSL_ExternalFormat_Schema.js';
export { ExternalFormatConnection } from './graph/metamodel/pure/packageableElements/externalFormat/connection/DSL_ExternalFormat_ExternalFormatConnection.js';
export { UrlStream } from './graph/metamodel/pure/packageableElements/externalFormat/connection/DSL_ExternalFormat_UrlStream.js';
export { BindingTransformer } from './graph/metamodel/pure/packageableElements/externalFormat/store/DSL_ExternalFormat_BindingTransformer.js';
export * from './graphManager/extensions/DSL_ExternalFormat_PureGraphManagerPlugin.js';
// V1 protocols
export * from './graphManager/protocol/pure/v1/model/packageableElements/V1_PackageableElement.js';
export { V1_StereotypePtr } from './graphManager/protocol/pure/v1/model/packageableElements/domain/V1_StereotypePtr.js';
export { V1_TaggedValue } from './graphManager/protocol/pure/v1/model/packageableElements/domain/V1_TaggedValue.js';
export { V1_PropertyPointer } from './graphManager/protocol/pure/v1/model/packageableElements/domain/V1_PropertyPointer.js';
export { V1_SectionIndex } from './graphManager/protocol/pure/v1/model/packageableElements/section/V1_SectionIndex.js';

// ------------------------------------- DSL Generation --------------------------------------------

export * from './graphManager/extensions/DSL_Generation_PureGraphManagerPlugin_Extension.js';

// metamodels
export { ModelGenerationSpecification } from './graph/metamodel/pure/packageableElements/generationSpecification/ModelGenerationSpecification.js';
export {
  GenerationSpecification,
  GenerationTreeNode,
} from './graph/metamodel/pure/packageableElements/generationSpecification/GenerationSpecification.js';
export { FileGenerationSpecification } from './graph/metamodel/pure/packageableElements/fileGeneration/FileGenerationSpecification.js';
export { ConfigurationProperty } from './graph/metamodel/pure/packageableElements/fileGeneration/ConfigurationProperty.js';

// protocols
export * from './graphManager/protocol/pure/extensions/DSL_Generation_PureProtocolProcessorPlugin_Extension.js';
export { V1_ModelGenerationSpecification } from './graphManager/protocol/pure/v1/model/packageableElements/generationSpecification/V1_ModelGenerationSpecification.js';

export { V1_GenerationInput } from './graphManager/protocol/pure/v1/engine/generation/V1_GenerationInput.js';
export { V1_GenerationOutput } from './graphManager/protocol/pure/v1/engine/generation/V1_GenerationOutput.js';

// ------------------------------------- DSL Mapping --------------------------------------------

export * from './graphManager/extensions/DSL_Mapping_PureGraphManagerPlugin_Extension.js';

// metamodels
export { Store } from './graph/metamodel/pure/packageableElements/store/Store.js';
export { Mapping } from './graph/metamodel/pure/packageableElements/mapping/Mapping.js';
export {
  Runtime,
  EngineRuntime,
  RuntimePointer,
  IdentifiedConnection,
  StoreConnections,
} from './graph/metamodel/pure/packageableElements/runtime/Runtime.js';
export { PackageableRuntime } from './graph/metamodel/pure/packageableElements/runtime/PackageableRuntime.js';
export { PureInstanceSetImplementation } from './graph/metamodel/pure/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation.js';
export {
  OperationSetImplementation,
  OperationType,
} from './graph/metamodel/pure/packageableElements/mapping/OperationSetImplementation.js';
export { PropertyMapping } from './graph/metamodel/pure/packageableElements/mapping/PropertyMapping.js';
export * from './graph/metamodel/pure/packageableElements/connection/Connection.js';
export { PackageableConnection } from './graph/metamodel/pure/packageableElements/connection/PackageableConnection.js';
export { ModelStore } from './graph/metamodel/pure/packageableElements/store/modelToModel/model/ModelStore.js';
export { PureModelConnection } from './graph/metamodel/pure/packageableElements/store/modelToModel/connection/PureModelConnection.js';
export { JsonModelConnection } from './graph/metamodel/pure/packageableElements/store/modelToModel/connection/JsonModelConnection.js';
export { ModelChainConnection } from './graph/metamodel/pure/packageableElements/store/modelToModel/connection/ModelChainConnection.js';
export { XmlModelConnection } from './graph/metamodel/pure/packageableElements/store/modelToModel/connection/XmlModelConnection.js';
export * from './graph/metamodel/pure/packageableElements/mapping/SetImplementation.js';
export * from './graph/metamodel/pure/packageableElements/mapping/TEMPORARY__UnresolvedSetImplementation.js';
export { PurePropertyMapping } from './graph/metamodel/pure/packageableElements/store/modelToModel/mapping/PurePropertyMapping.js';
export { InstanceSetImplementation } from './graph/metamodel/pure/packageableElements/mapping/InstanceSetImplementation.js';
export { EnumerationMapping } from './graph/metamodel/pure/packageableElements/mapping/EnumerationMapping.js';
export * from './graph/metamodel/pure/packageableElements/mapping/EnumValueMapping.js';
export { AssociationImplementation } from './graph/metamodel/pure/packageableElements/mapping/AssociationImplementation.js';
export { SetImplementationContainer } from './graph/metamodel/pure/packageableElements/mapping/SetImplementationContainer.js';
export { AggregationAwareSetImplementation } from './graph/metamodel/pure/packageableElements/mapping/aggregationAware/AggregationAwareSetImplementation.js';
export * from './graph/metamodel/pure/packageableElements/mapping/InferableMappingElementId.js';
export * from './graph/metamodel/pure/packageableElements/mapping/InferableMappingElementRoot.js';
export { SetImplementationExplicitReference } from './graph/metamodel/pure/packageableElements/mapping/SetImplementationReference.js';
export * from './graph/metamodel/pure/packageableElements/mapping/EnumerationMappingReference.js';
export { DEPRECATED__MappingTest } from './graph/metamodel/pure/packageableElements/mapping/DEPRECATED__MappingTest.js';
export { MappingTest } from './graph/metamodel/pure/packageableElements/mapping/MappingTest.js';
export { MappingTestSuite } from './graph/metamodel/pure/packageableElements/mapping/MappingTestSuite.js';
export { InputData } from './graph/metamodel/pure/packageableElements/mapping/InputData.js';
export { MappingTestAssert } from './graph/metamodel/pure/packageableElements/mapping/MappingTestAssert.js';
export { ExpectedOutputMappingTestAssert } from './graph/metamodel/pure/packageableElements/mapping/ExpectedOutputMappingTestAssert.js';
export {
  ObjectInputData,
  ObjectInputType,
} from './graph/metamodel/pure/packageableElements/store/modelToModel/mapping/ObjectInputData.js';
export { type EmbeddedSetImplementation } from './graph/metamodel/pure/packageableElements/mapping/EmbeddedSetImplementation.js';

export {
  type RawMappingModelCoverageAnalysisResult,
  MappingModelCoverageAnalysisResult,
  MappedEntity,
  MappedProperty,
  EntityMappedProperty,
  EnumMappedProperty,
} from './graphManager/action/analytics/MappingModelCoverageAnalysis.js';

// protocols
export {
  V1_Connection,
  type V1_ConnectionVisitor,
} from './graphManager/protocol/pure/v1/model/packageableElements/connection/V1_Connection.js';
export { V1_ConnectionPointer } from './graphManager/protocol/pure/v1/model/packageableElements/connection/V1_ConnectionPointer.js';
export { V1_Mapping } from './graphManager/protocol/pure/v1/model/packageableElements/mapping/V1_Mapping.js';
export { V1_PackageableRuntime } from './graphManager/protocol/pure/v1/model/packageableElements/runtime/V1_PackageableRuntime.js';
export { V1_Store } from './graphManager/protocol/pure/v1/model/packageableElements/store/V1_Store.js';
export {
  V1_EngineRuntime,
  V1_LegacyRuntime,
  V1_Runtime,
  V1_IdentifiedConnection,
  V1_StoreConnections,
  V1_RuntimePointer,
} from './graphManager/protocol/pure/v1/model/packageableElements/runtime/V1_Runtime.js';
export {
  V1_ClassMapping,
  type V1_ClassMappingVisitor,
} from './graphManager/protocol/pure/v1/model/packageableElements/mapping/V1_ClassMapping.js';
export * from './graphManager/protocol/pure/extensions/DSL_Mapping_PureProtocolProcessorPlugin_Extension.js';
export { V1_MAPPING_ELEMENT_PROTOCOL_TYPE } from './graphManager/protocol/pure/v1/transformation/pureProtocol/serializationHelpers/V1_MappingSerializationHelper.js';
export {
  V1_serializeRuntime,
  V1_runtimePointerModelSchema,
  V1_PACKAGEABLE_RUNTIME_ELEMENT_PROTOCOL_TYPE,
} from './graphManager/protocol/pure/v1/transformation/pureProtocol/serializationHelpers/V1_RuntimeSerializationHelper.js';
export { MappingInclude } from './graph/metamodel/pure/packageableElements/mapping/MappingInclude.js';
export { V1_buildConnection } from './graphManager/protocol/pure/v1/transformation/pureGraph/to/helpers/V1_ConnectionBuilderHelper.js';
export {
  V1_deserializeConnectionValue,
  V1_serializeConnectionValue,
} from './graphManager/protocol/pure/v1/transformation/pureProtocol/serializationHelpers/V1_ConnectionSerializationHelper.js';
export { V1_buildEngineRuntime } from './graphManager/protocol/pure/v1/transformation/pureGraph/to/helpers/V1_RuntimeBuilderHelper.js';

// ------------------------------------- TO BE MODULARIZED --------------------------------------------
/**
 * @modularize
 * See https://github.com/finos/legend-studio/issues/65
 */
export * from './DSL_Service_Exports.js';
export * from './STO_FlatData_Exports.js';
export * from './STO_Relational_Exports.js';
