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
  buildSchemasAndValidity,
  ColumnComparisonFilter,
  CompositeFilter,
  CompositeFilterOperator,
  Connection,
  createNodeRegistry,
  CubeDocument,
  decodeCubeSpec,
  EmitRole,
  encodeCubeSpec,
  Filter,
  FilterOperator,
  type FilterRule,
  func,
  genericType,
  type IR,
  Join,
  JoinType,
  lambda,
  type LiteralValue,
  type ModelContext,
  NotFilter,
  Query,
  type QueryNode,
  QueryEmitter,
  RelationalTableSource,
  resolveCubeType,
  Schema,
  SchemaColumn,
  colSpec,
  colSpecArray,
  columnAccess,
  storeAccessor,
} from '@finos/legend-cube';
import {
  NetworkClientError,
  parseLosslessJSON,
  stringifyLosslessJSON,
} from '@finos/legend-shared';
import {
  CUBE_ENGINE_TEST__getCommit,
  CUBE_ENGINE_TEST__grammarToJson_lambda,
  CUBE_ENGINE_TEST__lambdaRelationTypeBatch,
} from '../__test-utils__/CubeEngineTestSupport.js';
import {
  CUBE_NORTHWIND_DATABASE as DATABASE,
  CUBE_NORTHWIND_MODEL as MODEL,
  CUBE_NORTHWIND_RUNTIME as RUNTIME,
} from '../stores/fixtures/CubeNorthwindModel.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeResult,
  type CubeResultValue,
} from '../graph-manager/CubeEngine.js';
import { V1_createEngineBackedCubeEngine } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeEngineTestUtils.js';
import { V1_serializeCubeLambda } from '../graph-manager/protocol/pure/v1/V1_CubeLambdaSerializer.js';
import type { V1_LegendCubeEngine } from '../graph-manager/protocol/pure/v1/V1_LegendCubeEngine.js';
import RELATION_TYPES from './CubeNorthwindRelationTypes.json' with { type: 'json' };

// Slice acceptance, part A (PLAN §11.2): Cube validates and emits, the engine
// runs, on the Cube Northwind fixture (§6.2.4)

const ROW_LIMIT = 10000;

let engine: V1_LegendCubeEngine;
let calls: ReturnType<typeof V1_createEngineBackedCubeEngine>['calls'];

beforeAll(async () => {
  // which engine these results come from, logged for provenance (PLAN §11.2)
  const commit = await CUBE_ENGINE_TEST__getCommit();
  expect(commit).toMatch(/^[0-9a-f]{40}$/u);
  process.stdout.write(`Legend Cube part A: engine commit ${commit}\n`);
});

// spies are restored after each test
beforeEach(() => {
  ({ engine, calls } = V1_createEngineBackedCubeEngine());
});

// -------------------------------- helpers --------------------------------

const table = (
  id: string,
  schema: string,
  name: string,
): RelationalTableSource =>
  new RelationalTableSource(id, { database: DATABASE, schema, table: name });

/** The sources, resolved through the engine as the editor resolves them */
const resolve = async (
  sources: RelationalTableSource[],
): Promise<RelationalTableSource[]> => {
  const typed = await engine.resolveSchemas(
    MODEL,
    new Map(
      sources.map((source) => [
        source.id,
        [source.database, source.schema, source.table] as const,
      ]),
    ),
  );
  return sources.map((source) => {
    const schema = typed.get(source.id);
    if (!(schema instanceof Schema)) {
      throw schema ?? new Error(`No schema for ${source.id}`);
    }
    return source.withResolution({ kind: 'resolved', schema });
  });
};

const compare = (
  column: string,
  operator: FilterOperator,
  value?: LiteralValue | LiteralValue[],
): ColumnComparisonFilter =>
  new ColumnComparisonFilter(column, operator, value);
const string = (value: string): LiteralValue => ({ kind: 'string', value });
const integer = (value: string): LiteralValue => ({ kind: 'integer', value });

/** A query with these nodes, inputs given as [source, target, port], captured at the last node */
const queryOf = (
  nodes: QueryNode[],
  edges: [string, string, string][],
  selected = nodes[nodes.length - 1]?.id,
): Query =>
  new Query(
    nodes,
    edges.map(([source, target, port]) => new Connection(source, target, port)),
    selected,
  );

