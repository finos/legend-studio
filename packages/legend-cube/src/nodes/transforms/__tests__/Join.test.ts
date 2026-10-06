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
import {
  column,
  enumColumn,
  resolvedTable,
  TestUnaryNode,
} from '../../../__test-utils__/CubeTestNodes.js';
import { Connection } from '../../../graph/Connection.js';
import { Query } from '../../../graph/Query.js';
import { buildSchemasAndValidity } from '../../../inference/SchemaInference.js';
import { ERR_INCOMPLETE, ERR_SCHEMAS } from '../../../messages/CubeMessages.js';
import { Schema, SchemaColumn } from '../../../schema/Schema.js';
import {
  type CubeType,
  EnumType,
  OpaqueType,
  PrimitiveType,
} from '../../../types/CubeType.js';
import {
  buildJoinSchemaColumns,
  getDuplicateJoinColumns,
  getMergedJoinKeyType,
  getSameNamedJoinKeys,
  isJoinType,
  Join,
  JOIN_TYPE_LABELS,
  JOIN_TYPES,
  JoinType,
} from '../Join.js';

const PRECISE = 'meta::pure::precisePrimitives::';
const type = (path: string, params: number[] = []): CubeType =>
  PrimitiveType.get(path, params);
const varchar = (length: number): CubeType =>
  type(`${PRECISE}Varchar`, [length]);
const REGION = 'trading::Region';

/** Each column as `name type`, with `?` when nullable, e.g. `bookId Int` or `region Region?` */
const describeColumns = (columns: readonly SchemaColumn[]): string[] =>
  columns.map((c) => `${c.name} ${c.type.displayName}${c.nullable ? '?' : ''}`);

const schema = (...columns: SchemaColumn[]): Schema => new Schema(columns);

const columnOf = (
  name: string,
  columnType: CubeType,
  nullable = false,
): SchemaColumn => new SchemaColumn(name, columnType, nullable);

const join = (
  leftColumns: string[],
  rightColumns: string[],
  joinType = JoinType.INNER,
): Join => new Join('join101', { leftColumns, rightColumns, joinType });

const validationErrors = (
  node: Join,
  left: Schema,
  right: Schema,
): string[] => {
  const errors: string[] = [];
  expect(node.validate([left, right], errors)).toBe(errors.length === 0);
  // validating without collecting errors gives the same verdict
  expect(node.validate([left, right])).toBe(errors.length === 0);
  return errors;
};

const outputOf = (node: Join, left: Schema, right: Schema): string[] => {
  const output = node.schematize([left, right]);
  if (!output) {
    throw new Error(
      `Expected a valid join, got: ${validationErrors(node, left, right).join(' | ')}`,
    );
  }
  return describeColumns(output.columns);
};

// Appendix C.1, retyped with the precise types an engine reports
const TRADES = schema(
  column('tradeId', `${PRECISE}Int`),
  column('bookId', `${PRECISE}Int`),
  column('notional', `${PRECISE}Double`),
  column('tradeDate', 'StrictDate'),
);
const BOOKS = schema(
  column('bookId', `${PRECISE}Int`),
  column('bookName', `${PRECISE}Varchar`, false, [40]),
  enumColumn('region', REGION, ['EMEA', 'APAC', 'AMER']),
);

