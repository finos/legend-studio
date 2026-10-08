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
import { column, resolvedTable } from '../../__test-utils__/CubeTestNodes.js';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { Connection } from '../../graph/Connection.js';
import { Query } from '../../graph/Query.js';
import type { QueryNode } from '../../graph/QueryNode.js';
import { Distinct } from '../../nodes/transforms/Distinct.js';
import { Drop } from '../../nodes/transforms/Drop.js';
import { Filter } from '../../nodes/transforms/Filter.js';
import { Join } from '../../nodes/transforms/Join.js';
import { Limit } from '../../nodes/transforms/Limit.js';
import { Rename } from '../../nodes/transforms/Rename.js';
import { Restrict } from '../../nodes/transforms/Restrict.js';
import { Slice } from '../../nodes/transforms/Slice.js';
import { Sort, SortDirection } from '../../nodes/transforms/Sort.js';
import { UnknownNode } from '../../nodes/UnknownNode.js';
import { computeRowOrders, type OrderKey } from '../RowOrder.js';

const { ASC, DESC } = SortDirection;

const orders = (id = 'relational101'): QueryNode =>
  resolvedTable(id, 'ORDERS', [
    column('ORDER_ID'),
    column('CUSTOMER_ID', 'String'),
    column('SHIP_COUNTRY', 'String'),
  ]);

/** The nodes in a chain, the last selected */
const chain = (...nodes: QueryNode[]): Query =>
  new Query(
    nodes,
    nodes
      .slice(1)
      .map(
        (node, index) =>
          new Connection(
            (nodes[index] as QueryNode).id,
            node.id,
            node.ports[0] as string,
          ),
      ),
    nodes.at(-1)?.id,
  );

/** A Sort by SHIP_COUNTRY descending, then ORDER_ID ascending */
const byCountryThenId = (id = 'sort101'): Sort =>
  new Sort(id, [
    { column: 'SHIP_COUNTRY', direction: DESC },
    { column: 'ORDER_ID', direction: ASC },
  ]);

const key = (
  name: string,
  direction: SortDirection,
  sortId = 'sort101',
  keyIndex = 0,
): OrderKey => ({ column: name, direction, sortId, keyIndex });

const COUNTRY_THEN_ID = [
  key('SHIP_COUNTRY', DESC, 'sort101', 0),
  key('ORDER_ID', ASC, 'sort101', 1),
];

const orderOf = (query: Query, nodeId: string): OrderKey[] | undefined => {
  const order = computeRowOrders(query).get(nodeId);
  return order && [...order];
};

