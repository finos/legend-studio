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
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildSchemasAndValidity,
  createNodeRegistry,
  Explode,
  Extend,
  type ModelContext,
  type Query,
  type QueryNode,
  QueryEmitter,
  RelationalTableSource,
  Schema,
} from '@finos/legend-cube';
import type { PlainObject } from '@finos/legend-shared';
import {
  TEST__chainOf,
  TEST__inferredSchema,
  TEST__typingDifferences,
} from '../__test-utils__/CubeOperationsTestUtils.js';
import { CubeDirectDatabaseType } from '../graph-manager/CubeConnectionExplorer.js';
import {
  createCubeDirectModel,
  CUBE_DIRECT_DATABASE_PATH,
  CUBE_DIRECT_RUNTIME_PATH,
} from '../graph-manager/CubeDirectConnection.js';
import type {
  CubeResult,
  CubeResultValue,
} from '../graph-manager/CubeEngine.js';
import { V1_createEngineBackedCubeEngine } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeEngineTestUtils.js';
import { V1_buildCubeDirectConnection } from '../graph-manager/protocol/pure/v1/V1_CubeDirectConnection.js';
import {
  buildCubeExtendTypingLambdas,
  readCubeExtendTyping,
} from '../stores/CubeExtendTyping.js';
import {
  type CubeJsonOffer,
  getCubeJsonFields,
  type CubeJsonField,
} from '../stores/variant/CubeJsonOffers.js';
import { inferCubeJsonShape } from '../stores/variant/CubeJsonShape.js';

// Explore JSON's offers on the engine (PLAN §11.20): every offer for a
// sample of documents, written as Cube writes it, parsed, typed after the
// table and run, on DuckDB, with a column declared SEMISTRUCTURED. DuckDB's
// grammar has no setup SQL, so a direct connection (JSON, which has) creates
// the table in a file first, and a text model declaring the column reads it.

const FILE = join(tmpdir(), `cube-variant-${process.pid}.duckdb`);
const DOCUMENTS = [
  '{"user":{"name":"ann","tier":"gold"},"amount":12.5,"tags":["a","b"],"items":[{"sku":"x","qty":2},{"sku":"y","qty":1}],"ok":true,"day":"2024-01-31"}',
  '{"user":{"name":"bob","tier":"silver"},"amount":7,"tags":["a"],"items":[{"sku":"z","qty":5}],"ok":false,"day":"2024-02-29"}',
  '{"user":{"name":"cy"},"amount":3,"tags":[],"items":[],"ok":true,"day":"2024-03-01"}',
];
const quote = (text: string): string => text.replace(/'/gu, "''");
const SETUP: PlainObject = V1_buildCubeDirectConnection({
  databaseType: CubeDirectDatabaseType.DUCKDB,
  setupSqls: [
    'drop schema if exists cube_variant cascade',
    'create schema cube_variant',
    'create table cube_variant.events (id INTEGER PRIMARY KEY, payload JSON)',
    `insert into cube_variant.events values ${DOCUMENTS.map((document, index) => `(${index + 1}, '${quote(document)}')`).join(', ')}, (${DOCUMENTS.length + 1}, null)`,
  ],
  path: FILE,
});
const MODEL: ModelContext = {
  _type: 'text',
  code: `###Relational
Database test::Db
(
  Schema cube_variant
  (
    Table events
    (
      id INTEGER PRIMARY KEY,
      payload SEMISTRUCTURED
    )
  )
)

###Connection
RelationalDatabaseConnection test::Conn
{
  store: test::Db;
  type: DuckDB;
  specification: DuckDB
  {
    path: '${FILE}';
  };
  auth: Test;
}

###Runtime
Runtime test::Rt
{
  mappings:
  [
  ];
  connections:
  [
    test::Db:
    [
      c: test::Conn
    ]
  ];
}
`,
};
const RUNTIME = 'test::Rt';
const PATH: [string, string, string] = ['test::Db', 'cube_variant', 'events'];
const registry = createNodeRegistry();

let source: RelationalTableSource;

const run = async (query: Query): Promise<CubeResult> =>
  V1_createEngineBackedCubeEngine().engine.execute(
    MODEL,
    new QueryEmitter(query, registry).emitExecutionLambda({
      rowLimit: 100,
      runtime: RUNTIME,
      databaseType: 'DuckDB',
    }),
  );

/** An Extend of one column after the nodes, typed by the engine, and the column's type */
const typedExtend = async (
  before: readonly QueryNode[],
  name: string,
  code: string,
  id = 'extend101',
): Promise<{ node: Extend; type: string }> => {
  const { engine } = V1_createEngineBackedCubeEngine();
  const { lambda } = await engine.parseExpression(code, `${id}:0`);
  const stored = [{ name, code, lambda }];
  const bare = new Extend(id, stored);
  const query = TEST__chainOf([...before, bare]);
  const columns = [{ name, lambda }];
  const answers = await engine.typeLambdas(
    MODEL,
    buildCubeExtendTypingLambdas(query, bare, columns, registry, false),
  );
  const { typing, error } = readCubeExtendTyping(
    answers,
    bare,
    buildSchemasAndValidity(query, registry.queryRules).schemas.get(
      before[before.length - 1]?.id ?? '',
    ) as Schema,
    columns,
    undefined,
  );
  if (typing.kind !== 'typed') {
    throw new Error(`${code} didn't type: ${error?.firstLine}`);
  }
  return {
    node: new Extend(id, stored, typing),
    type: typing.types[0]?.displayName ?? '',
  };
};

/** The values of some columns, the rows sorted by their text */
const rowsOf = (
  result: CubeResult,
  columns: readonly string[],
): CubeResultValue[][] =>
  result.rows
    .map((row) =>
      columns.map((column) => row[result.columns.indexOf(column)] ?? null),
    )
    .sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right)),
    );

