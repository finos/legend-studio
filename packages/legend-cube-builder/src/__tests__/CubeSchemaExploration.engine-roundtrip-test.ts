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
import type { PlainObject } from '@finos/legend-shared';
import { CUBE_ENGINE_TEST__schemaExploration } from '../__test-utils__/CubeConnectionTestSupport.js';
import { V1_createEngineBackedCubeConnectionExplorer } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeConnectionExplorerTestUtils.js';
import {
  DIRECT_DUCKDB_CONNECTION,
  DIRECT_DUCKDB_SCHEMA,
  DIRECT_H2_CONNECTION,
  DIRECT_H2_SCHEMA,
} from '../__test-utils__/CubeDirectConnectionFixtures.js';

// A direct-connection cube reads its database through the engine's schema
// exploration (PLAN §6.8), for H2 and DuckDB first: this checks the engine the
// tests run against can do both, before anything depends on it

const explore = (connection: PlainObject, schema: string) =>
  CUBE_ENGINE_TEST__schemaExploration({
    connection,
    targetDatabase: { package: 'cube::direct', name: 'Database' },
    config: {
      enrichTables: true,
      enrichTableFunctions: false,
      enrichColumns: true,
      enrichPrimaryKeys: false,
      patterns: [
        { schemaPattern: schema, tablePattern: '%', functionPattern: '_%' },
      ],
    },
  });

/** The tables of the one Database the engine returns, by schema, with their column names */
const tablesOf = (
  model: PlainObject,
): Record<string, Record<string, string[]>> => {
  expect(model._type).toBe('data');
  const elements = model.elements as PlainObject[];
  expect(
    elements.map((element) => [element._type, element.package, element.name]),
  ).toEqual([['relational', 'cube::direct', 'Database']]);
  return Object.fromEntries(
    (elements[0]?.schemas as PlainObject[]).map((schema) => [
      schema.name,
      Object.fromEntries(
        (schema.tables as PlainObject[]).map((table) => [
          table.name,
          (table.columns as PlainObject[]).map((column) => column.name),
        ]),
      ),
    ]),
  );
};

describe('Schema exploration for direct connections', () => {
  test('Reads the tables and columns of an H2 database', async () => {
    expect(
      tablesOf(await explore(DIRECT_H2_CONNECTION, DIRECT_H2_SCHEMA)),
    ).toEqual({
      [DIRECT_H2_SCHEMA]: { ORDERS: ['ORDER_ID', 'CUSTOMER_ID', 'AMOUNT'] },
    });
  });

  test('Reads the tables and columns of an in-memory DuckDB database', async () => {
    expect(
      tablesOf(await explore(DIRECT_DUCKDB_CONNECTION, DIRECT_DUCKDB_SCHEMA)),
    ).toEqual({
      [DIRECT_DUCKDB_SCHEMA]: {
        orders: ['order_id', 'customer_id', 'amount'],
      },
    });
    // the first DuckDB call loads the engine's driver
  }, 20_000);
});

describe('Connection explorer on the engine', () => {
  let engineBacked: ReturnType<
    typeof V1_createEngineBackedCubeConnectionExplorer
  >;
  beforeEach(() => {
    engineBacked = V1_createEngineBackedCubeConnectionExplorer();
  });

  test("Lists an H2 database's schemas without the database's own, then a schema's tables", async () => {
    const { explorer } = engineBacked;
    const schemas = await explorer.listSchemas(DIRECT_H2_CONNECTION);
    expect(schemas).toContain(DIRECT_H2_SCHEMA);
    expect(schemas).not.toContain('INFORMATION_SCHEMA');
    expect(
      await explorer.listTables(DIRECT_H2_CONNECTION, DIRECT_H2_SCHEMA),
    ).toEqual([
      {
        name: 'ORDERS',
        storedName: '"ORDERS"',
        columnCount: 3,
        hiddenColumnCount: 0,
        flags: [],
      },
    ]);
    expect(engineBacked.calls.buildDatabase).toHaveBeenCalledTimes(2);
  });

  test("Lists an in-memory DuckDB database's schemas, then a schema's tables", async () => {
    const { explorer } = engineBacked;
    expect(await explorer.listSchemas(DIRECT_DUCKDB_CONNECTION)).toContain(
      DIRECT_DUCKDB_SCHEMA,
    );
    expect(
      await explorer.listTables(DIRECT_DUCKDB_CONNECTION, DIRECT_DUCKDB_SCHEMA),
    ).toEqual([
      {
        name: 'orders',
        storedName: '"orders"',
        columnCount: 3,
        hiddenColumnCount: 0,
        flags: [],
      },
    ]);
  }, 20_000);

  test('Says what a failure means: here, setup SQL the database refuses', async () => {
    const { explorer } = engineBacked;
    const broken = JSON.parse(
      JSON.stringify(DIRECT_H2_CONNECTION),
    ) as PlainObject;
    (broken.datasourceSpecification as PlainObject).testDataSetupSqls = [
      'create tabel CUBE_DIRECT_BROKEN.T (ID INT)',
    ];
    await expect(explorer.listSchemas(broken)).rejects.toMatchObject({
      firstLine:
        "The database refused a statement: check the connection's setup SQL",
    });
  });
});
