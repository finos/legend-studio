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
  type ElementEditorState,
  type EditorStore,
  EmbeddedDataEditorState,
  TESTABLE_TEST_TAB,
  TestAssertionEditorState,
  TestableTestEditorState,
  TestableTestSuiteEditorState,
  TestablePackageableElementEditorState,
  atomicTest_addAssertion,
  createBareExternalFormat,
  createEmptyEqualToJsonAssertion,
  testSuite_addTest,
  testSuite_deleteTest,
  testable_setId,
} from '@finos/legend-application-studio';
import {
  type Accessor,
  type AccessorOwner,
  type AtomicTest,
  type EngineRuntime,
  type PackageableElement,
  type TestAssertion,
  type ValueSpecification,
  Database,
  DEFAULT_TEST_PREFIX,
  EqualToRelation,
  FunctionTestData,
  InstanceValue,
  LambdaFunctionInstanceValue,
  ModelStore,
  PackageableElementExplicitReference,
  PackageableElementReference,
  PackageableRuntime,
  RawLambda,
  RelationElement,
  RelationElementsData,
  RelationRowTestData,
  SUPPORTED_FUNCTIONS,
  SimpleFunctionExpression,
  V1_buildRelationElementsDataFromAccessors,
  matchFunctionName,
  observe_FunctionTestData,
  observe_RelationElement,
  observe_RelationElementsData,
  observe_RelationRowTestData,
  observe_TestAssertion,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  addUniqueEntry,
  assertErrorThrown,
  deleteEntry,
  generateEnumerableNameFromToken,
  guaranteeNonNullable,
  isNonNullable,
  noop,
  uniq,
  uuid,
} from '@finos/legend-shared';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import {
  DataQualityRelationComparisonTest,
  DataQualityRelationComparisonTestData,
  DataQualityRelationComparisonTestSuite,
  DataQualityRelationValidationTest,
  DataQualityRelationValidationTestData,
  DataQualityRelationValidationTestSuite,
} from '../../graph/metamodel/pure/packageableElements/data-quality/DataQualityTest.js';
import {
  type DataQualityRelationComparisonConfiguration,
  DataQualityRelationValidationConfiguration,
} from '../../graph/metamodel/pure/packageableElements/data-quality/DataQualityValidationConfiguration.js';
import {
  observe_DataQualityRelationComparisonTestSuite,
  observe_DataQualityRelationValidationTestSuite,
} from '../../graph-manager/action/changeDetection/DSL_DataQuality_ObserverHelper.js';
import { getDataQualityPureGraphManagerExtension } from '../../graph-manager/protocol/pure/DSL_DataQuality_PureGraphManagerExtension.js';

// -----------------------------------------------------------------------------
// Graph modifiers
// -----------------------------------------------------------------------------

const dataQualityValidation_addTestSuite = action(
  (
    element: DataQualityRelationValidationConfiguration,
    suite: DataQualityRelationValidationTestSuite,
  ): void => {
    suite.__parent = element;
    addUniqueEntry(element.tests, suite);
  },
);

const dataQualityComparison_addTestSuite = action(
  (
    element: DataQualityRelationComparisonConfiguration,
    suite: DataQualityRelationComparisonTestSuite,
  ): void => {
    suite.__parent = element;
    addUniqueEntry(element.tests, suite);
  },
);

const dataQuality_addStoreTestData = action(
  (
    suite:
      | DataQualityRelationValidationTestSuite
      | DataQualityRelationComparisonTestSuite,
    storeTestData: FunctionTestData,
  ): void => {
    if (suite instanceof DataQualityRelationValidationTestSuite) {
      if (!suite.testData) {
        suite.testData = new DataQualityRelationValidationTestData();
      }
      addUniqueEntry(suite.testData.testData, storeTestData);
    } else {
      if (!suite.testData) {
        suite.testData = new DataQualityRelationComparisonTestData();
      }
      addUniqueEntry(suite.testData.testData, storeTestData);
    }
  },
);

