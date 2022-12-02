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
} from './MappingEditorState.js';
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
} from '@finos/legend-shared';
import type { EditorStore } from '../../../EditorStore.js';
import { observable, flow, action, makeObservable, flowResult } from 'mobx';
import { createMockDataForMappingElementSource } from '../../../shared/MockDataUtils.js';
import {
  type RawLambda,
  type Runtime,
  type InputData,
  type MappingTestAssert,
  type Mapping,
  type ExecutionResult,
  extractExecutionResultValues,
  GRAPH_MANAGER_EVENT,
  LAMBDA_PIPE,
  Class,
  ExpectedOutputMappingTestAssert,
  ObjectInputData,
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
  type RawExecutionPlan,
  isStubbed_RawLambda,
  stub_Class,
  generateIdentifiedConnectionId,
  DEPRECATED__validate_MappingTest,
  type DEPRECATED__MappingTest,
  ModelStore,
} from '@finos/legend-graph';
import { ExecutionPlanState, TAB_SIZE } from '@finos/legend-application';
import { flatData_setData } from '../../../shared/modifier/STO_FlatData_GraphModifierHelper.js';
import {
  expectedOutputMappingTestAssert_setExpectedOutput,
  mappingTest_setAssert,
  mappingTest_setQuery,
  objectInputData_setData,
  runtime_addIdentifiedConnection,
  runtime_addMapping,
} from '../../../shared/modifier/DSL_Mapping_GraphModifierHelper.js';
import {
  localH2DatasourceSpecification_setTestDataSetupCsv,
  localH2DatasourceSpecification_setTestDataSetupSqls,
  relationalInputData_setData,
} from '../../../shared/modifier/STO_Relational_GraphModifierHelper.js';
import { LambdaEditorState } from '@finos/legend-query-builder';
import { MappingEditorTabState } from './MappingTabManagerState.js';

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
    mappingTest_setQuery(this.test, val);
    yield flowResult(this.convertLambdaObjectToGrammarString(true));
  }

  *convertLambdaObjectToGrammarString(pretty?: boolean): GeneratorFn<void> {
    if (!isStubbed_RawLambda(this.query)) {
      try {
        const lambdas = new Map<string, RawLambda>();
        lambdas.set(this.lambdaId, this.query);
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
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.log.error(
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
  inputData: InputData;

  constructor(
    editorStore: EditorStore,
    mapping: Mapping,
    inputData: InputData,
  ) {
    this.editorStore = editorStore;
    this.mapping = mapping;
    this.inputData = inputData;
  }

  abstract get runtime(): Runtime;
}

export class MappingTestObjectInputDataState extends MappingTestInputDataState {
  declare inputData: ObjectInputData;
  /**
   * @workaround https://github.com/finos/legend-studio/issues/68
   */
  data: string;

  constructor(
    editorStore: EditorStore,
    mapping: Mapping,
    inputData: ObjectInputData,
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
  assert: MappingTestAssert;

  constructor(assert: MappingTestAssert) {
    this.assert = assert;
  }
}

export class MappingTestExpectedOutputAssertionState extends MappingTestAssertionState {
  declare assert: ExpectedOutputMappingTestAssert;
  /**
   * @workaround https://github.com/finos/legend-studio/issues/68
   */
  expectedResult: string;

  constructor(assert: ExpectedOutputMappingTestAssert) {
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

export class MappingTestState extends MappingEditorTabState {
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
  testRunPromise: Promise<ExecutionResult> | undefined = undefined;

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
      setInputDataStateBasedOnSource: action,
      updateAssertion: action,
      generatePlan: flow,
      regenerateExpectedResult: flow,
      runTest: flow,
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

  setTestRunPromise(promise: Promise<ExecutionResult> | undefined): void {
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
    if (inputData instanceof ObjectInputData) {
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
    if (testAssertion instanceof ExpectedOutputMappingTestAssert) {
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
    source: MappingElementSource | undefined,
    populateWithMockData: boolean,
  ): void {
    if (source === undefined || source instanceof Class) {
      // NOTE: By default use object input data if no source is provided
      const newInputDataState = new MappingTestObjectInputDataState(
        this.editorStore,
        this.mappingEditorState.mapping,
        new ObjectInputData(
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
      this.editorStore.applicationStore.notifyWarning(
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
      this.editorStore.applicationStore.notifyError(
        `Can't execute test '${this.test.name}'. Please make sure that the test query and input data are valid`,
      );
      return;
    } else if (this.isExecutingTest) {
      this.editorStore.applicationStore.notifyWarning(
        `Can't execute test '${this.test.name}' while it is running`,
      );
      return;
    }
    try {
      const query = this.queryState.query;
      const runtime = this.inputDataState.runtime;
      this.isExecutingTest = true;
      const result =
        (yield this.editorStore.graphManagerState.graphManager.executeMapping(
          query,
          this.mappingEditorState.mapping,
          runtime,
          this.editorStore.graphManagerState.graph,
          {
            useLosslessParse: true,
          },
        )) as ExecutionResult;
      if (
        this.assertionState instanceof MappingTestExpectedOutputAssertionState
      ) {
        this.assertionState.setExpectedResult(
          stringifyLosslessJSON(
            extractExecutionResultValues(result),
            undefined,
            TAB_SIZE,
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
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isExecutingTest = false;
    }
  }

  *runTest(): GeneratorFn<void> {
    if (DEPRECATED__validate_MappingTest(this.test)) {
      this.editorStore.applicationStore.notifyError(
        `Can't run test '${this.test.name}'. Please make sure that the test is valid`,
      );
      return;
    } else if (this.isExecutingTest) {
      this.editorStore.applicationStore.notifyWarning(
        `Test '${this.test.name}' is already running`,
      );
      return;
    }
    const startTime = Date.now();
    let promise;
    try {
      const runtime = this.inputDataState.runtime;
      this.isRunningTest = true;
      promise = this.editorStore.graphManagerState.graphManager.executeMapping(
        this.test.query,
        this.mappingEditorState.mapping,
        runtime,
        this.editorStore.graphManagerState.graph,
        {
          useLosslessParse: true,
        },
      );
      this.setTestRunPromise(promise);
      const result = (yield promise) as ExecutionResult;
      if (this.testRunPromise === promise) {
        this.testExecutionResultText = stringifyLosslessJSON(
          extractExecutionResultValues(result),
          undefined,
          TAB_SIZE,
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
        this.setResult(
          assertionMatched ? TEST_RESULT.PASSED : TEST_RESULT.FAILED,
        );
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      if (this.testRunPromise === promise) {
        this.errorRunningTest = error;
        this.setResult(TEST_RESULT.ERROR);
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
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error.message,
      );
      yield flowResult(this.editorStore.graphState.globalCompileInFormMode()); // recompile graph if there is problem with the deep fetch tree of a test
    }
  }

  updateAssertion(): void {
    mappingTest_setAssert(
      this.test,
      this.assertionState.assert,
      this.editorStore.changeDetectionState.observerContext,
    );
  }

  *generatePlan(debug: boolean): GeneratorFn<void> {
    try {
      this.isGeneratingPlan = true;
      let rawPlan: RawExecutionPlan;
      if (debug) {
        const debugResult =
          (yield this.editorStore.graphManagerState.graphManager.debugExecutionPlanGeneration(
            this.queryState.query,
            this.mappingEditorState.mapping,
            this.inputDataState.runtime,
            this.editorStore.graphManagerState.graph,
          )) as { plan: RawExecutionPlan; debug: string };
        rawPlan = debugResult.plan;
        this.executionPlanState.setDebugText(debugResult.debug);
      } else {
        rawPlan =
          (yield this.editorStore.graphManagerState.graphManager.generateExecutionPlan(
            this.queryState.query,
            this.mappingEditorState.mapping,
            this.inputDataState.runtime,
            this.editorStore.graphManagerState.graph,
          )) as object;
      }
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
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isGeneratingPlan = false;
    }
  }
}
