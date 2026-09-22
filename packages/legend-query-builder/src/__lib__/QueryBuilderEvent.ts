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
  RUN_QUERY__FAILURE = 'query-builder.run-query.failure',
  RUN_QUERY__CANCELLED = 'query-builder.run-query.cancelled',

  /**
   * Timing keys, not events in their own right — these name the `StopWatch`
   * laps that end up in `report.timings` on the run-query events. The engine
   * call itself is lapped inside the graph manager as
   * `GRAPH_MANAGER_EVENT.V1_ENGINE_OPERATION_*`, so it is deliberately not
   * duplicated here.
   */
  RUN_QUERY__PREPARE = 'query-builder.run-query.prepare',
  RUN_QUERY__PROCESS_RESULT = 'query-builder.run-query.process-result',

  GENERATE_EXECUTION_PLAN__SUCCESS = 'query-builder.generate-plan.success',
  GENERATE_EXECUTION_PLAN__FAILURE = 'query-builder.generate-plan.failure',
  DEBUG_EXECUTION_PLAN__SUCCESS = 'query-builder.debug-plan.success',
  DEBUG_EXECUTION_PLAN__FAILURE = 'query-builder.debug-plan.failure',
  BUILD_EXECUTION_PLAN__SUCCESS = 'query-builder.build-plan.success',
  EXPORT_QUERY_DATA__SUCCESS = 'query-builder.export-query-data.success',
  EXPORT_QUERY_DATA__FAILURE = 'query-builder.export-query-data.failure',
  EMBEDDED_DATA_CUBE__SUCCESS = 'query-builder.embedded-data-cube.success',

  MAPPING_MODEL_COVERAGE_ANALYSYS__LAUNCH = 'query-builder.mapping-model-coverage-analysis.launch',
  MAPPING_MODEL_COVERAGE_ANALYSYS__SUCCESS = 'query-builder.mapping-model-coverage-analysis.success',

  UNSUPPORTED_QUERY_LAUNCH = 'query-builder.unsupported-query.launch',

  SHOW_UNMAPPED_PROPERTIES__LAUNCH = 'query-builder.show-unmapped-properties.launch',
  PROPERTY_EXPLORER_OPTIONS__LAUNCH = 'query-builder.property-explorer-options.launch',
  PANEL_FUNCTION_EXPLORER__TOGGLE = 'query-builder.panel-function-explorer.toggle',
  PANEL_FUNCTION_EXPLORER__RENDER = 'query-builder.panel-function-explorer.render',
  PANEL_FUNCTION_EXPLORER_DEPENDENCY_VIEW__TOGGLE = 'query-builder.panel-function-explorer-dependency-view.toggle',

  PANEL_FETCH_STRUCTURE_TOGGLE = 'query-builder.panel-fetch-structure.toggle',
  PANEL_GRAPH_FETCH_RENDER = 'query-builder.panel-graph-fetch.render',

  // Advanced-menu actions. Each carries the shared telemetry envelope (source
  // info flat at the top level, execution context under `state`). `*.toggle`
  // events include the post-toggle `enabled` state so dashboards can slice
  // opens vs closes; `*.launch` events fire once per invocation.
  PANEL_PARAMETER__TOGGLE = 'query-builder.panel-parameter.toggle',
  PANEL_CONSTANT__TOGGLE = 'query-builder.panel-constant.toggle',
  PANEL_FILTER__TOGGLE = 'query-builder.panel-filter.toggle',
  PANEL_WINDOW__TOGGLE = 'query-builder.panel-window.toggle',
  PANEL_POST_FILTER__TOGGLE = 'query-builder.panel-post-filter.toggle',
  CALENDAR__TOGGLE = 'query-builder.calendar.toggle',
  TYPED_TDS__TOGGLE = 'query-builder.typed-tds.toggle',
  CHECK_ENTITLEMENTS__LAUNCH = 'query-builder.check-entitlements.launch',
  EDIT_PURE__LAUNCH = 'query-builder.edit-pure.launch',
  SHOW_PURE__LAUNCH = 'query-builder.show-pure.launch',
  SHOW_PROTOCOL__LAUNCH = 'query-builder.show-protocol.launch',
  COMPILE_QUERY__LAUNCH = 'query-builder.compile-query.launch',
  SHOW_QUERY_DIFF__LAUNCH = 'query-builder.show-query-diff.launch',

  // Help-menu actions (core items rendered by the query builder itself). The
  // application-level Help items injected via
  // `getExtraQueryBuilderHelpMenuActionConfigurations` are reported by the
  // host application under its own event namespace.
  OPEN_DOCUMENTATION__LAUNCH = 'query-builder.open-documentation.launch',
  OPEN_FAQ__LAUNCH = 'query-builder.open-faq.launch',
  OPEN_SUPPORT_TICKETS__LAUNCH = 'query-builder.open-support-tickets.launch',
  VIRTUAL_ASSISTANT__TOGGLE = 'query-builder.virtual-assistant.toggle',

  EXECUTION_CONTEXT__CHANGE = 'query-builder.execution-context.change',
  PROJECTION__CHANGE = 'query-builder.projection.change',
  AGGREGATION__CHANGE = 'query-builder.aggregation.change',
  WINDOW__CHANGE = 'query-builder.window.change',
  GRAPH_FETCH__CHANGE = 'query-builder.graph-fetch.change',
  PARAMETER__CHANGE = 'query-builder.parameter.change',
  CONSTANT__CHANGE = 'query-builder.constant.change',
  RESULT_MODIFIER__CHANGE = 'query-builder.result-modifier.change',
  WATERMARK__CHANGE = 'query-builder.watermark.change',
  MILESTONING__CHANGE = 'query-builder.milestoning.change',
  FILTER__CHANGE = 'query-builder.filter.change',
  POST_FILTER__CHANGE = 'query-builder.post-filter.change',

  CHANGE_HISTORY_ERROR = 'query-builder.change-history.error',

  /**
   * The canonical "a query builder exists and is loaded" signal, emitted by the
   * host application from every entry point. Prefer this over the host's own
   * route-specific load events when counting opens — those each cover only part
   * of the population.
   */
  OPENED = 'query-builder.opened',
}

/**
 * Which surface opened the query builder, reported as `openedFrom` on
 * {@link QUERY_BUILDER_EVENT.OPENED}.
 *
 * This names the *surface* only. What is being queried is already carried by the
 * source info on the same payload (`sourceType` and its target field), and
 * `queryId` already marks a saved query — so there is deliberately no
 * `query.creator.data-space`-style cross product here.
 */
export enum QUERY_BUILDER_OPENED_FROM {
  QUERY_CREATOR = 'query.creator',
  QUERY_SAVED = 'query.saved',
  // NOTE: `studio.*` values to be added when Legend Studio's entry points are
  // wired up; until then Studio emits no `opened` event at all, which shows up
  // as an absence rather than as mislabelled rows
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
