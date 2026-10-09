/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { describe, expect, test } from '@jest/globals';
import {
  CubeDocument,
  PrimitiveType,
  RelationalTableSource,
  Schema,
  SchemaColumn,
} from '@finos/legend-cube';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import {
  CUBE_CSV_MESSAGE,
  CUBE_DIRECT_MESSAGE,
  CUBE_DIRECT_SAMPLE_SETUP_SQL,
} from '../../__lib__/LegendCubeDirectConnectionLabels.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import { FAKE_DIRECT_TABLES } from '../../__test-utils__/FakeCubeConnectionExplorer.js';
import {
  CubeDirectDatabaseType,
  type CubeExploredTable,
} from '../../graph-manager/CubeConnectionExplorer.js';
import {
  createCubeDirectModel,
  CUBE_DIRECT_DATABASE_PATH,
  CUBE_DIRECT_RUNTIME_PATH,
} from '../../graph-manager/CubeDirectConnection.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  CubeTableFlag,
} from '../../graph-manager/CubeEngine.js';
import { CubeEditorState } from '../CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';
import { buildCubeCsvTable } from '../source-picker/CubeCsvSetupSql.js';
import {
  CubeDirectConnectionTabState,
  splitCubeSetupSql,
} from '../source-picker/CubeDirectConnectionTabState.js';

const SCHEMA = 'CUBE_DIRECT';
const ORDERS_SCHEMA = new Schema([
  new SchemaColumn('ORDER_ID', PrimitiveType.get('Integer'), false),
]);
const LINES_SCHEMA = new Schema([
  new SchemaColumn('LINE_ID', PrimitiveType.get('Integer'), false),
]);

const setUp = (
  document?: CubeDocument,
): ReturnType<typeof TEST__createCubeHost> & {
  state: CubeEditorState;
  tab: CubeDirectConnectionTabState;
} => {
  const created = TEST__createCubeHost({
    schemas: new Map([
      [`"${SCHEMA}"."ORDERS"`, ORDERS_SCHEMA],
      [`"${SCHEMA}"."ORDER.LINES"`, LINES_SCHEMA],
    ]),
  });
  const state = new CubeEditorState(created.host, document);
  return { ...created, state, tab: new CubeDirectConnectionTabState(state) };
};

/** A deferred promise, to hold an engine call open */
const deferred = <T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
} => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, resolve, reject };
};

/** Lets the flows started by an action run */
const settle = async (): Promise<void> => {
  for (let tries = 0; tries < 10; tries++) {
    await Promise.resolve();
  }
};

/** Tests the connection and waits for its only schema's tables */
const testConnection = async (
  tab: CubeDirectConnectionTabState,
): Promise<void> => {
  await flowResult(tab.testConnection());
  await settle();
};

const pick = async (
  tab: CubeDirectConnectionTabState,
  table: string,
): Promise<boolean> => {
  tab.selectTable(table);
  return flowResult(tab.confirm());
};

const nodeIds = (state: CubeEditorState): string[] =>
  state.document.query.nodes.map(({ id }) => id);

describe('Setup SQL', () => {
  test('Ends a statement at a line ending with a semicolon, so a statement may span lines', () => {
    expect(
      splitCubeSetupSql(
        [
          'create table T (',
          "  A VARCHAR(5) DEFAULT 'a;b'",
          ');',
          '',
          '   ',
          'insert into T values (1);\r',
          'select 1',
        ].join('\n'),
      ),
    ).toEqual([
      "create table T (\n  A VARCHAR(5) DEFAULT 'a;b'\n)",
      'insert into T values (1)',
      'select 1',
    ]);
    expect(splitCubeSetupSql('  \n ; \n')).toEqual([]);
  });
});

