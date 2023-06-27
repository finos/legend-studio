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
  assertErrorThrown,
  LogEvent,
  guaranteeNonNullable,
  type ContentType,
  downloadFileUsingDataURI,
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
  GRAPH_MANAGER_EVENT,
  RawExecutionResult,
  buildRawLambdaFromLambdaFunction,
  reportGraphAnalytics,
  extractExecutionResultValues,
  TDSExecutionResult,
} from '@finos/legend-graph';
import { buildLambdaFunction } from './QueryBuilderValueSpecificationBuilder.js';
import { DEFAULT_TAB_SIZE } from '@finos/legend-application';
import {
  buildExecutionParameterValues,
  getExecutionQueryFromRawLambda,
} from './shared/LambdaParameterState.js';
import type { LambdaFunctionBuilderOption } from './QueryBuilderValueSpecificationBuilderHelper.js';
import { QueryBuilderTelemetryHelper } from '../__lib__/QueryBuilderTelemetryHelper.js';
import { QUERY_BUILDER_EVENT } from '../__lib__/QueryBuilderEvent.js';
import { ExecutionPlanState } from './execution-plan/ExecutionPlanState.js';

export const DEFAULT_LIMIT = 1000;

export interface ExportDataInfo {
  contentType: ContentType;
  serializationFormat?: EXECUTION_SERIALIZATION_FORMAT | undefined;
}

export interface QueryBuilderTDSResultCellData {
  value: string | number | boolean | null | undefined;
  columnName: string;
  coordinates: QueryBuilderTDSResultCellCoordinate;
}

export interface QueryBuilderTDSResultCellCoordinate {
  rowIndex: number;
  colIndex: number;
}

export class QueryBuilderResultState {
  readonly queryBuilderState: QueryBuilderState;
  readonly exportDataState = ActionState.create();
  readonly executionPlanState: ExecutionPlanState;

  previewLimit = DEFAULT_LIMIT;
  pressedRunQuery = ActionState.create();
  isRunningQuery = false;
  isGeneratingPlan = false;
  executionResult?: ExecutionResult | undefined;
  executionDuration?: number | undefined;
  latestRunHashCode?: string | undefined;
  queryRunPromise: Promise<ExecutionResult> | undefined = undefined;
  isQueryUsageViewerOpened = false;

  selectedCells: QueryBuilderTDSResultCellData[];
  mousedOverCell: QueryBuilderTDSResultCellData | null = null;
  isSelectingCells: boolean;

  constructor(queryBuilderState: QueryBuilderState) {
    makeObservable(this, {
      executionResult: observable,
      previewLimit: observable,
      executionDuration: observable,
      latestRunHashCode: observable,
      queryRunPromise: observable,
      isGeneratingPlan: observable,
      selectedCells: observable,
      mousedOverCell: observable,
      isRunningQuery: observable,
      isSelectingCells: observable,
      setIsSelectingCells: action,
      isQueryUsageViewerOpened: observable,
      setIsRunningQuery: action,
      setExecutionResult: action,
      setExecutionDuration: action,
      setPreviewLimit: action,
      addCellData: action,
      setSelectedCells: action,
      setMouseOverCell: action,
      setQueryRunPromise: action,
      setIsQueryUsageViewerOpened: action,
      exportData: flow,
      runQuery: flow,
      cancelQuery: flow,
      generatePlan: flow,
    });
    this.isSelectingCells = false;

    this.selectedCells = [];
    this.queryBuilderState = queryBuilderState;
    this.executionPlanState = new ExecutionPlanState(
      this.queryBuilderState.applicationStore,
      this.queryBuilderState.graphManagerState,
    );
  }

  setIsSelectingCells = (val: boolean): void => {
    this.isSelectingCells = val;
  };

  setIsRunningQuery = (val: boolean): void => {
    this.isRunningQuery = val;
  };

  setExecutionResult = (val: ExecutionResult | undefined): void => {
    this.executionResult = val;
  };

  setExecutionDuration = (val: number | undefined): void => {
    this.executionDuration = val;
  };

  setPreviewLimit = (val: number): void => {
    this.previewLimit = Math.max(1, val);
  };

  addCellData = (val: QueryBuilderTDSResultCellData): void => {
    this.selectedCells.push(val);
  };

  setSelectedCells = (val: QueryBuilderTDSResultCellData[]): void => {
    this.selectedCells = val;
  };

  setMouseOverCell = (val: QueryBuilderTDSResultCellData | null): void => {
    this.mousedOverCell = val;
  };

  setQueryRunPromise = (
    promise: Promise<ExecutionResult> | undefined,
  ): void => {
    this.queryRunPromise = promise;
  };

