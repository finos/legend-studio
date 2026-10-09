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

import { beforeEach, describe, expect, test } from '@jest/globals';
import {
  AggregationFunction,
  buildSchemasAndValidity,
  type ColumnAggregation,
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
  Connection,
  createNodeRegistry,
  Distinct,
  Drop,
  Filter,
  FilterOperator,
  fixJoinDuplicates,
  getAvailableAggregations,
  Group,
  Join,
  JoinType,
  Limit,
  NotFilter,
  Query,
  type QueryNode,
  type RelationalTableSource,
  Rename,
  Restrict,
  Schema,
  Slice,
  Sort,
  SortDirection,
} from '@finos/legend-cube';
import {
  TEST__chainOf,
  TEST__emittableNodes,
  TEST__engineSchemas,
  TEST__northwindTable,
  TEST__typingDifferences,
} from '../__test-utils__/CubeOperationsTestUtils.js';
import { V1_createEngineBackedCubeEngine } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeEngineTestUtils.js';
import type { V1_LegendCubeEngine } from '../graph-manager/protocol/pure/v1/V1_LegendCubeEngine.js';
import { CUBE_NORTHWIND_MODEL } from '../stores/fixtures/CubeNorthwindModel.js';

// Cube's schema inference against the engine (PLAN §11.5): every node of every
// case is typed with `lambdaRelationType`, in one batch, and must match what
// Cube infers: the same names, in the same order, of the same precise types
// and parameters, and the same nullability, except on the columns a case
// declares wider (where the engine misreports nullability and Cube must say
// nullable). Every registered node type needs a case.

const { ASC, DESC } = SortDirection;

/** A table of a case, by node id: [id, table, schema] */
type CaseTable = readonly [string, string, string?];

interface ConformanceCase {
  name: string;
  tables: readonly CaseTable[];
  build: (sources: ReadonlyMap<string, RelationalTableSource>) => Query;
  /**
   * Per node, the columns whose nullability the engine misreports, which Cube
   * must say are nullable
   */
  widerNullable?: Readonly<Record<string, readonly string[]>>;
}

const source = (
  sources: ReadonlyMap<string, RelationalTableSource>,
  id: string,
): RelationalTableSource => {
  const found = sources.get(id);
  if (!found) {
    throw new Error(`No table ${id}`);
  }
  return found;
};

/** The case's first table, then the nodes, each feeding the next */
const chain =
  (...nodes: QueryNode[]) =>
  (sources: ReadonlyMap<string, RelationalTableSource>): Query =>
    TEST__chainOf([source(sources, 'relational101'), ...nodes]);

/**
 * relational101 joined to relational102 on the keys, then the nodes after the
 * join, each feeding the next, captured at the last
 */
const joined =
  (
    keys: readonly (readonly [string, string])[],
    joinType: JoinType,
    ...after: QueryNode[]
  ) =>
  (sources: ReadonlyMap<string, RelationalTableSource>): Query => {
    const join = new Join('join101', {
      leftColumns: keys.map(([left]) => left),
      rightColumns: keys.map(([, right]) => right),
      joinType,
    });
    const nodes: QueryNode[] = [join, ...after];
    return new Query(
      [
        source(sources, 'relational101'),
        source(sources, 'relational102'),
        ...nodes,
      ],
      [
        new Connection('relational101', 'join101', 'leftTds'),
        new Connection('relational102', 'join101', 'rightTds'),
        ...after.map(
          (node, index) =>
            new Connection(
              (nodes[index] as QueryNode).id,
              node.id,
              node.ports[0] as string,
            ),
        ),
      ],
      nodes.at(-1)?.id,
    );
  };

