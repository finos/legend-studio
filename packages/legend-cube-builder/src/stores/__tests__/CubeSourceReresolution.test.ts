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
  ColumnComparisonFilter,
  Connection,
  CubeDocument,
  Filter,
  FilterOperator,
  PrimitiveType,
  Query,
  RelationalTableSource,
  Schema,
  SchemaColumn,
  serializeCubeSpec,
} from '@finos/legend-cube';
import { flowResult } from 'mobx';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  CUSTOMERS_COLUMNS,
  NORTHWIND_DATABASE,
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeResult,
} from '../../graph-manager/CubeEngine.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';
import { CubeEditorState } from '../CubeEditorState.js';

const P = 'meta::pure::precisePrimitives::';
const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

/** ORDERS as saved before SHIP_VIA widened from a TinyInt and SHIP_COUNTRY was added */
const OLD_ORDERS_COLUMNS = ORDERS_COLUMNS.filter(
  (column) => column.name !== 'SHIP_COUNTRY',
).map((column) =>
  column.name === 'SHIP_VIA'
    ? new SchemaColumn('SHIP_VIA', PrimitiveType.get(`${P}TinyInt`), true)
    : column,
);

const ordersAndCustomers = (ordersColumns = ORDERS_COLUMNS): Query =>
  new Query(
    [
      northwindTable('relational101', 'ORDERS', ordersColumns),
      northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
    ],
    [],
    'relational101',
  );

/** A source saved without its columns */
const unsnapshotted = (id: string, table: string): RelationalTableSource =>
  new RelationalTableSource(id, {
    database: NORTHWIND_DATABASE,
    schema: 'NORTHWIND',
    table,
  });

const nodeOf = (state: CubeEditorState, id: string): RelationalTableSource =>
  state.document.query.getNode(id) as RelationalTableSource;

const warningsOf = (
  state: CubeEditorState,
  id: string,
): readonly string[] | undefined =>
  state.warnings.get(state.document.query.getNode(id)?.key ?? -1);

const ORDERS_RESULT: CubeResult = {
  columns: ORDERS_COLUMNS.map((column) => column.name),
  rows: [],
  sql: [],
  durationMs: 1,
};

