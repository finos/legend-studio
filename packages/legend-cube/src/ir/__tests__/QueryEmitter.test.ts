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
  listOrigins,
  stripOrigins,
} from '../../__test-utils__/CubeIRTestUtils.js';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import {
  column,
  TestBinaryNode,
  TestUnaryNode,
  testSpecCodec,
} from '../../__test-utils__/CubeTestNodes.js';
import { FilterOperator } from '../../filter/FilterOperator.js';
import {
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
  type FilterRule,
  NotFilter,
} from '../../filter/FilterTree.js';
import { Connection } from '../../graph/Connection.js';
import { Query } from '../../graph/Query.js';
import type { QueryNode } from '../../graph/QueryNode.js';
import { buildSchemasAndValidity } from '../../inference/SchemaInference.js';
import {
  createNodeRegistry,
  FILTER_DEFINITION,
  JOIN_DEFINITION,
  NodeRegistry,
  RELATIONAL_TABLE_SOURCE_DEFINITION,
  type TransformDefinition,
} from '../../nodes/NodeRegistry.js';
import { RelationalTableSource } from '../../nodes/sources/RelationalTableSource.js';
import { Filter } from '../../nodes/transforms/Filter.js';
import { Join, JoinType } from '../../nodes/transforms/Join.js';
import { UnknownNode } from '../../nodes/UnknownNode.js';
import { Schema, type SchemaColumn } from '../../schema/Schema.js';
import {
  EmitRole,
  elementPtr,
  func,
  type IR,
  type RelationExpr,
} from '../CubeIR.js';
import type { EmitContext } from '../EmitContext.js';
import { printIR } from '../IRPrinter.js';
import { QueryEmitter } from '../QueryEmitter.js';

const P = 'meta::pure::precisePrimitives::';
const DATABASE = 'showcase::northwind::store::NorthwindDatabase';
const RUNTIME = 'showcase::northwind::mapping::StoreRuntime';

const varchar = (name: string, length: number, nullable = true): SchemaColumn =>
  column(name, `${P}Varchar`, nullable, [length]);
const smallInt = (name: string, nullable = true): SchemaColumn =>
  column(name, `${P}SmallInt`, nullable);
const date = (name: string): SchemaColumn => column(name, 'StrictDate', true);

// Northwind, as the engine types it (PLAN §8.5)
const ORDERS = [
  smallInt('ORDER_ID', false),
  varchar('CUSTOMER_ID', 5),
  smallInt('EMPLOYEE_ID'),
  date('ORDER_DATE'),
  date('REQUIRED_DATE'),
  date('SHIPPED_DATE'),
  smallInt('SHIP_VIA'),
  column('FREIGHT', 'String', true),
  varchar('SHIP_NAME', 40),
  varchar('SHIP_ADDRESS', 60),
  varchar('SHIP_CITY', 15),
  varchar('SHIP_REGION', 15),
  varchar('SHIP_POSTAL_CODE', 10),
  varchar('SHIP_COUNTRY', 15),
];
const CUSTOMERS = [
  varchar('CUSTOMER_ID', 5, false),
  varchar('COMPANY_NAME', 40, false),
  varchar('CONTACT_NAME', 30),
  varchar('CONTACT_TITLE', 30),
  varchar('ADDRESS', 60),
  varchar('CITY', 15),
  varchar('REGION', 15),
  varchar('POSTAL_CODE', 10),
  varchar('COUNTRY', 15),
  varchar('PHONE', 24),
  varchar('FAX', 24),
];

const table = (
  id: string,
  name: string,
  columns: SchemaColumn[],
): RelationalTableSource =>
  new RelationalTableSource(
    id,
    { database: DATABASE, schema: 'NORTHWIND', table: name },
    { kind: 'resolved', schema: new Schema(columns) },
  );

const SLICE_FILTER = new CompositeFilter(CompositeFilterOperator.AND, [
  new ColumnComparisonFilter('SHIP_COUNTRY', FilterOperator.EQUAL, {
    kind: 'string',
    value: 'France',
  }),
  new ColumnComparisonFilter(
    'ORDER_DATE',
    FilterOperator.GREATER_THAN_OR_EQUAL,
    {
      kind: 'strictDate',
      value: '1997-01-01',
    },
  ),
  new ColumnComparisonFilter('EMPLOYEE_ID', FilterOperator.IN, [
    { kind: 'integer', value: '1' },
    { kind: 'integer', value: '4' },
  ]),
]);

