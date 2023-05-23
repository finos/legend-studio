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
  type TestData,
  type Connection,
  type IdentifiedConnection,
  type Runtime,
  type EmbeddedData,
  type RawLambda,
  type DataElement,
  type Mapping,
  ConnectionTestData,
  PureSingleExecution,
  PureMultiExecution,
  DatabaseConnection,
  buildLambdaVariableExpressions,
  VariableExpression,
  DataElementReference,
  PackageableElementExplicitReference,
  ConnectionPointer,
  reportGraphAnalytics,
  observe_ValueSpecification,
  Enumeration,
  PrimitiveType,
} from '@finos/legend-graph';
import {
  type GeneratorFn,
  ActionState,
  assertErrorThrown,
  deleteEntry,
  filterByType,
  guaranteeNonNullable,
  returnUndefOnError,
  getNullableFirstEntry,
  uniq,
  isNonNullable,
} from '@finos/legend-shared';
import { action, flow, flowResult, makeObservable, observable } from 'mobx';
import type { EditorStore } from '../../../../EditorStore.js';
import {
  service_addConnectionTestData,
  service_setConnectionTestDataEmbeddedData,
} from '../../../../../graph-modifier/DSL_Service_GraphModifierHelper.js';
import {
  TEMPORARY__createRelationalDataFromCSV,
  EmbeddedDataConnectionTypeVisitor,
  getAllIdentifiedConnectionsFromRuntime,
  TEMPORARY__EmbeddedDataConnectionVisitor,
} from '../../../../utils/TestableUtils.js';
import { EmbeddedDataType } from '../../../ExternalFormatState.js';
import {
  type EmbeddedDataTypeOption,
  EmbeddedDataEditorState,
} from '../../data/DataEditorState.js';
import { createEmbeddedData } from '../../data/EmbeddedDataState.js';
import type { ServiceTestSuiteState } from './ServiceTestableState.js';
import { LegendStudioTelemetryHelper } from '../../../../../../__lib__/LegendStudioTelemetryHelper.js';
import {
  LambdaParameterState,
  LambdaParametersState,
  PARAMETER_SUBMIT_ACTION,
  buildExecutionParameterValues,
  createMockEnumerationProperty,
  getExecutionQueryFromRawLambda,
} from '@finos/legend-query-builder';
import { createMockPrimitiveProperty } from '../../../../utils/MockDataUtils.js';

const buildTestDataParameters = (
  rawLambda: RawLambda,
  editorStore: EditorStore,
): (string | number | boolean)[] =>
  buildLambdaVariableExpressions(rawLambda, editorStore.graphManagerState)
    .filter(filterByType(VariableExpression))
    .map((varExpression) => {
      if (varExpression.multiplicity.lowerBound !== 0) {
        const type = varExpression.genericType?.value.rawType;
        if (type instanceof PrimitiveType) {
          return createMockPrimitiveProperty(type, varExpression.name);
        } else if (type instanceof Enumeration) {
          return createMockEnumerationProperty(type);
        }
      }
      return undefined;
    })
    .filter(isNonNullable);

export class ServiceTestDataParameterState extends LambdaParametersState {
  connectionTestDataState: ConnectionTestDataState;

  constructor(connectionTestDataState: ConnectionTestDataState) {
    super();
    makeObservable(this, {
      parameterValuesEditorState: observable,
      parameterStates: observable,
      openModal: action,
      build: action,
    });
    this.connectionTestDataState = connectionTestDataState;
  }

  openModal(serviceExecutionParameters: {
    query: RawLambda;
    mapping: Mapping;
    runtime: Runtime;
  }): void {
    this.parameterStates = this.build(serviceExecutionParameters.query);
    this.parameterValuesEditorState.open(
      (): Promise<void> =>
        flowResult(
          this.connectionTestDataState.generateTestDataForDatabaseConnection(
            serviceExecutionParameters,
          ),
        ).catch(
          this.connectionTestDataState.editorStore.applicationStore
            .alertUnhandledError,
        ),
      PARAMETER_SUBMIT_ACTION.RUN,
    );
  }

