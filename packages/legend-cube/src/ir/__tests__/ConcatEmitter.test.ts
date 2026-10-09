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
import { listOrigins } from '../../__test-utils__/CubeIRTestUtils.js';
import {
  column,
  enumColumn,
  resolvedTable,
} from '../../__test-utils__/CubeTestNodes.js';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { Connection } from '../../graph/Connection.js';
import { Query } from '../../graph/Query.js';
import type { QueryNode } from '../../graph/QueryNode.js';
import { createNodeRegistry } from '../../nodes/NodeRegistry.js';
import { Concat } from '../../nodes/transforms/Concat.js';
import { Limit } from '../../nodes/transforms/Limit.js';
import { Restrict } from '../../nodes/transforms/Restrict.js';
import { Sort, SortDirection } from '../../nodes/transforms/Sort.js';
import { Schema, type SchemaColumn } from '../../schema/Schema.js';
import { storeAccessor } from '../CubeIR.js';
import {
  CONCAT_CONVERTED_COLUMN_BASE,
  emitConcat,
} from '../emitters/ConcatEmitter.js';
import { printIR } from '../IRPrinter.js';
import { QueryEmitter, type RelationOptions } from '../QueryEmitter.js';

const RUNTIME = 'test::Runtime';
const P = 'meta::pure::precisePrimitives::';
const ORDERS = '#>{test::Northwind.NORTHWIND.ORDERS}#';
const ARCHIVE = '#>{test::Northwind.NORTHWIND.ARCHIVE}#';
const HISTORY = '#>{test::Northwind.NORTHWIND.HISTORY}#';
const COLUMNS = [
  column('ORDER_ID'),
  column('CUSTOMER_ID', 'String'),
  column('SHIP_COUNTRY', 'String'),
  column('FREIGHT', 'Float'),
];

/** ORDERS, ARCHIVE and HISTORY: three tables of orders, with the same columns unless given others */
const orders = (columns: SchemaColumn[] = COLUMNS): QueryNode =>
  resolvedTable('relational101', 'ORDERS', columns);
const archive = (columns: SchemaColumn[] = COLUMNS): QueryNode =>
  resolvedTable('relational102', 'ARCHIVE', columns);
const history = (columns: SchemaColumn[] = COLUMNS): QueryNode =>
  resolvedTable('relational103', 'HISTORY', columns);

/** `sort101`, or another id, by ORDER_ID descending */
const byOrderIdDesc = (id = 'sort101'): Sort =>
  new Sort(id, [{ column: 'ORDER_ID', direction: SortDirection.DESC }]);

/** Each node feeding the next on its first port */
const chain = (nodes: readonly QueryNode[]): Connection[] =>
  nodes
    .slice(1)
    .map(
      (node, index) =>
        new Connection(
          (nodes[index] as QueryNode).id,
          node.id,
          node.ports[0] as string,
        ),
    );

/**
 * The chain `first` into concat101's first port, the chain `second` into its
 * second, then the chain `after` after it; the last node selected
 */
const concatOf = (
  first: readonly QueryNode[],
  second: readonly QueryNode[],
  after: readonly QueryNode[] = [],
  concat: Concat = new Concat('concat101'),
): Query =>
  new Query(
    [...first, ...second, concat, ...after],
    [
      ...chain(first),
      ...chain(second),
      new Connection((first.at(-1) as QueryNode).id, concat.id, 'tds1'),
      new Connection((second.at(-1) as QueryNode).id, concat.id, 'tds2'),
      ...chain([concat, ...after]),
    ],
    (after.at(-1) ?? concat).id,
  );

const emitterOf = (query: Query): QueryEmitter =>
  new QueryEmitter(query, createNodeRegistry());

/** The printed relation of the selected node */
const print = (query: Query, options?: RelationOptions): string =>
  printIR(emitterOf(query).emitRelation(query.selected as string, options));

/** ORDER_ID and SHIP_COUNTRY: the schema of the Concats emitted directly */
const SCHEMA = new Schema([
  column('ORDER_ID'),
  column('SHIP_COUNTRY', 'String'),
]);
const ORDERS_ACCESSOR = storeAccessor([
  'test::Northwind',
  'NORTHWIND',
  'ORDERS',
]);
const ARCHIVE_ACCESSOR = storeAccessor([
  'test::Northwind',
  'NORTHWIND',
  'ARCHIVE',
]);

