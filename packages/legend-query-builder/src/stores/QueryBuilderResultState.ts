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

import { action, flow, makeObservable, observable } from 'mobx';
import {
  type GeneratorFn,
  type ContentType,
  assertErrorThrown,
  LogEvent,
  guaranteeNonNullable,
  ActionState,
  StopWatch,
  getContentTypeFileExtension,
} from '@finos/legend-shared';
import type { QueryBuilderState } from './QueryBuilderState.js';
import {
  type RawExecutionPlan,
  type ExecutionResult,
  type RawLambda,
  type EXECUTION_SERIALIZATION_FORMAT,
  type QueryGridConfig,
  type ExecutionResultWithMetadata,
  GRAPH_MANAGER_EVENT,
  buildRawLambdaFromLambdaFunction,
  reportGraphAnalytics,
  TDSExecutionResult,
  V1_ZIPKIN_TRACE_HEADER,
  ExecutionError,
  V1_DELEGATED_EXPORT_HEADER,
} from '@finos/legend-graph';
import { buildLambdaFunction } from './QueryBuilderValueSpecificationBuilder.js';
import {
  buildExecutionParameterValues,
  getExecutionQueryFromRawLambda,
} from './shared/LambdaParameterState.js';
import type { LambdaFunctionBuilderOption } from './QueryBuilderValueSpecificationBuilderHelper.js';
import { QueryBuilderTelemetryHelper } from '../__lib__/QueryBuilderTelemetryHelper.js';
import { QUERY_BUILDER_EVENT } from '../__lib__/QueryBuilderEvent.js';
import { ExecutionPlanState } from './execution-plan/ExecutionPlanState.js';
import type { DataGridColumnState } from '@finos/legend-lego/data-grid';
import { downloadStream } from '@finos/legend-application';
import { QueryBuilderDataGridCustomAggregationFunction } from '../components/result/tds/QueryBuilderTDSGridResult.js';
import { QueryBuilderTDSState } from './fetch-structure/tds/QueryBuilderTDSState.js';

export const DEFAULT_LIMIT = 1000;

export type QueryBuilderTDSResultCellDataType =
  | string
  | number
  | boolean
  | null
  | undefined;

export interface QueryBuilderTDSRowDataType {
  [key: string]: QueryBuilderTDSResultCellDataType;
}

export interface ExportDataInfo {
  contentType: ContentType;
  serializationFormat?: EXECUTION_SERIALIZATION_FORMAT | undefined;
}

export interface QueryBuilderTDSResultCellData {
  value: QueryBuilderTDSResultCellDataType;
  columnName: string;
  coordinates: QueryBuilderTDSResultCellCoordinate;
}

export interface QueryBuilderTDSResultCellCoordinate {
  rowIndex: number;
  colIndex: number;
}

type QueryBuilderDataGridConfig = {
  columns: DataGridColumnState[];
  isPivotModeEnabled: boolean | undefined;
  isLocalModeEnabled: boolean | undefined;
  previewLimit?: number | undefined;
  weightedColumnPairs?: Map<string, string> | undefined;
};

export class QueryBuilderResultWavgAggregationState {
  isApplyingWavg = false;
  weightedColumnIdPairs: Map<string, string>;

  constructor() {
    makeObservable(this, {
      isApplyingWavg: observable,
      weightedColumnIdPairs: observable,
      setIsApplyingWavg: action,
      addWeightedColumnIdPair: action,
      removeWeightedColumnIdPair: action,
    });
    this.weightedColumnIdPairs = new Map<string, string>();
  }

  setIsApplyingWavg(val: boolean): void {
    this.isApplyingWavg = val;
  }

  addWeightedColumnIdPair(col: string, weightedColumnId: string): void {
    this.weightedColumnIdPairs.set(col, weightedColumnId);
  }

  removeWeightedColumnIdPair(col: string): void {
    this.weightedColumnIdPairs.delete(col);
  }
}

export class QueryBuilderResultState {
  readonly queryBuilderState: QueryBuilderState;
  readonly executionPlanState: ExecutionPlanState;
  readonly exportState = ActionState.create();

