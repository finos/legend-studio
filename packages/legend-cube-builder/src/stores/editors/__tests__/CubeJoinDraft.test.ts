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
  AggregationFunction,
  buildSchemasAndValidity,
  Concat,
  Connection,
  Difference,
  Group,
  Join,
  JoinType,
  MESSAGE_INPUT_SCHEMAS_DIFFER,
  Partition,
  PRIMITIVE_TYPE_PATH,
  PrimitiveType,
  type QueryNode,
  Query,
  RelationalTableSource,
  Rename,
  Restrict,
  Schema,
  SchemaColumn,
  SortDirection,
  WindowRankFunction,
  WindowRowFunction,
} from '@finos/legend-cube';
import {
  CUSTOMERS_COLUMNS,
  NORTHWIND_DATABASE,
  northwindTable,
  ORDERS_COLUMNS,
  sliceQuery,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import { FAKE_NORTHWIND_OUTLINE } from '../../../__test-utils__/FakeCubeEngine.js';
import {
  type CubeModelOutline,
  CubeTableFlag,
} from '../../../graph-manager/CubeEngine.js';
import {
  CubeJoinDraft,
  findColumnOrigins,
  findColumnSources,
  isUntypedColumn,
} from '../CubeJoinDraft.js';

const join = (): Join =>
  new Join('join101', {
    leftColumns: ['CUSTOMER_ID'],
    rightColumns: ['CUSTOMER_ID'],
    joinType: JoinType.INNER,
  });

describe('Join draft', () => {
  test('Builds the original join until something changes', () => {
    const original = join();
    const draft = new CubeJoinDraft(original);
    expect(draft.joinType).toBe(JoinType.INNER);
    expect(draft.pairs.map(({ left, right }) => [left, right])).toEqual([
      ['CUSTOMER_ID', 'CUSTOMER_ID'],
    ]);
    expect(draft.build()).toBe(original);
  });

  test('Builds a join of the same id with the edited type and key pairs', () => {
    const original = join();
    const draft = new CubeJoinDraft(original);
    draft.setJoinType(JoinType.FULL_OUTER);
    draft.addPair();
    const [, added] = draft.pairs;
    draft.setLeftColumn(added?.key ?? 0, 'SHIP_CITY');
    draft.setRightColumn(added?.key ?? 0, 'CITY');
    const built = draft.build();
    expect(built.id).toBe('join101');
    expect(built.key).not.toBe(original.key);
    expect(built.joinType).toBe(JoinType.FULL_OUTER);
    expect(built.leftColumns).toEqual(['CUSTOMER_ID', 'SHIP_CITY']);
    expect(built.rightColumns).toEqual(['CUSTOMER_ID', 'CITY']);
    // the original is left as it was
    expect(original.leftColumns).toEqual(['CUSTOMER_ID']);
  });

  test('Leaves out a pair with no column picked, and builds the original when only such pairs were added', () => {
    const original = join();
    const draft = new CubeJoinDraft(original);
    draft.addPair();
    draft.addPair();
    expect(draft.pairs).toHaveLength(3);
    expect(draft.build()).toBe(original);
    // a half-picked pair stays, to be reported
    draft.setLeftColumn(draft.pairs[1]?.key ?? 0, 'SHIP_CITY');
    expect(draft.build().leftColumns).toEqual(['CUSTOMER_ID', 'SHIP_CITY']);
    expect(draft.build().rightColumns).toEqual(['CUSTOMER_ID', '']);
  });

  test('Builds the original when the edits are undone by hand', () => {
    const original = join();
    const draft = new CubeJoinDraft(original);
    draft.setJoinType(JoinType.LEFT_OUTER);
    draft.setJoinType(JoinType.INNER);
    const [pair] = draft.pairs;
    draft.removePair(pair?.key ?? 0);
    expect(draft.build().leftColumns).toEqual([]);
    draft.addPair();
    const [added] = draft.pairs;
    draft.setLeftColumn(added?.key ?? 0, 'CUSTOMER_ID');
    draft.setRightColumn(added?.key ?? 0, 'CUSTOMER_ID');
    expect(draft.build()).toBe(original);
  });

  test('Builds the original when edits to a join saved with uneven or blank keys are undone by hand', () => {
    const uneven = new Join('join101', {
      leftColumns: ['A', 'B'],
      rightColumns: ['A'],
      joinType: JoinType.INNER,
    });
    const draft = new CubeJoinDraft(uneven);
    draft.setJoinType(JoinType.LEFT_OUTER);
    draft.setJoinType(JoinType.INNER);
    expect(draft.build()).toBe(uneven);
    const blankPair = new Join('join101', {
      leftColumns: ['A', ''],
      rightColumns: ['A', ''],
      joinType: JoinType.INNER,
    });
    const blankDraft = new CubeJoinDraft(blankPair);
    blankDraft.setJoinType(JoinType.LEFT_OUTER);
    blankDraft.setJoinType(JoinType.INNER);
    // a real edit drops the blank pair, but nothing was edited
    expect(blankDraft.build()).toBe(blankPair);
    blankDraft.setJoinType(JoinType.FULL_OUTER);
    expect(blankDraft.build().leftColumns).toEqual(['A']);
  });

  test('Pairs uneven saved key lists by position, the missing side blank', () => {
    const original = new Join('join101', {
      leftColumns: ['A', 'B'],
      rightColumns: ['A'],
    });
    const draft = new CubeJoinDraft(original);
    expect(draft.pairs.map(({ left, right }) => [left, right])).toEqual([
      ['A', 'A'],
      ['B', ''],
    ]);
    expect(draft.build()).toBe(original);
    // each row keeps its own key
    expect(new Set(draft.pairs.map((pair) => pair.key)).size).toBe(2);
  });
});

describe('Where a column comes from', () => {
  // ORDERS and CUSTOMERS joined on CUSTOMER_ID, then filtered
  const valid = sliceQuery();
  const analysis = buildSchemasAndValidity(valid);

  /** ORDERS joined with CUSTOMERS on CUSTOMER_ID, with this join type */
  const joined = (joinType: JoinType): Query =>
    new Query(
      [
        northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
        northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
        new Join('join101', {
          leftColumns: ['CUSTOMER_ID'],
          rightColumns: ['CUSTOMER_ID'],
          joinType,
        }),
      ],
      [
        new Connection('relational101', 'join101', 'leftTds'),
        new Connection('relational102', 'join101', 'rightTds'),
      ],
      'join101',
    );

  const sourcesOf = (query: Query, nodeId: string, column: string): string[] =>
    findColumnSources(
      query,
      buildSchemasAndValidity(query),
      nodeId,
      column,
    ).map((source) => source.id);

  test('Follows a column back through the nodes whose output has it', () => {
    expect(sourcesOf(valid, 'filter101', 'SHIP_CITY')).toEqual([
      'relational101',
    ]);
    expect(sourcesOf(valid, 'filter101', 'COMPANY_NAME')).toEqual([
      'relational102',
    ]);
    expect(sourcesOf(valid, 'join101', 'NOPE')).toEqual([]);
    expect(findColumnSources(valid, analysis, 'nothing101', 'X')).toEqual([]);
  });

  test('Takes a same-named join key from the side the join keeps, and from both when it merges them', () => {
    expect(sourcesOf(joined(JoinType.INNER), 'join101', 'CUSTOMER_ID')).toEqual(
      ['relational101'],
    );
    expect(
      sourcesOf(joined(JoinType.LEFT_OUTER), 'join101', 'CUSTOMER_ID'),
    ).toEqual(['relational101']);
    expect(
      sourcesOf(joined(JoinType.RIGHT_OUTER), 'join101', 'CUSTOMER_ID'),
    ).toEqual(['relational102']);
    expect(
      sourcesOf(joined(JoinType.FULL_OUTER), 'join101', 'CUSTOMER_ID'),
    ).toEqual(['relational101', 'relational102']);
  });

  /** ORDERS, then this node, captured at it */
  const ordersThen = (node: Rename | Restrict): Query =>
    new Query(
      [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS), node],
      [new Connection('relational101', node.id, 'tds')],
      node.id,
    );

  test("Follows a renamed column back to its table's name for it", () => {
    const query = ordersThen(
      new Rename('rename101', [{ from: 'SHIP_REGION', to: 'Region' }]),
    );
    const renamedAnalysis = buildSchemasAndValidity(query);
    expect(
      findColumnOrigins(query, renamedAnalysis, 'rename101', 'Region').map(
        ({ source, column }) => [source.id, column],
      ),
    ).toEqual([['relational101', 'SHIP_REGION']]);
    expect(sourcesOf(query, 'rename101', 'Region')).toEqual(['relational101']);
    // the old name is gone from the rename's output
    expect(sourcesOf(query, 'rename101', 'SHIP_REGION')).toEqual([]);
    // a column the rename leaves alone keeps its name
    expect(
      findColumnOrigins(query, renamedAnalysis, 'rename101', 'SHIP_CITY').map(
        ({ column }) => column,
      ),
    ).toEqual(['SHIP_CITY']);
  });

  test('Finds no table for a column a Restrict dropped', () => {
    const query = ordersThen(new Restrict('restrict101', ['ORDER_ID']));
    expect(sourcesOf(query, 'restrict101', 'SHIP_CITY')).toEqual([]);
    expect(sourcesOf(query, 'restrict101', 'ORDER_ID')).toEqual([
      'relational101',
    ]);
  });

  test("Tells a renamed column Cube typed as a bare String by its table's name for it", () => {
    const query = ordersThen(
      new Rename('rename101', [{ from: 'SHIP_REGION', to: 'Region' }]),
    );
    const outline: CubeModelOutline = {
      ...FAKE_NORTHWIND_OUTLINE,
      databases: [
        {
          path: NORTHWIND_DATABASE,
          schemas: [
            {
              name: 'NORTHWIND',
              tables: [
                {
                  name: 'ORDERS',
                  isView: false,
                  columnCount: 1,
                  flags: [],
                  untypedColumns: ['SHIP_REGION'],
                },
              ],
            },
          ],
        },
      ],
    };
    const renamedAnalysis = buildSchemasAndValidity(query);
    expect(
      isUntypedColumn(outline, query, renamedAnalysis, 'rename101', 'Region'),
    ).toBe(true);
    expect(
      isUntypedColumn(
        outline,
        query,
        renamedAnalysis,
        'rename101',
        'SHIP_CITY',
      ),
    ).toBe(false);
  });

  test("Tells a column Cube typed as a bare String from its own table's entry in the model's outline", () => {
    const table = (name: string, untypedColumns: string[]) => ({
      name,
      isView: false,
      columnCount: 1,
      flags: [],
      untypedColumns,
    });
    const outline: CubeModelOutline = {
      ...FAKE_NORTHWIND_OUTLINE,
      databases: [
        // a same-named schema and table in another database, listed first
        {
          path: 'other::Database',
          schemas: [
            {
              name: 'NORTHWIND',
              tables: [table('CUSTOMERS', ['COMPANY_NAME'])],
            },
          ],
        },
        {
          path: NORTHWIND_DATABASE,
          schemas: [
            // a same-named table in another schema, listed first
            { name: 'OTHER', tables: [table('CUSTOMERS', ['CITY'])] },
            {
              name: 'NORTHWIND',
              tables: [
                table('ORDERS', ['SHIP_REGION', 'CUSTOMER_ID']),
                table('CUSTOMERS', ['REGION']),
              ],
            },
          ],
        },
      ],
    };
    const untyped = (nodeId: string, column: string): boolean =>
      isUntypedColumn(outline, valid, analysis, nodeId, column);
    expect(untyped('join101', 'SHIP_REGION')).toBe(true);
    expect(untyped('join101', 'SHIP_CITY')).toBe(false);
    // CUSTOMERS' own list, though ORDERS comes first
    expect(untyped('join101', 'REGION')).toBe(true);
    // ORDERS' CUSTOMER_ID is untyped, CUSTOMERS' is not
    expect(untyped('relational102', 'CUSTOMER_ID')).toBe(false);
    expect(untyped('join101', 'COMPANY_NAME')).toBe(false);
    expect(untyped('join101', 'CITY')).toBe(false);
    // no outline yet: no warning
    expect(
      isUntypedColumn(undefined, valid, analysis, 'join101', 'SHIP_REGION'),
    ).toBe(false);
  });
});

