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

import type { TreeData, TreeNodeData } from '@finos/legend-art';
import {
  AssertionStatus,
  type Test,
  type Testable,
  type TestResult,
  type TestAssertion,
  RunTestsTestableInput,
  TestSuite,
  AtomicTest,
  UniqueTestId,
  TestError,
  TestExecutionStatus,
  TestExecuted,
  AssertPass,
  AssertFail,
  PackageableElement,
  getNullableIDFromTestable,
  MultiExecutionServiceTestResult,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  assertErrorThrown,
  isNonNullable,
  ActionState,
  uuid,
  assertTrue,
  guaranteeNonNullable,
  UnsupportedOperationError,
  filterByType,
} from '@finos/legend-shared';
import { action, flow, makeObservable, observable } from 'mobx';
import type { EditorSDLCState } from '../../EditorSDLCState.js';
import type { EditorStore } from '../../EditorStore.js';
import type {
  LegendStudioApplicationPlugin,
  TestableMetadataGetter,
} from '../../../LegendStudioApplicationPlugin.js';
import { ServiceEditorState } from '../../editor-state/element-editor-state/service/ServiceEditorState.js';
import { LegendStudioUserDataHelper } from '../../../../__lib__/LegendStudioUserDataHelper.js';

// Testable Metadata
export interface TestableMetadata {
  id: string;
  name: string;
  testable: Testable;
}

export const getTestableMetadata = (
  testable: Testable,
  editorStore: EditorStore,
  extraTestableMetadataGetters: TestableMetadataGetter[],
): TestableMetadata => {
  if (testable instanceof PackageableElement) {
    return {
      testable,
      id:
        getNullableIDFromTestable(
          testable,
          editorStore.graphManagerState.graph,
          editorStore.graphManagerState.pluginManager.getPureGraphManagerPlugins(),
        ) ?? uuid(),
      name: testable.name,
    };
  }
  const extraTestables = extraTestableMetadataGetters
    .map((getter) => getter(testable, editorStore))
    .filter(isNonNullable);
  return (
    extraTestables[0] ?? {
      testable,
      id: uuid(),
      name: '(unknown)',
    }
  );
};

// TreeData
export abstract class TestableExplorerTreeNodeData implements TreeNodeData {
  isSelected?: boolean | undefined;
  isOpen?: boolean | undefined;
  id: string;
  label: string;
  childrenIds?: string[] | undefined;
  constructor(id: string, label: string) {
    this.id = id;
    this.label = label;
  }
}

export class TestableTreeNodeData extends TestableExplorerTreeNodeData {
  testableMetadata: TestableMetadata;
  isRunning = false;

  constructor(testable: TestableMetadata) {
    super(testable.id, testable.id);
    this.testableMetadata = testable;
    makeObservable(this, {
      isRunning: observable,
    });
  }
}

export abstract class TestTreeNodeData extends TestableExplorerTreeNodeData {
  isRunning = false;

  constructor(id: string, label: string) {
    super(id, label);
    makeObservable(this, {
      isRunning: observable,
    });
  }
}

export class AtomicTestTreeNodeData extends TestTreeNodeData {
  atomicTest: AtomicTest;
  constructor(id: string, atomicTest: AtomicTest) {
    super(id, atomicTest.id);
    this.atomicTest = atomicTest;
  }
}

export class TestSuiteTreeNodeData extends TestTreeNodeData {
  testSuite: TestSuite;

  constructor(id: string, testSuite: TestSuite) {
    super(id, testSuite.id);
    this.testSuite = testSuite;
  }
}

export class AssertionTestTreeNodeData extends TestableExplorerTreeNodeData {
  assertion: TestAssertion;

  constructor(id: string, assertion: TestAssertion) {
    super(id, assertion.id);
    this.assertion = assertion;
  }
}

const buildTestNodeData = (
  test: Test,
  parentId: string,
): TestTreeNodeData | undefined => {
  if (test instanceof AtomicTest) {
    return new AtomicTestTreeNodeData(`${parentId}.${test.id}`, test);
  } else if (test instanceof TestSuite) {
    return new TestSuiteTreeNodeData(`${parentId}.${test.id}`, test);
  }
  return undefined;
};
const buildChildrenIfPossible = (
  node: TestableExplorerTreeNodeData,
  treeData: TreeData<TestableExplorerTreeNodeData>,
): void => {
  if (!node.childrenIds) {
    let children: TestableExplorerTreeNodeData[] = [];
    if (node instanceof TestableTreeNodeData) {
      children = node.testableMetadata.testable.tests
        .map((t) => buildTestNodeData(t, node.id))
        .filter(isNonNullable);
    } else if (node instanceof TestSuiteTreeNodeData) {
      children = node.testSuite.tests
        .map((t) => buildTestNodeData(t, node.id))
        .filter(isNonNullable);
    } else if (node instanceof AtomicTestTreeNodeData) {
      children = node.atomicTest.assertions.map((assertion) => {
        const assertionNode = new AssertionTestTreeNodeData(
          `${node.id}.${assertion.id}`,
          assertion,
        );
        return assertionNode;
      });
    }
    node.childrenIds = children.map((c) => c.id);
    children.forEach((c) => treeData.nodes.set(c.id, c));
  }
};

