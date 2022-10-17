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
  type IdentifiedConnection,
  type TestAssertion,
  type AtomicTest,
  ExternalFormatData,
  RelationalCSVData,
  ConnectionTestData,
  EngineRuntime,
  RuntimePointer,
  EqualToJson,
  DEFAULT_TEST_ASSERTION_PREFIX,
  RelationalCSVDataTable,
} from '@finos/legend-graph';
import {
  assertTrue,
  ContentType,
  generateEnumerableNameFromToken,
  guaranteeNonEmptyString,
  isNonNullable,
  returnUndefOnError,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import { EmbeddedDataType } from '../../editor-state/ExternalFormatState.js';
import type { EditorStore } from '../../EditorStore.js';
import { createMockDataForMappingElementSource } from '../MockDataUtils.js';

export const createBareExternalFormat = (
  contentType?: string | undefined,
): ExternalFormatData => {
  const data = new ExternalFormatData();
  data.contentType = contentType ?? ContentType.APPLICATION_JSON;
  data.data = '';
  return data;
};

export const getAllIdentifiedConnectionsFromRuntime = (
  runtime: Runtime,
): IdentifiedConnection[] => {
  const resolvedRuntimes: EngineRuntime[] = [];
  if (runtime instanceof RuntimePointer) {
    resolvedRuntimes.push(runtime.packageableRuntime.value.runtimeValue);
  } else if (runtime instanceof EngineRuntime) {
    resolvedRuntimes.push(runtime);
  }
  return resolvedRuntimes
    .flatMap((e) =>
      e.connections.map((connection) => connection.storeConnections),
    )
    .flat();
};

// NOTE: this will all move to `engine` once engine support generating test data for all connections
// Throws if unable to generate test data
export class TEMPORARY_EmbeddedDataConnectionVisitor
  implements ConnectionVisitor<EmbeddedData>
{
  editorStore: EditorStore;
  constructor(editorStore: EditorStore) {
    this.editorStore = editorStore;
  }

  visit_Connection(connection: Connection): EmbeddedData {
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
    const _class = connection.class.value;
    const _json = createMockDataForMappingElementSource(
      _class,
      this.editorStore,
    );
    const data = createBareExternalFormat();
    data.data = _json;
    return data;
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
          new TEMPORARY_EmbeddedDataConnectionVisitor(editorStore),
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

export const createRelationalDataFromCSV = (val: string): RelationalCSVData => {
  const data = new RelationalCSVData();
  const separator = '\n-----\n';
  const lineBreak = /\r?\n/;
  const tables = val
    .split(separator)
    .filter((e) => !(e === '\n' || e === '\r' || e === ''));
  tables.forEach((tableData) => {
    const tableInfo = tableData.split(lineBreak);
    assertTrue(
      tableInfo.length >= 2,
      'Table and Schema Name required from test data',
    );
    const table = new RelationalCSVDataTable();
    table.schema = guaranteeNonEmptyString(tableInfo.shift());
    table.table = guaranteeNonEmptyString(tableInfo.shift());
    table.values = tableInfo.join('\n');
    data.tables.push(table);
  });
  return data;
};
