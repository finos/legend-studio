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
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { column, TestUnaryNode } from '../../__test-utils__/CubeTestNodes.js';
import { FilterOperator } from '../../filter/FilterOperator.js';
import {
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
} from '../../filter/FilterTree.js';
import { Connection } from '../../graph/Connection.js';
import { Query } from '../../graph/Query.js';
import { createNodeRegistry } from '../../nodes/NodeRegistry.js';
import { RelationalTableSource } from '../../nodes/sources/RelationalTableSource.js';
import { Filter } from '../../nodes/transforms/Filter.js';
import { Join, JoinType } from '../../nodes/transforms/Join.js';
import { UnknownNode } from '../../nodes/UnknownNode.js';
import { Schema, type SchemaColumn } from '../../schema/Schema.js';
import { EmitRole, type IR, type Origin } from '../CubeIR.js';
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

/** Every IR node that can carry an origin, with it */
const withOrigins = (ir: IR): { k: string; origin: Origin | undefined }[] => {
  const found: { k: string; origin: Origin | undefined }[] = [];
  const visit = (node: IR | undefined): void => {
    if (!node) {
      return;
    }
    switch (node.k) {
      case 'func':
        found.push({ k: node.k, origin: node.origin });
        node.params.forEach(visit);
        return;
      case 'property':
        found.push({ k: node.k, origin: node.origin });
        visit(node.receiver);
        return;
      case 'literal':
      case 'storeAccessor':
        found.push({ k: node.k, origin: node.origin });
        return;
      case 'lambda':
        node.body.forEach(visit);
        return;
      case 'collection':
        node.values.forEach(visit);
        return;
      case 'colSpec':
        visit(node.fn1);
        visit(node.fn2);
        return;
      case 'colSpecArray':
        node.specs.forEach(visit);
        return;
      default:
        return;
    }
  };
  visit(ir);
  return found;
};

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

  test('Marks every IR node it can with the query node and part it is for', () => {
    const lambda = new QueryEmitter(slice()).emitExecutionLambda({
      rowLimit: 1000,
      runtime: RUNTIME,
    });
    const nodes = withOrigins(lambda);
    // from, limit and its literal; filter, two ands, three comparisons, three
    // columns and four values; select, join, rename, the key comparison and
    // its two keys; the two accessors
    expect(nodes).toHaveLength(24);
    const roles = new Set<string>(Object.values(EmitRole));
    nodes.forEach(({ origin }) => {
      expect(origin).toBeDefined();
      expect(roles.has(origin?.role ?? '')).toBe(true);
      expect(origin?.role).not.toContain(':');
    });
    const originsOf = (k: string): string[] =>
      nodes
        .filter((node) => node.k === k)
        .map(({ origin }) => `${origin?.nodeId}:${origin?.role}`);
    expect(originsOf('storeAccessor')).toEqual([
      'relational101:accessor',
      'relational102:accessor',
    ]);
    expect(new Set(originsOf('func'))).toEqual(
      new Set([
        'filter101:from',
        'filter101:limit',
        'filter101:filter',
        'filter101:predicate',
        'join101:select',
        'join101:join',
        'join101:rename',
        'join101:condition',
      ]),
    );
    expect(new Set(originsOf('property'))).toEqual(
      new Set(['join101:key', 'filter101:column']),
    );
    expect(new Set(originsOf('literal'))).toEqual(
      new Set(['filter101:value', 'filter101:limit']),
    );
  });

  test('Marks the merge of a FULL join, its toOne() and its cast', () => {
    const query = new Query(
      [
        table('relational101', 'ORDERS', ORDERS),
        table('relational102', 'CUSTOMERS', [
          varchar('CUSTOMER_ID', 40),
          varchar('COMPANY_NAME', 40),
        ]),
        new Join('join101', {
          leftColumns: ['CUSTOMER_ID'],
          rightColumns: ['CUSTOMER_ID'],
          joinType: JoinType.FULL_OUTER,
        }),
      ],
      [
        new Connection('relational101', 'join101', 'leftTds'),
        new Connection('relational102', 'join101', 'rightTds'),
      ],
      'join101',
    );
    const nodes = withOrigins(new QueryEmitter(query).emitRelation('join101'));
    const roles = new Set(nodes.map(({ origin }) => origin?.role));
    [
      EmitRole.RENAME,
      EmitRole.JOIN,
      EmitRole.CONDITION,
      EmitRole.KEY,
      EmitRole.TO_ONE,
      EmitRole.MERGE,
      EmitRole.MERGE_KEY,
      EmitRole.COALESCE,
      EmitRole.CAST,
      EmitRole.SELECT,
    ].forEach((role) => expect(roles.has(role)).toBe(true));
    nodes
      .filter(({ origin }) => origin?.role !== EmitRole.ACCESSOR)
      .forEach(({ origin }) => expect(origin?.nodeId).toBe('join101'));
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
