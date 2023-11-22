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

import { action, flow, makeObservable, observable } from 'mobx';
import type { EditorStore } from '../../../../EditorStore.js';
import type { FunctionEditorState } from '../../FunctionEditorState.js';
import {
  assertErrorThrown,
  isNonNullable,
  uuid,
  type GeneratorFn,
  LogEvent,
  guaranteeNonNullable,
  addUniqueEntry,
  uniq,
  assertTrue,
  guaranteeType,
} from '@finos/legend-shared';
import {
  type ConcreteFunctionDefinition,
  type EmbeddedData,
  type TestResult,
  type AtomicTest,
  type EngineRuntime,
  type ObserverContext,
  type ValueSpecification,
  FunctionTest,
  UniqueTestId,
  FunctionStoreTestData,
  FunctionTestSuite,
  RunTestsTestableInput,
  RawLambda,
  PackageableRuntime,
  SimpleFunctionExpression,
  LambdaFunctionInstanceValue,
  SUPPORTED_FUNCTIONS,
  matchFunctionName,
  InstanceValue,
  PackageableElementReference,
  Database,
  RelationalCSVData,
  PackageableElementExplicitReference,
} from '@finos/legend-graph';
import {
  TestablePackageableElementEditorState,
  TestableTestEditorState,
  TestableTestSuiteEditorState,
} from '../../testable/TestableEditorState.js';
import { EmbeddedDataEditorState } from '../../data/DataEditorState.js';
import {
  functionTestable_deleteDataStore,
  functionTestable_setEmbeddedData,
  function_addTestSuite,
} from '../../../../../graph-modifier/DomainGraphModifierHelper.js';
import {
  DEFAULT_TEST_ASSERTION_ID,
  createDefaultEqualToJSONTestAssertion,
  isTestPassing,
} from '../../../../utils/TestableUtils.js';
import { LEGEND_STUDIO_APP_EVENT } from '../../../../../../__lib__/LegendStudioEvent.js';
import { testSuite_addTest } from '../../../../../graph-modifier/Testable_GraphModifierHelper.js';

const addToFunctionMap = (
  val: SimpleFunctionExpression,
  functions: Map<string, SimpleFunctionExpression[]>,
): boolean => {
  const values = functions.get(val.functionName) ?? [];
  if (values.includes(val)) {
    return false;
  }
  addUniqueEntry(values, val);
  functions.set(val.functionName, values);
  return true;
};

const collectSimpleFunctionExpressions = (
  val: ValueSpecification,
  functions: Map<string, SimpleFunctionExpression[]>,
): void => {
  if (val instanceof SimpleFunctionExpression) {
    const continueProcessing = addToFunctionMap(val, functions);
    if (continueProcessing) {
      val.parametersValues.forEach((v) =>
        collectSimpleFunctionExpressions(v, functions),
      );
    }
  }
};

const resolveRuntimesFromQuery = (
  func: ConcreteFunctionDefinition,
  editorStore: EditorStore,
): EngineRuntime[] | undefined => {
  try {
    const body = func.expressionSequence;
    const rawLambda = new RawLambda([], body);
    const functions = new Map<string, SimpleFunctionExpression[]>();
    const valueSpec =
      editorStore.graphManagerState.graphManager.buildValueSpecification(
        editorStore.graphManagerState.graphManager.serializeRawValueSpecification(
          rawLambda,
        ),
        editorStore.graphManagerState.graph,
      );
    if (valueSpec instanceof LambdaFunctionInstanceValue) {
      const vals = guaranteeNonNullable(
        valueSpec.values[0],
        'function expected to be of type lambda',
      ).expressionSequence;
      vals.forEach((v) => collectSimpleFunctionExpressions(v, functions));
      const fromFunctions = Array.from(functions.keys())
        .filter((v) => matchFunctionName(v, SUPPORTED_FUNCTIONS.FROM))
        .map((e) => functions.get(e))
        .flat()
        .filter(isNonNullable);
      const runtimeInstance: PackageableRuntime[] = [];
      fromFunctions.forEach((v) => {
        v.parametersValues.forEach((p) => {
          if (p instanceof InstanceValue) {
            p.values.forEach((pIn) => {
              if (pIn instanceof PackageableElementReference) {
                if (pIn.value instanceof PackageableRuntime) {
                  runtimeInstance.push(pIn.value);
                }
              }
            });
          }
        });
      });
      return uniq(runtimeInstance.map((e) => e.runtimeValue).flat());
    }
    return [];
  } catch (error) {
    assertErrorThrown(error);
    editorStore.applicationStore.logService.error(
      LogEvent.create(LEGEND_STUDIO_APP_EVENT.SERVICE_TEST_SETUP_FAILURE),
      error,
    );
    return undefined;
  }
};

