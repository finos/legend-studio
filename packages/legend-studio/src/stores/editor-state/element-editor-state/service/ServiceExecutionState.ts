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

import { observable, action, flow, makeObservable } from 'mobx';
import {
  losslessStringify,
  tryToFormatLosslessJSONString,
  UnsupportedOperationError,
} from '@finos/legend-studio-shared';
import { SingleExecutionTestState } from './ServiceTestState';
import type { EditorStore } from '../../../EditorStore';
import type { ServiceEditorState } from './ServiceEditorState';
import { CORE_LOG_EVENT } from '../../../../utils/Logger';
import {
  CLIENT_VERSION,
  LAMBDA_START,
} from '../../../../models/MetaModelConst';
import { LambdaEditorState } from '../../../editor-state/element-editor-state/LambdaEditorState';
import {
  decorateRuntimeWithNewMapping,
  RuntimeEditorState,
} from '../../../editor-state/element-editor-state/RuntimeEditorState';
import { RawLambda } from '../../../../models/metamodels/pure/model/rawValueSpecification/RawLambda';
import type {
  ServiceExecution,
  KeyedExecutionParameter,
  PureExecution,
} from '../../../../models/metamodels/pure/model/packageableElements/service/ServiceExecution';
import {
  PureSingleExecution,
  PureMultiExecution,
} from '../../../../models/metamodels/pure/model/packageableElements/service/ServiceExecution';
import type { ServiceTest } from '../../../../models/metamodels/pure/model/packageableElements/service/ServiceTest';
import { Class } from '../../../../models/metamodels/pure/model/packageableElements/domain/Class';
import type { Mapping } from '../../../../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import type { Runtime } from '../../../../models/metamodels/pure/model/packageableElements/runtime/Runtime';
import {
  EngineRuntime,
  RuntimePointer,
} from '../../../../models/metamodels/pure/model/packageableElements/runtime/Runtime';
import { PackageableElementExplicitReference } from '../../../../models/metamodels/pure/model/packageableElements/PackageableElementReference';
import type { ExecutionResult } from '../../../../models/metamodels/pure/action/execution/ExecutionResult';
import { TAB_SIZE } from '../../../EditorConfig';

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

  // TODO: this method will be replaced when we create the endpoint to generate test data
  abstract getTestDataGenerationInput():
    | [Class | undefined, Mapping]
    | undefined;
  abstract get serviceExecutionParameters():
    | { query: RawLambda; mapping: Mapping; runtime: Runtime }
    | undefined;
}

class ServicePureExecutionQueryState extends LambdaEditorState {
  editorStore: EditorStore;
  execution: PureExecution;
  isConvertingLambdaToString = false;
  isInitializingLambda = false;

  constructor(editorStore: EditorStore, execution: PureExecution) {
    super('', LAMBDA_START);
    makeObservable(this, {
      execution: observable,
      isConvertingLambdaToString: observable,
      isInitializingLambda: observable,
      setIsInitializingLambda: action,
      setLambda: action,
      convertLambdaObjectToGrammarString: action,
      convertLambdaGrammarStringToObject: action,
      updateLamba: action,
    });

    this.editorStore = editorStore;
    this.execution = execution;
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

  updateLamba = flow(function* (
    this: ServicePureExecutionQueryState,
    val: RawLambda,
  ) {
    this.setLambda(val);
    yield this.convertLambdaObjectToGrammarString(true);
  });

  convertLambdaObjectToGrammarString = flow(function* (
    this: ServicePureExecutionQueryState,
    pretty?: boolean,
  ) {
    if (this.execution.func.body) {
      this.isConvertingLambdaToString = true;
      try {
        const lambdas = new Map<string, RawLambda>();
        lambdas.set(
          this.execution.lambdaId,
          new RawLambda(
            this.execution.func.parameters,
            this.execution.func.body,
          ),
        );
        const isolatedLambdas =
          (yield this.editorStore.graphState.graphManager.lambdaToPureCode(
            lambdas,
            pretty,
          )) as Map<string, string>;
        const grammarText = isolatedLambdas.get(this.execution.lambdaId);
        this.setLambdaString(
          grammarText !== undefined
            ? this.extractLambdaString(grammarText)
            : '',
        );
        this.clearErrors();
        this.isConvertingLambdaToString = false;
      } catch (error: unknown) {
        this.editorStore.applicationStore.logger.error(
          CORE_LOG_EVENT.PARSING_PROBLEM,
          error,
        );
        this.isConvertingLambdaToString = false;
      }
    } else {
      this.clearErrors();
      this.setLambdaString('');
    }
  });

  // NOTE: since we don't allow edition in text mode, we don't need to implement this
  convertLambdaGrammarStringToObject(): Promise<void> {
    throw new Error('Method not implemented.');
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
  executionPlan?: object;
  executionResultText?: string; // NOTE: stored as lossless JSON string

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
      executionPlan: observable.ref,
      executionResultText: observable,
      setExecutionResultText: action,
      setExecutionPlan: action,
      closeRuntimeEditor: action,
      openRuntimeEditor: action,
      useCustomRuntime: action,
      setQueryState: action,
      autoSelectRuntimeOnMappingChange: action,
      updateExecutionQuery: action,
      setOpeningQueryEditor: action,
    });

