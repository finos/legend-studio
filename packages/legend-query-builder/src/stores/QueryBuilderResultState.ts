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
  ContentType,
  guaranteeType,
  downloadFileUsingDataURI,
  UnsupportedOperationError,
  ActionState,
  StopWatch,
} from '@finos/legend-shared';
import type { QueryBuilderState } from './QueryBuilderState.js';
import {
  type RawExecutionPlan,
  type ExecutionResult,
  type RawLambda,
  GRAPH_MANAGER_EVENT,
  EXECUTION_SERIALIZATION_FORMAT,
  RawExecutionResult,
  buildRawLambdaFromLambdaFunction,
  reportGraphAnalytics,
} from '@finos/legend-graph';
import { buildLambdaFunction } from './QueryBuilderValueSpecificationBuilder.js';
import { ExecutionPlanState } from '@finos/legend-application';
import {
  buildExecutionParameterValues,
  getExecutionQueryFromRawLambda,
} from './shared/LambdaParameterState.js';
import type { LambdaFunctionBuilderOption } from './QueryBuilderValueSpecificationBuilderHelper.js';
import { QueryBuilderTelemetryHelper } from '../application/QueryBuilderTelemetryHelper.js';
import { QUERY_BUILDER_EVENT } from '../application/QueryBuilderEvent.js';

const DEFAULT_LIMIT = 1000;

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

  constructor(queryBuilderState: QueryBuilderState) {
    makeObservable(this, {
      executionResult: observable,
      previewLimit: observable,
      executionDuration: observable,
      latestRunHashCode: observable,
      queryRunPromise: observable,
      isGeneratingPlan: observable,
      isRunningQuery: observable,
      setIsRunningQuery: action,
      setExecutionResult: action,
      setExecutionDuration: action,
      setPreviewLimit: action,
      setQueryRunPromise: action,
      exportData: flow,
      runQuery: flow,
      generatePlan: flow,
    });

    this.queryBuilderState = queryBuilderState;
    this.executionPlanState = new ExecutionPlanState(
      this.queryBuilderState.applicationStore,
      this.queryBuilderState.graphManagerState,
    );
  }

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

  setQueryRunPromise = (
    promise: Promise<ExecutionResult> | undefined,
  ): void => {
    this.queryRunPromise = promise;
  };

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

  *exportData(
    serializationFormat: EXECUTION_SERIALIZATION_FORMAT,
  ): GeneratorFn<void> {
    try {
      this.exportDataState.inProgress();
      const mapping = guaranteeNonNullable(
        this.queryBuilderState.mapping,
        'Mapping is required to execute query',
      );
      const runtime = guaranteeNonNullable(
        this.queryBuilderState.runtimeValue,
        `Runtime is required to execute query`,
      );
      const query = this.buildExecutionRawLambda();
      const result =
        (yield this.queryBuilderState.graphManagerState.graphManager.runQuery(
          query,
          mapping,
          runtime,
          this.queryBuilderState.graphManagerState.graph,
          {
            serializationFormat,
            parameterValues: buildExecutionParameterValues(
              this.queryBuilderState.parametersState.parameterStates,
              this.queryBuilderState.graphManagerState,
            ),
          },
        )) as ExecutionResult;
      let contentType: ContentType;
      let fileName = 'result';
      let content: string;
      switch (serializationFormat) {
        case EXECUTION_SERIALIZATION_FORMAT.CSV:
          {
            const rawResult = guaranteeType(result, RawExecutionResult);
            contentType = ContentType.TEXT_CSV;
            fileName = `${fileName}.csv`;
            content = rawResult.value;
          }
          break;
        default:
          throw new UnsupportedOperationError(
            `Can't download file for serialization type: '${serializationFormat}'`,
          );
      }
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

      const promise =
        this.queryBuilderState.graphManagerState.graphManager.runQuery(
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
      assertErrorThrown(error);
      this.queryBuilderState.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.queryBuilderState.applicationStore.notificationService.notifyError(
        error,
      );
    } finally {
      this.setIsRunningQuery(false);
      this.pressedRunQuery.complete();
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
