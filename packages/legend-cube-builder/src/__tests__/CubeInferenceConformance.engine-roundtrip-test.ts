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
  Concat,
  Connection,
  createNodeRegistry,
  DataProductAccessPointSource,
  Distinct,
  Drop,
  Filter,
  FilterOperator,
  fixJoinDuplicates,
  getAvailableAggregations,
  Group,
  IngestDatasetSource,
  Join,
  JoinType,
  Limit,
  NotFilter,
  Query,
  type QueryNode,
  type RelationalTableSource,
  Rename,
  renameConcatInput,
  Restrict,
  restrictConcatInput,
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
  /**
   * A Convert types case (M4.13): concat101's columns as Cube converts them,
   * `<name> <type>`, `?` when nullable, so a case that stops converting shows
   */
  converted?: string;
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

/** Each arm's nodes, each feeding the next */
const armConnections = (arm: readonly QueryNode[]): Connection[] =>
  arm
    .slice(1)
    .map(
      (node, index) =>
        new Connection(
          (arm[index] as QueryNode).id,
          node.id,
          node.ports[0] as string,
        ),
    );

/**
 * relational101 through the first nodes and relational102 through the second,
 * concatenated by concat101 (its First and Second), converting types or not,
 * then the nodes after it, each feeding the next, captured at the last
 */
const concatenatedWith =
  (widenTypes: boolean) =>
  (
    first: readonly QueryNode[],
    second: readonly QueryNode[],
    ...after: QueryNode[]
  ) =>
  (sources: ReadonlyMap<string, RelationalTableSource>): Query => {
    const concat = new Concat('concat101', widenTypes);
    const arms = [
      [source(sources, 'relational101'), ...first],
      [source(sources, 'relational102'), ...second],
    ];
    const nodes: QueryNode[] = [concat, ...after];
    return new Query(
      [...arms.flat(), ...nodes],
      [
        ...arms.flatMap(armConnections),
        ...arms.map(
          (arm, side) =>
            new Connection(
              (arm.at(-1) as QueryNode).id,
              concat.id,
              concat.ports[side] as string,
            ),
        ),
        ...armConnections(nodes),
      ],
      nodes.at(-1)?.id,
    );
  };

/** Types must match */
const concatenated = concatenatedWith(false);

/**
 * Convert types (PLAN §11.5, Q5): a type that differs is cast, in either
 * input, to the type both are
 */
const converting = concatenatedWith(true);

/**
 * The registered types the open-source engine can't type, so with no case: a
 * data product's access point, which it doesn't read (PLAN §6.8), and an
 * ingest definition's data set, which needs a deployed definition (PLAN
 * §6.7); `CubeDataProduct.engine-roundtrip-test.ts` checks Cube's reading of
 * a data product's types against a stand-in function instead
 */
const NOT_TYPED_BY_THE_ENGINE: readonly string[] = [
  DataProductAccessPointSource.TYPE,
  IngestDatasetSource.TYPE,
];

const ORDERS: CaseTable = ['relational101', 'ORDERS'];
const CUSTOMERS: CaseTable = ['relational102', 'CUSTOMERS'];
const ALLTYPES: CaseTable = ['relational101', 'ALLTYPES', 'CUBETEST'];
const ON_CUSTOMER = [['CUSTOMER_ID', 'CUSTOMER_ID']] as const;
/**
 * The query with a Concat autofix (M4.12) applied to concat101, once its
 * inputs' schemas are known; as built, while the tables aren't resolved (only
 * its node types are wanted then)
 */
const withConcatFix =
  (fix: typeof renameConcatInput) =>
  (query: Query): Query => {
    const { schemas } = buildSchemasAndValidity(
      query,
      createNodeRegistry().queryRules,
    );
    const [first, second] = query
      .getInputIds('concat101')
      .map((id) => (id === undefined ? undefined : schemas.get(id)));
    return first && second ? fix(query, 'concat101', first, second) : query;
  };