describe(unitTest('Concat emission'), () => {
  test('Concatenates the second input to the first as <first>->concatenate(<second>)', () => {
    expect(print(concatOf([orders()], [archive()]))).toBe(
      `${ORDERS}->concatenate(${ARCHIVE})`,
    );
  });

  test('Concatenates inputs whose columns differ only in nullability, as they are', () => {
    expect(
      print(
        concatOf(
          [orders()],
          [
            archive([
              column('ORDER_ID', 'Integer', true),
              column('CUSTOMER_ID', 'String'),
              column('SHIP_COUNTRY', 'String', true),
              column('FREIGHT', 'Float', true),
            ]),
          ],
        ),
      ),
    ).toBe(`${ORDERS}->concatenate(${ARCHIVE})`);
  });

  test('Takes the first and second inputs by port, not by the order of the nodes or connections', () => {
    // the Concat and ARCHIVE listed first, ARCHIVE's connection too
    const query = new Query(
      [new Concat('concat101'), archive(), orders()],
      [
        new Connection('relational102', 'concat101', 'tds2'),
        new Connection('relational101', 'concat101', 'tds1'),
      ],
      'concat101',
    );
    expect(print(query)).toBe(`${ORDERS}->concatenate(${ARCHIVE})`);
    // wired the other way round
    expect(
      print(
        new Query(
          [orders(), archive(), new Concat('concat101')],
          [
            new Connection('relational101', 'concat101', 'tds2'),
            new Connection('relational102', 'concat101', 'tds1'),
          ],
          'concat101',
        ),
      ),
    ).toBe(`${ARCHIVE}->concatenate(${ORDERS})`);
    // and once the inputs are swapped
    expect(print(query.swapInputs('concat101'))).toBe(
      `${ARCHIVE}->concatenate(${ORDERS})`,
    );
  });

  test('Concatenates each input after its own Restrict', () => {
    const query = concatOf(
      [orders(), new Restrict('restrict101', ['ORDER_ID', 'SHIP_COUNTRY'])],
      [
        archive([...COLUMNS, column('ARCHIVED_ON', 'StrictDate')]),
        new Restrict('restrict102', ['ORDER_ID', 'SHIP_COUNTRY']),
      ],
    );
    const relation = emitterOf(query).emitRelation('concat101');
    expect(printIR(relation)).toBe(
      `${ORDERS}->select(~[ORDER_ID, SHIP_COUNTRY])->concatenate(${ARCHIVE}->select(~[ORDER_ID, SHIP_COUNTRY]))`,
    );
    expect(listOrigins(relation)).toEqual([
      'concatenate@concat101:concat',
      'select@restrict101:select',
      `${ORDERS}@relational101:accessor`,
      'select@restrict102:select',
      `${ARCHIVE}@relational102:accessor`,
    ]);
  });

  test('Nests a Concat of Concats, on either port', () => {
    const concatOfConcat = (port: 'tds1' | 'tds2'): Query =>
      new Query(
        [
          orders(),
          archive(),
          new Concat('concat101'),
          history(),
          new Concat('concat102'),
        ],
        [
          new Connection('relational101', 'concat101', 'tds1'),
          new Connection('relational102', 'concat101', 'tds2'),
          new Connection('concat101', 'concat102', port),
          new Connection(
            'relational103',
            'concat102',
            port === 'tds1' ? 'tds2' : 'tds1',
          ),
        ],
        'concat102',
      );
    const first = emitterOf(concatOfConcat('tds1')).emitRelation('concat102');
    expect(printIR(first)).toBe(
      `${ORDERS}->concatenate(${ARCHIVE})->concatenate(${HISTORY})`,
    );
    expect(listOrigins(first)).toEqual([
      'concatenate@concat102:concat',
      'concatenate@concat101:concat',
      `${ORDERS}@relational101:accessor`,
      `${ARCHIVE}@relational102:accessor`,
      `${HISTORY}@relational103:accessor`,
    ]);
    expect(print(concatOfConcat('tds2'))).toBe(
      `${HISTORY}->concatenate(${ORDERS}->concatenate(${ARCHIVE}))`,
    );
  });

  test('Marks the concatenate call as the concat, its inputs keeping their own origins', () => {
    expect(
      listOrigins(
        emitterOf(concatOf([orders()], [archive()])).emitRelation('concat101'),
      ),
    ).toEqual([
      'concatenate@concat101:concat',
      `${ORDERS}@relational101:accessor`,
      `${ARCHIVE}@relational102:accessor`,
    ]);
    // emitted alone, it marks only its own call
    expect(
      listOrigins(
        emitConcat(
          new Concat('concat101'),
          [ORDERS_ACCESSOR, ARCHIVE_ACCESSOR],
          { inputSchemas: [SCHEMA, SCHEMA], schema: SCHEMA },
        ),
      ),
    ).toEqual(['concatenate@concat101:concat', `${ORDERS}@-`, `${ARCHIVE}@-`]);
  });

  test('Emits a Concat that converts types as one that does not, while the types match', () => {
    expect(
      print(
        concatOf([orders()], [archive()], [], new Concat('concat101', true)),
      ),
    ).toBe(`${ORDERS}->concatenate(${ARCHIVE})`);
  });

  test.each<[string, Schema, Schema, string]>([
    [
      'the first input names a column differently',
      new Schema([column('ORDER_ID'), column('COUNTRY', 'String')]),
      SCHEMA,
      'Concat "concat101" input 1 has ORDER_ID, COUNTRY, but its schema is ORDER_ID, SHIP_COUNTRY',
    ],
    [
      'the second input names a column differently',
      SCHEMA,
      new Schema([column('ORDER_ID'), column('COUNTRY', 'String')]),
      'Concat "concat101" input 2 has ORDER_ID, COUNTRY, but its schema is ORDER_ID, SHIP_COUNTRY',
    ],
    [
      'the first input names a column in another case',
      new Schema([column('order_id'), column('SHIP_COUNTRY', 'String')]),
      SCHEMA,
      'Concat "concat101" input 1 has order_id, SHIP_COUNTRY, but its schema is ORDER_ID, SHIP_COUNTRY',
    ],
    [
      'the second input has the same names in another order',
      SCHEMA,
      new Schema([column('SHIP_COUNTRY', 'String'), column('ORDER_ID')]),
      'Concat "concat101" input 2 has SHIP_COUNTRY, ORDER_ID, but its schema is ORDER_ID, SHIP_COUNTRY',
    ],
    [
      'the first input has a column fewer',
      new Schema([column('ORDER_ID')]),
      SCHEMA,
      'Concat "concat101" input 1 has ORDER_ID, but its schema is ORDER_ID, SHIP_COUNTRY',
    ],
    [
      'the second input has a column more',
      SCHEMA,
      new Schema([...SCHEMA.columns, column('FREIGHT', 'Float')]),
      'Concat "concat101" input 2 has ORDER_ID, SHIP_COUNTRY, FREIGHT, but its schema is ORDER_ID, SHIP_COUNTRY',
    ],
    [
      'both inputs differ: the first is reported',
      new Schema([column('ORDER_ID')]),
      new Schema([column('SHIP_COUNTRY', 'String')]),
      'Concat "concat101" input 1 has ORDER_ID, but its schema is ORDER_ID, SHIP_COUNTRY',
    ],
  ])(
    "Refuses to emit inputs whose names don't come out as the node's schema: %s",
    (_, first, second, message) => {
      expect(() =>
        emitConcat(
          new Concat('concat101'),
          [ORDERS_ACCESSOR, ARCHIVE_ACCESSOR],
          { inputSchemas: [first, second], schema: SCHEMA },
        ),
      ).toThrow(new Error(message));
    },
  );

  test('Refuses to emit a Concat without exactly its two inputs', () => {
    [
      [ORDERS_ACCESSOR],
      [],
      [ORDERS_ACCESSOR, ARCHIVE_ACCESSOR, ORDERS_ACCESSOR],
    ].forEach((inputs) =>
      expect(() =>
        emitConcat(new Concat('concat101'), inputs, {
          inputSchemas: [SCHEMA, SCHEMA],
          schema: SCHEMA,
        }),
      ).toThrow(
        new Error(`Can't emit concat "concat101": it needs two inputs`),
      ),
    );
  });

  test('Refuses to emit a Concat without exactly two input schemas', () => {
    [[SCHEMA], [], [SCHEMA, SCHEMA, SCHEMA]].forEach((inputSchemas) =>
      expect(() =>
        emitConcat(
          new Concat('concat101'),
          [ORDERS_ACCESSOR, ARCHIVE_ACCESSOR],
          { inputSchemas, schema: SCHEMA },
        ),
      ).toThrow(
        new Error(`Can't emit concat "concat101": it needs two input schemas`),
      ),
    );
  });

  test("Doesn't emit a Concat whose inputs have different column counts, which validation doesn't let through", () => {
    const emitter = emitterOf(
      concatOf([orders()], [archive(COLUMNS.slice(0, 3))]),
    );
    expect(emitter.canEmit('concat101')).toBe(false);
    expect(() => emitter.emitRelation('concat101')).toThrow(
      new Error(
        `Can't emit node "concat101": it is invalid (Both input schemas must be identical. The first input has 4 columns and the second 3.)`,
      ),
    );
  });

  // types of different families, which no conversion makes match
  test.each<[string, Concat, string]>([
    [
      'when it converts no types',
      new Concat('concat101'),
      `Column "FREIGHT" is Float in the first input and String in the second.`,
    ],
    [
      'when it converts types',
      new Concat('concat101', true),
      `Column "FREIGHT" is Float in the first input and String in the second, which can't be converted to one type.`,
    ],
  ])(
    "Doesn't emit a Concat whose inputs have types of different families, %s",
    (_, concat, message) => {
      const freight = [...COLUMNS.slice(0, 3), column('FREIGHT', 'String')];
      const emitter = emitterOf(
        concatOf([orders()], [archive(freight)], [], concat),
      );
      expect(emitter.canEmit('concat101')).toBe(false);
      expect(() => emitter.emitRelation('concat101')).toThrow(
        new Error(
          `Can't emit node "concat101": it is invalid (Both input schemas must be identical. ${message})`,
        ),
      );
    },
  );

  test("Doesn't emit a Concat whose inputs' types convert when it converts no types", () => {
    const emitter = emitterOf(
      concatOf(
        [orders()],
        [archive([column('ORDER_ID', `${P}SmallInt`), ...COLUMNS.slice(1)])],
      ),
    );
    expect(emitter.canEmit('concat101')).toBe(false);
    expect(() => emitter.emitRelation('concat101')).toThrow(
      new Error(
        `Can't emit node "concat101": it is invalid (Both input schemas must be identical. Column "ORDER_ID" is Integer in the first input and SmallInt in the second.)`,
      ),
    );
  });

  test("Doesn't emit a Concat with an input missing", () => {
    const emitter = emitterOf(
      new Query(
        [orders(), new Concat('concat101')],
        [new Connection('relational101', 'concat101', 'tds1')],
        'concat101',
      ),
    );
    expect(emitter.canEmit('concat101')).toBe(false);
    expect(() => emitter.emitRelation('concat101')).toThrow(
      new Error(
        `Can't emit node "concat101": it is invalid (This node requires more inputs. Please drag and drop another input to associate.)`,
      ),
    );
  });

  test.each<[string, QueryNode[], QueryNode[]]>([
    ['the first', [orders(), byOrderIdDesc('sort101')], [archive()]],
    ['the second', [orders()], [archive(), byOrderIdDesc('sort102')]],
  ])(
    'Writes no sort before the concatenate, though a Sort comes before it on %s input',
    (_, first, second) => {
      expect(print(concatOf(first, second), { withRowOrder: true })).toBe(
        `${ORDERS}->concatenate(${ARCHIVE})`,
      );
    },
  );

  test('Keeps the sort of a Limit inside the first input just before it', () => {
    const query = concatOf(
      [orders(), byOrderIdDesc('sort101'), new Limit('limit101', 5)],
      [archive()],
    );
    expect(print(query, { withRowOrder: true })).toBe(
      `${ORDERS}->sort(~ORDER_ID->descending())->limit(5)->concatenate(${ARCHIVE})`,
    );
    // typing needs no sort
    expect(print(query)).toBe(`${ORDERS}->limit(5)->concatenate(${ARCHIVE})`);
  });

  test('Keeps the sort of a Limit inside the second input just before it', () => {
    const query = concatOf(
      [orders()],
      [archive(), byOrderIdDesc('sort102'), new Limit('limit102', 5)],
    );
    const relation = emitterOf(query).emitRelation('concat101', {
      withRowOrder: true,
    });
    expect(printIR(relation)).toBe(
      `${ORDERS}->concatenate(${ARCHIVE}->sort(~ORDER_ID->descending())->limit(5))`,
    );
    expect(listOrigins(relation)).toEqual([
      'concatenate@concat101:concat',
      `${ORDERS}@relational101:accessor`,
      'limit@limit102:take',
      'sort@limit102:sort',
      `${ARCHIVE}@relational102:accessor`,
      'descending@sort102:sortKey',
      '5@limit102:take',
    ]);
  });

  test('Writes no sort before a Limit after a Concat, the Concat keeping no order', () => {
    expect(
      print(
        concatOf(
          [orders(), byOrderIdDesc('sort101')],
          [archive(), byOrderIdDesc('sort102')],
          [new Limit('limit101', 5)],
        ),
        { withRowOrder: true },
      ),
    ).toBe(`${ORDERS}->concatenate(${ARCHIVE})->limit(5)`);
  });

  test("Sorts a Concat's rows by no order to run it, a Concat keeping none", () => {
    const lambda = emitterOf(
      concatOf(
        [orders(), byOrderIdDesc('sort101')],
        [archive(), byOrderIdDesc('sort102')],
      ),
    ).emitExecutionLambda({ rowLimit: 1000, runtime: RUNTIME });
    expect(printIR(lambda)).toBe(
      `{| ${ORDERS}->concatenate(${ARCHIVE})->limit(1001)->from(${RUNTIME})}`,
    );
    expect(listOrigins(lambda)).toEqual([
      'from@concat101:from',
      'limit@concat101:limit',
      'concatenate@concat101:concat',
      `${ORDERS}@relational101:accessor`,
      `${ARCHIVE}@relational102:accessor`,
      '1001@concat101:limit',
    ]);
  });

  test('Sorts the rows of a Sort after a Concat to run it', () => {
    expect(
      printIR(
        emitterOf(
          concatOf([orders()], [archive()], [byOrderIdDesc('sort101')]),
        ).emitExecutionLambda({ rowLimit: 1000, runtime: RUNTIME }),
      ),
    ).toBe(
      `{| ${ORDERS}->concatenate(${ARCHIVE})->sort(~ORDER_ID->descending())->limit(1001)->from(${RUNTIME})}`,
    );
  });
});