const ORDERS: CaseTable = ['relational101', 'ORDERS'];
const CUSTOMERS: CaseTable = ['relational102', 'CUSTOMERS'];
const ALLTYPES: CaseTable = ['relational101', 'ALLTYPES', 'CUBETEST'];
const ON_CUSTOMER = [['CUSTOMER_ID', 'CUSTOMER_ID']] as const;
const ordersByIdDesc = (): Sort =>
  new Sort('sort101', [{ column: 'ORDER_ID', direction: DESC }]);

/** The aggregations whose outputs the engine types as never null, though a group of empty values gives none (PLAN §5.7) */
const NULLABLE_ONLY_TO_CUBE: readonly string[] = [
  AggregationFunction.SUM,
  AggregationFunction.AVERAGE,
];

/** The names of a group's Sum and Average outputs, which a case declares wider */
const sumsAndAverages = (
  aggregations: readonly ColumnAggregation[],
): string[] =>
  aggregations
    .filter((aggregation) =>
      NULLABLE_ONLY_TO_CUBE.includes(aggregation.function),
    )
    .map(({ name }) => name);

const aggregation = (
  fn: AggregationFunction,
  column: string | undefined,
  name: string,
): ColumnAggregation => ({ column, function: fn, name });

/**
 * Every function each column of the table offers (spec §10.1), and Count
 * rows: one output per (column, function), named `<column>_<function>`. An
 * unresolved table (the coverage test) gives Count rows alone.
 */
const everyAggregation = (
  table: RelationalTableSource,
): ColumnAggregation[] => [
  aggregation(AggregationFunction.COUNT_ROWS, undefined, 'Count Rows'),
  ...(table.resolution.kind === 'resolved'
    ? table.resolution.schema.columns.flatMap((column) =>
        getAvailableAggregations(column.type).map((fn) =>
          aggregation(fn, column.name, `${column.name}_${fn}`),
        ),
      )
    : []),
];

/** Every function of every ALLTYPES column, by a key or over all the rows */
const everyAlltypesAggregation =
  (columns: string[]) =>
  (sources: ReadonlyMap<string, RelationalTableSource>): Query =>
    chain(
      new Group(
        'group101',
        columns,
        everyAggregation(source(sources, 'relational101')),
      ),
    )(sources);

const ORDERS_AGGREGATIONS = [
  aggregation(AggregationFunction.COUNT_ROWS, undefined, 'n'),
  aggregation(AggregationFunction.SUM, 'FREIGHT', 'freight total'),
  aggregation(AggregationFunction.AVERAGE, 'ORDER_ID', 'average id'),
  aggregation(AggregationFunction.MAX, 'ORDER_DATE', 'last order'),
  aggregation(AggregationFunction.DISTINCT_VALUE, 'SHIP_REGION', 'region'),
];

