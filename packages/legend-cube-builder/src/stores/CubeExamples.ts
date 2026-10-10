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

import {
  AggregationFunction,
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
  Connection,
  CubeDocument,
  Filter,
  FilterOperator,
  Group,
  Join,
  JoinType,
  Limit,
  type ModelContext,
  Query,
  type QueryNode,
  Rename,
  RelationalTableSource,
  Restrict,
  Sort,
  SortDirection,
} from '@finos/legend-cube';
import {
  CUBE_NORTHWIND_DATABASE,
  CUBE_NORTHWIND_MODEL,
  CUBE_NORTHWIND_RUNTIME,
} from './fixtures/CubeNorthwindModel.js';
import {
  CUBE_SPORTS_DATABASE,
  CUBE_SPORTS_MODEL,
  CUBE_SPORTS_RUNTIME,
  CUBE_SPORTS_SCHEMA,
} from './fixtures/CubeSportsModel.js';
import {
  CUBE_TRADES_DATABASE,
  CUBE_TRADES_MODEL,
  CUBE_TRADES_RUNTIME,
  CUBE_TRADES_SCHEMA,
} from './fixtures/CubeTradesModel.js';

// The example cubes the source dialog opens (PLAN §6.9): two over each
// bundled model. Each is built here rather than saved, so it has no schema
// snapshot to keep up to date: its tables are typed when it opens, like an
// imported cube's.

export interface CubeExample {
  readonly id: string;
  /** The id of the dataset it reads */
  readonly dataset: string;
  readonly name: string;
  /** One line on what it shows */
  readonly description: string;
  /** A new cube, ready to open */
  createDocument(): CubeDocument;
}

/** A bundled model the examples read: a new cube can start on it too */
export interface CubeExampleDataset {
  readonly id: string;
  readonly name: string;
  /** One line on what it holds */
  readonly description: string;
  /** Its tables, as the Model tab lists them */
  readonly tables: readonly string[];
  readonly model: ModelContext;
  readonly runtime: string;
  readonly database: string;
  readonly schema: string;
}

const NORTHWIND: CubeExampleDataset = {
  id: 'northwind',
  name: 'Northwind',
  description:
    'A small trading company: its orders, customers, products and employees',
  tables: ['ORDERS', 'CUSTOMERS', 'PRODUCTS', 'CATEGORIES', 'EMPLOYEES', '…'],
  model: CUBE_NORTHWIND_MODEL,
  runtime: CUBE_NORTHWIND_RUNTIME,
  database: CUBE_NORTHWIND_DATABASE,
  schema: 'NORTHWIND',
};
const SPORTS: CubeExampleDataset = {
  id: 'sports',
  name: 'Sports',
  description:
    'Made-up events of 2025 in ten sports, with viewers and attendance by region',
  tables: ['EVENTS', 'SPORTS'],
  model: CUBE_SPORTS_MODEL,
  runtime: CUBE_SPORTS_RUNTIME,
  database: CUBE_SPORTS_DATABASE,
  schema: CUBE_SPORTS_SCHEMA,
};
const TRADES: CubeExampleDataset = {
  id: 'trades',
  name: 'Trades',
  description:
    'Made-up trades of the first half of 2026 by six desks, with dollar notionals',
  tables: ['TRADES', 'DESKS', 'INSTRUMENTS'],
  model: CUBE_TRADES_MODEL,
  runtime: CUBE_TRADES_RUNTIME,
  database: CUBE_TRADES_DATABASE,
  schema: CUBE_TRADES_SCHEMA,
};

/** The datasets, in the order the examples show them */
export const CUBE_EXAMPLE_DATASETS: readonly CubeExampleDataset[] =
  Object.freeze([NORTHWIND, SPORTS, TRADES]);

/**
 * A cube over the model: the nodes in order, each after the one before it
 * unless the connections say otherwise, with the last one selected
 */
