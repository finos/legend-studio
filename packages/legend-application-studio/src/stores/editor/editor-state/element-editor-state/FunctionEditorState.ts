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
  computed,
  observable,
  action,
  makeObservable,
  flow,
  flowResult,
  override,
} from 'mobx';
import type { EditorStore } from '../../EditorStore.js';
import {
  type GeneratorFn,
  assertErrorThrown,
  LogEvent,
  guaranteeType,
  assertType,
  StopWatch,
  stringifyLosslessJSON,
  filterByType,
} from '@finos/legend-shared';
import { ElementEditorState } from './ElementEditorState.js';
import {
  type CompilationError,
  type PackageableElement,
  GRAPH_MANAGER_EVENT,
  LAMBDA_PIPE,
  ParserError,
  ConcreteFunctionDefinition,
  RawLambda,
  buildSourceInformationSourceId,
  isStubbed_PackageableElement,
  type ExecutionResult,
  type RawExecutionPlan,
  reportGraphAnalytics,
  buildLambdaVariableExpressions,
  VariableExpression,
  observe_ValueSpecification,
  generateFunctionPrettyName,
} from '@finos/legend-graph';
import {
  ExecutionPlanState,
  LambdaEditorState,
  LambdaParameterState,
  LambdaParametersState,
  PARAMETER_SUBMIT_ACTION,
  QUERY_BUILDER_EVENT,
  QueryBuilderTelemetryHelper,
  buildExecutionParameterValues,
  getExecutionQueryFromRawLambda,
} from '@finos/legend-query-builder';
import { FunctionActivatorBuilderState } from './FunctionActivatorBuilderState.js';
import { DEFAULT_TAB_SIZE } from '@finos/legend-application';

export enum FUNCTION_EDITOR_TAB {
  DEFINITION = 'DEFINITION',
  TAGGED_VALUES = 'TAGGED_VALUES',
  STEREOTYPES = 'STEREOTYPES',
}

export class FunctionDefinitionEditorState extends LambdaEditorState {
  readonly editorStore: EditorStore;
  readonly functionElement: ConcreteFunctionDefinition;

  isConvertingFunctionBodyToString = false;

  constructor(
    functionElement: ConcreteFunctionDefinition,
    editorStore: EditorStore,
  ) {
    super('', LAMBDA_PIPE);

    makeObservable(this, {
      functionElement: observable,
      isConvertingFunctionBodyToString: observable,
    });

    this.functionElement = functionElement;
    this.editorStore = editorStore;
  }

  get lambdaId(): string {
    return buildSourceInformationSourceId([this.functionElement.path]);
  }

  *convertLambdaGrammarStringToObject(): GeneratorFn<void> {
    if (this.lambdaString) {
      try {
        const lambda =
          (yield this.editorStore.graphManagerState.graphManager.pureCodeToLambda(
            this.fullLambdaString,
            this.lambdaId,
          )) as RawLambda;
        this.setParserError(undefined);
        this.functionElement.expressionSequence = lambda.body as object[];
      } catch (error) {
        assertErrorThrown(error);
        if (error instanceof ParserError) {
          this.setParserError(error);
        }
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      }
    } else {
      this.clearErrors();
      this.functionElement.expressionSequence = [];
    }
  }

  *convertLambdaObjectToGrammarString(
    pretty: boolean,
    firstLoad?: boolean,
  ): GeneratorFn<void> {
    if (!isStubbed_PackageableElement(this.functionElement)) {
      this.isConvertingFunctionBodyToString = true;
      try {
        const lambdas = new Map<string, RawLambda>();
        const functionLamba = new RawLambda(
          [],
          this.functionElement.expressionSequence,
        );
        lambdas.set(this.lambdaId, functionLamba);
        const isolatedLambdas =
          (yield this.editorStore.graphManagerState.graphManager.lambdasToPureCode(
            lambdas,
            pretty,
          )) as Map<string, string>;
        const grammarText = isolatedLambdas.get(this.lambdaId);
        if (grammarText) {
          let grammarString = this.extractLambdaString(grammarText);
          if (
            this.functionElement.expressionSequence.length > 1 &&
            grammarString.endsWith('}')
          ) {
            // The lambda object to string converter wraps the lambda inside a '{}' in the case where there are more than one expressions inside the function
            // causing a parsing error. To handle this we extract only whats inside the '{}' and add ';' to avoid error.
            grammarString = grammarString.slice(0, -1);
            grammarString = `${
              grammarString.endsWith('\n')
                ? grammarString.slice(0, -1)
                : grammarString
            };`;
          }
          this.setLambdaString(grammarString);
        } else {
          this.setLambdaString('');
        }
        // `firstLoad` flag is used in the first rendering of the function editor (in a `useEffect`)
        // This flag helps block editing while the JSON is converting to text and to avoid reseting parser/compiler error in reveal error
        if (!firstLoad) {
          this.clearErrors();
        }
        this.isConvertingFunctionBodyToString = false;
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
        this.isConvertingFunctionBodyToString = false;
      }
    } else {
      this.clearErrors();
      this.setLambdaString('');
    }
  }
}

