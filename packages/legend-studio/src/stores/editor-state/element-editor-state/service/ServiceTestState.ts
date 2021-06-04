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

import { observable, action, flow, computed, makeObservable } from 'mobx';
import type { ServiceEditorState } from '../../../editor-state/element-editor-state/service/ServiceEditorState';
import { CLIENT_VERSION } from '../../../../models/MetaModelConst';
import { TEST_RESULT } from '../../../editor-state/element-editor-state/mapping/MappingTestState';
import { CORE_LOG_EVENT } from '../../../../utils/Logger';
import type { GeneratorFn } from '@finos/legend-studio-shared';
import {
  losslessStringify,
  uuid,
  guaranteeType,
  UnsupportedOperationError,
  uniq,
  isNonNullable,
  tryToMinifyLosslessJSONString,
  tryToFormatLosslessJSONString,
  tryToFormatJSONString,
  toGrammarString,
  fromGrammarString,
  createUrlStringFromData,
  getClass,
} from '@finos/legend-studio-shared';
import { createMockDataForMappingElementSource } from '../../../shared/MockDataUtil';
import type { EditorStore } from '../../../EditorStore';
import type { ServiceTestResult } from '../../../../models/metamodels/pure/action/service/ServiceTestResult';
import type { KeyedSingleExecutionTest } from '../../../../models/metamodels/pure/model/packageableElements/service/ServiceTest';
import {
  TestContainer,
  SingleExecutionTest,
} from '../../../../models/metamodels/pure/model/packageableElements/service/ServiceTest';
import { PureSingleExecution } from '../../../../models/metamodels/pure/model/packageableElements/service/ServiceExecution';
import {
  getMappingElementTarget,
  getMappingElementSource,
} from '../../../../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import { Class } from '../../../../models/metamodels/pure/model/packageableElements/domain/Class';
import type { Runtime } from '../../../../models/metamodels/pure/model/packageableElements/runtime/Runtime';
import {
  IdentifiedConnection,
  EngineRuntime,
  RuntimePointer,
} from '../../../../models/metamodels/pure/model/packageableElements/runtime/Runtime';
import { JsonModelConnection } from '../../../../models/metamodels/pure/model/packageableElements/store/modelToModel/connection/JsonModelConnection';
import { XmlModelConnection } from '../../../../models/metamodels/pure/model/packageableElements/store/modelToModel/connection/XmlModelConnection';
import { FlatDataConnection } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/connection/FlatDataConnection';
import {
  RelationalDatabaseConnection,
  DatabaseType,
} from '../../../../models/metamodels/pure/model/packageableElements/store/relational/connection/RelationalDatabaseConnection';
import { StaticDatasourceSpecification } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/connection/DatasourceSpecification';
import { DefaultH2AuthenticationStrategy } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/connection/AuthenticationStrategy';
import { ConnectionPointer } from '../../../../models/metamodels/pure/model/packageableElements/connection/Connection';
import { PackageableElementExplicitReference } from '../../../../models/metamodels/pure/model/packageableElements/PackageableElementReference';
import type { ExecutionResult } from '../../../../models/metamodels/pure/action/execution/ExecutionResult';
import { TAB_SIZE } from '../../../EditorConfig';

interface ServiceTestExecutionResult {
  expected: string;
  actual: string;
}

export class TestContainerState {
  uuid = uuid();
  editorStore: EditorStore;
  serviceEditorState: ServiceEditorState;
  testState: SingleExecutionTestState;
  testContainer: TestContainer;
  assertionData?: string;
  testPassed?: boolean;
  textExecutionTextResult?: ServiceTestExecutionResult; // NOTE: this is lossless JSON strings
  isFetchingActualResultForComparison = false;
  isGeneratingTestAssertion = false;

  constructor(
    editorStore: EditorStore,
    testContainter: TestContainer,
    serviceEditorState: ServiceEditorState,
    testState: SingleExecutionTestState,
  ) {
    makeObservable(this, {
      testContainer: observable,
      assertionData: observable,
      testPassed: observable,
      textExecutionTextResult: observable,
      isFetchingActualResultForComparison: observable,
      isGeneratingTestAssertion: observable,
      testResult: computed,
      setAssertionData: action,
      setTestPassed: action,
      setTestExecutionResultText: action,
      updateTestAssert: action,
    });

    this.editorStore = editorStore;
    this.testContainer = testContainter;
    this.serviceEditorState = serviceEditorState;
    this.testState = testState;
    this.initializeAssertionData(testContainter);
  }

  get testResult(): ServiceTestResult | undefined {
    const idx = this.testState.test.asserts.findIndex(
      (assert) => assert === this.testContainer,
    );
    return idx !== -1 && this.testState.testResults.length
      ? this.testState.testResults[idx]
      : undefined;
  }

