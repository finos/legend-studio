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
import type { CubeTableFlag } from './CubeEngine.js';

// Direct connections (PLAN §6.8), in Cube's own terms: what the connection
// form gives, what the page shows of a saved connection, and what reading its
// database finds. The connection itself stays opaque JSON outside
// `protocol/pure/v1/`, which alone reads it

/** The databases a direct connection can reach this round */
export enum CubeDirectDatabaseType {
  H2 = 'H2',
  DUCKDB = 'DuckDB',
}

/** What the connection form gives, before it becomes a connection */
export interface CubeConnectionDraft {
  databaseType: CubeDirectDatabaseType;
  /** Statements the engine runs on each connection, e.g. to create test tables */
  setupSqls: readonly string[];
  /** DuckDB only: a database file on the engine's host, or '' for an in-memory database */
  path?: string | undefined;
}

/** How a database is reached, as the page shows it */
export enum CubeConnectionDatasourceKind {
  /** An H2 database the engine creates in its own H2 server */
  LOCAL_H2 = 'LOCAL_H2',
  DUCKDB_IN_MEMORY = 'DUCKDB_IN_MEMORY',
  DUCKDB_FILE = 'DUCKDB_FILE',
}

/** What the page shows of a saved connection: never its setup SQL */
export interface CubeConnectionSummary {
  databaseType: CubeDirectDatabaseType;
  datasourceKind: CubeConnectionDatasourceKind;
  /** The DuckDB file, for a DuckDB file database */
  path?: string | undefined;
  setupSqlCount: number;
  /** The authentication strategy, as the engine names it */
  authenticationKind: string;
}

/** A table read from a connection's database, for the picker */
export interface CubeExploredTable {
  /** As the database stores it, e.g. `ORDER.LINES` */
  name: string;
  /** As a table's coordinates store it: always quoted, e.g. `"ORDER.LINES"` */
  storedName: string;
  /** The columns Cube can use */
  columnCount: number;
  /** The columns left out because the engine can't type them; Cube shows how many */
  hiddenColumnCount: number;
  flags: readonly CubeTableFlag[];
}

/**
 * A direct connection as a cube saves it: protocol JSON, which only the
 * engine's implementation reads
 */
export type CubeDirectConnection = PlainObject;

/** What the page knows of a connection without calling the engine */
export type CubeConnectionDescription =
  | { supported: true; summary: CubeConnectionSummary }
  /** Why Cube can't use the connection, in words a user can act on */
  | { supported: false; problems: readonly string[] };

/**
 * Reading a direct connection's database (PLAN §6.8), for the picker: its own
 * port, beside the `CubeEngine`, so hosts without direct connections need
 * neither. Calls fail with a `CubeEngineError`, with no node
 */
export interface CubeConnectionExplorer {
  /** The connection the connection form describes */
  buildConnection(draft: CubeConnectionDraft): CubeDirectConnection;

  /** Whether Cube can use a connection, and what the page shows of it: no engine call */
  describeConnection(
    connection: CubeDirectConnection,
  ): CubeConnectionDescription;

  /** The schemas of the connection's database, without the database's own; tests the connection */
  listSchemas(connection: CubeDirectConnection): Promise<readonly string[]>;

  /** A schema's tables and views, with how many columns Cube can use and hides */
  listTables(
    connection: CubeDirectConnection,
    schema: string,
  ): Promise<readonly CubeExploredTable[]>;
}
