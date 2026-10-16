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
  CubeDocument,
  Query,
  QueryEmitter,
  RelationalTableSource,
  type Extend,
  type Schema,
} from '@finos/legend-cube';
import { stringifyLosslessJSON } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { TEST__createCubeApplicationStore } from '../__test-utils__/CubeTestApplication.js';
import { V1_serializeCubeLambda } from '../graph-manager/protocol/pure/v1/V1_CubeLambdaSerializer.js';
import { V1_createEngineBackedCubeEngine } from '../graph-manager/protocol/pure/v1/__test-utils__/V1_CubeEngineTestUtils.js';
import { CubeEditorState } from '../stores/CubeEditorState.js';
import {
  CUBE_LAMBDA_IMPORT_MESSAGE,
  CubeLambdaFidelity,
} from '../stores/CubeLambdaImportState.js';
import { CUBE_LAMBDA_SOURCES_MESSAGE } from '../stores/CubeLambdaSources.js';
import { CubeCodeCheckStatus } from '../stores/editors/CubeExpressionAutoCheck.js';
import {
  CUBE_NORTHWIND_DATABASE,
  CUBE_NORTHWIND_MODEL,
  CUBE_NORTHWIND_RUNTIME,
} from '../stores/fixtures/CubeNorthwindModel.js';
import { LocalModelCatalog } from '../stores/LocalModelCatalog.js';

// Import Pure from the Cube menu (PLAN §11.18), on the real engine (:6300):
// Pure text parsed by the engine's grammar, read into steps on the cube's
// model, its Extend typed, then written back and compared

const ORDERS = `#>{${CUBE_NORTHWIND_DATABASE}.NORTHWIND.ORDERS}#`;

/** A page on a cube of Northwind's ORDERS, or on a new cube */
const setUp = async (onOrders = true): Promise<CubeEditorState> => {
  const { engine } = V1_createEngineBackedCubeEngine();
  const state = new CubeEditorState({
    applicationStore: TEST__createCubeApplicationStore(),
    engine,
    modelCatalog: new LocalModelCatalog(engine),
  });
  if (onOrders) {
    const accessor = [CUBE_NORTHWIND_DATABASE, 'NORTHWIND', 'ORDERS'] as const;
    const schema = (
      await engine.resolveSchemas(
        CUBE_NORTHWIND_MODEL,
        new Map([['relational101', accessor]]),
      )
    ).get('relational101');
    state.applyDocument(
      new CubeDocument({
        context: {
          model: CUBE_NORTHWIND_MODEL,
          runtime: CUBE_NORTHWIND_RUNTIME,
        },
        query: new Query(
          [
            new RelationalTableSource(
              'relational101',
              {
                database: accessor[0],
                schema: accessor[1],
                table: accessor[2],
              },
              { kind: 'resolved', schema: schema as Schema },
            ),
          ],
          [],
          'relational101',
        ),
      }),
    );
  }
  return state;
};

const importPure = async (
  state: CubeEditorState,
  text: string,
): Promise<void> => {
  state.lambdaImport.openDialog();
  state.lambdaImport.setText(text);
  await flowResult(state.lambdaImport.importText());
};

