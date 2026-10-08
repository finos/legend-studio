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

import type { PlainObject } from '@finos/legend-shared';
import {
  CubeConnectionDatasourceKind,
  CubeDirectDatabaseType,
  type CubeConnectionDraft,
  type CubeConnectionSummary,
} from '../../../CubeConnectionExplorer.js';

// A direct connection's protocol JSON (PLAN §6.8), read and written as plain
// JSON. legend-graph's connection serializers are not used: they drop a DuckDB
// connection's setup SQL and an H2 one's identifier setting, and a saved
// connection must reach the engine exactly as it was saved. A connection is
// checked against what Cube supports, and anything else is refused, never
// dropped, since an imported cube is saved again unchanged

const CONNECTION_TYPE = 'RelationalDatabaseConnection';
const H2_DATASOURCE_TYPE = 'h2Local';
const DUCKDB_DATASOURCE_TYPE = 'duckDB';
const H2_DEFAULT_AUTHENTICATION_TYPE = 'h2Default';
const TEST_AUTHENTICATION_TYPE = 'test';

/** Where the engine records source positions: kept, and ignored when comparing */
const SOURCE_INFORMATION_KEYS = [
  'sourceInformation',
  'elementSourceInformation',
];
/** The store the connection is bound to: set only in the model built for each call */
const ELEMENT_KEY = 'element';

/** The authentication strategies, as the engine names them, each database allows */
const AUTHENTICATION_TYPES: Record<CubeDirectDatabaseType, readonly string[]> =
  {
    [CubeDirectDatabaseType.H2]: [
      H2_DEFAULT_AUTHENTICATION_TYPE,
      TEST_AUTHENTICATION_TYPE,
    ],
    [CubeDirectDatabaseType.DUCKDB]: [TEST_AUTHENTICATION_TYPE],
  };

const isEmptyList = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  (Array.isArray(value) && value.length === 0);

/**
 * Connection settings Cube doesn't support yet, accepted only at the engine's
 * default value: each changes how a query runs, in ways Cube doesn't show
 */
const UNSUPPORTED_SETTINGS: Record<string, (value: unknown) => boolean> = {
  localMode: (value) =>
    value === undefined || value === null || value === false,
  quoteIdentifiers: (value) =>
    value === undefined || value === null || value === false,
  timeZone: (value) => value === undefined || value === null,
  queryTimeOutInSeconds: (value) => value === undefined || value === null,
  queryGenerationConfigs: (value) => isEmptyList(value),
  // a schema mapper ran a query on another schema with no error
  postProcessors: (value) => isEmptyList(value),
  postProcessorWithParameter: (value) => isEmptyList(value),
};

const isObject = (value: unknown): value is PlainObject =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isDatabaseType = (value: unknown): value is CubeDirectDatabaseType =>
  Object.values(CubeDirectDatabaseType).includes(
    value as CubeDirectDatabaseType,
  );

const isStatementList = (value: unknown): value is string[] =>
  Array.isArray(value) &&
  value.every((statement) => typeof statement === 'string');

/** The keys of an object that are neither expected nor source information */
const unexpectedKeys = (
  object: PlainObject,
  expected: readonly string[],
): string[] =>
  Object.keys(object).filter(
    (key) => !expected.includes(key) && !SOURCE_INFORMATION_KEYS.includes(key),
  );

const checkDatasource = (
  databaseType: CubeDirectDatabaseType,
  datasource: PlainObject,
): string[] => {
  const problems: string[] = [];
  // a CSV setup is the engine's own SQL generation, which lost rows in tests
  if (
    datasource.testDataSetupCsv !== undefined &&
    datasource.testDataSetupCsv !== null &&
    datasource.testDataSetupCsv !== ''
  ) {
    problems.push(
      "The connection sets up its data from CSV, which Cube doesn't support: use setup SQL statements",
    );
  }
  if (databaseType === CubeDirectDatabaseType.H2) {
    if (datasource._type !== H2_DATASOURCE_TYPE) {
      problems.push(
        'An H2 connection must use a local H2 database, created by its setup SQL',
      );
      return problems;
    }
    if (
      datasource.disableDatabaseToUpper !== undefined &&
      datasource.disableDatabaseToUpper !== null &&
      datasource.disableDatabaseToUpper !== false
    ) {
      problems.push(
        "The connection keeps H2 from upper-casing names, which Cube doesn't support",
      );
    }
    if (
      !isStatementList(datasource.testDataSetupSqls) ||
      datasource.testDataSetupSqls.length === 0
    ) {
      // without setup SQL the engine connects to an H2 server that isn't there
      problems.push('An H2 connection needs at least one setup SQL statement');
    }
    unexpectedKeys(datasource, [
      '_type',
      'testDataSetupSqls',
      'testDataSetupCsv',
      'disableDatabaseToUpper',
    ]).forEach((key) =>
      problems.push(
        `The connection's database has a property Cube doesn't know: "${key}"`,
      ),
    );
  } else {
    if (datasource._type !== DUCKDB_DATASOURCE_TYPE) {
      problems.push(
        'A DuckDB connection must name a DuckDB database file, or none for an in-memory database',
      );
      return problems;
    }
    if (typeof datasource.path !== 'string') {
      problems.push(
        'A DuckDB connection must name a database file, or none for an in-memory database',
      );
    }
    if (
      datasource.testDataSetupSqls !== undefined &&
      !isStatementList(datasource.testDataSetupSqls)
    ) {
      problems.push("The connection's setup SQL must be a list of statements");
    }
    unexpectedKeys(datasource, [
      '_type',
      'path',
      'testDataSetupSqls',
      'testDataSetupCsv',
    ]).forEach((key) =>
      problems.push(
        `The connection's database has a property Cube doesn't know: "${key}"`,
      ),
    );
  }
  return problems;
};

