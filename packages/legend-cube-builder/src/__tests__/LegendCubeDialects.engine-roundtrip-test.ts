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

import { beforeAll, describe, expect, test } from '@jest/globals';
import {
  Connection,
  Distinct,
  Drop,
  Limit,
  Query,
  type QueryNode,
  QueryEmitter,
  Restrict,
  Slice,
  Sort,
  SortDirection,
  printIR,
} from '@finos/legend-cube';
import { stringifyLosslessJSON } from '@finos/legend-shared';
import {
  CUBE_ENGINE_TEST__generatePlanSql,
  CUBE_ENGINE_TEST__getCommit,
} from '../__test-utils__/CubeEngineTestSupport.js';
import {
  northwindTable,
  ORDERS_COLUMNS,
} from '../__test-utils__/CubeNorthwindTestQueries.js';
import { V1_serializeCubeLambda } from '../graph-manager/protocol/pure/v1/V1_CubeLambdaSerializer.js';
import {
  CUBE_NORTHWIND_DATABASE,
  CUBE_NORTHWIND_MODEL_CODE,
} from '../stores/fixtures/CubeNorthwindModel.js';

// The database workarounds (PLAN §11.4) as each database's SQL, from plans
// only: nothing runs, so the connections are static, with test credentials,
// in a copy of the fixture model made for this test. Facts about the SQL's
// structure only, never its text.

/**
 * Every relational database type the engine plans with a static connection
 * (Databricks is its Spark dialect). Not DuckDB, whose plans fail to
 * serialize with a static connection (`Match failure` in
 * DevPlanTransformer), nor Aurora, whose plans fail with an HTTP 500: both
 * before any SQL, whatever the query.
 */
const DATABASE_TYPES = [
  'H2',
  'Postgres',
  'SqlServer',
  'Sybase',
  'SybaseIQ',
  'DB2',
  'MemSQL',
  'Spanner',
  'Snowflake',
  'Databricks',
  'Oracle',
  'Trino',
  'Presto',
  'Redshift',
  'Hive',
  'BigQuery',
  'Athena',
  'ClickHouse',
  'Composite',
];

const PLAN_MODEL = {
  _type: 'text',
  code: `${CUBE_NORTHWIND_MODEL_CODE}
###Connection
${DATABASE_TYPES.map(
  (type) => `RelationalDatabaseConnection test::plan::${type}Connection
{
  store: ${CUBE_NORTHWIND_DATABASE};
  type: ${type};
  specification: Static
  {
    name: 'db';
    host: 'host';
    port: 1234;
  };
  auth: Test;
}`,
).join('\n')}

###Runtime
${DATABASE_TYPES.map(
  (type) => `Runtime test::plan::${type}Runtime
{
  mappings:
  [
  ];
  connections:
  [
    ${CUBE_NORTHWIND_DATABASE}:
    [
      connection_1: test::plan::${type}Connection
    ]
  ];
}`,
).join('\n')}
`,
};

/** ORDERS, typed as the fixture types it, then the nodes, the last captured */
const ordersThen = (...nodes: QueryNode[]): Query => {
  const all = [
    northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
    ...nodes,
  ];
  return new Query(
    all,
    all
      .slice(1)
      .map(
        (node, index) =>
          new Connection((all[index] as QueryNode).id, node.id, 'tds'),
      ),
    all.at(-1)?.id,
  );
};

/**
 * Two keys: Sybase IQ (Drop, Slice, Limit) and MemSQL (Drop) number the rows
 * themselves, but by the first sort key only, so only a Sort on several
 * columns tells their native form from Cube's
 */
const byCustomerThenOrder = (): Sort =>
  new Sort('sort101', [
    { column: 'CUSTOMER_ID', direction: SortDirection.ASC },
    { column: 'ORDER_ID', direction: SortDirection.DESC },
  ]);

/** The order the rows are numbered in, `row_number() over (<this>)`, if they are */
const numberingOrder = (sql: string): string | undefined =>
  /row_number\(\) over \((?<order>[^)]*)\)/u.exec(sql)?.groups?.order;

