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
  type Test,
  type AtomicTest,
  type Testable,
  type TestAssertion,
  type TestResult,
  type TestDebug,
  UnknownTestDebug,
  TestExecutionPlanDebug,
  TestExecuted,
  UniqueTestId,
  RunTestsTestableInput,
  TestSuite,
  TestExecutionStatus,
  TestError,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  assertErrorThrown,
  assertTrue,
  guaranteeNonNullable,
  ActionState,
  addUniqueEntry,
  deleteEntry,
  isNonNullable,
  filterByType,
} from '@finos/legend-shared';
import { action, flowResult, makeObservable, observable } from 'mobx';
import type { EditorStore } from '../../../EditorStore.js';
import {
  atomicTest_addAssertion,
  testSuite_deleteTest,
  testable_deleteTest,
  testable_setId,
} from '../../../../graph-modifier/Testable_GraphModifierHelper.js';
import {
  createEmptyEqualToJsonAssertion,
  isTestPassing,
} from '../../../utils/TestableUtils.js';
import { TESTABLE_RESULT } from '../../../sidebar-state/testable/GlobalTestRunnerState.js';
import {
  TestAssertionEditorState,
  TEST_ASSERTION_TAB,
} from './TestAssertionState.js';
import type { ElementEditorState } from '../ElementEditorState.js';
import { ExecutionPlanState } from '@finos/legend-query-builder';

export class TestableTestResultState {
  readonly editorStore: EditorStore;
  readonly testState: TestableTestEditorState;
  result: TestResult | undefined;

  constructor(testState: TestableTestEditorState, editorStore: EditorStore) {
    makeObservable(this, {
      result: observable,
      setResult: action,
    });

    this.editorStore = editorStore;
    this.testState = testState;
  }

  setResult(val: TestResult | undefined): void {
    this.result = val;
  }
}

export abstract class TestableDebugTestResultState {
  readonly editorStore: EditorStore;
  readonly testState: TestableTestEditorState;
  testDebug: TestDebug | undefined;

  constructor(testState: TestableTestEditorState, editorStore: EditorStore) {
    this.editorStore = editorStore;
    this.testState = testState;
  }

  abstract initialize(): TestableDebugTestResultState;
}

export class TestExecutionPlanDebugState extends TestableDebugTestResultState {
  declare testDebug: TestExecutionPlanDebug;
  executionPlanState: ExecutionPlanState;

  constructor(
    result: TestExecutionPlanDebug,
    testState: TestableTestEditorState,
    editorStore: EditorStore,
  ) {
    super(testState, editorStore);
    this.testDebug = result;
    this.executionPlanState = new ExecutionPlanState(
      this.editorStore.applicationStore,
      this.editorStore.graphManagerState,
    );
    makeObservable(this, {
      executionPlanState: observable,
      initialize: action,
    });
  }

  override initialize(): TestableDebugTestResultState {
    try {
      this.executionPlanState.setRawPlan(this.testDebug.executionPlan);
      const rawPlan = this.testDebug.executionPlan;
      if (rawPlan) {
        const plan =
          this.editorStore.graphManagerState.graphManager.buildExecutionPlan(
            rawPlan,
            this.editorStore.graphManagerState.graph,
          );
        this.executionPlanState.initialize(plan);
      }
    } catch {
      // do nothing
    }
    const debug = this.testDebug.debug?.join('\n');
    if (debug) {
      this.executionPlanState.setDebugText(debug);
    }
    if (this.testDebug.error) {
      this.editorStore.applicationStore.notificationService.notifyError(
        `Error generating exec plan: ${this.testDebug.error}`,
      );
    }
    return this;
  }
}

export class TestUnknownDebugState extends TestableDebugTestResultState {
  declare testDebug: UnknownTestDebug;
  executionPlanState: ExecutionPlanState;

  constructor(
    result: UnknownTestDebug,
    testState: TestableTestEditorState,
    editorStore: EditorStore,
  ) {
    super(testState, editorStore);
    this.testDebug = result;
    this.executionPlanState = new ExecutionPlanState(
      this.editorStore.applicationStore,
      this.editorStore.graphManagerState,
    );
  }

  override initialize(): TestableDebugTestResultState {
    return this;
  }
}

export enum TESTABLE_TEST_TAB {
  SETUP = 'SETUP',
  ASSERTION = 'ASSERTION',
}

export abstract class TestableTestEditorState {
  readonly editorStore: EditorStore;
  testable: Testable;
  test: AtomicTest;
  selectedAsertionState: TestAssertionEditorState | undefined;
  assertionEditorStates: TestAssertionEditorState[] = [];
  selectedTab = TESTABLE_TEST_TAB.ASSERTION;
  assertionToRename: TestAssertion | undefined;
  runningTestAction = ActionState.create();
  testResultState: TestableTestResultState;
  debugTestResultState: TestableDebugTestResultState | undefined;
  isReadOnly: boolean;
  debuggingTestAction = ActionState.create();