describe("Where a Group's column comes from", () => {
  /** ORDERS, then these nodes one after another, captured at the last */
  const ordersThrough = (...nodes: (Rename | Group | Restrict)[]): Query =>
    new Query(
      [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS), ...nodes],
      nodes.map(
        (node, index) =>
          new Connection(
            nodes[index - 1]?.id ?? 'relational101',
            node.id,
            'tds',
          ),
      ),
      nodes[nodes.length - 1]?.id ?? 'relational101',
    );

  /** ORDERS by ship country, with an aggregation of each function */
  const byCountry = (): Group =>
    new Group(
      'group101',
      ['SHIP_COUNTRY'],
      [
        {
          column: 'SHIP_REGION',
          function: AggregationFunction.DISTINCT_VALUE,
          name: 'Only region',
        },
        {
          column: 'ORDER_DATE',
          function: AggregationFunction.MIN,
          name: 'First order',
        },
        {
          column: 'FREIGHT',
          function: AggregationFunction.MAX,
          name: 'Top freight',
        },
        {
          column: 'ORDER_ID',
          function: AggregationFunction.COUNT,
          name: 'Orders',
        },
        {
          column: 'CUSTOMER_ID',
          function: AggregationFunction.DISTINCT_COUNT,
          name: 'Customers',
        },
        {
          column: 'FREIGHT',
          function: AggregationFunction.SUM,
          name: 'Total freight',
        },
        {
          column: 'FREIGHT',
          function: AggregationFunction.AVERAGE,
          name: 'Average freight',
        },
        {
          column: undefined,
          function: AggregationFunction.COUNT_ROWS,
          name: 'Rows',
        },
      ],
    );

  /** Each table column the node's output column comes from, as [table source id, column] */
  const originsOf = (
    query: Query,
    nodeId: string,
    column: string,
  ): string[][] =>
    findColumnOrigins(
      query,
      buildSchemasAndValidity(query),
      nodeId,
      column,
    ).map((origin) => [origin.source.id, origin.column]);

  const sourcesOf = (query: Query, nodeId: string, column: string): string[] =>
    findColumnSources(
      query,
      buildSchemasAndValidity(query),
      nodeId,
      column,
    ).map((source) => source.id);

  test('The group is valid, so its output has every column asked about', () => {
    const query = ordersThrough(byCountry());
    const analysis = buildSchemasAndValidity(query);
    expect(analysis.validity.get('group101')).toEqual([]);
    expect(analysis.schemas.get('group101')?.names()).toEqual([
      'SHIP_COUNTRY',
      'Only region',
      'First order',
      'Top freight',
      'Orders',
      'Customers',
      'Total freight',
      'Average freight',
      'Rows',
    ]);
  });

  test("Follows a Group's key back to its table column under the same name", () => {
    const query = ordersThrough(byCountry());
    expect(originsOf(query, 'group101', 'SHIP_COUNTRY')).toEqual([
      ['relational101', 'SHIP_COUNTRY'],
    ]);
    expect(sourcesOf(query, 'group101', 'SHIP_COUNTRY')).toEqual([
      'relational101',
    ]);
    // an input column that is no key is gone from the group's output
    expect(originsOf(query, 'group101', 'SHIP_CITY')).toEqual([]);
    // as is a column the group aggregates
    expect(originsOf(query, 'group101', 'FREIGHT')).toEqual([]);
  });

  test('Follows a Distinct Value, Min or Max back to the table column it aggregates', () => {
    const query = ordersThrough(byCountry());
    expect(originsOf(query, 'group101', 'Only region')).toEqual([
      ['relational101', 'SHIP_REGION'],
    ]);
    expect(originsOf(query, 'group101', 'First order')).toEqual([
      ['relational101', 'ORDER_DATE'],
    ]);
    expect(originsOf(query, 'group101', 'Top freight')).toEqual([
      ['relational101', 'FREIGHT'],
    ]);
    expect(sourcesOf(query, 'group101', 'Top freight')).toEqual([
      'relational101',
    ]);
  });

  test("Finds no table for a Count, Distinct Count, Sum, Average or Count rows, which is no column's value", () => {
    const query = ordersThrough(byCountry());
    expect(originsOf(query, 'group101', 'Orders')).toEqual([]);
    expect(originsOf(query, 'group101', 'Customers')).toEqual([]);
    expect(originsOf(query, 'group101', 'Total freight')).toEqual([]);
    expect(originsOf(query, 'group101', 'Average freight')).toEqual([]);
    expect(originsOf(query, 'group101', 'Rows')).toEqual([]);
    expect(sourcesOf(query, 'group101', 'Total freight')).toEqual([]);
  });

  test("Follows a Group's columns back through a Rename before it, to the table's names", () => {
    const query = ordersThrough(
      new Rename('rename101', [
        { from: 'SHIP_REGION', to: 'Region' },
        { from: 'FREIGHT', to: 'Cost' },
      ]),
      new Group(
        'group101',
        ['Region'],
        [
          {
            column: 'Cost',
            function: AggregationFunction.MAX,
            name: 'Top cost',
          },
          {
            column: 'Cost',
            function: AggregationFunction.SUM,
            name: 'Total cost',
          },
        ],
      ),
    );
    expect(buildSchemasAndValidity(query).validity.get('group101')).toEqual([]);
    expect(originsOf(query, 'group101', 'Region')).toEqual([
      ['relational101', 'SHIP_REGION'],
    ]);
    expect(originsOf(query, 'group101', 'Top cost')).toEqual([
      ['relational101', 'FREIGHT'],
    ]);
    expect(originsOf(query, 'group101', 'Total cost')).toEqual([]);
  });

  test("Still tells a Distinct Value of a column Cube typed as a bare String, through a Group feeding a Join, for the Join's 'type unknown' warning", () => {
    // ORDERS as the engine types it when SHIP_REGION is an OTHER column
    const ordersColumns = ORDERS_COLUMNS.map((column) =>
      column.name === 'SHIP_REGION'
        ? new SchemaColumn(
            column.name,
            PrimitiveType.get(PRIMITIVE_TYPE_PATH.STRING),
            true,
          )
        : column,
    );
    const query = new Query(
      [
        northwindTable('relational101', 'ORDERS', ordersColumns),
        new Group(
          'group101',
          ['SHIP_COUNTRY'],
          [
            {
              column: 'SHIP_REGION',
              function: AggregationFunction.DISTINCT_VALUE,
              name: 'Ship region',
            },
            {
              column: 'SHIP_REGION',
              function: AggregationFunction.COUNT,
              name: 'Ship regions',
            },
          ],
        ),
        northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
        new Join('join101', {
          leftColumns: ['Ship region'],
          rightColumns: ['REGION'],
          joinType: JoinType.INNER,
        }),
      ],
      [
        new Connection('relational101', 'group101', 'tds'),
        new Connection('group101', 'join101', 'leftTds'),
        new Connection('relational102', 'join101', 'rightTds'),
      ],
      'join101',
    );
    const analysis = buildSchemasAndValidity(query);
    expect(analysis.validity.get('group101')).toEqual([]);
    expect(analysis.validity.get('join101')).toEqual([]);
    const outline: CubeModelOutline = {
      ...FAKE_NORTHWIND_OUTLINE,
      databases: [
        {
          path: NORTHWIND_DATABASE,
          schemas: [
            {
              name: 'NORTHWIND',
              tables: [
                {
                  name: 'ORDERS',
                  isView: false,
                  columnCount: 1,
                  flags: [],
                  untypedColumns: ['SHIP_REGION'],
                },
              ],
            },
          ],
        },
      ],
    };
    // the Join editor asks of its Left input's column, the group's
    const [leftId] = query.getInputIds('join101');
    expect(leftId).toBe('group101');
    const untyped = (nodeId: string, column: string): boolean =>
      isUntypedColumn(outline, query, analysis, nodeId, column);
    expect(untyped('group101', 'Ship region')).toBe(true);
    expect(untyped('join101', 'Ship region')).toBe(true);
    // a count of it is no value of it
    expect(untyped('group101', 'Ship regions')).toBe(false);
    expect(untyped('group101', 'SHIP_COUNTRY')).toBe(false);
    expect(untyped('join101', 'REGION')).toBe(false);
  });
});

