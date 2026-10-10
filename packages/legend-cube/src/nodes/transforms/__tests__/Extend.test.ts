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
import { unitTest } from '../../../__test-utils__/CubeTestUtils.js';
import { column } from '../../../__test-utils__/CubeTestNodes.js';
import type { RowOrder } from '../../../inference/RowOrder.js';
import { ERR_TYPING } from '../../../messages/CubeMessages.js';
import { Schema, type SchemaColumn } from '../../../schema/Schema.js';
import { SortDirection } from '../Sort.js';
import {
  type CubeType,
  OpaqueType,
  PrimitiveType,
} from '../../../types/CubeType.js';
import type { JsonObject } from '../../../utils/Json.js';
import {
  Extend,
  type ExtendColumn,
  getExtendSignature,
  isOneParameterLambda,
  UNTYPED,
} from '../Extend.js';

const P = 'meta::pure::precisePrimitives::';
const INTEGER = PrimitiveType.get('Integer');
const FLOAT = PrimitiveType.get('Float');

const ORDERS = new Schema([
  column('ORDER_ID', `${P}SmallInt`),
  column('SHIP_VIA', `${P}SmallInt`, true),
  column('FREIGHT', `${P}Double`, true),
]);

/** `x | $x.<column> + 1`, as the engine's JSON */
const plusOne = (columnName: string): JsonObject => ({
  _type: 'lambda',
  parameters: [{ _type: 'var', name: 'x' }],
  body: [
    {
      _type: 'func',
      function: 'plus',
      parameters: [
        {
          _type: 'collection',
          values: [
            {
              _type: 'property',
              property: columnName,
              parameters: [{ _type: 'var', name: 'x' }],
            },
            { _type: 'integer', value: '1' },
          ],
        },
      ],
    },
  ],
});

const columnOf = (name: string, of = 'ORDER_ID'): ExtendColumn => ({
  name,
  code: `x | $x.${of} + 1`,
  lambda: plusOne(of),
});

/** The extend, typed by the engine as these types for this input */
const typed = (
  columns: ExtendColumn[],
  types: CubeType[],
  input = ORDERS,
): Extend =>
  new Extend('extend101', columns).withTyping({
    kind: 'typed',
    signature: getExtendSignature(input, columns),
    types,
  });

const validationErrors = (node: Extend, input = ORDERS): string[] => {
  const errors: string[] = [];
  expect(node.validate([input], errors)).toBe(errors.length === 0);
  expect(node.validate([input])).toBe(errors.length === 0);
  return errors;
};

const describeColumns = (columns: readonly SchemaColumn[]): string[] =>
  columns.map((c) => `${c.name} ${c.type.displayName}${c.nullable ? '?' : ''}`);

