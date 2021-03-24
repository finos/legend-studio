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

import type { MappingEditorState } from './MappingEditorState';
import {
  hashObject,
  UnsupportedOperationError,
  guaranteeNonNullable,
  uuid,
  assertTrue,
  assertErrorThrown,
  tryToFormatJSONString,
  fromGrammarString,
  toGrammarString,
  createUrlStringFromData,
  losslessParse,
  losslessStringify,
  tryToMinifyLosslessJSONString,
  tryToFormatLosslessJSONString,
} from '@finos/legend-studio-shared';
import type { EditorStore } from '../../../EditorStore';
import { CORE_LOG_EVENT } from '../../../../utils/Logger';
import {
  observable,
  flow,
  action,
  makeObservable,
  makeAutoObservable,
} from 'mobx';
import type { RawGraphFetchTreeData } from '../../../shared/RawGraphFetchTreeUtil';
import {
  buildRawGraphFetchTreeData,
  getRawGraphFetchTreeData,
} from '../../../shared/RawGraphFetchTreeUtil';
import { AUX_PANEL_MODE, TAB_SIZE } from '../../../EditorConfig';
import { CLIENT_VERSION } from '../../../../models/MetaModelConst';
import { createMockDataForMappingElementSource } from '../../../shared/MockDataUtil';
import { Class } from '../../../../models/metamodels/pure/model/packageableElements/domain/Class';
import type { MappingTest } from '../../../../models/metamodels/pure/model/packageableElements/mapping/MappingTest';
import { RawLambda } from '../../../../models/metamodels/pure/model/rawValueSpecification/RawLambda';
import { ExpectedOutputMappingTestAssert } from '../../../../models/metamodels/pure/model/packageableElements/mapping/ExpectedOutputMappingTestAssert';
import {
  ObjectInputData,
  OBJECT_INPUT_TYPE,
} from '../../../../models/metamodels/pure/model/packageableElements/store/modelToModel/mapping/ObjectInputData';
import type { Runtime } from '../../../../models/metamodels/pure/model/packageableElements/runtime/Runtime';
import {
  IdentifiedConnection,
  EngineRuntime,
} from '../../../../models/metamodels/pure/model/packageableElements/runtime/Runtime';
import type { InputData } from '../../../../models/metamodels/pure/model/packageableElements/mapping/InputData';
import { FlatDataInputData } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/mapping/FlatDataInputData';
import type { MappingTestAssert } from '../../../../models/metamodels/pure/model/packageableElements/mapping/MappingTestAssert';
import { JsonModelConnection } from '../../../../models/metamodels/pure/model/packageableElements/store/modelToModel/connection/JsonModelConnection';
import { FlatDataConnection } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/connection/FlatDataConnection';
import type {
  MappingElementSource,
  Mapping,
} from '../../../../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import { RootFlatDataRecordType } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/model/FlatDataDataType';
import { FlatData } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/model/FlatData';
import { PackageableElementExplicitReference } from '../../../../models/metamodels/pure/model/packageableElements/PackageableElementReference';
import { createValidationError } from '../../../../models/metamodels/pure/action/validator/ValidationResult';
import type { ExecutionResult } from '../../../../models/metamodels/pure/action/execution/ExecutionResult';

export enum TEST_RESULT {
  NONE = 'NONE', // test has not run yet
  ERROR = 'ERROR', // test has error
  FAILED = 'FAILED', // test assertion failed
  PASSED = 'PASSED',
}

abstract class MappingTestQueryState {
  uuid = uuid();
  editorStore: EditorStore;
  abstract get query(): RawLambda;

  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
  }
}

