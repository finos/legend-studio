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
  type Accessor,
  BaseDataResolver,
  DataProduct,
  EqualToRelation,
  type IngestDefinition,
  IngestMatViewTest,
  IngestTestSuite,
  PackageableElementExplicitReference,
  type PackageableElement,
  RelationElement,
  RelationElementsData,
  RelationRowTestData,
  ReferenceDataResolver,
  type TestSuite,
  observe_RelationElement,
  observe_RelationElementsData,
  observe_RelationRowTestData,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  addUniqueEntry,
  deleteEntry,
  noop,
  uuid,
} from '@finos/legend-shared';
import {
  action,
  flow,
  flowResult,
  makeObservable,
  observable,
  runInAction,
} from 'mobx';
import { testSuite_addTest } from '../../../../graph-modifier/Testable_GraphModifierHelper.js';
import {
  TestableTestEditorState,
  TestableTestSuiteEditorState,
} from '../testable/TestableEditorState.js';
import type { EditorStore } from '../../../EditorStore.js';
import type { IngestDefinitionEditorState } from './IngestDefinitionEditorState.js';
import { RelationElementState } from '../data/EmbeddedDataState.js';
import {
  buildRelationElementsDataWithColumns,
  createEmptyRelationElement,
  isIngestOrDataProductAccessor,
  LakehouseElementTestDataState,
} from '../testable/LakehouseTestableUtils.js';

export type { LakehouseElementTestDataState as IngestElementTestDataState };

// ─── Ingest-specific helpers ──────────────────────────────────────────────────

const createExpectedRelationElement = (
  datasetName: string,
  columns: string[],
): RelationElement => {
  const expected = new RelationElement();
  const row = observe_RelationRowTestData(new RelationRowTestData());
  row.values = columns.map(() => '');
  expected.paths = [datasetName];
  expected.columns = columns;
  expected.rows = [row];
  return observe_RelationElement(expected);
};

const inferIngestDatasetColumns = async (
  editorStore: EditorStore,
  ingest: IngestDefinition,
  datasetName: string,
): Promise<string[] | undefined> => {
  const dataset = ingest.TEMPORARY_MATVIEW_FUNCTION_DATA_SETS?.find(
    (candidate: { name: string }) => candidate.name === datasetName,
  );
  if (!dataset) {
    return undefined;
  }

  const relationType =
    await editorStore.graphManagerState.graphManager.getLambdaRelationType(
      dataset.source.function,
      editorStore.graphManagerState.graph,
    );
  return relationType.columns.map((column) => column.name);
};

// ─── Per-test state ───────────────────────────────────────────────────────────

export class IngestTestState extends TestableTestEditorState {
  readonly suiteState: IngestTestSuiteState;
  override test: IngestMatViewTest;
  readonly uuid = uuid();
  testDataRelationState: RelationElementState | undefined;

  constructor(suiteState: IngestTestSuiteState, test: IngestMatViewTest) {
    super(
      suiteState.testableState.ingest,
      test,
      suiteState.testableState.ingestDefinitionEditorState.isReadOnly,
      suiteState.editorStore,
    );

    makeObservable(this, {
      selectedAsertionState: observable,
      selectedTab: observable,
      assertionToRename: observable,
      assertionEditorStates: observable,
      testResultState: observable,
      runningTestAction: observable,
      testDataRelationState: observable,
      setSelectedTab: action,
      setAssertionToRename: action,
      addAssertion: action,
      deleteAssertion: action,
      openAssertion: action,
      resetResult: action,
      handleTestResult: action,
      runTest: flow,
      setDatasetId: action,
    });

    this.suiteState = suiteState;
    this.test = test;
    this.backfillDatasetIdIfMissing();
    this.buildTestDataRelationState().catch(noop());
  }

  setDatasetId(val: string): void {
    this.test.datasetId = val;
    this.resetResult();
  }

  get datasetLabel(): string {
    if (this.test.datasetId) {
      return this.test.datasetId;
    }
    const assertion = this.test.assertions.find(
      (candidate): candidate is EqualToRelation =>
        candidate instanceof EqualToRelation,
    );
    const inferred = assertion?.expected.paths[0];
    if (inferred) {
      return inferred;
    }
    const availableDatasets =
      this.suiteState.testableState.ingestDefinitionEditorState.getMatviewFuncNames();
    return availableDatasets[0] ?? 'N/A';
  }

  private backfillDatasetIdIfMissing(): void {
    if (this.test.datasetId) {
      return;
    }
    const assertion = this.test.assertions.find(
      (candidate): candidate is EqualToRelation =>
        candidate instanceof EqualToRelation,
    );
    const fallbackDatasetId = assertion?.expected.paths[0];
    if (fallbackDatasetId) {
      this.test.datasetId = fallbackDatasetId;
      return;
    }
    const availableDatasets =
      this.suiteState.testableState.ingestDefinitionEditorState.getMatviewFuncNames();
    if (availableDatasets[0]) {
      this.test.datasetId = availableDatasets[0];
    }
  }