  build(query: RawLambda): LambdaParameterState[] {
    const parameters = buildLambdaVariableExpressions(
      query,
      this.connectionTestDataState.editorStore.graphManagerState,
    )
      .map((p) =>
        observe_ValueSpecification(
          p,
          this.connectionTestDataState.editorStore.changeDetectionState
            .observerContext,
        ),
      )
      .filter(filterByType(VariableExpression));
    const states = parameters.map((p) => {
      const parmeterState = new LambdaParameterState(
        p,
        this.connectionTestDataState.editorStore.changeDetectionState.observerContext,
        this.connectionTestDataState.editorStore.graphManagerState.graph,
      );
      parmeterState.mockParameterValue();
      return parmeterState;
    });
    return states;
  }
}

export class ConnectionTestDataState {
  readonly editorStore: EditorStore;
  readonly testDataState: ServiceTestDataState;
  connectionData: ConnectionTestData;
  parameterState: ServiceTestDataParameterState;
  embeddedEditorState: EmbeddedDataEditorState;
  generatingTestDataState = ActionState.create();
  anonymizeGeneratedData = true;

  constructor(
    testDataState: ServiceTestDataState,
    connectionData: ConnectionTestData,
  ) {
    makeObservable(this, {
      generatingTestDataState: observable,
      parameterState: observable,
      embeddedEditorState: observable,
      anonymizeGeneratedData: observable,
      setAnonymizeGeneratedData: action,
      generateTestData: flow,
      generateTestDataForDatabaseConnection: flow,
    });
    this.testDataState = testDataState;
    this.editorStore = testDataState.editorStore;
    this.connectionData = connectionData;
    this.embeddedEditorState = new EmbeddedDataEditorState(
      this.testDataState.editorStore,
      connectionData.testData,
    );
    this.parameterState = new ServiceTestDataParameterState(this);
  }
  get identifiedConnection(): IdentifiedConnection | undefined {
    return this.getAllIdentifiedConnections().find(
      (c) => c.id === this.connectionData.connectionId,
    );
  }

  setAnonymizeGeneratedData(val: boolean): void {
    this.anonymizeGeneratedData = val;
  }

  *generateTestDataForDatabaseConnection(serviceExecutionParameters: {
    query: RawLambda;
    mapping: Mapping;
    runtime: Runtime;
  }): GeneratorFn<void> {
    try {
      this.generatingTestDataState.inProgress();
      // NOTE: since we don't have a generic mechanism for test-data generation
      // we will only report metrics around API usage, when we genericize, we will
      // move this out
      LegendStudioTelemetryHelper.logEvent_TestDataGenerationLaunched(
        this.testDataState.editorStore.applicationStore.telemetryService,
      );
      const report = reportGraphAnalytics(
        this.editorStore.graphManagerState.graph,
      );
      let value;
      if (
        this.editorStore.applicationStore.config.options
          .TEMPORARY__enableTestDataGenerationNewFlow
      ) {
        value =
          (yield this.editorStore.graphManagerState.graphManager.generateExecuteTestData(
            getExecutionQueryFromRawLambda(
              serviceExecutionParameters.query,
              this.parameterState.parameterStates,
              this.editorStore.graphManagerState,
            ),
            [],
            serviceExecutionParameters.mapping,
            serviceExecutionParameters.runtime,
            this.editorStore.graphManagerState.graph,
            {
              anonymizeGeneratedData: this.anonymizeGeneratedData,
              parameterValues: buildExecutionParameterValues(
                this.parameterState.parameterStates,
                this.editorStore.graphManagerState,
              ),
            },
            report,
          )) as string;
      } else {
        // TODO: delete this once the backend code is in place
        value =
          (yield this.editorStore.graphManagerState.graphManager.generateExecuteTestData(
            serviceExecutionParameters.query,
            buildTestDataParameters(
              serviceExecutionParameters.query,
              this.editorStore,
            ),
            serviceExecutionParameters.mapping,
            serviceExecutionParameters.runtime,
            this.editorStore.graphManagerState.graph,
            {
              anonymizeGeneratedData: this.anonymizeGeneratedData,
            },
            report,
          )) as string;
      }
      // NOTE: since we don't have a generic mechanism for test-data generation
      // we will only report metrics around API usage, when we genericize, we will
      // move this out
      LegendStudioTelemetryHelper.logEvent_TestDataGenerationSucceeded(
        this.editorStore.applicationStore.telemetryService,
        report,
      );
      service_setConnectionTestDataEmbeddedData(
        this.connectionData,
        TEMPORARY__createRelationalDataFromCSV(value),
        this.editorStore.changeDetectionState.observerContext,
      );
      this.embeddedEditorState = new EmbeddedDataEditorState(
        this.testDataState.editorStore,
        this.connectionData.testData,
      );
      this.generatingTestDataState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(
        `Unable to generate test data: ${error.message}`,
      );
      this.generatingTestDataState.fail();
    } finally {
      this.generatingTestDataState.complete();
    }
  }