export class MappingTestGraphFetchTreeQueryState extends MappingTestQueryState {
  target?: Class;
  graphFetchTree?: RawGraphFetchTreeData;

  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      target: observable,
      graphFetchTree: observable,
      setTarget: action,
      setGraphFetchTree: action,
    });
  }

  setTarget = (target: Class | undefined): void => {
    this.target = target;
  };
  setGraphFetchTree = (
    graphFetchTree: RawGraphFetchTreeData | undefined,
  ): void => {
    this.graphFetchTree = graphFetchTree;
  };

  get query(): RawLambda {
    const rootGraphFetchTree = this.graphFetchTree?.root.graphFetchTreeNode;
    if (!rootGraphFetchTree) {
      return RawLambda.createStub();
    }
    return rootGraphFetchTree.isEmpty
      ? this.editorStore.graphState.graphManager.HACKY_createGetAllLambda(
          guaranteeNonNullable(this.target),
        )
      : this.editorStore.graphState.graphManager.HACKY_createGraphFetchLambda(
          rootGraphFetchTree,
          guaranteeNonNullable(this.target),
        );
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
  sourceClass?: Class;
  data = '{}';

  constructor(editorStore: EditorStore, mapping: Mapping) {
    super(editorStore, mapping);

    makeObservable(this, {
      sourceClass: observable,
      data: observable,
      setSourceClass: action,
      setData: action,
    });
  }

  setSourceClass = (sourceClass: Class | undefined): void => {
    this.sourceClass = sourceClass;
  };
  setData = (data: string): void => {
    this.data = data;
  };

  get inputData(): InputData {
    return new ObjectInputData(
      PackageableElementExplicitReference.create(
        this.sourceClass ?? Class.createStub(),
      ),
      OBJECT_INPUT_TYPE.JSON,
      this.data,
    );
  }

  get runtime(): Runtime {
    const engineConfig = this.editorStore.graphState.graphManager.getEngineConfig();
    const runtime = new EngineRuntime();
    runtime.addMapping(
      PackageableElementExplicitReference.create(this.mapping),
    );
    const connection = new JsonModelConnection(
      PackageableElementExplicitReference.create(
        this.editorStore.graphState.graph.modelStore,
      ),
      PackageableElementExplicitReference.create(
        this.sourceClass ?? Class.createStub(),
      ),
      createUrlStringFromData(
        /* @MARKER: Workaround for https://github.com/finos/legend-studio/issues/68 */
        tryToMinifyLosslessJSONString(this.data),
        JsonModelConnection.CONTENT_TYPE,
        engineConfig.useBase64ForAdhocConnectionDataUrls,
      ),
    );
    runtime.addIdentifiedConnection(
      new IdentifiedConnection(
        runtime.generateIdentifiedConnectionId(),
        connection,
      ),
    );
    return runtime;
  }
}

export class MappingTestFlatDataInputDataState extends MappingTestInputDataState {
  sourceFlatData?: FlatData;
  data = '';

  constructor(editorStore: EditorStore, mapping: Mapping) {
    super(editorStore, mapping);

    makeObservable(this, {
      sourceFlatData: observable,
      data: observable,
      setSourceFlatData: action,
      setData: action,
    });
  }

  setSourceFlatData = (sourceFlatData: FlatData | undefined): void => {
    this.sourceFlatData = sourceFlatData;
  };
  setData = (data: string): void => {
    this.data = data;
  };

  get inputData(): InputData {
    return new FlatDataInputData(
      PackageableElementExplicitReference.create(
        this.sourceFlatData ?? FlatData.createStub(),
      ),
      this.data,
    );
  }

  get runtime(): Runtime {
    const engineConfig = this.editorStore.graphState.graphManager.getEngineConfig();
    const runtime = new EngineRuntime();
    runtime.addMapping(
      PackageableElementExplicitReference.create(this.mapping),
    );
    const connection = new FlatDataConnection(
      PackageableElementExplicitReference.create(
        this.sourceFlatData ?? FlatData.createStub(),
      ),
      createUrlStringFromData(
        this.data,
        FlatDataConnection.CONTENT_TYPE,
        engineConfig.useBase64ForAdhocConnectionDataUrls,
      ),
    );
    runtime.addIdentifiedConnection(
      new IdentifiedConnection(
        runtime.generateIdentifiedConnectionId(),
        connection,
      ),
    );
    return runtime;
  }
}