  constructor(
    testable: Testable,
    test: AtomicTest,
    isReadOnly: boolean,
    editorStore: EditorStore,
  ) {
    this.editorStore = editorStore;
    this.test = test;
    this.testable = testable;
    this.testResultState = new TestableTestResultState(this, this.editorStore);
    this.assertionEditorStates = test.assertions.map(
      (assertion) =>
        new TestAssertionEditorState(this.editorStore, assertion, this),
    );
    this.selectedAsertionState = this.assertionEditorStates[0];
    this.isReadOnly = isReadOnly;
  }

  setSelectedTab(val: TESTABLE_TEST_TAB): void {
    this.selectedTab = val;
  }

  setAssertionToRename(assertion: TestAssertion | undefined): void {
    this.assertionToRename = assertion;
  }

  addAssertion(): void {
    const assertion = createEmptyEqualToJsonAssertion(this.test);
    atomicTest_addAssertion(this.test, assertion);
    const assertionState = new TestAssertionEditorState(
      this.editorStore,
      assertion,
      this,
    );
    addUniqueEntry(this.assertionEditorStates, assertionState);
    this.selectedAsertionState = assertionState;
    this.resetResult();
  }

  deleteAssertion(assertionState: TestAssertionEditorState): void {
    deleteEntry(this.test.assertions, assertionState.assertion);
    deleteEntry(this.assertionEditorStates, assertionState);
    if (this.selectedAsertionState === assertionState) {
      this.selectedAsertionState = this.assertionEditorStates[0];
    }
  }

  openAssertion(val: TestAssertion): void {
    const state = this.assertionEditorStates.find((a) => a.assertion === val);
    if (state) {
      this.selectedAsertionState = state;
    }
  }

  // Fetches test results. Caller of test should catch the error
  async fetchTestResult(): Promise<TestResult> {
    const input = new RunTestsTestableInput(this.testable);
    const suite =
      this.test.__parent instanceof TestSuite ? this.test.__parent : undefined;
    input.unitTestIds.push(new UniqueTestId(suite, this.test));
    const testResults =
      await this.editorStore.graphManagerState.graphManager.runTests(
        [input],
        this.editorStore.graphManagerState.graph,
      );
    const result = guaranteeNonNullable(testResults[0]);
    assertTrue(
      result.testable === this.testable &&
        result.atomicTest.id === this.test.id,
      'Unexpected test result',
    );
    return result;
  }

  // Fetches test results. Caller of test should catch the error
  async fetchDebugTestResult(): Promise<TestDebug> {
    const input = new RunTestsTestableInput(this.testable);
    const suite =
      this.test.__parent instanceof TestSuite ? this.test.__parent : undefined;
    input.unitTestIds.push(new UniqueTestId(suite, this.test));
    const testResults =
      await this.editorStore.graphManagerState.graphManager.debugTests(
        [input],
        this.editorStore.graphManagerState.graph,
      );
    const result = guaranteeNonNullable(testResults[0]);
    assertTrue(
      result.testable === this.testable &&
        result.atomicTest.id === this.test.id,
      'Unexpected test result',
    );
    return result;
  }

  resetResult(): void {
    this.testResultState.setResult(undefined);
    this.assertionEditorStates.forEach((assertionState) =>
      assertionState.assertionResultState.setTestResult(undefined),
    );
  }

  handleTestResult(testResult: TestResult): void {
    this.testResultState.setResult(testResult);
    this.assertionEditorStates.forEach((assertionState) => {
      assertionState.assertionResultState.setTestResult(testResult);
      assertionState.setSelectedTab(TEST_ASSERTION_TAB.RESULT);
    });
  }

  correspondsToTestResult(val: TestResult): boolean {
    const atomicTest = this.test;
    if (atomicTest.id === val.atomicTest.id) {
      const parent = atomicTest.__parent;
      if (parent instanceof TestSuite) {
        return parent.id === val.parentSuite?.id;
      }
      return val.parentSuite === undefined && val.testable === this.testable;
    }
    return false;
  }

  get assertionCount(): number {
    return this.assertionEditorStates.length;
  }

  get assertionPassed(): number {
    if (
      this.testResultState.result instanceof TestExecuted &&
      this.testResultState.result.testExecutionStatus ===
        TestExecutionStatus.PASS
    ) {
      return this.assertionCount;
    }
    return this.assertionEditorStates.filter(
      (state) => state.assertionResultState.result === TESTABLE_RESULT.PASSED,
    ).length;
  }

