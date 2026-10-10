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
import { createNodeRegistry } from '../../nodes/NodeRegistry.js';
import { TEST__registryWithPartition } from '../../__test-utils__/CubeTestRegistry.js';
import { unitTest } from '../../__test-utils__/CubeTestUtils.js';
import { Connection } from '../../graph/Connection.js';
import { Query } from '../../graph/Query.js';
import type { QueryNode } from '../../graph/QueryNode.js';
import { AggregationFunction } from '../../nodes/transforms/Aggregation.js';
import { Concat } from '../../nodes/transforms/Concat.js';
import { Distinct } from '../../nodes/transforms/Distinct.js';
import { Drop } from '../../nodes/transforms/Drop.js';
import { Filter } from '../../nodes/transforms/Filter.js';
import { Group } from '../../nodes/transforms/Group.js';
import { Join } from '../../nodes/transforms/Join.js';
import { Limit } from '../../nodes/transforms/Limit.js';
import { Partition } from '../../nodes/transforms/Partition.js';
import { Rename } from '../../nodes/transforms/Rename.js';
import { Restrict } from '../../nodes/transforms/Restrict.js';
import { Slice } from '../../nodes/transforms/Slice.js';
import { Sort, SortDirection } from '../../nodes/transforms/Sort.js';
import { UnknownNode } from '../../nodes/UnknownNode.js';
import { buildSchemasAndValidity } from '../SchemaInference.js';
import {
  computeRowOrders,
  findLostSortOrders,
  type OrderKey,
  type SortOrderLoss,
} from '../RowOrder.js';

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
        new Concat('concat101'),
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

  test('Gives a Concat no order, even with both inputs sorted the same way', () => {
    const query = new Query(
      [
        orders('relational101'),
        byCountryThenId('sort101'),
        orders('relational102'),
        byCountryThenId('sort102'),
        new Concat('concat101'),
      ],
      [
        new Connection('relational101', 'sort101', 'tds'),
        new Connection('relational102', 'sort102', 'tds'),
        new Connection('sort101', 'concat101', 'tds1'),
        new Connection('sort102', 'concat101', 'tds2'),
      ],
      'concat101',
    );
    expect(orderOf(query, 'sort101')).toEqual(COUNTRY_THEN_ID);
    expect(orderOf(query, 'concat101')).toEqual([]);
  });

  test('Gives a Group no order, even with its input sorted', () => {
    const query = chain(
      orders(),
      byCountryThenId(),
      new Group(
        'group101',
        ['SHIP_COUNTRY', 'ORDER_ID'],
        [
          {
            column: undefined,
            function: AggregationFunction.COUNT_ROWS,
            name: 'Count Rows',
          },
        ],
      ),
    );
    expect(orderOf(query, 'sort101')).toEqual(COUNTRY_THEN_ID);
    expect(orderOf(query, 'group101')).toEqual([]);
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

  test("Keeps the order through a Partition, as it is: its window's sort orders no rows", () => {
    const query = chain(
      orders(),
      byCountryThenId(),
      new Partition(
        'partition101',
        ['CUSTOMER_ID'],
        [{ column: 'ORDER_ID', direction: DESC }],
        [
          {
            column: 'ORDER_ID',
            function: AggregationFunction.SUM,
            name: 'ORDER_ID Sum',
          },
        ],
      ),
    );
    const rowOrders = computeRowOrders(query);
    expect(orderOf(query, 'partition101')).toEqual(COUNTRY_THEN_ID);
    expect(rowOrders.get('partition101') === rowOrders.get('sort101')).toBe(
      true,
    );
  });
});

/** Sort101 by A then B, ascending, on a table with A, B and C */
const ABC = (id = 'relational101'): QueryNode =>
  resolvedTable(id, 'T', [column('A'), column('B'), column('C')]);
const byAThenB = (id = 'sort101'): Sort =>
  new Sort(id, [
    { column: 'A', direction: ASC },
    { column: 'B', direction: ASC },
  ]);
const byA = (id: string, direction = ASC): Sort =>
  new Sort(id, [{ column: 'A', direction }]);

