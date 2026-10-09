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
  AggregationFunction,
  type ColumnAggregation,
  ColumnComparisonFilter,
  Concat,
  Connection,
  Distinct,
  Drop,
  Filter,
  FilterOperator,
  Group,
  Limit,
  printIR,
  Query,
  QueryEmitter,
  type QueryNode,
  Rename,
  Restrict,
  Slice,
  Sort,
  SortDirection,
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

/**
 * ORDERS through the first nodes and a second ORDERS through the second,
 * concatenated by concat101 (its First and Second), then the nodes after it,
 * the last captured
 */
const concatThen = (
  first: readonly QueryNode[],
  second: readonly QueryNode[],
  ...after: QueryNode[]
): Query => {
  const arms = [
    [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS), ...first],
    [northwindTable('relational102', 'ORDERS', ORDERS_COLUMNS), ...second],
  ];
  const concat = new Concat('concat101');
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
  const nodes = [concat, ...after];
  return new Query(
    [...arms.flat(), ...nodes],
    [
      ...arms.flatMap(chain),
      ...arms.map(
        (arm, side) =>
          new Connection(
            (arm.at(-1) as QueryNode).id,
            concat.id,
            concat.ports[side] as string,
          ),
      ),
      ...chain(nodes),
    ],
    nodes.at(-1)?.id,
  );
};

/** CUSTOMER_ID and ORDER_ID, the keys `byCustomerThenOrder` sorts by */
const customerAndOrder = (id: string): Restrict =>
  new Restrict(id, ['CUSTOMER_ID', 'ORDER_ID']);

/** The second input's sort, by the same keys under another id */
const byCustomerThenOrder2 = (): Sort =>
  new Sort('sort102', [
    { column: 'CUSTOMER_ID', direction: SortDirection.ASC },
    { column: 'ORDER_ID', direction: SortDirection.DESC },
  ]);

const aggregation = (
  fn: AggregationFunction,
  column: string | undefined,
  name: string,
): ColumnAggregation => ({ column, function: fn, name });

/** A Group by SHIP_COUNTRY counting its rows */
const countriesGroup = (): Group =>
  new Group(
    'group101',
    ['SHIP_COUNTRY'],
    [aggregation(AggregationFunction.COUNT_ROWS, undefined, 'n')],
  );

