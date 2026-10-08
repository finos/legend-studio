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

/** ORDERS as saved with one column other than the engine's */
const ordersSavedWith = (saved: SchemaColumn): SchemaColumn[] =>
  ORDERS_COLUMNS.map((column) => (column.name === saved.name ? saved : column));

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

/** Lets every answer the fake engine already gave land */
const settle = async (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

/** Imports the spec `text`, as Import (dev) does, which types its tables again */
const importText = (state: CubeEditorState, text: string): void => {
  state.specTransfer.openImport();
  state.specTransfer.setImportText(text);
  expect(state.specTransfer.importSpec()).toBe(true);
};

/** Imports `document`, as Import (dev) does, which types its tables again */
const importDocument = (state: CubeEditorState, document: CubeDocument): void =>
  importText(state, serializeCubeSpec(document));

/** The spec text of `document` as a later format version saves it: it opens read-only */
const newerSpecText = (document: CubeDocument): string =>
  JSON.stringify({
    ...(JSON.parse(serializeCubeSpec(document)) as Record<string, unknown>),
    formatVersion: 2,
  });

/** Imports `document` and waits for its tables to be typed again */
const importAndWait = async (
  state: CubeEditorState,
  document: CubeDocument,
): Promise<void> => {
  importDocument(state, document);
  await settle();
  expect(state.isResolvingSources).toBe(false);
};

type Answer = Map<string, Schema | CubeEngineError>;

const FRESH: Answer = new Map<string, Schema | CubeEngineError>([
  ['relational101', new Schema(ORDERS_COLUMNS)],
  ['relational102', new Schema(CUSTOMERS_COLUMNS)],
]);

const DRIFT_WARNING =
  'This table changed since the cube was saved: added SHIP_COUNTRY; changed SHIP_VIA (TinyInt? to SmallInt?)';

const oldOrdersDocument = (): CubeDocument =>
  new CubeDocument({
    context: CONTEXT,
    query: ordersAndCustomers(OLD_ORDERS_COLUMNS),
  });

const hasFreshOrders = (state: CubeEditorState): boolean =>
  state.analysis.schemas
    .get('relational101')
    ?.isIdenticalTo(new Schema(ORDERS_COLUMNS)) ?? false;

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

  test('Counts a column that only became nullable as a change: FREIGHT was saved as a Double that could not be null', async () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    await importAndWait(
      state,
      new CubeDocument({
        context: CONTEXT,
        query: ordersAndCustomers(
          ordersSavedWith(
            new SchemaColumn('FREIGHT', PrimitiveType.get(`${P}Double`), false),
          ),
        ),
      }),
    );
    expect(hasFreshOrders(state)).toBe(true);
    expect(warningsOf(state, 'relational101')).toEqual([
      'This table changed since the cube was saved: changed FREIGHT (Double to Double?)',
    ]);
    expect(warningsOf(state, 'relational102')).toBeUndefined();
  });

  test('Counts a column whose type alone changed as a change, with no column added or removed', async () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    await importAndWait(
      state,
      new CubeDocument({
        context: CONTEXT,
        query: ordersAndCustomers(
          ordersSavedWith(
            new SchemaColumn(
              'SHIP_VIA',
              PrimitiveType.get(`${P}TinyInt`),
              true,
            ),
          ),
        ),
      }),
    );
    expect(hasFreshOrders(state)).toBe(true);
    expect(warningsOf(state, 'relational101')).toEqual([
      'This table changed since the cube was saved: changed SHIP_VIA (TinyInt? to SmallInt?)',
    ]);
    expect(warningsOf(state, 'relational102')).toBeUndefined();
  });

  test('Counts columns that only moved as a change, and takes their new order', async () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    await importAndWait(
      state,
      new CubeDocument({
        context: CONTEXT,
        // ORDER_ID saved last
        query: ordersAndCustomers([
          ...ORDERS_COLUMNS.slice(1),
          ...ORDERS_COLUMNS.slice(0, 1),
        ]),
      }),
    );
    expect(hasFreshOrders(state)).toBe(true);
    expect(warningsOf(state, 'relational101')).toEqual([
      'This table changed since the cube was saved: reordered its columns',
    ]);
    expect(warningsOf(state, 'relational102')).toBeUndefined();
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

  test('Reads the values of chained Filters again, the second once the first is valid', async () => {
    const state = new CubeEditorState(TEST__createCubeHost().host);
    const shipVia = (text: string): Filter =>
      new Filter(
        `filter${text}`,
        new ColumnComparisonFilter('SHIP_VIA', FilterOperator.NOT_EQUAL, {
          kind: 'invalid',
          text,
        }),
      );
    await importAndWait(
      state,
      new CubeDocument({
        context: CONTEXT,
        query: new Query(
          [
            northwindTable('relational101', 'ORDERS', OLD_ORDERS_COLUMNS),
            shipVia('300'),
            shipVia('301'),
          ],
          [
            new Connection('relational101', 'filter300', 'tds'),
            new Connection('filter300', 'filter301', 'tds'),
          ],
          'filter301',
        ),
      }),
    );
    ['300', '301'].forEach((text) =>
      expect(
        (
          (state.document.query.getNode(`filter${text}`) as Filter)
            .filter as ColumnComparisonFilter
        ).value,
      ).toEqual({ kind: 'integer', value: text }),
    );
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

  test('Treats a table the engine gave no answer for as one it could not type', async () => {
    const { host, fake } = TEST__createCubeHost();
    fake.resolveSchemas.mockResolvedValue(new Map());
    const state = new CubeEditorState(host);
    await importAndWait(
      state,
      new CubeDocument({
        context: CONTEXT,
        query: new Query(
          [
            northwindTable('relational101', 'ORDERS', OLD_ORDERS_COLUMNS),
            unsnapshotted('relational102', 'CUSTOMERS'),
          ],
          [],
          'relational101',
        ),
      }),
    );
    expect(
      state.analysis.schemas
        .get('relational101')
        ?.isIdenticalTo(new Schema(OLD_ORDERS_COLUMNS)),
    ).toBe(true);
    expect(warningsOf(state, 'relational101')).toEqual([
      'Could not re-check this table, so it keeps its saved columns: The engine gave no schema for this table',
    ]);
    expect(nodeOf(state, 'relational102').resolution).toEqual({
      kind: 'failed',
      message: 'The engine gave no schema for this table',
    });
    expect(warningsOf(state, 'relational102')).toBeUndefined();
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

  test('Leaves alone a table the user changed while it was being typed, and checks the snapshot from before the change', async () => {
    const { host, fake } = TEST__createCubeHost();
    const answer = deferred<Answer>();
    fake.resolveSchemas.mockReturnValue(answer.promise);
    const state = new CubeEditorState(host, oldOrdersDocument());
    const run = flowResult(state.reresolveSources());
    const changed = nodeOf(state, 'relational101').withResolution({
      kind: 'resolved',
      schema: new Schema(OLD_ORDERS_COLUMNS),
    });
    state.applyQuery(state.document.query.replace(changed));
    answer.resolve(FRESH);
    await run;
    expect(nodeOf(state, 'relational101')).toBe(changed);
    expect(warningsOf(state, 'relational101')).toBeUndefined();
    // undoing the change brings back the typed table
    state.undo();
    expect(hasFreshOrders(state)).toBe(true);
    expect(warningsOf(state, 'relational101')).toEqual([DRIFT_WARNING]);
  });

  test('Keeps the tables typed when an edit made while they were typed is undone', async () => {
    const { host, fake } = TEST__createCubeHost();
    const answer = deferred<Answer>();
    fake.resolveSchemas.mockReturnValueOnce(answer.promise);
    const state = new CubeEditorState(host);
    importDocument(state, oldOrdersDocument());
    state.select('relational102');
    answer.resolve(FRESH);
    await settle();
    expect(state.document.query.selected).toBe('relational102');
    expect(hasFreshOrders(state)).toBe(true);

    state.undo();
    expect(state.document.query.selected).toBe('relational101');
    expect(hasFreshOrders(state)).toBe(true);
    expect(warningsOf(state, 'relational101')).toEqual([DRIFT_WARNING]);
    expect(state.execution.canExecute).toBe(true);
    expect(fake.resolveSchemas).toHaveBeenCalledTimes(1);
  });

  test('Keeps a table saved without its columns typed when an edit made meanwhile is undone', async () => {
    const { host, fake } = TEST__createCubeHost();
    const answer = deferred<Answer>();
    fake.resolveSchemas.mockReturnValueOnce(answer.promise);
    const state = new CubeEditorState(host);
    importDocument(
      state,
      new CubeDocument({
        context: CONTEXT,
        query: new Query(
          [
            unsnapshotted('relational101', 'ORDERS'),
            unsnapshotted('relational102', 'CUSTOMERS'),
          ],
          [],
          'relational101',
        ),
      }),
    );
    state.select('relational102');
    answer.resolve(FRESH);
    await settle();
    state.undo();
    expect(nodeOf(state, 'relational101').resolution.kind).toBe('resolved');
    expect(state.execution.canExecute).toBe(true);
  });

  test('Types an earlier imported cube when its answer comes after another import, so Undo brings it back typed', async () => {
    const { host, fake } = TEST__createCubeHost();
    const first = deferred<Answer>();
    fake.resolveSchemas.mockReturnValueOnce(first.promise);
    const state = new CubeEditorState(host);
    importDocument(state, oldOrdersDocument());
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
    first.resolve(FRESH);
    await settle();
    // the cube shown is the second one, untouched
    expect(state.document.query).toBe(query);
    expect(
      state.analysis.schemas
        .get('relational101')
        ?.isIdenticalTo(new Schema(CUSTOMERS_COLUMNS)),
    ).toBe(true);
    state.undo();
    expect(hasFreshOrders(state)).toBe(true);
    expect(warningsOf(state, 'relational101')).toEqual([DRIFT_WARNING]);
  });

  test('Says it is resolving again when Undo brings back a cube whose tables are still typed, though the tables of another import were typed meanwhile', async () => {
    const { host, fake } = TEST__createCubeHost();
    const first = deferred<Answer>();
    fake.resolveSchemas.mockReturnValueOnce(first.promise);
    const state = new CubeEditorState(host);
    importDocument(state, oldOrdersDocument());
    expect(state.isResolvingSources).toBe(true);
    // a second import with a table, whose own answer comes at once
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

    state.undo();
    expect(state.isResolvingSources).toBe(true);
    first.resolve(FRESH);
    await settle();
    expect(state.isResolvingSources).toBe(false);
    expect(hasFreshOrders(state)).toBe(true);
    expect(warningsOf(state, 'relational101')).toEqual([DRIFT_WARNING]);
    expect(fake.resolveSchemas).toHaveBeenCalledTimes(2);
  });

  test('Keeps a cube saved by a newer version read-only when its tables are typed after another import, so Undo brings it back read-only', async () => {
    const { host, fake } = TEST__createCubeHost();
    const answer = deferred<Answer>();
    fake.resolveSchemas.mockReturnValueOnce(answer.promise);
    const state = new CubeEditorState(host);
    importText(state, newerSpecText(oldOrdersDocument()));
    expect(state.readOnly).toBe(true);
    // another cube, imported before the first one's tables are typed
    importDocument(state, new CubeDocument({ context: CONTEXT }));
    expect(state.readOnly).toBe(false);
    answer.resolve(FRESH);
    await settle();

    state.undo();
    // the cube brought back is the one typed meanwhile
    expect(hasFreshOrders(state)).toBe(true);
    expect(warningsOf(state, 'relational101')).toEqual([DRIFT_WARNING]);
    expect(state.readOnly).toBe(true);
    expect(state.canUndo).toBe(false);
  });

  test('Says it is resolving only while the cube shown has a table being typed: not after Undo, nor once another cube is open', async () => {
    const { host, fake } = TEST__createCubeHost();
    const answer = deferred<Answer>();
    fake.resolveSchemas.mockReturnValueOnce(answer.promise);
    const state = new CubeEditorState(host);
    importDocument(state, oldOrdersDocument());
    expect(state.isResolvingSources).toBe(true);
    // choosing the node to run keeps the tables being typed
    state.select('relational102');
    expect(state.isResolvingSources).toBe(true);
    state.undo();
    expect(state.isResolvingSources).toBe(true);
    state.undo();
    expect(state.document.query.nodes).toEqual([]);
    expect(state.isResolvingSources).toBe(false);

    // a cube with no tables, imported while the first is still typed
    importDocument(state, new CubeDocument());
    expect(state.isResolvingSources).toBe(false);
    answer.resolve(FRESH);
    await settle();
    expect(state.isResolvingSources).toBe(false);
  });

  test('Stops saying it is resolving when a cube with no tables, or with no model, replaces one being typed, and says it again when Undo brings that one back', async () => {
    const { host, fake } = TEST__createCubeHost();
    const answer = deferred<Answer>();
    fake.resolveSchemas.mockReturnValueOnce(answer.promise);
    const state = new CubeEditorState(host);
    importDocument(state, oldOrdersDocument());
    expect(state.isResolvingSources).toBe(true);

    // a model with no tables: nothing to type
    importDocument(state, new CubeDocument({ context: CONTEXT }));
    expect(state.isResolvingSources).toBe(false);
    // the same tables, by id, but no model to type them with
    importDocument(state, new CubeDocument({ query: ordersAndCustomers() }));
    expect(state.isResolvingSources).toBe(false);

    state.undo();
    expect(state.document.query.nodes).toEqual([]);
    expect(state.isResolvingSources).toBe(false);
    // the first cube is back, its tables still being typed
    state.undo();
    expect(state.isResolvingSources).toBe(true);

    answer.resolve(FRESH);
    await settle();
    expect(state.isResolvingSources).toBe(false);
    expect(hasFreshOrders(state)).toBe(true);
    expect(warningsOf(state, 'relational101')).toEqual([DRIFT_WARNING]);
    expect(fake.resolveSchemas).toHaveBeenCalledTimes(1);
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
