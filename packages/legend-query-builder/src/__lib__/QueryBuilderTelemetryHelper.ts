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

import type { GraphManagerOperationReport } from '@finos/legend-graph';
import type { TelemetryErrorFields, TimingsRecord } from '@finos/legend-shared';
import type { TelemetryService } from '@finos/legend-application';
import {
  QUERY_BUILDER_EVENT,
  QUERY_BUILDER_FILTER_EVENT,
  QUERY_BUILDER_POST_FILTER_EVENT,
  type QUERY_BUILDER_OPENED_FROM,
} from './QueryBuilderEvent.js';
import type {
  QueryBuilderQueryInfo,
  QueryBuilderTelemetryContext,
} from '../stores/QueryBuilderState.js';

/**
 * Every payload below extends {@link QueryBuilderTelemetryContext}, which
 * carries two deliberately separate halves:
 *
 * - the entry point the query builder was *opened with* (`sourceInfo` — the
 *   route: GAV, data space, data product, service, …), spread FLAT at the top
 *   level;
 * - the execution context it *resolved to* (class / mapping / runtime), nested
 *   under `state`.
 *
 * Keeping them apart is what lets a dashboard distinguish "arrived on mapping
 * X" from "currently querying mapping X" — for a mapping-sourced query both are
 * populated and a divergence means the user switched, while for a data space or
 * data product query only `state` carries a mapping, because the entry point
 * resolves to one.
 */
type QueryExecution_TelemetryData = QueryBuilderTelemetryContext &
  GraphManagerOperationReport & {
    dependenciesCount: number;
    queryInfo?: QueryBuilderQueryInfo | undefined;
    executionDurationMs?: number | undefined;
  };

/**
 * Payload for query execution / plan / export failure events. Mirrors the shape
 * of `LegendQueryTelemetryHelper` creator-failure payloads (`errorName`,
 * `errorMessage`, `httpStatus`) so success/failure pairs can be joined on the
 * same set of dimensions.
 */
export type QueryExecutionFailure_TelemetryData = QueryBuilderTelemetryContext &
  TelemetryErrorFields & {
    /**
     * Backend trace ID for the failed execution, when the error carries one.
     */
    executionTraceId?: string | undefined;
    /**
     * Phase timings collected up to the point of failure. Which laps are
     * *missing* is the useful signal: no
     * `graph-manager.v1.engine-operation.server-call.success` means the query
     * never reached the engine, so the failure is pre-flight rather than
     * in-flight.
     */
    timings?: TimingsRecord | undefined;
    queryInfo?: QueryBuilderQueryInfo | undefined;
    executionDurationMs?: number | undefined;
  } & Record<string, unknown>;

/**
 * Payload for {@link QUERY_BUILDER_EVENT.OPENED}.
 *
 * `openedFrom` is carried here and nowhere else. Which application emitted an
 * event is already stamped on every payload by `TelemetryServicePlugin.setup()`
 * (`appName`), and `appSessionId` is the join key back to this event — so
 * repeating the surface on high-frequency events like `run-query.*` would
 * duplicate data that is already reachable.
 */
export type QueryBuilderOpened_TelemetryData = QueryBuilderTelemetryContext & {
  openedFrom: QUERY_BUILDER_OPENED_FROM;
} & Record<string, unknown>;

/**
 * Payload for {@link QUERY_BUILDER_EVENT.UNSUPPORTED_QUERY_LAUNCH}, fired when
 * the query lambda could not be built into the form-mode builder and the user
 * fell through to the raw-lambda / unsupported-query editor. Carries the
 * shared envelope + capped error dimensions so unsupported-lambda fallback is
 * countable per entry point / GAV. The untruncated stack still goes to
 * `logService.error` alongside, so the full error remains debuggable.
 */
export type UnsupportedQueryLaunched_TelemetryData =
  QueryBuilderTelemetryContext & TelemetryErrorFields;

type QueryMappingModelCoverageAnalysis_TelemetryData =
  QueryBuilderTelemetryContext &
    GraphManagerOperationReport & {
      dependenciesCount: number;
    };

type GraphFetchPanel_TelemtryData = {
  serializationType: string | undefined;
};

/**
 * Payloads for the authoring-side `*.change` events.
 *
 * Each nests what the user actually did under a `change` key, leaving the top
 * level to the shared {@link QueryBuilderTelemetryContext} envelope. Beyond
 * consistency this avoids a real collision: `change.sourceType` on a projection
 * event ("explorer-property") means something entirely different from the
 * top-level `sourceType` carried by `sourceInfo` ("data-product").
 */
