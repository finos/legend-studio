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

import { beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import {
  AggregationFunction,
  type ColumnAggregation,
  ColumnComparisonFilter,
  type ColumnDirection,
  CompositeFilter,
  CompositeFilterOperator,
  createNodeRegistry,
  Distinct,
  Drop,
  emitPartition,
  Filter,
  FilterOperator,
  type FilterRule,
  type FilterValueItem,
  func,
  Group,
  type IR,
  isFilterValueList,
  Limit,
  NodeRegistry,
  NotFilter,
  Partition,
  PARTITION_DEFINITION,
  type Query,
  type QueryNode,
  QueryEmitter,
  type RelationalTableSource,
  Rename,
  Restrict,
  Sort,
  SortDirection,
  type TransformDefinition,
  WindowRankFunction,
  WindowRowFunction,
} from '@finos/legend-cube';
import {
  TEST__chainOf,
  TEST__columnValues,
  TEST__expectValidQuery,
  TEST__inferredSchema,
  TEST__northwindTable,
  TEST__resolveSources,
} from '../__test-utils__/CubeOperationsTestUtils.js';
import type { CubeResult } from '../graph-manager/CubeEngine.js';
import { V1_createEngineBackedCubeEngine } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeEngineTestUtils.js';
import type { V1_LegendCubeEngine } from '../graph-manager/protocol/pure/v1/V1_LegendCubeEngine.js';
import {
  CUBE_NORTHWIND_MODEL,
  CUBE_NORTHWIND_RUNTIME,
} from '../stores/fixtures/CubeNorthwindModel.js';

// Window compositions (PLAN §11.6, M5.9): Cube query graphs with a Partition,
// in pairs and triples, emitted by Cube's QueryEmitter and run on the Cube
// Northwind fixture's H2, each checked against a small JS reference computed
// from ORDERS' rows. The reference follows D4's null rules: a comparison with
// an empty value is false, a negation keeps the empty rows, Count skips empty
// values and Count Rows doesn't. A window with sort keys runs its aggregates
// up to each row and the rows tied with it (SQL's default RANGE frame), one
// without covers its whole partition. H2 sorts an empty value after every
// other ascending and before them descending, in a Sort and in a window
// (✅ probed for M5.9), and so does the reference. A Row Number numbers tied
// rows in any order, so it is compared as a set per tie. Rows are compared
// as multisets, and in order where a Sort's order reaches the capture.
//
// The negative control runs a Partition written in the single form (`~n: …`,
// not `~[…]`) and never bound by a let: a Filter on input columns then runs
// before the window, and France's count comes back as 2, not 77
// (✅ m5-requirements synth/s1-let-filter.out). A Filter on the window column
// alone is no such control on H2: the engine writes it as a QUALIFY, which
// gives the right rows (✅ probed for M5.9). FREIGHT is left out: its REAL
// values show float noise. Each composition is one engine call, and setting
// up two (ORDERS' schema, then its rows).

const ROW_LIMIT = 10000;

/** ORDERS' columns the reference reads: integers, strings, dates, and the nullable SHIPPED_DATE and SHIP_REGION */
const BASE_COLUMNS = [
  'ORDER_ID',
  'CUSTOMER_ID',
  'EMPLOYEE_ID',
  'ORDER_DATE',
  'SHIPPED_DATE',
  'SHIP_VIA',
  'SHIP_REGION',
  'SHIP_COUNTRY',
];
const INTEGER_COLUMNS = new Set(['ORDER_ID', 'EMPLOYEE_ID', 'SHIP_VIA']);

// -------------------- the reference --------------------

type Value = number | string | null;
type Row = Readonly<Record<string, Value>>;

interface Relation {
  readonly columns: readonly string[];
  readonly rows: readonly Row[];
  /** The order the rows come in, by a Sort's keys; empty when nothing orders them */
  readonly order: readonly ColumnDirection[];
  /**
   * The Row Number columns that number tied rows, which the database numbers
   * in any order, each with the columns that tie the rows
   */
  readonly tiedRowNumbers: ReadonlyMap<string, readonly string[]>;
}

/** An empty value sorts after every other, as on H2 (descending: before them) */
const compareValues = (a: Value, b: Value): number =>
  a === b ? 0 : a === null ? 1 : b === null ? -1 : a < b ? -1 : a > b ? 1 : 0;

const compareRows =
  (keys: readonly ColumnDirection[]) =>
  (x: Row, y: Row): number => {
    for (const { column, direction } of keys) {
      const compared = compareValues(x[column] ?? null, y[column] ?? null);
      if (compared !== 0) {
        return direction === SortDirection.DESC ? -compared : compared;
      }
    }
    return 0;
  };

/** The values of some columns of a row, as one key: an empty value equals another, as in PARTITION BY, GROUP BY and DISTINCT */
const keyOf = (row: Row, columns: readonly string[]): string =>
  JSON.stringify(columns.map((column) => row[column] ?? null));

const groupRows = (
  rows: readonly Row[],
  columns: readonly string[],
): Row[][] => {
  const groups = new Map<string, Row[]>();
  rows.forEach((row) => {
    const key = keyOf(row, columns);
    const rowsOfKey = groups.get(key);
    if (rowsOfKey) {
      rowsOfKey.push(row);
    } else {
      groups.set(key, [row]);
    }
  });
  return [...groups.values()];
};

const literalOf = (item: FilterValueItem): Value => {
  if (item.kind === 'integer') {
    return Number(item.value);
  }
  if (item.kind === 'string' || item.kind === 'strictDate') {
    return item.value;
  }
  throw new Error(`The reference has no ${item.kind} value`);
};

/** Whether a row passes a filter rule, as D4 has it: two-valued, a comparison with an empty value false */
const matches = (rule: FilterRule, row: Row): boolean => {
  if (rule instanceof NotFilter) {
    return !matches(rule.rule, row);
  }
  if (rule instanceof CompositeFilter) {
    return rule.operator === CompositeFilterOperator.AND
      ? rule.rules.every((child) => matches(child, row))
      : rule.rules.some((child) => matches(child, row));
  }
  if (!(rule instanceof ColumnComparisonFilter)) {
    throw new Error(`The reference has no ${rule.kind} rule`);
  }
  const value = row[rule.columnName] ?? null;
  const operand = rule.value;
  const literals = (
    operand === undefined
      ? []
      : isFilterValueList(operand)
        ? operand
        : [operand]
  ).map(literalOf);
  const [literal] = literals;
  const compared =
    value === null || literal === undefined
      ? undefined
      : compareValues(value, literal);
  const listed =
    value !== null && literals.some((item) => compareValues(value, item) === 0);
  switch (rule.operator) {
    case FilterOperator.EQUAL:
      return compared === 0;
    case FilterOperator.NOT_EQUAL:
      return compared !== 0;
    case FilterOperator.GREATER_THAN:
      return compared !== undefined && compared > 0;
    case FilterOperator.GREATER_THAN_OR_EQUAL:
      return compared !== undefined && compared >= 0;
    case FilterOperator.LESS_THAN:
      return compared !== undefined && compared < 0;
    case FilterOperator.LESS_THAN_OR_EQUAL:
      return compared !== undefined && compared <= 0;
    case FilterOperator.IN:
      return listed;
    case FilterOperator.NOT_IN:
      return !listed;
    case FilterOperator.IS_EMPTY:
      return value === null;
    case FilterOperator.IS_NOT_EMPTY:
      return value !== null;
    default:
      throw new Error(`The reference has no ${rule.operator} operator`);
  }
};

/** An aggregation of some rows: Count skips empty values, Count Rows counts every row, the others give empty when every value is */
const aggregate = (
  { column, function: fn }: ColumnAggregation,
  rows: readonly Row[],
): Value => {
  const values =
    column === undefined
      ? []
      : rows
          .map((row) => row[column] ?? null)
          .filter((value): value is number | string => value !== null);
  const sorted = [...values].sort(compareValues);
  const distinct = [...new Set(values)];
  switch (fn) {
    case AggregationFunction.COUNT_ROWS:
      return rows.length;
    case AggregationFunction.COUNT:
      return values.length;
    case AggregationFunction.DISTINCT_COUNT:
      return distinct.length;
    case AggregationFunction.DISTINCT_VALUE:
      return distinct.length === 1 ? (distinct[0] as Value) : null;
    case AggregationFunction.SUM:
      return values.length
        ? values.reduce<number>((total, value) => total + Number(value), 0)
        : null;
    case AggregationFunction.MIN:
      return sorted[0] ?? null;
    case AggregationFunction.MAX:
      return sorted.at(-1) ?? null;
    default:
      throw new Error(`The reference has no ${fn} function`);
  }
};

/** Takes rows by their order, which must be known and leave no tie at the cut */
const cutRows = (input: Relation, size: number, nodeId: string): void => {
  if (!input.order.length) {
    throw new Error(`The reference can't cut "${nodeId}": no order`);
  }
  const [before, after] = [input.rows[size - 1], input.rows[size]];
  if (before && after && compareRows(input.order)(before, after) === 0) {
    throw new Error(`The reference can't cut "${nodeId}": a tie at the cut`);
  }
};

/** NTile's bucket for the row at a place of a partition: the first buckets one row larger, as SQL fills them */
const ntileOf = (place: number, size: number, buckets: number): number => {
  const small = Math.floor(size / buckets);
  const large = size % buckets;
  return place < large * (small + 1)
    ? Math.floor(place / (small + 1)) + 1
    : large + Math.floor((place - large * (small + 1)) / small) + 1;
};

/** The functions whose value depends on where a row is, which a tie on the sort leaves open (PLAN §11.9) */
const PLACED_FUNCTIONS: readonly string[] = [
  WindowRankFunction.NTILE,
  ...Object.values(WindowRowFunction),
];

/**
 * A window (spec §7.13, D5, PLAN §11.9): each row of a partition gets its
 * functions over the partition's rows up to it and the rows tied with it on
 * the sort keys, or over the whole partition without any; a rank counts the
 * rows before the tie, a dense rank the ties before it, a row number its
 * place, NTile its bucket by place, Percent Rank (rank - 1) / (rows - 1) and
 * Cumulative Distribution the rows up to and tied with it, over the
 * partition's; Lag and Lead read the row so many places before or after, First
 * and Last the partition's first and last rows. The reference refuses a tie
 * for the functions that depend on a row's place.
 */
const applyWindow = (input: Relation, node: Partition): Relation => {
  const sortColumns = node.sorts.map(({ column }) => column);
  const byKeys = compareRows(node.sorts);
  const added = new Map<Row, Record<string, Value>>();
  const tiedRowNumbers = new Map(input.tiedRowNumbers);
  groupRows(input.rows, node.columns).forEach((rows) => {
    const sorted = [...rows].sort(byKeys);
    let start = 0;
    let ties = 0;
    while (start < sorted.length) {
      let end = start + 1;
      while (
        end < sorted.length &&
        byKeys(sorted[start] as Row, sorted[end] as Row) === 0
      ) {
        end += 1;
      }
      ties += 1;
      const frame = node.sorts.length ? sorted.slice(0, end) : sorted;
      const tie = sorted.slice(start, end);
      if (
        tie.length > 1 &&
        node.aggregations.some(({ function: fn }) =>
          PLACED_FUNCTIONS.includes(fn),
        )
      ) {
        throw new Error(
          `The reference can't place the rows of "${node.id}": a tie on its sort`,
        );
      }
      tie.forEach((row, index) => {
        added.set(
          row,
          Object.fromEntries(
            node.aggregations.map((aggregation) => {
              switch (aggregation.function) {
                case WindowRankFunction.RANK:
                  return [aggregation.name, start + 1];
                case WindowRankFunction.DENSE_RANK:
                  return [aggregation.name, ties];
                case WindowRankFunction.ROW_NUMBER:
                  if (tie.length > 1) {
                    tiedRowNumbers.set(aggregation.name, [
                      ...node.columns,
                      ...sortColumns,
                    ]);
                  }
                  return [aggregation.name, start + index + 1];
                case WindowRankFunction.NTILE:
                  return [
                    aggregation.name,
                    ntileOf(
                      start + index,
                      sorted.length,
                      aggregation.buckets ?? 0,
                    ),
                  ];
                case WindowRankFunction.PERCENT_RANK:
                  return [
                    aggregation.name,
                    sorted.length === 1 ? 0 : start / (sorted.length - 1),
                  ];
                case WindowRankFunction.CUMULATIVE_DISTRIBUTION:
                  return [aggregation.name, end / sorted.length];
                case WindowRowFunction.LAG:
                case WindowRowFunction.LEAD: {
                  const offset =
                    (aggregation.offset ?? 0) *
                    (aggregation.function === WindowRowFunction.LAG ? -1 : 1);
                  return [
                    aggregation.name,
                    sorted[start + index + offset]?.[
                      aggregation.column as string
                    ] ?? null,
                  ];
                }
                case WindowRowFunction.FIRST:
                  return [
                    aggregation.name,
                    sorted[0]?.[aggregation.column as string] ?? null,
                  ];
                case WindowRowFunction.LAST:
                  return [
                    aggregation.name,
                    sorted.at(-1)?.[aggregation.column as string] ?? null,
                  ];
                default:
                  return [aggregation.name, aggregate(aggregation, frame)];
              }
            }),
          ),
        );
      });
      start = end;
    }
  });
  return {
    columns: [...input.columns, ...node.aggregations.map(({ name }) => name)],
    rows: input.rows.map((row) => ({ ...row, ...added.get(row) })),
    order: input.order,
    tiedRowNumbers,
  };
};

/** The reference's result of a node, from its input's */
const applyNode = (input: Relation, node: QueryNode): Relation => {
  if (input.tiedRowNumbers.size) {
    // what follows would depend on how the database numbers the ties
    throw new Error(`The reference can't run "${node.id}" after tied rows`);
  }
  if (node instanceof Filter) {
    const rule = node.filter as FilterRule;
    return { ...input, rows: input.rows.filter((row) => matches(rule, row)) };
  }
  if (node instanceof Restrict) {
    const dropped = input.order.findIndex(
      ({ column }) => !node.columns.includes(column),
    );
    const columns = input.columns.filter((column) =>
      node.columns.includes(column),
    );
    return {
      ...input,
      columns,
      rows: input.rows.map((row) =>
        Object.fromEntries(
          columns.map((column) => [column, row[column] ?? null]),
        ),
      ),
      order: dropped < 0 ? input.order : input.order.slice(0, dropped),
    };
  }
  if (node instanceof Rename) {
    const renamed = (column: string): string =>
      node.mappings.find(({ from }) => from === column)?.to ?? column;
    return {
      ...input,
      columns: input.columns.map(renamed),
      rows: input.rows.map((row) =>
        Object.fromEntries(
          Object.entries(row).map(([column, value]) => [
            renamed(column),
            value,
          ]),
        ),
      ),
      order: input.order.map((key) => ({
        ...key,
        column: renamed(key.column),
      })),
    };
  }
  if (node instanceof Distinct) {
    return {
      ...input,
      rows: groupRows(input.rows, input.columns).map((rows) => rows[0] as Row),
    };
  }
  if (node instanceof Sort) {
    return {
      ...input,
      rows: [...input.rows].sort(compareRows(node.sorts)),
      order: [
        ...node.sorts,
        ...input.order.filter(
          ({ column }) => !node.sorts.some((key) => key.column === column),
        ),
      ],
    };
  }
  if (node instanceof Limit) {
    cutRows(input, node.size as number, node.id);
    return { ...input, rows: input.rows.slice(0, node.size) };
  }
  if (node instanceof Drop) {
    cutRows(input, node.size as number, node.id);
    return { ...input, rows: input.rows.slice(node.size) };
  }
  if (node instanceof Group) {
    return {
      columns: [...node.columns, ...node.aggregations.map(({ name }) => name)],
      rows: groupRows(input.rows, node.columns).map((rows) => ({
        ...Object.fromEntries(
          node.columns.map((column) => [
            column,
            (rows[0] as Row)[column] ?? null,
          ]),
        ),
        ...Object.fromEntries(
          node.aggregations.map((aggregation) => [
            aggregation.name,
            aggregate(aggregation, rows),
          ]),
        ),
      })),
      order: [],
      tiedRowNumbers: new Map(),
    };
  }
  if (node instanceof Partition) {
    return applyWindow(input, node);
  }
  throw new Error(`The reference has no ${node.type} node`);
};

// -------------------- comparing --------------------

const canonical = (value: unknown): string | null =>
  value === null || value === undefined ? null : String(value);

const project = (rows: readonly Row[], columns: readonly string[]): string[] =>
  rows.map((row) =>
    JSON.stringify(columns.map((column) => canonical(row[column]))),
  );

const rowsOf = (result: CubeResult): Row[] =>
  result.rows.map((values) =>
    Object.fromEntries(
      result.columns.map((column, index) => [
        column,
        canonical(values[index] ?? null),
      ]),
    ),
  );

/** Each tie's row numbers, as a set: `<tie> <numbers>` */
const numbersByTie = (
  rows: readonly Row[],
  rowNumber: string,
  ties: readonly string[],
): string[] =>
  groupRows(
    rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([column, value]) => [
          column,
          canonical(value),
        ]),
      ),
    ),
    ties,
  )
    .map(
      (tie) =>
        `${keyOf(tie[0] as Row, ties)} ${tie
          .map((row) => row[rowNumber])
          .sort()
          .join()}`,
    )
    .sort();