const onTreeNodeSelect = (
  node: TestableExplorerTreeNodeData,
  treeData: TreeData<TestableExplorerTreeNodeData>,
): void => {
  buildChildrenIfPossible(node, treeData);
  node.isOpen = !node.isOpen;
};

// Result Helpers
export const getAtomicTest_TestResult = (
  atomicTest: AtomicTest,
  results: Map<AtomicTest, TestResult>,
): TestResult | undefined => results.get(atomicTest);

const getAssertion_TestResult = (
  assertion: TestAssertion,
  results: Map<AtomicTest, TestResult>,
): TestResult | undefined => {
  const test = assertion.parentTest;
  return test ? getAtomicTest_TestResult(test, results) : undefined;
};

export const getAssertionStatus = (
  assertion: TestAssertion,
  results: Map<AtomicTest, TestResult>,
): AssertionStatus | Map<string, AssertionStatus> | undefined => {
  const result = getAssertion_TestResult(assertion, results);
  if (
    result instanceof TestExecuted &&
    result.testExecutionStatus === TestExecutionStatus.FAIL
  ) {
    return result.assertStatuses.find((s) => s.assertion === assertion);
  } else if (result instanceof MultiExecutionServiceTestResult) {
    const testAssertionStatus = new Map<string, AssertionStatus>();
    Array.from(result.keyIndexedTestResults.entries()).forEach(
      ([key, testResult]) => {
        if (testResult instanceof TestExecuted) {
          const testAssertion = testResult.assertStatuses.find(
            (s) => s.assertion === assertion,
          );
          if (testAssertion) {
            testAssertionStatus.set(key, testAssertion);
          }
        }
      },
    );
    return testAssertionStatus;
  }
  return undefined;
};

const getTestSuite_TestResults = (
  suite: TestSuite,
  results: Map<AtomicTest, TestResult>,
): (TestResult | undefined)[] =>
  suite.tests.map((t) => getAtomicTest_TestResult(t, results));

const getTest_TestResults = (
  test: Test,
  results: Map<AtomicTest, TestResult>,
): (TestResult | undefined)[] => {
  if (test instanceof AtomicTest) {
    return [getAtomicTest_TestResult(test, results)];
  } else if (test instanceof TestSuite) {
    return getTestSuite_TestResults(test, results);
  }
  return [undefined];
};

const getTestable_TestResult = (
  test: Testable,
  results: Map<AtomicTest, TestResult>,
): (TestResult | undefined)[] =>
  test.tests.flatMap((t) => getTest_TestResults(t, results));
export enum TESTABLE_RESULT {
  DID_NOT_RUN = 'DID_NOT_RUN',
  ERROR = 'ERROR',
  FAILED = 'FAILED',
  PASSED = 'PASSED',
  IN_PROGRESS = 'IN_PROGRESS',
  NO_TESTS = 'NO_TESTS',
}

export const getTestableResultFromTestResult = (
  testResult: TestResult | undefined,
): TESTABLE_RESULT => {
  if (
    testResult instanceof TestExecuted &&
    testResult.testExecutionStatus === TestExecutionStatus.PASS
  ) {
    return TESTABLE_RESULT.PASSED;
  } else if (
    testResult instanceof TestExecuted &&
    testResult.testExecutionStatus === TestExecutionStatus.FAIL
  ) {
    return TESTABLE_RESULT.FAILED;
  } else if (testResult instanceof TestError) {
    return TESTABLE_RESULT.ERROR;
  } else if (testResult instanceof MultiExecutionServiceTestResult) {
    const result = Array.from(testResult.keyIndexedTestResults.values());
    if (
      result.every(
        (t) =>
          t instanceof TestExecuted &&
          t.testExecutionStatus === TestExecutionStatus.PASS,
      )
    ) {
      return TESTABLE_RESULT.PASSED;
    } else if (result.some((t) => t instanceof TestError)) {
      return TESTABLE_RESULT.ERROR;
    }
    return TESTABLE_RESULT.FAILED;
  }
  return TESTABLE_RESULT.DID_NOT_RUN;
};

