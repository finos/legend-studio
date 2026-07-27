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
  ContentType,
  generateEnumerableNameFromToken,
  type GeneratorFn,
  guaranteeType,
  isString,
  tryToFormatLosslessJSONString,
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
import {
  RelationElementsDataState,
  RelationElementState,
} from '../../data/EmbeddedDataState.js';
import { atomicTest_addAssertion } from '../../../../../graph-modifier/Testable_GraphModifierHelper.js';
import { externalFormatData_setData } from '../../../../../graph-modifier/DSL_Data_GraphModifierHelper.js';

// ─── Availability constants ─────────────────────────────────────────────────

export enum AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT {
  DEFAULT = 'DEFAULT',
  LITE = 'LITE',
  ALLOY_QUERY = 'ALLOY_QUERY',
}

const DEFAULT_RELATION_PATH = 'barrier';

// Hard-coded columns shared by every availability barrier test.
export const AVAILABILITY_TEST_DATA_COLUMNS = [
  'ingest_definition_path',
  'batch_id',
  'ingest_completed_ts_utc',
];

// Default fixed timestamp populated for new rows.
export const DEFAULT_INGEST_COMPLETED_TS_UTC = '2025-01-01T00:00:00Z';

const AVAILABILITY_COLUMN_DEFAULTS: Record<string, string> = {
  ingest_completed_ts_utc: DEFAULT_INGEST_COMPLETED_TS_UTC,
};

// ─── Watermark expected-JSON templates (matches backend responses) ──────────

const buildDefaultBatch = (): Record<string, unknown> => ({
  batchId: 0,
  ingestDefinitionPath: '',
  ingestDefinitionReference: { ingestDefinitionUrn: '' },
});

const buildLiteEntry = (): Record<string, unknown> => ({
  ingestDefinitionPath: '',
  batchId: 0,
});

const buildAlloyQueryEntry = (): [string, Record<string, unknown>] => [
  '',
  { batchId: 0 },
];

const buildDefaultTemplate = (): Record<string, unknown> => ({
  availabilityDefinitionReference: { availabilityDefinitionUrn: '' },
  evaluatedWatermark: {
    watermarkBatches: [buildDefaultBatch()],
  },
  evaluationResult: true,
  eventId: 0,
  watermarkId: '',
});

const buildLiteTemplate = (): unknown[] => [buildLiteEntry()];

const buildAlloyQueryTemplate = (): Record<string, unknown> => {
  const [key, value] = buildAlloyQueryEntry();
  return { [key]: value };
};

const buildTemplateForFormat = (
  format: AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT,
): unknown => {
  switch (format) {
    case AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT.LITE:
      return buildLiteTemplate();
    case AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT.ALLOY_QUERY:
      return buildAlloyQueryTemplate();
    case AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT.DEFAULT:
    default:
      return buildDefaultTemplate();
  }
};

const stringifyTemplate = (value: unknown): string =>
  JSON.stringify(value, null, 2);

// ─── Test-data helpers ──────────────────────────────────────────────────────

const createDefaultRelationElement = (): RelationElement => {
  const element = new RelationElement();
  element.paths = [DEFAULT_RELATION_PATH];
  element.columns = [...AVAILABILITY_TEST_DATA_COLUMNS];
  const row = new RelationRowTestData();
  row.values = AVAILABILITY_TEST_DATA_COLUMNS.map(
    (col) => AVAILABILITY_COLUMN_DEFAULTS[col] ?? '',
  );
  element.rows = [observe_RelationRowTestData(row)];
  return observe_RelationElement(element);
};

const createDefaultRelationElementsData = (): RelationElementsData => {
  const testData = new RelationElementsData();
  testData.relationElements = [createDefaultRelationElement()];
  return observe_RelationElementsData(testData);
};

// ─── Assertion / test / suite factories ─────────────────────────────────────

const createDefaultAssertion = (
  test: AvailabilityBarrierTest,
  format: AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT,
): EqualToJson => {
  const externalFormatData = new ExternalFormatData();
  externalFormatData.contentType = ContentType.APPLICATION_JSON;
  externalFormatData.data = stringifyTemplate(buildTemplateForFormat(format));
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
  format: AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT,
  id?: string,
): AvailabilityBarrierTest => {
  const test = new AvailabilityBarrierTest();
  test.id =
    id ??
    generateEnumerableNameFromToken(
      suite.tests.map((value) => value.id),
      DEFAULT_TEST_PREFIX,
    );
  test.__parent = suite;
  test.watermarkSerializationFormat = format;
  const observedTest = observe_AvailabilityBarrierTest(test);
  atomicTest_addAssertion(
    observedTest,
    createDefaultAssertion(observedTest, format),
  );
  return observedTest;
};

const createDefaultSuite = (
  availability: Availability,
  format: AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT,
  suiteId?: string,
  testId?: string,
): AvailabilityTestSuite => {
  const suite = new AvailabilityTestSuite();
  suite.id =
    suiteId ??
    generateEnumerableNameFromToken(
      availability.tests.map((value) => value.id),
      DEFAULT_TEST_SUITE_PREFIX,
    );
  suite.__parent = availability;
  suite.testData = createDefaultRelationElementsData();
  const observedSuite = observe_AvailabilityTestSuite(suite);
  addUniqueEntry(
    observedSuite.tests,
    createDefaultTest(observedSuite, format, testId),
  );
  return observedSuite;
};

