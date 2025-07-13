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
  filterByType,
  assertTrue,
  ActionState,
} from '@finos/legend-shared';
import { ElementEditorState } from './ElementEditorState.js';
import {
  type CompilationError,
  type PackageableElement,
  type ExecutionResult,
  type RawExecutionPlan,
  type ExecutionResultWithMetadata,
  GRAPH_MANAGER_EVENT,
  LAMBDA_PIPE,
  ParserError,
  ConcreteFunctionDefinition,
  RawLambda,
  buildSourceInformationSourceId,
  isStubbed_PackageableElement,
  reportGraphAnalytics,
  buildLambdaVariableExpressions,
  VariableExpression,
  observe_ValueSpecification,
  generateFunctionPrettyName,
  RawVariableExpression,
  type FunctionActivator,
  CodeCompletionResult,
  type RawLineageModel,
} from '@finos/legend-graph';
import {
  ExecutionPlanState,
  LineageState,
  LambdaEditorState,
  LambdaParameterState,
  LambdaParametersState,
  PARAMETER_SUBMIT_ACTION,
  QUERY_BUILDER_EVENT,
  QueryBuilderTelemetryHelper,
  buildExecutionParameterValues,
  getExecutionQueryFromRawLambda,
  getRawLambdaForLetFuncs,
} from '@finos/legend-query-builder';
import { FunctionActivatorState } from './FunctionActivatorState.js';
import { FunctionTestableState } from './function-activator/testable/FunctionTestableState.js';
import { openDataCube } from '../../data-cube/LegendStudioDataCubeHelper.js';

export enum FUNCTION_EDITOR_TAB {
  DEFINITION = 'DEFINITION',
  TAGGED_VALUES = 'TAGGED_VALUES',
  STEREOTYPES = 'STEREOTYPES',
  TEST_SUITES = 'TEST_SUITES',
  LAMBDAS = 'LAMBDAS',
}

export class FunctionDefinitionEditorState extends LambdaEditorState {
  readonly editorStore: EditorStore;
  readonly functionElement: ConcreteFunctionDefinition;
  convertingGrammarToProtocolAction = ActionState.create();

  isConvertingFunctionBodyToString = false;

  constructor(
    functionElement: ConcreteFunctionDefinition,
    editorStore: EditorStore,
  ) {
    super('', LAMBDA_PIPE, {
      typeAheadEnabled:
        editorStore.applicationStore.config.options.typeAheadEnabled,
    });

    makeObservable(this, {
      functionElement: observable,
      isConvertingFunctionBodyToString: observable,
      convertingGrammarToProtocolAction: observable,
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
        this.convertingGrammarToProtocolAction.inProgress();
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
      } finally {
        this.convertingGrammarToProtocolAction.complete();
      }
    } else {
      this.clearErrors();
      this.functionElement.expressionSequence = [];
    }
  }