describe("Where a Concat's column comes from", () => {
  /** A table of the fixture's CUBETEST schema, typed as the engine types it */
  const cubetestTable = (
    id: string,
    name: string,
    columns: SchemaColumn[],
  ): RelationalTableSource =>
    new RelationalTableSource(
      id,
      { database: NORTHWIND_DATABASE, schema: 'CUBETEST', table: name },
      { kind: 'resolved', schema: new Schema(columns) },
    );

  /** CUBETEST.CUST_REGION, CUSTOMERS' key and region */
  const custRegion = (id: string): RelationalTableSource =>
    cubetestTable(
      id,
      'CUST_REGION',
      CUSTOMERS_COLUMNS.filter(({ name }) =>
        ['CUSTOMER_ID', 'REGION'].includes(name),
      ),
    );

  /** CUBETEST.PROBLEM_OTHER's columns: O is an OTHER column, so the engine types it a bare String */
  const PROBLEM_OTHER_COLUMNS = [
    new SchemaColumn('ID', PrimitiveType.get(PRIMITIVE_TYPE_PATH.INT), false),
    new SchemaColumn('O', PrimitiveType.get(PRIMITIVE_TYPE_PATH.STRING), true),
  ];

  const problemOther = (id: string): RelationalTableSource =>
    cubetestTable(id, 'PROBLEM_OTHER', PROBLEM_OTHER_COLUMNS);

  /** A table typed as PROBLEM_OTHER is, but whose O is a real String (no such table in the fixture) */
  const typedOther = (id: string): RelationalTableSource =>
    cubetestTable(id, 'TYPED_O', PROBLEM_OTHER_COLUMNS);

  /** ORDERS' customer and ship city */
  const ordersCities = (): QueryNode[] => [
    northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
    new Restrict('restrict101', ['CUSTOMER_ID', 'SHIP_CITY']),
  ];

  /** CUSTOMERS' key and city, the city renamed as ORDERS names its ship city */
  const customersCities = (): QueryNode[] => [
    northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
    new Restrict('restrict102', ['CUSTOMER_ID', 'CITY']),
    new Rename('rename101', [{ from: 'CITY', to: 'SHIP_CITY' }]),
  ];

  /** Each node of the chain feeding the next */
  const chained = (nodes: readonly QueryNode[]): Connection[] =>
    nodes
      .slice(1)
      .map(
        (node, index) =>
          new Connection((nodes[index] as QueryNode).id, node.id, 'tds'),
      );

  const lastId = (nodes: readonly QueryNode[]): string =>
    (nodes[nodes.length - 1] as QueryNode).id;

  /**
   * Each chain, its nodes one after another, the last feeding the Concat's
   * First or Second input; the Second's connection is listed first, as the
   * inputs are told by port
   */
  const concatParts = (
    first: readonly QueryNode[],
    second: readonly QueryNode[],
  ): { nodes: QueryNode[]; connections: Connection[] } => ({
    nodes: [...first, ...second, new Concat('concat101')],
    connections: [
      ...chained(first),
      ...chained(second),
      new Connection(lastId(second), 'concat101', 'tds2'),
      new Connection(lastId(first), 'concat101', 'tds1'),
    ],
  });

  /** The two chains concatenated, captured at the concat */
  const concatenated = (
    first: readonly QueryNode[],
    second: readonly QueryNode[],
  ): Query => {
    const { nodes, connections } = concatParts(first, second);
    return new Query(nodes, connections, 'concat101');
  };

  /** The concat on the Left of an INNER join with this table, on these keys, captured at the join */
  const joinedAfter = (
    first: readonly QueryNode[],
    second: readonly QueryNode[],
    right: QueryNode,
    leftColumns: string[],
    rightColumns: string[],
  ): Query => {
    const { nodes, connections } = concatParts(first, second);
    return new Query(
      [
        ...nodes,
        right,
        new Join('join101', {
          leftColumns,
          rightColumns,
          joinType: JoinType.INNER,
        }),
      ],
      [
        ...connections,
        new Connection('concat101', 'join101', 'leftTds'),
        new Connection(right.id, 'join101', 'rightTds'),
      ],
      'join101',
    );
  };

  /** Each table column the node's output column comes from, as [table source id, column] */
  const originsOf = (
    query: Query,
    nodeId: string,
    column: string,
  ): string[][] =>
    findColumnOrigins(
      query,
      buildSchemasAndValidity(query),
      nodeId,
      column,
    ).map((origin) => [origin.source.id, origin.column]);

  const sourcesOf = (query: Query, nodeId: string, column: string): string[] =>
    findColumnSources(
      query,
      buildSchemasAndValidity(query),
      nodeId,
      column,
    ).map((source) => source.id);

  /** The fixture's CUBETEST tables as the outline lists them, PROBLEM_OTHER's O untyped */
  const OUTLINE: CubeModelOutline = {
    ...FAKE_NORTHWIND_OUTLINE,
    databases: [
      {
        path: NORTHWIND_DATABASE,
        schemas: [
          ...(FAKE_NORTHWIND_OUTLINE.databases[0]?.schemas ?? []),
          {
            name: 'CUBETEST',
            tables: [
              {
                name: 'PROBLEM_OTHER',
                isView: false,
                columnCount: 2,
                flags: [CubeTableFlag.TYPE_UNKNOWN],
                untypedColumns: ['O'],
              },
              {
                name: 'TYPED_O',
                isView: false,
                columnCount: 2,
                flags: [],
                untypedColumns: [],
              },
            ],
          },
        ],
      },
    ],
  };

  test('Follows a column of a valid Concat back to its table in both inputs, in port order, the same name at the same position', () => {
    const query = concatenated(
      [
        northwindTable('relational101', 'CUSTOMERS', CUSTOMERS_COLUMNS),
        new Restrict('restrict101', ['CUSTOMER_ID', 'REGION']),
      ],
      [custRegion('relational102')],
    );
    const analysis = buildSchemasAndValidity(query);
    expect(analysis.validity.get('concat101')).toEqual([]);
    expect(analysis.schemas.get('concat101')?.names()).toEqual([
      'CUSTOMER_ID',
      'REGION',
    ]);
    // the First input's connection is listed last
    expect(query.getInputIds('concat101')).toEqual([
      'restrict101',
      'relational102',
    ]);
    expect(originsOf(query, 'concat101', 'REGION')).toEqual([
      ['relational101', 'REGION'],
      ['relational102', 'REGION'],
    ]);
    expect(sourcesOf(query, 'concat101', 'CUSTOMER_ID')).toEqual([
      'relational101',
      'relational102',
    ]);
    // a column the Restrict dropped, and so the concat's output doesn't have
    expect(originsOf(query, 'concat101', 'CITY')).toEqual([]);
    // the inputs swapped, the Second's table comes first
    const swapped = query.swapInputs('concat101');
    expect(buildSchemasAndValidity(swapped).validity.get('concat101')).toEqual(
      [],
    );
    expect(originsOf(swapped, 'concat101', 'REGION')).toEqual([
      ['relational102', 'REGION'],
      ['relational101', 'REGION'],
    ]);
  });

  test("Follows a column of a Concat back through a Restrict and a Rename inside an input, to that table's own name for it", () => {
    const query = concatenated(ordersCities(), customersCities());
    const analysis = buildSchemasAndValidity(query);
    expect(analysis.validity.get('concat101')).toEqual([]);
    expect(analysis.schemas.get('concat101')?.names()).toEqual([
      'CUSTOMER_ID',
      'SHIP_CITY',
    ]);
    expect(originsOf(query, 'concat101', 'SHIP_CITY')).toEqual([
      ['relational101', 'SHIP_CITY'],
      ['relational102', 'CITY'],
    ]);
    expect(originsOf(query, 'concat101', 'CUSTOMER_ID')).toEqual([
      ['relational101', 'CUSTOMER_ID'],
      ['relational102', 'CUSTOMER_ID'],
    ]);
    expect(sourcesOf(query, 'concat101', 'SHIP_CITY')).toEqual([
      'relational101',
      'relational102',
    ]);
    // the concat's output has the First input's names, not the Second table's
    expect(originsOf(query, 'concat101', 'CITY')).toEqual([]);
  });

  test("Finds no table for a column of a Concat whose inputs don't match, which has no output", () => {
    const cases: [string, Query][] = [
      // 14 columns and 11
      [
        'a column count',
        concatenated(
          [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS)],
          [northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS)],
        ),
      ],
      // SHIP_CITY and CITY at position 2
      ['a name', concatenated(ordersCities(), customersCities().slice(0, 2))],
      // EMPLOYEE_ID a SmallInt in the First, a Varchar(15) in the Second
      [
        'a type',
        concatenated(
          [
            northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
            new Restrict('restrict101', ['CUSTOMER_ID', 'EMPLOYEE_ID']),
          ],
          [
            northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
            new Restrict('restrict102', ['CUSTOMER_ID', 'CITY']),
            new Rename('rename101', [{ from: 'CITY', to: 'EMPLOYEE_ID' }]),
          ],
        ),
      ],
    ];
    cases.forEach(([difference, query]) => {
      const analysis = buildSchemasAndValidity(query);
      expect([difference, analysis.validity.get('concat101')?.[0]]).toEqual([
        difference,
        MESSAGE_INPUT_SCHEMAS_DIFFER,
      ]);
      expect(analysis.schemas.get('concat101')).toBeUndefined();
      // both inputs have CUSTOMER_ID, the concat nothing
      const [firstId, secondId] = query.getInputIds('concat101');
      expect(sourcesOf(query, firstId ?? '', 'CUSTOMER_ID')).toEqual([
        'relational101',
      ]);
      expect(sourcesOf(query, secondId ?? '', 'CUSTOMER_ID')).toEqual([
        'relational102',
      ]);
      expect([
        difference,
        originsOf(query, 'concat101', 'CUSTOMER_ID'),
      ]).toEqual([difference, []]);
    });
    // nor for one with an input missing
    const incomplete = new Query(
      [custRegion('relational101'), new Concat('concat101')],
      [new Connection('relational101', 'concat101', 'tds1')],
      'concat101',
    );
    expect(originsOf(incomplete, 'concat101', 'REGION')).toEqual([]);
    // nor a 'type unknown' warning for PROBLEM_OTHER's O, though its input has it
    const mismatched = concatenated(
      [problemOther('relational101')],
      [custRegion('relational102')],
    );
    const mismatchedAnalysis = buildSchemasAndValidity(mismatched);
    expect(mismatchedAnalysis.validity.get('concat101')?.[0]).toBe(
      MESSAGE_INPUT_SCHEMAS_DIFFER,
    );
    expect(mismatchedAnalysis.schemas.get('concat101')).toBeUndefined();
    expect(
      isUntypedColumn(
        OUTLINE,
        mismatched,
        mismatchedAnalysis,
        'relational101',
        'O',
      ),
    ).toBe(true);
    expect(
      isUntypedColumn(
        OUTLINE,
        mismatched,
        mismatchedAnalysis,
        'concat101',
        'O',
      ),
    ).toBe(false);
  });

  test("Tells a Concat's column fed by PROBLEM_OTHER's untyped O, from either input", () => {
    const untyped = (query: Query, nodeId: string, column: string): boolean =>
      isUntypedColumn(
        OUTLINE,
        query,
        buildSchemasAndValidity(query),
        nodeId,
        column,
      );
    const otherFirst = concatenated(
      [problemOther('relational101')],
      [typedOther('relational102')],
    );
    const otherSecond = concatenated(
      [typedOther('relational101')],
      [problemOther('relational102')],
    );
    [otherFirst, otherSecond].forEach((query) => {
      expect(buildSchemasAndValidity(query).validity.get('concat101')).toEqual(
        [],
      );
      expect(originsOf(query, 'concat101', 'O')).toEqual([
        ['relational101', 'O'],
        ['relational102', 'O'],
      ]);
      expect(untyped(query, 'concat101', 'O')).toBe(true);
      expect(untyped(query, 'concat101', 'ID')).toBe(false);
    });
    expect(
      untyped(
        concatenated(
          [problemOther('relational101')],
          [problemOther('relational102')],
        ),
        'concat101',
        'O',
      ),
    ).toBe(true);
    // neither input from PROBLEM_OTHER
    expect(
      untyped(
        concatenated(
          [typedOther('relational101')],
          [typedOther('relational102')],
        ),
        'concat101',
        'O',
      ),
    ).toBe(false);
    // no outline yet: no warning
    expect(
      isUntypedColumn(
        undefined,
        otherSecond,
        buildSchemasAndValidity(otherSecond),
        'concat101',
        'O',
      ),
    ).toBe(false);
  });

  test("A Join after a Concat finds its columns' tables through it, for the Join's 'type unknown' warning too", () => {
    const query = joinedAfter(
      ordersCities(),
      customersCities(),
      northwindTable('relational103', 'CUSTOMERS', CUSTOMERS_COLUMNS),
      ['CUSTOMER_ID'],
      ['CUSTOMER_ID'],
    );
    const analysis = buildSchemasAndValidity(query);
    expect(analysis.validity.get('concat101')).toEqual([]);
    expect(analysis.validity.get('join101')).toEqual([]);
    // an INNER join keeps the Left's key: the concat's, from both its tables
    expect(originsOf(query, 'join101', 'CUSTOMER_ID')).toEqual([
      ['relational101', 'CUSTOMER_ID'],
      ['relational102', 'CUSTOMER_ID'],
    ]);
    expect(originsOf(query, 'join101', 'SHIP_CITY')).toEqual([
      ['relational101', 'SHIP_CITY'],
      ['relational102', 'CITY'],
    ]);
    expect(originsOf(query, 'join101', 'CITY')).toEqual([
      ['relational103', 'CITY'],
    ]);

    // PROBLEM_OTHER's O as a key, against CUSTOMERS' REGION
    const keyedOnOther = joinedAfter(
      [typedOther('relational101')],
      [problemOther('relational102')],
      northwindTable('relational103', 'CUSTOMERS', CUSTOMERS_COLUMNS),
      ['O'],
      ['REGION'],
    );
    const otherAnalysis = buildSchemasAndValidity(keyedOnOther);
    expect(otherAnalysis.validity.get('join101')).toEqual([]);
    const untyped = (nodeId: string, column: string): boolean =>
      isUntypedColumn(OUTLINE, keyedOnOther, otherAnalysis, nodeId, column);
    // the Join editor asks of its Left input's column, the concat's
    const [leftId] = keyedOnOther.getInputIds('join101');
    expect(leftId).toBe('concat101');
    expect(untyped('concat101', 'O')).toBe(true);
    expect(untyped('join101', 'O')).toBe(true);
    expect(untyped('join101', 'ID')).toBe(false);
    expect(untyped('join101', 'REGION')).toBe(false);
  });
});

