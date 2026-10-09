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

import type { IR } from '@finos/legend-cube';
import type { PlainObject } from '@finos/legend-shared';
import type { CubeDirectConnection } from '../../../CubeConnectionExplorer.js';
import {
  CUBE_DIRECT_CONNECTION_PATH,
  CUBE_DIRECT_DATABASE_PATH,
  CUBE_DIRECT_RUNTIME_PATH,
} from '../../../CubeDirectConnection.js';
import type { AccessorPath } from '../../../CubeEngine.js';
import {
  type V1_CubeExploredTablePath,
  V1_quoteCubeName,
} from './V1_CubeSchemaExploration.js';

// The model a direct-connection cube's engine call runs on (PLAN §6.8): one
// Database holding exactly the tables the call needs, the saved connection
// bound to it, and a runtime with that one connection. It is built as protocol
// JSON for each call, never saved: the DuckDB grammar has no setup SQL, so a
// model in Pure text would lose it

/** A table of the built Database, as read from the connection's database */
export interface V1_CubeDirectTable {
  /** As the database stores them */
  path: V1_CubeExploredTablePath;
  /** The table's definition, every name quoted, without the columns Cube hides */
  definition: PlainObject;
}

const splitPath = (path: string): { package: string; name: string } => {
  const index = path.lastIndexOf('::');
  return { package: path.slice(0, index), name: path.slice(index + 2) };
};

/** By code point, the same in every locale */
const compare = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** The built Database's package and name, which schema exploration takes */
export const V1_CUBE_DIRECT_DATABASE = splitPath(CUBE_DIRECT_DATABASE_PATH);

/**
 * The store accessors of a lambda, each once: found anywhere in it, so a new
 * kind of IR node needs nothing here
 */
export const V1_collectCubeStoreAccessors = (
  ir: IR,
): readonly AccessorPath[] => {
  const found = new Map<string, AccessorPath>();
  const visit = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== 'object') {
      return;
    }
    const node = value as PlainObject;
    if (node.k === 'storeAccessor' && Array.isArray(node.path)) {
      const path = node.path as unknown as AccessorPath;
      found.set(JSON.stringify(path), path);
      return;
    }
    if (node.k === 'raw') {
      return;
    }
    Object.values(node).forEach(visit);
  };
  visit(ir);
  return [...found.values()];
};

/**
 * The model of one call: the tables in a fixed order (by schema, then table),
 * so the same tables always give the same model
 */
export const V1_buildCubeDirectModelContext = (
  connection: CubeDirectConnection,
  tables: readonly V1_CubeDirectTable[],
): PlainObject => {
  const schemas = new Map<string, PlainObject[]>();
  [...tables]
    .sort(
      (a, b) => compare(a.path[0], b.path[0]) || compare(a.path[1], b.path[1]),
    )
    .forEach(({ path: [schema], definition }) =>
      schemas.set(schema, [...(schemas.get(schema) ?? []), definition]),
    );
  return {
    _type: 'data',
    elements: [
      {
        _type: 'relational',
        ...splitPath(CUBE_DIRECT_DATABASE_PATH),
        includedStores: [],
        filters: [],
        joins: [],
        stereotypes: [],
        schemas: [...schemas.entries()].map(([schema, definitions]) => ({
          name: V1_quoteCubeName(schema),
          tables: definitions,
          views: [],
          tabularFunctions: [],
        })),
      },
      {
        _type: 'connection',
        ...splitPath(CUBE_DIRECT_CONNECTION_PATH),
        // bound to the built Database: the engine needs the store it serves
        connectionValue: { ...connection, element: CUBE_DIRECT_DATABASE_PATH },
      },
      {
        _type: 'runtime',
        ...splitPath(CUBE_DIRECT_RUNTIME_PATH),
        runtimeValue: {
          _type: 'engineRuntime',
          mappings: [],
          connectionStores: [],
          connections: [
            {
              store: { type: 'STORE', path: CUBE_DIRECT_DATABASE_PATH },
              storeConnections: [
                {
                  id: 'connection',
                  connection: {
                    _type: 'connectionPointer',
                    connection: CUBE_DIRECT_CONNECTION_PATH,
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  };
};
