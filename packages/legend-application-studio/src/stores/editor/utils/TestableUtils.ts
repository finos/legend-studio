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
  type Connection,
  type ConnectionPointer,
  type ConnectionVisitor,
  type EmbeddedData,
  type FlatDataConnection,
  type JsonModelConnection,
  type ModelChainConnection,
  type RelationalDatabaseConnection,
  type XmlModelConnection,
  type Runtime,
  type TestAssertion,
  type AtomicTest,
  type EmbeddedDataVisitor,
  type INTERNAL__UnknownConnection,
  type DataElementReference,
  type INTERNAL__UnknownEmbeddedData,
  type TestResult,
  type ValueSpecification,
  type Binding,
  type RawLambda,
  type Type,
  ExternalFormatData,
  RelationalCSVData,
  ConnectionTestData,
  EqualToJson,
  DEFAULT_TEST_ASSERTION_PREFIX,
  RelationalCSVDataTable,
  getAllIdentifiedConnectionsFromRuntime,
  ModelStoreData,
  ModelEmbeddedData,
  PackageableElementExplicitReference,
  TestExecuted,
  TestExecutionStatus,
  isStubbed_RawLambda,
  SimpleFunctionExpression,
  InstanceValue,
  CollectionInstanceValue,
  matchFunctionName,
  PackageableElementImplicitReference,
  VariableExpression,
  PrimitiveInstanceValue,
  PrimitiveType,
  LambdaFunctionInstanceValue,
  DataElement,
} from '@finos/legend-graph';
import {
  assertTrue,
  ContentType,
  generateEnumerableNameFromToken,
  getNullableFirstEntry,
  guaranteeNonEmptyString,
  guaranteeType,
  isNonNullable,
  LogEvent,
  returnUndefOnError,
  UnsupportedOperationError,
  uuid,
} from '@finos/legend-shared';
import { EmbeddedDataType } from '../editor-state/ExternalFormatState.js';
import type { EditorStore } from '../EditorStore.js';
import { createMockDataForMappingElementSource } from './MockDataUtils.js';
import type { DSL_Data_LegendStudioApplicationPlugin_Extension } from '../../extensions/DSL_Data_LegendStudioApplicationPlugin_Extension.js';
import { QUERY_BUILDER_SUPPORTED_FUNCTIONS } from '@finos/legend-query-builder';
import { LEGEND_STUDIO_APP_EVENT } from '../../../__lib__/LegendStudioEvent.js';

export const DEFAULT_TEST_ASSERTION_ID = 'assertion_1';
export const DEFAULT_TEST_ID = 'test_1';

export const validateTestableId = (
  id: string | undefined,
  possibleIds: string[] | undefined,
): string | undefined => {
  // undefined in this case means user has yet to write anything so we shouldnt show any error message
  if (id === undefined) {
    return undefined;
  }
  if (!id) {
    return 'ID is required';
  } else if (id.includes(' ')) {
    return `ID can't contain spaces`;
  } else if (possibleIds?.includes(id)) {
    return `ID '${id}' already exists`;
  }
  return undefined;
};

export const createBareExternalFormat = (
  contentType?: string | undefined,
  content?: string | undefined,
): ExternalFormatData => {
  const data = new ExternalFormatData();
  data.contentType = contentType ?? ContentType.APPLICATION_JSON;
  data.data = content ?? '';
  return data;
};

export const createDefaultEqualToJSONTestAssertion = (
  id?: string | undefined,
): EqualToJson => {
  const xt = createBareExternalFormat(undefined, '{}');
  const assertion = new EqualToJson();
  assertion.expected = xt;
  assertion.id = id ?? uuid();
  return assertion;
};

export const createEmbeddedDataFromClass = (
  _class: Type,
  editorStore: EditorStore,
): ExternalFormatData => {
  const _json = createMockDataForMappingElementSource(_class, editorStore);
  const data = createBareExternalFormat();
  data.data = _json;
  return data;
};

