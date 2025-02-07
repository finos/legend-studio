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
export { INTERNAL__UnknownAuthenticationStrategy } from './graph/metamodel/pure/packageableElements/store/relational/connection/INTERNAL__UnknownAuthenticationStrategy.js';
export { INTERNAL__UnknownDatasourceSpecification } from './graph/metamodel/pure/packageableElements/store/relational/connection/INTERNAL__UnknownDatasourceSpecification.js';
export { INTERNAL__UnknownPostProcessor } from './graph/metamodel/pure/packageableElements/store/relational/connection/postprocessor/INTERNAL__UnknownPostProcessor.js';

export { Database } from './graph/metamodel/pure/packageableElements/store/relational/model/Database.js';
export { Table } from './graph/metamodel/pure/packageableElements/store/relational/model/Table.js';
export { Column } from './graph/metamodel/pure/packageableElements/store/relational/model/Column.js';
export { Schema } from './graph/metamodel/pure/packageableElements/store/relational/model/Schema.js';
export { View } from './graph/metamodel/pure/packageableElements/store/relational/model/View.js';
export { Join } from './graph/metamodel/pure/packageableElements/store/relational/model/Join.js';
export {
  ViewReference,
  ViewExplicitReference,
} from './graph/metamodel/pure/packageableElements/store/relational/model/ViewReference.js';
export {
  TableReference,
  TableExplicitReference,
} from './graph/metamodel/pure/packageableElements/store/relational/model/TableReference.js';
export {
  ColumnReference,
  ColumnExplicitReference,
} from './graph/metamodel/pure/packageableElements/store/relational/model/ColumnReference.js';
export {
  TableNameMapper,
  Mapper,
  SchemaNameMapper,
} from './graph/metamodel/pure/packageableElements/store/relational/connection/postprocessor/Mapper.js';

export { PostProcessor } from './graph/metamodel/pure/packageableElements/store/relational/connection/postprocessor/PostProcessor.js';
export { MapperPostProcessor } from './graph/metamodel/pure/packageableElements/store/relational/connection/postprocessor/MapperPostProcessor.js';

export { Milestoning } from './graph/metamodel/pure/packageableElements/store/relational/model/milestoning/Milestoning.js';
export * from './graph/metamodel/pure/packageableElements/store/relational/model/RelationalDataType.js';
export * from './graph/metamodel/pure/packageableElements/store/relational/model/RelationalOperationElement.js';
export * from './graph/metamodel/pure/packageableElements/store/relational/model/RawRelationalOperationElement.js';
export {
  DEPRECATED__RelationalInputData as RelationalInputData,
  RelationalInputType,
} from './graph/metamodel/pure/packageableElements/mapping/DEPRECATED__MappingTest.js';
export { RelationalPropertyMapping } from './graph/metamodel/pure/packageableElements/store/relational/mapping/RelationalPropertyMapping.js';
export { RelationalInstanceSetImplementation } from './graph/metamodel/pure/packageableElements/store/relational/mapping/RelationalInstanceSetImplementation.js';
export { RootRelationalInstanceSetImplementation } from './graph/metamodel/pure/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation.js';
export { EmbeddedRelationalInstanceSetImplementation } from './graph/metamodel/pure/packageableElements/store/relational/mapping/EmbeddedRelationalInstanceSetImplementation.js';
export { OtherwiseEmbeddedRelationalInstanceSetImplementation } from './graph/metamodel/pure/packageableElements/store/relational/mapping/OtherwiseEmbeddedRelationalInstanceSetImplementation.js';
export {
  DatabaseConnection,
  DatabaseType,
  RelationalDatabaseConnection,
} from './graph/metamodel/pure/packageableElements/store/relational/connection/RelationalDatabaseConnection.js';
export * from './graph/metamodel/pure/packageableElements/store/relational/connection/AuthenticationStrategy.js';
export * from './graph/metamodel/pure/packageableElements/store/relational/connection/DatasourceSpecification.js';

// protocols
export * from './graph-manager/protocol/pure/extensions/STO_Relational_PureProtocolProcessorPlugin_Extension.js';
export * from './graph-manager/protocol/pure/v1/model/packageableElements/store/relational/model/V1_TablePtr.js';
export { V1_transformTableToTablePointer } from './graph-manager/protocol/pure/v1/transformation/pureGraph/from/V1_DatabaseTransformer.js';
export {
  V1_transformMapper,
  V1_transformRelation,
} from './graph-manager/protocol/pure/v1/transformation/pureGraph/from/V1_PostProcessorTransformer.js';
export { V1_getRelation } from './graph-manager/protocol/pure/v1/transformation/pureGraph/to/helpers/V1_DatabaseBuilderHelper.js';
export { V1_tablePtrModelSchema } from './graph-manager/protocol/pure/v1/transformation/pureProtocol/serializationHelpers/V1_DatabaseSerializationHelper.js';
export { type V1_Mapper } from './graph-manager/protocol/pure/v1/model/packageableElements/store/relational/connection/postprocessor/V1_Mapper.js';
export { V1_PostProcessor } from './graph-manager/protocol/pure/v1/model/packageableElements/store/relational/connection/postprocessor/V1_PostProcessor.js';
export { V1_DatasourceSpecification } from './graph-manager/protocol/pure/v1/model/packageableElements/store/relational/connection/V1_DatasourceSpecification.js';
export { V1_AuthenticationStrategy } from './graph-manager/protocol/pure/v1/model/packageableElements/store/relational/connection/V1_AuthenticationStrategy.js';
export { V1_Milestoning } from './graph-manager/protocol/pure/v1/model/packageableElements/store/relational/model/milestoning/V1_Milestoning.js';
export { V1_buildMapper } from './graph-manager/protocol/pure/v1/transformation/pureGraph/to/helpers/V1_PostProcessorBuilderHelper.js';
export {
  V1_serializeMapper,
  V1_deserializeMapper,
} from './graph-manager/protocol/pure/v1/transformation/pureProtocol/serializationHelpers/V1_PostProcessorSerializationHelper.js';
export * from './graph-manager/protocol/pure/v1/model/packageableElements/store/relational/model/V1_RelationalDataType.js';
export * from './graph-manager/extensions/STO_Relational_PureGraphManagerPlugin_Extension.js';

export * from './graph/metamodel/pure/data/RelationalCSVData.js';
export { SQLExecutionNode } from './graph/metamodel/pure/executionPlan/nodes/SQLExecutionNode.js';
export { SQLResultColumn } from './graph/metamodel/pure/executionPlan/nodes/SQLResultColumn.js';
export { RelationalTDSInstantiationExecutionNode } from './graph/metamodel/pure/executionPlan/nodes/RelationalInstantiationExecutionNode.js';
export { createExplicitRelationReference } from './graph/metamodel/pure/packageableElements/store/relational/model/RelationReference.js';
