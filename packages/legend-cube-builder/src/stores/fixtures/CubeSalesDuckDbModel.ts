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

import type { ModelContext } from '@finos/legend-cube';
import {
  CUBE_DIRECT_DATABASE_PATH,
  CUBE_DIRECT_RUNTIME_PATH,
  createCubeDirectModel,
} from '../../graph-manager/CubeDirectConnection.js';

// The Sales sample (the review of the demo, 2026-10-13): a small table on an
// in-memory DuckDB, which the engine builds from setup SQL on each
// connection, as the H2 samples are. The H2 samples can't run the engine's
// pivot(); this one can, so Pivot works on a sample out of the box. Its orders
// hold JSON documents as text, for Parse as JSON (PLAN §11.20). Its cubes are
// direct-connection cubes: the connection is their model.

/** The setup SQL that makes the table, one statement an entry */
export const CUBE_SALES_SETUP_SQLS: readonly string[] = Object.freeze([
  'drop schema if exists demo cascade',
  'create schema demo',
  'create table demo.sales (id INTEGER PRIMARY KEY, country VARCHAR(10), product VARCHAR(10), year INTEGER, amount INTEGER, price DOUBLE)',
  "insert into demo.sales values (1, 'France', 'Tea', 2022, 120, 2.5), (2, 'France', 'Coffee', 2023, 80, 3.1), (3, 'France', 'Tea', 2024, 150, 2.7), (4, 'Germany', 'Tea', 2022, 90, 2.4), (5, 'Germany', 'Coffee', 2022, 60, 3.0), (6, 'Germany', 'Coffee', 2024, 110, 3.3), (7, 'Japan', 'Tea', 2023, 200, 2.9), (8, 'Japan', 'Tea', 2024, 40, 2.9), (9, 'France', 'Coffee', 2024, 30, 3.2), (10, 'Spain', 'Coffee', 2022, 70, 3.0)",
  // orders as JSON documents in a text column (PLAN §11.20): Parse as JSON
  // reads them as a Variant column, which Explore JSON and Explode Array use
  'create table demo.orders (id INTEGER PRIMARY KEY, document VARCHAR)',
  `insert into demo.orders values (1, '{"customer":{"name":"Ann","tier":"gold","country":"France"},"items":[{"product":"Tea","qty":2,"price":2.5},{"product":"Coffee","qty":1,"price":3.1}],"paid":true,"placed":"2024-01-31","tags":["web","promo"]}'), (2, '{"customer":{"name":"Bob","tier":"silver","country":"Germany"},"items":[{"product":"Coffee","qty":3,"price":3.0}],"paid":false,"placed":"2024-02-02","tags":["store"]}'), (3, '{"customer":{"name":"Chloé","country":"France"},"items":[{"product":"Tea","qty":1,"price":2.7},{"product":"Tea","qty":4,"price":2.7},{"product":"Coffee","qty":1,"price":3.2}],"paid":true,"placed":"2024-02-14","tags":["web"]}'), (4, '{"customer":{"name":"Daichi","tier":"gold","country":"Japan"},"items":[{"product":"Tea","qty":5,"price":2.9}],"paid":true,"placed":"2024-03-01","tags":[]}'), (5, '{"customer":{"name":"Eva","tier":"bronze","country":"Spain"},"items":[],"paid":false,"placed":"2024-03-09","tags":["web","promo"]}'), (6, '{"customer":{"name":"Felix","tier":"silver","country":"Germany"},"items":[{"product":"Tea","qty":2,"price":2.4},{"product":"Coffee","qty":2,"price":3.3}],"paid":true,"placed":"2024-04-20","tags":["store","promo"]}'), (7, null), (8, '{"customer":{"name":"Gabi","tier":"gold","country":"Spain"},"items":[{"product":"Coffee","qty":1,"price":3.0}],"paid":true,"placed":"2024-05-05","tags":["web"]}')`,
]);

/** The model of a Sales cube: an in-memory DuckDB connection with its setup SQL */
export const CUBE_SALES_MODEL: ModelContext = createCubeDirectModel({
  _type: 'RelationalDatabaseConnection',
  type: 'DuckDB',
  databaseType: 'DuckDB',
  datasourceSpecification: {
    _type: 'duckDB',
    path: '',
    testDataSetupSqls: [...CUBE_SALES_SETUP_SQLS],
  },
  authenticationStrategy: { _type: 'test' },
});
export const CUBE_SALES_RUNTIME = CUBE_DIRECT_RUNTIME_PATH;
export const CUBE_SALES_DATABASE = CUBE_DIRECT_DATABASE_PATH;
/** As a direct connection's coordinates store a name: quoted */
export const CUBE_SALES_SCHEMA = '"demo"';
export const CUBE_SALES_TABLE = '"sales"';
export const CUBE_SALES_ORDERS_TABLE = '"orders"';
