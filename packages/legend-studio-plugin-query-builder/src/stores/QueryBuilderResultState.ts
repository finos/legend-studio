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

import { action, flow, flowResult, makeAutoObservable } from 'mobx';
import type { GeneratorFn } from '@finos/legend-studio-shared';
import { guaranteeNonNullable } from '@finos/legend-studio-shared';
import type { QueryBuilderState } from './QueryBuilderState';
import type {
  EditorStore,
  ExecutionPlan,
  ExecutionResult,
  RawLambda,
} from '@finos/legend-studio';
import {
  CLIENT_VERSION,
  CORE_LOG_EVENT,
  PackageableElementExplicitReference,
  PureSingleExecution,
  Service,
} from '@finos/legend-studio';

const DEFAULT_LIMIT = 1000;

export class QueryBuilderResultState {
  editorStore: EditorStore;
  queryBuilderState: QueryBuilderState;
  isExecutingQuery = false;
  isGeneratingPlan = false;
  executionResult?: ExecutionResult;
  executionPlan?: ExecutionPlan;
  showServicePathModal = false;
  previewLimit = DEFAULT_LIMIT;

  constructor(editorStore: EditorStore, queryBuilderState: QueryBuilderState) {
    makeAutoObservable(this, {
      editorStore: false,
      queryBuilderState: false,
      setShowServicePathModal: action,
      setExecutionResult: action,
      setExecutionPlan: action,
    });

    this.editorStore = editorStore;
    this.queryBuilderState = queryBuilderState;
  }

  setShowServicePathModal = (val: boolean): void => {
    this.showServicePathModal = val;
  };
  setExecutionResult = (val: ExecutionResult | undefined): void => {
    this.executionResult = val;
  };
  setExecutionPlan = (val: ExecutionPlan | undefined): void => {
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
      const runtime = this.queryBuilderState.querySetupState.runtime;
      let query: RawLambda;
      if (this.queryBuilderState.isQuerySupported()) {
        const lambdaFunction = this.queryBuilderState.buildLambdaFunction({
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
        (yield this.editorStore.graphState.graphManager.executeMapping(
          this.editorStore.graphState.graph,
          mapping,
          query,
          runtime,
          CLIENT_VERSION.VX_X_X,
          false,
        )) as ExecutionResult;
      this.setExecutionResult(result);
      this.isExecutingQuery = false;
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.EXECUTION_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
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
      const runtime = this.queryBuilderState.querySetupState.runtime;
      const query = this.queryBuilderState.getRawLambdaQuery();
      const result =
        (yield this.editorStore.graphState.graphManager.generateExecutionPlan(
          this.editorStore.graphState.graph,
          mapping,
          query,
          runtime,
          CLIENT_VERSION.VX_X_X,
        )) as ExecutionResult;
      this.setExecutionPlan(result);
      this.isGeneratingPlan = false;
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.EXECUTION_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
      this.isGeneratingPlan = false;
    }
  }

  promoteToService = flow(function* (
    this: QueryBuilderResultState,
    packageName: string,
    serviceName: string,
  ) {
    try {
      const mapping = guaranteeNonNullable(
        this.queryBuilderState.querySetupState.mapping,
        'Mapping is required to execute query',
      );
      const runtime = this.queryBuilderState.querySetupState.runtime;
      const query = this.queryBuilderState.getRawLambdaQuery();
      const service = new Service(serviceName);
      service.initNewService();
      service.setExecution(
        new PureSingleExecution(
          query,
          service,
          PackageableElementExplicitReference.create(mapping),
          runtime,
        ),
      );
      const servicePackage =
        this.editorStore.graphState.graph.getOrCreatePackageWithPackageName(
          packageName,
        );
      servicePackage.addElement(service);
      this.editorStore.graphState.graph.addElement(service);
      this.editorStore.openElement(service);
      yield flowResult(this.queryBuilderState.setOpenQueryBuilder(false)).catch(
        this.editorStore.applicationStore.alertIllegalUnhandledError,
      );
      this.queryBuilderState.reset();
      this.editorStore.applicationStore.notifySuccess(
        `Service ${service.name} created`,
      );
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.EXECUTION_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  });
}
