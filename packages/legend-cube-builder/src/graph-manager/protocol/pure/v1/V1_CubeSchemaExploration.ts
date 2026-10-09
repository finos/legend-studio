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
  CubeDirectDatabaseType,
  type CubeExploredTable,
} from '../../../CubeConnectionExplorer.js';
import {
  CubeEngineError,
  type CubeEngineErrorKind,
  CubeTableFlag,
  type NodeId,
} from '../../../CubeEngine.js';
import { V1_toCubeEngineError } from './V1_CubeEngineErrors.js';

// Reading a direct connection's database through the engine's schema
// exploration (PLAN §6.8), the call Studio's database builder makes. The
// request is plain JSON, so the connection reaches the engine as saved; the
// answer is a model holding one Database, which needs cleaning before Cube
// can use it (local evidence `sources-v2/db-direct.md`):
// - the engine quotes only names with a space or a colon, so a dotted or a
//   mixed-case name breaks the Pure text or the SQL: every name is quoted;
// - patterns are SQL LIKE patterns, which H2 upper-cases (a mixed-case name
//   needs '%') and where `_` matches any character: only exact names are kept;
// - columns the engine can't type come back as `Other`, and some of them
//   (TIME, CLOB) break the result's JSON: they are left out, and counted

/** What one exploration asks for; names are as the database stores them */
export type V1_CubeExplorationScope =
  /** The schema names, to test a connection */
  | { kind: 'schemas' }
  /** A schema's tables and their columns, for the picker */
  | { kind: 'tables'; schema: string }
  /** Some tables in full, to build the model a query runs on */
  | { kind: 'columns'; tables: readonly V1_CubeExploredTablePath[] };

/** A table's schema and table names, as the database stores them */
export type V1_CubeExploredTablePath = readonly [schema: string, table: string];

/** Where the engine puts the Database it builds */
export interface V1_CubeExploredDatabasePath {
  package: string;
  name: string;
}

const ANY = '%';
/** Table functions are never read; this pattern only fills the request */
const FUNCTION_PATTERN = '_%';
const OTHER_TYPE = 'Other';
const CHAR_TYPE = 'Char';
/** Schemas of the database itself, matched in any case */
const SYSTEM_SCHEMAS = ['information_schema', 'pg_catalog'];

const asObject = (value: unknown): PlainObject =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as PlainObject)
    : {};

const asList = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const asString = (value: unknown): string =>
  typeof value === 'string' ? value : '';

/** A name as the database stores it: the engine quotes some names, and Cube all of them */
export const V1_unquoteCubeName = (name: string): string =>
  name.length >= 2 && name.startsWith('"') && name.endsWith('"')
    ? name.slice(1, -1)
    : name;

/** A name as a Database stores it; Pure can't quote a name holding a quote */
export const V1_quoteCubeName = (name: string): string => `"${name}"`;

/**
 * A name as the database stores it, from the engine's answer: the engine
 * quotes only a name holding a space or a colon (SchemaExportation's
 * escapeString), so other quotes are the name's own
 */
const readEngineName = (name: string): string =>
  name.length >= 2 &&
  name.startsWith('"') &&
  name.endsWith('"') &&
  /[ :]/u.test(name.slice(1, -1))
    ? name.slice(1, -1)
    : name;

/**
 * A name Cube can use: Pure can't write one holding a double quote, and the
 * engine reads a backslash in a name as its pattern escape
 */
const isWritable = (name: string): boolean =>
  !name.includes('"') && !name.includes('\\');

const isSystemSchema = (name: string): boolean =>
  SYSTEM_SCHEMAS.includes(name.toLowerCase());

/**
 * The pattern that finds a name. H2 upper-cases a pattern, so a name that
 * isn't all upper case is found through '%' and picked out by Cube; DuckDB
 * matches the name as it is (local evidence `sources-v2/db-direct/`)
 */
