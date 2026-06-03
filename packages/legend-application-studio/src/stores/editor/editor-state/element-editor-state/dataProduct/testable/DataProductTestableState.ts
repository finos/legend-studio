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
  type AccessorOwner,
  type ValueSpecification,
  DataProduct,
  FunctionAccessPoint,
  LakehouseAccessPoint,
  DataProductTestSuite,
  BaseDataResolver,
  ReferenceDataResolver,
  DataProductAccessPointTest,
  RelationElementsData,
  RelationElement,
  PackageableElementExplicitReference,
  TestExecuted,
  TestError,
  TestExecutionStatus,
  EqualToRelation,
  FunctionParameterValue,
  RelationRowTestData,
  VariableExpression,
  observe_FunctionParameterValue,
  observe_RelationElement,
  observe_RelationRowTestData,
  observe_RelationElementsData,
  observe_DataProductTestSuite,
  observe_ValueSpecification,
  buildLambdaVariableExpressions,
  IngestDefinition,
  getAccessorItemLabelForElement,
  type AbstractPureGraphManager,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  type PlainObject,
  ActionState,
  assertErrorThrown,
  filterByType,
  guaranteeNonNullable,
  deleteEntry,
  addUniqueEntry,
  returnUndefOnError,
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
import {
  RelationElementsDataState,
  RelationElementState,
} from '../../data/EmbeddedDataState.js';
import { TESTABLE_RESULT } from '../../../../sidebar-state/testable/GlobalTestRunnerState.js';
import { testSuite_addTest } from '../../../../../graph-modifier/Testable_GraphModifierHelper.js';
import {
  TestableTestEditorState,
  TestableTestSuiteEditorState,
} from '../../testable/TestableEditorState.js';
import { generateVariableExpressionMockValue } from '@finos/legend-query-builder';

const createEmptyRelationElement = (
  itemId: string,
  columns: string[] = [],
): RelationElement => {
  const row = observe_RelationRowTestData(new RelationRowTestData());
  row.values = columns.map(() => '');
  const relationElement = new RelationElement();
  relationElement.paths = [itemId];
  relationElement.columns = columns;
  relationElement.rows = [row];
  return observe_RelationElement(relationElement);
};

const getTrimmedParameterName = (name: unknown): string =>
  typeof name === 'string' ? name.trim() : '';

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
  graphManager: AbstractPureGraphManager,
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
    return graphManager
      .getIngestDefinitionDatasetNames(element)
      .map((name) => ({
        id: name,
        label: name,
      }));
  }
  return [];
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

export class DataProductTestParameterState {
  readonly uuid = uuid();
  readonly editorStore: EditorStore;
  readonly testState: DataProductTestState;
  parameterValue: FunctionParameterValue;

  constructor(
    parameterValue: FunctionParameterValue,
    editorStore: EditorStore,
    testState: DataProductTestState,
  ) {
    this.editorStore = editorStore;
    this.testState = testState;
    this.parameterValue = parameterValue;
  }
}

export class DataProductValueSpecificationTestParameterState extends DataProductTestParameterState {
  valueSpec: ValueSpecification;
  varExpression: VariableExpression;

  constructor(
    parameterValue: FunctionParameterValue,
    editorStore: EditorStore,
    testState: DataProductTestState,
    valueSpec: ValueSpecification,
    varExpression: VariableExpression,
  ) {
    super(parameterValue, editorStore, testState);
    makeObservable(this, {
      valueSpec: observable,
      updateValueSpecification: action,
      updateParameterValue: action,
      resetValueSpec: action,
    });
    this.valueSpec = valueSpec;
    this.varExpression = varExpression;
  }

  updateValueSpecification(val: ValueSpecification): void {
    this.valueSpec = observe_ValueSpecification(
      val,
      this.editorStore.changeDetectionState.observerContext,
    );
    this.updateParameterValue();
  }

  updateParameterValue(): void {
    const updatedValueSpec =
      this.editorStore.graphManagerState.graphManager.serializeValueSpecification(
        this.valueSpec,
      );
    this.parameterValue.value = updatedValueSpec;
  }

  resetValueSpec(): void {
    const mockValue = generateVariableExpressionMockValue(
      this.varExpression,
      this.editorStore.graphManagerState.graph,
      this.editorStore.changeDetectionState.observerContext,
    );
    if (mockValue) {
      this.updateValueSpecification(mockValue);
    }
  }
}

export class DataProductTestState extends TestableTestEditorState {
  readonly suiteState: DataProductTestSuiteState;
  override test: DataProductAccessPointTest;
  readonly uuid = uuid();

