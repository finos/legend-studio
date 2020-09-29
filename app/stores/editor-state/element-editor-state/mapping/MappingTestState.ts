/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { MappingEditorState } from './MappingEditorState';
import { hashObject } from 'Utilities/HashUtil';
import { EditorStore } from 'Stores/EditorStore';
import { LOG_EVENT, Log } from 'Utilities/Logger';
import { observable, flow, action } from 'mobx';
import { ExecutionResultWithValues, ExecutionResult } from 'EXEC/execution/ExecutionResult';
import { buildGraphFetchTreeData, GraphFetchTreeData, getGraphFetchTreeData } from 'Utilities/GraphFetchTreeUtil';
import { AUX_PANEL_MODE, TAB_SIZE } from 'Stores/EditorConfig';
import { CLIENT_VERSION } from 'MetaModelConst';
import { UnsupportedOperationError, guaranteeNonNullable, uuid, assertTrue } from 'Utilities/GeneralUtil';
import { tryToFormatJSONString, tryToMinifyJSONString, fromGrammarString, toGrammarString } from 'Utilities/FormatterUtil';
import { executionClient } from 'API/ExecutionClient';
import { createMockDataForMappingElementSource } from 'Utilities/MockDataUtil';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { MappingTest } from 'MM/model/packageableElements/mapping/MappingTest';
import { Lambda } from 'MM/model/valueSpecification/raw/Lambda';
import { ExpectedOutputMappingTestAssert } from 'MM/model/packageableElements/mapping/ExpectedOutputMappingTestAssert';
import { ObjectInputData, OBJECT_INPUT_TYPE } from 'MM/model/packageableElements/store/modelToModel/mapping/ObjectInputData';
import { Runtime, IdentifiedConnection, EngineRuntime } from 'MM/model/packageableElements/runtime/Runtime';
import { InputData } from 'MM/model/packageableElements/mapping/InputData';
import { MappingTestAssert } from 'MM/model/packageableElements/mapping/MappingTestAssert';
import { JsonModelConnection } from 'MM/model/packageableElements/store/modelToModel/connection/JsonModelConnection';
import { MappingElementSource, Mapping } from 'MM/model/packageableElements/mapping/Mapping';
import { PackageableElementExplicitReference } from 'MM/model/packageableElements/PackageableElementReference';
import { createValidationError } from 'MM/validator/ValidationResult';

export enum TEST_RESULT {
  NONE = 'NONE', // test has not run yet
  ERROR = 'ERROR', // test has error
  FAILED = 'FAILED', // test assertion failed
  PASSED = 'PASSED',
}

abstract class MappingTestQueryState {
  uuid = uuid();
  editorStore: EditorStore;
  abstract get query(): Lambda;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
  }
}

export class MappingTestGraphFetchTreeQueryState extends MappingTestQueryState {
  @observable target?: Class;
  @observable graphFetchTree?: GraphFetchTreeData;

  @action setTarget = (target: Class | undefined): void => { this.target = target }
  @action setGraphFetchTree = (graphFetchTree?: GraphFetchTreeData): void => { this.graphFetchTree = graphFetchTree }

  get query(): Lambda {
    const rootGraphFetchTree = this.graphFetchTree?.root.graphFetchTreeNode;
    if (!rootGraphFetchTree) {
      return Lambda.createStub();
    }
    return rootGraphFetchTree.isEmpty
      ? this.editorStore.graphState.graphManager.HACKY_createGetAllLambda(guaranteeNonNullable(this.target))
      : this.editorStore.graphState.graphManager.HACKY_createGraphFetchLambda(rootGraphFetchTree, guaranteeNonNullable(this.target));
  }
}

abstract class MappingTestInputDataState {
  uuid = uuid();
  editorStore: EditorStore;
  mapping: Mapping;

  constructor(editorStore: EditorStore, mapping: Mapping) {
    this.editorStore = editorStore;
    this.mapping = mapping;
  }

  abstract get inputData(): InputData;
  abstract get runtime(): Runtime;
}

export class MappingTestObjectInputDataState extends MappingTestInputDataState {
  @observable sourceClass?: Class;
  @observable data = '{}';

  @action setSourceClass = (sourceClass: Class | undefined): void => { this.sourceClass = sourceClass }
  @action setData = (data: string): void => { this.data = data }

  get inputData(): InputData {
    return new ObjectInputData(PackageableElementExplicitReference.create(this.sourceClass ?? Class.createStub()), OBJECT_INPUT_TYPE.JSON, tryToMinifyJSONString(this.data));
  }

  get runtime(): Runtime {
    const runtime = new EngineRuntime();
    runtime.addMapping(PackageableElementExplicitReference.create(this.mapping));
    const connection = new JsonModelConnection(PackageableElementExplicitReference.create(this.editorStore.graphState.graph.modelStore), PackageableElementExplicitReference.create(this.sourceClass ?? Class.createStub()), JsonModelConnection.createUrlStringFromData(this.data));
    runtime.addIdentifiedConnection(new IdentifiedConnection(runtime.generateIdentifiedConnectionId(), connection));
    return runtime;
  }
}

