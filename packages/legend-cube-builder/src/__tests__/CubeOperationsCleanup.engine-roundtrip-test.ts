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
  buildDrilldownKeyRule,
  buildSchemasAndValidity,
  Connection,
  Filter,
  FilterOperator,
  fixJoinDuplicates,
  Group,
  Join,
  JoinType,
  MESSAGE_DUPLICATE_COLUMNS_BETWEEN_INPUTS,
  Partition,
  Pivot,
  Query,
  type QueryNode,
  QueryEmitter,
  RelationalTableSource,
  Schema,
} from '@finos/legend-cube';
import type { PlainObject } from '@finos/legend-shared';
import { TEST__chainOf } from '../__test-utils__/CubeOperationsTestUtils.js';
import { CubeDirectDatabaseType } from '../graph-manager/CubeConnectionExplorer.js';
import {
  createCubeDirectModel,
  CUBE_DIRECT_DATABASE_PATH,
  CUBE_DIRECT_RUNTIME_PATH,
} from '../graph-manager/CubeDirectConnection.js';
import type { CubeResult } from '../graph-manager/CubeEngine.js';
import { V1_createEngineBackedCubeEngine } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeEngineTestUtils.js';
import { V1_buildCubeDirectConnection } from '../graph-manager/protocol/pure/v1/V1_CubeDirectConnection.js';

// M6d's operations on the engine (PLAN §11.14), on H2 and DuckDB direct
// connections: Min and Max of a String and a Boolean in a Group, a window and a
// Pivot; the grid's Filter by on a 32-bit float; a Join's shared columns in
// any case, fixed. Their own schema, so they can run beside the other tests.

const ROWS =
  "(1, 'x', 'pear', true, 0.02), (2, 'x', 'apple', false, 0.5), (3, 'x', null, null, null), " +
  "(4, 'y', 'fig', false, 0.02), (5, 'y', 'Zed', false, 1.25), (6, 'z', null, null, null)";

/** The rows, their whole numbers as numbers (the engine gives their digits) */
const rowsOf = (result: CubeResult): unknown[][] =>
  result.rows.map((row) =>
    row.map((value) =>
      typeof value === 'string' && /^-?\d+$/u.test(value)
        ? Number(value)
        : value,
    ),
  );

/** The rows, sorted by their first value, empty first */
const sortedRows = (result: CubeResult): unknown[][] =>
  rowsOf(result).sort((a, b) =>
    String(a[0] ?? '').localeCompare(String(b[0] ?? '')),
  );

