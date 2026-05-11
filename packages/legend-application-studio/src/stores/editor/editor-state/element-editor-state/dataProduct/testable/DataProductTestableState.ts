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
  type Accessor,
  type AccessPoint,
  type PackageableElement,
  type TestSuite,
  type RawLambda,
  DataProduct,
  FunctionAccessPoint,
  LakehouseAccessPoint,
  DataProductTestSuite,
  BaseDataResolver,
  DataProductAccessPointTest,
  RelationElementsData,
  RelationElement,
  PackageableElementExplicitReference,
  TestExecuted,
  TestError,
  TestExecutionStatus,
  EqualToRelation,
  observe_RelationElement,
  observe_RelationElementsData,
  observe_DataProductTestSuite,
  IngestDefinition,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  ActionState,
  assertErrorThrown,
  deleteEntry,
  addUniqueEntry,
  uuid,
  noop,
} from '@finos/legend-shared';
import {
  action,
  flow,
  flowResult,
  makeObservable,
  observable,
  runInAction,
} from 'mobx';
import type { EditorStore } from '../../../../EditorStore.js';
import type { DataProductEditorState } from '../DataProductEditorState.js';
import { RelationElementState } from '../../data/EmbeddedDataState.js';
import { TESTABLE_RESULT } from '../../../../sidebar-state/testable/GlobalTestRunnerState.js';
import { testSuite_addTest } from '../../../../../graph-modifier/Testable_GraphModifierHelper.js';
import {
  TestableTestEditorState,
  TestableTestSuiteEditorState,
} from '../../testable/TestableEditorState.js';

const createEmptyRelationElement = (
  itemId: string,
  columns: string[] = [],
): RelationElement => {
  const relationElement = new RelationElement();
  relationElement.paths = [itemId];
  relationElement.columns = columns;
  relationElement.rows = [];
  return observe_RelationElement(relationElement);
};

/**
 * Returns the lambda for an access point (handles both LakehouseAccessPoint
 * and FunctionAccessPoint).
 */
const getAccessPointLambda = (
  accessPoint: AccessPoint,
): RawLambda | undefined =>
  accessPoint instanceof LakehouseAccessPoint
    ? accessPoint.func
    : accessPoint instanceof FunctionAccessPoint
      ? accessPoint.query
      : undefined;

/**
 * Builds a RelationElementsData from resolved accessors using the accessor
 * relation type as the source of truth for column definitions.
 */
const buildRelationElementsDataWithColumns = (
  accs: Accessor[],
): RelationElementsData => {
  const relData = new RelationElementsData();
  relData.relationElements = accs.map((acc) => {
    const itemId = acc.accessor || 'UNKNOWN';
    const columns = acc.relationType.columns.map((column) => column.name);
    return createEmptyRelationElement(itemId, columns);
  });
  return relData;
};

const isIngestOrDataProductAccessor = (
  accessor: Accessor,
): accessor is Accessor =>
  accessor.parentElement instanceof DataProduct ||
  accessor.parentElement instanceof IngestDefinition;

const getAccessPointDisplayLabel = (accessPoint: AccessPoint): string =>
  accessPoint.id;

interface ElementDataItem {
  id: string;
  label: string;
}

const getElementDataItems = (
  element: PackageableElement,
): ElementDataItem[] => {
  if (element instanceof DataProduct) {
    return element.accessPointGroups
      .flatMap((g) => g.accessPoints)
      .map((ap) => ({
        id: ap.id,
        label: getAccessPointDisplayLabel(ap),
      }));
  }
  if (element instanceof IngestDefinition) {
    return (element.TEMPORARY_MATVIEW_FUNCTION_DATA_SETS ?? []).map((ds) => ({
      id: ds.name,
      label: ds.name,
    }));
  }
  return [];
};

// Labels sourced from Accessor subclasses (DataProductAccessor.accessorLabel, IngestionAccessor.accessorLabel)
const getElementItemLabel = (element: PackageableElement): string => {
  if (element instanceof DataProduct) {
    return 'access point';
  }
  if (element instanceof IngestDefinition) {
    return 'data set';
  }
  return 'item';
};

