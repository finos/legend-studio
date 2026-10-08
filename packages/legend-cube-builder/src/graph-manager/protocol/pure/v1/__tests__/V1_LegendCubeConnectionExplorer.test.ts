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

import { describe, expect, jest, test } from '@jest/globals';
import { NetworkClientError, TracerService } from '@finos/legend-shared';
import {
  CubeConnectionDatasourceKind,
  CubeDirectDatabaseType,
} from '../../../../CubeConnectionExplorer.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../../../CubeEngine.js';
import { V1_LegendCubeConnectionExplorer } from '../V1_LegendCubeConnectionExplorer.js';
import H2_TABLES from './V1_SchemaExploration.H2.tables.json' with { type: 'json' };
import ERRORS from './V1_SchemaExploration.errors.json' with { type: 'json' };

// The connection explorer over a mocked engine client: what it sends, what it
// reads, and how it reports the engine's failures (recorded from a local
// engine, commit `93d92b4`; local evidence `sources-v2/db-direct/`)

const createExplorer = (): V1_LegendCubeConnectionExplorer =>
  new V1_LegendCubeConnectionExplorer(
    { baseUrl: 'http://engine.test/api' },
    new TracerService(),
  );

const H2 = {
  databaseType: CubeDirectDatabaseType.H2,
  setupSqls: ['create schema if not exists DBPROBE'],
};

/** A failed call, as the engine client throws it */
const engineFailure = (payload: unknown): NetworkClientError =>
  new NetworkClientError(
    {
      status: 500,
      statusText: '500',
      url: 'http://engine.test/api',
    } as Response,
    payload as NetworkClientError['payload'],
  );

/** What a listing call fails with when the engine answers so */
const failureOf = async (payload: unknown): Promise<CubeEngineError> => {
  const explorer = createExplorer();
  jest
    .spyOn(explorer.client, 'buildDatabase')
    .mockRejectedValue(engineFailure(payload));
  const error = await explorer
    .listSchemas(explorer.buildConnection(H2))
    .catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(CubeEngineError);
  return error as CubeEngineError;
};

describe('Connection explorer', () => {
  test('Describes a connection without calling the engine', () => {
    const explorer = createExplorer();
    const buildDatabase = jest.spyOn(explorer.client, 'buildDatabase');
    expect(explorer.describeConnection(explorer.buildConnection(H2))).toEqual({
      supported: true,
      summary: {
        databaseType: CubeDirectDatabaseType.H2,
        datasourceKind: CubeConnectionDatasourceKind.LOCAL_H2,
        path: undefined,
        setupSqlCount: 1,
        authenticationKind: 'h2Default',
      },
    });
    expect(
      explorer.describeConnection({
        ...explorer.buildConnection(H2),
        quoteIdentifiers: true,
      }),
    ).toEqual({
      supported: false,
      problems: [
        'The connection sets "quoteIdentifiers", which Cube doesn\'t support',
      ],
    });
    expect(buildDatabase).not.toHaveBeenCalled();
  });

  test('Never sends the engine a connection Cube refuses', async () => {
    const explorer = createExplorer();
    const buildDatabase = jest.spyOn(explorer.client, 'buildDatabase');
    const error = await explorer
      .listSchemas({ ...explorer.buildConnection(H2), extra: true })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(CubeEngineError);
    expect(error).toMatchObject({
      kind: CubeEngineErrorKind.COMPILE,
      firstLine: 'The connection has a property Cube doesn\'t know: "extra"',
    });
    expect(buildDatabase).not.toHaveBeenCalled();
  });

  test("Lists a schema's tables: the connection reaches the engine as built", async () => {
    const explorer = createExplorer();
    const connection = explorer.buildConnection(H2);
    const buildDatabase = jest
      .spyOn(explorer.client, 'buildDatabase')
      .mockResolvedValue(H2_TABLES);
    const tables = await explorer.listTables(connection, 'DBPROBE');
    expect(tables.map((table) => table.storedName)).toEqual([
      '"MY TABLE"',
      '"ORDER"',
      '"ORDER.LINES"',
      '"ORDERS"',
      '"mixedCase"',
      '"FRENCH_ORDERS"',
    ]);
    expect(buildDatabase).toHaveBeenCalledTimes(1);
    expect(buildDatabase.mock.calls[0]?.[0]).toMatchObject({
      connection,
      config: {
        patterns: [
          {
            schemaPattern: 'DBPROBE',
            tablePattern: '%',
            functionPattern: '_%',
          },
        ],
      },
    });
  });
});

describe('Connection explorer failures', () => {
  test.each<[keyof typeof ERRORS, string]>([
    [
      'unresolvedAuthentication',
      "The engine couldn't open the connection: its authentication may be missing or unresolved",
    ],
    ['unreachableDatabase', "The engine couldn't reach the database"],
    [
      'setupSqlError',
      "The database refused a statement: check the connection's setup SQL",
    ],
    [
      'unknownAuthenticationType',
      "The engine doesn't know this kind of connection or authentication",
    ],
    [
      'unknownProperty',
      "The engine doesn't recognize a property of the connection",
    ],
  ])(
    'Says what the engine failure %s means, keeping its message but not its trace',
    async (recorded, meaning) => {
      const payload = ERRORS[recorded];
      const error = await failureOf(payload);
      expect(error.kind).toBe(CubeEngineErrorKind.COMPILE);
      expect(error.firstLine).toBe(meaning);
      expect(error.detail).toContain(payload.message.split('\n')[0]);
      expect(error.detail).not.toContain(payload.trace);
      expect(error.nodeId).toBeUndefined();
    },
  );

  test("Keeps the engine's message when it says enough", async () => {
    const error = await failureOf({
      code: -1,
      message: 'Schema "NOPE" not found',
      status: 'error',
    });
    expect([error.kind, error.firstLine]).toEqual([
      CubeEngineErrorKind.COMPILE,
      'Schema "NOPE" not found',
    ]);
  });

  test('Reports a network failure as one', async () => {
    const explorer = createExplorer();
    jest
      .spyOn(explorer.client, 'buildDatabase')
      .mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(
      explorer.listSchemas(explorer.buildConnection(H2)),
    ).rejects.toMatchObject({
      kind: CubeEngineErrorKind.NETWORK,
      firstLine: 'Failed to fetch',
    });
  });
});
