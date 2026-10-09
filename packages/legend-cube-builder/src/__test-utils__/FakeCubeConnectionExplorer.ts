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

import { jest } from '@jest/globals';
import {
  CubeConnectionDatasourceKind,
  type CubeConnectionExplorer,
  CubeDirectDatabaseType,
  type CubeExploredTable,
} from '../graph-manager/CubeConnectionExplorer.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../graph-manager/CubeEngine.js';

// A connection explorer for jsdom tests: canned answers, no network. Each
// method is a jest.fn, so tests can read its calls or change its answer. Any
// connection is supported and summarized as an in-memory H2 database.

/** A schema of two tables, one with a column Cube hides */
export const FAKE_DIRECT_TABLES: readonly CubeExploredTable[] = [
  {
    name: 'ORDERS',
    storedName: '"ORDERS"',
    columnCount: 3,
    hiddenColumnCount: 1,
    flags: [],
  },
  {
    name: 'ORDER.LINES',
    storedName: '"ORDER.LINES"',
    columnCount: 2,
    hiddenColumnCount: 0,
    flags: [],
  },
];

export interface FakeCubeConnectionExplorerAnswers {
  /** keyed by schema name; a schema not in it gets a compile error */
  readonly tables?: ReadonlyMap<string, readonly CubeExploredTable[]>;
}

export interface FakeCubeConnectionExplorer {
  readonly explorer: CubeConnectionExplorer;
  readonly buildConnection: jest.Mock<
    CubeConnectionExplorer['buildConnection']
  >;
  readonly describeConnection: jest.Mock<
    CubeConnectionExplorer['describeConnection']
  >;
  readonly listSchemas: jest.Mock<CubeConnectionExplorer['listSchemas']>;
  readonly listTables: jest.Mock<CubeConnectionExplorer['listTables']>;
}

/** A fresh fake: build one per test, since jest.fn keeps its calls across tests */
export const createFakeCubeConnectionExplorer = (
  answers: FakeCubeConnectionExplorerAnswers = {},
): FakeCubeConnectionExplorer => {
  const tables =
    answers.tables ?? new Map([['CUBE_DIRECT', FAKE_DIRECT_TABLES]]);
  const buildConnection = jest.fn<CubeConnectionExplorer['buildConnection']>(
    (draft) => ({ _type: 'fake', ...draft }),
  );
  const describeConnection = jest.fn<
    CubeConnectionExplorer['describeConnection']
  >(() => ({
    supported: true,
    summary: {
      databaseType: CubeDirectDatabaseType.H2,
      datasourceKind: CubeConnectionDatasourceKind.LOCAL_H2,
      setupSqlCount: 1,
      authenticationKind: 'h2Default',
    },
  }));
  const listSchemas = jest.fn<CubeConnectionExplorer['listSchemas']>(async () =>
    Promise.resolve([...tables.keys()]),
  );
  const listTables = jest.fn<CubeConnectionExplorer['listTables']>(
    async (_connection, schema) => {
      const found = tables.get(schema);
      return found
        ? Promise.resolve(found)
        : Promise.reject(
            new CubeEngineError(
              CubeEngineErrorKind.COMPILE,
              `The schema "${schema}" can't be found`,
            ),
          );
    },
  );
  return {
    explorer: { buildConnection, describeConnection, listSchemas, listTables },
    buildConnection,
    describeConnection,
    listSchemas,
    listTables,
  };
};
