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
  CubeDocument,
  Query,
  RelationalTableSource,
  Schema,
} from '@finos/legend-cube';
import { flowResult } from 'mobx';
import { TEST__createCubeApplicationStore } from '../__test-utils__/CubeTestApplication.js';
import { V1_createEngineBackedCubeEngine } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeEngineTestUtils.js';
import { sliceQuery } from '../__test-utils__/CubeNorthwindTestQueries.js';
import { CubeEditorState } from '../stores/CubeEditorState.js';
import {
  CUBE_NORTHWIND_DATABASE,
  CUBE_NORTHWIND_MODEL,
  CUBE_NORTHWIND_RUNTIME,
} from '../stores/fixtures/CubeNorthwindModel.js';
import { LocalModelCatalog } from '../stores/LocalModelCatalog.js';

// The page's state on the real engine (:6300): what the demo does, without
// the browser. ORDERS has 830 rows (PLAN §11.2).

const setUp = async (): Promise<CubeEditorState> => {
  const { engine } = V1_createEngineBackedCubeEngine();
  const state = new CubeEditorState({
    applicationStore: TEST__createCubeApplicationStore(),
    engine,
    modelCatalog: new LocalModelCatalog(engine),
  });
  const accessor = [CUBE_NORTHWIND_DATABASE, 'NORTHWIND', 'ORDERS'] as const;
  const schema = (
    await engine.resolveSchemas(
      CUBE_NORTHWIND_MODEL,
      new Map([['relational101', accessor]]),
    )
  ).get('relational101');
  expect(schema).toBeInstanceOf(Schema);
  state.applyDocument(
    new CubeDocument({
      context: { model: CUBE_NORTHWIND_MODEL, runtime: CUBE_NORTHWIND_RUNTIME },
      query: new Query(
        [
          new RelationalTableSource(
            'relational101',
            { database: accessor[0], schema: accessor[1], table: accessor[2] },
            { kind: 'resolved', schema: schema as Schema },
          ),
        ],
        [],
        'relational101',
      ),
    }),
  );
  return state;
};

beforeEach(() => {
  localStorage.clear();
});

describe('Cube editor state, on the engine', () => {
  test('Runs a picked table and shows every row under the default limit', async () => {
    const state = await setUp();
    await flowResult(state.execution.execute());
    const { result, error } = state.execution;
    expect(error).toBeUndefined();
    expect(result?.rows).toHaveLength(830);
    expect(result?.limited).toBe(false);
    expect(result?.rows[0]?.length).toBe(result?.schema.columns.length);
    expect(result?.sql.length).toBeGreaterThan(0);
  });

  test('Runs the slice (ORDERS ⋈ CUSTOMERS, then the France filter): 19 rows under the columns Cube inferred', async () => {
    const state = await setUp();
    state.applyDocument(state.document.withQuery(sliceQuery()));
    await flowResult(state.execution.execute());
    const { result, error } = state.execution;
    expect(error).toBeUndefined();
    expect(result?.rows).toHaveLength(19);
    expect(result?.schema.columns.map((column) => column.name)).toEqual(
      state.analysis.schemas
        .get('filter101')
        ?.columns.map((column) => column.name),
    );
  });

  test('Keeps the limit and says the run was cut when the table has more rows', async () => {
    const state = await setUp();
    state.setRowLimit(10);
    await flowResult(state.execution.execute());
    expect(state.execution.result?.rows).toHaveLength(10);
    expect(state.execution.result?.limited).toBe(true);
  });
});
