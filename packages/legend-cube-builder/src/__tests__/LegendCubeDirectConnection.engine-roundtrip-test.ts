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

import { beforeEach, describe, expect, test } from '@jest/globals';
import {
  Connection,
  type CubeDocument,
  Join,
  JoinType,
  parseCubeSpec,
  Query,
  RelationalTableSource,
  serializeCubeSpec,
} from '@finos/legend-cube';
import { guaranteeNonNullable, type PlainObject } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { getSourceRecheckWarning } from '../__lib__/LegendCubeLabels.js';
import { TEST__createCubeHost } from '../__test-utils__/CubeTestApplication.js';
import { CubeDirectDatabaseType } from '../graph-manager/CubeConnectionExplorer.js';
import { V1_createEngineBackedCubeConnectionExplorer } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeConnectionExplorerTestUtils.js';
import { V1_createEngineBackedCubeEngine } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeEngineTestUtils.js';
import { CubeEditorState } from '../stores/CubeEditorState.js';
import type { CubeHost } from '../stores/CubeHost.js';
import { CubeDirectConnectionTabState } from '../stores/source-picker/CubeDirectConnectionTabState.js';

// Direct-connection cubes through the page's state, on the real engine
// (:6300): the database connection tab reads the database, Add types each
// table, and the cube runs on the model built from its tables (PLAN §6.8).
// Each database gets its own schema, so these can run beside the other
// engine tests. Rows are compared as sets, never SQL

interface DirectDatabase {
  type: CubeDirectDatabaseType;
  schema: string;
  setupSqls: string[];
  /** Table and column names, as the database stores them */
  orders: string;
  customers: string;
  orderId: string;
  customerId: string;
  amount: string;
  big: string;
  lines: string;
  lineColumns: string[];
  decoy: string;
  mixedCase: string;
  events: string;
  eventColumns: string[];
  hiddenEventColumns: number;
}

const H2_SCHEMA = 'CUBE_E2E';
const DUCKDB_SCHEMA = 'cube_e2e';

const DATABASES: DirectDatabase[] = [
  {
    type: CubeDirectDatabaseType.H2,
    schema: H2_SCHEMA,
    setupSqls: [
      `drop schema if exists ${H2_SCHEMA} cascade`,
      `create schema ${H2_SCHEMA}`,
      `create table ${H2_SCHEMA}.ORDERS (ORDER_ID INT PRIMARY KEY, CUSTOMER_ID VARCHAR(5) NOT NULL, AMOUNT DECIMAL(10,2), BIG BIGINT)`,
      `insert into ${H2_SCHEMA}.ORDERS values (1, 'ALFKI', 12.34, 9007199254740993), (2, 'ANATR', 5.00, 1), (3, 'ALFKI', 7.50, 2)`,
      `create table ${H2_SCHEMA}.CUSTOMERS (CUSTOMER_ID VARCHAR(5) PRIMARY KEY, COUNTRY VARCHAR(15))`,
      `insert into ${H2_SCHEMA}.CUSTOMERS values ('ALFKI', 'Germany'), ('ANATR', 'Mexico')`,
      // a pattern's '_' matches any character: ORDERXLINES must not leak in
      `create table ${H2_SCHEMA}.ORDER_LINES (LINE_ID INT, ORDER_ID INT)`,
      `insert into ${H2_SCHEMA}.ORDER_LINES values (10, 1)`,
      `create table ${H2_SCHEMA}.ORDERXLINES (DECOY_COL VARCHAR(10))`,
      `create table ${H2_SCHEMA}."Mixed Case" ("Id" INT)`,
      `insert into ${H2_SCHEMA}."Mixed Case" values (7)`,
      `create table ${H2_SCHEMA}.EVENTS (ID INT, AT_TIME TIME, NOTE CLOB, R REAL)`,
      `insert into ${H2_SCHEMA}.EVENTS values (1, '10:00:00', 'note', 1.5)`,
    ],
    orders: 'ORDERS',
    customers: 'CUSTOMERS',
    orderId: 'ORDER_ID',
    customerId: 'CUSTOMER_ID',
    amount: 'AMOUNT',
    big: 'BIG',
    lines: 'ORDER_LINES',
    lineColumns: ['LINE_ID', 'ORDER_ID'],
    decoy: 'ORDERXLINES',
    mixedCase: 'Mixed Case',
    events: 'EVENTS',
    // H2's TIME, CLOB and REAL are hidden
    eventColumns: ['ID'],
    hiddenEventColumns: 3,
  },
  {
    type: CubeDirectDatabaseType.DUCKDB,
    schema: DUCKDB_SCHEMA,
    setupSqls: [
      `drop schema if exists ${DUCKDB_SCHEMA} cascade`,
      `create schema ${DUCKDB_SCHEMA}`,
      `create table ${DUCKDB_SCHEMA}.orders (order_id INTEGER PRIMARY KEY, customer_id VARCHAR(5) NOT NULL, amount DECIMAL(10,2), big BIGINT)`,
      `insert into ${DUCKDB_SCHEMA}.orders values (1, 'ALFKI', 12.34, 9007199254740993), (2, 'ANATR', 5.00, 1), (3, 'ALFKI', 7.50, 2)`,
      `create table ${DUCKDB_SCHEMA}.customers (customer_id VARCHAR(5) PRIMARY KEY, country VARCHAR(15))`,
      `insert into ${DUCKDB_SCHEMA}.customers values ('ALFKI', 'Germany'), ('ANATR', 'Mexico')`,
      `create table ${DUCKDB_SCHEMA}.order_lines (line_id INTEGER, order_id INTEGER)`,
      `insert into ${DUCKDB_SCHEMA}.order_lines values (10, 1)`,
      `create table ${DUCKDB_SCHEMA}.orderxlines (decoy_col VARCHAR(10))`,
      `create table ${DUCKDB_SCHEMA}."Mixed Case" ("Id" INTEGER)`,
      `insert into ${DUCKDB_SCHEMA}."Mixed Case" values (7)`,
      `create table ${DUCKDB_SCHEMA}.events (id INTEGER, at_time TIME, note BLOB, r REAL)`,
      `insert into ${DUCKDB_SCHEMA}.events values (1, '10:00:00', 'note'::BLOB, 1.5)`,
    ],
    orders: 'orders',
    customers: 'customers',
    orderId: 'order_id',
    customerId: 'customer_id',
    amount: 'amount',
    big: 'big',
    lines: 'order_lines',
    lineColumns: ['line_id', 'order_id'],
    decoy: 'orderxlines',
    mixedCase: 'Mixed Case',
    events: 'events',
    // DuckDB's REAL is a Float; its TIME and BLOB are hidden
    eventColumns: ['id', 'r'],
    hiddenEventColumns: 2,
  },
];