const dataQuality_deleteStoreTestData = action(
  (
    suite:
      | DataQualityRelationValidationTestSuite
      | DataQualityRelationComparisonTestSuite,
    storeTestData: FunctionTestData,
  ): void => {
    if (suite.testData) {
      deleteEntry(suite.testData.testData, storeTestData);
    }
  },
);

// -----------------------------------------------------------------------------
// Runtime discovery from a query lambda
//
// Mirrors `resolveRuntimesFromQuery` in `FunctionTestableState` — we walk the
// query AST looking for `->from(mapping, runtime)` calls and pull the
// referenced `PackageableRuntime` values off it. Used as a fallback for
// seeding test data when the query has no `Accessor`s (i.e. modelled data
// paths that go through a mapping + runtime rather than an ingest or data
// product).
// -----------------------------------------------------------------------------

const collectSimpleFunctionExpressions = (
  valueSpec: ValueSpecification,
  functions: Map<string, SimpleFunctionExpression[]>,
): void => {
  if (valueSpec instanceof SimpleFunctionExpression) {
    const existing = functions.get(valueSpec.functionName) ?? [];
    existing.push(valueSpec);
    functions.set(valueSpec.functionName, existing);
    valueSpec.parametersValues.forEach((v) =>
      collectSimpleFunctionExpressions(v, functions),
    );
  }
};

const resolveRuntimesFromQueryLambda = (
  rawLambda: RawLambda,
  editorStore: EditorStore,
): EngineRuntime[] => {
  try {
    const graphManager = editorStore.graphManagerState.graphManager;
    const valueSpec = graphManager.buildValueSpecification(
      graphManager.serializeRawValueSpecification(rawLambda),
      editorStore.graphManagerState.graph,
    );
    if (!(valueSpec instanceof LambdaFunctionInstanceValue)) {
      return [];
    }
    const expressions = guaranteeNonNullable(
      valueSpec.values[0],
      'function expected to be of type lambda',
    ).expressionSequence;
    const functions = new Map<string, SimpleFunctionExpression[]>();
    expressions.forEach((v) => collectSimpleFunctionExpressions(v, functions));
    const fromCalls = Array.from(functions.keys())
      .filter((name) => matchFunctionName(name, SUPPORTED_FUNCTIONS.FROM))
      .flatMap((name) => functions.get(name) ?? [])
      .filter(isNonNullable);
    const runtimeInstances: PackageableRuntime[] = [];
    fromCalls.forEach((expr) => {
      expr.parametersValues.forEach((p) => {
        if (p instanceof InstanceValue) {
          p.values.forEach((pIn) => {
            if (
              pIn instanceof PackageableElementReference &&
              pIn.value instanceof PackageableRuntime
            ) {
              runtimeInstances.push(pIn.value);
            }
          });
        }
      });
    });
    return uniq(runtimeInstances.flatMap((r) => r.runtimeValue));
  } catch {
    return [];
  }
};

/**
 * Extracts the single store referenced by the given runtimes, if unambiguous.
 * Returns `undefined` (and does not throw) if there are zero or multiple
 * stores. Mirrors the assertions performed in `FunctionTestableState.createSuite`.
 */
const resolveSingleStoreFromRuntimes = (
  runtimes: EngineRuntime[],
): PackageableElement | undefined => {
  if (runtimes.length !== 1) {
    return undefined;
  }
  const runtime = guaranteeNonNullable(runtimes[0]);
  if (runtime.connectionStores.length && runtime.connections.length) {
    return undefined;
  }
  const stores = [
    ...runtime.connections.flatMap((c) =>
      c.storeConnections
        .map((s) => s.connection.store?.value)
        .filter(isNonNullable),
    ),
    ...runtime.connectionStores.flatMap((c) =>
      c.storePointers.map((s) => s.value),
    ),
  ].filter(isNonNullable);
  return stores.length === 1 ? stores[0] : undefined;
};

/**
 * Build a `FunctionTestData` for the given store, seeding an appropriate
 * `EmbeddedData` shape: `RelationElementsData` for a `Database`,
 * external-format for a `ModelStore` (M2M / class mapping paths).
 */