/** An answer the test gives when it chooses */
const deferred = <T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} => {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

/** Imports `document`, as Import (dev) does, and waits for its tables to be typed again */
const importAndWait = async (
  state: CubeEditorState,
  document: CubeDocument,
): Promise<void> => {
  state.specTransfer.openImport();
  state.specTransfer.setImportText(serializeCubeSpec(document));
  expect(state.specTransfer.importSpec()).toBe(true);
  await flowResult(state.reresolveSources());
};

beforeEach(() => {
  localStorage.clear();
});

describe("Typing an imported cube's tables again", () => {
  test('Asks the engine once, for every table of the cube', async () => {
    const { host, fake } = TEST__createCubeHost();
    const state = new CubeEditorState(host);
    state.specTransfer.openImport();
    state.specTransfer.setImportText(
      serializeCubeSpec(
        new CubeDocument({ context: CONTEXT, query: ordersAndCustomers() }),
      ),
    );
    state.specTransfer.importSpec();
    expect(state.isResolvingSources).toBe(true);
    expect(fake.resolveSchemas).toHaveBeenCalledTimes(1);
    const [model, accessors] = fake.resolveSchemas.mock.calls[0] ?? [];
    expect(model).toEqual(CUBE_NORTHWIND_MODEL);
    expect([...(accessors ?? [])]).toEqual([
      ['relational101', [NORTHWIND_DATABASE, 'NORTHWIND', 'ORDERS']],
      ['relational102', [NORTHWIND_DATABASE, 'NORTHWIND', 'CUSTOMERS']],
    ]);
    await flowResult(state.reresolveSources());
    expect(state.isResolvingSources).toBe(false);
  });

  test('Leaves a table whose columns are the saved ones as it is: same node, same query, rows not stale', async () => {
    const { host } = TEST__createCubeHost({ result: ORDERS_RESULT });
    const state = new CubeEditorState(
      host,
      new CubeDocument({ context: CONTEXT, query: ordersAndCustomers() }),
    );
    await flowResult(state.execution.execute());
    const { query } = state.document;
    const historyLength = state.history.length;
    await flowResult(state.reresolveSources());
    expect(state.document.query).toBe(query);
    expect(state.warnings.size).toBe(0);
    expect(state.execution.isStale).toBe(false);
    expect(state.history).toHaveLength(historyLength);
  });

  test('Takes the new columns of a table that changed, says what changed, and adds no undo step', async () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    await importAndWait(
      state,
      new CubeDocument({
        context: CONTEXT,
        query: ordersAndCustomers(OLD_ORDERS_COLUMNS),
      }),
    );
    const orders = nodeOf(state, 'relational101');
    expect(orders.resolution.kind).toBe('resolved');
    expect(
      state.analysis.schemas
        .get('relational101')
        ?.isIdenticalTo(new Schema(ORDERS_COLUMNS)),
    ).toBe(true);
    expect(warningsOf(state, 'relational101')).toEqual([
      'This table changed since the cube was saved: added SHIP_COUNTRY; changed SHIP_VIA (TinyInt? to SmallInt?)',
    ]);
    expect(warningsOf(state, 'relational102')).toBeUndefined();
    // the import is the only step
    expect(state.history).toHaveLength(1);
    state.undo();
    expect(state.document.query.nodes).toEqual([]);
  });

  test('Reads a filter value saved as invalid text again once its column is typed: 300 is a SmallInt, not a TinyInt', async () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    const tables = ordersAndCustomers(OLD_ORDERS_COLUMNS);
    await importAndWait(
      state,
      new CubeDocument({
        context: CONTEXT,
        query: new Query(
          [
            ...tables.nodes,
            new Filter(
              'filter101',
              new ColumnComparisonFilter('SHIP_VIA', FilterOperator.EQUAL, {
                kind: 'invalid',
                text: '300',
              }),
            ),
          ],
          [new Connection('relational101', 'filter101', 'tds')],
          'filter101',
        ),
      }),
    );
    const filter = state.document.query.getNode('filter101') as Filter;
    expect((filter.filter as ColumnComparisonFilter).value).toEqual({
      kind: 'integer',
      value: '300',
    });
    expect(state.analysis.validity.get('filter101')).toEqual([]);
    expect(state.execution.canExecute).toBe(true);
  });

  test("Keeps a table's saved columns when it can't be typed again, and says why", async () => {
    const { host, fake } = TEST__createCubeHost();
    fake.resolveSchemas.mockResolvedValue(
      new Map<string, Schema | CubeEngineError>([
        [
          'relational101',
          new CubeEngineError(
            CubeEngineErrorKind.COMPILE,
            "The table 'ORDERS' can't be found\nat line 4",
            'relational101',
          ),
        ],
        ['relational102', new Schema(CUSTOMERS_COLUMNS)],
      ]),
    );
    const state = new CubeEditorState(host);
    await importAndWait(
      state,
      new CubeDocument({
        context: CONTEXT,
        query: ordersAndCustomers(OLD_ORDERS_COLUMNS),
      }),
    );
    expect(
      state.analysis.schemas
        .get('relational101')
        ?.isIdenticalTo(new Schema(OLD_ORDERS_COLUMNS)),
    ).toBe(true);
    expect(warningsOf(state, 'relational101')).toEqual([
      "Could not re-check this table, so it keeps its saved columns: The table 'ORDERS' can't be found",
    ]);
    expect(state.analysis.validity.get('relational101')).toEqual([]);
  });

  test("Shows the engine's error on a table saved without its columns that can't be typed", async () => {
    const { host } = TEST__createCubeHost();
    const state = new CubeEditorState(host);
    await importAndWait(
      state,
      new CubeDocument({
        context: CONTEXT,
        query: new Query(
          [
            unsnapshotted('relational101', 'ORDERS'),
            unsnapshotted('relational102', 'NOPE'),
          ],
          [],
          'relational101',
        ),
      }),
    );
    // typed, with no warning: there were no saved columns to compare
    expect(nodeOf(state, 'relational101').resolution.kind).toBe('resolved');
    expect(warningsOf(state, 'relational101')).toBeUndefined();
    const nope = nodeOf(state, 'relational102');
    expect(nope.resolution).toEqual({
      kind: 'failed',
      message: 'The table "NORTHWIND.NOPE" can\'t be found',
    });
    expect(state.analysis.validity.get('relational102')).toEqual([
      'The table "NORTHWIND.NOPE" can\'t be found',
    ]);
  });

  test('Treats a failed call as a failure of every table, e.g. a model of a kind Cube cannot run yet, and keeps the cube editable', async () => {
    const { host, fake } = TEST__createCubeHost();
    fake.resolveSchemas.mockRejectedValue(
      new CubeEngineError(
        CubeEngineErrorKind.UNSUPPORTED_MODEL,
        'This cube\'s model kind "pointer" isn\'t supported yet.',
      ),
    );
    const state = new CubeEditorState(host);
    await importAndWait(
      state,
      new CubeDocument({
        context: CONTEXT,
        query: new Query(
          [
            northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
            unsnapshotted('relational102', 'CUSTOMERS'),
          ],
          [],
          'relational101',
        ),
      }),
    );
    expect(warningsOf(state, 'relational101')).toEqual([
      'Could not re-check this table, so it keeps its saved columns: This cube\'s model kind "pointer" isn\'t supported yet.',
    ]);
    expect(state.analysis.validity.get('relational102')).toEqual([
      'This cube\'s model kind "pointer" isn\'t supported yet.',
    ]);
    expect(state.readOnly).toBe(false);
    state.select('relational102');
    expect(state.document.query.selected).toBe('relational102');
  });

  test('Words an unexpected failure by its message', async () => {
    const { host, fake } = TEST__createCubeHost();
    fake.resolveSchemas.mockRejectedValue(new Error('Boom'));
    const state = new CubeEditorState(host);
    await importAndWait(
      state,
      new CubeDocument({ context: CONTEXT, query: ordersAndCustomers() }),
    );
    expect(warningsOf(state, 'relational101')).toEqual([
      'Could not re-check this table, so it keeps its saved columns: Boom',
    ]);
  });

  test('Leaves alone a table the user changed while it was being typed', async () => {
    const { host, fake } = TEST__createCubeHost();
    const answer = deferred<Map<string, Schema | CubeEngineError>>();
    fake.resolveSchemas.mockReturnValue(answer.promise);
    const state = new CubeEditorState(
      host,
      new CubeDocument({
        context: CONTEXT,
        query: ordersAndCustomers(OLD_ORDERS_COLUMNS),
      }),
    );
    const run = flowResult(state.reresolveSources());
    const changed = nodeOf(state, 'relational101').withResolution({
      kind: 'resolved',
      schema: new Schema(OLD_ORDERS_COLUMNS),
    });
    state.applyQuery(state.document.query.replace(changed));
    answer.resolve(
      new Map([
        ['relational101', new Schema(ORDERS_COLUMNS)],
        ['relational102', new Schema(CUSTOMERS_COLUMNS)],
      ]),
    );
    await run;
    expect(nodeOf(state, 'relational101')).toBe(changed);
    expect(state.warnings.size).toBe(0);
  });

  test('Drops the answer for a cube that was replaced meanwhile', async () => {
    const { host, fake } = TEST__createCubeHost();
    const first = deferred<Map<string, Schema | CubeEngineError>>();
    fake.resolveSchemas.mockReturnValueOnce(first.promise);
    const state = new CubeEditorState(host);
    state.specTransfer.openImport();
    state.specTransfer.setImportText(
      serializeCubeSpec(
        new CubeDocument({
          context: CONTEXT,
          query: ordersAndCustomers(OLD_ORDERS_COLUMNS),
        }),
      ),
    );
    state.specTransfer.importSpec();
    const firstRun = flowResult(state.reresolveSources());
    // a second import, whose own answer comes from the fake's tables
    await importAndWait(
      state,
      new CubeDocument({
        context: CONTEXT,
        query: new Query(
          [unsnapshotted('relational101', 'CUSTOMERS')],
          [],
          'relational101',
        ),
      }),
    );
    const { query } = state.document;
    first.resolve(new Map([['relational101', new Schema(ORDERS_COLUMNS)]]));
    await firstRun;
    expect(state.document.query).toBe(query);
    expect(
      state.analysis.schemas
        .get('relational101')
        ?.isIdenticalTo(new Schema(CUSTOMERS_COLUMNS)),
    ).toBe(true);
    expect(state.warnings.size).toBe(0);
  });

  test('Does nothing for a cube with no tables or no model', async () => {
    const { host, fake } = TEST__createCubeHost();
    const state = new CubeEditorState(host);
    await flowResult(state.reresolveSources());
    state.applyDocument(new CubeDocument({ query: ordersAndCustomers() }));
    await flowResult(state.reresolveSources());
    expect(fake.resolveSchemas).not.toHaveBeenCalled();
    expect(state.isResolvingSources).toBe(false);
  });
});