  findColumnFromCoordinates = (
    colIndex: number,
  ): string | number | boolean | null | undefined => {
    if (
      !this.executionResult ||
      !(this.executionResult instanceof TDSExecutionResult)
    ) {
      return undefined;
    }
    return this.executionResult.result.columns[colIndex];
  };

  findRowFromRowIndex = (
    rowIndex: number,
  ): (string | number | boolean | null)[] => {
    if (
      !this.executionResult ||
      !(this.executionResult instanceof TDSExecutionResult)
    ) {
      return [''];
    }
    return this.executionResult.result.rows[rowIndex]?.values ?? [''];
  };

  findIsCoordinatesSelected = (
    resultCoordinate: QueryBuilderTDSResultCellCoordinate,
  ): boolean =>
    this.selectedCells.some(
      (cell) =>
        cell.coordinates.rowIndex === resultCoordinate.rowIndex &&
        cell.coordinates.colIndex === resultCoordinate.colIndex,
    );

  findResultValueFromCoordinates = (
    resultCoordinate: [number, number],
  ): string | number | boolean | null | undefined => {
    const rowIndex = resultCoordinate[0];
    const colIndex = resultCoordinate[1];

    if (
      !this.executionResult ||
      !(this.executionResult instanceof TDSExecutionResult)
    ) {
      return undefined;
    }

    return this.executionResult.result.rows[rowIndex]?.values[colIndex];
  };

  setIsQueryUsageViewerOpened(val: boolean): void {
    this.isQueryUsageViewerOpened = val;
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
      const exportData =
        this.queryBuilderState.fetchStructureState.implementation.getExportDataInfo(
          format,
        );
      const contentType = exportData.contentType;
      const serializationFormat = exportData.serializationFormat;
      this.exportDataState.inProgress();
      const query = this.buildExecutionRawLambda({
        isExportingResult: true,
      });
      const result =
        (yield this.queryBuilderState.graphManagerState.graphManager.runQuery(
          query,
          this.queryBuilderState.mapping,
          this.queryBuilderState.runtimeValue,
          this.queryBuilderState.graphManagerState.graph,
          {
            serializationFormat,
            parameterValues: buildExecutionParameterValues(
              this.queryBuilderState.parametersState.parameterStates,
              this.queryBuilderState.graphManagerState,
            ),
          },
        )) as ExecutionResult;
      let content: string;
      if (result instanceof RawExecutionResult) {
        content = result.value === null ? 'null' : result.value.toString();
      } else {
        content = JSON.stringify(
          extractExecutionResultValues(result),
          null,
          DEFAULT_TAB_SIZE,
        );
      }
      const fileName = `result.${getContentTypeFileExtension(contentType)}`;
      downloadFileUsingDataURI(fileName, content, contentType);
      this.exportDataState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.queryBuilderState.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.queryBuilderState.applicationStore.notificationService.notifyError(
        error,
      );
      this.exportDataState.fail();
    }
  }

  *runQuery(): GeneratorFn<void> {
    let promise;
    try {
      this.setIsRunningQuery(true);
      const currentHashCode = this.queryBuilderState.hashCode;
      const mapping = guaranteeNonNullable(
        this.queryBuilderState.mapping,
        'Mapping is required to execute query',
      );
      const runtime = guaranteeNonNullable(
        this.queryBuilderState.runtimeValue,
        `Runtime is required to execute query`,
      );
      const query = this.buildExecutionRawLambda();
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
        },
      );

      this.setQueryRunPromise(promise);
      const result = (yield promise) as ExecutionResult;
      if (this.queryRunPromise === promise) {
        this.setExecutionResult(result);
        this.latestRunHashCode = currentHashCode;
        this.setExecutionDuration(stopWatch.elapsed);

        report.timings =
          this.queryBuilderState.applicationStore.timeService.finalizeTimingsRecord(
            stopWatch,
            report.timings,
          );
        QueryBuilderTelemetryHelper.logEvent_QueryRunSucceeded(
          this.queryBuilderState.applicationStore.telemetryService,
          report,
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
        this.queryBuilderState.applicationStore.notificationService.notifyError(
          error,
        );
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
        this.queryBuilderState.mapping,
        'Mapping is required to execute query',
      );
      const runtime = guaranteeNonNullable(
        this.queryBuilderState.runtimeValue,
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
        this.executionPlanState.setPlan(plan);
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
      if (debug) {
        QueryBuilderTelemetryHelper.logEvent_ExecutionPlanDebugSucceeded(
          this.queryBuilderState.applicationStore.telemetryService,
          report,
        );
      } else {
        QueryBuilderTelemetryHelper.logEvent_ExecutionPlanGenerationSucceeded(
          this.queryBuilderState.applicationStore.telemetryService,
          report,
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