  private async buildTestDataRelationState(): Promise<void> {
    const assertion = this.test.assertions.find(
      (candidate): candidate is EqualToRelation =>
        candidate instanceof EqualToRelation,
    );
    if (!assertion) {
      return;
    }

    if (assertion.expected.columns.length === 0) {
      try {
        const engineColumns = await inferIngestDatasetColumns(
          this.editorStore,
          this.suiteState.testableState.ingest,
          this.datasetLabel,
        );
        if (engineColumns?.length) {
          runInAction(() => {
            assertion.expected.columns = engineColumns;
          });
        }
      } catch {
        // best-effort only
      }
    }

    runInAction(() => {
      this.testDataRelationState = new RelationElementState(assertion.expected);
    });
  }
}

// ─── Per-element test data state ─────────────────────────────────────────────
// Replaced by the shared LakehouseElementTestDataState from LakehouseTestableUtils.
// The type alias above maintains backward compatibility for any existing imports.

// ─── Test data state for a suite ─────────────────────────────────────────────

export class IngestTestDataState {
  readonly editorStore: EditorStore;
  readonly suiteState: IngestTestSuiteState;

  elementTestDataStates: LakehouseElementTestDataState[] = [];
  selectedElementTestDataState: LakehouseElementTestDataState | undefined;
  showAddElementModal = false;

  constructor(
    suiteState: IngestTestSuiteState,
    options?: {
      selectedElementPath?: string | undefined;
    },
  ) {
    makeObservable(this, {
      elementTestDataStates: observable,
      selectedElementTestDataState: observable,
      showAddElementModal: observable,
      setSelectedElementTestDataState: action,
      setShowAddElementModal: action,
      addElement: action,
      deleteElement: action,
      refreshElementTestDataStates: action,
    });

    this.editorStore = suiteState.editorStore;
    this.suiteState = suiteState;
    this.refreshElementTestDataStates(options);
  }

  get availableElementsToAdd(): PackageableElement[] {
    const suite = this.suiteState.suite;
    const existingPaths = new Set(
      suite.testData
        .filter(
          (testData): testData is BaseDataResolver | ReferenceDataResolver =>
            testData instanceof BaseDataResolver ||
            testData instanceof ReferenceDataResolver,
        )
        .map((testData) => testData.element.value.path),
    );
    const graph = this.editorStore.graphManagerState.graph;
    const currentIngestPath = this.suiteState.testableState.ingest.path;
    const candidates: PackageableElement[] = [
      ...graph.ingests.filter((ingest) => ingest.path !== currentIngestPath),
      ...graph.allElements.filter((e) => e instanceof DataProduct),
    ];
    return candidates.filter((element) => !existingPaths.has(element.path));
  }

  setShowAddElementModal(val: boolean): void {
    this.showAddElementModal = val;
  }

  addElement(path: string): void {
    const element =
      this.editorStore.graphManagerState.graph.getNullableElement(path);
    if (!element) {
      return;
    }

    const resolver = new BaseDataResolver();
    resolver.element = PackageableElementExplicitReference.create(element);
    const relationElementsData = new RelationElementsData();
    relationElementsData.relationElements = [];
    observe_RelationElementsData(relationElementsData);
    resolver.data = relationElementsData;

    const suite = this.suiteState.suite;
    suite.testData = [...suite.testData, resolver];
    this.refreshElementTestDataStates({ selectedElementPath: path });
  }

  deleteElement(elementState: LakehouseElementTestDataState): void {
    const suite = this.suiteState.suite;
    const index = suite.testData.indexOf(elementState.testData);
    suite.testData.splice(index, 1);
    this.refreshElementTestDataStates();
  }

  refreshElementTestDataStates(options?: {
    selectedElementPath?: string | undefined;
  }): void {
    const previouslySelectedElementPath =
      options?.selectedElementPath ??
      this.selectedElementTestDataState?.element.path;
    const suite = this.suiteState.suite;

    this.elementTestDataStates = suite.testData
      .filter(
        (testData): testData is BaseDataResolver =>
          testData instanceof BaseDataResolver,
      )
      .map(
        (testData) =>
          new LakehouseElementTestDataState(testData, this.editorStore),
      );

    this.selectedElementTestDataState =
      this.elementTestDataStates.find(
        (state) => state.element.path === previouslySelectedElementPath,
      ) ?? this.elementTestDataStates[0];
  }

  setSelectedElementTestDataState(
    val: LakehouseElementTestDataState | undefined,
  ): void {
    this.selectedElementTestDataState = val;
  }
}

