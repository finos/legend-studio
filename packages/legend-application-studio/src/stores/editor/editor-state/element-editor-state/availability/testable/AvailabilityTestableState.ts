/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  type Availability,
  AvailabilityBarrierTest,
  AvailabilityTestSuite,
  EqualToJson,
  ExternalFormatData,
  RelationElement,
  RelationElementsData,
  RelationRowTestData,
  DEFAULT_TEST_PREFIX,
  DEFAULT_TEST_SUITE_PREFIX,
  DEFAULT_TEST_ASSERTION_PREFIX,
  observe_AvailabilityBarrierTest,
  observe_AvailabilityTestSuite,
  observe_EqualToJson,
  observe_ExternalFormatData,
  observe_RelationElement,
  observe_RelationElementsData,
  observe_RelationRowTestData,
} from '@finos/legend-graph';
import { action, computed, flow, makeObservable, observable } from 'mobx';
import {
  addUniqueEntry,
  generateEnumerableNameFromToken,
  type GeneratorFn,
  guaranteeType,
} from '@finos/legend-shared';
import type { AvailabilityEditorState } from '../AvailabilityEditorState.js';
import {
  getTestableResultFromTestResults,
  type TESTABLE_RESULT,
} from '../../../../sidebar-state/testable/GlobalTestRunnerState.js';
import {
  TestableTestEditorState,
  TestableTestSuiteEditorState,
} from '../../testable/TestableEditorState.js';
import { RelationElementsDataState } from '../../data/EmbeddedDataState.js';
import { atomicTest_addAssertion } from '../../../../../graph-modifier/Testable_GraphModifierHelper.js';

const DEFAULT_RELATION_PATH = 'barrier';

export const AVAILABILITY_WATERMARK_TEMPLATE_JSON: Record<string, string> = {
  DEFAULT: '{"eventId":"","status":"","watermarkTimestamp":""}',
  LITE: '{"eventId":""}',
  ALLOY_QUERY: '{"query":"","parameters":{}}',
};

const createDefaultRelationElement = (): RelationElement => {
  const element = new RelationElement();
  element.paths = [DEFAULT_RELATION_PATH];
  element.columns = [];
  const row = new RelationRowTestData();
  row.values = [];
  element.rows = [observe_RelationRowTestData(row)];
  return observe_RelationElement(element);
};

const createDefaultRelationElementsData = (): RelationElementsData => {
  const testData = new RelationElementsData();
  testData.relationElements = [createDefaultRelationElement()];
  return observe_RelationElementsData(testData);
};

const createDefaultAssertion = (test: AvailabilityBarrierTest): EqualToJson => {
  const externalFormatData = new ExternalFormatData();
  externalFormatData.contentType = 'application/json';
  externalFormatData.data = AVAILABILITY_WATERMARK_TEMPLATE_JSON.DEFAULT ?? '';
  const assertion = new EqualToJson();
  assertion.id = generateEnumerableNameFromToken(
    test.assertions.map((value) => value.id),
    DEFAULT_TEST_ASSERTION_PREFIX,
  );
  assertion.parentTest = test;
  assertion.expected = observe_ExternalFormatData(externalFormatData);
  return observe_EqualToJson(assertion);
};

const createDefaultTest = (
  suite: AvailabilityTestSuite,
): AvailabilityBarrierTest => {
  const test = new AvailabilityBarrierTest();
  test.id = generateEnumerableNameFromToken(
    suite.tests.map((value) => value.id),
    DEFAULT_TEST_PREFIX,
  );
  test.__parent = suite;
  test.watermarkSerializationFormat = 'DEFAULT';
  const observedTest = observe_AvailabilityBarrierTest(test);
  atomicTest_addAssertion(observedTest, createDefaultAssertion(observedTest));
  return observedTest;
};

const createDefaultSuite = (
  availability: Availability,
): AvailabilityTestSuite => {
  const suite = new AvailabilityTestSuite();
  suite.id = generateEnumerableNameFromToken(
    availability.tests.map((value) => value.id),
    DEFAULT_TEST_SUITE_PREFIX,
  );
  suite.__parent = availability;
  suite.testData = createDefaultRelationElementsData();
  const observedSuite = observe_AvailabilityTestSuite(suite);
  addUniqueEntry(observedSuite.tests, createDefaultTest(observedSuite));
  return observedSuite;
};

export class AvailabilityTestState extends TestableTestEditorState {
  readonly suiteState: AvailabilityTestSuiteState;
  override test: AvailabilityBarrierTest;

  constructor(
    suiteState: AvailabilityTestSuiteState,
    test: AvailabilityBarrierTest,
  ) {
    super(
      suiteState.testableState.availability,
      test,
      suiteState.testableState.editorState.isReadOnly,
      suiteState.editorStore,
    );
    makeObservable(this, {
      selectedAsertionState: observable,
      selectedTab: observable,
      assertionToRename: observable,
      assertionEditorStates: observable,
      testResultState: observable,
      debugTestResultState: observable,
      runningTestAction: observable,
      setAssertionToRename: action,
      setSelectedTab: action,
      addAssertion: action,
      deleteAssertion: action,
      openAssertion: action,
      handleTestResult: action,
      resetResult: action,
      runTest: flow,
      debugTest: flow,
      setWatermarkSerializationFormat: action,
      applyWatermarkTemplate: action,
    });

    this.suiteState = suiteState;
    this.test = test;
  }