type ExecutionContextChange_TelemetryData = QueryBuilderTelemetryContext & {
  change: {
    subtype: 'class' | 'mapping' | 'runtime';
  };
};

type ProjectionChange_TelemetryData = QueryBuilderTelemetryContext & {
  change: {
    action: 'add' | 'remove' | 'move' | 'clear' | 'add-derivation';
    sourceType?:
      | 'explorer-property'
      | 'explorer-relation'
      | 'function'
      | 'filter-condition'
      | 'derivation';
    /**
     * The resulting column count — except for `clear`, where it is the number
     * of columns that were removed.
     */
    columnCount: number;
  };
};

type ResultModifierChange_TelemetryData = QueryBuilderTelemetryContext & {
  change: {
    limitSet: boolean;
    distinctOn: boolean;
    sortColumnCount: number;
    sliceSet: boolean;
  };
};

type AggregationChange_TelemetryData = QueryBuilderTelemetryContext & {
  change: {
    action: 'operator-change';
    operatorName?: string | undefined;
  };
};

type WindowChange_TelemetryData = QueryBuilderTelemetryContext & {
  /**
   * DnD reordering of window columns is intentionally not reported — it would
   * emit on every hover-driven reorder, so there is no `move` action here.
   */
  change: {
    action: 'add' | 'edit' | 'remove';
    columnCount: number;
  };
};

type GraphFetchChange_TelemetryData = QueryBuilderTelemetryContext & {
  change: {
    action: 'add' | 'remove' | 'check-toggle' | 'serialization-change';
    nodeCount: number;
    serializationType?: string | undefined;
  };
};

type ParameterChange_TelemetryData = QueryBuilderTelemetryContext & {
  change: {
    action: 'add' | 'edit' | 'remove';
    parameterCount: number;
  };
};

type ConstantChange_TelemetryData = QueryBuilderTelemetryContext & {
  change: {
    action: 'add' | 'edit' | 'remove';
    constantCount: number;
  };
};

type WatermarkChange_TelemetryData = QueryBuilderTelemetryContext & {
  change: {
    enabled: boolean;
  };
};

type MilestoningChange_TelemetryData = QueryBuilderTelemetryContext & {
  change: {
    subtype:
      | 'business-date'
      | 'processing-date'
      | 'all-versions'
      | 'all-versions-in-range';
  };
};

/**
 * Shared by the filter and post-filter trees. DnD reparenting/reordering of
 * condition nodes is intentionally not reported, so there is no `move` action.
 */
type FilterChange_TelemetryData = QueryBuilderTelemetryContext & {
  change: {
    action: 'remove' | 'group-operation-change';
    groupOperation?: 'and' | 'or' | undefined;
  };
};

/**
 * Payload for Advanced/Help menu `*.launch` actions — a menu item the user
 * clicked, carrying just the shared telemetry envelope (source info + `state`)
 * with no `change` block, because these are one-shot invocations rather than
 * authoring events.
 */
type MenuAction_TelemetryData = QueryBuilderTelemetryContext;

/**
 * Payload for Advanced/Help menu `*.toggle` actions. `enabled` reports the
 * post-toggle state so a single event stream covers both opens and closes;
 * split `WHERE enabled = true` for opens.
 */
type MenuToggle_TelemetryData = QueryBuilderTelemetryContext & {
  enabled: boolean;
};

