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
import {
  MESSAGE_ALREADY_IN_INPUT_SCHEMA,
  MESSAGE_CANNOT_BE_EMPTY,
  MESSAGE_DOES_NOT_HAVE_A_NAME,
  MESSAGE_NEW_COLUMN_NAME_EMPTY,
  MESSAGE_NEW_COLUMN_NAME_INVALID,
  MESSAGE_NEW_COLUMN_NAME_SAME_AS_OLD,
  MESSAGE_NEW_COLUMN_NAME_SAME_AS_OTHER,
  MESSAGE_NOT_IN_INPUT_SCHEMA,
} from '../../../messages/CubeMessages.js';
import { Schema } from '../../../schema/Schema.js';
import {
  Rename,
  type RenameMapping,
  validateRenameMapping,
} from '../Rename.js';

const P = 'meta::pure::precisePrimitives::';
const ORDERS = new Schema([
  column('ORDER_ID', `${P}SmallInt`),
  column('CUSTOMER_ID', `${P}Varchar`, true, [5]),
  column('SHIP_COUNTRY', `${P}Varchar`, true, [15]),
]);

const map = (from: string, to: string): RenameMapping => ({ from, to });

const errorsOf = (rename: Rename): string[] => {
  const errors: string[] = [];
  rename.validate([ORDERS], errors);
  return errors;
};