const CUSTOMERS_FIRST: CaseTable = ['relational101', 'CUSTOMERS'];
const SUPPLIERS: CaseTable = ['relational102', 'SUPPLIERS'];
const COMPANY_CITY_COUNTRY = ['COMPANY_NAME', 'CITY', 'COUNTRY'];
/** CUSTOMERS' CUSTOMER_ID and COMPANY_NAME as SHIP_NAME, ORDERS' columns of the same types */
const customerShipNames = (suffix: string): QueryNode[] => [
  new Restrict(`restrict${suffix}`, ['CUSTOMER_ID', 'COMPANY_NAME']),
  new Rename(`rename${suffix}`, [{ from: 'COMPANY_NAME', to: 'SHIP_NAME' }]),
];
const ordersByIdDesc = (): Sort =>
  new Sort('sort101', [{ column: 'ORDER_ID', direction: DESC }]);

const ALLTYPES_SECOND: CaseTable = ['relational102', 'ALLTYPES', 'CUBETEST'];
/**
 * The columns, listed in their table's order, each renamed to the name at its
 * position in `names` (a Restrict, then a Rename when a name changes), the
 * nodes' ids ending in the suffix
 */
const keptAs = (
  suffix: string,
  columns: readonly string[],
  names: readonly string[],
): QueryNode[] => {
  const mappings = columns.flatMap((from, index) => {
    const to = names[index] as string;
    return from === to ? [] : [{ from, to }];
  });
  return [
    new Restrict(`restrict${suffix}`, columns),
    ...(mappings.length ? [new Rename(`rename${suffix}`, mappings)] : []),
  ];
};
const NUMBERED = ['N1', 'N2', 'N3'];

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
  {
    // the same columns in both: COMPANY_NAME not nullable in either
    name: 'concat',
    tables: [CUSTOMERS_FIRST, SUPPLIERS],
    build: concatenated(
      [new Restrict('restrict101', COMPANY_CITY_COUNTRY)],
      [new Restrict('restrict102', COMPANY_CITY_COUNTRY)],
    ),
  },
  {
    // nullable when either input's column is: both nullable columns come from
    // the first input here (ORDERS' CUSTOMER_ID and SHIP_NAME), and from the
    // second in the reversed case
    name: 'concat-nullable-from-either',
    tables: [ORDERS, CUSTOMERS],
    build: concatenated(
      [new Restrict('restrict101', ['CUSTOMER_ID', 'SHIP_NAME'])],
      customerShipNames('102'),
    ),
  },
  {
    name: 'concat-nullable-from-either-reversed',
    tables: [CUSTOMERS_FIRST, ['relational102', 'ORDERS']],
    build: concatenated(customerShipNames('101'), [
      new Restrict('restrict102', ['CUSTOMER_ID', 'SHIP_NAME']),
    ]),
  },
  {
    // every type, each column nullable but the key
    name: 'concat-alltypes',
    tables: [ALLTYPES, ['relational102', 'ALLTYPES', 'CUBETEST']],
    build: concatenated([], []),
  },
  {
    // a Sort and a Limit inside the first input; a Group and a Sort after
    name: 'concat-then-operations',
    tables: [CUSTOMERS_FIRST, SUPPLIERS],
    build: concatenated(
      [
        new Restrict('restrict101', COMPANY_CITY_COUNTRY),
        new Sort('sort101', [{ column: 'COMPANY_NAME', direction: DESC }]),
        new Limit('limit101', 3),
      ],
      [new Restrict('restrict102', COMPANY_CITY_COUNTRY)],
      new Group(
        'group101',
        ['COUNTRY'],
        [aggregation(AggregationFunction.COUNT_ROWS, undefined, 'companies')],
      ),
      new Sort('sort102', [{ column: 'COUNTRY', direction: ASC }]),
    ),
  },
  {
    // M4.12's Rename before the second input: REGION takes CITY's name
    name: 'concat-autofix-rename',
    tables: [CUSTOMERS_FIRST, SUPPLIERS],
    build: (sources) =>
      withConcatFix(renameConcatInput)(
        concatenated(
          [new Restrict('restrict101', COMPANY_CITY_COUNTRY)],
          [new Restrict('restrict102', ['COMPANY_NAME', 'REGION', 'COUNTRY'])],
        )(sources),
      ),
  },
  {
    // M4.12's Restrict before the wider input, the second
    name: 'concat-autofix-restrict-second',
    tables: [CUSTOMERS_FIRST, SUPPLIERS],
    build: (sources) =>
      withConcatFix(restrictConcatInput)(
        concatenated(
          [new Restrict('restrict101', COMPANY_CITY_COUNTRY)],
          [
            new Restrict('restrict102', [
              'SUPPLIER_ID',
              ...COMPANY_CITY_COUNTRY,
            ]),
          ],
        )(sources),
      ),
  },
  {
    // and the first
    name: 'concat-autofix-restrict-first',
    tables: [CUSTOMERS_FIRST, SUPPLIERS],
    build: (sources) =>
      withConcatFix(restrictConcatInput)(
        concatenated(
          [
            new Restrict('restrict101', [
              'CUSTOMER_ID',
              ...COMPANY_CITY_COUNTRY,
            ]),
          ],
          [new Restrict('restrict102', COMPANY_CITY_COUNTRY)],
        )(sources),
      ),
  },
  {
    // a Concat of a Concat, on its second input
    name: 'concat-of-a-concat',
    tables: [CUSTOMERS_FIRST, SUPPLIERS, ['relational103', 'ORDERS']],
    build: (sources) => {
      const inner = concatenated(
        [new Restrict('restrict101', COMPANY_CITY_COUNTRY)],
        [new Restrict('restrict102', COMPANY_CITY_COUNTRY)],
      )(sources);
      const orders = source(sources, 'relational103');
      const restrict = new Restrict('restrict103', [
        'SHIP_NAME',
        'SHIP_CITY',
        'SHIP_COUNTRY',
      ]);
      const rename = new Rename('rename103', [
        { from: 'SHIP_NAME', to: 'COMPANY_NAME' },
        { from: 'SHIP_CITY', to: 'CITY' },
        { from: 'SHIP_COUNTRY', to: 'COUNTRY' },
      ]);
      const outer = new Concat('concat102');
      return new Query(
        [...inner.nodes, orders, restrict, rename, outer],
        [
          ...inner.connections,
          ...armConnections([orders, restrict, rename]),
          new Connection(rename.id, outer.id, outer.ports[0] as string),
          new Connection('concat101', outer.id, outer.ports[1] as string),
        ],
        outer.id,
      );
    },
  },
  // Convert types (M4.13, Q5): each differing type cast, in the input that
  // has it, to the type both are, with no SQL cast
  {
    // the same columns: nothing to convert, the inputs as they are
    name: 'concat-convert-same-types',
    converted:
      'COMPANY_NAME Varchar(40), CITY Varchar(15)?, COUNTRY Varchar(15)?',
    tables: [CUSTOMERS_FIRST, SUPPLIERS],
    build: converting(
      [new Restrict('restrict101', COMPANY_CITY_COUNTRY)],
      [new Restrict('restrict102', COMPANY_CITY_COUNTRY)],
    ),
  },
  {
    // two Varchar lengths give String, cast in both inputs; COMPANY_NAME, of
    // one type in both, is left as it is
    name: 'concat-convert-varchar-lengths',
    converted: 'COMPANY_NAME Varchar(40), CITY String?',
    tables: [CUSTOMERS_FIRST, SUPPLIERS],
    build: converting(
      [new Restrict('restrict101', ['COMPANY_NAME', 'CITY'])],
      keptAs('102', ['COMPANY_NAME', 'CONTACT_NAME'], ['COMPANY_NAME', 'CITY']),
    ),
  },
  {
    // never empty in either input: String, not nullable
    name: 'concat-convert-never-empty',
    converted: 'CUSTOMER_ID String',
    tables: [CUSTOMERS_FIRST, SUPPLIERS],
    build: converting(
      [new Restrict('restrict101', ['CUSTOMER_ID'])],
      keptAs('102', ['COMPANY_NAME'], ['CUSTOMER_ID']),
    ),
  },
  {
    // integer widths give Integer: Int with TinyInt (N1 nullable from the
    // second input only), TinyInt with SmallInt, SmallInt with BigInt
    name: 'concat-convert-integers',
    converted: 'N1 Integer?, N2 Integer?, N3 Integer?',
    tables: [ALLTYPES, ALLTYPES_SECOND],
    build: converting(
      keptAs('101', ['ID', 'TI', 'SI'], NUMBERED),
      keptAs('102', ['TI', 'SI', 'BI'], NUMBERED),
    ),
  },
  {
    // N1 nullable from the first input only
    name: 'concat-convert-integers-reversed',
    converted: 'N1 Integer?, N2 Integer?, N3 Integer?',
    tables: [ALLTYPES, ALLTYPES_SECOND],
    build: converting(
      keptAs('101', ['TI', 'SI', 'BI'], NUMBERED),
      keptAs('102', ['ID', 'TI', 'SI'], NUMBERED),
    ),
  },
  {
    // an integer with a float, a float with a decimal: Number
    name: 'concat-convert-numbers',
    converted: 'P Number?, Q Number?, R Number?, S Number?',
    tables: [ALLTYPES, ALLTYPES_SECOND],
    build: converting(
      keptAs('101', ['ID', 'BI', 'F', 'D'], ['P', 'Q', 'R', 'S']),
      keptAs('102', ['F', 'D', 'DEC', 'NUM'], ['P', 'Q', 'R', 'S']),
    ),
  },
  {
    // Float4 with Double: Float; two Numeric precisions: Decimal
    name: 'concat-convert-floats-and-decimals',
    converted: 'X Float?, Y Decimal?',
    tables: [ALLTYPES, ALLTYPES_SECOND],
    build: converting(
      keptAs('101', ['F', 'DEC'], ['X', 'Y']),
      keptAs('102', ['D', 'NUM'], ['X', 'Y']),
    ),
  },
  {
    // StrictDate with Timestamp: Date
    name: 'concat-convert-dates',
    converted: 'WHEN Date?',
    tables: [ALLTYPES, ALLTYPES_SECOND],
    build: converting(
      keptAs('101', ['DT'], ['WHEN']),
      keptAs('102', ['TS'], ['WHEN']),
    ),
  },
  {
    // StrictDate with DateTime (a Max of a Timestamp), Timestamp with
    // StrictDate (a Min): Date
    name: 'concat-convert-dates-of-a-group',
    converted: 'WHEN Date?, AT Date?',
    tables: [ALLTYPES, ALLTYPES_SECOND],
    build: converting(keptAs('101', ['DT', 'TS'], ['WHEN', 'AT']), [
      new Group(
        'group102',
        [],
        [
          aggregation(AggregationFunction.MAX, 'TS', 'WHEN'),
          aggregation(AggregationFunction.MIN, 'DT', 'AT'),
        ],
      ),
    ]),
  },
  {
    // a type next to its own ancestor, cast in the second input only: Integer
    // (a Count) with SmallInt, DateTime (a Max of a Timestamp) with Timestamp;
    // ID, an Int in both, left as it is
    name: 'concat-convert-in-one-input',
    converted: 'ID Int, N Integer?, LAST DateTime?',
    tables: [ALLTYPES, ALLTYPES_SECOND],
    build: converting(
      [
        new Group(
          'group101',
          ['ID'],
          [
            aggregation(AggregationFunction.COUNT_ROWS, undefined, 'N'),
            aggregation(AggregationFunction.MAX, 'TS', 'LAST'),
          ],
        ),
      ],
      keptAs('102', ['ID', 'SI', 'TS'], ['ID', 'N', 'LAST']),
    ),
  },
  {
    // the temporary columns' names avoid the input's in any case: a column
    // CUBE_CAST, left as it is, and two cast before it
    name: 'concat-convert-temporary-names',
    converted: 'A Integer?, B Integer?, CUBE_CAST Varchar(20)?',
    tables: [ALLTYPES, ALLTYPES_SECOND],
    build: converting(
      keptAs('101', ['TI', 'SI', 'VC'], ['A', 'B', 'CUBE_CAST']),
      keptAs('102', ['SI', 'BI', 'VC'], ['A', 'B', 'CUBE_CAST']),
    ),
  },
  {
    // and the names of the columns cast themselves
    name: 'concat-convert-columns-named-as-temporaries',
    converted: 'cube_cast Integer?, cube_cast2 Integer?',
    tables: [ALLTYPES, ALLTYPES_SECOND],
    build: converting(
      keptAs('101', ['TI', 'SI'], ['cube_cast', 'cube_cast2']),
      keptAs('102', ['SI', 'BI'], ['cube_cast', 'cube_cast2']),
    ),
  },
  {
    // a Concat that converts types, of one that does: ORDERS' SHIP_CITY, a
    // Varchar(15), cast to concat101's String in its input only
    name: 'concat-convert-of-a-concat',
    converted: 'COMPANY_NAME Varchar(40), CITY String?',
    tables: [CUSTOMERS_FIRST, SUPPLIERS, ['relational103', 'ORDERS']],
    build: (sources) => {
      const inner = converting(
        [new Restrict('restrict101', ['COMPANY_NAME', 'CITY'])],
        keptAs(
          '102',
          ['COMPANY_NAME', 'CONTACT_NAME'],
          ['COMPANY_NAME', 'CITY'],
        ),
      )(sources);
      const orders = [
        source(sources, 'relational103'),
        ...keptAs('103', ['SHIP_NAME', 'SHIP_CITY'], ['COMPANY_NAME', 'CITY']),
      ];
      const outer = new Concat('concat102', true);
      return new Query(
        [...inner.nodes, ...orders, outer],
        [
          ...inner.connections,
          ...armConnections(orders),
          new Connection('concat101', outer.id, outer.ports[0] as string),
          new Connection(
            (orders.at(-1) as QueryNode).id,
            outer.id,
            outer.ports[1] as string,
          ),
        ],
        outer.id,
      );
    },
  },
  {
    // the String a Filter, a Group and a Sort after it see
    name: 'concat-convert-then-operations',
    converted: 'COMPANY_NAME Varchar(40), CITY String?',
    tables: [CUSTOMERS_FIRST, SUPPLIERS],
    build: converting(
      [new Restrict('restrict101', ['COMPANY_NAME', 'CITY'])],
      keptAs('102', ['COMPANY_NAME', 'CONTACT_NAME'], ['COMPANY_NAME', 'CITY']),
      new Filter(
        'filter101',
        new ColumnComparisonFilter('CITY', FilterOperator.IS_NOT_EMPTY),
      ),
      new Group(
        'group101',
        ['CITY'],
        [aggregation(AggregationFunction.COUNT_ROWS, undefined, 'n')],
      ),
      new Sort('sort101', [{ column: 'CITY', direction: ASC }]),
    ),
  },
  {
    // M4.12's Rename, offered once the types convert: CONTACT_NAME as CITY
    name: 'concat-convert-autofix-rename',
    converted: 'COMPANY_NAME Varchar(40), CITY String?',
    tables: [CUSTOMERS_FIRST, SUPPLIERS],
    build: (sources) =>
      withConcatFix(renameConcatInput)(
        converting(
          [new Restrict('restrict101', ['COMPANY_NAME', 'CITY'])],
          [new Restrict('restrict102', ['COMPANY_NAME', 'CONTACT_NAME'])],
        )(sources),
      ),
  },
  {
    // and M4.12's Restrict, dropping SUPPLIER_ID
    name: 'concat-convert-autofix-restrict',
    converted: 'COMPANY_NAME Varchar(40), CITY String?',
    tables: [CUSTOMERS_FIRST, SUPPLIERS],
    build: (sources) =>
      withConcatFix(restrictConcatInput)(
        converting(
          [new Restrict('restrict101', ['COMPANY_NAME', 'CITY'])],
          keptAs(
            '102',
            ['SUPPLIER_ID', 'COMPANY_NAME', 'CONTACT_NAME'],
            ['SUPPLIER_ID', 'COMPANY_NAME', 'CITY'],
          ),
        )(sources),
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
  test('Has a case for every registered node type the engine can type', () => {
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
        .filter(
          (type) =>
            !covered.has(type) && !NOT_TYPED_BY_THE_ENGINE.includes(type),
        ),
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

  test('Gives every case whose Concat converts types the types it names', async () => {
    const resolved = await resolveAll();
    const registry = createNodeRegistry();
    const columnsOf = (schema: Schema | undefined): string | undefined =>
      schema?.columns
        .map(
          ({ name, type, nullable }) =>
            `${name} ${type.displayName}${nullable ? '?' : ''}`,
        )
        .join(', ');
    expect(
      Object.fromEntries(
        CASES.flatMap((conformanceCase) => {
          const query = conformanceCase.build(
            resolved.get(conformanceCase.name) ?? new Map(),
          );
          const concat = query.getNode('concat101');
          return concat instanceof Concat && concat.widenTypes
            ? [
                [
                  conformanceCase.name,
                  columnsOf(
                    buildSchemasAndValidity(
                      query,
                      registry.queryRules,
                    ).schemas.get(concat.id),
                  ),
                ],
              ]
            : [];
        }),
      ),
    ).toEqual(
      Object.fromEntries(
        CASES.flatMap(({ name, converted }) =>
          converted === undefined ? [] : [[name, converted]],
        ),
      ),
    );
  });
});