/** Two resolved sources joined, captured at the join */
const joinOf = async (
  left: RelationalTableSource,
  right: RelationalTableSource,
  keys: [string, string][],
  joinType: JoinType,
): Promise<Query> => {
  const [l, r] = await resolve([left, right]);
  return queryOf(
    [
      l as RelationalTableSource,
      r as RelationalTableSource,
      new Join('join101', {
        leftColumns: keys.map(([key]) => key),
        rightColumns: keys.map(([, key]) => key),
        joinType,
      }),
    ],
    [
      [left.id, 'join101', 'leftTds'],
      [right.id, 'join101', 'rightTds'],
    ],
  );
};

/** A resolved source with a filter, captured at the filter */
const filterOf = async (
  source: RelationalTableSource,
  rule: FilterRule,
): Promise<Query> => {
  const [resolved] = await resolve([source]);
  return queryOf(
    [resolved as RelationalTableSource, new Filter('filter101', rule)],
    [[source.id, 'filter101', 'tds']],
  );
};

const expectValid = (query: Query): void => {
  const { validity } = buildSchemasAndValidity(
    query,
    createNodeRegistry().queryRules,
  );
  expect([...validity].filter(([, errors]) => errors.length)).toEqual([]);
};

const run = async (query: Query): Promise<CubeResult> => {
  expectValid(query);
  return engine.execute(
    MODEL,
    new QueryEmitter(query).emitExecutionLambda({
      rowLimit: ROW_LIMIT,
      runtime: RUNTIME,
    }),
  );
};

/** The values of one column of a result */
const valuesOf = (result: CubeResult, column: string): CubeResultValue[] => {
  const index = result.columns.indexOf(column);
  expect(index).toBeGreaterThanOrEqual(0);
  return result.rows.map((row) => row[index] ?? null);
};

/** The schema Cube infers for the captured node */
const inferredSchema = (query: Query): Schema => {
  const schema = buildSchemasAndValidity(
    query,
    createNodeRegistry().queryRules,
  ).schemas.get(query.selected ?? '');
  expect(schema).toBeDefined();
  return schema as Schema;
};

/** A resolved source whose schema snapshot has a column the table no longer has */
const withStaleColumn = (
  source: RelationalTableSource,
  column: SchemaColumn,
): RelationalTableSource =>
  source.withResolution({
    kind: 'resolved',
    schema: new Schema([
      ...(source.resolution as { schema: Schema }).schema.columns,
      column,
    ]),
  });

const ORDERS = (): RelationalTableSource =>
  table('relational101', 'NORTHWIND', 'ORDERS');
const CUSTOMERS = (): RelationalTableSource =>
  table('relational102', 'NORTHWIND', 'CUSTOMERS');
const ALLTYPES = (): RelationalTableSource =>
  table('relational101', 'CUBETEST', 'ALLTYPES');

/** The slice (PLAN §8.5): ORDERS ⋈ CUSTOMERS on CUSTOMER_ID, then France since 1997 by employees 1 and 4 */
const SLICE_RULE = new CompositeFilter(CompositeFilterOperator.AND, [
  compare('SHIP_COUNTRY', FilterOperator.EQUAL, string('France')),
  compare('ORDER_DATE', FilterOperator.GREATER_THAN_OR_EQUAL, {
    kind: 'strictDate',
    value: '1997-01-01',
  }),
  compare('EMPLOYEE_ID', FilterOperator.IN, [integer('1'), integer('4')]),
]);

const sliceOf = async (rule: FilterRule = SLICE_RULE): Promise<Query> => {
  const join = await joinOf(
    ORDERS(),
    CUSTOMERS(),
    [['CUSTOMER_ID', 'CUSTOMER_ID']],
    JoinType.INNER,
  );
  return queryOf(
    [...join.nodes, new Filter('filter101', rule)],
    [
      ['relational101', 'join101', 'leftTds'],
      ['relational102', 'join101', 'rightTds'],
      ['join101', 'filter101', 'tds'],
    ],
  );
};

const SLICE_ORDER_IDS = [
  10454, 10459, 10470, 10493, 10511, 10525, 10546, 10584, 10628, 10634, 10671,
  10755, 10789, 10827, 10843, 10850, 10927, 10972, 11076,
].map(String);

const sorted = (values: CubeResultValue[]): CubeResultValue[] =>
  [...values].sort((a, b) => String(a).localeCompare(String(b)));

// -------------------------------- A.1 --------------------------------