export class FunctionParametersState extends LambdaParametersState {
  readonly functionEditorState: FunctionEditorState;

  constructor(functionEditorState: FunctionEditorState) {
    super();
    makeObservable(this, {
      parameterValuesEditorState: observable,
      parameterStates: observable,
      addParameter: action,
      removeParameter: action,
      openModal: action,
      build: action,
      setParameters: action,
    });
    this.functionEditorState = functionEditorState;
  }

  openModal(query: RawLambda): void {
    this.parameterStates = this.build(query);
    this.parameterValuesEditorState.open(
      (): Promise<void> =>
        flowResult(this.functionEditorState.runQuery()).catch(
          this.functionEditorState.editorStore.applicationStore
            .alertUnhandledError,
        ),
      PARAMETER_SUBMIT_ACTION.RUN,
    );
  }

  build(query: RawLambda): LambdaParameterState[] {
    const parameters = buildLambdaVariableExpressions(
      query,
      this.functionEditorState.editorStore.graphManagerState,
    )
      .map((parameter) =>
        observe_ValueSpecification(
          parameter,
          this.functionEditorState.editorStore.changeDetectionState
            .observerContext,
        ),
      )
      .filter(filterByType(VariableExpression));
    const states = parameters.map((variable) => {
      const parmeterState = new LambdaParameterState(
        variable,
        this.functionEditorState.editorStore.changeDetectionState.observerContext,
        this.functionEditorState.editorStore.graphManagerState.graph,
      );
      parmeterState.mockParameterValue();
      return parmeterState;
    });
    return states;
  }
}

export class FunctionEditorState extends ElementEditorState {
  readonly functionDefinitionEditorState: FunctionDefinitionEditorState;
  readonly activatorBuilderState: FunctionActivatorBuilderState;

  selectedTab: FUNCTION_EDITOR_TAB;

