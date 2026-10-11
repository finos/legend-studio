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
import { column, resolvedTable } from '../../__test-utils__/CubeTestNodes.js';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { FilterOperator } from '../../filter/FilterOperator.js';
import { Connection } from '../../graph/Connection.js';
import { Query } from '../../graph/Query.js';
import type { QueryNode } from '../../graph/QueryNode.js';
import { buildSchemasAndValidity } from '../../inference/SchemaInference.js';
import { printIR } from '../../ir/IRPrinter.js';
import { QueryEmitter } from '../../ir/QueryEmitter.js';
import { AggregationFunction } from '../../nodes/transforms/Aggregation.js';
import { Limit } from '../../nodes/transforms/Limit.js';
import {
  type ColumnDirection,
  SortDirection,
} from '../../nodes/transforms/Sort.js';
import { Schema } from '../../schema/Schema.js';
import { PrimitiveType } from '../../types/CubeType.js';
import { checkDrilldown, type Drilldown } from '../Drilldown.js';
import {
  buildDrilldownKeyRule,
  type DrilldownCell,
  deriveDrilldownLevel,
} from '../DrilldownQuery.js';

const RUNTIME = 'test::Runtime';
const ORDERS = '#>{test::Northwind.NORTHWIND.ORDERS}#';
const { ASC, DESC } = SortDirection;

const COLUMNS = [
  column('ORDER_ID'),
  column('SHIP_COUNTRY', 'String', true),
  column('SHIP_CITY', 'String', true),
  column('FREIGHT', 'Float', true),
  column('PRICE', 'Decimal', true),
  column('ORDER_DATE', 'StrictDate', true),
];

/** ORDERS, then a Limit of 100 the run captured */
const runQuery = (): Query => {
  const nodes: QueryNode[] = [
    resolvedTable('relational101', 'ORDERS', COLUMNS),
    new Limit('limit101', 100),
  ];
  return new Query(
    nodes,
    [new Connection('relational101', 'limit101', 'tds')],
    'limit101',
  );
};

const RUN_SCHEMA = new Schema(COLUMNS);

const level = (
  drilldown: Partial<Drilldown>,
  keys: readonly DrilldownCell[],
  sorts: readonly ColumnDirection[] = [],
) =>
  deriveDrilldownLevel({
    query: runQuery(),
    captureId: 'limit101',
    schema: RUN_SCHEMA,
    drilldown: checkDrilldown(
      { columns: [], aggregations: [], ...drilldown },
      RUN_SCHEMA,
    ),
    keys,
    sorts,
  });

/** The run lambda of the level, printed, `from` and the row limit included */
const pureOf = (derived: ReturnType<typeof level>): string =>
  printIR(
    new QueryEmitter(derived.query).emitExecutionLambda({
      rowLimit: 1000,
      runtime: RUNTIME,
    }),
  );

/** Cube's own errors on the derived query's run node: none */
const errorsOf = (derived: ReturnType<typeof level>): readonly string[] =>
  buildSchemasAndValidity(derived.query).validity.get(
    derived.query.selected as string,
  ) ?? ['no validity'];

const BY_COUNTRY_AND_CITY = { columns: ['SHIP_COUNTRY', 'SHIP_CITY'] };