/** The first few items of one list missing from another, as multisets */
const missingFrom = (
  items: readonly string[],
  others: readonly string[],
): string[] => {
  const left = new Map<string, number>();
  others.forEach((item) => left.set(item, (left.get(item) ?? 0) + 1));
  return items
    .filter((item) => {
      const count = left.get(item) ?? 0;
      left.set(item, count - 1);
      return count <= 0;
    })
    .slice(0, 5);
};

/**
 * How a result differs from the reference's, one line per difference: its
 * columns, each tie's row numbers, its order when a Sort's reaches the
 * capture, and its rows as a multiset
 */
const referenceDifferences = (
  result: CubeResult,
  expected: Relation,
): string[] => {
  if (result.columns.join() !== expected.columns.join()) {
    return [
      `columns ${result.columns.join(', ')}, the reference's ${expected.columns.join(', ')}`,
    ];
  }
  const actual = rowsOf(result);
  const differences: string[] = [];
  let compared = expected.columns;
  expected.tiedRowNumbers.forEach((ties, rowNumber) => {
    const got = numbersByTie(actual, rowNumber, ties);
    const wanted = numbersByTie(expected.rows, rowNumber, ties);
    missingFrom(got, wanted).forEach((tie) =>
      differences.push(`${rowNumber} of the tie ${tie} is not the reference's`),
    );
    compared = compared.filter((column) => column !== rowNumber);
  });
  if (expected.order.length) {
    const keys = expected.order.map(({ column }) => column);
    const got = project(actual, keys);
    const wanted = project(expected.rows, keys);
    const index = got.findIndex((key, at) => key !== wanted[at]);
    if (index >= 0) {
      differences.push(
        `row ${index} is ${got[index]} by ${keys.join(', ')}, the reference's ${wanted[index]}`,
      );
    }
  }
  const got = project(actual, compared);
  const wanted = project(expected.rows, compared);
  if (got.length !== wanted.length) {
    differences.push(`${got.length} rows, the reference's ${wanted.length}`);
  }
  missingFrom(got, wanted).forEach((row) =>
    differences.push(`row ${row} is not the reference's`),
  );
  missingFrom(wanted, got).forEach((row) =>
    differences.push(`the reference's row ${row} is missing`),
  );
  return differences;
};

