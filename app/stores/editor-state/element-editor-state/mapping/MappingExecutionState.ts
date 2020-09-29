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
import { EditorStore } from 'Stores/EditorStore';
import { observable, action, flow, computed } from 'mobx';
import { GraphFetchTreeData } from 'Utilities/GraphFetchTreeUtil';
import { tryToMinifyJSONString, toGrammarString } from 'Utilities/FormatterUtil';
import { guaranteeNonNullable, assertTrue, IllegalStateError, UnsupportedOperationError, uuid } from 'Utilities/GeneralUtil';
import { executionClient } from 'API/ExecutionClient';
import { CLIENT_VERSION } from 'MetaModelConst';
import { LOG_EVENT, Log } from 'Utilities/Logger';
import { isValidJSONString } from 'Utilities/ValidatorUtil';
import { createMockDataForMappingElementSource } from 'Utilities/MockDataUtil';
import { ExecutionResultWithValues, ExecutionPlan, ExecutionResult } from 'EXEC/execution/ExecutionResult';
import { MappingTest } from 'MM/model/packageableElements/mapping/MappingTest';
import { Class } from 'MM/model/packageableElements/domain/Class';
import { ObjectInputData, OBJECT_INPUT_TYPE } from 'MM/model/packageableElements/store/modelToModel/mapping/ObjectInputData';
import { ExpectedOutputMappingTestAssert } from 'MM/model/packageableElements/mapping/ExpectedOutputMappingTestAssert';
import { Lambda } from 'MM/model/valueSpecification/raw/Lambda';
import { Runtime, IdentifiedConnection, EngineRuntime } from 'MM/model/packageableElements/runtime/Runtime';
import { JsonModelConnection } from 'MM/model/packageableElements/store/modelToModel/connection/JsonModelConnection';
import { InputData } from 'MM/model/packageableElements/mapping/InputData';
import { MappingElementSource, Mapping } from 'MM/model/packageableElements/mapping/Mapping';
import { Connection } from 'MM/model/packageableElements/connection/Connection';
import { PackageableElementExplicitReference } from 'MM/model/packageableElements/PackageableElementReference';

abstract class MappingExecutionQueryState {
  uuid = uuid();
  editorStore: EditorStore;
  abstract get isValid(): boolean;
  abstract get query(): Lambda;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
  }
}

export class MappingExecutionGraphFetchQueryState extends MappingExecutionQueryState {
  @observable target?: Class;
  @observable graphFetchTree?: GraphFetchTreeData;

  @action setTarget = (target: Class | undefined): void => { this.target = target }
  @action setGraphFetchTree = (graphFetchTree?: GraphFetchTreeData): void => { this.graphFetchTree = graphFetchTree }

  @computed get isValid(): boolean { return Boolean(this.target) }

  get query(): Lambda {
    const rootGraphFetchTree = guaranteeNonNullable(this.graphFetchTree?.root.graphFetchTreeNode);
    return rootGraphFetchTree.isEmpty
      ? this.editorStore.graphState.graphManager.HACKY_createGetAllLambda(guaranteeNonNullable(this.target))
      : this.editorStore.graphState.graphManager.HACKY_createGraphFetchLambda(rootGraphFetchTree, guaranteeNonNullable(this.target));
  }
}

abstract class MappingExecutionRuntimeState {
  uuid = uuid();
  editorStore: EditorStore;
  mapping: Mapping;

  constructor(editorStore: EditorStore, mapping: Mapping) {
    this.editorStore = editorStore;
    this.mapping = mapping;
  }

  abstract get isValid(): boolean;
  abstract get runtime(): Runtime;
  abstract get inputData(): InputData;
}

export const createRuntimeForExecution = (mapping: Mapping, connection: Connection): Runtime => {
  const runtime = new EngineRuntime();
  runtime.addMapping(PackageableElementExplicitReference.create(mapping));
  runtime.addIdentifiedConnection(new IdentifiedConnection(runtime.generateIdentifiedConnectionId(), connection));
  return runtime;
};

export class MappingExecutionEmptyRuntimeState extends MappingExecutionRuntimeState {
  get isValid(): boolean { return false }
  get runtime(): Runtime { throw new IllegalStateError('Mapping execution runtime information is not specified') }
  get inputData(): InputData { throw new IllegalStateError('Mapping execution runtime information is not specified') }
}

export class MappingExecutionJsonModelConnectionRuntimeState extends MappingExecutionRuntimeState {
  @observable sourceClass?: Class;
  @observable testData = '{}';

  @action setSourceClass = (sourceClass: Class | undefined): void => { this.sourceClass = sourceClass }
  @action setTestData = (testData: string): void => { this.testData = testData }

  @computed get isValid(): boolean { return isValidJSONString(this.testData) && Boolean(this.sourceClass) }