describe(unitTest('Join node'), () => {
  test('Is a binary node with Left and Right ports', () => {
    const node = new Join('join101');
    expect(node.type).toBe('join');
    expect(Join.TYPE).toBe('join');
    expect(node.ports).toEqual(['leftTds', 'rightTds']);
    expect(node.portLabels).toEqual(['Left', 'Right']);
    expect(node.acceptsNewInputs).toBe(true);
    expect(node.describe()).toBe('Join additional input');
  });

  test('Starts as a left outer join with no key columns', () => {
    const node = new Join('join101');
    expect(node.leftColumns).toEqual([]);
    expect(node.rightColumns).toEqual([]);
    expect(node.joinType).toBe(JoinType.LEFT_OUTER);
    expect(
      new Join('join102', { joinType: JoinType.FULL_OUTER }).joinType,
    ).toBe(JoinType.FULL_OUTER);
  });

  test('Keeps its own frozen copy of the key columns', () => {
    const leftColumns = ['a'];
    const node = new Join('join101', { leftColumns, rightColumns: ['b'] });
    leftColumns.push('c');
    expect(node.leftColumns).toEqual(['a']);
    expect(Object.isFrozen(node.leftColumns)).toBe(true);
    expect(Object.isFrozen(node.rightColumns)).toBe(true);
  });

  test('Refuses settings that are not key column lists and a join type', () => {
    expect(
      () => new Join('join101', { joinType: 'OUTER' as JoinType }),
    ).toThrow('Unknown join type "OUTER"');
    expect(
      () =>
        new Join('join101', {
          leftColumns: [1] as unknown as string[],
        }),
    ).toThrow();
    expect(
      () =>
        new Join('join101', {
          rightColumns: 'a' as unknown as string[],
        }),
    ).toThrow();
    expect(() => new Join('')).toThrow();
  });

  test('Offers four join types, in order, with labels', () => {
    expect(JOIN_TYPES).toEqual([
      JoinType.INNER,
      JoinType.LEFT_OUTER,
      JoinType.RIGHT_OUTER,
      JoinType.FULL_OUTER,
    ]);
    expect(JOIN_TYPES.map((joinType) => JOIN_TYPE_LABELS[joinType])).toEqual([
      'Inner',
      'Left Outer',
      'Right Outer',
      'Full Outer',
    ]);
    JOIN_TYPES.forEach((joinType) => expect(isJoinType(joinType)).toBe(true));
    ['Inner', 'inner', 'LEFT', '', undefined, null, 1].forEach((value) =>
      expect(isJoinType(value)).toBe(false),
    );
  });

  test('Edits into a new node with the same id', () => {
    const node = join(['a'], ['b'], JoinType.LEFT_OUTER);
    const edited = node.withSettings({ joinType: JoinType.FULL_OUTER });
    expect(edited.id).toBe(node.id);
    expect(edited.key).not.toBe(node.key);
    expect(edited.leftColumns).toEqual(['a']);
    expect(edited.rightColumns).toEqual(['b']);
    expect(edited.joinType).toBe(JoinType.FULL_OUTER);
    expect(node.joinType).toBe(JoinType.LEFT_OUTER);
    expect(node.withSettings({ leftColumns: ['c'] }).leftColumns).toEqual([
      'c',
    ]);
  });

  test('Swaps its key columns, not its join type, when its inputs swap', () => {
    const node = join(['a', 'b'], ['x', 'y'], JoinType.LEFT_OUTER);
    const swapped = node.withSwappedInputs();
    expect(swapped.id).toBe(node.id);
    expect(swapped.key).not.toBe(node.key);
    expect(swapped.leftColumns).toEqual(['x', 'y']);
    expect(swapped.rightColumns).toEqual(['a', 'b']);
    expect(swapped.joinType).toBe(JoinType.LEFT_OUTER);
  });

  test('Checks that it gets one input schema per port', () => {
    const node = join(['bookId'], ['bookId']);
    expect(() => node.validate([TRADES])).toThrow(/input schema/u);
    expect(() => node.schematize([TRADES, BOOKS, BOOKS])).toThrow(
      /input schema/u,
    );
  });
});