  previewLimit = DEFAULT_LIMIT;
  pressedRunQuery = ActionState.create();
  isRunningQuery = false;
  isGeneratingPlan = false;
  executionResult?: ExecutionResult | undefined;
  isExecutionResultOverflowing = false;
  executionDuration?: number | undefined;
  executionTraceId?: string;
  latestRunHashCode?: string | undefined;
  queryRunPromise: Promise<ExecutionResultWithMetadata> | undefined = undefined;
  isQueryUsageViewerOpened = false;
  executionError: Error | string | undefined;

  selectedCells: QueryBuilderTDSResultCellData[];
  mousedOverCell: QueryBuilderTDSResultCellData | null = null;
  isSelectingCells: boolean;

  gridConfig: QueryBuilderDataGridConfig | undefined;
  wavgAggregationState: QueryBuilderResultWavgAggregationState | undefined;

  constructor(queryBuilderState: QueryBuilderState) {
    makeObservable(this, {
      executionResult: observable,
      executionTraceId: observable,
      previewLimit: observable,
      executionDuration: observable,
      latestRunHashCode: observable,
      queryRunPromise: observable,
      isGeneratingPlan: observable,
      selectedCells: observable,
      mousedOverCell: observable,
      isRunningQuery: observable,
      isSelectingCells: observable,
      isQueryUsageViewerOpened: observable,
      isExecutionResultOverflowing: observable,
      gridConfig: observable,
      wavgAggregationState: observable,
      executionError: observable,
      setGridConfig: action,
      setWavgAggregationState: action,
      setIsSelectingCells: action,
      setIsRunningQuery: action,
      setExecutionResult: action,
      setExecutionTraceId: action,
      setExecutionDuration: action,
      setPreviewLimit: action,
      addSelectedCell: action,
      setSelectedCells: action,
      setMouseOverCell: action,
      setQueryRunPromise: action,
      setIsQueryUsageViewerOpened: action,
      setIsExecutionResultOverflowing: action,
      handlePreConfiguredGridConfig: action,
      updatePreviewLimitInConfig: action,
      setExecutionError: action,
      exportData: flow,
      runQuery: flow,
      cancelQuery: flow,
      generatePlan: flow,
    });
    this.isSelectingCells = false;

    this.selectedCells = [];
    this.gridConfig = undefined;
    this.queryBuilderState = queryBuilderState;
    this.executionPlanState = new ExecutionPlanState(
      this.queryBuilderState.applicationStore,
      this.queryBuilderState.graphManagerState,
    );
  }

  setGridConfig(val: QueryBuilderDataGridConfig | undefined): void {
    this.gridConfig = val;
  }

  setWavgAggregationState(
    val: QueryBuilderResultWavgAggregationState | undefined,
  ): void {
    this.wavgAggregationState = val;
  }

  setIsSelectingCells(val: boolean): void {
    this.isSelectingCells = val;
  }

  setIsRunningQuery(val: boolean): void {
    this.isRunningQuery = val;
  }

  setExecutionResult(val: ExecutionResult | undefined): void {
    this.executionResult = val;
  }

  setExecutionTraceId(val: string): void {
    this.executionTraceId = val;
  }

  setExecutionDuration(val: number | undefined): void {
    this.executionDuration = val;
  }

  setPreviewLimit(val: number): void {
    this.previewLimit = Math.max(1, val);
  }

  addSelectedCell(val: QueryBuilderTDSResultCellData): void {
    this.selectedCells.push(val);
  }

  setSelectedCells(val: QueryBuilderTDSResultCellData[]): void {
    this.selectedCells = val;
  }

  setMouseOverCell(val: QueryBuilderTDSResultCellData | null): void {
    this.mousedOverCell = val;
  }

  setQueryRunPromise(
    promise: Promise<ExecutionResultWithMetadata> | undefined,
  ): void {
    this.queryRunPromise = promise;
  }

  setIsQueryUsageViewerOpened(val: boolean): void {
    this.isQueryUsageViewerOpened = val;
  }

  setExecutionError(val: Error | string | undefined): void {
    this.executionError = val;
  }

  setIsExecutionResultOverflowing(val: boolean): void {
    this.isExecutionResultOverflowing = val;
  }

  updatePreviewLimitInConfig(): void {
    if (this.gridConfig) {
      this.gridConfig.previewLimit = this.previewLimit;
    }
  }

