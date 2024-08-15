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

import type { DataQualityState } from './DataQualityState.js';
import {
  ExecutionPlanState,
  QUERY_BUILDER_EVENT,
  QueryBuilderTelemetryHelper,
} from '@finos/legend-query-builder';
import { action, flow, makeObservable, observable } from 'mobx';
import {
  type GeneratorFn,
  ActionState,
  assertErrorThrown,
  LogEvent,
  StopWatch,
} from '@finos/legend-shared';
import {
  type RawExecutionPlan,
  type ExecutionResult,
  type ExecutionResultWithMetadata,
  GRAPH_MANAGER_EVENT,
} from '@finos/legend-graph';
import { getDataQualityPureGraphManagerExtension } from '../../graph-manager/protocol/pure/DSL_DataQuality_PureGraphManagerExtension.js';

export const DEFAULT_LIMIT = 1000;
export class DataQualityResultState {
  readonly dataQualityState: DataQualityState;
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

  constructor(dataQualityState: DataQualityState) {
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
      runQuery: flow,
      cancelQuery: flow,
      generatePlan: flow,
    });

    this.dataQualityState = dataQualityState;
    this.executionPlanState = new ExecutionPlanState(
      this.dataQualityState.applicationStore,
      this.dataQualityState.graphManagerState,
    );
  }

  setIsRunningQuery(val: boolean): void {
    this.isRunningQuery = val;
  }

  setExecutionResult(val: ExecutionResult | undefined): void {
    this.executionResult = val;
  }

  setExecutionDuration(val: number | undefined): void {
    this.executionDuration = val;
  }

  setPreviewLimit(val: number): void {
    this.previewLimit = Math.max(1, val);
  }

  setQueryRunPromise(promise: Promise<ExecutionResult> | undefined): void {
    this.queryRunPromise = promise;
  }

  get checkForStaleResults(): boolean {
    if (this.latestRunHashCode !== this.dataQualityState.hashCode) {
      return true;
    }
    return false;
  }

  *runQuery(): GeneratorFn<void> {
    let promise;
    try {
      this.setIsRunningQuery(true);
      const currentHashCode = this.dataQualityState.hashCode;
      const packagePath =
        this.dataQualityState.constraintsConfigurationElement.path;
      const model = this.dataQualityState.graphManagerState.graph;

      const stopWatch = new StopWatch();

      promise = getDataQualityPureGraphManagerExtension(
        this.dataQualityState.graphManagerState.graphManager,
      ).execute(model, packagePath, this.previewLimit);

      this.setQueryRunPromise(promise);
      const result = ((yield promise) as ExecutionResultWithMetadata)
        .executionResult;

      if (this.queryRunPromise === promise) {
        this.setExecutionResult(result);
        this.latestRunHashCode = currentHashCode;
        this.setExecutionDuration(stopWatch.elapsed);
      }
    } catch (error) {
      if (this.queryRunPromise === promise) {
        assertErrorThrown(error);
        this.setExecutionResult(undefined);
        this.dataQualityState.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
          error,
        );
        this.dataQualityState.applicationStore.notificationService.notifyError(
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
      yield this.dataQualityState.graphManagerState.graphManager.cancelUserExecutions(
        true,
      );
    } catch (error) {
      // Don't notify users about success or failure
      this.dataQualityState.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
    }
  }

  *generatePlan(debug: boolean): GeneratorFn<void> {
    const packagePath =
      this.dataQualityState.constraintsConfigurationElement.path;
    const model = this.dataQualityState.graphManagerState.graph;
    try {
      this.isGeneratingPlan = true;
      let rawPlan: RawExecutionPlan;

      const stopWatch = new StopWatch();

      if (debug) {
        const debugResult = (yield getDataQualityPureGraphManagerExtension(
          this.dataQualityState.graphManagerState.graphManager,
        ).debugExecutionPlanGeneration(model, packagePath)) as {
          plan: RawExecutionPlan;
          debug: string;
        };
        rawPlan = debugResult.plan;
        this.executionPlanState.setDebugText(debugResult.debug);
      } else {
        QueryBuilderTelemetryHelper.logEvent_ExecutionPlanGenerationLaunched(
          this.dataQualityState.applicationStore.telemetryService,
        );
        rawPlan = (yield getDataQualityPureGraphManagerExtension(
          this.dataQualityState.graphManagerState.graphManager,
        ).generatePlan(model, packagePath)) as RawExecutionPlan;
      }

      stopWatch.record();
      try {
        this.executionPlanState.setRawPlan(rawPlan);
        const plan =
          this.dataQualityState.graphManagerState.graphManager.buildExecutionPlan(
            rawPlan,
            this.dataQualityState.graphManagerState.graph,
          );
        this.executionPlanState.initialize(plan);
      } catch {
        //do nothing
      }
      stopWatch.record(QUERY_BUILDER_EVENT.BUILD_EXECUTION_PLAN__SUCCESS);
    } catch (error) {
      assertErrorThrown(error);
      this.dataQualityState.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.dataQualityState.applicationStore.notificationService.notifyError(
        error,
      );
    } finally {
      this.isGeneratingPlan = false;
    }
  }
}
