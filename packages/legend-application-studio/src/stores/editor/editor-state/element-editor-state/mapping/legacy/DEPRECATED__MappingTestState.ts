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

import type {
  MappingEditorState,
  MappingElementSource,
} from '../MappingEditorState.js';
import {
  type GeneratorFn,
  LogEvent,
  hashObject,
  UnsupportedOperationError,
  guaranteeNonNullable,
  uuid,
  assertTrue,
  assertErrorThrown,
  tryToFormatJSONString,
  fromGrammarString,
  toGrammarString,
  createUrlStringFromData,
  parseLosslessJSON,
  stringifyLosslessJSON,
  tryToMinifyLosslessJSONString,
  tryToFormatLosslessJSONString,
  tryToMinifyJSONString,
  ContentType,
  StopWatch,
} from '@finos/legend-shared';
import type { EditorStore } from '../../../../EditorStore.js';
import { observable, flow, action, makeObservable, flowResult } from 'mobx';
import { createMockDataForMappingElementSource } from '../../../../utils/MockDataUtils.js';
import {
  type RawLambda,
  type Runtime,
  type DEPRECATED__InputData,
  type DEPRECATED__MappingTestAssert,
  type Mapping,
  type RawExecutionPlan,
  type DEPRECATED__MappingTest,
  type ExecutionResult,
  type ExecutionResultWithMetadata,
  extractExecutionResultValues,
  GRAPH_MANAGER_EVENT,
  LAMBDA_PIPE,
  Class,
  DEPRECATED__ExpectedOutputMappingTestAssert,
  DEPRECATED__ObjectInputData,
  ObjectInputType,
  IdentifiedConnection,
  EngineRuntime,
  FlatDataInputData,
  JsonModelConnection,
  FlatDataConnection,
  RootFlatDataRecordType,
  PackageableElementExplicitReference,
  RelationalInputData,
  RelationalInputType,
  DatabaseType,
  RelationalDatabaseConnection,
  LocalH2DatasourceSpecification,
  DefaultH2AuthenticationStrategy,
  buildSourceInformationSourceId,
  TableAlias,
  isStubbed_RawLambda,
  stub_Class,
  generateIdentifiedConnectionId,
  DEPRECATED__validate_MappingTest,
  ModelStore,
  reportGraphAnalytics,
} from '@finos/legend-graph';
import { DEFAULT_TAB_SIZE } from '@finos/legend-application';
import { flatData_setData } from '../../../../../graph-modifier/STO_FlatData_GraphModifierHelper.js';
import {
  expectedOutputMappingTestAssert_setExpectedOutput,
  mappingTest_setAssert,
  DEPRECATED_mappingTest_setQuery,
  objectInputData_setData,
  runtime_addIdentifiedConnection,
  runtime_addMapping,
} from '../../../../../graph-modifier/DSL_Mapping_GraphModifierHelper.js';
import {
  localH2DatasourceSpecification_setTestDataSetupCsv,
  localH2DatasourceSpecification_setTestDataSetupSqls,
  relationalInputData_setData,
} from '../../../../../graph-modifier/STO_Relational_GraphModifierHelper.js';
import {
  LambdaEditorState,
  QueryBuilderTelemetryHelper,
  QUERY_BUILDER_EVENT,
  ExecutionPlanState,
} from '@finos/legend-query-builder';
import { MappingEditorTabState } from '../MappingTabManagerState.js';

export enum TEST_RESULT {
  NONE = 'NONE', // test has not run yet
  ERROR = 'ERROR', // test has error
  FAILED = 'FAILED', // test assertion failed
  PASSED = 'PASSED',
}

export class MappingTestQueryState extends LambdaEditorState {
  editorStore: EditorStore;
  test: DEPRECATED__MappingTest;
  isInitializingLambda = false;
  query: RawLambda;

  constructor(
    editorStore: EditorStore,
    test: DEPRECATED__MappingTest,
    query: RawLambda,
  ) {
    super('', LAMBDA_PIPE);

    makeObservable(this, {
      query: observable,
      isInitializingLambda: observable,
      setIsInitializingLambda: action,
      updateLamba: flow,
    });

    this.test = test;
    this.editorStore = editorStore;
    this.query = query;
  }

  get lambdaId(): string {
    return buildSourceInformationSourceId([this.uuid]);
  }

