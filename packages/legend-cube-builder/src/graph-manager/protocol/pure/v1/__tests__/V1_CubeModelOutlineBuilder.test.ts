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
  CubeTableFlag,
  type CubeModelOutline,
  type CubeOutlineTable,
} from '../../../../CubeEngine.js';
import {
  getDatabaseType,
  getRuntimesForDatabase,
} from '../../../../CubeModelOutlineHelper.js';
import { V1_buildCubeModelOutline } from '../V1_CubeModelOutlineBuilder.js';

// A parsed model, shaped as the engine's grammarToJson/model gives it
// (legend-cube-evidence/m17-probes/outline-probe.mjs), trimmed

const column = (name: string, type: object): object => ({
  name,
  nullable: true,
  type,
});

/** A runtime with one connection, keyed by the store */
const runtimeKeyedBy = (
  pkg: string,
  name: string,
  storePath: string,
): object => ({
  _type: 'runtime',
  package: pkg,
  name,
  runtimeValue: {
    _type: 'engineRuntime',
    mappings: [],
    connections: [
      { store: { path: storePath, type: 'STORE' }, storeConnections: [] },
    ],
    connectionStores: [],
  },
});

const runtimePathsFor = (
  outline: CubeModelOutline,
  databasePath: string,
): string[] =>
  getRuntimesForDatabase(outline, databasePath).map((runtime) => runtime.path);

/** The outline of a model whose one table is T(ID INTEGER, P <type>) */
const tableWithColumnOfType = (type: object): CubeOutlineTable | undefined =>
  V1_buildCubeModelOutline({
    _type: 'data',
    elements: [
      {
        _type: 'relational',
        package: 'test',
        name: 'Db',
        includedStores: [],
        schemas: [
          {
            name: 'S',
            tables: [
              {
                name: 'T',
                columns: [
                  column('ID', { _type: 'Integer' }),
                  column('P', type),
                ],
              },
            ],
            views: [],
          },
        ],
      },
    ],
  }).databases[0]?.schemas[0]?.tables[0];

const MODEL_DATA = {
  _type: 'data',
  elements: [
    {
      _type: 'relational',
      package: 'test',
      name: 'Db',
      includedStores: [],
      schemas: [
        {
          name: 'S',
          tables: [
            {
              name: 'PLAIN',
              columns: [
                column('ID', { _type: 'Integer' }),
                column('NAME', { _type: 'Varchar', size: 10 }),
                column('AMT', { _type: 'Decimal', precision: 10, scale: 2 }),
              ],
            },
            {
              name: '"A.B"',
              columns: [column('X', { _type: 'Integer' })],
            },
            {
              name: 'FLAGGED',
              columns: [
                column('C', { _type: 'Char', size: 3 }),
                column('O', { _type: 'Other' }),
                column('B', { _type: 'Binary', size: 8 }),
                column('V', { _type: 'Varbinary', size: 4 }),
                column('J', { _type: 'Json' }),
              ],
            },
          ],
          views: [
            {
              name: 'VIEW',
              columnMappings: [{ name: 'ID' }, { name: 'NAME' }],
            },
          ],
        },
        { name: 'default', tables: [], views: [] },
      ],
    },
    {
      _type: 'relational',
      package: 'test',
      name: 'IncludingDb',
      includedStores: [{ path: 'test::Db', type: 'STORE' }],
      schemas: [],
    },
    {
      _type: 'connection',
      package: 'test',
      name: 'Connection',
    },
    {
      _type: 'runtime',
      package: 'test',
      name: 'ConnectionsRuntime',
      runtimeValue: {
        _type: 'engineRuntime',
        mappings: [],
        connections: [
          { store: { path: 'test::Db', type: 'STORE' }, storeConnections: [] },
        ],
        connectionStores: [],
      },
    },
    {
      _type: 'runtime',
      package: 'test',
      name: 'ConnectionStoresRuntime',
      runtimeValue: {
        _type: 'engineRuntime',
        mappings: [],
        connections: [],
        connectionStores: [
          {
            connectionPointer: { connection: 'test::Connection' },
            storePointers: [{ path: 'test::Db' }, { path: 'test::Other' }],
          },
        ],
      },
    },
    {
      _type: 'runtime',
      package: 'test',
      name: 'IncludingRuntime',
      runtimeValue: {
        _type: 'engineRuntime',
        mappings: [],
        connections: [
          {
            store: { path: 'test::IncludingDb', type: 'STORE' },
            storeConnections: [],
          },
        ],
        connectionStores: [],
      },
    },
    // keyed by near misses of test::Db
    runtimeKeyedBy('test', 'LongerPathRuntime', 'test::Db2'),
    runtimeKeyedBy('other', 'SameNameRuntime', 'other::Db'),
    runtimeKeyedBy('test', 'OtherCaseRuntime', 'test::DB'),
    runtimeKeyedBy('outer::test', 'NestedRuntime', 'outer::test::Db'),
    {
      _type: 'runtime',
      package: 'test',
      name: 'LocalRuntime',
      runtimeValue: { _type: 'localEngineRuntime', mappings: [] },
    },
    { _type: 'sectionIndex', package: '__internal__', name: 'SectionIndex' },
  ],
};

