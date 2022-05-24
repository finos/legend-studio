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
  type TestAssertion,
  ServiceTestSuite,
  TestData,
  ConnectionTestData,
  ServiceTest,
  EmbeddedData,
  IdentifiedConnection,
  EqualToJson,
  ExternalFormatData,
} from '@finos/legend-graph';
import {
  assertNonNullable,
  ContentType,
  guaranteeNonNullable,
  guaranteeType,
  isNonNullable,
  returnUndefOnError,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import type { EditorStore } from '../../../EditorStore';
import { service_addTestSuite } from '../../../graphModifier/DSLService_GraphModifierHelper';
import { TEMPORARY_EmbeddedDataConnectionVisitor } from '../../../shared/tests/ConnectionTestDataHelper';
import type { ServiceEditorState } from './ServiceEditorState';
import {
  ConnectionTestDataState,
  getAllIdentifiedConnectionsFromRuntime,
  ServiceAtomicTestState,
} from './ServiceTestEditorState';

export abstract class ServiceTestableTreeNodeData implements TreeNodeData {
  isSelected?: boolean | undefined;
  isOpen?: boolean | undefined;
  id: string;
  label: string;
  childrenIds?: string[] | undefined;
  constructor(id: string, label: string) {
    this.id = id;
    this.label = label;
  }

  addChildren(children: string[]): void {
    this.childrenIds = this.childrenIds
      ? [...this.childrenIds, ...children]
      : children;
  }
}

export class ServiceTestSuiteTreeNodeData extends ServiceTestableTreeNodeData {
  testSuite: ServiceTestSuite;

  constructor(id: string, testSuite: ServiceTestSuite) {
    super(id, testSuite.id);
    this.testSuite = testSuite;
  }
}

export class TestDataTreeNodeData extends ServiceTestableTreeNodeData {
  data: TestData;
  constructor(id: string, testSuite: TestData) {
    super(id, id);
    this.data = testSuite;
  }
}
export class ConnectionTestDataTreeNodeData extends ServiceTestableTreeNodeData {
  connectionId: ConnectionTestData;

  constructor(id: string, testSuite: ConnectionTestData) {
    super(id, id);
    this.connectionId = testSuite;
  }
}

export class ServiceTestTreeNodeData extends ServiceTestableTreeNodeData {
  test: ServiceTest;
  constructor(id: string, atomicTest: ServiceTest) {
    super(id, atomicTest.id);
    this.test = atomicTest;
  }
}

export class ServiceTestAssertionTreeNodeData extends ServiceTestableTreeNodeData {
  assertion: TestAssertion;
  constructor(testAssertion: TestAssertion) {
    super(
      `${testAssertion.parentTest?.id}.${testAssertion.id}`,
      testAssertion.id,
    );
    this.assertion = testAssertion;
  }
}
const getServiceTestTreeNodeData = (
  test: ServiceTest,
): ServiceTestTreeNodeData => new ServiceTestTreeNodeData(test.id, test);

const buildServiceTestSuiteDataNode = (
  treeData: TreeData<ServiceTestableTreeNodeData>,
  rootNode: ServiceTestSuiteTreeNodeData,
): void => {
  const suite = rootNode.testSuite;
  const testDataNode = new TestDataTreeNodeData('data', suite.testData);
  treeData.nodes.set(testDataNode.id, testDataNode);
  rootNode.addChildren([testDataNode.id]);
  // build connection treeData
  const connectionNodes = suite.testData.connectionsTestData.map(
    (e) => new ConnectionTestDataTreeNodeData(e.connectionId, e),
  );
  testDataNode.childrenIds = connectionNodes.map((e) => e.id);
  connectionNodes.forEach((e) => treeData.nodes.set(e.id, e));
};

const buildServiceTestSuiteTestData = (
  treeData: TreeData<ServiceTestableTreeNodeData>,
  rootNode: ServiceTestSuiteTreeNodeData,
): void => {
  const suite = rootNode.testSuite;
  const testNodes = suite.tests
    .map((t) => guaranteeType(t, ServiceTest))
    .map(getServiceTestTreeNodeData);
  rootNode.addChildren([...testNodes.map((t) => t.id)]);
  testNodes.forEach((t) => treeData.nodes.set(t.id, t));
  // assertion nodes
  testNodes.forEach((t) => {
    const assertionNodes = t.test.assertions.map(
      (a) => new ServiceTestAssertionTreeNodeData(a),
    );
    assertionNodes.forEach((x) => treeData.nodes.set(x.id, x));
    t.addChildren([...assertionNodes.map((c) => c.id)]);
  });
};

export class ServiceTestSuiteState {
  serviceTestableState: ServiceTestSuitesState;
  testSuite: ServiceTestSuite;
  treeData: TreeData<ServiceTestableTreeNodeData>;
  constructor(
    suite: ServiceTestSuite,
    serviceTestableState: ServiceTestSuitesState,
  ) {
    makeObservable(this, {
      serviceTestableState: false,
      treeData: observable.ref,
      buildTreeData: action,
      onTreeNodeSelect: action,
      setTreeData: action,
      openAllNodes: action,
    });
    this.testSuite = suite;
    this.serviceTestableState = serviceTestableState;
    this.treeData = this.buildTreeData();
  }

  setTreeData(treeData: TreeData<ServiceTestableTreeNodeData>): void {
    this.treeData = treeData;
  }

  buildTreeData(): TreeData<ServiceTestableTreeNodeData> {
    const rootIds: string[] = [];
    const nodes = new Map<string, ServiceTestableTreeNodeData>();
    const treeData = { rootIds, nodes };
    const suiteTreeNodeData = new ServiceTestSuiteTreeNodeData(
      this.testSuite.id,
      this.testSuite,
    );
    treeData.rootIds.push(suiteTreeNodeData.id);
    treeData.nodes.set(suiteTreeNodeData.id, suiteTreeNodeData);
    // data
    buildServiceTestSuiteDataNode(treeData, suiteTreeNodeData);
    // tests
    buildServiceTestSuiteTestData(treeData, suiteTreeNodeData);
    return treeData;
  }

  openAllNodes(): void {
    const root = this.treeData.rootIds[0];
    if (root && !this.treeData.nodes.get(root)?.isOpen) {
      Array.from(this.treeData.nodes.values()).forEach(
        (n) => (n.isOpen = true),
      );
    }
  }

  onTreeNodeSelect(
    node: ServiceTestableTreeNodeData,
    treeData: TreeData<ServiceTestableTreeNodeData>,
  ): void {
    node.isOpen = !node.isOpen;
    this.setTreeData({ ...treeData });
    this.serviceTestableState.handleNodeSelect(this, node);
  }
}

export class ServiceTestSuitesState {
  editorStore: EditorStore;
  serviceEditorState: ServiceEditorState;
  suitesStates: ServiceTestSuiteState[] = [];
  selectedNode: ServiceTestableTreeNodeData | undefined;
  selectedState: ConnectionTestDataState | ServiceAtomicTestState | undefined;
  constructor(
    editorStore: EditorStore,
    serviceEditorState: ServiceEditorState,
  ) {
    makeObservable(this, {
      editorStore: false,
      serviceEditorState: false,
      handleNodeSelect: action,
      addTestSuite: action,
      selectedState: observable,
      selectedNode: observable,
    });
    this.editorStore = editorStore;
    this.serviceEditorState = serviceEditorState;
    this.suitesStates = serviceEditorState.service.tests.map(
      (e) => new ServiceTestSuiteState(e, this),
    );
  }

  generateServiceSuite(): void {
    try {
      const executionContext =
        this.serviceEditorState.executionState.serviceExecutionParameters;
      assertNonNullable(
        executionContext,
        'Query, Mapping and Runtime is required to generate service suite',
      );
      const suite = new ServiceTestSuite();
      suite.id = 'suite_1';
      const connections = getAllIdentifiedConnectionsFromRuntime(
        executionContext.runtime,
      );
      suite.testData = new TestData();
      suite.testData.connectionsTestData = connections
        .map((e) => {
          const _data = returnUndefOnError(() => {
            e.connection.accept_ConnectionVisitor(
              new TEMPORARY_EmbeddedDataConnectionVisitor(this.editorStore),
            );
          });
          if (_data) {
            const conData = new ConnectionTestData();
            conData.connectionId = e.id;
            conData.testData = _data;
            return conData;
          }
          return undefined;
        })
        .filter(isNonNullable);
      const test = new ServiceTest();
      test.id = `test_1`
      // TODO generate param values
      // we will generate `toJSON` value for now
      const _equalToJson = new EqualToJson();
      _equalToJson.id = 'assertion_1';
      const data = new ExternalFormatData();
      data.contentType = ContentType.APPLICATION_JSON;
      data.data = '{}';
      _equalToJson.expected = data;
      test.assertions = [_equalToJson];
      service_addTestSuite(
        this.serviceEditorState.service,
        suite,
        this.editorStore.changeDetectionState.observerContext
      )
    } catch (error) {}
  }

  handleNodeSelect(
    state: ServiceTestSuiteState,
    node: ServiceTestableTreeNodeData,
  ): void {
    this.selectedNode = node;
    if (node instanceof ConnectionTestDataTreeNodeData) {
      this.selectedState = new ConnectionTestDataState(
        state,
        node.connectionId,
      );
    } else if (node instanceof ServiceTestTreeNodeData) {
      this.selectedState = new ServiceAtomicTestState(state, node.test);
    } else if (node instanceof ServiceTestAssertionTreeNodeData) {
      this.selectedState = new ServiceAtomicTestState(
        state,
        guaranteeType(node.assertion.parentTest, ServiceTest),
      );
      // TODO open relevant assertion test
    }
  }
  addTestSuite(): void {
    throw new UnsupportedOperationError('TODO');
  }

  handleOpen(): void {
    if (this.suitesStates.length === 1) {
      this.suitesStates[0];
    }
  }
}