abstract class MappingTestAssertionState {
  uuid = uuid();
  abstract get assert(): MappingTestAssert;
}

export class MappingTestExpectedOutputAssertionState extends MappingTestAssertionState {
  @observable expectedResult = '{}';

  @action setExpectedResult(val: string): void { this.expectedResult = val }

  get assert(): MappingTestAssert {
    return new ExpectedOutputMappingTestAssert(toGrammarString(tryToMinifyJSONString(this.expectedResult)));
  }
}

// NOTE: right now we only support one input data per test
const getTestInputData = (mappingTest: MappingTest): InputData => {
  assertTrue(mappingTest.inputData.length > 0, 'Mapping test input data must contain at least one item');
  return mappingTest.inputData[0];
};

export class MappingTestState {
  uuid = uuid();
  editorStore: EditorStore;
  mappingEditorState: MappingEditorState;
  @observable result: TEST_RESULT = TEST_RESULT.NONE;
  @observable test: MappingTest;
  @observable runTime = 0;
  @observable isSkipped = false;
  @observable errorRunningTest?: Error;
  @observable testExecutionResult?: ExecutionResult;
  @observable isRunningTest = false;
  @observable isExecutingTest = false;
  @observable queryState: MappingTestQueryState;
  @observable inputDataState: MappingTestInputDataState;
  @observable assertionState: MappingTestAssertionState;

  constructor(editorStore: EditorStore, test: MappingTest, mappingEditorState: MappingEditorState) {
    this.editorStore = editorStore;
    this.mappingEditorState = mappingEditorState;
    this.test = test;
    this.queryState = this.buildQueryState();
    this.inputDataState = this.buildInputDataState();
    this.assertionState = this.buildAssertionState();
  }

  buildQueryState(): MappingTestQueryState {
    // NOTE: we use input data type here to guess the class mapping type, need to review this when this fact changes
    const inputData = getTestInputData(this.test);
    if (inputData instanceof ObjectInputData) {
      // for these kinds of input data, we only support graph fetch query at the moment
      const graphFetchTreeContent = this.editorStore.graphState.graphManager.HACKY_deriveGraphFetchTreeContentFromQuery(this.test.query, this.editorStore.graphState.graph, this.mappingEditorState.mapping);
      const queryState = new MappingTestGraphFetchTreeQueryState(this.editorStore);
      if (!graphFetchTreeContent) {
        queryState.setTarget(undefined);
        queryState.setGraphFetchTree(undefined);
      } else if (graphFetchTreeContent instanceof Class) {
        queryState.setTarget(graphFetchTreeContent);
        queryState.setGraphFetchTree(getGraphFetchTreeData(graphFetchTreeContent));
      } else {
        const graphFetchTreeData = buildGraphFetchTreeData(graphFetchTreeContent);
        queryState.setTarget(graphFetchTreeData.root.graphFetchTreeNode.class.value);
        queryState.setGraphFetchTree(graphFetchTreeData);
      }
      return queryState;
    }
    throw new UnsupportedOperationError();
  }

  buildInputDataState(): MappingTestInputDataState {
    const inputData = getTestInputData(this.test);
    if (inputData instanceof ObjectInputData) {
      const inputDataState = new MappingTestObjectInputDataState(this.editorStore, this.mappingEditorState.mapping);
      inputDataState.setSourceClass(inputData.sourceClass.value);
      inputDataState.setData(tryToFormatJSONString(inputData.data)); // WIP: account for XML when we support it
      return inputDataState;
    }
    throw new UnsupportedOperationError();
  }

  buildAssertionState(): MappingTestAssertionState {
    const testAssertion = this.test.assert;
    if (testAssertion instanceof ExpectedOutputMappingTestAssert) {
      const assertionState = new MappingTestExpectedOutputAssertionState();
      assertionState.setExpectedResult(tryToFormatJSONString(fromGrammarString(testAssertion.expectedOutput)));
      return assertionState;
    }
    throw new UnsupportedOperationError();
  }

  @action resetTestRunStatus(): void {
    this.testExecutionResult = undefined;
    this.runTime = 0;
    this.setResult(TEST_RESULT.NONE);
  }

  @action setResult(result: TEST_RESULT): void { this.result = result }
  @action toggleSkipTest(): void { this.isSkipped = !this.isSkipped }
  @action setQueryState = (queryState: MappingTestQueryState): void => { this.queryState = queryState }
  @action setInputDataState = (inputDataState: MappingTestInputDataState): void => { this.inputDataState = inputDataState }
  @action setAssertionState = (assertionState: MappingTestAssertionState): void => { this.assertionState = assertionState }

  @action setInputDataStateBasedOnSource(source: MappingElementSource | undefined, populateWithMockData: boolean): void {
    if (source === undefined || source instanceof Class) {
      // NOTE: By default use object input data if no source is provided
      const newInputDataState = new MappingTestObjectInputDataState(this.editorStore, this.mappingEditorState.mapping);
      if (populateWithMockData) {
        newInputDataState.setSourceClass(source);
        if (source) { newInputDataState.setData(createMockDataForMappingElementSource(source)) }
      }
      this.setInputDataState(newInputDataState);
    } else {
      throw new UnsupportedOperationError();
    }
  }

