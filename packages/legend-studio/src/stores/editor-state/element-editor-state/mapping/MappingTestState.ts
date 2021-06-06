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
import type { GeneratorFn } from '@finos/legend-studio-shared';
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
  tryToMinifyJSONString,
  getClass,
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
import { TAB_SIZE } from '../../../EditorConfig';
import {
  CLIENT_VERSION,
  LAMBDA_START,
} from '../../../../models/MetaModelConst';
import { createMockDataForMappingElementSource } from '../../../shared/MockDataUtil';
import { Class } from '../../../../models/metamodels/pure/model/packageableElements/domain/Class';
import type { MappingTest } from '../../../../models/metamodels/pure/model/packageableElements/mapping/MappingTest';
import type { RawLambda } from '../../../../models/metamodels/pure/model/rawValueSpecification/RawLambda';
import { ExpectedOutputMappingTestAssert } from '../../../../models/metamodels/pure/model/packageableElements/mapping/ExpectedOutputMappingTestAssert';
import {
  ObjectInputData,
  ObjectInputType,
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
import { PackageableElementExplicitReference } from '../../../../models/metamodels/pure/model/packageableElements/PackageableElementReference';
import type { ExecutionResult } from '../../../../models/metamodels/pure/action/execution/ExecutionResult';
import {
  RelationalInputData,
  RelationalInputType,
} from '../../../../models/metamodels/pure/model/packageableElements/store/relational/mapping/RelationalInputData';
import {
  DatabaseType,
  RelationalDatabaseConnection,
} from '../../../../models/metamodels/pure/model/packageableElements/store/relational/connection/RelationalDatabaseConnection';
import { LocalH2DatasourceSpecification } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/connection/DatasourceSpecification';
import { DefaultH2AuthenticationStrategy } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/connection/AuthenticationStrategy';
import { Table } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/model/Table';
import { View } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/model/View';
import { LambdaEditorState } from '../LambdaEditorState';

export enum TEST_RESULT {
  NONE = 'NONE', // test has not run yet
  ERROR = 'ERROR', // test has error
  FAILED = 'FAILED', // test assertion failed
  PASSED = 'PASSED',
}

export class MappingTestQueryState extends LambdaEditorState {
  uuid = uuid();
  editorStore: EditorStore;
  test: MappingTest;
  isConvertingLambdaToString = false;
  isInitializingLambda = false;
  query: RawLambda;

  constructor(editorStore: EditorStore, test: MappingTest, query: RawLambda) {
    super('', LAMBDA_START);

    makeObservable(this, {
      query: observable,
      isConvertingLambdaToString: observable,
      isInitializingLambda: observable,
      setIsInitializingLambda: action,
      convertLambdaObjectToGrammarString: action,
      convertLambdaGrammarStringToObject: action,
      updateLamba: action,
    });

    this.test = test;
    this.editorStore = editorStore;
    this.query = query;
  }

  get lambdaId(): string {
    return this.uuid;
  }

  setIsInitializingLambda(val: boolean): void {
    this.isInitializingLambda = val;
  }

  updateLamba = flow(function* (this: MappingTestQueryState, val: RawLambda) {
    this.query = val;
    this.test.setQuery(val);
    yield this.convertLambdaObjectToGrammarString(true);
  });

  convertLambdaObjectToGrammarString = flow(function* (
    this: MappingTestQueryState,
    pretty?: boolean,
  ) {
    if (!this.query.isStub) {
      this.isConvertingLambdaToString = true;
      try {
        const lambdas = new Map<string, RawLambda>();
        lambdas.set(this.lambdaId, this.query);
        const isolatedLambdas =
          (yield this.editorStore.graphState.graphManager.lambdaToPureCode(
            lambdas,
            pretty,
          )) as Map<string, string>;
        const grammarText = isolatedLambdas.get(this.lambdaId);
        this.setLambdaString(
          grammarText !== undefined
            ? this.extractLambdaString(grammarText)
            : '',
        );
        this.clearErrors();
        this.isConvertingLambdaToString = false;
      } catch (error: unknown) {
        this.editorStore.applicationStore.logger.error(
          CORE_LOG_EVENT.PARSING_PROBLEM,
          error,
        );
        this.isConvertingLambdaToString = false;
      }
    } else {
      this.clearErrors();
      this.setLambdaString('');
    }
  });

  // NOTE: since we don't allow edition in text mode, we don't need to implement this
  convertLambdaGrammarStringToObject(): Promise<void> {
    throw new Error('Method not implemented.');
  }
}

abstract class MappingTestInputDataState {
  uuid = uuid();
  editorStore: EditorStore;
  mapping: Mapping;
  inputData: InputData;

  constructor(
    editorStore: EditorStore,
    mapping: Mapping,
    inputData: InputData,
  ) {
    this.editorStore = editorStore;
    this.mapping = mapping;
    this.inputData = inputData;
  }

  abstract get runtime(): Runtime;
}

export class MappingTestObjectInputDataState extends MappingTestInputDataState {
  declare inputData: ObjectInputData;
  /* @MARKER: Workaround for https://github.com/finos/legend-studio/issues/68 */
  data: string;

  constructor(
    editorStore: EditorStore,
    mapping: Mapping,
    inputData: ObjectInputData,
  ) {
    super(editorStore, mapping, inputData);

    makeObservable(this, {
      data: observable,
      setData: action,
    });

    /* @MARKER: Workaround for https://github.com/finos/legend-studio/issues/68 */
    this.data = tryToFormatLosslessJSONString(inputData.data);
  }

  setData(val: string): void {
    this.data = val;
    /* @MARKER: Workaround for https://github.com/finos/legend-studio/issues/68 */
    this.inputData.setData(tryToMinifyLosslessJSONString(val));
  }

  get runtime(): Runtime {
    const engineConfig =
      this.editorStore.graphState.graphManager.getEngineConfig();
    const runtime = new EngineRuntime();
    runtime.addMapping(
      PackageableElementExplicitReference.create(this.mapping),
    );
    const connection = new JsonModelConnection(
      PackageableElementExplicitReference.create(
        this.editorStore.graphState.graph.modelStore,
      ),
      PackageableElementExplicitReference.create(
        this.inputData.sourceClass.value,
      ),
      createUrlStringFromData(
        this.inputData.data,
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
  declare inputData: FlatDataInputData;

  get runtime(): Runtime {
    const engineConfig =
      this.editorStore.graphState.graphManager.getEngineConfig();
    const runtime = new EngineRuntime();
    runtime.addMapping(
      PackageableElementExplicitReference.create(this.mapping),
    );
    const connection = new FlatDataConnection(
      PackageableElementExplicitReference.create(
        this.inputData.sourceFlatData.value,
      ),
      createUrlStringFromData(
        this.inputData.data,
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

export class MappingTestRelationalInputDataState extends MappingTestInputDataState {
  declare inputData: RelationalInputData;

  get runtime(): Runtime {
    const datasourceSpecification = new LocalH2DatasourceSpecification();
    datasourceSpecification.setTestDataSetupSqls(
      // NOTE: this is a gross simplification of handling the input for relational input data
      [this.inputData.data],
    );
    const runtime = new EngineRuntime();
    runtime.addMapping(
      PackageableElementExplicitReference.create(this.mapping),
    );
    const connection = new RelationalDatabaseConnection(
      PackageableElementExplicitReference.create(this.inputData.database.value),
      DatabaseType.H2,
      datasourceSpecification,
      new DefaultH2AuthenticationStrategy(),
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
  assert: MappingTestAssert;

  constructor(assert: MappingTestAssert) {
    this.assert = assert;
  }
}

export class MappingTestExpectedOutputAssertionState extends MappingTestAssertionState {
  declare assert: ExpectedOutputMappingTestAssert;
  /* @MARKER: Workaround for https://github.com/finos/legend-studio/issues/68 */
  expectedResult: string;

  constructor(assert: ExpectedOutputMappingTestAssert) {
    super(assert);

    makeObservable(this, {
      expectedResult: observable,
      setExpectedResult: action,
    });

    this.expectedResult = fromGrammarString(
      /* @MARKER: Workaround for https://github.com/finos/legend-studio/issues/68 */
      tryToFormatLosslessJSONString(assert.expectedOutput),
    );
  }

  setExpectedResult(val: string): void {
    this.expectedResult = val;
    this.assert.setExpectedOutput(
      /* @MARKER: Workaround for https://github.com/finos/legend-studio/issues/68 */
      toGrammarString(tryToMinifyLosslessJSONString(this.expectedResult)),
    );
  }
}

export enum MAPPING_TEST_EDITOR_TAB_TYPE {
  SETUP = 'Test Setup',
  RESULT = 'Test Result',
}

export class MappingTestState {
  uuid = uuid();
  selectedTab = MAPPING_TEST_EDITOR_TAB_TYPE.SETUP;
  editorStore: EditorStore;
  mappingEditorState: MappingEditorState;
  result: TEST_RESULT = TEST_RESULT.NONE;
  test: MappingTest;
  runTime = 0;
  isSkipped = false;
  errorRunningTest?: Error;
  testExecutionResultText?: string; // NOTE: stored as lossless JSON object text
  isRunningTest = false;
  isExecutingTest = false;
  queryState: MappingTestQueryState;
  inputDataState: MappingTestInputDataState;
  assertionState: MappingTestAssertionState;
  executionPlan?: object;
  isGeneratingPlan = false;

  constructor(
    editorStore: EditorStore,
    test: MappingTest,
    mappingEditorState: MappingEditorState,
  ) {
    makeAutoObservable(this, {
      uuid: false,
      editorStore: false,
      mappingEditorState: false,
      setSelectedTab: action,
      resetTestRunStatus: action,
      setResult: action,
      toggleSkipTest: action,
      setQueryState: action,
      setInputDataState: action,
      setAssertionState: action,
      setInputDataStateBasedOnSource: action,
      updateAssertion: action,
    });

    this.editorStore = editorStore;
    this.mappingEditorState = mappingEditorState;
    this.test = test;
    this.queryState = this.buildQueryState();
    this.inputDataState = this.buildInputDataState();
    this.assertionState = this.buildAssertionState();
  }

  setSelectedTab(val: MAPPING_TEST_EDITOR_TAB_TYPE): void {
    this.selectedTab = val;
  }

  buildQueryState(): MappingTestQueryState {
    const queryState = new MappingTestQueryState(
      this.editorStore,
      this.test,
      this.test.query,
    );
    queryState
      .updateLamba(this.test.query)
      .catch(this.editorStore.applicationStore.alertIllegalUnhandledError);
    return queryState;
  }

  buildInputDataState(): MappingTestInputDataState {
    // NOTE: right now we only support one input data per test
    assertTrue(
      this.test.inputData.length > 0,
      'Mapping test input data must contain at least one item',
    );
    const inputData = this.test.inputData[0];
    if (inputData instanceof ObjectInputData) {
      return new MappingTestObjectInputDataState(
        this.editorStore,
        this.mappingEditorState.mapping,
        inputData,
      );
    } else if (inputData instanceof FlatDataInputData) {
      return new MappingTestFlatDataInputDataState(
        this.editorStore,
        this.mappingEditorState.mapping,
        inputData,
      );
    } else if (inputData instanceof RelationalInputData) {
      return new MappingTestRelationalInputDataState(
        this.editorStore,
        this.mappingEditorState.mapping,
        inputData,
      );
    }
    throw new UnsupportedOperationError(
      `Can't build state for mapping test input data of type '${
        getClass(inputData).name
      }'`,
    );
  }

  buildAssertionState(): MappingTestAssertionState {
    const testAssertion = this.test.assert;
    if (testAssertion instanceof ExpectedOutputMappingTestAssert) {
      return new MappingTestExpectedOutputAssertionState(testAssertion);
    }
    throw new UnsupportedOperationError(
      `Can't build state of mapping assertion of type '${
        getClass(testAssertion).name
      }'`,
    );
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
        new ObjectInputData(
          PackageableElementExplicitReference.create(
            source ?? Class.createStub(),
          ),
          ObjectInputType.JSON,
          tryToMinifyJSONString('{}'),
        ),
      );
      if (populateWithMockData) {
        if (source) {
          newInputDataState.inputData.setData(
            createMockDataForMappingElementSource(source, this.editorStore),
          );
        }
      }
      this.setInputDataState(newInputDataState);
    } else if (source instanceof RootFlatDataRecordType) {
      const newInputDataState = new MappingTestFlatDataInputDataState(
        this.editorStore,
        this.mappingEditorState.mapping,
        new FlatDataInputData(
          PackageableElementExplicitReference.create(
            guaranteeNonNullable(source.owner.owner),
          ),
          '',
        ),
      );
      if (populateWithMockData) {
        newInputDataState.inputData.setData(
          createMockDataForMappingElementSource(source, this.editorStore),
        );
      }
      this.setInputDataState(newInputDataState);
    } else if (source instanceof Table || source instanceof View) {
      const newInputDataState = new MappingTestRelationalInputDataState(
        this.editorStore,
        this.mappingEditorState.mapping,
        new RelationalInputData(
          PackageableElementExplicitReference.create(
            guaranteeNonNullable(source.schema.owner),
          ),
          '',
          RelationalInputType.SQL,
        ),
      );
      if (populateWithMockData) {
        newInputDataState.inputData.setData(
          createMockDataForMappingElementSource(source, this.editorStore),
        );
      }
      this.setInputDataState(newInputDataState);
    } else {
      this.editorStore.applicationStore.notifyWarning(
        `Can't build input data for unsupported source of type '${
          getClass(source).name
        }'`,
      );
    }
  }

  /**
   * Execute mapping using current info in the test detail panel then set the execution result value as test expected result
   */
  regenerateExpectedResult = flow(function* (this: MappingTestState) {
    if (this.test.validationResult) {
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
      const result =
        (yield this.editorStore.graphState.graphManager.executeMapping(
          this.editorStore.graphState.graph,
          this.mappingEditorState.mapping,
          query,
          runtime,
          CLIENT_VERSION.VX_X_X,
          true,
        )) as unknown as ExecutionResult;
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
    if (this.test.validationResult) {
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
      const result =
        (yield this.editorStore.graphState.graphManager.executeMapping(
          this.editorStore.graphState.graph,
          this.mappingEditorState.mapping,
          this.test.query,
          runtime,
          CLIENT_VERSION.VX_X_X,
          true,
        )) as unknown as ExecutionResult;
      this.testExecutionResultText = losslessStringify(
        result.values,
        undefined,
        TAB_SIZE,
      );
      let assertionMatched = false;
      if (
        this.assertionState instanceof MappingTestExpectedOutputAssertionState
      ) {
        // TODO: this logic should probably be better handled in by engine mapping test runner
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

  openTest = flow(function* (this: MappingTestState) {
    try {
      // extract test basic info out into state
      this.queryState = this.buildQueryState();
      this.inputDataState = this.buildInputDataState();
      this.assertionState = this.buildAssertionState();
    } catch (error: unknown) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.EXECUTION_PROBLEM,
        error.message,
      );
      yield this.editorStore.graphState.globalCompileInFormMode(); // recompile graph if there is problem with the deep fetch tree of a test
    }
  });

  updateAssertion(): void {
    this.test.setAssert(this.assertionState.assert);
  }

  setExecutionPlan = (val: object | undefined): void => {
    this.executionPlan = val;
  };

  *generatePlan(): GeneratorFn<void> {
    try {
      const query = this.queryState.query;
      const runtime = this.inputDataState.runtime;
      if (!this.isGeneratingPlan) {
        this.isGeneratingPlan = true;
        const plan =
          (yield this.editorStore.graphState.graphManager.generateExecutionPlan(
            this.editorStore.graphState.graph,
            this.mappingEditorState.mapping,
            query,
            runtime,
            CLIENT_VERSION.VX_X_X,
          )) as unknown as object;
        this.setExecutionPlan(plan);
      }
    } catch (error: unknown) {
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.EXECUTION_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isGeneratingPlan = false;
    }
  }
}
