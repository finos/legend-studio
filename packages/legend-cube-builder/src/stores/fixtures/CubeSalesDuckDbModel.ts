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
// pivot(); this one can, so Pivot works on a sample out of the box. Its cubes
// are direct-connection cubes: the connection is their model.

/** The setup SQL that makes the table, one statement an entry */
export const CUBE_SALES_SETUP_SQLS: readonly string[] = Object.freeze([
  'drop schema if exists demo cascade',
  'create schema demo',
  'create table demo.sales (id INTEGER PRIMARY KEY, country VARCHAR(10), product VARCHAR(10), year INTEGER, amount INTEGER, price DOUBLE)',
  "insert into demo.sales values (1, 'France', 'Tea', 2022, 120, 2.5), (2, 'France', 'Coffee', 2023, 80, 3.1), (3, 'France', 'Tea', 2024, 150, 2.7), (4, 'Germany', 'Tea', 2022, 90, 2.4), (5, 'Germany', 'Coffee', 2022, 60, 3.0), (6, 'Germany', 'Coffee', 2024, 110, 3.3), (7, 'Japan', 'Tea', 2023, 200, 2.9), (8, 'Japan', 'Tea', 2024, 40, 2.9), (9, 'France', 'Coffee', 2024, 30, 3.2), (10, 'Spain', 'Coffee', 2022, 70, 3.0)",
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
