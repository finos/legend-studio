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
import type {
  CubeDirectConnection,
  CubeExploredTable,
} from './CubeConnectionExplorer.js';

// A direct-connection cube (PLAN §6.8) saves its connection once, as its
// model, and its tables stay ordinary relational sources of one generated
// Database. The engine's implementation builds that Database, its connection
// and its runtime for each call, from the tables the call needs; their paths
// are fixed, so saved tables and the saved runtime always name them

/** The kind of a direct-connection cube's model: Cube's own, never an engine model kind */
export const CUBE_DIRECT_MODEL_TYPE = 'cubeDirectConnection';

/** The Database every table of a direct-connection cube belongs to */
export const CUBE_DIRECT_DATABASE_PATH = 'cube::direct::Database';
export const CUBE_DIRECT_CONNECTION_PATH = 'cube::direct::Connection';
/** The runtime a direct-connection cube runs with */
export const CUBE_DIRECT_RUNTIME_PATH = 'cube::direct::Runtime';

/** The model of a direct-connection cube */
export const createCubeDirectModel = (
  connection: CubeDirectConnection,
): ModelContext =>
  // the connection is protocol JSON, so plain JSON
  ({ _type: CUBE_DIRECT_MODEL_TYPE, connection }) as unknown as ModelContext;

/** The connection of a direct-connection cube's model; undefined for any other model */
export const getCubeDirectConnection = (
  model: ModelContext,
): CubeDirectConnection | undefined =>
  model._type === CUBE_DIRECT_MODEL_TYPE &&
  model.connection &&
  typeof model.connection === 'object' &&
  !Array.isArray(model.connection)
    ? (model.connection as CubeDirectConnection)
    : undefined;

/**
 * The coordinates of a table read from the connection's database, every name
 * quoted as the built Database stores it
 */
export const getCubeDirectTableCoordinates = (
  schema: string,
  table: CubeExploredTable,
): { database: string; schema: string; table: string } => ({
  database: CUBE_DIRECT_DATABASE_PATH,
  schema: `"${schema}"`,
  table: table.storedName,
});