describe('Cube model outline', () => {
  const outline = V1_buildCubeModelOutline(MODEL_DATA);

  test('Lists every Database element by path, with its schemas, tables and views in order', () => {
    expect(outline.databases.map((database) => database.path)).toEqual([
      'test::Db',
      'test::IncludingDb',
    ]);
    const [schema, defaultSchema] = outline.databases[0]?.schemas ?? [];
    expect(schema?.name).toBe('S');
    expect(schema?.tables).toEqual([
      {
        name: 'PLAIN',
        isView: false,
        columnCount: 3,
        flags: [],
        untypedColumns: [],
      },
      {
        name: '"A.B"',
        isView: false,
        columnCount: 1,
        flags: [],
        untypedColumns: [],
      },
      {
        name: 'FLAGGED',
        isView: false,
        columnCount: 5,
        flags: [
          CubeTableFlag.UNAVAILABLE,
          CubeTableFlag.LENGTH_UNKNOWN,
          CubeTableFlag.TYPE_UNKNOWN,
        ],
        // only the OTHER column is typed as a bare String
        untypedColumns: ['O'],
      },
      {
        name: 'VIEW',
        isView: true,
        columnCount: 2,
        flags: [],
        untypedColumns: [],
      },
    ]);
    expect(defaultSchema).toEqual({ name: 'default', tables: [] });
  });

  test.each<[string, CubeTableFlag, object]>([
    ['BINARY', CubeTableFlag.UNAVAILABLE, { _type: 'Binary', size: 8 }],
    ['VARBINARY', CubeTableFlag.UNAVAILABLE, { _type: 'Varbinary', size: 4 }],
    ['CHAR', CubeTableFlag.LENGTH_UNKNOWN, { _type: 'Char', size: 3 }],
    ['OTHER (or ARRAY)', CubeTableFlag.TYPE_UNKNOWN, { _type: 'Other' }],
  ])('Flags a table whose only problem column is %s as %s', (_, flag, type) => {
    expect(tableWithColumnOfType(type)).toEqual({
      name: 'T',
      isView: false,
      columnCount: 2,
      flags: [flag],
      untypedColumns: flag === CubeTableFlag.TYPE_UNKNOWN ? ['P'] : [],
    });
  });

  test('Lists an untyped column by its name unquoted, as the engine names it in the schema', () => {
    const quoted = V1_buildCubeModelOutline({
      _type: 'data',
      elements: [
        {
          _type: 'relational',
          package: 'test',
          name: 'Db',
          includedStores: [],
          schemas: [
            {
              name: 'S',
              tables: [
                {
                  name: '"T.Q"',
                  columns: [
                    column('ID', { _type: 'Integer' }),
                    column('"MY COL"', { _type: 'Other' }),
                    column('PLAIN_OTHER', { _type: 'Other' }),
                  ],
                },
              ],
              views: [],
            },
          ],
        },
      ],
    });
    const [table] = quoted.databases[0]?.schemas[0]?.tables ?? [];
    // the table keeps its name as stored; only column names are unquoted
    expect(table?.name).toBe('"T.Q"');
    expect(table?.untypedColumns).toEqual(['MY COL', 'PLAIN_OTHER']);
  });

  test("Doesn't follow a database's includes", () => {
    expect(outline.databases[1]?.schemas).toEqual([]);
  });

  test("Reads a runtime's stores from both syntaxes, and hides runtimes it can't read", () => {
    // these runtimes' connections name no database type
    expect(
      outline.runtimes.map(({ path, storePaths }) => ({ path, storePaths })),
    ).toEqual([
      { path: 'test::ConnectionsRuntime', storePaths: ['test::Db'] },
      {
        path: 'test::ConnectionStoresRuntime',
        storePaths: ['test::Db', 'test::Other'],
      },
      { path: 'test::IncludingRuntime', storePaths: ['test::IncludingDb'] },
      { path: 'test::LongerPathRuntime', storePaths: ['test::Db2'] },
      { path: 'other::SameNameRuntime', storePaths: ['other::Db'] },
      { path: 'test::OtherCaseRuntime', storePaths: ['test::DB'] },
      { path: 'outer::test::NestedRuntime', storePaths: ['outer::test::Db'] },
    ]);
    outline.runtimes.forEach((runtime) =>
      expect(runtime.connections).toEqual([]),
    );
  });

  test('Offers only the runtimes keyed by exactly the database, not through an include', () => {
    expect(runtimePathsFor(outline, 'test::Db')).toEqual([
      'test::ConnectionsRuntime',
      'test::ConnectionStoresRuntime',
    ]);
    expect(runtimePathsFor(outline, 'test::Missing')).toEqual([]);
  });

  test.each<[string, string, string]>([
    ['a longer path', 'test::Db2', 'test::LongerPathRuntime'],
    ['the same name in another package', 'other::Db', 'other::SameNameRuntime'],
    ['the path in another case', 'test::DB', 'test::OtherCaseRuntime'],
    [
      'a path ending in test::Db',
      'outer::test::Db',
      'outer::test::NestedRuntime',
    ],
  ])(
    'Offers the runtime keyed by %s (%s) to that store only, not to test::Db',
    (_, storePath, runtimePath) => {
      expect(runtimePathsFor(outline, 'test::Db')).not.toContain(runtimePath);
      expect(runtimePathsFor(outline, storePath)).toEqual([runtimePath]);
    },
  );

  test('Gives an empty outline for a model with no elements', () => {
    expect(V1_buildCubeModelOutline({ _type: 'data', elements: [] })).toEqual({
      databases: [],
      runtimes: [],
    });
  });
});