/** The slice: ORDERS ⋈ CUSTOMERS on CUSTOMER_ID, then the France filter */
const slice = (): Query =>
  new Query(
    [
      table('relational101', 'ORDERS', ORDERS),
      table('relational102', 'CUSTOMERS', CUSTOMERS),
      new Join('join101', {
        leftColumns: ['CUSTOMER_ID'],
        rightColumns: ['CUSTOMER_ID'],
        joinType: JoinType.INNER,
      }),
      new Filter('filter101', SLICE_FILTER),
    ],
    [
      new Connection('relational101', 'join101', 'leftTds'),
      new Connection('relational102', 'join101', 'rightTds'),
      new Connection('join101', 'filter101', 'tds'),
    ],
    'filter101',
  );

const ORDERS_TEXT = `#>{${DATABASE}.NORTHWIND.ORDERS}#`;
const CUSTOMERS_TEXT = `#>{${DATABASE}.NORTHWIND.CUSTOMERS}#`;
const JOIN_TEXT = `${ORDERS_TEXT}->join(${CUSTOMERS_TEXT}->rename(~CUSTOMER_ID, ~CUSTOMER_ID__cube_r), meta::pure::functions::relation::JoinKind.INNER, {l, r | $l.CUSTOMER_ID == $r.CUSTOMER_ID__cube_r})->select(~[CUSTOMER_ID, ORDER_ID, EMPLOYEE_ID, ORDER_DATE, REQUIRED_DATE, SHIPPED_DATE, SHIP_VIA, FREIGHT, SHIP_NAME, SHIP_ADDRESS, SHIP_CITY, SHIP_REGION, SHIP_POSTAL_CODE, SHIP_COUNTRY, COMPANY_NAME, CONTACT_NAME, CONTACT_TITLE, ADDRESS, CITY, REGION, POSTAL_CODE, COUNTRY, PHONE, FAX])`;
const FILTER_TEXT = `->filter({row | (($row.SHIP_COUNTRY == 'France') && ($row.ORDER_DATE >= %1997-01-01)) && $row.EMPLOYEE_ID->in([1, 4])})`;

/**
 * Every IR node that can carry an origin has one, and the origins are not
 * part of the printed text
 */
const expectFullyMarked = (ir: IR): void => {
  expect(listOrigins(ir).filter((entry) => entry.endsWith('@-'))).toEqual([]);
  const stripped = stripOrigins(ir);
  expect(listOrigins(stripped).every((entry) => entry.endsWith('@-'))).toBe(
    true,
  );
  expect(printIR(stripped)).toBe(printIR(ir));
};

/**
 * ORDERS ⟗ a CUSTOMERS-like table on two same-named keys: CUSTOMER_ID,
 * nullable on both sides with different types (so `toOne()` and a cast), and
 * SHIP_COUNTRY, of the same type and NOT NULL on the right (so neither);
 * with a filter, when given, on the join
 */
const fullJoin = (filter?: FilterRule): Query => {
  const nodes = [
    table('relational101', 'ORDERS', ORDERS),
    table('relational102', 'CUSTOMERS', [
      varchar('CUSTOMER_ID', 40),
      varchar('SHIP_COUNTRY', 15, false),
      varchar('COMPANY_NAME', 40),
    ]),
    new Join('join101', {
      leftColumns: ['CUSTOMER_ID', 'SHIP_COUNTRY'],
      rightColumns: ['CUSTOMER_ID', 'SHIP_COUNTRY'],
      joinType: JoinType.FULL_OUTER,
    }),
  ];
  const connections = [
    new Connection('relational101', 'join101', 'leftTds'),
    new Connection('relational102', 'join101', 'rightTds'),
  ];
  return filter
    ? new Query(
        [...nodes, new Filter('filter101', filter)],
        [...connections, new Connection('join101', 'filter101', 'tds')],
        'filter101',
      )
    : new Query(nodes, connections, 'join101');
};