const buildFunctionTestDataForStore = (
  store: PackageableElement,
): FunctionTestData | undefined => {
  const data = new FunctionTestData();
  if (store instanceof Database) {
    data.element = PackageableElementExplicitReference.create(store);
    const relData = new RelationElementsData();
    relData.relationElements = [];
    data.data = relData;
    return data;
  }
  if (store instanceof ModelStore) {
    data.element = PackageableElementExplicitReference.create(store);
    data.data = createBareExternalFormat();
    return data;
  }
  return undefined;
};

/**
 * Build a default `EqualToRelation` assertion for a DQ test, pre-populating
 * the columns from the query lambda's inferred relation type. If the type
 * cannot be inferred (e.g. engine unavailable or lambda not compilable),
 * falls back to the plain empty JSON assertion — same defensive behaviour as
 * `FunctionTestableState.createFunctionTest`.
 *
 * Uses the DQ-specific graph manager extension so the engine picks the
 * correct lambda (breaks vs recon) based on the target element type.
 */
const buildDefaultDataQualityRelationAssertion = async (
  test: AtomicTest,
  element:
    | DataQualityRelationValidationConfiguration
    | DataQualityRelationComparisonConfiguration,
  editorStore: EditorStore,
): Promise<TestAssertion> => {
  try {
    const extension = getDataQualityPureGraphManagerExtension(
      editorStore.graphManagerState.graphManager,
    );
    const relationTypeMetadata = await extension.getDataQualityRelationType(
      editorStore.graphManagerState.graph,
      element.path,
    );
    const columns = relationTypeMetadata.columns.map((c) => c.name);
    const assertion = new EqualToRelation();
    assertion.id = generateEnumerableNameFromToken(
      test.assertions.map((a) => a.id),
      'assertion',
    );
    const expectedRelElement = new RelationElement();
    expectedRelElement.paths = [];
    expectedRelElement.columns = columns;
    const emptyRow = observe_RelationRowTestData(new RelationRowTestData());
    emptyRow.values = columns.map(() => '');
    expectedRelElement.rows = [emptyRow];
    observe_RelationElement(expectedRelElement);
    assertion.expected = expectedRelElement;
    assertion.parentTest = test;
    return assertion;
  } catch {
    return createEmptyEqualToJsonAssertion(test);
  }
};

// -----------------------------------------------------------------------------
// Store test data state
// -----------------------------------------------------------------------------

export class DataQualityStoreTestDataState {
  readonly uuid = uuid();
  readonly editorStore: EditorStore;
  readonly testDataState: DataQualityTestDataState;
  storeTestData: FunctionTestData;
  embeddedEditorState: EmbeddedDataEditorState;

  constructor(
    editorStore: EditorStore,
    testDataState: DataQualityTestDataState,
    storeTestData: FunctionTestData,
  ) {
    makeObservable(this, {
      storeTestData: observable,
    });
    this.editorStore = editorStore;
    this.testDataState = testDataState;
    this.storeTestData = storeTestData;
    this.embeddedEditorState = new EmbeddedDataEditorState(
      editorStore,
      storeTestData.data,
      { hideSource: true },
    );
  }
}

// -----------------------------------------------------------------------------
// Test data state
//
// Backed by the suite's optional `testData` wrapper
// (`DataQualityRelationValidation/ComparisonTestData`) which itself holds a
// `FunctionTestData[]` list. The wrapper indirection is required to stay
// on-the-wire compatible with the Pure metamodel and the engine protocol.
// -----------------------------------------------------------------------------

export class DataQualityTestDataState {
  readonly editorStore: EditorStore;
  readonly suiteState: DataQualityTestSuiteState;
  storeDataStates: DataQualityStoreTestDataState[] = [];
  selectedStoreState: DataQualityStoreTestDataState | undefined;
  showAddElementModal = false;

  constructor(
    editorStore: EditorStore,
    suiteState: DataQualityTestSuiteState,
    testData: FunctionTestData[],
  ) {
    makeObservable(this, {
      storeDataStates: observable,
      selectedStoreState: observable,
      showAddElementModal: observable,
      setSelectedStoreState: action,
      setShowAddElementModal: action,
      addStoreTestData: action,
      deleteStoreTestData: action,
    });
    this.editorStore = editorStore;
    this.suiteState = suiteState;
    this.storeDataStates = testData.map(
      (data) => new DataQualityStoreTestDataState(editorStore, this, data),
    );
    this.selectedStoreState = this.storeDataStates[0];
  }