const inferDataProductItemColumns = async (
  editorStore: EditorStore,
  dataProduct: DataProduct,
  itemId: string,
): Promise<string[] | undefined> => {
  const accessPoint = dataProduct.accessPointGroups
    .flatMap((group) => group.accessPoints)
    .find((ap) => ap.id === itemId);
  if (!accessPoint) {
    return undefined;
  }
  const lambda = getAccessPointLambda(accessPoint);
  if (!lambda) {
    return undefined;
  }
  const relationMetadata =
    await editorStore.graphManagerState.graphManager.getLambdaRelationType(
      lambda,
      editorStore.graphManagerState.graph,
    );
  return relationMetadata.columns.map((column) => column.name);
};

// ─── Per-test state ──────────────────────────────────────────────────────────

export class DataProductTestState extends TestableTestEditorState {
  readonly suiteState: DataProductTestSuiteState;
  override test: DataProductAccessPointTest;
  readonly uuid = uuid();

  /** Wraps assertion.expected — drives both column definitions and test data rows. */
  testDataRelationState: RelationElementState | undefined;

  constructor(
    suiteState: DataProductTestSuiteState,
    test: DataProductAccessPointTest,
  ) {
    super(
      suiteState.testableState.dataProduct,
      test,
      suiteState.testableState.dataProductEditorState.isReadOnly,
      suiteState.editorStore,
    );
    makeObservable(this, {
      // observable fields from base class
      selectedAsertionState: observable,
      selectedTab: observable,
      assertionToRename: observable,
      assertionEditorStates: observable,
      testResultState: observable,
      runningTestAction: observable,
      // own observable
      testDataRelationState: observable,
      // actions from base class
      setSelectedTab: action,
      setAssertionToRename: action,
      addAssertion: action,
      deleteAssertion: action,
      openAssertion: action,
      resetResult: action,
      handleTestResult: action,
      // flow from base class
      runTest: flow,
    });
    this.suiteState = suiteState;
    this.test = test;
    this.buildTestDataRelationState().catch(noop());
  }

  private async buildTestDataRelationState(): Promise<void> {
    const assertion = this.test.assertions.find(
      (a): a is EqualToRelation => a instanceof EqualToRelation,
    );
    if (!assertion) {
      return;
    }
    // Populate columns from the engine if not yet set
    if (assertion.expected.columns.length === 0) {
      try {
        const engineColumns = await inferDataProductItemColumns(
          this.editorStore,
          this.suiteState.testableState.dataProduct,
          this.test.accessPointId,
        );
        if (engineColumns && engineColumns.length > 0) {
          runInAction(() => {
            assertion.expected.columns = engineColumns;
          });
        }
      } catch {
        // best-effort; continue with empty columns
      }
    }
    runInAction(() => {
      this.testDataRelationState = new RelationElementState(assertion.expected);
    });
  }

  get accessPointLabel(): string {
    return this.suiteState.testableState.getOwnAccessPointLabel(
      this.test.accessPointId,
    );
  }
}

// ─── Per-element test data state ─────────────────────────────────────────────

export class DataProductElementTestDataState {
  readonly testDataState: DataProductTestDataState;
  readonly testData: BaseDataResolver;
  readonly editorStore: EditorStore;

  /** Currently selected dataset/item within this element's RelationElementsData */
  selectedItemId: string | undefined;
  /** RelationElementState for the currently selected item */
  relationElementState: RelationElementState | undefined;

  constructor(
    testDataState: DataProductTestDataState,
    testData: BaseDataResolver,
  ) {
    makeObservable(this, {
      selectedItemId: observable,
      relationElementState: observable,
      setSelectedItem: action,
    });
    this.testDataState = testDataState;
    this.testData = testData;
    this.editorStore = testDataState.editorStore;
    // Select the first item that has data
    if (testData.data instanceof RelationElementsData) {
      const firstRel = testData.data.relationElements[0];
      if (firstRel) {
        this.selectedItemId = firstRel.paths[0];
        this.relationElementState = new RelationElementState(firstRel);
      }
    }
  }

  get element(): PackageableElement {
    return this.testData.element.value;
  }

  get elementName(): string {
    return this.testData.element.value.name;
  }

  get itemLabel(): string {
    return getElementItemLabel(this.element);
  }

  get configuredItemIds(): string[] {
    if (this.testData.data instanceof RelationElementsData) {
      return this.testData.data.relationElements.map((re) => re.paths[0] ?? '');
    }
    return [];
  }

