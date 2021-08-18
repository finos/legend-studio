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
  MappingEditorState,
  MappingElementSource,
} from './MappingEditorState';
import {
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
import type { GeneratorFn } from '@finos/legend-shared';
import {
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
import {
  CLIENT_VERSION,
  LAMBDA_START,
} from '../../../../models/MetaModelConst';
import { GRAPH_MANAGER_LOG_EVENT } from '../../../../utils/GraphManagerLogEvent';
import { createMockDataForMappingElementSource } from '../../../shared/MockDataUtil';
import { MappingTest } from '../../../../models/metamodels/pure/model/packageableElements/mapping/MappingTest';
import { Class } from '../../../../models/metamodels/pure/model/packageableElements/domain/Class';
import {
  ObjectInputData,
  ObjectInputType,
} from '../../../../models/metamodels/pure/model/packageableElements/store/modelToModel/mapping/ObjectInputData';
import { ExpectedOutputMappingTestAssert } from '../../../../models/metamodels/pure/model/packageableElements/mapping/ExpectedOutputMappingTestAssert';
import { RawLambda } from '../../../../models/metamodels/pure/model/rawValueSpecification/RawLambda';
import type { Runtime } from '../../../../models/metamodels/pure/model/packageableElements/runtime/Runtime';
import {
  IdentifiedConnection,
  EngineRuntime,
} from '../../../../models/metamodels/pure/model/packageableElements/runtime/Runtime';
import { JsonModelConnection } from '../../../../models/metamodels/pure/model/packageableElements/store/modelToModel/connection/JsonModelConnection';
import { FlatDataConnection } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/connection/FlatDataConnection';
import type { InputData } from '../../../../models/metamodels/pure/model/packageableElements/mapping/InputData';
import { FlatDataInputData } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/mapping/FlatDataInputData';
import type { Mapping } from '../../../../models/metamodels/pure/model/packageableElements/mapping/Mapping';
import { Service } from '../../../../models/metamodels/pure/model/packageableElements/service/Service';
import {
  SingleExecutionTest,
  TestContainer,
} from '../../../../models/metamodels/pure/model/packageableElements/service/ServiceTest';
import { PureSingleExecution } from '../../../../models/metamodels/pure/model/packageableElements/service/ServiceExecution';
import { RootFlatDataRecordType } from '../../../../models/metamodels/pure/model/packageableElements/store/flatData/model/FlatDataDataType';
import type { Connection } from '../../../../models/metamodels/pure/model/packageableElements/connection/Connection';
import { PackageableElementExplicitReference } from '../../../../models/metamodels/pure/model/packageableElements/PackageableElementReference';
import type { ExecutionResult } from '../../../../models/metamodels/pure/action/execution/ExecutionResult';
import { TAB_SIZE } from '../../../EditorConfig';
import { LambdaEditorState } from '../LambdaEditorState';
import { Table } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/model/Table';
import { View } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/model/View';
import {
  DatabaseType,
  RelationalDatabaseConnection,
} from '../../../../models/metamodels/pure/model/packageableElements/store/relational/connection/RelationalDatabaseConnection';
import { LocalH2DatasourceSpecification } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/connection/DatasourceSpecification';
import { DefaultH2AuthenticationStrategy } from '../../../../models/metamodels/pure/model/packageableElements/store/relational/connection/AuthenticationStrategy';
import {
  RelationalInputData,
  RelationalInputType,
} from '../../../../models/metamodels/pure/model/packageableElements/store/relational/mapping/RelationalInputData';
import {
  ActionAlertActionType,
  ActionAlertType,
} from '../../../ApplicationStore';
import type { SetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/mapping/SetImplementation';
import { OperationSetImplementation } from '../../../../models/metamodels/pure/model/packageableElements/mapping/OperationSetImplementation';
import { buildSourceInformationSourceId } from '../../../../models/metamodels/pure/action/SourceInformationHelper';
import { ExecutionPlanState } from '../../../ExecutionPlanState';

export class MappingExecutionQueryState extends LambdaEditorState {
  editorStore: EditorStore;
  isInitializingLambda = false;
  query: RawLambda;

  constructor(editorStore: EditorStore, query: RawLambda) {
    super('', LAMBDA_START);

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
          (yield this.editorStore.graphState.graphManager.lambdasToPureCode(
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
      } catch (error: unknown) {
        this.editorStore.applicationStore.log.error(
          LogEvent.create(GRAPH_MANAGER_LOG_EVENT.PARSING_FAILURE),
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
  inputData?: InputData;

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
      this.editorStore.graphState.graphManager.TEMP__getEngineConfig();
    return createRuntimeForExecution(
      this.mapping,
      new JsonModelConnection(
        PackageableElementExplicitReference.create(
          this.editorStore.graphState.graph.modelStore,
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
      this.editorStore.graphState.graphManager.TEMP__getEngineConfig();
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
    datasourceSpecification.setTestDataSetupSqls(
      // NOTE: this is a gross simplification of handling the input for relational input data
      [this.inputData.data],
    );
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
  isExecuting = false;
  isGeneratingPlan = false;
  queryState: MappingExecutionQueryState;
  inputDataState: MappingExecutionInputDataState;
  executionResultText?: string; // NOTE: stored as lossless JSON text
  showServicePathModal = false;
  executionPlanState: ExecutionPlanState;

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
      setShowServicePathModal: action,
      setInputDataStateBasedOnSource: action,
      reset: action,
      generatePlan: flow,
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
    } else if (source instanceof Table || source instanceof View) {
      const newRuntimeState = new MappingExecutionRelationalInputDataState(
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
    } catch (error: unknown) {
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_LOG_EVENT.EXECUTION_FAILURE),
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
            this.editorStore.graphState.graphManager.HACKY_createServiceTestAssertLambda(
              this.executionResultText,
            ),
            singleExecutionTest,
          );
          singleExecutionTest.asserts.push(testContainer);
          const servicePackage =
            this.editorStore.graphState.graph.getOrCreatePackage(packagePath);
          service.test = singleExecutionTest;
          servicePackage.addElement(service);
          this.editorStore.graphState.graph.addElement(service);
          this.editorStore.openElement(service);
        } else {
          throw new UnsupportedOperationError(
            `Can't build service from input data state`,
            this.inputDataState,
          );
        }
      }
    } catch (error: unknown) {
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_LOG_EVENT.EXECUTION_FAILURE),
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
          (yield this.editorStore.graphState.graphManager.executeMapping(
            this.editorStore.graphState.graph,
            this.mappingEditorState.mapping,
            query,
            runtime,
            CLIENT_VERSION.VX_X_X,
            true,
          )) as ExecutionResult;
        this.setExecutionResultText(
          losslessStringify(result.values, undefined, TAB_SIZE),
        );
      }
    } catch (error: unknown) {
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_LOG_EVENT.EXECUTION_FAILURE),
        error,
      );
      this.editorStore.applicationStore.notifyError(error);
      this.setExecutionResultText('');
    } finally {
      this.isExecuting = false;
    }
  }

  *generatePlan(): GeneratorFn<void> {
    try {
      const query = this.queryState.query;
      const runtime = this.inputDataState.runtime;
      if (
        !this.queryState.query.isStub &&
        this.inputDataState.isValid &&
        !this.isGeneratingPlan
      ) {
        this.isGeneratingPlan = true;
        yield flowResult(
          this.executionPlanState.generatePlan(
            this.mappingEditorState.mapping,
            query,
            runtime,
          ),
        );
      }
    } catch (error: unknown) {
      this.editorStore.applicationStore.log.error(
        LogEvent.create(GRAPH_MANAGER_LOG_EVENT.EXECUTION_FAILURE),
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
          ? this.editorStore.graphState.graphManager.HACKY_createGetAllLambda(
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
            getMappingElementSource(setImplementation),
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
                  getMappingElementSource(setImplementation),
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