export const createBareModelStoreData = (
  _class: Type,
  editorStore: EditorStore,
): ModelStoreData => {
  const embeddedData = createEmbeddedDataFromClass(_class, editorStore);
  const modelStoreData = new ModelStoreData();
  const modelData = new ModelEmbeddedData();
  modelData.data = embeddedData;
  modelData.model = PackageableElementExplicitReference.create(_class);
  modelStoreData.modelData = [modelData];
  return modelStoreData;
};

export class EmbeddedDataCreatorFromEmbeddedData
  implements EmbeddedDataVisitor<EmbeddedData>
{
  editorStore: EditorStore;
  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
  }
  visit_EmbeddedData(data: EmbeddedData): EmbeddedData {
    const extraEmbeddedDataCloners = this.editorStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSL_Data_LegendStudioApplicationPlugin_Extension
          ).getExtraEmbeddedDataCloners?.() ?? [],
      );
    for (const creator of extraEmbeddedDataCloners) {
      const embeddedData = creator(data);
      if (embeddedData) {
        return embeddedData;
      }
    }
    throw new UnsupportedOperationError(
      `Unsupported embedded data${data.toString()}`,
    );
  }
  visit_INTERNAL__UnknownEmbeddedData(
    data: INTERNAL__UnknownEmbeddedData,
  ): EmbeddedData {
    throw new Error('Method not implemented.');
  }
  visit_ExternalFormatData(data: ExternalFormatData): EmbeddedData {
    const val = new ExternalFormatData();
    val.contentType = data.contentType;
    val.data = data.data;
    return val;
  }
  visit_ModelStoreData(data: ModelStoreData): EmbeddedData {
    const val = new ModelStoreData();
    val.modelData = data.modelData
      ?.map((e) => {
        if (e instanceof ModelEmbeddedData) {
          const v = new ModelEmbeddedData();
          v.model = PackageableElementExplicitReference.create(e.model.value);
          v.data = e.data.accept_EmbeddedDataVisitor(
            new EmbeddedDataCreatorFromEmbeddedData(this.editorStore),
          );
          return v;
        }
        return undefined;
      })
      .filter(isNonNullable);
    return val;
  }
  visit_DataElementReference(data: DataElementReference): EmbeddedData {
    const datElement = guaranteeType(data.dataElement.value, DataElement);
    return datElement.data.accept_EmbeddedDataVisitor(
      new EmbeddedDataCreatorFromEmbeddedData(this.editorStore),
    );
  }
  visit_RelationalCSVData(data: RelationalCSVData): EmbeddedData {
    const val = new RelationalCSVData();
    return val;
  }
}

// NOTE: this will all move to `engine` once engine support generating test data for all connections
// Throws if unable to generate test data
export class TEMPORARY__EmbeddedDataConnectionVisitor
  implements ConnectionVisitor<EmbeddedData>
{
  editorStore: EditorStore;
  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
  }

  visit_Connection(connection: Connection): EmbeddedData {
    throw new UnsupportedOperationError();
  }
  visit_INTERNAL__UnknownConnection(
    connection: INTERNAL__UnknownConnection,
  ): EmbeddedData {
    throw new UnsupportedOperationError();
  }

  visit_ConnectionPointer(connection: ConnectionPointer): EmbeddedData {
    const packageableConnection =
      connection.packageableConnection.value.connectionValue;
    return packageableConnection.accept_ConnectionVisitor(this);
  }
  visit_ModelChainConnection(connection: ModelChainConnection): EmbeddedData {
    throw new UnsupportedOperationError();
  }
  visit_JsonModelConnection(connection: JsonModelConnection): EmbeddedData {
    return createEmbeddedDataFromClass(
      connection.class.value,
      this.editorStore,
    );
  }
  visit_XmlModelConnection(connection: XmlModelConnection): EmbeddedData {
    throw new UnsupportedOperationError();
  }
  visit_FlatDataConnection(connection: FlatDataConnection): EmbeddedData {
    throw new UnsupportedOperationError();
  }
  visit_RelationalDatabaseConnection(
    connection: RelationalDatabaseConnection,
  ): EmbeddedData {
    throw new UnsupportedOperationError();
  }
}