  get configuredItems(): ElementDataItem[] {
    const availableItemsById = new Map(
      getElementDataItems(this.element).map((item) => [item.id, item.label]),
    );
    return this.configuredItemIds.map((id) => ({
      id,
      label: availableItemsById.get(id) ?? id,
    }));
  }

  setSelectedItem(itemId: string | undefined): void {
    this.selectedItemId = itemId;
    if (itemId && this.testData.data instanceof RelationElementsData) {
      const relEl = this.testData.data.relationElements.find(
        (re) => re.paths[0] === itemId,
      );
      this.relationElementState = relEl
        ? new RelationElementState(relEl)
        : undefined;
    } else {
      this.relationElementState = undefined;
    }
  }
}

// ─── Test data state for a suite ─────────────────────────────────────────────

export class DataProductTestDataState {
  readonly editorStore: EditorStore;
  readonly suiteState: DataProductTestSuiteState;

  elementTestDataStates: DataProductElementTestDataState[] = [];
  selectedElementTestDataState: DataProductElementTestDataState | undefined;

  constructor(
    suiteState: DataProductTestSuiteState,
    options?: {
      selectedElementPath?: string | undefined;
      selectedItemId?: string | undefined;
    },
  ) {
    makeObservable(this, {
      elementTestDataStates: observable,
      selectedElementTestDataState: observable,
      setSelectedElementTestDataState: action,
      refreshElementTestDataStates: action,
    });
    this.editorStore = suiteState.editorStore;
    this.suiteState = suiteState;
    this.refreshElementTestDataStates(options);
  }

  refreshElementTestDataStates(options?: {
    selectedElementPath?: string | undefined;
    selectedItemId?: string | undefined;
  }): void {
    const previouslySelectedElementPath =
      options?.selectedElementPath ??
      this.selectedElementTestDataState?.element.path;
    const previouslySelectedItemId =
      options?.selectedItemId ??
      this.selectedElementTestDataState?.selectedItemId;
    const suite = this.suiteState.suite;
    this.elementTestDataStates = (suite.testData ?? [])
      .filter((td): td is BaseDataResolver => td instanceof BaseDataResolver)
      .map((td) => new DataProductElementTestDataState(this, td));

    this.selectedElementTestDataState =
      this.elementTestDataStates.find(
        (state) => state.element.path === previouslySelectedElementPath,
      ) ?? this.elementTestDataStates[0];

    if (this.selectedElementTestDataState && previouslySelectedItemId) {
      const nextSelectedItemId =
        this.selectedElementTestDataState.configuredItemIds.find(
          (itemId) => itemId === previouslySelectedItemId,
        ) ?? this.selectedElementTestDataState.configuredItemIds[0];
      this.selectedElementTestDataState.setSelectedItem(nextSelectedItemId);
    }
  }

  setSelectedElementTestDataState(
    val: DataProductElementTestDataState | undefined,
  ): void {
    this.selectedElementTestDataState = val;
  }
}

// ─── Per-suite state ─────────────────────────────────────────────────────────

export class DataProductTestSuiteState extends TestableTestSuiteEditorState {
  readonly testableState: DataProductTestableState;
  override suite: DataProductTestSuite;
  override testStates: DataProductTestState[] = [];
  declare selectTestState: DataProductTestState | undefined;
  testDataState: DataProductTestDataState;

  constructor(
    editorStore: EditorStore,
    testableState: DataProductTestableState,
    suite: DataProductTestSuite,
  ) {
    super(
      testableState.dataProduct,
      suite,
      testableState.dataProductEditorState.isReadOnly,
      editorStore,
    );
    makeObservable(this, {
      testStates: observable,
      selectTestState: observable,
      testDataState: observable,
      addNewTest: flow,
      deleteTest: action,
      runSuite: flow,
      runFailingTests: flow,
      buildTestStates: action,
    });
    this.testableState = testableState;
    this.suite = suite;
    this.testDataState = new DataProductTestDataState(this);
    this.buildTestStates();
  }

  refreshTestDataState(): void {
    this.testDataState = new DataProductTestDataState(this, {
      selectedElementPath:
        this.testDataState.selectedElementTestDataState?.element.path,
      selectedItemId:
        this.testDataState.selectedElementTestDataState?.selectedItemId,
    });
  }

