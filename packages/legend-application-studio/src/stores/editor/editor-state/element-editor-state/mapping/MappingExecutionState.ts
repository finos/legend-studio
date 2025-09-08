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
  type MappingEditorState,
  getMappingElementSource,
  getMappingElementTarget,
  generateMappingTestName,
} from './MappingEditorState.js';
import type { EditorStore } from '../../../EditorStore.js';
import {
  observable,
  action,
  flow,
  computed,
  makeObservable,
  flowResult,
} from 'mobx';
import {
  type GeneratorFn,
  assertErrorThrown,
  LogEvent,
  guaranteeNonNullable,
  assertTrue,
  IllegalStateError,
  UnsupportedOperationError,
  uuid,
  tryToMinifyJSONString,
  toGrammarString,
  isValidJSONString,
  createUrlStringFromData,
  stringifyLosslessJSON,
  guaranteeType,
  ContentType,
  generateEnumerableNameFromToken,
  tryToFormatLosslessJSONString,
  StopWatch,
} from '@finos/legend-shared';
import { createMockDataForMappingElementSource } from '../../../utils/MockDataUtils.js';
import {
  type DEPRECATED__InputData,
  type Mapping,
  type Connection,
  type SetImplementation,
  type Table,
  type View,
  type RawLambda,
  type RawExecutionPlan,
  type EmbeddedData,
  type TestAssertion,
  type ExecutionResultWithMetadata,
  DEFAULT_TEST_ASSERTION_PREFIX,
  DEFAULT_TEST_PREFIX,
  EqualToJson,
  ServiceTest,
  LAMBDA_PIPE,
  GRAPH_MANAGER_EVENT,
  Class,
  DEPRECATED__ObjectInputData,
  ObjectInputType,
  DEPRECATED__ExpectedOutputMappingTestAssert,
  IdentifiedConnection,
  EngineRuntime,
  JsonModelConnection,
  FlatDataConnection,
  FlatDataInputData,
  Service,
  PureSingleExecution,
  RootFlatDataRecordType,
  PackageableElementExplicitReference,
  DatabaseType,
  RelationalDatabaseConnection,
  LocalH2DatasourceSpecification,
  DefaultH2AuthenticationStrategy,
  RelationalInputData,
  RelationalInputType,
  OperationSetImplementation,
  buildSourceInformationSourceId,
  TableAlias,
  stub_RawLambda,
  isStubbed_RawLambda,
  generateIdentifiedConnectionId,
  ServiceTestSuite,
  TestData,
  ConnectionTestData,
  DEFAULT_TEST_SUITE_PREFIX,
  DEPRECATED__MappingTest,
  ModelStore,
  reportGraphAnalytics,
} from '@finos/legend-graph';
import {
  ActionAlertActionType,
  ActionAlertType,
  DEFAULT_TAB_SIZE,
} from '@finos/legend-application';
import {
  objectInputData_setData,
  runtime_addIdentifiedConnection,
  runtime_addMapping,
} from '../../../../graph-modifier/DSL_Mapping_GraphModifierHelper.js';
import { flatData_setData } from '../../../../graph-modifier/STO_FlatData_GraphModifierHelper.js';
import {
  service_addTestSuite,
  service_initNewService,
  service_setExecution,
} from '../../../../graph-modifier/DSL_Service_GraphModifierHelper.js';
import {
  localH2DatasourceSpecification_setTestDataSetupCsv,
  localH2DatasourceSpecification_setTestDataSetupSqls,
  relationalInputData_setData,
} from '../../../../graph-modifier/STO_Relational_GraphModifierHelper.js';
import {
  createEmptyEqualToJsonAssertion,
  createBareExternalFormat,
} from '../../../utils/TestableUtils.js';
import { SERIALIZATION_FORMAT } from '../service/testable/ServiceTestEditorState.js';
import {
  LambdaEditorState,
  QueryBuilderTelemetryHelper,
  QUERY_BUILDER_EVENT,
  ExecutionPlanState,
} from '@finos/legend-query-builder';
import { MappingEditorTabState } from './MappingTabManagerState.js';

