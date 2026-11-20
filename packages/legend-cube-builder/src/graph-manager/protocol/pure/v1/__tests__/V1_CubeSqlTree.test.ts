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
import type { CubeSqlStep } from '../../../../CubeSqlStructure.js';
import {
  V1_CUBE_SQL_TREE_MESSAGE,
  V1_CubeSqlTreeError,
  V1_readCubeSqlTree,
} from '../V1_CubeSqlTree.js';
import TREES from '../../../../__tests__/CubeSqlTrees.json' with { type: 'json' };

// The engine's tree of an island's SQL, read into the steps its clauses are.
// The trees are the engine's own, of the SQL beside each
// (`V1_CubeSqlTree.engine-roundtrip-test.ts` checks them against it).

type TreeName = keyof typeof TREES;

/** A step on a line, the steps it reads under it: its kind, what it says, its alias and its columns */
const outlineOf = (step: CubeSqlStep, depth = 0): string =>
  [
    `${'  '.repeat(depth)}${step.kind}${step.variant ? `:${step.variant}` : ''}${
      step.text ? ` ${step.text}` : ''
    }${step.alias ? ` [as ${step.alias}]` : ''}${
      step.columns ? ` → ${step.columns.join(', ')}` : ''
    }`,
    ...step.inputs.map((input) => outlineOf(input, depth + 1)),
  ].join('\n');

const DRAWN: [TreeName, string][] = [
  [
    'star',
    `select * → *
  dataSet shop::ingest::OrdersIngest.ORDERS`,
  ],
  [
    'join-group-order-limit',
    `limit 10
  orderBy TOTAL_AMOUNT desc
    select c.REGION, sum(o.AMOUNT) as TOTAL_AMOUNT, count(*) as ORDERS → REGION, TOTAL_AMOUNT, ORDERS
      groupBy c.REGION
        where o.STATUS = 'ACTIVE'
          join:INNER on o.CUSTOMER_ID = c.CUSTOMER_ID
            dataSet shop::ingest::OrdersIngest.ORDERS [as o]
            dataSet shop::ingest::OrdersIngest.CUSTOMERS [as c]`,
  ],
  [
    'where-mixed',
    `select ORDER_ID → ORDER_ID
  where (STATUS in ('ACTIVE', 'HELD') or STATUS like 'P%') and AMOUNT between 10 and 500 and CUSTOMER_ID is not null and not (REGION = 'EMEA' or REGION is null)
    dataSet shop::ingest::OrdersIngest.ORDERS`,
  ],
  [
    'computed',
    `select ORDER_ID, (AMOUNT + 1) * 1.2 as GROSS, AMOUNT - (FEE - 1) as NET, -AMOUNT as NEGATIVE, upper(STATUS) as ST, case when AMOUNT > 100 then 'big' else 'small' end as SIZE, case STATUS when 'A' then 1 else 0 end as FLAG, coalesce(STATUS, 'it''s none') as S2, cast(AMOUNT as integer) as WHOLE, cast(AMOUNT as numeric(18, 2)) as FIXED, extract(year from ORDER_DATE) as YR, STATUS || '-x' as TAG → ORDER_ID, GROSS, NET, NEGATIVE, ST, SIZE, FLAG, S2, WHOLE, FIXED, YR, TAG
  dataSet shop::ingest::OrdersIngest.ORDERS`,
  ],
  [
    'having-distinct',
    `select:distinct CUSTOMER_ID, count(distinct STATUS) as STATUSES → CUSTOMER_ID, STATUSES
  having sum(AMOUNT) > 1000 and count(*) <> 1
    groupBy CUSTOMER_ID
      dataSet shop::ingest::OrdersIngest.ORDERS`,
  ],
  [
    'order-offset',
    `limit 10
  offset 20
    orderBy AMOUNT desc nulls last, ORDER_ID
      select ORDER_ID, AMOUNT → ORDER_ID, AMOUNT
        dataSet shop::ingest::OrdersIngest.ORDERS`,
  ],
  [
    'joins',
    `select o.ORDER_ID, c.CUSTOMER_NAME, p.TITLE → ORDER_ID, CUSTOMER_NAME, TITLE
  join:CROSS
    join:FULL using (PRODUCT_ID)
      join:LEFT on o.CUSTOMER_ID = c.CUSTOMER_ID and c.REGION <> 'NONE'
        dataSet shop::ingest::OrdersIngest.ORDERS [as o]
        dataSet shop::ingest::OrdersIngest.CUSTOMERS [as c]
      source:p shop::Product.products [as p]
    source:tb shop::Store.SALES.REGIONS [as r]`,
  ],
  [
    'right-join-comma',
    `select * → *
  join:CROSS
    join:RIGHT on o.CUSTOMER_ID = c.CUSTOMER_ID
      dataSet shop::ingest::OrdersIngest.ORDERS [as o]
      dataSet shop::ingest::OrdersIngest.CUSTOMERS [as c]
    source:table SALES.REGIONS`,
  ],
  [
    'var-let',
    `select REGION, sum(AMOUNT) as TOTAL_AMOUNT → REGION, TOTAL_AMOUNT
  groupBy REGION
    where a.ORDER_DATE > var('since')
      variable active [as a]`,
  ],
  [
    'func-csv-service',
    `select f.ORDER_ID → ORDER_ID
  join:INNER on s.ID = f.ORDER_ID
    join:INNER on f.ORDER_ID = c.a
      source:func shop::orders::ordersOver_Integer_1__Relation_1_, minimum => 100 [as f]
      source:csv a,b
1,2 [as c]
    source:service /orders [as s]`,
  ],
  [
    'subquery',
    `select t.STATUS, t.TOTAL → STATUS, TOTAL
  where t.TOTAL > 100
    named:subquery t
      select STATUS, sum(AMOUNT) as TOTAL → STATUS, TOTAL
        groupBy STATUS
          dataSet shop::ingest::OrdersIngest.ORDERS`,
  ],
  [
    'ctes',
    `select n.CUSTOMER_NAME, b.TOTAL → CUSTOMER_NAME, TOTAL
  join:INNER on b.CID = n.CUSTOMER_ID
    named:with big (CID, TOTAL) [as b]
      select * → *
        where TOTAL > 1000
          named:with totals
            select CUSTOMER_ID, sum(AMOUNT) as TOTAL → CUSTOMER_ID, TOTAL
              groupBy CUSTOMER_ID
                dataSet shop::ingest::OrdersIngest.ORDERS
    dataSet shop::ingest::OrdersIngest.CUSTOMERS [as n]`,
  ],
  [
    'union-all',
    `limit 5
  orderBy AMOUNT
    set:union all
      select ORDER_ID, AMOUNT → ORDER_ID, AMOUNT
        where STATUS = 'ACTIVE'
          dataSet shop::ingest::OrdersIngest.ORDERS
      select ORDER_ID, AMOUNT → ORDER_ID, AMOUNT
        dataSet shop::ingest::OrdersIngest.ARCHIVE`,
  ],
  [
    'except',
    `set:except
  select CUSTOMER_ID → CUSTOMER_ID
    dataSet shop::ingest::OrdersIngest.CUSTOMERS
  select CUSTOMER_ID → CUSTOMER_ID
    dataSet shop::ingest::OrdersIngest.ORDERS`,
  ],
  [
    'window',
    `select ORDER_ID, row_number() over (partition by CUSTOMER_ID order by AMOUNT desc) as RN, sum(AMOUNT) over (partition by CUSTOMER_ID) as CUSTOMER_TOTAL → ORDER_ID, RN, CUSTOMER_TOTAL
  dataSet shop::ingest::OrdersIngest.ORDERS`,
  ],
  ['no-from', `select 1 as ONE → ONE`],
];