describe('A.1 Resolve', () => {
  test('Resolves every source of a query in one engine call', async () => {
    const [orders, customers, alltypes] = await resolve([
      ORDERS(),
      CUSTOMERS(),
      table('relational103', 'CUBETEST', 'ALLTYPES'),
    ]);
    expect(calls.batchLambdasRelationType).toHaveBeenCalledTimes(1);
    const schemaOf = (source?: RelationalTableSource): Schema =>
      (source?.resolution as { schema: Schema }).schema;
    expect(schemaOf(orders).columns).toHaveLength(14);
    expect(schemaOf(customers).columns).toHaveLength(11);
    expect(
      schemaOf(alltypes).columns.map((column) => [
        column.name,
        column.type.displayName,
        column.nullable,
      ]),
    ).toEqual([
      ['ID', 'Int', false],
      ['TI', 'TinyInt', true],
      ['SI', 'SmallInt', true],
      ['BI', 'BigInt', true],
      ['F', 'Float4', true],
      ['D', 'Double', true],
      ['DEC', 'Numeric(10,2)', true],
      ['NUM', 'Numeric(12,4)', true],
      ['DT', 'StrictDate', true],
      ['TS', 'Timestamp', true],
      ['B', 'Boolean', true],
      ['VC', 'Varchar(20)', true],
    ]);
  });

  test('Types every fixture table as the parity file records it (PLAN §6.2.6)', async () => {
    // the engine's raw answer, as a later local typer must reproduce it
    const tables = RELATION_TYPES.tables as Record<
      string,
      {
        columns?: {
          name: string;
          type: string;
          parameters: number[];
          multiplicity: string;
        }[];
        error?: string;
      }
    >;
    const keys = Object.keys(tables);
    const accessorOf = (key: string): [string, string] => {
      const at = key.indexOf('.');
      return [key.slice(0, at), key.slice(at + 1)];
    };
    const raw = (await CUBE_ENGINE_TEST__lambdaRelationTypeBatch({
      model: MODEL,
      lambdas: Object.fromEntries(
        keys.map((key) => [
          key,
          V1_serializeCubeLambda(
            lambda([], [storeAccessor([DATABASE, ...accessorOf(key)])]),
          ),
        ]),
      ),
    })) as {
      result: Record<
        string,
        {
          columns: {
            name: string;
            genericType: {
              rawType: { fullPath: string };
              typeVariableValues?: { value: number }[];
            };
            multiplicity: { lowerBound: number; upperBound?: number };
          }[];
        }
      >;
      errors?: Record<string, { message: string }>;
    };
    const recorded = Object.fromEntries(
      keys.map((key) => {
        const relationType = raw.result[key];
        return [
          key,
          relationType
            ? {
                columns: relationType.columns.map((column) => ({
                  name: column.name,
                  type: column.genericType.rawType.fullPath,
                  parameters: (column.genericType.typeVariableValues ?? []).map(
                    (value) => value.value,
                  ),
                  multiplicity: `[${column.multiplicity.lowerBound}..${column.multiplicity.upperBound ?? '*'}]`,
                })),
              }
            : { error: raw.errors?.[key]?.message.split('\n')[0] },
        ];
      }),
    );
    expect(recorded).toEqual(tables);

    // and through the adapter, as Cube schemas
    const typed = await engine.resolveSchemas(
      MODEL,
      new Map(
        keys.map((key) => [key, [DATABASE, ...accessorOf(key)] as const]),
      ),
    );
    keys.forEach((key) => {
      const entry = tables[key];
      const schema = typed.get(key);
      if (entry?.error) {
        expect(schema).toBeInstanceOf(CubeEngineError);
        return;
      }
      expect(schema).toBeInstanceOf(Schema);
      expect(
        (schema as Schema).columns.map((column) => [
          column.name,
          column.type,
          column.nullable,
        ]),
      ).toEqual(
        (entry?.columns ?? []).map((column) => [
          column.name,
          resolveCubeType(column.type, column.parameters),
          column.multiplicity === '[0..1]',
        ]),
      );
    });
  });

  test('Resolves a quoted, dotted table to its own columns, and fails its unquoted name alone', async () => {
    const typed = await engine.resolveSchemas(
      MODEL,
      new Map([
        ['dotted', [DATABASE, 'CUBETEST', '"ORDER.LINES"'] as const],
        ['unquoted', [DATABASE, 'CUBETEST', 'ORDER.LINES'] as const],
      ]),
    );
    expect(
      (typed.get('dotted') as Schema).columns.map((column) => column.name),
    ).toEqual(['LINE_ID', 'RIGHT_COL']);
    expect(typed.get('unquoted')).toMatchObject({
      nodeId: 'unquoted',
      firstLine: expect.stringContaining(
        "Can't find table 'ORDER.LINES' in schema 'CUBETEST'",
      ),
    });
    const result = await run(
      queryOf(
        [table('relational101', 'CUBETEST', '"ORDER.LINES"')].map((source) =>
          source.withResolution({
            kind: 'resolved',
            schema: typed.get('dotted') as Schema,
          }),
        ),
        [],
      ),
    );
    expect(result.rows).toEqual([['1', 'right']]);
  });

  test('Loads the outline of the fixture, flagging its problem tables', async () => {
    const outline = await engine.loadModel(MODEL);
    expect(outline.databases.map((database) => database.path)).toEqual([
      DATABASE,
    ]);
    const cubetest = outline.databases[0]?.schemas.find(
      (schema) => schema.name === 'CUBETEST',
    );
    expect(
      Object.fromEntries(
        (cubetest?.tables ?? [])
          .filter((entry) => entry.isView || entry.flags.length)
          .map((entry) => [entry.name, entry.isView ? 'view' : entry.flags]),
      ),
    ).toEqual({
      PROBLEM_BINARY: ['unavailable'],
      PROBLEM_CHAR: ['lengthUnknown'],
      PROBLEM_OTHER: ['typeUnknown'],
      PROBLEM_VIEW: 'view',
    });
    expect(outline.runtimes).toEqual([
      { path: RUNTIME, storePaths: [DATABASE] },
    ]);
  });
});

