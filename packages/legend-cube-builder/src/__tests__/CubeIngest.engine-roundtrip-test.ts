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
  ColumnComparisonFilter,
  Connection,
  createNodeRegistry,
  Filter,
  FilterOperator,
  fixJoinDuplicates,
  func,
  Group,
  type IR,
  IngestDatasetSource,
  Join,
  JoinType,
  type ModelContext,
  Query,
  QueryEmitter,
  Schema,
} from '@finos/legend-cube';
import type { PlainObject } from '@finos/legend-shared';
import { TEST__typingDifferences } from '../__test-utils__/CubeOperationsTestUtils.js';
import { CUBE_INGEST_RUNTIME_PATH } from '../graph-manager/CubeIngest.js';
import { V1_createEngineBackedCubeEngine } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeEngineTestUtils.js';
import { V1_readCubeIngestDataSets } from '../graph-manager/protocol/pure/v1/V1_CubeIngestDefinition.js';
import { createTextModel } from '../stores/LocalModelCatalog.js';

// The open-source engine reads no ingest definition: it can't parse one, and
// it types and runs no `#I{...}#` accessor (PLAN §6.7). So each data set is
// stood in for by a Pure function declaring the relation type the
// definition gives it, its own columns then the ones its write mode adds,
// over an H2 table. This checks, on the engine, that Cube reads those types
// from the definition, and that it types the nodes downstream of ingest
// data sets (a Filter on LAKE_OUT_ID, a Join of two data sets, a Group) as
// the engine types Cube's own lambdas with each accessor swapped for its
// stand-in, and that such a lambda runs through a runtime at Cube's fixed
// path. Its own schema, so it can run beside the other engine tests

const SCHEMA = 'CUBE_INGEST_STANDIN';
const DATABASE = 'cube::ingest::standin::Db';
const DEFINITION = 'sales::ingest::OrdersIngest';
const URN = `urn:lakehouse:prod:ingest:definition:alloy-git:com.example~sales~${DEFINITION}`;
/** The LAKE_OUT_ID of the rows no later batch replaced */
const CURRENT = '999999999';

interface StandInColumn {
  name: string;
  /** The column's Pure type, with its parameters */
  path: string;
  params?: number[];
  nullable?: boolean;
  /** The H2 column behind it */
  sql: string;
}

/** The data sets stood in for, with their declared columns */
const DATA_SETS: Record<string, StandInColumn[]> = {
  TRADES: [
    {
      name: 'TRADE_ID',
      path: 'meta::pure::precisePrimitives::BigInt',
      sql: 'BIGINT NOT NULL',
    },
    {
      name: 'DESK',
      path: 'meta::pure::precisePrimitives::Varchar',
      params: [20],
      sql: 'VARCHAR(20) NOT NULL',
    },
    {
      name: 'PRICE',
      path: 'meta::pure::precisePrimitives::Numeric',
      params: [18, 4],
      nullable: true,
      sql: 'DECIMAL(18,4)',
    },
    {
      name: 'QUANTITY',
      path: 'meta::pure::precisePrimitives::Int',
      sql: 'INTEGER NOT NULL',
    },
  ],
  DESKS: [
    {
      name: 'DESK',
      path: 'meta::pure::precisePrimitives::Varchar',
      params: [20],
      sql: 'VARCHAR(20) NOT NULL',
    },
    {
      name: 'REGION',
      path: 'meta::pure::precisePrimitives::Varchar',
      params: [50],
      nullable: true,
      sql: 'VARCHAR(50)',
    },
  ],
};

/** The columns a batch-milestoned data set adds after its own, as legend-graph types them */
const MILESTONING: StandInColumn[] = [
  { name: 'LAKE_IN_ID', path: 'Integer', sql: 'BIGINT NOT NULL' },
  { name: 'LAKE_OUT_ID', path: 'Integer', sql: 'BIGINT NOT NULL' },
  { name: 'LAKE_DIGEST', path: 'String', sql: 'VARCHAR(64) NOT NULL' },
];

/** The definition's content, as the ingest server serves it */
const CONTENT: PlainObject = {
  writeMode: { _type: 'batch_milestoned' },
  datasets: Object.entries(DATA_SETS).map(([name, columns]) => ({
    name,
    primaryKey: [columns[0]?.name],
    source: {
      _type: 'ingestSource',
      schema: {
        _type: 'schema',
        columns: columns.map((column) => ({
          name: column.name,
          genericType: {
            rawType: { _type: 'packageableType', fullPath: column.path },
            typeArguments: [],
            multiplicityArguments: [],
            typeVariableValues: (column.params ?? []).map((value) => ({
              _type: 'integer',
              value,
            })),
          },
          multiplicity: { lowerBound: column.nullable ? 0 : 1, upperBound: 1 },
        })),
      },
    },
  })),
};

