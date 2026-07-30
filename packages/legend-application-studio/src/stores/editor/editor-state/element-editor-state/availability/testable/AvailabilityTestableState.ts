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
  RelationRowTestData,
  DEFAULT_TEST_PREFIX,
  DEFAULT_TEST_SUITE_PREFIX,
  DEFAULT_TEST_ASSERTION_PREFIX,
  observe_AvailabilityBarrierTest,
  observe_AvailabilityTestSuite,
  observe_EqualToJson,
  observe_ExternalFormatData,
  observe_RelationElement,
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
import { RelationElementState } from '../../data/EmbeddedDataState.js';
import { atomicTest_addAssertion } from '../../../../../graph-modifier/Testable_GraphModifierHelper.js';
import { externalFormatData_setData } from '../../../../../graph-modifier/DSL_Data_GraphModifierHelper.js';

// ─── Constants ──────────────────────────────────────────────────────────────

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

// ─── Watermark expected-JSON models ─────────────────────────────────────────
// These types model the shape of the `EqualToJson.expected` payload for each
// watermark serialization format, so we can add/remove entries with typed
// mutations rather than juggling `unknown` and path-walking helpers.

type WatermarkBatch = {
  batchId: number;
  ingestDefinitionPath: string;
  ingestDefinitionReference: { ingestDefinitionUrn: string };
};

type WatermarkExpectedDefault = {
  availabilityDefinitionReference: { availabilityDefinitionUrn: string };
  evaluatedWatermark: { watermarkBatches: WatermarkBatch[] };
  evaluationResult: boolean;
  eventId: number;
  watermarkId: string;
};

type WatermarkLiteEntry = { ingestDefinitionPath: string; batchId: number };

type WatermarkAlloyQueryEntry = { batchId: number };

type WatermarkExpected =
  | {
      format: AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT.DEFAULT;
      value: WatermarkExpectedDefault;
    }
  | {
      format: AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT.LITE;
      value: WatermarkLiteEntry[];
    }
  | {
      format: AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT.ALLOY_QUERY;
      value: Record<string, WatermarkAlloyQueryEntry>;
    };

const buildWatermarkBatch = (): WatermarkBatch => ({
  batchId: 0,
  ingestDefinitionPath: '',
  ingestDefinitionReference: { ingestDefinitionUrn: '' },
});

const buildLiteEntry = (): WatermarkLiteEntry => ({
  ingestDefinitionPath: '',
  batchId: 0,
});

const buildAlloyQueryEntry = (): WatermarkAlloyQueryEntry => ({ batchId: 0 });

const buildDefaultTemplate = (): WatermarkExpectedDefault => ({
  availabilityDefinitionReference: { availabilityDefinitionUrn: '' },
  evaluatedWatermark: { watermarkBatches: [buildWatermarkBatch()] },
  evaluationResult: true,
  eventId: 0,
  watermarkId: '',
});

const stringifyExpected = (value: unknown): string =>
  JSON.stringify(value, null, 2);

const buildExpectedTemplateString = (
  format: AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT,
): string => {
  switch (format) {
    case AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT.LITE:
      return stringifyExpected([buildLiteEntry()]);
    case AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT.ALLOY_QUERY:
      return stringifyExpected({ '': buildAlloyQueryEntry() });
    case AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT.DEFAULT:
    default:
      return stringifyExpected(buildDefaultTemplate());
  }
};

// Structural validators — user edits raw JSON in Monaco, so the parsed value
// might not match the expected format. These narrow the parse result to a
// typed `WatermarkExpected`; on failure the "Add entry" action is disabled.
const isRecord = (val: unknown): val is Record<string, unknown> =>
  typeof val === 'object' && val !== null && !Array.isArray(val);

const isDefaultShape = (val: unknown): val is WatermarkExpectedDefault =>
  isRecord(val) &&
  isRecord(val.evaluatedWatermark) &&
  Array.isArray(val.evaluatedWatermark.watermarkBatches);

const isLiteShape = (val: unknown): val is WatermarkLiteEntry[] =>
  Array.isArray(val);

const isAlloyQueryShape = (
  val: unknown,
): val is Record<string, WatermarkAlloyQueryEntry> => isRecord(val);