/** The events, then an Extend of one offer typed by the engine, run: the new column's values by id */
const runOffer = async (
  offer: CubeJsonOffer,
): Promise<{ type: string; values: CubeResultValue[] }> => {
  const { node, type } = await typedExtend([source], 'v', offer.code as string);
  const result = await run(TEST__chainOf([source, node] as QueryNode[]));
  const id = result.columns.indexOf('id');
  const v = result.columns.indexOf('v');
  return {
    type,
    values: [...result.rows]
      .sort((left, right) => Number(left[id]) - Number(right[id]))
      .map((row) => row[v] ?? null),
  };
};

/** Every offer of the fields with an Extend column, as `<path>/<key>` */
const offersOf = (field: CubeJsonField): Map<string, CubeJsonOffer> =>
  new Map([
    ...field.offers
      .filter((offer) => offer.code !== undefined)
      .map((offer) => [`${field.path.join('.')}/${offer.key}`, offer] as const),
    ...field.children.flatMap((child) => [...offersOf(child)]),
  ]);

let offers: Map<string, CubeJsonOffer>;

beforeAll(async () => {
  const { engine } = V1_createEngineBackedCubeEngine();
  // runs the setup SQL, writing the file
  const setupModel = createCubeDirectModel(SETUP);
  await engine.resolveSchemas(
    setupModel,
    new Map([
      [
        'relational101',
        [CUBE_DIRECT_DATABASE_PATH, '"cube_variant"', '"events"'],
      ],
    ]),
  );
  expect(CUBE_DIRECT_RUNTIME_PATH).toBeDefined();
  const typed = (
    await engine.resolveSchemas(MODEL, new Map([['relational101', PATH]]))
  ).get('relational101');
  expect(typed).toBeInstanceOf(Schema);
  expect(
    (typed as Schema).columns.map((column) => column.type.fullName),
  ).toEqual([
    'meta::pure::precisePrimitives::Int',
    'meta::pure::metamodel::variant::Variant',
  ]);
  source = new RelationalTableSource(
    'relational101',
    { database: PATH[0], schema: PATH[1], table: PATH[2] },
    { kind: 'resolved', schema: typed as Schema },
  );
  // the documents as the grid gets them, read as Explore JSON reads them
  const cells = (await run(TEST__chainOf([source]))).rows.map(
    (row) => row[1] ?? null,
  );
  offers = offersOf(getCubeJsonFields('payload', inferCubeJsonShape(cells)));
}, 120000);

