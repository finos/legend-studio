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
} from './MappingEditorState';
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
  losslessParse,
  losslessStringify,
  tryToMinifyLosslessJSONString,
  tryToFormatLosslessJSONString,
  tryToMinifyJSONString,
} from '@finos/legend-shared';
import type { EditorStore } from '../../../EditorStore';
import {
  observable,
  flow,
  action,
  makeObservable,
  makeAutoObservable,
  flowResult,
} from 'mobx';
import { createMockDataForMappingElementSource } from '../../../shared/MockDataUtil';
import { ExecutionPlanState } from '../../../ExecutionPlanState';
import {
  type MappingTest,
  type RawLambda,
  type Runtime,
  type InputData,
  type MappingTestAssert,
  type Mapping,
  type ExecutionResult,
  extractExecutionResultValues,
  GRAPH_MANAGER_LOG_EVENT,
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
  PureClientVersion,
  TableAlias,
} from '@finos/legend-graph';
import { LambdaEditorState, TAB_SIZE } from '@finos/legend-application';

export enum TEST_RESULT {
  NONE = 'NONE', // test has not run yet
  ERROR = 'ERROR', // test has error
  FAILED = 'FAILED', // test assertion failed
  PASSED = 'PASSED',
}

export class MappingTestQueryState extends LambdaEditorState {
  editorStore: EditorStore;
  test: MappingTest;
  isInitializingLambda = false;
  query: RawLambda;

  constructor(editorStore: EditorStore, test: MappingTest, query: RawLambda) {
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
    this.test.setQuery(val);
    yield flowResult(this.convertLambdaObjectToGrammarString(true));
  }