describe("Where a Partition's column comes from", () => {
  /** ORDERS, then these nodes one after another, captured at the last */
  const ordersThrough = (...nodes: (Rename | Restrict | Partition)[]): Query =>
    new Query(
      [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS), ...nodes],
      nodes.map(
        (node, index) =>
          new Connection(
            nodes[index - 1]?.id ?? 'relational101',
            node.id,
            'tds',
          ),
      ),
      nodes[nodes.length - 1]?.id ?? 'relational101',
    );

  /** ORDERS by ship country, in order date order, with a window function of each kind */
  const byCountry = (): Partition =>
    new Partition(
      'partition101',
      ['SHIP_COUNTRY'],
      [{ column: 'ORDER_DATE', direction: SortDirection.ASC }],
      [
        {
          column: 'SHIP_REGION',
          function: AggregationFunction.DISTINCT_VALUE,
          name: 'Only region',
        },
        {
          column: 'ORDER_DATE',
          function: AggregationFunction.MIN,
          name: 'First order',
        },
        {
          column: 'FREIGHT',
          function: AggregationFunction.MAX,
          name: 'Top freight',
        },
        {
          column: 'ORDER_ID',
          function: AggregationFunction.COUNT,
          name: 'Orders',
        },
        {
          column: 'CUSTOMER_ID',
          function: AggregationFunction.DISTINCT_COUNT,
          name: 'Customers',
        },
        {
          column: 'FREIGHT',
          function: AggregationFunction.SUM,
          name: 'Running freight',
        },
        {
          column: 'FREIGHT',
          function: AggregationFunction.AVERAGE,
          name: 'Average freight',
        },
        {
          column: undefined,
          function: AggregationFunction.COUNT_ROWS,
          name: 'Rows',
        },
        {
          column: undefined,
          function: WindowRankFunction.RANK,
          name: 'Rank',
        },
        {
          column: undefined,
          function: WindowRankFunction.DENSE_RANK,
          name: 'Dense rank',
        },
        {
          column: undefined,
          function: WindowRankFunction.ROW_NUMBER,
          name: 'Row number',
        },
      ],
    );

  /** Each table column the node's output column comes from, as [table source id, column] */
  const originsOf = (
    query: Query,
    nodeId: string,
    column: string,
  ): string[][] =>
    findColumnOrigins(
      query,
      buildSchemasAndValidity(query),
      nodeId,
      column,
    ).map((origin) => [origin.source.id, origin.column]);

  const sourcesOf = (query: Query, nodeId: string, column: string): string[] =>
    findColumnSources(
      query,
      buildSchemasAndValidity(query),
      nodeId,
      column,
    ).map((source) => source.id);

  test('The partition is valid, so its output has every column asked about', () => {
    const query = ordersThrough(byCountry());
    const analysis = buildSchemasAndValidity(query);
    expect(analysis.validity.get('partition101')).toEqual([]);
    expect(analysis.schemas.get('partition101')?.names()).toEqual([
      ...ORDERS_COLUMNS.map(({ name }) => name),
      'Only region',
      'First order',
      'Top freight',
      'Orders',
      'Customers',
      'Running freight',
      'Average freight',
      'Rows',
      'Rank',
      'Dense rank',
      'Row number',
    ]);
  });

  test("Follows each of a Partition's input columns back to its table column under the same name, whether the window partitions, sorts or aggregates by it or not", () => {
    const query = ordersThrough(byCountry());
    // its partition column
    expect(originsOf(query, 'partition101', 'SHIP_COUNTRY')).toEqual([
      ['relational101', 'SHIP_COUNTRY'],
    ]);
    // its sort column
    expect(originsOf(query, 'partition101', 'ORDER_DATE')).toEqual([
      ['relational101', 'ORDER_DATE'],
    ]);
    // a column its window functions aggregate, which a Group would drop
    expect(originsOf(query, 'partition101', 'FREIGHT')).toEqual([
      ['relational101', 'FREIGHT'],
    ]);
    // a column the window doesn't use
    expect(originsOf(query, 'partition101', 'SHIP_CITY')).toEqual([
      ['relational101', 'SHIP_CITY'],
    ]);
    expect(sourcesOf(query, 'partition101', 'SHIP_CITY')).toEqual([
      'relational101',
    ]);
    // a column its output doesn't have
    expect(originsOf(query, 'partition101', 'NOPE')).toEqual([]);
  });

  test('Follows a Lag, Lead, First or Last back to the table column whose values it holds, and an NTile, Percent Rank or Cumulative Distribution to none (M5b)', () => {
    const query = ordersThrough(
      byCountry().withAggregations([
        {
          column: 'FREIGHT',
          function: WindowRowFunction.LAG,
          name: 'Previous freight',
          offset: 1,
        },
        {
          column: 'SHIP_CITY',
          function: WindowRowFunction.LEAD,
          name: 'Next city',
          offset: 2,
        },
        {
          column: 'ORDER_DATE',
          function: WindowRowFunction.FIRST,
          name: 'First date',
        },
        {
          column: 'SHIP_REGION',
          function: WindowRowFunction.LAST,
          name: 'Last region',
        },
        {
          column: undefined,
          function: WindowRankFunction.NTILE,
          name: 'Quartile',
          buckets: 4,
        },
        {
          column: undefined,
          function: WindowRankFunction.PERCENT_RANK,
          name: 'Percent',
        },
      ]),
    );
    expect(buildSchemasAndValidity(query).validity.get('partition101')).toEqual(
      [],
    );
    (
      [
        ['Previous freight', 'FREIGHT'],
        ['Next city', 'SHIP_CITY'],
        ['First date', 'ORDER_DATE'],
        ['Last region', 'SHIP_REGION'],
      ] as const
    ).forEach(([name, column]) =>
      expect(originsOf(query, 'partition101', name)).toEqual([
        ['relational101', column],
      ]),
    );
    expect(originsOf(query, 'partition101', 'Quartile')).toEqual([]);
    expect(originsOf(query, 'partition101', 'Percent')).toEqual([]);
  });

  test('Follows a windowed Distinct Value, Min or Max back to the table column it aggregates', () => {
    const query = ordersThrough(byCountry());
    expect(originsOf(query, 'partition101', 'Only region')).toEqual([
      ['relational101', 'SHIP_REGION'],
    ]);
    expect(originsOf(query, 'partition101', 'First order')).toEqual([
      ['relational101', 'ORDER_DATE'],
    ]);
    expect(originsOf(query, 'partition101', 'Top freight')).toEqual([
      ['relational101', 'FREIGHT'],
    ]);
    expect(sourcesOf(query, 'partition101', 'Top freight')).toEqual([
      'relational101',
    ]);
  });

  test("Finds no table for a windowed Count, Distinct Count, Sum, Average, Count Rows, Rank, Dense Rank or Row Number, which is no column's value", () => {
    const query = ordersThrough(byCountry());
    expect(originsOf(query, 'partition101', 'Orders')).toEqual([]);
    expect(originsOf(query, 'partition101', 'Customers')).toEqual([]);
    expect(originsOf(query, 'partition101', 'Running freight')).toEqual([]);
    expect(originsOf(query, 'partition101', 'Average freight')).toEqual([]);
    expect(originsOf(query, 'partition101', 'Rows')).toEqual([]);
    expect(originsOf(query, 'partition101', 'Rank')).toEqual([]);
    expect(originsOf(query, 'partition101', 'Dense rank')).toEqual([]);
    expect(originsOf(query, 'partition101', 'Row number')).toEqual([]);
    expect(sourcesOf(query, 'partition101', 'Running freight')).toEqual([]);
  });

  test("Follows a Partition's columns back through a Rename before it, to the table's names", () => {
    const query = ordersThrough(
      new Rename('rename101', [
        { from: 'SHIP_REGION', to: 'Region' },
        { from: 'FREIGHT', to: 'Cost' },
      ]),
      new Partition(
        'partition101',
        ['Region'],
        [{ column: 'Cost', direction: SortDirection.DESC }],
        [
          {
            column: 'Cost',
            function: AggregationFunction.MAX,
            name: 'Top cost',
          },
          {
            column: 'Cost',
            function: AggregationFunction.SUM,
            name: 'Running cost',
          },
          {
            column: undefined,
            function: WindowRankFunction.RANK,
            name: 'Cost rank',
          },
        ],
      ),
    );
    expect(buildSchemasAndValidity(query).validity.get('partition101')).toEqual(
      [],
    );
    expect(originsOf(query, 'partition101', 'Region')).toEqual([
      ['relational101', 'SHIP_REGION'],
    ]);
    expect(originsOf(query, 'partition101', 'Cost')).toEqual([
      ['relational101', 'FREIGHT'],
    ]);
    expect(originsOf(query, 'partition101', 'Top cost')).toEqual([
      ['relational101', 'FREIGHT'],
    ]);
    expect(originsOf(query, 'partition101', 'Running cost')).toEqual([]);
    expect(originsOf(query, 'partition101', 'Cost rank')).toEqual([]);
    // the old names are gone from the rename's output, so from the partition's
    expect(originsOf(query, 'partition101', 'SHIP_REGION')).toEqual([]);
  });

  test("Follows a Partition's columns back through a Join before it, a same-named key to the side the join keeps", () => {
    // RIGHT OUTER keeps CUSTOMERS' CUSTOMER_ID
    const query = new Query(
      [
        northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
        northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
        new Join('join101', {
          leftColumns: ['CUSTOMER_ID'],
          rightColumns: ['CUSTOMER_ID'],
          joinType: JoinType.RIGHT_OUTER,
        }),
        new Partition(
          'partition101',
          ['COUNTRY'],
          [{ column: 'ORDER_DATE', direction: SortDirection.ASC }],
          [
            {
              column: 'CUSTOMER_ID',
              function: AggregationFunction.DISTINCT_VALUE,
              name: 'Only customer',
            },
            {
              column: 'CITY',
              function: AggregationFunction.DISTINCT_VALUE,
              name: 'Only city',
            },
            {
              column: 'FREIGHT',
              function: AggregationFunction.MAX,
              name: 'Top freight',
            },
            {
              column: undefined,
              function: WindowRankFunction.ROW_NUMBER,
              name: 'Row number',
            },
          ],
        ),
      ],
      [
        new Connection('relational101', 'join101', 'leftTds'),
        new Connection('relational102', 'join101', 'rightTds'),
        new Connection('join101', 'partition101', 'tds'),
      ],
      'partition101',
    );
    const analysis = buildSchemasAndValidity(query);
    expect(analysis.validity.get('join101')).toEqual([]);
    expect(analysis.validity.get('partition101')).toEqual([]);
    expect(originsOf(query, 'partition101', 'COUNTRY')).toEqual([
      ['relational102', 'COUNTRY'],
    ]);
    expect(originsOf(query, 'partition101', 'ORDER_DATE')).toEqual([
      ['relational101', 'ORDER_DATE'],
    ]);
    expect(originsOf(query, 'partition101', 'CUSTOMER_ID')).toEqual([
      ['relational102', 'CUSTOMER_ID'],
    ]);
    expect(originsOf(query, 'partition101', 'Only customer')).toEqual([
      ['relational102', 'CUSTOMER_ID'],
    ]);
    expect(originsOf(query, 'partition101', 'Only city')).toEqual([
      ['relational102', 'CITY'],
    ]);
    expect(originsOf(query, 'partition101', 'Top freight')).toEqual([
      ['relational101', 'FREIGHT'],
    ]);
    expect(originsOf(query, 'partition101', 'Row number')).toEqual([]);
  });

  test("Still tells a windowed Distinct Value of a column Cube typed as a bare String, and the column itself, through a Partition feeding a Join, for the Join's 'type unknown' warning", () => {
    // ORDERS as the engine types it when SHIP_REGION is an OTHER column; a
    // bare String offers no Min or Max, so Distinct Value is the window's
    // only function whose value is the column's
    const ordersColumns = ORDERS_COLUMNS.map((column) =>
      column.name === 'SHIP_REGION'
        ? new SchemaColumn(
            column.name,
            PrimitiveType.get(PRIMITIVE_TYPE_PATH.STRING),
            true,
          )
        : column,
    );
    const query = new Query(
      [
        northwindTable('relational101', 'ORDERS', ordersColumns),
        // without ORDERS' CUSTOMER_ID, which CUSTOMERS has too
        new Restrict('restrict101', [
          'ORDER_ID',
          'SHIP_COUNTRY',
          'SHIP_REGION',
        ]),
        new Partition(
          'partition101',
          ['SHIP_COUNTRY'],
          [{ column: 'ORDER_ID', direction: SortDirection.ASC }],
          [
            {
              column: 'SHIP_REGION',
              function: AggregationFunction.DISTINCT_VALUE,
              name: 'Ship region',
            },
            {
              column: 'SHIP_REGION',
              function: AggregationFunction.COUNT,
              name: 'Ship regions',
            },
          ],
        ),
        northwindTable('relational102', 'CUSTOMERS', CUSTOMERS_COLUMNS),
        new Join('join101', {
          leftColumns: ['Ship region'],
          rightColumns: ['REGION'],
          joinType: JoinType.INNER,
        }),
      ],
      [
        new Connection('relational101', 'restrict101', 'tds'),
        new Connection('restrict101', 'partition101', 'tds'),
        new Connection('partition101', 'join101', 'leftTds'),
        new Connection('relational102', 'join101', 'rightTds'),
      ],
      'join101',
    );
    const analysis = buildSchemasAndValidity(query);
    expect(analysis.validity.get('partition101')).toEqual([]);
    expect(analysis.validity.get('join101')).toEqual([]);
    const outline: CubeModelOutline = {
      ...FAKE_NORTHWIND_OUTLINE,
      databases: [
        {
          path: NORTHWIND_DATABASE,
          schemas: [
            {
              name: 'NORTHWIND',
              tables: [
                {
                  name: 'ORDERS',
                  isView: false,
                  columnCount: 1,
                  flags: [],
                  untypedColumns: ['SHIP_REGION'],
                },
              ],
            },
          ],
        },
      ],
    };
    // the Join editor asks of its Left input's column, the partition's
    const [leftId] = query.getInputIds('join101');
    expect(leftId).toBe('partition101');
    const untyped = (nodeId: string, column: string): boolean =>
      isUntypedColumn(outline, query, analysis, nodeId, column);
    expect(untyped('partition101', 'Ship region')).toBe(true);
    expect(untyped('join101', 'Ship region')).toBe(true);
    // the column itself, which the partition keeps
    expect(untyped('partition101', 'SHIP_REGION')).toBe(true);
    expect(untyped('join101', 'SHIP_REGION')).toBe(true);
    // a count of it is no value of it
    expect(untyped('partition101', 'Ship regions')).toBe(false);
    expect(untyped('partition101', 'SHIP_COUNTRY')).toBe(false);
    expect(untyped('join101', 'REGION')).toBe(false);
  });
});