export class MappingExecutionQueryState extends LambdaEditorState {
  editorStore: EditorStore;
  isInitializingLambda = false;
  query: RawLambda;

  constructor(editorStore: EditorStore, query: RawLambda) {
    super('', LAMBDA_PIPE);

    makeObservable(this, {
      query: observable,
      isInitializingLambda: observable,
      setIsInitializingLambda: action,
      updateLamba: flow,
    });

    this.editorStore = editorStore;
    this.query = query;
  }

  get lambdaId(): string {
    return buildSourceInformationSourceId([this.uuid]);
  }

  setIsInitializingLambda(val: boolean): void {
    this.isInitializingLambda = val;
  }

  *updateLamba(val: RawLambda): GeneratorFn<void> {
    this.query = val;
    yield flowResult(this.convertLambdaObjectToGrammarString({ pretty: true }));
  }

  *convertLambdaObjectToGrammarString(options?: {
    pretty?: boolean | undefined;
  }): GeneratorFn<void> {
    if (!isStubbed_RawLambda(this.query)) {
      try {
        const lambdas = new Map<string, RawLambda>();
        lambdas.set(this.lambdaId, this.query);
        const isolatedLambdas =
          (yield this.editorStore.graphManagerState.graphManager.lambdasToPureCode(
            lambdas,
            options?.pretty,
          )) as Map<string, string>;
        const grammarText = isolatedLambdas.get(this.lambdaId);
        this.setLambdaString(
          grammarText !== undefined
            ? this.extractLambdaString(grammarText)
            : '',
        );
        this.clearErrors();
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.PARSING_FAILURE),
          error,
        );
      }
    } else {
      this.clearErrors();
      this.setLambdaString('');
    }
  }

  // NOTE: since we don't allow edition in text mode, we don't need to implement this
  *convertLambdaGrammarStringToObject(): GeneratorFn<void> {
    throw new UnsupportedOperationError();
  }
}

abstract class MappingExecutionInputDataState {
  readonly uuid = uuid();
  editorStore: EditorStore;
  mapping: Mapping;
  inputData?: DEPRECATED__InputData | undefined;

  constructor(
    editorStore: EditorStore,
    mapping: Mapping,
    inputData: DEPRECATED__InputData | undefined,
  ) {
    this.editorStore = editorStore;
    this.mapping = mapping;
    this.inputData = inputData;
  }

  abstract get isValid(): boolean;
  abstract get runtime(): EngineRuntime;

  createEmbeddedData(): EmbeddedData | undefined {
    return undefined;
  }

  createAssertion(executionResult: string): TestAssertion | undefined {
    return undefined;
  }

  abstract buildInputDataForTest(): DEPRECATED__InputData;
}

export const createRuntimeForExecution = (
  mapping: Mapping,
  connection: Connection,
  editorStore: EditorStore,
): EngineRuntime => {
  const runtime = new EngineRuntime();
  runtime_addMapping(
    runtime,
    PackageableElementExplicitReference.create(mapping),
  );
  runtime_addIdentifiedConnection(
    runtime,
    new IdentifiedConnection(
      generateIdentifiedConnectionId(runtime),
      connection,
    ),
    editorStore.changeDetectionState.observerContext,
  );
  return runtime;
};

export class MappingExecutionEmptyInputDataState extends MappingExecutionInputDataState {
  get isValid(): boolean {
    return false;
  }

  get runtime(): EngineRuntime {
    throw new IllegalStateError(
      'Mapping execution runtime information is not specified',
    );
  }

  buildInputDataForTest(): DEPRECATED__InputData {
    throw new IllegalStateError(
      'Mapping execution runtime information is not specified',
    );
  }
}

// TODO?: handle XML
export class MappingExecutionObjectInputDataState extends MappingExecutionInputDataState {
  declare inputData: DEPRECATED__ObjectInputData;

  constructor(editorStore: EditorStore, mapping: Mapping, _class: Class) {
    super(
      editorStore,
      mapping,
      new DEPRECATED__ObjectInputData(
        PackageableElementExplicitReference.create(
          guaranteeNonNullable(_class),
        ),
        ObjectInputType.JSON,
        tryToMinifyJSONString('{}'),
      ),
    );

    makeObservable(this, {
      isValid: computed,
    });
  }

