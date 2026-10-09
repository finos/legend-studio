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

import {
  CubeConnectionDatasourceKind,
  type CubeConnectionSummary,
} from '../graph-manager/CubeConnectionExplorer.js';

// The text of the source picker's database connection tab (PLAN §6.8)

/**
 * The setup SQL the H2 form starts with (D5): a small sample database that
 * first drops what it creates, since setup SQL runs on every connection
 */
export const CUBE_DIRECT_SAMPLE_SETUP_SQL = [
  'drop schema if exists CUBE_SAMPLE cascade;',
  'create schema CUBE_SAMPLE;',
  'create table CUBE_SAMPLE.CUSTOMERS (CUSTOMER_ID VARCHAR(5) PRIMARY KEY, COMPANY_NAME VARCHAR(40) NOT NULL, COUNTRY VARCHAR(15));',
  "insert into CUBE_SAMPLE.CUSTOMERS values ('ALFKI', 'Alfreds Futterkiste', 'Germany'), ('ANATR', 'Ana Trujillo Emparedados', 'Mexico'), ('BONAP', 'Bon app''', 'France');",
  'create table CUBE_SAMPLE.ORDERS (ORDER_ID INT PRIMARY KEY, CUSTOMER_ID VARCHAR(5) NOT NULL, ORDER_DATE DATE, AMOUNT DECIMAL(10,2));',
  "insert into CUBE_SAMPLE.ORDERS values (10248, 'ALFKI', '1997-07-04', 32.38), (10249, 'ANATR', '1997-07-05', 11.61), (10250, 'BONAP', '1997-07-08', 65.83), (10251, 'ALFKI', '1997-07-08', 41.34);",
].join('\n');

/** Pending labels: lower-case gerunds, shown as they are (spec §17.13) */
export enum CUBE_DIRECT_PENDING_LABEL {
  TESTING_CONNECTION = 'testing connection',
  LISTING_TABLES = 'listing tables',
}

export const CUBE_DIRECT_MESSAGE = {
  H2_NEEDS_SETUP_SQL:
    'An H2 connection needs setup SQL: the engine creates the database from it',
  CUBE_CHANGED:
    'The cube changed while the table was loading; pick the table again.',
  NO_SCHEMA_FOUND: 'The database has no schema Cube can read',
  NO_TABLE_SCHEMA: 'The engine gave no schema for this table',
} as const;

const formatCount = (value: number): string => value.toLocaleString('en-US');

/** The text of loading a CSV into an in-memory DuckDB connection */
export const CUBE_CSV_MESSAGE = {
  EMPTY: 'The CSV is empty: its first row must name the columns',
  UNCLOSED_QUOTE: (line: number): string =>
    `The quoted value that starts on line ${line} is never closed`,
  RAGGED_ROW: (row: number, values: number, columns: number): string =>
    `Row ${formatCount(row)} has ${formatCount(values)} ${values === 1 ? 'value' : 'values'}, but the header names ${formatCount(columns)} ${columns === 1 ? 'column' : 'columns'}`,
  TOO_MANY_ROWS: (rows: number, max: number): string =>
    `The CSV has ${formatCount(rows)} rows; Cube loads at most ${formatCount(max)}, since the cube saves them and every run loads them again`,
  TOO_LONG: (max: number): string =>
    `The CSV is too long: Cube loads at most ${formatCount(max)} characters`,
  ADDED: (table: string, rows: number, columns: number): string =>
    `Added table ${table}: ${formatCount(rows)} ${rows === 1 ? 'row' : 'rows'}, ${formatCount(columns)} ${columns === 1 ? 'column' : 'columns'}. Test the connection to list it.`,
  UNREADABLE_FILE: (name: string): string =>
    `Cube couldn't read the file ${name}`,
} as const;

export const CUBE_CSV_HELP_TEXT =
  "Paste a CSV, or choose a file, with a header row. Cube adds it to the setup SQL as a table of the csv schema, guessing each column's type from its values; edit the SQL to change them. Up to 10,000 rows: the cube saves them.";

export const CUBE_DIRECT_HELP_TEXT = {
  SETUP_SQL:
    "The engine runs these statements on every connection, so they should first drop what they create. A statement ends with a line ending in ';'. A statement that returns rows, such as a select, fails.",
  DUCKDB_PATH:
    "A DuckDB file on the engine's host; leave it empty for an in-memory database.",
  FIXED_CONNECTION:
    "All of the cube's tables come from this connection: to use another one, remove every node from the cube first.",
} as const;

export const CUBE_DIRECT_DATASOURCE_LABELS: Readonly<
  Record<CubeConnectionDatasourceKind, string>
> = {
  [CubeConnectionDatasourceKind.LOCAL_H2]:
    "an H2 database in the engine's H2 server",
  [CubeConnectionDatasourceKind.DUCKDB_IN_MEMORY]:
    'an in-memory DuckDB database',
  [CubeConnectionDatasourceKind.DUCKDB_FILE]: 'a DuckDB file',
};

/** How many of a table's columns Cube leaves out, or nothing when it keeps them all */
export const getHiddenColumnsLabel = (count: number): string | undefined =>
  count === 0
    ? undefined
    : `${count} ${count === 1 ? 'column' : 'columns'} hidden`;

/** What the page shows of a saved connection: never its setup SQL */
export const getCubeConnectionSummaryLabel = (
  summary: CubeConnectionSummary,
): string =>
  [
    `${summary.databaseType}: ${CUBE_DIRECT_DATASOURCE_LABELS[summary.datasourceKind]}${summary.path ? ` (${summary.path})` : ''}`,
    `${summary.setupSqlCount} setup ${summary.setupSqlCount === 1 ? 'statement' : 'statements'}`,
    `authentication ${summary.authenticationKind}`,
  ].join(', ');

/** A direct connection shown where Cube can't describe it, e.g. on a host without an explorer */
export const CUBE_DIRECT_CONNECTION_FALLBACK_LABEL =
  'A direct database connection';
