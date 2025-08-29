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
  type ExportDataInfo,
  buildExecutionParameterValues,
  ExecutionPlanState,
  QUERY_BUILDER_EVENT,
  QueryBuilderTelemetryHelper,
  PARAMETER_SUBMIT_ACTION,
} from '@finos/legend-query-builder';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import {
  type GeneratorFn,
  assertErrorThrown,
  LogEvent,
  StopWatch,
  getContentTypeFileExtension,
  ActionState,
  ContentType,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  type ExecutionResult,
  type RawExecutionPlan,
  GRAPH_MANAGER_EVENT,
  V1_DELEGATED_EXPORT_HEADER,
  EXECUTION_SERIALIZATION_FORMAT,
} from '@finos/legend-graph';
import { getDataQualityPureGraphManagerExtension } from '../../graph-manager/protocol/pure/DSL_DataQuality_PureGraphManagerExtension.js';
import type { DataQualityRelationValidationConfigurationState } from './DataQualityRelationValidationConfigurationState.js';
import type { DataQualityRelationValidation } from '../../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import { downloadStream } from '@finos/legend-application';

export type DataQualityRelationResultCellDataType =
  | string
  | number
  | boolean
  | null
  | undefined;

export interface DataQualityRelationRowDataType {
  [key: string]: DataQualityRelationResultCellDataType;
}

export interface DataQualityRelationResultCellCoordinate {
  rowIndex: number;
  colIndex: number;
}

export const DEFAULT_LIMIT = 1000;
export class DataQualityRelationResultState {
  readonly dataQualityRelationValidationConfigurationState: DataQualityRelationValidationConfigurationState;
  readonly executionPlanState: ExecutionPlanState;
  readonly exportState = ActionState.create();

  previewLimit = DEFAULT_LIMIT;
  isRunningValidation = false;
  isGeneratingPlan = false;
  allValidationsChecked = false;
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
      allValidationsChecked: observable,
      setIsRunningValidation: action,
      setExecutionResult: action,
      setExecutionDuration: action,
      setPreviewLimit: action,
      setValidationRunPromise: action,
      setValidationToRun: action,
      handleRunValidation: action,
      handleExport: action,
      onToggleAllValidationsChecked: action,
      runValidation: flow,
      cancelValidation: flow,
      generatePlan: flow,
      exportData: flow,
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

  onToggleAllValidationsChecked(val: boolean): void {
    this.allValidationsChecked = !val;
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
    const queryLambda =
      this.dataQualityRelationValidationConfigurationState
        .bodyExpressionSequence;
    const parameters = (queryLambda.parameters ?? []) as object[];
    if (parameters.length) {
      this.dataQualityRelationValidationConfigurationState.parametersState.openModal(
        queryLambda,
        true,
      );
    } else {
      flowResult(this.runValidation()).catch(
        this.dataQualityRelationValidationConfigurationState.editorStore
          .applicationStore.alertUnhandledError,
      );
    }
  }

  handleExport(format: string) {
    const queryLambda =
      this.dataQualityRelationValidationConfigurationState
        .bodyExpressionSequence;
    const parameters = (queryLambda.parameters ?? []) as object[];
    if (parameters.length) {
      this.dataQualityRelationValidationConfigurationState.parametersState.parameterStates =
        this.dataQualityRelationValidationConfigurationState.parametersState.build(
          queryLambda,
        );
      this.dataQualityRelationValidationConfigurationState.parametersState.parameterValuesEditorState.open(
        (): Promise<void> =>
          flowResult(this.exportData(format)).catch(
            this.dataQualityRelationValidationConfigurationState.editorStore
              .applicationStore.alertUnhandledError,
          ),
        PARAMETER_SUBMIT_ACTION.EXPORT,
      );
    } else {
      flowResult(this.exportData(format)).catch(
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
        allValidationsChecked: this.allValidationsChecked,
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
          allValidationsChecked: this.allValidationsChecked,
          previewLimit: this.previewLimit,
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
          allValidationsChecked: this.allValidationsChecked,
          previewLimit: this.previewLimit,
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

  getExportDataInfo(format: string): ExportDataInfo {
    switch (format) {
      case EXECUTION_SERIALIZATION_FORMAT.CSV:
        return {
          contentType: ContentType.TEXT_CSV,
          serializationFormat: EXECUTION_SERIALIZATION_FORMAT.CSV,
        };

      default:
        throw new UnsupportedOperationError(
          `Unsupported TDS export type ${format}`,
        );
    }
  }

  get exportDataFormatOptions(): string[] {
    return [EXECUTION_SERIALIZATION_FORMAT.CSV];
  }

  *exportData(format: string): GeneratorFn<void> {
    try {
      this.exportState.inProgress();
      const packagePath =
        this.dataQualityRelationValidationConfigurationState.validationElement
          .path;
      const model =
        this.dataQualityRelationValidationConfigurationState.editorStore
          .graphManagerState.graph;
      this.dataQualityRelationValidationConfigurationState.editorStore.applicationStore.notificationService.notifySuccess(
        `Export ${format} will run in background`,
      );
      const exportData = this.getExportDataInfo(format);
      const contentType = exportData.contentType;
      const serializationFormat = exportData.serializationFormat;
      const result = (yield getDataQualityPureGraphManagerExtension(
        this.dataQualityRelationValidationConfigurationState.editorStore
          .graphManagerState.graphManager,
      ).exportData(model, packagePath, {
        serializationFormat,
        previewLimit: this.previewLimit,
        validationName: this.validationToRun?.name,
        allValidationsChecked: this.allValidationsChecked,
        lambdaParameterValues: buildExecutionParameterValues(
          this.dataQualityRelationValidationConfigurationState.parametersState
            .parameterStates,
          this.dataQualityRelationValidationConfigurationState.editorStore
            .graphManagerState,
        ),
      })) as Response;
      if (result.headers.get(V1_DELEGATED_EXPORT_HEADER) === 'true') {
        if (result.status === 200) {
          this.exportState.pass();
        } else {
          this.exportState.fail();
        }
        return;
      }
      downloadStream(
        result,
        `result.${getContentTypeFileExtension(contentType)}`,
        exportData.contentType,
      )
        .then(() => {
          this.exportState.pass();
        })
        .catch((error) => {
          assertErrorThrown(error);
        });
    } catch (error) {
      this.exportState.fail();
      assertErrorThrown(error);
      this.dataQualityRelationValidationConfigurationState.editorStore.applicationStore.notificationService.notifyError(
        error,
      );
      this.exportState.complete();
    }
  }
}