  /** Wraps assertion.expected — drives both column definitions and test data rows. */
  testDataRelationState: RelationElementState | undefined;
  parameterValueStates: DataProductTestParameterState[] = [];
  newParameterValueName = '';
  showNewParameterModal = false;

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
      parameterValueStates: observable,
      newParameterValueName: observable,
      showNewParameterModal: observable,
      // actions from base class
      setSelectedTab: action,
      setAssertionToRename: action,
      addAssertion: action,
      deleteAssertion: action,
      openAssertion: action,
      resetResult: action,
      handleTestResult: action,
      setNewParameterValueName: action,
      setShowNewParameterModal: action,
      openNewParamModal: action,
      addParameterValue: action,
      addExpressionParameterValue: action,
      syncWithQuery: action,
      generateTestParameterValues: action,
      removeParamValueState: action,
      // flow from base class
      runTest: flow,
    });
    this.suiteState = suiteState;
    this.test = test;
    this.normalizePositionalParameters();
    this.parameterValueStates = this.buildParameterStates();
    this.buildTestDataRelationState().catch(noop());
  }

  private normalizePositionalParameters(): void {
    const params = this.test.parameters ?? [];
    if (!params.length) {
      return;
    }

    const expressions = this.queryVariableExpressions;
    if (!expressions.length) {
      return;
    }

    const unnamedParams = params.filter(
      (p) => !getTrimmedParameterName(p.name),
    );
    if (!unnamedParams.length) {
      return;
    }

    const takenNames = new Set(
      params
        .map((p) => getTrimmedParameterName(p.name))
        .filter((name) => Boolean(name)),
    );

    expressions.forEach((expr) => {
      if (!takenNames.has(expr.name)) {
        const nextUnnamed = unnamedParams.shift();
        if (nextUnnamed) {
          nextUnnamed.name = expr.name;
          takenNames.add(expr.name);
        }
      }
    });
  }

  get queryVariableExpressions(): VariableExpression[] {
    const accessPoint = this.suiteState.testableState.ownAccessPoints.find(
      (ap) => ap.id === this.test.accessPointId,
    );
    const query = accessPoint ? getAccessPointLambda(accessPoint) : undefined;
    if (!query) {
      return [];
    }
    return buildLambdaVariableExpressions(
      query,
      this.editorStore.graphManagerState,
    ).filter(filterByType(VariableExpression));
  }

  get newParamOptions(): { value: string; label: string }[] {
    const queryVarExpressions = this.queryVariableExpressions;
    const currentParams = this.test.parameters ?? [];
    return queryVarExpressions
      .filter((v) => !currentParams.find((i) => i.name === v.name))
      .map((e) => ({ value: e.name, label: e.name }));
  }

  setNewParameterValueName(val: string): void {
    this.newParameterValueName = val;
  }

  setShowNewParameterModal(val: boolean): void {
    this.showNewParameterModal = val;
  }

  openNewParamModal(): void {
    this.setShowNewParameterModal(true);
    const option = this.newParamOptions[0];
    if (option) {
      this.newParameterValueName = option.value;
    }
  }

  addParameterValue(): void {
    try {
      const expressions = this.queryVariableExpressions;
      const expression = guaranteeNonNullable(
        expressions.find((v) => v.name === this.newParameterValueName),
      );
      this.addExpressionParameterValue(expression);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.setShowNewParameterModal(false);
    }
  }

  syncWithQuery(): void {
    this.normalizePositionalParameters();

    this.parameterValueStates.forEach((paramState) => {
      const expression = this.queryVariableExpressions.find(
        (v) => v.name === paramState.parameterValue.name,
      );
      if (!expression) {
        deleteEntry(this.parameterValueStates, paramState);
        deleteEntry(this.test.parameters ?? [], paramState.parameterValue);
      }
    });

    this.queryVariableExpressions.forEach((v) => {
      const multiplicity = v.multiplicity;
      const isRequired = multiplicity.lowerBound > 0;
      const paramState = this.parameterValueStates.find(
        (p) => p.parameterValue.name === v.name,
      );
      if (!paramState && isRequired) {
        this.addExpressionParameterValue(v);
      }
    });
  }

  addExpressionParameterValue(expression: VariableExpression): void {
    try {
      const mockValue = guaranteeNonNullable(
        generateVariableExpressionMockValue(
          expression,
          this.editorStore.graphManagerState.graph,
          this.editorStore.changeDetectionState.observerContext,
        ),
      );
      const paramValue = observe_FunctionParameterValue(
        new FunctionParameterValue(),
      );
      paramValue.name = expression.name;
      paramValue.value =
        this.editorStore.graphManagerState.graphManager.serializeValueSpecification(
          mockValue,
        );
      if (this.test.parameters) {
        this.test.parameters.push(paramValue);
      } else {
        this.test.parameters = [paramValue];
      }
      const paramValueState =
        new DataProductValueSpecificationTestParameterState(
          paramValue,
          this.editorStore,
          this,
          observe_ValueSpecification(
            mockValue,
            this.editorStore.changeDetectionState.observerContext,
          ),
          expression,
        );
      this.parameterValueStates.push(paramValueState);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
    }
  }

  generateTestParameterValues(): void {
    try {
      const varExpressions = this.queryVariableExpressions;
      const parameterValueStates = varExpressions
        .map((varExpression) => {
          const mockValue = generateVariableExpressionMockValue(
            varExpression,
            this.editorStore.graphManagerState.graph,
            this.editorStore.changeDetectionState.observerContext,
          );
          if (mockValue) {
            const paramValue = observe_FunctionParameterValue(
              new FunctionParameterValue(),
            );
            paramValue.name = varExpression.name;
            paramValue.value =
              this.editorStore.graphManagerState.graphManager.serializeValueSpecification(
                mockValue,
              );
            return new DataProductValueSpecificationTestParameterState(
              paramValue,
              this.editorStore,
              this,
              mockValue,
              varExpression,
            );
          }
          return undefined;
        })
        .filter(
          (value): value is DataProductValueSpecificationTestParameterState =>
            value !== undefined,
        );
      this.test.parameters = parameterValueStates.map((s) => s.parameterValue);
      this.parameterValueStates = parameterValueStates;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(
        `Unable to generate parameter values: ${error.message}`,
      );
    }
  }

  buildParameterStates(): DataProductTestParameterState[] {
    const varExpressions = this.queryVariableExpressions;
    const paramValues = this.test.parameters ?? [];
    return paramValues.map((paramValue) => {
      const spec = returnUndefOnError(() =>
        this.editorStore.graphManagerState.graphManager.buildValueSpecification(
          paramValue.value as PlainObject,
          this.editorStore.graphManagerState.graph,
        ),
      );
      const expression = varExpressions.find((e) => e.name === paramValue.name);
      return spec && expression
        ? new DataProductValueSpecificationTestParameterState(
            paramValue,
            this.editorStore,
            this,
            observe_ValueSpecification(
              spec,
              this.editorStore.changeDetectionState.observerContext,
            ),
            expression,
          )
        : new DataProductTestParameterState(paramValue, this.editorStore, this);
    });
  }

  removeParamValueState(paramState: DataProductTestParameterState): void {
    deleteEntry(this.parameterValueStates, paramState);
    deleteEntry(this.test.parameters ?? [], paramState.parameterValue);
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
  readonly relationElementsDataState: RelationElementsDataState | undefined;

  constructor(
    testDataState: DataProductTestDataState,
    testData: BaseDataResolver,
  ) {
    this.testDataState = testDataState;
    this.testData = testData;
    this.editorStore = testDataState.editorStore;
    if (testData.data instanceof RelationElementsData) {
      this.relationElementsDataState = new RelationElementsDataState(
        this.editorStore,
        testData.data,
      );
      this.initAccessorOptions();
    }
  }

  get element(): PackageableElement {
    return this.testData.element.value;
  }

  get elementName(): string {
    return this.testData.element.value.name;
  }

  get itemLabel(): string {
    return getAccessorItemLabelForElement(this.element as AccessorOwner);
  }

  private initAccessorOptions(): void {
    const dataState = this.relationElementsDataState;
    if (!dataState) {
      return;
    }
    this.refreshAccessorOptions(dataState).catch(noop);
    dataState.setRefreshAccessorOptions(() =>
      this.refreshAccessorOptions(dataState),
    );
  }

  private async refreshAccessorOptions(
    dataState: RelationElementsDataState,
  ): Promise<void> {
    const element = this.element;
    const graphManager = this.editorStore.graphManagerState.graphManager;
    const graph = this.editorStore.graphManagerState.graph;
    const items = getElementDataItems(element, graphManager);
    if (items.length === 0) {
      dataState.setAccessorOptions(undefined, undefined);
      return;
    }
    const typeLabel = this.itemLabel;
    const options = await Promise.all(
      items.map(async (item) => {
        let columns: string[] = [];
        try {
          if (element instanceof IngestDefinition) {
            const accessor =
              await graphManager.createAccessorFromPackageableElement(
                element,
                graph,
                { schemaName: undefined, tableName: item.id },
              );
            if (accessor) {
              columns = accessor.relationType.columns.map((c) => c.name);
            }
          } else if (element instanceof DataProduct) {
            const accessor = await graphManager.buildDataProductAccessor(
              element,
              graph,
              { tableName: item.id },
            );
            if (accessor) {
              columns = accessor.relationType.columns.map((c) => c.name);
            }
          }
        } catch {
          // best-effort column resolution
        }
        return {
          label: item.label,
          value: item.id,
          columns,
        };
      }),
    );
    runInAction(() => {
      dataState.setAccessorOptions(options, typeLabel);
      // Back-fill columns on existing relation elements that have none
      const columnsByItem = new Map(
        options
          .filter((o) => o.columns.length > 0)
          .map((o) => [o.value, o.columns]),
      );
      for (const relState of dataState.relationElementStates) {
        const rel = relState.relationElement;
        if (rel.columns.length === 0) {
          const key = rel.paths[rel.paths.length - 1];
          const cols = key ? columnsByItem.get(key) : undefined;
          if (cols) {
            rel.columns = cols;
          }
        }
      }
    });
  }
}