  setAssertionData(value: string): void {
    this.assertionData = value;
  }
  setTestPassed(value: boolean | undefined): void {
    this.testPassed = value;
  }
  setTestExecutionResultText(
    value: ServiceTestExecutionResult | undefined,
  ): void {
    this.textExecutionTextResult = value;
  }

  updateTestAssert(): void {
    if (this.assertionData) {
      this.testContainer.assert =
        this.editorStore.graphState.graphManager.HACKY_createAssertLambda(
          /* @MARKER: Workaround for https://github.com/finos/legend-studio/issues/68 */
          toGrammarString(tryToMinifyLosslessJSONString(this.assertionData)),
        );
    }
  }

  private initializeAssertionData(testContainter: TestContainer): void {
    const expectedResultAssertionString =
      this.editorStore.graphState.graphManager.HACKY_extractAssertionString(
        testContainter.assert,
      );
    this.assertionData = expectedResultAssertionString
      ? fromGrammarString(
          /* @MARKER: Workaround for https://github.com/finos/legend-studio/issues/68 */
          tryToFormatLosslessJSONString(expectedResultAssertionString),
        )
      : undefined;
  }

  private decorateRuntimeIdentifiedConnectionsWithTestData = (
    runtime: Runtime,
    testData: string,
  ): Runtime => {
    const newRuntime = new EngineRuntime();
    const runtimeValue =
      runtime instanceof RuntimePointer
        ? runtime.packageableRuntime.value.runtimeValue
        : guaranteeType(runtime, EngineRuntime);
    newRuntime.mappings = runtimeValue.mappings;
    /* @MARKER: NEW CONNECTION TYPE SUPPORT --- consider adding connection type handler here whenever support for a new one is added to the app */
    runtimeValue.connections.forEach((storeConnections) => {
      storeConnections.storeConnections.forEach((identifiedConnection) => {
        const connection =
          identifiedConnection.connection instanceof ConnectionPointer
            ? identifiedConnection.connection.packageableConnection.value
                .connectionValue
            : identifiedConnection.connection;
        const engineConfig =
          this.editorStore.graphState.graphManager.getEngineConfig();

        if (connection instanceof JsonModelConnection) {
          newRuntime.addIdentifiedConnection(
            new IdentifiedConnection(
              newRuntime.generateIdentifiedConnectionId(),
              new JsonModelConnection(
                PackageableElementExplicitReference.create(
                  this.editorStore.graphState.graph.modelStore,
                ),
                connection.class,
                createUrlStringFromData(
                  /* @MARKER: Workaround for https://github.com/finos/legend-studio/issues/68 */
                  tryToMinifyLosslessJSONString(testData),
                  JsonModelConnection.CONTENT_TYPE,
                  engineConfig.useBase64ForAdhocConnectionDataUrls,
                ),
              ),
            ),
          );
        } else if (connection instanceof XmlModelConnection) {
          newRuntime.addIdentifiedConnection(
            new IdentifiedConnection(
              newRuntime.generateIdentifiedConnectionId(),
              new XmlModelConnection(
                PackageableElementExplicitReference.create(
                  this.editorStore.graphState.graph.modelStore,
                ),
                connection.class,
                createUrlStringFromData(
                  testData,
                  XmlModelConnection.CONTENT_TYPE,
                  engineConfig.useBase64ForAdhocConnectionDataUrls,
                ),
              ),
            ),
          );
        } else if (connection instanceof FlatDataConnection) {
          newRuntime.addIdentifiedConnection(
            new IdentifiedConnection(
              newRuntime.generateIdentifiedConnectionId(),
              new FlatDataConnection(
                PackageableElementExplicitReference.create(
                  connection.flatDataStore,
                ),
                createUrlStringFromData(
                  testData,
                  FlatDataConnection.CONTENT_TYPE,
                  engineConfig.useBase64ForAdhocConnectionDataUrls,
                ),
              ),
            ),
          );
        } else if (connection instanceof RelationalDatabaseConnection) {
          newRuntime.addIdentifiedConnection(
            new IdentifiedConnection(
              newRuntime.generateIdentifiedConnectionId(),
              new RelationalDatabaseConnection(
                PackageableElementExplicitReference.create(connection.database),
                // TODO: hard-coded this combination for now, we might want to change to something that makes more sense?
                DatabaseType.H2,
                new StaticDatasourceSpecification('dummyHost', 80, 'myDb'),
                new DefaultH2AuthenticationStrategy(),
              ),
            ),
          );
        } else {
          throw new UnsupportedOperationError(
            `Can't decorate with test data connection of type '${
              getClass(connection).name
            }'`,
          );
        }
      });
    });
    return newRuntime;
  };