  get runtime(): Runtime {
    assertTrue(isValidJSONString(this.testData), 'Model-to-model mapping execution test data is not a valid JSON string');
    return createRuntimeForExecution(this.mapping, new JsonModelConnection(PackageableElementExplicitReference.create(this.editorStore.graphState.graph.modelStore), PackageableElementExplicitReference.create(guaranteeNonNullable(this.sourceClass)), JsonModelConnection.createUrlStringFromData(this.testData)));
  }

  get inputData(): InputData {
    return new ObjectInputData(PackageableElementExplicitReference.create(guaranteeNonNullable(this.sourceClass)), OBJECT_INPUT_TYPE.JSON, tryToMinifyJSONString(this.testData));
  }
}
export class MappingExecutionState {
  editorStore: EditorStore;
  mappingEditorState: MappingEditorState;
  @observable isExecuting = false;
  @observable isGeneratingPlan = false;
  @observable queryState: MappingExecutionQueryState;
  @observable runtimeState: MappingExecutionRuntimeState;
  @observable.ref executionPlan?: ExecutionPlan;
  @observable.ref executionResult?: ExecutionResult;

  constructor(editorStore: EditorStore, mappingEditorState: MappingEditorState) {
    this.editorStore = editorStore;
    this.mappingEditorState = mappingEditorState;
    this.queryState = new MappingExecutionGraphFetchQueryState(editorStore);
    this.runtimeState = new MappingExecutionEmptyRuntimeState(editorStore, mappingEditorState.mapping);
  }

  @action setQueryState = (queryState: MappingExecutionQueryState): void => { this.queryState = queryState }
  @action setRuntimeState = (runtimeState: MappingExecutionRuntimeState): void => { this.runtimeState = runtimeState }
  @action setExecutionResult = (executionResult: ExecutionResult | undefined): void => { this.executionResult = executionResult }
  @action setExecutionPlan = (executionPlan: ExecutionPlan | undefined): void => { this.executionPlan = executionPlan }

  @action reset(): void {
    this.queryState = new MappingExecutionGraphFetchQueryState(this.editorStore);
    this.runtimeState = new MappingExecutionEmptyRuntimeState(this.editorStore, this.mappingEditorState.mapping);
    this.executionResult = undefined;
  }

  @action setRuntimeStateBasedOnSource(source: MappingElementSource | undefined, populateWithMockData: boolean): void {
    if (source instanceof Class) {
      const newRuntimeState = new MappingExecutionJsonModelConnectionRuntimeState(this.editorStore, this.mappingEditorState.mapping);
      if (populateWithMockData) {
        newRuntimeState.setSourceClass(source);
        newRuntimeState.setTestData(createMockDataForMappingElementSource(source));
      }
      this.setRuntimeState(newRuntimeState);
    } else if (source === undefined) {
      this.setRuntimeState(new MappingExecutionEmptyRuntimeState(this.editorStore, this.mappingEditorState.mapping));
    } else {
      throw new UnsupportedOperationError();
    }
  }

  promoteToTest = flow(function* (this: MappingExecutionState) {
    try {
      const query = this.queryState.query;
      if (this.queryState.isValid && this.runtimeState.isValid && this.executionResult) {
        const inputData = this.runtimeState.inputData;
        const assert = new ExpectedOutputMappingTestAssert(toGrammarString(JSON.stringify(this.executionResult)));
        const mappingTest = new MappingTest(this.mappingEditorState.mapping.generateTestName(), query, [inputData], assert);
        yield this.mappingEditorState.addTest(mappingTest);
        this.reset();
      }
    } catch (error) {
      Log.error(LOG_EVENT.EXECUTION_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    }
  })

  executeMapping = flow(function* (this: MappingExecutionState) {
    try {
      const query = this.queryState.query;
      const runtime = this.runtimeState.runtime;
      if (this.queryState.isValid && this.runtimeState.isValid && !this.isExecuting) {
        this.isExecuting = true;
        const executionInput = this.editorStore.graphState.graphManager.createExecutionInput(this.editorStore.graphState.graph, this.mappingEditorState.mapping, query, runtime, CLIENT_VERSION.VX_X_X);
        const result = (yield executionClient.execute(executionInput)) as unknown as ExecutionResultWithValues;
        this.setExecutionResult(result.values);
      }
    } catch (error) {
      Log.error(LOG_EVENT.EXECUTION_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isExecuting = false;
    }
  });

  generatePlan = flow(function* (this: MappingExecutionState) {
    try {
      const query = this.queryState.query;
      const runtime = this.runtimeState.runtime;
      if (this.queryState.isValid && this.runtimeState.isValid && !this.isGeneratingPlan) {
        this.isGeneratingPlan = true;
        const executionInput = this.editorStore.graphState.graphManager.createExecutionInput(this.editorStore.graphState.graph, this.mappingEditorState.mapping, query, runtime, CLIENT_VERSION.VX_X_X);
        const plan = (yield executionClient.generatePlan(executionInput)) as unknown as ExecutionPlan;
        this.setExecutionPlan(plan);
      }
    } catch (error) {
      Log.error(LOG_EVENT.EXECUTION_PROBLEM, error);
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isGeneratingPlan = false;
    }
  });
}
