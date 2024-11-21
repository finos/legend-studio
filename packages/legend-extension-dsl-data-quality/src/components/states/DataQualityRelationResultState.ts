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

import {
  buildExecutionParameterValues,
  ExecutionPlanState,
  QUERY_BUILDER_EVENT,
  QueryBuilderTelemetryHelper,
} from '@finos/legend-query-builder';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import {
  type GeneratorFn,
  assertErrorThrown,
  LogEvent,
  StopWatch,
} from '@finos/legend-shared';
import {
  type ExecutionResult,
  type RawExecutionPlan,
  GRAPH_MANAGER_EVENT,
} from '@finos/legend-graph';
import { getDataQualityPureGraphManagerExtension } from '../../graph-manager/protocol/pure/DSL_DataQuality_PureGraphManagerExtension.js';
import type { DataQualityRelationValidationConfigurationState } from './DataQualityRelationValidationConfigurationState.js';
import type { DataQualityRelationValidation } from '../../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';

export const DEFAULT_LIMIT = 1000;
export class DataQualityRelationResultState {
  readonly dataQualityRelationValidationConfigurationState: DataQualityRelationValidationConfigurationState;
  readonly executionPlanState: ExecutionPlanState;

  previewLimit = DEFAULT_LIMIT;
  isRunningValidation = false;
  isGeneratingPlan = false;
  executionResult?: ExecutionResult | undefined;
  executionDuration?: number | undefined;
  latestRunHashCode?: string | undefined;
  validationRunPromise: Promise<ExecutionResult> | undefined = undefined;
  validationToRun: DataQualityRelationValidation | undefined;

  constructor(
    dataQualityRelationValidationState: DataQualityRelationValidationConfigurationState,
  ) {
    makeObservable(this, {
      executionResult: observable,
      previewLimit: observable,
      executionDuration: observable,
      latestRunHashCode: observable,
      validationRunPromise: observable,
      isGeneratingPlan: observable,
      isRunningValidation: observable,
      validationToRun: observable,
      setIsRunningValidation: action,
      setExecutionResult: action,
      setExecutionDuration: action,
      setPreviewLimit: action,
      setValidationRunPromise: action,
      setValidationToRun: action,
      handleRunValidation: action,
      runValidation: flow,
      cancelValidation: flow,
      generatePlan: flow,
    });

    this.dataQualityRelationValidationConfigurationState =
      dataQualityRelationValidationState;
    this.executionPlanState = new ExecutionPlanState(
      this.dataQualityRelationValidationConfigurationState.editorStore.applicationStore,
      this.dataQualityRelationValidationConfigurationState.editorStore.graphManagerState,
    );
  }

  setIsRunningValidation(val: boolean): void {
    this.isRunningValidation = val;
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

  setValidationRunPromise(promise: Promise<ExecutionResult> | undefined): void {
    this.validationRunPromise = promise;
  }

  setValidationToRun(validation: DataQualityRelationValidation): void {
    this.validationToRun = validation;
  }

  get checkForStaleResults(): boolean {
    if (
      this.latestRunHashCode !==
      this.dataQualityRelationValidationConfigurationState.hashCode
    ) {
      return true;
    }
    return false;
  }

  handleRunValidation() {
    if (this.isRunningValidation) {
      return;
    }
    const queryLambda =
      this.dataQualityRelationValidationConfigurationState
        .bodyExpressionSequence;
    const parameters = (queryLambda.parameters ?? []) as object[];
    if (parameters.length) {
      this.dataQualityRelationValidationConfigurationState.parametersState.openModal(
        queryLambda,
      );
    } else {
      flowResult(this.runValidation()).catch(
        this.dataQualityRelationValidationConfigurationState.editorStore
          .applicationStore.alertUnhandledError,
      );
    }
  }

  *runValidation(): GeneratorFn<void> {
    let promise;
    try {
      this.setIsRunningValidation(true);
      const currentHashCode =
        this.dataQualityRelationValidationConfigurationState.hashCode;
      const packagePath =
        this.dataQualityRelationValidationConfigurationState.validationElement
          .path;
      const model =
        this.dataQualityRelationValidationConfigurationState.editorStore
          .graphManagerState.graph;

      const stopWatch = new StopWatch();

      promise = getDataQualityPureGraphManagerExtension(
        this.dataQualityRelationValidationConfigurationState.editorStore
          .graphManagerState.graphManager,
      ).execute(model, packagePath, {
        previewLimit: this.previewLimit,
        validationName: this.validationToRun?.name,
        lambdaParameterValues: buildExecutionParameterValues(
          this.dataQualityRelationValidationConfigurationState.parametersState
            .parameterStates,
          this.dataQualityRelationValidationConfigurationState.editorStore
            .graphManagerState,
        ),
      });

      this.setValidationRunPromise(promise);
      const result = (yield promise) as ExecutionResult;

      if (this.validationRunPromise === promise) {
        this.setExecutionResult(result);
        this.latestRunHashCode = currentHashCode;
        this.setExecutionDuration(stopWatch.elapsed);
      }
    } catch (error) {
      if (this.validationRunPromise === promise) {
        assertErrorThrown(error);
        this.setExecutionResult(undefined);
        this.dataQualityRelationValidationConfigurationState.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
          error,
        );
        this.dataQualityRelationValidationConfigurationState.editorStore.applicationStore.notificationService.notifyError(
          error,
        );
      }
    } finally {
      this.setIsRunningValidation(false);
    }
  }