  get isValid(): boolean {
    return isValidJSONString(this.inputData.data);
  }

  get runtime(): EngineRuntime {
    assertTrue(
      this.isValid,
      'Model-to-model mapping execution test data is not a valid JSON string',
    );
    const engineConfig =
      this.editorStore.graphManagerState.graphManager.TEMPORARY__getEngineConfig();
    return createRuntimeForExecution(
      this.mapping,
      new JsonModelConnection(
        PackageableElementExplicitReference.create(ModelStore.INSTANCE),
        PackageableElementExplicitReference.create(
          guaranteeNonNullable(this.inputData.sourceClass.value),
        ),
        createUrlStringFromData(
          tryToMinifyJSONString(this.inputData.data),
          ContentType.APPLICATION_JSON,
          engineConfig.useBase64ForAdhocConnectionDataUrls,
        ),
      ),
      this.editorStore,
    );
  }

  override createEmbeddedData(): EmbeddedData | undefined {
    const embeddedData = createBareExternalFormat();
    embeddedData.data = tryToFormatLosslessJSONString(
      tryToMinifyJSONString(this.inputData.data),
    );
    return embeddedData;
  }

  override createAssertion(executionResult: string): TestAssertion | undefined {
    const jsonAssertion = new EqualToJson();
    jsonAssertion.id = generateEnumerableNameFromToken(
      [],
      DEFAULT_TEST_ASSERTION_PREFIX,
    );
    const expected = createBareExternalFormat();
    expected.data = toGrammarString(executionResult);
    jsonAssertion.expected = expected;
    return jsonAssertion;
  }

  buildInputDataForTest(): DEPRECATED__InputData {
    return new DEPRECATED__ObjectInputData(
      PackageableElementExplicitReference.create(
        guaranteeNonNullable(this.inputData.sourceClass.value),
      ),
      this.inputData.inputType,
      tryToMinifyJSONString(this.inputData.data),
    );
  }
}

export class MappingExecutionFlatDataInputDataState extends MappingExecutionInputDataState {
  declare inputData: FlatDataInputData;

  constructor(
    editorStore: EditorStore,
    mapping: Mapping,
    rootFlatDataRecordType: RootFlatDataRecordType,
  ) {
    super(
      editorStore,
      mapping,
      new FlatDataInputData(
        PackageableElementExplicitReference.create(
          guaranteeNonNullable(rootFlatDataRecordType._OWNER._OWNER),
        ),
        '',
      ),
    );

    makeObservable(this, {
      isValid: computed,
    });
  }

  get isValid(): boolean {
    return true;
  }

  get runtime(): EngineRuntime {
    const engineConfig =
      this.editorStore.graphManagerState.graphManager.TEMPORARY__getEngineConfig();
    return createRuntimeForExecution(
      this.mapping,
      new FlatDataConnection(
        PackageableElementExplicitReference.create(
          guaranteeNonNullable(this.inputData.sourceFlatData.value),
        ),
        createUrlStringFromData(
          this.inputData.data,
          ContentType.TEXT_PLAIN,
          engineConfig.useBase64ForAdhocConnectionDataUrls,
        ),
      ),
      this.editorStore,
    );
  }

  buildInputDataForTest(): DEPRECATED__InputData {
    return new FlatDataInputData(
      PackageableElementExplicitReference.create(
        guaranteeNonNullable(this.inputData.sourceFlatData.value),
      ),
      this.inputData.data,
    );
  }
}

export class MappingExecutionRelationalInputDataState extends MappingExecutionInputDataState {
  declare inputData: RelationalInputData;

  constructor(
    editorStore: EditorStore,
    mapping: Mapping,
    tableOrView: Table | View,
  ) {
    super(
      editorStore,
      mapping,
      new RelationalInputData(
        PackageableElementExplicitReference.create(
          guaranteeNonNullable(tableOrView.schema._OWNER),
        ),
        '',
        RelationalInputType.SQL,
      ),
    );

    makeObservable(this, {
      isValid: computed,
    });
  }