describe(unitTest('Join validation'), () => {
  const LEFT = schema(column('id'), column('name', 'String'), column('l'));
  const RIGHT = schema(column('ref'), column('label', 'String'), column('r'));

  test('Is valid with matching keys of compatible types', () => {
    expect(validationErrors(join(['id'], ['ref']), LEFT, RIGHT)).toEqual([]);
    expect(
      validationErrors(join(['id', 'name'], ['ref', 'label']), LEFT, RIGHT),
    ).toEqual([]);
  });

  test('Step 1: needs left key columns, and stops there', () => {
    expect(validationErrors(join([], []), LEFT, RIGHT)).toEqual([
      'Left join columns cannot be empty.',
    ]);
    expect(validationErrors(join([], ['ref']), LEFT, RIGHT)).toEqual([
      'Left join columns cannot be empty.',
    ]);
  });

  test('Step 2: needs right key columns', () => {
    expect(validationErrors(join(['id'], []), LEFT, RIGHT)).toEqual([
      'Right join columns cannot be empty.',
    ]);
  });

  test('Step 3: needs as many keys on each side', () => {
    expect(
      validationErrors(join(['id', 'name'], ['ref']), LEFT, RIGHT),
    ).toEqual([
      'Number of left join columns must be the same as number of right join columns.',
    ]);
    expect(
      validationErrors(join(['id'], ['ref', 'label']), LEFT, RIGHT),
    ).toEqual([
      'Number of left join columns must be the same as number of right join columns.',
    ]);
  });

  test('Step 4: needs each key in its input', () => {
    expect(validationErrors(join(['nope'], ['ref']), LEFT, RIGHT)).toEqual([
      'Left join column "nope" is not present in the input schema.',
    ]);
    expect(validationErrors(join(['id'], ['nope']), LEFT, RIGHT)).toEqual([
      'Right join column "nope" is not present in the input schema.',
    ]);
    // a key of the other input is not in this one
    expect(validationErrors(join(['ref'], ['id']), LEFT, RIGHT)).toEqual([
      'Left join column "ref" is not present in the input schema.',
      'Right join column "id" is not present in the input schema.',
    ]);
  });

  test('Step 4: reports both missing keys of a pair, and no type error for it', () => {
    expect(validationErrors(join(['x'], ['y']), LEFT, RIGHT)).toEqual([
      'Left join column "x" is not present in the input schema.',
      'Right join column "y" is not present in the input schema.',
    ]);
  });

  test('Step 4: needs a name for each key', () => {
    expect(validationErrors(join([''], ['ref']), LEFT, RIGHT)).toEqual([
      'Left join column does not have a name.',
    ]);
    expect(validationErrors(join(['id'], ['']), LEFT, RIGHT)).toEqual([
      'Right join column does not have a name.',
    ]);
  });

  test('Step 4: needs compatible key types', () => {
    expect(validationErrors(join(['name'], ['ref']), LEFT, RIGHT)).toEqual([
      'Join columns "name" and "ref" must be of compatible types.',
    ]);
  });

  test('Step 4: reports every broken pair at once, in order', () => {
    expect(
      validationErrors(
        join(['nope', 'id', 'name', 'l'], ['ref', 'label', 'gone', 'r']),
        LEFT,
        RIGHT,
      ),
    ).toEqual([
      'Left join column "nope" is not present in the input schema.',
      'Join columns "id" and "label" must be of compatible types.',
      'Right join column "gone" is not present in the input schema.',
    ]);
  });

  test('Step 5: refuses other column names that both inputs have (spec C.5(b))', () => {
    const books = schema(...BOOKS.columns);
    const trades = schema(
      ...TRADES.columns,
      enumColumn('region', REGION, ['EMEA']),
    );
    expect(
      validationErrors(join(['bookId'], ['bookId']), trades, books),
    ).toEqual([
      'Duplicate column names between inputs are not supported if they are not part of the join columns: "region"',
    ]);
  });

  test('Step 5: exempts only the key (Northwind order details and products)', () => {
    const details = schema(
      column('ORDER_ID', `${PRECISE}SmallInt`),
      column('PRODUCT_ID', `${PRECISE}SmallInt`),
      column('UNIT_PRICE', `${PRECISE}Double`),
    );
    const products = schema(
      column('PRODUCT_ID', `${PRECISE}SmallInt`),
      columnOf('PRODUCT_NAME', varchar(40)),
      column('UNIT_PRICE', `${PRECISE}Double`, true),
    );
    expect(
      validationErrors(join(['PRODUCT_ID'], ['PRODUCT_ID']), details, products),
    ).toEqual([
      'Duplicate column names between inputs are not supported if they are not part of the join columns: "UNIT_PRICE"',
    ]);
  });

  test('Step 5: lists every duplicate, in left input order', () => {
    const left = schema(column('k'), column('b'), column('a'), column('c'));
    const right = schema(column('a'), column('k2'), column('b'));
    expect(validationErrors(join(['k'], ['k2']), left, right)).toEqual([
      'Duplicate column names between inputs are not supported if they are not part of the join columns: "b", "a"',
    ]);
  });

  test('Step 5: a shared name is fine only as a key in the same position on both sides', () => {
    const left = schema(column('a'), column('b'));
    const right = schema(column('a'), column('b'));
    expect(validationErrors(join(['a', 'b'], ['a', 'b']), left, right)).toEqual(
      [],
    );
    expect(validationErrors(join(['a', 'b'], ['b', 'a']), left, right)).toEqual(
      [
        'Duplicate column names between inputs are not supported if they are not part of the join columns: "a", "b"',
      ],
    );
    // a key named like a column of the other input, but not paired with it
    expect(validationErrors(join(['a'], ['b']), left, right)).toEqual([
      'Duplicate column names between inputs are not supported if they are not part of the join columns: "a", "b"',
    ]);
  });

  test('Step 5 is not reached when a key is broken', () => {
    const left = schema(column('a'), column('dup'));
    const right = schema(column('b'), column('dup'));
    expect(validationErrors(join(['a'], ['nope']), left, right)).toEqual([
      'Right join column "nope" is not present in the input schema.',
    ]);
  });
});

