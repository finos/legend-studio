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

import { describe, expect, test } from '@jest/globals';
import {
  AggregationFunction,
  ColumnComparisonFilter,
  Distinct,
  Drop,
  Filter,
  FilterOperator,
  Limit,
  Partition,
  type QueryNode,
  QueryEmitter,
  RelationalTableSource,
  Restrict,
  Schema,
  Slice,
  Sort,
  SortDirection,
  WindowRankFunction,
} from '@finos/legend-cube';
import type { PlainObject } from '@finos/legend-shared';
import {
  TEST__chainOf,
  TEST__columnValues,
  TEST__expectValidQuery,
} from '../__test-utils__/CubeOperationsTestUtils.js';
import { CubeDirectDatabaseType } from '../graph-manager/CubeConnectionExplorer.js';
import {
  createCubeDirectModel,
  CUBE_DIRECT_DATABASE_PATH,
  CUBE_DIRECT_RUNTIME_PATH,
} from '../graph-manager/CubeDirectConnection.js';
import type { CubeResult } from '../graph-manager/CubeEngine.js';
import { getDatabaseType } from '../graph-manager/CubeModelOutlineHelper.js';
import { V1_createEngineBackedCubeEngine } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeEngineTestUtils.js';
import { V1_buildCubeDirectConnection } from '../graph-manager/protocol/pure/v1/V1_CubeDirectConnection.js';

// The operations (PLAN §11.4) over a direct-connection source, on H2 and
// DuckDB (PLAN §6.8): each is written for the database type the cube's
// outline gives, and its rows are compared in order after a Sort, as sets
// otherwise. Their own schemas, so they can run beside the other engine tests

const ROWS = "(1, 'DE'), (2, 'MX'), (3, 'DE'), (4, 'FR'), (5, 'MX'), (6, 'DE')";