  generateAssertion = flow(function* (this: TestContainerState) {
    try {
      this.isGeneratingTestAssertion = true;
      const execution = this.serviceEditorState.service.execution;
      const test = this.serviceEditorState.service.test;
      if (
        execution instanceof PureSingleExecution &&
        test instanceof SingleExecutionTest
      ) {
        const decoratedRuntime =
          this.decorateRuntimeIdentifiedConnectionsWithTestData(
            execution.runtime,
            test.data,
          );
        const result =
          (yield this.editorStore.graphState.graphManager.executeMapping(
            this.serviceEditorState.editorStore.graphState.graph,
            execution.mapping.value,
            execution.func,
            decoratedRuntime,
            CLIENT_VERSION.VX_X_X,
            true,
          )) as unknown as ExecutionResult;
        this.setAssertionData(
          /* @MARKER: Workaround for https://github.com/finos/legend-studio/issues/68 */
          tryToFormatLosslessJSONString(
            losslessStringify(result.values, undefined, TAB_SIZE),
          ),
        );
        this.updateTestAssert();
      } else {
        throw new UnsupportedOperationError();
      }
    } catch (error: unknown) {
      this.setAssertionData(tryToFormatJSONString('{}'));
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SERVICE_TEST_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isGeneratingTestAssertion = false;
    }
  });

  fetchActualResultForComparison = flow(function* (this: TestContainerState) {
    try {
      this.isFetchingActualResultForComparison = true;
      const execution = this.serviceEditorState.service.execution;
      const test = this.serviceEditorState.service.test;
      if (
        execution instanceof PureSingleExecution &&
        test instanceof SingleExecutionTest
      ) {
        const decoratedRuntime =
          this.decorateRuntimeIdentifiedConnectionsWithTestData(
            execution.runtime,
            test.data,
          );
        const result =
          (yield this.editorStore.graphState.graphManager.executeMapping(
            this.serviceEditorState.editorStore.graphState.graph,
            execution.mapping.value,
            execution.func,
            decoratedRuntime,
            CLIENT_VERSION.VX_X_X,
            true,
          )) as unknown as ExecutionResult;
        this.setTestExecutionResultText({
          expected: this.assertionData ?? '',
          /* @MARKER: Workaround for https://github.com/finos/legend-studio/issues/68 */
          actual: tryToFormatLosslessJSONString(
            losslessStringify(result.values),
          ),
        });
      } else {
        throw new UnsupportedOperationError();
      }
    } catch (error: unknown) {
      this.setTestExecutionResultText(undefined);
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SERVICE_TEST_PROBLEM,
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isFetchingActualResultForComparison = false;
    }
  });
}

export class SingleExecutionTestState {
  editorStore: EditorStore;
  serviceEditorState: ServiceEditorState;
  test: SingleExecutionTest;
  selectedTestContainerState?: TestContainerState;
  isRunningAllTests = false;
  isGeneratingTestData = false;
  testSuiteRunError?: Error;
  testResults: ServiceTestResult[] = [];
  allTestRunTime = 0;

  constructor(
    editorStore: EditorStore,
    serviceEditorState: ServiceEditorState,
  ) {
    makeObservable(this, {
      test: observable,
      selectedTestContainerState: observable,
      isRunningAllTests: observable,
      isGeneratingTestData: observable,
      testSuiteRunError: observable,
      testResults: observable,
      allTestRunTime: observable,
      setSelectedTestContainerState: action,
      setTestResults: action,
      addNewTestContainer: action,
      deleteTestContainerState: action,
      openTestContainer: action,
      testSuiteResult: computed,
    });

    this.editorStore = editorStore;
    this.serviceEditorState = serviceEditorState;
    this.test = guaranteeType(
      serviceEditorState.service.test,
      SingleExecutionTest,
    );
    this.selectedTestContainerState = this.test.asserts.length
      ? new TestContainerState(
          editorStore,
          this.test.asserts[0],
          serviceEditorState,
          this,
        )
      : undefined;
  }

  setSelectedTestContainerState(testContainerState?: TestContainerState): void {
    this.selectedTestContainerState = testContainerState;
  }
  setTestResults(assertResults: ServiceTestResult[]): void {
    this.testResults = assertResults;
  }

  addNewTestContainer(): void {
    const testContainer = new TestContainer(
      this.editorStore.graphState.graphManager.HACKY_createAssertLambda('{}'),
      this.test,
    );
    this.test.addAssert(testContainer);
    this.openTestContainer(testContainer);
    this.allTestRunTime = 0;
  }

  deleteTestContainerState(val: TestContainer): void {
    const idx = this.test.asserts.findIndex((assert) => assert === val);
    if (idx !== -1) {
      this.test.deleteAssert(val);
      this.testResults.splice(idx, 1);
      this.allTestRunTime = 0;
    }
    if (this.selectedTestContainerState?.testContainer === val) {
      this.setSelectedTestContainerState(undefined);
    }
  }