  get existingElementPaths(): string[] {
    return (this.suiteState.suite.testData?.testData ?? []).map(
      (td) => td.element.value.path,
    );
  }

  get availableElementsToAdd(): PackageableElement[] {
    const graph = this.editorStore.graphManagerState.graph;
    const existingPaths = new Set(this.existingElementPaths);
    // Include `ModelStore` so a suite backed by a mapping + runtime (M2M)
    // can attach test data against the model store.
    const candidates: PackageableElement[] = [
      ...graph.ingests,
      ...graph.dataProducts,
      ...graph.databases,
      ModelStore.INSTANCE,
    ];
    return candidates.filter((e) => !existingPaths.has(e.path));
  }

  setSelectedStoreState(
    state: DataQualityStoreTestDataState | undefined,
  ): void {
    this.selectedStoreState = state;
  }

  setShowAddElementModal(val: boolean): void {
    this.showAddElementModal = val;
  }

  addStoreTestData(elementPath: string): void {
    const element =
      this.editorStore.graphManagerState.graph.getNullableElement(elementPath);
    if (!element) {
      return;
    }
    const data = new FunctionTestData();
    const matchingAccessors =
      this.suiteState.testableState.cachedAccessors.filter(
        (a) => a.accessorOwner === elementPath,
      );
    if (element instanceof ModelStore) {
      // Modelled data (M2M / class mapping paths): seed with an
      // external-format data block; there are no relation elements to
      // enumerate here.
      data.element = PackageableElementExplicitReference.create(element);
      data.data = createBareExternalFormat();
    } else {
      data.element = PackageableElementExplicitReference.create(
        element as AccessorOwner,
      );
      if (matchingAccessors.length) {
        data.data =
          V1_buildRelationElementsDataFromAccessors(matchingAccessors);
      } else {
        const relData = new RelationElementsData();
        relData.relationElements = [];
        data.data = relData;
      }
      observe_RelationElementsData(data.data as RelationElementsData);
    }
    observe_FunctionTestData(
      data,
      this.editorStore.changeDetectionState.observerContext,
    );
    dataQuality_addStoreTestData(this.suiteState.suite, data);
    const state = new DataQualityStoreTestDataState(
      this.editorStore,
      this,
      data,
    );
    addUniqueEntry(this.storeDataStates, state);
    this.selectedStoreState = state;
  }

  deleteStoreTestData(state: DataQualityStoreTestDataState): void {
    dataQuality_deleteStoreTestData(this.suiteState.suite, state.storeTestData);
    deleteEntry(this.storeDataStates, state);
    if (this.selectedStoreState === state) {
      this.selectedStoreState = this.storeDataStates[0];
    }
  }
}

// -----------------------------------------------------------------------------
// Test state
// -----------------------------------------------------------------------------

export class DataQualityTestState extends TestableTestEditorState {
  readonly suiteState: DataQualityTestSuiteState;

  constructor(
    suiteState: DataQualityTestSuiteState,
    test: DataQualityRelationValidationTest | DataQualityRelationComparisonTest,
  ) {
    super(
      suiteState.testable,
      test,
      suiteState.isReadOnly,
      suiteState.editorStore,
    );
    makeObservable(this, {
      selectedAsertionState: observable,
      selectedTab: observable,
      assertionToRename: observable,
      assertionEditorStates: observable,
      testResultState: observable,
      runningTestAction: observable,
      addAssertion: action,
      setAssertionToRename: action,
      handleTestResult: action,
      setSelectedTab: action,
      runTest: flow,
      addRelationAssertion: flow,
      switchAssertionType: flow,
    });
    this.suiteState = suiteState;
    // DQ tests don't have parameter values or serialization format,
    // so the ASSERTION tab is the only meaningful one.
    this.selectedTab = TESTABLE_TEST_TAB.ASSERTION;
  }