// -------------------- nodes --------------------

const { ASC, DESC } = SortDirection;
const { COUNT, COUNT_ROWS, DISTINCT_COUNT, DISTINCT_VALUE, SUM, MIN, MAX } =
  AggregationFunction;
const {
  RANK,
  DENSE_RANK,
  ROW_NUMBER,
  NTILE,
  PERCENT_RANK,
  CUMULATIVE_DISTRIBUTION,
} = WindowRankFunction;
const { LAG, LEAD, FIRST, LAST } = WindowRowFunction;

const asc = (column: string): ColumnDirection => ({ column, direction: ASC });
const desc = (column: string): ColumnDirection => ({ column, direction: DESC });

/** A window or group function: its function, its column if it takes one, its name, and an offset or a bucket count */
type FunctionSpec = readonly [
  string,
  string | undefined,
  string,
  Pick<ColumnAggregation, 'offset' | 'buckets'>?,
];

const aggregationOf = ([
  function_,
  column,
  name,
  settings,
]: FunctionSpec): ColumnAggregation => ({
  column,
  function: function_,
  name,
  ...settings,
});

const partition = (
  id: string,
  columns: string[],
  sorts: ColumnDirection[],
  ...functions: FunctionSpec[]
): Partition => new Partition(id, columns, sorts, functions.map(aggregationOf));

