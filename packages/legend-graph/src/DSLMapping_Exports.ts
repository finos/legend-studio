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
export { Store } from './models/metamodels/pure/packageableElements/store/Store';
export { Mapping } from './models/metamodels/pure/packageableElements/mapping/Mapping';
export {
  Runtime,
  EngineRuntime,
  RuntimePointer,
  IdentifiedConnection,
} from './models/metamodels/pure/packageableElements/runtime/Runtime';
export { PackageableRuntime } from './models/metamodels/pure/packageableElements/runtime/PackageableRuntime';
export { PureInstanceSetImplementation } from './models/metamodels/pure/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation';
export {
  OperationSetImplementation,
  OperationType,
} from './models/metamodels/pure/packageableElements/mapping/OperationSetImplementation';
export { PropertyMapping } from './models/metamodels/pure/packageableElements/mapping/PropertyMapping';
export {
  Connection,
  ConnectionPointer,
  type ConnectionVisitor,
} from './models/metamodels/pure/packageableElements/connection/Connection';
export { PackageableConnection } from './models/metamodels/pure/packageableElements/connection/PackageableConnection';
export { ModelStore } from './models/metamodels/pure/packageableElements/store/modelToModel/model/ModelStore';
export { PureModelConnection } from './models/metamodels/pure/packageableElements/store/modelToModel/connection/PureModelConnection';
export { JsonModelConnection } from './models/metamodels/pure/packageableElements/store/modelToModel/connection/JsonModelConnection';
export { ModelChainConnection } from './models/metamodels/pure/packageableElements/store/modelToModel/connection/ModelChainConnection';
export { XmlModelConnection } from './models/metamodels/pure/packageableElements/store/modelToModel/connection/XmlModelConnection';
export * from './models/metamodels/pure/packageableElements/mapping/SetImplementation';
export * from './models/metamodels/pure/packageableElements/mapping/TEMPORARY__UnresolvedSetImplementation';
export { PurePropertyMapping } from './models/metamodels/pure/packageableElements/store/modelToModel/mapping/PurePropertyMapping';
export { InstanceSetImplementation } from './models/metamodels/pure/packageableElements/mapping/InstanceSetImplementation';
export { EnumerationMapping } from './models/metamodels/pure/packageableElements/mapping/EnumerationMapping';
export {
  EnumValueMapping,
  SourceValue,
} from './models/metamodels/pure/packageableElements/mapping/EnumValueMapping';
export { AssociationImplementation } from './models/metamodels/pure/packageableElements/mapping/AssociationImplementation';
export { SetImplementationContainer } from './models/metamodels/pure/packageableElements/mapping/SetImplementationContainer';
export { AggregationAwareSetImplementation } from './models/metamodels/pure/packageableElements/mapping/aggregationAware/AggregationAwareSetImplementation';
export * from './models/metamodels/pure/packageableElements/mapping/InferableMappingElementId';
export * from './models/metamodels/pure/packageableElements/mapping/InferableMappingElementRoot';
export { SetImplementationExplicitReference } from './models/metamodels/pure/packageableElements/mapping/SetImplementationReference';
export { MappingTest } from './models/metamodels/pure/packageableElements/mapping/MappingTest';
export { InputData } from './models/metamodels/pure/packageableElements/mapping/InputData';
export { MappingTestAssert } from './models/metamodels/pure/packageableElements/mapping/MappingTestAssert';
export { ExpectedOutputMappingTestAssert } from './models/metamodels/pure/packageableElements/mapping/ExpectedOutputMappingTestAssert';
export {
  ObjectInputData,
  ObjectInputType,
} from './models/metamodels/pure/packageableElements/store/modelToModel/mapping/ObjectInputData';

// protocols
export {
  V1_Connection,
  type V1_ConnectionVisitor,
} from './models/protocols/pure/v1/model/packageableElements/connection/V1_Connection';
export { V1_ConnectionPointer } from './models/protocols/pure/v1/model/packageableElements/connection/V1_ConnectionPointer';
export { V1_Mapping } from './models/protocols/pure/v1/model/packageableElements/mapping/V1_Mapping';
export { V1_PackageableRuntime } from './models/protocols/pure/v1/model/packageableElements/runtime/V1_PackageableRuntime';
export { V1_Store } from './models/protocols/pure/v1/model/packageableElements/store/V1_Store';
export {
  V1_EngineRuntime,
  V1_LegacyRuntime,
  V1_Runtime,
  V1_IdentifiedConnection,
  V1_StoreConnections,
  V1_RuntimePointer,
} from './models/protocols/pure/v1/model/packageableElements/runtime/V1_Runtime';
export {
  V1_ClassMapping,
  type V1_ClassMappingVisitor,
} from './models/protocols/pure/v1/model/packageableElements/mapping/V1_ClassMapping';
export * from './models/protocols/pure/DSLMapping_PureProtocolProcessorPlugin_Extension';