  buildTestStates(): void {
    this.testStates = this.suite.tests.map(
      (t) => new DataProductTestState(this, t as DataProductAccessPointTest),
    );
    this.selectTestState = this.testStates[0];
  }

  override deleteTest(test: DataProductAccessPointTest): void {
    super.deleteTest(test);
  }

  *addNewTest(
    testName: string,
    accessPointId: string,
  ): GeneratorFn<string | undefined> {
    const observerContext =
      this.editorStore.changeDetectionState.observerContext;

    let inferredColumns: string[] = [];
    try {
      const cols = (yield inferDataProductItemColumns(
        this.editorStore,
        this.testableState.dataProduct,
        accessPointId,
      )) as string[] | undefined;
      if (cols) {
        inferredColumns = cols;
      }
    } catch {
      // best-effort
    }

    const test = new DataProductAccessPointTest();
    test.id = testName;
    test.__parent = this.suite;
    test.accessPointId = accessPointId;

    // Resolve sources through the graph (follows function calls, no self-refs)
    const accessPointForTest = this.testableState.dataProduct.accessPointGroups
      .flatMap((g) => g.accessPoints)
      .find((ap) => ap.id === accessPointId);
    const rawLambdaForTest = accessPointForTest
      ? getAccessPointLambda(accessPointForTest)
      : undefined;

    let resolvedAccessors: Accessor[] = [];
    if (rawLambdaForTest) {
      const all =
        (yield this.editorStore.graphManagerState.graphManager.collectAccessorsInRawLambda(
          rawLambdaForTest,
          this.editorStore.graphManagerState.graph,
        )) as Accessor[];
      resolvedAccessors = all.filter(
        (accessor) =>
          isIngestOrDataProductAccessor(accessor) &&
          accessor.parentElement.path !== this.testableState.dataProduct.path,
      );
    }

    if (resolvedAccessors.length > 0) {
      // Group by element, merge into existing resolvers or create new ones
      const byElement = new Map<string, Accessor[]>();
      for (const acc of resolvedAccessors) {
        const grp = byElement.get(acc.parentElement.path) ?? [];
        grp.push(acc);
        byElement.set(acc.parentElement.path, grp);
      }
      for (const [elementPath, accs] of byElement) {
        const element =
          this.editorStore.graphManagerState.graph.getNullableElement(
            elementPath,
          );
        if (!element) {
          continue;
        }
        const existingResolver = this.suite.testData?.find(
          (td): td is BaseDataResolver =>
            td instanceof BaseDataResolver && td.element.value === element,
        );
        const relData =
          existingResolver?.data instanceof RelationElementsData
            ? existingResolver.data
            : undefined;
        if (!existingResolver || !relData) {
          const resolver = new BaseDataResolver();
          resolver.element =
            PackageableElementExplicitReference.create(element);
          const newRelData = buildRelationElementsDataWithColumns(accs);
          observe_RelationElementsData(newRelData);
          resolver.data = newRelData;
          this.suite.testData = [...(this.suite.testData ?? []), resolver];
        } else {
          for (const acc of accs) {
            const itemId = acc.accessor;
            if (
              !relData.relationElements.find((re) => re.paths[0] === itemId)
            ) {
              const columns = acc.relationType.columns.map(
                (column) => column.name,
              );
              relData.relationElements.push(
                createEmptyRelationElement(itemId, columns),
              );
            }
          }
        }
      }
    } else {
      // Fallback: single resolver on current DP
      let relationData = this.suite.testData?.find(
        (td): td is BaseDataResolver =>
          td instanceof BaseDataResolver &&
          td.element.value === this.testableState.dataProduct &&
          td.data instanceof RelationElementsData,
      )?.data as RelationElementsData | undefined;

      if (!relationData) {
        const testData = new BaseDataResolver();
        testData.element = PackageableElementExplicitReference.create(
          this.testableState.dataProduct,
        );
        relationData = new RelationElementsData();
        relationData.relationElements = [];
        observe_RelationElementsData(relationData);
        testData.data = relationData;
        this.suite.testData = [...(this.suite.testData ?? []), testData];
      }
      if (
        !relationData.relationElements.find(
          (re) => re.paths[0] === accessPointId,
        )
      ) {
        relationData.relationElements.push(
          createEmptyRelationElement(accessPointId, inferredColumns),
        );
      }
    }

    const assertion = new EqualToRelation();
    assertion.id = 'assert_1';
    const expectedRelElement = new RelationElement();
    expectedRelElement.paths = [accessPointId];
    expectedRelElement.columns = inferredColumns;
    expectedRelElement.rows = [];
    observe_RelationElement(expectedRelElement);
    assertion.expected = expectedRelElement;
    test.assertions = [assertion];

    testSuite_addTest(this.suite, test, observerContext);
    this.refreshTestDataState();

    const testState = new DataProductTestState(this, test);
    this.testStates.push(testState);
    this.selectTestState = testState;
    return undefined;
  }

