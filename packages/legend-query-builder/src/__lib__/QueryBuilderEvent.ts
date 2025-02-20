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

export enum QUERY_BUILDER_EVENT {
  RUN_QUERY__LAUNCH = 'query-builder.run-query.launch',
  GENERATE_EXECUTION_PLAN__LAUNCH = 'query-builder.generate-plan.launch',
  DEBUG_EXECUTION_PLAN__LAUNCH = 'query-builder.debug-plan.launch',
  EXPORT_QUERY_DATA__LAUNCH = 'query-builder.export-query-data.launch',
  EMBEDDED_DATA_CUBE__LAUNCH = 'query-builder.embedded-data-cube.launch',

  RUN_QUERY__SUCCESS = 'query-builder.run-query.success',
  GENERATE_EXECUTION_PLAN__SUCCESS = 'query-builder.generate-plan.success',
  DEBUG_EXECUTION_PLAN__SUCCESS = 'query-builder.debug-plan.success',
  BUILD_EXECUTION_PLAN__SUCCESS = 'query-builder.build-plan.success',
  EXPORT_QUERY_DATA__SUCCESS = 'query-builder.export-query-data.success',
  EMBEDDED_DATA_CUBE__SUCCESS = 'query-builder.embedded-data-cube.success',

  MAPPING_MODEL_COVERAGE_ANALYSYS__LAUNCH = 'query-builder.mapping-model-coverage-analysis.launch',
  MAPPING_MODEL_COVERAGE_ANALYSYS__SUCCESS = 'query-builder.mapping-model-coverage-analysis.success',

  UNSUPPORTED_QUERY_LAUNCH = 'query-builder.unsupported-query.lanuch',

  SHOW_UNMAPPED_PROPERTIES__LAUNCH = 'query-builder.show-unmapped-properties.launch',
  PROPERTY_EXPLORER_OPTIONS__LAUNCH = 'query-builder.property-explorer-options.launch',
  PANEL_FUNCTION_EXPLORER__TOGGLE = 'query-builder.panel-function-explorer.toggle',
  PANEL_FUNCTION_EXPLORER__RENDER = 'query-builder.panel-function-explorer.render',
  PANEL_FUNCTION_EXPLORER_DEPENDENCY_VIEW__TOGGLE = 'query-builder.panel-function-explorer-dependency-view.toggle',

  PANEL_FETCH_STRUCTURE_TOGGLE = 'query-builder.panel-fetch-structure.toggle',
  PANEL_GRAPH_FETCH_RENDER = 'query-builder.panel-graph-fetch.render',

  CHANGE_HISTORY_ERROR = 'query-builder.change-history.error',
}

export enum QUERY_BUILDER_FILTER_EVENT {
  FILTER__CREATE__CONDITION__LAUNCH = 'query-builder.filter.create-condition.launch',
  FILTER__CREATE__GROUP__FROM__CONDITION__LAUNCH = 'query-builder.filter.create-group-from-condition.launch',
  FILTER__CREATE__LOGICAL__GROUP__LAUNCH = 'query-builder.filter.create-logical-group.launch',
  FILTER__CLEANUP__TREE__LAUNCH = 'query-builder.filter.cleanup-tree.launch',
  FILTER__SIMPLIFY__TREE__LAUNCH = 'query-builder.filter.simplify-tree.launch',
  FILTER__COLLAPSE__TREE__LAUNCH = 'query-builder.filter.collapse-tree.launch',
  FILTER__EXPAND__TREE__LAUNCH = 'query-builder.filter.expand-tree.launch',
}

export enum QUERY_BUILDER_POST_FILTER_EVENT {
  FILTER__CREATE__CONDITION__LAUNCH = 'query-builder.post-filter.create-condition.launch',
  FILTER__CREATE__GROUP__FROM__CONDITION__LAUNCH = 'query-builder.post-filter.create-group-from-condition.launch',
  FILTER__CREATE__LOGICAL__GROUP__LAUNCH = 'query-builder.post-filter.create-logical-group.launch',
  FILTER__CLEANUP__TREE__LAUNCH = 'query-builder.post-filter.cleanup-tree.launch',
  FILTER__SIMPLIFY__TREE__LAUNCH = 'query-builder.post-filter.simplify-tree.launch',
  FILTER__COLLAPSE__TREE__LAUNCH = 'query-builder.post-filter.collapse-tree.launch',
  FILTER__EXPAND__TREE__LAUNCH = 'query-builder.post-filter.expand-tree.launch',
}