const group = (
  id: string,
  columns: string[],
  ...functions: FunctionSpec[]
): Group => new Group(id, columns, functions.map(aggregationOf));

const int = (value: number): FilterValueItem => ({
  kind: 'integer',
  value: String(value),
});
const str = (value: string): FilterValueItem => ({ kind: 'string', value });
const date = (value: string): FilterValueItem => ({
  kind: 'strictDate',
  value,
});

const is = (
  column: string,
  operator: FilterOperator,
  value?: FilterValueItem | FilterValueItem[],
): FilterRule => new ColumnComparisonFilter(column, operator, value);
const and = (...rules: FilterRule[]): FilterRule =>
  new CompositeFilter(CompositeFilterOperator.AND, rules);
const or = (...rules: FilterRule[]): FilterRule =>
  new CompositeFilter(CompositeFilterOperator.OR, rules);
const not = (rule: FilterRule): FilterRule => new NotFilter(rule);
const filter = (id: string, rule: FilterRule): Filter => new Filter(id, rule);

const { EQUAL, NOT_EQUAL, GREATER_THAN, GREATER_THAN_OR_EQUAL } =
  FilterOperator;
const { LESS_THAN, LESS_THAN_OR_EQUAL, IN, NOT_IN, IS_EMPTY } = FilterOperator;

// -------------------- the compositions --------------------

interface Composition {
  /** The nodes after ORDERS' base columns, each feeding the next, captured at the last */
  readonly nodes: readonly QueryNode[];
  /** The database Cube writes the query for, run on H2 all the same */
  readonly databaseType?: string;
}

/** A Count Rows of each country, then a Filter on input columns keeping two of France's rows */
const FRANCE: Composition = {
  nodes: [
    partition(
      'partition101',
      ['SHIP_COUNTRY'],
      [],
      [COUNT_ROWS, undefined, 'n'],
    ),
    filter(
      'filter101',
      and(
        is('SHIP_COUNTRY', EQUAL, str('France')),
        is('ORDER_ID', LESS_THAN, int(10252)),
      ),
    ),
  ],
};

/** A Count Rows of each country, then a Filter on that count */
const COUNT_FILTERED: Composition = {
  nodes: [
    partition(
      'partition101',
      ['SHIP_COUNTRY'],
      [],
      [COUNT_ROWS, undefined, 'n'],
      [COUNT, 'SHIP_REGION', 'regions'],
    ),
    filter('filter101', is('n', GREATER_THAN_OR_EQUAL, int(77))),
  ],
};