  *generateTestData(): GeneratorFn<void> {
    try {
      this.generatingTestDataState.inProgress();
      const connection = guaranteeNonNullable(
        this.resolveConnectionValue(this.connectionData.connectionId),
        `Unable to resolve connection ID '${this.connectionData.connectionId}`,
      );
      if (connection instanceof DatabaseConnection) {
        const serviceExecutionParameters = guaranteeNonNullable(
          this.testDataState.testSuiteState.testableState.serviceEditorState
            .executionState.serviceExecutionParameters,
        );
        if (
          this.editorStore.applicationStore.config.options
            .TEMPORARY__enableTestDataGenerationNewFlow
        ) {
          const parameters = (serviceExecutionParameters.query.parameters ??
            []) as object[];
          if (parameters.length > 0) {
            this.parameterState.openModal(serviceExecutionParameters);
            return;
          } else {
            yield flowResult(
              this.generateTestDataForDatabaseConnection(
                serviceExecutionParameters,
              ),
            );
          }
        } else {
          yield flowResult(
            this.generateTestDataForDatabaseConnection(
              serviceExecutionParameters,
            ),
          );
        }
      } else {
        // TODO: delete this once the backend code is in place
        service_setConnectionTestDataEmbeddedData(
          this.connectionData,
          connection.accept_ConnectionVisitor(
            new TEMPORARY__EmbeddedDataConnectionVisitor(this.editorStore),
          ),
          this.editorStore.changeDetectionState.observerContext,
        );
      }
      this.embeddedEditorState = new EmbeddedDataEditorState(
        this.testDataState.editorStore,
        this.connectionData.testData,
      );
      this.generatingTestDataState.pass();
    } catch (error) {
      assertErrorThrown(error);
      this.editorStore.applicationStore.notificationService.notifyError(
        `Unable to generate test data: ${error.message}`,
      );
      this.generatingTestDataState.fail();
    } finally {
      this.generatingTestDataState.complete();
    }
  }

  resolveConnectionValue(id: string): Connection | undefined {
    const connection = this.getAllIdentifiedConnections().find(
      (c) => c.id === id,
    )?.connection;
    if (connection instanceof ConnectionPointer) {
      return connection.packageableConnection.value.connectionValue;
    }
    return connection;
  }

  getAllIdentifiedConnections(): IdentifiedConnection[] {
    const service =
      this.testDataState.testSuiteState.testableState.serviceEditorState
        .service;
    const execution = service.execution;
    let runtimes: Runtime[] = [];
    if (execution instanceof PureSingleExecution && execution.runtime) {
      runtimes = [execution.runtime];
    } else if (execution instanceof PureMultiExecution) {
      runtimes = execution.executionParameters.map((t) => t.runtime);
    }
    return runtimes.flatMap(getAllIdentifiedConnectionsFromRuntime);
  }
}

export class NewConnectionDataState {
  readonly editorStore: EditorStore;
  readonly testSuiteState: ServiceTestDataState;
  showModal = false;
  connection: IdentifiedConnection | undefined;
  embeddedDataType: EmbeddedDataTypeOption | undefined;
  dataElement: DataElement | undefined;

  constructor(
    editorStore: EditorStore,
    serviceTestDataState: ServiceTestDataState,
  ) {
    makeObservable(this, {
      showModal: observable,
      connection: observable,
      embeddedDataType: observable,
      dataElement: observable,
      setModal: action,
      openModal: action,
      setEmbeddedDataType: action,
      handleConnectionChange: action,
      setDataElement: action,
    });

    this.editorStore = editorStore;
    this.testSuiteState = serviceTestDataState;
    this.dataElement = editorStore.graphManagerState.usableDataElements[0];
  }

  setModal(val: boolean): void {
    this.showModal = val;
  }