/** The losses, a lost key told removed or cut by the inferred schemas */
const lossesOf = (query: Query): Record<string, SortOrderLoss> =>
  Object.fromEntries(
    findLostSortOrders(
      query,
      undefined,
      buildSchemasAndValidity(query).schemas,
    ),
  );

/** A partial loss: the first node that loses keys, the removals by node, and the cut columns */
const partial = (
  nodeId: string,
  removals: [string, string[]][],
  cutColumns: string[] = [],
): SortOrderLoss => ({
  nodeId,
  removals: removals.map(([id, columns]) => ({ nodeId: id, columns })),
  cutColumns,
});

/** Sort101 by A, B, then C, ascending */
const byABC = (): Sort =>
  new Sort('sort101', [
    { column: 'A', direction: ASC },
    { column: 'B', direction: ASC },
    { column: 'C', direction: ASC },
  ]);

/** A join of two chains, each given with what feeds it, on A */
const joined = (left: QueryNode[], right: QueryNode[]): Query => {
  const connect = (nodes: QueryNode[]): Connection[] =>
    nodes
      .slice(1)
      .map(
        (node, index) =>
          new Connection((nodes[index] as QueryNode).id, node.id, 'tds'),
      );
  return new Query(
    [
      ...left,
      ...right,
      new Join('join101', { leftColumns: ['A'], rightColumns: ['A'] }),
    ],
    [
      ...connect(left),
      ...connect(right),
      new Connection((left.at(-1) as QueryNode).id, 'join101', 'leftTds'),
      new Connection((right.at(-1) as QueryNode).id, 'join101', 'rightTds'),
    ],
    'join101',
  );
};

/** A concat of two chains, each given with what feeds it: the first on tds1, the second on tds2 */
const concatenated = (first: QueryNode[], second: QueryNode[]): Query => {
  const connect = (nodes: QueryNode[]): Connection[] =>
    nodes
      .slice(1)
      .map(
        (node, index) =>
          new Connection((nodes[index] as QueryNode).id, node.id, 'tds'),
      );
  return new Query(
    [...first, ...second, new Concat('concat101')],
    [
      ...connect(first),
      ...connect(second),
      new Connection((first.at(-1) as QueryNode).id, 'concat101', 'tds1'),
      new Connection((second.at(-1) as QueryNode).id, 'concat101', 'tds2'),
    ],
    'concat101',
  );
};

/** The Concat's errors, with the query rules of the registry that has Concat */
const concatErrorsOf = (query: Query): readonly string[] | undefined =>
  buildSchemasAndValidity(query, createNodeRegistry().queryRules).validity.get(
    'concat101',
  );

/** Group101 by A, counting rows: valid on any input with A */
const groupByA = (): Group =>
  new Group(
    'group101',
    ['A'],
    [
      {
        column: undefined,
        function: AggregationFunction.COUNT_ROWS,
        name: 'Count Rows',
      },
    ],
  );

/** A node's errors, with the query rules of the registry that has Group */
const errorsOf = (
  query: Query,
  nodeId: string,
): readonly string[] | undefined =>
  buildSchemasAndValidity(query, createNodeRegistry().queryRules).validity.get(
    nodeId,
  );

/**
 * Partition101 by C, a running Sum of A in its window's order, B descending:
 * valid on any input with A, B and C
 */
const windowByC = (): Partition =>
  new Partition(
    'partition101',
    ['C'],
    [{ column: 'B', direction: DESC }],
    [{ column: 'A', function: AggregationFunction.SUM, name: 'A Sum' }],
  );

/** The Partition's errors, with the query rules of the registry that has Partition */
const partitionErrorsOf = (query: Query): readonly string[] | undefined =>
  buildSchemasAndValidity(
    query,
    TEST__registryWithPartition().queryRules,
  ).validity.get('partition101');