describe(unitTest('Rename'), () => {
  test('Renames columns in place, keeping their types, nullability and order', () => {
    const rename = new Rename('rename101', [
      map('SHIP_COUNTRY', 'Ship Country'),
      map('ORDER_ID', 'order-id'),
    ]);
    expect(rename.type).toBe('rename');
    expect(rename.ports).toEqual(['tds']);
    expect(errorsOf(rename)).toEqual([]);
    const schema = rename.schematize([ORDERS]);
    expect(schema?.names()).toEqual([
      'order-id',
      'CUSTOMER_ID',
      'Ship Country',
    ]);
    expect(schema?.columns[0]?.type === ORDERS.columns[0]?.type).toBe(true);
    expect(schema?.columns[2]?.nullable).toBe(true);
    expect(schema?.columns[1] === ORDERS.columns[1]).toBe(true);
  });

  test('Counts its mappings in its description', () => {
    expect(new Rename('rename101').describe()).toBe('Rename 0 Columns');
    expect(new Rename('rename101', [map('ORDER_ID', 'ID')]).describe()).toBe(
      'Rename 1 Column',
    );
    const three = new Rename('rename101', [
      map('ORDER_ID', 'A'),
      map('CUSTOMER_ID', 'B'),
      map('SHIP_COUNTRY', 'C'),
    ]);
    expect(three.describe()).toBe('Rename 3 Columns');
    // names are not values from the data: nothing to hide
    expect(three.describeRedacted()).toBe('Rename 3 Columns');
  });

  test('Needs a mapping', () => {
    expect(errorsOf(new Rename('rename101'))).toEqual([
      MESSAGE_CANNOT_BE_EMPTY('Column renames'),
    ]);
    expect(new Rename('rename101').schematize([ORDERS])).toBeUndefined();
  });

  test.each<[string, RenameMapping[], string[]]>([
    [
      'a blank old column',
      [map('', 'X')],
      [MESSAGE_DOES_NOT_HAVE_A_NAME('Old column')],
    ],
    [
      'an old column the input does not have',
      [map('SHIPPER', 'X')],
      [MESSAGE_NOT_IN_INPUT_SCHEMA('Old column', 'SHIPPER')],
    ],
    [
      'an empty new name',
      [map('ORDER_ID', '')],
      [MESSAGE_NEW_COLUMN_NAME_EMPTY],
    ],
    [
      'a new name with a double quote',
      [map('ORDER_ID', 'a"b')],
      [MESSAGE_NEW_COLUMN_NAME_INVALID],
    ],
    [
      'a new name with a backslash',
      [map('ORDER_ID', 'a\\b')],
      [MESSAGE_NEW_COLUMN_NAME_INVALID],
    ],
    [
      'a new name with a tab',
      [map('ORDER_ID', 'a\tb')],
      [MESSAGE_NEW_COLUMN_NAME_INVALID],
    ],
    [
      'a new name with a leading space',
      [map('ORDER_ID', ' ID')],
      [MESSAGE_NEW_COLUMN_NAME_INVALID],
    ],
    [
      'a new name of 129 characters',
      [map('ORDER_ID', 'x'.repeat(129))],
      [MESSAGE_NEW_COLUMN_NAME_INVALID],
    ],
    [
      'the same name',
      [map('ORDER_ID', 'ORDER_ID')],
      [MESSAGE_NEW_COLUMN_NAME_SAME_AS_OLD('ORDER_ID')],
    ],
    [
      'a column the input keeps (the collision fix)',
      [map('ORDER_ID', 'CUSTOMER_ID')],
      [MESSAGE_ALREADY_IN_INPUT_SCHEMA('New column name', 'CUSTOMER_ID')],
    ],
    [
      'the same old column twice',
      [map('ORDER_ID', 'A'), map('ORDER_ID', 'B')],
      [
        MESSAGE_NEW_COLUMN_NAME_SAME_AS_OTHER('A'),
        MESSAGE_NEW_COLUMN_NAME_SAME_AS_OTHER('B'),
      ],
    ],
    [
      'the same new name twice',
      [map('ORDER_ID', 'A'), map('CUSTOMER_ID', 'A')],
      [
        MESSAGE_NEW_COLUMN_NAME_SAME_AS_OTHER('A'),
        MESSAGE_NEW_COLUMN_NAME_SAME_AS_OTHER('A'),
      ],
    ],
    [
      'a swap',
      [map('ORDER_ID', 'CUSTOMER_ID'), map('CUSTOMER_ID', 'ORDER_ID')],
      [
        MESSAGE_NEW_COLUMN_NAME_SAME_AS_OTHER('CUSTOMER_ID'),
        MESSAGE_NEW_COLUMN_NAME_SAME_AS_OTHER('ORDER_ID'),
      ],
    ],
    [
      'a chain',
      [map('ORDER_ID', 'CUSTOMER_ID'), map('CUSTOMER_ID', 'X')],
      [
        MESSAGE_NEW_COLUMN_NAME_SAME_AS_OTHER('CUSTOMER_ID'),
        MESSAGE_NEW_COLUMN_NAME_SAME_AS_OTHER('X'),
      ],
    ],
    [
      'two bad mappings, each with its first problem',
      [map('SHIPPER', ''), map('ORDER_ID', '')],
      [
        MESSAGE_NOT_IN_INPUT_SCHEMA('Old column', 'SHIPPER'),
        MESSAGE_NEW_COLUMN_NAME_EMPTY,
      ],
    ],
  ])('Reports %s, and gives no schema', (_, mappings, messages) => {
    const rename = new Rename('rename101', mappings);
    expect(errorsOf(rename)).toEqual(messages);
    expect(rename.schematize([ORDERS])).toBeUndefined();
  });

  test.each(['Ship Country', 'ship-country', 'país', "it's", 'x'.repeat(128)])(
    'Accepts the new name %j',
    (to) => {
      expect(
        errorsOf(new Rename('rename101', [map('SHIP_COUNTRY', to)])),
      ).toEqual([]);
    },
  );

  test('Checks one mapping for an editor row', () => {
    const mappings = [map('ORDER_ID', 'ID'), map('SHIPPER', 'X')];
    const errors: string[] = [];
    expect(validateRenameMapping(mappings, 0, ORDERS, errors)).toBe(true);
    expect(errors).toEqual([]);
    expect(validateRenameMapping(mappings, 1, ORDERS, errors)).toBe(false);
    expect(errors).toEqual([
      MESSAGE_NOT_IN_INPUT_SCHEMA('Old column', 'SHIPPER'),
    ]);
    expect(() => validateRenameMapping(mappings, 2, ORDERS)).toThrow();
  });

  test('Keeps its id and saved keys through edits, and frozen copies of the mappings', () => {
    const rest = { note: 'kept' };
    const mappings = [map('ORDER_ID', 'ID')];
    const rename = new Rename('rename101', mappings, rest);
    (mappings[0] as { to: string }).to = 'CHANGED';
    expect(rename.mappings).toEqual([map('ORDER_ID', 'ID')]);
    expect(Object.isFrozen(rename.mappings)).toBe(true);
    expect(Object.isFrozen(rename.mappings[0])).toBe(true);
    const edited = rename.withMappings([map('CUSTOMER_ID', 'CUSTOMER')]);
    expect(edited).toBeInstanceOf(Rename);
    expect(edited.id).toBe('rename101');
    expect(edited.rest).toBe(rest);
  });

  test.each([
    ['a mapping without to', [{ from: 'ORDER_ID' }]],
    ['a mapping with a number', [{ from: 'ORDER_ID', to: 1 }]],
    ['a string', 'ORDER_ID'],
    ['null', null],
    ['a list with null', [null]],
  ])('Refuses %s as its mappings', (_, mappings) => {
    expect(
      () => new Rename('rename101', mappings as unknown as RenameMapping[]),
    ).toThrow(`A rename's mappings must be a list of {from, to} names`);
  });

  test('Refuses a new name that differs only in case from a column the input keeps', () => {
    // SQL Server, MemSQL and DuckDB take order_id and ORDER_ID for one column
    expect(
      errorsOf(new Rename('rename101', [map('SHIP_COUNTRY', 'order_id')])),
    ).toEqual([MESSAGE_ALREADY_IN_INPUT_SCHEMA('New column name', 'order_id')]);
  });

  test("Lets a column take its own name in another case, or a renamed column's", () => {
    expect(
      errorsOf(new Rename('rename101', [map('ORDER_ID', 'order_id')])),
    ).toEqual([]);
    // CUSTOMER_ID is renamed away, so its name is free in any case
    expect(
      errorsOf(
        new Rename('rename101', [
          map('CUSTOMER_ID', 'Customer'),
          map('SHIP_COUNTRY', 'customer_id'),
        ]),
      ),
    ).toEqual([]);
  });

  test('Refuses two new names that differ only in case', () => {
    expect(
      errorsOf(
        new Rename('rename101', [
          map('ORDER_ID', 'a'),
          map('SHIP_COUNTRY', 'A'),
        ]),
      ),
    ).toEqual([
      MESSAGE_NEW_COLUMN_NAME_SAME_AS_OTHER('a'),
      MESSAGE_NEW_COLUMN_NAME_SAME_AS_OTHER('A'),
    ]);
  });
});