  *convertLambdaObjectToGrammarString(options?: {
    pretty?: boolean | undefined;
    preserveCompilationError?: boolean | undefined;
    firstLoad?: boolean | undefined;
  }): GeneratorFn<void> {
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
            options?.pretty,
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
        if (!options?.firstLoad) {
          this.clearErrors({
            preserveCompilationError: options?.preserveCompilationError,
          });
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

  override async getCodeComplete(input: string): Promise<CodeCompletionResult> {
    try {
      return (await this.editorStore.graphManagerState.graphManager.getCodeComplete(
        input,
        this.editorStore.graphManagerState.graph,
        undefined,
        {
          ignoreElements: [this.functionElement.path],
        },
      )) as unknown as CodeCompletionResult;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
        error,
      );
      return new CodeCompletionResult();
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

  openModal(lambda: RawLambda): void {
    this.parameterStates = this.build(lambda);
    this.parameterValuesEditorState.open(
      (): Promise<void> =>
        flowResult(this.functionEditorState.runFunc()).catch(
          this.functionEditorState.editorStore.applicationStore
            .alertUnhandledError,
        ),
      PARAMETER_SUBMIT_ACTION.RUN,
    );
  }

  openDataCubeModal(
    query: RawLambda,
    element: PackageableElement,
    editorStore: EditorStore,
  ): void {
    this.parameterStates = this.build(query);
    this.parameterValuesEditorState.open(
      (): Promise<void> =>
        this.functionEditorState
          .openingDataCube(element, editorStore)
          .catch(
            this.functionEditorState.editorStore.applicationStore
              .alertUnhandledError,
          ),
      PARAMETER_SUBMIT_ACTION.RUN,
    );
  }

  build(lambda: RawLambda): LambdaParameterState[] {
    const parameters = buildLambdaVariableExpressions(
      lambda,
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
  readonly activatorPromoteState: FunctionActivatorState;
  readonly functionTestableEditorState: FunctionTestableState;

  selectedTab: FUNCTION_EDITOR_TAB;

  isRunningFunc = false;
  isGeneratingPlan = false;
  isGeneratingLineage = false;
  executionResult?: ExecutionResult | undefined; // NOTE: stored as lossless JSON string
  executionPlanState: ExecutionPlanState;
  parametersState: FunctionParametersState;
  lineageState: LineageState;
  funcRunPromise: Promise<ExecutionResultWithMetadata> | undefined = undefined;

  constructor(editorStore: EditorStore, element: PackageableElement) {
    super(editorStore, element);

    makeObservable(this, {
      selectedTab: observable,
      isRunningFunc: observable,
      isGeneratingPlan: observable,
      isGeneratingLineage: observable,
      executionResult: observable,
      executionPlanState: observable,
      label: override,
      functionElement: computed,
      setSelectedTab: action,
      reprocess: action,
      setExecutionResult: action,
      setIsRunningFunc: action,
      runFunc: flow,
      generatePlan: flow,
      handleRunFunc: flow,
      cancelFuncRun: flow,
      updateFunctionWithQuery: flow,
      generateLineage: flow,
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
    this.activatorPromoteState = new FunctionActivatorState(this);
    this.executionPlanState = new ExecutionPlanState(
      this.editorStore.applicationStore,
      this.editorStore.graphManagerState,
    );
    this.parametersState = new FunctionParametersState(this);
    this.functionTestableEditorState = new FunctionTestableState(this);
    this.lineageState = new LineageState(this.editorStore.applicationStore);
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

  get activators(): FunctionActivator[] {
    const allActivators =
      this.editorStore.graphManagerState.graph.functionActivators;
    return allActivators.filter(
      (activator: FunctionActivator) =>
        activator.function.value === this.element,
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

  *updateFunctionWithQuery(val: RawLambda): GeneratorFn<void> {
    const lambdaParam = val.parameters ? (val.parameters as object[]) : [];
    const parameters = lambdaParam
      .map((param) =>
        this.editorStore.graphManagerState.graphManager.buildRawValueSpecification(
          param,
          this.editorStore.graphManagerState.graph,
        ),
      )
      .map((rawValueSpec) =>
        guaranteeType(rawValueSpec, RawVariableExpression),
      );
    assertTrue(
      Array.isArray(val.body),
      `Query body expected to be a list of expressions`,
    );
    this.functionElement.expressionSequence = val.body as object[];
    this.functionElement.parameters = parameters;
    yield flowResult(
      this.functionDefinitionEditorState.convertLambdaObjectToGrammarString({
        pretty: true,
        firstLoad: true,
      }),
    );
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

  setIsRunningFunc(val: boolean): void {
    this.isRunningFunc = val;
  }

  setExecutionResult = (executionResult: ExecutionResult | undefined): void => {
    this.executionResult = executionResult;
  };

  setFuncRunPromise = (
    promise: Promise<ExecutionResultWithMetadata> | undefined,
  ): void => {
    this.funcRunPromise = promise;
  };

  get bodyExpressionSequence(): RawLambda {
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
      const expressionSequence = this.bodyExpressionSequence;
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
            expressionSequence,
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
            expressionSequence,
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
        this.executionPlanState.initialize(plan);
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

  async handleOpeningDataCube(
    element: PackageableElement,
    editorStore: EditorStore,
  ): Promise<void> {
    const query = this.bodyExpressionSequence;
    const parameters = (query.parameters ?? []) as object[];
    if (parameters.length) {
      this.parametersState.openDataCubeModal(query, element, editorStore);
    } else {
      await openDataCube(element, editorStore);
    }
  }

  async openingDataCube(
    element: PackageableElement,
    editorStore: EditorStore,
  ): Promise<void> {
    const params = buildExecutionParameterValues(
      this.parametersState.parameterStates,
      this.editorStore.graphManagerState,
    );

    const letFuncsRawLambda = getRawLambdaForLetFuncs(
      this.parametersState.parameterStates,
      this.editorStore.graphManagerState,
    );

    await openDataCube(element, editorStore, params, letFuncsRawLambda);
  }

  *handleRunFunc(): GeneratorFn<void> {
    if (this.isRunningFunc) {
      return;
    }
    const expressionSequence = this.bodyExpressionSequence;
    const parameters = (expressionSequence.parameters ?? []) as object[];
    if (parameters.length) {
      this.parametersState.openModal(expressionSequence);
    } else {
      this.runFunc();
    }
  }

  *runFunc(): GeneratorFn<void> {
    if (this.isRunningFunc) {
      return;
    }

    QueryBuilderTelemetryHelper.logEvent_QueryRunLaunched(
      this.editorStore.applicationStore.telemetryService,
    );
    // assure that you are using the latest protocol
    try {
      yield flowResult(
        this.functionDefinitionEditorState.convertLambdaGrammarStringToObject(),
      ).catch(this.editorStore.applicationStore.alertUnhandledError);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
      return;
    }
    let promise;
    try {
      this.isRunningFunc = true;
      const stopWatch = new StopWatch();
      const report = reportGraphAnalytics(
        this.editorStore.graphManagerState.graph,
      );
      promise = this.editorStore.graphManagerState.graphManager.runQuery(
        getExecutionQueryFromRawLambda(
          this.bodyExpressionSequence,
          this.parametersState.parameterStates,
          this.editorStore.graphManagerState,
        ),
        undefined,
        undefined,
        this.editorStore.graphManagerState.graph,
        {
          useLosslessParse: false,
          parameterValues: buildExecutionParameterValues(
            this.parametersState.parameterStates,
            this.editorStore.graphManagerState,
          ),
        },
        report,
      );
      this.setFuncRunPromise(promise);
      const result = (yield promise) as ExecutionResultWithMetadata;
      if (this.funcRunPromise === promise) {
        this.setExecutionResult(result.executionResult);
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
      if (this.funcRunPromise === promise) {
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
      this.isRunningFunc = false;
    }
  }

  *cancelFuncRun(): GeneratorFn<void> {
    this.setIsRunningFunc(false);
    this.setFuncRunPromise(undefined);
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

  *generateLineage(): GeneratorFn<void> {
    if (this.isGeneratingLineage) {
      return;
    }
    try {
      this.isGeneratingLineage = true;
      const expressionSequence = this.bodyExpressionSequence;
      const lineageRawData =
        (yield this.editorStore.graphManagerState.graphManager.generateLineage(
          expressionSequence,
          undefined,
          undefined,
          this.editorStore.graphManagerState.graph,
          undefined,
        )) as RawLineageModel;

      const lineageData =
        this.editorStore.graphManagerState.graphManager.buildLineage(
          lineageRawData,
        );

      this.lineageState.setLineageData(lineageData);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.LINEAGE_GENERATION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.isGeneratingLineage = false;
    }
  }
}
