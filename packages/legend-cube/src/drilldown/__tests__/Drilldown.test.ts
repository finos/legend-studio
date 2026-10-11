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
import { column } from '../../__test-utils__/CubeTestNodes.js';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { AggregationFunction } from '../../nodes/transforms/Aggregation.js';
import { Schema } from '../../schema/Schema.js';
import { PrimitiveType } from '../../types/CubeType.js';
import {
  addDrilldownLevel,
  checkDrilldown,
  type Drilldown,
  getDefaultDrilldownAggregation,
  getDrilldownAggregations,
  isDrilldownAggregation,
  isDrilldownLevelType,
  isEmptyDrilldown,
  removeDrilldownLevel,
  setDrilldownAggregation,
} from '../Drilldown.js';

const { SUM, AVERAGE, COUNT, MAX, DISTINCT_COUNT, COUNT_ROWS } =
  AggregationFunction;

/** ORDERS' shape: keys of each family, numbers of each, and a column no group takes */
const ORDERS = new Schema([
  column('ORDER_ID', 'SmallInt'),
  column('SHIP_COUNTRY', 'Varchar', true, [15]),
  column('SHIP_CITY', 'Varchar', true, [15]),
  column('ORDER_DATE', 'Date', true),
  column('FREIGHT', 'Float', true),
  column('PRICE', 'Numeric', false, [10, 2]),
  column('SHIPPED', 'Boolean', true),
  column('PAYLOAD', 'Variant', true),
  column('SHIPPED_AT', 'StrictTime', true),
]);

const drilldown = (init: Partial<Drilldown>): Drilldown => ({
  columns: [],
  aggregations: [],
  ...init,
});

const type = (name: string) => {
  const found = ORDERS.lookup(name);
  if (!found) {
    throw new Error(`No column ${name}`);
  }
  return found.type;
};

describe(unitTest('Drill-down defaults'), () => {
  test('A number shows its Sum on a group row, any other column nothing', () => {
    expect(
      ORDERS.columns.map((each) => [
        each.name,
        getDefaultDrilldownAggregation(each.type),
      ]),
    ).toEqual([
      ['ORDER_ID', SUM],
      ['SHIP_COUNTRY', null],
      ['SHIP_CITY', null],
      ['ORDER_DATE', null],
      ['FREIGHT', SUM],
      ['PRICE', SUM],
      ['SHIPPED', null],
      ['PAYLOAD', null],
      ['SHIPPED_AT', null],
    ]);
  });

  test("Offers a column a Group's functions for its type, but Count rows", () => {
    expect(getDrilldownAggregations(type('FREIGHT'))).toContain(AVERAGE);
    expect(getDrilldownAggregations(type('SHIP_CITY'))).toEqual(
      expect.arrayContaining([COUNT, DISTINCT_COUNT]),
    );
    expect(getDrilldownAggregations(type('SHIP_CITY'))).not.toContain(SUM);
    ORDERS.columns.forEach((each) =>
      expect(getDrilldownAggregations(each.type)).not.toContain(COUNT_ROWS),
    );
  });

  test('Reads a saved aggregation only with a column and a function or null', () => {
    expect(isDrilldownAggregation({ column: 'A', function: 'Sum' })).toBe(true);
    expect(isDrilldownAggregation({ column: 'A', function: null })).toBe(true);
    expect(isDrilldownAggregation({ column: 'A' })).toBe(false);
    expect(isDrilldownAggregation({ function: 'Sum' })).toBe(false);
    expect(isDrilldownAggregation({ column: 'A', function: 1 })).toBe(false);
    expect(isDrilldownAggregation(null)).toBe(false);
  });
});

