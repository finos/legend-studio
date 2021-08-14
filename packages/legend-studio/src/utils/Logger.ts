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

import { Logger } from '@finos/legend-studio-shared';

export enum GRAPH_MANAGER_LOG_EVENT {
  GRAPH_BUILDER_FAILURE = 'GRAPH_BUILD_FAILURE',

  GRAPH_BUILDER_SYSTEM_BUILT = 'GRAPH_BUILDER_SYSTEM_BUILT',
  GRAPH_BUILDER_DEPENDENCIES_PREPROCESSED = 'GRAPH_BUILDER_DEPENDENCIES_PREPROCESSED',
  GRAPH_BUILDER_DEPENDENCIES_PROCESSED = 'GRAPH_BUILDER_DEPENDENCIES_PROCESSED',
  GRAPH_BUILDER_DEPENDENCIES_BUILT = 'GRAPH_BUILDER_DEPENDENCIES_BUILT',
  GRAPH_BUILDER_GENERATIONS_BUILT = 'GRAPH_BUILDER_GENERATIONS_BUILT',
  GRAPH_BUILDER_DATA_MODEL_PARSED = 'GRAPH_BUILDER_DATA_MODEL_PARSED',
  GRAPH_BUILDER_COMPLETED = 'GRAPH_BUILDER_COMPLETED',
  GRAPH_BUILDER_ELEMENTS_INITIALIZED_AND_INDEXED = 'GRAPH_BUILDER_ELEMENTS_INITIALIZED_AND_INDEXED',
  GRAPH_BUILDER_SECTION_INDICES_BUILT = 'GRAPH_BUILDER_SECTION_INDICES_BUILT',
  GRAPH_BUILDER_DOMAIN_MODELS_BUILT = 'GRAPH_BUILDER_DOMAIN_MODELS_BUILT',
  GRAPH_BUILDER_STORES_BUILT = 'GRAPH_BUILDER_STORES_BUILT',
  GRAPH_BUILDER_MAPPINGS_BUILT = 'GRAPH_BUILDER_MAPPINGS_BUILT',
  GRAPH_BUILDER_CONNECTIONS_BUILT = 'GRAPH_BUILDER_CONNECTIONS_BUILT',
  GRAPH_BUILDER_RUNTIMES_BUILT = 'GRAPH_BUILDER_RUNTIMES_BUILT',
  GRAPH_BUILDER_OTHER_ELEMENTS_BUILT = 'GRAPH_BUILDER_OTHER_ELEMENTS_BUILT',
  // TODO: we should be able to move these out with modularization
  GRAPH_BUILDER_DIAGRAMS_BUILT = 'GRAPH_BUILDER_DIAGRAMS_BUILT',
  GRAPH_BUILDER_FILE_GENERATIONS_BUILT = 'GRAPH_BUILDER_FILE_GENERATIONS_BUILT',
  GRAPH_BUILDER_GENERATION_TREE_BUILT = 'GRAPH_BUILDER_GENERATION_TREE_BUILT',
  GRAPH_BUILDER_SERVICES_BUILT = 'GRAPH_BUILDER_SERVICES_BUILT',

  GRAPH_INITIALIZED = 'GRAPH_INITIALIZED',
  GRAPH_ENTITIES_FETCHED = 'GRAPH_ENTITIES_FETCHED',
  GRAPH_UPDATED_AND_REBUILT = 'GRAPH_REBUILT',
  GRAPH_MODEL_TO_GRAMMAR_TRANSFORMED = 'GRAPH_MODEL_TO_GRAMMAR_TRANSFORMED',
  GRAPH_GRAMMAR_TO_MODEL_TRANSFORMED = 'GRAPH_GRAMMAR_TO_MODEL_TRANSFORMED',
  GRAPH_META_MODEL_TO_PROTOCOL_TRANSFORMED = 'GRAPH_META_MODEL_TO_PROTOCOL_TRANSFORMED',
  GRAPH_COMPILE_CONTEXT_COLLECTED = 'GRAPH_COMPILE_CONTEXT_COLLECTED',
  GRAPH_PROTOCOL_SERIALIZED = 'GRAPH_PROTOCOL_SERIALIZED',
  GRAPH_HASHES_PREPROCESSED = 'GRAPH_HASHES_PREPROCESSED',
  GRAPH_HASHES_DISPOSED = 'GRAPH_HASHES_DISPOSED',

