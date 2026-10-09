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
import type { PlainObject } from '@finos/legend-shared';
import { CubeDirectDatabaseType } from '../../../../CubeConnectionExplorer.js';
import { CubeTableFlag } from '../../../../CubeEngine.js';
import {
  V1_buildCubeSchemaExplorationInput,
  V1_buildExploredDatabase,
  V1_readExploredSchemaNames,
  V1_readExploredTables,
} from '../V1_CubeSchemaExploration.js';
import H2_SCHEMAS from './V1_SchemaExploration.H2.schemas.json' with { type: 'json' };
import H2_TABLES from './V1_SchemaExploration.H2.tables.json' with { type: 'json' };
import DUCKDB_TABLES from './V1_SchemaExploration.DuckDB.tables.json' with { type: 'json' };

// The engine's answers are recorded from a local engine (commit `93d92b4`;
// local evidence `sources-v2/db-direct/`): the H2 database has dotted,
// spaced and mixed-case names, a view, and columns of every type; the DuckDB
// one has a mixed-case table and the types DuckDB adds

const CONNECTION = { _type: 'RelationalDatabaseConnection' };
const DATABASE = { package: 'cube::direct', name: 'Database' };

const patternsOf = (input: PlainObject): unknown =>
  (input.config as PlainObject).patterns;

/** A Database's tables, by quoted schema and table, with their quoted columns */
const shapeOf = (
  database: PlainObject,
): Record<string, Record<string, string[]>> =>
  Object.fromEntries(
    (database.schemas as PlainObject[]).map((schema) => [
      schema.name,
      Object.fromEntries(
        (schema.tables as PlainObject[]).map((table) => [
          table.name,
          (table.columns as PlainObject[]).map((column) => column.name),
        ]),
      ),
    ]),
  );

describe('Schema exploration requests', () => {
  test('Tests a connection by listing its schemas only', () => {
    expect(
      V1_buildCubeSchemaExplorationInput(
        CONNECTION,
        CubeDirectDatabaseType.H2,
        DATABASE,
        { kind: 'schemas' },
      ),
    ).toEqual({
      connection: CONNECTION,
      targetDatabase: DATABASE,
      config: {
        enrichTables: false,
        enrichColumns: false,
        enrichPrimaryKeys: false,
        enrichTableFunctions: false,
        patterns: [
          { schemaPattern: '%', tablePattern: '%', functionPattern: '_%' },
        ],
      },
    });
  });

  test("Finds H2 names that aren't all upper case through '%', since H2 upper-cases a pattern", () => {
    expect(
      patternsOf(
        V1_buildCubeSchemaExplorationInput(
          CONNECTION,
          CubeDirectDatabaseType.H2,
          DATABASE,
          {
            kind: 'columns',
            tables: [
              ['DBPROBE', 'ORDERS'],
              ['DBPROBE', 'mixedCase'],
              ['lower_schema', 'T1'],
            ],
          },
        ),
      ),
    ).toEqual([
      {
        schemaPattern: 'DBPROBE',
        tablePattern: 'ORDERS',
        functionPattern: '_%',
      },
      { schemaPattern: 'DBPROBE', tablePattern: '%', functionPattern: '_%' },
      { schemaPattern: '%', tablePattern: 'T1', functionPattern: '_%' },
    ]);
  });

  test('Finds DuckDB names exactly as stored, in any case', () => {
    expect(
      patternsOf(
        V1_buildCubeSchemaExplorationInput(
          CONNECTION,
          CubeDirectDatabaseType.DUCKDB,
          DATABASE,
          {
            kind: 'columns',
            tables: [
              ['dbprobe', 'orders'],
              ['dbprobe', 'Mixed Case'],
              ['dbprobe', 'UPPER_T'],
            ],
          },
        ),
      ),
    ).toEqual([
      {
        schemaPattern: 'dbprobe',
        tablePattern: 'orders',
        functionPattern: '_%',
      },
      {
        schemaPattern: 'dbprobe',
        tablePattern: 'Mixed Case',
        functionPattern: '_%',
      },
      {
        schemaPattern: 'dbprobe',
        tablePattern: 'UPPER_T',
        functionPattern: '_%',
      },
    ]);
  });

  test("Lists a schema's tables with their columns, but not their keys", () => {
    expect(
      V1_buildCubeSchemaExplorationInput(
        CONNECTION,
        CubeDirectDatabaseType.DUCKDB,
        DATABASE,
        { kind: 'tables', schema: 'dbprobe' },
      ).config as PlainObject,
    ).toMatchObject({
      enrichTables: true,
      enrichColumns: true,
      enrichPrimaryKeys: false,
      patterns: [
        { schemaPattern: 'dbprobe', tablePattern: '%', functionPattern: '_%' },
      ],
    });
  });
});

