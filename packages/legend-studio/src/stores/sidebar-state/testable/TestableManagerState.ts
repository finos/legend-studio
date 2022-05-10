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
  type AssertionStatus,
  type Test,
  type Testable,
  type TestResult,
  type TestAssertion,
  RunTestsTestableInput,
  TestSuite,
  AtomicTest,
  AtomicTestId,
  TestError,
  TestFailed,
  TestPassed,
  AssertPass,
  AssertFail,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  assertErrorThrown,
  isNonNullable,
  ActionState,
  uuid,
  assertTrue,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { action, flow, makeObservable, observable } from 'mobx';
import {
  type TestableMetadata,
  getTestableMetadata,
} from '../../../components/TestableStudio';
import type { EditorSDLCState } from '../../EditorSDLCState';
import type { EditorStore } from '../../EditorStore';
import type {
  LegendStudioPlugin,
  TestableMetadataGetter,
} from '../../LegendStudioPlugin';

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

  constructor(testable: TestableMetadata) {
    super(testable.id, testable.id);
    this.testableMetadata = testable;
  }
}

export abstract class TestTreeNodeData extends TestableExplorerTreeNodeData {}

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
): AssertionStatus | undefined => {
  const result = getAssertion_TestResult(assertion, results);
  if (result instanceof TestFailed) {
    return result.assertStatuses.find((s) => s.assertion === assertion);
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
  NONE = 'NONE',
  ERROR = 'ERROR',
  FAILED = 'FAILED',
  PASSED = 'PASSED',
}

const getTestableResultFromTestResult = (
  testResult: TestResult | undefined,
): TESTABLE_RESULT => {
  if (testResult instanceof TestPassed) {
    return TESTABLE_RESULT.PASSED;
  } else if (testResult instanceof TestFailed) {
    return TESTABLE_RESULT.FAILED;
  } else if (testResult instanceof TestError) {
    return TESTABLE_RESULT.ERROR;
  }
  return TESTABLE_RESULT.NONE;
};

const getTestableResultFromAssertionStatus = (
  assertionStatus: AssertionStatus | undefined,
): TESTABLE_RESULT => {
  if (assertionStatus instanceof AssertPass) {
    return TESTABLE_RESULT.PASSED;
  } else if (assertionStatus instanceof AssertFail) {
    return TESTABLE_RESULT.FAILED;
  }
  return TESTABLE_RESULT.NONE;
};
const getTestableResultFromTestResults = (
  testResults: (TestResult | undefined)[],
): TESTABLE_RESULT => {
  if (testResults.every((t) => t instanceof TestPassed)) {
    return TESTABLE_RESULT.PASSED;
  } else if (testResults.find((t) => t instanceof TestError)) {
    return TESTABLE_RESULT.ERROR;
  } else if (testResults.find((t) => t instanceof TestFailed)) {
    return TESTABLE_RESULT.FAILED;
  }
  return TESTABLE_RESULT.NONE;
};

export const getNodeTestableResult = (
  node: TestableExplorerTreeNodeData,
  results: Map<AtomicTest, TestResult>,
): TESTABLE_RESULT => {
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
  return TESTABLE_RESULT.NONE;
};

export class TestableState {
  readonly uuid = uuid();
  managerState: TestableManagerState;
  editorStore: EditorStore;
  testableMetadata: TestableMetadata;
  treeData: TreeData<TestableExplorerTreeNodeData>;
  results: Map<AtomicTest, TestResult> = new Map();
  isRunningTests = ActionState.create();

  constructor(
    editorStore: EditorStore,
    managerState: TestableManagerState,
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
    this.managerState = managerState;
    this.testableMetadata = guaranteeNonNullable(
      getTestableMetadata(
        testable,
        editorStore,
        this.managerState.extraTestableMetadataGetters,
      ),
    );
    this.treeData = this.buildTreeData(this.testableMetadata);
  }

  *run(node: TestableExplorerTreeNodeData): GeneratorFn<void> {
    try {
      this.isRunningTests.inProgress();
      let input: RunTestsTestableInput;
      if (node instanceof AssertionTestTreeNodeData) {
        const atomicTest = guaranteeNonNullable(node.assertion.parentTest);
        const suite = atomicTest.parentSuite;
        input = new RunTestsTestableInput(this.testableMetadata.testable);
        input.unitTestIds = [new AtomicTestId(suite, atomicTest)];
      } else if (node instanceof AtomicTestTreeNodeData) {
        const atomicTest = node.atomicTest;
        const suite = atomicTest.parentSuite;
        input = new RunTestsTestableInput(this.testableMetadata.testable);
        input.unitTestIds = [new AtomicTestId(suite, atomicTest)];
      } else if (node instanceof TestSuiteTreeNodeData) {
        input = new RunTestsTestableInput(this.testableMetadata.testable);
        input.unitTestIds = node.testSuite.tests.map(
          (s) => new AtomicTestId(node.testSuite, s),
        );
      } else {
        input = new RunTestsTestableInput(this.testableMetadata.testable);
      }
      const testResults =
        (yield this.editorStore.graphManagerState.graphManager.runTests(
          this.editorStore.graphManagerState.graph,
          [input],
        )) as TestResult[];
      this.managerState.handleResults(testResults);
      this.isRunningTests.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notifyError(error);
      this.isRunningTests.fail();
    }
  }

  handleTestableResult(testResult: TestResult, openAssertions?: boolean): void {
    try {
      assertTrue(testResult.testable === this.testableMetadata.testable);
      this.results.set(testResult.atomicTestId.atomicTest, testResult);
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notifyError(
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

export class TestableManagerState {
  editorStore: EditorStore;
  sdlcState: EditorSDLCState;
  _testableStates: TestableState[] | undefined;
  isRunningTests = ActionState.create();
  extraTestableMetadataGetters: TestableMetadataGetter[] = [];
  failureViewing: AssertFail | TestError | undefined;

  constructor(editorStore: EditorStore, sdlcState: EditorSDLCState) {
    makeObservable(this, {
      editorStore: false,
      sdlcState: false,
      _testableStates: observable,
      init: action,
      runAllTests: flow,
      failureViewing: observable,
      setFailureViewing: action,
    });
    this.editorStore = editorStore;
    this.sdlcState = sdlcState;
    this.extraTestableMetadataGetters = editorStore.pluginManager
      .getStudioPlugins()
      .flatMap(
        (plugin: LegendStudioPlugin) =>
          plugin.getExtraTestableMetadata?.() ?? [],
      )
      .filter(isNonNullable);
  }

  init(force?: boolean): void {
    if (!this._testableStates || force) {
      const testables =
        this.editorStore.graphManagerState.graph.allOwnTestables;
      this._testableStates = testables.map(
        (testable) => new TestableState(this.editorStore, this, testable),
      );
    }
  }

  get testables(): TestableState[] {
    return this._testableStates ?? [];
  }

  get isDispatchingAction(): boolean {
    return (
      this.isRunningTests.isInProgress ||
      this.testables.some((s) => s.isRunningTests.isInProgress)
    );
  }

  setFailureViewing(val: AssertFail | TestError | undefined): void {
    this.failureViewing = val;
  }
  *runAllTests(testableState: TestableState | undefined): GeneratorFn<void> {
    try {
      this.isRunningTests.inProgress();
      let inputs: RunTestsTestableInput[] = [];
      if (!testableState) {
        inputs = (this._testableStates ?? []).map(
          (e) => new RunTestsTestableInput(e.testableMetadata.testable),
        );
      } else {
        inputs = [
          new RunTestsTestableInput(testableState.testableMetadata.testable),
        ];
      }
      const testResults =
        (yield this.editorStore.graphManagerState.graphManager.runTests(
          this.editorStore.graphManagerState.graph,
          inputs,
        )) as TestResult[];

      this.handleResults(testResults);
      this.isRunningTests.complete();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notifyError(error);
      this.isRunningTests.fail();
    }
  }
  handleResults(testResults: TestResult[]): void {
    testResults.forEach((testResult) => {
      const testableState = this.testables.find(
        (tState) => tState.testableMetadata.testable === testResult.testable,
      );
      if (testableState) {
        testableState.handleTestableResult(testResult, true);
      }
    });
  }
}