describe("Where a Difference's column comes from", () => {
  const P = 'meta::pure::precisePrimitives::';
  const LAST = [
    new SchemaColumn('ORDER_ID', PrimitiveType.get(`${P}SmallInt`), false),
    new SchemaColumn('SHIP_VIA', PrimitiveType.get(`${P}SmallInt`), true),
    new SchemaColumn('SHIP_CITY', PrimitiveType.get(`${P}Varchar`, [15]), true),
  ];
  const NOW = [
    new SchemaColumn('ORDER_ID', PrimitiveType.get(`${P}SmallInt`), false),
    new SchemaColumn('SHIP_VIA', PrimitiveType.get(`${P}SmallInt`), true),
    new SchemaColumn('CARRIER', PrimitiveType.get(`${P}Varchar`, [15]), true),
  ];
  /** Last month's orders and this month's, compared on ORDER_ID by SHIP_VIA */
  const query = new Query(
    [
      northwindTable('relational101', 'ORDERS', LAST),
      northwindTable('relational102', 'ORDERS_ARCHIVE', NOW),
      new Difference('difference101', {
        leftColumns: ['ORDER_ID'],
        rightColumns: ['ORDER_ID'],
        differenceColumns: ['SHIP_VIA'],
      }),
    ],
    [
      new Connection('relational101', 'difference101', 'tds1'),
      new Connection('relational102', 'difference101', 'tds2'),
    ],
    'difference101',
  );
  const analysis = buildSchemasAndValidity(query);
  const originsOf = (column: string): string[] =>
    findColumnOrigins(query, analysis, 'difference101', column).map(
      ({ source, column: name }) => `${source.id}.${name}`,
    );

  test('The difference is valid, so its output has every column asked about', () => {
    expect(analysis.validity.get('difference101')).toEqual([]);
  });

  test("Follows x_1 to the Left input's x and x_2 to the Right input's, and the merged key to both", () => {
    expect(originsOf('SHIP_VIA_1')).toEqual(['relational101.SHIP_VIA']);
    expect(originsOf('SHIP_VIA_2')).toEqual(['relational102.SHIP_VIA']);
    expect(originsOf('ORDER_ID')).toEqual([
      'relational101.ORDER_ID',
      'relational102.ORDER_ID',
    ]);
    expect(originsOf('SHIP_CITY')).toEqual(['relational101.SHIP_CITY']);
    expect(originsOf('CARRIER')).toEqual(['relational102.CARRIER']);
  });

  test("Finds no table for a difference, which is no column's value, or for a column it doesn't have", () => {
    expect(originsOf('SHIP_VIA_valueDifference')).toEqual([]);
    expect(originsOf('SHIP_VIA')).toEqual([]);
  });
});