const checkAuthentication = (
  databaseType: CubeDirectDatabaseType,
  authentication: PlainObject,
): string[] => {
  const allowed = AUTHENTICATION_TYPES[databaseType];
  if (!allowed.includes(authentication._type as string)) {
    return [
      `${databaseType === CubeDirectDatabaseType.H2 ? 'An' : 'A'} ${databaseType} connection's authentication must be ${allowed
        .map((type) => `"${type}"`)
        .join(' or ')}`,
    ];
  }
  // these strategies take no settings, so no secret can be saved with them
  return unexpectedKeys(authentication, ['_type']).map(
    (key) =>
      `The connection's authentication has a property Cube doesn't know: "${key}"`,
  );
};

/**
 * What keeps Cube from using a connection, in words a user can act on: none
 * when the connection is one Cube supports. Values are never repeated, only
 * the names of properties, since a property Cube doesn't know could hold a
 * secret
 */
export const V1_checkCubeDirectConnection = (
  connection: unknown,
): readonly string[] => {
  if (!isObject(connection) || connection._type !== CONNECTION_TYPE) {
    return ['The connection is not a relational database connection'];
  }
  const { type, databaseType } = connection;
  if (!isDatabaseType(databaseType)) {
    return [
      `Cube connects to H2 and DuckDB databases only, not to "${String(databaseType)}"`,
    ];
  }
  const problems: string[] = [];
  if (type !== databaseType) {
    problems.push(
      "The connection's type and database type must be the same database",
    );
  }
  Object.entries(UNSUPPORTED_SETTINGS).forEach(([key, isDefault]) => {
    if (!isDefault(connection[key])) {
      problems.push(`The connection sets "${key}", which Cube doesn't support`);
    }
  });
  unexpectedKeys(connection, [
    '_type',
    'type',
    'databaseType',
    'datasourceSpecification',
    'authenticationStrategy',
    ELEMENT_KEY,
    ...Object.keys(UNSUPPORTED_SETTINGS),
  ]).forEach((key) =>
    problems.push(`The connection has a property Cube doesn't know: "${key}"`),
  );
  if (isObject(connection.datasourceSpecification)) {
    problems.push(
      ...checkDatasource(databaseType, connection.datasourceSpecification),
    );
  } else {
    problems.push("The connection doesn't say how to reach its database");
  }
  if (isObject(connection.authenticationStrategy)) {
    problems.push(
      ...checkAuthentication(databaseType, connection.authenticationStrategy),
    );
  } else {
    problems.push("The connection doesn't say how to authenticate");
  }
  return problems;
};

/**
 * The connection the form describes, as the engine reads it. It names no
 * store: each call binds it to the Database built for that call
 */
export const V1_buildCubeDirectConnection = (
  draft: CubeConnectionDraft,
): PlainObject => {
  const setupSqls = [...draft.setupSqls];
  return draft.databaseType === CubeDirectDatabaseType.H2
    ? {
        _type: CONNECTION_TYPE,
        type: CubeDirectDatabaseType.H2,
        databaseType: CubeDirectDatabaseType.H2,
        datasourceSpecification: {
          _type: H2_DATASOURCE_TYPE,
          testDataSetupSqls: setupSqls,
        },
        authenticationStrategy: { _type: H2_DEFAULT_AUTHENTICATION_TYPE },
      }
    : {
        _type: CONNECTION_TYPE,
        type: CubeDirectDatabaseType.DUCKDB,
        databaseType: CubeDirectDatabaseType.DUCKDB,
        datasourceSpecification: {
          _type: DUCKDB_DATASOURCE_TYPE,
          path: draft.path ?? '',
          ...(setupSqls.length ? { testDataSetupSqls: setupSqls } : {}),
        },
        authenticationStrategy: { _type: TEST_AUTHENTICATION_TYPE },
      };
};

/**
 * What the page shows of a connection Cube supports (see
 * `V1_checkCubeDirectConnection`): never its setup SQL
 */
export const V1_summarizeCubeDirectConnection = (
  connection: PlainObject,
): CubeConnectionSummary => {
  const databaseType = connection.databaseType as CubeDirectDatabaseType;
  const datasource = connection.datasourceSpecification as PlainObject;
  const authentication = connection.authenticationStrategy as PlainObject;
  const path = typeof datasource.path === 'string' ? datasource.path : '';
  const setupSqls = datasource.testDataSetupSqls;
  return {
    databaseType,
    datasourceKind:
      databaseType === CubeDirectDatabaseType.H2
        ? CubeConnectionDatasourceKind.LOCAL_H2
        : path
          ? CubeConnectionDatasourceKind.DUCKDB_FILE
          : CubeConnectionDatasourceKind.DUCKDB_IN_MEMORY,
    path:
      databaseType === CubeDirectDatabaseType.DUCKDB && path ? path : undefined,
    setupSqlCount: Array.isArray(setupSqls) ? setupSqls.length : 0,
    authenticationKind: String(authentication._type),
  };
};

const canonicalValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(canonicalValue);
  }
  if (isObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .filter(
          (key) =>
            key !== ELEMENT_KEY && !SOURCE_INFORMATION_KEYS.includes(key),
        )
        .sort()
        .map((key) => [key, canonicalValue(value[key])]),
    );
  }
  return value;
};

/**
 * A connection as text that two connections share exactly when they reach the
 * same database the same way: key order, the bound store and source
 * positions don't count. Used to compare connections and to key caches
 */
export const V1_canonicalCubeDirectConnection = (
  connection: PlainObject,
): string => JSON.stringify(canonicalValue(connection));