describe(unitTest('Concat emission, converting types'), () => {
  /** A Concat that converts types (Convert types, PLAN §11.5, Q5) */
  const converting = (): Concat => new Concat('concat101', true);

  /** ORDERS and ARCHIVE of these columns, concatenated by a Concat that converts types */
  const convertingOf = (first: SchemaColumn[], second: SchemaColumn[]): Query =>
    concatOf([orders(first)], [archive(second)], [], converting());

  /** COLUMNS, with ORDER_ID a SmallInt */
  const SMALL_ORDER_IDS = [
    column('ORDER_ID', `${P}SmallInt`),
    ...COLUMNS.slice(1),
  ];

  test('Names its temporary columns cube_cast, cube_cast2 and so on', () => {
    expect(CONCAT_CONVERTED_COLUMN_BASE).toBe('cube_cast');
  });

  test("Converts only the input whose types differ from the node's, emitting the other as it is", () => {
    // ORDER_ID is Integer in the node's schema, which ORDERS has
    const query = convertingOf(COLUMNS, SMALL_ORDER_IDS);
    const relation = emitterOf(query).emitRelation('concat101');
    expect(printIR(relation)).toBe(
      `${ORDERS}->concatenate(${ARCHIVE}->extend(~[cube_cast: x | $x.ORDER_ID->cast(@Integer)])->select(~[cube_cast, CUSTOMER_ID, SHIP_COUNTRY, FREIGHT])->rename(~cube_cast, ~ORDER_ID))`,
    );
    expect(listOrigins(relation)).toEqual([
      'concatenate@concat101:concat',
      `${ORDERS}@relational101:accessor`,
      'rename@concat101:rename',
      'select@concat101:select',
      'extend@concat101:convert',
      `${ARCHIVE}@relational102:accessor`,
      'cast@concat101:cast',
      '.ORDER_ID@concat101:convert',
    ]);
    // the first input converted, the second as it is
    expect(print(convertingOf(SMALL_ORDER_IDS, COLUMNS))).toBe(
      `${ORDERS}->extend(~[cube_cast: x | $x.ORDER_ID->cast(@Integer)])->select(~[cube_cast, CUSTOMER_ID, SHIP_COUNTRY, FREIGHT])->rename(~cube_cast, ~ORDER_ID)->concatenate(${ARCHIVE})`,
    );
  });

  test('Converts each input that needs it with its own casts, several columns in one extend', () => {
    // the node's schema: ORDER_ID Integer, SHIP_COUNTRY String, FREIGHT Float
    const query = convertingOf(
      [
        column('ORDER_ID', `${P}SmallInt`),
        column('CUSTOMER_ID', 'String'),
        column('SHIP_COUNTRY', `${P}Varchar`, false, [15]),
        column('FREIGHT', 'Float'),
      ],
      [
        column('ORDER_ID'),
        column('CUSTOMER_ID', 'String'),
        column('SHIP_COUNTRY', `${P}Varchar`, true, [30]),
        column('FREIGHT', `${P}Double`),
      ],
    );
    const relation = emitterOf(query).emitRelation('concat101');
    expect(printIR(relation)).toBe(
      `${ORDERS}->extend(~[cube_cast: x | $x.ORDER_ID->cast(@Integer), cube_cast2: x | $x.SHIP_COUNTRY->cast(@String)])->select(~[cube_cast, CUSTOMER_ID, cube_cast2, FREIGHT])->rename(~cube_cast, ~ORDER_ID)->rename(~cube_cast2, ~SHIP_COUNTRY)` +
        `->concatenate(${ARCHIVE}->extend(~[cube_cast: x | $x.SHIP_COUNTRY->cast(@String), cube_cast2: x | $x.FREIGHT->cast(@Float)])->select(~[ORDER_ID, CUSTOMER_ID, cube_cast, cube_cast2])->rename(~cube_cast, ~SHIP_COUNTRY)->rename(~cube_cast2, ~FREIGHT))`,
    );
    expect(listOrigins(relation)).toEqual([
      'concatenate@concat101:concat',
      'rename@concat101:rename',
      'rename@concat101:rename',
      'select@concat101:select',
      'extend@concat101:convert',
      `${ORDERS}@relational101:accessor`,
      'cast@concat101:cast',
      '.ORDER_ID@concat101:convert',
      'cast@concat101:cast',
      '.SHIP_COUNTRY@concat101:convert',
      'rename@concat101:rename',
      'rename@concat101:rename',
      'select@concat101:select',
      'extend@concat101:convert',
      `${ARCHIVE}@relational102:accessor`,
      'cast@concat101:cast',
      '.SHIP_COUNTRY@concat101:convert',
      'cast@concat101:cast',
      '.FREIGHT@concat101:convert',
    ]);
  });

  /** The input, its column C cast to the type: an input of ORDER_ID and C */
  const castC = (input: string, target: string): string =>
    `${input}->extend(~[cube_cast: x | $x.C->cast(@${target})])->select(~[ORDER_ID, cube_cast])->rename(~cube_cast, ~C)`;

  test.each<[string, SchemaColumn, SchemaColumn, string, string]>([
    [
      'String for two Varchar lengths',
      column('C', `${P}Varchar`, false, [15]),
      column('C', `${P}Varchar`, false, [30]),
      castC(ORDERS, 'String'),
      castC(ARCHIVE, 'String'),
    ],
    [
      'Integer for SmallInt and Int',
      column('C', `${P}SmallInt`),
      column('C', `${P}Int`),
      castC(ORDERS, 'Integer'),
      castC(ARCHIVE, 'Integer'),
    ],
    [
      'Number for Int and Float4',
      column('C', `${P}Int`),
      column('C', `${P}Float4`),
      castC(ORDERS, 'Number'),
      castC(ARCHIVE, 'Number'),
    ],
    [
      'Float for Float4 and Double',
      column('C', `${P}Float4`),
      column('C', `${P}Double`),
      castC(ORDERS, 'Float'),
      castC(ARCHIVE, 'Float'),
    ],
    [
      // Decimal's path is its short name, as Integer's and String's are
      'Decimal for two Numeric precisions',
      column('C', `${P}Numeric`, false, [10, 2]),
      column('C', `${P}Numeric`, false, [12, 4]),
      castC(ORDERS, 'Decimal'),
      castC(ARCHIVE, 'Decimal'),
    ],
    [
      'Date for StrictDate and Timestamp',
      column('C', 'StrictDate'),
      column('C', `${P}Timestamp`),
      castC(ORDERS, 'Date'),
      castC(ARCHIVE, 'Date'),
    ],
    [
      'String for a Varchar and String, only the Varchar cast',
      column('C', `${P}Varchar`, false, [15]),
      column('C', 'String'),
      castC(ORDERS, 'String'),
      ARCHIVE,
    ],
    [
      'Integer for Integer and BigInt, only the BigInt cast',
      column('C', 'Integer'),
      column('C', `${P}BigInt`),
      ORDERS,
      castC(ARCHIVE, 'Integer'),
    ],
    [
      'DateTime for DateTime and Timestamp, only the Timestamp cast',
      column('C', 'DateTime'),
      column('C', `${P}Timestamp`),
      ORDERS,
      castC(ARCHIVE, 'DateTime'),
    ],
  ])(
    'Casts to %s by its path, with no parameters',
    (_, firstColumn, secondColumn, first, second) => {
      expect(
        print(
          convertingOf(
            [column('ORDER_ID'), firstColumn],
            [column('ORDER_ID'), secondColumn],
          ),
        ),
      ).toBe(`${first}->concatenate(${second})`);
    },
  );

  test.each<[string, SchemaColumn, SchemaColumn, string]>([
    [
      'a Varchar length',
      column('C', `${P}Varchar`, false, [15]),
      column('C', `${P}Varchar`, false, [40]),
      `@${P}Varchar(40)`,
    ],
    [
      'a Numeric precision and scale',
      column('C', `${P}Numeric`, false, [10, 2]),
      column('C', `${P}Numeric`, false, [12, 4]),
      `@${P}Numeric(12, 4)`,
    ],
  ])(
    "Keeps the parameters of a precise type in the node's schema: %s",
    (_, firstColumn, secondColumn, target) => {
      // emitted alone, for the schema it is given: inference gives no such
      // schema, a precise type being no other's ancestor
      const schema = new Schema([column('ORDER_ID'), secondColumn]);
      expect(
        printIR(
          emitConcat(converting(), [ORDERS_ACCESSOR, ARCHIVE_ACCESSOR], {
            inputSchemas: [
              new Schema([column('ORDER_ID'), firstColumn]),
              schema,
            ],
            schema,
          }),
        ),
      ).toBe(
        `${ORDERS}->extend(~[cube_cast: x | $x.C->cast(${target})])->select(~[ORDER_ID, cube_cast])->rename(~cube_cast, ~C)->concatenate(${ARCHIVE})`,
      );
    },
  );

  test('Gives a temporary column a name the input has in no case', () => {
    // CUBE_CAST is cube_cast to a database that compares names without case
    expect(
      print(
        convertingOf(
          [column('CUBE_CAST'), column('C', `${P}Varchar`, false, [15])],
          [column('CUBE_CAST'), column('C', `${P}Varchar`, false, [30])],
        ),
      ),
    ).toBe(
      `${ORDERS}->extend(~[cube_cast2: x | $x.C->cast(@String)])->select(~[CUBE_CAST, cube_cast2])->rename(~cube_cast2, ~C)` +
        `->concatenate(${ARCHIVE}->extend(~[cube_cast2: x | $x.C->cast(@String)])->select(~[CUBE_CAST, cube_cast2])->rename(~cube_cast2, ~C))`,
    );
    // a converted column of the base name, and a name taken between two casts
    expect(
      print(
        convertingOf(
          [
            column('cube_cast', `${P}Varchar`, false, [15]),
            column('Cube_Cast2'),
            column('B', `${P}SmallInt`),
          ],
          [
            column('cube_cast', 'String'),
            column('Cube_Cast2'),
            column('B', 'Integer'),
          ],
        ),
      ),
    ).toBe(
      `${ORDERS}->extend(~[cube_cast3: x | $x.cube_cast->cast(@String), cube_cast4: x | $x.B->cast(@Integer)])->select(~[cube_cast3, Cube_Cast2, cube_cast4])->rename(~cube_cast3, ~cube_cast)->rename(~cube_cast4, ~B)->concatenate(${ARCHIVE})`,
    );
  });

  test("Emits an input as it is whose types are the node's, whatever its nullability or its enumeration's values", () => {
    expect(
      print(
        convertingOf(
          [
            column('ORDER_ID'),
            enumColumn('REGION', 'test::Region', ['EMEA', 'APAC']),
            column('CITY', `${P}Varchar`, true, [15]),
          ],
          [
            column('ORDER_ID', 'Integer', true),
            enumColumn('REGION', 'test::Region', ['EMEA']),
            column('CITY', `${P}Varchar`, false, [15]),
          ],
        ),
      ),
    ).toBe(`${ORDERS}->concatenate(${ARCHIVE})`);
  });

  test('Converts an input after its own sort and limit, which keep their place', () => {
    const query = concatOf(
      [orders()],
      [
        archive(SMALL_ORDER_IDS),
        byOrderIdDesc('sort102'),
        new Limit('limit102', 5),
      ],
      [],
      converting(),
    );
    expect(print(query, { withRowOrder: true })).toBe(
      `${ORDERS}->concatenate(${ARCHIVE}->sort(~ORDER_ID->descending())->limit(5)->extend(~[cube_cast: x | $x.ORDER_ID->cast(@Integer)])->select(~[cube_cast, CUSTOMER_ID, SHIP_COUNTRY, FREIGHT])->rename(~cube_cast, ~ORDER_ID))`,
    );
  });

  test('Sorts the rows of a Sort after it by the converted column to run it', () => {
    expect(
      printIR(
        emitterOf(
          concatOf(
            [orders()],
            [archive(SMALL_ORDER_IDS)],
            [byOrderIdDesc('sort101')],
            converting(),
          ),
        ).emitExecutionLambda({ rowLimit: 1000, runtime: RUNTIME }),
      ),
    ).toBe(
      `{| ${ORDERS}->concatenate(${ARCHIVE}->extend(~[cube_cast: x | $x.ORDER_ID->cast(@Integer)])->select(~[cube_cast, CUSTOMER_ID, SHIP_COUNTRY, FREIGHT])->rename(~cube_cast, ~ORDER_ID))->sort(~ORDER_ID->descending())->limit(1001)->from(${RUNTIME})}`,
    );
  });

  test('Gives a Concat after it the converted types, which it needs no cast for', () => {
    const query = new Query(
      [
        orders(SMALL_ORDER_IDS),
        archive(),
        converting(),
        history(),
        new Concat('concat102'),
      ],
      [
        new Connection('relational101', 'concat101', 'tds1'),
        new Connection('relational102', 'concat101', 'tds2'),
        new Connection('concat101', 'concat102', 'tds1'),
        new Connection('relational103', 'concat102', 'tds2'),
      ],
      'concat102',
    );
    expect(print(query)).toBe(
      `${ORDERS}->extend(~[cube_cast: x | $x.ORDER_ID->cast(@Integer)])->select(~[cube_cast, CUSTOMER_ID, SHIP_COUNTRY, FREIGHT])->rename(~cube_cast, ~ORDER_ID)->concatenate(${ARCHIVE})->concatenate(${HISTORY})`,
    );
  });

  test.each<[string, Schema, Schema, string]>([
    [
      'the first input names a column differently',
      new Schema([
        column('ORDER_ID', `${P}SmallInt`),
        column('COUNTRY', `${P}Varchar`, false, [15]),
      ]),
      SCHEMA,
      'Concat "concat101" input 1 has ORDER_ID, COUNTRY, but its schema is ORDER_ID, SHIP_COUNTRY',
    ],
    [
      'the second input has a column fewer',
      SCHEMA,
      new Schema([column('ORDER_ID', `${P}SmallInt`)]),
      'Concat "concat101" input 2 has ORDER_ID, but its schema is ORDER_ID, SHIP_COUNTRY',
    ],
    [
      'the second input names a column in another case',
      SCHEMA,
      new Schema([
        column('order_id', `${P}SmallInt`),
        column('SHIP_COUNTRY', `${P}Varchar`, false, [15]),
      ]),
      'Concat "concat101" input 2 has order_id, SHIP_COUNTRY, but its schema is ORDER_ID, SHIP_COUNTRY',
    ],
  ])(
    "Still refuses to emit inputs whose names don't come out as the node's schema, converting types: %s",
    (_, first, second, message) => {
      expect(() =>
        emitConcat(converting(), [ORDERS_ACCESSOR, ARCHIVE_ACCESSOR], {
          inputSchemas: [first, second],
          schema: SCHEMA,
        }),
      ).toThrow(new Error(message));
    },
  );
});
