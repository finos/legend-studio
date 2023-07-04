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
  type Class,
  type EmbeddedDataVisitor,
  ExternalFormatData,
  RelationalCSVData,
  ConnectionTestData,
  EqualToJson,
  DEFAULT_TEST_ASSERTION_PREFIX,
  RelationalCSVDataTable,
  type INTERNAL__UnknownConnection,
  getAllIdentifiedConnectionsFromRuntime,
  ModelStoreData,
  ModelEmbeddedData,
  PackageableElementExplicitReference,
  type DataElementReference,
  type INTERNAL__UnknownEmbeddedData,
  type TestResult,
  TestExecuted,
  TestExecutionStatus,
} from '@finos/legend-graph';
import {
  assertTrue,
  ContentType,
  generateEnumerableNameFromToken,
  guaranteeNonEmptyString,
  isNonNullable,
  returnUndefOnError,
  UnsupportedOperationError,
  uuid,
} from '@finos/legend-shared';
import { EmbeddedDataType } from '../editor-state/ExternalFormatState.js';
import type { EditorStore } from '../EditorStore.js';
import { createMockDataForMappingElementSource } from './MockDataUtils.js';

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
  _class: Class,
  editorStore: EditorStore,
): ExternalFormatData => {
  const _json = createMockDataForMappingElementSource(_class, editorStore);
  const data = createBareExternalFormat();
  data.data = _json;
  return data;
};

export const createBareModelStoreData = (
  _class: Class,
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
  visit_EmbeddedData(data: EmbeddedData): EmbeddedData {
    throw new Error('Method not implemented.');
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
            new EmbeddedDataCreatorFromEmbeddedData(),
          );
          return v;
        }
        return undefined;
      })
      .filter(isNonNullable);
    return val;
  }
  visit_DataElementReference(data: DataElementReference): EmbeddedData {
    return data.dataElement.value.data.accept_EmbeddedDataVisitor(
      new EmbeddedDataCreatorFromEmbeddedData(),
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