const COMPOSITIONS: readonly (readonly [string, Composition])[] = [
  [
    "Counts each country's orders before a Filter on the count keeps the countries with 77 or more",
    COUNT_FILTERED,
  ],
  [
    "Counts France's 77 orders on the two rows a Filter on input columns keeps after the window",
    FRANCE,
  ],
  [
    'Runs a window only over the rows a Filter before it keeps',
    {
      nodes: [
        filter(
          'filter101',
          is('SHIP_COUNTRY', IN, [str('France'), str('Germany')]),
        ),
        partition(
          'partition101',
          ['SHIP_COUNTRY'],
          [asc('ORDER_DATE')],
          [COUNT_ROWS, undefined, 'n'],
          [SUM, 'EMPLOYEE_ID', 's'],
          [RANK, undefined, 'rk'],
        ),
      ],
    },
  ],
  [
    "Ranks each country's rows by a count from an earlier window, ties sharing a rank",
    {
      nodes: [
        partition(
          'partition101',
          ['CUSTOMER_ID'],
          [],
          [COUNT_ROWS, undefined, 'orders'],
        ),
        partition(
          'partition102',
          ['SHIP_COUNTRY'],
          [desc('orders')],
          [RANK, undefined, 'rk'],
          [DENSE_RANK, undefined, 'drk'],
          [ROW_NUMBER, undefined, 'rn'],
          [MIN, 'orders', 'fewest'],
          [COUNT_ROWS, undefined, 'n'],
        ),
      ],
    },
  ],
  [
    'Filters on a window over another window, each bound by its own let',
    {
      nodes: [
        partition(
          'partition101',
          ['EMPLOYEE_ID'],
          [],
          [COUNT_ROWS, undefined, 'employeeOrders'],
        ),
        partition(
          'partition102',
          ['SHIP_COUNTRY'],
          [desc('employeeOrders'), asc('ORDER_ID')],
          [ROW_NUMBER, undefined, 'rn'],
          [MAX, 'employeeOrders', 'busiest'],
        ),
        filter('filter101', is('rn', LESS_THAN_OR_EQUAL, int(2))),
      ],
    },
  ],
  [
    'Groups the rows by how many orders their customer placed, as a window counted them',
    {
      nodes: [
        partition(
          'partition101',
          ['CUSTOMER_ID'],
          [],
          [COUNT_ROWS, undefined, 'orders'],
        ),
        group(
          'group101',
          ['orders'],
          [COUNT_ROWS, undefined, 'rows'],
          [COUNT, 'SHIPPED_DATE', 'shipped'],
          [SUM, 'SHIP_VIA', 'via'],
        ),
      ],
    },
  ],
  [
    "Groups the rows with no SHIP_REGION together, summing a window's counts",
    {
      nodes: [
        partition(
          'partition101',
          ['SHIP_COUNTRY'],
          [],
          [COUNT_ROWS, undefined, 'n'],
        ),
        group(
          'group101',
          ['SHIP_REGION'],
          [COUNT_ROWS, undefined, 'rows'],
          [SUM, 'n', 'counted'],
          [COUNT, 'SHIP_REGION', 'regions'],
        ),
      ],
    },
  ],
  [
    "Ranks each country's employees by the orders a Group counted, with a running Sum of them",
    {
      nodes: [
        group(
          'group101',
          ['SHIP_COUNTRY', 'EMPLOYEE_ID'],
          [COUNT_ROWS, undefined, 'n'],
          [SUM, 'SHIP_VIA', 'via'],
        ),
        partition(
          'partition101',
          ['SHIP_COUNTRY'],
          [desc('n')],
          [RANK, undefined, 'rk'],
          [DENSE_RANK, undefined, 'drk'],
          [SUM, 'n', 'running'],
          [COUNT_ROWS, undefined, 'upTo'],
        ),
      ],
    },
  ],
  [
    "Counts by country only the 100 latest orders a Sort and a Limit keep, in the Sort's order",
    {
      nodes: [
        new Sort('sort101', [desc('ORDER_DATE'), desc('ORDER_ID')]),
        new Limit('limit101', 100),
        partition(
          'partition101',
          ['SHIP_COUNTRY'],
          [],
          [COUNT_ROWS, undefined, 'n'],
          [MIN, 'ORDER_DATE', 'first'],
          [MAX, 'SHIPPED_DATE', 'lastShipped'],
        ),
      ],
    },
  ],
  [
    "Ranks the last 30 orders a Drop keeps by shipping date descending, then keeps the shipped ones, ranked after the unshipped, in the Sort's order",
    {
      nodes: [
        new Sort('sort101', [asc('ORDER_ID')]),
        new Drop('drop101', 800),
        partition(
          'partition101',
          [],
          [desc('SHIPPED_DATE')],
          [COUNT_ROWS, undefined, 'n'],
          [RANK, undefined, 'rk'],
          [COUNT, 'SHIPPED_DATE', 'shipped'],
        ),
        filter('filter101', not(is('SHIPPED_DATE', IS_EMPTY))),
      ],
    },
  ],
  [
    'Takes the 25 first rows by a Rank of shipping dates descending, the 21 unshipped orders ranked first',
    {
      nodes: [
        partition(
          'partition101',
          [],
          [desc('SHIPPED_DATE')],
          [RANK, undefined, 'rk'],
          [COUNT_ROWS, undefined, 'n'],
        ),
        new Sort('sort101', [asc('rk'), asc('ORDER_ID')]),
        new Limit('limit101', 25),
      ],
    },
  ],
  [
    'Takes the 10 rows with the highest running Sum by country, ties broken by ORDER_ID',
    {
      nodes: [
        partition(
          'partition101',
          ['SHIP_COUNTRY'],
          [asc('ORDER_DATE')],
          [SUM, 'EMPLOYEE_ID', 'running'],
        ),
        new Sort('sort101', [desc('running'), asc('ORDER_ID')]),
        new Limit('limit101', 10),
      ],
    },
  ],
  [
    "Keeps each employee's first three orders by a Row Number, after a Restrict",
    {
      nodes: [
        partition(
          'partition101',
          ['EMPLOYEE_ID'],
          [asc('ORDER_DATE'), asc('ORDER_ID')],
          [ROW_NUMBER, undefined, 'rn'],
          [COUNT_ROWS, undefined, 'n'],
        ),
        new Restrict('restrict101', [
          'ORDER_ID',
          'EMPLOYEE_ID',
          'ORDER_DATE',
          'rn',
        ]),
        filter('filter101', is('rn', LESS_THAN_OR_EQUAL, int(3))),
      ],
    },
  ],
  [
    "Counts each country's customers by their first order: a Row Number, a Filter on it, then a Group",
    {
      nodes: [
        partition(
          'partition101',
          ['CUSTOMER_ID'],
          [asc('ORDER_DATE'), asc('ORDER_ID')],
          [ROW_NUMBER, undefined, 'rn'],
        ),
        filter('filter101', is('rn', EQUAL, int(1))),
        group(
          'group101',
          ['SHIP_COUNTRY'],
          [COUNT_ROWS, undefined, 'firsts'],
          [SUM, 'EMPLOYEE_ID', 'employees'],
        ),
      ],
    },
  ],
  [
    "Gives every row the whole table's totals with no partition column and no sort",
    {
      nodes: [
        partition(
          'partition101',
          [],
          [],
          [COUNT_ROWS, undefined, 'n'],
          [COUNT, 'SHIPPED_DATE', 'shipped'],
          [SUM, 'SHIP_VIA', 'via'],
          [MIN, 'ORDER_DATE', 'first'],
          [MAX, 'SHIPPED_DATE', 'last'],
          [DISTINCT_COUNT, 'SHIP_COUNTRY', 'countries'],
        ),
        filter('filter101', is('ORDER_ID', LESS_THAN, int(10255))),
      ],
    },
  ],
  [
    'Counts the rows with no SHIP_REGION as one partition, whole though a Filter keeps the first of them',
    {
      nodes: [
        partition(
          'partition101',
          ['SHIP_REGION'],
          [],
          [COUNT_ROWS, undefined, 'n'],
          [COUNT, 'SHIP_REGION', 'regions'],
          [DISTINCT_COUNT, 'SHIP_COUNTRY', 'countries'],
        ),
        filter(
          'filter101',
          and(
            or(
              is('SHIP_REGION', IS_EMPTY),
              is('SHIP_REGION', EQUAL, str('BC')),
            ),
            is('ORDER_ID', LESS_THAN, int(10300)),
          ),
        ),
      ],
    },
  ],
  [
    'Ranks the unshipped orders last in an ascending window, tied with each other',
    {
      nodes: [
        partition(
          'partition101',
          ['SHIP_COUNTRY'],
          [asc('SHIPPED_DATE')],
          [RANK, undefined, 'rk'],
          [DENSE_RANK, undefined, 'drk'],
          [COUNT_ROWS, undefined, 'n'],
          [COUNT, 'SHIPPED_DATE', 'shipped'],
          [MAX, 'SHIPPED_DATE', 'latest'],
          [MIN, 'SHIPPED_DATE', 'earliest'],
        ),
      ],
    },
  ],
  [
    'Keeps the rows whose running latest shipping date is empty through a negated Filter on that window column',
    {
      nodes: [
        partition(
          'partition101',
          ['SHIP_COUNTRY'],
          [desc('SHIPPED_DATE')],
          [MAX, 'SHIPPED_DATE', 'latest'],
          [COUNT, 'SHIPPED_DATE', 'shipped'],
          [DENSE_RANK, undefined, 'drk'],
        ),
        filter(
          'filter101',
          not(is('latest', GREATER_THAN, date('1998-04-01'))),
        ),
      ],
    },
  ],
  [
    'Numbers the rows tied on a date in any order, but with the numbers of their tie',
    {
      nodes: [
        partition(
          'partition101',
          [],
          [asc('ORDER_DATE')],
          [ROW_NUMBER, undefined, 'rn'],
          [RANK, undefined, 'rk'],
          [COUNT_ROWS, undefined, 'n'],
        ),
      ],
    },
  ],
  [
    'Filters on a window column under its new name after a Rename',
    {
      nodes: [
        partition(
          'partition101',
          ['CUSTOMER_ID'],
          [],
          [COUNT_ROWS, undefined, 'n'],
        ),
        new Rename('rename101', [{ from: 'n', to: 'orders' }]),
        filter('filter101', is('orders', GREATER_THAN_OR_EQUAL, int(28))),
      ],
    },
  ],
  [
    'Keeps one row per country with its window counts, through a Restrict and a Distinct',
    {
      nodes: [
        partition(
          'partition101',
          ['SHIP_COUNTRY'],
          [],
          [COUNT_ROWS, undefined, 'n'],
          [DISTINCT_COUNT, 'CUSTOMER_ID', 'customers'],
        ),
        new Restrict('restrict101', ['SHIP_COUNTRY', 'n', 'customers']),
        new Distinct('distinct101'),
      ],
    },
  ],
  [
    "Numbers each country's shippers once a Distinct leaves one row per pair",
    {
      nodes: [
        new Restrict('restrict101', ['SHIP_VIA', 'SHIP_COUNTRY']),
        new Distinct('distinct101'),
        partition(
          'partition101',
          ['SHIP_COUNTRY'],
          [asc('SHIP_VIA')],
          [COUNT_ROWS, undefined, 'n'],
          [ROW_NUMBER, undefined, 'rn'],
        ),
      ],
    },
  ],
  [
    "Keeps an earlier Sort's order through a window, which numbers the rows by its own sort",
    {
      nodes: [
        new Sort('sort101', [asc('SHIP_COUNTRY'), desc('ORDER_ID')]),
        partition(
          'partition101',
          ['SHIP_COUNTRY'],
          [asc('ORDER_ID')],
          [ROW_NUMBER, undefined, 'rn'],
          [COUNT_ROWS, undefined, 'n'],
        ),
      ],
    },
  ],
  [
    'Keeps the rows with no SHIP_REGION through Not Equal and Not In after a window (D4)',
    {
      nodes: [
        partition(
          'partition101',
          ['SHIP_COUNTRY'],
          [],
          [COUNT_ROWS, undefined, 'n'],
        ),
        filter(
          'filter101',
          and(
            is('SHIP_REGION', NOT_EQUAL, str('BC')),
            is('SHIP_REGION', NOT_IN, [str('RJ'), str('SP')]),
            is('ORDER_ID', LESS_THAN, int(10300)),
          ),
        ),
      ],
    },
  ],
  [
    'Counts distinct employees and the one customer so far, by country and shipper',
    {
      nodes: [
        partition(
          'partition101',
          ['SHIP_COUNTRY', 'SHIP_VIA'],
          [desc('ORDER_DATE')],
          [DENSE_RANK, undefined, 'drk'],
          [DISTINCT_COUNT, 'EMPLOYEE_ID', 'employees'],
          [DISTINCT_VALUE, 'CUSTOMER_ID', 'onlyCustomer'],
          [COUNT_ROWS, undefined, 'n'],
          [DISTINCT_COUNT, 'SHIP_REGION', 'regions'],
          [DISTINCT_VALUE, 'SHIP_REGION', 'onlyRegion'],
        ),
        filter(
          'filter101',
          is('SHIP_COUNTRY', IN, [
            str('Spain'),
            str('Norway'),
            str('Poland'),
            str('UK'),
          ]),
        ),
      ],
    },
  ],
  [
    'Lists the ranks among the aggregates as the Partition lists them, ahead of a Filter on a date',
    {
      nodes: [
        partition(
          'partition101',
          ['SHIP_VIA'],
          [asc('ORDER_DATE')],
          [RANK, undefined, 'rk'],
          [COUNT_ROWS, undefined, 'n'],
          [DENSE_RANK, undefined, 'drk'],
          [MIN, 'SHIPPED_DATE', 'firstShipped'],
        ),
        filter('filter101', is('ORDER_DATE', LESS_THAN, date('1996-08-01'))),
      ],
    },
  ],
  [
    'Drops rows by row numbers, as for SQL Server, before a window and a Filter',
    {
      databaseType: 'SqlServer',
      nodes: [
        new Sort('sort101', [desc('ORDER_DATE'), asc('ORDER_ID')]),
        new Drop('drop101', 790),
        partition(
          'partition101',
          ['SHIP_VIA'],
          [],
          [COUNT_ROWS, undefined, 'n'],
          [MIN, 'ORDER_DATE', 'first'],
        ),
        filter('filter101', is('EMPLOYEE_ID', NOT_EQUAL, int(4))),
      ],
    },
  ],
  [
    'Drops rows by row numbers, as for SQL Server, after a window, by a Sort on its Row Number',
    {
      databaseType: 'SqlServer',
      nodes: [
        partition(
          'partition101',
          ['EMPLOYEE_ID'],
          [asc('ORDER_DATE'), asc('ORDER_ID')],
          [ROW_NUMBER, undefined, 'rn'],
        ),
        new Sort('sort101', [asc('EMPLOYEE_ID'), desc('rn')]),
        new Drop('drop101', 820),
      ],
    },
  ],
  [
    "Limits by row numbers, as for Sybase IQ, after a window, in the Sort's order",
    {
      databaseType: 'SybaseIQ',
      nodes: [
        partition(
          'partition101',
          ['SHIP_COUNTRY'],
          [asc('ORDER_DATE'), asc('ORDER_ID')],
          [ROW_NUMBER, undefined, 'rn'],
          [COUNT_ROWS, undefined, 'n'],
        ),
        new Sort('sort101', [desc('n'), asc('rn'), asc('ORDER_ID')]),
        new Limit('limit101', 12),
      ],
    },
  ],
  [
    "Reads three customers' orders before and after each one, first and last, and places each in its customer's orders (M5b)",
    {
      nodes: [
        partition(
          'partition101',
          ['CUSTOMER_ID'],
          [asc('ORDER_ID')],
          [LAG, 'ORDER_DATE', 'previous', { offset: 1 }],
          [LEAD, 'EMPLOYEE_ID', 'second next', { offset: 2 }],
          [FIRST, 'ORDER_DATE', 'first'],
          // EMPLOYEE_ID differs between their first and last orders
          [LAST, 'EMPLOYEE_ID', 'last employee'],
          [NTILE, undefined, 'quartile', { buckets: 4 }],
          [PERCENT_RANK, undefined, 'percent'],
          [CUMULATIVE_DISTRIBUTION, undefined, 'cumulative'],
        ),
        filter(
          'filter101',
          is('CUSTOMER_ID', IN, [str('ALFKI'), str('BONAP'), str('CENTC')]),
        ),
      ],
    },
  ],
  [
    "Takes each country's last order by a ship date that can be empty, the empty ones last, as Last reverses the sort (M5b)",
    {
      nodes: [
        partition(
          'partition101',
          ['SHIP_COUNTRY'],
          [asc('SHIPPED_DATE'), asc('ORDER_ID')],
          [FIRST, 'ORDER_ID', 'first shipped'],
          [LAST, 'ORDER_ID', 'last'],
          [LAG, 'SHIPPED_DATE', 'shipped before', { offset: 1 }],
        ),
      ],
    },
  ],
  [
    "Keeps the newest tenth of all orders with NTile over no partition column, and the oldest order's id on each (M5b)",
    {
      nodes: [
        partition(
          'partition101',
          [],
          [desc('ORDER_ID')],
          [NTILE, undefined, 'tenth', { buckets: 10 }],
          [LAST, 'ORDER_ID', 'oldest'],
        ),
        filter('filter101', is('tenth', EQUAL, int(1))),
      ],
    },
  ],
];

