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
  type Mapping,
  MappingTestSuite,
  type Class,
  type MappingModelCoverageAnalysisResult,
  type RawLambda,
  MappingTest,
  type AtomicTest,
  type EmbeddedData,
  type Store,
  type DataElement,
  type TestResult,
  LAMBDA_PIPE,
  buildSourceInformationSourceId,
  isStubbed_RawLambda,
  GRAPH_MANAGER_EVENT,
  PackageableElementExplicitReference,
  StoreTestData,
  getRootSetImplementation,
  DataElementReference,
  RelationalCSVData,
  RunTestsTestableInput,
  UniqueTestId,
} from '@finos/legend-graph';
import {
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import {
  ActionState,
  assertErrorThrown,
  type GeneratorFn,
  isNonNullable,
  UnsupportedOperationError,
  LogEvent,
  uuid,
  filterByType,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { LambdaEditorState } from '@finos/legend-query-builder';
import { type MappingEditorState } from '../MappingEditorState.js';
import {
  mappingTestable_addStoreTestData,
  mappingTestable_deleteStoreTestData,
  mappingTestable_setEmbeddedData,
  mappingTestable_setQuery,
  mapping_addTestSuite,
} from '../../../../../graph-modifier/DSL_Mapping_GraphModifierHelper.js';
import {
  EmbeddedDataCreatorFromEmbeddedData,
  createBareExternalFormat,
} from '../../../../utils/TestableUtils.js';
import {
  TESTABLE_TEST_TAB,
  TestablePackageableElementEditorState,
  TestableTestEditorState,
  TestableTestSuiteEditorState,
} from '../../testable/TestableEditorState.js';
import { EmbeddedDataEditorState } from '../../data/DataEditorState.js';
import { testSuite_addTest } from '../../../../../graph-modifier/Testable_GraphModifierHelper.js';
import { EmbeddedDataType } from '../../../ExternalFormatState.js';
import type { EditorStore } from '../../../../EditorStore.js';
import {
  createBareMappingTest,
  createGraphFetchQueryFromMappingAnalysis,
  generateStoreTestDataFromSetImpl,
  isRelationalMappingTestSuite,
} from './MappingTestingHelper.js';
import { LEGEND_STUDIO_APP_EVENT } from '../../../../../../__lib__/LegendStudioEvent.js';

export class StoreTestDataState {
  readonly editorStore: EditorStore;
  readonly testDataState: MappingTestDataState;
  storeTestData: StoreTestData;
  embeddedEditorState: EmbeddedDataEditorState;
  dataElementModal = false;

  constructor(
    editorStore: EditorStore,
    testDataState: MappingTestDataState,
    value: StoreTestData,
  ) {
    makeObservable(this, {
      storeTestData: observable,
      dataElementModal: observable,
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
    mappingTestable_setEmbeddedData(
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

export class MappingTestDataState {
  readonly editorStore: EditorStore;
  readonly mappingTestableState: MappingTestableState;
  selectedDataState: StoreTestDataState | undefined;
  dataHolder: MappingTest;
  showNewModal = false;

  constructor(
    editorStore: EditorStore,
    mappingTestableState: MappingTestableState,
    holder: MappingTest,
  ) {
    makeObservable(this, {
      selectedDataState: observable,
      showNewModal: observable,
      openStoreTestData: action,
      initDefaultStore: action,
      deleteStoreTestData: action,
      setShowModal: action,
      addStoreTestData: action,
    });
    this.editorStore = editorStore;
    this.mappingTestableState = mappingTestableState;
    this.dataHolder = holder;
    this.initDefaultStore();
  }

  initDefaultStore(): void {
    const val = this.dataHolder.storeTestData[0];
    if (val) {
      this.openStoreTestData(val);
    } else {
      this.selectedDataState = undefined;
    }
  }

  setShowModal(val: boolean): void {
    this.showNewModal = val;
  }

  openStoreTestData(val: StoreTestData): void {
    this.selectedDataState = new StoreTestDataState(
      this.editorStore,
      this,
      val,
    );
  }

  deleteStoreTestData(val: StoreTestData): void {
    mappingTestable_deleteStoreTestData(this.dataHolder, val);
    this.initDefaultStore();
  }

  addStoreTestData(
    val: Store,
    type: string,
    dataElement: DataElement | undefined,
  ): void {
    const _storeData = new StoreTestData();
    _storeData.store = PackageableElementExplicitReference.create(val);
    let data: EmbeddedData = createBareExternalFormat(undefined, '{}');
    if (type === EmbeddedDataType.RELATIONAL_CSV) {
      data = new RelationalCSVData();
    } else if (type === EmbeddedDataType.DATA_ELEMENT && dataElement) {
      const refData = new DataElementReference();
      refData.dataElement =
        PackageableElementExplicitReference.create(dataElement);
      data = refData;
    }
    // TODO: run on extensions
    _storeData.data = data;
    mappingTestable_addStoreTestData(this.dataHolder, _storeData);
    this.openStoreTestData(_storeData);
  }
}

export class MappingTestState extends TestableTestEditorState {
  readonly parentState: MappingTestSuiteState;
  readonly mappingTestableState: MappingTestableState;
  readonly uuid = uuid();
  override test: MappingTest;
  dataState: MappingTestDataState;

  constructor(
    editorStore: EditorStore,
    parentSuiteState: MappingTestSuiteState,
    test: MappingTest,
  ) {
    super(
      parentSuiteState.mappingTestableState.mapping,
      test,
      parentSuiteState.mappingTestableState.mappingEditorState.isReadOnly,
      editorStore,
    );
    makeObservable(this, {
      selectedAsertionState: observable,
      selectedTab: observable,
      assertionToRename: observable,
      assertionEditorStates: observable,
      testResultState: observable,
      runningTestAction: observable,
      dataState: observable,
      debugTestResultState: observable,
      addAssertion: action,
      setAssertionToRename: action,
      handleTestResult: action,
      buildTestDebugState: action,
      setDebugState: action,
      setSelectedTab: action,
      runTest: flow,
      debugTest: flow,
    });
    this.parentState = parentSuiteState;
    this.mappingTestableState = parentSuiteState.mappingTestableState;
    this.test = test;
    this.selectedTab = this.defaultTab();
    this.dataState = new MappingTestDataState(
      this.editorStore,
      parentSuiteState.mappingTestableState,
      test,
    );
  }

  defaultTab(): TESTABLE_TEST_TAB {
    return TESTABLE_TEST_TAB.SETUP;
  }
}

export class MappingTestSuiteQueryState extends LambdaEditorState {
  editorStore: EditorStore;
  parent: MappingTestSuite;
  isInitializingLambda = false;
  query: RawLambda;

  constructor(
    editorStore: EditorStore,
    parent: MappingTestSuite,
    query: RawLambda,
  ) {
    super('', LAMBDA_PIPE);

    makeObservable(this, {
      query: observable,
      isInitializingLambda: observable,
      setIsInitializingLambda: action,
      updateLamba: flow,
    });

    this.parent = parent;
    this.editorStore = editorStore;
    this.query = query;
  }

  get lambdaId(): string {
    return buildSourceInformationSourceId([this.uuid]);
  }

  setIsInitializingLambda(val: boolean): void {
    this.isInitializingLambda = val;
  }

  *updateLamba(val: RawLambda): GeneratorFn<void> {
    this.query = val;
    mappingTestable_setQuery(this.parent, val);
    yield flowResult(this.convertLambdaObjectToGrammarString({ pretty: true }));
  }

  *convertLambdaObjectToGrammarString(options?: {
    pretty?: boolean | undefined;
  }): GeneratorFn<void> {
    if (!isStubbed_RawLambda(this.query)) {
      try {
        const lambdas = new Map<string, RawLambda>();
        lambdas.set(this.lambdaId, this.query);
        const isolatedLambdas =
          (yield this.editorStore.graphManagerState.graphManager.lambdasToPureCode(
            lambdas,
            options?.pretty,
          )) as Map<string, string>;
        const grammarText = isolatedLambdas.get(this.lambdaId);
        this.setLambdaString(
          grammarText !== undefined
            ? this.extractLambdaString(grammarText)
            : '',
        );
        this.clearErrors();
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      }
    } else {
      this.clearErrors();
      this.setLambdaString('');
    }
  }

  // NOTE: since we don't allow edition in text mode, we don't need to implement this
  *convertLambdaGrammarStringToObject(): GeneratorFn<void> {
    throw new UnsupportedOperationError();
  }
}

export class MappingTestSuiteState extends TestableTestSuiteEditorState {
  readonly mappingTestableState: MappingTestableState;
  override suite: MappingTestSuite;
  override testStates: MappingTestState[] = [];
  override selectTestState: MappingTestState | undefined;
  showCreateModal = false;
  queryState: MappingTestSuiteQueryState;

  constructor(
    editorStore: EditorStore,
    mappingTestableState: MappingTestableState,
    suite: MappingTestSuite,
  ) {
    super(
      mappingTestableState.mapping,
      suite,
      mappingTestableState.mappingEditorState.isReadOnly,
      editorStore,
    );
    makeObservable(this, {
      queryState: observable,
      showCreateModal: observable,
      selectTestState: observable,
      runningSuiteState: observable,
      setShowModal: action,
      changeTest: action,
      addNewTest: action,
      deleteTest: action,
      buildQueryState: action,
      buildTestState: action,
      createStoreTestData: action,
      runSuite: flow,
      runFailingTests: flow,
      debug: flow,
    });
    this.mappingTestableState = mappingTestableState;
    this.suite = suite;
    this.testStates = this.buildTestStates();
    this.selectTestState = this.testStates[0];
    this.queryState = this.buildQueryState();
  }

  buildTestStates(): MappingTestState[] {
    return this.suite.tests
      .map((t) => this.buildTestState(t))
      .filter(isNonNullable);
  }

  buildTestState(val: AtomicTest): MappingTestState | undefined {
    if (val instanceof MappingTest) {
      return new MappingTestState(this.editorStore, this, val);
    }
    return undefined;
  }

  buildQueryState(): MappingTestSuiteQueryState {
    const queryState = new MappingTestSuiteQueryState(
      this.editorStore,
      this.suite,
      this.suite.func,
    );
    flowResult(queryState.updateLamba(this.suite.func)).catch(
      this.editorStore.applicationStore.alertUnhandledError,
    );
    return queryState;
  }

  createStoreTestData(
    targetClass: Class | undefined,
  ): StoreTestData | undefined {
    const firstData = this.suite.tests.filter(filterByType(MappingTest))[0]
      ?.storeTestData[0];
    if (firstData) {
      const storeTestData = new StoreTestData();
      storeTestData.store = PackageableElementExplicitReference.create(
        firstData.store.value,
      );
      storeTestData.data = firstData.data.accept_EmbeddedDataVisitor(
        new EmbeddedDataCreatorFromEmbeddedData(this.editorStore),
      );
      return storeTestData;
    } else if (targetClass) {
      const rootSetImpl = getRootSetImplementation(
        this.mappingTestableState.mapping,
        targetClass,
      );
      return rootSetImpl
        ? generateStoreTestDataFromSetImpl(rootSetImpl, this.editorStore)
        : undefined;
    }
    return undefined;
  }

  addNewTest(id: string, _class: Class | undefined): void {
    const test = createBareMappingTest(
      id,
      this.createStoreTestData(_class),
      this.editorStore.changeDetectionState.observerContext,
      this.suite,
    );
    testSuite_addTest(
      this.suite,
      test,
      this.mappingTestableState.editorStore.changeDetectionState
        .observerContext,
    );
    const testState = this.buildTestState(test);
    if (testState) {
      this.testStates.push(testState);
    }
    this.selectTestState = testState;
  }

  setShowModal(val: boolean): void {
    this.showCreateModal = val;
  }

  *debug(): GeneratorFn<void> {
    try {
      const testState = guaranteeNonNullable(
        this.selectTestState,
        'Test Required to be selected to run debug',
      );
      flowResult(testState.debugTest()).catch(
        this.editorStore.applicationStore.alertUnhandledError,
      );
    } catch (error) {
      assertErrorThrown(error);
    }
  }
}

export class CreateSuiteState {
  readonly editorStore: EditorStore;
  readonly mappingTestableState: MappingTestableState;
  showModal = false;
  isCreatingSuiteState = ActionState.create();

  constructor(
    editorStore: EditorStore,
    mappingTestableState: MappingTestableState,
  ) {
    this.editorStore = editorStore;
    this.mappingTestableState = mappingTestableState;

    makeObservable(this, {
      showModal: observable,
      createAndAddTestSuite: flow,
      isCreatingSuiteState: observable,
    });
  }

  *createAndAddTestSuite(
    _class: Class,
    suiteName: string,
    testName: string,
  ): GeneratorFn<void> {
    try {
      this.isCreatingSuiteState.inProgress();
      const mappingTestableState = this.mappingTestableState;
      const mappingTestSuite = new MappingTestSuite();
      mappingTestSuite.id = suiteName;
      // mapping anaylsis
      if (!mappingTestableState.mappingModelCoverageAnalysisResult) {
        this.isCreatingSuiteState.setMessage(
          'Analyzing mapping to generate test query...',
        );
        yield flowResult(mappingTestableState.analyzeMappingModelCoverage());
      }
      this.isCreatingSuiteState.setMessage('Creating test query...');
      // add query
      mappingTestSuite.func = createGraphFetchQueryFromMappingAnalysis(
        _class,
        mappingTestableState.editorStore.graphManagerState,
        mappingTestableState.mappingModelCoverageAnalysisResult,
      );
      // add first test
      const rootSetImpl = getRootSetImplementation(
        mappingTestableState.mapping,
        _class,
      );
      const storeTestData = rootSetImpl
        ? generateStoreTestDataFromSetImpl(rootSetImpl, this.editorStore)
        : undefined;

      createBareMappingTest(
        testName,
        storeTestData,
        this.editorStore.changeDetectionState.observerContext,
        mappingTestSuite,
      );
      // set test suite
      mapping_addTestSuite(
        this.mappingTestableState.mapping,
        mappingTestSuite,
        this.editorStore.changeDetectionState.observerContext,
      );
      this.mappingTestableState.changeSuite(mappingTestSuite);
      this.mappingTestableState.closeCreateModal();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(
        `Unable to create to test suite: ${error.message}`,
      );
    } finally {
      this.isCreatingSuiteState.complete();
      this.isCreatingSuiteState.setMessage(undefined);
    }
  }
}

export class MappingTestableState extends TestablePackageableElementEditorState {
  readonly mappingEditorState: MappingEditorState;
  mappingModelCoverageAnalysisState = ActionState.create();
  mappingModelCoverageAnalysisResult:
    | MappingModelCoverageAnalysisResult
    | undefined;

  createSuiteState: CreateSuiteState | undefined;

  declare selectedTestSuite: MappingTestSuiteState | undefined;
  declare runningSuite: MappingTestSuite | undefined;

  constructor(mappingEditorState: MappingEditorState) {
    super(mappingEditorState, mappingEditorState.mapping);
    makeObservable(this, {
      mappingModelCoverageAnalysisResult: observable,
      mappingModelCoverageAnalysisState: observable,
      selectedTestSuite: observable,
      testableComponentToRename: observable,
      renameTestableComponent: observable,
      testableResults: observable,
      createSuiteState: observable,
      suiteCount: computed,
      changeSuite: action,
      closeCreateModal: action,
      openCreateModal: action,
      init: action,
      deleteTestSuite: action,
      analyzeMappingModelCoverage: flow,
      setRenameComponent: action,
      handleNewResults: action,
      runTestable: flow,
      runSuite: flow,
      runAllFailingSuites: flow,
    });
    this.mappingEditorState = mappingEditorState;
    this.init();
  }

  get mapping(): Mapping {
    return this.mappingEditorState.mapping;
  }

  override init(): void {
    if (!this.selectedTestSuite) {
      const suite = this.mapping.tests[0];
      this.selectedTestSuite = suite
        ? this.buildTestSuiteState(suite)
        : undefined;
    }
  }

  openCreateModal(): void {
    this.createSuiteState = new CreateSuiteState(this.editorStore, this);
  }

  closeCreateModal(): void {
    this.createSuiteState = undefined;
  }

  changeSuite(suite: MappingTestSuite): void {
    if (this.selectedTestSuite?.suite !== suite) {
      this.selectedTestSuite = this.buildTestSuiteState(suite);
    }
  }

  buildTestSuiteState(val: MappingTestSuite): MappingTestSuiteState {
    return new MappingTestSuiteState(this.editorStore, this, val);
  }

  *analyzeMappingModelCoverage(): GeneratorFn<void> {
    this.mappingModelCoverageAnalysisResult = undefined;
    this.mappingModelCoverageAnalysisState.inProgress();
    this.mappingModelCoverageAnalysisState.setMessage('Analyzing Mapping...');
    try {
      this.mappingModelCoverageAnalysisResult = (yield flowResult(
        this.editorStore.graphManagerState.graphManager.analyzeMappingModelCoverage(
          this.mapping,
          this.editorStore.graphManagerState.graph,
        ),
      )) as MappingModelCoverageAnalysisResult;
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.MAPPING_TEST_FAILURE),
        error,
      );
    } finally {
      this.mappingModelCoverageAnalysisState.complete();
    }
  }

  override *runSuite(suite: MappingTestSuite): GeneratorFn<void> {
    try {
      this.runningSuite = suite;
      this.clearTestResultsForSuite(suite);
      this.selectedTestSuite?.testStates.forEach((t) => t.resetResult());
      this.selectedTestSuite?.testStates.forEach((t) =>
        t.runningTestAction.inProgress(),
      );
      let testResults: TestResult[];
      if (isRelationalMappingTestSuite(suite)) {
        // TEMPORARY RUN each test separately. This is done to help with performance
        // specifically with running realtional mapping tests as we generate a plan during each test.
        // with this change we would still do this but in parallel reducing the time to run the suite
        const inputs = suite.tests.map((t) => {
          const input = new RunTestsTestableInput(this.mapping);
          input.unitTestIds.push(new UniqueTestId(suite, t));
          return input;
        });
        const _testResults = (yield Promise.all(
          inputs.map((i) =>
            this.editorStore.graphManagerState.graphManager.runTests(
              [i],
              this.editorStore.graphManagerState.graph,
            ),
          ),
        )) as TestResult[][];
        testResults = _testResults.flat();
      } else {
        const input = new RunTestsTestableInput(this.mapping);
        suite.tests.forEach((t) =>
          input.unitTestIds.push(new UniqueTestId(suite, t)),
        );
        testResults =
          (yield this.editorStore.graphManagerState.graphManager.runTests(
            [input],
            this.editorStore.graphManagerState.graph,
          )) as TestResult[];
      }
      this.handleNewResults(testResults);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.isRunningTestableSuitesState.fail();
    } finally {
      this.selectedTestSuite?.testStates.forEach((t) =>
        t.runningTestAction.complete(),
      );
      this.runningSuite = undefined;
    }
  }
}