  *cancelValidation(): GeneratorFn<void> {
    this.setIsRunningValidation(false);
    this.setValidationRunPromise(undefined);
    try {
      yield this.dataQualityRelationValidationConfigurationState.editorStore.graphManagerState.graphManager.cancelUserExecutions(
        true,
      );
    } catch (error) {
      // Don't notify users about success or failure
      this.dataQualityRelationValidationConfigurationState.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
    }
  }

  *generatePlan(debug: boolean): GeneratorFn<void> {
    const packagePath =
      this.dataQualityRelationValidationConfigurationState.validationElement
        .path;
    const model =
      this.dataQualityRelationValidationConfigurationState.editorStore
        .graphManagerState.graph;
    try {
      this.isGeneratingPlan = true;
      let rawPlan: RawExecutionPlan;

      const stopWatch = new StopWatch();

      if (debug) {
        const debugResult = (yield getDataQualityPureGraphManagerExtension(
          this.dataQualityRelationValidationConfigurationState.editorStore
            .graphManagerState.graphManager,
        ).debugExecutionPlanGeneration(model, packagePath, {
          validationName: this.validationToRun?.name,
        })) as {
          plan: RawExecutionPlan;
          debug: string;
        };
        rawPlan = debugResult.plan;
        this.executionPlanState.setDebugText(debugResult.debug);
      } else {
        QueryBuilderTelemetryHelper.logEvent_ExecutionPlanGenerationLaunched(
          this.dataQualityRelationValidationConfigurationState.editorStore
            .applicationStore.telemetryService,
        );
        rawPlan = (yield getDataQualityPureGraphManagerExtension(
          this.dataQualityRelationValidationConfigurationState.editorStore
            .graphManagerState.graphManager,
        ).generatePlan(model, packagePath, {
          validationName: this.validationToRun?.name,
        })) as RawExecutionPlan;
      }

      stopWatch.record();
      try {
        this.executionPlanState.setRawPlan(rawPlan);
        const plan =
          this.dataQualityRelationValidationConfigurationState.editorStore.graphManagerState.graphManager.buildExecutionPlan(
            rawPlan,
            this.dataQualityRelationValidationConfigurationState.editorStore
              .graphManagerState.graph,
          );
        this.executionPlanState.initialize(plan);
      } catch {
        //do nothing
      }
      stopWatch.record(QUERY_BUILDER_EVENT.BUILD_EXECUTION_PLAN__SUCCESS);
    } catch (error) {
      assertErrorThrown(error);
      this.dataQualityRelationValidationConfigurationState.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.dataQualityRelationValidationConfigurationState.editorStore.applicationStore.notificationService.notifyError(
        error,
      );
    } finally {
      this.isGeneratingPlan = false;
    }
  }
}
