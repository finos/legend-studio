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
import { AggregationFunction, type ColumnAggregation } from '../Aggregation.js';
import { Group, validateGroupColumn } from '../Group.js';
import { SortDirection } from '../Sort.js';

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

const agg = (
  fn: string,
  aggregationColumn: string | undefined,
  name: string,
): ColumnAggregation => ({ column: aggregationColumn, function: fn, name });

const COUNT_ROWS_AGG = agg(COUNT_ROWS, undefined, 'Count Rows');

const errorsOf = (group: Group): string[] => {
  const errors: string[] = [];
  const valid = group.validate([ORDERS], errors);
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

describe(unitTest('Group'), () => {
  test('Has one input, and by default no key and no aggregation', () => {
    const group = new Group('group101');
    expect(group.type).toBe('group');
    expect(Group.TYPE).toBe('group');
    expect(group.ports).toEqual(['tds']);
    expect(group.columns).toEqual([]);
    expect(group.aggregations).toEqual([]);
  });

  test('Accepts aggregations as saved, whatever their function, and Count rows without a column', () => {
    const group = new Group(
      'group101',
      ['SHIP_COUNTRY'],
      [
        { function: COUNT_ROWS, name: 'Count Rows' } as ColumnAggregation,
        agg('Median', 'FREIGHT', ''),
        agg('', '', ''),
        // a key it doesn't know is not kept on the aggregation
        {
          ...agg(SUM, 'FREIGHT', 'FREIGHT Sum'),
          note: 'x',
        } as ColumnAggregation,
      ],
    );
    expect(group.aggregations).toStrictEqual([
      { column: undefined, function: 'CountRows', name: 'Count Rows' },
      { column: 'FREIGHT', function: 'Median', name: '' },
      { column: '', function: '', name: '' },
      { column: 'FREIGHT', function: 'Sum', name: 'FREIGHT Sum' },
    ]);
    expect(group.aggregations[0]?.column).toBeUndefined();
  });

  test.each([
    ['a name, not a list', 'SHIP_COUNTRY'],
    ['null', null],
    ['a list with a number', [1]],
    ['a list with null', ['SHIP_COUNTRY', null]],
    ['a list with undefined', [undefined]],
    ['a list with an object', [{ column: 'SHIP_COUNTRY' }]],
  ])('Refuses keys that are %s', (_, columns) => {
    expect(() => new Group('group101', columns as never)).toThrow(
      `A group's columns must be a list of column names`,
    );
  });

  test.each([
    ['one aggregation, not a list', agg(COUNT, 'ORDER_ID', 'ORDER_ID Count')],
    ['null', null],
    ['a list with null', [null]],
    ['a list with a function name', [COUNT]],
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
      [{ column: 'ORDER_ID', function: COUNT }],
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
      [{ column: null, function: COUNT_ROWS, name: 'x' }],
    ],
  ])('Refuses aggregations that are %s', (_, aggregations) => {
    expect(
      () => new Group('group101', ['SHIP_COUNTRY'], aggregations as never),
    ).toThrow(
      `A group's aggregations must be a list of {column, function, name}, the column left out for Count rows`,
    );
  });

  test('Keeps a frozen copy of its keys and aggregations', () => {
    const columns = ['SHIP_COUNTRY'];
    const aggregations = [agg(COUNT, 'ORDER_ID', 'ORDER_ID Count')];
    const group = new Group('group101', columns, aggregations);
    columns.push('SHIP_REGION');
    aggregations.push(COUNT_ROWS_AGG);
    (aggregations[0] as { name: string }).name = 'Orders';
    expect(group.columns).toEqual(['SHIP_COUNTRY']);
    expect(group.aggregations).toEqual([
      agg(COUNT, 'ORDER_ID', 'ORDER_ID Count'),
    ]);
    expect(Object.isFrozen(group.columns)).toBe(true);
    expect(Object.isFrozen(group.aggregations)).toBe(true);
    expect(Object.isFrozen(group.aggregations[0])).toBe(true);
  });

  test('Keeps its id, saved keys and aggregations when its keys are edited', () => {
    const rest = { note: 'kept' };
    const group = new Group(
      'group101',
      ['SHIP_COUNTRY'],
      [COUNT_ROWS_AGG],
      rest,
    );
    const edited = group.withColumns(['SHIP_REGION', 'SHIP_COUNTRY']);
    expect(edited).toBeInstanceOf(Group);
    expect(edited.id).toBe('group101');
    expect(edited.columns).toEqual(['SHIP_REGION', 'SHIP_COUNTRY']);
    expect(edited.aggregations).toEqual([COUNT_ROWS_AGG]);
    expect(edited.rest).toBe(rest);
  });

  test('Keeps its id, saved keys and key columns when its aggregations are edited', () => {
    const rest = { note: 'kept' };
    const group = new Group(
      'group101',
      ['SHIP_COUNTRY'],
      [COUNT_ROWS_AGG],
      rest,
    );
    const edited = group.withAggregations([agg(SUM, 'FREIGHT', 'Freight')]);
    expect(edited).toBeInstanceOf(Group);
    expect(edited.id).toBe('group101');
    expect(edited.columns).toEqual(['SHIP_COUNTRY']);
    expect(edited.aggregations).toEqual([agg(SUM, 'FREIGHT', 'Freight')]);
    expect(edited.rest).toBe(rest);
  });

  test('Accepts keys of every type Cube can compare, each aggregation valid', () => {
    expect(
      errorsOf(
        new Group(
          'group101',
          [
            'SHIP_COUNTRY',
            'ORDER_ID',
            'ORDER_DATE',
            'FREIGHT',
            'IS_LATE',
            'REGION',
          ],
          [COUNT_ROWS_AGG, agg(COUNT, 'PAYLOAD', 'PAYLOAD Count')],
        ),
      ),
    ).toEqual([]);
  });

  test('Accepts no key: a group of all the rows', () => {
    expect(
      errorsOf(new Group('group101', [], [agg(SUM, 'FREIGHT', 'FREIGHT Sum')])),
    ).toEqual([]);
  });

  test('Accepts a key that is also aggregated', () => {
    expect(
      errorsOf(
        new Group(
          'group101',
          ['SHIP_COUNTRY'],
          [agg(DISTINCT_COUNT, 'SHIP_COUNTRY', 'SHIP_COUNTRY Distinct Count')],
        ),
      ),
    ).toEqual([]);
  });

  test.each<[string, string[], ColumnAggregation[], string[]]>([
    [
      'a key twice',
      ['SHIP_COUNTRY', 'ORDER_ID', 'SHIP_COUNTRY'],
      [COUNT_ROWS_AGG],
      ['Group columns cannot have duplicates.'],
    ],
    [
      // keys compare exactly: 'ship_country' is no column of the input
      'a key twice in another case, as a key the input does not have',
      ['SHIP_COUNTRY', 'ship_country'],
      [COUNT_ROWS_AGG],
      ['Group column "ship_country" is not present in the input schema.'],
    ],
    [
      'a missing key twice, checked for repeats first',
      ['SHIPPER', 'SHIPPER'],
      [COUNT_ROWS_AGG],
      ['Group columns cannot have duplicates.'],
    ],
    [
      'a blank key twice, checked for repeats first',
      ['', ''],
      [],
      ['Group columns cannot have duplicates.'],
    ],
    [
      'a blank key',
      [''],
      [COUNT_ROWS_AGG],
      ['Group column does not have a name.'],
    ],
    [
      'a key the input does not have',
      ['SHIPPER'],
      [COUNT_ROWS_AGG],
      ['Group column "SHIPPER" is not present in the input schema.'],
    ],
    [
      'a key in another case',
      ['ship_country'],
      [COUNT_ROWS_AGG],
      ['Group column "ship_country" is not present in the input schema.'],
    ],
    [
      'a Variant key',
      ['PAYLOAD'],
      [COUNT_ROWS_AGG],
      ['Group column "PAYLOAD" of type Variant cannot be grouped.'],
    ],
    [
      'a key of a type Cube does not know',
      ['BLOB'],
      [COUNT_ROWS_AGG],
      ['Group column "BLOB" of type Blob cannot be grouped.'],
    ],
    [
      'every key with a problem, in order',
      ['SHIPPER', 'SHIP_COUNTRY', '', 'BLOB', 'PAYLOAD'],
      [COUNT_ROWS_AGG],
      [
        'Group column "SHIPPER" is not present in the input schema.',
        'Group column does not have a name.',
        'Group column "BLOB" of type Blob cannot be grouped.',
        'Group column "PAYLOAD" of type Variant cannot be grouped.',
      ],
    ],
    [
      'a key problem, which stops before the aggregations are checked',
      ['SHIPPER'],
      [],
      ['Group column "SHIPPER" is not present in the input schema.'],
    ],
    [
      'a key problem, before a broken aggregation',
      ['PAYLOAD'],
      [agg(SUM, 'SHIP_COUNTRY', '')],
      ['Group column "PAYLOAD" of type Variant cannot be grouped.'],
    ],
    ['no aggregation', ['SHIP_COUNTRY'], [], ['Aggregations cannot be empty.']],
    ['no key and no aggregation', [], [], ['Aggregations cannot be empty.']],
    [
      'an aggregation named after a key',
      ['SHIP_COUNTRY'],
      [agg(COUNT, 'ORDER_ID', 'Ship_Country')],
      [
        'Aggregation output name "Ship_Country" cannot be the same as input column name.',
      ],
    ],
    [
      'every aggregation with a problem, row by row',
      ['SHIP_COUNTRY'],
      [
        agg('', 'ORDER_ID', 'a'),
        agg('Median', 'FREIGHT', 'b'),
        agg(SUM, 'FREIGHT', 'FREIGHT Sum'),
        agg(COUNT, undefined, 'c'),
        agg(MAX, 'SHIPPER', 'd'),
        agg(AVERAGE, 'ORDER_DATE', 'e'),
        agg(COUNT_ROWS, 'ORDER_ID', 'f'),
        agg(MIN, 'FREIGHT', ''),
        agg(COUNT, 'ORDER_ID', 'a"b'),
        agg(COUNT, 'ORDER_ID', 'Total'),
        agg(DISTINCT_COUNT, 'ORDER_ID', 'TOTAL'),
      ],
      [
        'Aggregation function cannot be empty.',
        'Aggregation function "Median" is unknown.',
        'Aggregation column does not have a name.',
        'Aggregation column "SHIPPER" is not present in the input schema.',
        'Aggregation function "Average" is incompatible with column "ORDER_DATE".',
        'Aggregation function "CountRows" does not allow column.',
        'Aggregation output name cannot be empty.',
        'Aggregation output name is not valid column name.',
        'Aggregation output name "Total" is already present in the output schema.',
        'Aggregation output name "TOTAL" is already present in the output schema.',
      ],
    ],
  ])(
    'Reports %s, and gives no schema',
    (_, columns, aggregations, messages) => {
      const group = new Group('group101', columns, aggregations);
      expect(errorsOf(group)).toEqual(messages);
      expect(group.schematize([ORDERS])).toBeUndefined();
    },
  );

  test('Checks one key at a time for an editor, stopping at its first problem', () => {
    const errors: string[] = [];
    expect(validateGroupColumn('SHIP_COUNTRY', ORDERS)).toBe(true);
    expect(validateGroupColumn('REGION', ORDERS, errors)).toBe(true);
    expect(validateGroupColumn('', ORDERS, errors)).toBe(false);
    expect(validateGroupColumn('order_id', ORDERS, errors)).toBe(false);
    expect(validateGroupColumn('PAYLOAD', ORDERS, errors)).toBe(false);
    expect(validateGroupColumn('BLOB', ORDERS)).toBe(false);
    expect(errors).toEqual([
      'Group column does not have a name.',
      'Group column "order_id" is not present in the input schema.',
      'Group column "PAYLOAD" of type Variant cannot be grouped.',
    ]);
  });

  test('Gives its keys as the input has them, in the order it lists them, not the input order', () => {
    const output = new Group(
      'group101',
      ['SHIP_COUNTRY', 'ORDER_ID', 'SHIP_REGION'],
      [COUNT_ROWS_AGG],
    ).schematize([ORDERS]);
    expect(columnsOf(output)).toEqual([
      ['SHIP_COUNTRY', `${P}Varchar(15)`, true],
      ['ORDER_ID', `${P}SmallInt`, false],
      ['SHIP_REGION', `${P}Varchar(15)`, true],
      ['Count Rows', 'Integer', false],
    ]);
    expect(output?.columns[0] === ORDERS.lookup('SHIP_COUNTRY')).toBe(true);
  });

  test('Gives one column per aggregation, in list order, typed as the engine types it and nullable but for the counts', () => {
    expect(
      columnsOf(
        new Group(
          'group101',
          ['SHIP_COUNTRY'],
          [
            agg(DISTINCT_VALUE, 'SHIP_REGION', 'Ship Region'),
            COUNT_ROWS_AGG,
            agg(SUM, 'ORDER_ID', 'Id Sum'),
            agg(MIN, 'ORDER_DATE', 'First Order'),
            agg(COUNT, 'ORDER_ID', 'Orders'),
            agg(DISTINCT_COUNT, 'SHIP_REGION', 'Regions'),
            agg(AVERAGE, 'FREIGHT', 'Average Freight'),
            agg(MAX, 'FREIGHT', 'Max Freight'),
          ],
        ).schematize([ORDERS]),
      ),
    ).toEqual([
      ['SHIP_COUNTRY', `${P}Varchar(15)`, true],
      ['Ship Region', `${P}Varchar(15)`, true],
      ['Count Rows', 'Integer', false],
      ['Id Sum', 'Integer', true],
      ['First Order', 'DateTime', true],
      ['Orders', 'Integer', false],
      ['Regions', 'Integer', false],
      ['Average Freight', 'Float', true],
      ['Max Freight', 'Float', true],
    ]);
  });

  test('Gives a key that is also aggregated as a key and as an aggregation', () => {
    expect(
      columnsOf(
        new Group(
          'group101',
          ['ORDER_ID'],
          [agg(SUM, 'ORDER_ID', 'ORDER_ID Sum')],
        ).schematize([ORDERS]),
      ),
    ).toEqual([
      ['ORDER_ID', `${P}SmallInt`, false],
      ['ORDER_ID Sum', 'Integer', true],
    ]);
  });

  test('Gives only the aggregations with no key', () => {
    expect(
      columnsOf(
        new Group(
          'group101',
          [],
          [COUNT_ROWS_AGG, agg(SUM, 'FREIGHT', 'FREIGHT Sum')],
        ).schematize([ORDERS]),
      ),
    ).toEqual([
      ['Count Rows', 'Integer', false],
      ['FREIGHT Sum', 'Float', true],
    ]);
  });

  test('Needs exactly one input schema', () => {
    const group = new Group('group101', ['SHIP_COUNTRY'], [COUNT_ROWS_AGG]);
    expect(() => group.validate([])).toThrow();
    expect(() => group.schematize([ORDERS, ORDERS])).toThrow();
  });

  test('Describes its keys in order', () => {
    expect(
      new Group(
        'group101',
        ['SHIP_COUNTRY', 'ORDER_ID'],
        [COUNT_ROWS_AGG],
      ).describe(),
    ).toBe('Group by "SHIP_COUNTRY", "ORDER_ID"');
    expect(
      new Group('group101', ['', 'ORDER_ID'], [COUNT_ROWS_AGG]).describe(),
    ).toBe('Group by (blank), "ORDER_ID"');
  });

  test('Describes a group with no key as aggregating all the rows', () => {
    expect(new Group('group101', [], [COUNT_ROWS_AGG]).describe()).toBe(
      'Aggregate all rows',
    );
    expect(new Group('group101').describe()).toBe('Aggregate all rows');
  });

  test('Describes itself the same when redacted: column names are not values from the data', () => {
    const group = new Group('group101', ['SHIP_COUNTRY', ''], [COUNT_ROWS_AGG]);
    expect(group.describeRedacted()).toBe(group.describe());
    expect(group.describeRedacted()).toBe('Group by "SHIP_COUNTRY", (blank)');
    expect(new Group('group101').describeRedacted()).toBe('Aggregate all rows');
  });

  test('Gives its rows no order, whatever its input order, and takes none of them by order', () => {
    const group = new Group('group101', ['SHIP_COUNTRY'], [COUNT_ROWS_AGG]);
    const sorted: OrderKey[] = [
      {
        column: 'SHIP_COUNTRY',
        direction: SortDirection.DESC,
        sortId: 'sort101',
        keyIndex: 0,
      },
    ];
    expect(group.outputOrder([sorted])).toEqual([]);
    expect(group.outputOrder([[]])).toEqual([]);
    expect(group.outputOrder([undefined])).toEqual([]);
    expect(group.consumesInputOrder).toBe(false);
  });
});