  setWatermarkSerializationFormat(val: string | undefined): void {
    this.test.watermarkSerializationFormat = val;
  }

  applyWatermarkTemplate(format: string): void {
    const templateJson = AVAILABILITY_WATERMARK_TEMPLATE_JSON[format];
    if (!templateJson) {
      return;
    }
    this.setWatermarkSerializationFormat(format);
    const firstAssertion = this.test.assertions[0];
    if (firstAssertion instanceof EqualToJson) {
      firstAssertion.expected.data = templateJson;
    }
  }
}

export class AvailabilityTestSuiteState extends TestableTestSuiteEditorState {
  readonly testableState: AvailabilityTestableState;
  override suite: AvailabilityTestSuite;
  override testStates: AvailabilityTestState[] = [];
  override selectTestState: AvailabilityTestState | undefined;
  testToRename: AvailabilityBarrierTest | undefined;
  readonly testDataState: RelationElementsDataState;

  constructor(
    testableState: AvailabilityTestableState,
    suite: AvailabilityTestSuite,
  ) {
    super(
      testableState.availability,
      suite,
      testableState.editorState.isReadOnly,
      testableState.editorState.editorStore,
    );
    makeObservable(this, {
      selectTestState: observable,
      testStates: observable,
      testToRename: observable,
      runningSuiteState: observable,
      setTestToRename: action,
      changeTest: action,
      addTest: action,
      deleteTest: action,
      runSuite: flow,
      runFailingTests: flow,
    });

    this.testableState = testableState;
    this.suite = suite;
    this.testStates = this.buildTestStates();
    this.selectTestState = this.testStates[0];
    const suiteTestData =
      this.suite.testData ?? createDefaultRelationElementsData();
    this.suite.testData = suiteTestData;
    this.testDataState = new RelationElementsDataState(
      this.editorStore,
      suiteTestData,
    );
  }

  private buildTestStates(): AvailabilityTestState[] {
    return this.suite.tests
      .map((value) => guaranteeType(value, AvailabilityBarrierTest))
      .map((value) => new AvailabilityTestState(this, value));
  }

  setTestToRename(test: AvailabilityBarrierTest | undefined): void {
    this.testToRename = test;
  }

  addTest(): void {
    const test = createDefaultTest(this.suite);
    addUniqueEntry(this.suite.tests, test);
    const state = new AvailabilityTestState(this, test);
    addUniqueEntry(this.testStates, state);
    this.selectTestState = state;
  }

  override deleteTest(test: AvailabilityBarrierTest): void {
    super.deleteTest(test);
    this.selectTestState = this.testStates[0];
  }

  get result(): TESTABLE_RESULT {
    return getTestableResultFromTestResults(
      this.testStates.map((state) => state.testResultState.result),
    );
  }
}

export class AvailabilityTestableState {
  readonly editorState: AvailabilityEditorState;
  selectedSuiteState: AvailabilityTestSuiteState | undefined;
  suiteToRename: AvailabilityTestSuite | undefined;

  constructor(editorState: AvailabilityEditorState) {
    this.editorState = editorState;

    makeObservable(this, {
      selectedSuiteState: observable,
      suiteToRename: observable,
      suites: computed,
      suiteCount: computed,
      testCount: computed,
      initSuites: action,
      changeSuite: action,
      addSuite: action,
      setSuiteToRename: action,
      deleteSuite: action,
      runSuite: flow,
      runFailingSuiteTests: flow,
    });

    this.initSuites();
  }

  get availability(): Availability {
    return this.editorState.availability;
  }

  initSuites(): void {
    const suite = this.availability.tests[0];
    this.selectedSuiteState =
      suite instanceof AvailabilityTestSuite
        ? new AvailabilityTestSuiteState(this, suite)
        : undefined;
  }

  setSuiteToRename(suite: AvailabilityTestSuite | undefined): void {
    this.suiteToRename = suite;
  }

  changeSuite(suite: AvailabilityTestSuite): void {
    this.selectedSuiteState = new AvailabilityTestSuiteState(this, suite);
  }

  addSuite(): void {
    const suite = createDefaultSuite(this.availability);
    addUniqueEntry(this.availability.tests, suite);
    this.selectedSuiteState = new AvailabilityTestSuiteState(this, suite);
  }

  deleteSuite(suite: AvailabilityTestSuite): void {
    const idx = this.availability.tests.indexOf(suite);
    if (idx !== -1) {
      this.availability.tests.splice(idx, 1);
    }
    if (this.selectedSuiteState?.suite === suite) {
      const nextSuite = this.availability.tests[0];
      this.selectedSuiteState =
        nextSuite instanceof AvailabilityTestSuite
          ? new AvailabilityTestSuiteState(this, nextSuite)
          : undefined;
    }
  }

  *runSuite(): GeneratorFn<void> {
    if (!this.selectedSuiteState) {
      return;
    }
    yield* this.selectedSuiteState.runSuite();
  }

  *runFailingSuiteTests(): GeneratorFn<void> {
    if (!this.selectedSuiteState) {
      return;
    }
    yield* this.selectedSuiteState.runFailingTests();
  }

  get suites(): AvailabilityTestSuite[] {
    return this.editorState.availability.tests;
  }

  get suiteCount(): number {
    return this.suites.length;
  }

  get testCount(): number {
    return this.suites.reduce((sum, suite) => sum + suite.tests.length, 0);
  }
}