  /**
   * Execute mapping using current info in the test detail panel then set the execution result value as test expected result
   */
  regenerateExpectedResult = flow(function* (this: MappingTestState) {
    const validationResult = this.test.validationResult ??
      // NOTE: This is temporary, when lambda is properly processed, the type of execution query can be checked without using the graph manager in this manner
      this.editorStore.graphState.graphManager.HACKY_isGetAllLambda(this.test.query)
      ? createValidationError(['Service execution function cannot be empty'])
      : undefined;
    if (validationResult || this.test.hasInvalidInputData) {
      this.editorStore.applicationStore.notifyError(`Can't execute test '${this.test.name}'. Please make sure that the test query and input data are valid`);
      return;
    } else if (this.isExecutingTest) {
      this.editorStore.applicationStore.notifyWarning(`Can't execute test '${this.test.name}' while it is running`);
      return;
    }
    try {
      const query = this.queryState.query;
      const runtime = this.inputDataState.runtime;
      this.isExecutingTest = true;
      const executionInput = this.editorStore.graphState.graphManager.createExecutionInput(this.editorStore.graphState.graph, this.mappingEditorState.mapping, query, runtime, CLIENT_VERSION.VX_X_X);
      const result = (yield executionClient.execute(executionInput)) as unknown as ExecutionResultWithValues;
      if (this.assertionState instanceof MappingTestExpectedOutputAssertionState) {
        this.assertionState.setExpectedResult(JSON.stringify(result.values, null, TAB_SIZE));
        this.updateAssertion();
      } else {
        throw new UnsupportedOperationError();
      }
    } catch (error) {
      if (this.assertionState instanceof MappingTestExpectedOutputAssertionState) {
        this.assertionState.setExpectedResult(tryToFormatJSONString('{}'));
        this.updateAssertion();
      } else {
        throw new UnsupportedOperationError();
      }
      Log.error(LOG_EVENT.EXECUTION_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isExecutingTest = false;
    }
  });

  runTest = flow(function* (this: MappingTestState) {
    const validationResult = this.test.validationResult ??
      // NOTE: This is temporary, when lambda is properly processed, the type of execution query can be checked without using the graph manager in this manner
      this.editorStore.graphState.graphManager.HACKY_isGetAllLambda(this.test.query)
      ? createValidationError(['Service execution function cannot be empty'])
      : undefined;
    if (validationResult || this.test.hasInvalidInputData || this.test.assert.validationResult) {
      this.editorStore.applicationStore.notifyError(`Can't run test '${this.test.name}'. Please make sure that the test is valid`);
      return;
    } else if (this.isExecutingTest) {
      this.editorStore.applicationStore.notifyWarning(`Test '${this.test.name}' is already running`);
      return;
    }
    const startTime = Date.now();
    try {
      const runtime = this.inputDataState.runtime;
      this.isRunningTest = true;
      const executionInput = this.editorStore.graphState.graphManager.createExecutionInput(this.editorStore.graphState.graph, this.mappingEditorState.mapping, this.test.query, runtime, CLIENT_VERSION.VX_X_X);
      const result = (yield executionClient.execute(executionInput)) as unknown as ExecutionResultWithValues;
      this.testExecutionResult = result.values;
      let assertionMatched = false;
      if (this.assertionState instanceof MappingTestExpectedOutputAssertionState) {
        assertionMatched = hashObject(result.values) === hashObject(JSON.parse(this.assertionState.expectedResult));
      } else {
        throw new UnsupportedOperationError();
      }
      this.setResult(assertionMatched ? TEST_RESULT.PASSED : TEST_RESULT.FAILED);
    } catch (error) {
      Log.error(LOG_EVENT.EXECUTION_PROBLEM, error);
      this.errorRunningTest = error as Error;
      this.setResult(TEST_RESULT.ERROR);
    } finally {
      this.isRunningTest = false;
      this.runTime = Date.now() - startTime;
    }
  });

  openTest = flow(function* (this: MappingTestState, resetHeightIfTooSmall: boolean) {
    try {
      // extract test basic info out into state
      this.queryState = this.buildQueryState();
      this.inputDataState = this.buildInputDataState();
      this.assertionState = this.buildAssertionState();
      // open the aux panel and switch to test tab to show test detail
      this.editorStore.openAuxPanel(AUX_PANEL_MODE.MAPPING_TEST, resetHeightIfTooSmall);
    } catch (error) {
      Log.error(LOG_EVENT.EXECUTION_PROBLEM, error.message);
      yield this.editorStore.graphState.globalCompileInFormMode(); // recompile graph if there is problem with the deep fetch tree of a test
    }
  })

  @action updateTestQuery(): void { this.test.setQuery(this.queryState.query) }
  @action updateInputData(): void { this.test.setInputData([this.inputDataState.inputData]) }
  @action updateAssertion(): void { this.test.setAssert(this.assertionState.assert) }
}
