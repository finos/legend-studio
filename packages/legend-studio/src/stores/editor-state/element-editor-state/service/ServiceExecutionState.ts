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

import { observable, action, flow, makeObservable, flowResult } from 'mobx';
import type { GeneratorFn } from '@finos/legend-shared';
import {
  LogEvent,
  losslessStringify,
  tryToFormatLosslessJSONString,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { SingleExecutionTestState } from './ServiceTestState';
import type { EditorStore } from '../../../EditorStore';
import type { ServiceEditorState } from './ServiceEditorState';
import {
  decorateRuntimeWithNewMapping,
  RuntimeEditorState,
} from '../../../editor-state/element-editor-state/RuntimeEditorState';
import { LambdaEditorState, TAB_SIZE } from '@finos/legend-application';
import { ExecutionPlanState } from '../../../ExecutionPlanState';
import type {
  ServiceExecution,
  KeyedExecutionParameter,
  PureExecution,
  ServiceTest,
  Mapping,
  Runtime,
  ExecutionResult,
} from '@finos/legend-graph';
import {
  GRAPH_MANAGER_LOG_EVENT,
  LAMBDA_PIPE,
  RawLambda,
  PureSingleExecution,
  PureMultiExecution,
  EngineRuntime,
  RuntimePointer,
  PackageableElementExplicitReference,
  buildSourceInformationSourceId,
  PureClientVersion,
} from '@finos/legend-graph';

export enum SERVICE_EXECUTION_TAB {
  MAPPING_AND_RUNTIME = 'MAPPING_&_Runtime',
  TESTS = 'TESTS',
}

export abstract class ServiceExecutionState {
  editorStore: EditorStore;
  serviceEditorState: ServiceEditorState;
  execution: ServiceExecution;
  selectedSingeExecutionTestState?: SingleExecutionTestState;
  selectedTab = SERVICE_EXECUTION_TAB.MAPPING_AND_RUNTIME;

  constructor(
    editorStore: EditorStore,
    serviceEditorState: ServiceEditorState,
    execution: ServiceExecution,
    test: ServiceTest,
  ) {
    makeObservable(this, {
      execution: observable,
      selectedSingeExecutionTestState: observable,
      selectedTab: observable,
      setSelectedTab: action,
    });

    this.editorStore = editorStore;
    this.execution = execution;
    this.serviceEditorState = serviceEditorState;
    this.selectedSingeExecutionTestState = this.getInitiallySelectedTestState(
      execution,
      test,
    );
    // TODO: format to other format when we support other connections in the future
    this.selectedSingeExecutionTestState?.test.setData(
      /* @MARKER: Workaround for https://github.com/finos/legend-studio/issues/68 */
      tryToFormatLosslessJSONString(
        this.selectedSingeExecutionTestState.test.data,
      ),
    ); // pre-format test data
  }

  setSelectedTab(val: SERVICE_EXECUTION_TAB): void {
    this.selectedTab = val;
  }
  getInitiallySelectedTestState(
    execution: ServiceExecution,
    test: ServiceTest,
  ): SingleExecutionTestState | undefined {
    if (execution instanceof PureSingleExecution) {
      return new SingleExecutionTestState(
        this.editorStore,
        this.serviceEditorState,
      );
    } else if (execution instanceof PureMultiExecution) {
      // TODO: handle this properly
      // const multiTest = guaranteeType(test, MultiExecutionTest);
      // if (multiTest.tests.length) {
      //   return new KeyedSingleExecutionState(this.editorStore, multiTest.tests[0], this.serviceEditorState);
      // }
      return undefined;
    }
    throw new UnsupportedOperationError();
  }

  abstract get serviceExecutionParameters():
    | { query: RawLambda; mapping: Mapping; runtime: Runtime }
    | undefined;
}

class ServicePureExecutionQueryState extends LambdaEditorState {
  editorStore: EditorStore;
  execution: PureExecution;
  isInitializingLambda = false;

  constructor(editorStore: EditorStore, execution: PureExecution) {
    super('', LAMBDA_PIPE);

    makeObservable(this, {
      execution: observable,
      isInitializingLambda: observable,
      setIsInitializingLambda: action,
      setLambda: action,
      updateLamba: flow,
    });

    this.editorStore = editorStore;
    this.execution = execution;
  }

  get lambdaId(): string {
    return buildSourceInformationSourceId([
      this.execution.owner.path,
      'execution',
    ]);
  }

  get query(): RawLambda {
    return this.execution.func;
  }

  setIsInitializingLambda(val: boolean): void {
    this.isInitializingLambda = val;
  }

  setLambda(val: RawLambda): void {
    this.execution.setFunction(val);
  }

  *updateLamba(val: RawLambda): GeneratorFn<void> {
    this.setLambda(val);
    yield flowResult(this.convertLambdaObjectToGrammarString(true));
  }

  *convertLambdaObjectToGrammarString(pretty?: boolean): GeneratorFn<void> {
    if (this.execution.func.body) {
      try {
        const lambdas = new Map<string, RawLambda>();
        lambdas.set(
          this.lambdaId,
          new RawLambda(
            this.execution.func.parameters,
            this.execution.func.body,
          ),
        );
        const isolatedLambdas =
          (yield this.editorStore.graphManagerState.graphManager.lambdasToPureCode(
            lambdas,
            pretty,
          )) as Map<string, string>;
        const grammarText = isolatedLambdas.get(this.lambdaId);
        this.setLambdaString(
          grammarText !== undefined
            ? this.extractLambdaString(grammarText)
            : '',
        );
        this.clearErrors();
      } catch (error: unknown) {
        this.editorStore.applicationStore.log.error(
          LogEvent.create(GRAPH_MANAGER_LOG_EVENT.PARSING_FAILURE),
          error,
        );
      }
    } else {
      this.clearErrors();
      this.setLambdaString('');
    }
  }

  // NOTE: since we don't allow edition in text mode, we don't need to implement this
  *convertLambdaGrammarStringToObject(): GeneratorFn<void> {
    throw new UnsupportedOperationError();
  }
}

export class ServicePureExecutionState extends ServiceExecutionState {
  queryState: ServicePureExecutionQueryState;
  declare execution: PureExecution;
  selectedExecutionConfiguration?:
    | PureSingleExecution
    | KeyedExecutionParameter;
  runtimeEditorState?: RuntimeEditorState;
  isExecuting = false;
  isGeneratingPlan = false;
  isOpeningQueryEditor = false;
  executionResultText?: string; // NOTE: stored as lossless JSON string
  executionPlanState: ExecutionPlanState;

  constructor(
    editorStore: EditorStore,
    serviceEditorState: ServiceEditorState,
    execution: PureExecution,
    test: ServiceTest,
  ) {
    super(editorStore, serviceEditorState, execution, test);

    makeObservable(this, {
      queryState: observable,
      selectedExecutionConfiguration: observable,
      runtimeEditorState: observable,
      isExecuting: observable,
      isGeneratingPlan: observable,
      isOpeningQueryEditor: observable,
      executionResultText: observable,
      executionPlanState: observable,
      setExecutionResultText: action,
      closeRuntimeEditor: action,
      openRuntimeEditor: action,
      useCustomRuntime: action,
      setQueryState: action,
      autoSelectRuntimeOnMappingChange: action,
      updateExecutionQuery: action,
      setOpeningQueryEditor: action,
      generatePlan: flow,
      execute: flow,
    });

    this.execution = execution;
    this.selectedExecutionConfiguration =
      this.getInitiallySelectedExecution(execution);
    this.queryState = new ServicePureExecutionQueryState(
      this.editorStore,
      execution,
    );
    this.executionPlanState = new ExecutionPlanState(this.editorStore);
  }

  setOpeningQueryEditor(val: boolean): void {
    this.isOpeningQueryEditor = val;
  }
  setExecutionResultText = (executionResult: string | undefined): void => {
    this.executionResultText = executionResult;
  };
  setQueryState = (queryState: ServicePureExecutionQueryState): void => {
    this.queryState = queryState;
  };

  *generatePlan(): GeneratorFn<void> {
    if (!this.selectedExecutionConfiguration || this.isGeneratingPlan) {
      return;
    }
    try {
      this.isGeneratingPlan = true;
      const query = this.queryState.query;
      yield flowResult(
        this.executionPlanState.generatePlan(
          this.selectedExecutionConfiguration.mapping.value,
          query,
          this.selectedExecutionConfiguration.runtime,
        ),
      );
    } catch (error: unknown) {
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_LOG_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isGeneratingPlan = false;
    }
  }

  *execute(): GeneratorFn<void> {
    if (!this.selectedExecutionConfiguration || this.isExecuting) {
      return;
    }
    try {
      this.isExecuting = true;
      const query = this.queryState.query;
      const result =
        (yield this.editorStore.graphManagerState.graphManager.executeMapping(
          this.editorStore.graphManagerState.graph,
          this.selectedExecutionConfiguration.mapping.value,
          query,
          this.selectedExecutionConfiguration.runtime,
          PureClientVersion.VX_X_X,
          true,
        )) as ExecutionResult;
      this.setExecutionResultText(
        losslessStringify(result, undefined, TAB_SIZE),
      );
    } catch (error: unknown) {
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_LOG_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isExecuting = false;
    }
  }

  get serviceExecutionParameters():
    | { query: RawLambda; mapping: Mapping; runtime: Runtime }
    | undefined {
    if (!this.selectedExecutionConfiguration || this.isExecuting) {
      return undefined;
    }
    const query = this.queryState.query;
    return {
      query,
      mapping: this.selectedExecutionConfiguration.mapping.value,
      runtime: this.selectedExecutionConfiguration.runtime,
    };
  }

  closeRuntimeEditor(): void {
    this.runtimeEditorState = undefined;
  }
  openRuntimeEditor(): void {
    if (
      this.selectedExecutionConfiguration &&
      !(this.selectedExecutionConfiguration.runtime instanceof RuntimePointer)
    ) {
      this.runtimeEditorState = new RuntimeEditorState(
        this.editorStore,
        this.selectedExecutionConfiguration.runtime,
        true,
      );
    }
  }

  useCustomRuntime(): void {
    if (this.selectedExecutionConfiguration) {
      const customRuntime = new EngineRuntime();
      customRuntime.addMapping(
        PackageableElementExplicitReference.create(
          this.selectedExecutionConfiguration.mapping.value,
        ),
      );
      decorateRuntimeWithNewMapping(
        this.selectedExecutionConfiguration.runtime,
        this.selectedExecutionConfiguration.mapping.value,
        this.editorStore.graphManagerState.graph,
      );
      this.selectedExecutionConfiguration.setRuntime(customRuntime);
    }
  }

  autoSelectRuntimeOnMappingChange(mapping: Mapping): void {
    if (this.selectedExecutionConfiguration) {
      const runtimes =
        this.editorStore.graphManagerState.graph.ownRuntimes.filter((runtime) =>
          runtime.runtimeValue.mappings.map((m) => m.value).includes(mapping),
        );
      if (runtimes.length) {
        this.selectedExecutionConfiguration.setRuntime(
          runtimes[0].runtimeValue,
        );
      } else {
        this.useCustomRuntime();
      }
    }
  }

  getInitiallySelectedExecution(
    execution: PureExecution,
  ): PureSingleExecution | KeyedExecutionParameter | undefined {
    if (execution instanceof PureSingleExecution) {
      return execution;
    } else if (execution instanceof PureMultiExecution) {
      if (execution.executionParameters.length) {
        return execution.executionParameters[0];
      }
      return undefined;
    }
    throw new UnsupportedOperationError();
  }

  updateExecutionQuery(): void {
    this.execution.setFunction(this.queryState.query);
  }
}
