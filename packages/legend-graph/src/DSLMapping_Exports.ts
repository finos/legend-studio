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
export { Store } from './models/metamodels/pure/packageableElements/store/Store.js';
export { Mapping } from './models/metamodels/pure/packageableElements/mapping/Mapping.js';
export {
  Runtime,
  EngineRuntime,
  RuntimePointer,
  IdentifiedConnection,
} from './models/metamodels/pure/packageableElements/runtime/Runtime.js';
export { PackageableRuntime } from './models/metamodels/pure/packageableElements/runtime/PackageableRuntime.js';
export { PureInstanceSetImplementation } from './models/metamodels/pure/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation.js';
export {
  OperationSetImplementation,
  OperationType,
} from './models/metamodels/pure/packageableElements/mapping/OperationSetImplementation.js';
export { PropertyMapping } from './models/metamodels/pure/packageableElements/mapping/PropertyMapping.js';
export {
  Connection,
  ConnectionPointer,
  type ConnectionVisitor,
} from './models/metamodels/pure/packageableElements/connection/Connection.js';
export { PackageableConnection } from './models/metamodels/pure/packageableElements/connection/PackageableConnection.js';
export { ModelStore } from './models/metamodels/pure/packageableElements/store/modelToModel/model/ModelStore.js';
export { PureModelConnection } from './models/metamodels/pure/packageableElements/store/modelToModel/connection/PureModelConnection.js';
export { JsonModelConnection } from './models/metamodels/pure/packageableElements/store/modelToModel/connection/JsonModelConnection.js';
export { ModelChainConnection } from './models/metamodels/pure/packageableElements/store/modelToModel/connection/ModelChainConnection.js';
export { XmlModelConnection } from './models/metamodels/pure/packageableElements/store/modelToModel/connection/XmlModelConnection.js';
export * from './models/metamodels/pure/packageableElements/mapping/SetImplementation.js';
export * from './models/metamodels/pure/packageableElements/mapping/TEMPORARY__UnresolvedSetImplementation.js';
export { PurePropertyMapping } from './models/metamodels/pure/packageableElements/store/modelToModel/mapping/PurePropertyMapping.js';
export { InstanceSetImplementation } from './models/metamodels/pure/packageableElements/mapping/InstanceSetImplementation.js';
export { EnumerationMapping } from './models/metamodels/pure/packageableElements/mapping/EnumerationMapping.js';
export * from './models/metamodels/pure/packageableElements/mapping/EnumValueMapping.js';
export { AssociationImplementation } from './models/metamodels/pure/packageableElements/mapping/AssociationImplementation.js';
export { SetImplementationContainer } from './models/metamodels/pure/packageableElements/mapping/SetImplementationContainer.js';
export { AggregationAwareSetImplementation } from './models/metamodels/pure/packageableElements/mapping/aggregationAware/AggregationAwareSetImplementation.js';
export * from './models/metamodels/pure/packageableElements/mapping/InferableMappingElementId.js';
export * from './models/metamodels/pure/packageableElements/mapping/InferableMappingElementRoot.js';
export { SetImplementationExplicitReference } from './models/metamodels/pure/packageableElements/mapping/SetImplementationReference.js';
export * from './models/metamodels/pure/packageableElements/mapping/EnumerationMappingReference.js';
export { MappingTest } from './models/metamodels/pure/packageableElements/mapping/MappingTest.js';
export { InputData } from './models/metamodels/pure/packageableElements/mapping/InputData.js';
export { MappingTestAssert } from './models/metamodels/pure/packageableElements/mapping/MappingTestAssert.js';
export { ExpectedOutputMappingTestAssert } from './models/metamodels/pure/packageableElements/mapping/ExpectedOutputMappingTestAssert.js';
export {
  ObjectInputData,
  ObjectInputType,
} from './models/metamodels/pure/packageableElements/store/modelToModel/mapping/ObjectInputData.js';
export { type EmbeddedSetImplementation } from './models/metamodels/pure/packageableElements/mapping/EmbeddedSetImplementation.js';

// protocols
export {
  V1_Connection,
  type V1_ConnectionVisitor,
} from './models/protocols/pure/v1/model/packageableElements/connection/V1_Connection.js';
export { V1_ConnectionPointer } from './models/protocols/pure/v1/model/packageableElements/connection/V1_ConnectionPointer.js';
export { V1_Mapping } from './models/protocols/pure/v1/model/packageableElements/mapping/V1_Mapping.js';
export { V1_PackageableRuntime } from './models/protocols/pure/v1/model/packageableElements/runtime/V1_PackageableRuntime.js';
export { V1_Store } from './models/protocols/pure/v1/model/packageableElements/store/V1_Store.js';
export {
  V1_EngineRuntime,
  V1_LegacyRuntime,
  V1_Runtime,
  V1_IdentifiedConnection,
  V1_StoreConnections,
  V1_RuntimePointer,
} from './models/protocols/pure/v1/model/packageableElements/runtime/V1_Runtime.js';
export {
  V1_ClassMapping,
  type V1_ClassMappingVisitor,
} from './models/protocols/pure/v1/model/packageableElements/mapping/V1_ClassMapping.js';
export * from './models/protocols/pure/DSLMapping_PureProtocolProcessorPlugin_Extension.js';
export { V1_MAPPING_ELEMENT_PROTOCOL_TYPE } from './models/protocols/pure/v1/transformation/pureProtocol/serializationHelpers/V1_MappingSerializationHelper.js';
export { V1_PACKAGEABLE_RUNTIME_ELEMENT_PROTOCOL_TYPE } from './models/protocols/pure/v1/transformation/pureProtocol/serializationHelpers/V1_RuntimeSerializationHelper.js';
export { MappingInclude } from './models/metamodels/pure/packageableElements/mapping/MappingInclude.js';
export { V1_getIncludedMappingPath } from './models/protocols/pure/v1/helper/V1_DSLMapping_Helper.js';
