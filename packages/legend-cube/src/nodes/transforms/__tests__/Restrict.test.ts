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
  MESSAGE_CANNOT_BE_EMPTY,
  MESSAGE_CANNOT_HAVE_DUPLICATES,
  MESSAGE_DOES_NOT_HAVE_A_NAME,
  MESSAGE_NOT_IN_INPUT_SCHEMA,
} from '../../../messages/CubeMessages.js';
import { Schema } from '../../../schema/Schema.js';
import { Restrict } from '../Restrict.js';

const P = 'meta::pure::precisePrimitives::';
const ORDERS = new Schema([
  column('ORDER_ID', `${P}SmallInt`),
  column('CUSTOMER_ID', `${P}Varchar`, true, [5]),
  column('SHIP_COUNTRY', `${P}Varchar`, true, [15]),
]);

const errorsOf = (restrict: Restrict): string[] => {
  const errors: string[] = [];
  restrict.validate([ORDERS], errors);
  return errors;
};

describe(unitTest('Restrict'), () => {
  test("Keeps the picked columns, in the input's order, with their types and nullability", () => {
    const restrict = new Restrict('restrict101', ['SHIP_COUNTRY', 'ORDER_ID']);
    expect(restrict.type).toBe('restrict');
    expect(restrict.ports).toEqual(['tds']);
    expect(errorsOf(restrict)).toEqual([]);
    const schema = restrict.schematize([ORDERS]);
    expect(schema?.names()).toEqual(['ORDER_ID', 'SHIP_COUNTRY']);
    expect(schema?.columns[0] === ORDERS.columns[0]).toBe(true);
    expect(schema?.columns[1] === ORDERS.columns[2]).toBe(true);
    // the node keeps the order it was given
    expect(restrict.columns).toEqual(['SHIP_COUNTRY', 'ORDER_ID']);
  });

  test('Describes the columns as held', () => {
    expect(
      new Restrict('restrict101', ['SHIP_COUNTRY', 'ORDER_ID']).describe(),
    ).toBe('Restrict Columns to: "SHIP_COUNTRY", "ORDER_ID"');
    expect(new Restrict('restrict101').describe()).toBe(
      'Restrict Columns to: (blank)',
    );
    // column names are not values from the data: nothing to hide
    expect(new Restrict('restrict101', ['ORDER_ID']).describeRedacted()).toBe(
      'Restrict Columns to: "ORDER_ID"',
    );
  });

  test.each<[string, string[], string[]]>([
    ['no column', [], [MESSAGE_CANNOT_BE_EMPTY('Columns')]],
    [
      'a column twice',
      ['ORDER_ID', 'ORDER_ID'],
      [MESSAGE_CANNOT_HAVE_DUPLICATES('Columns')],
    ],
    ['a blank column', [''], [MESSAGE_DOES_NOT_HAVE_A_NAME('Column')]],
    [
      'columns the input does not have, each reported',
      ['ORDER_ID', 'SHIPPER', 'FREIGHT'],
      [
        MESSAGE_NOT_IN_INPUT_SCHEMA('Column', 'SHIPPER'),
        MESSAGE_NOT_IN_INPUT_SCHEMA('Column', 'FREIGHT'),
      ],
    ],
    [
      'a repeat, which stops before the names are checked',
      ['SHIPPER', 'SHIPPER'],
      [MESSAGE_CANNOT_HAVE_DUPLICATES('Columns')],
    ],
  ])('Reports %s, and gives no schema', (_, columns, messages) => {
    const restrict = new Restrict('restrict101', columns);
    expect(errorsOf(restrict)).toEqual(messages);
    expect(restrict.schematize([ORDERS])).toBeUndefined();
  });

  test('Matches column names exactly', () => {
    expect(errorsOf(new Restrict('restrict101', ['order_id']))).toEqual([
      MESSAGE_NOT_IN_INPUT_SCHEMA('Column', 'order_id'),
    ]);
  });

  test('Keeps its id and saved keys through edits, and a copy of the columns', () => {
    const rest = { note: 'kept' };
    const picked = ['ORDER_ID'];
    const restrict = new Restrict('restrict101', picked, rest);
    picked.push('SHIP_COUNTRY');
    expect(restrict.columns).toEqual(['ORDER_ID']);
    expect(Object.isFrozen(restrict.columns)).toBe(true);
    const edited = restrict.withColumns(['CUSTOMER_ID']);
    expect(edited).toBeInstanceOf(Restrict);
    expect(edited.id).toBe('restrict101');
    expect(edited.columns).toEqual(['CUSTOMER_ID']);
    expect(edited.rest).toBe(rest);
  });

  test.each([
    ['a list with a number', ['ORDER_ID', 1]],
    [
      'a list with a hole',
      Object.assign(new Array<string>(2), { 1: 'ORDER_ID' }),
    ],
    ['a string', 'ORDER_ID'],
    ['null', null],
  ])('Refuses %s as its columns', (_, columns) => {
    expect(() => new Restrict('restrict101', columns as string[])).toThrow(
      `A restrict's columns must be a list of column names`,
    );
  });
});
