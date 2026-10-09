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
import { unitTest } from '@finos/legend-shared/test';
import { guaranteeType, type PlainObject } from '@finos/legend-shared';
import type { Entity } from '@finos/legend-storage';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
} from '../../../../../__test-utils__/GraphManagerTestUtils.js';
import { V1_resolveRelationalStoreAccessorPath } from '../V1_AccessorHelper.js';
import {
  type Accessor,
  AccessorInstanceValue,
  RelationalStoreAccessor,
} from '../../../../../../graph/metamodel/pure/packageableElements/relation/Accessor.js';
import { RawLambda } from '../../../../../../graph/metamodel/pure/rawValueSpecification/RawLambda.js';

const DB = 'test::AccessorDb';

const buildTable = (name: string, columns: string[]): PlainObject => ({
  name,
  columns: columns.map((column) => ({
    name: column,
    nullable: true,
    type: { _type: 'Integer' },
  })),
  primaryKey: [],
});

// `T` is in both `S1` and `S2`, with different columns; `default` comes last,
// as in a database built from grammar
const TEST_DATA__entities: Entity[] = [
  {
    path: DB,
    classifierPath: 'meta::relational::metamodel::Database',
    content: {
      _type: 'relational',
      name: 'AccessorDb',
      package: 'test',
      filters: [],
      joins: [],
      schemas: [
        {
          name: 'S1',
          tables: [
            buildTable('T', ['ID', 'ONLY_S1']),
            buildTable('"a.b"', ['ID']),
          ],
          views: [],
        },
        {
          name: 'S2',
          tables: [buildTable('T', ['ID', 'ONLY_S2'])],
          views: [],
        },
        {
          name: 'default',
          tables: [buildTable('DEF_T', ['ID', 'ONLY_DEFAULT'])],
          views: [],
        },
      ],
    },
  },
];

const graphManagerState = TEST__getTestGraphManagerState();

beforeAll(async () => {
  await TEST__buildGraphWithEntities(graphManagerState, TEST_DATA__entities);
});

const buildAccessorValueSpecification = (path: string[]): PlainObject => ({
  _type: 'classInstance',
  type: '>',
  value: { path },
});

const buildAccessor = (path: string[]): RelationalStoreAccessor =>
  guaranteeType(
    guaranteeType(
      graphManagerState.graphManager.buildValueSpecification(
        buildAccessorValueSpecification(path),
        graphManagerState.graph,
      ),
      AccessorInstanceValue,
    ).values[0],
    RelationalStoreAccessor,
  );

// build the accessor, then serialize it back: what saving a query writes
const roundtripPath = (path: string[]): unknown =>
  (
    graphManagerState.graphManager.serializeValueSpecification(
      graphManagerState.graphManager.buildValueSpecification(
        buildAccessorValueSpecification(path),
        graphManagerState.graph,
      ),
    ).value as PlainObject
  ).path;

const getColumnNames = (accessor: Accessor): string[] =>
  accessor.relationType.columns.map((column) => column.name);

describe(unitTest('V1_resolveRelationalStoreAccessorPath'), () => {
  test('reads db.schema.table and db.table the way the engine does', () => {
    expect(V1_resolveRelationalStoreAccessorPath(['db', 'S', 'T'])).toEqual({
      databasePath: 'db',
      schemaName: 'S',
      tableName: 'T',
      hasExplicitSchema: true,
    });
    expect(V1_resolveRelationalStoreAccessorPath(['db', 'T'])).toEqual({
      databasePath: 'db',
      schemaName: 'default',
      tableName: 'T',
      hasExplicitSchema: false,
    });
  });

  test('rejects a path with no table, or with more than three parts', () => {
    expect(() => V1_resolveRelationalStoreAccessorPath(['db'])).toThrow(
      'Error in the accessor definition. Please provide a table.',
    );
    expect(() =>
      V1_resolveRelationalStoreAccessorPath(['db', 'S', 'T', 'X']),
    ).toThrow(
      `RelationStoreAccessor path must be of the form 'db.table' or 'db.schema.table' (got 4 segments: 'db.S.T.X')`,
    );
  });

  test('joins back a quoted name that the grammar split on its dots', () => {
    expect(
      V1_resolveRelationalStoreAccessorPath(['db', 'S', '"a', 'b"']),
    ).toEqual({
      databasePath: 'db',
      schemaName: 'S',
      tableName: '"a.b"',
      hasExplicitSchema: true,
    });
    expect(
      V1_resolveRelationalStoreAccessorPath(['db', '"a', 'b', 'c"']),
    ).toEqual({
      databasePath: 'db',
      schemaName: 'default',
      tableName: '"a.b.c"',
      hasExplicitSchema: false,
    });
    // a quote that never closes is left alone
    expect(() =>
      V1_resolveRelationalStoreAccessorPath(['db', 'S', '"a', 'b']),
    ).toThrow('got 4 segments');
  });
});