export class FunctionStoreTestDataState {
  readonly editorStore: EditorStore;
  readonly testDataState: FunctionTestDataState;
  storeTestData: FunctionStoreTestData;
  embeddedEditorState: EmbeddedDataEditorState;
  dataElementModal = false;

  constructor(
    editorStore: EditorStore,
    testDataState: FunctionTestDataState,
    value: FunctionStoreTestData,
  ) {
    makeObservable(this, {
      storeTestData: observable,
      dataElementModal: observable,
      embeddedEditorState: observable,

      setDataElementModal: action,
      changeEmbeddedData: action,
    });
    this.editorStore = editorStore;
    this.testDataState = testDataState;
    this.storeTestData = value;
    this.embeddedEditorState = new EmbeddedDataEditorState(
      this.testDataState.editorStore,
      this.storeTestData.data,
      {
        hideSource: true,
      },
    );
  }

  setDataElementModal(val: boolean): void {
    this.dataElementModal = val;
  }

  changeEmbeddedData(val: EmbeddedData): void {
    functionTestable_setEmbeddedData(
      this.storeTestData,
      val,
      this.editorStore.changeDetectionState.observerContext,
    );
    this.embeddedEditorState = new EmbeddedDataEditorState(
      this.testDataState.editorStore,
      this.storeTestData.data,
    );
  }
}

export class FunctionTestState extends TestableTestEditorState {
  readonly parentState: FunctionTestSuiteState;
  readonly functionTestableState: FunctionTestableState;
  readonly uuid = uuid();
  override test: FunctionTest;
  // TODO: param

  constructor(
    editorStore: EditorStore,
    parentSuiteState: FunctionTestSuiteState,
    test: FunctionTest,
  ) {
    super(
      parentSuiteState.functionTestableState.function,
      test,
      parentSuiteState.functionTestableState.functionEditorState.isReadOnly,
      editorStore,
    );
    makeObservable(this, {
      selectedAsertionState: observable,
      selectedTab: observable,
      assertionToRename: observable,
      assertionEditorStates: observable,
      testResultState: observable,
      runningTestAction: observable,
      addAssertion: action,
      setAssertionToRename: action,
      handleTestResult: action,
      setSelectedTab: action,
      runTest: flow,
    });
    this.parentState = parentSuiteState;
    this.functionTestableState = parentSuiteState.functionTestableState;
    this.test = test;
  }
}

class FunctionTestDataState {
  readonly editorStore: EditorStore;
  readonly functionTestableState: FunctionTestableState;
  selectedDataState: FunctionStoreTestDataState | undefined;
  dataHolder: FunctionTestSuite;
  showNewModal = false;

  constructor(
    editorStore: EditorStore,
    functionTestableState: FunctionTestableState,
    holder: FunctionTestSuite,
  ) {
    makeObservable(this, {
      selectedDataState: observable,
      dataHolder: observable,
      showNewModal: observable,
      initDefaultStore: action,
      setShowModal: action,
      deleteStoreTestData: action,
      openStoreTestData: action,
    });
    this.editorStore = editorStore;
    this.functionTestableState = functionTestableState;
    this.dataHolder = holder;
    this.initDefaultStore();
  }

  initDefaultStore(): void {
    const val = this.dataHolder.testData?.[0];
    if (val) {
      this.openStoreTestData(val);
    } else {
      this.selectedDataState = undefined;
    }
  }

  setShowModal(val: boolean): void {
    this.showNewModal = val;
  }

  deleteStoreTestData(val: FunctionStoreTestData): void {
    functionTestable_deleteDataStore(this.dataHolder, val);
    this.initDefaultStore();
  }

  openStoreTestData(val: FunctionStoreTestData): void {
    this.selectedDataState = new FunctionStoreTestDataState(
      this.editorStore,
      this,
      val,
    );
  }
}

export const createFunctionTest = (
  id: string,
  observerContext: ObserverContext,
  suite?: FunctionTestSuite | undefined,
): FunctionTest => {
  const funcionTest = new FunctionTest();
  funcionTest.id = id;
  funcionTest.assertions = [
    createDefaultEqualToJSONTestAssertion(DEFAULT_TEST_ASSERTION_ID),
  ];
  if (suite) {
    funcionTest.__parent = suite;
    testSuite_addTest(suite, funcionTest, observerContext);
  }
  const assertion = createDefaultEqualToJSONTestAssertion(`expectedAssertion`);
  funcionTest.assertions = [assertion];
  assertion.parentTest = funcionTest;
  return funcionTest;
};
export class FunctionTestSuiteState extends TestableTestSuiteEditorState {
  readonly functionTestableState: FunctionTestableState;
  override suite: FunctionTestSuite;
  override testStates: FunctionTestState[] = [];
  override selectTestState: FunctionTestState | undefined;
  dataState: FunctionTestDataState;

