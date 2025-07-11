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

export enum GRAPH_MANAGER_EVENT {
  GRAPH_BUILDER_DESERIALIZE_ELEMENTS__SUCCESS = 'graph-manager.graph-builder.deserialization.success',
  GRAPH_BUILDER_INDEX_ELEMENTS__SUCCESS = 'graph-manager.graph-builder.indexing.success',
  GRAPH_BUILDER_BUILD_SECTION_INDICES__SUCCESS = 'graph-manager.graph-builder.build-section-indices.success',
  GRAPH_BUILDER_BUILD_DOMAIN_MODELS__SUCCESS = 'graph-manager.graph-builder.build-domain-models.success',
  GRAPH_BUILDER_BUILD_STORES__SUCCESS = 'graph-manager.graph-builder.build-stores.success',
  GRAPH_BUILDER_BUILD_MAPPINGS__SUCCESS = 'graph-manager.graph-builder.build-mappings.success',
  GRAPH_BUILDER_BUILD_CONNECTIONS_AND_RUNTIMES__SUCCESS = 'graph-manager.graph-builder.build-connections-and-runtimes.success',
  GRAPH_BUILDER_BUILD_FUNCTION_ACTIVATORS__SUCCESS = 'graph-manager.graph-builder.build-function-activators.success',
  GRAPH_BUILDER_BUILD_SERVICES__SUCCESS = 'graph-manager.graph-builder.build-services.success',
  GRAPH_BUILDER_BUILD_DATA_ELEMENTS__SUCCESS = 'graph-manager.graph-builder.build-data.success',
  GRAPH_BUILDER_BUILD_DATA_PRODUCTS__SUCCESS = 'graph-manager.graph-builder.build-data-products.success',
  GRAPH_BUILDER_BUILD_OTHER_ELEMENTS__SUCCESS = 'graph-manager.graph-builder.build-other-elements.success',
  GRAPH_BUILDER_BUILD_GRAPH__SUCCESS = 'graph-manager.graph-builder.success',

  INITIALIZE_GRAPH__SUCCESS = 'graph-manager.graph-initialization.success',
  INITIALIZE_GRAPH_SYSTEM__SUCCESS = 'graph-manager.system-initialization.success',
  FETCH_GRAPH_DEPENDENCIES__SUCCESS = 'graph-manager.fetch-dependencies.success',
  FETCH_GRAPH_ENTITIES__SUCCESS = 'graph-manager.entities-dependencies.success',
  TRANSFORM_GRAPH_META_MODEL_TO_PROTOCOL__SUCCESS = 'graph-manager.transformation.success',
  COLLECT_GRAPH_COMPILE_CONTEXT__SUCCESS = 'graph-manager.build-graph-compile-context.success',
  SERIALIZE_GRAPH_PROTOCOL__SUCCESS = 'graph-manager.graph-serialization.success',
  SERIALIZE_GRAPH_CONTEXT_PROTOCOL__SUCCESS = 'graph-manager.graph-context-serialization.success',
  UPDATE_AND_REBUILD_GRAPH__SUCCESS = 'graph-manager.rebuild.success',
  TRANSFORM_GRAPH_META_MODEL_TO_GRAMMAR__SUCCESS = 'graph-manager.grammar.composing.success',
  TRANSOFMR_GRAPH_GRAMMAR_TO_META_MODEL__SUCCESS = 'graph-manager.grammar.parsing.success',

  V1_ENGINE_OPERATION_SERVER_CALL__SUCCESS = 'graph-manager.v1.engine-operation.server-call.success',
  V1_ENGINE_OPERATION_INPUT__SUCCESS = 'graph-manager.v1.engine-operation.graph.collect-input.success',

  // FAILURE
  // TODO: consider to spliting all of these generic errors into more specific events
  GRAPH_BUILDER_FAILURE = 'graph-manager.graph-builder.failure',
  EXECUTION_FAILURE = 'graph-manager.execution.failure',
  GET_QUERY_FAILURE = 'graph-manager.get.query.failure',
  COMPILATION_FAILURE = 'graph-manager.compilation.failure',
  PARSING_FAILURE = 'graph-manager.grammar.parsing.failure',
  GRAPH_MANAGER_FAILURE = 'graph-manager.failure',
  CACHE_MANAGER_FAILURE = 'graph-manager.cache.failure',
  RELATIONAL_CONNECTION = 'graph-manager.relational.connection.failure',
  FETCH_GRAPH_ENTITIES_ERROR = 'graph-manager.entities-dependencies.error',
  LINEAGE_GENERATION_FAILURE = 'graph-manager.lineage.error',
}
