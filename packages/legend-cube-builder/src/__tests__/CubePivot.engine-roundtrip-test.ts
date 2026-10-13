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
  AggregationFunction,
  buildSchemasAndValidity,
  ColumnComparisonFilter,
  DEFAULT_PIVOT_AGGREGATION,
  Filter,
  FilterOperator,
  Group,
  type LiteralValue,
  MESSAGE_PIVOT_UNSUPPORTED_DATABASE,
  Pivot,
  type PivotAggregation,
  type Query,
  type QueryNode,
  QueryEmitter,
  RelationalTableSource,
  Schema,
  Sort,
  SortDirection,
} from '@finos/legend-cube';
import type { PlainObject } from '@finos/legend-shared';
import { TEST__chainOf } from '../__test-utils__/CubeOperationsTestUtils.js';
import { CubeDirectDatabaseType } from '../graph-manager/CubeConnectionExplorer.js';
import {
  createCubeDirectModel,
  CUBE_DIRECT_DATABASE_PATH,
  CUBE_DIRECT_RUNTIME_PATH,
} from '../graph-manager/CubeDirectConnection.js';
import type { CubeResult } from '../graph-manager/CubeEngine.js';
import { V1_createEngineBackedCubeEngine } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeEngineTestUtils.js';
import { V1_buildCubeDirectConnection } from '../graph-manager/protocol/pure/v1/V1_CubeDirectConnection.js';

// Pivot on the engine (PLAN §11.12): the static pivot() Cube writes, run on a
// DuckDB direct connection, with values as the probes found them
// (pivot-requirements/ in the evidence folder). Its own schema, so it can run
// beside the other engine tests.

const connection: PlainObject = V1_buildCubeDirectConnection({
  databaseType: CubeDirectDatabaseType.DUCKDB,
  setupSqls: [
    'drop schema if exists cube_pivot cascade',
    'create schema cube_pivot',
    'create table cube_pivot.sales (id INTEGER PRIMARY KEY, country VARCHAR(10), year INTEGER, amount INTEGER, customer VARCHAR(10), day DATE, shipped BOOLEAN)',
    "insert into cube_pivot.sales values (1, 'FR', 2000, 10, 'a b', '2024-01-31', true), (2, 'FR', 2011, 20, 'O''Brien', '2024-02-29', false), (3, 'FR', 2011, 5, 'x|y', '2024-01-31', true), (4, 'DE', 2000, 7, 'a b', '2024-02-29', false), (5, 'DE', 2012, null, 'O''Brien', '2024-01-31', null), (6, null, 2000, 3, 'a b', '2024-02-29', true)",
  ],
  path: '',
});
const model = createCubeDirectModel(connection);

const year = (value: string): LiteralValue => ({ kind: 'integer', value });
const SUM_OF_AMOUNT: PivotAggregation = {
  function: AggregationFunction.SUM,
  column: 'amount',
};

/** The sales table, then the nodes, the last captured, as the engine types the table */
const salesThen = async (...nodes: QueryNode[]): Promise<Query> => {
  const { engine } = V1_createEngineBackedCubeEngine();
  const path: [string, string, string] = [
    CUBE_DIRECT_DATABASE_PATH,
    '"cube_pivot"',
    '"sales"',
  ];
  const typed = (
    await engine.resolveSchemas(model, new Map([['relational101', path]]))
  ).get('relational101');
  expect(typed).toBeInstanceOf(Schema);
  const query = TEST__chainOf([
    new RelationalTableSource(
      'relational101',
      { database: path[0], schema: path[1], table: path[2] },
      { kind: 'resolved', schema: typed as Schema },
    ),
    ...nodes,
  ]);
  const { validity } = buildSchemasAndValidity(query);
  expect([...validity].filter(([, errors]) => errors.length)).toEqual([]);
  return query;
};

/** Runs the sales table, then the nodes, the last captured, on DuckDB */
const run = async (...nodes: QueryNode[]): Promise<CubeResult> =>
  V1_createEngineBackedCubeEngine().engine.execute(
    model,
    new QueryEmitter(await salesThen(...nodes)).emitExecutionLambda({
      rowLimit: 100,
      runtime: CUBE_DIRECT_RUNTIME_PATH,
      databaseType: 'DuckDB',
    }),
  );

/** The rows, their whole numbers as numbers (the engine gives their digits) */
const rowsOf = (result: CubeResult): unknown[][] =>
  result.rows.map((row) =>
    row.map((value) =>
      typeof value === 'string' && /^-?\d+$/u.test(value)
        ? Number(value)
        : value,
    ),
  );

/** The rows, sorted by their first value, empty first */
const sortedRows = (result: CubeResult): unknown[][] =>
  rowsOf(result).sort((a, b) =>
    String(a[0] ?? '').localeCompare(String(b[0] ?? '')),
  );