  getExecutionResultLimit = (): number =>
    Math.min(
      this.queryBuilderState.fetchStructureState.implementation instanceof
        QueryBuilderTDSState &&
        this.queryBuilderState.fetchStructureState.implementation
          .resultSetModifierState.limit
        ? this.queryBuilderState.fetchStructureState.implementation
            .resultSetModifierState.limit
        : Number.MAX_SAFE_INTEGER,
      this.previewLimit,
    );

  processExecutionResult = (result: ExecutionResult): void => {
    this.setIsExecutionResultOverflowing(false);
    if (result instanceof TDSExecutionResult) {
      const resultLimit = this.getExecutionResultLimit();
      if (result.result.rows.length > resultLimit) {
        this.setIsExecutionResultOverflowing(true);
        result.result.rows = result.result.rows.slice(0, resultLimit);
      }
    }
    this.setExecutionResult(result);
  };

  processWeightedColumnPairsMap(
    config: QueryGridConfig,
  ): Map<string, string> | undefined {
    if (config.weightedColumnPairs) {
      const wavgColumns = config.columns
        .filter(
          (col) =>
            (col as DataGridColumnState).aggFunc ===
            QueryBuilderDataGridCustomAggregationFunction.WAVG,
        )
        .map((col) => (col as DataGridColumnState).colId);
      const weightedColumnPairsMap = new Map<string, string>();
      config.weightedColumnPairs.forEach((wc) => {
        if (wc[0] && wc[1]) {
          weightedColumnPairsMap.set(wc[0], wc[1]);
        }
      });
      for (const wavgCol of weightedColumnPairsMap.keys()) {
        if (!wavgColumns.includes(wavgCol)) {
          weightedColumnPairsMap.delete(wavgCol);
        }
      }
      return weightedColumnPairsMap;
    }
    return undefined;
  }

  handlePreConfiguredGridConfig(config: QueryGridConfig): void {
    let newConfig;
    const weightedColumnPairsMap = this.processWeightedColumnPairsMap(config);
    if (weightedColumnPairsMap) {
      this.wavgAggregationState = new QueryBuilderResultWavgAggregationState();
      this.wavgAggregationState.weightedColumnIdPairs = weightedColumnPairsMap;
      newConfig = {
        ...config,
        weightedColumnPairs: weightedColumnPairsMap,
        columns: config.columns as DataGridColumnState[],
      };
    } else {
      newConfig = {
        ...config,
        columns: config.columns as DataGridColumnState[],
      };
    }
    if (config.previewLimit) {
      this.setPreviewLimit(config.previewLimit);
    }
    this.setGridConfig(newConfig);
  }

  getQueryGridConfig(): QueryGridConfig | undefined {
    if (this.gridConfig) {
      return {
        ...this.gridConfig,
        columns: this.gridConfig.columns as object[],
      };
    }
    return undefined;
  }

  get checkForStaleResults(): boolean {
    if (this.latestRunHashCode !== this.queryBuilderState.hashCode) {
      return true;
    }
    return false;
  }

  buildExecutionRawLambda(
    executionOptions?: LambdaFunctionBuilderOption,
  ): RawLambda {
    let query: RawLambda;
    if (this.queryBuilderState.isQuerySupported) {
      const lambdaFunction = buildLambdaFunction(this.queryBuilderState, {
        isBuildingExecutionQuery: true,
        useTypedRelationFunctions: this.queryBuilderState.isFetchStructureTyped,
        ...executionOptions,
      });
      query = buildRawLambdaFromLambdaFunction(
        lambdaFunction,
        this.queryBuilderState.graphManagerState,
      );
    } else {
      query = guaranteeNonNullable(
        this.queryBuilderState.unsupportedQueryState.rawLambda,
        'Lambda is required to execute query',
      );
      if (!this.queryBuilderState.isParameterSupportDisabled) {
        return getExecutionQueryFromRawLambda(
          query,
          this.queryBuilderState.parametersState.parameterStates,
          this.queryBuilderState.graphManagerState,
        );
      }
    }
    return query;
  }