  /**
   * Add an `EqualToRelation` assertion pre-populated with the columns
   * inferred from the DQ element's lambda relation type (falls back to an
   * empty JSON assertion when the engine can't resolve the type).
   */
  *addRelationAssertion(): GeneratorFn<void> {
    try {
      const assertion = (yield buildDefaultDataQualityRelationAssertion(
        this.test,
        this.suiteState.testableState.element,
        this.editorStore,
      )) as TestAssertion;
      atomicTest_addAssertion(this.test, assertion);
      const assertionState = new TestAssertionEditorState(
        this.editorStore,
        assertion,
        this,
      );
      addUniqueEntry(this.assertionEditorStates, assertionState);
      this.selectedAsertionState = assertionState;
      this.resetResult();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(
        `Unable to add relation assertion: ${error.message}`,
      );
    }
  }

  /**
   * Replace an existing assertion with a fresh one of the requested type,
   * preserving the original id and its position in the assertions list. Used
   * to let users flip between `EqualToJson` and `EqualToRelation` after the
   * initial seed (useful when the relation-type inference failed at seed
   * time, or when the user prefers the JSON form).
   */
  *switchAssertionType(
    current: TestAssertionEditorState,
    target: 'relation' | 'json',
  ): GeneratorFn<void> {
    try {
      const originalId = current.assertion.id;
      const newAssertion =
        target === 'relation'
          ? ((yield buildDefaultDataQualityRelationAssertion(
              this.test,
              this.suiteState.testableState.element,
              this.editorStore,
            )) as TestAssertion)
          : createEmptyEqualToJsonAssertion(this.test);
      newAssertion.id = originalId;
      newAssertion.parentTest = this.test;
      const observed = observe_TestAssertion(newAssertion);
      const assertionIndex = this.test.assertions.indexOf(current.assertion);
      if (assertionIndex >= 0) {
        this.test.assertions[assertionIndex] = observed;
      } else {
        this.test.assertions.push(observed);
      }
      const editorIndex = this.assertionEditorStates.indexOf(current);
      const newState = new TestAssertionEditorState(
        this.editorStore,
        observed,
        this,
      );
      if (editorIndex >= 0) {
        this.assertionEditorStates[editorIndex] = newState;
      } else {
        this.assertionEditorStates.push(newState);
      }
      if (this.selectedAsertionState === current) {
        this.selectedAsertionState = newState;
      }
      this.resetResult();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(
        `Unable to switch assertion type: ${error.message}`,
      );
    }
  }
}

// -----------------------------------------------------------------------------
// Test suite state
// -----------------------------------------------------------------------------

export class DataQualityTestSuiteState extends TestableTestSuiteEditorState {
  override suite:
    | DataQualityRelationValidationTestSuite
    | DataQualityRelationComparisonTestSuite;
  override testStates: DataQualityTestState[] = [];
  override selectTestState: DataQualityTestState | undefined;
  readonly testableState: DataQualityTestableState;
  testDataState: DataQualityTestDataState | undefined;
  testToRename:
    | DataQualityRelationValidationTest
    | DataQualityRelationComparisonTest
    | undefined;

  constructor(
    editorStore: EditorStore,
    testableState: DataQualityTestableState,
    suite:
      | DataQualityRelationValidationTestSuite
      | DataQualityRelationComparisonTestSuite,
  ) {
    super(testableState.element, suite, testableState.isReadOnly, editorStore);
    makeObservable(this, {
      selectTestState: observable,
      testToRename: observable,
      testDataState: observable,
      setSelectTestState: action,
      setTestToRename: action,
      addTest: action,
      addTestFlow: flow,
      deleteTestState: action,
      runSuite: flow,
      runFailingTests: flow,
    });
    this.suite = suite;
    this.testableState = testableState;
    this.testStates = suite.tests
      .filter(
        (
          t,
        ): t is
          | DataQualityRelationValidationTest
          | DataQualityRelationComparisonTest =>
          t instanceof DataQualityRelationValidationTest ||
          t instanceof DataQualityRelationComparisonTest,
      )
      .map((test) => new DataQualityTestState(this, test));
    this.selectTestState = this.testStates[0];
    if (suite.testData) {
      this.testDataState = new DataQualityTestDataState(
        editorStore,
        this,
        suite.testData.testData,
      );
    }
  }