  EXECUTION_FAILURE = 'EXECUTION_FAILURE',
  COMPILATION_FAILURE = 'COMPILATION_FAILURE',
  PARSING_FAILURE = 'PARSING_FAILURE',
}

export enum SDLC_LOG_EVENT {
  SDLC_MANAGER_FAILURE = 'SDLC_MANAGER_FAILURE',
  SDLC_UPDATE_WORKSPACE = 'SDLC_UPDATE_WORKSPACE',
  SDLC_SYNC_WORKSPACE = 'SDLC_SYNC_WORKSPACE',
}

export enum METADATA_LOG_EVENT {
  METADATA_MANAGER_FAILURE = 'METADATA_MANAGER_FAILURE',
}

export enum CHANGE_DETECTION_LOG_EVENT {
  CHANGE_DETECTION_FAILURE = 'CHANGE_DETECTION_FAILURE',
  CHANGE_DETECTION_RESTARTED = 'CHANGE_DETECTION_RESTARTED',
  CHANGE_DETECTION_CHANGES_COMPUTED = 'CHANGE_DETECTION_CHANGES_COMPUTED',
  CHANGE_DETECTION_GRAPH_HASH_SNAPSHOTED = 'CHANGE_DETECTION_GRAPH_HASH_SNAPSHOTED',
  CHANGE_DETECTION_LOCAL_HASHES_INDEX_BUILT = 'CHANGE_DETECTION_LOCAL_HASHES_INDEX_BUILT',
  CHANGE_DETECTION_WORKSPACE_HASHES_INDEX_BUILT = 'CHANGE_DETECTION_WORKSPACE_HASHES_INDEX_BUILT',
  CHANGE_DETECTION_PROJECT_LATEST_HASHES_INDEX_BUILT = 'CHANGE_DETECTION_PROJECT_LATEST_HASHES_INDEX_BUILT',
  CHANGE_DETECTION_WORKSPACE_UPDATE_CONFLICTS_COMPUTED = 'CHANGE_DETECTION_WORKSPACE_UPDATE_CONFLICTS_COMPUTED',
  CHANGE_DETECTION_CONFLICT_RESOLUTION_CONFLICTS_COMPUTED = 'CHANGE_DETECTION_CONFLICT_RESOLUTION_CONFLICTS_COMPUTED',
}

export enum STUDIO_LOG_EVENT {
  EDITOR_FONT_LOADED = 'EDITOR_FONT_LOADED',
  WORKSPACE_SETUP_FAILURE = 'EDITOR_SETUP_FAILURE',
  PACKAGE_TREE_BUILDER_FAILURE = 'PACKAGE_TREE_BUILDER_FAILURE',
  MODEL_LOADER_FAILURE = 'MODEL_LOADER_FAILURE',
  DATABASE_BUILDER_FAILURE = 'DATABASE_BUILDER_FAILURE',
  SERVICE_REGISTRATION_FAILURE = 'SERVICE_REGISTRATION_FAILURE',
  SERVICE_TEST_RUNNER_FAILURE = 'SERVICE_TEST_RUNNER_FAILURE',
  GENERATION_FAILURE = 'GENERATION_FAILURE',
}

export enum APPLICATION_LOG_EVENT {
  APPLICATION_FAILURE = 'APPLICATION_FAILURE',
  APPLICATION_CONFIGURATION_FAILURE = 'APPLICATION_CONFIGURATION_FAILURE',
  ILLEGAL_APPLICATION_STATE_OCCURRED = 'ILLEGAL_APPLICATION_STATE_OCCURRED',
  APPLICATION_LOADED = 'APPLICATION_LOADED',
}

export class SilentLogger extends Logger {
  _debug(): void {
    // do nothing
  }

  _info(): void {
    // do nothing
  }

  _warn(): void {
    // do nothing
  }

  _error(): void {
    // do nothing
  }
}

const { debug, info, warn, error } = console;

export class BrowserConsole extends Logger {
  _debug(event: string | undefined, ...data: unknown[]): void {
    debug(event ? (data.length ? `${event}:` : event) : '', ...data);
  }

  _info(event: string | undefined, ...data: unknown[]): void {
    info(event ? (data.length ? `${event}:` : event) : '', ...data);
  }

  _warn(event: string | undefined, ...data: unknown[]): void {
    warn(event ? (data.length ? `${event}:` : event) : '', ...data);
  }

  _error(event: string | undefined, ...data: unknown[]): void {
    error(event ? (data.length ? `${event}:` : event) : '', ...data);
  }
}