describe('Schemas and tables for the picker', () => {
  test("Lists a database's schemas, without the database's own", () => {
    expect(V1_readExploredSchemaNames(H2_SCHEMAS)).toEqual([
      'lower_schema',
      'DBPROBE',
    ]);
  });

  test('Lists tables and views by their stored names, quoted once in coordinates, with their usable and hidden columns', () => {
    expect(V1_readExploredTables(H2_TABLES, 'DBPROBE')).toEqual([
      {
        name: 'MY TABLE',
        storedName: '"MY TABLE"',
        columnCount: 2,
        hiddenColumnCount: 0,
        flags: [],
      },
      {
        name: 'ORDER',
        storedName: '"ORDER"',
        columnCount: 2,
        hiddenColumnCount: 0,
        flags: [],
      },
      {
        name: 'ORDER.LINES',
        storedName: '"ORDER.LINES"',
        columnCount: 2,
        hiddenColumnCount: 0,
        flags: [],
      },
      {
        // REAL, TIME, BINARY and CLOB come back as Other
        name: 'ORDERS',
        storedName: '"ORDERS"',
        columnCount: 16,
        hiddenColumnCount: 4,
        flags: [CubeTableFlag.LENGTH_UNKNOWN],
      },
      {
        name: 'mixedCase',
        storedName: '"mixedCase"',
        columnCount: 2,
        hiddenColumnCount: 0,
        flags: [],
      },
      {
        name: 'FRENCH_ORDERS',
        storedName: '"FRENCH_ORDERS"',
        columnCount: 3,
        hiddenColumnCount: 0,
        flags: [],
      },
    ]);
    expect(V1_readExploredTables(H2_TABLES, 'NO_SUCH_SCHEMA')).toEqual([]);
  });

  test('Keeps the DuckDB types H2 loses, and hides those DuckDB loses', () => {
    expect(V1_readExploredTables(DUCKDB_TABLES, 'dbprobe')).toEqual([
      {
        name: 'Mixed Case',
        storedName: '"Mixed Case"',
        columnCount: 1,
        hiddenColumnCount: 0,
        flags: [],
      },
      {
        // REAL is kept as Float; HUGEINT, TIME, BLOB, UUID and VARCHAR[] are hidden
        name: 'orders',
        storedName: '"orders"',
        columnCount: 9,
        hiddenColumnCount: 5,
        flags: [],
      },
    ]);
  });
});