const example = (
  model: CubeExampleDataset,
  id: string,
  name: string,
  description: string,
  build: (table: (id: string, name: string) => RelationalTableSource) => {
    nodes: QueryNode[];
    connections: Connection[];
  },
): CubeExample => ({
  id,
  dataset: model.id,
  name,
  description,
  createDocument: () => {
    const { nodes, connections } = build(
      (sourceId, table) =>
        new RelationalTableSource(sourceId, {
          database: model.database,
          schema: model.schema,
          table,
        }),
    );
    return new CubeDocument({
      name,
      context: { model: model.model, runtime: model.runtime },
      query: new Query(nodes, connections, nodes.at(-1)?.id),
    });
  },
});

/** Connections that feed each node after the first one into the next */
const chain = (ids: readonly string[]): Connection[] =>
  ids.slice(1).map((id, index) => new Connection(ids[index] ?? '', id, 'tds'));

const equal = (column: string, value: string): ColumnComparisonFilter =>
  new ColumnComparisonFilter(column, FilterOperator.EQUAL, {
    kind: 'string',
    value,
  });

export const CUBE_EXAMPLES: readonly CubeExample[] = Object.freeze([
  example(
    NORTHWIND,
    'northwind-top-customers',
    'Top customers by orders',
    'Joins orders to customers, counts each customer’s orders, keeps the ten with most',
    (table) => ({
      nodes: [
        table('relational101', 'ORDERS'),
        table('relational102', 'CUSTOMERS'),
        new Rename('rename101', [{ from: 'CUSTOMER_ID', to: 'CUSTOMER' }]),
        new Join('join101', {
          leftColumns: ['CUSTOMER_ID'],
          rightColumns: ['CUSTOMER'],
          joinType: JoinType.INNER,
        }),
        new Group(
          'group101',
          ['COMPANY_NAME', 'COUNTRY'],
          [
            {
              column: undefined,
              function: AggregationFunction.COUNT_ROWS,
              name: 'ORDER_COUNT',
            },
          ],
        ),
        new Sort('sort101', [
          { column: 'ORDER_COUNT', direction: SortDirection.DESC },
          { column: 'COMPANY_NAME', direction: SortDirection.ASC },
        ]),
        new Limit('limit101', 10),
      ],
      connections: [
        new Connection('relational102', 'rename101', 'tds'),
        new Connection('relational101', 'join101', 'leftTds'),
        new Connection('rename101', 'join101', 'rightTds'),
        ...chain(['join101', 'group101', 'sort101', 'limit101']),
      ],
    }),
  ),
  example(
    NORTHWIND,
    'northwind-stock-by-category',
    'Products in stock by category',
    'Joins products to their categories, then counts the products and units in stock of each',
    (table) => ({
      nodes: [
        table('relational101', 'PRODUCTS'),
        table('relational102', 'CATEGORIES'),
        new Rename('rename101', [{ from: 'CATEGORY_ID', to: 'CATEGORY' }]),
        new Join('join101', {
          leftColumns: ['CATEGORY_ID'],
          rightColumns: ['CATEGORY'],
          joinType: JoinType.INNER,
        }),
        new Group(
          'group101',
          ['CATEGORY_NAME'],
          [
            {
              column: undefined,
              function: AggregationFunction.COUNT_ROWS,
              name: 'PRODUCT_COUNT',
            },
            {
              column: 'UNITS_IN_STOCK',
              function: AggregationFunction.SUM,
              name: 'UNITS',
            },
          ],
        ),
        new Sort('sort101', [
          { column: 'UNITS', direction: SortDirection.DESC },
        ]),
      ],
      connections: [
        new Connection('relational102', 'rename101', 'tds'),
        new Connection('relational101', 'join101', 'leftTds'),
        new Connection('rename101', 'join101', 'rightTds'),
        ...chain(['join101', 'group101', 'sort101']),
      ],
    }),
  ),
  example(
    SPORTS,
    'sports-top-watched',
    'Top watched sports',
    'Joins events to their sports, then adds up each sport’s viewers',
    (table) => ({
      nodes: [
        table('relational101', 'EVENTS'),
        table('relational102', 'SPORTS'),
        new Join('join101', {
          leftColumns: ['SPORT_ID'],
          rightColumns: ['ID'],
          joinType: JoinType.INNER,
        }),
        new Group(
          'group101',
          ['SPORT'],
          [
            {
              column: 'VIEWERS',
              function: AggregationFunction.SUM,
              name: 'TOTAL_VIEWERS',
            },
            {
              column: undefined,
              function: AggregationFunction.COUNT_ROWS,
              name: 'EVENT_COUNT',
            },
          ],
        ),
        new Sort('sort101', [
          { column: 'TOTAL_VIEWERS', direction: SortDirection.DESC },
        ]),
      ],
      connections: [
        new Connection('relational101', 'join101', 'leftTds'),
        new Connection('relational102', 'join101', 'rightTds'),
        ...chain(['join101', 'group101', 'sort101']),
      ],
    }),
  ),
  example(
    SPORTS,
    'sports-europe-finals',
    'Most watched finals in Europe',
    'Filters the events to European finals and keeps the ten most watched',
    (table) => ({
      nodes: [
        table('relational101', 'EVENTS'),
        new Filter(
          'filter101',
          new CompositeFilter(CompositeFilterOperator.AND, [
            equal('STAGE', 'Final'),
            equal('REGION', 'Europe'),
          ]),
        ),
        new Sort('sort101', [
          { column: 'VIEWERS', direction: SortDirection.DESC },
        ]),
        new Limit('limit101', 10),
      ],
      connections: chain(['relational101', 'filter101', 'sort101', 'limit101']),
    }),
  ),
  example(
    TRADES,
    'trades-notional-by-desk',
    'Notional by desk and asset class',
    'Joins trades to their desks and instruments, then adds up the dollar notional of each desk and asset class',
    (table) => ({
      nodes: [
        table('relational101', 'TRADES'),
        table('relational102', 'DESKS'),
        new Join('join101', {
          leftColumns: ['DESK_ID'],
          rightColumns: ['ID'],
          joinType: JoinType.INNER,
        }),
        table('relational103', 'INSTRUMENTS'),
        new Rename('rename101', [{ from: 'ID', to: 'INSTRUMENT_KEY' }]),
        new Join('join102', {
          leftColumns: ['INSTRUMENT_ID'],
          rightColumns: ['INSTRUMENT_KEY'],
          joinType: JoinType.INNER,
        }),
        new Group(
          'group101',
          ['DESK', 'ASSET_CLASS'],
          [
            {
              column: 'NOTIONAL_USD',
              function: AggregationFunction.SUM,
              name: 'TOTAL_NOTIONAL_USD',
            },
            {
              column: undefined,
              function: AggregationFunction.COUNT_ROWS,
              name: 'TRADE_COUNT',
            },
          ],
        ),
        new Sort('sort101', [
          { column: 'DESK', direction: SortDirection.ASC },
          { column: 'TOTAL_NOTIONAL_USD', direction: SortDirection.DESC },
        ]),
      ],
      connections: [
        new Connection('relational101', 'join101', 'leftTds'),
        new Connection('relational102', 'join101', 'rightTds'),
        new Connection('relational103', 'rename101', 'tds'),
        new Connection('join101', 'join102', 'leftTds'),
        new Connection('rename101', 'join102', 'rightTds'),
        ...chain(['join102', 'group101', 'sort101']),
      ],
    }),
  ),
  example(
    TRADES,
    'trades-largest-buys',
    'Largest buys',
    'Filters the trades to buys and keeps the twenty largest by dollar notional',
    (table) => ({
      nodes: [
        table('relational101', 'TRADES'),
        new Filter('filter101', equal('SIDE', 'BUY')),
        new Sort('sort101', [
          { column: 'NOTIONAL_USD', direction: SortDirection.DESC },
        ]),
        new Limit('limit101', 20),
        new Restrict('restrict101', [
          'TRADE_ID',
          'TRADE_DATE',
          'INSTRUMENT_ID',
          'QUANTITY',
          'PRICE',
          'NOTIONAL_USD',
        ]),
      ],
      connections: chain([
        'relational101',
        'filter101',
        'sort101',
        'limit101',
        'restrict101',
      ]),
    }),
  ),
]);