describe('Pivot on a DuckDB direct connection', () => {
  test("Sums each country's amount per listed year, empty where a country has none, and leaves out the years not listed", async () => {
    const result = await run(
      new Pivot(
        'pivot101',
        ['country'],
        'year',
        [year('2000'), year('2011')],
        SUM_OF_AMOUNT,
      ),
    );
    expect(result.columns).toEqual(['country', '2000', '2011']);
    expect(sortedRows(result)).toEqual([
      [null, 3, null],
      ['DE', 7, null],
      ['FR', 10, 25],
    ]);
  });

  test('Counts rows, 0 where a combination has none, and pivots with no row column into one row', async () => {
    const counted = await run(
      new Pivot(
        'pivot101',
        ['country'],
        'year',
        [year('2000'), year('2011'), year('2012')],
        DEFAULT_PIVOT_AGGREGATION,
      ),
    );
    expect(sortedRows(counted)).toEqual([
      [null, 1, 0, 0],
      ['DE', 1, 0, 1],
      ['FR', 1, 2, 0],
    ]);
    const all = await run(
      new Pivot('pivot101', [], 'year', [year('2000'), year('1999')], {
        function: AggregationFunction.MAX,
        column: 'amount',
      }),
    );
    expect(all.columns).toEqual(['2000', '1999']);
    expect(rowsOf(all)).toEqual([[10, null]]);
  });

  test('Leaves out a combination whose rows hold only values not picked: the pivot first keeps the rows with a picked value', async () => {
    const result = await run(
      new Pivot(
        'pivot101',
        ['country'],
        'year',
        [year('2011')],
        DEFAULT_PIVOT_AGGREGATION,
      ),
    );
    expect(result.columns).toEqual(['country', '2011']);
    // DE and the empty country have rows, but none in 2011
    expect(sortedRows(result)).toEqual([['FR', 2]]);
  });

  test('Names columns by string values with a space, a quote and a bar', async () => {
    const result = await run(
      new Pivot(
        'pivot101',
        ['country'],
        'customer',
        [
          { kind: 'string', value: 'a b' },
          { kind: 'string', value: "O'Brien" },
          { kind: 'string', value: 'x|y' },
        ],
        SUM_OF_AMOUNT,
      ),
    );
    expect(result.columns).toEqual(['country', 'a b', "O'Brien", 'x|y']);
    expect(sortedRows(result)).toEqual([
      [null, 3, null, null],
      ['DE', 7, null, null],
      ['FR', 10, 20, 5],
    ]);
  });

  test('Lets later steps use the value columns: a Filter, then a Sort', async () => {
    const result = await run(
      new Pivot(
        'pivot101',
        ['country'],
        'year',
        [year('2000'), year('2011')],
        SUM_OF_AMOUNT,
      ),
      new Filter(
        'filter101',
        new ColumnComparisonFilter('2000', FilterOperator.GREATER_THAN, {
          kind: 'integer',
          value: '5',
        }),
      ),
      new Sort('sort101', [{ column: '2000', direction: SortDirection.DESC }]),
    );
    expect(rowsOf(result)).toEqual([
      ['FR', 10, 25],
      ['DE', 7, null],
    ]);
  });

  test('Pivots a date and a Boolean column, averaging, and taking the least', async () => {
    const byDay = await run(
      new Pivot(
        'pivot101',
        ['country'],
        'day',
        [
          { kind: 'strictDate', value: '2024-01-31' },
          { kind: 'strictDate', value: '2024-02-29' },
        ],
        { function: AggregationFunction.AVERAGE, column: 'amount' },
      ),
    );
    expect(byDay.columns).toEqual(['country', '2024-01-31', '2024-02-29']);
    expect(sortedRows(byDay)).toEqual([
      [null, null, 3],
      ['DE', null, 7],
      ['FR', 7.5, 20],
    ]);
    const byShipped = await run(
      new Pivot(
        'pivot101',
        [],
        'shipped',
        [
          { kind: 'boolean', value: true },
          { kind: 'boolean', value: false },
        ],
        { function: AggregationFunction.MIN, column: 'amount' },
      ),
    );
    expect(byShipped.columns).toEqual(['true', 'false']);
    expect(rowsOf(byShipped)).toEqual([[3, 7]]);
  });

  test('Gives later steps the value columns as never empty for a count, so a Group can sum them', async () => {
    const result = await run(
      new Pivot(
        'pivot101',
        ['country'],
        'year',
        [year('2000'), year('2011')],
        DEFAULT_PIVOT_AGGREGATION,
      ),
      new Group(
        'group101',
        [],
        [
          {
            column: '2000',
            function: AggregationFunction.SUM,
            name: 'in 2000',
          },
          {
            column: '2011',
            function: AggregationFunction.SUM,
            name: 'in 2011',
          },
        ],
      ),
    );
    expect(rowsOf(result)).toEqual([[3, 2]]);
  });
});

describe("Pivot where the database can't run it", () => {
  test('Is never written for H2, whose engine dialect has no pivot, nor for Trino', async () => {
    const query = await salesThen(
      new Pivot(
        'pivot101',
        [],
        'year',
        [year('2000')],
        DEFAULT_PIVOT_AGGREGATION,
      ),
    );
    ['H2', 'Trino'].forEach((databaseType) =>
      expect(() =>
        new QueryEmitter(query).emitExecutionLambda({
          rowLimit: 100,
          runtime: CUBE_DIRECT_RUNTIME_PATH,
          databaseType,
        }),
      ).toThrow(MESSAGE_PIVOT_UNSUPPORTED_DATABASE(databaseType)),
    );
  });
});