const MESSAGES = V1_CUBE_SQL_TREE_MESSAGE;
const REFUSED: [TreeName, string][] = [
  ['in-subquery', MESSAGES.SUBQUERY],
  ['exists', MESSAGES.SUBQUERY],
  ['recursive', MESSAGES.RECURSIVE],
  ['window-frame', MESSAGES.UNKNOWN('windowFrame')],
  ['named-window', MESSAGES.WINDOWS],
];

describe("The engine's tree of an island's SQL, read into steps", () => {
  test('Every tree of the fixture is either drawn or refused here', () => {
    expect(
      [...DRAWN, ...REFUSED]
        .map(([name]) => name)
        .sort((a, b) => a.localeCompare(b)),
    ).toEqual(Object.keys(TREES).sort((a, b) => a.localeCompare(b)));
  });

  test.each(DRAWN)('Reads %s into its steps', (name, outline) => {
    expect(outlineOf(V1_readCubeSqlTree(TREES[name].tree))).toBe(outline);
  });

  test.each(REFUSED)(
    'Refuses %s, saying what it has no step for',
    (name, what) => {
      const read = (): CubeSqlStep => V1_readCubeSqlTree(TREES[name].tree);
      expect(read).toThrow(V1_CubeSqlTreeError);
      expect(read).toThrow(what);
    },
  );

  test("Refuses a tree that isn't the engine's, and what it doesn't know", () => {
    [undefined, 'select 1', [], {}, { _type: 'query' }].forEach((tree) =>
      expect(() => V1_readCubeSqlTree(tree)).toThrow(V1_CubeSqlTreeError),
    );
    expect(() =>
      V1_readCubeSqlTree({
        _type: 'query',
        queryBody: { _type: 'values', rows: [] },
      }),
    ).toThrow(MESSAGES.UNKNOWN('values'));
    const select = (expression: object): object => ({
      _type: 'querySpecification',
      from: [],
      select: {
        _type: 'select',
        selectItems: [{ _type: 'singleColumn', expression }],
      },
    });
    expect(() =>
      V1_readCubeSqlTree(select({ _type: 'currentTime', type: 'DATE' })),
    ).toThrow(MESSAGES.UNKNOWN('currentTime'));
    expect(() =>
      V1_readCubeSqlTree(
        select({
          _type: 'comparisonExpression',
          operator: 'SOUNDS_LIKE',
          left: { _type: 'nullLiteral' },
          right: { _type: 'nullLiteral' },
        }),
      ),
    ).toThrow(MESSAGES.UNKNOWN('SOUNDS_LIKE'));
  });
});
