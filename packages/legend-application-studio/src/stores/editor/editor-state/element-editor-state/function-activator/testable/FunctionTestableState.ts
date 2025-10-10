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

import { action, flow, makeObservable, observable } from 'mobx';
import type { EditorStore } from '../../../../EditorStore.js';
import type { FunctionEditorState } from '../../FunctionEditorState.js';
import {
  assertErrorThrown,
  isNonNullable,
  uuid,
  LogEvent,
  guaranteeNonNullable,
  addUniqueEntry,
  uniq,
  assertTrue,
  returnUndefOnError,
  type PlainObject,
  filterByType,
  deleteEntry,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import {
  type ConcreteFunctionDefinition,
  type EmbeddedData,
  type AtomicTest,
  type EngineRuntime,
  type ObserverContext,
  type ValueSpecification,
  type TestAssertion,
  FunctionParameterValue,
  VariableExpression,
  FunctionTest,
  FunctionTestData,
  FunctionTestSuite,
  RawLambda,
  PackageableRuntime,
  SimpleFunctionExpression,
  LambdaFunctionInstanceValue,
  SUPPORTED_FUNCTIONS,
  matchFunctionName,
  InstanceValue,
  PackageableElementReference,
  Database,
  PackageableElementExplicitReference,
  observe_ValueSpecification,
  buildLambdaVariableExpressions,
  EqualTo,
  ModelStore,
  RelationElementsData,
  CORE_PURE_PATH,
} from '@finos/legend-graph';
import {
  TestablePackageableElementEditorState,
  TestableTestEditorState,
  TestableTestSuiteEditorState,
} from '../../testable/TestableEditorState.js';
import { EmbeddedDataEditorState } from '../../data/DataEditorState.js';
import {
  functionTestable_deleteDataStore,
  functionTestable_setEmbeddedData,
  function_addParameterValue,
  function_addTestSuite,
  function_deleteParameterValue,
  function_setParameterName,
  function_setParameterValueSpec,
  function_setParameterValues,
} from '../../../../../graph-modifier/DomainGraphModifierHelper.js';
import {
  DEFAULT_TEST_ASSERTION_ID,
  createDefaultEqualToJSONTestAssertion,
  createBareExternalFormat,
} from '../../../../utils/TestableUtils.js';
import { LEGEND_STUDIO_APP_EVENT } from '../../../../../../__lib__/LegendStudioEvent.js';
import { testSuite_addTest } from '../../../../../graph-modifier/Testable_GraphModifierHelper.js';
import {
  buildDefaultInstanceValue,
  generateVariableExpressionMockValue,
} from '@finos/legend-query-builder';

const addToFunctionMap = (
  val: SimpleFunctionExpression,
  functions: Map<string, SimpleFunctionExpression[]>,
): boolean => {
  const values = functions.get(val.functionName) ?? [];
  if (values.includes(val)) {
    return false;
  }
  addUniqueEntry(values, val);
  functions.set(val.functionName, values);
  return true;
};

const collectSimpleFunctionExpressions = (
  val: ValueSpecification,
  functions: Map<string, SimpleFunctionExpression[]>,
): void => {
  if (val instanceof SimpleFunctionExpression) {
    const continueProcessing = addToFunctionMap(val, functions);
    if (continueProcessing) {
      val.parametersValues.forEach((v) =>
        collectSimpleFunctionExpressions(v, functions),
      );
    }
  }
};

const resolveRuntimesFromQuery = (
  func: ConcreteFunctionDefinition,
  editorStore: EditorStore,
): EngineRuntime[] | undefined => {
  try {
    const body = func.expressionSequence;
    const rawLambda = new RawLambda(
      func.parameters.map((_param) =>
        editorStore.graphManagerState.graphManager.serializeRawValueSpecification(
          _param,
        ),
      ),
      body,
    );
    const functions = new Map<string, SimpleFunctionExpression[]>();
    const valueSpec =
      editorStore.graphManagerState.graphManager.buildValueSpecification(
        editorStore.graphManagerState.graphManager.serializeRawValueSpecification(
          rawLambda,
        ),
        editorStore.graphManagerState.graph,
      );
    if (valueSpec instanceof LambdaFunctionInstanceValue) {
      const vals = guaranteeNonNullable(
        valueSpec.values[0],
        'function expected to be of type lambda',
      ).expressionSequence;
      vals.forEach((v) => collectSimpleFunctionExpressions(v, functions));
      const fromFunctions = Array.from(functions.keys())
        .filter((v) => matchFunctionName(v, SUPPORTED_FUNCTIONS.FROM))
        .map((e) => functions.get(e))
        .flat()
        .filter(isNonNullable);
      const runtimeInstance: PackageableRuntime[] = [];
      fromFunctions.forEach((v) => {
        v.parametersValues.forEach((p) => {
          if (p instanceof InstanceValue) {
            p.values.forEach((pIn) => {
              if (pIn instanceof PackageableElementReference) {
                if (pIn.value instanceof PackageableRuntime) {
                  runtimeInstance.push(pIn.value);
                }
              }
            });
          }
        });
      });
      return uniq(runtimeInstance.map((e) => e.runtimeValue).flat());
    }
    return [];
  } catch (error) {
    assertErrorThrown(error);
    editorStore.applicationStore.logService.error(
      LogEvent.create(LEGEND_STUDIO_APP_EVENT.SERVICE_TEST_SETUP_FAILURE),
      error,
    );
    return undefined;
  }
};

export class FunctionStoreTestDataState {
  readonly editorStore: EditorStore;
  readonly testDataState: FunctionTestDataState;
  storeTestData: FunctionTestData;
  embeddedEditorState: EmbeddedDataEditorState;
  dataElementModal = false;

  constructor(
    editorStore: EditorStore,
    testDataState: FunctionTestDataState,
    value: FunctionTestData,
  ) {
    makeObservable(this, {
      storeTestData: observable,
      dataElementModal: observable,
      embeddedEditorState: observable,

      setDataElementModal: action,
      changeEmbeddedData: action,
    });
    this.editorStore = editorStore;
    this.testDataState = testDataState;
    this.storeTestData = value;
    this.embeddedEditorState = new EmbeddedDataEditorState(
      this.testDataState.editorStore,
      this.storeTestData.data,
      {
        hideSource: true,
      },
    );
  }

  setDataElementModal(val: boolean): void {
    this.dataElementModal = val;
  }

  changeEmbeddedData(val: EmbeddedData): void {
    functionTestable_setEmbeddedData(
      this.storeTestData,
      val,
      this.editorStore.changeDetectionState.observerContext,
    );
    this.embeddedEditorState = new EmbeddedDataEditorState(
      this.testDataState.editorStore,
      this.storeTestData.data,
    );
  }
}

export class FunctionTestParameterState {
  readonly uuid = uuid();
  readonly editorStore: EditorStore;
  readonly testState: FunctionTestState;
  parameterValue: FunctionParameterValue;
  constructor(
    parameterValue: FunctionParameterValue,
    editorStore: EditorStore,
    testState: FunctionTestState,
  ) {
    this.editorStore = editorStore;
    this.testState = testState;
    this.parameterValue = parameterValue;
  }
}

export class FunctionValueSpecificationTestParameterState extends FunctionTestParameterState {
  valueSpec: ValueSpecification;
  varExpression: VariableExpression;

  constructor(
    parameterValue: FunctionParameterValue,
    editorStore: EditorStore,
    testState: FunctionTestState,
    valueSpec: ValueSpecification,
    varExpression: VariableExpression,
  ) {
    super(parameterValue, editorStore, testState);
    makeObservable(this, {
      setName: observable,
      valueSpec: observable,
      parameterValue: observable,
      resetValueSpec: action,
      updateValueSpecification: action,
      updateParameterValue: action,
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
    function_setParameterValueSpec(this.parameterValue, updatedValueSpec);
  }

  setName(val: string): void {
    function_setParameterName(this.parameterValue, val);
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

export class FunctionTestState extends TestableTestEditorState {
  readonly parentState: FunctionTestSuiteState;
  readonly functionTestableState: FunctionTestableState;
  readonly uuid = uuid();
  override test: FunctionTest;
  parameterValueStates: FunctionTestParameterState[] = [];
  newParameterValueName = '';
  showNewParameterModal = false;

  constructor(
    editorStore: EditorStore,
    parentSuiteState: FunctionTestSuiteState,
    test: FunctionTest,
  ) {
    super(
      parentSuiteState.functionTestableState.function,
      test,
      parentSuiteState.functionTestableState.functionEditorState.isReadOnly,
      editorStore,
    );
    makeObservable(this, {
      selectedAsertionState: observable,
      selectedTab: observable,
      assertionToRename: observable,
      assertionEditorStates: observable,
      testResultState: observable,
      runningTestAction: observable,
      parameterValueStates: observable,
      setNewParameterValueName: action,
      setShowNewParameterModal: action,
      addExpressionParameterValue: action,
      openNewParamModal: action,
      addAssertion: action,
      addParameterValue: action,
      setAssertionToRename: action,
      handleTestResult: action,
      setSelectedTab: action,
      syncWithQuery: action,
      runTest: flow,
    });
    this.parentState = parentSuiteState;
    this.functionTestableState = parentSuiteState.functionTestableState;
    this.test = test;
    this.parameterValueStates = this.buildParameterStates();
  }
  get queryVariableExpressions(): VariableExpression[] {
    const query =
      this.functionTestableState.functionEditorState.bodyExpressionSequence;
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
    // remove non existing params
    this.parameterValueStates.forEach((paramState) => {
      const expression = this.queryVariableExpressions.find(
        (v) => v.name === paramState.parameterValue.name,
      );
      if (!expression) {
        deleteEntry(this.parameterValueStates, paramState);
        function_deleteParameterValue(this.test, paramState.parameterValue);
      }
    });
    // add new required params
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
      const paramValue = new FunctionParameterValue();
      paramValue.name = expression.name;
      paramValue.value =
        this.editorStore.graphManagerState.graphManager.serializeValueSpecification(
          mockValue,
        );
      function_addParameterValue(this.test, paramValue);
      const paramValueState = new FunctionValueSpecificationTestParameterState(
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
            const paramValue = new FunctionParameterValue();
            paramValue.name = varExpression.name;
            paramValue.value =
              this.editorStore.graphManagerState.graphManager.serializeValueSpecification(
                mockValue,
              );
            return new FunctionValueSpecificationTestParameterState(
              paramValue,
              this.editorStore,
              this,
              mockValue,
              varExpression,
            );
          }
          return undefined;
        })
        .filter(isNonNullable);
      function_setParameterValues(
        this.test,
        parameterValueStates.map((s) => s.parameterValue),
      );
      this.parameterValueStates = parameterValueStates;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(
        `Unable to generate param values: ${error.message}`,
      );
    }
  }

  buildParameterStates(): FunctionTestParameterState[] {
    const query =
      this.functionTestableState.functionEditorState.bodyExpressionSequence;
    const varExpressions = buildLambdaVariableExpressions(
      query,
      this.editorStore.graphManagerState,
    ).filter(filterByType(VariableExpression));
    const paramValues = this.test.parameters ?? [];
    return paramValues.map((pValue) => {
      const spec = returnUndefOnError(() =>
        this.editorStore.graphManagerState.graphManager.buildValueSpecification(
          pValue.value as PlainObject,
          this.editorStore.graphManagerState.graph,
        ),
      );
      const expression = varExpressions.find((e) => e.name === pValue.name);
      return spec && expression
        ? new FunctionValueSpecificationTestParameterState(
            pValue,
            this.editorStore,
            this,
            observe_ValueSpecification(
              spec,
              this.editorStore.changeDetectionState.observerContext,
            ),
            expression,
          )
        : new FunctionTestParameterState(pValue, this.editorStore, this);
    });
  }

  removeParamValueState(paramState: FunctionTestParameterState): void {
    deleteEntry(this.parameterValueStates, paramState);
    function_deleteParameterValue(this.test, paramState.parameterValue);
  }
}

class FunctionTestDataState {
  readonly editorStore: EditorStore;
  readonly functionTestableState: FunctionTestableState;
  selectedDataState: FunctionStoreTestDataState | undefined;
  dataHolder: FunctionTestSuite;
  showNewModal = false;

  constructor(
    editorStore: EditorStore,
    functionTestableState: FunctionTestableState,
    holder: FunctionTestSuite,
  ) {
    makeObservable(this, {
      selectedDataState: observable,
      dataHolder: observable,
      showNewModal: observable,
      initDefaultStore: action,
      setShowModal: action,
      deleteStoreTestData: action,
      openStoreTestData: action,
    });
    this.editorStore = editorStore;
    this.functionTestableState = functionTestableState;
    this.dataHolder = holder;
    this.initDefaultStore();
  }

  initDefaultStore(): void {
    const val = this.dataHolder.testData?.[0];
    if (val) {
      this.openStoreTestData(val);
    } else {
      this.selectedDataState = undefined;
    }
  }

  setShowModal(val: boolean): void {
    this.showNewModal = val;
  }

  deleteStoreTestData(val: FunctionTestData): void {
    functionTestable_deleteDataStore(this.dataHolder, val);
    this.initDefaultStore();
  }

  openStoreTestData(val: FunctionTestData): void {
    this.selectedDataState = new FunctionStoreTestDataState(
      this.editorStore,
      this,
      val,
    );
  }
}

export const createFunctionTest = (
  id: string,
  observerContext: ObserverContext,
  containsRuntime: boolean,
  functionDefinition: ConcreteFunctionDefinition,
  editorStore: EditorStore,
  suite?: FunctionTestSuite | undefined,
): FunctionTest => {
  const funcionTest = new FunctionTest();
  funcionTest.id = id;
  funcionTest.assertions = [];
  let _assertion: TestAssertion;
  if (containsRuntime) {
    _assertion = createDefaultEqualToJSONTestAssertion(
      DEFAULT_TEST_ASSERTION_ID,
    );
  } else {
    const equalTo = new EqualTo();
    equalTo.id = DEFAULT_TEST_ASSERTION_ID;
    const type = functionDefinition.returnType.value.rawType;
    const valSpec = buildDefaultInstanceValue(
      editorStore.graphManagerState.graph,
      type,
      editorStore.changeDetectionState.observerContext,
      true,
    );
    const expected =
      editorStore.graphManagerState.graphManager.serializeValueSpecification(
        valSpec,
      );
    equalTo.expected = expected;
    _assertion = equalTo;
  }
  funcionTest.assertions = [_assertion];
  _assertion.parentTest = funcionTest;
  if (suite) {
    funcionTest.__parent = suite;
    testSuite_addTest(suite, funcionTest, observerContext);
  }
  return funcionTest;
};
export class FunctionTestSuiteState extends TestableTestSuiteEditorState {
  readonly functionTestableState: FunctionTestableState;
  override suite: FunctionTestSuite;
  override testStates: FunctionTestState[] = [];
  override selectTestState: FunctionTestState | undefined;
  dataState: FunctionTestDataState;

  showCreateModal = false;

  constructor(
    editorStore: EditorStore,
    functionTestableState: FunctionTestableState,
    suite: FunctionTestSuite,
  ) {
    super(
      functionTestableState.function,
      suite,
      functionTestableState.functionEditorState.isReadOnly,
      editorStore,
    );
    makeObservable(this, {
      dataState: observable,
      showCreateModal: observable,
      selectTestState: observable,
      changeTest: observable,
      runSuite: flow,
      runFailingTests: flow,
      buildTestState: action,
      deleteTest: action,
      buildTestStates: action,
      setShowModal: action,
      addNewTest: action,
    });
    this.functionTestableState = functionTestableState;
    this.suite = suite;
    this.dataState = new FunctionTestDataState(
      editorStore,
      functionTestableState,
      suite,
    );
    this.testStates = this.buildTestStates();
    this.selectTestState = this.testStates[0];
  }

  setShowModal(val: boolean): void {
    this.showCreateModal = val;
  }

  buildTestStates(): FunctionTestState[] {
    return this.suite.tests
      .map((t) => this.buildTestState(t))
      .filter(isNonNullable);
  }

  buildTestState(val: AtomicTest): FunctionTestState | undefined {
    if (val instanceof FunctionTest) {
      return new FunctionTestState(this.editorStore, this, val);
    }
    return undefined;
  }

  addNewTest(id: string): void {
    const test = createFunctionTest(
      id,
      this.editorStore.changeDetectionState.observerContext,
      this.functionTestableState.containsRuntime,
      this.functionTestableState.function,
      this.editorStore,
      this.suite,
    );
    testSuite_addTest(
      this.suite,
      test,
      this.functionTestableState.editorStore.changeDetectionState
        .observerContext,
    );
    const testState = this.buildTestState(test);
    if (testState) {
      this.testStates.push(testState);
    }
    this.selectTestState = testState;
  }
}

export class FunctionTestableState extends TestablePackageableElementEditorState {
  readonly functionEditorState: FunctionEditorState;
  declare selectedTestSuite: FunctionTestSuiteState | undefined;
  declare runningSuite: FunctionTestSuite | undefined;

  createSuiteModal = false;

  constructor(functionEditorState: FunctionEditorState) {
    super(functionEditorState, functionEditorState.functionElement);
    makeObservable(this, {
      isRunningTestableSuitesState: observable,
      isRunningFailingSuitesState: observable,
      selectedTestSuite: observable,
      testableResults: observable,
      runningSuite: observable,
      testableComponentToRename: observable,
      createSuiteModal: observable,
      init: action,
      buildTestSuiteState: action,
      deleteTestSuite: action,
      changeSuite: action,
      handleNewResults: action,
      setRenameComponent: action,
      clearTestResultsForSuite: action,
      setCreateSuite: action,
      runTestable: flow,
      runSuite: flow,
      runAllFailingSuites: flow,
    });
    this.functionEditorState = functionEditorState;
    this.init();
  }

  get function(): ConcreteFunctionDefinition {
    return this.functionEditorState.functionElement;
  }

  get associatedRuntimes(): EngineRuntime[] | undefined {
    return resolveRuntimesFromQuery(this.function, this.editorStore);
  }

  get containsRuntime(): boolean {
    return Boolean(this.associatedRuntimes?.length);
  }

  override init(): void {
    if (!this.selectedTestSuite) {
      const suite = this.function.tests[0];
      this.selectedTestSuite = suite
        ? this.buildTestSuiteState(suite)
        : undefined;
    }
  }

  setCreateSuite(val: boolean): void {
    this.createSuiteModal = val;
  }

  createSuite(suiteName: string, testName: string): void {
    const functionSuite = new FunctionTestSuite();
    functionSuite.id = suiteName;
    const engineRuntimes = this.associatedRuntimes;
    if (!engineRuntimes?.length) {
      const type = this.function.returnType.value.rawType;
      if (
        type.path === CORE_PURE_PATH.RELATION ||
        type.path === CORE_PURE_PATH.TABULAR_DATASET
      ) {
        this.editorStore.applicationStore.notificationService.notifyWarning(
          `Unable to find runtime or function contains accessors incompatible for test suite creation`,
        );
        return;
      }
    } else {
      try {
        assertTrue(
          engineRuntimes.length === 1,
          `Function Test Suite Only supports One Runtime at this time. Found ${engineRuntimes.length}`,
        );
        const engineRuntime = guaranteeNonNullable(engineRuntimes[0]);
        assertTrue(
          !(
            engineRuntime.connectionStores.length &&
            engineRuntime.connections.length
          ),
          `Runtime found has two connection types defined. Please use connection stores only`,
        );
        const stores = [
          ...engineRuntime.connections
            .map((e) =>
              e.storeConnections.map((s) => s.connection.store?.value).flat(),
            )
            .flat(),
          ...engineRuntime.connectionStores
            .map((e) => e.storePointers.map((sPt) => sPt.value))
            .flat(),
        ].filter(isNonNullable);
        assertTrue(Boolean(stores.length), 'No runtime store found');
        assertTrue(
          stores.length === 1,
          'Only one store supported in runtime for function tests',
        );
        const store = guaranteeNonNullable(stores[0]);
        const data = new FunctionTestData();
        if (store instanceof Database) {
          const relation = new RelationElementsData();
          data.element = PackageableElementExplicitReference.create(store);
          data.data = relation;
        } else if (store instanceof ModelStore) {
          const modelStoreData = createBareExternalFormat();
          data.element = PackageableElementExplicitReference.create(store);
          data.data = modelStoreData;
        } else {
          throw new UnsupportedOperationError(
            `function test store data does not support store: ${store.path}`,
          );
        }
        functionSuite.testData = [data];
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.notificationService.notifyError(
          `Unable to create function test suite: ${error.message}`,
        );
        return;
      }
    }
    createFunctionTest(
      testName,
      this.editorStore.changeDetectionState.observerContext,
      this.containsRuntime,
      this.function,
      this.editorStore,
      functionSuite,
    );
    // set test suite
    function_addTestSuite(
      this.function,
      functionSuite,
      this.editorStore.changeDetectionState.observerContext,
    );
    this.changeSuite(functionSuite);
    this.setCreateSuite(false);
  }

  buildTestSuiteState(val: FunctionTestSuite): FunctionTestSuiteState {
    return new FunctionTestSuiteState(this.editorStore, this, val);
  }

  changeSuite(suite: FunctionTestSuite): void {
    if (this.selectedTestSuite?.suite !== suite) {
      this.selectedTestSuite = this.buildTestSuiteState(suite);
    }
  }
}