// ─── Per-test state ─────────────────────────────────────────────────────────

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
      format: computed,
      firstJsonAssertion: computed,
      setAssertionToRename: action,
      setSelectedTab: action,
      addAssertion: action,
      deleteAssertion: action,
      openAssertion: action,
      handleTestResult: action,
      resetResult: action,
      setExpectedValue: action,
      formatExpected: action,
      runTest: flow,
      debugTest: flow,
    });

    this.suiteState = suiteState;
    this.test = test;
  }

  get format(): AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT {
    const raw = this.test.watermarkSerializationFormat;
    if (
      raw === AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT.LITE ||
      raw === AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT.ALLOY_QUERY
    ) {
      return raw;
    }
    return AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT.DEFAULT;
  }

  get firstJsonAssertion(): EqualToJson | undefined {
    const first = this.test.assertions[0];
    return first instanceof EqualToJson ? first : undefined;
  }

  get expectedValue(): string {
    return this.firstJsonAssertion?.expected.data ?? '';
  }

  setExpectedValue(val: string): void {
    const assertion = this.firstJsonAssertion;
    if (!assertion) {
      return;
    }
    externalFormatData_setData(assertion.expected, val);
  }

  formatExpected(): void {
    const assertion = this.firstJsonAssertion;
    if (!assertion) {
      return;
    }
    externalFormatData_setData(
      assertion.expected,
      tryToFormatLosslessJSONString(assertion.expected.data),
    );
  }
}

// ─── Per-suite state ────────────────────────────────────────────────────────

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

    // Ensure the suite has test data with the canonical shape (hard-coded columns).
    const suiteTestData =
      this.suite.testData ?? createDefaultRelationElementsData();
    this.suite.testData = suiteTestData;
    this.testDataState = new RelationElementsDataState(
      this.editorStore,
      suiteTestData,
    );
    // Rebuild child states with column defaults so newly added rows are seeded
    // with the hard-coded `ingest_completed_ts_utc` value. Column editing is
    // enabled so users can add/remove columns beyond the seeded schema.
    this.testDataState.relationElementStates =
      suiteTestData.relationElements.map(
        (relationElement) =>
          new RelationElementState(relationElement, {
            columnDefaults: AVAILABILITY_COLUMN_DEFAULTS,
          }),
      );
    this.testDataState.activeRelationElement =
      this.testDataState.relationElementStates[0];

    this.testStates = this.buildTestStates();
    this.selectTestState = this.testStates[0];
  }

  private buildTestStates(): AvailabilityTestState[] {
    return this.suite.tests
      .map((value) => guaranteeType(value, AvailabilityBarrierTest))
      .map((value) => new AvailabilityTestState(this, value));
  }

  setTestToRename(test: AvailabilityBarrierTest | undefined): void {
    this.testToRename = test;
  }

  addTest(
    format: AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT,
    id?: string,
  ): AvailabilityTestState {
    const test = createDefaultTest(this.suite, format, id);
    addUniqueEntry(this.suite.tests, test);
    const state = new AvailabilityTestState(this, test);
    addUniqueEntry(this.testStates, state);
    this.selectTestState = state;
    return state;
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

// ─── Top-level testable state ───────────────────────────────────────────────

export class AvailabilityTestableState {
  readonly editorState: AvailabilityEditorState;
  selectedSuiteState: AvailabilityTestSuiteState | undefined;
  suiteToRename: AvailabilityTestSuite | undefined;
  showCreateSuiteModal = false;
  showCreateTestModal = false;

  constructor(editorState: AvailabilityEditorState) {
    this.editorState = editorState;

    makeObservable(this, {
      selectedSuiteState: observable,
      suiteToRename: observable,
      showCreateSuiteModal: observable,
      showCreateTestModal: observable,
      suites: computed,
      suiteCount: computed,
      testCount: computed,
      initSuites: action,
      changeSuite: action,
      addSuite: action,
      setSuiteToRename: action,
      setShowCreateSuiteModal: action,
      setShowCreateTestModal: action,
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

  setShowCreateSuiteModal(val: boolean): void {
    this.showCreateSuiteModal = val;
  }

  setShowCreateTestModal(val: boolean): void {
    this.showCreateTestModal = val;
  }

  changeSuite(suite: AvailabilityTestSuite): void {
    this.selectedSuiteState = new AvailabilityTestSuiteState(this, suite);
  }

  addSuite(
    format: AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT,
    suiteId?: string,
    testId?: string,
  ): AvailabilityTestSuiteState {
    const suite = createDefaultSuite(
      this.availability,
      format,
      isString(suiteId) && suiteId ? suiteId : undefined,
      isString(testId) && testId ? testId : undefined,
    );
    addUniqueEntry(this.availability.tests, suite);
    const state = new AvailabilityTestSuiteState(this, suite);
    this.selectedSuiteState = state;
    return state;
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