// ─── Test data state for a suite ─────────────────────────────────────────────

export class DataProductTestDataState {
  readonly editorStore: EditorStore;
  readonly suiteState: DataProductTestSuiteState;

  elementTestDataStates: DataProductElementTestDataState[] = [];
  selectedElementTestDataState: DataProductElementTestDataState | undefined;
  showAddElementModal = false;

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
      (suite.testData ?? [])
        .filter(
          (td): td is BaseDataResolver | ReferenceDataResolver =>
            td instanceof BaseDataResolver ||
            td instanceof ReferenceDataResolver,
        )
        .map((td) => td.element.value.path),
    );
    const graph = this.editorStore.graphManagerState.graph;
    const currentDpPath = this.suiteState.testableState.dataProduct.path;
    const candidates: PackageableElement[] = [
      ...graph.ingests,
      ...graph.allElements.filter(
        (e) => e instanceof DataProduct && e.path !== currentDpPath,
      ),
    ];
    return candidates.filter((e) => !existingPaths.has(e.path));
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
    const relData = new RelationElementsData();
    relData.relationElements = [];
    observe_RelationElementsData(relData);
    resolver.data = relData;
    const suite = this.suiteState.suite;
    suite.testData = [...(suite.testData ?? []), resolver];
    this.refreshElementTestDataStates({ selectedElementPath: path });
  }

  deleteElement(elementState: DataProductElementTestDataState): void {
    const suite = this.suiteState.suite;
    if (suite.testData) {
      const idx = suite.testData.indexOf(elementState.testData);
      suite.testData.splice(idx, 1);
    }
    this.refreshElementTestDataStates();
  }

  refreshElementTestDataStates(options?: {
    selectedElementPath?: string | undefined;
  }): void {
    const previouslySelectedElementPath =
      options?.selectedElementPath ??
      this.selectedElementTestDataState?.element.path;
    const suite = this.suiteState.suite;
    this.elementTestDataStates = (suite.testData ?? [])
      .filter((td): td is BaseDataResolver => td instanceof BaseDataResolver)
      .map((td) => new DataProductElementTestDataState(this, td));

    this.selectedElementTestDataState =
      this.elementTestDataStates.find(
        (state) => state.element.path === previouslySelectedElementPath,
      ) ?? this.elementTestDataStates[0];
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
      resolvedAccessors = all.filter((accessor) =>
        isIngestOrDataProductAccessor(accessor),
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
      this.editorStore.applicationStore.notificationService.notifyWarning(
        'Access Point accessors cannot be resolved',
      );
    }

    const assertion = new EqualToRelation();
    assertion.id = 'assert_1';
    const expectedRelElement = new RelationElement();
    const expectedRow = observe_RelationRowTestData(new RelationRowTestData());
    expectedRow.values = inferredColumns.map(() => '');
    expectedRelElement.paths = [accessPointId];
    expectedRelElement.columns = inferredColumns;
    expectedRelElement.rows = [expectedRow];
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
      const externalAccessors = all.filter((accessor) =>
        isIngestOrDataProductAccessor(accessor),
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
    // If no external sources were resolved, notify the user and leave test data empty
    if (suite.testData.length === 0) {
      this.editorStore.applicationStore.notificationService.notifyWarning(
        'Access Point accessors cannot be resolved',
      );
    }

    // Create one initial test with EqualToRelation assertion
    const test = new DataProductAccessPointTest();
    test.id = testName;
    test.__parent = suite;
    test.accessPointId = accessPointId;

    const assertion = new EqualToRelation();
    assertion.id = 'assert_1';
    const expectedRelElement = new RelationElement();
    const expectedRow = observe_RelationRowTestData(new RelationRowTestData());
    expectedRow.values = inferredColumns.map(() => '');
    expectedRelElement.paths = [accessPointId];
    expectedRelElement.columns = inferredColumns;
    expectedRelElement.rows = [expectedRow];
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
