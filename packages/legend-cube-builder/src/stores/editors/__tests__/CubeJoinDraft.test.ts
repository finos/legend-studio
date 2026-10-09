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
  Connection,
  Group,
  Join,
  JoinType,
  PRIMITIVE_TYPE_PATH,
  PrimitiveType,
  Query,
  Rename,
  Restrict,
  SchemaColumn,
} from '@finos/legend-cube';
import {
  CUSTOMERS_COLUMNS,
  NORTHWIND_DATABASE,
  northwindTable,
  ORDERS_COLUMNS,
  sliceQuery,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import { FAKE_NORTHWIND_OUTLINE } from '../../../__test-utils__/FakeCubeEngine.js';
import type { CubeModelOutline } from '../../../graph-manager/CubeEngine.js';
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