const FULL_JOIN_TEXT = `${ORDERS_TEXT}->rename(~CUSTOMER_ID, ~CUSTOMER_ID__cube_l)->rename(~SHIP_COUNTRY, ~SHIP_COUNTRY__cube_l)->join(${CUSTOMERS_TEXT}->rename(~CUSTOMER_ID, ~CUSTOMER_ID__cube_r)->rename(~SHIP_COUNTRY, ~SHIP_COUNTRY__cube_r), meta::pure::functions::relation::JoinKind.FULL, {l, r | ($l.CUSTOMER_ID__cube_l->toOne() == $r.CUSTOMER_ID__cube_r) && ($l.SHIP_COUNTRY__cube_l == $r.SHIP_COUNTRY__cube_r)})->extend(~[CUSTOMER_ID: x | $x.CUSTOMER_ID__cube_l->coalesce($x.CUSTOMER_ID__cube_r)->cast(@String), SHIP_COUNTRY: x | $x.SHIP_COUNTRY__cube_l->coalesce($x.SHIP_COUNTRY__cube_r)])->select(~[CUSTOMER_ID, SHIP_COUNTRY, ORDER_ID, EMPLOYEE_ID, ORDER_DATE, REQUIRED_DATE, SHIPPED_DATE, SHIP_VIA, FREIGHT, SHIP_NAME, SHIP_ADDRESS, SHIP_CITY, SHIP_REGION, SHIP_POSTAL_CODE, COMPANY_NAME])`;

/** The origins of `fullJoin()`'s join, in tree order */
const FULL_JOIN_ORIGINS = [
  'select@join101:select',
  'extend@join101:merge',
  'join@join101:join',
  // the renames nest, so the last key's comes first
  'rename@join101:rename',
  'rename@join101:rename',
  `${ORDERS_TEXT}@relational101:accessor`,
  'rename@join101:rename',
  'rename@join101:rename',
  `${CUSTOMERS_TEXT}@relational102:accessor`,
  'meta::pure::functions::relation::JoinKind.FULL@join101:join',
  'and@join101:condition',
  'equal@join101:condition',
  'toOne@join101:toOne',
  '.CUSTOMER_ID__cube_l@join101:key',
  '.CUSTOMER_ID__cube_r@join101:key',
  'equal@join101:condition',
  '.SHIP_COUNTRY__cube_l@join101:key',
  '.SHIP_COUNTRY__cube_r@join101:key',
  'cast@join101:cast',
  'coalesce@join101:coalesce',
  '.CUSTOMER_ID__cube_l@join101:mergeKey',
  '.CUSTOMER_ID__cube_r@join101:mergeKey',
  'coalesce@join101:coalesce',
  '.SHIP_COUNTRY__cube_l@join101:mergeKey',
  '.SHIP_COUNTRY__cube_r@join101:mergeKey',
];

/** What a probe emitter was called with */
interface EmitCall {
  readonly node: QueryNode;
  readonly inputs: readonly RelationExpr[];
  readonly context: EmitContext;
}

/** A transform definition whose emitter records its calls and emits `<input>->probe(<other inputs>)` */
const probeDefinition = <N extends QueryNode>(
  type: string,
  create: (id: string) => N,
  calls: EmitCall[],
): TransformDefinition<N> => ({
  kind: 'transform',
  type,
  label: type,
  icon: 'probe',
  beta: false,
  create,
  emit: (node, inputs, context) => {
    calls.push({ node, inputs, context });
    return func('probe', [...inputs]);
  },
  spec: testSpecCodec(create),
});