describe(unitTest('Relation store accessor: build, then serialize'), () => {
  test('a table in a named schema comes from that schema', () => {
    const accessor = buildAccessor([DB, 'S2', 'T']);

    expect(accessor.schema).toBe('S2');
    expect(getColumnNames(accessor)).toEqual(['ID', 'ONLY_S2']);
    expect(roundtripPath([DB, 'S2', 'T'])).toEqual([DB, 'S2', 'T']);
  });

  test('db.TABLE reads the default schema and is saved as written', () => {
    const accessor = buildAccessor([DB, 'DEF_T']);

    expect(accessor.schema).toBe('default');
    expect(accessor.accessor).toBe('DEF_T');
    expect(accessor.hasExplicitSchema).toBe(false);
    expect(getColumnNames(accessor)).toEqual(['ID', 'ONLY_DEFAULT']);
    expect(roundtripPath([DB, 'DEF_T'])).toEqual([DB, 'DEF_T']);
    // the three-part spelling of the same table stays three parts
    expect(roundtripPath([DB, 'default', 'DEF_T'])).toEqual([
      DB,
      'default',
      'DEF_T',
    ]);
  });

  test('a quoted table name with a dot builds from the split path and is saved whole', () => {
    const accessor = buildAccessor([DB, 'S1', '"a', 'b"']);

    expect(accessor.schema).toBe('S1');
    expect(accessor.accessor).toBe('"a.b"');
    expect(roundtripPath([DB, 'S1', '"a', 'b"'])).toEqual([DB, 'S1', '"a.b"']);
  });

  test('a table missing from the named schema fails with the engine message', () => {
    expect(() => buildAccessor([DB, 'S2', 'DEF_T'])).toThrow(
      `Can't find table 'DEF_T' in schema 'S2' and database '${DB}'`,
    );
    expect(() => buildAccessor([DB, 'S1', 'T', 'X'])).toThrow('got 4 segments');
    expect(() => buildAccessor([DB])).toThrow('Please provide a table');
  });
});

describe(
  unitTest('collectAccessorsInRawLambda: relation store accessors'),
  () => {
    test('reads each path the way the engine does and skips malformed ones', async () => {
      const rawLambda = new RawLambda(
        [],
        [
          buildAccessorValueSpecification([DB, 'S2', 'T']),
          buildAccessorValueSpecification([DB, 'DEF_T']),
          buildAccessorValueSpecification([DB, 'S1', 'T', 'X']),
        ],
      );

      const accessors =
        await graphManagerState.graphManager.collectAccessorsInRawLambda(
          rawLambda,
          graphManagerState.graph,
        );

      expect(
        accessors.map((accessor) => [
          accessor.path,
          accessor.schema,
          getColumnNames(accessor),
        ]),
      ).toEqual([
        [[DB, 'S2', 'T'], 'S2', ['ID', 'ONLY_S2']],
        [[DB, 'DEF_T'], 'default', ['ID', 'ONLY_DEFAULT']],
      ]);
    });
  },
);
