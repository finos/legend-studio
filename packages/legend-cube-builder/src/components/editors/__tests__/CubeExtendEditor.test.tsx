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
  MockedMonacoEditorLanguagesAPI,
  MockedMonacoEditorModel,
} from '@finos/legend-lego/code-editor/test';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  EXTEND_EDITOR_NOTES,
  EXTEND_ROW_WAITING_ON_OTHERS,
} from '../../../__lib__/LegendCubeLabels.js';
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
import { TEST__parsedExpression } from '../../../__test-utils__/CubeExpressionParseTestUtils.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../../graph-manager/CubeEngine.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CubeExtendDraft } from '../../../stores/editors/CubeExtendDraft.js';
import { CUBE_NORTHWIND_MODEL } from '../../../stores/fixtures/CubeNorthwindModel.js';
import { CubeCodeCheckStatus } from '../../../stores/editors/CubeExpressionAutoCheck.js';
import { CUBE_CODE_CHECK_LABEL } from '../CubeCodeCheck.js';
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
  // the engine's own parse, where it was captured
  fake.parseExpression.mockImplementation(
    async (code) =>
      TEST__parsedExpression(code) ?? {
        lambda: lambdaOf(code),
        located: lambdaOf(code),
      },
  );
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
  test('Shows a new column to write, and waits for its check before Apply', async () => {
    const { state } = await render();
    expect(
      within(panel()).getByLabelText<HTMLInputElement>('Column name 1').value,
    ).toBe('col_1');
    expect(within(panel()).getByLabelText('Expression 1')).toBeTruthy();
    expect(
      within(panel()).getByText(CUBE_CODE_CHECK_LABEL.UNEDITED),
    ).toBeTruthy();
    // a new column, never edited, isn't checked, nor marked
    expect(
      within(panel())
        .getByLabelText('Expression 1')
        .getAttribute('data-check-status'),
    ).toBe(CubeCodeCheckStatus.UNEDITED);
    // no button: the code is checked once typing pauses
    expect(
      within(panel()).queryByRole('button', { name: 'Validate' }),
    ).toBeNull();
    const apply = button('Apply');
    expect(apply.disabled).toBe(true);
    expect(apply.title).toBe(
      'Wait for the expressions to be checked, once you stop typing (F10 checks them at once)',
    );
    // in place of the problems
    expect(within(panel()).getByRole('status').textContent).toBe(
      'Wait for the expressions to be checked, once you stop typing (F10 checks them at once)',
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

  test("Writes an input column's access at the cursor of the expression last used, at the end of one never clicked into", async () => {
    const { state } = await render();
    fireEvent.click(button('Add column'));
    const chip = (): HTMLElement =>
      within(
        within(panel()).getByRole('list', { name: 'Input columns' }),
      ).getByRole('button', { name: /^ORDER_ID/u });
    const cursor = {
      startLineNumber: 1,
      startColumn: 5,
      endLineNumber: 1,
      endColumn: 5,
    };
    MockedMonacoEditorInstance.executeEdits.mockClear();
    // the first expression clicked into, then the second's name
    fireEvent.focus(within(panel()).getByLabelText('Expression 1'));
    fireEvent.focus(within(panel()).getByLabelText('Column name 2'));
    fireEvent.click(chip());
    expect(MockedMonacoEditorInstance.executeEdits).not.toHaveBeenCalled();
    expect(draftOf(state).rows[1]?.code).toBe('x | $x.ORDER_ID');
    // back to the first: at its cursor
    fireEvent.focus(within(panel()).getByLabelText('Expression 1'));
    MockedMonacoEditorInstance.getSelection.mockReturnValueOnce(cursor);
    MockedMonacoEditorModel.getValueInRange
      .mockReturnValueOnce(' ')
      .mockReturnValueOnce('');
    fireEvent.click(chip());
    expect(MockedMonacoEditorInstance.executeEdits).toHaveBeenCalledWith(
      'insert',
      [{ range: cursor, text: '$x.ORDER_ID', forceMoveMarkers: true }],
    );
    expect(draftOf(state).rows[0]?.code).toBe('x | ');
  });

  test("Warns under a row where Pure's precedence reads its expression other than likely meant, with its fix, and flags a column that can be empty", async () => {
    const { state } = await render();
    const [row] = draftOf(state).rows;
    act(() =>
      draftOf(state).setCode(row?.key as number, 'x | $x.FREIGHT + 1 == 3'),
    );
    const warning = await within(panel()).findByLabelText('Precedence warning');
    expect(
      within(warning).getByText('Pure reads this as $x.FREIGHT + (1 == 3)'),
    ).toBeTruthy();
    // FREIGHT can be empty, in arithmetic: the outline shows at once
    const outline = within(panel()).getByRole('list', {
      name: 'Outline of expression 1',
    });
    expect(within(outline).getByText('can be empty')).toBeTruthy();
    MockedMonacoEditorInstance.executeEdits.mockClear();
    fireEvent.click(
      within(warning).getByRole('button', {
        name: 'Use ($x.FREIGHT + 1) == 3',
      }),
    );
    expect(MockedMonacoEditorInstance.executeEdits).toHaveBeenCalledWith(
      'edit',
      [
        {
          range: {
            startLineNumber: 1,
            startColumn: 5,
            endLineNumber: 1,
            endColumn: 5,
          },
          text: '(',
          forceMoveMarkers: true,
        },
        {
          range: {
            startLineNumber: 1,
            startColumn: 19,
            endLineNumber: 1,
            endColumn: 19,
          },
          text: ')',
          forceMoveMarkers: true,
        },
      ],
    );
  });

  test("Offers the columns an expression can read as it is typed, the input's and the new ones above it, while its editor has the focus, then the engine's completions", async () => {
    const { state, fake } = await render();
    fake.completeCode.mockResolvedValue([
      { completion: 'ORDER_ID', display: 'ORDER_ID' },
      { completion: 'meta::pure::functions', display: 'meta' },
    ]);
    act(() =>
      draftOf(state).setName(draftOf(state).rows[0]?.key ?? 0, 'TOTAL'),
    );
    MockedMonacoEditorInstance.onDidFocusEditorText.mockClear();
    MockedMonacoEditorLanguagesAPI.registerCompletionItemProvider.mockClear();
    fireEvent.click(button('Add column'));
    await within(panel()).findByLabelText('Expression 2');
    // the second row's editor gets the focus
    const [onFocus] = MockedMonacoEditorInstance.onDidFocusEditorText.mock
      .calls[0] as [() => void];
    act(() => onFocus());
    const [language, provider] = MockedMonacoEditorLanguagesAPI
      .registerCompletionItemProvider.mock.calls[0] as [
      string,
      {
        triggerCharacters: string[];
        provideCompletionItems: (
          model: unknown,
          position: unknown,
        ) => Promise<{ suggestions: { label: string; detail?: string }[] }>;
      },
    ];
    expect(language).toBe('pure');
    expect(provider.triggerCharacters).toEqual(['.', '>', '$']);
    const { suggestions } = await provider.provideCompletionItems(
      { getValueInRange: () => 'x | $x.' },
      { lineNumber: 1, column: 8 },
    );
    expect(suggestions.map((each) => each.label)).toEqual([
      ...ORDERS_COLUMNS.map((column) => column.name),
      'TOTAL',
      // the engine's, but those Cube offers already
      'meta',
    ]);
    // written as a new column of the input, after the rows above it
    expect(fake.completeCode).toHaveBeenCalledWith(
      CONTEXT.model,
      expect.anything(),
      '->extend(~TOTAL:x | )->extend(~col_1:x | $x.',
    );
  });

  test('Checks the expressions once typing pauses, shows each type with a green border, then Apply stores the typed node', async () => {
    const { state, fake } = await render();
    const draft = draftOf(state);
    act(() => draft.setCode(draft.rows[0]?.key ?? 0, 'x | $x.ORDER_ID + 1'));
    await within(panel()).findByText('Integer, optional');
    expect(
      within(panel())
        .getByLabelText('Expression 1')
        .getAttribute('data-check-status'),
    ).toBe(CubeCodeCheckStatus.READY);
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
    await within(panel()).findByText(
      'Collection element must have a multiplicity [1]',
    );
    expect(
      within(panel()).getByText(
        'An optional column needs ->toOne() first, such as $x.QTY->toOne() + 1.',
      ),
    ).toBeTruthy();
    await waitFor(() => expect(draftOf(state).validating).toBe(false));
  });

  test("Says a column read waits on another column's problem, as the columns are typed together", async () => {
    const { state, fake } = await render();
    const draft = draftOf(state);
    act(() => draft.addRow());
    const [first, second] = draft.rows.map((row) => row.key);
    fake.parseExpression.mockImplementation(async (code) => {
      if (code.endsWith('+')) {
        throw new CubeEngineError(
          CubeEngineErrorKind.COMPILE,
          "no viable alternative at input '+'",
        );
      }
      return { lambda: lambdaOf(code), located: lambdaOf(code) };
    });
    act(() => {
      draft.setCode(first ?? 0, 'x | $x.ORDER_ID + 1');
      draft.setCode(second ?? 0, 'x | $x.ORDER_ID +');
    });
    await within(panel()).findByText("no viable alternative at input '+'");
    expect(
      within(panel()).getByText(EXTEND_ROW_WAITING_ON_OTHERS),
    ).toBeTruthy();
    expect(
      within(panel()).queryByText(CUBE_CODE_CHECK_LABEL.CHECKING),
    ).toBeNull();
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