export const getTestableResultFromAssertionStatus = (
  assertionStatus: AssertionStatus | Map<string, AssertionStatus> | undefined,
): TESTABLE_RESULT => {
  if (assertionStatus instanceof AssertPass) {
    return TESTABLE_RESULT.PASSED;
  } else if (assertionStatus instanceof AssertFail) {
    return TESTABLE_RESULT.FAILED;
  } else if (assertionStatus && !(assertionStatus instanceof AssertionStatus)) {
    const assertionStatuses = Array.from(assertionStatus.values());
    if (assertionStatuses.every((t) => t instanceof AssertPass)) {
      return TESTABLE_RESULT.PASSED;
    } else {
      return TESTABLE_RESULT.FAILED;
    }
  }
  return TESTABLE_RESULT.DID_NOT_RUN;
};
export const getTestableResultFromTestResults = (
  testResults: (TestResult | undefined)[] | undefined,
): TESTABLE_RESULT => {
  if (!testResults?.length) {
    return TESTABLE_RESULT.DID_NOT_RUN;
  }
  if (
    testResults.every(
      (t) =>
        t instanceof TestExecuted &&
        t.testExecutionStatus === TestExecutionStatus.PASS,
    )
  ) {
    return TESTABLE_RESULT.PASSED;
  } else if (testResults.find((t) => t instanceof TestError)) {
    return TESTABLE_RESULT.ERROR;
  } else if (
    testResults.find(
      (t) =>
        t instanceof TestExecuted &&
        t.testExecutionStatus === TestExecutionStatus.FAIL,
    )
  ) {
    return TESTABLE_RESULT.FAILED;
  } else if (
    testResults.find((t) => t instanceof MultiExecutionServiceTestResult)
  ) {
    let result: TestResult[] = [];
    testResults.forEach((testResult) => {
      if (testResult instanceof MultiExecutionServiceTestResult) {
        result = result.concat(
          Array.from(testResult.keyIndexedTestResults.values()),
        );
      }
    });
    if (
      result.every(
        (t) =>
          t instanceof TestExecuted &&
          t.testExecutionStatus === TestExecutionStatus.PASS,
      )
    ) {
      return TESTABLE_RESULT.PASSED;
    } else if (result.some((t) => t instanceof TestError)) {
      return TESTABLE_RESULT.ERROR;
    }
    return TESTABLE_RESULT.FAILED;
  }
  return TESTABLE_RESULT.DID_NOT_RUN;
};

export const getNodeTestableResult = (
  node: TestableExplorerTreeNodeData,
  globalRun: boolean,
  results: Map<AtomicTest, TestResult>,
): TESTABLE_RESULT => {
  if (globalRun && node instanceof TestableTreeNodeData) {
    return TESTABLE_RESULT.IN_PROGRESS;
  }
  if (
    (node instanceof TestTreeNodeData ||
      node instanceof TestableTreeNodeData) &&
    node.isRunning
  ) {
    return TESTABLE_RESULT.IN_PROGRESS;
  }
  if (node instanceof AssertionTestTreeNodeData) {
    const status = getAssertionStatus(node.assertion, results);
    if (status) {
      return getTestableResultFromAssertionStatus(status);
    }
    const result = node.assertion.parentTest
      ? results.get(node.assertion.parentTest)
      : undefined;
    return getTestableResultFromTestResult(result);
  } else if (node instanceof AtomicTestTreeNodeData) {
    return getTestableResultFromTestResult(
      getAtomicTest_TestResult(node.atomicTest, results),
    );
  } else if (node instanceof TestSuiteTreeNodeData) {
    return getTestableResultFromTestResults(
      getTestSuite_TestResults(node.testSuite, results),
    );
  } else if (node instanceof TestableTreeNodeData) {
    return getTestableResultFromTestResults(
      getTestable_TestResult(node.testableMetadata.testable, results),
    );
  }
  return TESTABLE_RESULT.DID_NOT_RUN;
};

export class TestableState {
  readonly uuid = uuid();
  globalTestRunnerState: GlobalTestRunnerState;
  editorStore: EditorStore;
  testableMetadata: TestableMetadata;
  treeData: TreeData<TestableExplorerTreeNodeData>;
  results: Map<AtomicTest, TestResult> = new Map();
  isRunningTests = ActionState.create();