describe('The Database a query runs on', () => {
  test('Holds the tables asked for, every name quoted, without the columns Cube hides', () => {
    const { database, missing } = V1_buildExploredDatabase(H2_TABLES, [
      ['DBPROBE', 'ORDER.LINES'],
      ['DBPROBE', 'MY TABLE'],
      ['DBPROBE', 'ORDERS'],
    ]);
    expect(missing).toEqual([]);
    expect(database).toMatchObject({
      _type: 'relational',
      package: 'cube::direct',
      name: 'ProbeDb',
    });
    expect(shapeOf(database)).toEqual({
      '"DBPROBE"': {
        '"ORDER.LINES"': ['"LINE_ID"', '"RIGHT_COL"'],
        '"MY TABLE"': ['"MY COL"', '"A:B"'],
        '"ORDERS"': [
          '"ORDER_ID"',
          '"CUSTOMER_ID"',
          '"AMOUNT"',
          '"QTY"',
          '"DBL"',
          '"FLT"',
          '"BIG"',
          '"SMALL"',
          '"TINY"',
          '"FLAG"',
          '"B"',
          '"CODE"',
          '"ORDER_DATE"',
          '"SHIPPED_AT"',
          '"SHIPPED_TZ"',
          '"LONGTXT"',
        ],
      },
    });
    const orders = (
      (database.schemas as PlainObject[])[0]?.tables as PlainObject[]
    ).find((table) => table.name === '"ORDERS"');
    expect(orders?.primaryKey).toEqual(['"ORDER_ID"']);
  });

  test("Never takes a table whose name only matches the pattern: in LIKE, '_' matches any character", () => {
    const response = {
      _type: 'data',
      elements: [
        {
          _type: 'relational',
          package: 'cube::direct',
          name: 'Database',
          schemas: [
            {
              name: 'S',
              tables: [{ name: 'ORDERXLINES', columns: [], primaryKey: [] }],
            },
          ],
        },
      ],
    };
    const { database, missing } = V1_buildExploredDatabase(response, [
      ['S', 'ORDER_LINES'],
    ]);
    expect(missing).toEqual([['S', 'ORDER_LINES']]);
    expect(shapeOf(database)).toEqual({});
  });

  test('Reports the tables the database does not have, rather than an empty table', () => {
    expect(
      V1_buildExploredDatabase(DUCKDB_TABLES, [
        ['dbprobe', 'orders'],
        ['dbprobe', 'ORDERS'],
        ['other', 'orders'],
      ]).missing,
    ).toEqual([
      ['dbprobe', 'ORDERS'],
      ['other', 'orders'],
    ]);
  });

  test("Refuses names Pure can't write: those holding a double quote", () => {
    const response = {
      elements: [
        {
          schemas: [
            {
              name: 'S',
              tables: [
                {
                  name: 'T"1',
                  columns: [
                    { name: 'ID', nullable: true, type: { _type: 'Integer' } },
                  ],
                },
                {
                  name: 'T2',
                  columns: [
                    { name: 'ID', nullable: true, type: { _type: 'Integer' } },
                    { name: 'A"B', nullable: true, type: { _type: 'Integer' } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(V1_readExploredTables(response, 'S')).toEqual([
      {
        name: 'T2',
        storedName: '"T2"',
        columnCount: 1,
        hiddenColumnCount: 1,
        flags: [],
      },
    ]);
    expect(V1_buildExploredDatabase(response, [['S', 'T"1']]).missing).toEqual([
      ['S', 'T"1'],
    ]);
  });

  test('Takes a name wrapped in quotes as quoted by the engine only when it holds a space or a colon, as the engine quotes', () => {
    const column = (name: string): PlainObject => ({
      name,
      nullable: true,
      type: { _type: 'Integer' },
    });
    const response = {
      elements: [
        {
          schemas: [
            {
              name: 'S',
              tables: [
                // a table whose stored name has quotes of its own, and its twin
                { name: '"X"', columns: [column('A')] },
                { name: 'X', columns: [column('B')] },
                {
                  name: 'Y',
                  columns: [
                    // the engine's quoting of `MY COL`
                    column('"MY COL"'),
                    // a column whose stored name is `"c"`, and its twin `c`
                    column('"c"'),
                    column('c'),
                  ],
                },
                { name: 'BACK\\SLASH', columns: [column('A')] },
              ],
            },
          ],
        },
      ],
    };
    expect(
      V1_readExploredTables(response, 'S').map((table) => [
        table.name,
        table.columnCount,
        table.hiddenColumnCount,
      ]),
    ).toEqual([
      ['X', 1, 0],
      ['Y', 2, 1],
    ]);
    const { database, missing } = V1_buildExploredDatabase(response, [
      ['S', 'Y'],
      ['S', 'X'],
      ['S', '"X"'],
    ]);
    const [schema] = database.schemas as PlainObject[];
    expect(
      (schema?.tables as PlainObject[]).map((table) => [
        table.name,
        (table.columns as PlainObject[]).map((each) => each.name),
      ]),
    ).toEqual([
      ['"Y"', ['"MY COL"', '"c"']],
      ['"X"', ['"B"']],
    ]);
    expect(missing).toEqual([['S', '"X"']]);
  });
});
