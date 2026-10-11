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

import { beforeEach, describe, expect, test } from '@jest/globals';
import {
  PrimitiveType,
  Query,
  QueryEmitter,
  RelationalTableSource,
  Schema,
  SchemaColumn,
  Sort,
  SortDirection,
} from '@finos/legend-cube';
import {
  TEST__chainOf,
  TEST__northwindTable,
  TEST__resolveSources,
} from '../__test-utils__/CubeOperationsTestUtils.js';
import { CubeEngineError } from '../graph-manager/CubeEngine.js';
import { V1_createEngineBackedCubeEngine } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeEngineTestUtils.js';
import type { V1_LegendCubeEngine } from '../graph-manager/protocol/pure/v1/V1_LegendCubeEngine.js';
import {
  CUBE_NORTHWIND_DATABASE,
  CUBE_NORTHWIND_MODEL as MODEL,
  CUBE_NORTHWIND_RUNTIME as RUNTIME,
} from '../stores/fixtures/CubeNorthwindModel.js';

// The results' CSV export on the engine (PLAN §11.10): the engine's own CSV
// of a whole query, with no row limit

let engine: V1_LegendCubeEngine;

beforeEach(() => {
  ({ engine } = V1_createEngineBackedCubeEngine());
});

const lambdaOf = (query: Query) =>
  new QueryEmitter(query).emitExecutionLambda({ runtime: RUNTIME });

describe('CSV export on the engine', () => {
  test("Gives the whole query's rows as CSV, a header first, every digit kept, sorted as asked", async () => {
    const [orders] = await TEST__resolveSources(engine, [
      TEST__northwindTable('relational101', 'ORDERS'),
    ]);
    const csv = await engine.exportCsv(
      MODEL,
      lambdaOf(
        TEST__chainOf([
          orders as RelationalTableSource,
          new Sort('sort101', [
            { column: 'ORDER_ID', direction: SortDirection.DESC },
          ]),
        ]),
      ),
    );
    const lines = csv.split('\r\n').filter((line) => line.length);
    // the header and all 830 orders: the grid's row limit is not applied
    expect(lines).toHaveLength(831);
    expect(lines[0]?.split(',').slice(0, 2)).toEqual([
      'ORDER_ID',
      'CUSTOMER_ID',
    ]);
    expect(lines[1]?.startsWith('11077,')).toBe(true);
    expect(lines.at(-1)?.startsWith('10248,')).toBe(true);
  });

  test('Writes an empty value as an empty field, and a big integer and a scaled decimal digit for digit', async () => {
    const [allTypes] = await TEST__resolveSources(engine, [
      TEST__northwindTable('relational101', 'ALLTYPES', 'CUBETEST'),
    ]);
    const csv = await engine.exportCsv(
      MODEL,
      lambdaOf(
        new Query([allTypes as RelationalTableSource], [], 'relational101'),
      ),
    );
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('ID,TI,SI,BI,F,D,DEC,NUM,DT,TS,B,VC');
    expect(lines[2]).toContain(',9007199254740993,');
    expect(lines[2]).toContain(',2.5000,');
    expect(lines[3]).toBe('3,,,,,,,,,,,');
  });

  test('Rejects a query the engine refuses with its error', async () => {
    const missing = new RelationalTableSource(
      'relational101',
      { database: CUBE_NORTHWIND_DATABASE, schema: 'NORTHWIND', table: 'NOPE' },
      // typed as Cube saw it once: the table is gone, so the engine refuses it
      {
        kind: 'resolved',
        schema: new Schema([
          new SchemaColumn('ID', PrimitiveType.get('Integer'), false),
        ]),
      },
    );
    await expect(
      engine.exportCsv(
        MODEL,
        lambdaOf(new Query([missing], [], 'relational101')),
      ),
    ).rejects.toBeInstanceOf(CubeEngineError);
  });
});