  get assertionFailed(): number {
    if (
      this.testResultState.result instanceof TestExecuted &&
      this.testResultState.result.testExecutionStatus ===
        TestExecutionStatus.PASS
    ) {
      return 0;
    }
    return this.assertionEditorStates.filter(
      (state) => state.assertionResultState.result !== TESTABLE_RESULT.PASSED,
    ).length;
  }
  *runTest(): GeneratorFn<void> {
    try {
      this.resetResult();
      this.runningTestAction.inProgress();
      const result = (yield flowResult(this.fetchTestResult())) as TestResult;
      this.handleTestResult(result);
      this.runningTestAction.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(
        `Error running test: ${error.message}`,
      );
      this.runningTestAction.fail();
    }
  }

  *debugTest(): GeneratorFn<void> {
    try {
      this.setDebugState(undefined);
      this.debuggingTestAction.inProgress();
      const result = (yield flowResult(
        this.fetchDebugTestResult(),
      )) as TestDebug;
      const debugState = guaranteeNonNullable(
        this.buildTestDebugState(result),
        `can't build debug state for test: ${result.atomicTest.id}`,
      );
      this.setDebugState(debugState.initialize());
      this.debuggingTestAction.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.debugTestResultState = undefined;
      this.editorStore.applicationStore.notificationService.notifyError(
        `Error running test: ${error.message}`,
      );
      this.debuggingTestAction.fail();
    }
  }

  setDebugState(val: TestableDebugTestResultState | undefined): void {
    this.debugTestResultState = val;
  }

  buildTestDebugState(
    testDebug: TestDebug,
  ): TestableDebugTestResultState | undefined {
    if (testDebug instanceof TestExecutionPlanDebug) {
      return new TestExecutionPlanDebugState(testDebug, this, this.editorStore);
    } else if (testDebug instanceof UnknownTestDebug) {
      return new TestUnknownDebugState(testDebug, this, this.editorStore);
    }
    return undefined;
  }
}

export abstract class TestableTestSuiteEditorState {
  readonly editorStore: EditorStore;
  testable: Testable;
  suite: TestSuite;
  isReadOnly: boolean;
  testStates: TestableTestEditorState[] = [];
  runningSuiteState = ActionState.create();
  selectTestState: TestableTestEditorState | undefined;

  constructor(
    testable: Testable,
    suite: TestSuite,
    isReadOnly: boolean,
    editorStore: EditorStore,
  ) {
    this.testable = testable;
    this.suite = suite;
    this.isReadOnly = isReadOnly;
    this.editorStore = editorStore;
  }

  *runSuite(): GeneratorFn<void> {
    try {
      this.runningSuiteState.inProgress();
      this.testStates.forEach((t) => t.resetResult());
      this.testStates.forEach((t) => t.runningTestAction.inProgress());
      const input = new RunTestsTestableInput(this.testable);
      input.unitTestIds = this.suite.tests.map(
        (t) => new UniqueTestId(this.suite, t),
      );
      const testResults =
        (yield this.editorStore.graphManagerState.graphManager.runTests(
          [input],
          this.editorStore.graphManagerState.graph,
        )) as TestResult[];
      testResults.forEach((result) => {
        const state = this.testStates.find((t) => t.test === result.atomicTest);
        state?.handleTestResult(result);
      });
      this.runningSuiteState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.runningSuiteState.fail();
    } finally {
      this.testStates.forEach((t) => t.runningTestAction.complete());
    }
  }

  *runFailingTests(): GeneratorFn<void> {
    try {
      this.runningSuiteState.inProgress();
      const input = new RunTestsTestableInput(this.testable);
      input.unitTestIds = this.testStates
        .map((testState) => {
          const result = testState.testResultState.result;
          if (
            (result instanceof TestExecuted &&
              result.testExecutionStatus === TestExecutionStatus.FAIL) ||
            result instanceof TestError
          ) {
            testState.runningTestAction.inProgress();
            return new UniqueTestId(this.suite, testState.test);
          }
          return undefined;
        })
        .filter(isNonNullable);
      const testResults =
        (yield this.editorStore.graphManagerState.graphManager.runTests(
          [input],
          this.editorStore.graphManagerState.graph,
        )) as TestResult[];
      testResults.forEach((result) => {
        const state = this.testStates.find((t) => t.test === result.atomicTest);
        state?.handleTestResult(result);
      });
      this.runningSuiteState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.runningSuiteState.fail();
    } finally {
      this.testStates.forEach((t) => t.runningTestAction.complete());
    }
  }