// -------------------- running --------------------

/**
 * A Partition written in the single form, `->extend(<over>, ~n: …)` once per
 * function, and never bound by a let: the regression this suite catches
 */
const singleForm = (ir: IR, nodeId: string): IR => {
  if (ir.k !== 'func' || ir.origin?.nodeId !== nodeId) {
    return ir;
  }
  const [input, ...rest] = ir.params as [IR, ...IR[]];
  const inner = singleForm(input, nodeId);
  const [over, specs] = rest;
  return ir.name === 'extend' && over && specs?.k === 'colSpecArray'
    ? specs.specs.reduce(
        (relation, spec) => func('extend', [relation, over, spec], ir.origin),
        inner,
      )
    : func(ir.name, [inner, ...rest], ir.origin);
};

const SINGLE_FORM_PARTITION: TransformDefinition<Partition> = {
  ...PARTITION_DEFINITION,
  emit: (node, inputs, context) =>
    singleForm(emitPartition(node, inputs, context), node.id),
  isolationBoundary: false,
};

const singleFormRegistry = (): NodeRegistry => {
  const registry = createNodeRegistry();
  return new NodeRegistry([
    ...registry.sources,
    ...registry.transforms.map((definition) =>
      definition.type === Partition.TYPE ? SINGLE_FORM_PARTITION : definition,
    ),
  ]);
};

