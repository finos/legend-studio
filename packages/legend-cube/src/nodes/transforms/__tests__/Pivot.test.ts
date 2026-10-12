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
import { column, enumColumn } from '../../../__test-utils__/CubeTestNodes.js';
import { unitTest } from '../../../__test-utils__/CubeTestUtils.js';
import {
  MESSAGE_AGGREGATION_FUNCTION_EMPTY,
  MESSAGE_AGGREGATION_FUNCTION_INCOMPATIBLE,
  MESSAGE_AGGREGATION_FUNCTION_UNKNOWN,
  MESSAGE_CANNOT_BE_EMPTY,
  MESSAGE_CANNOT_HAVE_DUPLICATES,
  MESSAGE_DOES_NOT_HAVE_A_NAME,
  MESSAGE_NOT_IN_INPUT_SCHEMA,
  MESSAGE_PIVOT_AGGREGATION_COLUMN_TAKEN,
  MESSAGE_PIVOT_AGGREGATION_UNSUPPORTED,
  MESSAGE_PIVOT_COLUMN_IS_ROW_COLUMN,
  MESSAGE_PIVOT_COLUMN_NOT_PIVOTABLE,
  MESSAGE_PIVOT_ROW_COLUMN_NOT_GROUPABLE,
  MESSAGE_PIVOT_VALUE_INVALID,
  MESSAGE_PIVOT_VALUE_NOT_A_COLUMN_NAME,
  MESSAGE_PIVOT_VALUES_DIFFER_ONLY_IN_CASE,
  MESSAGE_PIVOT_VALUES_TOO_MANY,
} from '../../../messages/CubeMessages.js';
import { Schema } from '../../../schema/Schema.js';
import type { LiteralValue } from '../../../values/LiteralValue.js';
import { AggregationFunction } from '../Aggregation.js';
import {
  DEFAULT_PIVOT_AGGREGATION,
  getPivotColumnNames,
  isPivotableType,
  Pivot,
  PIVOT_MAX_VALUES,
  type PivotAggregation,
} from '../Pivot.js';

const P = 'meta::pure::precisePrimitives::';
const ORDERS = new Schema([
  column('ORDER_ID', `${P}SmallInt`),
  column('SHIP_COUNTRY', `${P}Varchar`, true, [15]),
  column('SHIP_VIA', `${P}Int`, true),
  column('ORDER_DATE', 'StrictDate', true),
  column('SHIPPED', 'Boolean', true),
  column('FREIGHT', `${P}Double`, true),
  column('PRICE', `${P}Numeric`, true, [10, 2]),
  column('REQUIRED_AT', `${P}Timestamp`, true),
  enumColumn('REGION', 'test::Region', ['EMEA', 'APAC'], true),
  column('PAYLOAD', 'Variant', true),
]);

const integer = (value: string): LiteralValue => ({ kind: 'integer', value });
const string = (value: string): LiteralValue => ({ kind: 'string', value });
const SUM_OF_FREIGHT: PivotAggregation = {
  function: AggregationFunction.SUM,
  column: 'FREIGHT',
};

/** SHIP_VIA's values 1 to 3 by SHIP_COUNTRY, Sum of FREIGHT, or as given */
const pivot = ({
  rows = ['SHIP_COUNTRY'],
  pivotColumn = 'SHIP_VIA',
  values = [integer('1'), integer('2'), integer('3')],
  aggregation = SUM_OF_FREIGHT,
}: {
  rows?: string[];
  pivotColumn?: string;
  values?: LiteralValue[];
  aggregation?: PivotAggregation;
} = {}): Pivot => new Pivot('pivot101', rows, pivotColumn, values, aggregation);

const errorsOf = (node: Pivot): string[] => {
  const errors: string[] = [];
  const valid = node.validate([ORDERS], errors);
  expect(valid).toBe(errors.length === 0);
  return errors;
};

/** The output columns, by name, type and nullability */
const columnsOf = (node: Pivot): [string, string, boolean][] =>
  (node.schematize([ORDERS])?.columns ?? []).map(({ name, type, nullable }) => [
    name,
    type.fullName,
    nullable,
  ]);