describe('Import Pure, on the engine', () => {
  test('Reads Pure text into steps, its Extend typed and its code given, and writes it back the same', async () => {
    const state = await setUp();
    await importPure(
      state,
      `|${ORDERS}->filter(x|$x.FREIGHT > 100.0)->extend(~DOUBLE_ID: x|$x.ORDER_ID * 2)->groupBy(~[SHIP_COUNTRY], ~[TOTAL: x|$x.DOUBLE_ID : y|$y->sum()])->sort(~TOTAL->descending())->limit(5)`,
    );
    const { lambdaImport, document } = state;
    expect(lambdaImport.dialogError).toBeUndefined();
    expect(lambdaImport.isDialogOpen).toBe(false);
    expect(document.query.nodes.map((node) => node.type)).toEqual([
      'relational',
      'filter',
      'extend',
      'group',
      'sort',
      'limit',
    ]);
    const extend = document.query.nodes[2] as Extend;
    expect(extend.columns[0]?.code).toContain('ORDER_ID');
    // typed by the editor, as any Extend
    expect(extend.typing.kind).toBe('typed');
    expect(new QueryEmitter(document.query).canEmit('limit101')).toBe(true);
    expect(lambdaImport.fidelity).toBe(CubeLambdaFidelity.EXACT);
    expect(lambdaImport.label).toBe(CUBE_LAMBDA_IMPORT_MESSAGE.IMPORTED);
    // one undo step brings the cube back
    state.undo();
    expect(state.document.query.nodes.map((node) => node.id)).toEqual([
      'relational101',
    ]);
  });

  test("Reads a run's JSON, as the Runs panel copies it: from() gives the runtime, and the limit beside it is a Limit, with a note", async () => {
    const state = await setUp();
    const run = new QueryEmitter(state.document.query).emitExecutionLambda({
      runtime: CUBE_NORTHWIND_RUNTIME,
      rowLimit: 1000,
    });
    await importPure(state, stringifyLosslessJSON(V1_serializeCubeLambda(run)));
    expect(state.lambdaImport.dialogError).toBeUndefined();
    expect(state.document.context?.runtime).toBe(CUBE_NORTHWIND_RUNTIME);
    expect(state.document.query.nodes.map((node) => node.type)).toEqual([
      'relational',
      'limit',
    ]);
    expect(state.lambdaImport.notes).toEqual([
      CUBE_LAMBDA_IMPORT_MESSAGE.GRID_LIMIT,
    ]);
  });

  test('Checks the Pure as it is typed, nothing imported: ready once read and compiled, its expressions included, else the reason', async () => {
    const state = await setUp();
    const { lambdaImport } = state;
    const check = async (text: string): Promise<CubeCodeCheckStatus> => {
      lambdaImport.openDialog();
      lambdaImport.setText(text);
      await flowResult(lambdaImport.check());
      return lambdaImport.checkStatus;
    };
    expect(
      await check(
        `|${ORDERS}->filter(x|$x.FREIGHT->toOne() * 2 > 100.0)->extend(~DOUBLE_ID: x|$x.ORDER_ID * 2)->limit(5)`,
      ),
    ).toBe(CubeCodeCheckStatus.READY);
    expect(await check(`|${ORDERS}->extend(~D: x|$x.NOT_A_COLUMN * 2)`)).toBe(
      CubeCodeCheckStatus.PROBLEM,
    );
    expect(lambdaImport.dialogError?.message).toContain('NOT_A_COLUMN');
    // checked only: the cube is as it was
    expect(state.document.query.nodes.map((node) => node.id)).toEqual([
      'relational101',
    ]);
  });

  test("Says in the dialog why it can't read the Pure, and leaves the cube as it was", async () => {
    const state = await setUp();
    // not Pure
    await importPure(state, `|${ORDERS}->filter(x|`);
    expect(state.lambdaImport.isDialogOpen).toBe(true);
    expect(state.lambdaImport.dialogError?.message).toBeDefined();
    // no step for it
    await importPure(state, `|${ORDERS}->olapGroupBy(~[SHIP_COUNTRY])`);
    expect(state.lambdaImport.dialogError?.message).toContain(
      '->olapGroupBy()',
    );
    expect(state.document.query.nodes.map((node) => node.id)).toEqual([
      'relational101',
    ]);

    // a new cube has no model to read a table on
    const empty = await setUp(false);
    await importPure(empty, `|${ORDERS}->limit(5)`);
    expect(empty.lambdaImport.dialogError?.message).toBe(
      CUBE_LAMBDA_SOURCES_MESSAGE.TABLE_MODEL,
    );
  });
});