const CASES: readonly ConformanceCase[] = [
  { name: 'orders', tables: [ORDERS], build: chain() },
  { name: 'alltypes', tables: [ALLTYPES], build: chain() },
  {
    name: 'filter',
    tables: [ORDERS],
    build: chain(
      new Filter(
        'filter101',
        new CompositeFilter(CompositeFilterOperator.AND, [
          new ColumnComparisonFilter('SHIP_COUNTRY', FilterOperator.EQUAL, {
            kind: 'string',
            value: 'France',
          }),
          new NotFilter(
            new ColumnComparisonFilter('SHIP_REGION', FilterOperator.IS_EMPTY),
          ),
        ]),
      ),
    ),
  },
  {
    name: 'filter-alltypes',
    tables: [ALLTYPES],
    build: chain(
      new Filter(
        'filter101',
        new ColumnComparisonFilter('VC', FilterOperator.IS_NOT_EMPTY),
      ),
    ),
  },
  {
    name: 'inner-join',
    tables: [ORDERS, CUSTOMERS],
    build: joined(ON_CUSTOMER, JoinType.INNER),
  },
  // the engine types an outer join's padded columns as its inputs have them
  // (PLAN §4.7): here the ones not nullable in their table
  {
    name: 'left-join',
    tables: [ORDERS, CUSTOMERS],
    build: joined(ON_CUSTOMER, JoinType.LEFT_OUTER),
    widerNullable: { join101: ['COMPANY_NAME'] },
  },
  {
    name: 'right-join',
    tables: [ORDERS, CUSTOMERS],
    build: joined(ON_CUSTOMER, JoinType.RIGHT_OUTER),
    widerNullable: { join101: ['ORDER_ID'] },
  },
  {
    // and the merged key as not nullable, though an unmatched order without a
    // customer gives it no value
    name: 'full-join',
    tables: [ORDERS, CUSTOMERS],
    build: joined(ON_CUSTOMER, JoinType.FULL_OUTER),
    widerNullable: { join101: ['CUSTOMER_ID', 'ORDER_ID', 'COMPANY_NAME'] },
  },
  {
    // the merged key of differing parameters is cast (PLAN §8.4)
    name: 'full-join-cast-key',
    tables: [
      ['relational101', 'KEY_VC15', 'CUBETEST'],
      ['relational102', 'KEY_VC2', 'CUBETEST'],
    ],
    build: joined([['K', 'K']], JoinType.FULL_OUTER),
  },
  {
    name: 'full-join-nullable-key',
    tables: [ORDERS, ['relational102', 'CATEGORY_REGION', 'CUBETEST']],
    build: joined([['SHIP_REGION', 'SHIP_REGION']], JoinType.FULL_OUTER),
    widerNullable: { join101: ['SHIP_REGION', 'ORDER_ID', 'CATEGORY_ID'] },
  },
  {
    // the padded columns carry on through the nodes after the join
    name: 'left-join-then-operations',
    tables: [ORDERS, CUSTOMERS],
    build: joined(
      ON_CUSTOMER,
      JoinType.LEFT_OUTER,
      new Restrict('restrict101', ['ORDER_ID', 'COMPANY_NAME', 'COUNTRY']),
      new Rename('rename101', [{ from: 'COMPANY_NAME', to: 'Company' }]),
      new Sort('sort101', [{ column: 'Company', direction: ASC }]),
      new Limit('limit101', 5),
    ),
    widerNullable: {
      join101: ['COMPANY_NAME'],
      restrict101: ['COMPANY_NAME'],
      rename101: ['Company'],
      sort101: ['Company'],
      limit101: ['Company'],
    },
  },
  {
    // the shared columns renamed before each input (M2's Join autofix)
    name: 'join-autofix',
    tables: [
      ['relational101', 'ORDER_DETAILS'],
      ['relational102', 'PRODUCTS'],
    ],
    build: (sources) => {
      const query = joined(
        [['PRODUCT_ID', 'PRODUCT_ID']],
        JoinType.INNER,
      )(sources);
      const { schemas } = buildSchemasAndValidity(
        query,
        createNodeRegistry().queryRules,
      );
      const [left, right] = [
        schemas.get('relational101'),
        schemas.get('relational102'),
      ];
      // the tables not resolved yet (only their node types are wanted)
      return left && right
        ? fixJoinDuplicates(query, 'join101', left, right)
        : query;
    },
  },
  {
    name: 'sort',
    tables: [ORDERS],
    build: chain(
      new Sort('sort101', [
        { column: 'ORDER_ID', direction: DESC },
        { column: 'SHIP_CITY', direction: ASC },
      ]),
    ),
  },
  {
    name: 'restrict-rename',
    tables: [ORDERS],
    build: chain(
      new Restrict('restrict101', ['ORDER_ID', 'SHIP_REGION', 'SHIP_COUNTRY']),
      new Rename('rename101', [
        { from: 'SHIP_COUNTRY', to: 'Ship Country' },
        { from: 'ORDER_ID', to: 'OID' },
      ]),
    ),
  },
  {
    name: 'distinct',
    tables: [ORDERS],
    build: chain(
      new Restrict('restrict101', ['SHIP_REGION', 'SHIP_COUNTRY']),
      new Distinct('distinct101'),
    ),
  },
  {
    name: 'limit',
    tables: [ORDERS],
    build: chain(ordersByIdDesc(), new Limit('limit101', 5)),
  },
  {
    name: 'drop',
    tables: [ORDERS],
    build: chain(ordersByIdDesc(), new Drop('drop101', 10)),
  },
  {
    name: 'slice',
    tables: [ORDERS],
    build: chain(ordersByIdDesc(), new Slice('slice101', 2, 5)),
  },
  {
    // every (function, family) cell on ALLTYPES, grouped by a key
    name: 'group-every-aggregation',
    tables: [ALLTYPES],
    build: everyAlltypesAggregation(['B']),
    widerNullable: {
      group101: [
        'TI_Sum',
        'SI_Sum',
        'BI_Sum',
        'ID_Sum',
        'F_Sum',
        'D_Sum',
        'DEC_Sum',
        'NUM_Sum',
        'TI_Average',
        'SI_Average',
        'BI_Average',
        'ID_Average',
        'F_Average',
        'D_Average',
        'DEC_Average',
        'NUM_Average',
      ],
    },
  },
  {
    // and over all the rows: aggregate()
    name: 'aggregate-every-aggregation',
    tables: [ALLTYPES],
    build: everyAlltypesAggregation([]),
    widerNullable: {
      group101: [
        'TI_Sum',
        'SI_Sum',
        'BI_Sum',
        'ID_Sum',
        'F_Sum',
        'D_Sum',
        'DEC_Sum',
        'NUM_Sum',
        'TI_Average',
        'SI_Average',
        'BI_Average',
        'ID_Average',
        'F_Average',
        'D_Average',
        'DEC_Average',
        'NUM_Average',
      ],
    },
  },
  {
    // keys listed in another order than the input's, FREIGHT a Double
    name: 'group-keys-in-their-order',
    tables: [ORDERS],
    build: chain(
      new Group(
        'group101',
        ['SHIP_COUNTRY', 'SHIP_REGION'],
        ORDERS_AGGREGATIONS,
      ),
    ),
    widerNullable: { group101: sumsAndAverages(ORDERS_AGGREGATIONS) },
  },
  {
    // a group of a group: Integer, Float, StrictDate and Varchar inputs
    name: 'group-of-a-group',
    tables: [ORDERS],
    build: chain(
      new Group(
        'group101',
        ['SHIP_COUNTRY', 'EMPLOYEE_ID'],
        ORDERS_AGGREGATIONS,
      ),
      new Group(
        'group102',
        ['SHIP_COUNTRY'],
        [
          aggregation(AggregationFunction.SUM, 'n', 'orders'),
          aggregation(AggregationFunction.MAX, 'freight total', 'most freight'),
          aggregation(AggregationFunction.MIN, 'average id', 'least average'),
          aggregation(AggregationFunction.MAX, 'last order', 'latest order'),
          aggregation(AggregationFunction.COUNT, 'region', 'regions'),
        ],
      ),
    ),
    widerNullable: {
      group101: sumsAndAverages(ORDERS_AGGREGATIONS),
      group102: ['orders'],
    },
  },
  {
    // a key padded by a LEFT join: the engine types it as its table has it
    name: 'group-after-a-left-join',
    tables: [ORDERS, CUSTOMERS],
    build: joined(
      ON_CUSTOMER,
      JoinType.LEFT_OUTER,
      new Group(
        'group101',
        ['COMPANY_NAME'],
        [
          aggregation(AggregationFunction.COUNT_ROWS, undefined, 'orders'),
          aggregation(AggregationFunction.MAX, 'ORDER_DATE', 'last order'),
        ],
      ),
    ),
    widerNullable: {
      join101: ['COMPANY_NAME'],
      group101: ['COMPANY_NAME'],
    },
  },
  {
    name: 'alltypes-operations',
    tables: [ALLTYPES],
    build: chain(
      new Restrict('restrict101', ['DEC', 'NUM', 'DT', 'TS', 'B', 'VC']),
      new Distinct('distinct101'),
      new Sort('sort101', [{ column: 'VC', direction: ASC }]),
      new Slice('slice101', 0, 2),
    ),
  },
];

