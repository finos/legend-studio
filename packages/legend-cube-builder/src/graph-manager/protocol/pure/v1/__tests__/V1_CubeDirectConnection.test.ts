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
import {
  CubeConnectionDatasourceKind,
  CubeDirectDatabaseType,
} from '../../../../CubeConnectionExplorer.js';
import {
  V1_buildCubeDirectConnection,
  V1_canonicalCubeDirectConnection,
  V1_checkCubeDirectConnection,
  V1_summarizeCubeDirectConnection,
} from '../V1_CubeDirectConnection.js';

const SETUP = ['drop schema if exists S cascade', 'create schema S'];

const h2 = (): PlainObject =>
  V1_buildCubeDirectConnection({
    databaseType: CubeDirectDatabaseType.H2,
    setupSqls: SETUP,
  });

const duckDb = (path = ''): PlainObject =>
  V1_buildCubeDirectConnection({
    databaseType: CubeDirectDatabaseType.DUCKDB,
    setupSqls: SETUP,
    path,
  });

/** A copy of a connection with some properties changed */
const changed = (
  connection: PlainObject,
  change: (copy: PlainObject) => void,
): PlainObject => {
  const copy = JSON.parse(JSON.stringify(connection)) as PlainObject;
  change(copy);
  return copy;
};

const datasourceOf = (connection: PlainObject): PlainObject =>
  connection.datasourceSpecification as PlainObject;

describe('Direct connections from the connection form', () => {
  test('Builds an H2 connection the engine reads, bound to no store', () => {
    expect(h2()).toEqual({
      _type: 'RelationalDatabaseConnection',
      type: 'H2',
      databaseType: 'H2',
      datasourceSpecification: { _type: 'h2Local', testDataSetupSqls: SETUP },
      authenticationStrategy: { _type: 'h2Default' },
    });
  });

  test('Builds a DuckDB connection, in memory when it names no file', () => {
    expect(duckDb()).toEqual({
      _type: 'RelationalDatabaseConnection',
      type: 'DuckDB',
      databaseType: 'DuckDB',
      datasourceSpecification: {
        _type: 'duckDB',
        path: '',
        testDataSetupSqls: SETUP,
      },
      // as the engine registers it: 'Test' fails to parse
      authenticationStrategy: { _type: 'test' },
    });
    expect(
      datasourceOf(
        V1_buildCubeDirectConnection({
          databaseType: CubeDirectDatabaseType.DUCKDB,
          setupSqls: [],
          path: '/data/orders.duckdb',
        }),
      ),
    ).toEqual({ _type: 'duckDB', path: '/data/orders.duckdb' });
  });

  test('Accepts what the form builds', () => {
    expect(V1_checkCubeDirectConnection(h2())).toEqual([]);
    expect(V1_checkCubeDirectConnection(duckDb())).toEqual([]);
    expect(V1_checkCubeDirectConnection(duckDb('/data/orders.duckdb'))).toEqual(
      [],
    );
  });
});

