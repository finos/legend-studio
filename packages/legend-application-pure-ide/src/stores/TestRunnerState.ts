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
  action,
  computed,
  flow,
  flowResult,
  makeObservable,
  observable,
} from 'mobx';
import type { TreeData, TreeNodeData } from '@finos/legend-art';
import {
  type GeneratorFn,
  ActionState,
  addUniqueEntry,
  assertErrorThrown,
  assertTrue,
  guaranteeNonNullable,
  guaranteeType,
  promisify,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import type {
  TestExecutionResult,
  TestInfo,
} from '../server/models/Execution.js';
import {
  type TestResult,
  deserializeTestRunnerCheckResult,
  PCTAdapter,
  TestFailureResult,
  TestResultStatus,
  TestRunnerCheckResult,
} from '../server/models/Test.js';
import type { PureIDEStore } from './PureIDEStore.js';

const getFullParentId = (
  testInfo: TestInfo,
  testExecutionResult: TestExecutionResult,
): string => `test${testExecutionResult.runnerId}_${testInfo.li_attr.parentId}`;
const getFullTestId = (
  testResult: TestResult,
  testExecutionResult: TestExecutionResult,
): string => `test${testExecutionResult.runnerId}_${testResult.test.join('_')}`;

export interface TestTreeNode extends TreeNodeData {
  data: TestInfo;
  isLoading: boolean;
}

export enum TestSuiteStatus {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  NONE = 'NONE',
}

export enum TestResultType {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  ERROR = 'ERROR',
  RUNNING = 'RUNNING',
}

export const getTestResultById = (
  id: string,
  testResultInfo: TestResultInfo,
): TestResultType =>
  testResultInfo.passedTests.has(id)
    ? TestResultType.PASSED
    : testResultInfo.failedTests.has(id)
      ? TestResultType.FAILED
      : testResultInfo.testsWithError.has(id)
        ? TestResultType.ERROR
        : TestResultType.RUNNING;

export const getTestTreeNodeStatus = (
  node: TestTreeNode,
  testResultInfo: TestResultInfo,
): TestResultType => {
  const id = node.id;
  const isLeafNode = Boolean(node.data.type);
  if (isLeafNode) {
    return getTestResultById(id, testResultInfo);
  }
  // order matters here, also if one test fail/error the whole sub-tree (package) will be marked as failed
  // NOTE: here, we have to check `startsWith(`${id}_`)` to guarantee we grab the right package, if we just use `startsWith(id)`
  // we might mark `meta::test` and `meta::test2` both as failed when `meta::test::someTest` fails
  return testResultInfo.failedTestIds.some((i) => i.startsWith(`${id}_`)) ||
    testResultInfo.testWithErrorIds.some((i) => i.startsWith(`${id}_`))
    ? TestResultType.FAILED
    : testResultInfo.notRunTestIds.some((i) => i.startsWith(`${id}_`))
      ? TestResultType.RUNNING
      : TestResultType.PASSED;
};

export class TestResultInfo {
  private readonly _START_TIME: number;
  total!: number;
  time = 0; // ms
  passedTests = new Set<string>();
  failedTests = new Map<string, TestFailureResult>();
  testsWithError = new Map<string, TestFailureResult>();
  notRunTests: Set<string>;
  results = new Map<string, TestResult>();

  constructor(allTestIds: Set<string>) {
    makeObservable(this, {
      total: observable,
      time: observable,
      passedTests: observable,
      failedTests: observable,
      testsWithError: observable,
      notRunTests: observable,
      results: observable,
      passed: computed,
      error: computed,
      failed: computed,
      passedTestIds: computed,
      failedTestIds: computed,
      testWithErrorIds: computed,
      notRunTestIds: computed,
      numberOfTestsRun: computed,
      runPercentage: computed,
      suiteStatus: computed,
      setTime: action,
      addResult: action,
    });

    this._START_TIME = Date.now();
    this.total = allTestIds.size;
    this.notRunTests = new Set(allTestIds);
  }

  get passed(): number {
    return this.passedTests.size;
  }

  get error(): number {
    return this.testsWithError.size;
  }

  get failed(): number {
    return this.failedTests.size;
  }

  get passedTestIds(): string[] {
    return Array.from(this.passedTests.values());
  }

  get failedTestIds(): string[] {
    return Array.from(this.failedTests.keys());
  }

  get testWithErrorIds(): string[] {
    return Array.from(this.testsWithError.keys());
  }

  get notRunTestIds(): string[] {
    return Array.from(this.notRunTests.values());
  }

  get numberOfTestsRun(): number {
    return this.passed + this.error + this.failed;
  }

  get runPercentage(): number {
    return Math.floor((this.numberOfTestsRun * 100) / this.total);
  }

  get suiteStatus(): TestSuiteStatus {
    return this.failed + this.error
      ? TestSuiteStatus.FAILED
      : this.passed
        ? TestSuiteStatus.PASSED
        : TestSuiteStatus.NONE;
  }

  setTime(val: number): void {
    this.time = val;
  }

  addResult(result: TestResult, testId: string): void {
    this.results.set(testId, result);
    this.notRunTests.delete(testId);
    switch (result.status) {
      case TestResultStatus.PASSED: {
        this.passedTests.add(testId);
        break;
      }
      case TestResultStatus.FAILED: {
        this.failedTests.set(testId, guaranteeType(result, TestFailureResult));
        break;
      }
      case TestResultStatus.ERROR: {
        this.testsWithError.set(
          testId,
          guaranteeType(result, TestFailureResult),
        );
        break;
      }
      default: {
        throw new UnsupportedOperationError(
          `Unsupported test result status '${result.status}'`,
        );
      }
    }
    this.time = Date.now() - this._START_TIME;
  }
}

export class TestRunnerState {
  readonly ideStore: PureIDEStore;
  readonly testExecutionResult: TestExecutionResult;

  readonly checkTestRunnerState = ActionState.create();
  testResultInfo?: TestResultInfo | undefined;
  allTests = new Map<string, TestInfo>();
  selectedTestId?: string | undefined;

  // explorer tree
  readonly treeBuildingState = ActionState.create();
  treeData?: TreeData<TestTreeNode> | undefined;
  viewAsList = false;

  readonly initState = ActionState.create();
  adapters: PCTAdapter[] = [];

  constructor(
    ideStore: PureIDEStore,
    testExecutionResult: TestExecutionResult,
  ) {
    makeObservable(this, {
      testResultInfo: observable.ref,
      allTests: observable,
      selectedTestId: observable,
      treeData: observable.ref,
      viewAsList: observable,
      setViewAsList: action,
      setSelectedTestId: action,
      setTestResultInfo: action,
      setTreeData: action,
      refreshTree: action,
      collapseTree: action,
      expandTree: action,
      buildTreeDataByLayer: action,
      pullTestRunnerResult: action,
      initialize: flow,
      buildTestTreeData: flow,
      pollTestRunnerResult: flow,
      rerunTestSuite: flow,
      cancelTestRun: flow,
    });

    this.ideStore = ideStore;
    this.testExecutionResult = testExecutionResult;
  }

  getTreeData(): TreeData<TestTreeNode> {
    return guaranteeNonNullable(
      this.treeData,
      'Test tree data has not been initialized',
    );
  }

  setViewAsList(val: boolean): void {
    this.viewAsList = val;
  }

  setSelectedTestId(val: string | undefined): void {
    this.selectedTestId = val;
  }

  setTestResultInfo(val: TestResultInfo | undefined): void {
    this.testResultInfo = val;
  }

  setTreeData(data: TreeData<TestTreeNode>): void {
    this.treeData = data;
  }

  refreshTree(): void {
    this.setTreeData({ ...guaranteeNonNullable(this.treeData) });
  }

  *initialize(): GeneratorFn<void> {
    if (this.initState.isInProgress) {
      this.ideStore.applicationStore.notificationService.notifyWarning(
        'Test runner initialization is in progress',
      );
      return;
    }
    this.initState.inProgress();
    try {
      this.adapters = (
        (yield this.ideStore.client.getPCTAdapters()) as {
          first: string;
          second: string;
        }[]
      ).map((adapter) => new PCTAdapter(adapter.first, adapter.second));
      this.initState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.ideStore.applicationStore.notificationService.notifyError(error);
      this.initState.fail();
    }
  }

  *buildTestTreeData(): GeneratorFn<void> {
    if (this.treeBuildingState.isInProgress) {
      return;
    }
    this.treeBuildingState.inProgress();
    const rootIds = this.testExecutionResult.tests.map((test) => {
      const id = test.li_attr.id;
      if (test.type) {
        this.allTests.set(id, test);
      }
      return id;
    });
    const nodes = new Map<string, TestTreeNode>();
    this.treeData = { rootIds, nodes };
    yield this.buildTreeDataByLayer(this.testExecutionResult.tests);
    this.treeBuildingState.reset();
  }

  collapseTree(): void {
    const treeData = this.getTreeData();
    treeData.nodes.forEach((node) => {
      node.isOpen = false;
    });
    this.refreshTree();
  }

  expandTree(): void {
    const treeData = this.getTreeData();
    treeData.nodes.forEach((node) => {
      node.isOpen = true;
    });
    this.refreshTree();
  }

  async buildTreeDataByLayer(tests: TestInfo[]): Promise<void> {
    const treeData = this.getTreeData();
    const childLevelTests: TestInfo[] = [];
    await Promise.all(
      tests.map(
        (test) =>
          new Promise<void>((resolve, reject) =>
            setTimeout(() => {
              const id = test.li_attr.id;
              const node = {
                id: id,
                label: test.text,
                data: test,
                childrenIds: test.type ? undefined : [],
                isLoading: false,
              };
              if (test.type) {
                this.allTests.set(id, test);
              }
              treeData.nodes.set(id, node);
              if (test.li_attr.parentId !== 'Root') {
                try {
                  const parentNode = guaranteeNonNullable(
                    treeData.nodes.get(
                      getFullParentId(test, this.testExecutionResult),
                    ),
                    `Can't find parent test node with ID '${test.li_attr.parentId}'`,
                  );
                  if (parentNode.childrenIds) {
                    addUniqueEntry(parentNode.childrenIds, id);
                  } else {
                    parentNode.childrenIds = [id];
                  }
                } catch (error) {
                  reject(error);
                  return;
                }
              }
              childLevelTests.push(...test.children);
              resolve();
            }, 0),
          ),
      ),
    );
    if (childLevelTests.length) {
      return this.buildTreeDataByLayer(childLevelTests);
    }
    return Promise.resolve();
  }

  *pollTestRunnerResult(): GeneratorFn<void> {
    if (!this.checkTestRunnerState.isInInitialState) {
      return;
    }
    this.checkTestRunnerState.inProgress();
    try {
      assertTrue(
        this.allTests.size === this.testExecutionResult.count,
        `Number of tests scanned in tree (${this.allTests.size}) does not match the number of total reported tests (${this.testExecutionResult.count})`,
      );
      const testResultInfo = new TestResultInfo(new Set(this.allTests.keys()));
      this.testResultInfo = testResultInfo;
      yield this.pullTestRunnerResult(testResultInfo);
    } finally {
      this.checkTestRunnerState.reset();
    }
  }

  async pullTestRunnerResult(testResultInfo: TestResultInfo): Promise<void> {
    const result = deserializeTestRunnerCheckResult(
      await this.ideStore.client.checkTestRunner(
        this.testExecutionResult.runnerId,
      ),
    );
    if (result instanceof TestRunnerCheckResult) {
      await Promise.all(
        result.tests.map((test) =>
          promisify(() =>
            testResultInfo.addResult(
              test,
              getFullTestId(test, this.testExecutionResult),
            ),
          ),
        ),
      );
      if (!result.finished) {
        return new Promise((resolve, reject) =>
          setTimeout(() => {
            try {
              resolve(this.pullTestRunnerResult(testResultInfo));
            } catch (error) {
              assertErrorThrown(error);
              this.ideStore.applicationStore.notificationService.notifyWarning(
                `Failed to run test${
                  error.message ? `: ${error.message}` : ''
                }`,
              );
              reject(error);
            }
            // NOTE: this call might take a while so we need to tune this depending on the performance of the app
          }, 1000),
        );
      }
      return Promise.resolve();
    }
    // test runner check error -> runner has been cancelled
    this.setTestResultInfo(undefined);
    return Promise.resolve();
  }

  *rerunTestSuite(): GeneratorFn<void> {
    if (this.ideStore.testRunState.isInProgress) {
      return;
    }
    yield flowResult(
      this.ideStore.executeTests(
        this.testExecutionResult.path,
        this.testExecutionResult.relevantTestsOnly,
        this.testExecutionResult.pctAdapter,
      ),
    );
  }

  *cancelTestRun(): GeneratorFn<void> {
    if (!this.ideStore.testRunState.isInProgress) {
      return;
    }
    yield this.ideStore.client.cancelTestRunner(
      this.testExecutionResult.runnerId,
    );
    this.ideStore.applicationStore.notificationService.notifyWarning(
      `Stopped running test (id: ${this.testExecutionResult.runnerId}) successfully!`,
    );
  }
}
