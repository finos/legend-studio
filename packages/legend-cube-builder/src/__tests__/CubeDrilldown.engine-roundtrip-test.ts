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

import { beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import {
  AggregationFunction,
  buildSchemasAndValidity,
  checkDrilldown,
  type ColumnDirection,
  createNodeRegistry,
  type DrilldownAggregation,
  type DrilldownCell,
  deriveDrilldownLevel,
  type DrilldownLevel,
  Query,
  type Schema,
  SortDirection,
  QueryEmitter,
} from '@finos/legend-cube';
import { CUBE_ENGINE_TEST__getCommit } from '../__test-utils__/CubeEngineTestSupport.js';
import {
  TEST__northwindTable,
  TEST__resolveSources,
} from '../__test-utils__/CubeOperationsTestUtils.js';
import type {
  CubeResult,
  CubeResultValue,
} from '../graph-manager/CubeEngine.js';
import { V1_createEngineBackedCubeEngine } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeEngineTestUtils.js';
import type { V1_LegendCubeEngine } from '../graph-manager/protocol/pure/v1/V1_LegendCubeEngine.js';
import {
  CUBE_NORTHWIND_MODEL as MODEL,
  CUBE_NORTHWIND_RUNTIME as RUNTIME,
} from '../stores/fixtures/CubeNorthwindModel.js';

// The grid's drill-down on the engine (PLAN §11.10): each level's derived
// query runs on H2 Northwind, and its groups are compared with the groups of
// the run's own rows, counted and summed here. ORDERS has 830 orders; 507 of
// them have no SHIP_REGION; FREIGHT is a 32-bit REAL that the engine types as
// a Double.

const ROW_LIMIT = 10000;
const { ASC, DESC } = SortDirection;

let engine: V1_LegendCubeEngine;

beforeAll(async () => {
  const commit = await CUBE_ENGINE_TEST__getCommit();
  process.stdout.write(`Legend Cube drill-down: engine commit ${commit}\n`);
});

beforeEach(() => {
  ({ engine } = V1_createEngineBackedCubeEngine());
});

/** The table, resolved, as the query of a run captured at it, with its schema */
const runOf = async (
  table: string,
  schema = 'NORTHWIND',
): Promise<{ query: Query; schema: Schema }> => {
  const [source] = await TEST__resolveSources(engine, [
    TEST__northwindTable('relational101', table, schema),
  ]);
  if (!source || source.resolution.kind !== 'resolved') {
    throw new Error(`${table} didn't resolve`);
  }
  return {
    query: new Query([source], [], source.id),
    schema: source.resolution.schema,
  };
};

const execute = async (query: Query): Promise<CubeResult> => {
  const { validity } = buildSchemasAndValidity(
    query,
    createNodeRegistry().queryRules,
  );
  expect([...validity].filter(([, errors]) => errors.length)).toEqual([]);
  return engine.execute(
    MODEL,
    new QueryEmitter(query).emitExecutionLambda({
      rowLimit: ROW_LIMIT,
      runtime: RUNTIME,
    }),
  );
};

/** A level's rows, each as the run's columns: a column's value read from the output column the level gives it */
interface LevelRows {
  readonly level: DrilldownLevel;
  readonly rows: Record<string, CubeResultValue>[];
  readonly counts: number[];
}

const runLevel = async (
  run: { query: Query; schema: Schema },
  columns: string[],
  keys: DrilldownCell[],
  sorts: ColumnDirection[] = [],
  aggregations: DrilldownAggregation[] = [],
): Promise<LevelRows> => {
  const level = deriveDrilldownLevel({
    query: run.query,
    captureId: run.query.selected as string,
    schema: run.schema,
    drilldown: checkDrilldown({ columns, aggregations }, run.schema),
    keys,
    sorts,
  });
  const result = await execute(level.query);
  const at = (name: string): number => result.columns.indexOf(name);
  return {
    level,
    rows: result.rows.map((row) =>
      Object.fromEntries(
        Array.from(level.columns).map(([column, output]) => [
          column,
          row[at(output)] ?? null,
        ]),
      ),
    ),
    counts: level.countColumn
      ? result.rows.map((row) => Number(row[at(level.countColumn as string)]))
      : [],
  };
};

/** The run's own rows, by column name */
const allRows = async (run: {
  query: Query;
}): Promise<Record<string, CubeResultValue>[]> => {
  const result = await execute(run.query);
  return result.rows.map((row) =>
    Object.fromEntries(
      result.columns.map((name, index) => [name, row[index] ?? null]),
    ),
  );
};

/** The rows grouped by a column: its value as text, the group's rows */
const groupsOf = (
  rows: Record<string, CubeResultValue>[],
  column: string,
): Map<string, Record<string, CubeResultValue>[]> => {
  const groups = new Map<string, Record<string, CubeResultValue>[]>();
  rows.forEach((row) => {
    const key = String(row[column]);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  });
  return groups;
};

const sum = (rows: Record<string, CubeResultValue>[], column: string): number =>
  rows.reduce((total, row) => total + Number(row[column] ?? 0), 0);

describe('Drill-down levels on the engine', () => {
  test('The top level: one group per country, each counted and summed as its orders are', async () => {
    const run = await runOf('ORDERS');
    const orders = await allRows(run);
    const top = await runLevel(run, ['SHIP_COUNTRY', 'SHIP_CITY'], []);
    const expected = groupsOf(orders, 'SHIP_COUNTRY');
    expect(top.rows.map((row) => String(row.SHIP_COUNTRY))).toEqual(
      // sorted by the level's column, as no sort was asked for
      Array.from(expected.keys()).sort(),
    );
    top.rows.forEach((row, index) => {
      const group = expected.get(String(row.SHIP_COUNTRY)) ?? [];
      expect(top.counts[index]).toBe(group.length);
      expect(Number(row.ORDER_ID)).toBe(sum(group, 'ORDER_ID'));
      expect(Number(row.FREIGHT)).toBeCloseTo(sum(group, 'FREIGHT'), 2);
      // a text column that isn't a level shows nothing on a group row
      expect(row).not.toHaveProperty('SHIP_NAME');
    });
    expect(top.counts.reduce((a, b) => a + b, 0)).toBe(830);
  });

  test("A level below: France's cities, each counted as its orders are", async () => {
    const run = await runOf('ORDERS');
    const french = (await allRows(run)).filter(
      (row) => row.SHIP_COUNTRY === 'France',
    );
    const cities = await runLevel(
      run,
      ['SHIP_COUNTRY', 'SHIP_CITY'],
      ['France'],
    );
    const expected = groupsOf(french, 'SHIP_CITY');
    expect(cities.rows.map((row) => row.SHIP_CITY)).toEqual(
      Array.from(expected.keys()).sort(),
    );
    cities.rows.forEach((row, index) => {
      expect(row.SHIP_COUNTRY).toBe('France');
      expect(cities.counts[index]).toBe(
        expected.get(String(row.SHIP_CITY))?.length,
      );
    });
    expect(cities.counts.reduce((a, b) => a + b, 0)).toBe(77);
  });

  test("The leaf: Lyon's French orders, as the run has them, sorted by the grid", async () => {
    const run = await runOf('ORDERS');
    const lyon = (await allRows(run)).filter(
      (row) => row.SHIP_COUNTRY === 'France' && row.SHIP_CITY === 'Lyon',
    );
    const rows = await runLevel(
      run,
      ['SHIP_COUNTRY', 'SHIP_CITY'],
      ['France', 'Lyon'],
      [{ column: 'FREIGHT', direction: DESC }],
    );
    expect(rows.level.isLeaf).toBe(true);
    expect(rows.rows.map((row) => row.ORDER_ID)).toEqual(
      [...lyon]
        .sort((a, b) => Number(b.FREIGHT) - Number(a.FREIGHT))
        .map((row) => row.ORDER_ID),
    );
  });

  test('An empty key: the 507 orders with no region, by country', async () => {
    const run = await runOf('ORDERS');
    const noRegion = (await allRows(run)).filter(
      (row) => row.SHIP_REGION === null,
    );
    const top = await runLevel(run, ['SHIP_REGION', 'SHIP_COUNTRY'], []);
    const empty = top.rows.findIndex((row) => row.SHIP_REGION === null);
    expect(top.counts[empty]).toBe(507);
    const countries = await runLevel(
      run,
      ['SHIP_REGION', 'SHIP_COUNTRY'],
      [null],
    );
    const expected = groupsOf(noRegion, 'SHIP_COUNTRY');
    expect(countries.rows.map((row) => row.SHIP_COUNTRY)).toEqual(
      Array.from(expected.keys()).sort(),
    );
    expect(countries.counts.reduce((a, b) => a + b, 0)).toBe(507);
  });

  test('The grid sort on a group level sorts by the aggregation: the USA ships the most freight', async () => {
    const run = await runOf('ORDERS');
    const top = await runLevel(
      run,
      ['SHIP_COUNTRY'],
      [],
      [{ column: 'FREIGHT', direction: DESC }],
    );
    expect(top.rows.slice(0, 3).map((row) => row.SHIP_COUNTRY)).toEqual([
      'USA',
      'Germany',
      'Austria',
    ]);
    const freights = top.rows.map((row) => Number(row.FREIGHT));
    expect(freights).toEqual([...freights].sort((a, b) => b - a));
  });

  test("A group row shows each column as the drill-down's aggregations say", async () => {
    const run = await runOf('ORDERS');
    const orders = await allRows(run);
    const top = await runLevel(
      run,
      ['SHIP_COUNTRY'],
      [],
      [{ column: 'SHIP_COUNTRY', direction: ASC }],
      [
        { column: 'FREIGHT', function: AggregationFunction.MAX },
        { column: 'ORDER_ID', function: null },
        { column: 'SHIP_CITY', function: AggregationFunction.DISTINCT_COUNT },
      ],
    );
    const expected = groupsOf(orders, 'SHIP_COUNTRY');
    top.rows.forEach((row) => {
      const group = expected.get(String(row.SHIP_COUNTRY)) ?? [];
      expect(Number(row.FREIGHT)).toBeCloseTo(
        Math.max(...group.map((order) => Number(order.FREIGHT ?? 0))),
        2,
      );
      expect(row).not.toHaveProperty('ORDER_ID');
      expect(Number(row.SHIP_CITY)).toBe(
        new Set(group.map((order) => order.SHIP_CITY)).size,
      );
    });
  });
});

describe('Drill-down keys on the engine', () => {
  test('Every 32-bit REAL key finds its own rows again, though the engine types the column as a Double', async () => {
    const run = await runOf('ORDERS');
    const top = await runLevel(run, ['FREIGHT'], []);
    expect(top.rows.length).toBeGreaterThan(700);
    // a sample: every 30th group, its rows expanded
    const sample = top.rows
      .map((row, index) => ({ key: row.FREIGHT, count: top.counts[index] }))
      .filter((_, index) => index % 30 === 0);
    for (const { key, count } of sample) {
      const rows = await runLevel(run, ['FREIGHT'], [key ?? null]);
      expect([key, rows.rows.length]).toEqual([key, count]);
    }
  }, 120_000);

  test.each<[string, DrilldownCell]>([
    // DECIMAL(10,2), as exact text
    ['DEC', '12.34'],
    // a 64-bit FLOAT that the engine types as Float4, and a DOUBLE
    ['F', 1.5],
    ['D', 0.1],
    ['DT', '2024-01-02'],
    ['TS', '2024-01-02T03:04:05.678000000+0000'],
    ['B', true],
    ['BI', '9007199254740993'],
  ])('An ALLTYPES %s key finds its one row', async (column, key) => {
    const run = await runOf('ALLTYPES', 'CUBETEST');
    const top = await runLevel(run, [column], []);
    expect(top.rows.map((row) => row[column])).toContainEqual(key);
    const rows = await runLevel(run, [column], [key]);
    expect(rows.rows.map((row) => row.ID)).toHaveLength(1);
  });
});
