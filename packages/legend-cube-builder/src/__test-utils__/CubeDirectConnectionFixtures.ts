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

// Connections to small, self-contained test databases, as the protocol JSON a
// direct-connection cube saves (PLAN §6.8). Each setup first drops what it
// creates, because the engine keeps an H2 server and a DuckDB connection
// between calls, and uses its own schema, so tests can share an engine

export const DIRECT_H2_SCHEMA = 'CUBE_DIRECT';
export const DIRECT_DUCKDB_SCHEMA = 'cube_direct';

/** An H2 database the engine creates in its own H2 server */
export const DIRECT_H2_CONNECTION: PlainObject = {
  _type: 'RelationalDatabaseConnection',
  type: 'H2',
  databaseType: 'H2',
  datasourceSpecification: {
    _type: 'h2Local',
    testDataSetupSqls: [
      `drop schema if exists ${DIRECT_H2_SCHEMA} cascade`,
      `create schema ${DIRECT_H2_SCHEMA}`,
      `create table ${DIRECT_H2_SCHEMA}.ORDERS (ORDER_ID INT PRIMARY KEY, CUSTOMER_ID VARCHAR(5) NOT NULL, AMOUNT DECIMAL(10,2))`,
      `insert into ${DIRECT_H2_SCHEMA}.ORDERS values (1, 'ALFKI', 12.34), (2, 'ANATR', 5.00)`,
    ],
  },
  authenticationStrategy: { _type: 'h2Default' },
};

/** An in-memory DuckDB database (an empty path), so no file is read or written */
export const DIRECT_DUCKDB_CONNECTION: PlainObject = {
  _type: 'RelationalDatabaseConnection',
  type: 'DuckDB',
  databaseType: 'DuckDB',
  datasourceSpecification: {
    _type: 'duckDB',
    path: '',
    testDataSetupSqls: [
      `drop schema if exists ${DIRECT_DUCKDB_SCHEMA} cascade`,
      `create schema ${DIRECT_DUCKDB_SCHEMA}`,
      `create table ${DIRECT_DUCKDB_SCHEMA}.orders (order_id INTEGER PRIMARY KEY, customer_id VARCHAR(5) NOT NULL, amount DECIMAL(10,2))`,
      `insert into ${DIRECT_DUCKDB_SCHEMA}.orders values (1, 'ALFKI', 12.34), (2, 'ANATR', 5.00)`,
    ],
  },
  authenticationStrategy: { _type: 'test' },
};