export class QueryBuilderTelemetryHelper {
  static logEvent_QueryBuilderOpened(
    service: TelemetryService,
    data: QueryBuilderOpened_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.OPENED, data);
  }

  static logEvent_UnsupportedQueryLaunched(
    service: TelemetryService,
    data: UnsupportedQueryLaunched_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.UNSUPPORTED_QUERY_LAUNCH, data);
  }

  static logEvent_QueryRunLaunched(
    service: TelemetryService,
    data?: Record<string, unknown> | undefined,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.RUN_QUERY__LAUNCH, data ?? {});
  }

  static logEvent_ExportQueryDataLaunched(service: TelemetryService): void {
    service.logEvent(QUERY_BUILDER_EVENT.EXPORT_QUERY_DATA__LAUNCH, {});
  }

  static logEvent_ExecutionPlanGenerationLaunched(
    service: TelemetryService,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.GENERATE_EXECUTION_PLAN__LAUNCH, {});
  }

  static logEvent_ExecutionPlanDebugLaunched(service: TelemetryService): void {
    service.logEvent(QUERY_BUILDER_EVENT.DEBUG_EXECUTION_PLAN__LAUNCH, {});
  }

  static logEvent_EmbeddedDataCubeLaunched(service: TelemetryService): void {
    service.logEvent(QUERY_BUILDER_EVENT.EMBEDDED_DATA_CUBE__LAUNCH, {});
  }

  static logEvent_QueryRunSucceeded(
    service: TelemetryService,
    data: QueryExecution_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.RUN_QUERY__SUCCESS, data);
  }

  static logEvent_QueryRunFailed(
    service: TelemetryService,
    data: QueryExecutionFailure_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.RUN_QUERY__FAILURE, data);
  }

  static logEvent_QueryRunCancelled(
    service: TelemetryService,
    data?: Record<string, unknown> | undefined,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.RUN_QUERY__CANCELLED, data ?? {});
  }

  static logEvent_ExportQueryDataSucceeded(
    service: TelemetryService,
    data: QueryExecution_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.EXPORT_QUERY_DATA__SUCCESS, data);
  }

  static logEvent_ExportQueryDataFailed(
    service: TelemetryService,
    data: QueryExecutionFailure_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.EXPORT_QUERY_DATA__FAILURE, data);
  }

  static logEvent_ExecutionPlanGenerationSucceeded(
    service: TelemetryService,
    data: QueryExecution_TelemetryData,
  ): void {
    service.logEvent(
      QUERY_BUILDER_EVENT.GENERATE_EXECUTION_PLAN__SUCCESS,
      data,
    );
  }

  static logEvent_ExecutionPlanGenerationFailed(
    service: TelemetryService,
    data: QueryExecutionFailure_TelemetryData,
  ): void {
    service.logEvent(
      QUERY_BUILDER_EVENT.GENERATE_EXECUTION_PLAN__FAILURE,
      data,
    );
  }

  static logEvent_ExecutionPlanDebugSucceeded(
    service: TelemetryService,
    data: QueryExecution_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.DEBUG_EXECUTION_PLAN__SUCCESS, data);
  }

  static logEvent_ExecutionPlanDebugFailed(
    service: TelemetryService,
    data: QueryExecutionFailure_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.DEBUG_EXECUTION_PLAN__FAILURE, data);
  }

  static logEvent_EmbeddedDataCubeQueryRunSucceeded(
    service: TelemetryService,
    data: QueryExecution_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.EMBEDDED_DATA_CUBE__SUCCESS, data);
  }

  static logEvent_FilterCreateConditionLaunched(
    service: TelemetryService,
  ): void {
    service.logEvent(
      QUERY_BUILDER_FILTER_EVENT.FILTER__CREATE__CONDITION__LAUNCH,
      {},
    );
  }

  static logEvent_FilterCleanupTreeLaunched(service: TelemetryService): void {
    service.logEvent(
      QUERY_BUILDER_FILTER_EVENT.FILTER__CLEANUP__TREE__LAUNCH,
      {},
    );
  }

  static logEvent_FilterCollapseTreeLaunched(service: TelemetryService): void {
    service.logEvent(
      QUERY_BUILDER_FILTER_EVENT.FILTER__COLLAPSE__TREE__LAUNCH,
      {},
    );
  }

  static logEvent_FilterCreateGroupFromConditionLaunched(
    service: TelemetryService,
  ): void {
    service.logEvent(
      QUERY_BUILDER_FILTER_EVENT.FILTER__CREATE__GROUP__FROM__CONDITION__LAUNCH,
      {},
    );
  }

  static logEvent_FilterCreateLogicalGroupLaunched(
    service: TelemetryService,
  ): void {
    service.logEvent(
      QUERY_BUILDER_FILTER_EVENT.FILTER__CREATE__LOGICAL__GROUP__LAUNCH,
      {},
    );
  }

  static logEvent_FilterExpandTreeLaunched(service: TelemetryService): void {
    service.logEvent(
      QUERY_BUILDER_FILTER_EVENT.FILTER__EXPAND__TREE__LAUNCH,
      {},
    );
  }

  static logEvent_FilterSimplifyTreeLaunched(service: TelemetryService): void {
    service.logEvent(
      QUERY_BUILDER_FILTER_EVENT.FILTER__SIMPLIFY__TREE__LAUNCH,
      {},
    );
  }

  static logEvent_PostFilterCreateConditionLaunched(
    service: TelemetryService,
  ): void {
    service.logEvent(
      QUERY_BUILDER_POST_FILTER_EVENT.FILTER__CREATE__CONDITION__LAUNCH,
      {},
    );
  }

  static logEvent_PostFilterCleanupTreeLaunched(
    service: TelemetryService,
  ): void {
    service.logEvent(
      QUERY_BUILDER_POST_FILTER_EVENT.FILTER__CLEANUP__TREE__LAUNCH,
      {},
    );
  }

  static logEvent_PostFilterCollapseTreeLaunched(
    service: TelemetryService,
  ): void {
    service.logEvent(
      QUERY_BUILDER_POST_FILTER_EVENT.FILTER__COLLAPSE__TREE__LAUNCH,
      {},
    );
  }

  static logEvent_PostFilterCreateGroupFromConditionLaunched(
    service: TelemetryService,
  ): void {
    service.logEvent(
      QUERY_BUILDER_POST_FILTER_EVENT.FILTER__CREATE__GROUP__FROM__CONDITION__LAUNCH,
      {},
    );
  }

  static logEvent_PostFilterCreateLogicalGroupLaunched(
    service: TelemetryService,
  ): void {
    service.logEvent(
      QUERY_BUILDER_POST_FILTER_EVENT.FILTER__CREATE__LOGICAL__GROUP__LAUNCH,
      {},
    );
  }

  static logEvent_PostFilterExpandTreeLaunched(
    service: TelemetryService,
  ): void {
    service.logEvent(
      QUERY_BUILDER_POST_FILTER_EVENT.FILTER__EXPAND__TREE__LAUNCH,
      {},
    );
  }

  static logEvent_PostFilterSimplifyTreeLaunched(
    service: TelemetryService,
  ): void {
    service.logEvent(
      QUERY_BUILDER_POST_FILTER_EVENT.FILTER__SIMPLIFY__TREE__LAUNCH,
      {},
    );
  }

  static logEvent_QueryMappingModelCoverageAnalysisLaunched(
    service: TelemetryService,
  ): void {
    service.logEvent(
      QUERY_BUILDER_EVENT.MAPPING_MODEL_COVERAGE_ANALYSYS__LAUNCH,
      {},
    );
  }

  static logEvent_QueryMappingModelCoverageAnalysisSucceeded(
    service: TelemetryService,
    data: QueryMappingModelCoverageAnalysis_TelemetryData,
  ): void {
    service.logEvent(
      QUERY_BUILDER_EVENT.MAPPING_MODEL_COVERAGE_ANALYSYS__SUCCESS,
      data,
    );
  }

  static logEvent_ShowUnmappedPropertyInExplorerTreeLaunched(
    service: TelemetryService,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.SHOW_UNMAPPED_PROPERTIES__LAUNCH, {});
  }

  static logEvent_ShowPropertyExplorerOptions(service: TelemetryService): void {
    service.logEvent(QUERY_BUILDER_EVENT.PROPERTY_EXPLORER_OPTIONS__LAUNCH, {});
  }

  static logEvent_TogglePanelFunctionExplorer(service: TelemetryService): void {
    service.logEvent(QUERY_BUILDER_EVENT.PANEL_FUNCTION_EXPLORER__TOGGLE, {});
  }

  static logEvent_RenderPanelFunctionExplorer(service: TelemetryService): void {
    service.logEvent(QUERY_BUILDER_EVENT.PANEL_FUNCTION_EXPLORER__RENDER, {});
  }

  static logEvent_TogglePanelFunctionExplorerDependencyView(
    service: TelemetryService,
  ): void {
    service.logEvent(
      QUERY_BUILDER_EVENT.PANEL_FUNCTION_EXPLORER_DEPENDENCY_VIEW__TOGGLE,
      {},
    );
  }

  static logEvent_ToggleFetchStructure(service: TelemetryService): void {
    service.logEvent(QUERY_BUILDER_EVENT.PANEL_FETCH_STRUCTURE_TOGGLE, {});
  }

  static logEvent_RenderGraphFetchPanel(
    service: TelemetryService,
    data: GraphFetchPanel_TelemtryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.PANEL_GRAPH_FETCH_RENDER, data);
  }

  static logEvent_ExecutionContextChanged(
    service: TelemetryService,
    data: ExecutionContextChange_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.EXECUTION_CONTEXT__CHANGE, data);
  }

  static logEvent_ProjectionChanged(
    service: TelemetryService,
    data: ProjectionChange_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.PROJECTION__CHANGE, data);
  }

  static logEvent_ResultModifierChanged(
    service: TelemetryService,
    data: ResultModifierChange_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.RESULT_MODIFIER__CHANGE, data);
  }

  static logEvent_AggregationChanged(
    service: TelemetryService,
    data: AggregationChange_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.AGGREGATION__CHANGE, data);
  }

  static logEvent_WindowChanged(
    service: TelemetryService,
    data: WindowChange_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.WINDOW__CHANGE, data);
  }

  static logEvent_GraphFetchChanged(
    service: TelemetryService,
    data: GraphFetchChange_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.GRAPH_FETCH__CHANGE, data);
  }

  static logEvent_ParameterChanged(
    service: TelemetryService,
    data: ParameterChange_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.PARAMETER__CHANGE, data);
  }

  static logEvent_ConstantChanged(
    service: TelemetryService,
    data: ConstantChange_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.CONSTANT__CHANGE, data);
  }

  static logEvent_WatermarkChanged(
    service: TelemetryService,
    data: WatermarkChange_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.WATERMARK__CHANGE, data);
  }

  static logEvent_MilestoningChanged(
    service: TelemetryService,
    data: MilestoningChange_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.MILESTONING__CHANGE, data);
  }

  static logEvent_FilterChanged(
    service: TelemetryService,
    data: FilterChange_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.FILTER__CHANGE, data);
  }

  static logEvent_PostFilterChanged(
    service: TelemetryService,
    data: FilterChange_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.POST_FILTER__CHANGE, data);
  }

  // ── Advanced menu ────────────────────────────────────────────────────────

  static logEvent_TogglePanelParameter(
    service: TelemetryService,
    data: MenuToggle_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.PANEL_PARAMETER__TOGGLE, data);
  }

  static logEvent_TogglePanelConstant(
    service: TelemetryService,
    data: MenuToggle_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.PANEL_CONSTANT__TOGGLE, data);
  }

  static logEvent_TogglePanelFilter(
    service: TelemetryService,
    data: MenuToggle_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.PANEL_FILTER__TOGGLE, data);
  }

  static logEvent_TogglePanelWindow(
    service: TelemetryService,
    data: MenuToggle_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.PANEL_WINDOW__TOGGLE, data);
  }

  static logEvent_TogglePanelPostFilter(
    service: TelemetryService,
    data: MenuToggle_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.PANEL_POST_FILTER__TOGGLE, data);
  }

  static logEvent_ToggleCalendar(
    service: TelemetryService,
    data: MenuToggle_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.CALENDAR__TOGGLE, data);
  }

  static logEvent_ToggleTypedTDS(
    service: TelemetryService,
    data: MenuToggle_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.TYPED_TDS__TOGGLE, data);
  }

  static logEvent_CheckEntitlementsLaunched(
    service: TelemetryService,
    data: MenuAction_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.CHECK_ENTITLEMENTS__LAUNCH, data);
  }

  static logEvent_EditPureLaunched(
    service: TelemetryService,
    data: MenuAction_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.EDIT_PURE__LAUNCH, data);
  }

  static logEvent_ShowPureLaunched(
    service: TelemetryService,
    data: MenuAction_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.SHOW_PURE__LAUNCH, data);
  }

  static logEvent_ShowProtocolLaunched(
    service: TelemetryService,
    data: MenuAction_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.SHOW_PROTOCOL__LAUNCH, data);
  }

  static logEvent_CompileQueryLaunched(
    service: TelemetryService,
    data: MenuAction_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.COMPILE_QUERY__LAUNCH, data);
  }

  static logEvent_ShowQueryDiffLaunched(
    service: TelemetryService,
    data: MenuAction_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.SHOW_QUERY_DIFF__LAUNCH, data);
  }

  // ── Help menu (core items) ───────────────────────────────────────────────

  static logEvent_OpenDocumentationLaunched(
    service: TelemetryService,
    data: MenuAction_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.OPEN_DOCUMENTATION__LAUNCH, data);
  }

  static logEvent_OpenFAQLaunched(
    service: TelemetryService,
    data: MenuAction_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.OPEN_FAQ__LAUNCH, data);
  }

  static logEvent_OpenSupportTicketsLaunched(
    service: TelemetryService,
    data: MenuAction_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.OPEN_SUPPORT_TICKETS__LAUNCH, data);
  }

  static logEvent_ToggleVirtualAssistant(
    service: TelemetryService,
    data: MenuToggle_TelemetryData,
  ): void {
    service.logEvent(QUERY_BUILDER_EVENT.VIRTUAL_ASSISTANT__TOGGLE, data);
  }
}