  constructor(
    editorStore: EditorStore,
    globalTestRunnerState: GlobalTestRunnerState,
    testable: Testable,
  ) {
    makeObservable(this, {
      editorStore: false,
      testableMetadata: observable,
      isRunningTests: observable,
      results: observable,
      treeData: observable.ref,
      handleTestableResult: action,
      setTreeData: action,
      onTreeNodeSelect: action,
      run: flow,
    });
    this.editorStore = editorStore;
    this.globalTestRunnerState = globalTestRunnerState;
    this.testableMetadata = getTestableMetadata(
      testable,
      editorStore,
      this.globalTestRunnerState.extraTestableMetadataGetters,
    );
    this.treeData = this.buildTreeData(this.testableMetadata);
  }

  *run(node: TestableExplorerTreeNodeData): GeneratorFn<void> {
    this.isRunningTests.inProgress();
    let input: RunTestsTestableInput;
    let currentNode = node;
    try {
      if (node instanceof AssertionTestTreeNodeData) {
        const atomicTest = guaranteeNonNullable(node.assertion.parentTest);
        const suite =
          atomicTest.__parent instanceof TestSuite
            ? atomicTest.__parent
            : undefined;
        input = new RunTestsTestableInput(this.testableMetadata.testable);
        input.unitTestIds = [new UniqueTestId(suite, atomicTest)];
        const parentNode = Array.from(this.treeData.nodes.values())
          .filter(filterByType(AtomicTestTreeNodeData))
          .find((n) => n.atomicTest === atomicTest);
        if (parentNode) {
          currentNode = parentNode;
          parentNode.isRunning = true;
        }
      } else if (node instanceof AtomicTestTreeNodeData) {
        const atomicTest = node.atomicTest;
        const suite =
          atomicTest.__parent instanceof TestSuite
            ? atomicTest.__parent
            : undefined;
        input = new RunTestsTestableInput(this.testableMetadata.testable);
        input.unitTestIds = [new UniqueTestId(suite, atomicTest)];
        node.isRunning = true;
      } else if (node instanceof TestSuiteTreeNodeData) {
        input = new RunTestsTestableInput(this.testableMetadata.testable);
        input.unitTestIds = node.testSuite.tests.map(
          (s) => new UniqueTestId(node.testSuite, s),
        );
        node.isRunning = true;
      } else if (node instanceof TestableTreeNodeData) {
        input = new RunTestsTestableInput(this.testableMetadata.testable);
        node.isRunning = true;
      } else {
        throw new UnsupportedOperationError(
          `Unable to run tests for node ${node}`,
        );
      }
      const testResults =
        (yield this.editorStore.graphManagerState.graphManager.runTests(
          [input],
          this.editorStore.graphManagerState.graph,
        )) as TestResult[];
      this.globalTestRunnerState.handleResults(testResults);
      this.isRunningTests.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.isRunningTests.fail();
    } finally {
      if (
        currentNode instanceof TestTreeNodeData ||
        currentNode instanceof TestableTreeNodeData
      ) {
        currentNode.isRunning = false;
      }
    }
  }

  handleTestableResult(testResult: TestResult, openAssertions?: boolean): void {
    try {
      assertTrue(testResult.testable === this.testableMetadata.testable);
      this.results.set(testResult.atomicTest, testResult);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(
        `Unable to update test result: ${error.message}`,
      );
    }
  }

  buildTreeData(
    testable: TestableMetadata,
  ): TreeData<TestableExplorerTreeNodeData> {
    const rootIds: string[] = [];
    const nodes = new Map<string, TestableExplorerTreeNodeData>();
    const treeData = { rootIds, nodes };
    const testableTreeNodeData = new TestableTreeNodeData(testable);
    treeData.rootIds.push(testableTreeNodeData.id);
    treeData.nodes.set(testableTreeNodeData.id, testableTreeNodeData);
    return treeData;
  }

  setTreeData(data: TreeData<TestableExplorerTreeNodeData>): void {
    this.treeData = data;
  }

  onTreeNodeSelect(
    node: TestableExplorerTreeNodeData,
    treeData: TreeData<TestableExplorerTreeNodeData>,
  ): void {
    onTreeNodeSelect(node, treeData);
    this.setTreeData({ ...treeData });
  }
}

export class GlobalTestRunnerState {
  readonly editorStore: EditorStore;
  readonly sdlcState: EditorSDLCState;
  readonly extraTestableMetadataGetters: TestableMetadataGetter[] = [];

  // current project
  isRunningTests = ActionState.create();
  testableStates: TestableState[] | undefined;

  // dependencies
  showDependencyPanel = false;
  isRunningDependencyTests = ActionState.create();
  dependencyTestableStates: TestableState[] | undefined;

  // error
  failureViewing: AssertFail | TestError | undefined;