  *convertLambdaObjectToGrammarString(pretty?: boolean): GeneratorFn<void> {
    if (!this.query.isStub) {
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

abstract class MappingTestInputDataState {
  uuid = uuid();
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
  /* @MARKER: Workaround for https://github.com/finos/legend-studio/issues/68 */
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

    /* @MARKER: Workaround for https://github.com/finos/legend-studio/issues/68 */
    this.data = tryToFormatLosslessJSONString(inputData.data);
  }

  setData(val: string): void {
    this.data = val;
    /* @MARKER: Workaround for https://github.com/finos/legend-studio/issues/68 */
    this.inputData.setData(tryToMinifyLosslessJSONString(val));
  }

  get runtime(): Runtime {
    const engineConfig =
      this.editorStore.graphManagerState.graphManager.TEMP__getEngineConfig();
    const runtime = new EngineRuntime();
    runtime.addMapping(
      PackageableElementExplicitReference.create(this.mapping),
    );
    const connection = new JsonModelConnection(
      PackageableElementExplicitReference.create(
        this.editorStore.graphManagerState.graph.modelStore,
      ),
      PackageableElementExplicitReference.create(
        this.inputData.sourceClass.value,
      ),
      createUrlStringFromData(
        this.inputData.data,
        JsonModelConnection.CONTENT_TYPE,
        engineConfig.useBase64ForAdhocConnectionDataUrls,
      ),
    );
    runtime.addIdentifiedConnection(
      new IdentifiedConnection(
        runtime.generateIdentifiedConnectionId(),
        connection,
      ),
    );
    return runtime;
  }
}

export class MappingTestFlatDataInputDataState extends MappingTestInputDataState {
  declare inputData: FlatDataInputData;

  get runtime(): Runtime {
    const engineConfig =
      this.editorStore.graphManagerState.graphManager.TEMP__getEngineConfig();
    const runtime = new EngineRuntime();
    runtime.addMapping(
      PackageableElementExplicitReference.create(this.mapping),
    );
    const connection = new FlatDataConnection(
      PackageableElementExplicitReference.create(
        this.inputData.sourceFlatData.value,
      ),
      createUrlStringFromData(
        this.inputData.data,
        FlatDataConnection.CONTENT_TYPE,
        engineConfig.useBase64ForAdhocConnectionDataUrls,
      ),
    );
    runtime.addIdentifiedConnection(
      new IdentifiedConnection(
        runtime.generateIdentifiedConnectionId(),
        connection,
      ),
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
        datasourceSpecification.setTestDataSetupSqls(
          // NOTE: this is a gross simplification of handling the input for relational input data
          [this.inputData.data],
        );
        break;
      case RelationalInputType.CSV:
        datasourceSpecification.setTestDataSetupCsv(this.inputData.data);
        break;
      default:
        throw new UnsupportedOperationError(`Invalid input data type`);
    }
    const runtime = new EngineRuntime();
    runtime.addMapping(
      PackageableElementExplicitReference.create(this.mapping),
    );
    const connection = new RelationalDatabaseConnection(
      PackageableElementExplicitReference.create(this.inputData.database.value),
      DatabaseType.H2,
      datasourceSpecification,
      new DefaultH2AuthenticationStrategy(),
    );
    runtime.addIdentifiedConnection(
      new IdentifiedConnection(
        runtime.generateIdentifiedConnectionId(),
        connection,
      ),
    );
    return runtime;
  }
}

abstract class MappingTestAssertionState {
  uuid = uuid();
  assert: MappingTestAssert;

  constructor(assert: MappingTestAssert) {
    this.assert = assert;
  }
}

export class MappingTestExpectedOutputAssertionState extends MappingTestAssertionState {
  declare assert: ExpectedOutputMappingTestAssert;
  /* @MARKER: Workaround for https://github.com/finos/legend-studio/issues/68 */
  expectedResult: string;

  constructor(assert: ExpectedOutputMappingTestAssert) {
    super(assert);

    makeObservable(this, {
      expectedResult: observable,
      setExpectedResult: action,
    });

    this.expectedResult = fromGrammarString(
      /* @MARKER: Workaround for https://github.com/finos/legend-studio/issues/68 */
      tryToFormatLosslessJSONString(assert.expectedOutput),
    );
  }

  setExpectedResult(val: string): void {
    this.expectedResult = val;
    this.assert.setExpectedOutput(
      /* @MARKER: Workaround for https://github.com/finos/legend-studio/issues/68 */
      toGrammarString(tryToMinifyLosslessJSONString(this.expectedResult)),
    );
  }
}

export enum MAPPING_TEST_EDITOR_TAB_TYPE {
  SETUP = 'Test Setup',
  RESULT = 'Test Result',
}

export class MappingTestState {
  uuid = uuid();
  selectedTab = MAPPING_TEST_EDITOR_TAB_TYPE.SETUP;
  editorStore: EditorStore;
  mappingEditorState: MappingEditorState;
  result: TEST_RESULT = TEST_RESULT.NONE;
  test: MappingTest;
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

  constructor(
    editorStore: EditorStore,
    test: MappingTest,
    mappingEditorState: MappingEditorState,
  ) {
    makeAutoObservable(this, {
      uuid: false,
      editorStore: false,
      mappingEditorState: false,
      setSelectedTab: action,
      resetTestRunStatus: action,
      setResult: action,
      toggleSkipTest: action,
      setQueryState: action,
      setInputDataState: action,
      setAssertionState: action,
      setInputDataStateBasedOnSource: action,
      updateAssertion: action,
      generatePlan: flow,
    });

    this.editorStore = editorStore;
    this.mappingEditorState = mappingEditorState;
    this.test = test;
    this.queryState = this.buildQueryState();
    this.inputDataState = this.buildInputDataState();
    this.assertionState = this.buildAssertionState();
    this.executionPlanState = new ExecutionPlanState(this.editorStore);
  }

  setSelectedTab(val: MAPPING_TEST_EDITOR_TAB_TYPE): void {
    this.selectedTab = val;
  }

  buildQueryState(): MappingTestQueryState {
    const queryState = new MappingTestQueryState(
      this.editorStore,
      this.test,
      this.test.query,
    );
    flowResult(queryState.updateLamba(this.test.query)).catch(
      this.editorStore.applicationStore.alertIllegalUnhandledError,
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
  setQueryState = (queryState: MappingTestQueryState): void => {
    this.queryState = queryState;
  };
  setInputDataState = (inputDataState: MappingTestInputDataState): void => {
    this.inputDataState = inputDataState;
  };
  setAssertionState = (assertionState: MappingTestAssertionState): void => {
    this.assertionState = assertionState;
  };

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
          PackageableElementExplicitReference.create(
            source ?? Class.createStub(),
          ),
          ObjectInputType.JSON,
          tryToMinifyJSONString('{}'),
        ),
      );
      if (populateWithMockData) {
        if (source) {
          newInputDataState.inputData.setData(
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
            guaranteeNonNullable(source.owner.owner),
          ),
          '',
        ),
      );
      if (populateWithMockData) {
        newInputDataState.inputData.setData(
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
        newInputDataState.inputData.setData(
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
    if (this.test.validationResult) {
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
          this.editorStore.graphManagerState.graph,
          this.mappingEditorState.mapping,
          query,
          runtime,
          PureClientVersion.VX_X_X,
          true,
        )) as ExecutionResult;
      if (
        this.assertionState instanceof MappingTestExpectedOutputAssertionState
      ) {
        this.assertionState.setExpectedResult(
          losslessStringify(
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
        LogEvent.create(GRAPH_MANAGER_LOG_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isExecutingTest = false;
    }
  }

  *runTest(): GeneratorFn<void> {
    if (this.test.validationResult) {
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
    try {
      const runtime = this.inputDataState.runtime;
      this.isRunningTest = true;
      const result =
        (yield this.editorStore.graphManagerState.graphManager.executeMapping(
          this.editorStore.graphManagerState.graph,
          this.mappingEditorState.mapping,
          this.test.query,
          runtime,
          PureClientVersion.VX_X_X,
          true,
        )) as ExecutionResult;
      this.testExecutionResultText = losslessStringify(
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
          hashObject(losslessParse(this.assertionState.expectedResult));
      } else {
        throw new UnsupportedOperationError();
      }
      this.setResult(
        assertionMatched ? TEST_RESULT.PASSED : TEST_RESULT.FAILED,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_LOG_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.errorRunningTest = error;
      this.setResult(TEST_RESULT.ERROR);
    } finally {
      this.isRunningTest = false;
      this.runTime = Date.now() - startTime;
      // if the test is currently opened and ran but did not pass, switch to the result tab
      if (
        [TEST_RESULT.FAILED, TEST_RESULT.ERROR].includes(this.result) &&
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
        LogEvent.create(GRAPH_MANAGER_LOG_EVENT.EXECUTION_FAILURE),
        error.message,
      );
      yield flowResult(this.editorStore.graphState.globalCompileInFormMode()); // recompile graph if there is problem with the deep fetch tree of a test
    }
  }

  updateAssertion(): void {
    this.test.setAssert(this.assertionState.assert);
  }

  *generatePlan(): GeneratorFn<void> {
    try {
      this.isGeneratingPlan = true;
      yield flowResult(
        this.executionPlanState.generatePlan(
          this.mappingEditorState.mapping,
          this.queryState.query,
          this.inputDataState.runtime,
        ),
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_LOG_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isGeneratingPlan = false;
    }
  }
}