export class EmbeddedDataConnectionTypeVisitor
  implements ConnectionVisitor<string>
{
  editorStore: EditorStore;
  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
  }

  visit_Connection(connection: Connection): string {
    const extraEmbeddedDataCreator = this.editorStore.pluginManager
      .getApplicationPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSL_Data_LegendStudioApplicationPlugin_Extension
          ).getExtraEmbeddedDataTypeFromConnectionMatchers?.() ?? [],
      );
    for (const creator of extraEmbeddedDataCreator) {
      const embeddedData = creator(connection);
      if (embeddedData) {
        return embeddedData;
      }
    }
    return EmbeddedDataType.EXTERNAL_FORMAT_DATA;
  }
  visit_INTERNAL__UnknownConnection(
    connection: INTERNAL__UnknownConnection,
  ): string {
    return EmbeddedDataType.EXTERNAL_FORMAT_DATA;
  }

  visit_ConnectionPointer(connection: ConnectionPointer): string {
    const packageableConnection =
      connection.packageableConnection.value.connectionValue;
    return packageableConnection.accept_ConnectionVisitor(this);
  }
  visit_ModelChainConnection(connection: ModelChainConnection): string {
    return EmbeddedDataType.EXTERNAL_FORMAT_DATA;
  }
  visit_JsonModelConnection(connection: JsonModelConnection): string {
    return EmbeddedDataType.EXTERNAL_FORMAT_DATA;
  }
  visit_XmlModelConnection(connection: XmlModelConnection): string {
    return EmbeddedDataType.EXTERNAL_FORMAT_DATA;
  }

  visit_FlatDataConnection(connection: FlatDataConnection): string {
    return EmbeddedDataType.EXTERNAL_FORMAT_DATA;
  }
  visit_RelationalDatabaseConnection(
    connection: RelationalDatabaseConnection,
  ): string {
    return EmbeddedDataType.RELATIONAL_CSV;
  }
}

export const initializeConnectionDataFromRuntime = (
  runtime: Runtime,
  editorStore: EditorStore,
): ConnectionTestData[] => {
  const identifiedConnections = getAllIdentifiedConnectionsFromRuntime(runtime);
  return identifiedConnections
    .map((identifiedConnection) => {
      const connection = identifiedConnection.connection;
      const embeddedData = returnUndefOnError(() =>
        connection.accept_ConnectionVisitor(
          new TEMPORARY__EmbeddedDataConnectionVisitor(editorStore),
        ),
      );
      if (embeddedData) {
        const connectionTestData = new ConnectionTestData();
        connectionTestData.connectionId = identifiedConnection.id;
        connectionTestData.testData = embeddedData;
        return connectionTestData;
      }
      return undefined;
    })
    .filter(isNonNullable);
};

export const createEmptyEqualToJsonAssertion = (
  test: AtomicTest,
): TestAssertion => {
  const assert = new EqualToJson();
  assert.id = generateEnumerableNameFromToken(
    test.assertions.map((a) => a.id),
    DEFAULT_TEST_ASSERTION_PREFIX,
  );
  assert.expected = createBareExternalFormat();
  assert.parentTest = test;
  return assert;
};

// Temproary as engine should return an embedded data type
export const TEMPORARY__createRelationalDataFromCSV = (
  val: string,
): RelationalCSVData => {
  const NEW_LINE = '\n';
  const data = new RelationalCSVData();
  const separator = `${NEW_LINE}-----${NEW_LINE}`;
  const lineBreak = /\r?\n/;
  const tables = val
    .split(separator)
    .filter((e) => !(e === NEW_LINE || e === '\r' || e === ''));
  tables.forEach((tableData) => {
    const tableInfo = tableData.split(lineBreak);
    assertTrue(
      tableInfo.length >= 2,
      'Table and Schema Name required from test data',
    );
    const table = new RelationalCSVDataTable();
    table.schema = guaranteeNonEmptyString(tableInfo.shift());
    table.table = guaranteeNonEmptyString(tableInfo.shift());
    table.values = tableInfo.join(NEW_LINE) + NEW_LINE;
    data.tables.push(table);
  });
  return data;
};