describe.each<[CubeDirectDatabaseType, string]>([
  [CubeDirectDatabaseType.H2, 'CUBE_CLEANUP'],
  [CubeDirectDatabaseType.DUCKDB, 'cube_cleanup'],
])('M6d on a direct-connection cube on %s', (databaseType, schemaName) => {
  const duckDB = databaseType === CubeDirectDatabaseType.DUCKDB;
  // H2 folds unquoted names to upper case
  const name = (text: string): string => (duckDB ? text : text.toUpperCase());
  const connection: PlainObject = V1_buildCubeDirectConnection({
    databaseType,
    setupSqls: [
      `drop schema if exists ${schemaName} cascade`,
      `create schema ${schemaName}`,
      `create table ${schemaName}.t (id INTEGER PRIMARY KEY, k VARCHAR(10), s VARCHAR(10), b BOOLEAN, f REAL)`,
      `insert into ${schemaName}.t values ${ROWS}`,
      // a Join's shared columns in any case: DuckDB keeps a quoted name's case
      `create table ${schemaName}.l_t (k INTEGER PRIMARY KEY, "ID" INTEGER)`,
      `insert into ${schemaName}.l_t values (1, 10), (2, 20)`,
      `create table ${schemaName}.r_t (k INTEGER PRIMARY KEY, "id" INTEGER)`,
      `insert into ${schemaName}.r_t values (1, 100), (2, 200)`,
    ],
    ...(duckDB ? { path: '' } : {}),
  });
  const model = createCubeDirectModel(connection);
  const K = name('k');
  const S = name('s');
  const B = name('b');
  const F = name('f');

  /** A table of the schema, as the engine types it */
  const table = async (
    id: string,
    tableName: string,
  ): Promise<RelationalTableSource> => {
    const { engine } = V1_createEngineBackedCubeEngine();
    const path: [string, string, string] = [
      CUBE_DIRECT_DATABASE_PATH,
      `"${schemaName}"`,
      `"${name(tableName)}"`,
    ];
    const typed = (
      await engine.resolveSchemas(model, new Map([[id, path]]))
    ).get(id);
    expect(typed).toBeInstanceOf(Schema);
    return new RelationalTableSource(
      id,
      { database: path[0], schema: path[1], table: path[2] },
      { kind: 'resolved', schema: typed as Schema },
    );
  };

  /** Runs the query, written for this database, its nodes all valid */
  const runQuery = async (query: Query): Promise<CubeResult> => {
    const { validity } = buildSchemasAndValidity(query);
    expect([...validity].filter(([, errors]) => errors.length)).toEqual([]);
    return V1_createEngineBackedCubeEngine().engine.execute(
      model,
      new QueryEmitter(query).emitExecutionLambda({
        rowLimit: 100,
        runtime: CUBE_DIRECT_RUNTIME_PATH,
        databaseType,
      }),
    );
  };

  /** The table `t`, then the nodes, the last captured */
  const run = async (...nodes: QueryNode[]): Promise<CubeResult> =>
    runQuery(TEST__chainOf([await table('relational101', 't'), ...nodes]));

  test("Groups a String's and a Boolean's Min and Max, empty for a group with none", async () => {
    const result = await run(
      new Group(
        'group101',
        [K],
        [
          { column: S, function: AggregationFunction.MIN, name: 'smin' },
          { column: S, function: AggregationFunction.MAX, name: 'smax' },
          { column: B, function: AggregationFunction.MIN, name: 'bmin' },
          { column: B, function: AggregationFunction.MAX, name: 'bmax' },
        ],
      ),
    );
    // by the database's collation: 'Zed' before 'fig' on both
    expect(sortedRows(result)).toEqual([
      ['x', 'apple', 'pear', false, true],
      ['y', 'Zed', 'fig', false, false],
      ['z', null, null, null, null],
    ]);
  });

  test("Takes a String's Max over a window, each row its partition's", async () => {
    const result = await run(
      new Partition(
        'partition101',
        [K],
        [],
        [{ column: S, function: AggregationFunction.MAX, name: 'smax' }],
      ),
    );
    const smax = result.columns.indexOf('smax');
    const id = result.columns.indexOf(name('id'));
    expect(
      rowsOf(result)
        .map((row) => [row[id], row[smax]])
        .sort((a, b) => Number(a[0]) - Number(b[0])),
    ).toEqual([
      [1, 'pear'],
      [2, 'pear'],
      [3, 'pear'],
      [4, 'fig'],
      [5, 'fig'],
      [6, null],
    ]);
  });

  (duckDB ? test : test.skip)(
    "Pivots a String's Max (DuckDB: H2 can't pivot)",
    async () => {
      const result = await run(
        new Pivot(
          'pivot101',
          [],
          K,
          [
            { kind: 'string', value: 'x' },
            { kind: 'string', value: 'y' },
          ],
          { function: AggregationFunction.MAX, column: S },
        ),
      );
      expect(result.columns).toEqual(['x', 'y']);
      expect(rowsOf(result)).toEqual([['pear', 'fig']]);
    },
  );

  // On H2 a direct connection's REAL is explored as Other and left out (ISSUES.md);
  // Northwind's REAL FREIGHT, which the engine types as a Double, is found by
  // the same rule in CubeDrilldown's engine test, where Equal finds none
  (duckDB ? test : test.skip)(
    "Finds a 32-bit float by the grid's Filter by: its value and its 32-bit value",
    async () => {
      const typed = await table('relational101', 't');
      const type =
        typed.resolution.kind === 'resolved'
          ? typed.resolution.schema.type(F)
          : undefined;
      expect(type?.fullName).toBe('meta::pure::precisePrimitives::Float4');
      const rule = buildDrilldownKeyRule(F, type as never, 0.02);
      expect(rule?.operator).toBe(FilterOperator.IN);
      const found = await run(new Filter('filter101', rule as never));
      expect(
        rowsOf(found)
          .map((row) => row[found.columns.indexOf(name('id'))])
          .sort(),
      ).toEqual([1, 4]);
    },
  );

  (duckDB ? test : test.skip)(
    'Reports a Join of ID and id as a duplicate, and its fix runs, each side its own column (DuckDB keeps their case)',
    async () => {
      const left = await table('relational101', 'l_t');
      const right = await table('relational102', 'r_t');
      const join = new Join('join101', {
        leftColumns: ['k'],
        rightColumns: ['k'],
        joinType: JoinType.INNER,
      });
      const query = new Query(
        [left, right, join],
        [
          new Connection('relational101', 'join101', 'leftTds'),
          new Connection('relational102', 'join101', 'rightTds'),
        ],
        'join101',
      );
      const { schemas, validity } = buildSchemasAndValidity(query);
      expect(validity.get('join101')).toEqual([
        MESSAGE_DUPLICATE_COLUMNS_BETWEEN_INPUTS(['ID']),
      ]);
      const fixed = fixJoinDuplicates(
        query,
        'join101',
        schemas.get('relational101'),
        schemas.get('relational102'),
      );
      const result = await runQuery(fixed);
      expect(result.columns).toEqual(['k', 'ID_1', 'id_2']);
      expect(sortedRows(result)).toEqual([
        [1, 10, 100],
        [2, 20, 200],
      ]);
    },
  );
});