  *exportData(format: string): GeneratorFn<void> {
    try {
      this.exportState.inProgress();
      this.queryBuilderState.applicationStore.notificationService.notifySuccess(
        `Export ${format} will run in background`,
      );
      const exportData =
        this.queryBuilderState.fetchStructureState.implementation.getExportDataInfo(
          format,
        );
      const contentType = exportData.contentType;
      const serializationFormat = exportData.serializationFormat;
      const query = this.buildExecutionRawLambda({
        isExportingResult: true,
      });
      QueryBuilderTelemetryHelper.logEvent_ExportQueryDataLaunched(
        this.queryBuilderState.applicationStore.telemetryService,
      );
      const result =
        (yield this.queryBuilderState.graphManagerState.graphManager.exportData(
          query,
          this.queryBuilderState.executionContextState.mapping,
          this.queryBuilderState.executionContextState.runtimeValue,
          this.queryBuilderState.graphManagerState.graph,
          {
            serializationFormat,
            parameterValues: buildExecutionParameterValues(
              this.queryBuilderState.parametersState.parameterStates,
              this.queryBuilderState.graphManagerState,
            ),
          },
          undefined,
          contentType,
        )) as Response;
      if (result.headers.get(V1_DELEGATED_EXPORT_HEADER) === 'true') {
        if (result.status === 200) {
          this.exportState.pass();
        } else {
          this.exportState.fail();
        }
        return;
      }
      const report = reportGraphAnalytics(
        this.queryBuilderState.graphManagerState.graph,
      );
      downloadStream(
        result,
        `result.${getContentTypeFileExtension(contentType)}`,
        exportData.contentType,
      )
        .then(() => {
          const reportWithState = Object.assign(
            {},
            report,
            this.queryBuilderState.getStateInfo(),
          );
          QueryBuilderTelemetryHelper.logEvent_ExportQueryDatSucceeded(
            this.queryBuilderState.applicationStore.telemetryService,
            reportWithState,
          );
          this.exportState.pass();
        })
        .catch((error) => {
          assertErrorThrown(error);
          this.queryBuilderState.applicationStore.logService.error(
            LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
            error,
          );
        });
    } catch (error) {
      this.exportState.fail();
      assertErrorThrown(error);
      this.queryBuilderState.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.queryBuilderState.applicationStore.notificationService.notifyError(
        error,
      );
      this.exportState.complete();
    }
  }