  get isValid(): boolean {
    return true;
  }

  get runtime(): EngineRuntime {
    const datasourceSpecification = new LocalH2DatasourceSpecification();
    switch (this.inputData.inputType) {
      case RelationalInputType.SQL:
        localH2DatasourceSpecification_setTestDataSetupSqls(
          datasourceSpecification,
          // NOTE: this is a gross simplification of handling the input for relational input data
          [this.inputData.data],
        );
        break;
      case RelationalInputType.CSV:
        localH2DatasourceSpecification_setTestDataSetupCsv(
          datasourceSpecification,
          this.inputData.data,
        );
        break;
      default:
        throw new UnsupportedOperationError(`Invalid input data type`);
    }
    return createRuntimeForExecution(
      this.mapping,
      new RelationalDatabaseConnection(
        PackageableElementExplicitReference.create(
          guaranteeNonNullable(this.inputData.database.value),
        ),
        DatabaseType.H2,
        datasourceSpecification,
        new DefaultH2AuthenticationStrategy(),
      ),
      this.editorStore,
    );
  }

  buildInputDataForTest(): DEPRECATED__InputData {
    return new RelationalInputData(
      PackageableElementExplicitReference.create(
        guaranteeNonNullable(this.inputData.database.value),
      ),
      this.inputData.data,
      this.inputData.inputType,
    );
  }
}

export class MappingExecutionState extends MappingEditorTabState {
  readonly editorStore: EditorStore;
  readonly mappingEditorState: MappingEditorState;

  name: string;
  queryState: MappingExecutionQueryState;
  inputDataState: MappingExecutionInputDataState;
  showServicePathModal = false;

  executionResultText?: string | undefined; // NOTE: stored as lossless JSON text
  isExecuting = false;
  isGeneratingPlan = false;
  executionPlanState: ExecutionPlanState;
  planGenerationDebugText?: string | undefined;
  executionRunPromise: Promise<ExecutionResultWithMetadata> | undefined =
    undefined;

  constructor(
    editorStore: EditorStore,
    mappingEditorState: MappingEditorState,
    name: string,
  ) {
    super();

    makeObservable(this, {
      name: observable,
      queryState: observable,
      inputDataState: observable,
      showServicePathModal: observable,
      executionPlanState: observable,
      isExecuting: observable,
      isGeneratingPlan: observable,
      planGenerationDebugText: observable,
      executionRunPromise: observable,
      setExecutionRunPromise: action,
      setQueryState: action,
      setInputDataState: action,
      setExecutionResultText: action,
      setShowServicePathModal: action,
      setPlanGenerationDebugText: action,
      setInputDataStateBasedOnSource: action,
      reset: action,
      promoteToTest: flow,
      promoteToService: flow,
      cancelExecution: flow,
      executeMapping: flow,
      generatePlan: flow,
      buildQueryWithClassMapping: flow,
    });

    this.editorStore = editorStore;
    this.mappingEditorState = mappingEditorState;
    this.name = name;
    this.queryState = new MappingExecutionQueryState(
      editorStore,
      stub_RawLambda(),
    );
    this.inputDataState = new MappingExecutionEmptyInputDataState(
      editorStore,
      mappingEditorState.mapping,
      undefined,
    );
    this.executionPlanState = new ExecutionPlanState(
      this.editorStore.applicationStore,
      this.editorStore.graphManagerState,
    );
  }

  get label(): string {
    return this.name;
  }

  setExecutionRunPromise(
    promise: Promise<ExecutionResultWithMetadata> | undefined,
  ): void {
    this.executionRunPromise = promise;
  }

  setQueryState(val: MappingExecutionQueryState): void {
    this.queryState = val;
  }

  setInputDataState(val: MappingExecutionInputDataState): void {
    this.inputDataState = val;
  }

  setExecutionResultText(val: string | undefined): void {
    this.executionResultText = val;
  }

  setShowServicePathModal(val: boolean): void {
    this.showServicePathModal = val;
  }