const patternFor = (
  databaseType: CubeDirectDatabaseType,
  name: string,
): string =>
  databaseType === CubeDirectDatabaseType.H2 && name !== name.toUpperCase()
    ? ANY
    : name;

/** The request that reads part of a connection's database */
export const V1_buildCubeSchemaExplorationInput = (
  connection: PlainObject,
  databaseType: CubeDirectDatabaseType,
  database: V1_CubeExploredDatabasePath,
  scope: V1_CubeExplorationScope,
): PlainObject => {
  const pattern = (schema: string, table: string): PlainObject => ({
    schemaPattern: schema,
    tablePattern: table,
    functionPattern: FUNCTION_PATTERN,
  });
  const config =
    scope.kind === 'schemas'
      ? {
          enrichTables: false,
          enrichColumns: false,
          enrichPrimaryKeys: false,
          patterns: [pattern(ANY, ANY)],
        }
      : scope.kind === 'tables'
        ? {
            enrichTables: true,
            enrichColumns: true,
            enrichPrimaryKeys: false,
            patterns: [pattern(patternFor(databaseType, scope.schema), ANY)],
          }
        : {
            enrichTables: true,
            enrichColumns: true,
            enrichPrimaryKeys: true,
            patterns: scope.tables.map(([schema, table]) =>
              pattern(
                patternFor(databaseType, schema),
                patternFor(databaseType, table),
              ),
            ),
          };
  return {
    connection,
    targetDatabase: { package: database.package, name: database.name },
    config: { ...config, enrichTableFunctions: false },
  };
};

/** The schemas of the one Database the engine returns */
const schemasOf = (response: unknown): PlainObject[] =>
  asList(asObject(asList(asObject(response).elements)[0]).schemas).map(
    asObject,
  );

/** The tables of a schema, by name as the database stores them */
const tablesOf = (schema: PlainObject): Map<string, PlainObject> =>
  new Map(
    asList(schema.tables)
      .map(asObject)
      .map((table) => [readEngineName(asString(table.name)), table]),
  );

/** A schema of the answer, by name as the database stores it */
const findSchema = (response: unknown, name: string): PlainObject | undefined =>
  schemasOf(response).find(
    (schema) => readEngineName(asString(schema.name)) === name,
  );

const isHidden = (column: PlainObject): boolean =>
  asString(asObject(column.type)._type) === OTHER_TYPE ||
  !isWritable(readEngineName(asString(column.name)));

const describeTable = (name: string, table: PlainObject): CubeExploredTable => {
  const columns = asList(table.columns).map(asObject);
  const kept = columns.filter((column) => !isHidden(column));
  return {
    name,
    storedName: V1_quoteCubeName(name),
    columnCount: kept.length,
    hiddenColumnCount: columns.length - kept.length,
    // the engine types a CHAR(n) column with a length of 1
    flags: kept.some(
      (column) => asString(asObject(column.type)._type) === CHAR_TYPE,
    )
      ? [CubeTableFlag.LENGTH_UNKNOWN]
      : [],
  };
};

/** The schema names a connection's database holds, for the picker */
export const V1_readExploredSchemaNames = (
  response: unknown,
): readonly string[] =>
  schemasOf(response)
    .map((schema) => readEngineName(asString(schema.name)))
    .filter((name) => isWritable(name) && !isSystemSchema(name));

/** A schema's tables, for the picker; views are offered as tables */
export const V1_readExploredTables = (
  response: unknown,
  schema: string,
): readonly CubeExploredTable[] => {
  const found = findSchema(response, schema);
  return found
    ? Array.from(tablesOf(found).entries())
        .filter(([name]) => isWritable(name))
        .map(([name, table]) => describeTable(name, table))
    : [];
};