// -------------------------------- A.2, A.3 --------------------------------

describe('A.2 Join schema, A.3 Execute', () => {
  test("Infers the join's 24 columns as the engine types the emitted lambda; nullability may only widen", async () => {
    const query = await joinOf(
      ORDERS(),
      CUSTOMERS(),
      [['CUSTOMER_ID', 'CUSTOMER_ID']],
      JoinType.INNER,
    );
    const cube = inferredSchema(query);
    const engineSchema = (
      await engine.typeLambdas(
        MODEL,
        new Map([
          ['join101', new QueryEmitter(query).emitTypingLambda('join101')],
        ]),
      )
    ).get('join101') as Schema;
    expect(engineSchema).toBeInstanceOf(Schema);
    expect(cube.columns).toHaveLength(24);
    expect(cube.columns.map((column) => [column.name, column.type])).toEqual(
      engineSchema.columns.map((column) => [column.name, column.type]),
    );
    cube.columns.forEach((column, index) => {
      if (engineSchema.columns[index]?.nullable) {
        expect([column.name, column.nullable]).toEqual([column.name, true]);
      }
    });
  });

  test('Runs the slice: 19 orders, and 77 for France alone', async () => {
    const result = await run(await sliceOf());
    expect(sorted(valuesOf(result, 'ORDER_ID'))).toEqual(SLICE_ORDER_IDS);
    expect(result.columns).toEqual(
      inferredSchema(await sliceOf()).columns.map((column) => column.name),
    );
    expect(result.sql).toHaveLength(1);
    const france = await run(
      await sliceOf(
        compare('SHIP_COUNTRY', FilterOperator.EQUAL, string('France')),
      ),
    );
    expect(france.rows).toHaveLength(77);
  });
});

// -------------------------------- A.4 --------------------------------