/** A Group by SHIP_COUNTRY with a reduce of each kind */
const everyReduceGroup = (): Group =>
  new Group(
    'group101',
    ['SHIP_COUNTRY'],
    [
      aggregation(AggregationFunction.COUNT_ROWS, undefined, 'n'),
      aggregation(
        AggregationFunction.DISTINCT_COUNT,
        'CUSTOMER_ID',
        'customers',
      ),
      aggregation(AggregationFunction.AVERAGE, 'ORDER_ID', 'average'),
      aggregation(AggregationFunction.DISTINCT_VALUE, 'SHIP_REGION', 'region'),
    ],
  );

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
  ['a Group with every reduce', () => ordersThen(everyReduceGroup())],
  [
    'a Group of all the rows',
    () =>
      ordersThen(
        new Group(
          'group101',
          [],
          [aggregation(AggregationFunction.COUNT_ROWS, undefined, 'n')],
        ),
      ),
  ],
  [
    'a Group after a sorted Limit',
    () =>
      ordersThen(
        byCustomerThenOrder(),
        new Limit('limit101', 50),
        countriesGroup(),
      ),
  ],
  [
    'a Limit after a Group',
    () => ordersThen(countriesGroup(), new Limit('limit101', 5)),
  ],
  [
    'a Distinct before a Group',
    () =>
      ordersThen(
        new Restrict('restrict101', ['SHIP_CITY', 'SHIP_COUNTRY']),
        new Distinct('distinct101'),
        countriesGroup(),
      ),
  ],
  [
    'a Filter after a Group',
    () =>
      ordersThen(
        countriesGroup(),
        new Filter(
          'filter101',
          new ColumnComparisonFilter('n', FilterOperator.GREATER_THAN, {
            kind: 'integer',
            value: '5',
          }),
        ),
      ),
  ],
  [
    'a Concat',
    () =>
      concatThen(
        [customerAndOrder('restrict101')],
        [customerAndOrder('restrict102')],
      ),
  ],
  [
    'a Concat of sorted Limits',
    () =>
      concatThen(
        [
          customerAndOrder('restrict101'),
          byCustomerThenOrder(),
          new Limit('limit101', 5),
        ],
        [
          customerAndOrder('restrict102'),
          byCustomerThenOrder2(),
          new Limit('limit102', 5),
        ],
      ),
  ],
  [
    'a Concat of a sorted Drop',
    () =>
      concatThen(
        [
          customerAndOrder('restrict101'),
          byCustomerThenOrder(),
          new Drop('drop101', 10),
        ],
        [customerAndOrder('restrict102')],
      ),
  ],
  [
    'a Limit after a Concat',
    () =>
      concatThen(
        [customerAndOrder('restrict101')],
        [customerAndOrder('restrict102')],
        new Limit('limit101', 5),
      ),
  ],
  [
    'a Group after a Concat',
    () =>
      concatThen(
        [customerAndOrder('restrict101')],
        [customerAndOrder('restrict102')],
        new Group(
          'group101',
          ['CUSTOMER_ID'],
          [aggregation(AggregationFunction.COUNT_ROWS, undefined, 'n')],
        ),
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

  test.each(DATABASE_TYPES)(
    "Writes a Group's reduces as count(distinct …), avg(1.0 * …), count(1) and a case for Distinct Value, on %s",
    async (databaseType) => {
      const sql = await planSql(
        (
          SHAPES.find(
            ([label]) => label === 'a Group with every reduce',
          )?.[1] as () => Query
        )(),
        databaseType,
      );
      expect(sql).toContain('count(distinct');
      expect(sql).toContain('avg(1.0 *');
      expect(sql).toContain('count(1)');
      expect(sql).toMatch(/case when count\(distinct/u);
    },
  );

  test.each(DATABASE_TYPES)(
    'Turns a Filter after a Group into HAVING, its aggregate inlined, on %s',
    async (databaseType) => {
      expect(
        await planSql(
          (
            SHAPES.find(
              ([label]) => label === 'a Filter after a Group',
            )?.[1] as () => Query
          )(),
          databaseType,
        ),
      ).toMatch(/having count\(1\) > 5/u);
    },
  );

  test.each(DATABASE_TYPES)(
    'Keeps a Distinct before a Group as a select distinct subquery, on %s',
    async (databaseType) => {
      const sql = await planSql(
        (
          SHAPES.find(
            ([label]) => label === 'a Distinct before a Group',
          )?.[1] as () => Query
        )(),
        databaseType,
      );
      expect(
        subqueries(sql).some((subquery) =>
          subquery.includes('select distinct'),
        ),
      ).toBe(true);
    },
  );

  test.each(['SqlServer', 'Sybase'])(
    'Writes no ORDER BY in a subquery under a GROUP BY without its own TOP, on %s',
    async (databaseType) => {
      const sql = await planSql(
        (
          SHAPES.find(
            ([label]) => label === 'a Group after a sorted Limit',
          )?.[1] as () => Query
        )(),
        databaseType,
      );
      subqueries(sql).forEach((subquery) => {
        if (subquery.includes('order by')) {
          expect(subquery).toMatch(/\btop\b|\boffset\b/u);
        }
      });
    },
  );

  test("Takes a Limit after a Group by Cube's row numbers on Sybase IQ, never its own", async () => {
    const sql = await planSql(
      (
        SHAPES.find(
          ([label]) => label === 'a Limit after a Group',
        )?.[1] as () => Query
      )(),
      'SybaseIQ',
    );
    expect(sql).toContain('row_number()');
    expect(sql).not.toContain('limitoffset_via_window_subquery');
  });

  // After SHIP_COUNTRY is renamed away and SHIP_CITY renamed to SHIP_COUNTRY, a
  // Group by SHIP_COUNTRY must group by the cities. Some databases are written
  // GROUP BY the alias while the subquery still has the table's SHIP_COUNTRY
  // column (ISSUES: the alias shadow); which read it as the column is
  // inferred, never run. Pinned so a change in the engine shows.
  const GROUP_BY_AFTER_TWO_RENAMES: Readonly<Record<string, string>> = {
    H2: 'alias',
    Postgres: 'position',
    SqlServer: 'expression',
    Sybase: 'expression',
    SybaseIQ: 'alias',
    DB2: 'expression',
    MemSQL: 'alias',
    Spanner: 'alias',
    Snowflake: 'position',
    Databricks: 'expression',
    Oracle: 'expression',
    Trino: 'expression',
    Presto: 'expression',
    Redshift: 'alias',
    Hive: 'alias',
    BigQuery: 'alias',
    Athena: 'expression',
    ClickHouse: 'alias',
    Composite: 'alias',
  };

  test.each(DATABASE_TYPES)(
    'Groups after two Renames as the engine writes it for %s: by the expression, the position or the alias',
    async (databaseType) => {
      const sql = await planSql(
        ordersThen(
          new Rename('rename101', [{ from: 'SHIP_COUNTRY', to: 'X' }]),
          new Rename('rename102', [{ from: 'SHIP_CITY', to: 'SHIP_COUNTRY' }]),
          new Group(
            'group101',
            ['SHIP_COUNTRY'],
            [aggregation(AggregationFunction.COUNT, 'ORDER_ID', 'n')],
          ),
        ),
        databaseType,
      );
      const target =
        /group by (?<target>[^ ]+)/u.exec(sql)?.groups?.target ?? '';
      const kind =
        target === '1'
          ? 'position'
          : /ship_city/u.test(target)
            ? 'expression'
            : /ship_country/u.test(target)
              ? 'alias'
              : target;
      expect([databaseType, kind]).toEqual([
        databaseType,
        GROUP_BY_AFTER_TWO_RENAMES[databaseType],
      ]);
    },
  );
  /** Five rows, as each database takes them: TOP, LIMIT, FETCH FIRST, or Cube's row numbers on Sybase IQ */
  const FIVE_ROWS =
    /\btop 5\b|\blimit 5\b|fetch first 5 rows only|cube_rn["`]? <= 5/gu;

  const shapeNamed = (label: string): Query =>
    (SHAPES.find(([name]) => name === label)?.[1] as () => Query)();

  /** The subquery that concatenates, without the subqueries inside it */
  const unionOf = (sql: string): string | undefined =>
    subqueries(sql).find((subquery) => subquery.includes('union all'));

  test.each(DATABASE_TYPES)(
    'Writes a Concat as one UNION ALL of its two inputs, on %s',
    async (databaseType) => {
      const sql = await planSql(shapeNamed('a Concat'), databaseType);
      expect(sql.match(/\bunion\b/gu)).toEqual(['union']);
      expect(sql).toContain('union all');
    },
  );

  test.each(DATABASE_TYPES)(
    "Keeps each input's Sort and Limit in a subquery of its own, under the UNION ALL, on %s",
    async (databaseType) => {
      const sql = await planSql(
        shapeNamed('a Concat of sorted Limits'),
        databaseType,
      );
      expect(sql.match(/\bunion\b/gu)).toEqual(['union']);
      expect(sql.match(FIVE_ROWS)).toHaveLength(2);
      // an ORDER BY only beside its own five rows, never on the union
      subqueries(sql).forEach((subquery) => {
        if (subquery.includes('order by')) {
          expect(subquery).toMatch(FIVE_ROWS);
        }
      });
      expect(unionOf(sql)).not.toContain('order by');
    },
  );

  test.each(DATABASE_TYPES)(
    'Takes the rows of a Limit after a Concat from the whole union, on %s',
    async (databaseType) => {
      const sql = await planSql(
        shapeNamed('a Limit after a Concat'),
        databaseType,
      );
      expect(sql.match(FIVE_ROWS)).toHaveLength(1);
      expect(unionOf(sql)).not.toMatch(FIVE_ROWS);
    },
  );

  test.each(DATABASE_TYPES)(
    'Groups the rows of both inputs after a Concat, outside the union, on %s',
    async (databaseType) => {
      const sql = await planSql(
        shapeNamed('a Group after a Concat'),
        databaseType,
      );
      expect(sql).toContain('group by');
      expect(unionOf(sql)).not.toContain('group by');
    },
  );
});