describe(unitTest('Pivot'), () => {
  test('Has one input, and by default nothing picked, counting rows', () => {
    const node = new Pivot('pivot101');
    expect(node.type).toBe('pivot');
    expect(node.ports).toEqual(['tds']);
    expect(node.rows).toEqual([]);
    expect(node.column).toBe('');
    expect(node.values).toEqual([]);
    expect(node.aggregation).toEqual(DEFAULT_PIVOT_AGGREGATION);
    expect(errorsOf(node)).toEqual([
      MESSAGE_DOES_NOT_HAVE_A_NAME('Pivot column'),
    ]);
  });

  test('Refuses what is not its shape', () => {
    expect(() => new Pivot('p', ['A', 1 as unknown as string])).toThrow(
      `A pivot's rows must be a list of column names`,
    );
    expect(() => new Pivot('p', [], 1 as unknown as string)).toThrow(
      `A pivot's column must be a column name`,
    );
    expect(
      () => new Pivot('p', [], 'A', [{ kind: 'integer', value: 1 } as never]),
    ).toThrow(`A pivot's values must be a list of literals`);
    expect(() => new Pivot('p', [], 'A', [], { function: 1 } as never)).toThrow(
      `A pivot's aggregation must be {function, column}`,
    );
  });

  test('Keeps frozen copies, and drops its values when its column changes', () => {
    const node = pivot();
    expect(Object.isFrozen(node.rows)).toBe(true);
    expect(Object.isFrozen(node.values)).toBe(true);
    expect(Object.isFrozen(node.values[0])).toBe(true);
    expect(Object.isFrozen(node.aggregation)).toBe(true);
    expect(node.withColumn('SHIP_VIA').values).toHaveLength(3);
    expect(node.withColumn('ORDER_DATE').values).toEqual([]);
    const edited = node
      .withRows(['ORDER_ID'])
      .withValues([integer('2')])
      .withAggregation(DEFAULT_PIVOT_AGGREGATION);
    expect(edited.id).toBe('pivot101');
    expect([edited.rows, edited.column, edited.values]).toEqual([
      ['ORDER_ID'],
      'SHIP_VIA',
      [integer('2')],
    ]);
    expect(edited.aggregation).toEqual(DEFAULT_PIVOT_AGGREGATION);
  });

  test('Is valid with rows, a pivotable column, its values and an aggregation, or no rows', () => {
    expect(errorsOf(pivot())).toEqual([]);
    expect(errorsOf(pivot({ rows: [] }))).toEqual([]);
    expect(
      errorsOf(
        pivot({ aggregation: DEFAULT_PIVOT_AGGREGATION, rows: ['REGION'] }),
      ),
    ).toEqual([]);
  });

  test('Checks its row columns, every one reported', () => {
    expect(errorsOf(pivot({ rows: ['SHIP_COUNTRY', 'SHIP_COUNTRY'] }))).toEqual(
      [MESSAGE_CANNOT_HAVE_DUPLICATES('Row columns')],
    );
    expect(errorsOf(pivot({ rows: ['', 'NOPE', 'PAYLOAD'] }))).toEqual([
      MESSAGE_DOES_NOT_HAVE_A_NAME('Row column'),
      MESSAGE_NOT_IN_INPUT_SCHEMA('Row column', 'NOPE'),
      MESSAGE_PIVOT_ROW_COLUMN_NOT_GROUPABLE('PAYLOAD', 'Variant'),
    ]);
  });

  test('Takes a String, an integer, a StrictDate or a Boolean as its pivot column, not a row column', () => {
    expect(
      ['SHIP_COUNTRY', 'SHIP_VIA', 'ORDER_ID', 'ORDER_DATE', 'SHIPPED'].map(
        (name) => isPivotableType(ORDERS.type(name) as never),
      ),
    ).toEqual([true, true, true, true, true]);
    expect(
      ['FREIGHT', 'PRICE', 'REQUIRED_AT', 'REGION', 'PAYLOAD'].map((name) =>
        isPivotableType(ORDERS.type(name) as never),
      ),
    ).toEqual([false, false, false, false, false]);
    expect(errorsOf(pivot({ pivotColumn: 'NOPE' }))).toEqual([
      MESSAGE_NOT_IN_INPUT_SCHEMA('Pivot column', 'NOPE'),
    ]);
    expect(errorsOf(pivot({ pivotColumn: 'FREIGHT' }))).toEqual([
      MESSAGE_PIVOT_COLUMN_NOT_PIVOTABLE('FREIGHT', 'Double'),
    ]);
    expect(errorsOf(pivot({ pivotColumn: 'PRICE' }))).toEqual([
      MESSAGE_PIVOT_COLUMN_NOT_PIVOTABLE('PRICE', 'Numeric(10,2)'),
    ]);
    expect(
      errorsOf(
        pivot({ rows: ['SHIP_VIA'], aggregation: DEFAULT_PIVOT_AGGREGATION }),
      ),
    ).toEqual([MESSAGE_PIVOT_COLUMN_IS_ROW_COLUMN('SHIP_VIA')]);
  });

  test('Checks its values: some, at most 100, of the column type, none twice, none differing only in case, each naming a column', () => {
    expect(errorsOf(pivot({ values: [] }))).toEqual([
      MESSAGE_CANNOT_BE_EMPTY('Pivot values'),
    ]);
    const many = Array.from({ length: PIVOT_MAX_VALUES + 1 }, (_, index) =>
      integer(String(index)),
    );
    expect(errorsOf(pivot({ values: many }))).toEqual([
      MESSAGE_PIVOT_VALUES_TOO_MANY(100),
    ]);
    expect(errorsOf(pivot({ values: many.slice(1) }))).toEqual([]);
    expect(
      errorsOf(pivot({ values: [string('1'), integer('99999999999')] })),
    ).toEqual([
      MESSAGE_PIVOT_VALUE_INVALID('1', 'Int'),
      MESSAGE_PIVOT_VALUE_INVALID('99999999999', 'Int'),
    ]);
    expect(errorsOf(pivot({ values: [integer('1'), integer('1')] }))).toEqual([
      MESSAGE_CANNOT_HAVE_DUPLICATES('Pivot values'),
    ]);
    // DuckDB gives both the first one's column (p6-case in the evidence folder)
    expect(
      errorsOf(
        pivot({
          pivotColumn: 'SHIP_COUNTRY',
          rows: [],
          values: [string('fr'), string('DE'), string('FR'), string('de')],
        }),
      ),
    ).toEqual([
      MESSAGE_PIVOT_VALUES_DIFFER_ONLY_IN_CASE('FR', 'fr'),
      MESSAGE_PIVOT_VALUES_DIFFER_ONLY_IN_CASE('de', 'DE'),
    ]);
    expect(
      errorsOf(
        pivot({
          pivotColumn: 'SHIP_COUNTRY',
          rows: [],
          values: [
            string(''),
            string('q"t'),
            string('b\\s'),
            string(' x'),
            // Databricks and MemSQL quote names with backticks, which the
            // engine doesn't escape in the pivot's own column name
            string('q`t'),
          ],
        }),
      ),
    ).toEqual([
      MESSAGE_PIVOT_VALUE_NOT_A_COLUMN_NAME(''),
      MESSAGE_PIVOT_VALUE_NOT_A_COLUMN_NAME('q"t'),
      MESSAGE_PIVOT_VALUE_NOT_A_COLUMN_NAME('b\\s'),
      MESSAGE_PIVOT_VALUE_NOT_A_COLUMN_NAME(' x'),
      MESSAGE_PIVOT_VALUE_NOT_A_COLUMN_NAME('q`t'),
    ]);
    // a space, a quote and a bar inside a value are fine
    expect(
      errorsOf(
        pivot({
          pivotColumn: 'SHIP_COUNTRY',
          rows: [],
          values: [string('a b'), string("O'Brien"), string('x|y')],
        }),
      ),
    ).toEqual([]);
  });

  test("Checks its aggregation as a Group's, but for Distinct Value, on a column neither a row nor pivoted", () => {
    expect(
      errorsOf(
        pivot({
          aggregation: {
            function: AggregationFunction.DISTINCT_VALUE,
            column: 'FREIGHT',
          },
        }),
      ),
    ).toEqual([MESSAGE_PIVOT_AGGREGATION_UNSUPPORTED('DistinctValue')]);
    expect(
      errorsOf(pivot({ aggregation: { function: '', column: 'FREIGHT' } })),
    ).toEqual([MESSAGE_AGGREGATION_FUNCTION_EMPTY]);
    expect(
      errorsOf(
        pivot({ aggregation: { function: 'Median', column: 'FREIGHT' } }),
      ),
    ).toEqual([MESSAGE_AGGREGATION_FUNCTION_UNKNOWN('Median')]);
    expect(
      errorsOf(
        pivot({
          aggregation: { function: AggregationFunction.SUM, column: '' },
        }),
      ),
    ).toEqual([MESSAGE_DOES_NOT_HAVE_A_NAME('Aggregation column')]);
    expect(
      errorsOf(
        pivot({
          aggregation: {
            function: AggregationFunction.SUM,
            column: 'ORDER_DATE',
          },
        }),
      ),
    ).toEqual([MESSAGE_AGGREGATION_FUNCTION_INCOMPATIBLE('Sum', 'ORDER_DATE')]);
    expect(
      errorsOf(
        pivot({
          aggregation: {
            function: AggregationFunction.COUNT,
            column: 'SHIP_COUNTRY',
          },
        }),
      ),
    ).toEqual([MESSAGE_PIVOT_AGGREGATION_COLUMN_TAKEN('SHIP_COUNTRY')]);
    expect(
      errorsOf(
        pivot({
          aggregation: {
            function: AggregationFunction.COUNT,
            column: 'SHIP_VIA',
          },
        }),
      ),
    ).toEqual([MESSAGE_PIVOT_AGGREGATION_COLUMN_TAKEN('SHIP_VIA')]);
  });

  test('Stops at the first part that fails: rows, then the column, then the values, then the aggregation', () => {
    expect(
      errorsOf(
        pivot({
          rows: ['NOPE'],
          pivotColumn: 'FREIGHT',
          values: [],
          aggregation: { function: '', column: undefined },
        }),
      ),
    ).toEqual([MESSAGE_NOT_IN_INPUT_SCHEMA('Row column', 'NOPE')]);
    expect(
      errorsOf(
        pivot({ values: [], aggregation: { function: '', column: undefined } }),
      ),
    ).toEqual([MESSAGE_CANNOT_BE_EMPTY('Pivot values')]);
  });

  test('Gives the row columns as the input has them, then a column per value, typed as in a Group and empty but for the counts', () => {
    expect(columnsOf(pivot())).toEqual([
      ['SHIP_COUNTRY', `${P}Varchar(15)`, true],
      ['1', 'Float', true],
      ['2', 'Float', true],
      ['3', 'Float', true],
    ]);
    expect(
      columnsOf(
        pivot({
          rows: ['ORDER_ID', 'SHIP_COUNTRY'],
          aggregation: DEFAULT_PIVOT_AGGREGATION,
        }),
      ),
    ).toEqual([
      ['ORDER_ID', `${P}SmallInt`, false],
      ['SHIP_COUNTRY', `${P}Varchar(15)`, true],
      ['1', 'Integer', false],
      ['2', 'Integer', false],
      ['3', 'Integer', false],
    ]);
    expect(
      columnsOf(
        pivot({
          rows: [],
          pivotColumn: 'ORDER_DATE',
          values: [{ kind: 'strictDate', value: '1997-01-02' }],
          aggregation: { function: AggregationFunction.MAX, column: 'FREIGHT' },
        }),
      ),
    ).toEqual([['1997-01-02', 'Float', true]]);
    expect(pivot({ values: [] }).schematize([ORDERS])).toBeUndefined();
  });

  test('Names a value taken by a row column or an earlier value, in any case, with a suffix', () => {
    expect(
      getPivotColumnNames(
        ['FR', 'fr_2'],
        [string('fr'), string('FR'), string('DE'), string('de')],
      ),
    ).toEqual(['fr_3', 'FR_4', 'DE', 'de_2']);
    expect(getPivotColumnNames([], [{ kind: 'boolean', value: true }])).toEqual(
      ['true'],
    );
  });

  test('Describes its column and its first three values, and leaves the values out when redacted', () => {
    expect(new Pivot('pivot101').describe()).toBe('Pivot (blank)');
    expect(pivot({ values: [integer('1')] }).describe()).toBe(
      'Pivot "SHIP_VIA" into 1',
    );
    expect(
      pivot({
        values: ['1', '2', '3', '4', '5'].map(integer),
      }).describe(),
    ).toBe('Pivot "SHIP_VIA" into 1, 2, 3 and 2 more');
    expect(pivot().describeRedacted()).toBe('Pivot "SHIP_VIA"');
  });

  test('Gives its rows no order, as a Group', () => {
    expect(
      pivot().outputOrder([
        [{ column: 'ORDER_ID', direction: 'ASC' } as never],
      ]),
    ).toEqual([]);
    expect(pivot().consumesInputOrder).toBe(false);
  });
});
