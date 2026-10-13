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
  ColumnComparisonFilter,
  Connection,
  Filter,
  FilterOperator,
  FunctionSource,
  Join,
  JoinType,
  Partition,
  Query,
  type QueryNode,
  QueryEmitter,
  RelationalTableSource,
  Schema,
  SortDirection,
  WindowRankFunction,
} from '@finos/legend-cube';
import { TEST__columnValues } from '../__test-utils__/CubeOperationsTestUtils.js';
import type {
  CubeModelOutline,
  CubeOutlineFunction,
} from '../graph-manager/CubeEngine.js';
import { V1_createEngineBackedCubeEngine } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeEngineTestUtils.js';
import type { V1_LegendCubeEngine } from '../graph-manager/protocol/pure/v1/V1_LegendCubeEngine.js';
import { recheckCubeFunctionSources } from '../stores/CubeFunctionRecheck.js';
import { getCubeFunctionParameters } from '../stores/source-picker/CubeInlineModelTabState.js';
import {
  CUBE_TRADES_DATABASE,
  CUBE_TRADES_DESK_BOOK_FUNCTION,
  CUBE_TRADES_LARGE_TRADES_FUNCTION,
  CUBE_TRADES_MODEL,
  CUBE_TRADES_RUNTIME,
  CUBE_TRADES_SCHEMA,
} from '../stores/fixtures/CubeTradesModel.js';

// Function sources through the engine (PLAN §6.5), on the trades sample's
// two functions: tradesAbove, which leaves the runtime to the cube, and
// deskBook, which reads through its own `from()`. The sample's data is
// made up but fixed, so the counts are too.

let engine: V1_LegendCubeEngine;
let outline: CubeModelOutline;

// the engine's spies are restored after each test
beforeEach(async () => {
  engine = V1_createEngineBackedCubeEngine().engine;
  outline = await engine.loadModel(CUBE_TRADES_MODEL);
});

const outlineOf = (path: string): CubeOutlineFunction => {
  const found = outline.functions?.find((fn) => fn.path === path);
  if (!found) {
    throw new Error(`No function ${path} in the outline`);
  }
  return found;
};

/** A function source, typed by the engine as the editor types it */
const typed = async (
  id: string,
  path: string,
  values: FunctionSource['values'],
): Promise<FunctionSource> => {
  const fn = outlineOf(path);
  const source = new FunctionSource(
    id,
    {
      function: fn.path,
      signature: fn.signature,
      parameters: getCubeFunctionParameters(fn),
    },
    values,
  );
  const schema = (
    await recheckCubeFunctionSources(engine, CUBE_TRADES_MODEL, [source])
  ).get(id);
  if (!(schema instanceof Schema)) {
    throw schema ?? new Error(`No schema for ${id}`);
  }
  return source.withResolution({ kind: 'resolved', schema });
};

const run = async (query: Query, rowLimit = 1000) =>
  engine.execute(
    CUBE_TRADES_MODEL,
    new QueryEmitter(query).emitExecutionLambda({
      rowLimit,
      runtime: CUBE_TRADES_RUNTIME,
    }),
  );

const chain = (nodes: readonly QueryNode[]): Query =>
  new Query(
    nodes,
    nodes
      .slice(1)
      .map(
        (node, index) =>
          new Connection(
            (nodes[index] as QueryNode).id,
            node.id,
            node.ports[0] as string,
          ),
      ),
    nodes.at(-1)?.id,
  );