/** Every IR node of a lambda, depth first, down to its column specs */
const irNodes = (ir: IR): IR[] => {
  const children: readonly IR[] =
    ir.k === 'func'
      ? ir.params
      : ir.k === 'lambda'
        ? ir.body
        : ir.k === 'let'
          ? [ir.value]
          : ir.k === 'colSpecArray'
            ? ir.specs
            : ir.k === 'collection'
              ? ir.values
              : [];
  return [ir, ...children.flatMap(irNodes)];
};

let engine: V1_LegendCubeEngine;
let orders: RelationalTableSource;
let base: Relation;

/** ORDERS' base columns, then the composition's nodes, captured at the last */
const queryOf = ({ nodes }: Composition): Query =>
  TEST__chainOf([orders, new Restrict('restrict100', BASE_COLUMNS), ...nodes]);

const emitRun = (
  query: Query,
  databaseType?: string,
  registry?: NodeRegistry,
): IR =>
  new QueryEmitter(query, registry).emitExecutionLambda({
    rowLimit: ROW_LIMIT,
    runtime: CUBE_NORTHWIND_RUNTIME,
    databaseType,
  });

const referenceOf = ({ nodes }: Composition): Relation =>
  nodes.reduce(applyNode, base);

beforeAll(async () => {
  const setup = V1_createEngineBackedCubeEngine().engine;
  [orders] = (await TEST__resolveSources(setup, [
    TEST__northwindTable('relational101', 'ORDERS'),
  ])) as [RelationalTableSource];
  const query = TEST__chainOf([
    orders,
    new Restrict('restrict100', BASE_COLUMNS),
  ]);
  const result = await setup.execute(CUBE_NORTHWIND_MODEL, emitRun(query));
  expect(result.columns).toEqual(BASE_COLUMNS);
  base = {
    columns: BASE_COLUMNS,
    rows: rowsOf(result).map((row) =>
      Object.fromEntries(
        BASE_COLUMNS.map((column) => {
          const value = row[column] ?? null;
          return [
            column,
            value !== null && INTEGER_COLUMNS.has(column)
              ? Number(value)
              : value,
          ];
        }),
      ),
    ),
    order: [],
    tiedRowNumbers: new Map(),
  };
});

