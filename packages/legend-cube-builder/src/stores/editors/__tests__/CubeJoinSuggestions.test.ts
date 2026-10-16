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
import {
  PrimitiveType,
  RelationalTableSource,
  Schema,
  SchemaColumn,
} from '@finos/legend-cube';
import type {
  CubeModelOutline,
  CubeOutlineJoin,
  CubeOutlineTable,
} from '../../../graph-manager/CubeEngine.js';
import type { CubeColumnOrigin } from '../CubeJoinDraft.js';
import {
  CubeJoinSuggestionReason,
  getClearJoinKeySuggestion,
  isKeyLikeColumnName,
  suggestJoinKeys,
} from '../CubeJoinSuggestions.js';

const DB = 'demo::Db';
const { DATABASE_JOIN, PRIMARY_KEY, NAME_PATTERN, SAME_NAME } =
  CubeJoinSuggestionReason;

const INTEGER = PrimitiveType.get('Integer');
const STRING = PrimitiveType.get('String');

const schemaOf = (columns: [string, PrimitiveType][]): Schema =>
  new Schema(columns.map(([name, type]) => new SchemaColumn(name, type, true)));

const tableSource = (
  id: string,
  table: string,
  schema = 'S',
): RelationalTableSource =>
  new RelationalTableSource(id, { database: DB, schema, table });

/** Each column comes from the table column of its name, or of the name `renamed` gives it */
const originsOf =
  (source: RelationalTableSource, renamed: Record<string, string> = {}) =>
  (column: string): CubeColumnOrigin[] => [
    { source, column: renamed[column] ?? column },
  ];

const outlineTable = (
  name: string,
  primaryKey?: string[],
): CubeOutlineTable => ({
  name,
  isView: false,
  columnCount: 0,
  flags: [],
  untypedColumns: [],
  ...(primaryKey ? { primaryKey } : {}),
});

const outlineOf = (
  tables: CubeOutlineTable[],
  joins: CubeOutlineJoin[] = [],
  schema = 'S',
): CubeModelOutline => ({
  databases: [{ path: DB, schemas: [{ name: schema, tables }], joins }],
  runtimes: [],
});

const ORDERS = schemaOf([
  ['ORDER_ID', INTEGER],
  ['CUSTOMER_ID', STRING],
  ['EMPLOYEE_ID', INTEGER],
  ['SHIP_NAME', STRING],
]);
const CUSTOMERS = schemaOf([
  ['CUSTOMER_ID', STRING],
  ['COMPANY_NAME', STRING],
  ['SHIP_NAME', STRING],
]);
const ORDERS_SOURCE = tableSource('relational101', 'ORDERS');
const CUSTOMERS_SOURCE = tableSource('relational102', 'CUSTOMERS');

const ORDERS_CUSTOMERS: CubeOutlineJoin = {
  name: 'Orders_Customers',
  pairs: [
    [
      { schema: 'S', table: 'ORDERS', column: 'CUSTOMER_ID' },
      { schema: 'S', table: 'CUSTOMERS', column: 'CUSTOMER_ID' },
    ],
  ],
};

const keysOf = (
  suggestions: ReturnType<typeof suggestJoinKeys>,
): [string, string[], string[]][] =>
  suggestions.map((each) => [
    each.reason,
    [...each.leftColumns],
    [...each.rightColumns],
  ]);

