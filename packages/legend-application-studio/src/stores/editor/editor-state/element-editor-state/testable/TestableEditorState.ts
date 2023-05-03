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
  type AtomicTest,
  type Testable,
  type TestAssertion,
  type TestResult,
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
} from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import type { EditorStore } from '../../../EditorStore.js';
import { atomicTest_addAssertion } from '../../../../graph-modifier/Testable_GraphModifierHelper.js';
import { createEmptyEqualToJsonAssertion } from '../../../utils/TestableUtils.js';
import { TESTABLE_RESULT } from '../../../sidebar-state/testable/GlobalTestRunnerState.js';
import {
  TestAssertionEditorState,
  TEST_ASSERTION_TAB,
} from './TestAssertionState.js';

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

export enum TESTABLE_TEST_TAB {
  SETUP = 'SETUP',
  ASSERTIONS = 'ASSERTIONS',
}

export class TestableTestEditorState {
  readonly editorStore: EditorStore;
  testable: Testable;
  test: AtomicTest;
  selectedAsertionState: TestAssertionEditorState | undefined;
  assertionEditorStates: TestAssertionEditorState[] = [];
  selectedTab = TESTABLE_TEST_TAB.ASSERTIONS;
  assertionToRename: TestAssertion | undefined;
  runningTestAction = ActionState.create();
  testResultState: TestableTestResultState;
  isReadOnly: boolean;

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

  *runTest(): GeneratorFn<void> {
    try {
      this.resetResult();
      this.runningTestAction.inProgress();
      const input = new RunTestsTestableInput(this.testable);
      const suite =
        this.test.__parent instanceof TestSuite
          ? this.test.__parent
          : undefined;
      input.unitTestIds.push(new UniqueTestId(suite, this.test));
      const testResults =
        (yield this.editorStore.graphManagerState.graphManager.runTests(
          [input],
          this.editorStore.graphManagerState.graph,
        )) as TestResult[];
      const result = guaranteeNonNullable(testResults[0]);
      assertTrue(
        result.testable === this.testable && result.atomicTest === this.test,
        'Unexpected test result',
      );
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
      assertionState.setSelectedTab(TEST_ASSERTION_TAB.ASSERTION_RESULT);
    });
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
}

export class TestableTestSuiteEditorState {
  readonly editorStore: EditorStore;
  testable: Testable;
  suite: TestSuite;
  isReadOnly: boolean;
  testStates: TestableTestEditorState[] = [];
  isRunningTest = ActionState.create();
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
      this.isRunningTest.inProgress();
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
      this.isRunningTest.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.isRunningTest.fail();
    } finally {
      this.testStates.forEach((t) => t.runningTestAction.complete());
    }
  }

  *runFailingTests(): GeneratorFn<void> {
    try {
      this.isRunningTest.inProgress();
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
      this.isRunningTest.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.isRunningTest.fail();
    } finally {
      this.testStates.forEach((t) => t.runningTestAction.complete());
    }
  }
}