const quoted = (name: string): string => `"${name}"`;

/** A host on the real engine and connection explorer */
const createHost = (): CubeHost => {
  const { host } = TEST__createCubeHost();
  const { engine } = V1_createEngineBackedCubeEngine();
  const { explorer } = V1_createEngineBackedCubeConnectionExplorer();
  return {
    ...host,
    engine,
    connectionExplorer: explorer,
    modelCatalog: host.modelCatalog,
  };
};

/** Waits for the flows an action started, e.g. a schema's tables */
const settle = async (
  done: () => boolean,
  timeoutMs = 20_000,
): Promise<void> => {
  const start = Date.now();
  while (!done()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out');
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

/** The tab on the database, its connection tested and its schema's tables listed */
const openTab = async (
  database: DirectDatabase,
  state = new CubeEditorState(createHost()),
): Promise<{ state: CubeEditorState; tab: CubeDirectConnectionTabState }> => {
  const tab = new CubeDirectConnectionTabState(state);
  tab.setDatabaseType(database.type);
  tab.setSetupSqlText(database.setupSqls.map((sql) => `${sql};`).join('\n'));
  await flowResult(tab.testConnection());
  expect(tab.error).toBeUndefined();
  expect(tab.schemas).toContain(database.schema);
  tab.selectSchema(database.schema);
  await settle(() => !tab.isListing);
  expect(tab.error).toBeUndefined();
  return { state, tab };
};

/** Adds a table through the tab, typed by the engine */
const pick = async (
  tab: CubeDirectConnectionTabState,
  table: string,
): Promise<RelationalTableSource> => {
  tab.selectTable(quoted(table));
  expect(await flowResult(tab.confirm())).toBe(true);
  expect(tab.error).toBeUndefined();
  return guaranteeNonNullable(
    tab.editorState.document.query.nodes.at(-1),
  ) as RelationalTableSource;
};

const columnNames = (source: RelationalTableSource): string[] =>
  source.resolution.kind === 'resolved'
    ? source.resolution.schema.columns.map((column) => column.name)
    : [];

/** Runs the cube's selected node; its rows, as text, by column name */
const run = async (
  state: CubeEditorState,
): Promise<Record<string, string>[]> => {
  await flowResult(state.execution.execute());
  expect(state.execution.error).toBeUndefined();
  const result = guaranteeNonNullable(state.execution.result);
  const names = result.schema.columns.map((column) => column.name);
  return result.rows.map((row) =>
    Object.fromEntries(
      names.map((name, index) => [name, String(row[index] ?? null)]),
    ),
  );
};

const select = (state: CubeEditorState, nodeId: string): void =>
  state.applyDocument(
    state.document.withQuery(
      new Query(
        state.document.query.nodes,
        state.document.query.connections,
        nodeId,
      ),
    ),
  );

/** The cube as exported, then imported into a page on a new engine, its tables typed again */
const reopen = async (
  document: CubeDocument,
  edit?: (json: PlainObject) => void,
): Promise<CubeEditorState> => {
  const json = JSON.parse(serializeCubeSpec(document)) as PlainObject;
  edit?.(json);
  const state = new CubeEditorState(
    createHost(),
    parseCubeSpec(JSON.stringify(json)).document,
  );
  await flowResult(state.reresolveSources());
  return state;
};

beforeEach(() => {
  localStorage.clear();
});

describe.each(DATABASES)('A direct-connection cube on $type', (database) => {
  test('Picks two tables through the database connection tab, joins them and runs the cube', async () => {
    const { state, tab } = await openTab(database);
    const orders = await pick(tab, database.orders);
    const customers = await pick(tab, database.customers);
    expect(state.document.context?.runtime).toBe('cube::direct::Runtime');
    const join = new Join('join101', {
      leftColumns: [database.customerId],
      rightColumns: [database.customerId],
      joinType: JoinType.INNER,
    });
    state.applyDocument(
      state.document.withQuery(
        new Query(
          [orders, customers, join],
          [
            new Connection(orders.id, join.id, 'leftTds'),
            new Connection(customers.id, join.id, 'rightTds'),
          ],
          join.id,
        ),
      ),
    );
    const rows = await run(state);
    expect(new Set(rows.map((row) => row[database.orderId]))).toEqual(
      new Set(['1', '2', '3']),
    );
  });

  test('Reads big integers and decimals digit for digit', async () => {
    const { state, tab } = await openTab(database);
    await pick(tab, database.orders);
    const rows = await run(state);
    const first = rows.find((row) => row[database.orderId] === '1');
    expect(first?.[database.big]).toBe('9007199254740993');
    expect(Number(first?.[database.amount])).toBe(12.34);
  });

  test('Picks tables by their exact names, whatever their case or characters, and none that only look alike', async () => {
    const { state, tab } = await openTab(database);
    expect(tab.tables.map((table) => table.name)).toEqual(
      expect.arrayContaining([
        database.lines,
        database.decoy,
        database.mixedCase,
      ]),
    );
    const lines = await pick(tab, database.lines);
    expect(columnNames(lines)).toEqual(database.lineColumns);
    const mixedCase = await pick(tab, database.mixedCase);
    expect(columnNames(mixedCase)).toEqual(['Id']);
    select(state, mixedCase.id);
    expect(await run(state)).toEqual([{ Id: '7' }]);
  });

  test("Hides the columns Cube can't type, and runs the rest", async () => {
    const { state, tab } = await openTab(database);
    expect(
      tab.tables.find((table) => table.name === database.events)
        ?.hiddenColumnCount,
    ).toBe(database.hiddenEventColumns);
    const events = await pick(tab, database.events);
    expect(columnNames(events)).toEqual(database.eventColumns);
    const rows = await run(state);
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0] ?? {})).toEqual(database.eventColumns);
  });

  test('Reopens an exported cube with no drift, and shows drift for a table whose saved columns are stale', async () => {
    const { state, tab } = await openTab(database);
    await pick(tab, database.orders);
    await pick(tab, database.customers);
    const reopened = await reopen(state.document);
    expect(reopened.warnings.size).toBe(0);

    const stale = await reopen(state.document, (json) => {
      const [ordersJson] = (json.query as { nodes: PlainObject[] }).nodes;
      (ordersJson as { schemaSnapshot: unknown[] }).schemaSnapshot.pop();
    });
    const [staleOrders, staleCustomers] = stale.document.query.nodes;
    expect(stale.warnings.get(guaranteeNonNullable(staleOrders).key)).toEqual([
      expect.stringContaining(database.big),
    ]);
    expect(
      stale.warnings.get(guaranteeNonNullable(staleCustomers).key),
    ).toBeUndefined();
  });

  test("Keeps the saved columns, with a warning, when the connection's setup SQL fails", async () => {
    const { state, tab } = await openTab(database);
    await pick(tab, database.orders);
    const broken = await reopen(state.document, (json) => {
      const { connection } = (json.context as { model: PlainObject }).model as {
        connection: PlainObject;
      };
      (
        connection.datasourceSpecification as { testDataSetupSqls: string[] }
      ).testDataSetupSqls = ['create tabel BROKEN (A INT)'];
    });
    const [orders] = broken.document.query.nodes;
    expect(orders).toBeInstanceOf(RelationalTableSource);
    expect((orders as RelationalTableSource).resolution.kind).toBe('resolved');
    expect(broken.warnings.get(guaranteeNonNullable(orders).key)).toEqual([
      getSourceRecheckWarning(
        "The database refused a statement: check the connection's setup SQL",
      ),
    ]);
  });
});