  setPlanGenerationDebugText(val: string | undefined): void {
    this.planGenerationDebugText = val;
  }

  reset(): void {
    this.queryState = new MappingExecutionQueryState(
      this.editorStore,
      stub_RawLambda(),
    );
    this.inputDataState = new MappingExecutionEmptyInputDataState(
      this.editorStore,
      this.mappingEditorState.mapping,
      undefined,
    );
    this.setExecutionResultText(undefined);
  }

  setInputDataStateBasedOnSource(
    source: unknown,
    populateWithMockData: boolean,
  ): void {
    if (source instanceof Class) {
      const newRuntimeState = new MappingExecutionObjectInputDataState(
        this.editorStore,
        this.mappingEditorState.mapping,
        source,
      );
      if (populateWithMockData) {
        objectInputData_setData(
          newRuntimeState.inputData,
          createMockDataForMappingElementSource(source, this.editorStore),
        );
      }
      this.setInputDataState(newRuntimeState);
    } else if (source instanceof RootFlatDataRecordType) {
      const newRuntimeState = new MappingExecutionFlatDataInputDataState(
        this.editorStore,
        this.mappingEditorState.mapping,
        source,
      );
      if (populateWithMockData) {
        flatData_setData(
          newRuntimeState.inputData,
          createMockDataForMappingElementSource(source, this.editorStore),
        );
      }
      this.setInputDataState(newRuntimeState);
    } else if (source instanceof TableAlias) {
      const newRuntimeState = new MappingExecutionRelationalInputDataState(
        this.editorStore,
        this.mappingEditorState.mapping,
        source.relation.value,
      );
      if (populateWithMockData) {
        relationalInputData_setData(
          newRuntimeState.inputData,
          createMockDataForMappingElementSource(source, this.editorStore),
        );
      }
      this.setInputDataState(newRuntimeState);
    } else if (source === undefined) {
      this.setInputDataState(
        new MappingExecutionEmptyInputDataState(
          this.editorStore,
          this.mappingEditorState.mapping,
          undefined,
        ),
      );
    } else {
      this.editorStore.applicationStore.notificationService.notifyWarning(
        new UnsupportedOperationError(
          `Can't build input data for the specified source`,
          source,
        ),
      );
    }
  }