  *runQuery(): GeneratorFn<void> {
    let promise;
    try {
      this.setIsRunningQuery(true);
      const currentHashCode = this.queryBuilderState.hashCode;
      const mapping = guaranteeNonNullable(
        this.queryBuilderState.executionContextState.mapping,
        'Mapping is required to execute query',
      );
      const runtime = guaranteeNonNullable(
        this.queryBuilderState.executionContextState.runtimeValue,
        `Runtime is required to execute query`,
      );
      const query = this.buildExecutionRawLambda({
        withDataOverflowCheck: true,
      });
      const parameterValues = buildExecutionParameterValues(
        this.queryBuilderState.parametersState.parameterStates,
        this.queryBuilderState.graphManagerState,
      );

      QueryBuilderTelemetryHelper.logEvent_QueryRunLaunched(
        this.queryBuilderState.applicationStore.telemetryService,
      );

      const stopWatch = new StopWatch();
      const report = reportGraphAnalytics(
        this.queryBuilderState.graphManagerState.graph,
      );

      promise = this.queryBuilderState.graphManagerState.graphManager.runQuery(
        query,
        mapping,
        runtime,
        this.queryBuilderState.graphManagerState.graph,
        {
          parameterValues,
          convertUnsafeNumbersToString: true,
          preservedResponseHeadersList: [V1_ZIPKIN_TRACE_HEADER],
          multiExecutionParameterKey:
            this.queryBuilderState.executionContextState
              .multiExecutionParameterKey,
        },
      );

      this.setQueryRunPromise(promise);
      const result = (yield promise) as ExecutionResultWithMetadata;
      if (this.queryRunPromise === promise) {
        this.processExecutionResult(result.executionResult);
        if (result.executionTraceId) {
          this.setExecutionTraceId(result.executionTraceId);
        }
        this.latestRunHashCode = currentHashCode;
        this.setExecutionDuration(stopWatch.elapsed);

        report.timings =
          this.queryBuilderState.applicationStore.timeService.finalizeTimingsRecord(
            stopWatch,
            report.timings,
          );
        const reportWithState = Object.assign(
          {},
          report,
          this.queryBuilderState.getStateInfo(),
        );
        QueryBuilderTelemetryHelper.logEvent_QueryRunSucceeded(
          this.queryBuilderState.applicationStore.telemetryService,
          reportWithState,
        );
      }
    } catch (error) {
      // When user cancels the query by calling the cancelQuery api, it will throw an execution failure error.
      // For now, we don't want to notify users about this failure. Therefore we check to ensure the promise is still the same one.
      // When cancelled the query, we set the queryRunPromise as undefined.
      if (this.queryRunPromise === promise) {
        assertErrorThrown(error);
        this.queryBuilderState.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
          error,
        );
        this.setExecutionError(error);
        if (error instanceof ExecutionError && error.executionTraceId) {
          this.setExecutionTraceId(error.executionTraceId);
        }
      }
    } finally {
      this.setIsRunningQuery(false);
      this.pressedRunQuery.complete();
    }
  }

  *cancelQuery(): GeneratorFn<void> {
    this.pressedRunQuery.complete();
    this.setIsRunningQuery(false);
    this.setQueryRunPromise(undefined);
    try {
      yield this.queryBuilderState.graphManagerState.graphManager.cancelUserExecutions(
        true,
      );
    } catch (error) {
      // Don't notify users about success or failure
      this.queryBuilderState.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
    }
  }

  *generatePlan(debug: boolean): GeneratorFn<void> {
    try {
      this.isGeneratingPlan = true;
      const mapping = guaranteeNonNullable(
        this.queryBuilderState.executionContextState.mapping,
        'Mapping is required to execute query',
      );
      const runtime = guaranteeNonNullable(
        this.queryBuilderState.executionContextState.runtimeValue,
        `Runtime is required to execute query`,
      );
      const query = this.queryBuilderState.buildQuery();
      let rawPlan: RawExecutionPlan;

      const stopWatch = new StopWatch();
      const report = reportGraphAnalytics(
        this.queryBuilderState.graphManagerState.graph,
      );

      if (debug) {
        QueryBuilderTelemetryHelper.logEvent_ExecutionPlanDebugLaunched(
          this.queryBuilderState.applicationStore.telemetryService,
        );
        const debugResult =
          (yield this.queryBuilderState.graphManagerState.graphManager.debugExecutionPlanGeneration(
            query,
            mapping,
            runtime,
            this.queryBuilderState.graphManagerState.graph,
            report,
          )) as { plan: RawExecutionPlan; debug: string };
        rawPlan = debugResult.plan;
        this.executionPlanState.setDebugText(debugResult.debug);
      } else {
        QueryBuilderTelemetryHelper.logEvent_ExecutionPlanGenerationLaunched(
          this.queryBuilderState.applicationStore.telemetryService,
        );
        rawPlan =
          (yield this.queryBuilderState.graphManagerState.graphManager.generateExecutionPlan(
            query,
            mapping,
            runtime,
            this.queryBuilderState.graphManagerState.graph,
            report,
          )) as object;
      }

      stopWatch.record();
      try {
        this.executionPlanState.setRawPlan(rawPlan);
        const plan =
          this.queryBuilderState.graphManagerState.graphManager.buildExecutionPlan(
            rawPlan,
            this.queryBuilderState.graphManagerState.graph,
          );
        this.executionPlanState.initialize(plan);
      } catch {
        // do nothing
      }
      stopWatch.record(QUERY_BUILDER_EVENT.BUILD_EXECUTION_PLAN__SUCCESS);

      // report
      report.timings =
        this.queryBuilderState.applicationStore.timeService.finalizeTimingsRecord(
          stopWatch,
          report.timings,
        );
      const reportWithState = Object.assign(
        {},
        report,
        this.queryBuilderState.getStateInfo(),
      );
      if (debug) {
        QueryBuilderTelemetryHelper.logEvent_ExecutionPlanDebugSucceeded(
          this.queryBuilderState.applicationStore.telemetryService,
          reportWithState,
        );
      } else {
        QueryBuilderTelemetryHelper.logEvent_ExecutionPlanGenerationSucceeded(
          this.queryBuilderState.applicationStore.telemetryService,
          reportWithState,
        );
      }
    } catch (error) {
      assertErrorThrown(error);
      this.queryBuilderState.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.queryBuilderState.applicationStore.notificationService.notifyError(
        error,
      );
    } finally {
      this.isGeneratingPlan = false;
    }
  }
}