describe('A.4 Join kinds', () => {
  test('LEFT keeps the customers without orders, whose order columns Cube marks nullable', async () => {
    const query = await joinOf(
      CUSTOMERS(),
      ORDERS(),
      [['CUSTOMER_ID', 'CUSTOMER_ID']],
      JoinType.LEFT_OUTER,
    );
    const result = await run(query);
    const orderIds = valuesOf(result, 'ORDER_ID');
    const customers = valuesOf(result, 'CUSTOMER_ID');
    expect(
      customers.filter((_, index) => orderIds[index] === null).sort(),
    ).toEqual(['FISSA', 'PARIS']);
    expect(
      inferredSchema(query).columns.find((column) => column.name === 'ORDER_ID')
        ?.nullable,
    ).toBe(true);
  });

  test('RIGHT returns 832 rows, the unmatched customers keeping their id from the right', async () => {
    const result = await run(
      await joinOf(
        ORDERS(),
        CUSTOMERS(),
        [['CUSTOMER_ID', 'CUSTOMER_ID']],
        JoinType.RIGHT_OUTER,
      ),
    );
    expect(result.rows).toHaveLength(832);
    const orderIds = valuesOf(result, 'ORDER_ID');
    expect(
      valuesOf(result, 'CUSTOMER_ID')
        .filter((_, index) => orderIds[index] === null)
        .sort(),
    ).toEqual(['FISSA', 'PARIS']);
  });

  test('FULL of filtered inputs returns 133 rows, 11 customer-only and 122 order-only, the merged key never null', async () => {
    const [customers, orders] = await resolve([CUSTOMERS(), ORDERS()]);
    const query = queryOf(
      [
        customers as RelationalTableSource,
        orders as RelationalTableSource,
        new Filter(
          'filter101',
          compare('COUNTRY', FilterOperator.EQUAL, string('France')),
        ),
        new Filter(
          'filter102',
          compare('SHIP_COUNTRY', FilterOperator.EQUAL, string('Germany')),
        ),
        new Join('join101', {
          leftColumns: ['CUSTOMER_ID'],
          rightColumns: ['CUSTOMER_ID'],
          joinType: JoinType.FULL_OUTER,
        }),
      ],
      [
        ['relational102', 'filter101', 'tds'],
        ['relational101', 'filter102', 'tds'],
        ['filter101', 'join101', 'leftTds'],
        ['filter102', 'join101', 'rightTds'],
      ],
    );
    const result = await run(query);
    expect(result.rows).toHaveLength(133);
    expect(
      valuesOf(result, 'ORDER_ID').filter((value) => value === null),
    ).toHaveLength(11);
    expect(
      valuesOf(result, 'COMPANY_NAME').filter((value) => value === null),
    ).toHaveLength(122);
    expect(valuesOf(result, 'CUSTOMER_ID')).not.toContain(null);
  });

  test('FULL with one nullable key keeps the 507 NULL-key orders, the merged key nullable', async () => {
    const query = await joinOf(
      ORDERS(),
      table('relational102', 'CUBETEST', 'CATEGORY_REGION'),
      [['SHIP_REGION', 'SHIP_REGION']],
      JoinType.FULL_OUTER,
    );
    const result = await run(query);
    expect(result.rows).toHaveLength(838);
    expect(
      valuesOf(result, 'SHIP_REGION').filter((value) => value === null),
    ).toHaveLength(507);
    expect(
      inferredSchema(query).columns.find(
        (column) => column.name === 'SHIP_REGION',
      )?.nullable,
    ).toBe(true);
  });

  test.each<[string, string, string, CubeResultValue[]]>([
    // ('AB', 'ABCDEFGHIJ', NULL) ⟗ ('AB', 'CD', NULL): each NULL key stays unmatched
    [
      'Varchar(15) and Varchar(2)',
      'KEY_VC15',
      'KEY_VC2',
      ['AB', 'ABCDEFGHIJ', 'CD', null, null],
    ],
    // (1.25, 2.50) ⟗ (1.2500, 3.0000): a Decimal key reads back as its exact text, scale kept
    [
      'Numeric(10,2) and Numeric(12,4)',
      'KEY_DEC',
      'KEY_NUM',
      ['1.25', '2.50', '3.0000'],
    ],
  ])(
    'FULL on keys of %s, differing only in parameters, casts the merged key and reads it back exactly, a filter after it too',
    async (_, left, right, keys) => {
      const join = await joinOf(
        table('relational101', 'CUBETEST', left),
        table('relational102', 'CUBETEST', right),
        [['K', 'K']],
        JoinType.FULL_OUTER,
      );
      const joined = await run(join);
      expect(sorted(valuesOf(joined, 'K'))).toEqual(keys);
      const filtered = queryOf(
        [
          ...join.nodes,
          new Filter('filter101', compare('K', FilterOperator.IS_NOT_EMPTY)),
        ],
        [
          ['relational101', 'join101', 'leftTds'],
          ['relational102', 'join101', 'rightTds'],
          ['join101', 'filter101', 'tds'],
        ],
      );
      expect(sorted(valuesOf(await run(filtered), 'K'))).toEqual(
        keys.filter((value) => value !== null),
      );
    },
    // a FULL join run twice has come close to the default timeout on a busy engine
    60_000,
  );
});

// -------------------------------- A.5 --------------------------------