/** Every case's tables, not resolved: enough to see the node types */
const unresolvedSources = (
  conformanceCase: ConformanceCase,
): Map<string, RelationalTableSource> =>
  new Map(
    conformanceCase.tables.map(([id, table, schema]) => [
      id,
      TEST__northwindTable(id, table, schema),
    ]),
  );

let engine: V1_LegendCubeEngine;

beforeEach(() => {
  ({ engine } = V1_createEngineBackedCubeEngine());
});

/** Every case's tables, resolved through the engine in one call */
const resolveAll = async (): Promise<
  Map<string, Map<string, RelationalTableSource>>
> => {
  const tables = CASES.flatMap((conformanceCase) =>
    [...unresolvedSources(conformanceCase).values()].map(
      (table) => [`${conformanceCase.name}/${table.id}`, table] as const,
    ),
  );
  const typed = await engine.resolveSchemas(
    CUBE_NORTHWIND_MODEL,
    new Map(
      tables.map(([key, table]) => [
        key,
        [table.database, table.schema, table.table] as const,
      ]),
    ),
  );
  const resolved = new Map<string, Map<string, RelationalTableSource>>();
  tables.forEach(([key, table]) => {
    const schema = typed.get(key);
    if (!(schema instanceof Schema)) {
      throw schema ?? new Error(`No schema for ${key}`);
    }
    const [name] = key.split('/') as [string];
    const sources = resolved.get(name) ?? new Map();
    sources.set(table.id, table.withResolution({ kind: 'resolved', schema }));
    resolved.set(name, sources);
  });
  return resolved;
};

