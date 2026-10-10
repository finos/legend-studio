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
  CUBE_DIALECT_WORKAROUNDS,
  Distinct,
  Drop,
  Filter,
  FilterOperator,
  Group,
  Limit,
  Partition,
  printIR,
  Query,
  QueryEmitter,
  type QueryNode,
  Rename,
  Restrict,
  Slice,
  Sort,
  SortDirection,
  WindowRankFunction,
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
 * before any SQL, whatever the query. The model gives DuckDB its own
 * specification for the window shapes (`WINDOW_DATABASE_TYPES`).
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

/** The database types that refuse any window column (PLAN §11.6) */
const WINDOW_REFUSING_DATABASE_TYPES = ['Spanner', 'Presto', 'Composite'];

/**
 * The database types that plan window columns: the others, and DuckDB, whose
 * plans serialize with its own specification, an in-memory database. DuckDB
 * plans every shape above too, but isn't among DATABASE_TYPES, as the Group
 * after two Renames would need a pin of its own.
 */
const WINDOW_DATABASE_TYPES = [
  ...DATABASE_TYPES.filter(
    (type) => !WINDOW_REFUSING_DATABASE_TYPES.includes(type),
  ),
  'DuckDB',
];

/** A connection's specification: DuckDB's own, every other a static one */
const specificationOf = (type: string): string =>
  type === 'DuckDB'
    ? `DuckDB
  {
    path: '';
  }`
    : `Static
  {
    name: 'db';
    host: 'host';
    port: 1234;
  }`;

const PLANNED_DATABASE_TYPES = [...DATABASE_TYPES, 'DuckDB'];