describe('A.5 Precise literals', () => {
  test.each<[string, FilterOperator, LiteralValue, string[]]>([
    ['BI', FilterOperator.GREATER_THAN, integer('15000000000'), ['2']],
    [
      'DEC',
      FilterOperator.GREATER_THAN,
      { kind: 'decimal', value: '1.5' },
      ['1'],
    ],
    [
      'TS',
      FilterOperator.GREATER_THAN_OR_EQUAL,
      { kind: 'dateTime', value: '2024-01-02T12:00:00' },
      ['2'],
    ],
    ['B', FilterOperator.EQUAL, { kind: 'boolean', value: true }, ['1']],
    // D4: the NULL row is included
    [
      'B',
      FilterOperator.NOT_EQUAL,
      { kind: 'boolean', value: true },
      ['2', '3'],
    ],
    // exact equality on a real DOUBLE
    ['D', FilterOperator.EQUAL, { kind: 'float', value: '2.5' }, ['1']],
  ])(
    '%s %s %j gives the ALLTYPES rows %j',
    async (column, operator, value, ids) => {
      const result = await run(
        await filterOf(ALLTYPES(), compare(column, operator, value)),
      );
      expect(sorted(valuesOf(result, 'ID'))).toEqual(ids);
    },
  );

  test('Reads a BigInt past 2^53 and a scaled decimal back exactly', async () => {
    const result = await run(
      await filterOf(
        ALLTYPES(),
        compare('ID', FilterOperator.EQUAL, integer('2')),
      ),
    );
    expect(valuesOf(result, 'BI')).toEqual(['9007199254740993']);
    expect(valuesOf(result, 'NUM')).toEqual(['2.5000']);
    expect(valuesOf(result, 'D')).toEqual([0.1]);
  });
});

// -------------------------------- A.6 --------------------------------

describe('A.6 D4 NULL semantics', () => {
  test('A negation keeps the NULL rows: 736 for NOT (BC or France), 813 for not BC', async () => {
    const not = await run(
      await filterOf(
        ORDERS(),
        new NotFilter(
          new CompositeFilter(CompositeFilterOperator.OR, [
            compare('SHIP_REGION', FilterOperator.EQUAL, string('BC')),
            compare('SHIP_COUNTRY', FilterOperator.EQUAL, string('France')),
          ]),
        ),
      ),
    );
    expect(not.rows).toHaveLength(736);
    const notEqual = await run(
      await filterOf(
        ORDERS(),
        compare('SHIP_REGION', FilterOperator.NOT_EQUAL, string('BC')),
      ),
    );
    expect(notEqual.rows).toHaveLength(813);
  });

  test.each<[JoinType, number]>([
    [JoinType.INNER, 15],
    [JoinType.LEFT_OUTER, 19],
    [JoinType.RIGHT_OUTER, 103],
    [JoinType.FULL_OUTER, 107],
  ])(
    'Joins nullable REGION keys %s without NULL×NULL pairs: %i rows',
    async (joinType, rows) => {
      const result = await run(
        await joinOf(
          table('relational101', 'CUBETEST', 'EMP_REGION'),
          table('relational102', 'CUBETEST', 'CUST_REGION'),
          [['REGION', 'REGION']],
          joinType,
        ),
      );
      expect(result.rows).toHaveLength(rows);
      const employees = valuesOf(result, 'EMPLOYEE_ID');
      const customers = valuesOf(result, 'CUSTOMER_ID');
      const regions = valuesOf(result, 'REGION');
      expect(
        regions.filter(
          (region, index) =>
            region === null &&
            employees[index] !== null &&
            customers[index] !== null,
        ),
      ).toEqual([]);
    },
  );
});

// -------------------------------- A.9 to A.11 --------------------------------

