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
  GRAPH_BUILDER_ELEMENTS_DESERIALIZED = 'graph-manager.graph-builder.deserialization.success',
  GRAPH_BUILDER_ELEMENTS_INDEXED = 'graph-manager.graph-builder.indexing.success',
  GRAPH_BUILDER_SECTION_INDICES_BUILT = 'graph-manager.graph-builder.build-section-indices.success',
  GRAPH_BUILDER_DOMAIN_MODELS_BUILT = 'graph-manager.graph-builder.build-domain-models.success',
  GRAPH_BUILDER_STORES_BUILT = 'graph-manager.graph-builder.build-store.success',
  GRAPH_BUILDER_MAPPINGS_BUILT = 'graph-manager.graph-builder.build-mappings.success',
  GRAPH_BUILDER_CONNECTIONS_AND_RUNTIMES_BUILT = 'graph-manager.graph-builder.build-connections-and-runtimes.success',
  GRAPH_BUILDER_SERVICES_BUILT = 'graph-manager.graph-builder.build-services.success',
  GRAPH_BUILDER_DATA_ELEMENTS_BUILT = 'graph-manager.graph-builder.build-data.success',
  GRAPH_BUILDER_OTHER_ELEMENTS_BUILT = 'graph-manager.graph-builder.build-other-elements.success',
  GRAPH_BUILDER_COMPLETED = 'graph-manager.graph-builder.success',

  GRAPH_SYSTEM_INITIALIZED = 'graph-manager.system-initialization.success',
  GRAPH_INITIALIZED = 'graph-manager.graph-initialization.success',
  GRAPH_DEPENDENCIES_FETCHED = 'graph-manager.fetch-dependencies.success',
  GRAPH_ENTITIES_FETCHED = 'graph-manager.entities-dependencies.success',
  GRAPH_UPDATED_AND_REBUILT = 'graph-manager.rebuild.success',
  GRAPH_MODEL_TO_GRAMMAR_TRANSFORMED = 'graph-manager.grammar.composing.success',
  GRAPH_GRAMMAR_TO_MODEL_TRANSFORMED = 'graph-manager.grammar.parsing.success',
  GRAPH_META_MODEL_TO_PROTOCOL_TRANSFORMED = 'graph-manager.transformation.success',
  GRAPH_COMPILE_CONTEXT_COLLECTED = 'graph-manager.build-graph-compile-context.success',
  GRAPH_PROTOCOL_SERIALIZED = 'graph-manager.graph-serialization.success',

  GRAPH_BUILDER_FAILURE = 'graph-manager.graph-builder.failure',
  EXECUTION_FAILURE = 'graph-manager.execution.failure',
  COMPILATION_FAILURE = 'graph-manager.compilation.failure',
  PARSING_FAILURE = 'graph-manager.grammar.parsing.failure',
  GRAPH_MANAGER_FAILURE = 'graph-manager.failure',
  CACHE_MANAGER_FAILURE = 'graph-manager.cache.failure',
}
