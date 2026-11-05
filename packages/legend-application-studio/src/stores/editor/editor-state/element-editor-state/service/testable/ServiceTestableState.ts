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
  resolveServiceQueryRawLambda,
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
import { action, computed, flow, makeObservable, observable } from 'mobx';
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
  regenerateAllExpectedResultsForTestable,
  type RegeneratableTestableState,
} from '../../../../utils/TestableUtils.js';
import {
  getSavedServiceQueryHash,
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
import {
  LegendStudioTelemetryHelper,
  SERVICE_TEST_SUITE_RUN_MODE,
  TESTABLE_KIND,
  summarizeTestResults,
} from '../../../../../../__lib__/LegendStudioTelemetryHelper.js';

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
    const service = this.testableState.serviceEditorState.service;
    const input = new RunTestsTestableInput(service);
    input.unitTestIds = this.suite.tests.map(
      (t) => new UniqueTestId(this.suite, t),
    );
    const telemetryData = {
      servicePath: service.path,
      suiteId: this.suite.id,
      mode: SERVICE_TEST_SUITE_RUN_MODE.RUN_SUITE,
      testCount: input.unitTestIds.length,
    };
    const startTime = Date.now();
    LegendStudioTelemetryHelper.logEvent_ServiceTestSuiteRunLaunched(
      this.editorStore.applicationStore.telemetryService,
      this.editorStore.editorMode.getSourceInfo(),
      telemetryData,
    );
    try {
      this.runningTestState.inProgress();
      this.testStates.forEach((t) => t.resetResult());
      this.testStates.forEach((t) => t.runningTestAction.inProgress());
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
      LegendStudioTelemetryHelper.logEvent_ServiceTestSuiteRunSucceeded(
        this.editorStore.applicationStore.telemetryService,
        this.editorStore.editorMode.getSourceInfo(),
        {
          ...telemetryData,
          durationMs: Date.now() - startTime,
          ...summarizeTestResults(testResults),
        },
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.runningTestState.fail();
      LegendStudioTelemetryHelper.logEvent_ServiceTestSuiteRunFailure(
        this.editorStore.applicationStore.telemetryService,
        this.editorStore.editorMode.getSourceInfo(),
        { ...telemetryData, errorMessage: error.message },
      );
    } finally {
      this.testStates.forEach((t) => t.runningTestAction.complete());
    }
  }

  *runFailingTests(): GeneratorFn<void> {
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
    const telemetryData = {
      servicePath: service.path,
      suiteId: this.suite.id,
      mode: SERVICE_TEST_SUITE_RUN_MODE.RUN_FAILING,
      testCount: input.unitTestIds.length,
    };
    const startTime = Date.now();
    LegendStudioTelemetryHelper.logEvent_ServiceTestSuiteRunLaunched(
      this.editorStore.applicationStore.telemetryService,
      this.editorStore.editorMode.getSourceInfo(),
      telemetryData,
    );
    try {
      this.runningTestState.inProgress();
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
      LegendStudioTelemetryHelper.logEvent_ServiceTestSuiteRunSucceeded(
        this.editorStore.applicationStore.telemetryService,
        this.editorStore.editorMode.getSourceInfo(),
        {
          ...telemetryData,
          durationMs: Date.now() - startTime,
          ...summarizeTestResults(testResults),
        },
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.runningTestState.fail();
      LegendStudioTelemetryHelper.logEvent_ServiceTestSuiteRunFailure(
        this.editorStore.applicationStore.telemetryService,
        this.editorStore.editorMode.getSourceInfo(),
        { ...telemetryData, errorMessage: error.message },
      );
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

/**
 * Whether the service has at least one test. A suite with no tests doesn't count:
 * there is nothing to regenerate, so nothing for a warning to point at.
 */
export const serviceHasTests = (service: Service): boolean =>
  service.tests.some((suite) => suite.tests.length > 0);

/**
 * Snapshot of each suite's test data hash, keyed by suite (not id) so renaming or
 * deleting other suites does not disturb the comparison.
 */
export const snapshotServiceTestDataHashes = (
  service: Service,
): Map<ServiceTestSuite, string> =>
  new Map(
    service.tests
      .filter(filterByType(ServiceTestSuite))
      .map((suite) => [suite, suite.testData?.hashCode ?? '']),
  );

/**
 * Whether the test data of any suite present in the snapshot has changed since it was
 * taken. Suites added after the snapshot are ignored: their tests are still being
 * authored, so there are no previously-generated expected results to go stale.
 */
export const hasServiceTestDataChanged = (
  service: Service,
  snapshot: Map<ServiceTestSuite, string>,
): boolean =>
  service.tests.filter(filterByType(ServiceTestSuite)).some((suite) => {
    const snapshotHash = snapshot.get(suite);
    return (
      snapshotHash !== undefined &&
      snapshotHash !== (suite.testData?.hashCode ?? '')
    );
  });

export class ServiceTestableState implements RegeneratableTestableState {
  readonly editorStore: EditorStore;
  readonly serviceEditorState: ServiceEditorState;
  selectedSuiteState: ServiceTestSuiteState | undefined;
  suiteToRename: ServiceTestSuite | undefined;
  isRegeneratingExpectedResultsState = ActionState.create();
  lastRegeneratedQueryHash: string | undefined;
  testDataHashSnapshot: Map<ServiceTestSuite, string>;

  constructor(
    editorStore: EditorStore,
    serviceEditorState: ServiceEditorState,
  ) {
    makeObservable(this, {
      editorStore: false,
      serviceEditorState: false,
      selectedSuiteState: observable,
      suiteToRename: observable,
      lastRegeneratedQueryHash: observable,
      testDataHashSnapshot: observable.ref,
      isQueryChangedSinceSaved: computed,
      isTestDataChanged: computed,
      initSuites: action,
      addTestSuite: action,
      changeSuite: action,
      setSuiteToRename: action,
      deleteSuite: action,
      setLastRegeneratedQueryHash: action,
      setTestDataHashSnapshot: action,
      regenerateAllExpectedResults: flow,
    });
    this.editorStore = editorStore;
    this.serviceEditorState = serviceEditorState;
    this.testDataHashSnapshot = snapshotServiceTestDataHashes(
      serviceEditorState.service,
    );
    this.initSuites();
  }

  get service(): Service {
    return this.serviceEditorState.service;
  }

  get isQueryChangedSinceSaved(): boolean {
    const currentQueryHash = resolveServiceQueryRawLambda(
      this.service,
    )?.hashCode;
    const savedQueryHash = getSavedServiceQueryHash(
      this.editorStore.changeDetectionState.workspaceLocalLatestRevisionState
        .entities,
      this.service.path,
    );
    return (
      serviceHasTests(this.service) &&
      currentQueryHash !== undefined &&
      savedQueryHash !== undefined &&
      currentQueryHash !== savedQueryHash &&
      currentQueryHash !== this.lastRegeneratedQueryHash
    );
  }

  setLastRegeneratedQueryHash(val: string | undefined): void {
    this.lastRegeneratedQueryHash = val;
  }

  get isTestDataChanged(): boolean {
    return (
      serviceHasTests(this.service) &&
      hasServiceTestDataChanged(this.service, this.testDataHashSnapshot)
    );
  }

  setTestDataHashSnapshot(val: Map<ServiceTestSuite, string>): void {
    this.testDataHashSnapshot = val;
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

  *regenerateAllExpectedResults(): GeneratorFn<void> {
    const service = this.service;
    // captured up front: this is the query the engine runs the tests against
    const regeneratedQueryHash =
      resolveServiceQueryRawLambda(service)?.hashCode;
    const regeneratedTestDataHashSnapshot =
      snapshotServiceTestDataHashes(service);
    const unitTestIds: UniqueTestId[] = [];
    service.tests.filter(filterByType(ServiceTestSuite)).forEach((suite) => {
      suite.tests.forEach((t) => unitTestIds.push(new UniqueTestId(suite, t)));
    });
    yield* regenerateAllExpectedResultsForTestable(
      this.editorStore,
      this.isRegeneratingExpectedResultsState,
      service,
      unitTestIds,
      {
        testableKind: TESTABLE_KIND.SERVICE,
        testablePath: service.path,
        testCount: unitTestIds.length,
      },
      () => {
        this.selectedSuiteState?.testStates.forEach((t) => t.resetResult());
        this.setLastRegeneratedQueryHash(regeneratedQueryHash);
        this.setTestDataHashSnapshot(regeneratedTestDataHashSnapshot);
      },
    );
  }
}