describe(unitTest('Query emission'), () => {
  test('Emits the slice query, verified on the engine (19 rows)', () => {
    const emitter = new QueryEmitter(slice());
    // this exact text parsed, typed and returned the 19 expected orders on
    // the engine (PLAN §8.5), with the shared Northwind model
    expect(
      printIR(
        emitter.emitExecutionLambda({ rowLimit: 1000, runtime: RUNTIME }),
      ),
    ).toBe(`{| ${JOIN_TEXT}${FILTER_TEXT}->limit(1001)->from(${RUNTIME})}`);
  });

  test('Emits any valid node as a relation, and as a typing lambda', () => {
    const emitter = new QueryEmitter(slice());
    expect(printIR(emitter.emitRelation('relational101'))).toBe(ORDERS_TEXT);
    expect(printIR(emitter.emitRelation('join101'))).toBe(JOIN_TEXT);
    expect(printIR(emitter.emitTypingLambda('join101'))).toBe(
      `{| ${JOIN_TEXT}}`,
    );
    expect(printIR(emitter.emitTypingLambda('filter101'))).toBe(
      `{| ${JOIN_TEXT}${FILTER_TEXT}}`,
    );
  });

  test('Runs up to the selected node only', () => {
    const query = slice().select('join101');
    expect(
      printIR(
        new QueryEmitter(query).emitExecutionLambda({
          rowLimit: 5,
          runtime: RUNTIME,
        }),
      ),
    ).toBe(`{| ${JOIN_TEXT}->limit(6)->from(${RUNTIME})}`);
  });

  test('Fetches one row more than the limit, without losing digits', () => {
    const emit = (rowLimit: number): string =>
      printIR(
        new QueryEmitter(slice()).emitExecutionLambda({
          rowLimit,
          runtime: RUNTIME,
        }),
      );
    expect(emit(1)).toContain('->limit(2)->');
    expect(emit(Number.MAX_SAFE_INTEGER)).toContain(
      '->limit(9007199254740992)->',
    );
  });

  test('Wraps the capture node in an integer limit and a from() on the runtime element', () => {
    const emitter = new QueryEmitter(slice());
    const wrapped = (value: string): IR => ({
      k: 'lambda',
      params: [],
      body: [
        {
          k: 'func',
          name: 'from',
          params: [
            {
              k: 'func',
              name: 'limit',
              params: [
                emitter.emitRelation('filter101'),
                {
                  k: 'literal',
                  value: { kind: 'integer', value },
                  origin: { nodeId: 'filter101', role: 'limit' },
                },
              ],
              origin: { nodeId: 'filter101', role: 'limit' },
            },
            // the runtime carries no origin
            { k: 'elementPtr', path: RUNTIME },
          ],
          origin: { nodeId: 'filter101', role: 'from' },
        },
      ],
    });
    expect(
      emitter.emitExecutionLambda({ rowLimit: 1000, runtime: RUNTIME }),
    ).toStrictEqual(wrapped('1001'));
    expect(
      emitter.emitExecutionLambda({
        rowLimit: Number.MAX_SAFE_INTEGER,
        runtime: RUNTIME,
      }),
    ).toStrictEqual(wrapped('9007199254740992'));
  });

  test('Emits a source with its coordinates as stored, quotes included', () => {
    const query = new Query(
      [
        new RelationalTableSource(
          'relational101',
          { database: 'a::Db', schema: '"My.Schema"', table: '"a.b"' },
          { kind: 'resolved', schema: new Schema(ORDERS) },
        ),
      ],
      [],
      'relational101',
    );
    expect(new QueryEmitter(query).emitRelation('relational101')).toStrictEqual(
      {
        k: 'storeAccessor',
        path: ['a::Db', '"My.Schema"', '"a.b"'],
        origin: { nodeId: 'relational101', role: 'accessor' },
      },
    );
  });

  test("Emits each node with its type's emitter from the registry", () => {
    const registry = new NodeRegistry([
      {
        ...RELATIONAL_TABLE_SOURCE_DEFINITION,
        emit: () => elementPtr('probe::Source'),
      },
      FILTER_DEFINITION,
      JOIN_DEFINITION,
    ]);
    const query = new Query(
      [
        table('relational101', 'ORDERS', ORDERS),
        new Filter(
          'filter101',
          new ColumnComparisonFilter('SHIP_COUNTRY', FilterOperator.EQUAL, {
            kind: 'string',
            value: 'France',
          }),
        ),
      ],
      [new Connection('relational101', 'filter101', 'tds')],
      'filter101',
    );
    const emitter = new QueryEmitter(query, registry);
    expect(emitter.emitRelation('relational101')).toStrictEqual(
      elementPtr('probe::Source'),
    );
    expect(printIR(emitter.emitRelation('filter101'))).toBe(
      `probe::Source->filter({row | $row.SHIP_COUNTRY == 'France'})`,
    );
  });

  test('Gives an emitter its inputs in port order, and the schemas inference gave', () => {
    const calls: EmitCall[] = [];
    const registry = createNodeRegistry();
    registry.register(
      probeDefinition(TestUnaryNode.TYPE, (id) => new TestUnaryNode(id), calls),
    );
    registry.register(
      probeDefinition(
        TestBinaryNode.TYPE,
        (id) => new TestBinaryNode(id),
        calls,
      ),
    );
    // ORDERS through the unary node on the left, CUSTOMERS on the right; the
    // right connection is listed first, so only the port order puts it last
    const query = new Query(
      [
        table('relational101', 'ORDERS', ORDERS),
        table('relational102', 'CUSTOMERS', CUSTOMERS),
        new TestUnaryNode('test101'),
        new TestBinaryNode('test102'),
      ],
      [
        new Connection('relational102', 'test102', 'tds2'),
        new Connection('test101', 'test102', 'tds1'),
        new Connection('relational101', 'test101', 'tds'),
      ],
      'test102',
    );
    expect(
      printIR(new QueryEmitter(query, registry).emitRelation('test102')),
    ).toBe(`${ORDERS_TEXT}->probe()->probe(${CUSTOMERS_TEXT})`);

    // each emitter is called once, after the emitters of its inputs
    expect(calls.map(({ node }) => node.id)).toEqual(['test101', 'test102']);
    const [unary, binary] = calls;
    expect(unary?.node).toBe(query.getNode('test101'));
    expect(binary?.node).toBe(query.getNode('test102'));
    const sources = new QueryEmitter(query);
    expect(unary?.inputs).toEqual([sources.emitRelation('relational101')]);
    expect(binary?.inputs).toEqual([
      func('probe', [sources.emitRelation('relational101')]),
      sources.emitRelation('relational102'),
    ]);

    const { schemas } = buildSchemasAndValidity(query, registry.queryRules);
    expect(unary?.context).toEqual({
      inputSchemas: [schemas.get('relational101')],
      schema: schemas.get('test101'),
    });
    expect(binary?.context).toEqual({
      inputSchemas: [schemas.get('test101'), schemas.get('relational102')],
      schema: schemas.get('test102'),
    });
    // ORDERS' columns, then those of CUSTOMERS that ORDERS doesn't have
    expect(binary?.context.schema.names()).toEqual([
      ...ORDERS.map(({ name }) => name),
      ...CUSTOMERS.map(({ name }) => name).filter(
        (name) => name !== 'CUSTOMER_ID',
      ),
    ]);
  });

  test('Needs a whole row limit of at least 1, a runtime and a selected node', () => {
    const emitter = new QueryEmitter(slice());
    [0, -1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1].forEach((rowLimit) =>
      expect(() =>
        emitter.emitExecutionLambda({ rowLimit, runtime: RUNTIME }),
      ).toThrow(
        `The row limit must be a whole number of at least 1, but got ${rowLimit}`,
      ),
    );
    expect(() =>
      emitter.emitExecutionLambda({ rowLimit: 10, runtime: '' }),
    ).toThrow('A query needs a runtime to run');
    expect(() =>
      new QueryEmitter(new Query()).emitExecutionLambda({
        rowLimit: 10,
        runtime: RUNTIME,
      }),
    ).toThrow("An empty query can't run");
  });

  test('Refuses invalid nodes and the nodes after them', () => {
    // a filter on a column that is not there
    const broken = slice().replace(
      new Filter(
        'filter101',
        new ColumnComparisonFilter('NOPE', FilterOperator.IS_EMPTY),
      ),
    );
    const emitter = new QueryEmitter(broken);
    expect(emitter.canEmit('join101')).toBe(true);
    expect(emitter.canEmit('filter101')).toBe(false);
    expect(() => emitter.emitRelation('filter101')).toThrow(
      `Can't emit node "filter101": it is invalid (Filter column "NOPE" is not present in the input schema.)`,
    );
    expect(() =>
      emitter.emitExecutionLambda({ rowLimit: 10, runtime: RUNTIME }),
    ).toThrow(`Can't emit node "filter101"`);
    // an incomplete join, and what follows it
    const incomplete = new QueryEmitter(slice().remove('relational102'));
    expect(incomplete.canEmit('join101')).toBe(false);
    expect(incomplete.canEmit('filter101')).toBe(false);
    expect(() => incomplete.emitRelation('filter101')).toThrow(
      `Can't emit node "filter101": it is invalid (This node depends on some invalid inputs. Please correct these first.)`,
    );
    expect(new QueryEmitter(slice()).canEmit('missing')).toBe(false);
    expect(() => new QueryEmitter(slice()).emitRelation('missing')).toThrow(
      `Can't emit node "missing": it is not in the query`,
    );
  });

  test('Refuses Unknown nodes and node types it has no emitter for', () => {
    const unknown = new Query(
      [
        table('relational101', 'ORDERS', ORDERS),
        new UnknownNode('pivot101', 1),
      ],
      [new Connection('relational101', 'pivot101', 'in0')],
      'pivot101',
    );
    expect(new QueryEmitter(unknown).canEmit('pivot101')).toBe(false);
    expect(() => new QueryEmitter(unknown).emitRelation('pivot101')).toThrow(
      `Can't emit node "pivot101": it is invalid`,
    );
    // a valid node of a type the registry doesn't have
    const stranger = new Query(
      [table('relational101', 'ORDERS', ORDERS), new TestUnaryNode('test101')],
      [new Connection('relational101', 'test101', 'tds')],
      'test101',
    );
    const emitter = new QueryEmitter(stranger);
    expect(emitter.canEmit('relational101')).toBe(true);
    expect(emitter.canEmit('test101')).toBe(false);
    expect(() => emitter.emitRelation('test101')).toThrow(
      `Can't emit node "test101": its type "testUnary" is unknown`,
    );
  });

  test('Refuses a node when a node upstream of it has no emitter', () => {
    // a valid node of an unregistered type between the source and a filter
    const query = new Query(
      [
        table('relational101', 'ORDERS', ORDERS),
        new TestUnaryNode('test101'),
        new Filter(
          'filter101',
          new ColumnComparisonFilter('SHIP_COUNTRY', FilterOperator.EQUAL, {
            kind: 'string',
            value: 'France',
          }),
        ),
      ],
      [
        new Connection('relational101', 'test101', 'tds'),
        new Connection('test101', 'filter101', 'tds'),
      ],
      'filter101',
    );
    const emitter = new QueryEmitter(query);
    expect(emitter.canEmit('filter101')).toBe(false);
    expect(() => emitter.emitRelation('filter101')).toThrow(
      `Can't emit node "test101": its type "testUnary" is unknown`,
    );
    expect(() =>
      emitter.emitExecutionLambda({ rowLimit: 10, runtime: RUNTIME }),
    ).toThrow(`Can't emit node "test101": its type "testUnary" is unknown`);

    // a registry without the relational source
    const sourceless = new QueryEmitter(
      new Query(
        [
          table('relational101', 'ORDERS', ORDERS),
          new Filter(
            'filter101',
            new ColumnComparisonFilter('SHIP_COUNTRY', FilterOperator.IS_EMPTY),
          ),
        ],
        [new Connection('relational101', 'filter101', 'tds')],
        'filter101',
      ),
      new NodeRegistry([FILTER_DEFINITION, JOIN_DEFINITION]),
    );
    expect(sourceless.canEmit('filter101')).toBe(false);
    expect(() => sourceless.emitRelation('filter101')).toThrow(
      `Can't emit node "relational101": its type "relational" is unknown`,
    );
    expect(() =>
      sourceless.emitExecutionLambda({ rowLimit: 10, runtime: RUNTIME }),
    ).toThrow(
      `Can't emit node "relational101": its type "relational" is unknown`,
    );
  });

  test("Reports a node's own reason first, then its inputs' in port order", () => {
    // neither the source nor the test type is registered: the node nearest
    // the one emitted is reported
    const chain = new Query(
      [
        table('relational101', 'ORDERS', ORDERS),
        new TestUnaryNode('test101'),
        new Filter(
          'filter101',
          new ColumnComparisonFilter('SHIP_COUNTRY', FilterOperator.IS_EMPTY),
        ),
      ],
      [
        new Connection('relational101', 'test101', 'tds'),
        new Connection('test101', 'filter101', 'tds'),
      ],
      'filter101',
    );
    expect(() =>
      new QueryEmitter(
        chain,
        new NodeRegistry([FILTER_DEFINITION]),
      ).emitRelation('filter101'),
    ).toThrow(`Can't emit node "test101": its type "testUnary" is unknown`);

    // both inputs of a join can't be emitted: the left one is reported, though
    // the right connection is listed first
    const join = new Query(
      [
        table('relational101', 'ORDERS', ORDERS),
        table('relational102', 'CUSTOMERS', CUSTOMERS),
        new Join('join101', {
          leftColumns: ['CUSTOMER_ID'],
          rightColumns: ['CUSTOMER_ID'],
          joinType: JoinType.INNER,
        }),
      ],
      [
        new Connection('relational102', 'join101', 'rightTds'),
        new Connection('relational101', 'join101', 'leftTds'),
      ],
      'join101',
    );
    expect(() =>
      new QueryEmitter(join, new NodeRegistry([JOIN_DEFINITION])).emitRelation(
        'join101',
      ),
    ).toThrow(
      `Can't emit node "relational101": its type "relational" is unknown`,
    );
  });

  test("Applies the registry's query rules, as the canvas does", () => {
    const query = new Query(
      [
        table('relational101', 'ORDERS', ORDERS),
        new RelationalTableSource(
          'relational102',
          { database: 'other::Db', schema: 'NORTHWIND', table: 'CUSTOMERS' },
          { kind: 'resolved', schema: new Schema(CUSTOMERS) },
        ),
      ],
      [],
      'relational102',
    );
    expect(new QueryEmitter(query).canEmit('relational102')).toBe(false);
    expect(
      new QueryEmitter(query, createNodeRegistry()).canEmit('relational101'),
    ).toBe(true);
  });

  test('Names each part of a node with a distinct role, without a colon', () => {
    const roles = Object.values(EmitRole);
    expect(roles).toEqual([
      'accessor',
      'rename',
      'join',
      'condition',
      'key',
      'toOne',
      'merge',
      'mergeKey',
      'coalesce',
      'cast',
      'select',
      'filter',
      'predicate',
      'column',
      'value',
      'take',
      'drop',
      'slice',
      'distinct',
      'group',
      'aggregation',
      'window',
      'concat',
      'difference',
      'convert',
      'sort',
      'sortKey',
      'rowNumber',
      'rowRange',
      'captureSort',
      'limit',
      'from',
      'let',
      'extend',
      'expression',
    ]);
    expect(new Set(roles).size).toBe(roles.length);
    roles.forEach((role) => expect(role).not.toContain(':'));
  });

  test('Marks every IR node it can with the query node and part it is for', () => {
    const lambda = new QueryEmitter(slice()).emitExecutionLambda({
      rowLimit: 1000,
      runtime: RUNTIME,
    });
    expect(listOrigins(lambda)).toEqual([
      'from@filter101:from',
      'limit@filter101:limit',
      'filter@filter101:filter',
      'select@join101:select',
      'join@join101:join',
      `${ORDERS_TEXT}@relational101:accessor`,
      'rename@join101:rename',
      `${CUSTOMERS_TEXT}@relational102:accessor`,
      'meta::pure::functions::relation::JoinKind.INNER@join101:join',
      'equal@join101:condition',
      '.CUSTOMER_ID@join101:key',
      '.CUSTOMER_ID__cube_r@join101:key',
      'and@filter101:predicate',
      'and@filter101:predicate',
      'equal@filter101:predicate',
      '.SHIP_COUNTRY@filter101:column',
      "'France'@filter101:value",
      'greaterThanEqual@filter101:predicate',
      '.ORDER_DATE@filter101:column',
      '%1997-01-01@filter101:value',
      'in@filter101:predicate',
      '.EMPLOYEE_ID@filter101:column',
      '1@filter101:value',
      '4@filter101:value',
      '1001@filter101:limit',
    ]);
    expectFullyMarked(lambda);
  });

  test('Marks the merges of a FULL join, its toOne() and its cast', () => {
    const relation = new QueryEmitter(fullJoin()).emitRelation('join101');
    expect(printIR(relation)).toBe(FULL_JOIN_TEXT);
    expect(listOrigins(relation)).toEqual(FULL_JOIN_ORIGINS);
    expectFullyMarked(relation);
    const lambda = new QueryEmitter(fullJoin()).emitTypingLambda('join101');
    expect(listOrigins(lambda)).toEqual(FULL_JOIN_ORIGINS);
    expectFullyMarked(lambda);
  });

  test('Marks a Not pushed down to the leaves, and the NULL guard a FULL join needs', () => {
    // ORDER_ID is NOT NULL in ORDERS, and nullable after the FULL join
    const lambda = new QueryEmitter(
      fullJoin(
        new NotFilter(
          new CompositeFilter(CompositeFilterOperator.AND, [
            new ColumnComparisonFilter('ORDER_ID', FilterOperator.IS_EMPTY),
            new ColumnComparisonFilter(
              'ORDER_ID',
              FilterOperator.GREATER_THAN,
              { kind: 'integer', value: '10500' },
            ),
          ]),
        ),
      ),
    ).emitExecutionLambda({ rowLimit: 10, runtime: RUNTIME });
    expect(printIR(lambda)).toBe(
      `{| ${FULL_JOIN_TEXT}->filter({row | (!($row.ORDER_ID->isEmpty())) || ($row.ORDER_ID->isEmpty() || (!($row.ORDER_ID > 10500)))})->limit(11)->from(${RUNTIME})}`,
    );
    expect(listOrigins(lambda)).toEqual([
      'from@filter101:from',
      'limit@filter101:limit',
      'filter@filter101:filter',
      ...FULL_JOIN_ORIGINS,
      // Not(And(a, b)) is Or(Not a, Not b)
      'or@filter101:predicate',
      // IsNotEmpty, never guarded
      'not@filter101:predicate',
      'isEmpty@filter101:predicate',
      '.ORDER_ID@filter101:column',
      // Not(>) on a nullable column: the guard, then the negation
      'or@filter101:predicate',
      'isEmpty@filter101:predicate',
      '.ORDER_ID@filter101:column',
      'not@filter101:predicate',
      'greaterThan@filter101:predicate',
      '.ORDER_ID@filter101:column',
      '10500@filter101:value',
      '11@filter101:limit',
    ]);
    expectFullyMarked(lambda);
  });

  test('Keeps NULL rows in negations of the columns a join makes nullable', () => {
    // ORDER_ID and COMPANY_NAME are NOT NULL in their tables; the key
    // CUSTOMER_ID is nullable in ORDERS and NOT NULL in CUSTOMERS
    const filter = new CompositeFilter(CompositeFilterOperator.AND, [
      new ColumnComparisonFilter('ORDER_ID', FilterOperator.NOT_EQUAL, {
        kind: 'integer',
        value: '10500',
      }),
      new ColumnComparisonFilter(
        'COMPANY_NAME',
        FilterOperator.DOES_NOT_CONTAIN,
        { kind: 'string', value: 'a' },
      ),
      new ColumnComparisonFilter(
        'CUSTOMER_ID',
        FilterOperator.DOES_NOT_START_WITH,
        { kind: 'string', value: 'W' },
      ),
    ]);
    const emitFilterText = (joinType: JoinType): string =>
      printIR(
        new QueryEmitter(
          new Query(
            [
              table('relational101', 'ORDERS', ORDERS),
              table('relational102', 'CUSTOMERS', CUSTOMERS),
              new Join('join101', {
                leftColumns: ['CUSTOMER_ID'],
                rightColumns: ['CUSTOMER_ID'],
                joinType,
              }),
              new Filter('filter101', filter),
            ],
            [
              new Connection('relational101', 'join101', 'leftTds'),
              new Connection('relational102', 'join101', 'rightTds'),
              new Connection('join101', 'filter101', 'tds'),
            ],
            'filter101',
          ),
        ).emitRelation('filter101'),
      );
    const negation = (
      columnName: string,
      positive: string,
      guarded: boolean,
    ): string =>
      guarded
        ? `$row.${columnName}->isEmpty() || (!(${positive}))`
        : `!(${positive})`;
    const expected = (
      orderId: boolean,
      companyName: boolean,
      customerId: boolean,
    ): string =>
      `->filter({row | ((${negation('ORDER_ID', '$row.ORDER_ID == 10500', orderId)}) && (${negation('COMPANY_NAME', "$row.COMPANY_NAME->contains('a')", companyName)})) && (${negation('CUSTOMER_ID', "$row.CUSTOMER_ID->startsWith('W')", customerId)})})`;
    // INNER keeps each side's nullability, and the key is the left one
    expect(emitFilterText(JoinType.INNER)).toContain(
      expected(false, false, true),
    );
    // LEFT makes the right side nullable
    expect(emitFilterText(JoinType.LEFT_OUTER)).toContain(
      expected(false, true, true),
    );
    // RIGHT makes the left side nullable, and the key is the right one
    expect(emitFilterText(JoinType.RIGHT_OUTER)).toContain(
      expected(true, false, false),
    );
    // FULL makes both sides nullable, and the merged key, since one key is
    expect(emitFilterText(JoinType.FULL_OUTER)).toContain(
      expected(true, true, true),
    );
  });

  test('Emits the same IR every time, without changing the query', () => {
    const query = slice();
    const before = query.nodes.map((node) => node.key);
    const first = new QueryEmitter(query).emitExecutionLambda({
      rowLimit: 10,
      runtime: RUNTIME,
    });
    const second = new QueryEmitter(query.clone()).emitExecutionLambda({
      rowLimit: 10,
      runtime: RUNTIME,
    });
    expect(second).toEqual(first);
    expect(query.nodes.map((node) => node.key)).toEqual(before);
    expect((query.getNode('filter101') as Filter).filter).toBe(SLICE_FILTER);
  });
});