/** Numbered by the two keys, in order */
const BY_CUSTOMER_THEN_ORDER = /customer_id[^,]*,[^,]*order_id[^,]* desc/u;

/** The SQL a run of the query would send to a database of the type */
const planSql = async (query: Query, databaseType: string): Promise<string> => {
  const lambda = new QueryEmitter(query).emitExecutionLambda({
    rowLimit: 1000,
    runtime: `test::plan::${databaseType}Runtime`,
    databaseType,
  });
  const sql = await CUBE_ENGINE_TEST__generatePlanSql(
    stringifyLosslessJSON({
      clientVersion: 'vX_X_X',
      function: V1_serializeCubeLambda(lambda),
      model: PLAN_MODEL,
      context: { _type: 'BaseExecutionContext' },
      parameterValues: [],
    }),
  );
  expect(sql.length).toBeGreaterThan(0);
  return sql.join('\n').replace(/\s+/gu, ' ').toLowerCase();
};

/**
 * The parenthesised subqueries of some SQL, each without the subqueries
 * inside it, so each can be judged alone
 */
const subqueries = (sql: string): string[] => {
  const found: string[] = [];
  const stack: { start: number; inner: [number, number][] }[] = [];
  for (let index = 0; index < sql.length; index += 1) {
    if (sql[index] === '(') {
      stack.push({ start: index, inner: [] });
    } else if (sql[index] === ')') {
      const open = stack.pop();
      if (open) {
        let text = '';
        let from = open.start + 1;
        open.inner.forEach(([start, end]) => {
          text += `${sql.slice(from, start)}(…)`;
          from = end + 1;
        });
        text += sql.slice(from, index);
        if (text.trimStart().startsWith('select')) {
          found.push(text);
        }
        stack.at(-1)?.inner.push([open.start, index]);
      }
    }
  }
  return found;
};

const SHAPES: [string, () => Query][] = [
  [
    'a sorted Drop',
    () => ordersThen(byCustomerThenOrder(), new Drop('drop101', 10)),
  ],
  ['a Drop', () => ordersThen(new Drop('drop101', 10))],
  [
    'a sorted Slice',
    () => ordersThen(byCustomerThenOrder(), new Slice('slice101', 10, 20)),
  ],
  ['a Slice', () => ordersThen(new Slice('slice101', 10, 20))],
  [
    'a Distinct',
    () =>
      ordersThen(
        new Restrict('restrict101', ['SHIP_COUNTRY']),
        new Distinct('distinct101'),
      ),
  ],
  [
    'a Distinct after a sorted Drop',
    () =>
      ordersThen(
        byCustomerThenOrder(),
        new Drop('drop101', 10),
        new Restrict('restrict101', ['SHIP_COUNTRY']),
        new Distinct('distinct101'),
      ),
  ],
  [
    'a sorted Limit',
    () => ordersThen(byCustomerThenOrder(), new Limit('limit101', 5)),
  ],
  ['a Sort that is run', () => ordersThen(byCustomerThenOrder())],
  [
    'a sorted Limit after a Limit',
    () =>
      ordersThen(
        byCustomerThenOrder(),
        new Limit('limit101', 20),
        new Limit('limit102', 5),
      ),
  ],
  [
    'a sorted Limit after a Drop',
    () =>
      ordersThen(
        byCustomerThenOrder(),
        new Drop('drop101', 10),
        new Limit('limit101', 5),
      ),
  ],
  [
    'a Distinct then a Limit',
    () =>
      ordersThen(
        new Restrict('restrict101', ['SHIP_COUNTRY']),
        new Distinct('distinct101'),
        new Limit('limit101', 5),
      ),
  ],
  [
    'a sorted Distinct then a Limit',
    () =>
      ordersThen(
        new Restrict('restrict101', ['CUSTOMER_ID', 'ORDER_ID']),
        new Distinct('distinct101'),
        byCustomerThenOrder(),
        new Limit('limit101', 5),
      ),
  ],
];

beforeAll(async () => {
  const commit = await CUBE_ENGINE_TEST__getCommit();
  process.stdout.write(`Legend Cube dialects: engine commit ${commit}\n`);
});