  setIsInitializingLambda(val: boolean): void {
    this.isInitializingLambda = val;
  }

  *updateLamba(val: RawLambda): GeneratorFn<void> {
    this.query = val;
    DEPRECATED_mappingTest_setQuery(this.test, val);
    yield flowResult(this.convertLambdaObjectToGrammarString({ pretty: true }));
  }

  *convertLambdaObjectToGrammarString(options?: {
    pretty?: boolean | undefined;
    preserveCompilationError?: boolean | undefined;
  }): GeneratorFn<void> {
    if (!isStubbed_RawLambda(this.query)) {
      try {
        const lambdas = new Map<string, RawLambda>();
        lambdas.set(this.lambdaId, this.query);
        const isolatedLambdas =
          (yield this.editorStore.graphManagerState.graphManager.lambdasToPureCode(
            lambdas,
            options?.pretty,
          )) as Map<string, string>;
        const grammarText = isolatedLambdas.get(this.lambdaId);
        this.setLambdaString(
          grammarText !== undefined
            ? this.extractLambdaString(grammarText)
            : '',
        );
        this.clearErrors({
          preserveCompilationError: options?.preserveCompilationError,
        });
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
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

abstract class MappingTestInputDataState {
  readonly uuid = uuid();
  editorStore: EditorStore;
  mapping: Mapping;
  inputData: DEPRECATED__InputData;

  constructor(
    editorStore: EditorStore,
    mapping: Mapping,
    inputData: DEPRECATED__InputData,
  ) {
    this.editorStore = editorStore;
    this.mapping = mapping;
    this.inputData = inputData;
  }

  abstract get runtime(): Runtime;
}

export class MappingTestObjectInputDataState extends MappingTestInputDataState {
  declare inputData: DEPRECATED__ObjectInputData;
  /**
   * @workaround https://github.com/finos/legend-studio/issues/68
   */
  data: string;

  constructor(
    editorStore: EditorStore,
    mapping: Mapping,
    inputData: DEPRECATED__ObjectInputData,
  ) {
    super(editorStore, mapping, inputData);

    makeObservable(this, {
      data: observable,
      setData: action,
    });

    /**
     * @workaround https://github.com/finos/legend-studio/issues/68
     */
    this.data = tryToFormatLosslessJSONString(inputData.data);
  }

  setData(val: string): void {
    this.data = val;
    /**
     * @workaround https://github.com/finos/legend-studio/issues/68
     */
    objectInputData_setData(this.inputData, tryToMinifyLosslessJSONString(val));
  }

  get runtime(): Runtime {
    const engineConfig =
      this.editorStore.graphManagerState.graphManager.TEMPORARY__getEngineConfig();
    const runtime = new EngineRuntime();
    runtime_addMapping(
      runtime,
      PackageableElementExplicitReference.create(this.mapping),
    );
    const connection = new JsonModelConnection(
      PackageableElementExplicitReference.create(ModelStore.INSTANCE),
      PackageableElementExplicitReference.create(
        this.inputData.sourceClass.value,
      ),
      createUrlStringFromData(
        this.inputData.data,
        ContentType.APPLICATION_JSON,
        engineConfig.useBase64ForAdhocConnectionDataUrls,
      ),
    );
    runtime_addIdentifiedConnection(
      runtime,
      new IdentifiedConnection(
        generateIdentifiedConnectionId(runtime),
        connection,
      ),
      this.editorStore.changeDetectionState.observerContext,
    );
    return runtime;
  }
}

export class MappingTestFlatDataInputDataState extends MappingTestInputDataState {
  declare inputData: FlatDataInputData;

  get runtime(): Runtime {
    const engineConfig =
      this.editorStore.graphManagerState.graphManager.TEMPORARY__getEngineConfig();
    const runtime = new EngineRuntime();
    runtime_addMapping(
      runtime,
      PackageableElementExplicitReference.create(this.mapping),
    );
    const connection = new FlatDataConnection(
      PackageableElementExplicitReference.create(
        this.inputData.sourceFlatData.value,
      ),
      createUrlStringFromData(
        this.inputData.data,
        ContentType.TEXT_PLAIN,
        engineConfig.useBase64ForAdhocConnectionDataUrls,
      ),
    );
    runtime_addIdentifiedConnection(
      runtime,
      new IdentifiedConnection(
        generateIdentifiedConnectionId(runtime),
        connection,
      ),
      this.editorStore.changeDetectionState.observerContext,
    );
    return runtime;
  }
}

export class MappingTestRelationalInputDataState extends MappingTestInputDataState {
  declare inputData: RelationalInputData;

  get runtime(): Runtime {
    const datasourceSpecification = new LocalH2DatasourceSpecification();
    switch (this.inputData.inputType) {
      case RelationalInputType.SQL:
        localH2DatasourceSpecification_setTestDataSetupSqls(
          datasourceSpecification,
          // NOTE: this is a gross simplification of handling the input for relational input data
          [this.inputData.data],
        );
        break;
      case RelationalInputType.CSV:
        localH2DatasourceSpecification_setTestDataSetupCsv(
          datasourceSpecification,
          this.inputData.data,
        );
        break;
      default:
        throw new UnsupportedOperationError(`Invalid input data type`);
    }
    const runtime = new EngineRuntime();
    runtime_addMapping(
      runtime,
      PackageableElementExplicitReference.create(this.mapping),
    );
    const connection = new RelationalDatabaseConnection(
      PackageableElementExplicitReference.create(this.inputData.database.value),
      DatabaseType.H2,
      datasourceSpecification,
      new DefaultH2AuthenticationStrategy(),
    );
    runtime_addIdentifiedConnection(
      runtime,
      new IdentifiedConnection(
        generateIdentifiedConnectionId(runtime),
        connection,
      ),
      this.editorStore.changeDetectionState.observerContext,
    );
    return runtime;
  }
}

abstract class MappingTestAssertionState {
  readonly uuid = uuid();
  assert: DEPRECATED__MappingTestAssert;

  constructor(assert: DEPRECATED__MappingTestAssert) {
    this.assert = assert;
  }
}

export class MappingTestExpectedOutputAssertionState extends MappingTestAssertionState {
  declare assert: DEPRECATED__ExpectedOutputMappingTestAssert;
  /**
   * @workaround https://github.com/finos/legend-studio/issues/68
   */
  expectedResult: string;

  constructor(assert: DEPRECATED__ExpectedOutputMappingTestAssert) {
    super(assert);

    makeObservable(this, {
      expectedResult: observable,
      setExpectedResult: action,
    });

    this.expectedResult = fromGrammarString(
      /**
       * @workaround https://github.com/finos/legend-studio/issues/68
       */
      tryToFormatLosslessJSONString(assert.expectedOutput),
    );
  }

  setExpectedResult(val: string): void {
    this.expectedResult = val;
    expectedOutputMappingTestAssert_setExpectedOutput(
      this.assert,
      /**
       * @workaround https://github.com/finos/legend-studio/issues/68
       */
      toGrammarString(tryToMinifyLosslessJSONString(this.expectedResult)),
    );
  }
}

export enum MAPPING_TEST_EDITOR_TAB_TYPE {
  SETUP = 'Test Setup',
  RESULT = 'Test Result',
}

/**
 * TODO: Remove once migration from `MappingTest_Legacy` to `MappingTest` is complete
 * @deprecated
 */
export class DEPRECATED__MappingTestState extends MappingEditorTabState {
  readonly editorStore: EditorStore;
  readonly mappingEditorState: MappingEditorState;

  selectedTab = MAPPING_TEST_EDITOR_TAB_TYPE.SETUP;
  result: TEST_RESULT = TEST_RESULT.NONE;
  test: DEPRECATED__MappingTest;
  runTime = 0;
  isSkipped = false;
  errorRunningTest?: Error | undefined;
  testExecutionResultText?: string | undefined; // NOTE: stored as lossless JSON object text
  isRunningTest = false;
  isExecutingTest = false;
  queryState: MappingTestQueryState;
  inputDataState: MappingTestInputDataState;
  assertionState: MappingTestAssertionState;
  isGeneratingPlan = false;
  executionPlanState: ExecutionPlanState;
  testRunPromise: Promise<ExecutionResultWithMetadata> | undefined = undefined;

  constructor(
    editorStore: EditorStore,
    test: DEPRECATED__MappingTest,
    mappingEditorState: MappingEditorState,
  ) {
    super();

    makeObservable(this, {
      selectedTab: observable,
      result: observable,
      test: observable,
      runTime: observable,
      isSkipped: observable,
      errorRunningTest: observable,
      testExecutionResultText: observable,
      isRunningTest: observable,
      isExecutingTest: observable,
      queryState: observable,
      inputDataState: observable,
      assertionState: observable,
      isGeneratingPlan: observable,
      executionPlanState: observable,
      testRunPromise: observable,
      setIsRunningTest: action,
      setSelectedTab: action,
      setTestRunPromise: action,
      resetTestRunStatus: action,
      setResult: action,
      toggleSkipTest: action,
      setQueryState: action,
      setInputDataState: action,
      setAssertionState: action,
      handleError: action,
      handleResult: action,
      setInputDataStateBasedOnSource: action,
      updateAssertion: action,
      generatePlan: flow,
      regenerateExpectedResult: flow,
      runTest: flow,
      cancelTest: flow,
      onTestStateOpen: flow,
    });

    this.editorStore = editorStore;
    this.mappingEditorState = mappingEditorState;
    this.test = test;
    this.queryState = this.buildQueryState();
    this.inputDataState = this.buildInputDataState();
    this.assertionState = this.buildAssertionState();
    this.executionPlanState = new ExecutionPlanState(
      this.editorStore.applicationStore,
      this.editorStore.graphManagerState,
    );
  }

  get label(): string {
    return this.test.name;
  }

  setIsRunningTest(val: boolean): void {
    this.isRunningTest = val;
  }

  setSelectedTab(val: MAPPING_TEST_EDITOR_TAB_TYPE): void {
    this.selectedTab = val;
  }

  setTestRunPromise(
    promise: Promise<ExecutionResultWithMetadata> | undefined,
  ): void {
    this.testRunPromise = promise;
  }

  buildQueryState(): MappingTestQueryState {
    const queryState = new MappingTestQueryState(
      this.editorStore,
      this.test,
      this.test.query,
    );
    flowResult(queryState.updateLamba(this.test.query)).catch(
      this.editorStore.applicationStore.alertUnhandledError,
    );
    return queryState;
  }

  buildInputDataState(): MappingTestInputDataState {
    // NOTE: right now we only support one input data per test
    assertTrue(
      this.test.inputData.length > 0,
      'Mapping test input data must contain at least one item',
    );
    const inputData = this.test.inputData[0];
    if (inputData instanceof DEPRECATED__ObjectInputData) {
      return new MappingTestObjectInputDataState(
        this.editorStore,
        this.mappingEditorState.mapping,
        inputData,
      );
    } else if (inputData instanceof FlatDataInputData) {
      return new MappingTestFlatDataInputDataState(
        this.editorStore,
        this.mappingEditorState.mapping,
        inputData,
      );
    } else if (inputData instanceof RelationalInputData) {
      return new MappingTestRelationalInputDataState(
        this.editorStore,
        this.mappingEditorState.mapping,
        inputData,
      );
    }
    throw new UnsupportedOperationError(
      `Can't build state for mapping test input data`,
      inputData,
    );
  }

  buildAssertionState(): MappingTestAssertionState {
    const testAssertion = this.test.assert;
    if (testAssertion instanceof DEPRECATED__ExpectedOutputMappingTestAssert) {
      return new MappingTestExpectedOutputAssertionState(testAssertion);
    }
    throw new UnsupportedOperationError(
      `Can't build state of mapping test assertion`,
      testAssertion,
    );
  }

  resetTestRunStatus(): void {
    this.testExecutionResultText = undefined;
    this.runTime = 0;
    this.setResult(TEST_RESULT.NONE);
  }

  setResult(result: TEST_RESULT): void {
    this.result = result;
  }

  toggleSkipTest(): void {
    this.isSkipped = !this.isSkipped;
  }

  setQueryState(queryState: MappingTestQueryState): void {
    this.queryState = queryState;
  }

  setInputDataState(inputDataState: MappingTestInputDataState): void {
    this.inputDataState = inputDataState;
  }

  setAssertionState(assertionState: MappingTestAssertionState): void {
    this.assertionState = assertionState;
  }

  setInputDataStateBasedOnSource(
    source: MappingElementSource,
    populateWithMockData: boolean,
  ): void {
    if (source === undefined || source instanceof Class) {
      // NOTE: By default use object input data if no source is provided
      const newInputDataState = new MappingTestObjectInputDataState(
        this.editorStore,
        this.mappingEditorState.mapping,
        new DEPRECATED__ObjectInputData(
          PackageableElementExplicitReference.create(source ?? stub_Class()),
          ObjectInputType.JSON,
          tryToMinifyJSONString('{}'),
        ),
      );
      if (populateWithMockData) {
        if (source) {
          objectInputData_setData(
            newInputDataState.inputData,
            createMockDataForMappingElementSource(source, this.editorStore),
          );
        }
      }
      this.setInputDataState(newInputDataState);
    } else if (source instanceof RootFlatDataRecordType) {
      const newInputDataState = new MappingTestFlatDataInputDataState(
        this.editorStore,
        this.mappingEditorState.mapping,
        new FlatDataInputData(
          PackageableElementExplicitReference.create(
            guaranteeNonNullable(source._OWNER._OWNER),
          ),
          '',
        ),
      );
      if (populateWithMockData) {
        flatData_setData(
          newInputDataState.inputData,
          createMockDataForMappingElementSource(source, this.editorStore),
        );
      }
      this.setInputDataState(newInputDataState);
    } else if (source instanceof TableAlias) {
      const newInputDataState = new MappingTestRelationalInputDataState(
        this.editorStore,
        this.mappingEditorState.mapping,
        new RelationalInputData(
          PackageableElementExplicitReference.create(
            source.relation.ownerReference.value,
          ),
          '',
          RelationalInputType.SQL,
        ),
      );
      if (populateWithMockData) {
        relationalInputData_setData(
          newInputDataState.inputData,
          createMockDataForMappingElementSource(source, this.editorStore),
        );
      }
      this.setInputDataState(newInputDataState);
    } else {
      this.editorStore.applicationStore.notificationService.notifyWarning(
        new UnsupportedOperationError(
          `Can't build input data for source`,
          source,
        ),
      );
    }
  }

  /**
   * Execute mapping using current info in the test detail panel then set the execution result value as test expected result
   */
  *regenerateExpectedResult(): GeneratorFn<void> {
    if (DEPRECATED__validate_MappingTest(this.test)) {
      this.editorStore.applicationStore.notificationService.notifyError(
        `Can't execute test '${this.test.name}'. Please make sure that the test query and input data are valid`,
      );
      return;
    } else if (this.isExecutingTest) {
      this.editorStore.applicationStore.notificationService.notifyWarning(
        `Can't execute test '${this.test.name}' while it is running`,
      );
      return;
    }
    try {
      const query = this.queryState.query;
      const runtime = this.inputDataState.runtime;
      this.isExecutingTest = true;
      const result = (
        (yield this.editorStore.graphManagerState.graphManager.runQuery(
          query,
          this.mappingEditorState.mapping,
          runtime,
          this.editorStore.graphManagerState.graph,
          {
            useLosslessParse: true,
          },
        )) as ExecutionResultWithMetadata
      ).executionResult;
      if (
        this.assertionState instanceof MappingTestExpectedOutputAssertionState
      ) {
        this.assertionState.setExpectedResult(
          stringifyLosslessJSON(
            extractExecutionResultValues(result),
            undefined,
            DEFAULT_TAB_SIZE,
          ),
        );
        this.updateAssertion();
      } else {
        throw new UnsupportedOperationError();
      }
    } catch (error) {
      assertErrorThrown(error);
      if (
        this.assertionState instanceof MappingTestExpectedOutputAssertionState
      ) {
        this.assertionState.setExpectedResult(tryToFormatJSONString('{}'));
        this.updateAssertion();
      } else {
        throw new UnsupportedOperationError();
      }
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.isExecutingTest = false;
    }
  }

  handleResult(result: ExecutionResult): void {
    this.testExecutionResultText = stringifyLosslessJSON(
      extractExecutionResultValues(result),
      undefined,
      DEFAULT_TAB_SIZE,
    );
    let assertionMatched = false;
    if (
      this.assertionState instanceof MappingTestExpectedOutputAssertionState
    ) {
      // TODO: this logic should probably be better handled in by engine mapping test runner
      assertionMatched =
        hashObject(extractExecutionResultValues(result)) ===
        hashObject(parseLosslessJSON(this.assertionState.expectedResult));
    } else {
      throw new UnsupportedOperationError();
    }
    this.setResult(assertionMatched ? TEST_RESULT.PASSED : TEST_RESULT.FAILED);
    this.isExecutingTest = false;
    this.isRunningTest = false;
  }

  handleError(
    error: Error,
    promise: Promise<ExecutionResultWithMetadata> | undefined,
  ): void {
    assertErrorThrown(error);
    this.editorStore.applicationStore.logService.error(
      LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
      error,
    );

    if (
      this.mappingEditorState.isRunningAllTests ||
      this.testRunPromise === promise
    ) {
      this.errorRunningTest = error;
      this.setResult(TEST_RESULT.ERROR);
    }
    this.isExecutingTest = false;
    this.isRunningTest = false;
  }

  *onTestStateOpen(openTab?: MAPPING_TEST_EDITOR_TAB_TYPE): GeneratorFn<void> {
    try {
      // extract test basic info out into state
      this.queryState = this.buildQueryState();
      this.inputDataState = this.buildInputDataState();
      this.assertionState = this.buildAssertionState();
      // if the test has result, open the test result tab
      if (openTab) {
        this.setSelectedTab(openTab);
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error.message,
      );
      yield flowResult(this.editorStore.graphEditorMode.globalCompile()); // recompile graph if there is problem with the deep fetch tree of a test
    }
  }

  updateAssertion(): void {
    mappingTest_setAssert(
      this.test,
      this.assertionState.assert,
      this.editorStore.changeDetectionState.observerContext,
    );
  }

  *runTest(): GeneratorFn<void> {
    if (DEPRECATED__validate_MappingTest(this.test)) {
      this.editorStore.applicationStore.notificationService.notifyError(
        `Can't run test '${this.test.name}'. Please make sure that the test is valid`,
      );
      return;
    } else if (this.isExecutingTest) {
      this.editorStore.applicationStore.notificationService.notifyWarning(
        `Test '${this.test.name}' is already running`,
      );
      return;
    }
    const startTime = Date.now();
    let promise;
    try {
      const runtime = this.inputDataState.runtime;
      this.isRunningTest = true;
      promise = this.editorStore.graphManagerState.graphManager.runQuery(
        this.test.query,
        this.mappingEditorState.mapping,
        runtime,
        this.editorStore.graphManagerState.graph,
        {
          useLosslessParse: true,
        },
      );
      this.setTestRunPromise(promise);
      const result = (yield promise) as ExecutionResultWithMetadata;
      if (this.testRunPromise === promise) {
        this.handleResult(result.executionResult);
      }
    } catch (error) {
      // When user cancels the query by calling the cancelQuery api, it will throw an execution failure error.
      // For now, we don't want to notify users about this failure. Therefore we check to ensure the promise is still the same one.
      // When cancelled the query, we set the queryRunPromise as undefined.
      if (this.testRunPromise === promise) {
        assertErrorThrown(error);
        this.handleError(error, promise);
      }
    } finally {
      this.isRunningTest = false;
      this.runTime = Date.now() - startTime;
      // if the test is currently opened and ran but did not pass, switch to the result tab
      if (
        [TEST_RESULT.FAILED, TEST_RESULT.ERROR].includes(this.result) &&
        this.testRunPromise === promise &&
        this.mappingEditorState.currentTabState === this
      ) {
        this.setSelectedTab(MAPPING_TEST_EDITOR_TAB_TYPE.RESULT);
      }
    }
  }

  *cancelTest(): GeneratorFn<void> {
    this.setIsRunningTest(false);
    this.setTestRunPromise(undefined);
    try {
      yield this.editorStore.graphManagerState.graphManager.cancelUserExecutions(
        true,
      );
    } catch (error) {
      // don't notify users about success or failure
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
    }
  }

  *generatePlan(debug: boolean): GeneratorFn<void> {
    try {
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
            this.queryState.query,
            this.mappingEditorState.mapping,
            this.inputDataState.runtime,
            this.editorStore.graphManagerState.graph,
            undefined,
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
            this.queryState.query,
            this.mappingEditorState.mapping,
            this.inputDataState.runtime,
            this.editorStore.graphManagerState.graph,
            undefined,
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
}