describe('Database connection tab', () => {
  test('Starts on an H2 sample, without calling the engine', () => {
    const { tab, fake, connections } = setUp();
    tab.open();
    expect(tab.isOffered).toBe(true);
    expect(tab.databaseType).toBe(CubeDirectDatabaseType.H2);
    expect(tab.setupSqlText).toBe(CUBE_DIRECT_SAMPLE_SETUP_SQL);
    expect(tab.connection).toEqual({
      _type: 'fake',
      databaseType: CubeDirectDatabaseType.H2,
      setupSqls: splitCubeSetupSql(CUBE_DIRECT_SAMPLE_SETUP_SQL),
    });
    expect(tab.setupSqls).toHaveLength(6);
    expect(tab.canTest).toBe(true);
    expect(tab.canConfirm).toBe(false);
    expect(connections.listSchemas).not.toHaveBeenCalled();
    expect(connections.listTables).not.toHaveBeenCalled();
    expect(fake.resolveSchemas).not.toHaveBeenCalled();
  });

  test('Needs setup SQL for H2, not for DuckDB, whose path it sends trimmed', () => {
    const { tab } = setUp();
    tab.setSetupSqlText('  \n');
    expect(tab.formProblem).toBe(CUBE_DIRECT_MESSAGE.H2_NEEDS_SETUP_SQL);
    expect(tab.connection).toBeUndefined();
    expect(tab.canTest).toBe(false);
    tab.setDatabaseType(CubeDirectDatabaseType.DUCKDB);
    tab.setDuckDbPath(' /data/cube.duckdb ');
    expect(tab.formProblem).toBeUndefined();
    expect(tab.connection).toEqual({
      _type: 'fake',
      databaseType: CubeDirectDatabaseType.DUCKDB,
      setupSqls: [],
      path: '/data/cube.duckdb',
    });
    expect(tab.canTest).toBe(true);
  });

  test("Tests the connection, picks its only schema and lists that schema's tables", async () => {
    const { tab, connections } = setUp();
    await testConnection(tab);
    expect(tab.schemas).toEqual([SCHEMA]);
    expect(tab.schemaName).toBe(SCHEMA);
    expect(connections.listTables).toHaveBeenCalledWith(tab.connection, SCHEMA);
    expect(tab.tables).toEqual(FAKE_DIRECT_TABLES);
    // searched by the names as stored
    tab.setTableSearch('lines');
    expect(tab.tables.map((table) => table.name)).toEqual(['ORDER.LINES']);
    tab.setTableSearch('');
    expect(tab.canConfirm).toBe(false);
    tab.selectTable('"ORDERS"');
    expect(tab.canConfirm).toBe(true);
  });

  test('Waits for a schema to be picked when the database has several', async () => {
    const { tab, connections } = setUp();
    connections.listSchemas.mockResolvedValueOnce(['A', SCHEMA]);
    await testConnection(tab);
    expect(tab.schemaName).toBeUndefined();
    expect(connections.listTables).not.toHaveBeenCalled();
    tab.selectSchema(SCHEMA);
    await settle();
    expect(tab.tables).toEqual(FAKE_DIRECT_TABLES);
  });

  test('Says so when the database has no schema Cube can read', async () => {
    const { tab, connections } = setUp();
    connections.listSchemas.mockResolvedValueOnce([]);
    await testConnection(tab);
    expect(tab.schemas).toEqual([]);
    expect(tab.error).toEqual({ message: CUBE_DIRECT_MESSAGE.NO_SCHEMA_FOUND });
  });

  test('Shows a failed test by its first line, with the rest on demand, and tests again', async () => {
    const { tab, connections } = setUp();
    connections.listSchemas.mockRejectedValueOnce(
      new CubeEngineError(
        CubeEngineErrorKind.COMPILE,
        "The database refused a statement: check the connection's setup SQL\nSyntax error in SQL statement",
      ),
    );
    await testConnection(tab);
    expect(tab.error).toEqual({
      message:
        "The database refused a statement: check the connection's setup SQL",
      detail:
        "The database refused a statement: check the connection's setup SQL\nSyntax error in SQL statement",
    });
    expect(tab.isTesting).toBe(false);
    await testConnection(tab);
    expect(tab.error).toBeUndefined();
    expect(tab.schemas).toEqual([SCHEMA]);
  });

  test('Forgets what it read when the connection changes, and drops the answers still on their way', async () => {
    const { tab, connections } = setUp();
    await testConnection(tab);
    tab.selectTable('"ORDERS"');
    tab.setSetupSqlText(`${CUBE_DIRECT_SAMPLE_SETUP_SQL}\nselect 1;`);
    expect(tab.schemas).toBeUndefined();
    expect(tab.schemaName).toBeUndefined();
    expect(tab.tableName).toBeUndefined();
    expect(tab.canConfirm).toBe(false);

    // a test answered after an edit
    const late = deferred<readonly string[]>();
    connections.listSchemas.mockReturnValueOnce(late.promise);
    const testing = flowResult(tab.testConnection());
    expect(tab.isTesting).toBe(true);
    tab.setDatabaseType(CubeDirectDatabaseType.DUCKDB);
    expect(tab.isTesting).toBe(false);
    late.resolve(['STALE']);
    await testing;
    expect(tab.schemas).toBeUndefined();

    // a failed test answered after the dialog closed
    const failed = deferred<readonly string[]>();
    connections.listSchemas.mockReturnValueOnce(failed.promise);
    const failing = flowResult(tab.testConnection());
    tab.close();
    failed.reject(new Error('Too late'));
    await failing;
    expect(tab.error).toBeUndefined();
    expect(tab.isTesting).toBe(false);
  });

  test("Drops a schema's tables that come after another schema was picked, or after the dialog closed", async () => {
    const { tab, connections } = setUp();
    connections.listSchemas.mockResolvedValueOnce(['A', SCHEMA]);
    await testConnection(tab);
    const late = deferred<readonly CubeExploredTable[]>();
    connections.listTables.mockReturnValueOnce(late.promise);
    tab.selectSchema('A');
    expect(tab.isListing).toBe(true);
    tab.selectSchema(SCHEMA);
    await settle();
    expect(tab.tables).toEqual(FAKE_DIRECT_TABLES);
    late.resolve([]);
    await settle();
    expect(tab.tables).toEqual(FAKE_DIRECT_TABLES);

    const closed = deferred<readonly CubeExploredTable[]>();
    connections.listTables.mockReturnValueOnce(closed.promise);
    tab.selectSchema('A');
    tab.close();
    closed.reject(new Error('Too late'));
    await settle();
    expect(tab.error).toBeUndefined();
    expect(tab.isListing).toBe(false);
  });

  test("Adds a table typed by the engine; the first saves the connection as the cube's model, in one undo step", async () => {
    const { tab, state, fake } = setUp();
    await testConnection(tab);
    const connection = guaranteeNonNullable(tab.connection);
    expect(await pick(tab, '"ORDERS"')).toBe(true);
    const model = createCubeDirectModel(connection);
    expect(fake.resolveSchemas).toHaveBeenCalledWith(
      model,
      new Map([
        [
          'relational101',
          [CUBE_DIRECT_DATABASE_PATH, `"${SCHEMA}"`, '"ORDERS"'],
        ],
      ]),
    );
    expect(state.document.context).toEqual({
      model,
      runtime: CUBE_DIRECT_RUNTIME_PATH,
    });
    const [node] = state.document.query.nodes;
    expect(node).toBeInstanceOf(RelationalTableSource);
    expect(node).toMatchObject({
      database: CUBE_DIRECT_DATABASE_PATH,
      schema: `"${SCHEMA}"`,
      table: '"ORDERS"',
    });
    const { resolution } = node as RelationalTableSource;
    expect(resolution.kind === 'resolved' && resolution.schema).toBe(
      ORDERS_SCHEMA,
    );
    expect(tab.tableName).toBeUndefined();

    // the next table comes from the saved connection, with the same model
    expect(tab.fixedConnection).toBe(connection);
    expect(await pick(tab, '"ORDER.LINES"')).toBe(true);
    expect(fake.resolveSchemas.mock.calls[1]?.[0]).toBe(
      state.document.context?.model,
    );
    expect(nodeIds(state)).toEqual(['relational101', 'relational102']);

    state.undo();
    state.undo();
    expect(state.document.context).toBeUndefined();
    expect(nodeIds(state)).toEqual([]);
  });

  test('Shows why a table could not be typed, and adds it on a retry', async () => {
    const { tab, fake, state } = setUp();
    await testConnection(tab);
    fake.resolveSchemas.mockResolvedValueOnce(
      new Map([
        [
          'relational101',
          new CubeEngineError(
            CubeEngineErrorKind.COMPILE,
            'The database has no table ORDERS in schema CUBE_DIRECT',
            'relational101',
          ),
        ],
      ]),
    );
    expect(await pick(tab, '"ORDERS"')).toBe(false);
    expect(tab.error).toEqual({
      message: 'The database has no table ORDERS in schema CUBE_DIRECT',
    });
    expect(nodeIds(state)).toEqual([]);
    expect(await flowResult(tab.confirm())).toBe(true);
    expect(nodeIds(state)).toEqual(['relational101']);
  });

  test('Adds nothing when the dialog closed or the cube changed while the table was typed', async () => {
    const { tab, fake, state } = setUp();
    await testConnection(tab);
    const closed = deferred<Map<string, Schema | CubeEngineError>>();
    fake.resolveSchemas.mockReturnValueOnce(closed.promise);
    tab.selectTable('"ORDERS"');
    const adding = flowResult(tab.confirm());
    expect(tab.canConfirm).toBe(false);
    tab.close();
    closed.resolve(new Map([['relational101', ORDERS_SCHEMA]]));
    expect(await adding).toBe(false);
    expect(nodeIds(state)).toEqual([]);

    const changed = deferred<Map<string, Schema | CubeEngineError>>();
    fake.resolveSchemas.mockReturnValueOnce(changed.promise);
    const racing = flowResult(tab.confirm());
    // meanwhile the cube got a model of its own
    state.applyDocument(
      state.document.withContext({ model: CUBE_NORTHWIND_MODEL }),
    );
    changed.resolve(new Map([['relational101', ORDERS_SCHEMA]]));
    expect(await racing).toBe(false);
    expect(tab.error).toEqual({ message: CUBE_DIRECT_MESSAGE.CUBE_CHANGED });
    expect(nodeIds(state)).toEqual([]);
  });

  test("Lists a schema's tables again on reopening when the dialog closed while they were listing", async () => {
    const { tab, connections } = setUp();
    connections.listSchemas.mockResolvedValueOnce(['A', SCHEMA]);
    await testConnection(tab);
    connections.listTables.mockReturnValueOnce(new Promise(() => undefined));
    tab.selectSchema(SCHEMA);
    tab.close();
    expect(tab.schemaTables).toBeUndefined();
    tab.open();
    await settle();
    expect(tab.tables).toEqual(FAKE_DIRECT_TABLES);
  });

  test("Doesn't let a table Cube can't read be added", async () => {
    const { tab, connections } = setUp();
    connections.listTables.mockResolvedValueOnce([
      {
        name: 'BLOBS',
        storedName: '"BLOBS"',
        columnCount: 0,
        hiddenColumnCount: 2,
        flags: [CubeTableFlag.UNAVAILABLE],
      },
    ]);
    await testConnection(tab);
    tab.selectTable('"BLOBS"');
    expect(tab.canConfirm).toBe(false);
  });

  test('Keeps a saved connection as it is, listing its schemas once when the dialog opens', async () => {
    const saved = { _type: 'saved', databaseType: 'H2' };
    const { tab, connections } = setUp(
      new CubeDocument().withContext({
        model: createCubeDirectModel(saved),
        runtime: CUBE_DIRECT_RUNTIME_PATH,
      }),
    );
    expect(tab.isOffered).toBe(true);
    expect(tab.connection).toBe(saved);
    tab.setSetupSqlText('drop all objects;');
    tab.setDatabaseType(CubeDirectDatabaseType.DUCKDB);
    expect(tab.setupSqlText).toBe(CUBE_DIRECT_SAMPLE_SETUP_SQL);
    expect(tab.databaseType).toBe(CubeDirectDatabaseType.H2);
    tab.open();
    await settle();
    expect(connections.listSchemas).toHaveBeenCalledTimes(1);
    expect(connections.listSchemas).toHaveBeenCalledWith(saved);
    expect(tab.tables).toEqual(FAKE_DIRECT_TABLES);
    tab.close();
    tab.open();
    await settle();
    expect(connections.listSchemas).toHaveBeenCalledTimes(1);
  });

  test('Is not offered on a cube with a model, or by a host without a connection explorer', () => {
    const { tab } = setUp(
      new CubeDocument().withContext({ model: CUBE_NORTHWIND_MODEL }),
    );
    expect(tab.isOffered).toBe(false);
    expect(tab.canTest).toBe(false);
    const { host } = TEST__createCubeHost();
    const withoutExplorer = new CubeDirectConnectionTabState(
      new CubeEditorState({ ...host, connectionExplorer: undefined }),
    );
    expect(withoutExplorer.isOffered).toBe(false);
    expect(withoutExplorer.connection).toBeUndefined();
  });
});