const PLAN_MODEL = {
  _type: 'text',
  code: `${CUBE_NORTHWIND_MODEL_CODE}
###Connection
${PLANNED_DATABASE_TYPES.map(
  (type) => `RelationalDatabaseConnection test::plan::${type}Connection
{
  store: ${CUBE_NORTHWIND_DATABASE};
  type: ${type};
  specification: ${specificationOf(type)};
  auth: Test;
}`,
).join('\n')}

###Runtime
${PLANNED_DATABASE_TYPES.map(
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

/** An ORDER BY by the two keys, in order: a sort's, or the over clause of row numbers */
const SORTED_BY_BOTH_KEYS =
  /order by [^,)]*customer_id[^,]*,[^,)]*order_id[^,)]* desc/u;

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
 * concatenated by concat101 (its First and Second), converting types or not,
 * then the nodes after it, the last captured
 */
const concatThenWith = (
  widenTypes: boolean,
  first: readonly QueryNode[],
  second: readonly QueryNode[],
  ...after: QueryNode[]
): Query => {
  const arms = [
    [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS), ...first],
    [northwindTable('relational102', 'ORDERS', ORDERS_COLUMNS), ...second],
  ];
  const concat = new Concat('concat101', widenTypes);
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

/** Types must match */
const concatThen = (
  first: readonly QueryNode[],
  second: readonly QueryNode[],
  ...after: QueryNode[]
): Query => concatThenWith(false, first, second, ...after);

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
  [
    // Convert types (M4.13, PLAN §11.5, Q5): SmallInt with Double gives
    // Number, Varchar(40) with Varchar(15) String, cast in both inputs
    'a Concat that converts types',
    () =>
      concatThenWith(
        true,
        [new Restrict('restrict101', ['ORDER_ID', 'SHIP_NAME'])],
        [
          new Restrict('restrict102', ['FREIGHT', 'SHIP_CITY']),
          new Rename('rename102', [
            { from: 'FREIGHT', to: 'ORDER_ID' },
            { from: 'SHIP_CITY', to: 'SHIP_NAME' },
          ]),
        ],
      ),
  ],
  [
    'a Sort after a Concat',
    () =>
      concatThen(
        [customerAndOrder('restrict101')],
        [customerAndOrder('restrict102')],
        byCustomerThenOrder(),
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
          // the sort is there, by both keys: an ORDER BY, or the over
          // clause of Cube's row numbers
          if (!SORTED_BY_BOTH_KEYS.test(sql)) {
            problems.push(`${name}: no ORDER BY by both keys`);
          }
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
      // each input still sorted by its keys
      expect(
        sql.match(new RegExp(SORTED_BY_BOTH_KEYS.source, 'gu')),
      ).toHaveLength(2);
    },
  );

  test.each(DATABASE_TYPES)(
    'Orders the rows of a Sort after a Concat outside the union, on %s',
    async (databaseType) => {
      const sql = await planSql(
        shapeNamed('a Sort after a Concat'),
        databaseType,
      );
      expect(sql.match(/\bunion\b/gu)).toEqual(['union']);
      expect(unionOf(sql)).not.toContain('order by');
      expect(sql).toMatch(SORTED_BY_BOTH_KEYS);
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

  /**
   * The databases whose SQL casts a column of a Concat that converts types:
   * none, as the casts are type-only (PLAN §11.5, Q5). Pinned so a change in
   * the engine shows.
   */
  const CASTS_A_CONVERTED_COLUMN: readonly string[] = [];

  test.each(DATABASE_TYPES)(
    'Writes a Concat that converts types as one UNION ALL of its two inputs, with no SQL cast, on %s',
    async (databaseType) => {
      const sql = await planSql(
        shapeNamed('a Concat that converts types'),
        databaseType,
      );
      expect(sql.match(/\bunion\b/gu)).toEqual(['union']);
      expect(sql).toContain('union all');
      expect([databaseType, /\bcast\s*\(/u.test(sql)]).toEqual([
        databaseType,
        CASTS_A_CONVERTED_COLUMN.includes(databaseType),
      ]);
    },
  );
});

// Partition around the databases (PLAN §11.6, M5.10): Cube's window shapes,
// in their own list, as Spanner, Presto and Composite refuse any window and
// every loop over SHAPES runs on them. A Partition that isn't the capture is
// bound with a let, so its rows go through a WITH.

/** A window function: a column's, or a rank's, which takes none */
const windowFunction = (
  fn: string,
  column: string | undefined,
  name: string,
): ColumnAggregation => ({ column, function: fn, name });

/** A window's sort key, ascending unless told */
const by = (
  column: string,
  direction = SortDirection.ASC,
): { column: string; direction: SortDirection } => ({ column, direction });

/** Each country's rows, counted on each of them as `n` */
const countByCountry = (): Partition =>
  new Partition(
    'partition101',
    ['SHIP_COUNTRY'],
    [],
    [windowFunction(AggregationFunction.COUNT_ROWS, undefined, 'n')],
  );

/** Each customer's rows, counted on each of them as `n` */
const countByCustomer = (): Partition =>
  new Partition(
    'partition101',
    ['CUSTOMER_ID'],
    [],
    [windowFunction(AggregationFunction.COUNT_ROWS, undefined, 'n')],
  );

const greaterThan = (column: string, value: string): Filter =>
  new Filter(
    'filter101',
    new ColumnComparisonFilter(column, FilterOperator.GREATER_THAN, {
      kind: 'integer',
      value,
    }),
  );

/** Distinct Count of CUSTOMER_ID and Distinct Value of SHIP_REGION by country, by ORDER_DATE or not */
const distinctByCountry = (
  sorts: { column: string; direction: SortDirection }[],
): Partition =>
  new Partition('partition101', ['SHIP_COUNTRY'], sorts, [
    windowFunction(AggregationFunction.DISTINCT_COUNT, 'CUSTOMER_ID', 'dc'),
    windowFunction(AggregationFunction.DISTINCT_VALUE, 'SHIP_REGION', 'dv'),
  ]);

const WINDOW_SHAPES: [string, () => Query][] = [
  [
    'a sorted Partition with a Sum and an Average',
    () =>
      ordersThen(
        new Partition(
          'partition101',
          ['SHIP_COUNTRY'],
          [by('ORDER_DATE')],
          [
            windowFunction(AggregationFunction.SUM, 'EMPLOYEE_ID', 's'),
            windowFunction(AggregationFunction.AVERAGE, 'EMPLOYEE_ID', 'a'),
          ],
        ),
      ),
  ],
  [
    'a Partition with a Rank, a Dense Rank and a Row Number',
    () =>
      ordersThen(
        new Partition(
          'partition101',
          ['SHIP_COUNTRY'],
          [by('ORDER_DATE')],
          [
            windowFunction(WindowRankFunction.RANK, undefined, 'rk'),
            windowFunction(WindowRankFunction.DENSE_RANK, undefined, 'drk'),
            windowFunction(WindowRankFunction.ROW_NUMBER, undefined, 'rn'),
          ],
        ),
      ),
  ],
  [
    'a Partition with a Count and a Count Rows',
    () =>
      ordersThen(
        new Partition(
          'partition101',
          ['SHIP_COUNTRY'],
          [],
          [
            windowFunction(AggregationFunction.COUNT, 'SHIP_REGION', 'c'),
            windowFunction(AggregationFunction.COUNT_ROWS, undefined, 'n'),
          ],
        ),
      ),
  ],
  [
    'a sorted Partition with a Distinct Count and a Distinct Value',
    () => ordersThen(distinctByCountry([by('ORDER_DATE')])),
  ],
  [
    'a Partition with a Distinct Count and a Distinct Value',
    () => ordersThen(distinctByCountry([])),
  ],
  [
    'a Partition with no partition column',
    () =>
      ordersThen(
        new Partition(
          'partition101',
          [],
          [by('ORDER_DATE')],
          [windowFunction(AggregationFunction.SUM, 'EMPLOYEE_ID', 's')],
        ),
      ),
  ],
  [
    'a Partition with no partition column and no sort',
    () =>
      ordersThen(
        new Partition(
          'partition101',
          [],
          [],
          [windowFunction(AggregationFunction.SUM, 'EMPLOYEE_ID', 's')],
        ),
      ),
  ],
  [
    'a Filter on a window column after a Partition',
    () => ordersThen(countByCountry(), greaterThan('n', '100')),
  ],
  [
    'a Filter on an input column after a Partition',
    () =>
      ordersThen(
        countByCountry(),
        new Filter(
          'filter101',
          new ColumnComparisonFilter('SHIP_COUNTRY', FilterOperator.EQUAL, {
            kind: 'string',
            value: 'France',
          }),
        ),
      ),
  ],
  [
    'a Group by a window column after a Partition',
    () =>
      ordersThen(
        countByCountry(),
        new Group(
          'group101',
          ['n'],
          [aggregation(AggregationFunction.COUNT_ROWS, undefined, 'orders')],
        ),
      ),
  ],
  [
    // the first window, bound with a let, has two columns
    'a Partition of a Partition',
    () =>
      ordersThen(
        new Partition(
          'partition101',
          ['SHIP_COUNTRY'],
          [],
          [
            windowFunction(AggregationFunction.COUNT_ROWS, undefined, 'n'),
            windowFunction(AggregationFunction.SUM, 'EMPLOYEE_ID', 's'),
          ],
        ),
        new Partition(
          'partition102',
          [],
          [by('n', SortDirection.DESC)],
          [windowFunction(WindowRankFunction.DENSE_RANK, undefined, 'drk')],
        ),
      ),
  ],
  [
    // the Filter makes the Partition, and the Limit before it, a let
    'a Partition after a sorted Limit, then a Filter',
    () =>
      ordersThen(
        byCustomerThenOrder(),
        new Limit('limit101', 5),
        countByCustomer(),
        greaterThan('n', '1'),
      ),
  ],
  [
    'a sorted Limit after a Partition',
    () =>
      ordersThen(
        byCustomerThenOrder(),
        countByCustomer(),
        new Limit('limit101', 5),
      ),
  ],
  [
    'a Sort after a Partition',
    () =>
      ordersThen(
        countByCountry(),
        new Sort('sort101', [by('n', SortDirection.DESC), by('ORDER_ID')]),
      ),
  ],
  [
    'a sorted Drop after a Partition',
    () =>
      ordersThen(
        byCustomerThenOrder(),
        countByCountry(),
        new Drop('drop101', 10),
      ),
  ],
  [
    'a Partition after a sorted Drop',
    () =>
      ordersThen(
        byCustomerThenOrder(),
        new Drop('drop101', 10),
        countByCountry(),
      ),
  ],
  [
    'a Partition with a Rank listed before a Count Rows',
    () =>
      ordersThen(
        new Partition(
          'partition101',
          ['SHIP_COUNTRY'],
          [by('ORDER_DATE')],
          [
            windowFunction(WindowRankFunction.RANK, undefined, 'ranked'),
            windowFunction(
              AggregationFunction.COUNT_ROWS,
              undefined,
              'counted',
            ),
          ],
        ),
      ),
  ],
];

const windowShapeNamed = (label: string): Query =>
  (WINDOW_SHAPES.find(([name]) => name === label)?.[1] as () => Query)();

/** Plans already made, by shape and database type: each pin reads the same few */
const windowPlans = new Map<string, Promise<string>>();

/** The SQL of a window shape on a database type, planned once */
const windowPlanSql = (
  label: string,
  databaseType: string,
): Promise<string> => {
  const key = `${label}\u0000${databaseType}`;
  const planned =
    windowPlans.get(key) ?? planSql(windowShapeNamed(label), databaseType);
  windowPlans.set(key, planned);
  return planned;
};

/** The engine's error for a plan it refuses, or undefined when it plans the query */
const planError = (
  query: Query,
  databaseType: string,
): Promise<string | undefined> =>
  planSql(query, databaseType).then(
    () => undefined,
    (error: unknown) => {
      const text = (error as { response?: { data?: unknown } }).response?.data;
      if (typeof text !== 'string') {
        return String(error);
      }
      try {
        const { message } = JSON.parse(text) as { message?: unknown };
        return typeof message === 'string' ? message : text;
      } catch {
        return text;
      }
    },
  );

/** The outermost query of some SQL, each parenthesised part shown as (…) */
const outermost = (sql: string): string => {
  let depth = 0;
  let text = '';
  for (const char of sql) {
    if (char === '(') {
      text += depth === 0 ? '(…)' : '';
      depth += 1;
    } else if (char === ')') {
      depth -= 1;
    } else if (depth === 0) {
      text += char;
    }
  }
  return text;
};

/** The query a WITH names, `with <name> as (<this>)`, if there is one */
const withQuery = (sql: string, name: string): string | undefined => {
  const open = sql.indexOf(`with ${name} as (`);
  if (open < 0) {
    return undefined;
  }
  const start = open + `with ${name} as (`.length;
  let depth = 1;
  for (let index = start; index < sql.length; index += 1) {
    depth += sql[index] === '(' ? 1 : sql[index] === ')' ? -1 : 0;
    if (depth === 0) {
      return sql.slice(start, index);
    }
  }
  return undefined;
};

/** The selects that compute a window column, each without its subqueries */
const windowSelects = (sql: string): string[] =>
  [...subqueries(sql), outermost(sql)].filter((select) =>
    select.includes(' over (…)'),
  );

/** A frame clause: `rows between …`, `range unbounded preceding`, … */
const FRAME_CLAUSE = /\b(?:rows|range)\s+(?:between|unbounded|current|\d)/u;

/** The run's own limit, as each database takes it */
const RUN_LIMIT = /\btop 1001\b|\blimit 1001\b|fetch first 1001 rows only/u;

/** The window functions of a query's Partitions */
const windowFunctionCount = (query: Query): number =>
  query.nodes
    .filter((node): node is Partition => node instanceof Partition)
    .reduce((count, node) => count + node.aggregations.length, 0);

describe('Window functions, as each database plans them', () => {
  test.each(WINDOW_DATABASE_TYPES)(
    'Writes every window with an OVER clause and no ROWS or RANGE frame, on %s',
    async (databaseType) => {
      const problems: string[] = [];
      for (const [name] of WINDOW_SHAPES) {
        const sql = await windowPlanSql(name, databaseType);
        if (!sql.includes(' over (')) {
          problems.push(`${name}: no over clause`);
        }
        if (FRAME_CLAUSE.test(sql)) {
          problems.push(`${name}: a frame clause`);
        }
      }
      expect(problems).toEqual([]);
    },
  );

  test.each(WINDOW_DATABASE_TYPES)(
    'Writes a Count as count(column), a Count Rows as count(1), a Sum as sum(…) and an Average as avg(1.0 * …), each over the window, on %s',
    async (databaseType) => {
      const counts = await windowPlanSql(
        'a Partition with a Count and a Count Rows',
        databaseType,
      );
      expect(counts).toMatch(/count\([^()]*ship_region[`"]?\) over \(/u);
      expect(counts).toMatch(/count\(1\) over \(/u);
      const sums = await windowPlanSql(
        'a sorted Partition with a Sum and an Average',
        databaseType,
      );
      expect(sums).toMatch(/sum\([^()]*employee_id[`"]?\) over \(/u);
      expect(sums).toMatch(/avg\(1\.0 \* [^()]*employee_id[`"]?\) over \(/u);
    },
  );

  test.each(WINDOW_DATABASE_TYPES)(
    "Writes a Rank, a Dense Rank and a Row Number as rank(), dense_rank() and row_number(), over the window's sort, on %s",
    async (databaseType) => {
      const sql = await windowPlanSql(
        'a Partition with a Rank, a Dense Rank and a Row Number',
        databaseType,
      );
      ['rank', 'dense_rank', 'row_number'].forEach((fn) =>
        expect(sql).toMatch(
          new RegExp(
            `\\b${fn}\\(\\) over \\(partition by [^()]*ship_country[^()]* order by [^()]*order_date`,
            'u',
          ),
        ),
      );
    },
  );

  test.each(WINDOW_DATABASE_TYPES)(
    "Counts with an OVER clause, never with a bare count( outside a Group's GROUP BY, on %s",
    async (databaseType) => {
      const problems: string[] = [];
      for (const [name] of WINDOW_SHAPES) {
        const sql = await windowPlanSql(name, databaseType);
        [...subqueries(sql), outermost(sql)].forEach((select) => {
          // each parenthesised part, over clause included, is shown as (…)
          if (
            /\bcount\(…\)(?! over \(…\))/u.test(select) &&
            !select.includes('group by')
          ) {
            problems.push(`${name}: a count with no over clause`);
          }
        });
      }
      expect(problems).toEqual([]);
    },
  );

  /** Each Filter after a Partition, by its predicate as written (Postgres writes text'france') */
  const FILTERS_AFTER_A_PARTITION: [string, RegExp][] = [
    ['a Filter on a window column after a Partition', /[`"]n[`"] > 100\b/u],
    [
      'a Filter on an input column after a Partition',
      /[`"]ship_country[`"] = (?:text)?'france'/u,
    ],
    ['a Partition after a sorted Limit, then a Filter', /[`"]n[`"] > 1\b/u],
  ];

  test.each(WINDOW_DATABASE_TYPES)(
    "Filters a Partition's rows in a WHERE outside its window, reading it from a WITH, never with QUALIFY, on %s",
    async (databaseType) => {
      for (const [name, predicate] of FILTERS_AFTER_A_PARTITION) {
        const sql = await windowPlanSql(name, databaseType);
        expect([name, sql]).toEqual([
          name,
          expect.stringMatching(/^with n_partition101 as \(/u),
        ]);
        expect(sql).not.toContain('qualify');
        const root = outermost(sql);
        expect([name, root]).toEqual([
          name,
          expect.stringMatching(
            new RegExp(`\\bwhere [^()]*${predicate.source}`, 'u'),
          ),
        ]);
        expect(
          windowSelects(sql).filter((select) => predicate.test(select)),
        ).toEqual([]);
      }
    },
  );

  test.each(WINDOW_DATABASE_TYPES)(
    "Orders and limits the capture's rows at the root, after the WITH, on %s",
    async (databaseType) => {
      const byWindowColumn = outermost(
        await windowPlanSql('a Sort after a Partition', databaseType),
      );
      expect(byWindowColumn).toMatch(/^with n_partition101 as \(…\)/u);
      expect(byWindowColumn).toMatch(
        /order by [`"]n[`"] desc[^,]*, ?[^,]*order_id/u,
      );
      expect(byWindowColumn).toMatch(RUN_LIMIT);
      for (const name of [
        'a Partition after a sorted Limit, then a Filter',
        'a sorted Limit after a Partition',
        'a sorted Drop after a Partition',
      ]) {
        const root = outermost(await windowPlanSql(name, databaseType));
        expect([
          name,
          SORTED_BY_BOTH_KEYS.test(root),
          RUN_LIMIT.test(root),
        ]).toEqual([name, true, true]);
      }
    },
  );

  test("Takes no window shape's rows by the engine's own row numbers on Sybase IQ", async () => {
    for (const [name] of WINDOW_SHAPES) {
      expect([
        name,
        (await windowPlanSql(name, 'SybaseIQ')).includes(
          'limitoffset_via_window_subquery',
        ),
      ]).toEqual([name, false]);
    }
  });

  test.each(['SqlServer', 'Sybase'])(
    'Writes no ORDER BY in a subquery or a WITH without TOP or OFFSET, for every window shape, on %s',
    async (databaseType) => {
      const problems: string[] = [];
      for (const [name] of WINDOW_SHAPES) {
        // an over clause's order by is inside its own (…)
        subqueries(await windowPlanSql(name, databaseType)).forEach(
          (subquery) => {
            if (
              subquery.includes('order by') &&
              !/\btop\b|\boffset\b/u.test(subquery)
            ) {
              problems.push(`${name}: ${subquery.slice(0, 80)}`);
            }
          },
        );
      }
      expect(problems).toEqual([]);
    },
  );

  test.each(['SqlServer', 'Sybase'])(
    "Takes a sorted Limit's rows inside a Partition's WITH by TOP and its ORDER BY, on %s",
    async (databaseType) => {
      const bound = withQuery(
        await windowPlanSql(
          'a Partition after a sorted Limit, then a Filter',
          databaseType,
        ),
        'n_partition101',
      );
      expect(bound).toBeDefined();
      expect(
        subqueries(bound as string).filter(
          (subquery) =>
            /\btop 5\b/u.test(subquery) && SORTED_BY_BOTH_KEYS.test(subquery),
        ),
      ).toHaveLength(1);
    },
  );

  test.each(['SqlServer', 'Sybase'])(
    "Takes a sorted Limit's rows after a Partition by TOP and its ORDER BY, on %s",
    async (databaseType) => {
      const sql = await windowPlanSql(
        'a sorted Limit after a Partition',
        databaseType,
      );
      expect(
        subqueries(sql).filter(
          (subquery) =>
            /\btop 5\b/u.test(subquery) && SORTED_BY_BOTH_KEYS.test(subquery),
        ),
      ).toHaveLength(1);
    },
  );

  test.each(WINDOW_DATABASE_TYPES)(
    'Writes a rank and an aggregate in selects of their own, then lists them in the order the Partition lists them, on %s',
    async (databaseType) => {
      const sql = await windowPlanSql(
        'a Partition with a Rank listed before a Count Rows',
        databaseType,
      );
      // one extend holding both fails on the engine (PLAN §11.6); each
      // parenthesised part of a select is shown as (…)
      const selects = [...subqueries(sql), outermost(sql)];
      const ranks = selects.filter((select) =>
        /\brank\(…\) over/u.test(select),
      );
      const counts = selects.filter((select) =>
        /\bcount\(…\) over/u.test(select),
      );
      expect(ranks.length).toBeGreaterThan(0);
      expect(counts.length).toBeGreaterThan(0);
      expect(ranks.filter((select) => counts.includes(select))).toEqual([]);
      const root = outermost(sql);
      expect(root.indexOf('ranked')).toBeGreaterThanOrEqual(0);
      expect(root.indexOf('ranked')).toBeLessThan(root.indexOf('counted'));
    },
  );

  test.each(WINDOW_DATABASE_TYPES)(
    'Writes a window with no partition column as over (order by …), and as over () with no sort either, on %s',
    async (databaseType) => {
      const sorted = await windowPlanSql(
        'a Partition with no partition column',
        databaseType,
      );
      expect(sorted).toMatch(/ over \(order by [^()]*order_date/u);
      expect(sorted).not.toContain('partition by');
      const unsorted = await windowPlanSql(
        'a Partition with no partition column and no sort',
        databaseType,
      );
      expect(unsorted).toContain(' over ()');
      expect(unsorted).not.toContain('partition by');
    },
  );

  // A window's Distinct Count and Distinct Value (PLAN §11.6, Q3): every
  // window database plans them natively, as count(distinct(x)) over (…) and
  // case when count(distinct(x)) over (…) = 1 then max(x) over (…) else null
  // end, sorted or not (a sort is written with the database's null order).
  // Postgres, SQL Server, Databricks and Trino are expected to refuse them
  // when run, and Oracle and BigQuery with a sort (vendor documentation,
  // never run here). Pinned so a change in the engine shows.
  const WINDOWED_DISTINCT: Readonly<Record<string, string>> = {
    H2: 'native',
    Postgres: 'native',
    SqlServer: 'native',
    Sybase: 'native',
    SybaseIQ: 'native',
    DB2: 'native',
    MemSQL: 'native',
    Snowflake: 'native',
    Databricks: 'native',
    Oracle: 'native',
    Trino: 'native',
    Redshift: 'native',
    Hive: 'native',
    BigQuery: 'native',
    Athena: 'native',
    ClickHouse: 'native',
    DuckDB: 'native',
  };

  /** A window, `over (…)`, over SHIP_COUNTRY, by ORDER_DATE or not */
  const OVER_COUNTRY = 'over \\(partition by [^()]*ship_country[^()]*\\)';

  test.each(WINDOW_DATABASE_TYPES)(
    'Writes a Distinct Count and a Distinct Value in a window as the engine writes them for %s',
    async (databaseType) => {
      const forms = new Set<string>();
      for (const name of [
        'a sorted Partition with a Distinct Count and a Distinct Value',
        'a Partition with a Distinct Count and a Distinct Value',
      ]) {
        const sql = await windowPlanSql(name, databaseType);
        const distinctCount = new RegExp(
          `count\\(distinct\\(?[^()]*customer_id[\`"]?\\)?\\) ${OVER_COUNTRY}`,
          'u',
        );
        const distinctValue = new RegExp(
          `case when count\\(distinct\\(?[^()]*ship_region[\`"]?\\)?\\) ${OVER_COUNTRY} = 1 then max\\([^()]*ship_region[\`"]?\\) ${OVER_COUNTRY} else null end`,
          'u',
        );
        forms.add(
          distinctCount.test(sql) && distinctValue.test(sql)
            ? 'native'
            : `${name}: another form`,
        );
      }
      expect([databaseType, [...forms]]).toEqual([
        databaseType,
        [WINDOWED_DISTINCT[databaseType]],
      ]);
    },
  );

  test("Nests one subselect per window column on H2, even for a Partition's functions over one window", async () => {
    const problems: string[] = [];
    for (const [name, shape] of WINDOW_SHAPES) {
      const selects = windowSelects(await windowPlanSql(name, 'H2')).length;
      if (selects !== windowFunctionCount(shape())) {
        problems.push(
          `${name}: ${selects} selects for ${windowFunctionCount(shape())} window columns`,
        );
      }
    }
    expect(problems).toEqual([]);
    // three functions over one window: three selects, one inside another
    expect(
      subqueries(
        await windowPlanSql(
          'a Partition with a Rank, a Dense Rank and a Row Number',
          'H2',
        ),
      ).map((subquery) => subquery.match(/ over \(…\)/gu)?.length ?? 0),
    ).toEqual([1, 1, 1]);
  });

  test.each(WINDOW_REFUSING_DATABASE_TYPES)(
    'Refuses every window shape on %s: no window columns there',
    async (databaseType) => {
      for (const [name, shape] of WINDOW_SHAPES) {
        expect([name, await planError(shape(), databaseType)]).toEqual([
          name,
          expect.stringContaining(
            `Window Columns not supported for Database Type: ${databaseType}`,
          ),
        ]);
      }
    },
  );

  test.each(
    [...CUBE_DIALECT_WORKAROUNDS]
      .filter(([, workarounds]) => workarounds.drop)
      .map(([databaseType]) => databaseType),
  )(
    "Keeps the cube_rn predicate of a Drop before or after a Partition, numbered in the Sort's order, never QUALIFY, on %s",
    async (databaseType) => {
      for (const name of [
        'a sorted Drop after a Partition',
        'a Partition after a sorted Drop',
      ]) {
        const sql = await windowPlanSql(name, databaseType);
        expect([name, sql]).toEqual([
          name,
          expect.stringMatching(/cube_rn[`"]? > 10\b/u),
        ]);
        expect(sql).not.toContain('qualify');
        expect([name, numberingOrder(sql)]).toEqual([
          name,
          expect.stringMatching(BY_CUSTOMER_THEN_ORDER),
        ]);
      }
    },
  );
});