describe(unitTest('Join key compatibility'), () => {
  test.each<[string, CubeType, CubeType]>([
    ['Varchar(5) and Varchar(40)', varchar(5), varchar(40)],
    ['String and Varchar(5)', type('String'), varchar(5)],
    [
      'SmallInt and Double',
      type(`${PRECISE}SmallInt`),
      type(`${PRECISE}Double`),
    ],
    [
      'Int and Numeric(10,2)',
      type(`${PRECISE}Int`),
      type(`${PRECISE}Numeric`, [10, 2]),
    ],
    ['Integer and Float', type('Integer'), type('Float')],
    ['Boolean and Boolean', type('Boolean'), type('Boolean')],
    ['StrictDate and StrictDate', type('StrictDate'), type('StrictDate')],
    ['DateTime and Timestamp', type('DateTime'), type(`${PRECISE}Timestamp`)],
    ['Date and StrictDate', type('Date'), type('StrictDate')],
    ['Date and Timestamp', type('Date'), type(`${PRECISE}Timestamp`)],
    ['Date and DateTime', type('Date'), type('DateTime')],
    ['Date and Date', type('Date'), type('Date')],
    ['StrictTime and StrictTime', type('StrictTime'), type('StrictTime')],
    ['Int and SmallInt', type(`${PRECISE}Int`), type(`${PRECISE}SmallInt`)],
    [
      'Numeric(10,2) and Numeric(12,4)',
      type(`${PRECISE}Numeric`, [10, 2]),
      type(`${PRECISE}Numeric`, [12, 4]),
    ],
    [
      'the same enumeration',
      new EnumType(REGION, ['EMEA']),
      new EnumType(REGION, ['APAC']),
    ],
  ])('Joins %s, either way round', (_, leftType, rightType) => {
    expect(
      validationErrors(
        join(['lk'], ['rk']),
        schema(columnOf('lk', leftType)),
        schema(columnOf('rk', rightType)),
      ),
    ).toEqual([]);
    expect(
      validationErrors(
        join(['lk'], ['rk']),
        schema(columnOf('lk', rightType)),
        schema(columnOf('rk', leftType)),
      ),
    ).toEqual([]);
  });

  test.each<[string, CubeType, CubeType]>([
    ['Varchar and SmallInt', varchar(5), type(`${PRECISE}SmallInt`)],
    [
      'StrictDate and Timestamp',
      type('StrictDate'),
      type(`${PRECISE}Timestamp`),
    ],
    ['StrictDate and DateTime', type('StrictDate'), type('DateTime')],
    ['String and Integer', type('String'), type('Integer')],
    ['StrictTime and StrictDate', type('StrictTime'), type('StrictDate')],
    ['StrictTime and DateTime', type('StrictTime'), type('DateTime')],
    [
      'Variant and String',
      type('meta::pure::metamodel::variant::Variant'),
      type('String'),
    ],
    ['Boolean and Integer', type('Boolean'), type('Integer')],
    [
      'different enumerations',
      new EnumType(REGION, ['EMEA']),
      new EnumType('trading::Desk', ['EMEA']),
    ],
    [
      'an enumeration and a String',
      new EnumType(REGION, ['EMEA']),
      type('String'),
    ],
    [
      'Variant and Variant',
      type('meta::pure::metamodel::variant::Variant'),
      type('meta::pure::metamodel::variant::Variant'),
    ],
    [
      'an unknown type with itself',
      OpaqueType.get('x::Blob'),
      OpaqueType.get('x::Blob'),
    ],
  ])('Refuses to join %s, either way round', (_, leftType, rightType) => {
    expect(
      validationErrors(
        join(['lk'], ['rk']),
        schema(columnOf('lk', leftType)),
        schema(columnOf('rk', rightType)),
      ),
    ).toEqual(['Join columns "lk" and "rk" must be of compatible types.']);
    expect(
      validationErrors(
        join(['lk'], ['rk']),
        schema(columnOf('lk', rightType)),
        schema(columnOf('rk', leftType)),
      ),
    ).toEqual(['Join columns "lk" and "rk" must be of compatible types.']);
  });

  test('Refuses a text key against a number key (Northwind)', () => {
    const customers = schema(columnOf('CUSTOMER_ID', varchar(5)));
    const orders = schema(column('EMPLOYEE_ID', `${PRECISE}SmallInt`, true));
    expect(
      validationErrors(
        join(['CUSTOMER_ID'], ['EMPLOYEE_ID']),
        customers,
        orders,
      ),
    ).toEqual([
      'Join columns "CUSTOMER_ID" and "EMPLOYEE_ID" must be of compatible types.',
    ]);
  });

  test('Does not block a String key of unknown physical type against a Varchar', () => {
    // a relational OTHER or ARRAY column comes back as a plain String
    expect(
      validationErrors(
        join(['FREIGHT'], ['CODE']),
        schema(column('FREIGHT', 'String', true)),
        schema(columnOf('CODE', varchar(10))),
      ),
    ).toEqual([]);
  });
});

