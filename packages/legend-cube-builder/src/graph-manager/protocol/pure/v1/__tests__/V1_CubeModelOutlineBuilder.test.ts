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
import { getRuntimesForDatabase } from '../../../../CubeModelOutlineHelper.js';
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

  test("Doesn't follow a database's includes", () => {
    expect(outline.databases[1]?.schemas).toEqual([]);
  });

  test("Reads a runtime's stores from both syntaxes, and hides runtimes it can't read", () => {
    expect(outline.runtimes).toEqual([
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