describe('Direct connections Cube refuses', () => {
  test('Refuses connections to other databases, or of other kinds', () => {
    expect(V1_checkCubeDirectConnection(undefined)).toEqual([
      'The connection is not a relational database connection',
    ]);
    expect(
      V1_checkCubeDirectConnection({ _type: 'JsonModelConnection' }),
    ).toEqual(['The connection is not a relational database connection']);
    expect(
      V1_checkCubeDirectConnection(
        changed(h2(), (copy) => {
          copy.type = 'Postgres';
          copy.databaseType = 'Postgres';
        }),
      ),
    ).toEqual([
      'Cube connects to H2 and DuckDB databases only, not to "Postgres"',
    ]);
    expect(
      V1_checkCubeDirectConnection(
        changed(h2(), (copy) => {
          copy.type = 'DuckDB';
        }),
      ),
    ).toEqual([
      "The connection's type and database type must be the same database",
    ]);
  });

  test('Refuses an H2 connection with no setup SQL, which reaches no database', () => {
    expect(
      V1_checkCubeDirectConnection(
        changed(h2(), (copy) => {
          datasourceOf(copy).testDataSetupSqls = [];
        }),
      ),
    ).toEqual(['An H2 connection needs at least one setup SQL statement']);
  });

  test('Refuses settings that change how a query runs, naming each', () => {
    const refusals = (change: (copy: PlainObject) => void): readonly string[] =>
      V1_checkCubeDirectConnection(changed(h2(), change));
    expect(
      refusals((copy) => {
        copy.postProcessors = [
          { _type: 'mapper', schemaMappers: [], tableMappers: [] },
        ];
      }),
    ).toEqual([
      'The connection sets "postProcessors", which Cube doesn\'t support',
    ]);
    expect(
      refusals((copy) => {
        copy.quoteIdentifiers = true;
      }),
    ).toEqual([
      'The connection sets "quoteIdentifiers", which Cube doesn\'t support',
    ]);
    expect(
      refusals((copy) => {
        copy.timeZone = 'Europe/London';
      }),
    ).toEqual(['The connection sets "timeZone", which Cube doesn\'t support']);
    expect(
      refusals((copy) => {
        datasourceOf(copy).disableDatabaseToUpper = true;
      }),
    ).toEqual([
      "The connection keeps H2 from upper-casing names, which Cube doesn't support",
    ]);
    expect(
      refusals((copy) => {
        datasourceOf(copy).testDataSetupCsv = 'S\nT\nID\n1\n-----';
      }),
    ).toEqual([
      "The connection sets up its data from CSV, which Cube doesn't support: use setup SQL statements",
    ]);
  });

  test('Accepts those settings at the engine default', () => {
    expect(
      V1_checkCubeDirectConnection(
        changed(h2(), (copy) => {
          copy.postProcessors = [];
          copy.postProcessorWithParameter = [];
          copy.quoteIdentifiers = false;
          copy.localMode = false;
          copy.timeZone = null;
          datasourceOf(copy).disableDatabaseToUpper = false;
        }),
      ),
    ).toEqual([]);
  });

  test('Refuses properties it does not know, naming them but never repeating their values', () => {
    expect(
      V1_checkCubeDirectConnection(
        changed(h2(), (copy) => {
          copy.extra = 'x';
          datasourceOf(copy).url = 'jdbc:h2:mem:other';
          (copy.authenticationStrategy as PlainObject).password = 'hunter2';
        }),
      ),
    ).toEqual([
      'The connection has a property Cube doesn\'t know: "extra"',
      'The connection\'s database has a property Cube doesn\'t know: "url"',
      'The connection\'s authentication has a property Cube doesn\'t know: "password"',
    ]);
  });

  test('Refuses authentication strategies that need settings, or a spelling the engine rejects', () => {
    expect(
      V1_checkCubeDirectConnection(
        changed(duckDb(), (copy) => {
          copy.authenticationStrategy = { _type: 'Test' };
        }),
      ),
    ).toEqual(['A DuckDB connection\'s authentication must be "test"']);
    expect(
      V1_checkCubeDirectConnection(
        changed(h2(), (copy) => {
          copy.authenticationStrategy = {
            _type: 'userNamePassword',
            userNameVaultReference: 'user',
            passwordVaultReference: 'password',
          };
        }),
      ),
    ).toEqual([
      'An H2 connection\'s authentication must be "h2Default" or "test"',
    ]);
  });

  test('Keeps an imported connection unchanged, setup SQL and store binding included', () => {
    const imported = changed(duckDb(), (copy) => {
      copy.element = 'cube::direct::Database';
      copy.sourceInformation = { startLine: 1 };
    });
    const before = JSON.stringify(imported);
    expect(V1_checkCubeDirectConnection(imported)).toEqual([]);
    expect(JSON.stringify(imported)).toBe(before);
  });
});

describe('What the page shows of a direct connection', () => {
  test('Summarizes a connection without its setup SQL', () => {
    expect(V1_summarizeCubeDirectConnection(h2())).toEqual({
      databaseType: CubeDirectDatabaseType.H2,
      datasourceKind: CubeConnectionDatasourceKind.LOCAL_H2,
      path: undefined,
      setupSqlCount: 2,
      authenticationKind: 'h2Default',
    });
    expect(V1_summarizeCubeDirectConnection(duckDb())).toMatchObject({
      datasourceKind: CubeConnectionDatasourceKind.DUCKDB_IN_MEMORY,
      path: undefined,
    });
    expect(
      V1_summarizeCubeDirectConnection(duckDb('/data/orders.duckdb')),
    ).toMatchObject({
      datasourceKind: CubeConnectionDatasourceKind.DUCKDB_FILE,
      path: '/data/orders.duckdb',
    });
    expect(
      JSON.stringify(V1_summarizeCubeDirectConnection(h2())),
    ).not.toContain('drop schema');
  });
});

describe('Comparing direct connections', () => {
  test('Ignores key order, the bound store and source positions', () => {
    const reordered = Object.fromEntries(Object.entries(h2()).reverse());
    const bound = changed(h2(), (copy) => {
      copy.element = 'cube::direct::Database';
      copy.elementSourceInformation = { startLine: 2 };
      datasourceOf(copy).sourceInformation = { startLine: 3 };
    });
    expect(V1_canonicalCubeDirectConnection(reordered)).toBe(
      V1_canonicalCubeDirectConnection(h2()),
    );
    expect(V1_canonicalCubeDirectConnection(bound)).toBe(
      V1_canonicalCubeDirectConnection(h2()),
    );
  });

  test('Tells apart connections that reach another database, or the same one another way', () => {
    const canonical = V1_canonicalCubeDirectConnection(h2());
    expect(
      V1_canonicalCubeDirectConnection(
        V1_buildCubeDirectConnection({
          databaseType: CubeDirectDatabaseType.H2,
          setupSqls: [...SETUP].reverse(),
        }),
      ),
    ).not.toBe(canonical);
    expect(
      V1_canonicalCubeDirectConnection(
        changed(h2(), (copy) => {
          copy.authenticationStrategy = { _type: 'test' };
        }),
      ),
    ).not.toBe(canonical);
  });
});