  setSelectTestState(state: DataQualityTestState | undefined): void {
    this.selectTestState = state;
  }

  setTestToRename(
    test:
      | DataQualityRelationValidationTest
      | DataQualityRelationComparisonTest
      | undefined,
  ): void {
    this.testToRename = test;
  }

  ensureTestData(): DataQualityTestDataState {
    if (!this.suite.testData) {
      if (this.suite instanceof DataQualityRelationValidationTestSuite) {
        this.suite.testData = new DataQualityRelationValidationTestData();
      } else {
        this.suite.testData = new DataQualityRelationComparisonTestData();
      }
      this.testDataState = new DataQualityTestDataState(
        this.editorStore,
        this,
        this.suite.testData.testData,
      );
    }
    return guaranteeNonNullable(this.testDataState);
  }

  addTest(): void {
    flowResult(this.addTestFlow()).catch(
      this.editorStore.applicationStore.alertUnhandledError,
    );
  }

  *addTestFlow(): GeneratorFn<void> {
    const isValidation =
      this.suite instanceof DataQualityRelationValidationTestSuite;
    const test = isValidation
      ? new DataQualityRelationValidationTest()
      : new DataQualityRelationComparisonTest();
    test.id = generateEnumerableNameFromToken(
      this.suite.tests.map((t) => t.id),
      DEFAULT_TEST_PREFIX,
    );
    test.__parent = this.suite;
    const assertion = createEmptyEqualToJsonAssertion(test);
    atomicTest_addAssertion(test, assertion);
    // `testSuite_addTest` observes the test through the suite; no need to
    // observe it separately here.
    testSuite_addTest(
      this.suite,
      test,
      this.editorStore.changeDetectionState.observerContext,
    );
    const state = new DataQualityTestState(this, test);
    addUniqueEntry(this.testStates, state);
    this.selectTestState = state;
  }

  deleteTestState(testState: DataQualityTestState): void {
    testSuite_deleteTest(
      this.suite,
      testState.test as
        | DataQualityRelationValidationTest
        | DataQualityRelationComparisonTest,
    );
    deleteEntry(this.testStates, testState);
    if (this.selectTestState === testState) {
      this.selectTestState = this.testStates[0];
    }
  }
}

// -----------------------------------------------------------------------------
// Testable state (per DQ element)
// -----------------------------------------------------------------------------

export class DataQualityTestableState extends TestablePackageableElementEditorState {
  declare selectedTestSuite: DataQualityTestSuiteState | undefined;
  suiteToRename:
    | DataQualityRelationValidationTestSuite
    | DataQualityRelationComparisonTestSuite
    | undefined;
  cachedAccessors: Accessor[] = [];
  createSuiteModal = false;

  constructor(
    editorState: ElementEditorState,
    element:
      | DataQualityRelationValidationConfiguration
      | DataQualityRelationComparisonConfiguration,
  ) {
    super(editorState, element);
    makeObservable(this, {
      isRunningTestableSuitesState: observable,
      isRunningFailingSuitesState: observable,
      selectedTestSuite: observable,
      testableResults: observable,
      runningSuite: observable,
      testableComponentToRename: observable,
      suiteToRename: observable,
      cachedAccessors: observable,
      createSuiteModal: observable,
      init: action,
      changeSuite: action,
      deleteTestSuite: action,
      setSuiteToRename: action,
      setCreateSuite: action,
      renameSuite: action,
      renameTest: action,
      handleNewResults: action,
      clearTestResultsForSuite: action,
      setRenameComponent: action,
      resolveAccessors: flow,
      addTestSuite: flow,
      runTestable: flow,
      runSuite: flow,
      runAllFailingSuites: flow,
    });
    this.init();
    flowResult(this.resolveAccessors()).catch(noop);
  }