// spies are restored after each test
beforeEach(() => {
  ({ engine } = V1_createEngineBackedCubeEngine());
});

describe('Window compositions on the engine', () => {
  test("Reads ORDERS' 830 rows for the reference, 21 of them unshipped and 507 with no SHIP_REGION", () => {
    expect(base.rows).toHaveLength(830);
    expect(base.rows.filter((row) => row.SHIPPED_DATE === null)).toHaveLength(
      21,
    );
    expect(base.rows.filter((row) => row.SHIP_REGION === null)).toHaveLength(
      507,
    );
  });

  test.each(COMPOSITIONS)('%s', async (_, composition) => {
    const query = queryOf(composition);
    TEST__expectValidQuery(query);
    const expected = referenceOf(composition);
    expect(expected.columns).toEqual(TEST__inferredSchema(query).names());
    expect(expected.rows.length).toBeGreaterThan(0);
    const executionLambda = emitRun(query, composition.databaseType);
    // every Partition but the capture is bound with a let
    expect(
      irNodes(executionLambda).filter(({ k }) => k === 'let'),
    ).toHaveLength(
      composition.nodes.filter(
        (node, index) =>
          node instanceof Partition && index < composition.nodes.length - 1,
      ).length,
    );
    // and written in the array form, which a later filter can't run before
    // even unbound (the single form is the negative control below)
    const partitionExtends = irNodes(executionLambda).filter(
      (ir): ir is Extract<IR, { k: 'func' }> =>
        ir.k === 'func' &&
        ir.name === 'extend' &&
        composition.nodes.some(
          (node) => node instanceof Partition && node.id === ir.origin?.nodeId,
        ),
    );
    expect(partitionExtends.length).toBeGreaterThan(0);
    expect(
      partitionExtends.every(({ params }) => params[2]?.k === 'colSpecArray'),
    ).toBe(true);
    const result = await engine.execute(CUBE_NORTHWIND_MODEL, executionLambda);
    expect(referenceDifferences(result, expected)).toEqual([]);
  });
});

describe('A window the engine does not isolate', () => {
  test("Gives France's two rows a count of 2, not 77, when the window is written in the single form and not bound", async () => {
    const query = queryOf(FRANCE);
    const executionLambda = emitRun(query, undefined, singleFormRegistry());
    const nodes = irNodes(executionLambda);
    expect(nodes.filter(({ k }) => k === 'let')).toEqual([]);
    const extend = nodes.find(
      (ir) => ir.k === 'func' && ir.name === 'extend',
    ) as Extract<IR, { k: 'func' }>;
    expect(extend.params[2]?.k).toBe('colSpec');
    const result = await engine.execute(CUBE_NORTHWIND_MODEL, executionLambda);
    expect(
      TEST__columnValues(result, 'ORDER_ID')
        .map(Number)
        .sort((a, b) => a - b),
    ).toEqual([10248, 10251]);
    expect(TEST__columnValues(result, 'n').map(Number)).toEqual([2, 2]);
    expect(referenceDifferences(result, referenceOf(FRANCE))).not.toEqual([]);
  });
});