// ─── Per-suite state ──────────────────────────────────────────────────────────

export class IngestTestSuiteState extends TestableTestSuiteEditorState {
  readonly testableState: IngestTestableState;
  override suite: IngestTestSuite;
  override testStates: IngestTestState[] = [];
  declare selectTestState: IngestTestState | undefined;
  testDataState: IngestTestDataState;
  readonly uuid = uuid();

  constructor(
    editorStore: EditorStore,
    testableState: IngestTestableState,
    suite: IngestTestSuite,
  ) {
    super(
      testableState.ingest,
      suite,
      testableState.ingestDefinitionEditorState.isReadOnly,
      editorStore,
    );
    makeObservable(this, {
      testStates: observable,
      runningSuiteState: observable,
      selectTestState: observable,
      testDataState: observable,
      changeTest: action,
      deleteTest: action,
      removeTestState: action,
      addNewTest: flow,
      runSuite: flow,
      runFailingTests: flow,
      buildTestStates: action,
    });

    this.testableState = testableState;
    this.suite = suite;
    this.testDataState = new IngestTestDataState(this);
    this.buildTestStates();
  }

  refreshTestDataState(): void {
    this.testDataState = new IngestTestDataState(this, {
      selectedElementPath:
        this.testDataState.selectedElementTestDataState?.element.path,
    });
  }

  buildTestStates(): void {
    this.suite.tests.forEach((test) => {
      test.__parent = this.suite;
      if (test instanceof IngestMatViewTest && !test.datasetId) {
        const relationAssertion = test.assertions.find(
          (candidate): candidate is EqualToRelation =>
            candidate instanceof EqualToRelation,
        );
        test.datasetId =
          relationAssertion?.expected.paths[0] ??
          this.testableState.datasetNames[0] ??
          '';
      }
    });

    this.testStates = this.suite.tests.map(
      (test) => new IngestTestState(this, test as IngestMatViewTest),
    );
    this.selectTestState = this.testStates[0];
  }

  override deleteTest(test: IngestMatViewTest): void {
    super.deleteTest(test);
    if (this.suite.tests.length === 0) {
      // Ingest requires at least one test per suite; remove emptied suites.
      this.testableState.deleteSuite(this);
    }
  }

  *addNewTest(
    testName: string,
    datasetName: string,
  ): GeneratorFn<string | undefined> {
    if (this.suite.tests.find((test) => test.id === testName)) {
      return 'Duplicated test name';
    }

    let inferredColumns: string[] = [];
    try {
      const columns = (yield inferIngestDatasetColumns(
        this.editorStore,
        this.testableState.ingest,
        datasetName,
      )) as string[] | undefined;
      if (columns) {
        inferredColumns = columns;
      }
    } catch {
      // Best effort only; continue with an empty expected relation.
    }

    const dataset =
      this.testableState.ingest.TEMPORARY_MATVIEW_FUNCTION_DATA_SETS?.find(
        (candidate) => candidate.name === datasetName,
      );
    const rawLambda = dataset?.source.function;

    if (rawLambda) {
      const all =
        (yield this.editorStore.graphManagerState.graphManager.collectAccessorsInRawLambda(
          rawLambda,
          this.editorStore.graphManagerState.graph,
        )) as Accessor[];
      const externalAccessors = all.filter((accessor) =>
        isIngestOrDataProductAccessor(accessor),
      );
      const byElement = new Map<string, Accessor[]>();
      for (const accessor of externalAccessors) {
        const group = byElement.get(accessor.parentElement.path) ?? [];
        group.push(accessor);
        byElement.set(accessor.parentElement.path, group);
      }

      for (const [elementPath, accessors] of byElement) {
        const element =
          this.editorStore.graphManagerState.graph.getNullableElement(
            elementPath,
          );
        if (!element) {
          continue;
        }

        const existingResolver = this.suite.testData.find(
          (testData): testData is BaseDataResolver =>
            testData instanceof BaseDataResolver &&
            testData.element.value === element,
        );
        const relationElementsData =
          existingResolver?.data instanceof RelationElementsData
            ? existingResolver.data
            : undefined;

        if (!existingResolver || !relationElementsData) {
          const resolver = new BaseDataResolver();
          resolver.element =
            PackageableElementExplicitReference.create(element);
          const relationData = buildRelationElementsDataWithColumns(accessors);
          observe_RelationElementsData(relationData);
          resolver.data = relationData;
          this.suite.testData = [...this.suite.testData, resolver];
        } else {
          for (const accessor of accessors) {
            const itemId = accessor.accessor;
            if (
              !relationElementsData.relationElements.find(
                (relationElement) => relationElement.paths[0] === itemId,
              )
            ) {
              const columns = accessor.relationType.columns.map(
                (column) => column.name,
              );
              relationElementsData.relationElements.push(
                createEmptyRelationElement(itemId, columns),
              );
            }
          }
        }
      }
    } else {
      this.editorStore.applicationStore.notificationService.notifyWarning(
        'Dataset accessors cannot be resolved; using default ingest test data',
      );
    }

    if (this.suite.testData.length === 0) {
      // Ingest test suites require testData >= 1; seed a minimal editable resolver.
      const resolver = new BaseDataResolver();
      resolver.element = PackageableElementExplicitReference.create(
        this.testableState.ingest,
      );
      const relationData = new RelationElementsData();
      relationData.relationElements = [
        createEmptyRelationElement(datasetName, inferredColumns),
      ];
      observe_RelationElementsData(relationData);
      resolver.data = relationData;
      this.suite.testData = [resolver];
    }

    const test = new IngestMatViewTest();
    test.id = testName;
    test.datasetId = datasetName;
    test.__parent = this.suite;

    const assertion = new EqualToRelation();
    assertion.id = 'assert_1';
    assertion.expected = createExpectedRelationElement(
      datasetName,
      inferredColumns,
    );
    test.assertions = [assertion];

    testSuite_addTest(
      this.suite,
      test,
      this.editorStore.changeDetectionState.observerContext,
    );

    this.refreshTestDataState();

    const testState = new IngestTestState(this, test);
    this.testStates.push(testState);
    this.selectTestState = testState;
    return undefined;
  }
}

