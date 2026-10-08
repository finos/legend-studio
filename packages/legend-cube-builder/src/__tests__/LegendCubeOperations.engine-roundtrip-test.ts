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

import { beforeAll, beforeEach, describe, expect, test } from '@jest/globals';
import {
  ColumnComparisonFilter,
  Filter,
  FilterOperator,
  Limit,
  printIR,
  type Query,
  type QueryNode,
  QueryEmitter,
  type RelationalTableSource,
} from '@finos/legend-cube';
import { parseLosslessJSON, stringifyLosslessJSON } from '@finos/legend-shared';
import {
  CUBE_ENGINE_TEST__getCommit,
  CUBE_ENGINE_TEST__grammarToJson_lambda,
} from '../__test-utils__/CubeEngineTestSupport.js';
import {
  TEST__chainOf,
  TEST__columnValues,
  TEST__expectEngineTyping,
  TEST__northwindTable,
  TEST__resolveSources,
  TEST__runQuery,
} from '../__test-utils__/CubeOperationsTestUtils.js';
import { V1_createEngineBackedCubeEngine } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeEngineTestUtils.js';
import { V1_serializeCubeLambda } from '../graph-manager/protocol/pure/v1/V1_CubeLambdaSerializer.js';
import type { V1_LegendCubeEngine } from '../graph-manager/protocol/pure/v1/V1_LegendCubeEngine.js';
import { CUBE_NORTHWIND_RUNTIME } from '../stores/fixtures/CubeNorthwindModel.js';

// M2's operations on the engine (PLAN §11.4), on the Cube Northwind fixture.
// Rows come back in H2's order unless a Sort reaches the node that runs, so
// results are compared as counts and sets. ORDERS has 830 orders, ORDER_ID
// 10248 to 11077 with no gap.

const ROW_LIMIT = 10000;

let engine: V1_LegendCubeEngine;

beforeAll(async () => {
  const commit = await CUBE_ENGINE_TEST__getCommit();
  process.stdout.write(`Legend Cube operations: engine commit ${commit}\n`);
});

// spies are restored after each test
beforeEach(() => {
  ({ engine } = V1_createEngineBackedCubeEngine());
});

const orders = async (): Promise<RelationalTableSource> => {
  const [resolved] = await TEST__resolveSources(engine, [
    TEST__northwindTable('relational101', 'ORDERS'),
  ]);
  return resolved as RelationalTableSource;
};

/** ORDERS, then the given nodes, captured at the last */
const ordersThen = async (...nodes: QueryNode[]): Promise<Query> =>
  TEST__chainOf([await orders(), ...nodes]);

const orderIds = (values: readonly unknown[]): number[] =>
  values.map((value) => Number(value));

/** The execution lambda as protocol JSON, without the source information Cube stamps */
const emittedJson = (query: Query, rowLimit = ROW_LIMIT): unknown =>
  parseLosslessJSON(
    stringifyLosslessJSON(
      V1_serializeCubeLambda(
        new QueryEmitter(query).emitExecutionLambda({
          rowLimit,
          runtime: CUBE_NORTHWIND_RUNTIME,
        }),
      ),
      (key: string, value: unknown) =>
        key === 'sourceInformation' ? undefined : value,
    ),
  );

describe('Limit on the engine', () => {
  test('Emits what the engine parses from the printed Pure, and types as Cube infers', async () => {
    const query = await ordersThen(new Limit('limit101', 5));
    const lambda = new QueryEmitter(query).emitExecutionLambda({
      rowLimit: ROW_LIMIT,
      runtime: CUBE_NORTHWIND_RUNTIME,
    });
    expect(emittedJson(query)).toEqual(
      await CUBE_ENGINE_TEST__grammarToJson_lambda(printIR(lambda)),
    );
    await TEST__expectEngineTyping(engine, query);
  });

  test('Takes 5 of the 830 orders', async () => {
    const result = await TEST__runQuery(
      engine,
      await ordersThen(new Limit('limit101', 5)),
      ROW_LIMIT,
    );
    const ids = orderIds(TEST__columnValues(result, 'ORDER_ID'));
    expect(ids).toHaveLength(5);
    expect(new Set(ids).size).toBe(5);
    ids.forEach((id) => {
      expect(id).toBeGreaterThanOrEqual(10248);
      expect(id).toBeLessThanOrEqual(11077);
    });
  });

  test('Takes every row when the size is larger than the input', async () => {
    const result = await TEST__runQuery(
      engine,
      await ordersThen(new Limit('limit101', 1000)),
      ROW_LIMIT,
    );
    expect(result.rows).toHaveLength(830);
  });

  test("Tells the Limit's rows from the run's row limit", async () => {
    // 10 rows under a row limit of 10: the run fetches 11 and gets 10, so nothing is cut off
    const exact = await TEST__runQuery(
      engine,
      await ordersThen(new Limit('limit101', 10)),
      10,
    );
    expect(exact.rows).toHaveLength(10);
    // 5 rows under a row limit of 3: the run gets one more than it shows, so it is cut off
    const cut = await TEST__runQuery(
      engine,
      await ordersThen(new Limit('limit101', 5)),
      3,
    );
    expect(cut.rows).toHaveLength(4);
  });

  test('Takes its rows from the rows a filter keeps', async () => {
    const query = await ordersThen(
      new Filter(
        'filter101',
        new ColumnComparisonFilter('SHIP_COUNTRY', FilterOperator.EQUAL, {
          kind: 'string',
          value: 'France',
        }),
      ),
      new Limit('limit101', 5),
    );
    await TEST__expectEngineTyping(engine, query);
    const result = await TEST__runQuery(engine, query, ROW_LIMIT);
    expect(TEST__columnValues(result, 'SHIP_COUNTRY')).toEqual(
      Array(5).fill('France'),
    );
  });
});
