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
  Connection,
  CubeDocument,
  Extend,
  type JsonObject,
  PrimitiveType,
  Query,
  Schema,
  SchemaColumn,
} from '@finos/legend-cube';
import {
  MockedMonacoEditorAPI,
  MockedMonacoEditorInstance,
} from '@finos/legend-lego/code-editor/test';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { EXTEND_EDITOR_NOTES } from '../../../__lib__/LegendCubeLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import { TEST__findCanvasNode } from '../../../__test-utils__/CubeCanvasTestUtils.js';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import type { FakeCubeEngine } from '../../../__test-utils__/FakeCubeEngine.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../../graph-manager/CubeEngine.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CubeExtendDraft } from '../../../stores/editors/CubeExtendDraft.js';
import { CUBE_NORTHWIND_MODEL } from '../../../stores/fixtures/CubeNorthwindModel.js';
import { CubeCanvas } from '../../canvas/CubeCanvas.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

const lambdaOf = (code: string): JsonObject => ({
  _type: 'lambda',
  parameters: [{ _type: 'var', name: 'x' }],
  body: [{ _type: 'string', value: code }],
});

const render = async (): Promise<{
  state: CubeEditorState;
  fake: FakeCubeEngine;
}> => {
  const { host, fake } = TEST__createCubeHost();
  fake.parseExpression.mockImplementation(async (code) => ({
    lambda: lambdaOf(code),
    located: lambdaOf(code),
  }));
  fake.typeLambdas.mockImplementation(
    async (_model, lambdas) =>
      new Map(
        [...lambdas.keys()].map((key) => [
          key,
          new Schema([
            ...ORDERS_COLUMNS,
            new SchemaColumn('col_1', PrimitiveType.get('Integer'), false),
          ]),
        ]),
      ),
  );
  const state = new CubeEditorState(
    host,
    new CubeDocument({
      context: CONTEXT,
      query: new Query(
        [
          northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
          new Extend('extend101'),
        ],
        [new Connection('relational101', 'extend101', 'tds')],
        'extend101',
      ),
    }),
  );
  await TEST__renderInCubeApplication(
    <div style={{ display: 'flex' }}>
      <div style={{ width: 800, height: 400 }}>
        <CubeCanvas editorState={state} />
      </div>
    </div>,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.CANVAS,
  );
  fireEvent.click(await TEST__findCanvasNode('extend101'));
  await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
  return { state, fake };
};

const panel = (): HTMLElement =>
  screen.getByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);

const button = (name: string | RegExp): HTMLButtonElement =>
  within(panel()).getByRole<HTMLButtonElement>('button', { name });

const draftOf = (state: CubeEditorState): CubeExtendDraft =>
  state.nodeEditor.draft as CubeExtendDraft;

beforeEach(() => {
  localStorage.clear();
  // the mocked code editor holds no text of its own
  MockedMonacoEditorInstance.getValue.mockReturnValue('');
});

describe('Extend editor', () => {
  test('Shows a new column to write, and waits for a Validate before Apply', async () => {
    const { state } = await render();
    expect(
      within(panel()).getByLabelText<HTMLInputElement>('Column name 1').value,
    ).toBe('col_1');
    expect(within(panel()).getByLabelText('Expression 1')).toBeTruthy();
    expect(within(panel()).getByText('Not validated yet')).toBeTruthy();
    const apply = button('Apply');
    expect(apply.disabled).toBe(true);
    expect(apply.title).toBe('Validate the expressions first (F10)');
    // in place of the problems
    expect(within(panel()).getByRole('status').textContent).toBe(
      'Validate the expressions first (F10)',
    );
    EXTEND_EDITOR_NOTES.forEach((note) =>
      expect(within(panel()).getByText(note)).toBeTruthy(),
    );
    expect(state.nodeEditor.draft).toBeInstanceOf(CubeExtendDraft);
  });

  test("Writes an input column's access into the expression last used", async () => {
    const { state } = await render();
    fireEvent.click(
      within(
        within(panel()).getByRole('list', { name: 'Input columns' }),
      ).getByRole('button', { name: /^ORDER_ID/u }),
    );
    expect(draftOf(state).rows[0]?.code).toBe('x | $x.ORDER_ID');
  });

  test('Validates, shows each type, then Apply stores the typed node', async () => {
    const { state, fake } = await render();
    const draft = draftOf(state);
    act(() => draft.setCode(draft.rows[0]?.key ?? 0, 'x | $x.ORDER_ID + 1'));
    fireEvent.click(button('Validate'));
    await within(panel()).findByText('Integer, can be empty');
    expect(fake.planLambda).toHaveBeenCalledTimes(1);
    expect(button('Apply').disabled).toBe(false);
    fireEvent.click(button('Apply'));
    const stored = state.document.query.getNode('extend101') as Extend;
    expect(stored.typing.kind).toBe('typed');
    expect(stored.columns.map(({ name, code }) => [name, code])).toEqual([
      ['col_1', 'x | $x.ORDER_ID + 1'],
    ]);
    expect(state.analysis.validity.get('extend101')).toEqual([]);
    expect(state.history).toHaveLength(1);
  });

  test('Shows a problem under its expression, with a hint for a column that can be empty', async () => {
    const { state, fake } = await render();
    fake.typeLambdas.mockImplementation(
      async (_model, lambdas) =>
        new Map(
          [...lambdas.keys()].map((key) => [
            key,
            new CubeEngineError(
              CubeEngineErrorKind.COMPILE,
              'Collection element must have a multiplicity [1]',
              'extend101',
            ),
          ]),
        ),
    );
    const draft = draftOf(state);
    act(() => draft.setCode(draft.rows[0]?.key ?? 0, 'x | $x.SHIP_VIA + 1'));
    fireEvent.click(button('Validate'));
    await within(panel()).findByText(
      'Collection element must have a multiplicity [1]',
    );
    expect(
      within(panel()).getByText(
        'A column that can be empty needs ->toOne() first, such as $x.QTY->toOne() + 1.',
      ),
    ).toBeTruthy();
    await waitFor(() => expect(button('Validate').disabled).toBe(false));
  });

  test('Underlines a problem the engine located in its code', async () => {
    const { state, fake } = await render();
    const draft = draftOf(state);
    const key = draft.rows[0]?.key ?? 0;
    act(() => draft.setCode(key, 'x | $x.ORDER_ID +'));
    fake.parseExpression.mockRejectedValueOnce(
      new CubeEngineError(
        CubeEngineErrorKind.COMPILE,
        "no viable alternative at input '+'",
        undefined,
        undefined,
        {
          sourceId: `extend101:${key}`,
          startLine: 1,
          startColumn: 17,
          endLine: 1,
          endColumn: 17,
        },
      ),
    );
    MockedMonacoEditorAPI.setModelMarkers.mockClear();
    fireEvent.click(button('Validate'));
    await within(panel()).findByText("no viable alternative at input '+'");
    await waitFor(() =>
      expect(MockedMonacoEditorAPI.setModelMarkers).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        [
          expect.objectContaining({
            message: "no viable alternative at input '+'",
            startLineNumber: 1,
            startColumn: 17,
            endLineNumber: 1,
            // the code editor's end is past the last character
            endColumn: 18,
          }),
        ],
      ),
    );
  });
});