/** A table of the Database Cube builds: every name quoted, usable columns only */
const buildTable = (name: string, table: PlainObject): PlainObject => {
  const columns = asList(table.columns)
    .map(asObject)
    .filter((column) => !isHidden(column));
  const columnNames = new Set(
    columns.map((column) => readEngineName(asString(column.name))),
  );
  return {
    ...table,
    name: V1_quoteCubeName(name),
    columns: columns.map((column) => ({
      ...column,
      name: V1_quoteCubeName(readEngineName(asString(column.name))),
    })),
    primaryKey: asList(table.primaryKey)
      .map((key) => readEngineName(asString(key)))
      .filter((key) => columnNames.has(key))
      .map(V1_quoteCubeName),
  };
};

/**
 * The Database a query runs on, holding exactly the tables asked for that the
 * database has, and the tables it doesn't have: an answer without a table
 * never stands for an empty one
 */
export const V1_buildExploredDatabase = (
  response: unknown,
  tables: readonly V1_CubeExploredTablePath[],
): {
  database: PlainObject;
  tables: readonly CubeExploredTable[];
  missing: readonly V1_CubeExploredTablePath[];
} => {
  const element = asObject(asList(asObject(response).elements)[0]);
  const schemas = new Map<string, PlainObject[]>();
  const explored: CubeExploredTable[] = [];
  const missing: V1_CubeExploredTablePath[] = [];
  tables.forEach(([schemaName, tableName]) => {
    const schema = findSchema(response, schemaName);
    const table = schema ? tablesOf(schema).get(tableName) : undefined;
    if (!table || !isWritable(schemaName) || !isWritable(tableName)) {
      missing.push([schemaName, tableName]);
      return;
    }
    const built = schemas.get(schemaName) ?? [];
    if (
      !built.some((existing) => existing.name === V1_quoteCubeName(tableName))
    ) {
      built.push(buildTable(tableName, table));
      explored.push(describeTable(tableName, table));
    }
    schemas.set(schemaName, built);
  });
  return {
    database: {
      ...element,
      schemas: Array.from(schemas.entries()).map(([name, builtTables]) => ({
        name: V1_quoteCubeName(name),
        tables: builtTables,
        views: [],
        tabularFunctions: [],
      })),
    },
    tables: explored,
    missing,
  };
};

/**
 * What a failed exploration's engine message means, for the errors whose
 * message alone says little (a bare `NullPointerException: `, a Java class
 * name): matched on the message's first line
 */
const EXPLORATION_FAILURES: readonly [RegExp, string][] = [
  [
    /InvalidTypeIdException/u,
    "The engine doesn't know this kind of connection or authentication",
  ],
  [
    /UnrecognizedPropertyException/u,
    "The engine doesn't recognize a property of the connection",
  ],
  [
    /NullPointerException/u,
    "The engine couldn't open the connection: its authentication may be missing or unresolved",
  ],
  [
    /ConnectException|Connection refused/u,
    "The engine couldn't reach the database",
  ],
  [
    /Maximum number of tables/u,
    'The database has too many tables to read at once',
  ],
  [
    /must not end with escape character|LIKE ESCAPE/u,
    "A schema or table name ends with a backslash, which Cube can't read",
  ],
  [
    /SQLException|SQL statement|Parser Error/u,
    "The database refused a statement: check the connection's setup SQL",
  ],
];

/**
 * The error of a failed exploration: the engine's message, led by what it
 * means when the message alone says little. A network failure stays one
 */
export const V1_toCubeExplorationError = (
  error: unknown,
  kind: CubeEngineErrorKind,
  nodeId?: NodeId,
): CubeEngineError => {
  const engineError = V1_toCubeEngineError(error, nodeId, kind);
  if (engineError.kind !== kind) {
    return engineError;
  }
  const meaning = EXPLORATION_FAILURES.find(([pattern]) =>
    pattern.test(engineError.firstLine),
  )?.[1];
  return meaning
    ? new CubeEngineError(
        kind,
        `${meaning}\n${engineError.detail}`,
        engineError.nodeId,
        engineError.role,
      )
    : engineError;
};