  openTestContainer(testContainter: TestContainer): void {
    this.selectedTestContainerState = new TestContainerState(
      this.editorStore,
      testContainter,
      this.serviceEditorState,
      this,
    );
  }

  get testSuiteResult(): TEST_RESULT {
    const results = this.testResults.every(
      (assertResult) => assertResult.result === true,
    );
    return !this.testResults.length
      ? TEST_RESULT.NONE
      : results
      ? TEST_RESULT.PASSED
      : TEST_RESULT.FAILED;
  }

  generateSeedTestData = flow(function* (
    this: SingleExecutionTestState,
  ): GeneratorFn<undefined | string> {
    const executionInput =
      this.serviceEditorState.executionState.serviceExecutionParameters;
    if (executionInput) {
      try {
        return (yield this.editorStore.graphState.graphManager.generateTestData(
          this.editorStore.graphState.graph,
          executionInput.mapping,
          executionInput.query,
          executionInput.runtime,
          CLIENT_VERSION.VX_X_X,
        )) as string;
      } catch (error: unknown) {
        this.editorStore.applicationStore.logger.error(
          CORE_LOG_EVENT.EXECUTION_PROBLEM,
          error,
        );
        return undefined;
      }
    }
    return undefined;
  });

  // Note: We attempt to use the exec endpoint to generate test data.
  // Once all types of generate data are supported we will move to just using the exec endpoint
  generateTestData = flow(function* (this: SingleExecutionTestState) {
    this.isGeneratingTestData = true;
    const generatedTestData = (yield this.generateSeedTestData()) as unknown as
      | string
      | undefined;
    if (generatedTestData) {
      this.test.setData(generatedTestData);
    } else {
      const testDataGenerationInput =
        this.serviceEditorState.executionState.getTestDataGenerationInput();
      if (testDataGenerationInput) {
        const [target, mapping] = testDataGenerationInput;
        const sources = target
          ? uniq(
              mapping
                .getAllMappingElements()
                .filter(
                  (mappingElement) =>
                    getMappingElementTarget(mappingElement) === target,
                )
                .map(getMappingElementSource)
                .filter(isNonNullable),
            )
          : [];
        if (sources.length) {
          if (sources.length > 1) {
            // TODO: support multi store generation (might be server's work)
            this.test.setData('');
            this.editorStore.applicationStore.notifyError(
              'generating test data for multiple stores is currently not supported',
            );
          } else {
            const sourceToGenerate = sources[0];
            /* @MARKER: NEW CONNECTION TYPE SUPPORT --- consider adding connection type handler here whenever support for a new one is added to the app */
            if (sourceToGenerate instanceof Class) {
              // TODO: create mock data based on the content type
              this.test.setData(
                createMockDataForMappingElementSource(
                  sourceToGenerate,
                  this.editorStore,
                ),
              );
            } else {
              // TODO: add flat-data when we're ready
              this.test.setData('');
              this.editorStore.applicationStore.notifyError(
                'Unable to generate test data',
              );
            }
          }
        } else {
          this.test.setData('');
          this.editorStore.applicationStore.notifyError(
            'Unable to generate test data',
          );
        }
      }
    }
    this.isGeneratingTestData = false;
  });

  runTestSuite = flow(function* (this: SingleExecutionTestState) {
    const startTime = Date.now();
    try {
      this.testSuiteRunError = undefined;
      this.allTestRunTime = 0;
      this.isRunningAllTests = true;
      this.setTestResults([]);
      const results =
        (yield this.editorStore.graphState.graphManager.runServiceTests(
          this.serviceEditorState.service,
          this.serviceEditorState.editorStore.graphState.graph,
        )) as ServiceTestResult[];
      this.setTestResults(results);
    } catch (error: unknown) {
      this.testSuiteRunError = error as Error;
      this.setTestResults(
        this.test.asserts.map((assert, idx) => ({
          name: `test_${idx + 1}`,
          result: false,
        })),
      );
      this.editorStore.applicationStore.logger.error(
        CORE_LOG_EVENT.SERVICE_TEST_PROBLEM,
        error,
      );
    } finally {
      this.allTestRunTime = Date.now() - startTime;
      this.isRunningAllTests = false;
    }
  });

  get execution(): PureSingleExecution {
    return guaranteeType(
      this.serviceEditorState.service.execution,
      PureSingleExecution,
      'Service with single execution test must have single execution',
    );
  }
}

export class KeyedSingleExecutionState extends SingleExecutionTestState {
  uuid = uuid();
  declare test: KeyedSingleExecutionTest;

  constructor(
    editorStore: EditorStore,
    keyedSingleExecution: KeyedSingleExecutionTest,
    serviceEditorState: ServiceEditorState,
  ) {
    super(editorStore, serviceEditorState);

    this.test = keyedSingleExecution;
  }
}