describe('Function sources on the engine (PLAN §6.5)', () => {
  test("Lists the model's functions, with the runtime the bound one reads through", () => {
    expect(outlineOf(CUBE_TRADES_LARGE_TRADES_FUNCTION)).toMatchObject({
      parameters: [
        { name: 'minNotionalUsd', type: 'Float', multiplicity: '[1]' },
      ],
      runtime: undefined,
      problem: undefined,
    });
    expect(outlineOf(CUBE_TRADES_DESK_BOOK_FUNCTION)).toMatchObject({
      parameters: [
        { name: 'desk', type: 'String', multiplicity: '[1]' },
        { name: 'side', type: 'String', multiplicity: '[0..1]' },
      ],
      runtime: CUBE_TRADES_RUNTIME,
      problem: undefined,
    });
  });

  test('Types a function by its call, whatever its values', async () => {
    const source = await typed(
      'function101',
      CUBE_TRADES_LARGE_TRADES_FUNCTION,
      [],
    );
    expect(source.schematize([])?.columns.map((column) => column.name)).toEqual(
      ['TRADE_ID', 'TRADE_DATE', 'DESK_ID', 'SIDE', 'NOTIONAL_USD'],
    );
  });

  test("Runs a function that leaves the runtime to the cube, on the cube's, with its value", async () => {
    const source = await typed(
      'function101',
      CUBE_TRADES_LARGE_TRADES_FUNCTION,
      [{ kind: 'float', value: '1000000' }],
    );
    const result = await run(chain([source]));
    expect(result.rows).toHaveLength(44);
    expect(
      TEST__columnValues(result, 'NOTIONAL_USD').every(
        (value) => Number(value) > 1000000,
      ),
    ).toBe(true);
  });

  test('Runs a function with its own runtime, an empty optional value passed as []', async () => {
    const all = await typed('function101', CUBE_TRADES_DESK_BOOK_FUNCTION, [
      { kind: 'string', value: 'Rates' },
    ]);
    expect((await run(chain([all]))).rows).toHaveLength(65);
    const buys = all.withValues([
      { kind: 'string', value: 'Rates' },
      { kind: 'string', value: 'BUY' },
    ]);
    const result = await run(chain([buys]));
    expect(result.rows).toHaveLength(32);
    expect(new Set(TEST__columnValues(result, 'SIDE'))).toEqual(
      new Set(['BUY']),
    );
  });

  test('Joins a table of the same model', async () => {
    const source = await typed(
      'function101',
      CUBE_TRADES_LARGE_TRADES_FUNCTION,
      [{ kind: 'float', value: '1000000' }],
    );
    const [desks] = await Promise.all([
      engine
        .resolveSchemas(
          CUBE_TRADES_MODEL,
          new Map([
            [
              'relational101',
              [CUBE_TRADES_DATABASE, CUBE_TRADES_SCHEMA, 'DESKS'],
            ],
          ]),
        )
        .then((schemas) => {
          const schema = schemas.get('relational101');
          if (!(schema instanceof Schema)) {
            throw schema ?? new Error('No schema for DESKS');
          }
          return new RelationalTableSource('relational101', {
            database: CUBE_TRADES_DATABASE,
            schema: CUBE_TRADES_SCHEMA,
            table: 'DESKS',
          }).withResolution({ kind: 'resolved', schema });
        }),
    ]);
    const join = new Join('join101', {
      leftColumns: ['DESK_ID'],
      rightColumns: ['ID'],
      joinType: JoinType.INNER,
    });
    const query = new Query(
      [source, desks, join],
      [
        new Connection('function101', 'join101', 'leftTds'),
        new Connection('relational101', 'join101', 'rightTds'),
      ],
      'join101',
    );
    const result = await run(query);
    expect(result.rows).toHaveLength(44);
    expect(result.columns).toContain('REGION');
  });

  test("Ranks within a window, then filters, through the let form, on the function's own runtime", async () => {
    const book = await typed('function101', CUBE_TRADES_DESK_BOOK_FUNCTION, [
      { kind: 'string', value: 'Rates' },
    ]);
    const partition = new Partition(
      'partition101',
      ['SIDE'],
      [{ column: 'NOTIONAL_USD', direction: SortDirection.DESC }],
      [
        {
          column: undefined,
          function: WindowRankFunction.RANK,
          name: 'RANK_IN_SIDE',
        },
      ],
    );
    const filter = new Filter(
      'filter101',
      new ColumnComparisonFilter(
        'RANK_IN_SIDE',
        FilterOperator.LESS_THAN_OR_EQUAL,
        {
          kind: 'integer',
          value: '3',
        },
      ),
    );
    const result = await run(chain([book, partition, filter]));
    // the three largest of each side
    expect(result.rows).toHaveLength(6);
    expect(new Set(TEST__columnValues(result, 'DESK'))).toEqual(
      new Set(['Rates']),
    );
  });
});
