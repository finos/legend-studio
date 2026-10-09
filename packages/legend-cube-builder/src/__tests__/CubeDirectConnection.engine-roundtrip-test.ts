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
  type IR,
  Query,
  QueryEmitter,
  RelationalTableSource,
  Schema,
} from '@finos/legend-cube';
import type { PlainObject } from '@finos/legend-shared';
import {
  directDuckDBConnection,
  directH2Connection,
} from '../__test-utils__/CubeDirectConnectionFixtures.js';
import {
  CUBE_DIRECT_DATABASE_PATH,
  CUBE_DIRECT_RUNTIME_PATH,
  createCubeDirectModel,
} from '../graph-manager/CubeDirectConnection.js';
import {
  type AccessorPath,
  CubeEngineErrorKind,
} from '../graph-manager/CubeEngine.js';
import { V1_createEngineBackedCubeEngine } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeEngineTestUtils.js';

// A direct-connection cube on the engine (PLAN §6.8): its tables read from
// the database behind its connection, then typed and run on the model built
// from them. Its own schemas, so it can run beside the other engine tests

const H2_SCHEMA = 'CUBE_DIRECT_RUN';
const DUCKDB_SCHEMA = 'cube_direct_run';

const accessor = (schema: string, table: string): AccessorPath => [
  CUBE_DIRECT_DATABASE_PATH,
  `"${schema}"`,
  `"${table}"`,
];

/** The execution lambda of a query on one table, captured at it */
const executionOn = (path: AccessorPath, schema: Schema): IR =>
  new QueryEmitter(
    new Query(
      [
        new RelationalTableSource(
          'relational101',
          { database: path[0], schema: path[1], table: path[2] },
          { kind: 'resolved', schema },
        ),
      ],
      [],
      'relational101',
    ),
  ).emitExecutionLambda({ rowLimit: 10, runtime: CUBE_DIRECT_RUNTIME_PATH });

describe.each<[string, PlainObject, string, string]>([
  ['H2', directH2Connection(H2_SCHEMA), H2_SCHEMA, 'ORDERS'],
  ['DuckDB', directDuckDBConnection(DUCKDB_SCHEMA), DUCKDB_SCHEMA, 'orders'],
])('A direct-connection cube on %s', (_, connection, schemaName, table) => {
  test('Resolves a table from its database and runs a query on it', async () => {
    const { engine, calls } = V1_createEngineBackedCubeEngine();
    const model = createCubeDirectModel(connection);
    const path = accessor(schemaName, table);
    const resolved = await engine.resolveSchemas(
      model,
      new Map([['relational101', path]]),
    );
    const schema = resolved.get('relational101');
    expect(schema).toBeInstanceOf(Schema);
    expect(
      (schema as Schema).columns.map((column) => [
        column.name.toUpperCase(),
        column.nullable,
      ]),
    ).toEqual([
      ['ORDER_ID', false],
      ['CUSTOMER_ID', false],
      ['AMOUNT', true],
    ]);
    const result = await engine.execute(
      model,
      executionOn(path, schema as Schema),
    );
    expect(result.columns.map((column) => column.toUpperCase())).toEqual([
      'ORDER_ID',
      'CUSTOMER_ID',
      'AMOUNT',
    ]);
    // numbers are read digit for digit, as text
    expect(result.rows.map((row) => row.slice(0, 2))).toEqual([
      ['1', 'ALFKI'],
      ['2', 'ANATR'],
    ]);
    // the run used the table read to resolve it
    expect(calls.buildDatabase).toHaveBeenCalledTimes(1);
    expect(calls.grammarToJSON_model).not.toHaveBeenCalled();
  });

  test("Places a table its database doesn't have on its node", async () => {
    const { engine, calls } = V1_createEngineBackedCubeEngine();
    const resolved = await engine.resolveSchemas(
      createCubeDirectModel(connection),
      new Map([['relational101', accessor(schemaName, 'NO_SUCH_TABLE')]]),
    );
    expect(resolved.get('relational101')).toMatchObject({
      kind: CubeEngineErrorKind.COMPILE,
      nodeId: 'relational101',
      detail: `The database has no table NO_SUCH_TABLE in schema ${schemaName}`,
    });
    expect(calls.batchLambdasRelationType).not.toHaveBeenCalled();
  });
});

describe('A direct-connection cube whose setup fails', () => {
  test("Says the database refused the connection's setup SQL", async () => {
    const { engine } = V1_createEngineBackedCubeEngine();
    const connection = directH2Connection('CUBE_DIRECT_BAD');
    const { datasourceSpecification } = connection as {
      datasourceSpecification: PlainObject;
    };
    const resolved = await engine.resolveSchemas(
      createCubeDirectModel({
        ...connection,
        datasourceSpecification: {
          ...datasourceSpecification,
          testDataSetupSqls: ['create tabel CUBE_DIRECT_BAD.X (A INT)'],
        },
      }),
      new Map([['relational101', accessor('CUBE_DIRECT_BAD', 'X')]]),
    );
    const error = resolved.get('relational101');
    expect(error).toMatchObject({
      kind: CubeEngineErrorKind.COMPILE,
      nodeId: 'relational101',
    });
    expect((error as { detail: string }).detail.split('\n')[0]).toBe(
      "The database refused a statement: check the connection's setup SQL",
    );
  });
});