// ─── Top-level testable state ─────────────────────────────────────────────────

export class IngestTestableState {
  readonly editorStore: EditorStore;
  readonly ingestDefinitionEditorState: IngestDefinitionEditorState;

  suiteStates: IngestTestSuiteState[] = [];
  selectedSuiteState: IngestTestSuiteState | undefined;
  showCreateSuiteModal = false;
  showCreateTestModal = false;
  suiteToRename: TestSuite | undefined;

  constructor(ingestDefinitionEditorState: IngestDefinitionEditorState) {
    makeObservable(this, {
      suiteStates: observable,
      selectedSuiteState: observable,
      showCreateSuiteModal: observable,
      showCreateTestModal: observable,
      suiteToRename: observable,
      setSelectedSuiteState: action,
      setShowCreateSuiteModal: action,
      setShowCreateTestModal: action,
      setSuiteToRename: action,
      changeSuite: action,
      init: action,
      createSuite: flow,
      deleteSuite: action,
    });

    this.editorStore = ingestDefinitionEditorState.editorStore;
    this.ingestDefinitionEditorState = ingestDefinitionEditorState;
  }

  get ingest(): IngestDefinition {
    return this.ingestDefinitionEditorState.ingest;
  }

  get datasetNames(): string[] {
    return this.ingestDefinitionEditorState.getMatviewFuncNames();
  }

  setSelectedSuiteState(val: IngestTestSuiteState | undefined): void {
    this.selectedSuiteState = val;
  }

  setShowCreateSuiteModal(val: boolean): void {
    this.showCreateSuiteModal = val;
  }

  setShowCreateTestModal(val: boolean): void {
    this.showCreateTestModal = val;
  }

  setSuiteToRename(val: TestSuite | undefined): void {
    this.suiteToRename = val;
  }

  changeSuite(suite: TestSuite): void {
    this.selectedSuiteState = this.suiteStates.find((s) => s.suite === suite);
  }

  init(): void {
    this.suiteStates = this.ingest.tests.map(
      (suite) => new IngestTestSuiteState(this.editorStore, this, suite),
    );
    this.selectedSuiteState = this.suiteStates[0];
  }

  *createSuite(
    suiteName: string,
    testName: string,
    datasetName: string,
  ): GeneratorFn<string | undefined> {
    if (this.ingest.tests.find((suite) => suite.id === suiteName)) {
      return 'Duplicated suite name';
    }

    const suite = new IngestTestSuite();
    suite.id = suiteName;
    suite.tests = [];

    const suiteState = new IngestTestSuiteState(this.editorStore, this, suite);

    const error = (yield flowResult(
      suiteState.addNewTest(testName, datasetName),
    )) as string | undefined;

    if (error) {
      return error;
    }

    addUniqueEntry(this.ingest.tests, suite);
    this.suiteStates.push(suiteState);
    this.selectedSuiteState = suiteState;
    return undefined;
  }

  deleteSuite(suiteState: IngestTestSuiteState): void {
    deleteEntry(this.ingest.tests, suiteState.suite);
    deleteEntry(this.suiteStates, suiteState);
    if (this.selectedSuiteState === suiteState) {
      this.selectedSuiteState = this.suiteStates[0];
    }
  }
}