    this.execution = execution;
    this.selectedExecutionConfiguration =
      this.getInitiallySelectedExecution(execution);
    this.queryState = new ServicePureExecutionQueryState(
      this.editorStore,
      execution,
    );
  }

  setOpeningQueryEditor(val: boolean): void {
    this.isOpeningQueryEditor = val;
  }
  setExecutionResultText = (executionResult: string | undefined): void => {
    this.executionResultText = executionResult;
  };
  setExecutionPlan = (executionPlan: object | undefined): void => {
    this.executionPlan = executionPlan;
  };
  setQueryState = (queryState: ServicePureExecutionQueryState): void => {
    this.queryState = queryState;
  };

  generatePlan = flow(function* (this: ServicePureExecutionState) {
    if (!this.selectedExecutionConfiguration || this.isGeneratingPlan) {
      return;
    }
    try {
      this.isGeneratingPlan = true;
      const query = this.queryState.query;
      const plan =
        (yield this.editorStore.graphState.graphManager.generateExecutionPlan(
          this.editorStore.graphState.graph,
          this.selectedExecutionConfiguration.mapping.value,
          query,
          this.selectedExecutionConfiguration.runtime,
          CLIENT_VERSION.VX_X_X,
        )) as unknown as object;
      this.setExecutionPlan(plan);
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.EXECUTION_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isGeneratingPlan = false;
    }
  });

  execute = flow(function* (this: ServicePureExecutionState) {
    if (!this.selectedExecutionConfiguration || this.isExecuting) {
      return;
    }
    try {
      this.isExecuting = true;
      const query = this.queryState.query;
      const result =
        (yield this.editorStore.graphState.graphManager.executeMapping(
          this.editorStore.graphState.graph,
          this.selectedExecutionConfiguration.mapping.value,
          query,
          this.selectedExecutionConfiguration.runtime,
          CLIENT_VERSION.VX_X_X,
          true,
        )) as unknown as ExecutionResult;
      this.setExecutionResultText(
        losslessStringify(result, undefined, TAB_SIZE),
      );
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.EXECUTION_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isExecuting = false;
    }
  });

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
        this.editorStore.graphState.graph,
      );
      this.selectedExecutionConfiguration.setRuntime(customRuntime);
    }
  }

  autoSelectRuntimeOnMappingChange(mapping: Mapping): void {
    if (this.selectedExecutionConfiguration) {
      const runtimes = this.editorStore.graphState.graph.runtimes.filter(
        (runtime) =>
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

  getTestDataGenerationInput(): [Class | undefined, Mapping] | undefined {
    const selectedExecution = this.selectedExecutionConfiguration;
    if (selectedExecution) {
      const mapping = selectedExecution.mapping.value;
      const graphFetchTreeContent =
        this.editorStore.graphState.graphManager.HACKY_deriveGraphFetchTreeContentFromQuery(
          this.execution.func,
          this.editorStore.graphState.graph,
          this.serviceEditorState.service,
        );
      if (graphFetchTreeContent instanceof Class) {
        return [graphFetchTreeContent, mapping];
      }
      return [undefined, selectedExecution.mapping.value];
    }
    return undefined;
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