  get element():
    | DataQualityRelationValidationConfiguration
    | DataQualityRelationComparisonConfiguration {
    return this.testable as
      | DataQualityRelationValidationConfiguration
      | DataQualityRelationComparisonConfiguration;
  }

  get isReadOnly(): boolean {
    return this.editorState.isReadOnly;
  }

  private isValidationElement(): boolean {
    return this.element instanceof DataQualityRelationValidationConfiguration;
  }

  /**
   * All raw lambdas that make up this DQ element's queries. Validation
   * configs only expose a single `query`; comparison (recon) configs expose
   * both a `source` and a `target` lambda — both need to be inspected so
   * that stores referenced by *either* side get discovered when seeding
   * test data / runtimes.
   */
  buildRawLambdasFromQueries(): RawLambda[] {
    const graphManager = this.editorStore.graphManagerState.graphManager;
    const queries =
      this.element instanceof DataQualityRelationValidationConfiguration
        ? [this.element.query]
        : [this.element.source, this.element.target];
    return queries.map(
      (query) =>
        new RawLambda(
          query.parameters.map((p) =>
            graphManager.serializeRawValueSpecification(p),
          ),
          query.body,
        ),
    );
  }

  /**
   * Runtimes that back this element's queries.
   *
   * For validation configs the element itself may carry an explicit
   * `runtime` reference; we prefer that. Otherwise we fall back to
   * parsing the query lambda(s) for `->from(mapping, runtime)` calls (which
   * mirrors what `FunctionTestableState` does for functions). For
   * comparison (recon) configs, both the source and target lambdas are
   * inspected so a runtime referenced by only one side still gets picked
   * up.
   */
  get associatedRuntimes(): EngineRuntime[] {
    const runtimes: EngineRuntime[] = [];
    if (
      this.element instanceof DataQualityRelationValidationConfiguration &&
      this.element.runtime
    ) {
      runtimes.push(this.element.runtime.value.runtimeValue);
    }
    try {
      for (const rawLambda of this.buildRawLambdasFromQueries()) {
        runtimes.push(
          ...resolveRuntimesFromQueryLambda(rawLambda, this.editorStore),
        );
      }
    } catch {
      // ignore — best-effort discovery
    }
    return uniq(runtimes);
  }

  *resolveAccessors(): GeneratorFn<void> {
    try {
      const rawLambdas = this.buildRawLambdasFromQueries();
      // Dedupe by hashCode: comparison configs run this over both the
      // source and target lambdas, which may legitimately reference the
      // same accessor from both sides.
      const collected = new Map<string, Accessor>();
      for (const rawLambda of rawLambdas) {
        const accessors =
          (yield this.editorStore.graphManagerState.graphManager.collectAccessorsInRawLambda(
            rawLambda,
            this.editorStore.graphManagerState.graph,
          )) as Accessor[];
        for (const accessor of accessors) {
          if (!collected.has(accessor.hashCode)) {
            collected.set(accessor.hashCode, accessor);
          }
        }
      }
      this.cachedAccessors = Array.from(collected.values());
    } catch {
      this.cachedAccessors = [];
    }
  }

  override init(): void {
    const first = this.element.tests[0];
    this.selectedTestSuite = first
      ? new DataQualityTestSuiteState(this.editorStore, this, first)
      : undefined;
  }

  changeSuite(
    suite:
      | DataQualityRelationValidationTestSuite
      | DataQualityRelationComparisonTestSuite,
  ): void {
    this.selectedTestSuite = new DataQualityTestSuiteState(
      this.editorStore,
      this,
      suite,
    );
  }

  setSuiteToRename(
    suite:
      | DataQualityRelationValidationTestSuite
      | DataQualityRelationComparisonTestSuite
      | undefined,
  ): void {
    this.suiteToRename = suite;
  }

  setCreateSuite(val: boolean): void {
    this.createSuiteModal = val;
  }