describe(unitTest('Join output schema'), () => {
  test('Puts the key first and drops the right copy of a same-named key (spec C.3)', () => {
    expect(outputOf(join(['bookId'], ['bookId']), TRADES, BOOKS)).toEqual([
      'bookId Int',
      'tradeId Int',
      'notional Double',
      'tradeDate StrictDate',
      'bookName Varchar(40)',
      'region Region',
    ]);
  });

  // PLAN §8.5: the relation type the engine gave for this join, in this order
  test('Joins Northwind orders to customers in the engine order', () => {
    const v = (name: string, length: number, nullable = true): SchemaColumn =>
      column(name, `${PRECISE}Varchar`, nullable, [length]);
    const smallInt = (name: string, nullable = true): SchemaColumn =>
      column(name, `${PRECISE}SmallInt`, nullable);
    const date = (name: string): SchemaColumn =>
      column(name, 'StrictDate', true);
    const orders = schema(
      smallInt('ORDER_ID', false),
      v('CUSTOMER_ID', 5),
      smallInt('EMPLOYEE_ID'),
      date('ORDER_DATE'),
      date('REQUIRED_DATE'),
      date('SHIPPED_DATE'),
      smallInt('SHIP_VIA'),
      column('FREIGHT', 'String', true),
      v('SHIP_NAME', 40),
      v('SHIP_ADDRESS', 60),
      v('SHIP_CITY', 15),
      v('SHIP_REGION', 15),
      v('SHIP_POSTAL_CODE', 10),
      v('SHIP_COUNTRY', 15),
    );
    const customers = schema(
      v('CUSTOMER_ID', 5, false),
      v('COMPANY_NAME', 40, false),
      v('CONTACT_NAME', 30),
      v('CONTACT_TITLE', 30),
      v('ADDRESS', 60),
      v('CITY', 15),
      v('REGION', 15),
      v('POSTAL_CODE', 10),
      v('COUNTRY', 15),
      v('PHONE', 24),
      v('FAX', 24),
    );
    expect(
      outputOf(join(['CUSTOMER_ID'], ['CUSTOMER_ID']), orders, customers),
    ).toEqual([
      'CUSTOMER_ID Varchar(5)?',
      'ORDER_ID SmallInt',
      'EMPLOYEE_ID SmallInt?',
      'ORDER_DATE StrictDate?',
      'REQUIRED_DATE StrictDate?',
      'SHIPPED_DATE StrictDate?',
      'SHIP_VIA SmallInt?',
      'FREIGHT String?',
      'SHIP_NAME Varchar(40)?',
      'SHIP_ADDRESS Varchar(60)?',
      'SHIP_CITY Varchar(15)?',
      'SHIP_REGION Varchar(15)?',
      'SHIP_POSTAL_CODE Varchar(10)?',
      'SHIP_COUNTRY Varchar(15)?',
      'COMPANY_NAME Varchar(40)',
      'CONTACT_NAME Varchar(30)?',
      'CONTACT_TITLE Varchar(30)?',
      'ADDRESS Varchar(60)?',
      'CITY Varchar(15)?',
      'REGION Varchar(15)?',
      'POSTAL_CODE Varchar(10)?',
      'COUNTRY Varchar(15)?',
      'PHONE Varchar(24)?',
      'FAX Varchar(24)?',
    ]);
    // customers without orders are kept: the order columns become nullable
    const kept = outputOf(
      join(['CUSTOMER_ID'], ['CUSTOMER_ID'], JoinType.LEFT_OUTER),
      customers,
      orders,
    );
    expect(kept.slice(0, 3)).toEqual([
      'CUSTOMER_ID Varchar(5)',
      'COMPANY_NAME Varchar(40)',
      'CONTACT_NAME Varchar(30)?',
    ]);
    expect(kept).toContain('ORDER_ID SmallInt?');
  });

  test('Orders left keys, right keys, other left columns, then other right columns', () => {
    const left = schema(column('a'), column('lk'), column('b'));
    const right = schema(column('c'), column('rk'), column('d'));
    expect(outputOf(join(['lk'], ['rk']), left, right)).toEqual([
      'lk Integer',
      'rk Integer',
      'a Integer',
      'b Integer',
      'c Integer',
      'd Integer',
    ]);
  });

  test('Keeps the keys in the order given, not the schema order', () => {
    const left = schema(column('a'), column('b'), column('x'));
    const right = schema(column('c'), column('d'), column('y'));
    expect(outputOf(join(['b', 'a'], ['d', 'c']), left, right)).toEqual([
      'b Integer',
      'a Integer',
      'd Integer',
      'c Integer',
      'x Integer',
      'y Integer',
    ]);
  });

  test('Joins on several keys, some of them same-named', () => {
    const left = schema(
      column('id'),
      column('region', 'String'),
      column('x', 'Float'),
    );
    const right = schema(
      column('regionCode', 'String'),
      column('y', 'Boolean'),
      column('id'),
    );
    expect(
      outputOf(join(['id', 'region'], ['id', 'regionCode']), left, right),
    ).toEqual([
      'id Integer',
      'region String',
      'regionCode String',
      'x Float',
      'y Boolean',
    ]);
  });

  test('Makes the columns of the side without unmatched rows nullable', () => {
    const left = schema(
      column('lk', `${PRECISE}Int`),
      column('la', `${PRECISE}Varchar`, false, [10]),
      column('lb', `${PRECISE}Double`, true),
    );
    const right = schema(
      column('rk', `${PRECISE}SmallInt`),
      column('ra', `${PRECISE}Varchar`, false, [20]),
      column('rb', 'StrictDate', true),
    );
    const output = (joinType: JoinType): string[] =>
      outputOf(join(['lk'], ['rk'], joinType), left, right);
    expect(output(JoinType.INNER)).toEqual([
      'lk Int',
      'rk SmallInt',
      'la Varchar(10)',
      'lb Double?',
      'ra Varchar(20)',
      'rb StrictDate?',
    ]);
    expect(output(JoinType.LEFT_OUTER)).toEqual([
      'lk Int',
      'rk SmallInt?',
      'la Varchar(10)',
      'lb Double?',
      'ra Varchar(20)?',
      'rb StrictDate?',
    ]);
    expect(output(JoinType.RIGHT_OUTER)).toEqual([
      'lk Int?',
      'rk SmallInt',
      'la Varchar(10)?',
      'lb Double?',
      'ra Varchar(20)',
      'rb StrictDate?',
    ]);
    expect(output(JoinType.FULL_OUTER)).toEqual([
      'lk Int?',
      'rk SmallInt?',
      'la Varchar(10)?',
      'lb Double?',
      'ra Varchar(20)?',
      'rb StrictDate?',
    ]);
  });

  test('Takes a same-named key from the side whose value it keeps', () => {
    const left = schema(column('id', `${PRECISE}SmallInt`), column('l'));
    const right = schema(column('id', `${PRECISE}Int`, true), column('r'));
    const output = (joinType: JoinType): string[] =>
      outputOf(join(['id'], ['id'], joinType), left, right);
    expect(output(JoinType.INNER)).toEqual([
      'id SmallInt',
      'l Integer',
      'r Integer',
    ]);
    expect(output(JoinType.LEFT_OUTER)).toEqual([
      'id SmallInt',
      'l Integer',
      'r Integer?',
    ]);
    // the left key is NULL for unmatched right rows, so the right key is kept
    expect(output(JoinType.RIGHT_OUTER)).toEqual([
      'id Int?',
      'l Integer?',
      'r Integer',
    ]);
    // coalesce(left, right): their common type, nullable if either key is
    expect(output(JoinType.FULL_OUTER)).toEqual([
      'id Integer?',
      'l Integer?',
      'r Integer?',
    ]);
  });

  test('Keeps the right key of a RIGHT join, type and nullability', () => {
    const left = schema(columnOf('id', varchar(5), true));
    const right = schema(columnOf('id', varchar(40)));
    expect(
      outputOf(join(['id'], ['id'], JoinType.RIGHT_OUTER), left, right),
    ).toEqual(['id Varchar(40)']);
    expect(
      outputOf(join(['id'], ['id'], JoinType.LEFT_OUTER), left, right),
    ).toEqual(['id Varchar(5)?']);
  });

  test('Makes a FULL join merged key nullable when exactly one key is', () => {
    const notNull = schema(columnOf('id', varchar(5)));
    const nullable = schema(columnOf('id', varchar(5), true));
    const full = join(['id'], ['id'], JoinType.FULL_OUTER);
    expect(outputOf(full, nullable, notNull)).toEqual(['id Varchar(5)?']);
    expect(outputOf(full, notNull, nullable)).toEqual(['id Varchar(5)?']);
    expect(outputOf(full, nullable, nullable)).toEqual(['id Varchar(5)?']);
    expect(outputOf(full, notNull, notNull)).toEqual(['id Varchar(5)']);
  });

  test.each<[string, CubeType, CubeType, string]>([
    ['Varchar(15) and Varchar(15)', varchar(15), varchar(15), 'Varchar(15)'],
    ['Varchar(15) and Varchar(2)', varchar(15), varchar(2), 'String'],
    ['Varchar(15) and String', varchar(15), type('String'), 'String'],
    [
      'Numeric(10,2) and Numeric(12,4)',
      type(`${PRECISE}Numeric`, [10, 2]),
      type(`${PRECISE}Numeric`, [12, 4]),
      'Decimal',
    ],
    [
      'Int and SmallInt',
      type(`${PRECISE}Int`),
      type(`${PRECISE}SmallInt`),
      'Integer',
    ],
    [
      'SmallInt and Double',
      type(`${PRECISE}SmallInt`),
      type(`${PRECISE}Double`),
      'Number',
    ],
    [
      'SmallInt and Numeric(10,2)',
      type(`${PRECISE}SmallInt`),
      type(`${PRECISE}Numeric`, [10, 2]),
      'Number',
    ],
    [
      'Timestamp and DateTime',
      type(`${PRECISE}Timestamp`),
      type('DateTime'),
      'DateTime',
    ],
    ['StrictDate and Date', type('StrictDate'), type('Date'), 'Date'],
    ['Timestamp and Date', type(`${PRECISE}Timestamp`), type('Date'), 'Date'],
    [
      'the same enumeration',
      new EnumType(REGION, ['EMEA']),
      new EnumType(REGION, ['EMEA', 'APAC']),
      'Region',
    ],
  ])(
    'Types a FULL join merged key of %s as their common type',
    (_, leftType, rightType, expected) => {
      const output = new Join('join101', {
        leftColumns: ['k'],
        rightColumns: ['k'],
        joinType: JoinType.FULL_OUTER,
      }).schematize([
        schema(columnOf('k', leftType)),
        schema(columnOf('k', rightType)),
      ]);
      expect(output?.type('k')?.displayName).toBe(expected);
      expect(getMergedJoinKeyType(leftType, rightType).displayName).toBe(
        expected,
      );
      expect(getMergedJoinKeyType(rightType, leftType).displayName).toBe(
        expected,
      );
    },
  );

  test('Types a FULL join merged key of equal types as the left one', () => {
    const left = new EnumType(REGION, ['EMEA']);
    const right = new EnumType(REGION, ['EMEA', 'APAC']);
    expect(getMergedJoinKeyType(left, right)).toBe(left);
    expect(getMergedJoinKeyType(varchar(15), varchar(15))).toBe(varchar(15));
  });

  test('Has no merged key type for types with nothing in common', () => {
    expect(() => getMergedJoinKeyType(type('String'), type('Integer'))).toThrow(
      /no common type/u,
    );
    expect(() =>
      getMergedJoinKeyType(OpaqueType.get('x::A'), OpaqueType.get('x::B')),
    ).toThrow(/no common type/u);
  });

  test.each(JOIN_TYPES)(
    'Outputs each name once when a key is used twice (%s)',
    (joinType) => {
      const names = (
        leftColumns: string[],
        rightColumns: string[],
        left: Schema,
        right: Schema,
      ): string[] =>
        (
          join(leftColumns, rightColumns, joinType).schematize([left, right])
            ?.columns ?? []
        ).map((c) => c.name);
      // the left key `a` is paired with the right `a`, then with the right `c`
      expect(
        names(
          ['a', 'a'],
          ['a', 'c'],
          schema(column('a'), column('l')),
          schema(column('a'), column('c'), column('r')),
        ),
      ).toEqual(['a', 'c', 'l', 'r']);
      // the right key `a` is paired with the left `a`, then with the left `b`
      expect(
        names(
          ['a', 'b'],
          ['a', 'a'],
          schema(column('a'), column('b'), column('l')),
          schema(column('a'), column('r')),
        ),
      ).toEqual(['a', 'b', 'l', 'r']);
      // the same pair twice
      expect(
        names(
          ['a', 'a'],
          ['a', 'a'],
          schema(column('a'), column('l')),
          schema(column('a'), column('r')),
        ),
      ).toEqual(['a', 'l', 'r']);
    },
  );

  test('Has no output schema when invalid', () => {
    const left = schema(column('a'), column('dup'));
    const right = schema(column('b'), column('dup'));
    expect(join([], []).schematize([left, right])).toBeUndefined();
    expect(join(['a'], ['nope']).schematize([left, right])).toBeUndefined();
    expect(join(['a'], ['b']).schematize([left, right])).toBeUndefined();
    expect(
      join(['a'], ['b']).schematize([left, schema(column('b'))]),
    ).toBeInstanceOf(Schema);
  });
});