  *promoteToTest(): GeneratorFn<void> {
    try {
      const query = this.queryState.query;
      if (
        !isStubbed_RawLambda(this.queryState.query) &&
        this.inputDataState.isValid &&
        this.inputDataState.inputData &&
        this.executionResultText
      ) {
        const inputData = this.inputDataState.buildInputDataForTest();
        const assert = new DEPRECATED__ExpectedOutputMappingTestAssert(
          toGrammarString(this.executionResultText),
        );
        const mappingTest = new DEPRECATED__MappingTest(
          generateMappingTestName(this.mappingEditorState.mapping),
          query,
          [inputData],
          assert,
        );
        yield flowResult(this.mappingEditorState.addTest(mappingTest));
        this.mappingEditorState.closeTab(this); // after promoting to test, remove the execution state
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    }
  }

  *promoteToService(
    packagePath: string,
    serviceName: string,
  ): GeneratorFn<void> {
    try {
      const query = this.queryState.query;
      if (
        !isStubbed_RawLambda(this.queryState.query) &&
        this.inputDataState.isValid &&
        this.executionResultText
      ) {
        if (
          this.inputDataState instanceof MappingExecutionObjectInputDataState
        ) {
          const service = new Service(serviceName);
          const engineRuntime = this.inputDataState.runtime;
          service_initNewService(service);
          const pureSingleExecution = new PureSingleExecution(
            query,
            service,
            PackageableElementExplicitReference.create(
              this.mappingEditorState.mapping,
            ),
            engineRuntime,
          );
          service_setExecution(
            service,
            pureSingleExecution,
            this.editorStore.changeDetectionState.observerContext,
          );
          const suite = new ServiceTestSuite();
          suite.id = generateEnumerableNameFromToken(
            [],
            DEFAULT_TEST_SUITE_PREFIX,
          );
          suite.testData = new TestData();
          const embeddedData = this.inputDataState.createEmbeddedData();
          const connection = engineRuntime.connections[0]?.storeConnections[0];
          if (embeddedData && connection) {
            const connectionTestData = new ConnectionTestData();
            connectionTestData.connectionId = connection.id;
            connectionTestData.testData = embeddedData;
            suite.testData.connectionsTestData = [connectionTestData];
          }
          const test = new ServiceTest();
          test.serializationFormat = SERIALIZATION_FORMAT.PURE;
          test.id = generateEnumerableNameFromToken([], DEFAULT_TEST_PREFIX);
          test.__parent = suite;
          suite.tests = [test];
          const assertion =
            this.inputDataState.createAssertion(this.executionResultText) ??
            createEmptyEqualToJsonAssertion(test);
          test.assertions = [assertion];
          assertion.parentTest = test;
          service_addTestSuite(
            service,
            suite,
            this.editorStore.changeDetectionState.observerContext,
          );
          yield flowResult(
            this.editorStore.graphEditorMode.addElement(
              service,
              packagePath,
              true,
            ),
          );
        } else {
          throw new UnsupportedOperationError(
            `Can't build service from input data state`,
            this.inputDataState,
          );
        }
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    }
  }

  *cancelExecution(): GeneratorFn<void> {
    this.isExecuting = false;
    this.setExecutionRunPromise(undefined);
    try {
      yield this.editorStore.graphManagerState.graphManager.cancelUserExecutions(
        true,
      );
    } catch (error) {
      // don't notify users about success or failure
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
    }
  }

  *executeMapping(): GeneratorFn<void> {
    let promise;
    try {
      const query = this.queryState.query;
      const runtime = this.inputDataState.runtime;
      if (
        !isStubbed_RawLambda(this.queryState.query) &&
        this.inputDataState.isValid &&
        !this.isExecuting
      ) {
        this.isExecuting = true;

        QueryBuilderTelemetryHelper.logEvent_QueryRunLaunched(
          this.editorStore.applicationStore.telemetryService,
        );

        const stopWatch = new StopWatch();
        const report = reportGraphAnalytics(
          this.editorStore.graphManagerState.graph,
        );

        promise = this.editorStore.graphManagerState.graphManager.runQuery(
          query,
          this.mappingEditorState.mapping,
          runtime,
          this.editorStore.graphManagerState.graph,
          {
            useLosslessParse: true,
          },
          report,
        );
        this.setExecutionRunPromise(promise);
        const result = (yield promise) as ExecutionResultWithMetadata;
        if (this.executionRunPromise === promise) {
          this.setExecutionResultText(
            stringifyLosslessJSON(
              result.executionResult,
              undefined,
              DEFAULT_TAB_SIZE,
            ),
          );
          // report
          report.timings =
            this.editorStore.applicationStore.timeService.finalizeTimingsRecord(
              stopWatch,
              report.timings,
            );
          QueryBuilderTelemetryHelper.logEvent_QueryRunSucceeded(
            this.editorStore.applicationStore.telemetryService,
            report,
          );
        }
      }
    } catch (error) {
      if (this.executionRunPromise === promise) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.logService.error(
          LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
          error,
        );
        this.editorStore.applicationStore.notificationService.notifyError(
          error,
        );
        this.setExecutionResultText('');
      }
    } finally {
      this.isExecuting = false;
    }
  }

  *generatePlan(debug: boolean): GeneratorFn<void> {
    try {
      const query = this.queryState.query;
      const runtime = this.inputDataState.runtime;
      if (
        !isStubbed_RawLambda(this.queryState.query) &&
        this.inputDataState.isValid &&
        !this.isGeneratingPlan
      ) {
        this.isGeneratingPlan = true;
        let rawPlan: RawExecutionPlan;

        const stopWatch = new StopWatch();
        const report = reportGraphAnalytics(
          this.editorStore.graphManagerState.graph,
        );

        if (debug) {
          QueryBuilderTelemetryHelper.logEvent_ExecutionPlanDebugLaunched(
            this.editorStore.applicationStore.telemetryService,
          );
          const debugResult =
            (yield this.editorStore.graphManagerState.graphManager.debugExecutionPlanGeneration(
              query,
              this.mappingEditorState.mapping,
              runtime,
              this.editorStore.graphManagerState.graph,
              undefined,
              report,
            )) as { plan: RawExecutionPlan; debug: string };

          rawPlan = debugResult.plan;
          this.executionPlanState.setDebugText(debugResult.debug);
        } else {
          QueryBuilderTelemetryHelper.logEvent_ExecutionPlanGenerationLaunched(
            this.editorStore.applicationStore.telemetryService,
          );
          rawPlan =
            (yield this.editorStore.graphManagerState.graphManager.generateExecutionPlan(
              query,
              this.mappingEditorState.mapping,
              runtime,
              this.editorStore.graphManagerState.graph,
              undefined,
              report,
            )) as object;
        }

        stopWatch.record();
        try {
          this.executionPlanState.setRawPlan(rawPlan);
          const plan =
            this.editorStore.graphManagerState.graphManager.buildExecutionPlan(
              rawPlan,
              this.editorStore.graphManagerState.graph,
            );
          this.executionPlanState.initialize(plan);
        } catch {
          // do nothing
        }
        stopWatch.record(QUERY_BUILDER_EVENT.BUILD_EXECUTION_PLAN__SUCCESS);

        // report
        report.timings =
          this.editorStore.applicationStore.timeService.finalizeTimingsRecord(
            stopWatch,
            report.timings,
          );
        if (debug) {
          QueryBuilderTelemetryHelper.logEvent_ExecutionPlanDebugSucceeded(
            this.editorStore.applicationStore.telemetryService,
            report,
          );
        } else {
          QueryBuilderTelemetryHelper.logEvent_ExecutionPlanGenerationSucceeded(
            this.editorStore.applicationStore.telemetryService,
            report,
          );
        }
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.logService.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notificationService.notifyError(error);
    } finally {
      this.isGeneratingPlan = false;
    }
  }

  *buildQueryWithClassMapping(
    setImplementation: SetImplementation | undefined,
  ): GeneratorFn<void> {
    // do all the necessary updates
    this.setExecutionResultText(undefined);
    yield flowResult(
      this.queryState.updateLamba(
        setImplementation
          ? this.editorStore.graphManagerState.graphManager.createGetAllRawLambda(
              guaranteeType(getMappingElementTarget(setImplementation), Class),
            )
          : stub_RawLambda(),
      ),
    );

    // Attempt to generate data for input data panel as we pick the class mapping:
    // - If the source panel is empty right now, automatically try to generate input data:
    //   - We generate based on the class mapping, if it's concrete
    //   - If the class mapping is operation, output a warning message
    // - If the source panel is non-empty (show modal), show an option to keep current input data

    if (setImplementation) {
      if (this.inputDataState instanceof MappingExecutionEmptyInputDataState) {
        if (setImplementation instanceof OperationSetImplementation) {
          this.editorStore.applicationStore.notificationService.notifyWarning(
            `Can't auto-generate input data for operation class mapping. Please pick a concrete class mapping instead`,
          );
        } else {
          this.setInputDataStateBasedOnSource(
            getMappingElementSource(
              setImplementation,
              this.editorStore.pluginManager.getApplicationPlugins(),
            ),
            true,
          );
        }
      } else {
        this.editorStore.applicationStore.alertService.setActionAlertInfo({
          message: 'Mapping execution input data is already set',
          prompt: 'Do you want to regenerate the input data?',
          type: ActionAlertType.CAUTION,
          actions: [
            {
              label: 'Regenerate',
              type: ActionAlertActionType.PROCEED_WITH_CAUTION,
              handler: (): void =>
                this.setInputDataStateBasedOnSource(
                  getMappingElementSource(
                    setImplementation,
                    this.editorStore.pluginManager.getApplicationPlugins(),
                  ),
                  true,
                ),
            },
            {
              label: 'Keep my input data',
              type: ActionAlertActionType.PROCEED,
              default: true,
            },
          ],
        });
      }
    }
  }
}