describe(unitTest('Drill-down levels'), () => {
  test('The top level groups by the first level, each number summed, with a count, sorted by the key', () => {
    const top = level(BY_COUNTRY_AND_CITY, []);
    expect(top.isLeaf).toBe(false);
    expect(top.groupColumns).toEqual(['SHIP_COUNTRY']);
    expect(Object.fromEntries(top.columns)).toEqual({
      ORDER_ID: 'ORDER_ID Sum',
      SHIP_COUNTRY: 'SHIP_COUNTRY',
      FREIGHT: 'FREIGHT Sum',
      PRICE: 'PRICE Sum',
    });
    expect(top.countColumn).toBe('Count Rows');
    expect(errorsOf(top)).toEqual([]);
    expect(pureOf(top)).toBe(
      `{| ${ORDERS}->limit(100)->groupBy(~[SHIP_COUNTRY], ~['ORDER_ID Sum': x | $x.ORDER_ID : y | $y->sum(), 'FREIGHT Sum': x | $x.FREIGHT : y | $y->sum(), 'PRICE Sum': x | $x.PRICE : y | $y->sum(), 'Count Rows': x | 1 : y | $y->count()])->sort(~SHIP_COUNTRY->ascending())->limit(1001)->from(${RUNTIME})}`,
    );
  });

  test("A level below filters by the expanded group's key and groups by the levels down to its own", () => {
    const cities = level(BY_COUNTRY_AND_CITY, ['France']);
    expect(cities.groupColumns).toEqual(['SHIP_COUNTRY', 'SHIP_CITY']);
    expect(cities.columns.get('SHIP_CITY')).toBe('SHIP_CITY');
    expect(errorsOf(cities)).toEqual([]);
    expect(pureOf(cities)).toContain(
      `->limit(100)->filter({row | $row.SHIP_COUNTRY == 'France'})->groupBy(~[SHIP_COUNTRY, SHIP_CITY], ~[`,
    );
    expect(pureOf(cities)).toContain(
      `->sort(~SHIP_CITY->ascending())->limit(1001)`,
    );
  });

  test("The leaf filters by every expanded key and gives the run's rows, its columns as they are", () => {
    const rows = level(BY_COUNTRY_AND_CITY, ['France', 'Lyon']);
    expect(rows.isLeaf).toBe(true);
    expect(rows.groupColumns).toEqual([]);
    expect(rows.countColumn).toBeUndefined();
    expect(Object.fromEntries(rows.columns)).toEqual(
      Object.fromEntries(RUN_SCHEMA.names().map((name) => [name, name])),
    );
    expect(errorsOf(rows)).toEqual([]);
    expect(pureOf(rows)).toBe(
      `{| ${ORDERS}->limit(100)->filter({row | ($row.SHIP_COUNTRY == 'France') && ($row.SHIP_CITY == 'Lyon')})->limit(1001)->from(${RUNTIME})}`,
    );
  });

  test('An empty key finds its group with Is Empty', () => {
    expect(pureOf(level(BY_COUNTRY_AND_CITY, [null]))).toContain(
      `->filter({row | $row.SHIP_COUNTRY->isEmpty()})->groupBy(`,
    );
  });

  test('With no level, the run is sorted by the grid and nothing else, or left as it is', () => {
    const flat = level({}, [], [{ column: 'FREIGHT', direction: DESC }]);
    expect(flat.isLeaf).toBe(true);
    expect(errorsOf(flat)).toEqual([]);
    expect(pureOf(flat)).toBe(
      `{| ${ORDERS}->limit(100)->sort(~FREIGHT->descending())->limit(1001)->from(${RUNTIME})}`,
    );
    const unsorted = level({}, []);
    // nothing appended
    expect(unsorted.query.selected).toBe('limit101');
    expect(unsorted.query.nodes.map((node) => node.id)).toEqual([
      'relational101',
      'limit101',
    ]);
    expect(pureOf(unsorted)).toBe(
      `{| ${ORDERS}->limit(100)->limit(1001)->from(${RUNTIME})}`,
    );
  });

  test("A group level's sort: a key as it is, another column by its aggregation, and one with none left out", () => {
    const top = level(
      { columns: ['SHIP_COUNTRY'] },
      [],
      [
        { column: 'SHIP_CITY', direction: DESC },
        { column: 'FREIGHT', direction: DESC },
        { column: 'SHIP_COUNTRY', direction: ASC },
      ],
    );
    expect(pureOf(top)).toContain(
      `->sort([~'FREIGHT Sum'->descending(), ~SHIP_COUNTRY->ascending()])`,
    );
    // the same sort at the leaf is the column's own
    const rows = level(
      { columns: ['SHIP_COUNTRY'] },
      ['France'],
      [
        { column: 'SHIP_CITY', direction: DESC },
        { column: 'FREIGHT', direction: DESC },
      ],
    );
    expect(pureOf(rows)).toContain(
      `->sort([~SHIP_CITY->descending(), ~FREIGHT->descending()])`,
    );
  });

  test("Shows each column as the drill-down's aggregations say, an empty one left out", () => {
    const top = level(
      {
        columns: ['SHIP_COUNTRY'],
        aggregations: [
          { column: 'FREIGHT', function: AggregationFunction.AVERAGE },
          { column: 'ORDER_ID', function: null },
          { column: 'SHIP_CITY', function: AggregationFunction.DISTINCT_COUNT },
        ],
      },
      [],
    );
    expect(Object.fromEntries(top.columns)).toEqual({
      SHIP_COUNTRY: 'SHIP_COUNTRY',
      SHIP_CITY: 'SHIP_CITY Distinct Count',
      FREIGHT: 'FREIGHT Average',
      PRICE: 'PRICE Sum',
    });
    expect(errorsOf(top)).toEqual([]);
  });

  test('Names an output past a column of the same name, as a Group by numbers Count Rows', () => {
    const columns = [
      column('SHIP_COUNTRY', 'String'),
      column('FREIGHT', 'Float'),
      column('FREIGHT Sum', 'Float'),
      column('count rows', 'Integer'),
    ];
    const schema = new Schema(columns);
    const nodes: QueryNode[] = [resolvedTable('relational101', 'T', columns)];
    const derived = deriveDrilldownLevel({
      query: new Query(nodes, [], 'relational101'),
      captureId: 'relational101',
      schema,
      drilldown: checkDrilldown(
        { columns: ['SHIP_COUNTRY'], aggregations: [] },
        schema,
      ),
      keys: [],
      sorts: [],
    });
    expect(Object.fromEntries(derived.columns)).toEqual({
      SHIP_COUNTRY: 'SHIP_COUNTRY',
      FREIGHT: 'FREIGHT Sum 2',
      'FREIGHT Sum': 'FREIGHT Sum Sum',
      'count rows': 'count rows Sum',
    });
    expect(derived.countColumn).toBe('Count Rows 2');
    expect(
      buildSchemasAndValidity(derived.query).validity.get(
        derived.query.selected as string,
      ),
    ).toEqual([]);
  });

  test("Falls back to Cube's own name past the length limit", () => {
    const long = 'L'.repeat(126);
    const columns = [column('K', 'String'), column(long, 'Float')];
    const schema = new Schema(columns);
    const derived = deriveDrilldownLevel({
      query: new Query(
        [resolvedTable('relational101', 'T', columns)],
        [],
        'relational101',
      ),
      captureId: 'relational101',
      schema,
      drilldown: checkDrilldown({ columns: ['K'], aggregations: [] }, schema),
      keys: [],
      sorts: [],
    });
    expect(derived.columns.get(long)).toBe('cube_value');
  });

  test('Never changes the run query, and gives each derived node a free id', () => {
    const query = runQuery();
    const derived = deriveDrilldownLevel({
      query,
      captureId: 'limit101',
      schema: RUN_SCHEMA,
      drilldown: checkDrilldown(
        { columns: ['SHIP_COUNTRY'], aggregations: [] },
        RUN_SCHEMA,
      ),
      keys: ['France'],
      sorts: [{ column: 'FREIGHT', direction: DESC }],
    });
    expect(query.nodes.map((node) => node.id)).toEqual([
      'relational101',
      'limit101',
    ]);
    expect(derived.query.nodes.map((node) => node.id)).toEqual([
      'relational101',
      'limit101',
      'filter101',
      'sort101',
    ]);
    expect(derived.query.selected).toBe('sort101');
  });

  test('Refuses more keys than levels, and a key it cannot compare', () => {
    expect(() =>
      level({ columns: ['SHIP_COUNTRY'] }, ['France', 'Lyon']),
    ).toThrow(`A drill-down of 1 levels can't expand 2 keys`);
    expect(() => level({ columns: ['ORDER_DATE'] }, ['not a date'])).toThrow(
      `Can't find the rows of the group whose ORDER_DATE is "not a date"`,
    );
  });
});