describe(unitTest('Join helpers'), () => {
  test('Finds the positionally identical keys, each once', () => {
    expect(getSameNamedJoinKeys(['a', 'b', 'c'], ['a', 'x', 'c'])).toEqual([
      'a',
      'c',
    ]);
    expect(getSameNamedJoinKeys(['a', 'b'], ['b', 'a'])).toEqual([]);
    expect(getSameNamedJoinKeys(['a', 'a', 'b'], ['a', 'a', 'b'])).toEqual([
      'a',
      'b',
    ]);
    // only the pairs that both lists have
    expect(getSameNamedJoinKeys(['a', 'b'], ['a'])).toEqual(['a']);
    expect(getSameNamedJoinKeys(['a'], ['a', 'b'])).toEqual(['a']);
    expect(getSameNamedJoinKeys([], [])).toEqual([]);
  });

  test('Finds the duplicate columns, honouring extra allowed names', () => {
    const left = schema(column('k'), column('a'), column('b'), column('l'));
    const right = schema(column('b'), column('k'), column('a'), column('r'));
    expect(getDuplicateJoinColumns(left, right, ['k'], ['k'])).toEqual([
      'a',
      'b',
    ]);
    expect(getDuplicateJoinColumns(left, right, ['k'], ['k'], ['b'])).toEqual([
      'a',
    ]);
    expect(
      getDuplicateJoinColumns(left, right, ['k'], ['k'], ['a', 'b']),
    ).toEqual([]);
    expect(getDuplicateJoinColumns(left, right, ['l'], ['r'])).toEqual([
      'k',
      'a',
      'b',
    ]);
  });

  test('Builds the output columns of a valid join', () => {
    expect(
      describeColumns(
        buildJoinSchemaColumns(
          TRADES,
          BOOKS,
          ['bookId'],
          ['bookId'],
          JoinType.LEFT_OUTER,
        ),
      ),
    ).toEqual([
      'bookId Int',
      'tradeId Int',
      'notional Double',
      'tradeDate StrictDate',
      'bookName Varchar(40)?',
      'region Region?',
    ]);
    expect(() =>
      buildJoinSchemaColumns(
        TRADES,
        BOOKS,
        ['nope'],
        ['bookId'],
        JoinType.INNER,
      ),
    ).toThrow(/left input has no join column "nope"/u);
    expect(() =>
      buildJoinSchemaColumns(
        TRADES,
        BOOKS,
        ['bookId'],
        ['nope'],
        JoinType.INNER,
      ),
    ).toThrow(/right input has no join column "nope"/u);
  });
});

