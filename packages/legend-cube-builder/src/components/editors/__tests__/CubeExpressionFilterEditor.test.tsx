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
  ExpressionFilter,
  type JsonObject,
  MESSAGE_CONDITION_BACKSLASH,
  MESSAGE_CONDITION_NOT_BOOLEAN,
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
import {
  EXPRESSION_FILTER_EDITOR_NOTES,
  EXPRESSION_FILTER_PARENTHESES_HINT,
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
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../../graph-manager/CubeEngine.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CubeExpressionFilterDraft } from '../../../stores/editors/CubeExpressionFilterDraft.js';
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

/** The condition alone, typed as this type */
const typedAs = (type: string): Schema =>
  new Schema([
    ...ORDERS_COLUMNS,
    new SchemaColumn('cube_condition', PrimitiveType.get(type), false),
  ]);

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
          key.endsWith('#filter')
            ? new Schema(ORDERS_COLUMNS)
            : typedAs('Boolean'),
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
          new ExpressionFilter('expressionFilter101'),
        ],
        [new Connection('relational101', 'expressionFilter101', 'tds')],
        'expressionFilter101',
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
  fireEvent.click(await TEST__findCanvasNode('expressionFilter101'));
  await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
  return { state, fake };
};

const panel = (): HTMLElement =>
  screen.getByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);

const button = (name: string | RegExp): HTMLButtonElement =>
  within(panel()).getByRole<HTMLButtonElement>('button', { name });

const draftOf = (state: CubeEditorState): CubeExpressionFilterDraft =>
  state.nodeEditor.draft as CubeExpressionFilterDraft;

beforeEach(() => {
  localStorage.clear();
  // the mocked code editor holds no text of its own
  MockedMonacoEditorInstance.getValue.mockReturnValue('');
});

