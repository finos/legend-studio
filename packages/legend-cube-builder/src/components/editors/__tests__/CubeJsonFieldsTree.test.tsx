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
  Extend,
  MESSAGE_VARIANT_UNSUPPORTED_DATABASE,
  type QueryNode,
  Query,
} from '@finos/legend-cube';
import { MockedMonacoEditorInstance } from '@finos/legend-lego/code-editor/test';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { CUBE_JSON_FIELDS_TITLE } from '../../../__lib__/LegendCubeLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import { TEST__findCanvasNode } from '../../../__test-utils__/CubeCanvasTestUtils.js';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
} from '../../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import {
  TEST__PAYLOAD_COLUMNS,
  TEST__payloadSample,
} from '../../../__test-utils__/CubeVariantTestUtils.js';
import {
  createFakeNorthwindOutline,
  type FakeCubeEngine,
} from '../../../__test-utils__/FakeCubeEngine.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import type { CubeExpressionFilterDraft } from '../../../stores/editors/CubeExpressionFilterDraft.js';
import type { CubeExtendDraft } from '../../../stores/editors/CubeExtendDraft.js';
import { CUBE_NORTHWIND_MODEL } from '../../../stores/fixtures/CubeNorthwindModel.js';
import { CubeCanvas } from '../../canvas/CubeCanvas.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

/** ORDERS with a PAYLOAD, then the node, captured and never run, its editor open */
const render = async (
  node: QueryNode,
  databaseType = 'DuckDB',
): Promise<{ state: CubeEditorState; fake: FakeCubeEngine }> => {
  const { host, fake } = TEST__createCubeHost({
    result: TEST__payloadSample(),
    outline: createFakeNorthwindOutline(databaseType),
  });
  const state = new CubeEditorState(
    host,
    new CubeDocument({
      context: CONTEXT,
      query: new Query(
        [
          northwindTable('relational101', 'ORDERS', TEST__PAYLOAD_COLUMNS),
          node,
        ],
        [new Connection('relational101', node.id, 'tds')],
        node.id,
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
  fireEvent.click(await TEST__findCanvasNode(node.id));
  await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
  return { state, fake };
};

const panel = (): HTMLElement =>
  screen.getByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);

const button = (name: string): HTMLButtonElement =>
  within(panel()).getByRole<HTMLButtonElement>('button', { name });

/** Opens PAYLOAD's fields, read from the sample */
const openPayload = async (): Promise<HTMLElement> => {
  fireEvent.click(button('Fields of PAYLOAD'));
  return within(panel()).findByRole('list', { name: 'Fields of PAYLOAD' });
};

beforeEach(() => {
  localStorage.clear();
  // the mocked code editor holds no text of its own
  MockedMonacoEditorInstance.getValue.mockReturnValue('');
});

describe("A Variant column's fields in the Extend editor (PLAN §11.20, V.9)", () => {
  test('Opens from the JSON column only, read before the step with no run of the cube, and writes a field into the expression', async () => {
    const { state, fake } = await render(new Extend('extend101'));
    // no run yet: the rows aren't needed
    expect(fake.execute).not.toHaveBeenCalled();
    expect(
      within(panel()).queryByRole('button', { name: 'Fields of ORDER_ID' }),
    ).toBeNull();
    expect(button('Fields of PAYLOAD').title).toBe(CUBE_JSON_FIELDS_TITLE.OPEN);
    const tree = await openPayload();
    expect(fake.execute).toHaveBeenCalledTimes(1);
    expect(
      within(
        within(panel()).getByLabelText('Fields of PAYLOAD, read'),
      ).getByRole('status').textContent,
    ).toBe('All 2 values read, just before this step');
    expect(
      within(tree)
        .getAllByRole('button', { name: /^Write / })
        .map((each) => each.getAttribute('aria-label')),
    ).toEqual([
      'Write PAYLOAD',
      'Write PAYLOAD.tags',
      'Write PAYLOAD.user',
      'Write PAYLOAD.user.name',
      'Write PAYLOAD.user.tier',
    ]);
    fireEvent.click(
      within(tree).getByRole('button', { name: 'Write PAYLOAD.user.tier' }),
    );
    const draft = state.nodeEditor.draft as CubeExtendDraft;
    expect(draft.rows.map((row) => row.code)).toEqual([
      "x | $x.PAYLOAD->get('user')->get('tier')->to(@String)",
    ]);
  });

  test('Adds a field as a new column in place of a blank one, named freely, and writes its other forms', async () => {
    const { state } = await render(new Extend('extend101'));
    const tree = await openPayload();
    fireEvent.click(
      within(tree).getByRole('button', {
        name: 'Add PAYLOAD.user.name as a column',
      }),
    );
    const draft = state.nodeEditor.draft as CubeExtendDraft;
    expect(draft.rows.map(({ name, code }) => [name, code])).toEqual([
      [
        'PAYLOAD_user_name',
        "x | $x.PAYLOAD->get('user')->get('name')->to(@String)",
      ],
    ]);
    // the forms of an array: one row per element is a step of its own
    fireEvent.click(
      within(tree).getByRole('button', { name: 'Other forms of PAYLOAD.tags' }),
    );
    const forms = within(tree).getByRole('list', {
      name: 'Forms of PAYLOAD.tags',
    });
    const explode = within(forms).getByRole<HTMLButtonElement>('button', {
      name: /one row per element/u,
    });
    expect(explode.disabled).toBe(true);
    expect(explode.title).toBe(CUBE_JSON_FIELDS_TITLE.EXPLODE);
    fireEvent.click(
      within(forms).getByRole('button', { name: /number of elements/u }),
    );
    expect(draft.rows.at(-1)?.code).toBe(
      "x | $x.PAYLOAD->get('user')->get('name')->to(@String) $x.PAYLOAD->get('tags')->toMany(@Variant)->size()",
    );
  });

  test('Folds a field, finds fields by their keys, and closes', async () => {
    await render(new Extend('extend101'));
    const tree = await openPayload();
    fireEvent.click(
      within(tree).getByRole('button', { name: 'Fold PAYLOAD.user' }),
    );
    expect(
      within(tree).queryByRole('button', { name: 'Write PAYLOAD.user.tier' }),
    ).toBeNull();
    fireEvent.change(within(panel()).getByLabelText('Find a field'), {
      target: { value: 'zzz' },
    });
    expect(within(panel()).getByText('No field matches.')).toBeDefined();
    fireEvent.click(button('Fields of PAYLOAD'));
    expect(within(panel()).queryByLabelText('Find a field')).toBeNull();
  });

  test("Is greyed, with the reason, where the database can't read JSON", async () => {
    await render(new Extend('extend101'), 'H2');
    await waitFor(() =>
      expect(button('Fields of PAYLOAD').disabled).toBe(true),
    );
    expect(button('Fields of PAYLOAD').title).toBe(
      MESSAGE_VARIANT_UNSUPPORTED_DATABASE('H2'),
    );
  });
});

describe("A Variant column's fields in the Filter by Expression editor (PLAN §11.20, V.9)", () => {
  test('Writes a field into the condition, with no column to add', async () => {
    const { state } = await render(new ExpressionFilter('expressionFilter101'));
    const tree = await openPayload();
    expect(
      within(tree).queryByRole('button', { name: /as a column$/u }),
    ).toBeNull();
    fireEvent.click(
      within(tree).getByRole('button', { name: 'Write PAYLOAD.user.name' }),
    );
    expect((state.nodeEditor.draft as CubeExpressionFilterDraft).code).toBe(
      "x | $x.PAYLOAD->get('user')->get('name')->to(@String)",
    );
  });
});
