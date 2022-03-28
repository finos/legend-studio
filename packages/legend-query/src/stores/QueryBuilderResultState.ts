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

import { action, makeAutoObservable } from 'mobx';
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
} from '@finos/legend-shared';
import type { QueryBuilderState } from './QueryBuilderState';
import {
  type RawExecutionPlan,
  type ExecutionResult,
  type RawLambda,
  GRAPH_MANAGER_EVENT,
  PureClientVersion,
  EXECUTION_SERIALIZATION_FORMAT,
  RawExecutionResult,
} from '@finos/legend-graph';
import {
  buildLambdaFunction,
  buildParametersLetLambdaFunc,
} from './QueryBuilderLambdaBuilder';

const DEFAULT_LIMIT = 1000;

export class QueryBuilderResultState {
  queryBuilderState: QueryBuilderState;
  exportDataState = ActionState.create();
  showServicePathModal = false;
  previewLimit = DEFAULT_LIMIT;
  isExecutingQuery = false;
  isGeneratingPlan = false;
  executionResult?: ExecutionResult | undefined;
  executionPlan?: RawExecutionPlan | undefined;
  debugText?: string | undefined;

  constructor(queryBuilderState: QueryBuilderState) {
    makeAutoObservable(this, {
      queryBuilderState: false,
      setShowServicePathModal: action,
      setExecutionResult: action,
      setExecutionPlan: action,
    });

    this.queryBuilderState = queryBuilderState;
  }

  setShowServicePathModal = (val: boolean): void => {
    this.showServicePathModal = val;
  };
  setExecutionResult = (val: ExecutionResult | undefined): void => {
    this.executionResult = val;
  };
  setExecutionPlan = (val: RawExecutionPlan | undefined): void => {
    this.executionPlan = val;
  };
  setPreviewLimit = (val: number): void => {
    this.previewLimit = Math.max(1, val);
  };

  setDebugText(val: string | undefined): void {
    this.debugText = val;
  }

  buildExecutionRawLambda(): RawLambda {
    let query: RawLambda;
    if (this.queryBuilderState.isQuerySupported()) {
      const lambdaFunction = buildLambdaFunction(this.queryBuilderState, {
        isBuildingExecutionQuery: true,
      });
      query =
        this.queryBuilderState.buildRawLambdaFromLambdaFunction(lambdaFunction);
    } else {
      query = guaranteeNonNullable(
        this.queryBuilderState.queryUnsupportedState.rawLambda,
        'Lambda is required to execute query',
      );
      if (
        !this.queryBuilderState.mode.isParametersDisabled &&
        this.queryBuilderState.queryParametersState.parameters.length
      ) {
        const letlambdaFunction = buildParametersLetLambdaFunc(
          this.queryBuilderState,
        );
        const letRawLambda =
          this.queryBuilderState.buildRawLambdaFromLambdaFunction(
            letlambdaFunction,
          );
        // reset paramaters
        if (Array.isArray(query.body) && Array.isArray(letRawLambda.body)) {
          letRawLambda.body = [
            ...(letRawLambda.body as object[]),
            ...(query.body as object[]),
          ];
          query = letRawLambda;
        }
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
        this.queryBuilderState.querySetupState.mapping,
        'Mapping is required to execute query',
      );
      const runtime = guaranteeNonNullable(
        this.queryBuilderState.querySetupState.runtime,
        `Runtime is required to execute query`,
      );
      const query = this.buildExecutionRawLambda();
      const result =
        (yield this.queryBuilderState.graphManagerState.graphManager.executeMapping(
          this.queryBuilderState.graphManagerState.graph,
          mapping,
          query,
          runtime,
          PureClientVersion.VX_X_X,
          {
            serializationFormat,
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
      this.queryBuilderState.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.queryBuilderState.applicationStore.notifyError(error);
      this.exportDataState.fail();
    }
  }

  *execute(): GeneratorFn<void> {
    try {
      this.isExecutingQuery = true;
      const mapping = guaranteeNonNullable(
        this.queryBuilderState.querySetupState.mapping,
        'Mapping is required to execute query',
      );
      const runtime = guaranteeNonNullable(
        this.queryBuilderState.querySetupState.runtime,
        `Runtime is required to execute query`,
      );
      const query = this.buildExecutionRawLambda();
      const result =
        (yield this.queryBuilderState.graphManagerState.graphManager.executeMapping(
          this.queryBuilderState.graphManagerState.graph,
          mapping,
          query,
          runtime,
          PureClientVersion.VX_X_X,
        )) as ExecutionResult;
      this.setExecutionResult(result);
    } catch (error) {
      assertErrorThrown(error);
      this.queryBuilderState.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.queryBuilderState.applicationStore.notifyError(error);
    } finally {
      this.isExecutingQuery = false;
    }
  }

  *generatePlan(debug: boolean): GeneratorFn<void> {
    try {
      this.isGeneratingPlan = true;
      const mapping = guaranteeNonNullable(
        this.queryBuilderState.querySetupState.mapping,
        'Mapping is required to execute query',
      );
      const runtime = guaranteeNonNullable(
        this.queryBuilderState.querySetupState.runtime,
        `Runtime is required to execute query`,
      );
      const query = this.queryBuilderState.getQuery();
      if (debug) {
        const debugResult =
          (yield this.queryBuilderState.graphManagerState.graphManager.debugExecutionPlanGeneration(
            this.queryBuilderState.graphManagerState.graph,
            mapping,
            query,
            runtime,
            PureClientVersion.VX_X_X,
          )) as { plan: RawExecutionPlan; debug: string };
        this.setExecutionPlan(debugResult.plan);
        this.setDebugText(debugResult.debug);
      } else {
        const result =
          (yield this.queryBuilderState.graphManagerState.graphManager.generateExecutionPlan(
            this.queryBuilderState.graphManagerState.graph,
            mapping,
            query,
            runtime,
            PureClientVersion.VX_X_X,
          )) as object;
        this.setExecutionPlan(result);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.queryBuilderState.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.queryBuilderState.applicationStore.notifyError(error);
    } finally {
      this.isGeneratingPlan = false;
    }
  }
}
