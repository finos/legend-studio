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
  Explode,
  MESSAGE_CANNOT_BE_EMPTY,
  MESSAGE_DOES_NOT_HAVE_A_NAME,
  MESSAGE_NEW_COLUMN_NAME_EMPTY,
  MESSAGE_VARIANT_UNSUPPORTED_DATABASE,
  Query,
} from '@finos/legend-cube';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import {
  EXPLODE_COLUMN_DISABLED_REASON,
  EXPLODE_EDITOR_NOTES,
  EXPLODE_NO_ARRAYS_NOTICE,
} from '../../../__lib__/LegendCubeLabels.js';
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
import { CUBE_NORTHWIND_MODEL } from '../../../stores/fixtures/CubeNorthwindModel.js';
import { CubeCanvas } from '../../canvas/CubeCanvas.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

/** ORDERS with a PAYLOAD, then a new Explode Array, captured, on a cube of the database type, its editor open */
const render = async (
  databaseType = 'DuckDB',
): Promise<{ editorState: CubeEditorState; fake: FakeCubeEngine }> => {
  const { host, fake } = TEST__createCubeHost({
    outline: createFakeNorthwindOutline(databaseType),
  });
  const editorState = new CubeEditorState(
    host,
    new CubeDocument({
      context: CONTEXT,
      query: new Query(
        [
          northwindTable('relational101', 'ORDERS', TEST__PAYLOAD_COLUMNS),
          new Explode('explode101'),
        ],
        [new Connection('relational101', 'explode101', 'tds')],
        'explode101',
      ),
    }),
  );
  await TEST__renderInCubeApplication(
    <div style={{ display: 'flex' }}>
      <div style={{ width: 800, height: 400 }}>
        <CubeCanvas editorState={editorState} />
      </div>
    </div>,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.CANVAS,
  );
  fireEvent.click(await TEST__findCanvasNode('explode101'));
  await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
  return { editorState, fake };
};

const panel = (): HTMLElement =>
  screen.getByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);

const problems = (): string[] =>
  Array.from(
    within(panel()).queryByRole('alert', { name: 'Problems' })?.children ?? [],
  ).map((problem) => problem.textContent ?? '');

const field = (label: string): HTMLInputElement =>
  within(panel()).getByLabelText<HTMLInputElement>(label);

const type = (label: string, value: string): void => {
  fireEvent.change(field(label), { target: { value } });
};

beforeEach(() => {
  localStorage.clear();
});

describe('Explode Array editor (PLAN §11.20)', () => {
  test('Picks the JSON column, finds its arrays in a sample, picks one, and Apply stores the explode', async () => {
    const { editorState, fake } = await render();
    expect(problems()).toEqual([
      MESSAGE_DOES_NOT_HAVE_A_NAME('Explode column'),
      MESSAGE_NEW_COLUMN_NAME_EMPTY,
    ]);
    // only a Variant column can be exploded
    const options = Array.from(
      within(panel()).getByLabelText<HTMLSelectElement>('Explode column')
        .options,
    );
    expect(
      options.find((option) => option.value === 'ORDER_ID')?.text,
    ).toContain(EXPLODE_COLUMN_DISABLED_REASON.NOT_JSON);
    type('Explode column', 'PAYLOAD');
    expect(field('New column name').value).toBe('PAYLOAD_element');

    fake.execute.mockResolvedValueOnce(
      TEST__payloadSample([
        '{"tags":["a","b"],"user":{"roles":["x"]}}',
        '{"tags":[],"user":{}}',
      ]),
    );
    fireEvent.click(
      within(panel()).getByRole('button', { name: 'Find arrays' }),
    );
    const arrays = await within(panel()).findByRole('list', {
      name: 'Arrays found',
    });
    expect(
      within(arrays)
        .getAllByRole('button')
        .map((button) => button.getAttribute('aria-label')),
    ).toEqual(['Array PAYLOAD › tags', 'Array PAYLOAD › user › roles']);
    fireEvent.click(
      within(arrays).getByRole('button', { name: 'Array PAYLOAD › tags' }),
    );
    expect(field('Path key 1').value).toBe('tags');
    expect(field('New column name').value).toBe('tags_element');
    expect(problems()).toEqual([]);

    fireEvent.click(within(panel()).getByRole('button', { name: 'Apply' }));
    const stored = editorState.document.query.getNode('explode101') as Explode;
    expect([stored.column, stored.path, stored.name]).toEqual([
      'PAYLOAD',
      ['tags'],
      'tags_element',
    ]);
    expect(editorState.analysis.schemas.get('explode101')?.names()).toEqual([
      'ORDER_ID',
      'PAYLOAD',
      'PAYLOAD_TAGS_COUNT',
      'tags_element',
    ]);
    expect(
      await within(await TEST__findCanvasNode('explode101')).findByText(
        'Explode Array "PAYLOAD" › "tags" into "tags_element"',
      ),
    ).toBeDefined();
  });

  test('Takes typed keys and a typed name, reporting an empty key, and says when a sample holds no array', async () => {
    const { fake } = await render();
    type('Explode column', 'PAYLOAD');
    fireEvent.click(within(panel()).getByRole('button', { name: 'Add key' }));
    expect(problems()).toEqual([MESSAGE_CANNOT_BE_EMPTY('Path key')]);
    type('Path key 1', 'items');
    type('New column name', 'item');
    expect(problems()).toEqual([]);
    fireEvent.click(
      within(panel()).getByRole('button', { name: 'Remove path key 1' }),
    );
    expect(within(panel()).queryByLabelText('Path key 1')).toBeNull();
    expect(field('New column name').value).toBe('item');

    fake.execute.mockResolvedValueOnce(TEST__payloadSample(['{"n":1}']));
    fireEvent.click(
      within(panel()).getByRole('button', { name: 'Find arrays' }),
    );
    expect(
      await within(panel()).findByText(EXPLODE_NO_ARRAYS_NOTICE),
    ).toBeDefined();
    EXPLODE_EDITOR_NOTES.forEach((note) =>
      expect(within(panel()).getByText(note)).toBeDefined(),
    );
  });

  test("Shows on an H2 cube that its database can't read JSON, and reads no sample there", async () => {
    await render('H2');
    type('Explode column', 'PAYLOAD');
    await waitFor(() =>
      expect(problems()).toContain(MESSAGE_VARIANT_UNSUPPORTED_DATABASE('H2')),
    );
    const find = within(panel()).getByRole<HTMLButtonElement>('button', {
      name: 'Find arrays',
    });
    expect(find.disabled).toBe(true);
    expect(find.title).toBe(MESSAGE_VARIANT_UNSUPPORTED_DATABASE('H2'));
  });
});
