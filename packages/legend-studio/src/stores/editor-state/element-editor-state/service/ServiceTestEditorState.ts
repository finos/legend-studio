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

import type {
  EmbeddedData,
  ConnectionVisitor,
  ConnectionPointer,
  FlatDataConnection,
  JsonModelConnection,
  ModelChainConnection,
  RelationalDatabaseConnection,
  XmlModelConnection,
} from '@finos/legend-graph';
import {
  type Connection,
  type IdentifiedConnection,
  type Runtime,
  type TestAssertion,
  type ConnectionTestData,
  type ServiceTest,
  PureSingleExecution,
  PureMultiExecution,
  RuntimePointer,
  EngineRuntime,
  EqualToJson,
} from '@finos/legend-graph';
import { deleteEntry } from '@finos/legend-shared';
import { action, makeObservable, observable } from 'mobx';
import { EmbeddedDataEditorState } from '../data/DataEditorState';
import {
  type TestAssertionState,
  EqualToJsonAssertionState,
  UnsupportedAssertionState,
} from './TestAssertionState';
import type { EditorStore } from '../../../EditorStore';
import type { ServiceTestSuiteState } from './ServiceTestSuitesState';
import { atomicTest_addAssertion } from '../../../graphModifier/TestableGraphModifierHelper';

export const getAllIdentifiedConnectionsFromRuntime = (
  runtime: Runtime,
): IdentifiedConnection[] => {
  const resolvedRuntimes: EngineRuntime[] = [];
  if (runtime instanceof RuntimePointer) {
    const engineRuntime = runtime.packageableRuntime.value.runtimeValue;
    resolvedRuntimes.push(engineRuntime);
  } else if (runtime instanceof EngineRuntime) {
    resolvedRuntimes.push(runtime);
  }
  return resolvedRuntimes
    .flatMap((e) => e.connections.map((l) => l.storeConnections))
    .flat();
};


export abstract class ServiceTestSuiteEditorState {
  editorStore: EditorStore;

  abstract label(): string;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
  }
}
export class ConnectionTestDataState extends ServiceTestSuiteEditorState {
  testSuiteState: ServiceTestSuiteState;
  connectionData: ConnectionTestData;
  embeddedEditorState: EmbeddedDataEditorState;

  constructor(
    testSuite: ServiceTestSuiteState,
    connectionData: ConnectionTestData,
  ) {
    super(testSuite.serviceTestableState.editorStore);
    makeObservable(this, {});
    this.testSuiteState = testSuite;
    this.connectionData = connectionData;
    this.embeddedEditorState = new EmbeddedDataEditorState(
      testSuite.serviceTestableState.editorStore,
      connectionData.testData,
    );
  }
  get identifiedConnection(): IdentifiedConnection | undefined {
    return this.getAllIdentifiedConnections().find(
      (c) => c.id === this.connectionData.connectionId,
    );
  }

  resolveConnection(id: string): Connection | undefined {
    return this.getAllIdentifiedConnections().find((c) => c.id === id)
      ?.connection;
  }

  getAllIdentifiedConnections(): IdentifiedConnection[] {
    const service =
      this.testSuiteState.serviceTestableState.serviceEditorState.service;
    const execution = service.execution;
    let runtimes: Runtime[] = [];
    if (execution instanceof PureSingleExecution) {
      runtimes = [execution.runtime];
    } else if (execution instanceof PureMultiExecution) {
      runtimes = execution.executionParameters.map((t) => t.runtime);
    }
    return runtimes.flatMap(getAllIdentifiedConnectionsFromRuntime);
  }

  label(): string {
    return `${this.connectionData.connectionId}`;
  }
}

export class ServiceAtomicTestState extends ServiceTestSuiteEditorState {
  readonly testSuiteState: ServiceTestSuiteState;

  test: ServiceTest;
  selectedAsertionState: TestAssertionState | undefined;
  assertionStates: TestAssertionState[] = [];

  constructor(testSuite: ServiceTestSuiteState, test: ServiceTest) {
    super(testSuite.serviceTestableState.editorStore);
    makeObservable(this, {
      selectedAsertionState: observable,
      assertionStates: observable,
      setAssertionState: action,
      buildAssertionState: action,
      addAssertion: action,
    });
    this.test = test;
    this.testSuiteState = testSuite;
    this.assertionStates = test.assertions.map((t) =>
      this.buildAssertionState(t),
    );
  }

  addAssertion(): void {
    const eqqualToJson = new EqualToJson();
    atomicTest_addAssertion(this.test, eqqualToJson);
    const assertionState = this.buildAssertionState(eqqualToJson);
    this.assertionStates.push(assertionState);
  }

  deleteAssertion(state: TestAssertionState): void {
    const assertion = state.assertion;
    deleteEntry(this.test.assertions, assertion);
    deleteEntry(this.assertionStates, state);
  }

  setAssertionState(val: TestAssertionState | undefined): void {
    this.selectedAsertionState = val;
  }

  buildAssertionState(assertion: TestAssertion): TestAssertionState {
    if (assertion instanceof EqualToJson) {
      return new EqualToJsonAssertionState(assertion);
    }
    return new UnsupportedAssertionState(assertion);
  }

  label(): string {
    return `${this.test.id}`;
  }
}