describe('Loading a CSV into an in-memory DuckDB database', () => {
  const CSV = 'id,city\n1,Paris\n2,Lima\n';

  test('Is offered for DuckDB only, once there is CSV text, and before the cube has a connection', () => {
    const { tab } = setUp();
    tab.setCsvText(CSV);
    expect(tab.canAddCsv).toBe(false);
    expect(tab.addCsv()).toBe(false);
    tab.setDatabaseType(CubeDirectDatabaseType.DUCKDB);
    expect(tab.canAddCsv).toBe(true);
    tab.setCsvText('  \n');
    expect(tab.canAddCsv).toBe(false);
    const saved = setUp(
      new CubeDocument().withContext({
        model: createCubeDirectModel({
          _type: 'saved',
          databaseType: 'DuckDB',
        }),
        runtime: CUBE_DIRECT_RUNTIME_PATH,
      }),
    ).tab;
    saved.setCsvText(CSV);
    expect(saved.canAddCsv).toBe(false);
  });

  test("Writes the CSV into the setup SQL as a table, in place of the H2 sample, then after the viewer's own SQL", () => {
    const { tab } = setUp();
    tab.setDatabaseType(CubeDirectDatabaseType.DUCKDB);
    tab.setCsvText(CSV);
    tab.setCsvTableName('cities');
    expect(tab.addCsv()).toBe(true);
    expect(tab.setupSqlText).toBe(buildCubeCsvTable(CSV, 'cities').sql);
    expect(tab.setupSqls).toHaveLength(4);
    expect(tab.csvText).toBe('');
    expect(tab.csvTableName).toBe('');
    expect(tab.csvNote).toEqual({
      message:
        'Added table csv.cities: 2 rows, 2 columns. Test the connection to list it.',
      isError: false,
    });
    tab.setCsvText('code\nA\n');
    tab.setCsvTableName('codes');
    expect(tab.csvNote).toBeUndefined();
    tab.addCsv();
    expect(tab.setupSqlText).toBe(
      `${buildCubeCsvTable(CSV, 'cities').sql}\n${buildCubeCsvTable('code\nA\n', 'codes').sql}`,
    );
  });

  test('Says why a CSV is refused, keeping its text and the setup SQL', () => {
    const { tab } = setUp();
    tab.setDatabaseType(CubeDirectDatabaseType.DUCKDB);
    tab.setSetupSqlText('create schema s;');
    tab.setCsvText('a,b\n1\n');
    expect(tab.addCsv()).toBe(false);
    expect(tab.csvNote).toEqual({
      message: CUBE_CSV_MESSAGE.RAGGED_ROW(1, 1, 2),
      isError: true,
    });
    expect(tab.csvText).toBe('a,b\n1\n');
    expect(tab.setupSqlText).toBe('create schema s;');
  });

  test("Reads a chosen file as the CSV, its name as the table's", async () => {
    const { tab } = setUp();
    tab.setDatabaseType(CubeDirectDatabaseType.DUCKDB);
    await flowResult(
      tab.loadCsvFile(new File([CSV], 'Sales 2024.csv', { type: 'text/csv' })),
    );
    expect(tab.csvText).toBe(CSV);
    expect(tab.csvTableName).toBe('Sales 2024');
    expect(tab.addCsv()).toBe(true);
    expect(tab.setupSqlText).toContain(
      'create table csv.Sales_2024 (id INTEGER, city VARCHAR);',
    );
  });
});