// test result
export const isTestPassing = (testResult: TestResult): boolean =>
  testResult instanceof TestExecuted &&
  testResult.testExecutionStatus === TestExecutionStatus.PASS;

// external format param type
export interface TestParamContentType {
  contentType: string;
  param: string;
}
export const getContentTypeWithParamRecursively = (
  expression: ValueSpecification | undefined,
): TestParamContentType[] => {
  let currentExpression = expression;
  const res: TestParamContentType[] = [];
  // use if statement to safely scan service query without breaking the app
  while (currentExpression instanceof SimpleFunctionExpression) {
    if (
      matchFunctionName(
        currentExpression.functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.INTERNALIZE,
      ) ||
      matchFunctionName(
        currentExpression.functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.GET_RUNTIME_WITH_MODEL_QUERY_CONNECTION,
      )
    ) {
      if (currentExpression.parametersValues[1] instanceof InstanceValue) {
        if (
          currentExpression.parametersValues[1].values[0] instanceof
            PackageableElementImplicitReference &&
          currentExpression.parametersValues[2] instanceof VariableExpression
        ) {
          res.push({
            contentType: (
              currentExpression.parametersValues[1].values[0].value as Binding
            ).contentType,
            param: currentExpression.parametersValues[2].name,
          });
        } else if (
          matchFunctionName(
            currentExpression.functionName,
            QUERY_BUILDER_SUPPORTED_FUNCTIONS.GET_RUNTIME_WITH_MODEL_QUERY_CONNECTION,
          ) &&
          currentExpression.parametersValues[1] instanceof
            PrimitiveInstanceValue &&
          currentExpression.parametersValues[1].genericType.value.rawType ===
            PrimitiveType.STRING &&
          currentExpression.parametersValues[2] instanceof VariableExpression
        ) {
          res.push({
            contentType: currentExpression.parametersValues[1]
              .values[0] as string,
            param: currentExpression.parametersValues[2].name,
          });
        }
      }
      currentExpression = currentExpression.parametersValues[1];
    } else if (
      matchFunctionName(
        currentExpression.functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.FROM,
      )
    ) {
      currentExpression = currentExpression.parametersValues[2];
    } else if (
      matchFunctionName(
        currentExpression.functionName,
        QUERY_BUILDER_SUPPORTED_FUNCTIONS.MERGERUNTIMES,
      )
    ) {
      const collection = currentExpression.parametersValues[0];
      if (collection instanceof CollectionInstanceValue) {
        collection.values
          .map((v) => getContentTypeWithParamRecursively(v))
          .flat()
          .map((p) => res.push(p));
      }
      currentExpression = collection;
    } else {
      currentExpression = getNullableFirstEntry(
        currentExpression.parametersValues,
      );
    }
  }
  return res;
};

export const getContentTypeWithParamFromQuery = (
  query: RawLambda | undefined,
  editorStore: EditorStore,
): TestParamContentType[] => {
  if (query && !isStubbed_RawLambda(query)) {
    // safely pass unsupported funtions when building ValueSpecification from Rawlambda
    try {
      const valueSpec =
        editorStore.graphManagerState.graphManager.buildValueSpecification(
          editorStore.graphManagerState.graphManager.serializeRawValueSpecification(
            query,
          ),
          editorStore.graphManagerState.graph,
        );
      if (valueSpec instanceof LambdaFunctionInstanceValue) {
        return getContentTypeWithParamRecursively(
          valueSpec.values[0]?.expressionSequence.find(
            (exp) =>
              exp instanceof SimpleFunctionExpression &&
              (matchFunctionName(
                exp.functionName,
                QUERY_BUILDER_SUPPORTED_FUNCTIONS.SERIALIZE,
              ) ||
                matchFunctionName(
                  exp.functionName,
                  QUERY_BUILDER_SUPPORTED_FUNCTIONS.EXTERNALIZE,
                )),
          ),
        );
      }
    } catch (error) {
      editorStore.applicationStore.logService.error(
        LogEvent.create(LEGEND_STUDIO_APP_EVENT.SERVICE_TEST_SETUP_FAILURE),
        error,
      );
    }
  }
  return [];
};
