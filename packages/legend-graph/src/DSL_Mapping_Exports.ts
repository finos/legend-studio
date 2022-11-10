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

// metamodels
export { Store } from './graph/metamodel/pure/packageableElements/store/Store.js';
export { Mapping } from './graph/metamodel/pure/packageableElements/mapping/Mapping.js';
export {
  Runtime,
  EngineRuntime,
  RuntimePointer,
  IdentifiedConnection,
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
export { MappingTest } from './graph/metamodel/pure/packageableElements/mapping/MappingTest.js';
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
export * from './graphManager/protocol/pure/DSL_Mapping_PureProtocolProcessorPlugin_Extension.js';
export { V1_MAPPING_ELEMENT_PROTOCOL_TYPE } from './graphManager/protocol/pure/v1/transformation/pureProtocol/serializationHelpers/V1_MappingSerializationHelper.js';
export {
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
