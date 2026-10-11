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
import type { OrderKey } from '../../../inference/RowOrder.js';
import { Schema, SchemaColumn } from '../../../schema/Schema.js';
import { OpaqueType } from '../../../types/CubeType.js';
import {
  AggregationFunction,
  type ColumnAggregation,
  WindowRankFunction,
  WindowRowFunction,
} from '../Aggregation.js';
import { Partition, validatePartitionColumn } from '../Partition.js';
import { type ColumnDirection, SortDirection } from '../Sort.js';

const P = 'meta::pure::precisePrimitives::';
const ORDERS = new Schema([
  column('ORDER_ID', `${P}SmallInt`),
  column('SHIP_REGION', `${P}Varchar`, true, [15]),
  column('SHIP_COUNTRY', `${P}Varchar`, true, [15]),
  column('ORDER_DATE', `${P}Timestamp`, true),
  column('FREIGHT', `${P}Double`, true),
  column('IS_LATE', 'Boolean', true),
  enumColumn('REGION', 'test::Region', ['EMEA', 'APAC'], true),
  column('PAYLOAD', 'Variant', true),
  new SchemaColumn('BLOB', OpaqueType.get('my::model::Blob'), true),
]);

const {
  COUNT,
  DISTINCT_COUNT,
  DISTINCT_VALUE,
  SUM,
  AVERAGE,
  MIN,
  MAX,
  COUNT_ROWS,
} = AggregationFunction;
const { RANK, DENSE_RANK, ROW_NUMBER } = WindowRankFunction;
const { LAG, LEAD, FIRST, LAST } = WindowRowFunction;
const { ASC, DESC } = SortDirection;

const agg = (
  fn: string,
  aggregationColumn: string | undefined,
  name: string,
): ColumnAggregation => ({ column: aggregationColumn, function: fn, name });

const sortBy = (
  sortColumn: string,
  direction: SortDirection = ASC,
): ColumnDirection => ({ column: sortColumn, direction });

const COUNT_ROWS_AGG = agg(COUNT_ROWS, undefined, 'Count Rows');
const RANK_AGG = agg(RANK, undefined, 'Rank');
const BY_ID = sortBy('ORDER_ID');

const errorsOf = (partition: Partition): string[] => {
  const errors: string[] = [];
  const valid = partition.validate([ORDERS], errors);
  expect(valid).toBe(errors.length === 0);
  return errors;
};

/** The output columns, by name, type and nullability */
const columnsOf = (schema: Schema | undefined): [string, string, boolean][] =>
  (schema?.columns ?? []).map(({ name, type, nullable }) => [
    name,
    type.fullName,
    nullable,
  ]);

/** The columns a valid Partition adds after the input's, by name, type and nullability */
const addedColumnsOf = (partition: Partition): [string, string, boolean][] =>
  columnsOf(partition.schematize([ORDERS])).slice(ORDERS.columns.length);