describe(unitTest('Extend node'), () => {
  test('Is a unary node described as the spec says', () => {
    const node = new Extend('extend101', [columnOf('a'), columnOf('b')]);
    expect(node.type).toBe('extend');
    expect(Extend.TYPE).toBe('extend');
    expect(node.ports).toEqual(['tds']);
    expect(node.describe()).toBe('Extend with "a", "b"');
    expect(
      new Extend('extend101', [
        { name: '', code: '', lambda: undefined },
      ]).describe(),
    ).toBe('Extend with "(blank)"');
  });

  test('Starts with no column and nothing typed, and keeps its columns frozen', () => {
    const node = new Extend('extend101');
    expect(node.columns).toEqual([]);
    expect(node.typing === UNTYPED).toBe(true);
    const lambda = plusOne('ORDER_ID');
    const kept = new Extend('extend101', [{ name: 'a', code: 'x', lambda }]);
    expect(Object.isFrozen(kept.columns[0]?.lambda)).toBe(true);
    expect(kept.columns[0]?.lambda === lambda).toBe(false);
  });

  test('Refuses columns of the wrong shape', () => {
    expect(
      () =>
        new Extend('extend101', [
          { name: 'a', code: 1 } as unknown as ExtendColumn,
        ]),
    ).toThrow("An extend's columns must be a list of {name, code, lambda}");
    expect(
      () =>
        new Extend('extend101', [
          { name: 'a', code: '', lambda: 'x' } as unknown as ExtendColumn,
        ]),
    ).toThrow("An extend's columns must be a list of {name, code, lambda}");
  });

  test('Needs columns first', () => {
    expect(validationErrors(new Extend('extend101'))).toEqual([
      'Columns cannot be empty.',
    ]);
  });

  test("Checks every column's name and expression, stopping at each column's first problem", () => {
    const node = new Extend('extend101', [
      { name: '', code: '', lambda: undefined },
      { name: ' padded', code: '', lambda: undefined },
      columnOf('freight'),
      columnOf('a'),
      columnOf('A'),
      { name: 'b', code: 'x | ', lambda: undefined },
      { name: 'c', code: '1', lambda: { _type: 'integer', value: '1' } },
      {
        name: 'd',
        code: '{a, b | 1}',
        lambda: {
          _type: 'lambda',
          parameters: [
            { _type: 'var', name: 'a' },
            { _type: 'var', name: 'b' },
          ],
          body: [{ _type: 'integer', value: '1' }],
        },
      },
    ]);
    expect(validationErrors(node)).toEqual([
      'New column name cannot be empty.',
      'New column name is not valid column name.',
      // an input column's, in any case
      'Column "freight" is already present in the input schema.',
      'New column name "A" cannot be the same as other column name.',
      '"b" does not have an expression.',
      '"c" must be a lambda with one parameter, such as x | $x.PRICE.',
      '"d" must be a lambda with one parameter, such as x | $x.PRICE.',
    ]);
  });

  test('Waits for the engine to type its columns, and for this input', () => {
    const columns = [columnOf('a')];
    expect(validationErrors(new Extend('extend101', columns))).toEqual([
      ERR_TYPING,
    ]);
    const node = typed(columns, [INTEGER]);
    expect(validationErrors(node)).toEqual([]);
    // another input: the typing is for the one before
    const wider = new Schema([
      ...ORDERS.columns,
      column('SHIP_CITY', `${P}Varchar`, true, [15]),
    ]);
    expect(validationErrors(node, wider)).toEqual([ERR_TYPING]);
    expect(node.currentTyping(wider) === UNTYPED).toBe(true);
    // other expressions, or a renamed column, a later column may use
    expect(
      validationErrors(node.withColumns([columnOf('a', 'SHIP_VIA')])),
    ).toEqual([ERR_TYPING]);
    expect(validationErrors(node.withColumns([columnOf('b')]))).toEqual([
      ERR_TYPING,
    ]);
    // the same columns again: typed
    expect(validationErrors(node.withColumns([columnOf('a')]))).toEqual([]);
  });

  test("Reports the engine's first line, on the column it names, or on all", () => {
    const columns = [columnOf('a'), columnOf('b')];
    const failed = (index?: number): Extend =>
      new Extend('extend101', columns).withTyping({
        kind: 'failed',
        signature: getExtendSignature(ORDERS, columns),
        message: "The column 'NOPE' can't be found\nat line 1",
        column: index,
      });
    expect(validationErrors(failed(1))).toEqual([
      `"b" can't be typed: The column 'NOPE' can't be found`,
    ]);
    expect(validationErrors(failed())).toEqual([
      `The new columns can't be typed: The column 'NOPE' can't be found`,
    ]);
  });

  test('Refuses a type that is not a primitive or an enumeration, such as Any', () => {
    expect(
      validationErrors(
        typed(
          [columnOf('a'), columnOf('b')],
          [INTEGER, OpaqueType.get('meta::pure::metamodel::type::Any')],
        ),
      ),
    ).toEqual(['"b" does not have a valid type.']);
    // a typing that doesn't give a type per column waits for another
    expect(validationErrors(typed([columnOf('a')], []))).toEqual([ERR_TYPING]);
  });

  test("Gives the input's columns, then each new one as the engine typed it, nullable", () => {
    const node = typed(
      [columnOf('a'), { ...columnOf('b'), name: 'b' }],
      [INTEGER, FLOAT],
    );
    expect(describeColumns(node.schematize([ORDERS])?.columns ?? [])).toEqual([
      'ORDER_ID SmallInt',
      'SHIP_VIA SmallInt?',
      'FREIGHT Double?',
      'a Integer?',
      'b Float?',
    ]);
    expect(new Extend('extend101').schematize([ORDERS])).toBe(undefined);
  });

  test("Keeps its input's row order: every row stays", () => {
    const node = new Extend('extend101');
    const sorted: RowOrder = [
      {
        column: 'ORDER_ID',
        direction: SortDirection.DESC,
        sortId: 'sort101',
        keyIndex: 0,
      },
    ];
    expect(node.outputOrder([sorted])).toBe(sorted);
    expect(node.outputOrder([undefined])).toBeUndefined();
  });
});

describe(unitTest('Extend signatures and lambdas'), () => {
  test("Signs the input's names, types and nullability, and each column's name and lambda, whatever their keys' order", () => {
    const signature = getExtendSignature(ORDERS, [columnOf('a')]);
    expect(signature).toMatch(/^[0-9a-f]{13,14}$/u);
    expect(getExtendSignature(ORDERS, [columnOf('a')])).toBe(signature);
    const reordered: ExtendColumn = {
      name: 'a',
      code: 'another text',
      lambda: Object.fromEntries(Object.entries(plusOne('ORDER_ID')).reverse()),
    };
    expect(getExtendSignature(ORDERS, [reordered])).toBe(signature);
    const nullable = new Schema([
      column('ORDER_ID', `${P}SmallInt`, true),
      ...ORDERS.columns.slice(1),
    ]);
    expect(getExtendSignature(nullable, [columnOf('a')])).not.toBe(signature);
  });

  test('Takes a lambda of one parameter and a body as an expression', () => {
    expect(isOneParameterLambda(plusOne('ORDER_ID'))).toBe(true);
    expect(
      isOneParameterLambda({
        _type: 'lambda',
        parameters: [{ _type: 'var', name: 'x' }],
        body: [],
      }),
    ).toBe(false);
    expect(isOneParameterLambda({ _type: 'integer', value: '1' })).toBe(false);
  });
});
