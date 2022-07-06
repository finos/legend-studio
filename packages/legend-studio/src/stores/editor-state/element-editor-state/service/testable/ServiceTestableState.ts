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
  TestPassed,
  TestFailed,
  ServiceTestSuite,
  TestData,
  ConnectionTestData,
  ServiceTest,
  EqualToJson,
  ExternalFormatData,
  RunTestsTestableInput,
  AtomicTestId,
  DEFAULT_TEST_SUITE_PREFIX,
  DEFAULT_TEST_PREFIX,
  TestError,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  addUniqueEntry,
  assertErrorThrown,
  filterByType,
  ActionState,
  assertNonNullable,
  ContentType,
  deleteEntry,
  isNonNullable,
  returnUndefOnError,
  generateEnumerableNameFromToken,
} from '@finos/legend-shared';
import { action, flow, makeObservable, observable } from 'mobx';
import type { EditorStore } from '../../../../EditorStore.js';
import {
  service_addTest,
  service_addTestSuite,
  service_deleteTestSuite,
} from '../../../../graphModifier/DSLService_GraphModifierHelper.js';
import {
  createEmptyEqualToJsonAssertion,
  getAllIdentifiedConnectionsFromRuntime,
  TEMPORARY_EmbeddedDataConnectionVisitor,
} from '../../../../shared/testable/TestableUtils.js';
import type { ServiceEditorState } from '../ServiceEditorState.js';
import { ServiceTestDataState } from './ServiceTestDataState.js';
import { ServiceTestState } from './ServiceTestEditorState.js';

const createEmptyServiceTestSuite = (service: Service): ServiceTestSuite => {
  const suite = new ServiceTestSuite();
  suite.id = generateEnumerableNameFromToken(
    service.tests.map((s) => s.id),
    DEFAULT_TEST_SUITE_PREFIX,
  );
  suite.testData = new TestData();
  const test = new ServiceTest();
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
  testDataState: ServiceTestDataState;
  selectedTestState: ServiceTestState | undefined;
  testStates: ServiceTestState[] = [];
  testToRename: ServiceTest | undefined;
  isRunningTest = ActionState.create();

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
    this.testDataState = new ServiceTestDataState(this.suite.testData, this);
  }

  setTestToRename(test: ServiceTest | undefined): void {
    this.testToRename = test;
  }

  setSelectedTestState(val: ServiceTestState | undefined): void {
    this.selectedTestState = val;
  }

  addServiceTest(): void {
    const test = new ServiceTest();
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
      this.isRunningTest.inProgress();
      this.testStates.forEach((t) => t.resetResult());
      this.testStates.forEach((t) => t.runningTestAction.inProgress());
      const service = this.testableState.serviceEditorState.service;
      const input = new RunTestsTestableInput(service);
      input.unitTestIds = this.suite.tests.map(
        (t) => new AtomicTestId(this.suite, t),
      );
      const testResults =
        (yield this.editorStore.graphManagerState.graphManager.runTests(
          [input],
          this.editorStore.graphManagerState.graph,
        )) as TestResult[];
      testResults.forEach((result) => {
        const state = this.testStates.find(
          (t) => t.test === result.atomicTestId.atomicTest,
        );
        state?.handleTestResult(result);
      });
      this.isRunningTest.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notifyError(error);
      this.isRunningTest.fail();
    } finally {
      this.testStates.forEach((t) => t.runningTestAction.complete());
    }
  }

  *runFailingTests(): GeneratorFn<void> {
    try {
      this.isRunningTest.inProgress();
      const service = this.testableState.serviceEditorState.service;
      const input = new RunTestsTestableInput(service);
      input.unitTestIds = this.testStates
        .map((testState) => {
          const result = testState.testResultState.result;
          if (result instanceof TestFailed || result instanceof TestError) {
            testState.runningTestAction.inProgress();
            return new AtomicTestId(this.suite, testState.test);
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
        const state = this.testStates.find(
          (t) => t.test === result.atomicTestId.atomicTest,
        );
        state?.handleTestResult(result);
      });
      this.isRunningTest.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notifyError(error);
      this.isRunningTest.fail();
    } finally {
      this.testStates.forEach((t) => t.runningTestAction.complete());
    }
  }

  get testCount(): number {
    return this.testStates.length;
  }

  get testPassed(): number {
    return this.testStates.filter(
      (e) => e.testResultState.result instanceof TestPassed,
    ).length;
  }

  get testFailed(): number {
    return this.testStates.filter(
      (e) =>
        e.testResultState.result &&
        !(e.testResultState.result instanceof TestPassed),
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
    const suites = this.serviceEditorState.service.tests;
    if (suites.length) {
      this.selectedSuiteState = new ServiceTestSuiteState(
        suites[0] as ServiceTestSuite,
        this,
      );
    } else {
      this.addTestSuite();
    }
  }

  addTestSuite(): void {
    const suite = createEmptyServiceTestSuite(this.serviceEditorState.service);
    service_addTestSuite(
      this.serviceEditorState.service,
      suite,
      this.serviceEditorState.editorStore.changeDetectionState.observerContext,
    );
    this.selectedSuiteState = new ServiceTestSuiteState(suite, this);
  }

  // TODO: FIX
  generateServiceSuite(): void {
    try {
      const executionContext =
        this.serviceEditorState.executionState.serviceExecutionParameters;
      assertNonNullable(
        executionContext,
        'Query, Mapping and Runtime is required to generate service suite',
      );
      const suite = new ServiceTestSuite();
      suite.id = 'suite_1';
      const connections = getAllIdentifiedConnectionsFromRuntime(
        executionContext.runtime,
      );
      suite.testData = new TestData();
      suite.testData.connectionsTestData = connections
        .map((e) => {
          const _data = returnUndefOnError(() =>
            e.connection.accept_ConnectionVisitor(
              new TEMPORARY_EmbeddedDataConnectionVisitor(this.editorStore),
            ),
          );
          if (_data) {
            const conData = new ConnectionTestData();
            conData.connectionId = e.id;
            conData.testData = _data;
            return conData;
          }
          return undefined;
        })
        .filter(isNonNullable);
      const test = new ServiceTest();
      test.id = `test_1`;
      // TODO generate param values
      // we will generate `toJSON` value for now
      const _equalToJson = new EqualToJson();
      _equalToJson.id = 'assertion_1';
      const data = new ExternalFormatData();
      data.contentType = ContentType.APPLICATION_JSON;
      data.data = '{}';
      _equalToJson.expected = data;
      test.assertions = [_equalToJson];
      service_addTestSuite(
        this.serviceEditorState.service,
        suite,
        this.editorStore.changeDetectionState.observerContext,
      );
    } catch (error) {
      // console
    }
  }
}