  *addTestSuite(suiteName: string, testName: string): GeneratorFn<void> {
    try {
      const isValidation = this.isValidationElement();
      const suite = isValidation
        ? new DataQualityRelationValidationTestSuite()
        : new DataQualityRelationComparisonTestSuite();
      suite.id = suiteName;

      // refresh accessors then seed one FunctionTestData per unique owner
      yield flowResult(this.resolveAccessors());
      const testData: FunctionTestData[] = [];
      const accessorsByOwner = new Map<string, Accessor[]>();
      for (const accessor of this.cachedAccessors) {
        const key = accessor.accessorOwner;
        if (key) {
          const group = accessorsByOwner.get(key) ?? [];
          group.push(accessor);
          accessorsByOwner.set(key, group);
        }
      }
      for (const [parentPath, group] of accessorsByOwner.entries()) {
        const element =
          this.editorStore.graphManagerState.graph.getNullableElement(
            parentPath,
          );
        if (!element) {
          continue;
        }
        const data = new FunctionTestData();
        data.element = PackageableElementExplicitReference.create(
          element as AccessorOwner,
        );
        data.data = V1_buildRelationElementsDataFromAccessors(group);
        testData.push(data);
      }

      // Fallback for modelled data: when the query has no accessors (i.e. no
      // ingest / data product / raw database refs), try to resolve the
      // backing runtime and seed one entry per unique store — matching how
      // `FunctionTestableState` behaves for M2M / mapping-based functions.
      if (!testData.length) {
        const runtimes = this.associatedRuntimes;
        const seededStorePaths = new Set<string>();
        for (const runtime of runtimes) {
          const store = resolveSingleStoreFromRuntimes([runtime]);
          if (!store || seededStorePaths.has(store.path)) {
            continue;
          }
          const data = buildFunctionTestDataForStore(store);
          if (data) {
            testData.push(data);
            seededStorePaths.add(store.path);
          }
        }
        if (!testData.length) {
          this.editorStore.applicationStore.notificationService.notifyWarning(
            'Unable to seed test data automatically. You will need to add test data manually.',
          );
        }
      }

      if (suite instanceof DataQualityRelationValidationTestSuite) {
        const testDataWrapper = new DataQualityRelationValidationTestData();
        testDataWrapper.testData = testData;
        suite.testData = testDataWrapper;
      } else {
        const testDataWrapper = new DataQualityRelationComparisonTestData();
        testDataWrapper.testData = testData;
        suite.testData = testDataWrapper;
      }

      // Seed with an empty test + `EqualToJson` assertion; users can
      // convert to `EqualToRelation` (with pre-inferred columns) via the
      // assertion context menu when they want the relation-typed variant.
      const test = isValidation
        ? new DataQualityRelationValidationTest()
        : new DataQualityRelationComparisonTest();
      test.id = testName;
      test.__parent = suite;
      const assertion = createEmptyEqualToJsonAssertion(test);
      test.assertions = [assertion];
      suite.tests = [test];

      // observe the whole suite subtree
      if (isValidation) {
        observe_DataQualityRelationValidationTestSuite(
          suite as DataQualityRelationValidationTestSuite,
          this.editorStore.changeDetectionState.observerContext,
        );
        dataQualityValidation_addTestSuite(
          this.element as DataQualityRelationValidationConfiguration,
          suite as DataQualityRelationValidationTestSuite,
        );
      } else {
        observe_DataQualityRelationComparisonTestSuite(
          suite as DataQualityRelationComparisonTestSuite,
          this.editorStore.changeDetectionState.observerContext,
        );
        dataQualityComparison_addTestSuite(
          this.element as DataQualityRelationComparisonConfiguration,
          suite as DataQualityRelationComparisonTestSuite,
        );
      }
      this.selectedTestSuite = new DataQualityTestSuiteState(
        this.editorStore,
        this,
        suite,
      );
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(
        `Unable to create data quality test suite: ${error.message}`,
      );
    }
  }

  renameSuite(
    suite:
      | DataQualityRelationValidationTestSuite
      | DataQualityRelationComparisonTestSuite,
    newId: string,
  ): void {
    suite.id = newId;
  }

  renameTest(
    test: DataQualityRelationValidationTest | DataQualityRelationComparisonTest,
    newId: string,
  ): void {
    testable_setId(test, newId);
  }
}
