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
  type TestResult,
  type Service,
  TestExecuted,
  ServiceTestSuite,
  TestData,
  ServiceTest,
  RunTestsTestableInput,
  UniqueTestId,
  DEFAULT_TEST_SUITE_PREFIX,
  DEFAULT_TEST_PREFIX,
  TestError,
  MultiExecutionServiceTestResult,
  TestExecutionStatus,
  getAllIdentifiedServiceConnections,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  addUniqueEntry,
  assertErrorThrown,
  filterByType,
  ActionState,
  deleteEntry,
  isNonNullable,
  generateEnumerableNameFromToken,
  guaranteeNonNullable,
  returnUndefOnError,
} from '@finos/legend-shared';
import { action, flow, makeObservable, observable } from 'mobx';
import type { EditorStore } from '../../../../EditorStore.js';
import {
  service_addConnectionTestData,
  service_addTest,
  service_addTestSuite,
  service_deleteTestSuite,
} from '../../../../../graph-modifier/DSL_Service_GraphModifierHelper.js';
import {
  EmbeddedDataConnectionTypeVisitor,
  createEmptyEqualToJsonAssertion,
} from '../../../../utils/TestableUtils.js';
import {
  isServiceQueryTDS,
  type ServiceEditorState,
} from '../ServiceEditorState.js';
import {
  ServiceTestDataState,
  createConnectionTestData,
} from './ServiceTestDataState.js';
import {
  SERIALIZATION_FORMAT,
  ServiceTestState,
} from './ServiceTestEditorState.js';

const createEmptyServiceTestSuite = (
  serviceTestableState: ServiceTestableState,
): ServiceTestSuite => {
  // setup
  const serviceEditorState = serviceTestableState.serviceEditorState;
  const service = serviceEditorState.service;
  const suite = new ServiceTestSuite();
  suite.id = generateEnumerableNameFromToken(
    service.tests.map((s) => s.id),
    DEFAULT_TEST_SUITE_PREFIX,
  );
  // data
  suite.testData = new TestData();
  const identifiedConnections = getAllIdentifiedServiceConnections(service);
  if (identifiedConnections.length === 1) {
    const connectionVal = guaranteeNonNullable(identifiedConnections[0]);
    const connectionValue = connectionVal.connection;
    const type = returnUndefOnError(() =>
      connectionValue.accept_ConnectionVisitor(
        new EmbeddedDataConnectionTypeVisitor(serviceEditorState.editorStore),
      ),
    );
    if (type) {
      const testData = createConnectionTestData(
        connectionVal,
        type,
        serviceEditorState.editorStore,
      );
      service_addConnectionTestData(
        suite,
        testData,
        serviceEditorState.editorStore.changeDetectionState.observerContext,
      );
    }
  }
  //
  const test = new ServiceTest();
  test.serializationFormat = isServiceQueryTDS(
    serviceEditorState.service,
    serviceEditorState.editorStore,
  )
    ? SERIALIZATION_FORMAT.PURE_TDSOBJECT
    : SERIALIZATION_FORMAT.PURE;
  test.id = generateEnumerableNameFromToken([], DEFAULT_TEST_PREFIX);
  test.__parent = suite;
  suite.tests = [test];
  const assertion = createEmptyEqualToJsonAssertion(test);
  test.assertions = [assertion];
  return suite;
};

export class ServiceTestSuiteState {
  readonly editorStore: EditorStore;
  readonly testableState: ServiceTestableState;
  suite: ServiceTestSuite;
  testDataState: ServiceTestDataState | undefined;
  selectedTestState: ServiceTestState | undefined;
  testStates: ServiceTestState[] = [];
  testToRename: ServiceTest | undefined;
  runningTestState = ActionState.create();

  constructor(suite: ServiceTestSuite, testableState: ServiceTestableState) {
    makeObservable(this, {
      editorStore: false,
      testableState: false,
      testToRename: observable,
      selectedTestState: observable,
      setSelectedTestState: action,
      setTestToRename: action,
      addServiceTest: action,
      runSuite: flow,
      runFailingTests: flow,
    });

    this.editorStore = testableState.editorStore;
    this.testableState = testableState;
    this.suite = suite;
    this.testStates = this.suite.tests
      .filter(filterByType(ServiceTest))
      .map((test) => new ServiceTestState(this, test));
    this.selectedTestState = this.testStates[0];
    this.testDataState = this.suite.testData
      ? new ServiceTestDataState(this.suite.testData, this)
      : undefined;
  }

  setTestToRename(test: ServiceTest | undefined): void {
    this.testToRename = test;
  }

  setSelectedTestState(val: ServiceTestState | undefined): void {
    this.selectedTestState = val;
  }