  isRunningQuery = false;
  isGeneratingPlan = false;
  executionResultText?: string | undefined; // NOTE: stored as lossless JSON string
  executionPlanState: ExecutionPlanState;
  parametersState: FunctionParametersState;
  queryRunPromise: Promise<ExecutionResult> | undefined = undefined;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      selectedTab: observable,
      isRunningQuery: observable,
      isGeneratingPlan: observable,
      executionResultText: observable,
      executionPlanState: observable,
      label: override,
      functionElement: computed,
      setSelectedTab: action,
      reprocess: action,
      setExecutionResultText: action,
      setIsRunningQuery: action,
      runQuery: flow,
      generatePlan: flow,
      handleRunQuery: flow,
      cancelQuery: flow,
    });

    assertType(
      element,
      ConcreteFunctionDefinition,
      'Element inside function editor state must be a function',
    );
    this.selectedTab = FUNCTION_EDITOR_TAB.DEFINITION;
    this.functionDefinitionEditorState = new FunctionDefinitionEditorState(
      element,
      this.editorStore,
    );
    this.activatorBuilderState = new FunctionActivatorBuilderState(this);
    this.executionPlanState = new ExecutionPlanState(
      this.editorStore.applicationStore,
      this.editorStore.graphManagerState,
    );
    this.parametersState = new FunctionParametersState(this);
  }

  override get label(): string {
    return generateFunctionPrettyName(this.functionElement, {
      fullPath: true,
      spacing: false,
    });
  }

  get functionElement(): ConcreteFunctionDefinition {
    return guaranteeType(
      this.element,
      ConcreteFunctionDefinition,
      'Element inside function editor state must be a function',
    );
  }

  setSelectedTab(tab: FUNCTION_EDITOR_TAB): void {
    this.selectedTab = tab;
  }

  override revealCompilationError(compilationError: CompilationError): boolean {
    let revealed = false;
    try {
      if (compilationError.sourceInformation) {
        this.setSelectedTab(FUNCTION_EDITOR_TAB.DEFINITION);
        this.functionDefinitionEditorState.setCompilationError(
          compilationError,
        );
        revealed = true;
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.warn(
        LogEvent.create(GRAPH_MANAGER_EVENT.COMPILATION_FAILURE),
        `Can't locate error`,
        error,
      );
    }
    return revealed;
  }

  override clearCompilationError(): void {
    this.functionDefinitionEditorState.setCompilationError(undefined);
  }

  reprocess(
    newElement: ConcreteFunctionDefinition,
    editorStore: EditorStore,
  ): FunctionEditorState {
    const functionEditorState = new FunctionEditorState(
      editorStore,
      newElement,
    );
    functionEditorState.selectedTab = this.selectedTab;
    return functionEditorState;
  }

  setIsRunningQuery(val: boolean): void {
    this.isRunningQuery = val;
  }

  setExecutionResultText = (executionResult: string | undefined): void => {
    this.executionResultText = executionResult;
  };

  setQueryRunPromise = (
    promise: Promise<ExecutionResult> | undefined,
  ): void => {
    this.queryRunPromise = promise;
  };

  get query(): RawLambda {
    return new RawLambda(
      this.functionElement.parameters.map((parameter) =>
        this.editorStore.graphManagerState.graphManager.serializeRawValueSpecification(
          parameter,
        ),
      ),
      this.functionElement.expressionSequence,
    );
  }

  *generatePlan(debug: boolean): GeneratorFn<void> {
    if (this.isGeneratingPlan) {
      return;
    }
    try {
      const query = this.query;
      this.isGeneratingPlan = true;
      let rawPlan: RawExecutionPlan;

      const stopWatch = new StopWatch();
      const report = reportGraphAnalytics(
        this.editorStore.graphManagerState.graph,
      );

      if (debug) {
        QueryBuilderTelemetryHelper.logEvent_ExecutionPlanDebugLaunched(
          this.editorStore.applicationStore.telemetryService,
        );
        const debugResult =
          (yield this.editorStore.graphManagerState.graphManager.debugExecutionPlanGeneration(
            query,
            undefined,
            undefined,
            this.editorStore.graphManagerState.graph,
            report,
          )) as { plan: RawExecutionPlan; debug: string };
        rawPlan = debugResult.plan;
        this.executionPlanState.setDebugText(debugResult.debug);
      } else {
        QueryBuilderTelemetryHelper.logEvent_ExecutionPlanGenerationLaunched(
          this.editorStore.applicationStore.telemetryService,
        );
        rawPlan =
          (yield this.editorStore.graphManagerState.graphManager.generateExecutionPlan(
            query,
            undefined,
            undefined,
            this.editorStore.graphManagerState.graph,
            report,
          )) as object;
      }

      stopWatch.record();
      try {
        this.executionPlanState.setRawPlan(rawPlan);
        const plan =
          this.editorStore.graphManagerState.graphManager.buildExecutionPlan(
            rawPlan,
            this.editorStore.graphManagerState.graph,
          );
        this.executionPlanState.setPlan(plan);
      } catch {
        // do nothing
      }
      stopWatch.record(QUERY_BUILDER_EVENT.BUILD_EXECUTION_PLAN__SUCCESS);

      // report
      report.timings =
        this.editorStore.applicationStore.timeService.finalizeTimingsRecord(
          stopWatch,
          report.timings,
        );
      if (debug) {
        QueryBuilderTelemetryHelper.logEvent_ExecutionPlanDebugSucceeded(
          this.editorStore.applicationStore.telemetryService,
          report,
        );
      } else {
        QueryBuilderTelemetryHelper.logEvent_ExecutionPlanGenerationSucceeded(
          this.editorStore.applicationStore.telemetryService,
          report,
        );
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.isGeneratingPlan = false;
    }
  }

  *handleRunQuery(): GeneratorFn<void> {
    if (this.isRunningQuery) {
      return;
    }
    const query = this.query;
    const parameters = (query.parameters ?? []) as object[];
    if (parameters.length) {
      this.parametersState.openModal(query);
    } else {
      this.runQuery();
    }
  }

  *runQuery(): GeneratorFn<void> {
    if (this.isRunningQuery) {
      return;
    }

    QueryBuilderTelemetryHelper.logEvent_QueryRunLaunched(
      this.editorStore.applicationStore.telemetryService,
    );

    let promise;
    try {
      this.isRunningQuery = true;
      const stopWatch = new StopWatch();
      const report = reportGraphAnalytics(
        this.editorStore.graphManagerState.graph,
      );
      promise = this.editorStore.graphManagerState.graphManager.runQuery(
        getExecutionQueryFromRawLambda(
          this.query,
          this.parametersState.parameterStates,
          this.editorStore.graphManagerState,
        ),
        undefined,
        undefined,
        this.editorStore.graphManagerState.graph,
        {
          useLosslessParse: true,
          parameterValues: buildExecutionParameterValues(
            this.parametersState.parameterStates,
            this.editorStore.graphManagerState,
          ),
        },
        report,
      );
      this.setQueryRunPromise(promise);
      const result = (yield promise) as ExecutionResult;
      if (this.queryRunPromise === promise) {
        this.setExecutionResultText(
          stringifyLosslessJSON(result, undefined, DEFAULT_TAB_SIZE),
        );
        this.parametersState.setParameters([]);
        // report
        report.timings =
          this.editorStore.applicationStore.timeService.finalizeTimingsRecord(
            stopWatch,
            report.timings,
          );
        QueryBuilderTelemetryHelper.logEvent_QueryRunSucceeded(
          this.editorStore.applicationStore.telemetryService,
          report,
        );
      }
    } catch (error) {
      // When user cancels the query by calling the cancelQuery api, it will throw an execution failure error.
      // For now, we don't want to notify users about this failure. Therefore we check to ensure the promise is still the same one.
      // When cancelled the query, we set the queryRunPromise as undefined.
      if (this.queryRunPromise === promise) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
          error,
        );
        this.editorStore.applicationStore.notificationService.notifyError(
          error,
        );
      }
    } finally {
      this.isRunningQuery = false;
    }
  }

  *cancelQuery(): GeneratorFn<void> {
    this.setIsRunningQuery(false);
    this.setQueryRunPromise(undefined);
    try {
      yield this.editorStore.graphManagerState.graphManager.cancelUserExecutions(
        true,
      );
    } catch (error) {
      // Don't notify users about success or failure
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
    }
  }
}
