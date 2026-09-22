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

export enum LEGEND_QUERY_APP_EVENT {
  // TODO: split this into specific events
  GENERIC_FAILURE = 'application.failure.generic',

  VIEW_QUERY__SUCCESS = 'query-editor.view-query.success',
  CREATE_QUERY__SUCCESS = 'query-editor.create-query.success',
  UPDATE_QUERY__SUCCESS = 'query-editor.update-query.success',
  RENAME_QUERY__SUCCESS = 'query-editor.rename.query.success',
  DELETE_QUERY__SUCCESS = 'query-editor.delete-query.success',

  CREATE_QUERY__FAILURE = 'query-editor.create-query.failure',
  UPDATE_QUERY__FAILURE = 'query-editor.update-query.failure',
  RENAME_QUERY__FAILURE = 'query-editor.rename-query.failure',
  DELETE_QUERY__FAILURE = 'query-editor.delete-query.failure',
  VIEW_QUERY__FAILURE = 'query-editor.view-query.failure',
  INITIALIZE_QUERY_STATE__FAILURE = 'query-editor.initialize-query-state.failure',
  GRAPH_INITIALIZATION__FAILURE = 'query-editor.graph-initialization.failure',
  PRODUCTIONIZE_QUERY__LAUNCH = 'query-editor.productionize-query.launch',
  INITIALIZE_QUERY_STATE__SUCCESS = 'query-editor.initialize-query-state.success',
  INITIALIZE_QUERY_CREATOR__FAILURE = 'query-editor.initialize-query-creator.failure',
  LEGENDAI_QUERY_AGENT_CHAT__OPENED = 'query-editor.legendai-query-agent-chat.opened',
  LEGENDAI_QUERY_AGENT_CHAT__QUERY_LOADED = 'query-editor.legendai-query-agent-chat.query-loaded',
  LEGENDAI_QUERY_SUGGEST__LAUNCH = 'query-editor.legendai-query-suggest.launch',
  LEGENDAI_QUERY_SUGGEST__SUCCESS = 'query-editor.legendai-query-suggest.success',
  LEGENDAI_QUERY_SUGGEST__APPLY = 'query-editor.legendai-query-suggest.apply',
  LEGENDAI_QUERY_SUGGEST__DISCARD = 'query-editor.legendai-query-suggest.discard',
  LEGENDAI_QUERY_SUGGEST__FAILURE = 'query-editor.legendai-query-suggest.failure',

  CHANGE_DATA_SPACE = 'query-editor.change-data-space',
  CHANGE_DATA_PRODUCT = 'query-editor.change-data-product',

  VIEW_PROJECT__LAUNCH = 'query-editor.view-project.launch',
  VIEW_SDLC_PROJECT__LAUNCH = 'query-editor.view-sdlc-project.launch',

  // Help-menu items injected by Legend Query into the query builder header.
  // Each carries the shared query builder telemetry envelope (source info flat
  // + `state` nested), matching every other query telemetry event.
  ABOUT_QUERY_INFO__LAUNCH = 'query-editor.about-query-info.launch',
  QUERY_VERSION_HISTORY__LAUNCH = 'query-editor.query-version-history.launch',
  ABOUT_LEGEND_QUERY__LAUNCH = 'query-editor.about-legend-query.launch',
  ABOUT_DATA_SPACE__LAUNCH = 'query-editor.about-data-space.launch',
  ABOUT_DATA_PRODUCT__LAUNCH = 'query-editor.about-data-product.launch',
  ABOUT_INGEST__LAUNCH = 'query-editor.about-ingest.launch',

  LOCAL_STORAGE_PERSIST_ERROR = 'LOCAL_STORAGE_PERSIST_ERROR',
  HOSTED_DATA_CUBE__LAUNCH = 'query-editor.hosted-data-cube.launch',
}
