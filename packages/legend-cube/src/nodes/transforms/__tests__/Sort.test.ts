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
import { column } from '../../../__test-utils__/CubeTestNodes.js';
import { unitTest } from '../../../__test-utils__/CubeTestUtils.js';
import type { OrderKey } from '../../../inference/RowOrder.js';
import {
  MESSAGE_CANNOT_BE_EMPTY,
  MESSAGE_CANNOT_HAVE_DUPLICATES,
  MESSAGE_DOES_NOT_HAVE_A_NAME,
  MESSAGE_NOT_IN_INPUT_SCHEMA,
  MESSAGE_SORT_COLUMN_NOT_SORTABLE,
} from '../../../messages/CubeMessages.js';
import { Schema, SchemaColumn } from '../../../schema/Schema.js';
import { OpaqueType } from '../../../types/CubeType.js';
import {
  type ColumnDirection,
  isSortDirection,
  Sort,
  SORT_DIRECTIONS,
  SortDirection,
  validateSortKey,
} from '../Sort.js';

const P = 'meta::pure::precisePrimitives::';
const ORDERS = new Schema([
  column('ORDER_ID', `${P}SmallInt`),
  column('SHIP_COUNTRY', `${P}Varchar`, true, [15]),
  column('IS_LATE', 'Boolean', true),
  column('PAYLOAD', 'Variant', true),
  new SchemaColumn('BLOB', OpaqueType.get('my::model::Blob'), true),
]);

const { ASC, DESC } = SortDirection;

const errorsOf = (sort: Sort): string[] => {
  const errors: string[] = [];
  sort.validate([ORDERS], errors);
  return errors;
};

const key = (
  name: string,
  direction: SortDirection,
  sortId: string,
  keyIndex: number,
): OrderKey => ({ column: name, direction, sortId, keyIndex });