  get result(): TESTABLE_RESULT {
    if (this.runningSuiteState.isInProgress) {
      return TESTABLE_RESULT.IN_PROGRESS;
    }
    if (this.testStates.length === 0) {
      return TESTABLE_RESULT.DID_NOT_RUN;
    }
    if (
      this.testStates.every((ts) => ts.testResultState.result === undefined)
    ) {
      return TESTABLE_RESULT.DID_NOT_RUN;
    }
    let hasFailure = false;
    let hasError = false;
    for (const testState of this.testStates) {
      const result = testState.testResultState.result;
      if (result instanceof TestError) {
        hasError = true;
      } else if (
        result instanceof TestExecuted &&
        result.testExecutionStatus === TestExecutionStatus.FAIL
      ) {
        hasFailure = true;
      }
    }
    if (hasError) {
      return TESTABLE_RESULT.ERROR;
    }
    if (hasFailure) {
      return TESTABLE_RESULT.FAILED;
    }
    return TESTABLE_RESULT.PASSED;
  }
}

// ─── Top-level testable state ────────────────────────────────────────────────

export class DataProductTestableState {
  readonly editorStore: EditorStore;
  readonly dataProductEditorState: DataProductEditorState;

  suiteStates: DataProductTestSuiteState[] = [];
  selectedSuiteState: DataProductTestSuiteState | undefined;
  runningAllTestsState = ActionState.create();
  showCreateSuiteModal = false;
  showCreateTestModal = false;
  suiteToRename: TestSuite | undefined;