describe('Filter by Expression editor', () => {
  test('Shows a condition to write, and waits for its check before Apply', async () => {
    const { state } = await render();
    expect(within(panel()).getByLabelText('Condition')).toBeTruthy();
    expect(
      within(panel()).getByText(CUBE_CODE_CHECK_LABEL.UNEDITED),
    ).toBeTruthy();
    // a new condition, never edited, isn't checked, nor marked
    expect(
      within(panel())
        .getByLabelText('Condition')
        .getAttribute('data-check-status'),
    ).toBe(CubeCodeCheckStatus.UNEDITED);
    // no button: the code is checked once typing pauses
    expect(
      within(panel()).queryByRole('button', { name: 'Validate' }),
    ).toBeNull();
    const apply = button('Apply');
    expect(apply.disabled).toBe(true);
    expect(apply.title).toBe(
      'Wait for the condition to be checked, once you stop typing (F10 checks it at once)',
    );
    // in place of the problems
    expect(within(panel()).getByRole('status').textContent).toBe(
      'Wait for the condition to be checked, once you stop typing (F10 checks it at once)',
    );
    EXPRESSION_FILTER_EDITOR_NOTES.forEach((note) =>
      expect(within(panel()).getByText(note)).toBeTruthy(),
    );
    expect(state.nodeEditor.draft).toBeInstanceOf(CubeExpressionFilterDraft);
    expect(draftOf(state).code).toBe('x | ');
  });

  test("Writes an input column's access at the end of the condition", async () => {
    const { state } = await render();
    fireEvent.click(
      within(
        within(panel()).getByRole('list', { name: 'Input columns' }),
      ).getByRole('button', { name: /^SHIPPED_DATE/u }),
    );
    expect(draftOf(state).code).toBe('x | $x.SHIPPED_DATE');
  });

  test('Checks the condition once typing pauses, says so with a green border, then Apply stores the checked node', async () => {
    const { state, fake } = await render();
    act(() => draftOf(state).setCode('x | $x.SHIPPED_DATE > $x.REQUIRED_DATE'));
    // checking, then ready
    expect(
      within(panel())
        .getByLabelText('Condition')
        .getAttribute('data-check-status'),
    ).toBe(CubeCodeCheckStatus.CHECKING);
    await within(panel()).findByText(
      'One Boolean of a row: the rows for which it is true are kept',
    );
    expect(
      within(panel())
        .getByLabelText('Condition')
        .getAttribute('data-check-status'),
    ).toBe(CubeCodeCheckStatus.READY);
    expect(fake.parseExpression).toHaveBeenCalledTimes(1);
    expect(fake.planLambda).toHaveBeenCalledTimes(1);
    expect(button('Apply').disabled).toBe(false);
    fireEvent.click(button('Apply'));
    const stored = state.document.query.getNode(
      'expressionFilter101',
    ) as ExpressionFilter;
    expect(stored.check.kind).toBe('checked');
    expect(stored.code).toBe('x | $x.SHIPPED_DATE > $x.REQUIRED_DATE');
    expect(state.analysis.validity.get('expressionFilter101')).toEqual([]);
    expect(state.history).toHaveLength(1);
  });

  test("Says when the condition isn't one Boolean, and hints at parentheses for an and of a number", async () => {
    const { state, fake } = await render();
    const noMatch = (message: string): CubeEngineError =>
      new CubeEngineError(
        CubeEngineErrorKind.COMPILE,
        message,
        'expressionFilter101',
      );
    fake.typeLambdas.mockImplementation(
      async (_model, lambdas) =>
        new Map(
          [...lambdas.keys()].map((key) => [
            key,
            key.endsWith('#filter')
              ? noMatch("Can't find a match for function 'filter(…)'")
              : typedAs('Integer'),
          ]),
        ),
    );
    act(() => draftOf(state).setCode('x | $x.ORDER_ID + 1'));
    // under the code, and in the problems Apply would leave the node with
    expect(
      await within(panel()).findAllByText(
        MESSAGE_CONDITION_NOT_BOOLEAN('Integer'),
      ),
    ).toHaveLength(2);
    await waitFor(() => expect(draftOf(state).validating).toBe(false));

    const precedence = noMatch(
      "Can't find a match for function 'and(Boolean[1],SmallInt[1])'",
    );
    fake.typeLambdas.mockImplementation(
      async (_model, lambdas) =>
        new Map([...lambdas.keys()].map((key) => [key, precedence])),
    );
    act(() => draftOf(state).setCode('x | $x.ORDER_ID > 1 && $x.SHIP_VIA > 3'));
    await within(panel()).findByText(EXPRESSION_FILTER_PARENTHESES_HINT);
  });

  test('Says a condition Cube refuses before the engine once, in the problems', async () => {
    const { state, fake } = await render();
    const X = { _type: 'var', name: 'x' };
    const like: JsonObject = {
      _type: 'lambda',
      parameters: [X],
      body: [
        {
          _type: 'func',
          function: 'startsWith',
          parameters: [
            { _type: 'property', property: 'SHIP_NAME', parameters: [X] },
            { _type: 'string', value: 'a\\' },
          ],
        },
      ],
    };
    fake.parseExpression.mockResolvedValueOnce({ lambda: like, located: like });
    act(() => draftOf(state).setCode("x | $x.SHIP_NAME->startsWith('a\\\\')"));
    await waitFor(() =>
      expect(
        within(panel()).getAllByText(MESSAGE_CONDITION_BACKSLASH('startsWith')),
      ).toHaveLength(1),
    );
    expect(fake.typeLambdas).not.toHaveBeenCalled();
  });

  test('Underlines a problem the engine located in its code', async () => {
    const { state, fake } = await render();
    act(() => draftOf(state).setCode('x | $x.ORDER_ID >'));
    fake.parseExpression.mockRejectedValueOnce(
      new CubeEngineError(
        CubeEngineErrorKind.COMPILE,
        "no viable alternative at input '>'",
        undefined,
        undefined,
        {
          sourceId: 'expressionFilter101:condition',
          startLine: 1,
          startColumn: 17,
          endLine: 1,
          endColumn: 17,
        },
      ),
    );
    MockedMonacoEditorAPI.setModelMarkers.mockClear();
    await within(panel()).findByText("no viable alternative at input '>'");
    expect(
      within(panel())
        .getByLabelText('Condition')
        .getAttribute('data-check-status'),
    ).toBe(CubeCodeCheckStatus.PROBLEM);
    await waitFor(() =>
      expect(MockedMonacoEditorAPI.setModelMarkers).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        [
          expect.objectContaining({
            message: "no viable alternative at input '>'",
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