describe('A.9 Error mapping, A.10 Spec round trip, A.11 Golden shape', () => {
  test("A column the engine doesn't have puts the engine's compile error on the filter that names it", async () => {
    const [orders] = await resolve([ORDERS()]);
    const query = queryOf(
      [
        withStaleColumn(
          orders as RelationalTableSource,
          new SchemaColumn('REMOVED', resolveCubeType('String'), true),
        ),
        new Filter(
          'filter101',
          compare('REMOVED', FilterOperator.EQUAL, string('x')),
        ),
      ],
      [['relational101', 'filter101', 'tds']],
    );
    // the engine echoes the stamp cube:filter101:column
    const error = {
      kind: CubeEngineErrorKind.COMPILE,
      nodeId: 'filter101',
      role: EmitRole.COLUMN,
      firstLine: expect.stringContaining(
        "The column 'REMOVED' can't be found in the relation",
      ),
    };
    // typed under another key, so only the stamp can place the error on filter101
    const typed = await engine.typeLambdas(
      MODEL,
      new Map([
        ['stale', new QueryEmitter(query).emitTypingLambda('filter101')],
      ]),
    );
    expect(typed.get('stale')).toBeInstanceOf(CubeEngineError);
    expect(typed.get('stale')).toMatchObject(error);
    await expect(run(query)).rejects.toMatchObject(error);
  });

  test("A join key the engine doesn't have puts the run's error on the join, not on the filter the run is captured at", async () => {
    const [orders, customers] = await resolve([ORDERS(), CUSTOMERS()]);
    const query = queryOf(
      [
        withStaleColumn(
          orders as RelationalTableSource,
          new SchemaColumn(
            'REMOVED_KEY',
            resolveCubeType('meta::pure::precisePrimitives::Varchar', [15]),
            true,
          ),
        ),
        customers as RelationalTableSource,
        new Join('join101', {
          leftColumns: ['CUSTOMER_ID', 'REMOVED_KEY'],
          rightColumns: ['CUSTOMER_ID', 'REGION'],
          joinType: JoinType.INNER,
        }),
        new Filter(
          'filter101',
          compare('SHIP_COUNTRY', FilterOperator.EQUAL, string('France')),
        ),
      ],
      [
        ['relational101', 'join101', 'leftTds'],
        ['relational102', 'join101', 'rightTds'],
        ['join101', 'filter101', 'tds'],
      ],
    );
    await expect(run(query)).rejects.toMatchObject({
      kind: CubeEngineErrorKind.COMPILE,
      nodeId: 'join101',
      role: EmitRole.KEY,
      firstLine: expect.stringContaining(
        "The column 'REMOVED_KEY' can't be found in the relation",
      ),
    });
  });

  test("A model that doesn't parse fails every key of a batch, its outline and a run, with the engine's parser error", async () => {
    const broken: ModelContext = {
      _type: 'text',
      code: `###Relational\nDatabase ${DATABASE}\n(\n  Table T (`,
    };
    // the engine refuses the whole batch: a non-2xx response, not per-key errors
    await expect(
      CUBE_ENGINE_TEST__lambdaRelationTypeBatch({ model: broken, lambdas: {} }),
    ).rejects.toMatchObject({ response: { status: 400 } });
    const parserError = {
      kind: CubeEngineErrorKind.COMPILE,
      firstLine: expect.stringContaining("Unexpected token '<EOF>'"),
    };
    const typed = await engine.resolveSchemas(
      broken,
      new Map([
        ['relational101', [DATABASE, 'NORTHWIND', 'ORDERS'] as const],
        ['relational102', [DATABASE, 'NORTHWIND', 'CUSTOMERS'] as const],
      ]),
    );
    expect(calls.batchLambdasRelationType).toHaveBeenCalledTimes(1);
    ['relational101', 'relational102'].forEach((nodeId) => {
      expect(typed.get(nodeId)).toBeInstanceOf(CubeEngineError);
      expect(typed.get(nodeId)).toMatchObject({ ...parserError, nodeId });
    });
    await expect(engine.loadModel(broken)).rejects.toMatchObject(parserError);
    // a run's default kind is execution, so only the engine's PARSER errorType
    // makes it compile; the error has no stamp, so it lands on the capture node
    const [orders] = await resolve([ORDERS()]);
    await expect(
      engine.execute(
        broken,
        new QueryEmitter(
          queryOf([orders as RelationalTableSource], []),
        ).emitExecutionLambda({ rowLimit: ROW_LIMIT, runtime: RUNTIME }),
      ),
    ).rejects.toMatchObject({ ...parserError, nodeId: 'relational101' });
  });

  test("The engine-backed client rejects a lambda the engine can't read as the real client does, with the engine's payload", async () => {
    // what A.9 relies on: a non-2xx response is a NetworkClientError whose
    // payload is the engine's parsed JSON, not an axios error or its raw text
    const rejection = engine.client.JSONToGrammar_lambda({
      _type: 'lambda',
      parameters: [],
      body: [{ _type: 'classInstance', type: 'nonsense', value: {} }],
    });
    await expect(rejection).rejects.toBeInstanceOf(NetworkClientError);
    await expect(rejection).rejects.toMatchObject({
      response: { status: 500 },
      payload: {
        message: expect.stringContaining(
          "Can't parse the ClassInstance value for type 'nonsense'",
        ),
      },
    });
  });

  test('A saved and reopened slice emits the same lambda, and runs to the same 19 orders', async () => {
    const query = await sliceOf();
    const document = new CubeDocument({
      context: { model: MODEL, runtime: RUNTIME },
      query,
    });
    const reopened = decodeCubeSpec(
      JSON.parse(JSON.stringify(encodeCubeSpec(document))),
    ).document;
    const lambdaOf = (of: Query): string =>
      stringifyLosslessJSON(
        V1_serializeCubeLambda(
          new QueryEmitter(of).emitExecutionLambda({
            rowLimit: ROW_LIMIT,
            runtime: RUNTIME,
          }),
        ),
      );
    expect(lambdaOf(reopened.query)).toBe(lambdaOf(query));
    expect(reopened.context?.model).toEqual(MODEL);
    const result = await run(reopened.query);
    expect(sorted(valuesOf(result, 'ORDER_ID'))).toEqual(SLICE_ORDER_IDS);
  });

  test('Emits the slice as the engine parses the golden text of PLAN §8.5', async () => {
    const T = (name: string): string => `#>{${DATABASE}.NORTHWIND.${name}}#`;
    const golden = `|${T('ORDERS')}->join(${T('CUSTOMERS')}->rename(~CUSTOMER_ID, ~'CUSTOMER_ID__cube_r'), meta::pure::functions::relation::JoinKind.INNER, {l, r | $l.CUSTOMER_ID == $r.'CUSTOMER_ID__cube_r'})->select(~[CUSTOMER_ID, ORDER_ID, EMPLOYEE_ID, ORDER_DATE, REQUIRED_DATE, SHIPPED_DATE, SHIP_VIA, FREIGHT, SHIP_NAME, SHIP_ADDRESS, SHIP_CITY, SHIP_REGION, SHIP_POSTAL_CODE, SHIP_COUNTRY, COMPANY_NAME, CONTACT_NAME, CONTACT_TITLE, ADDRESS, CITY, REGION, POSTAL_CODE, COUNTRY, PHONE, FAX])->filter(row | ($row.SHIP_COUNTRY == 'France') && ($row.ORDER_DATE >= %1997-01-01) && ($row.EMPLOYEE_ID->in([1, 4])))->limit(${ROW_LIMIT + 1})->from(${RUNTIME})`;
    const emitted = parseLosslessJSON(
      stringifyLosslessJSON(
        V1_serializeCubeLambda(
          new QueryEmitter(await sliceOf()).emitExecutionLambda({
            rowLimit: ROW_LIMIT,
            runtime: RUNTIME,
          }),
        ),
        (key: string, value: unknown) =>
          key === 'sourceInformation' ? undefined : value,
      ),
    );
    expect(emitted).toEqual(
      await CUBE_ENGINE_TEST__grammarToJson_lambda(golden),
    );
  });

  test('Renders the slice as Pure text, for display', async () => {
    const text = await engine.renderPure(
      new QueryEmitter(await sliceOf()).emitExecutionLambda({
        rowLimit: ROW_LIMIT,
        runtime: RUNTIME,
      }),
    );
    expect(text).toContain('->from(');
    expect(text).toContain('JoinKind.INNER');
  });
});

// -------------------------------- Date and DateTime casts --------------------------------

describe('Merged-key casts to Date and DateTime (shape only; end to end in M6)', () => {
  test.each<[string, string]>([
    ['DT', 'Date'],
    ['TS', 'DateTime'],
  ])(
    'Types a cast of %s to %s as the engine compiles it',
    async (column, type) => {
      const ir: IR = lambda(
        [],
        [
          func('select', [
            func('extend', [
              storeAccessor([DATABASE, 'CUBETEST', 'ALLTYPES']),
              colSpec(
                'K',
                lambda(
                  ['x'],
                  [
                    func('cast', [
                      func('coalesce', [
                        columnAccess('x', column),
                        columnAccess('x', column),
                      ]),
                      genericType(type),
                    ]),
                  ],
                ),
              ),
            ]),
            colSpecArray([colSpec('K')]),
          ]),
        ],
      );
      const schema = (
        await engine.typeLambdas(MODEL, new Map([['k', ir]]))
      ).get('k');
      expect(schema).toBeInstanceOf(Schema);
      expect((schema as Schema).columns[0]?.type).toBe(resolveCubeType(type));
    },
  );
});