  constructor(dataProductEditorState: DataProductEditorState) {
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
      createSuite: flow,
      deleteSuite: action,
      init: action,
      runAllTests: flow,
    });
    this.editorStore = dataProductEditorState.editorStore;
    this.dataProductEditorState = dataProductEditorState;
  }

  get dataProduct(): DataProduct {
    return this.dataProductEditorState.product;
  }

  setSelectedSuiteState(val: DataProductTestSuiteState | undefined): void {
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
    const suiteState = this.suiteStates.find((s) => s.suite === suite);
    if (suiteState) {
      this.selectedSuiteState = suiteState;
    }
  }

  /**
   * Build suite states from the DataProduct.tests array.
   * Call this on init and after grammar→form roundtrip.
   */
  init(): void {
    const dp = this.dataProduct;
    this.suiteStates = dp.tests.map(
      (s) => new DataProductTestSuiteState(this.editorStore, this, s),
    );
    this.selectedSuiteState = this.suiteStates[0];
  }

  /** Returns all graph ingest elements available in the model. */
  get availableIngestSources(): IngestDefinition[] {
    const graph = this.editorStore.graphManagerState.graph;
    return graph.ingests;
  }

  /** Access points on the DataProduct being edited (used for test's accessPointId). */
  get ownAccessPoints(): AccessPoint[] {
    return this.dataProduct.accessPointGroups.flatMap((g) => g.accessPoints);
  }

  getOwnAccessPointLabel(accessPointId: string): string {
    const accessPoint = this.ownAccessPoints.find(
      (candidate) => candidate.id === accessPointId,
    );
    return accessPoint
      ? getAccessPointDisplayLabel(accessPoint)
      : accessPointId;
  }

  /**
   * Create a new test suite with one initial test on the DataProduct.
   * Test data is auto-seeded for the selected access point on the current
   * DataProduct (no element picker required).
   * Columns are inferred via the engine when possible.
   */
  *createSuite(
    suiteName: string,
    testName: string,
    accessPointId: string,
  ): GeneratorFn<string | undefined> {
    const dp = this.dataProduct;
    const observerContext =
      this.editorStore.changeDetectionState.observerContext;

    const suite = new DataProductTestSuite();
    suite.id = suiteName;

    // Try to infer columns from the access-point lambda
    let inferredColumns: string[] = [];
    try {
      const cols = (yield inferDataProductItemColumns(
        this.editorStore,
        dp,
        accessPointId,
      )) as string[] | undefined;
      if (cols) {
        inferredColumns = cols;
      }
    } catch {
      // Column inference is best-effort; continue with empty columns
    }

    // Resolve INPUT sources via the graph (follows function calls, avoids self-refs)
    const accessPointForSuite = dp.accessPointGroups
      .flatMap((g) => g.accessPoints)
      .find((ap) => ap.id === accessPointId);
    const rawLambdaForSuite = accessPointForSuite
      ? getAccessPointLambda(accessPointForSuite)
      : undefined;

    suite.testData = [];
    if (rawLambdaForSuite) {
      const all =
        (yield this.editorStore.graphManagerState.graphManager.collectAccessorsInRawLambda(
          rawLambdaForSuite,
          this.editorStore.graphManagerState.graph,
        )) as Accessor[];
      const externalAccessors = all.filter(
        (accessor) =>
          isIngestOrDataProductAccessor(accessor) &&
          accessor.parentElement.path !== dp.path,
      );
      const byElement = new Map<string, Accessor[]>();
      for (const acc of externalAccessors) {
        const grp = byElement.get(acc.parentElement.path) ?? [];
        grp.push(acc);
        byElement.set(acc.parentElement.path, grp);
      }
      for (const [elementPath, accs] of byElement) {
        const element =
          this.editorStore.graphManagerState.graph.getNullableElement(
            elementPath,
          );
        if (!element) {
          continue;
        }
        const resolver = new BaseDataResolver();
        resolver.element = PackageableElementExplicitReference.create(element);
        const relData = buildRelationElementsDataWithColumns(accs);
        observe_RelationElementsData(relData);
        resolver.data = relData;
        suite.testData.push(resolver);
      }
    }
    // Fallback: no external sources resolved — seed a single resolver on current DP
    if (suite.testData.length === 0) {
      const testData = new BaseDataResolver();
      testData.element = PackageableElementExplicitReference.create(dp);
      const relData = new RelationElementsData();
      relData.relationElements = [
        createEmptyRelationElement(accessPointId, inferredColumns),
      ];
      observe_RelationElementsData(relData);
      testData.data = relData;
      suite.testData = [testData];
    }

    // Create one initial test with EqualToRelation assertion
    const test = new DataProductAccessPointTest();
    test.id = testName;
    test.__parent = suite;
    test.accessPointId = accessPointId;

    const assertion = new EqualToRelation();
    assertion.id = 'assert_1';
    const expectedRelElement = new RelationElement();
    expectedRelElement.paths = [accessPointId];
    expectedRelElement.columns = inferredColumns;
    expectedRelElement.rows = [];
    observe_RelationElement(expectedRelElement);
    assertion.expected = expectedRelElement;
    test.assertions = [assertion];

    suite.tests = [test];

    const observed = observe_DataProductTestSuite(suite, observerContext);
    addUniqueEntry(dp.tests, observed);

    const suiteState = new DataProductTestSuiteState(
      this.editorStore,
      this,
      observed,
    );
    this.suiteStates.push(suiteState);
    this.selectedSuiteState = suiteState;
    return undefined;
  }

  deleteSuite(suiteState: DataProductTestSuiteState): void {
    const dp = this.dataProduct;
    deleteEntry(dp.tests, suiteState.suite);
    deleteEntry(this.suiteStates, suiteState);
    if (this.selectedSuiteState === suiteState) {
      this.selectedSuiteState = this.suiteStates[0];
    }
  }

  *runAllTests(): GeneratorFn<void> {
    try {
      this.runningAllTestsState.inProgress();
      for (const suiteState of this.suiteStates) {
        if (suiteState.suite.tests.length > 0) {
          yield flowResult(suiteState.runSuite());
        }
      }
      this.runningAllTestsState.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.runningAllTestsState.fail();
    }
  }
}