  addServiceTest(): void {
    const test = new ServiceTest();
    test.serializationFormat = SERIALIZATION_FORMAT.PURE;
    test.id = generateEnumerableNameFromToken(
      this.suite.tests.map((t) => t.id),
      DEFAULT_TEST_PREFIX,
    );
    test.__parent = this.suite;
    const state = new ServiceTestState(this, test);
    state.addAssertion();
    this.selectedTestState = state;
    service_addTest(this.suite, test);
    addUniqueEntry(this.testStates, state);
  }

  deleteTest(testState: ServiceTestState): void {
    deleteEntry(this.suite.tests, testState.test);
    deleteEntry(this.testStates, testState);
    this.selectedTestState =
      this.selectedTestState === testState
        ? this.testStates[0]
        : this.selectedTestState;
  }

  *runSuite(): GeneratorFn<void> {
    try {
      this.runningTestState.inProgress();
      this.testStates.forEach((t) => t.resetResult());
      this.testStates.forEach((t) => t.runningTestAction.inProgress());
      const service = this.testableState.serviceEditorState.service;
      const input = new RunTestsTestableInput(service);
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
      this.runningTestState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.runningTestState.fail();
    } finally {
      this.testStates.forEach((t) => t.runningTestAction.complete());
    }
  }

  *runFailingTests(): GeneratorFn<void> {
    try {
      this.runningTestState.inProgress();
      const service = this.testableState.serviceEditorState.service;
      const input = new RunTestsTestableInput(service);
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
      this.runningTestState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.runningTestState.fail();
    } finally {
      this.testStates.forEach((t) => t.runningTestAction.complete());
    }
  }

  get testCount(): number {
    return this.testStates.length;
  }

  get testPassed(): number {
    return this.testStates.filter(
      (e) =>
        (e.testResultState.result instanceof TestExecuted &&
          e.testResultState.result.testExecutionStatus ===
            TestExecutionStatus.PASS) ||
        (e.testResultState.result instanceof MultiExecutionServiceTestResult &&
          Array.from(
            e.testResultState.result.keyIndexedTestResults.values(),
          ).every(
            (kv) =>
              kv instanceof TestExecuted &&
              kv.testExecutionStatus === TestExecutionStatus.PASS,
          )),
    ).length;
  }

  get testFailed(): number {
    return this.testStates.filter(
      (e) =>
        (e.testResultState.result instanceof TestExecuted &&
          e.testResultState.result.testExecutionStatus !==
            TestExecutionStatus.PASS) ||
        (e.testResultState.result instanceof MultiExecutionServiceTestResult &&
          Array.from(
            e.testResultState.result.keyIndexedTestResults.values(),
          ).every(
            (kv) =>
              kv instanceof TestExecuted &&
              kv.testExecutionStatus !== TestExecutionStatus.PASS,
          )),
    ).length;
  }
}

export class ServiceTestableState {
  readonly editorStore: EditorStore;
  readonly serviceEditorState: ServiceEditorState;
  selectedSuiteState: ServiceTestSuiteState | undefined;
  suiteToRename: ServiceTestSuite | undefined;

  constructor(
    editorStore: EditorStore,
    serviceEditorState: ServiceEditorState,
  ) {
    makeObservable(this, {
      editorStore: false,
      serviceEditorState: false,
      selectedSuiteState: observable,
      suiteToRename: observable,
      initSuites: action,
      addTestSuite: action,
      changeSuite: action,
      setSuiteToRename: action,
      deleteSuite: action,
    });
    this.editorStore = editorStore;
    this.serviceEditorState = serviceEditorState;
    this.initSuites();
  }

  get service(): Service {
    return this.serviceEditorState.service;
  }

  setSuiteToRename(testSuite: ServiceTestSuite | undefined): void {
    this.suiteToRename = testSuite;
  }

  deleteSuite(testSuite: ServiceTestSuite): void {
    service_deleteTestSuite(this.serviceEditorState.service, testSuite);
    if (this.selectedSuiteState?.suite === testSuite) {
      this.selectedSuiteState = this.serviceEditorState.service.tests.length
        ? new ServiceTestSuiteState(
            this.serviceEditorState.service.tests[0] as ServiceTestSuite,
            this,
          )
        : undefined;
    }
  }

  changeSuite(suite: ServiceTestSuite): void {
    this.selectedSuiteState = new ServiceTestSuiteState(suite, this);
  }

  initSuites(): void {
    const serviceSuite = this.serviceEditorState.service.tests[0];
    if (serviceSuite instanceof ServiceTestSuite) {
      this.selectedSuiteState = new ServiceTestSuiteState(serviceSuite, this);
    } else {
      this.selectedSuiteState = undefined;
    }
  }

  addTestSuite(): void {
    try {
      const suite = createEmptyServiceTestSuite(this);
      service_addTestSuite(
        this.serviceEditorState.service,
        suite,
        this.serviceEditorState.editorStore.changeDetectionState
          .observerContext,
      );
      this.selectedSuiteState = new ServiceTestSuiteState(suite, this);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(
        `Unable to create service test suite: ${error.message}`,
      );
    }
  }
}