const parseWatermarkExpected = (
  format: AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT,
  raw: string,
): WatermarkExpected | undefined => {
  if (!raw) {
    return undefined;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  switch (format) {
    case AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT.DEFAULT:
      return isDefaultShape(parsed) ? { format, value: parsed } : undefined;
    case AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT.LITE:
      return isLiteShape(parsed) ? { format, value: parsed } : undefined;
    case AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT.ALLOY_QUERY:
      return isAlloyQueryShape(parsed) ? { format, value: parsed } : undefined;
    default:
      return undefined;
  }
};

// Append a new entry to the parsed expected model. Returns the mutated value
// serialized as pretty JSON, ready to be written back onto the assertion.
const addWatermarkEntry = (expected: WatermarkExpected): string => {
  switch (expected.format) {
    case AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT.DEFAULT: {
      const next: WatermarkExpectedDefault = {
        ...expected.value,
        evaluatedWatermark: {
          watermarkBatches: [
            ...expected.value.evaluatedWatermark.watermarkBatches,
            buildWatermarkBatch(),
          ],
        },
      };
      return stringifyExpected(next);
    }
    case AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT.LITE:
      return stringifyExpected([...expected.value, buildLiteEntry()]);
    case AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT.ALLOY_QUERY: {
      const next = { ...expected.value };
      // Pick a fresh unique key so a second empty-string add is still visible.
      let key = '';
      if (Object.prototype.hasOwnProperty.call(next, key)) {
        let counter = 1;
        while (Object.prototype.hasOwnProperty.call(next, `path_${counter}`)) {
          counter++;
        }
        key = `path_${counter}`;
      }
      next[key] = buildAlloyQueryEntry();
      return stringifyExpected(next);
    }
    default:
      return stringifyExpected(expected);
  }
};

// ─── Test-data helpers ──────────────────────────────────────────────────────

const createDefaultRelationElement = (
  columns: readonly string[] = AVAILABILITY_TEST_DATA_COLUMNS,
): RelationElement => {
  const element = new RelationElement();
  element.paths = [DEFAULT_RELATION_PATH];
  element.columns = [...columns];
  const row = new RelationRowTestData();
  row.values = columns.map((col) => AVAILABILITY_COLUMN_DEFAULTS[col] ?? '');
  element.rows = [observe_RelationRowTestData(row)];
  return observe_RelationElement(element);
};

// Return the union of columns declared across all existing suites in the
// availability, preserving first-seen order. Used to seed a new suite's
// test data so users don't have to redeclare the whole schema.
const collectExistingColumns = (
  availability: Availability,
): string[] | undefined => {
  const seen = new Set<string>();
  const ordered: string[] = [];
  availability.tests.forEach((test) => {
    if (!(test instanceof AvailabilityTestSuite)) {
      return;
    }
    test.testData?.columns.forEach((column) => {
      if (!seen.has(column)) {
        seen.add(column);
        ordered.push(column);
      }
    });
  });
  return ordered.length > 0 ? ordered : undefined;
};

// ─── Assertion / test / suite factories ─────────────────────────────────────

const createDefaultAssertion = (
  test: AvailabilityBarrierTest,
  format: AVAILABILITY_WATERMARK_SERIALIZATION_FORMAT,
): EqualToJson => {
  const externalFormatData = new ExternalFormatData();
  externalFormatData.contentType = ContentType.APPLICATION_JSON;
  externalFormatData.data = buildExpectedTemplateString(format);
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
  suite.testData = createDefaultRelationElement(
    collectExistingColumns(availability),
  );
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
      parsedExpected: computed,
      setAssertionToRename: action,
      setSelectedTab: action,
      addAssertion: action,
      deleteAssertion: action,
      openAssertion: action,
      handleTestResult: action,
      resetResult: action,
      setExpectedValue: action,
      addExpectedEntry: action,
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

  get parsedExpected(): WatermarkExpected | undefined {
    return parseWatermarkExpected(this.format, this.expectedValue);
  }

  // Append a new entry to the expected payload. No-op if the current text
  // does not parse to a valid shape for the test's format.
  addExpectedEntry(): void {
    const parsed = this.parsedExpected;
    if (!parsed) {
      return;
    }
    this.setExpectedValue(addWatermarkEntry(parsed));
  }
}

// ─── Per-suite state ────────────────────────────────────────────────────────

export class AvailabilityTestSuiteState extends TestableTestSuiteEditorState {
  readonly testableState: AvailabilityTestableState;
  override suite: AvailabilityTestSuite;
  override testStates: AvailabilityTestState[] = [];
  override selectTestState: AvailabilityTestState | undefined;
  testToRename: AvailabilityBarrierTest | undefined;
  readonly testDataState: RelationElementState;

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
    const testData = this.suite.testData ?? createDefaultRelationElement();
    this.suite.testData = testData;
    // Column editing is enabled so users can add/remove columns beyond the
    // seeded schema; new rows are prefilled from `columnDefaults` so the fixed
    // `ingest_completed_ts_utc` value doesn't need to be re-typed.
    this.testDataState = new RelationElementState(testData, {
      columnDefaults: AVAILABILITY_COLUMN_DEFAULTS,
    });

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