  showCreateModal = false;

  constructor(
    editorStore: EditorStore,
    functionTestableState: FunctionTestableState,
    suite: FunctionTestSuite,
  ) {
    super(
      functionTestableState.function,
      suite,
      functionTestableState.functionEditorState.isReadOnly,
      editorStore,
    );
    makeObservable(this, {
      dataState: observable,
      showCreateModal: observable,
      selectTestState: observable,
      changeTest: observable,
      buildTestState: action,
      deleteTest: action,
      buildTestStates: action,
      setShowModal: action,
      addNewTest: action,
    });
    this.functionTestableState = functionTestableState;
    this.suite = suite;
    this.dataState = new FunctionTestDataState(
      editorStore,
      functionTestableState,
      suite,
    );
    this.testStates = this.buildTestStates();
    this.selectTestState = this.testStates[0];
  }

  setShowModal(val: boolean): void {
    this.showCreateModal = val;
  }

  buildTestStates(): FunctionTestState[] {
    return this.suite.tests
      .map((t) => this.buildTestState(t))
      .filter(isNonNullable);
  }

  buildTestState(val: AtomicTest): FunctionTestState | undefined {
    if (val instanceof FunctionTest) {
      return new FunctionTestState(this.editorStore, this, val);
    }
    return undefined;
  }

  addNewTest(id: string): void {
    const test = createFunctionTest(
      id,
      this.editorStore.changeDetectionState.observerContext,
      this.suite,
    );

    testSuite_addTest(
      this.suite,
      test,
      this.functionTestableState.editorStore.changeDetectionState
        .observerContext,
    );
    const testState = this.buildTestState(test);
    if (testState) {
      this.testStates.push(testState);
    }
    this.selectTestState = testState;
  }
}

export class FunctionTestableState extends TestablePackageableElementEditorState {
  readonly functionEditorState: FunctionEditorState;
  declare selectedTestSuite: FunctionTestSuiteState | undefined;

  runningSuite: FunctionTestSuite | undefined;
  createSuiteModal = false;

  constructor(functionEditorState: FunctionEditorState) {
    super(functionEditorState, functionEditorState.functionElement);
    makeObservable(this, {
      isRunningTestableSuitesState: observable,
      isRunningFailingSuitesState: observable,
      selectedTestSuite: observable,
      testableResults: observable,
      runningSuite: observable,
      createSuiteModal: observable,
      init: action,
      buildTestSuiteState: action,
      deleteTestSuite: action,
      changeSuite: action,
      handleNewResults: action,
      setRenameComponent: action,
      clearTestResultsForSuite: action,
      setCreateSuite: action,
      runTestable: flow,
      runSuite: flow,
      runAllFailingSuites: flow,
    });
    this.functionEditorState = functionEditorState;
    this.init();
  }

  get function(): ConcreteFunctionDefinition {
    return this.functionEditorState.functionElement;
  }

  get passingSuites(): FunctionTestSuite[] {
    const results = this.testableResults;
    if (results?.length) {
      return this.function.tests.filter((suite) =>
        results
          .filter((res) => res.parentSuite?.id === suite.id)
          .every((e) => isTestPassing(e)),
      );
    }
    return [];
  }

  get failingSuites(): FunctionTestSuite[] {
    const results = this.testableResults;
    if (results?.length) {
      return this.function.tests.filter((suite) =>
        results
          .filter((res) => res.parentSuite?.id === suite.id)
          .some((e) => !isTestPassing(e)),
      );
    }
    return [];
  }

  get staticSuites(): FunctionTestSuite[] {
    const results = this.testableResults;
    if (results?.length) {
      return this.function.tests.filter((suite) =>
        results.every((res) => res.parentSuite?.id !== suite.id),
      );
    }
    return this.function.tests;
  }

  init(): void {
    if (!this.selectedTestSuite) {
      const suite = this.function.tests[0];
      this.selectedTestSuite = suite
        ? this.buildTestSuiteState(suite)
        : undefined;
    }
  }

  setCreateSuite(val: boolean): void {
    this.createSuiteModal = val;
  }