describe(unitTest('Sort'), () => {
  test('Keeps its input schema when its keys are valid', () => {
    const sort = new Sort('sort101', [
      { column: 'SHIP_COUNTRY', direction: DESC },
      { column: 'ORDER_ID', direction: ASC },
      { column: 'IS_LATE', direction: ASC },
    ]);
    expect(sort.type).toBe('sort');
    expect(sort.ports).toEqual(['tds']);
    expect(errorsOf(sort)).toEqual([]);
    expect(sort.schematize([ORDERS]) === ORDERS).toBe(true);
  });

  test('Describes its keys in order, with their directions', () => {
    expect(
      new Sort('sort101', [
        { column: 'SHIP_COUNTRY', direction: DESC },
        { column: 'ORDER_ID', direction: ASC },
      ]).describe(),
    ).toBe('Sort by "SHIP_COUNTRY" Desc, "ORDER_ID" Asc');
    expect(
      new Sort('sort101', [{ column: '', direction: ASC }]).describe(),
    ).toBe('Sort by (blank) Asc');
    expect(new Sort('sort101').describe()).toBe('Sort by (blank)');
    // column names are not values from the data: nothing to hide
    expect(
      new Sort('sort101', [
        { column: 'ORDER_ID', direction: DESC },
      ]).describeRedacted(),
    ).toBe('Sort by "ORDER_ID" Desc');
  });

  test.each<[string, ColumnDirection[], string[]]>([
    ['no key', [], [MESSAGE_CANNOT_BE_EMPTY('Sorts')]],
    [
      'a blank column',
      [{ column: '', direction: ASC }],
      [MESSAGE_DOES_NOT_HAVE_A_NAME('Sort column')],
    ],
    [
      'columns the input does not have, each reported',
      [
        { column: 'ORDER_ID', direction: ASC },
        { column: 'SHIPPER', direction: ASC },
        { column: 'FREIGHT', direction: DESC },
      ],
      [
        MESSAGE_NOT_IN_INPUT_SCHEMA('Sort column', 'SHIPPER'),
        MESSAGE_NOT_IN_INPUT_SCHEMA('Sort column', 'FREIGHT'),
      ],
    ],
    [
      'a Variant column and a column of a type Cube does not know',
      [
        { column: 'PAYLOAD', direction: ASC },
        { column: 'BLOB', direction: DESC },
      ],
      [
        MESSAGE_SORT_COLUMN_NOT_SORTABLE('PAYLOAD', 'Variant'),
        MESSAGE_SORT_COLUMN_NOT_SORTABLE('BLOB', 'Blob'),
      ],
    ],
    [
      'a column twice, whatever the directions',
      [
        { column: 'ORDER_ID', direction: ASC },
        { column: 'ORDER_ID', direction: DESC },
      ],
      [MESSAGE_CANNOT_HAVE_DUPLICATES('Sort columns')],
    ],
    [
      'a missing column, which stops before repeats are checked',
      [
        { column: 'SHIPPER', direction: ASC },
        { column: 'SHIPPER', direction: ASC },
      ],
      [
        MESSAGE_NOT_IN_INPUT_SCHEMA('Sort column', 'SHIPPER'),
        MESSAGE_NOT_IN_INPUT_SCHEMA('Sort column', 'SHIPPER'),
      ],
    ],
  ])('Reports %s, and gives no schema', (_, sorts, messages) => {
    const sort = new Sort('sort101', sorts);
    expect(errorsOf(sort)).toEqual(messages);
    expect(sort.schematize([ORDERS])).toBeUndefined();
  });

  test('Says "Sort column "X" of type Variant cannot be sorted."', () => {
    expect(MESSAGE_SORT_COLUMN_NOT_SORTABLE('PAYLOAD', 'Variant')).toBe(
      'Sort column "PAYLOAD" of type Variant cannot be sorted.',
    );
  });

  test('Checks one key at a time for an editor, stopping at its first problem', () => {
    const errors: string[] = [];
    expect(
      validateSortKey({ column: 'ORDER_ID', direction: DESC }, ORDERS),
    ).toBe(true);
    expect(
      validateSortKey({ column: 'order_id', direction: ASC }, ORDERS, errors),
    ).toBe(false);
    expect(
      validateSortKey({ column: 'PAYLOAD', direction: ASC }, ORDERS, errors),
    ).toBe(false);
    expect(errors).toEqual([
      MESSAGE_NOT_IN_INPUT_SCHEMA('Sort column', 'order_id'),
      MESSAGE_SORT_COLUMN_NOT_SORTABLE('PAYLOAD', 'Variant'),
    ]);
  });

  test('Keeps its id and saved keys through edits, and a frozen copy of the keys', () => {
    const rest = { note: 'kept' };
    const sorts = [{ column: 'ORDER_ID', direction: ASC }];
    const sort = new Sort('sort101', sorts, rest);
    sorts.push({ column: 'SHIP_COUNTRY', direction: DESC });
    (sorts[0] as { direction: SortDirection }).direction = DESC;
    expect(sort.sorts).toEqual([{ column: 'ORDER_ID', direction: ASC }]);
    expect(Object.isFrozen(sort.sorts)).toBe(true);
    expect(Object.isFrozen(sort.sorts[0])).toBe(true);
    const edited = sort.withSorts([
      { column: 'SHIP_COUNTRY', direction: DESC },
    ]);
    expect(edited).toBeInstanceOf(Sort);
    expect(edited.id).toBe('sort101');
    expect(edited.sorts).toEqual([{ column: 'SHIP_COUNTRY', direction: DESC }]);
    expect(edited.rest).toBe(rest);
  });

  test("Makes the grid's Sort by: one column, ascending", () => {
    const sort = Sort.byColumn('sort102', 'SHIP_COUNTRY');
    expect(sort.id).toBe('sort102');
    expect(sort.sorts).toEqual([{ column: 'SHIP_COUNTRY', direction: ASC }]);
  });

  test('Knows the two directions', () => {
    expect(SORT_DIRECTIONS).toEqual(['ASC', 'DESC']);
    expect(isSortDirection('ASC')).toBe(true);
    expect(isSortDirection('DESC')).toBe(true);
    expect(isSortDirection('asc')).toBe(false);
    expect(isSortDirection('')).toBe(false);
    expect(isSortDirection(undefined)).toBe(false);
  });

  test.each([
    [
      'a direction it does not know',
      [{ column: 'ORDER_ID', direction: 'asc' }],
    ],
    ['a key without a direction', [{ column: 'ORDER_ID' }]],
    ['a key without a column', [{ direction: 'ASC' }]],
    ['a key that is a name', ['ORDER_ID']],
    ['a key that is null', [null]],
    ['a string', 'ORDER_ID'],
    ['null', null],
  ])('Refuses %s', (_, sorts) => {
    expect(() => new Sort('sort101', sorts as ColumnDirection[])).toThrow(
      `A sort's keys must be a list of {column, direction}, the direction ASC or DESC`,
    );
  });

  test("Orders its rows by its keys, then by its input's order on the other columns", () => {
    const sort = new Sort('sort102', [
      { column: 'SHIP_COUNTRY', direction: DESC },
      { column: 'ORDER_ID', direction: ASC },
    ]);
    const own = [
      key('SHIP_COUNTRY', DESC, 'sort102', 0),
      key('ORDER_ID', ASC, 'sort102', 1),
    ];
    expect(sort.consumesInputOrder).toBe(false);
    expect(sort.outputOrder([[]])).toEqual(own);
    expect(sort.outputOrder([undefined])).toEqual(own);
    // the input's key on ORDER_ID is replaced; its key on IS_LATE breaks ties
    expect(
      sort.outputOrder([
        [
          key('ORDER_ID', DESC, 'sort101', 0),
          key('IS_LATE', ASC, 'sort101', 1),
        ],
      ]),
    ).toEqual([...own, key('IS_LATE', ASC, 'sort101', 1)]);
  });
});