abstract class MappingTestAssertionState {
  uuid = uuid();
  abstract get assert(): MappingTestAssert;
}

export class MappingTestExpectedOutputAssertionState extends MappingTestAssertionState {
  expectedResult = '{}';
  expectedTestExecutionResult?: string;

  constructor() {
    super();

    makeObservable(this, {
      expectedResult: observable,
      expectedTestExecutionResult: observable,
      updateExpectedTestExecutionResult: action,
      setExpectedResult: action,
    });
  }

  updateExpectedTestExecutionResult(): void {
    this.expectedTestExecutionResult = this.expectedResult;
  }
  setExpectedResult(val: string): void {
    this.expectedResult = val;
  }

  get assert(): MappingTestAssert {
    return new ExpectedOutputMappingTestAssert(
      /* @MARKER: Workaround for https://github.com/finos/legend-studio/issues/68 */
      toGrammarString(tryToMinifyLosslessJSONString(this.expectedResult)),
    );
  }
}

// NOTE: right now we only support one input data per test
const getTestInputData = (mappingTest: MappingTest): InputData => {
  assertTrue(
    mappingTest.inputData.length > 0,
    'Mapping test input data must contain at least one item',
  );
  return mappingTest.inputData[0];
};

export class MappingTestState {
  uuid = uuid();
  editorStore: EditorStore;
  mappingEditorState: MappingEditorState;
  result: TEST_RESULT = TEST_RESULT.NONE;
  test: MappingTest;
  runTime = 0;
  isSkipped = false;
  errorRunningTest?: Error;
  testExecutionResultText?: string; // NOTE: stored as lessless JSON object text
  isRunningTest = false;
  isExecutingTest = false;
  queryState: MappingTestQueryState;
  inputDataState: MappingTestInputDataState;
  assertionState: MappingTestAssertionState;

  constructor(
    editorStore: EditorStore,
    test: MappingTest,
    mappingEditorState: MappingEditorState,
  ) {
    makeAutoObservable(this, {
      uuid: false,
      editorStore: false,
      mappingEditorState: false,
      resetTestRunStatus: action,
      setResult: action,
      toggleSkipTest: action,
      setQueryState: action,
      setInputDataState: action,
      setAssertionState: action,
      setInputDataStateBasedOnSource: action,
      updateTestQuery: action,
      updateInputData: action,
      updateAssertion: action,
    });

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
    if (
      inputData instanceof ObjectInputData ||
      inputData instanceof FlatDataInputData
    ) {
      // for these kinds of input data, we only support graph fetch query at the moment
      const graphFetchTreeContent = this.editorStore.graphState.graphManager.HACKY_deriveGraphFetchTreeContentFromQuery(
        this.test.query,
        this.editorStore.graphState.graph,
        this.mappingEditorState.mapping,
      );
      const queryState = new MappingTestGraphFetchTreeQueryState(
        this.editorStore,
      );
      if (!graphFetchTreeContent) {
        queryState.setTarget(undefined);
        queryState.setGraphFetchTree(undefined);
      } else if (graphFetchTreeContent instanceof Class) {
        queryState.setTarget(graphFetchTreeContent);
        queryState.setGraphFetchTree(
          getRawGraphFetchTreeData(
            this.editorStore,
            graphFetchTreeContent,
            this.mappingEditorState.mapping,
          ),
        );
      } else {
        const graphFetchTreeData = buildRawGraphFetchTreeData(
          this.editorStore,
          graphFetchTreeContent,
          this.mappingEditorState.mapping,
        );
        queryState.setTarget(
          graphFetchTreeData.root.graphFetchTreeNode.class.value,
        );
        queryState.setGraphFetchTree(graphFetchTreeData);
      }
      return queryState;
    }
    throw new UnsupportedOperationError();
  }