describe('The join columns the Join editor suggests', () => {
  test("Suggests the database's join between the inputs' tables first, either way round, then a primary key and same-named columns, key-like first", () => {
    const outline = outlineOf(
      [
        outlineTable('ORDERS', ['ORDER_ID']),
        outlineTable('CUSTOMERS', ['CUSTOMER_ID']),
      ],
      [ORDERS_CUSTOMERS],
    );
    const suggestions = suggestJoinKeys({
      leftSchema: ORDERS,
      rightSchema: CUSTOMERS,
      leftOrigins: originsOf(ORDERS_SOURCE),
      rightOrigins: originsOf(CUSTOMERS_SOURCE),
      outline,
    });
    // the same pair is suggested once, for its strongest reason; SHIP_NAME,
    // no key, isn't, as a better one is
    expect(keysOf(suggestions)).toEqual([
      [DATABASE_JOIN, ['CUSTOMER_ID'], ['CUSTOMER_ID']],
    ]);
    // with nothing better, a column both sides name alike is
    expect(
      keysOf(
        suggestJoinKeys({
          leftSchema: schemaOf([['SHIP_NAME', STRING]]),
          rightSchema: schemaOf([['SHIP_NAME', STRING]]),
          leftOrigins: originsOf(ORDERS_SOURCE),
          rightOrigins: originsOf(CUSTOMERS_SOURCE),
          outline,
        }),
      ),
    ).toEqual([[SAME_NAME, ['SHIP_NAME'], ['SHIP_NAME']]]);
    expect(suggestions[0]?.detail).toBe('Orders_Customers');
    expect(getClearJoinKeySuggestion(suggestions)).toBe(suggestions[0]);
    // the other way round, the join is read from its other end
    expect(
      keysOf(
        suggestJoinKeys({
          leftSchema: CUSTOMERS,
          rightSchema: ORDERS,
          leftOrigins: originsOf(CUSTOMERS_SOURCE),
          rightOrigins: originsOf(ORDERS_SOURCE),
          outline,
        }),
      )[0],
    ).toEqual([DATABASE_JOIN, ['CUSTOMER_ID'], ['CUSTOMER_ID']]);
  });

  test('Follows a column back through a rename to its table, in a quoted table outside any schema', () => {
    const lines = tableSource('relational103', '"ORDER.LINES"', 'default');
    const suggestions = suggestJoinKeys({
      leftSchema: schemaOf([['OID', INTEGER]]),
      rightSchema: schemaOf([['ORDER ID', INTEGER]]),
      // OID is ORDERS.ORDER_ID renamed
      leftOrigins: originsOf(ORDERS_SOURCE, { OID: 'ORDER_ID' }),
      rightOrigins: originsOf(lines),
      outline: {
        databases: [
          {
            path: DB,
            schemas: [],
            joins: [
              {
                name: 'Lines',
                pairs: [
                  [
                    { schema: 'S', table: 'ORDERS', column: 'ORDER_ID' },
                    {
                      schema: 'default',
                      table: '"ORDER.LINES"',
                      column: 'ORDER ID',
                    },
                  ],
                ],
              },
            ],
          },
        ],
        runtimes: [],
      },
    });
    expect(keysOf(suggestions)).toEqual([
      [DATABASE_JOIN, ['OID'], ['ORDER ID']],
    ]);
  });

  test("Offers a compound database join only when every pair maps, and none whose types can't be compared", () => {
    const left = schemaOf([
      ['A', INTEGER],
      ['B', INTEGER],
    ]);
    const right = schemaOf([
      ['X', INTEGER],
      ['Y', STRING],
    ]);
    const join = (pairs: [string, string][]): CubeOutlineJoin => ({
      name: 'J',
      pairs: pairs.map(([a, b]) => [
        { schema: 'S', table: 'L', column: a },
        { schema: 'S', table: 'R', column: b },
      ]),
    });
    const suggest = (joins: CubeOutlineJoin[]): ReturnType<typeof keysOf> =>
      keysOf(
        suggestJoinKeys({
          leftSchema: left,
          rightSchema: right,
          leftOrigins: originsOf(tableSource('relational101', 'L')),
          rightOrigins: originsOf(tableSource('relational102', 'R')),
          outline: outlineOf([], joins),
        }),
      );
    // C isn't on the left
    expect(
      suggest([
        join([
          ['A', 'X'],
          ['C', 'Y'],
        ]),
      ]),
    ).toEqual([]);
    // B is a whole number, Y text
    expect(
      suggest([
        join([
          ['A', 'X'],
          ['B', 'Y'],
        ]),
      ]),
    ).toEqual([]);
    expect(suggest([join([['A', 'X']])])).toEqual([
      [DATABASE_JOIN, ['A'], ['X']],
    ]);
  });

  test("Suggests a primary key the other side names alike, the whole key in key order, and a `<table>_ID` against that table's ID", () => {
    const lines = schemaOf([
      ['LINE', INTEGER],
      ['ORDER_ID', INTEGER],
      ['PRODUCT_ID', INTEGER],
    ]);
    const shipments = schemaOf([
      ['ORDER_ID', INTEGER],
      ['LINE', INTEGER],
      ['QTY', INTEGER],
    ]);
    const products = schemaOf([
      ['ID', INTEGER],
      ['NAME', STRING],
    ]);
    const outline = outlineOf([
      outlineTable('SHIPMENTS', ['ORDER_ID', 'LINE']),
      outlineTable('PRODUCTS', ['ID']),
    ]);
    const linesSource = originsOf(tableSource('relational101', 'LINES'));
    expect(
      keysOf(
        suggestJoinKeys({
          leftSchema: lines,
          rightSchema: shipments,
          leftOrigins: linesSource,
          rightOrigins: originsOf(tableSource('relational102', 'SHIPMENTS')),
          outline,
        }),
      ),
    ).toEqual([
      [PRIMARY_KEY, ['ORDER_ID', 'LINE'], ['ORDER_ID', 'LINE']],
      // each a column of SHIPMENTS' key, in the left's order
      [SAME_NAME, ['LINE'], ['LINE']],
      [SAME_NAME, ['ORDER_ID'], ['ORDER_ID']],
    ]);
    const toProducts = suggestJoinKeys({
      leftSchema: lines,
      rightSchema: products,
      leftOrigins: linesSource,
      rightOrigins: originsOf(tableSource('relational103', 'PRODUCTS')),
      outline,
    });
    expect(keysOf(toProducts)).toEqual([
      [NAME_PATTERN, ['PRODUCT_ID'], ['ID']],
    ]);
    expect(toProducts[0]?.detail).toBe('PRODUCTS');
    // a pattern alone isn't clearly the join
    expect(getClearJoinKeySuggestion(toProducts)).toBeUndefined();
  });

  test('Takes a key without asking only when one is clearly it', () => {
    const suggest = (
      left: Schema,
      right: Schema,
      outline?: CubeModelOutline,
    ): ReturnType<typeof suggestJoinKeys> =>
      suggestJoinKeys({
        leftSchema: left,
        rightSchema: right,
        leftOrigins: originsOf(tableSource('relational101', 'L')),
        rightOrigins: originsOf(tableSource('relational102', 'R')),
        outline,
      });
    // one key-like column of the same name, in any case
    expect(
      keysOf([
        getClearJoinKeySuggestion(
          suggest(
            schemaOf([
              ['CUSTOMER_ID', STRING],
              ['NAME', STRING],
            ]),
            schemaOf([
              ['customer_id', STRING],
              ['NAME', STRING],
            ]),
          ),
        ) as NonNullable<ReturnType<typeof getClearJoinKeySuggestion>>,
      ]),
    ).toEqual([[SAME_NAME, ['CUSTOMER_ID'], ['customer_id']]]);
    // two key-like columns, or only names that aren't keys: none
    expect(
      getClearJoinKeySuggestion(
        suggest(
          schemaOf([
            ['CUSTOMER_ID', STRING],
            ['ORDER_ID', INTEGER],
          ]),
          schemaOf([
            ['CUSTOMER_ID', STRING],
            ['ORDER_ID', INTEGER],
          ]),
        ),
      ),
    ).toBeUndefined();
    expect(
      getClearJoinKeySuggestion(
        suggest(schemaOf([['NAME', STRING]]), schemaOf([['NAME', STRING]])),
      ),
    ).toBeUndefined();
    // two database joins between the tables: none
    const twoJoins = outlineOf(
      [],
      ['A', 'B'].map((column) => ({
        name: column,
        pairs: [
          [
            { schema: 'S', table: 'L', column },
            { schema: 'S', table: 'R', column },
          ],
        ],
      })),
    );
    expect(
      getClearJoinKeySuggestion(
        suggest(
          schemaOf([
            ['A', INTEGER],
            ['B', INTEGER],
          ]),
          schemaOf([
            ['A', INTEGER],
            ['B', INTEGER],
          ]),
          twoJoins,
        ),
      ),
    ).toBeUndefined();
    // a same-named column whose types can't be compared isn't suggested
    expect(
      suggest(
        schemaOf([['CUSTOMER_ID', STRING]]),
        schemaOf([['CUSTOMER_ID', INTEGER]]),
      ),
    ).toEqual([]);
  });

  test('Takes ID, CUSTOMER_ID, CustomerId, ORDER_KEY and ORDER_NO for keys, not NAME, VALID, PAID or GRID', () => {
    expect(
      [
        'ID',
        'id',
        'CUSTOMER_ID',
        'CustomerId',
        'ORDER_KEY',
        'ORDER_NO',
        'NAME',
        'IDEA',
        'VALID',
        'PAID',
        'GRID',
      ].map(isKeyLikeColumnName),
    ).toEqual([
      true,
      true,
      true,
      true,
      true,
      true,
      false,
      false,
      false,
      false,
      false,
    ]);
  });

  test("Doesn't join on a column both sides name alike that only ends like a key", () => {
    const suggestions = suggestJoinKeys({
      leftSchema: schemaOf([['VALID', STRING]]),
      rightSchema: schemaOf([['VALID', STRING]]),
      leftOrigins: originsOf(tableSource('relational101', 'L')),
      rightOrigins: originsOf(tableSource('relational102', 'R')),
      outline: undefined,
    });
    // suggested, as nothing better is, but not taken without asking
    expect(keysOf(suggestions)).toEqual([[SAME_NAME, ['VALID'], ['VALID']]]);
    expect(getClearJoinKeySuggestion(suggestions)).toBeUndefined();
  });
});