  deleteTest(val: AtomicTest): void {
    testSuite_deleteTest(this.suite, val);
    this.removeTestState(val);
    if (this.selectTestState?.test === val) {
      this.selectTestState = this.testStates[0];
    }
  }

  removeTestState(val: AtomicTest): void {
    this.testStates = this.testStates.filter((e) => e.test !== val);
  }

  changeTest(val: AtomicTest): void {
    if (this.selectTestState?.test !== val) {
      this.selectTestState = this.testStates.find(
        (testState) => testState.test === val,
      );
    }
  }
}

export abstract class TestablePackageableElementEditorState {
  readonly editorStore: EditorStore;
  readonly editorState: ElementEditorState;
  readonly testable: Testable;
  testableResults: TestResult[] | undefined;
  selectedTestSuite: TestableTestSuiteEditorState | undefined;
  runningSuite: TestSuite | undefined;

  testableComponentToRename: Test | undefined;

  isRunningTestableSuitesState = ActionState.create();
  isRunningFailingSuitesState = ActionState.create();

  constructor(editorState: ElementEditorState, testable: Testable) {
    this.editorState = editorState;
    this.editorStore = editorState.editorStore;
    this.testable = testable;
  }

  abstract init(): void;

  get suiteCount(): number {
    return this.testable.tests.length;
  }

  get suites(): TestSuite[] {
    return this.testable.tests.filter(filterByType(TestSuite));
  }

  get passingSuites(): TestSuite[] {
    const results = this.testableResults;
    if (results?.length) {
      return this.suites.filter((suite) =>
        results
          .filter((res) => res.parentSuite?.id === suite.id)
          .every((e) => isTestPassing(e)),
      );
    }
    return [];
  }

  get failingSuites(): TestSuite[] {
    const results = this.testableResults;
    if (results?.length) {
      return this.suites.filter((suite) =>
        results
          .filter((res) => res.parentSuite?.id === suite.id)
          .some((e) => !isTestPassing(e)),
      );
    }
    return [];
  }

  resolveSuiteResults(suite: TestSuite): TestResult[] | undefined {
    return this.testableResults?.filter((t) => t.parentSuite?.id === suite.id);
  }

  clearTestResultsForSuite(suite: TestSuite): void {
    this.testableResults = this.testableResults?.filter(
      (t) => !(this.resolveSuiteResults(suite) ?? []).includes(t),
    );
  }

  get staticSuites(): TestSuite[] {
    const results = this.testableResults;
    if (results?.length) {
      return this.suites.filter((suite) =>
        results.every((res) => res.parentSuite?.id !== suite.id),
      );
    }
    return this.suites;
  }

  setTestableResults(val: TestResult[] | undefined): void {
    this.testableResults = val;
  }

  setRenameComponent(testSuite: Test | undefined): void {
    this.testableComponentToRename = testSuite;
  }

  renameTestableComponent(val: string | undefined): void {
    const _component = this.testableComponentToRename;
    if (_component) {
      testable_setId(_component, val ?? '');
    }
  }

  deleteTestSuite(testSuite: TestSuite): void {
    testable_deleteTest(this.testable, testSuite);
    if (this.selectedTestSuite?.suite === testSuite) {
      this.selectedTestSuite = undefined;
      this.init();
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

  *runTestable(): GeneratorFn<void> {
    try {
      this.setTestableResults(undefined);
      this.isRunningTestableSuitesState.inProgress();
      this.selectedTestSuite?.testStates.forEach((t) => t.resetResult());
      this.selectedTestSuite?.testStates.forEach((t) =>
        t.runningTestAction.inProgress(),
      );
      const input = new RunTestsTestableInput(this.testable);
      const testResults =
        (yield this.editorStore.graphManagerState.graphManager.runTests(
          [input],
          this.editorStore.graphManagerState.graph,
        )) as TestResult[];
      this.handleNewResults(testResults);
      this.isRunningTestableSuitesState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.isRunningTestableSuitesState.fail();
    } finally {
      this.selectedTestSuite?.testStates.forEach((t) =>
        t.runningTestAction.complete(),
      );
    }
  }

  *runSuite(suite: TestSuite): GeneratorFn<void> {
    try {
      this.runningSuite = suite;
      this.clearTestResultsForSuite(suite);
      this.selectedTestSuite?.testStates.forEach((t) => t.resetResult());
      this.selectedTestSuite?.testStates.forEach((t) =>
        t.runningTestAction.inProgress(),
      );
      const input = new RunTestsTestableInput(this.testable);
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
      const state = this.selectedTestSuite?.testStates.find((testState) =>
        testState.correspondsToTestResult(result),
      );
      state?.handleTestResult(result);
    });
  }
}