describe('Cube model outline: database types', () => {
  // shaped as the engine's grammarToJson gives them (probed on 93d92b4)
  const connection = (name: string, connectionValue: object): object => ({
    _type: 'connection',
    package: 'test',
    name,
    connectionValue,
  });
  const relational = (type: string, typeKey = 'type'): object => ({
    _type: 'RelationalDatabaseConnection',
    [typeKey]: type,
    element: 'test::Db',
  });
  const pointer = (path: string): object => ({
    _type: 'connectionPointer',
    connection: path,
  });
  const runtime = (name: string, runtimeValue: object): object => ({
    _type: 'runtime',
    package: 'test',
    name,
    runtimeValue: {
      _type: 'engineRuntime',
      mappings: [],
      connections: [],
      connectionStores: [],
      ...runtimeValue,
    },
  });
  const storeConnections = (
    storePath: string,
    ...connections: object[]
  ): object => ({
    store: { path: storePath, type: 'STORE' },
    storeConnections: connections.map((value, index) => ({
      id: `connection_${index + 1}`,
      connection: value,
    })),
  });
  const outline = V1_buildCubeModelOutline({
    _type: 'data',
    elements: [
      connection('H2Connection', relational('H2')),
      connection('JsonConnection', {
        _type: 'JsonModelConnection',
        class: 'test::Person',
      }),
      runtime('PointerRuntime', {
        connections: [
          storeConnections('test::Db', pointer('test::H2Connection')),
        ],
      }),
      runtime('EmbeddedRuntime', {
        connections: [
          storeConnections('test::Db', relational('SqlServer')),
          // an older protocol names it databaseType only
          storeConnections('test::Other', relational('Sybase', 'databaseType')),
        ],
      }),
      runtime('ConnectionStoresRuntime', {
        connectionStores: [
          {
            connectionPointer: pointer('test::H2Connection'),
            storePointers: [{ path: 'test::Db' }, { path: 'test::Other' }],
          },
        ],
      }),
      runtime('NonRelationalRuntime', {
        connections: [
          storeConnections('test::Db', pointer('test::JsonConnection')),
          storeConnections('test::Other', pointer('test::MissingConnection')),
        ],
      }),
      runtime('MixedRuntime', {
        connections: [
          storeConnections('test::Db', relational('H2')),
          storeConnections('test::Other', relational('Postgres')),
        ],
      }),
    ],
  });
  const connectionsOf = (path: string): unknown =>
    outline.runtimes.find((entry) => entry.path === path)?.connections;

  test("Reads a runtime's connections to stores: by a pointer, embedded, and in connectionStores", () => {
    expect(connectionsOf('test::PointerRuntime')).toEqual([
      { storePath: 'test::Db', databaseType: 'H2' },
    ]);
    expect(connectionsOf('test::EmbeddedRuntime')).toEqual([
      { storePath: 'test::Db', databaseType: 'SqlServer' },
      { storePath: 'test::Other', databaseType: 'Sybase' },
    ]);
    expect(connectionsOf('test::ConnectionStoresRuntime')).toEqual([
      { storePath: 'test::Db', databaseType: 'H2' },
      { storePath: 'test::Other', databaseType: 'H2' },
    ]);
  });

  test('Skips connections that are not relational, or that point at nothing', () => {
    expect(connectionsOf('test::NonRelationalRuntime')).toEqual([]);
  });

  test('Gives the database type of the databases a query reads, when the runtime connects them all with one type', () => {
    expect(
      getDatabaseType(outline, 'test::EmbeddedRuntime', ['test::Db']),
    ).toBe('SqlServer');
    expect(
      getDatabaseType(outline, 'test::ConnectionStoresRuntime', [
        'test::Db',
        'test::Other',
      ]),
    ).toBe('H2');
  });

  test.each<[string, string, string[]]>([
    [
      'databases of different types',
      'test::MixedRuntime',
      ['test::Db', 'test::Other'],
    ],
    [
      'a database without a typed connection',
      'test::NonRelationalRuntime',
      ['test::Db'],
    ],
    ['a runtime the outline lacks', 'test::MissingRuntime', ['test::Db']],
    // a path from the model, never an object's key
    ['a store named constructor', 'test::PointerRuntime', ['constructor']],
    ['a store named __proto__', 'test::PointerRuntime', ['__proto__']],
  ])(
    'Gives no database type for %s, for the native forms',
    (_, runtimePath, databases) => {
      expect(getDatabaseType(outline, runtimePath, databases)).toBeUndefined();
    },
  );

  test('Gives no database type in an outline from before the connections were read', () => {
    const older: CubeModelOutline = {
      databases: [],
      runtimes: [{ path: 'test::Runtime', storePaths: ['test::Db'] }],
    };
    expect(
      getDatabaseType(older, 'test::Runtime', ['test::Db']),
    ).toBeUndefined();
  });
});
