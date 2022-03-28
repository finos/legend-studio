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
  type MappingElementSource,
  getMappingElementSource,
  getMappingElementTarget,
  generateMappingTestName,
} from './MappingEditorState';
import type { EditorStore } from '../../../EditorStore';
import {
  observable,
  action,
  flow,
  computed,
  makeObservable,
  makeAutoObservable,
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
  losslessStringify,
  guaranteeType,
} from '@finos/legend-shared';
import { createMockDataForMappingElementSource } from '../../../shared/MockDataUtil';
import { ExecutionPlanState } from '../../../ExecutionPlanState';
import {
  type Runtime,
  type InputData,
  type Mapping,
  type Connection,
  type ExecutionResult,
  type SetImplementation,
  type Table,
  type View,
  extractExecutionResultValues,
  LAMBDA_PIPE,
  GRAPH_MANAGER_EVENT,
  MappingTest,
  Class,
  ObjectInputData,
  ObjectInputType,
  ExpectedOutputMappingTestAssert,
  RawLambda,
  IdentifiedConnection,
  EngineRuntime,
  JsonModelConnection,
  FlatDataConnection,
  FlatDataInputData,
  Service,
  SingleExecutionTest,
  TestContainer,
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
  PureClientVersion,
  TableAlias,
  type RawExecutionPlan,
} from '@finos/legend-graph';
import {
  ActionAlertActionType,
  ActionAlertType,
  LambdaEditorState,
  TAB_SIZE,
} from '@finos/legend-application';

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
    yield flowResult(this.convertLambdaObjectToGrammarString(true));
  }

  *convertLambdaObjectToGrammarString(pretty?: boolean): GeneratorFn<void> {
    if (!this.query.isStub) {
      try {
        const lambdas = new Map<string, RawLambda>();
        lambdas.set(this.lambdaId, this.query);
        const isolatedLambdas =
          (yield this.editorStore.graphManagerState.graphManager.lambdasToPureCode(
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
      } catch (error) {
        assertErrorThrown(error);
        this.editorStore.applicationStore.log.error(
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
  uuid = uuid();
  editorStore: EditorStore;
  mapping: Mapping;
  inputData?: InputData | undefined;

  constructor(
    editorStore: EditorStore,
    mapping: Mapping,
    inputData: InputData | undefined,
  ) {
    this.editorStore = editorStore;
    this.mapping = mapping;
    this.inputData = inputData;
  }

  abstract get isValid(): boolean;
  abstract get runtime(): Runtime;
  abstract buildInputDataForTest(): InputData;
}

export const createRuntimeForExecution = (
  mapping: Mapping,
  connection: Connection,
): Runtime => {
  const runtime = new EngineRuntime();
  runtime.addMapping(PackageableElementExplicitReference.create(mapping));
  runtime.addIdentifiedConnection(
    new IdentifiedConnection(
      runtime.generateIdentifiedConnectionId(),
      connection,
    ),
  );
  return runtime;
};

export class MappingExecutionEmptyInputDataState extends MappingExecutionInputDataState {
  get isValid(): boolean {
    return false;
  }

  get runtime(): Runtime {
    throw new IllegalStateError(
      'Mapping execution runtime information is not specified',
    );
  }

  buildInputDataForTest(): InputData {
    throw new IllegalStateError(
      'Mapping execution runtime information is not specified',
    );
  }
}

// TODO?: handle XML
export class MappingExecutionObjectInputDataState extends MappingExecutionInputDataState {
  declare inputData: ObjectInputData;

  constructor(editorStore: EditorStore, mapping: Mapping, _class: Class) {
    super(
      editorStore,
      mapping,
      new ObjectInputData(
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

  get runtime(): Runtime {
    assertTrue(
      this.isValid,
      'Model-to-model mapping execution test data is not a valid JSON string',
    );
    const engineConfig =
      this.editorStore.graphManagerState.graphManager.TEMPORARY__getEngineConfig();
    return createRuntimeForExecution(
      this.mapping,
      new JsonModelConnection(
        PackageableElementExplicitReference.create(
          this.editorStore.graphManagerState.graph.modelStore,
        ),
        PackageableElementExplicitReference.create(
          guaranteeNonNullable(this.inputData.sourceClass.value),
        ),
        createUrlStringFromData(
          tryToMinifyJSONString(this.inputData.data),
          JsonModelConnection.CONTENT_TYPE,
          engineConfig.useBase64ForAdhocConnectionDataUrls,
        ),
      ),
    );
  }

  buildInputDataForTest(): InputData {
    return new ObjectInputData(
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
          guaranteeNonNullable(rootFlatDataRecordType.owner.owner),
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

  get runtime(): Runtime {
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
          FlatDataConnection.CONTENT_TYPE,
          engineConfig.useBase64ForAdhocConnectionDataUrls,
        ),
      ),
    );
  }

  buildInputDataForTest(): InputData {
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
          guaranteeNonNullable(tableOrView.schema.owner),
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

  get runtime(): Runtime {
    const datasourceSpecification = new LocalH2DatasourceSpecification();
    switch (this.inputData.inputType) {
      case RelationalInputType.SQL:
        datasourceSpecification.setTestDataSetupSqls(
          // NOTE: this is a gross simplification of handling the input for relational input data
          [this.inputData.data],
        );
        break;
      case RelationalInputType.CSV:
        datasourceSpecification.setTestDataSetupCsv(this.inputData.data);
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
    );
  }

  buildInputDataForTest(): InputData {
    return new RelationalInputData(
      PackageableElementExplicitReference.create(
        guaranteeNonNullable(this.inputData.database.value),
      ),
      this.inputData.data,
      this.inputData.inputType,
    );
  }
}

export class MappingExecutionState {
  uuid = uuid();
  name: string;
  editorStore: EditorStore;
  mappingEditorState: MappingEditorState;
  queryState: MappingExecutionQueryState;
  inputDataState: MappingExecutionInputDataState;
  showServicePathModal = false;

  executionResultText?: string | undefined; // NOTE: stored as lossless JSON text
  isExecuting = false;
  isGeneratingPlan = false;
  executionPlanState: ExecutionPlanState;
  planGenerationDebugText?: string | undefined;

  constructor(
    editorStore: EditorStore,
    mappingEditorState: MappingEditorState,
    name: string,
  ) {
    makeAutoObservable(this, {
      editorStore: false,
      mappingEditorState: false,
      executionPlanState: observable,
      setQueryState: action,
      setInputDataState: action,
      setExecutionResultText: action,
      setPlanGenerationDebugText: action,
      setShowServicePathModal: action,
      setInputDataStateBasedOnSource: action,
      reset: action,
    });

    this.editorStore = editorStore;
    this.mappingEditorState = mappingEditorState;
    this.name = name;
    this.queryState = new MappingExecutionQueryState(
      editorStore,
      RawLambda.createStub(),
    );
    this.inputDataState = new MappingExecutionEmptyInputDataState(
      editorStore,
      mappingEditorState.mapping,
      undefined,
    );
    this.executionPlanState = new ExecutionPlanState(this.editorStore);
  }

  setQueryState = (val: MappingExecutionQueryState): void => {
    this.queryState = val;
  };
  setInputDataState = (val: MappingExecutionInputDataState): void => {
    this.inputDataState = val;
  };
  setExecutionResultText = (val: string | undefined): void => {
    this.executionResultText = val;
  };
  setShowServicePathModal = (val: boolean): void => {
    this.showServicePathModal = val;
  };
  setPlanGenerationDebugText(val: string | undefined): void {
    this.planGenerationDebugText = val;
  }

  reset(): void {
    this.queryState = new MappingExecutionQueryState(
      this.editorStore,
      RawLambda.createStub(),
    );
    this.inputDataState = new MappingExecutionEmptyInputDataState(
      this.editorStore,
      this.mappingEditorState.mapping,
      undefined,
    );
    this.setExecutionResultText(undefined);
  }

  setInputDataStateBasedOnSource(
    source: MappingElementSource | undefined,
    populateWithMockData: boolean,
  ): void {
    if (source instanceof Class) {
      const newRuntimeState = new MappingExecutionObjectInputDataState(
        this.editorStore,
        this.mappingEditorState.mapping,
        source,
      );
      if (populateWithMockData) {
        newRuntimeState.inputData.setData(
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
        newRuntimeState.inputData.setData(
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
        newRuntimeState.inputData.setData(
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
      this.editorStore.applicationStore.notifyWarning(
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
        !this.queryState.query.isStub &&
        this.inputDataState.isValid &&
        this.inputDataState.inputData &&
        this.executionResultText
      ) {
        const inputData = this.inputDataState.buildInputDataForTest();
        const assert = new ExpectedOutputMappingTestAssert(
          toGrammarString(this.executionResultText),
        );
        const mappingTest = new MappingTest(
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
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  }

  *promoteToService(
    packagePath: string,
    serviceName: string,
  ): GeneratorFn<void> {
    try {
      const query = this.queryState.query;
      if (
        !this.queryState.query.isStub &&
        this.inputDataState.isValid &&
        this.executionResultText
      ) {
        if (
          this.inputDataState instanceof MappingExecutionObjectInputDataState
        ) {
          const service = new Service(serviceName);
          service.initNewService();
          const pureSingleExecution = new PureSingleExecution(
            query,
            service,
            PackageableElementExplicitReference.create(
              this.mappingEditorState.mapping,
            ),
            this.inputDataState.runtime,
          );
          service.setExecution(pureSingleExecution);
          const singleExecutionTest = new SingleExecutionTest(
            service,
            tryToMinifyJSONString(this.inputDataState.inputData.data),
          );
          const testContainer = new TestContainer(
            this.editorStore.graphManagerState.graphManager.HACKY_createServiceTestAssertLambda(
              this.executionResultText,
            ),
            singleExecutionTest,
          );
          singleExecutionTest.asserts.push(testContainer);
          const servicePackage =
            this.editorStore.graphManagerState.graph.getOrCreatePackage(
              packagePath,
            );
          service.test = singleExecutionTest;
          servicePackage.addElement(service);
          this.editorStore.graphManagerState.graph.addElement(service);
          this.editorStore.openElement(service);
        } else {
          throw new UnsupportedOperationError(
            `Can't build service from input data state`,
            this.inputDataState,
          );
        }
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
    }
  }

  *executeMapping(): GeneratorFn<void> {
    try {
      const query = this.queryState.query;
      const runtime = this.inputDataState.runtime;
      if (
        !this.queryState.query.isStub &&
        this.inputDataState.isValid &&
        !this.isExecuting
      ) {
        this.isExecuting = true;
        const result =
          (yield this.editorStore.graphManagerState.graphManager.executeMapping(
            this.editorStore.graphManagerState.graph,
            this.mappingEditorState.mapping,
            query,
            runtime,
            PureClientVersion.VX_X_X,
            {
              useLosslessParse: true,
            },
          )) as ExecutionResult;
        this.setExecutionResultText(
          losslessStringify(
            extractExecutionResultValues(result),
            undefined,
            TAB_SIZE,
          ),
        );
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
      this.setExecutionResultText('');
    } finally {
      this.isExecuting = false;
    }
  }

  *generatePlan(debug: boolean): GeneratorFn<void> {
    try {
      const query = this.queryState.query;
      const runtime = this.inputDataState.runtime;
      if (
        !this.queryState.query.isStub &&
        this.inputDataState.isValid &&
        !this.isGeneratingPlan
      ) {
        this.isGeneratingPlan = true;
        let rawPlan: RawExecutionPlan;
        if (debug) {
          const debugResult =
            (yield this.editorStore.graphManagerState.graphManager.debugExecutionPlanGeneration(
              this.editorStore.graphManagerState.graph,
              this.mappingEditorState.mapping,
              query,
              runtime,
              PureClientVersion.VX_X_X,
            )) as { plan: RawExecutionPlan; debug: string };
          rawPlan = debugResult.plan;
          this.executionPlanState.setDebugText(debugResult.debug);
        } else {
          rawPlan =
            (yield this.editorStore.graphManagerState.graphManager.generateExecutionPlan(
              this.editorStore.graphManagerState.graph,
              this.mappingEditorState.mapping,
              query,
              runtime,
              PureClientVersion.VX_X_X,
            )) as object;
        }
        try {
          this.executionPlanState.setRawPlan(rawPlan);
          const plan =
            this.editorStore.graphManagerState.graphManager.buildExecutionPlan(
              rawPlan,
              this.editorStore.graphManagerState.graph,
            );
          this.executionPlanState.setPlan(plan);
        } catch {
          // do nothing
        }
      }
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
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
          ? this.editorStore.graphManagerState.graphManager.HACKY_createGetAllLambda(
              guaranteeType(getMappingElementTarget(setImplementation), Class),
            )
          : RawLambda.createStub(),
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
          this.editorStore.applicationStore.notifyWarning(
            `Can't auto-generate input data for operation class mapping. Please pick a concrete class mapping instead`,
          );
        } else {
          this.setInputDataStateBasedOnSource(
            getMappingElementSource(
              setImplementation,
              this.editorStore.pluginManager.getStudioPlugins(),
            ),
            true,
          );
        }
      } else {
        this.editorStore.setActionAltertInfo({
          message: 'Mapping execution input data is already set',
          prompt: 'Do you want to regenerate the input data?',
          type: ActionAlertType.CAUTION,
          onEnter: (): void => this.editorStore.setBlockGlobalHotkeys(true),
          onClose: (): void => this.editorStore.setBlockGlobalHotkeys(false),
          actions: [
            {
              label: 'Regenerate',
              type: ActionAlertActionType.PROCEED_WITH_CAUTION,
              handler: (): void =>
                this.setInputDataStateBasedOnSource(
                  getMappingElementSource(
                    setImplementation,
                    this.editorStore.pluginManager.getStudioPlugins(),
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