describe(unitTest('Lost sort orders'), () => {
  test.each<[string, QueryNode[]]>([
    ['a Sort at the end of its chain', []],
    ['a Filter after it', [new Filter('filter101')]],
    ['a Distinct after it', [new Distinct('distinct101')]],
    [
      'a Restrict that keeps its keys',
      [new Restrict('restrict101', ['B', 'A'])],
    ],
    ['a Rename of a key', [new Rename('rename101', [{ from: 'A', to: 'X' }])]],
    ['a Limit after it', [new Limit('limit101', 5)]],
    ['a Drop after it', [new Drop('drop101', 5)]],
    ['a Slice after it', [new Slice('slice101', 0, 5)]],
    [
      'a Limit that takes rows by it before a Restrict drops its keys',
      [new Limit('limit101', 5), new Restrict('restrict101', ['C'])],
    ],
    [
      'a Drop that takes rows by it before a Restrict drops its keys',
      [new Drop('drop101', 5), new Restrict('restrict101', ['C'])],
    ],
    [
      'a Slice that takes rows by it before a Restrict drops its keys',
      [new Slice('slice101', 0, 5), new Restrict('restrict101', ['C'])],
    ],
    [
      'a later Sort on one of its two columns, then a Filter',
      [byA('sort102', DESC), new Filter('filter101')],
    ],
    [
      'a later Sort on another column, which it orders the ties of',
      [new Sort('sort102', [{ column: 'C', direction: DESC }])],
    ],
    ['a later Sort on one of its two columns', [byA('sort102', DESC)]],
    ['an Unknown node after it', [new UnknownNode('pivot101', 1)]],
  ])('Reports nothing for %s', (_, after) => {
    expect(lossesOf(chain(ABC(), byAThenB(), ...after))).toEqual({});
  });

  test("Reports nothing for a Limit after a Sort, whatever a Join does to the Limit's rows", () => {
    expect(
      lossesOf(
        joined(
          [ABC(), byAThenB(), new Limit('limit101', 5)],
          [ABC('relational102')],
        ),
      ),
    ).toEqual({});
  });

  test('Names the Join that loses the order, on either side', () => {
    expect(
      lossesOf(
        joined([ABC(), byAThenB()], [ABC('relational102'), byA('sort102')]),
      ),
    ).toEqual({
      sort101: { nodeId: 'join101' },
      sort102: { nodeId: 'join101' },
    });
  });

  test.each<[string, QueryNode[], QueryNode[]]>([
    ['its first input (tds1)', [ABC(), byAThenB()], [ABC('relational102')]],
    [
      'its second input (tds2)',
      [ABC()],
      [ABC('relational102'), byAThenB('sort101')],
    ],
  ])(
    'Names a Concat after a Sort on %s as losing the order',
    (_, first, second) => {
      const query = concatenated(first, second);
      expect(concatErrorsOf(query)).toEqual([]);
      expect(lossesOf(query)).toEqual({ sort101: { nodeId: 'concat101' } });
    },
  );

  test('Names the Concat for a Sort on each of its inputs', () => {
    const query = concatenated(
      [ABC(), byAThenB()],
      [ABC('relational102'), byA('sort102')],
    );
    expect(concatErrorsOf(query)).toEqual([]);
    expect(lossesOf(query)).toEqual({
      sort101: { nodeId: 'concat101' },
      sort102: { nodeId: 'concat101' },
    });
  });

  test.each<[string, QueryNode[], QueryNode[]]>([
    [
      'its first input (tds1)',
      [ABC(), byAThenB(), new Limit('limit101', 5)],
      [ABC('relational102')],
    ],
    [
      'its second input (tds2)',
      [ABC()],
      [ABC('relational102'), byAThenB('sort101'), new Limit('limit101', 5)],
    ],
  ])(
    "Reports nothing for a Sort that a Limit in %s takes rows by, the Limit's input keeping its order",
    (_, first, second) => {
      const query = concatenated(first, second);
      expect(concatErrorsOf(query)).toEqual([]);
      expect(lossesOf(query)).toEqual({});
      // the order the emitter writes as a sort just before the Limit
      expect(orderOf(query, 'limit101')).toEqual([
        key('A', ASC, 'sort101', 0),
        key('B', ASC, 'sort101', 1),
      ]);
      expect(orderOf(query, 'concat101')).toEqual([]);
    },
  );

  test('Reports nothing for a Sort after a Concat, which orders the output', () => {
    const concat = concatenated([ABC()], [ABC('relational102')]);
    const query = new Query(
      [...concat.nodes, byA('sort101', DESC)],
      [...concat.connections, new Connection('concat101', 'sort101', 'tds')],
      'sort101',
    );
    expect(concatErrorsOf(query)).toEqual([]);
    expect(lossesOf(query)).toEqual({});
    expect(orderOf(query, 'sort101')).toEqual([key('A', DESC, 'sort101', 0)]);
  });

  test('Names a later Sort on all the same columns, whose order replaces it', () => {
    expect(
      lossesOf(chain(ABC(), byA('sort101'), byA('sort102', DESC))),
    ).toEqual({ sort101: { nodeId: 'sort102' } });
  });

  test.each<[string, QueryNode[]]>([
    ['at the end of the chain', []],
    ['before a Limit', [new Limit('limit101', 5)]],
  ])(
    'Names a Restrict that drops some of its columns, and those columns, %s',
    (_, after) => {
      expect(
        lossesOf(
          chain(
            ABC(),
            byAThenB(),
            new Restrict('restrict101', ['A', 'C']),
            ...after,
          ),
        ),
      ).toEqual({
        sort101: partial('restrict101', [['restrict101', ['B']]]),
      });
    },
  );

  test.each<[string, string[]]>([
    ['kept in order', ['A', 'C']],
    ['picked the other way', ['C', 'A']],
  ])(
    'Says a Restrict removes only the column it removes, and that a later key it keeps no longer orders the rows (%s)',
    (_, kept) => {
      for (const after of [[], [new Limit('limit101', 5)]]) {
        expect(
          lossesOf(
            chain(ABC(), byABC(), new Restrict('restrict101', kept), ...after),
          ),
        ).toEqual({
          sort101: partial('restrict101', [['restrict101', ['B']]], ['C']),
        });
      }
    },
  );

  test('Names each Restrict with the columns it removes', () => {
    expect(
      lossesOf(
        chain(
          ABC(),
          byABC(),
          new Restrict('restrict101', ['A', 'B']),
          new Restrict('restrict102', ['A']),
        ),
      ),
    ).toEqual({
      sort101: partial('restrict101', [
        ['restrict101', ['C']],
        ['restrict102', ['B']],
      ]),
    });
  });

  test("Tells a renamed key's removal from its cut by its name where it reaches the Restrict", () => {
    // B is X when it reaches the Restrict, which removes it and keeps C
    expect(
      lossesOf(
        chain(
          ABC(),
          byABC(),
          new Rename('rename101', [{ from: 'B', to: 'X' }]),
          new Restrict('restrict101', ['A', 'C']),
        ),
      ),
    ).toEqual({
      sort101: partial('restrict101', [['restrict101', ['B']]], ['C']),
    });
  });

  test('Judges a renamed key the Restrict keeps by its new name: cut, not removed', () => {
    // C is Z when it reaches the Restrict, which keeps it after removing B
    expect(
      lossesOf(
        chain(
          ABC(),
          byABC(),
          new Rename('rename101', [{ from: 'C', to: 'Z' }]),
          new Restrict('restrict101', ['A', 'Z']),
        ),
      ),
    ).toEqual({
      sort101: partial('restrict101', [['restrict101', ['B']]], ['C']),
    });
  });

  test('Counts every lost key as removed without the schemas', () => {
    expect(
      Object.fromEntries(
        findLostSortOrders(
          chain(ABC(), byABC(), new Restrict('restrict101', ['A', 'C'])),
        ),
      ),
    ).toEqual({
      sort101: partial('restrict101', [['restrict101', ['B', 'C']]]),
    });
  });

  test('Names a Restrict that drops every key as losing the order', () => {
    expect(
      lossesOf(chain(ABC(), byAThenB(), new Restrict('restrict101', ['C']))),
    ).toEqual({ sort101: { nodeId: 'restrict101' } });
    // the first key dropped: the second no longer orders anything
    expect(
      lossesOf(chain(ABC(), byAThenB(), new Restrict('restrict101', ['B']))),
    ).toEqual({ sort101: { nodeId: 'restrict101' } });
  });

  test('Names the node that loses the rest of the order after a Restrict dropped some', () => {
    expect(
      lossesOf(
        joined(
          [ABC(), byAThenB(), new Restrict('restrict101', ['A', 'C'])],
          [ABC('relational102')],
        ),
      ),
    ).toEqual({ sort101: { nodeId: 'join101' } });
  });

  test.each<[string, QueryNode[]]>([
    ['at the end of the chain', []],
    ['before a Limit', [new Limit('limit101', 5)]],
  ])('Names a Group after it as losing the order, %s', (_, after) => {
    const query = chain(ABC(), byAThenB(), groupByA(), ...after);
    expect(errorsOf(query, 'group101')).toEqual([]);
    expect(lossesOf(query)).toEqual({ sort101: { nodeId: 'group101' } });
  });

  test("Names a Group after a Restrict that dropped some of the keys: the Group's full loss, not the Restrict's partial one", () => {
    const restricted = [
      ABC(),
      byAThenB(),
      new Restrict('restrict101', ['A', 'C']),
    ];
    expect(lossesOf(chain(...restricted))).toEqual({
      sort101: partial('restrict101', [['restrict101', ['B']]]),
    });
    const query = chain(...restricted, groupByA());
    expect(errorsOf(query, 'group101')).toEqual([]);
    expect(lossesOf(query)).toEqual({ sort101: { nodeId: 'group101' } });
  });

  test('Names the columns as the Sort names them, in its order, through a Rename', () => {
    const sort = new Sort('sort101', [
      { column: 'C', direction: ASC },
      { column: 'B', direction: DESC },
      { column: 'A', direction: ASC },
    ]);
    // C is kept; A and B are renamed and then dropped
    expect(
      lossesOf(
        chain(
          ABC(),
          sort,
          new Rename('rename101', [
            { from: 'A', to: 'X' },
            { from: 'B', to: 'Y' },
          ]),
          new Restrict('restrict101', ['C']),
        ),
      ),
    ).toEqual({
      sort101: partial('restrict101', [['restrict101', ['B', 'A']]]),
    });
  });

  test('Reports nothing for a Sort without a named key, whose own error shows', () => {
    expect(
      lossesOf(
        chain(
          ABC(),
          new Sort('sort101', [{ column: '', direction: ASC }]),
          new Restrict('restrict101', ['C']),
        ),
      ),
    ).toEqual({});
  });

  test('Reads the structure only: the selection plays no part', () => {
    const query = chain(ABC(), byAThenB(), new Restrict('restrict101', ['A']));
    expect(lossesOf(query.select('sort101'))).toEqual(lossesOf(query));
    expect(lossesOf(query.select('relational101'))).toEqual(lossesOf(query));
  });

  test.each<[string, QueryNode[]]>([
    ['as the capture', []],
    ['with the capture after it', [new Distinct('distinct101')]],
  ])(
    "Reports nothing for a Sort before a Partition %s, which keeps the Sort's order",
    (_, after) => {
      const query = chain(ABC(), byAThenB(), windowByC(), ...after);
      expect(partitionErrorsOf(query)).toEqual([]);
      expect(orderOf(query, 'partition101')).toEqual([
        key('A', ASC, 'sort101', 0),
        key('B', ASC, 'sort101', 1),
      ]);
      expect(lossesOf(query)).toEqual({});
    },
  );

  test("Gives a Limit after a Partition the Sort's order before the Partition, and reports nothing", () => {
    const query = chain(
      ABC(),
      byAThenB(),
      windowByC(),
      new Limit('limit101', 5),
    );
    expect(partitionErrorsOf(query)).toEqual([]);
    // the Limit's input order, which the emitter writes as a sort just before it
    expect(orderOf(query, 'partition101')).toEqual([
      key('A', ASC, 'sort101', 0),
      key('B', ASC, 'sort101', 1),
    ]);
    expect(orderOf(query, 'limit101')).toEqual([
      key('A', ASC, 'sort101', 0),
      key('B', ASC, 'sort101', 1),
    ]);
    expect(lossesOf(query)).toEqual({});
  });

  test("Names a Restrict after a Partition that drops the Sort's keys: the order got through the window", () => {
    const query = chain(
      ABC(),
      byAThenB(),
      windowByC(),
      new Restrict('restrict101', ['C', 'A Sum']),
    );
    expect(partitionErrorsOf(query)).toEqual([]);
    expect(lossesOf(query)).toEqual({ sort101: { nodeId: 'restrict101' } });
  });
});