/** Each data set's rows: its own values, then LAKE_IN_ID, LAKE_OUT_ID and LAKE_DIGEST */
const ROWS: Record<string, string[]> = {
  TRADES: [
    `1, 'FX', 1.5, 10, 1, ${CURRENT}, 'd1'`,
    // replaced by the next batch's version of trade 2
    `2, 'FX', 2.5, 20, 1, 1, 'd2'`,
    `2, 'FX', 3.0, 25, 2, ${CURRENT}, 'd3'`,
    `3, 'RATES', NULL, 5, 2, ${CURRENT}, 'd4'`,
  ],
  DESKS: [
    `'FX', 'EMEA', 1, ${CURRENT}, 'e1'`,
    // RATES moved from APAC to AMER
    `'RATES', 'APAC', 1, 1, 'e2'`,
    `'RATES', 'AMER', 2, ${CURRENT}, 'e3'`,
  ],
};

const columnsOf = (dataSet: string): StandInColumn[] => [
  ...(DATA_SETS[dataSet] ?? []),
  ...MILESTONING,
];

const standInPathOf = (dataSet: string): string =>
  `cube::ingest::standin::${dataSet}__`;

/** The relation type a data set's stand-in declares, as Pure writes it */
const declaredTypeOf = (dataSet: string): string =>
  columnsOf(dataSet)
    .map(
      ({ name, path, params, nullable }) =>
        `${name}:${path}${params?.length ? `(${params.join(',')})` : ''}[${nullable ? '0..1' : '1'}]`,
    )
    .join(', ');

/** The stand-in model: the H2 tables, a function per data set, and the runtime at Cube's fixed path */
const MODEL: ModelContext = createTextModel(
  [
    '###Relational',
    `Database ${DATABASE}`,
    '(',
    `  Schema ${SCHEMA}`,
    '  (',
    ...Object.keys(DATA_SETS).map(
      (dataSet) =>
        `    Table ${dataSet} (${columnsOf(dataSet)
          .map(({ name, sql }) => `${name} ${sql}`)
          .join(', ')})`,
    ),
    '  )',
    ')',
    '',
    '###Pure',
    ...Object.keys(DATA_SETS).map((dataSet) =>
      [
        `function ${standInPathOf(dataSet)}(): meta::pure::metamodel::relation::Relation<(${declaredTypeOf(dataSet)})>[1]`,
        '{',
        `  #>{${DATABASE}.${SCHEMA}.${dataSet}}#`,
        '}',
      ].join('\n'),
    ),
    '',
    '###Connection',
    'RelationalDatabaseConnection cube::ingest::standin::Connection',
    '{',
    `  store: ${DATABASE};`,
    '  type: H2;',
    `  specification: LocalH2 { testDataSetupSqls: [${[
      `drop schema if exists ${SCHEMA} cascade`,
      `create schema ${SCHEMA}`,
      ...Object.keys(DATA_SETS).map(
        (dataSet) =>
          `create table ${SCHEMA}.${dataSet} (${columnsOf(dataSet)
            .map(({ name, sql }) => `${name} ${sql}`)
            .join(', ')})`,
      ),
      ...Object.entries(ROWS).map(
        ([dataSet, rows]) =>
          `insert into ${SCHEMA}.${dataSet} values ${rows
            .map((row) => `(${row})`)
            .join(', ')}`,
      ),
    ]
      .map((sql) => `'${sql.replaceAll("'", "\\'")}'`)
      .join(', ')}]; };`,
    '  auth: DefaultH2;',
    '}',
    '',
    '###Runtime',
    `Runtime ${CUBE_INGEST_RUNTIME_PATH}`,
    '{',
    '  mappings: [];',
    `  connections: [ ${DATABASE}: [ connection: cube::ingest::standin::Connection ] ];`,
    '}',
  ].join('\n'),
);

/** The data sets, as Cube reads them from the definition */
const READ = V1_readCubeIngestDataSets(CONTENT);

const schemaOf = (dataSet: string): Schema => {
  const schema = READ.find((each) => each.name === dataSet)?.schema;
  expect(schema).toBeInstanceOf(Schema);
  return schema as Schema;
};

const sourceOf = (id: string, dataSet: string): IngestDatasetSource =>
  new IngestDatasetSource(
    id,
    { ingestDefinitionUrn: URN, ingestDefinition: DEFINITION, dataSet },
    { kind: 'resolved', schema: schemaOf(dataSet) },
  );

const currentRowsOf = (id: string): Filter =>
  new Filter(
    id,
    new ColumnComparisonFilter('LAKE_OUT_ID', FilterOperator.EQUAL, {
      kind: 'integer',
      value: CURRENT,
    }),
  );

/**
 * The current rows of TRADES joined to the current rows of DESKS on DESK,
 * the join's duplicate columns renamed as its autofix renames them, then
 * the trades and their units by region. The join is inner: an outer join's
 * padded columns (PLAN §4.7) are the inference conformance cases'
 */