describe('Database workarounds, as each database plans them', () => {
  test.each(['SqlServer', 'Sybase', 'SybaseIQ'])(
    "Takes the rows of a Drop and a Slice by their numbers in the Sort's order on %s, never with limit m,n",
    async (databaseType) => {
      for (const [name, shape] of SHAPES.slice(0, 4)) {
        const sql = await planSql(shape(), databaseType);
        expect(sql).not.toMatch(/limit \d+ ?,/u);
        // by both keys when sorted, else by the first column that sorts
        expect(numberingOrder(sql)).toMatch(
          name.startsWith('a sorted') ? BY_CUSTOMER_THEN_ORDER : /order_id/u,
        );
      }
    },
  );

  test.each(['DB2', 'MemSQL', 'ClickHouse'])(
    "Takes the rows of a Drop by their numbers in the Sort's order on %s, and plans a Slice the native way",
    async (databaseType) => {
      const drop = await planSql(SHAPES[0]?.[1]() as Query, databaseType);
      expect(drop).not.toMatch(/limit \d+ ?, ?-1/u);
      expect(numberingOrder(drop)).toMatch(BY_CUSTOMER_THEN_ORDER);
      const slice = await planSql(SHAPES[2]?.[1]() as Query, databaseType);
      expect(slice).not.toContain('cube_rn');
    },
  );

  test.each(['Spanner', 'Postgres'])(
    'Plans every shape the native way on %s',
    async (databaseType) => {
      for (const [, shape] of SHAPES) {
        expect(
          printIR(
            new QueryEmitter(shape()).emitExecutionLambda({
              rowLimit: 1000,
              runtime: `test::plan::${databaseType}Runtime`,
              databaseType,
            }),
          ),
        ).not.toMatch(/rowNumber|cube_d/u);
        expect(await planSql(shape(), databaseType)).not.toContain(
          'row_number()',
        );
      }
    },
  );

  test.each(DATABASE_TYPES)(
    'Numbers the rows of every sorted shape by every key, and never inside a SELECT DISTINCT, on %s',
    async (databaseType) => {
      const problems: string[] = [];
      for (const [name, shape] of SHAPES) {
        const sql = await planSql(shape(), databaseType);
        // the engine's numbering, or Cube's: either way by both keys
        if (name.includes('sorted')) {
          for (const match of sql.matchAll(
            /row_number\(\) over \((?<order>[^)]*)\)/gu,
          )) {
            if (!BY_CUSTOMER_THEN_ORDER.test(match.groups?.order ?? '')) {
              problems.push(`${name}: numbered by ${match.groups?.order}`);
            }
          }
        }
        // ClickHouse's engine SQL runs a descending key into the offset
        if (/[a-z]offset \d/u.test(sql)) {
          problems.push(`${name}: an offset run into the word before it`);
        }
        // Sybase IQ's own limit rewrite numbers by the first key only, in a
        // column named row_number: Cube's row numbers replace it
        if (
          databaseType === 'SybaseIQ' &&
          sql.includes('limitoffset_via_window_subquery')
        ) {
          problems.push(`${name}: the engine's own limit numbering`);
        }
        // window functions run before DISTINCT, which then removes nothing
        subqueries(sql).forEach((subquery) => {
          if (
            subquery.includes('select distinct') &&
            subquery.includes('row_number(')
          ) {
            problems.push(`${name}: rows numbered in a SELECT DISTINCT`);
          }
        });
      }
      expect(problems).toEqual([]);
    },
  );

  test.each(SHAPES)(
    'Writes no TOP before DISTINCT, and no ORDER BY in a subquery without TOP or OFFSET, for %s on SqlServer',
    async (_, shape) => {
      const sql = await planSql(shape(), 'SqlServer');
      expect(sql).not.toMatch(/top \d+ distinct/u);
      subqueries(sql).forEach((subquery) => {
        if (subquery.includes('order by')) {
          expect(subquery).toMatch(/\btop\b|\boffset\b/u);
        }
      });
    },
  );
});