describe(unitTest('Partition'), () => {
  test('Has one input, and by default no partition column, no sort and no window function', () => {
    const partition = new Partition('partition101');
    expect(partition.type).toBe('partition');
    expect(Partition.TYPE).toBe('partition');
    expect(partition.ports).toEqual(['tds']);
    expect(partition.columns).toEqual([]);
    expect(partition.sorts).toEqual([]);
    expect(partition.aggregations).toEqual([]);
  });

  test('Accepts window functions as saved, whatever their function, and the ones that take no column without a column', () => {
    const partition = new Partition(
      'partition101',
      ['SHIP_COUNTRY'],
      [BY_ID],
      [
        { function: ROW_NUMBER, name: 'Row Number' } as ColumnAggregation,
        { function: COUNT_ROWS, name: 'Count Rows' } as ColumnAggregation,
        agg('Median', 'FREIGHT', ''),
        agg('', '', ''),
        // a rank saved with a column is kept, and reported
        agg(RANK, 'ORDER_ID', 'Rank'),
        // a key it doesn't know is not kept on the window function
        {
          ...agg(SUM, 'FREIGHT', 'FREIGHT Sum'),
          note: 'x',
        } as ColumnAggregation,
      ],
    );
    expect(partition.aggregations).toStrictEqual([
      { column: undefined, function: 'RowNumber', name: 'Row Number' },
      { column: undefined, function: 'CountRows', name: 'Count Rows' },
      { column: 'FREIGHT', function: 'Median', name: '' },
      { column: '', function: '', name: '' },
      { column: 'ORDER_ID', function: 'Rank', name: 'Rank' },
      { column: 'FREIGHT', function: 'Sum', name: 'FREIGHT Sum' },
    ]);
  });

  test('Keeps only the column and direction of a sort key', () => {
    const partition = new Partition(
      'partition101',
      [],
      [{ ...sortBy('ORDER_ID', DESC), note: 'x' } as ColumnDirection],
      [RANK_AGG],
    );
    expect(partition.sorts).toStrictEqual([
      { column: 'ORDER_ID', direction: 'DESC' },
    ]);
  });

  test.each([
    ['a name, not a list', 'SHIP_COUNTRY'],
    ['null', null],
    ['a list with a number', [1]],
    ['a list with null', ['SHIP_COUNTRY', null]],
    ['a list with undefined', [undefined]],
    ['a list with an object', [{ column: 'SHIP_COUNTRY' }]],
  ])('Refuses partition columns that are %s', (_, columns) => {
    expect(() => new Partition('partition101', columns as never)).toThrow(
      `A partition's columns must be a list of column names`,
    );
  });

  test.each([
    ['one sort key, not a list', BY_ID],
    ['a column name', 'ORDER_ID'],
    ['null', null],
    ['a list with null', [null]],
    ['a list with a column name', ['ORDER_ID']],
    ['a list with an entry without a column', [{ direction: ASC }]],
    [
      'a list with an entry whose column is not a string',
      [{ column: 1, direction: ASC }],
    ],
    [
      'a list with an entry whose column is null',
      [{ column: null, direction: ASC }],
    ],
    ['a list with an entry without a direction', [{ column: 'ORDER_ID' }]],
    [
      'a list with an entry whose direction is lower case',
      [{ column: 'ORDER_ID', direction: 'asc' }],
    ],
    [
      'a list with an entry whose direction is unknown',
      [{ column: 'ORDER_ID', direction: 'UP' }],
    ],
    [
      'a list with an entry whose direction is blank',
      [{ column: 'ORDER_ID', direction: '' }],
    ],
  ])('Refuses sorts that are %s', (_, sorts) => {
    expect(
      () => new Partition('partition101', ['SHIP_COUNTRY'], sorts as never),
    ).toThrow(
      `A partition's sorts must be a list of {column, direction}, the direction ASC or DESC`,
    );
  });

  test.each([
    ['one window function, not a list', RANK_AGG],
    ['null', null],
    ['a list with null', [null]],
    ['a list with a function name', [RANK]],
    [
      'a list with an entry without a function',
      [{ column: 'ORDER_ID', name: 'x' }],
    ],
    [
      'a list with an entry whose function is not a string',
      [{ column: 'ORDER_ID', function: 1, name: 'x' }],
    ],
    [
      'a list with an entry whose function is null',
      [{ column: 'ORDER_ID', function: null, name: 'x' }],
    ],
    [
      'a list with an entry without a name',
      [{ column: undefined, function: RANK }],
    ],
    [
      'a list with an entry whose name is not a string',
      [{ column: 'ORDER_ID', function: COUNT, name: 7 }],
    ],
    [
      'a list with an entry whose column is not a string',
      [{ column: 1, function: COUNT, name: 'x' }],
    ],
    [
      'a list with an entry whose column is null',
      [{ column: null, function: RANK, name: 'x' }],
    ],
  ])('Refuses window functions that are %s', (_, aggregations) => {
    expect(
      () =>
        new Partition(
          'partition101',
          ['SHIP_COUNTRY'],
          [BY_ID],
          aggregations as never,
        ),
    ).toThrow(
      `A partition's window functions must be a list of {column, function, name, offset?, buckets?}, the column left out for a function that takes none`,
    );
  });

  test('Keeps a frozen copy of its partition columns, sort keys and window functions', () => {
    const columns = ['SHIP_COUNTRY'];
    const sorts = [sortBy('ORDER_ID', DESC)];
    const aggregations = [agg(SUM, 'FREIGHT', 'FREIGHT Sum')];
    const partition = new Partition(
      'partition101',
      columns,
      sorts,
      aggregations,
    );
    columns.push('SHIP_REGION');
    sorts.push(sortBy('FREIGHT'));
    (sorts[0] as { column: string }).column = 'FREIGHT';
    aggregations.push(RANK_AGG);
    (aggregations[0] as { name: string }).name = 'Freight';
    expect(partition.columns).toEqual(['SHIP_COUNTRY']);
    expect(partition.sorts).toEqual([sortBy('ORDER_ID', DESC)]);
    expect(partition.aggregations).toEqual([
      agg(SUM, 'FREIGHT', 'FREIGHT Sum'),
    ]);
    expect(Object.isFrozen(partition.columns)).toBe(true);
    expect(Object.isFrozen(partition.sorts)).toBe(true);
    expect(Object.isFrozen(partition.sorts[0])).toBe(true);
    expect(Object.isFrozen(partition.aggregations)).toBe(true);
    expect(Object.isFrozen(partition.aggregations[0])).toBe(true);
  });

  test('Keeps its id, saved keys, sort keys and window functions when its partition columns are edited', () => {
    const rest = { note: 'kept' };
    const partition = new Partition(
      'partition101',
      ['SHIP_COUNTRY'],
      [BY_ID],
      [RANK_AGG],
      rest,
    );
    const edited = partition.withColumns(['SHIP_REGION', 'SHIP_COUNTRY']);
    expect(edited).toBeInstanceOf(Partition);
    expect(edited.id).toBe('partition101');
    expect(edited.columns).toEqual(['SHIP_REGION', 'SHIP_COUNTRY']);
    expect(edited.sorts).toEqual([BY_ID]);
    expect(edited.aggregations).toEqual([RANK_AGG]);
    expect(edited.rest).toBe(rest);
  });

  test('Keeps its id, saved keys, partition columns and window functions when its sort keys are edited', () => {
    const rest = { note: 'kept' };
    const partition = new Partition(
      'partition101',
      ['SHIP_COUNTRY'],
      [BY_ID],
      [RANK_AGG],
      rest,
    );
    const edited = partition.withSorts([
      sortBy('ORDER_DATE', DESC),
      sortBy('ORDER_ID'),
    ]);
    expect(edited).toBeInstanceOf(Partition);
    expect(edited.id).toBe('partition101');
    expect(edited.columns).toEqual(['SHIP_COUNTRY']);
    expect(edited.sorts).toEqual([
      sortBy('ORDER_DATE', DESC),
      sortBy('ORDER_ID'),
    ]);
    expect(edited.aggregations).toEqual([RANK_AGG]);
    expect(edited.rest).toBe(rest);
  });

  test('Keeps its id, saved keys, partition columns and sort keys when its window functions are edited', () => {
    const rest = { note: 'kept' };
    const partition = new Partition(
      'partition101',
      ['SHIP_COUNTRY'],
      [BY_ID],
      [RANK_AGG],
      rest,
    );
    const edited = partition.withAggregations([agg(SUM, 'FREIGHT', 'Freight')]);
    expect(edited).toBeInstanceOf(Partition);
    expect(edited.id).toBe('partition101');
    expect(edited.columns).toEqual(['SHIP_COUNTRY']);
    expect(edited.sorts).toEqual([BY_ID]);
    expect(edited.aggregations).toEqual([agg(SUM, 'FREIGHT', 'Freight')]);
    expect(edited.rest).toBe(rest);
  });

  test('Uses its window functions in a window, sorted only while it has sort keys', () => {
    const unsorted = new Partition(
      'partition101',
      ['SHIP_COUNTRY'],
      [],
      [COUNT_ROWS_AGG],
    );
    expect(unsorted.aggregationUse).toEqual({ kind: 'window', sorted: false });
    const sorted = unsorted.withSorts([BY_ID]);
    expect(sorted.aggregationUse).toEqual({ kind: 'window', sorted: true });
    expect(sorted.withSorts([]).aggregationUse).toEqual({
      kind: 'window',
      sorted: false,
    });
  });

  test('Accepts partition columns and sort keys of every type Cube can compare, each window function valid', () => {
    expect(
      errorsOf(
        new Partition(
          'partition101',
          [
            'SHIP_COUNTRY',
            'ORDER_ID',
            'ORDER_DATE',
            'FREIGHT',
            'IS_LATE',
            'REGION',
          ],
          [
            sortBy('SHIP_REGION', DESC),
            sortBy('ORDER_DATE'),
            sortBy('FREIGHT', DESC),
            sortBy('IS_LATE'),
            sortBy('REGION'),
            BY_ID,
          ],
          [
            COUNT_ROWS_AGG,
            agg(COUNT, 'PAYLOAD', 'PAYLOAD Count'),
            agg(SUM, 'FREIGHT', 'FREIGHT Sum'),
            RANK_AGG,
          ],
        ),
      ),
    ).toEqual([]);
  });

  test('Accepts Rank, Dense Rank and Row Number with a sort key and no column', () => {
    expect(
      errorsOf(
        new Partition(
          'partition101',
          ['SHIP_COUNTRY'],
          [sortBy('ORDER_DATE', DESC)],
          [
            RANK_AGG,
            agg(DENSE_RANK, undefined, 'Dense Rank'),
            agg(ROW_NUMBER, undefined, 'Row Number'),
          ],
        ),
      ),
    ).toEqual([]);
  });

  test('Accepts no partition column: one window over all the rows', () => {
    expect(
      errorsOf(
        new Partition(
          'partition101',
          [],
          [BY_ID],
          [agg(SUM, 'FREIGHT', 'FREIGHT Sum'), RANK_AGG],
        ),
      ),
    ).toEqual([]);
  });

  test('Accepts no sort key: an unsorted window, never "Sorts cannot be empty."', () => {
    expect(
      errorsOf(
        new Partition(
          'partition101',
          ['SHIP_COUNTRY'],
          [],
          [agg(SUM, 'FREIGHT', 'FREIGHT Sum'), COUNT_ROWS_AGG],
        ),
      ),
    ).toEqual([]);
  });

  test('Accepts no partition column and no sort key', () => {
    expect(
      errorsOf(new Partition('partition101', [], [], [COUNT_ROWS_AGG])),
    ).toEqual([]);
  });

  test('Accepts a sort column that is also a partition column', () => {
    expect(
      errorsOf(
        new Partition(
          'partition101',
          ['SHIP_COUNTRY', 'ORDER_ID'],
          [sortBy('SHIP_COUNTRY', DESC), BY_ID],
          [RANK_AGG],
        ),
      ),
    ).toEqual([]);
  });

  test('Accepts a partition column that is also aggregated', () => {
    expect(
      errorsOf(
        new Partition(
          'partition101',
          ['SHIP_COUNTRY'],
          [],
          [agg(DISTINCT_COUNT, 'SHIP_COUNTRY', 'SHIP_COUNTRY Distinct Count')],
        ),
      ),
    ).toEqual([]);
  });

  test.each<
    [string, string[], ColumnDirection[], ColumnAggregation[], string[]]
  >([
    // partition columns
    [
      'a partition column twice',
      ['SHIP_COUNTRY', 'ORDER_ID', 'SHIP_COUNTRY'],
      [],
      [COUNT_ROWS_AGG],
      ['Partition columns cannot have duplicates.'],
    ],
    [
      // partition columns compare exactly: 'ship_country' is no column of the input
      'a partition column twice in another case, as a column the input does not have',
      ['SHIP_COUNTRY', 'ship_country'],
      [],
      [COUNT_ROWS_AGG],
      ['Partition column "ship_country" is not present in the input schema.'],
    ],
    [
      'a missing partition column twice, checked for repeats first',
      ['SHIPPER', 'SHIPPER'],
      [],
      [COUNT_ROWS_AGG],
      ['Partition columns cannot have duplicates.'],
    ],
    [
      'a blank partition column twice, checked for repeats first',
      ['', ''],
      [],
      [],
      ['Partition columns cannot have duplicates.'],
    ],
    [
      'a blank partition column',
      [''],
      [],
      [COUNT_ROWS_AGG],
      ['Partition column does not have a name.'],
    ],
    [
      'a partition column the input does not have',
      ['SHIPPER'],
      [],
      [COUNT_ROWS_AGG],
      ['Partition column "SHIPPER" is not present in the input schema.'],
    ],
    [
      'a partition column in another case',
      ['ship_country'],
      [],
      [COUNT_ROWS_AGG],
      ['Partition column "ship_country" is not present in the input schema.'],
    ],
    [
      'a Variant partition column',
      ['PAYLOAD'],
      [],
      [COUNT_ROWS_AGG],
      ['Partition column "PAYLOAD" of type Variant cannot be partitioned.'],
    ],
    [
      'a partition column of a type Cube does not know',
      ['BLOB'],
      [],
      [COUNT_ROWS_AGG],
      ['Partition column "BLOB" of type Blob cannot be partitioned.'],
    ],
    [
      'every partition column with a problem, in order',
      ['SHIPPER', 'SHIP_COUNTRY', '', 'BLOB', 'PAYLOAD'],
      [],
      [COUNT_ROWS_AGG],
      [
        'Partition column "SHIPPER" is not present in the input schema.',
        'Partition column does not have a name.',
        'Partition column "BLOB" of type Blob cannot be partitioned.',
        'Partition column "PAYLOAD" of type Variant cannot be partitioned.',
      ],
    ],
    [
      'a repeated partition column, which stops before the sort keys are checked',
      ['ORDER_ID', 'ORDER_ID'],
      [sortBy('PAYLOAD')],
      [COUNT_ROWS_AGG],
      ['Partition columns cannot have duplicates.'],
    ],
    [
      'a partition column problem, which stops before the sort keys are checked',
      ['SHIPPER'],
      [sortBy(''), sortBy('PAYLOAD')],
      [COUNT_ROWS_AGG],
      ['Partition column "SHIPPER" is not present in the input schema.'],
    ],
    [
      'a partition column problem, which stops before the window functions are checked',
      ['SHIPPER'],
      [],
      [],
      ['Partition column "SHIPPER" is not present in the input schema.'],
    ],
    [
      'a partition column problem, before a broken window function',
      ['PAYLOAD'],
      [],
      [RANK_AGG, agg(SUM, 'SHIP_COUNTRY', '')],
      ['Partition column "PAYLOAD" of type Variant cannot be partitioned.'],
    ],
    // sort keys
    [
      'a blank sort column',
      ['SHIP_COUNTRY'],
      [sortBy('')],
      [COUNT_ROWS_AGG],
      ['Sort column does not have a name.'],
    ],
    [
      'a sort column the input does not have',
      ['SHIP_COUNTRY'],
      [sortBy('SHIPPER', DESC)],
      [COUNT_ROWS_AGG],
      ['Sort column "SHIPPER" is not present in the input schema.'],
    ],
    [
      'a sort column in another case',
      ['SHIP_COUNTRY'],
      [sortBy('order_id')],
      [COUNT_ROWS_AGG],
      ['Sort column "order_id" is not present in the input schema.'],
    ],
    [
      'a Variant sort column',
      ['SHIP_COUNTRY'],
      [sortBy('PAYLOAD')],
      [COUNT_ROWS_AGG],
      ['Sort column "PAYLOAD" of type Variant cannot be sorted.'],
    ],
    [
      'a sort column of a type Cube does not know',
      ['SHIP_COUNTRY'],
      [sortBy('BLOB', DESC)],
      [COUNT_ROWS_AGG],
      ['Sort column "BLOB" of type Blob cannot be sorted.'],
    ],
    [
      'every sort key with a problem, in order',
      ['SHIP_COUNTRY'],
      [
        sortBy('SHIPPER'),
        BY_ID,
        sortBy('', DESC),
        sortBy('BLOB'),
        sortBy('PAYLOAD', DESC),
      ],
      [COUNT_ROWS_AGG],
      [
        'Sort column "SHIPPER" is not present in the input schema.',
        'Sort column does not have a name.',
        'Sort column "BLOB" of type Blob cannot be sorted.',
        'Sort column "PAYLOAD" of type Variant cannot be sorted.',
      ],
    ],
    [
      'a sort column twice, whatever the directions',
      ['SHIP_COUNTRY'],
      [BY_ID, sortBy('ORDER_DATE', DESC), sortBy('ORDER_ID', DESC)],
      [RANK_AGG],
      ['Sort columns cannot have duplicates.'],
    ],
    [
      'two blank sort columns, each as unnamed, not as repeats',
      ['SHIP_COUNTRY'],
      [sortBy(''), sortBy('', DESC)],
      [RANK_AGG],
      [
        'Sort column does not have a name.',
        'Sort column does not have a name.',
      ],
    ],
    [
      'a sort key problem, which stops before repeats are checked',
      ['SHIP_COUNTRY'],
      [sortBy('SHIPPER'), BY_ID, BY_ID],
      [RANK_AGG],
      ['Sort column "SHIPPER" is not present in the input schema.'],
    ],
    [
      'a sort key problem, which stops before the window functions are checked',
      ['SHIP_COUNTRY'],
      [sortBy('PAYLOAD')],
      [],
      ['Sort column "PAYLOAD" of type Variant cannot be sorted.'],
    ],
    [
      'a repeated sort column, which stops before the window functions are checked',
      ['SHIP_COUNTRY'],
      [BY_ID, BY_ID],
      [agg('', 'ORDER_ID', '')],
      ['Sort columns cannot have duplicates.'],
    ],
    // window functions
    [
      'no window function',
      ['SHIP_COUNTRY'],
      [BY_ID],
      [],
      ['Aggregations cannot be empty.'],
    ],
    [
      'no partition column, no sort key and no window function',
      [],
      [],
      [],
      ['Aggregations cannot be empty.'],
    ],
    [
      'a Rank without a sort key',
      ['SHIP_COUNTRY'],
      [],
      [RANK_AGG],
      ['Aggregation function "Rank" requires at least one sort column.'],
    ],
    [
      'a Dense Rank without a sort key',
      ['SHIP_COUNTRY'],
      [],
      [agg(DENSE_RANK, undefined, 'Dense Rank')],
      ['Aggregation function "DenseRank" requires at least one sort column.'],
    ],
    [
      'a Row Number without a sort key',
      [],
      [],
      [agg(ROW_NUMBER, undefined, 'Row Number')],
      ['Aggregation function "RowNumber" requires at least one sort column.'],
    ],
    [
      'a Rank with a column',
      ['SHIP_COUNTRY'],
      [BY_ID],
      [agg(RANK, 'ORDER_ID', 'Rank')],
      ['Aggregation function "Rank" does not allow column.'],
    ],
    [
      'a Rank with a column and no sort key, its column first',
      ['SHIP_COUNTRY'],
      [],
      [agg(RANK, 'ORDER_ID', 'Rank')],
      ['Aggregation function "Rank" does not allow column.'],
    ],
    [
      'a Row Number with a blank column',
      ['SHIP_COUNTRY'],
      [BY_ID],
      [agg(ROW_NUMBER, '', 'Row Number')],
      ['Aggregation function "RowNumber" does not allow column.'],
    ],
    [
      'a function a window does not know',
      ['SHIP_COUNTRY'],
      [BY_ID],
      [agg('Ntile', undefined, 'Ntile')],
      ['Aggregation function "Ntile" is unknown.'],
    ],
    [
      'a blank function',
      ['SHIP_COUNTRY'],
      [BY_ID],
      [agg('', 'FREIGHT', 'FREIGHT Sum')],
      ['Aggregation function cannot be empty.'],
    ],
    [
      'a window function named after a partition column, in another case',
      ['SHIP_COUNTRY'],
      [BY_ID],
      [agg(RANK, undefined, 'Ship_Country')],
      [
        'Aggregation output name "Ship_Country" cannot be the same as input column name.',
      ],
    ],
    [
      'a window function named after an input column it neither partitions nor sorts by',
      ['SHIP_COUNTRY'],
      [BY_ID],
      [agg(SUM, 'FREIGHT', 'freight')],
      [
        'Aggregation output name "freight" cannot be the same as input column name.',
      ],
    ],
    [
      'every window function with a problem, row by row',
      ['SHIP_COUNTRY'],
      [BY_ID],
      [
        agg('', 'ORDER_ID', 'a'),
        agg('Median', 'FREIGHT', 'b'),
        agg('rank', undefined, 'c'),
        agg(SUM, 'FREIGHT', 'FREIGHT Sum'),
        agg(RANK, 'ORDER_ID', 'd'),
        agg(COUNT, undefined, 'e'),
        agg(MAX, 'SHIPPER', 'f'),
        agg(AVERAGE, 'ORDER_DATE', 'g'),
        agg(COUNT_ROWS, 'ORDER_ID', 'h'),
        agg(MIN, 'FREIGHT', ''),
        agg(DENSE_RANK, undefined, 'a"b'),
        agg(ROW_NUMBER, undefined, 'order_id'),
        agg(COUNT, 'ORDER_ID', 'Total'),
        agg(RANK, undefined, 'TOTAL'),
      ],
      [
        'Aggregation function cannot be empty.',
        'Aggregation function "Median" is unknown.',
        'Aggregation function "rank" is unknown.',
        'Aggregation function "Rank" does not allow column.',
        'Aggregation column does not have a name.',
        'Aggregation column "SHIPPER" is not present in the input schema.',
        'Aggregation function "Average" is incompatible with column "ORDER_DATE".',
        'Aggregation function "CountRows" does not allow column.',
        'Aggregation output name cannot be empty.',
        'Aggregation output name is not valid column name.',
        'Aggregation output name "order_id" cannot be the same as input column name.',
        'Aggregation output name "Total" is already present in the output schema.',
        'Aggregation output name "TOTAL" is already present in the output schema.',
      ],
    ],
    [
      'every rank without a sort key, row by row',
      [],
      [],
      [
        RANK_AGG,
        agg(SUM, 'FREIGHT', 'FREIGHT Sum'),
        agg(DENSE_RANK, undefined, 'Dense Rank'),
        agg(ROW_NUMBER, undefined, 'Row Number'),
      ],
      [
        'Aggregation function "Rank" requires at least one sort column.',
        'Aggregation function "DenseRank" requires at least one sort column.',
        'Aggregation function "RowNumber" requires at least one sort column.',
      ],
    ],
  ])(
    'Reports %s, and gives no schema',
    (_, columns, sorts, aggregations, messages) => {
      const partition = new Partition(
        'partition101',
        columns,
        sorts,
        aggregations,
      );
      expect(errorsOf(partition)).toEqual(messages);
      expect(partition.schematize([ORDERS])).toBeUndefined();
    },
  );

  test('Checks one partition column at a time for an editor, stopping at its first problem', () => {
    const errors: string[] = [];
    expect(validatePartitionColumn('SHIP_COUNTRY', ORDERS)).toBe(true);
    expect(validatePartitionColumn('REGION', ORDERS, errors)).toBe(true);
    expect(validatePartitionColumn('', ORDERS, errors)).toBe(false);
    expect(validatePartitionColumn('order_id', ORDERS, errors)).toBe(false);
    expect(validatePartitionColumn('PAYLOAD', ORDERS, errors)).toBe(false);
    expect(validatePartitionColumn('BLOB', ORDERS, errors)).toBe(false);
    expect(validatePartitionColumn('PAYLOAD', ORDERS)).toBe(false);
    expect(errors).toEqual([
      'Partition column does not have a name.',
      'Partition column "order_id" is not present in the input schema.',
      'Partition column "PAYLOAD" of type Variant cannot be partitioned.',
      'Partition column "BLOB" of type Blob cannot be partitioned.',
    ]);
  });

  test("Keeps the input's columns as they are, in the input's order, then adds its window functions", () => {
    const output = new Partition(
      'partition101',
      ['SHIP_COUNTRY', 'ORDER_ID'],
      [sortBy('ORDER_DATE', DESC)],
      [COUNT_ROWS_AGG],
    ).schematize([ORDERS]);
    expect(columnsOf(output)).toEqual([
      ['ORDER_ID', `${P}SmallInt`, false],
      ['SHIP_REGION', `${P}Varchar(15)`, true],
      ['SHIP_COUNTRY', `${P}Varchar(15)`, true],
      ['ORDER_DATE', `${P}Timestamp`, true],
      ['FREIGHT', `${P}Double`, true],
      ['IS_LATE', 'Boolean', true],
      ['REGION', 'test::Region', true],
      ['PAYLOAD', 'meta::pure::metamodel::variant::Variant', true],
      ['BLOB', 'my::model::Blob', true],
      ['Count Rows', 'Integer', false],
    ]);
    expect(
      ORDERS.columns.every((input, index) => output?.columns[index] === input),
    ).toBe(true);
  });

  test('Gives one column per window function, typed as the engine types it and nullable but for the counts and the ranks', () => {
    expect(
      addedColumnsOf(
        new Partition(
          'partition101',
          ['SHIP_COUNTRY'],
          [BY_ID],
          [
            agg(COUNT, 'ORDER_ID', 'Orders'),
            agg(DISTINCT_COUNT, 'SHIP_REGION', 'Regions'),
            COUNT_ROWS_AGG,
            RANK_AGG,
            agg(DENSE_RANK, undefined, 'Dense Rank'),
            agg(ROW_NUMBER, undefined, 'Row Number'),
            agg(SUM, 'ORDER_ID', 'Id Sum'),
            agg(AVERAGE, 'FREIGHT', 'Average Freight'),
            agg(MIN, 'ORDER_DATE', 'First Order'),
            agg(DISTINCT_VALUE, 'SHIP_REGION', 'Ship Region'),
          ],
        ),
      ),
    ).toEqual([
      ['Orders', 'Integer', false],
      ['Regions', 'Integer', false],
      ['Count Rows', 'Integer', false],
      ['Rank', 'Integer', false],
      ['Dense Rank', 'Integer', false],
      ['Row Number', 'Integer', false],
      ['Id Sum', 'Integer', true],
      ['Average Freight', 'Float', true],
      ['First Order', 'DateTime', true],
      ['Ship Region', `${P}Varchar(15)`, true],
    ]);
  });

  test('Types the new window functions: a row function as its column, nullable; NTile Integer, Percent Rank and Cumulative Distribution Float, never empty', () => {
    expect(
      addedColumnsOf(
        new Partition(
          'partition101',
          ['SHIP_COUNTRY'],
          [BY_ID],
          [
            { ...agg(LAG, 'FREIGHT', 'Previous Freight'), offset: 1 },
            { ...agg(LEAD, 'ORDER_DATE', 'Next Date'), offset: 2 },
            agg(FIRST, 'SHIP_REGION', 'First Region'),
            agg(LAST, 'ORDER_ID', 'Last Id'),
            {
              ...agg(WindowRankFunction.NTILE, undefined, 'Quartile'),
              buckets: 4,
            },
            agg(WindowRankFunction.PERCENT_RANK, undefined, 'Percent Rank'),
            agg(
              WindowRankFunction.CUMULATIVE_DISTRIBUTION,
              undefined,
              'Cumulative Distribution',
            ),
          ],
        ),
      ),
    ).toEqual([
      ['Previous Freight', `${P}Double`, true],
      ['Next Date', `${P}Timestamp`, true],
      ['First Region', `${P}Varchar(15)`, true],
      ['Last Id', `${P}SmallInt`, true],
      ['Quartile', 'Integer', false],
      ['Percent Rank', 'Float', false],
      ['Cumulative Distribution', 'Float', false],
    ]);
  });

  test('Gives its window functions in the order it lists them, ranks and aggregates interleaved', () => {
    expect(
      addedColumnsOf(
        new Partition(
          'partition101',
          ['SHIP_COUNTRY'],
          [sortBy('ORDER_DATE')],
          [
            agg(SUM, 'FREIGHT', 'FREIGHT Sum'),
            RANK_AGG,
            agg(MAX, 'FREIGHT', 'FREIGHT Max'),
          ],
        ),
      ),
    ).toEqual([
      ['FREIGHT Sum', 'Float', true],
      ['Rank', 'Integer', false],
      ['FREIGHT Max', 'Float', true],
    ]);
  });

  test('Types its window functions the same with no partition column and no sort key', () => {
    expect(
      addedColumnsOf(
        new Partition(
          'partition101',
          [],
          [],
          [agg(SUM, 'ORDER_ID', 'Id Sum'), COUNT_ROWS_AGG],
        ),
      ),
    ).toEqual([
      ['Id Sum', 'Integer', true],
      ['Count Rows', 'Integer', false],
    ]);
  });

  test('Needs exactly one input schema', () => {
    const partition = new Partition(
      'partition101',
      ['SHIP_COUNTRY'],
      [BY_ID],
      [RANK_AGG],
    );
    expect(() => partition.validate([])).toThrow();
    expect(() => partition.schematize([ORDERS, ORDERS])).toThrow();
  });

  test.each<[string, ColumnAggregation[], string]>([
    [
      'two window functions',
      [RANK_AGG, agg(SUM, 'FREIGHT', 'FREIGHT Sum')],
      'Apply 2 Window Functions',
    ],
    ['one window function', [RANK_AGG], 'Apply 1 Window Function'],
    ['no window function', [], 'Apply 0 Window Functions'],
    [
      'the window functions it holds, valid or not',
      [agg('', '', ''), agg('Median', 'FREIGHT', ''), RANK_AGG],
      'Apply 3 Window Functions',
    ],
  ])('Describes %s by their number', (_, aggregations, text) => {
    expect(
      new Partition(
        'partition101',
        ['SHIP_COUNTRY'],
        [BY_ID],
        aggregations,
      ).describe(),
    ).toBe(text);
  });

  test('Describes itself the same when redacted: it names no value from the data', () => {
    const partition = new Partition(
      'partition101',
      ['SHIP_COUNTRY'],
      [BY_ID],
      [RANK_AGG],
    );
    expect(partition.describeRedacted()).toBe(partition.describe());
    expect(new Partition('partition101').describeRedacted()).toBe(
      'Apply 0 Window Functions',
    );
  });

  test("Keeps its input's order as it is, and takes none of its rows by it", () => {
    const partition = new Partition(
      'partition101',
      ['SHIP_COUNTRY'],
      [BY_ID],
      [RANK_AGG],
    );
    const sorted: OrderKey[] = [
      {
        column: 'SHIP_COUNTRY',
        direction: DESC,
        sortId: 'sort101',
        keyIndex: 0,
      },
    ];
    expect(partition.outputOrder([sorted])).toBe(sorted);
    expect(partition.outputOrder([[]])).toEqual([]);
    expect(partition.outputOrder([undefined])).toBeUndefined();
    expect(partition.consumesInputOrder).toBe(false);
  });

  test("Orders no rows by its window's sort keys", () => {
    const partition = new Partition(
      'partition101',
      [],
      [sortBy('FREIGHT', DESC), BY_ID],
      [RANK_AGG],
    );
    const sorted: OrderKey[] = [
      {
        column: 'ORDER_DATE',
        direction: ASC,
        sortId: 'sort101',
        keyIndex: 0,
      },
    ];
    expect(partition.outputOrder([sorted])).toEqual(sorted);
    expect(partition.outputOrder([[]])).toEqual([]);
  });
});