  createSuite(suiteName: string, testName: string): void {
    const functionSuite = new FunctionTestSuite();
    functionSuite.id = suiteName;
    const engineRuntimes = resolveRuntimesFromQuery(
      this.function,
      this.editorStore,
    );
    if (engineRuntimes?.length) {
      try {
        assertTrue(
          engineRuntimes.length === 1,
          `Function Test Suite Only supports One Runtime at this time. Found ${engineRuntimes.length}`,
        );
        const engineRuntime = guaranteeNonNullable(engineRuntimes[0]);
        assertTrue(
          !(
            engineRuntime.connectionStores.length &&
            engineRuntime.connections.length
          ),
          `Runtime found has two connection types defined. Please use connection stores only`,
        );
        const stores = [
          ...engineRuntime.connections
            .map((e) =>
              e.storeConnections.map((s) => s.connection.store.value).flat(),
            )
            .flat(),
          ...engineRuntime.connectionStores
            .map((e) => e.storePointers.map((sPt) => sPt.value))
            .flat(),
        ];
        assertTrue(Boolean(stores.length), 'No runtime store found');
        assertTrue(
          stores.length === 1,
          'Only one store supported in runtime for function tests',
        );
        const store = guaranteeNonNullable(stores[0]);
        guaranteeType(
          store,
          Database,
          'Only Database stores supported now for function test',
        );
        const relational = new RelationalCSVData();
        const data = new FunctionStoreTestData();
        data.store = PackageableElementExplicitReference.create(store);
        data.data = relational;
        functionSuite.testData = [data];
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.notificationService.notifyError(
          `Unable to create function test suite: ${error.message}`,
        );
        return;
      }
    }
    createFunctionTest(
      testName,
      this.editorStore.changeDetectionState.observerContext,
      functionSuite,
    );
    // set test suite
    function_addTestSuite(
      this.function,
      functionSuite,
      this.editorStore.changeDetectionState.observerContext,
    );
    this.changeSuite(functionSuite);
    this.setCreateSuite(false);
  }

  *runSuite(suite: FunctionTestSuite): GeneratorFn<void> {
    try {
      this.runningSuite = suite;
      this.clearTestResultsForSuite(suite);
      this.selectedTestSuite?.testStates.forEach((t) => t.resetResult());
      this.selectedTestSuite?.testStates.forEach((t) =>
        t.runningTestAction.inProgress(),
      );

      const input = new RunTestsTestableInput(this.function);
      suite.tests.forEach((t) =>
        input.unitTestIds.push(new UniqueTestId(suite, t)),
      );
      const testResults =
        (yield this.editorStore.graphManagerState.graphManager.runTests(
          [input],
          this.editorStore.graphManagerState.graph,
        )) as TestResult[];

      this.handleNewResults(testResults);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.isRunningTestableSuitesState.fail();
    } finally {
      this.selectedTestSuite?.testStates.forEach((t) =>
        t.runningTestAction.complete(),
      );
      this.runningSuite = undefined;
    }
  }

  *runAllFailingSuites(): GeneratorFn<void> {
    try {
      this.isRunningFailingSuitesState.inProgress();
      const input = new RunTestsTestableInput(this.testable);
      this.failingSuites.forEach((s) => {
        s.tests.forEach((t) => input.unitTestIds.push(new UniqueTestId(s, t)));
      });
      const testResults =
        (yield this.editorStore.graphManagerState.graphManager.runTests(
          [input],
          this.editorStore.graphManagerState.graph,
        )) as TestResult[];
      this.handleNewResults(testResults);
      this.isRunningFailingSuitesState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.isRunningFailingSuitesState.fail();
    } finally {
      this.selectedTestSuite?.testStates.forEach((t) =>
        t.runningTestAction.complete(),
      );
    }
  }

  handleNewResults(results: TestResult[]): void {
    if (this.testableResults?.length) {
      const newSuitesResults = results
        .map((e) => e.parentSuite?.id)
        .filter(isNonNullable);
      const reducedFilters = this.testableResults.filter(
        (res) => !newSuitesResults.includes(res.parentSuite?.id ?? ''),
      );
      this.setTestableResults([...reducedFilters, ...results]);
    } else {
      this.setTestableResults(results);
    }
    this.testableResults?.forEach((result) => {
      const state = this.selectedTestSuite?.testStates.find(
        (t) =>
          t.test.id === result.atomicTest.id &&
          t.parentState.suite.id === result.parentSuite?.id,
      );
      state?.handleTestResult(result);
    });
  }

  clearTestResultsForSuite(suite: FunctionTestSuite): void {
    this.testableResults = this.testableResults?.filter(
      (t) => !(this.resolveSuiteResults(suite) ?? []).includes(t),
    );
  }

  resolveSuiteResults(suite: FunctionTestSuite): TestResult[] | undefined {
    return this.testableResults?.filter((t) => t.parentSuite?.id === suite.id);
  }

  buildTestSuiteState(val: FunctionTestSuite): FunctionTestSuiteState {
    return new FunctionTestSuiteState(this.editorStore, this, val);
  }

  changeSuite(suite: FunctionTestSuite): void {
    if (this.selectedTestSuite?.suite !== suite) {
      this.selectedTestSuite = this.buildTestSuiteState(suite);
    }
  }
}