describe('Explore JSON’s offers on DuckDB (PLAN §11.20)', () => {
  test('Types and runs every offer of the documents', async () => {
    expect([...offers.keys()]).toEqual([
      '/keys',
      'amount/value',
      'day/value',
      'items/json',
      'items/count',
      'items/first',
      'items/first:qty',
      'items/total:qty',
      'items/first:sku',
      'ok/value',
      'tags/json',
      'tags/count',
      'tags/list',
      'tags/contains:a',
      'tags/contains:b',
      'user/json',
      'user/keys',
      'user.name/value',
      'user.tier/value',
    ]);
    const failures: string[] = [];
    for (const [key, offer] of offers) {
      try {
        await runOffer(offer);
      } catch (error) {
        failures.push(`${key}: ${String(error)}`);
      }
    }
    expect(failures).toEqual([]);
  }, 300000);

  test('Gives each offer the values and type the documents hold, a row without a document empty', async () => {
    const values = async (key: string): Promise<unknown> =>
      runOffer(offers.get(key) as CubeJsonOffer);
    expect(await values('user.name/value')).toEqual({
      type: 'String',
      values: ['ann', 'bob', 'cy', null],
    });
    expect(await values('user.tier/value')).toMatchObject({
      values: ['gold', 'silver', null, null],
    });
    expect(await values('amount/value')).toEqual({
      type: 'Float',
      values: [12.5, 7, 3, null],
    });
    expect(await values('ok/value')).toEqual({
      type: 'Boolean',
      values: [true, false, true, null],
    });
    expect(await values('day/value')).toMatchObject({
      type: 'StrictDate',
      values: ['2024-01-31', '2024-02-29', '2024-03-01', null],
    });
    expect(await values('tags/count')).toMatchObject({
      type: 'Integer',
      values: ['2', '1', '0', '0'],
    });
    expect(await values('tags/list')).toMatchObject({
      values: ['a, b', 'a', null, null],
    });
    expect(await values('tags/contains:b')).toMatchObject({
      type: 'Boolean',
      values: [true, false, false, false],
    });
    expect(await values('items/total:qty')).toMatchObject({
      values: ['3', '5', null, null],
    });
    expect(await values('items/first:sku')).toMatchObject({
      values: ['x', 'z', null, null],
    });
    expect(await values('user/keys')).toMatchObject({
      values: ['name, tier', 'name, tier', 'name', null],
    });
    expect(await values('items/first')).toMatchObject({
      type: 'Variant',
      values: ['{"sku":"x","qty":2}', '{"sku":"z","qty":5}', null, null],
    });
  }, 300000);
});

describe('Explode Array on DuckDB (PLAN §11.20)', () => {
  test('Gives one row per element, a row whose array is empty or whose document is missing kept once with no element', async () => {
    const result = await run(
      TEST__chainOf([
        source,
        new Explode('explode101', 'payload', ['items'], 'item'),
      ]),
    );
    expect(result.columns).toEqual(['id', 'payload', 'item']);
    expect(rowsOf(result, ['id', 'item'])).toEqual([
      ['1', '{"sku":"x","qty":2}'],
      ['1', '{"sku":"y","qty":1}'],
      ['2', '{"sku":"z","qty":5}'],
      ['3', null],
      ['4', null],
    ]);
  }, 120000);

  test('Explodes a column that is the array itself, and reads the elements as any Variant', async () => {
    const tags = await typedExtend(
      [source],
      'tags',
      "x | $x.payload->get('tags')",
    );
    expect(tags.type).toBe('Variant');
    const explode = new Explode('explode101', 'tags', [], 'tag');
    const tag = await typedExtend(
      [source, tags.node, explode],
      'tag_text',
      'x | $x.tag->to(@String)',
      'extend102',
    );
    const result = await run(
      TEST__chainOf([source, tags.node, explode, tag.node] as QueryNode[]),
    );
    expect(rowsOf(result, ['id', 'tag_text'])).toEqual([
      ['1', 'a'],
      ['1', 'b'],
      ['2', 'a'],
      ['3', null],
      ['4', null],
    ]);
  }, 120000);

  test('Is typed by the engine as Cube infers it, its element a Variant that Cube says can be empty', async () => {
    const { engine } = V1_createEngineBackedCubeEngine();
    const query = TEST__chainOf([
      source,
      new Explode('explode101', 'payload', ['items'], 'item'),
    ]);
    const typed = await engine.typeLambdas(
      MODEL,
      new Map([
        [
          'explode101',
          new QueryEmitter(query, registry).emitTypingLambda('explode101'),
        ],
      ]),
    );
    const inferred = TEST__inferredSchema(query);
    expect(
      inferred.columns.map(
        ({ name, type, nullable }) =>
          `${name} ${type.displayName}${nullable ? '?' : ''}`,
      ),
    ).toEqual(['id Int', 'payload Variant?', 'item Variant?']);
    // the engine types the element [1], though an empty array or a missing
    // document gives a row without one (the first test): Cube says nullable
    expect(
      TEST__typingDifferences('explode101', inferred, typed.get('explode101'), {
        widerNullable: ['item'],
      }),
    ).toEqual([]);
  }, 120000);
});