describe(unitTest('Drill-down keys'), () => {
  const FLOAT = PrimitiveType.get('Float');
  const DOUBLE = PrimitiveType.get('meta::pure::precisePrimitives::Double');

  test("A float that a 32-bit float can't hold is found by In of it and its 32-bit neighbour", () => {
    const rule = buildDrilldownKeyRule('FREIGHT', DOUBLE, 0.02);
    expect(rule?.operator).toBe(FilterOperator.IN);
    expect(rule?.value).toEqual([
      { kind: 'float', value: '0.02' },
      { kind: 'float', value: '0.019999999552965164' },
    ]);
    // returned as text, too
    expect(buildDrilldownKeyRule('FREIGHT', FLOAT, '194.72')?.value).toEqual([
      { kind: 'float', value: '194.72' },
      { kind: 'float', value: '194.72000122070312' },
    ]);
  });

  test('A float a 32-bit float holds exactly is found by Equal', () => {
    const rule = buildDrilldownKeyRule('FREIGHT', FLOAT, 2.5);
    expect(rule?.operator).toBe(FilterOperator.EQUAL);
    expect(rule?.value).toEqual({ kind: 'float', value: '2.5' });
  });

  test("Any other key is the grid's Filter by rule: Equal on its exact value, Is Empty on none", () => {
    expect(
      buildDrilldownKeyRule(
        'PRICE',
        PrimitiveType.get('Decimal'),
        '1.23450000000000000001',
      )?.value,
    ).toEqual({ kind: 'decimal', value: '1.23450000000000000001' });
    expect(buildDrilldownKeyRule('FREIGHT', FLOAT, null)?.operator).toBe(
      FilterOperator.IS_EMPTY,
    );
    expect(
      buildDrilldownKeyRule('FREIGHT', FLOAT, 'not a number'),
    ).toBeUndefined();
  });
});