describe(unitTest('Row order'), () => {
  test('Gives a source no order, and every node of the query an entry', () => {
    const query = chain(orders(), new Filter('filter101'));
    const rowOrders = computeRowOrders(query);
    expect([...rowOrders.keys()].sort()).toEqual([
      'filter101',
      'relational101',
    ]);
    expect(rowOrders.get('relational101')).toEqual([]);
    expect(rowOrders.get('filter101')).toEqual([]);
  });

  test("Gives a Sort's keys, stamped with the Sort and their places", () => {
    expect(orderOf(chain(orders(), byCountryThenId()), 'sort101')).toEqual(
      COUNTRY_THEN_ID,
    );
  });

  test.each<[string, QueryNode]>([
    ['a Filter', new Filter('next101')],
    ['a Distinct', new Distinct('next101')],
    ['a Limit', new Limit('next101', 5)],
    ['a Drop', new Drop('next101', 5)],
    ['a Slice', new Slice('next101', 0, 5)],
    [
      'a Restrict that keeps the keys',
      new Restrict('next101', ['ORDER_ID', 'SHIP_COUNTRY']),
    ],
  ])('Keeps the order through %s', (_, node) => {
    expect(
      orderOf(chain(orders(), byCountryThenId(), node), 'next101'),
    ).toEqual(COUNTRY_THEN_ID);
  });

  test('Has only Limit, Drop and Slice take rows by their order', () => {
    expect(
      [
        orders(),
        byCountryThenId(),
        new Filter('filter101'),
        new Distinct('distinct101'),
        new Restrict('restrict101'),
        new Rename('rename101'),
        new Limit('limit101', 5),
        new Drop('drop101', 5),
        new Slice('slice101', 0, 5),
        new Join('join101'),
        new UnknownNode('pivot101', 1),
      ]
        .filter((node) => node.consumesInputOrder)
        .map(({ type }) => type),
    ).toEqual(['limit', 'drop', 'slice']);
  });

  test('Keeps the keys before the first one on a column a Restrict drops', () => {
    // SHIP_COUNTRY kept, ORDER_ID dropped: still in order by country
    expect(
      orderOf(
        chain(
          orders(),
          byCountryThenId(),
          new Restrict('restrict101', ['SHIP_COUNTRY']),
        ),
        'restrict101',
      ),
    ).toEqual([key('SHIP_COUNTRY', DESC, 'sort101', 0)]);
    // SHIP_COUNTRY dropped: ORDER_ID is in order only within a country, so no order
    expect(
      orderOf(
        chain(
          orders(),
          byCountryThenId(),
          new Restrict('restrict101', ['ORDER_ID']),
        ),
        'restrict101',
      ),
    ).toEqual([]);
  });

  test('Renames the keys on renamed columns, and keeps the Sort that declared them', () => {
    expect(
      orderOf(
        chain(
          orders(),
          byCountryThenId(),
          new Rename('rename101', [
            { from: 'ORDER_ID', to: 'Order Id' },
            { from: 'CUSTOMER_ID', to: 'Customer' },
          ]),
        ),
        'rename101',
      ),
    ).toEqual([
      key('SHIP_COUNTRY', DESC, 'sort101', 0),
      key('Order Id', ASC, 'sort101', 1),
    ]);
  });

  test("Puts a later Sort's keys first, then the earlier Sort's keys on other columns", () => {
    expect(
      orderOf(
        chain(
          orders(),
          byCountryThenId(),
          new Sort('sort102', [
            { column: 'ORDER_ID', direction: DESC },
            { column: 'CUSTOMER_ID', direction: ASC },
          ]),
        ),
        'sort102',
      ),
    ).toEqual([
      key('ORDER_ID', DESC, 'sort102', 0),
      key('CUSTOMER_ID', ASC, 'sort102', 1),
      key('SHIP_COUNTRY', DESC, 'sort101', 0),
    ]);
  });

  test('Gives a Join no order, even with both inputs sorted', () => {
    const query = new Query(
      [
        orders('relational101'),
        byCountryThenId('sort101'),
        orders('relational102'),
        byCountryThenId('sort102'),
        new Join('join101'),
      ],
      [
        new Connection('relational101', 'sort101', 'tds'),
        new Connection('relational102', 'sort102', 'tds'),
        new Connection('sort101', 'join101', 'leftTds'),
        new Connection('sort102', 'join101', 'rightTds'),
      ],
      'join101',
    );
    expect(orderOf(query, 'join101')).toEqual([]);
  });

  test('Leaves the order unknown at an Unknown node and after it, until a Sort', () => {
    const query = chain(
      orders(),
      byCountryThenId(),
      new UnknownNode('pivot101', 1),
      new Limit('limit101', 5),
      new Sort('sort102', [{ column: 'ORDER_ID', direction: DESC }]),
    );
    expect(orderOf(query, 'pivot101')).toBeUndefined();
    expect(orderOf(query, 'limit101')).toBeUndefined();
    expect(orderOf(query, 'sort102')).toEqual([
      key('ORDER_ID', DESC, 'sort102', 0),
    ]);
  });

  test('Leaves the order unknown after a missing input', () => {
    const query = new Query(
      [orders(), new Limit('limit101', 5)],
      [],
      'limit101',
    );
    expect(orderOf(query, 'limit101')).toBeUndefined();
  });

  test("Passes its input's order on as it is, not a copy", () => {
    const query = chain(orders(), byCountryThenId(), new Limit('limit101', 5));
    const rowOrders = computeRowOrders(query);
    expect(rowOrders.get('limit101') === rowOrders.get('sort101')).toBe(true);
  });
});
