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
import { column, resolvedTable } from '../../__test-utils__/CubeTestNodes.js';
import { TEST__registryWithConcat } from '../../__test-utils__/CubeTestRegistry.js';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { Connection } from '../../graph/Connection.js';
import { Query } from '../../graph/Query.js';
import type { QueryNode } from '../../graph/QueryNode.js';
import { Concat } from '../../nodes/transforms/Concat.js';
import { Limit } from '../../nodes/transforms/Limit.js';
import { Restrict } from '../../nodes/transforms/Restrict.js';
import { Sort, SortDirection } from '../../nodes/transforms/Sort.js';
import { Schema, type SchemaColumn } from '../../schema/Schema.js';
import { storeAccessor } from '../CubeIR.js';
import { emitConcat } from '../emitters/ConcatEmitter.js';
import { printIR } from '../IRPrinter.js';
import { QueryEmitter, type RelationOptions } from '../QueryEmitter.js';

const RUNTIME = 'test::Runtime';
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

/** Concat is registered only in M4.10 (PLAN §11.5): until then, the test registry has it */
const emitterOf = (query: Query): QueryEmitter =>
  new QueryEmitter(query, TEST__registryWithConcat());

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
  test("Doesn't emit a Concat whose inputs have different types, whether or not it converts them", () => {
    const freight = [...COLUMNS.slice(0, 3), column('FREIGHT', 'String')];
    [new Concat('concat101'), new Concat('concat101', true)].forEach(
      (concat) => {
        const emitter = emitterOf(
          concatOf([orders()], [archive(freight)], [], concat),
        );
        expect(emitter.canEmit('concat101')).toBe(false);
        expect(() => emitter.emitRelation('concat101')).toThrow(
          new Error(
            `Can't emit node "concat101": it is invalid (Both input schemas must be identical. Column "FREIGHT" is Float in the first input and String in the second.)`,
          ),
        );
      },
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