describe(unitTest('Join in a query'), () => {
  const trades = (): ReturnType<typeof resolvedTable> =>
    resolvedTable('relational101', 'TRADES', [...TRADES.columns]);
  const books = (): ReturnType<typeof resolvedTable> =>
    resolvedTable('relational102', 'BOOKS', [...BOOKS.columns]);
  const edge = (s: string, t: string, port: string): Connection =>
    new Connection(s, t, port);
  const appendixC = (): Query =>
    new Query(
      [
        trades(),
        books(),
        join(['bookId'], ['bookId']),
        new TestUnaryNode('filter101'),
      ],
      [
        edge('relational101', 'join101', 'leftTds'),
        edge('relational102', 'join101', 'rightTds'),
        edge('join101', 'filter101', 'tds'),
      ],
      'filter101',
    );

  test('Gives the expected schema at every node (spec C.3)', () => {
    const { schemas, validity } = buildSchemasAndValidity(appendixC());
    const expected = [
      'bookId Int',
      'tradeId Int',
      'notional Double',
      'tradeDate StrictDate',
      'bookName Varchar(40)',
      'region Region',
    ];
    expect(describeColumns(schemas.get('join101')?.columns ?? [])).toEqual(
      expected,
    );
    expect(describeColumns(schemas.get('filter101')?.columns ?? [])).toEqual(
      expected,
    );
    expect(appendixC().validate(validity)).toBe(true);
  });

  test('Needs both inputs (spec C.5(a))', () => {
    const query = appendixC().remove('relational102');
    const { schemas, validity } = buildSchemasAndValidity(query);
    expect(validity.get('join101')).toEqual([ERR_INCOMPLETE]);
    expect(validity.get('filter101')).toEqual([ERR_SCHEMAS]);
    expect(schemas.get('join101')).toBeUndefined();
    expect(query.validate(validity)).toBe(false);
  });

  test('Reports a duplicate column once, on the join (spec C.5(b))', () => {
    // both tables have a `region` column; the join stays on `bookId`
    const regionInBoth = new Query(
      [
        resolvedTable('relational101', 'TRADES', [
          ...TRADES.columns,
          enumColumn('region', REGION, ['EMEA']),
        ]),
        books(),
        join(['bookId'], ['bookId']),
        new TestUnaryNode('filter101'),
      ],
      appendixC().connections,
      'filter101',
    );
    const { schemas, validity } = buildSchemasAndValidity(regionInBoth);
    expect(validity.get('join101')).toEqual([
      'Duplicate column names between inputs are not supported if they are not part of the join columns: "region"',
    ]);
    expect(validity.get('filter101')).toEqual([ERR_SCHEMAS]);
    expect(schemas.get('join101')).toBeUndefined();
    expect(regionInBoth.validate(validity)).toBe(false);
  });

  test('Turns a left join around when its inputs swap, staying valid', () => {
    const orders = resolvedTable('relational101', 'ORDERS', [
      column('ORDER_ID', `${PRECISE}SmallInt`),
      column('CUSTOMER_ID', `${PRECISE}Varchar`, true, [5]),
    ]);
    const customers = resolvedTable('relational102', 'CUSTOMERS', [
      column('ID', `${PRECISE}Varchar`, false, [5]),
      column('COMPANY_NAME', `${PRECISE}Varchar`, false, [40]),
    ]);
    const query = new Query(
      [orders, customers, join(['CUSTOMER_ID'], ['ID'], JoinType.LEFT_OUTER)],
      [
        edge('relational101', 'join101', 'leftTds'),
        edge('relational102', 'join101', 'rightTds'),
      ],
      'join101',
    );
    const before = buildSchemasAndValidity(query);
    expect(
      describeColumns(before.schemas.get('join101')?.columns ?? []),
    ).toEqual([
      'CUSTOMER_ID Varchar(5)?',
      'ID Varchar(5)?',
      'ORDER_ID SmallInt',
      'COMPANY_NAME Varchar(40)?',
    ]);

    const swapped = query.swapInputs('join101');
    const node = swapped.getNode('join101') as Join;
    expect(node.leftColumns).toEqual(['ID']);
    expect(node.rightColumns).toEqual(['CUSTOMER_ID']);
    expect(node.joinType).toBe(JoinType.LEFT_OUTER);
    const after = buildSchemasAndValidity(swapped);
    expect(after.validity.get('join101')).toEqual([]);
    // the customers are now kept, and the orders columns become nullable
    expect(
      describeColumns(after.schemas.get('join101')?.columns ?? []),
    ).toEqual([
      'ID Varchar(5)',
      'CUSTOMER_ID Varchar(5)?',
      'COMPANY_NAME Varchar(40)',
      'ORDER_ID SmallInt?',
    ]);
    // swapping back restores the settings
    const restored = swapped.swapInputs('join101').getNode('join101') as Join;
    expect(restored.leftColumns).toEqual(['CUSTOMER_ID']);
    expect(restored.rightColumns).toEqual(['ID']);
  });

  test('Swaps its key columns with a single input', () => {
    const query = new Query(
      [trades(), join(['tradeId'], ['bookId'])],
      [edge('relational101', 'join101', 'leftTds')],
      'join101',
    ).swapInputs('join101');
    expect(query.connections.map((c) => c.port)).toEqual(['rightTds']);
    const node = query.getNode('join101') as Join;
    expect(node.leftColumns).toEqual(['bookId']);
    expect(node.rightColumns).toEqual(['tradeId']);
  });

  test('Heals with its left input when removed', () => {
    const query = appendixC().remove('join101');
    expect(
      query.connections.map((c) => `${c.source}>${c.target}:${c.port}`),
    ).toEqual(['relational101>filter101:tds']);
  });
});
