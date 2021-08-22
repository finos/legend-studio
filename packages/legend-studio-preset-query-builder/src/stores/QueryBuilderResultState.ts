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
import type { GeneratorFn } from '@finos/legend-shared';
import { LogEvent, guaranteeNonNullable } from '@finos/legend-shared';
import type { QueryBuilderState } from './QueryBuilderState';
import type {
  RawExecutionPlan,
  ExecutionResult,
  RawLambda,
} from '@finos/legend-graph';
import {
  GRAPH_MANAGER_LOG_EVENT,
  PureClientVersion,
} from '@finos/legend-graph';
import { buildLambdaFunction } from './QueryBuilderLambdaBuilder';

const DEFAULT_LIMIT = 1000;

export class QueryBuilderResultState {
  queryBuilderState: QueryBuilderState;
  isExecutingQuery = false;
  isGeneratingPlan = false;
  executionResult?: ExecutionResult;
  executionPlan?: RawExecutionPlan;
  showServicePathModal = false;
  previewLimit = DEFAULT_LIMIT;

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
      let query: RawLambda;
      if (this.queryBuilderState.isQuerySupported()) {
        const lambdaFunction = buildLambdaFunction(this.queryBuilderState, {
          isBuildingExecutionQuery: true,
        });
        query =
          this.queryBuilderState.buildRawLambdaFromLambdaFunction(
            lambdaFunction,
          );
      } else {
        query = guaranteeNonNullable(
          this.queryBuilderState.queryUnsupportedState.rawLambda,
          'Lambda is required to execute query',
        );
      }
      const result =
        (yield this.queryBuilderState.graphManagerState.graphManager.executeMapping(
          this.queryBuilderState.graphManagerState.graph,
          mapping,
          query,
          runtime,
          PureClientVersion.VX_X_X,
          false,
        )) as ExecutionResult;
      this.setExecutionResult(result);
    } catch (error: unknown) {
      this.queryBuilderState.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_LOG_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.queryBuilderState.applicationStore.notifyError(error);
    } finally {
      this.isExecutingQuery = false;
    }
  }

  *generateExecutionPlan(): GeneratorFn<void> {
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
      const result =
        (yield this.queryBuilderState.graphManagerState.graphManager.generateExecutionPlan(
          this.queryBuilderState.graphManagerState.graph,
          mapping,
          query,
          runtime,
          PureClientVersion.VX_X_X,
        )) as ExecutionResult;
      this.setExecutionPlan(result);
      this.isGeneratingPlan = false;
    } catch (error: unknown) {
      this.queryBuilderState.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_LOG_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.queryBuilderState.applicationStore.notifyError(error);
      this.isGeneratingPlan = false;
    }
  }
}