  buildInputDataState(): MappingTestInputDataState {
    const inputData = getTestInputData(this.test);
    if (inputData instanceof ObjectInputData) {
      const inputDataState = new MappingTestObjectInputDataState(
        this.editorStore,
        this.mappingEditorState.mapping,
      );
      inputDataState.setSourceClass(inputData.sourceClass.value);
      /* @MARKER: Workaround for https://github.com/finos/legend-studio/issues/68 */
      inputDataState.setData(tryToFormatLosslessJSONString(inputData.data)); // TODO: account for XML when we support it
      return inputDataState;
    } else if (inputData instanceof FlatDataInputData) {
      const inputDataState = new MappingTestFlatDataInputDataState(
        this.editorStore,
        this.mappingEditorState.mapping,
      );
      inputDataState.setSourceFlatData(inputData.sourceFlatData.value);
      inputDataState.setData(inputData.data);
      return inputDataState;
    }
    throw new UnsupportedOperationError();
  }

  buildAssertionState(): MappingTestAssertionState {
    const testAssertion = this.test.assert;
    if (testAssertion instanceof ExpectedOutputMappingTestAssert) {
      const assertionState = new MappingTestExpectedOutputAssertionState();
      assertionState.setExpectedResult(
        fromGrammarString(
          /* @MARKER: Workaround for https://github.com/finos/legend-studio/issues/68 */
          tryToFormatLosslessJSONString(testAssertion.expectedOutput),
        ),
      );
      return assertionState;
    }
    throw new UnsupportedOperationError();
  }

  resetTestRunStatus(): void {
    this.testExecutionResultText = undefined;
    this.runTime = 0;
    this.setResult(TEST_RESULT.NONE);
  }
  setResult(result: TEST_RESULT): void {
    this.result = result;
  }
  toggleSkipTest(): void {
    this.isSkipped = !this.isSkipped;
  }
  setQueryState = (queryState: MappingTestQueryState): void => {
    this.queryState = queryState;
  };
  setInputDataState = (inputDataState: MappingTestInputDataState): void => {
    this.inputDataState = inputDataState;
  };
  setAssertionState = (assertionState: MappingTestAssertionState): void => {
    this.assertionState = assertionState;
  };

