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
import { TEST_RESULT } from '../../../editor-state/element-editor-state/mapping/MappingTestState';
import { STUDIO_LOG_EVENT } from '../../../../stores/StudioLogEvent';
import type { GeneratorFn } from '@finos/legend-shared';
import {
  assertErrorThrown,
  LogEvent,
  losslessStringify,
  uuid,
  guaranteeType,
  UnsupportedOperationError,
  tryToMinifyLosslessJSONString,
  tryToFormatLosslessJSONString,
  tryToFormatJSONString,
  fromGrammarString,
  createUrlStringFromData,
} from '@finos/legend-shared';
import type { EditorStore } from '../../../EditorStore';
import type {
  ServiceTestResult,
  KeyedSingleExecutionTest,
  Runtime,
  ExecutionResult,
  Connection,
} from '@finos/legend-graph';
import {
  extractExecutionResultValues,
  GRAPH_MANAGER_LOG_EVENT,
  TestContainer,
  SingleExecutionTest,
  PureSingleExecution,
  IdentifiedConnection,
  EngineRuntime,
  RuntimePointer,
  JsonModelConnection,
  XmlModelConnection,
  FlatDataConnection,
  RelationalDatabaseConnection,
  DatabaseType,
  StaticDatasourceSpecification,
  DefaultH2AuthenticationStrategy,
  ConnectionPointer,
  PackageableElementExplicitReference,
  PureClientVersion,
} from '@finos/legend-graph';
import { TAB_SIZE } from '@finos/legend-application';
import type { DSLMapping_StudioPlugin_Extension } from '../../../DSLMapping_StudioPlugin_Extension';

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
  assertionData?: string | undefined;
  testPassed?: boolean | undefined;
  textExecutionTextResult?: ServiceTestExecutionResult | undefined; // NOTE: this is lossless JSON strings
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
      generateAssertion: flow,
      fetchActualResultForComparison: flow,
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
        this.editorStore.graphManagerState.graphManager.HACKY_createServiceTestAssertLambda(
          /* @MARKER: Workaround for https://github.com/finos/legend-studio/issues/68 */
          tryToMinifyLosslessJSONString(this.assertionData),
        );
    }
  }

  private initializeAssertionData(testContainter: TestContainer): void {
    const expectedResultAssertionString =
      this.editorStore.graphManagerState.graphManager.HACKY_extractServiceTestAssertionData(
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
    runtimeValue.connections.forEach((storeConnections) => {
      storeConnections.storeConnections.forEach((identifiedConnection) => {
        const connection =
          identifiedConnection.connection instanceof ConnectionPointer
            ? identifiedConnection.connection.packageableConnection.value
                .connectionValue
            : identifiedConnection.connection;
        const engineConfig =
          this.editorStore.graphManagerState.graphManager.TEMP__getEngineConfig();

        if (connection instanceof JsonModelConnection) {
          newRuntime.addIdentifiedConnection(
            new IdentifiedConnection(
              newRuntime.generateIdentifiedConnectionId(),
              new JsonModelConnection(
                PackageableElementExplicitReference.create(
                  this.editorStore.graphManagerState.graph.modelStore,
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
                  this.editorStore.graphManagerState.graph.modelStore,
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
          let testConnection: Connection | undefined;
          const extraServiceTestRuntimeConnectionBuilders =
            this.editorStore.pluginManager
              .getStudioPlugins()
              .flatMap(
                (plugin) =>
                  (
                    plugin as DSLMapping_StudioPlugin_Extension
                  ).TEMP__getExtraServiceTestRuntimeConnectionBuilders?.() ??
                  [],
              );
          for (const builder of extraServiceTestRuntimeConnectionBuilders) {
            testConnection = builder(connection, newRuntime, testData);
            if (testConnection) {
              break;
            }
          }
          if (testConnection) {
            newRuntime.addIdentifiedConnection(
              new IdentifiedConnection(
                newRuntime.generateIdentifiedConnectionId(),
                testConnection,
              ),
            );
          } else {
            throw new UnsupportedOperationError(
              `Can't build service test runtime connection: no compatible builder available from plugins`,
              connection,
            );
          }
        }
      });
    });
    return newRuntime;
  };

  *generateAssertion(): GeneratorFn<void> {
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
          (yield this.editorStore.graphManagerState.graphManager.executeMapping(
            this.serviceEditorState.editorStore.graphManagerState.graph,
            execution.mapping.value,
            execution.func,
            decoratedRuntime,
            PureClientVersion.VX_X_X,
            true,
          )) as ExecutionResult;
        this.setAssertionData(
          /* @MARKER: Workaround for https://github.com/finos/legend-studio/issues/68 */
          tryToFormatLosslessJSONString(
            losslessStringify(
              extractExecutionResultValues(result),
              undefined,
              TAB_SIZE,
            ),
          ),
        );
        this.updateTestAssert();
      } else {
        throw new UnsupportedOperationError();
      }
    } catch (error) {
      assertErrorThrown(error);
      this.setAssertionData(tryToFormatJSONString('{}'));
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SERVICE_TEST_RUNNER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isGeneratingTestAssertion = false;
    }
  }

  *fetchActualResultForComparison(): GeneratorFn<void> {
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
          (yield this.editorStore.graphManagerState.graphManager.executeMapping(
            this.serviceEditorState.editorStore.graphManagerState.graph,
            execution.mapping.value,
            execution.func,
            decoratedRuntime,
            PureClientVersion.VX_X_X,
            true,
          )) as ExecutionResult;
        this.setTestExecutionResultText({
          expected: this.assertionData ?? '',
          /* @MARKER: Workaround for https://github.com/finos/legend-studio/issues/68 */
          actual: tryToFormatLosslessJSONString(
            losslessStringify(extractExecutionResultValues(result)),
          ),
        });
      } else {
        throw new UnsupportedOperationError();
      }
    } catch (error) {
      assertErrorThrown(error);
      this.setTestExecutionResultText(undefined);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SERVICE_TEST_RUNNER_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    } finally {
      this.isFetchingActualResultForComparison = false;
    }
  }
}