describe.each<[CubeDirectDatabaseType, string, string, string]>([
  [CubeDirectDatabaseType.H2, 'CUBE_OPS', 'ORDER_ID', 'COUNTRY'],
  [CubeDirectDatabaseType.DUCKDB, 'cube_ops', 'order_id', 'country'],
])(
  'Operations on a direct-connection cube on %s',
  (databaseType, schema, orderId, country) => {
    const connection: PlainObject = V1_buildCubeDirectConnection({
      databaseType,
      setupSqls: [
        `drop schema if exists ${schema} cascade`,
        `create schema ${schema}`,
        `create table ${schema}.orders_table (${orderId} INTEGER PRIMARY KEY, ${country} VARCHAR(15))`,
        `insert into ${schema}.orders_table values ${ROWS}`,
      ],
      ...(databaseType === CubeDirectDatabaseType.DUCKDB ? { path: '' } : {}),
    });
    const model = createCubeDirectModel(connection);
    const table =
      databaseType === CubeDirectDatabaseType.H2
        ? 'ORDERS_TABLE'
        : 'orders_table';

    /** Runs the operations after the table, written for the cube's database type */
    const run = async (...operations: QueryNode[]): Promise<CubeResult> => {
      const { engine } = V1_createEngineBackedCubeEngine();
      const outline = await engine.loadModel(model);
      const path = [CUBE_DIRECT_DATABASE_PATH, `"${schema}"`, `"${table}"`];
      const typed = (
        await engine.resolveSchemas(
          model,
          new Map([['relational101', path as [string, string, string]]]),
        )
      ).get('relational101');
      expect(typed).toBeInstanceOf(Schema);
      const query = TEST__chainOf([
        new RelationalTableSource(
          'relational101',
          {
            database: path[0] as string,
            schema: path[1] as string,
            table: path[2] as string,
          },
          { kind: 'resolved', schema: typed as Schema },
        ),
        ...operations,
      ]);
      TEST__expectValidQuery(query);
      const runtimeDatabaseType = getDatabaseType(
        outline,
        CUBE_DIRECT_RUNTIME_PATH,
        [CUBE_DIRECT_DATABASE_PATH],
      );
      expect(runtimeDatabaseType).toBe(databaseType);
      return engine.execute(
        model,
        new QueryEmitter(query).emitExecutionLambda({
          rowLimit: 100,
          runtime: CUBE_DIRECT_RUNTIME_PATH,
          databaseType: runtimeDatabaseType,
        }),
      );
    };

    const descending = (): Sort =>
      new Sort('sort101', [{ column: orderId, direction: SortDirection.DESC }]);

    test('Sorts, then limits, in order', async () => {
      const result = await run(descending(), new Limit('limit101', 3));
      expect(TEST__columnValues(result, orderId)).toEqual(['6', '5', '4']);
    });

    test('Sorts, then drops, in order', async () => {
      const result = await run(descending(), new Drop('drop101', 4));
      expect(TEST__columnValues(result, orderId)).toEqual(['2', '1']);
    });

    test('Sorts, then slices, in order', async () => {
      const result = await run(descending(), new Slice('slice101', 1, 3));
      expect(TEST__columnValues(result, orderId)).toEqual(['5', '4']);
    });

    test('Keeps one row of each value', async () => {
      const result = await run(
        new Restrict('restrict101', [country]),
        new Distinct('distinct101'),
      );
      expect(result.rows).toHaveLength(3);
      expect(new Set(TEST__columnValues(result, country))).toEqual(
        new Set(['DE', 'MX', 'FR']),
      );
    });

    // window functions (PLAN §11.6): DuckDB is a second database that runs them

    const window = (
      columns: string[],
      sorted: boolean,
      ...functions: [string, string | undefined, string][]
    ): Partition =>
      new Partition(
        'partition101',
        columns,
        sorted ? [{ column: orderId, direction: SortDirection.ASC }] : [],
        functions.map(([fn, column, name]) => ({ column, function: fn, name })),
      );
    const germany = (): Filter =>
      new Filter(
        'filter101',
        new ColumnComparisonFilter(country, FilterOperator.EQUAL, {
          kind: 'string',
          value: 'DE',
        }),
      );
    const ascending = (): Sort =>
      new Sort('sort102', [{ column: orderId, direction: SortDirection.ASC }]);

    test("Counts each country's rows on every row, though a Filter after the window keeps one country", async () => {
      const result = await run(
        window([country], false, [
          AggregationFunction.COUNT_ROWS,
          undefined,
          'n',
        ]),
        germany(),
      );
      expect(TEST__columnValues(result, 'n')).toEqual(['3', '3', '3']);
    });

    test('Runs a count, ranks and numbers the rows of each country in order', async () => {
      const result = await run(
        window(
          [country],
          true,
          [AggregationFunction.COUNT_ROWS, undefined, 'n'],
          [WindowRankFunction.RANK, undefined, 'rk'],
          [WindowRankFunction.ROW_NUMBER, undefined, 'rn'],
        ),
        ascending(),
      );
      expect(TEST__columnValues(result, orderId)).toEqual([
        '1',
        '2',
        '3',
        '4',
        '5',
        '6',
      ]);
      expect(TEST__columnValues(result, 'n')).toEqual([
        '1',
        '1',
        '2',
        '1',
        '2',
        '3',
      ]);
      expect(TEST__columnValues(result, 'rk')).toEqual(
        TEST__columnValues(result, 'n'),
      );
      expect(TEST__columnValues(result, 'rn')).toEqual(
        TEST__columnValues(result, 'n'),
      );
    });

    test('Counts the distinct countries over every row, and gives each row its own country as the distinct value', async () => {
      const result = await run(
        window([], false, [AggregationFunction.DISTINCT_COUNT, country, 'd']),
        new Partition(
          'partition102',
          [country],
          [],
          [
            {
              column: country,
              function: AggregationFunction.DISTINCT_VALUE,
              name: 'v',
            },
          ],
        ),
        ascending(),
      );
      expect(TEST__columnValues(result, 'd')).toEqual(Array(6).fill('3'));
      expect(TEST__columnValues(result, 'v')).toEqual(
        TEST__columnValues(result, country),
      );
    });
  },
);