  constructor(editorStore: EditorStore, sdlcState: EditorSDLCState) {
    makeObservable(this, {
      editorStore: false,
      sdlcState: false,
      testableStates: observable,
      dependencyTestableStates: observable,
      isRunningTests: observable,
      isRunningDependencyTests: observable,
      initOwnTestables: action,
      runAllTests: flow,
      runDependenciesTests: flow,
      failureViewing: observable,
      showDependencyPanel: observable,
      setFailureViewing: action,
      setShowDependencyPanel: action,
      initDependency: action,
      visitTestable: action,
    });
    this.editorStore = editorStore;
    this.sdlcState = sdlcState;
    this.extraTestableMetadataGetters = editorStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin: LegendStudioApplicationPlugin) =>
          plugin.getExtraTestableMetadata?.() ?? [],
      )
      .filter(isNonNullable);
    const showDependencyPanelVal =
      LegendStudioUserDataHelper.globalTestRunner_getShowDependencyPanel(
        this.editorStore.applicationStore.userDataService,
      );
    if (showDependencyPanelVal !== undefined) {
      this.showDependencyPanel = showDependencyPanelVal;
    }
  }

  get ownTestableStates(): TestableState[] {
    return this.testableStates ?? [];
  }

  get allDependencyTestablesStates(): TestableState[] {
    return this.dependencyTestableStates ?? [];
  }

  get allTestableStates(): TestableState[] {
    return [...this.ownTestableStates, ...this.allDependencyTestablesStates];
  }

  get isDispatchingOwnProjectAction(): boolean {
    return (
      this.isRunningTests.isInProgress ||
      this.ownTestableStates.some((s) => s.isRunningTests.isInProgress)
    );
  }

  get isDispatchingDependencyAction(): boolean {
    return (
      this.isRunningDependencyTests.isInProgress ||
      this.allDependencyTestablesStates.some(
        (s) => s.isRunningTests.isInProgress,
      )
    );
  }

  initOwnTestables(force?: boolean): void {
    if (!this.testableStates || force) {
      const testables = this.editorStore.graphManagerState.graph.ownTestables;
      this.testableStates = testables.map(
        (testable) => new TestableState(this.editorStore, this, testable),
      );
    }
  }

  visitTestable(testable: Testable): void {
    if (testable instanceof PackageableElement) {
      this.editorStore.graphEditorMode.openElement(testable);
      const currentTab = this.editorStore.tabManagerState.currentTab;
      // TODO: should be abstracted onto a `TestableEditorState`
      if (currentTab instanceof ServiceEditorState) {
        currentTab.openToTestTab();
      }
    }
  }

  setFailureViewing(val: AssertFail | TestError | undefined): void {
    this.failureViewing = val;
  }

  *runAllTests(): GeneratorFn<void> {
    try {
      this.isRunningTests.inProgress();
      const inputs = this.ownTestableStates.map(
        (e) => new RunTestsTestableInput(e.testableMetadata.testable),
      );
      const testResults =
        (yield this.editorStore.graphManagerState.graphManager.runTests(
          inputs,
          this.editorStore.graphManagerState.graph,
        )) as TestResult[];
      this.handleResults(testResults);
      this.isRunningTests.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.isRunningTests.fail();
    }
  }

  handleResults(testResults: TestResult[]): void {
    testResults.forEach((testResult) => {
      const testableState = this.allTestableStates.find(
        (tState) => tState.testableMetadata.testable === testResult.testable,
      );
      if (testableState) {
        testableState.handleTestableResult(testResult, true);
      }
    });
  }

  // dependency
  setShowDependencyPanel(val: boolean): void {
    this.showDependencyPanel = val;
    if (this.showDependencyPanel) {
      this.initDependency();
    }
    LegendStudioUserDataHelper.globalTestRunner_setShowDependencyPanel(
      this.editorStore.applicationStore.userDataService,
      val,
    );
  }

  initDependency(): void {
    if (!this.dependencyTestableStates) {
      this.dependencyTestableStates =
        this.editorStore.graphManagerState.graph.dependencyManager.testables.map(
          (testable) => new TestableState(this.editorStore, this, testable),
        );
    }
  }

  *runDependenciesTests(): GeneratorFn<void> {
    try {
      this.isRunningDependencyTests.inProgress();
      const inputs = this.allDependencyTestablesStates.map(
        (e) => new RunTestsTestableInput(e.testableMetadata.testable),
      );
      const testResults =
        (yield this.editorStore.graphManagerState.graphManager.runTests(
          inputs,
          this.editorStore.graphManagerState.graph,
        )) as TestResult[];
      this.handleResults(testResults);
      this.isRunningDependencyTests.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(error);
      this.isRunningDependencyTests.fail();
    }
  }
}
