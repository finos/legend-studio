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
import { Schema } from '@finos/legend-cube';
import {
  type CubeEngine,
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeModelOutline,
  type CubeResult,
} from '../graph-manager/CubeEngine.js';
import {
  CUSTOMERS_COLUMNS,
  NORTHWIND_DATABASE,
  NORTHWIND_RUNTIME,
  ORDERS_COLUMNS,
} from './CubeNorthwindTestQueries.js';

// A CubeEngine for jsdom tests (PLAN §11.1 M1.8a): canned answers, no network.
// Each method is a jest.fn, kept in its own variable so tests can read its
// calls or change its answer.

/** Northwind as the fake knows it: two tables, one runtime keyed by the database */
export const FAKE_NORTHWIND_OUTLINE: CubeModelOutline = {
  databases: [
    {
      path: NORTHWIND_DATABASE,
      schemas: [
        {
          name: 'NORTHWIND',
          tables: [
            {
              name: 'ORDERS',
              isView: false,
              columnCount: ORDERS_COLUMNS.length,
              flags: [],
            },
            {
              name: 'CUSTOMERS',
              isView: false,
              columnCount: CUSTOMERS_COLUMNS.length,
              flags: [],
            },
          ],
        },
      ],
    },
  ],
  runtimes: [{ path: NORTHWIND_RUNTIME, storePaths: [NORTHWIND_DATABASE] }],
};

/** The schemas the fake gives, keyed by `<schema>.<table>` as the outline names them */
export const FAKE_NORTHWIND_SCHEMAS: ReadonlyMap<string, Schema> = new Map([
  ['NORTHWIND.ORDERS', new Schema(ORDERS_COLUMNS)],
  ['NORTHWIND.CUSTOMERS', new Schema(CUSTOMERS_COLUMNS)],
]);

export const EMPTY_CUBE_RESULT: CubeResult = {
  columns: [],
  rows: [],
  sql: [],
  durationMs: 0,
};

export interface FakeCubeEngineAnswers {
  readonly outline?: CubeModelOutline;
  /** keyed by `<schema>.<table>`; a table not in it gets a compile error */
  readonly schemas?: ReadonlyMap<string, Schema>;
  readonly result?: CubeResult;
  readonly pure?: string;
}

export interface FakeCubeEngine {
  readonly engine: CubeEngine;
  readonly loadModel: jest.Mock<CubeEngine['loadModel']>;
  readonly resolveSchemas: jest.Mock<CubeEngine['resolveSchemas']>;
  readonly typeLambdas: jest.Mock<CubeEngine['typeLambdas']>;
  readonly execute: jest.Mock<CubeEngine['execute']>;
  readonly renderPure: jest.Mock<CubeEngine['renderPure']>;
}

/** A fresh fake: build one per test, since jest.fn keeps its calls across tests */
export const createFakeCubeEngine = (
  answers: FakeCubeEngineAnswers = {},
): FakeCubeEngine => {
  const schemas = answers.schemas ?? FAKE_NORTHWIND_SCHEMAS;
  const loadModel = jest.fn<CubeEngine['loadModel']>(async () =>
    Promise.resolve(answers.outline ?? FAKE_NORTHWIND_OUTLINE),
  );
  const resolveSchemas = jest.fn<CubeEngine['resolveSchemas']>(
    async (_model, accessors) =>
      Promise.resolve(
        new Map(
          [...accessors].map(([nodeId, [, schema, table]]) => [
            nodeId,
            schemas.get(`${schema}.${table}`) ??
              new CubeEngineError(
                CubeEngineErrorKind.COMPILE,
                `The table "${schema}.${table}" can't be found`,
                nodeId,
              ),
          ]),
        ),
      ),
  );
  const typeLambdas = jest.fn<CubeEngine['typeLambdas']>(async () =>
    Promise.resolve(new Map()),
  );
  const execute = jest.fn<CubeEngine['execute']>(async () =>
    Promise.resolve(answers.result ?? EMPTY_CUBE_RESULT),
  );
  const renderPure = jest.fn<CubeEngine['renderPure']>(async () =>
    Promise.resolve(answers.pure ?? ''),
  );
  return {
    engine: { loadModel, resolveSchemas, typeLambdas, execute, renderPure },
    loadModel,
    resolveSchemas,
    typeLambdas,
    execute,
    renderPure,
  };
};