describe(unitTest('Drill-down checked against the run'), () => {
  test('Uses every level and aggregation that fits, with no problem', () => {
    const checked = checkDrilldown(
      drilldown({
        columns: ['SHIP_COUNTRY', 'SHIP_CITY'],
        aggregations: [
          { column: 'FREIGHT', function: AVERAGE },
          { column: 'ORDER_ID', function: null },
          { column: 'SHIP_CITY', function: DISTINCT_COUNT },
        ],
      }),
      ORDERS,
    );
    expect(checked.problems).toEqual([]);
    expect(checked.columns).toEqual(['SHIP_COUNTRY', 'SHIP_CITY']);
    expect(checked.aggregationOf('FREIGHT')).toBe(AVERAGE);
    expect(checked.aggregationOf('ORDER_ID')).toBeNull();
    expect(checked.aggregationOf('SHIP_CITY')).toBe(DISTINCT_COUNT);
    // the defaults where none is saved
    expect(checked.aggregationOf('PRICE')).toBe(SUM);
    expect(checked.aggregationOf('ORDER_DATE')).toBeNull();
  });

  test('Matches names in any case, and gives them as the run names them', () => {
    const checked = checkDrilldown(
      drilldown({
        columns: ['ship_country'],
        aggregations: [{ column: 'freight', function: MAX }],
      }),
      ORDERS,
    );
    expect(checked.problems).toEqual([]);
    expect(checked.columns).toEqual(['SHIP_COUNTRY']);
    expect(checked.aggregationOf('FREIGHT')).toBe(MAX);
    expect(checked.aggregationOf('Freight')).toBe(MAX);
  });

  test("Leaves out each level it can't use, says why, and keeps the others in order", () => {
    const checked = checkDrilldown(
      drilldown({
        columns: [
          'REGION',
          'SHIP_COUNTRY',
          'PAYLOAD',
          'Ship_Country',
          'SHIP_CITY',
        ],
      }),
      ORDERS,
    );
    expect(checked.columns).toEqual(['SHIP_COUNTRY', 'SHIP_CITY']);
    expect(checked.problems).toEqual([
      `Drill-down column "REGION" is not in the query's output.`,
      'Drill-down column "PAYLOAD" of type Variant cannot be grouped.',
      'Drill-down column "Ship_Country" is listed more than once.',
    ]);
  });

  test('Refuses a StrictTime level, whose groups Equal could never find again', () => {
    expect(
      checkDrilldown(drilldown({ columns: ['SHIPPED_AT'] }), ORDERS).problems,
    ).toEqual([
      'Drill-down column "SHIPPED_AT" of type StrictTime cannot be grouped.',
    ]);
    expect(isDrilldownLevelType(type('SHIPPED_AT'))).toBe(false);
    expect(isDrilldownLevelType(type('ORDER_DATE'))).toBe(true);
    expect(isDrilldownLevelType(type('PAYLOAD'))).toBe(false);
  });

  test("Leaves out each aggregation it can't use, says why, and falls back to the default", () => {
    const checked = checkDrilldown(
      drilldown({
        aggregations: [
          { column: 'REGION', function: SUM },
          { column: 'FREIGHT', function: 'Median' },
          { column: 'SHIP_CITY', function: SUM },
          { column: 'PRICE', function: MAX },
          { column: 'price', function: AVERAGE },
          { column: 'ORDER_ID', function: COUNT_ROWS },
        ],
      }),
      ORDERS,
    );
    expect(checked.problems).toEqual([
      `Drill-down aggregation column "REGION" is not in the query's output.`,
      'Drill-down aggregation "Median" of column "FREIGHT" is unknown.',
      'Drill-down aggregation "Sum" is incompatible with column "SHIP_CITY".',
      'Drill-down aggregation column "price" is listed more than once.',
      'Drill-down aggregation "CountRows" is incompatible with column "ORDER_ID".',
    ]);
    expect(checked.aggregationOf('FREIGHT')).toBe(SUM);
    expect(checked.aggregationOf('SHIP_CITY')).toBeNull();
    // the first of a column's two is used
    expect(checked.aggregationOf('PRICE')).toBe(MAX);
    expect(checked.aggregationOf('ORDER_ID')).toBe(SUM);
  });

  test('Refuses to say how a group row shows a column the run lacks', () => {
    expect(() =>
      checkDrilldown(drilldown({}), ORDERS).aggregationOf('REGION'),
    ).toThrow(`The drill-down's schema has no column "REGION"`);
  });
});

describe(unitTest('Drill-down edits'), () => {
  test('Adds levels innermost, once in any case, from no drill-down', () => {
    const one = addDrilldownLevel(undefined, 'SHIP_COUNTRY');
    expect(one).toEqual({ columns: ['SHIP_COUNTRY'], aggregations: [] });
    const two = addDrilldownLevel(one, 'SHIP_CITY');
    expect(two.columns).toEqual(['SHIP_COUNTRY', 'SHIP_CITY']);
    expect(addDrilldownLevel(two, 'ship_country')).toBe(two);
  });

  test('Removes a level, the ones inside it moving out, keeping the rest', () => {
    const saved = drilldown({
      columns: ['SHIP_COUNTRY', 'SHIP_CITY', 'ORDER_DATE'],
      aggregations: [{ column: 'FREIGHT', function: MAX }],
      rest: { later: true },
    });
    expect(removeDrilldownLevel(saved, 0)).toEqual({
      ...saved,
      columns: ['SHIP_CITY', 'ORDER_DATE'],
    });
    expect(removeDrilldownLevel(saved, 2).columns).toEqual([
      'SHIP_COUNTRY',
      'SHIP_CITY',
    ]);
  });

  test("Saves a column's aggregation only where it differs from the default", () => {
    const max = setDrilldownAggregation(
      undefined,
      'FREIGHT',
      type('FREIGHT'),
      MAX,
    );
    expect(max.aggregations).toEqual([{ column: 'FREIGHT', function: MAX }]);
    const none = setDrilldownAggregation(max, 'FREIGHT', type('FREIGHT'), null);
    expect(none.aggregations).toEqual([{ column: 'FREIGHT', function: null }]);
    // back to the default: nothing saved
    expect(
      setDrilldownAggregation(none, 'FREIGHT', type('FREIGHT'), SUM)
        .aggregations,
    ).toEqual([]);
    expect(
      setDrilldownAggregation(undefined, 'SHIP_CITY', type('SHIP_CITY'), null),
    ).toEqual({ columns: [], aggregations: [] });
  });

  test("Replaces a column's saved aggregation in any case, keeping its unknown keys", () => {
    const saved = drilldown({
      aggregations: [
        { column: 'freight', function: MAX, rest: { later: 1 } },
        { column: 'PRICE', function: AVERAGE },
      ],
    });
    expect(
      setDrilldownAggregation(saved, 'FREIGHT', type('FREIGHT'), AVERAGE)
        .aggregations,
    ).toEqual([
      { column: 'PRICE', function: AVERAGE },
      { column: 'FREIGHT', function: AVERAGE, rest: { later: 1 } },
    ]);
  });

  test('Counts a drill-down with no level, no aggregation and no unknown key as none', () => {
    expect(isEmptyDrilldown(undefined)).toBe(true);
    expect(isEmptyDrilldown(drilldown({}))).toBe(true);
    expect(isEmptyDrilldown(drilldown({ columns: ['A'] }))).toBe(false);
    expect(
      isEmptyDrilldown(
        drilldown({ aggregations: [{ column: 'A', function: null }] }),
      ),
    ).toBe(false);
    expect(isEmptyDrilldown(drilldown({ rest: { later: true } }))).toBe(false);
  });
});

// the type registry's short names, as the tests above use them
test(unitTest('Drill-down test types resolve'), () => {
  expect(PrimitiveType.get('Variant').displayName).toBe('Variant');
});