export class SingleExecutionTestState {
  editorStore: EditorStore;
  serviceEditorState: ServiceEditorState;
  test: SingleExecutionTest;
  selectedTestContainerState?: TestContainerState | undefined;
  isRunningAllTests = false;
  isGeneratingTestData = false;
  testSuiteRunError?: Error | undefined;
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
      testSuiteResult: computed,
      setSelectedTestContainerState: action,
      setTestResults: action,
      addNewTestContainer: action,
      deleteTestContainerState: action,
      openTestContainer: action,
      generateTestData: flow,
      runTestSuite: flow,
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
      this.editorStore.graphManagerState.graphManager.HACKY_createServiceTestAssertLambda(
        '{}',
      ),
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

  *generateTestData(): GeneratorFn<void> {
    this.isGeneratingTestData = true;
    // NOTE: here, we attempt to use engine to generate test data.
    // Once all types of generate data are supported we will move to just using engine
    let generatedTestData: string | undefined = undefined;
    const executionInput =
      this.serviceEditorState.executionState.serviceExecutionParameters;
    if (executionInput) {
      try {
        generatedTestData =
          (yield this.editorStore.graphManagerState.graphManager.generateMappingTestData(
            this.editorStore.graphManagerState.graph,
            executionInput.mapping,
            executionInput.query,
            executionInput.runtime,
            PureClientVersion.VX_X_X,
          )) as string;
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.log.error(
          LogEvent.create(GRAPH_MANAGER_LOG_EVENT.EXECUTION_FAILURE),
          error,
        );
      }
    }
    if (generatedTestData) {
      this.test.setData(generatedTestData);
    } else {
      this.test.setData('');
      this.editorStore.applicationStore.notifyError(
        `Can't auto-generate test data for service`,
      );
    }
    this.isGeneratingTestData = false;
  }

  *runTestSuite(): GeneratorFn<void> {
    const startTime = Date.now();
    try {
      this.testSuiteRunError = undefined;
      this.allTestRunTime = 0;
      this.isRunningAllTests = true;
      this.setTestResults([]);
      const results =
        (yield this.editorStore.graphManagerState.graphManager.runServiceTests(
          this.serviceEditorState.service,
          this.serviceEditorState.editorStore.graphManagerState.graph,
        )) as ServiceTestResult[];
      this.setTestResults(results);
    } catch (error) {
      assertErrorThrown(error);
      this.testSuiteRunError = error;
      this.setTestResults(
        this.test.asserts.map((assert, idx) => ({
          name: `test_${idx + 1}`,
          result: false,
        })),
      );
      this.editorStore.applicationStore.log.error(
        LogEvent.create(STUDIO_LOG_EVENT.SERVICE_TEST_RUNNER_FAILURE),
        error,
      );
    } finally {
      this.allTestRunTime = Date.now() - startTime;
      this.isRunningAllTests = false;
    }
  }

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