  setInputDataStateBasedOnSource(
    source: MappingElementSource | undefined,
    populateWithMockData: boolean,
  ): void {
    if (source === undefined || source instanceof Class) {
      // NOTE: By default use object input data if no source is provided
      const newInputDataState = new MappingTestObjectInputDataState(
        this.editorStore,
        this.mappingEditorState.mapping,
      );
      if (populateWithMockData) {
        newInputDataState.setSourceClass(source);
        if (source) {
          newInputDataState.setData(
            createMockDataForMappingElementSource(source),
          );
        }
      }
      this.setInputDataState(newInputDataState);
    } else if (source instanceof RootFlatDataRecordType) {
      const newInputDataState = new MappingTestFlatDataInputDataState(
        this.editorStore,
        this.mappingEditorState.mapping,
      );
      if (populateWithMockData) {
        newInputDataState.setSourceFlatData(source.owner.owner);
        newInputDataState.setData(
          createMockDataForMappingElementSource(source),
        );
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
    const validationResult =
      this.test.validationResult ??
      // NOTE: This is temporary, when lambda is properly processed, the type of execution query can be checked without using the graph manager in this manner
      this.editorStore.graphState.graphManager.HACKY_isGetAllLambda(
        this.test.query,
      )
        ? createValidationError(['Service execution function cannot be empty'])
        : undefined;
    if (validationResult || this.test.hasInvalidInputData) {
      this.editorStore.applicationStore.notifyError(
        `Can't execute test '${this.test.name}'. Please make sure that the test query and input data are valid`,
      );
      return;
    } else if (this.isExecutingTest) {
      this.editorStore.applicationStore.notifyWarning(
        `Can't execute test '${this.test.name}' while it is running`,
      );
      return;
    }
    try {
      const query = this.queryState.query;
      const runtime = this.inputDataState.runtime;
      this.isExecutingTest = true;
      const result = ((yield this.editorStore.graphState.graphManager.executeMapping(
        this.editorStore.graphState.graph,
        this.mappingEditorState.mapping,
        query,
        runtime,
        CLIENT_VERSION.VX_X_X,
        true,
      )) as unknown) as ExecutionResult;
      if (
        this.assertionState instanceof MappingTestExpectedOutputAssertionState
      ) {
        this.assertionState.setExpectedResult(
          losslessStringify(result.values, undefined, TAB_SIZE),
        );
        this.updateAssertion();
      } else {
        throw new UnsupportedOperationError();
      }
    } catch (error: unknown) {
      if (
        this.assertionState instanceof MappingTestExpectedOutputAssertionState
      ) {
        this.assertionState.setExpectedResult(tryToFormatJSONString('{}'));
        this.updateAssertion();
      } else {
        throw new UnsupportedOperationError();
      }
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.EXECUTION_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isExecutingTest = false;
    }
  });

  runTest = flow(function* (this: MappingTestState) {
    const validationResult =
      this.test.validationResult ??
      // NOTE: This is temporary, when lambda is properly processed, the type of execution query can be checked without using the graph manager in this manner
      this.editorStore.graphState.graphManager.HACKY_isGetAllLambda(
        this.test.query,
      )
        ? createValidationError(['Service execution function cannot be empty'])
        : undefined;
    if (
      validationResult ||
      this.test.hasInvalidInputData ||
      this.test.assert.validationResult
    ) {
      this.editorStore.applicationStore.notifyError(
        `Can't run test '${this.test.name}'. Please make sure that the test is valid`,
      );
      return;
    } else if (this.isExecutingTest) {
      this.editorStore.applicationStore.notifyWarning(
        `Test '${this.test.name}' is already running`,
      );
      return;
    }
    const startTime = Date.now();
    try {
      const runtime = this.inputDataState.runtime;
      this.isRunningTest = true;
      const result = ((yield this.editorStore.graphState.graphManager.executeMapping(
        this.editorStore.graphState.graph,
        this.mappingEditorState.mapping,
        this.test.query,
        runtime,
        CLIENT_VERSION.VX_X_X,
        true,
      )) as unknown) as ExecutionResult;
      this.testExecutionResultText = losslessStringify(
        result.values,
        undefined,
        TAB_SIZE,
      );
      let assertionMatched = false;
      if (
        this.assertionState instanceof MappingTestExpectedOutputAssertionState
      ) {
        this.assertionState.updateExpectedTestExecutionResult();
        // NOTE: maybe it's not that nice to
        assertionMatched =
          hashObject(result.values) ===
          hashObject(losslessParse(this.assertionState.expectedResult));
      } else {
        throw new UnsupportedOperationError();
      }
      this.setResult(
        assertionMatched ? TEST_RESULT.PASSED : TEST_RESULT.FAILED,
      );
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.EXECUTION_PROBLEM,
        error,
      );
      this.errorRunningTest = error as Error;
      this.setResult(TEST_RESULT.ERROR);
    } finally {
      this.isRunningTest = false;
      this.runTime = Date.now() - startTime;
    }
  });

  openTest = flow(function* (
    this: MappingTestState,
    resetHeightIfTooSmall: boolean,
  ) {
    try {
      // extract test basic info out into state
      this.queryState = this.buildQueryState();
      this.inputDataState = this.buildInputDataState();
      this.assertionState = this.buildAssertionState();
      // open the aux panel and switch to test tab to show test detail
      this.editorStore.openAuxPanel(
        AUX_PANEL_MODE.MAPPING_TEST,
        resetHeightIfTooSmall,
      );
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.EXECUTION_PROBLEM,
        error.message,
      );
      yield this.editorStore.graphState.globalCompileInFormMode(); // recompile graph if there is problem with the deep fetch tree of a test
    }
  });

  updateTestQuery(): void {
    this.test.setQuery(this.queryState.query);
  }
  updateInputData(): void {
    this.test.setInputData([this.inputDataState.inputData]);
  }
  updateAssertion(): void {
    this.test.setAssert(this.assertionState.assert);
  }
}