  setDataElement(val: DataElement | undefined): void {
    this.dataElement = val;
  }

  setEmbeddedDataType(val: EmbeddedDataTypeOption | undefined): void {
    this.embeddedDataType = val;
  }

  openModal(): void {
    this.setModal(true);
    this.connection = this.testSuiteState.allIdentifiedConnections[0];
    if (this.connection) {
      this.handleConnectionChange(this.connection);
    }
  }

  setConnection(val: IdentifiedConnection | undefined): void {
    this.connection = val;
  }

  handleConnectionChange(val: IdentifiedConnection): void {
    const connectionValue = val.connection;
    const type = returnUndefOnError(() =>
      connectionValue.accept_ConnectionVisitor(
        new EmbeddedDataConnectionTypeVisitor(this.testSuiteState.editorStore),
      ),
    );
    this.setEmbeddedDataType(type ? { label: type, value: type } : undefined);
  }

  createConnectionTestData(): ConnectionTestData {
    const val = guaranteeNonNullable(this.connection);
    const embeddedDataType = guaranteeNonNullable(this.embeddedDataType);
    const connectionTestData = new ConnectionTestData();
    connectionTestData.connectionId = val.id;
    let testData: EmbeddedData;
    if (
      this.embeddedDataType?.value === EmbeddedDataType.DATA_ELEMENT &&
      this.dataElement
    ) {
      const value = new DataElementReference();
      value.dataElement = PackageableElementExplicitReference.create(
        this.dataElement,
      );
      testData = value;
    } else {
      testData = createEmbeddedData(
        embeddedDataType.value,
        this.testSuiteState.editorStore,
      );
    }
    connectionTestData.testData = testData;
    return connectionTestData;
  }
}

export class ServiceTestDataState {
  readonly editorStore: EditorStore;
  readonly testSuiteState: ServiceTestSuiteState;
  testData: TestData;
  selectedDataState: ConnectionTestDataState | undefined;
  newConnectionDataState: NewConnectionDataState;

  constructor(testData: TestData, testSuiteState: ServiceTestSuiteState) {
    makeObservable(this, {
      setSelectedDataState: action,
      openConnectionTestData: action,
      createConnectionTestData: action,
      newConnectionDataState: observable,
      selectedDataState: observable,
    });

    this.testData = testData;
    this.testSuiteState = testSuiteState;
    this.editorStore = testSuiteState.editorStore;
    const connectionData = getNullableFirstEntry(testData.connectionsTestData);
    if (connectionData) {
      this.selectedDataState = new ConnectionTestDataState(
        this,
        connectionData,
      );
    }
    this.newConnectionDataState = new NewConnectionDataState(
      this.editorStore,
      this,
    );
  }

  createConnectionTestData(): void {
    const connectionTestData =
      this.newConnectionDataState.createConnectionTestData();
    service_addConnectionTestData(
      this.testSuiteState.suite,
      connectionTestData,
      this.editorStore.changeDetectionState.observerContext,
    );
    this.selectedDataState = new ConnectionTestDataState(
      this,
      connectionTestData,
    );
  }

  setSelectedDataState(val: ConnectionTestDataState | undefined): void {
    this.selectedDataState = val;
  }

  deleteConnectionTestData(val: ConnectionTestData): void {
    deleteEntry(this.testData.connectionsTestData, val);
    if (this.selectedDataState?.connectionData === val) {
      const data = getNullableFirstEntry(this.testData.connectionsTestData);
      this.selectedDataState = data
        ? new ConnectionTestDataState(this, data)
        : undefined;
    }
  }

  openConnectionTestData(val: ConnectionTestData): void {
    if (this.selectedDataState?.connectionData !== val) {
      this.setSelectedDataState(new ConnectionTestDataState(this, val));
    }
  }
  get allIdentifiedConnections(): IdentifiedConnection[] {
    const service =
      this.testSuiteState.testableState.serviceEditorState.service;
    const execution = service.execution;
    let runtimes: Runtime[] = [];
    if (execution instanceof PureSingleExecution && execution.runtime) {
      runtimes = [execution.runtime];
    } else if (execution instanceof PureMultiExecution) {
      runtimes = execution.executionParameters.map((t) => t.runtime);
    }
    return uniq(runtimes.flatMap(getAllIdentifiedConnectionsFromRuntime));
  }
}