describe('Cube inference against the engine', () => {
  test('Has a case for every registered node type', () => {
    const registry = createNodeRegistry();
    const covered = new Set(
      CASES.flatMap((conformanceCase) =>
        conformanceCase
          .build(unresolvedSources(conformanceCase))
          .nodes.map((node) => node.type),
      ),
    );
    expect(
      [...registry.sources, ...registry.transforms]
        .map((definition) => definition.type)
        .filter((type) => !covered.has(type)),
    ).toEqual([]);
  });

  test('Types every node of every case as Cube infers it', async () => {
    const resolved = await resolveAll();
    const queries = CASES.map(
      (conformanceCase) =>
        [
          conformanceCase,
          conformanceCase.build(
            resolved.get(conformanceCase.name) ?? new Map(),
          ),
        ] as const,
    );
    const targets = queries.flatMap(([conformanceCase, query]) =>
      TEST__emittableNodes(conformanceCase.name, query),
    );
    // every node of every case is valid, so every node is typed
    expect(targets.map(({ key }) => key)).toEqual(
      queries.flatMap(([conformanceCase, query]) =>
        query.nodes.map((node) => `${conformanceCase.name}/${node.id}`),
      ),
    );
    const typed = await TEST__engineSchemas(engine, targets);
    const registry = createNodeRegistry();
    // a difference with Cube unchanged means the engine's typing changed
    // (CI runs the engine's latest image): check the change before declaring
    // a column wider or changing Cube's inference
    expect(
      queries.flatMap(([conformanceCase, query]) => {
        const { schemas } = buildSchemasAndValidity(query, registry.queryRules);
        return query.nodes.flatMap((node) => {
          const key = `${conformanceCase.name}/${node.id}`;
          return TEST__typingDifferences(
            key,
            schemas.get(node.id),
            typed.get(key),
            { widerNullable: conformanceCase.widerNullable?.[node.id] },
          );
        });
      }),
    ).toEqual([]);
  });
});