const QUERY: Query = (() => {
  const join = new Join('join101', {
    leftColumns: ['DESK'],
    rightColumns: ['DESK'],
    joinType: JoinType.INNER,
  });
  const [trades, desks] = [
    currentRowsOf('filter101'),
    currentRowsOf('filter102'),
  ];
  const joined = fixJoinDuplicates(
    new Query(
      [
        sourceOf('ingestDataset101', 'TRADES'),
        sourceOf('ingestDataset102', 'DESKS'),
        trades,
        desks,
        join,
      ],
      [
        new Connection(
          'ingestDataset101',
          'filter101',
          trades.ports[0] as string,
        ),
        new Connection(
          'ingestDataset102',
          'filter102',
          desks.ports[0] as string,
        ),
        new Connection('filter101', 'join101', 'leftTds'),
        new Connection('filter102', 'join101', 'rightTds'),
      ],
      'join101',
    ),
    'join101',
    schemaOf('TRADES'),
    schemaOf('DESKS'),
  );
  const group = new Group(
    'group101',
    ['REGION'],
    [
      {
        function: AggregationFunction.COUNT_ROWS,
        column: undefined,
        name: 'trades',
      },
      {
        function: AggregationFunction.SUM,
        column: 'QUANTITY',
        name: 'units',
      },
    ],
  );
  // after the selected join, so selected
  return joined.add(group, 'join101');
})();

/** The lambda with each ingest accessor swapped for its data set's stand-in; gives how many were swapped */
const withStandIns = (ir: IR): { ir: IR; swapped: number } => {
  let swapped = 0;
  const swap = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(swap);
    }
    if (!value || typeof value !== 'object') {
      return value;
    }
    const node = value as PlainObject;
    if (node.k === 'ingestAccessor') {
      const [, dataSet] = node.path as [string, string];
      swapped++;
      return func(standInPathOf(dataSet), []);
    }
    return Object.fromEntries(
      Object.entries(node).map(([key, each]) => [key, swap(each)]),
    );
  };
  return { ir: swap(ir) as IR, swapped };
};

describe('Ingest data set stand-ins, on the engine', () => {
  test('Types each stand-in, declared with the types the definition gives, as Cube reads them from the definition', async () => {
    const { engine } = V1_createEngineBackedCubeEngine();
    const dataSets = Object.keys(DATA_SETS);
    const standIns = await engine.typeLambdas(
      MODEL,
      new Map(
        dataSets.map((dataSet) => [
          dataSet,
          withStandIns(
            new QueryEmitter(
              new Query(
                [sourceOf('ingestDataset101', dataSet)],
                [],
                'ingestDataset101',
              ),
            ).emitTypingLambda('ingestDataset101'),
          ).ir,
        ]),
      ),
    );
    expect(
      dataSets.flatMap((dataSet) =>
        TEST__typingDifferences(
          dataSet,
          schemaOf(dataSet),
          standIns.get(dataSet),
        ),
      ),
    ).toEqual([]);
  });

  test('Types every node downstream of the data sets as Cube infers it', async () => {
    const { engine } = V1_createEngineBackedCubeEngine();
    const emitter = new QueryEmitter(QUERY);
    const { schemas } = buildSchemasAndValidity(
      QUERY,
      createNodeRegistry().queryRules,
    );
    const lambdas = QUERY.nodes.map((node) => {
      expect(emitter.canEmit(node.id)).toBe(true);
      const { ir, swapped } = withStandIns(emitter.emitTypingLambda(node.id));
      // each lambda reads the data sets through the accessor Cube emits
      expect(swapped).toBeGreaterThan(0);
      return [node.id, ir] as const;
    });
    const typed = await engine.typeLambdas(MODEL, new Map(lambdas));
    expect(
      QUERY.nodes.flatMap((node) =>
        TEST__typingDifferences(
          node.id,
          schemas.get(node.id),
          typed.get(node.id),
          // a Sum over no values gives none, which the engine doesn't say (PLAN §5.7)
          { widerNullable: node.id === 'group101' ? ['units'] : [] },
        ),
      ),
    ).toEqual([]);
    expect(schemas.get('group101')?.columns.map(({ name }) => name)).toEqual([
      'REGION',
      'trades',
      'units',
    ]);
  });

  test("Runs the current rows of two joined data sets, grouped, through a runtime at Cube's fixed path", async () => {
    const { engine } = V1_createEngineBackedCubeEngine();
    const { ir, swapped } = withStandIns(
      new QueryEmitter(QUERY).emitExecutionLambda({
        rowLimit: 100,
        runtime: CUBE_INGEST_RUNTIME_PATH,
      }),
    );
    expect(swapped).toBe(2);
    const result = await engine.execute(MODEL, ir);
    expect(result.columns).toEqual(['REGION', 'trades', 'units']);
    // the replaced trade and desk rows left out: two FX trades in EMEA, one RATES trade in AMER
    expect(
      result.rows
        .map((row) => row.map(String).join(' '))
        .sort((a, b) => a.localeCompare(b)),
    ).toEqual(['AMER 1 5', 'EMEA 2 35']);
  });
});
