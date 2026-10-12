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
  MESSAGE_CANNOT_BE_EMPTY,
  MESSAGE_PIVOT_UNSUPPORTED_DATABASE,
  Pivot,
  Query,
} from '@finos/legend-cube';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import {
  PIVOT_COLUMN_DISABLED_REASON,
  PIVOT_EDITOR_NOTES,
  PIVOT_VALUE_DISABLED_REASON,
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
import {
  createFakeNorthwindOutline,
  type FakeCubeEngine,
} from '../../../__test-utils__/FakeCubeEngine.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../../../stores/fixtures/CubeNorthwindModel.js';
import { CubeCanvas } from '../../canvas/CubeCanvas.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

/** ORDERS, then a new Pivot, captured, on a cube of the database type, its editor open */
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
          northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
          new Pivot('pivot101'),
        ],
        [new Connection('relational101', 'pivot101', 'tds')],
        'pivot101',
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
  fireEvent.click(await TEST__findCanvasNode('pivot101'));
  await screen.findByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);
  return { editorState, fake };
};

const panel = (): HTMLElement =>
  screen.getByTestId(LEGEND_CUBE_TEST_ID.NODE_EDITOR);

const problems = (): string[] =>
  Array.from(
    within(panel()).queryByRole('alert', { name: 'Problems' })?.children ?? [],
  ).map((problem) => problem.textContent ?? '');

const pick = (label: string, value: string): void => {
  fireEvent.change(within(panel()).getByLabelText(label), {
    target: { value },
  });
};

const optionText = (label: string, value: string): string | undefined =>
  Array.from(
    within(panel()).getByLabelText<HTMLSelectElement>(label).options,
  ).find((option) => option.value === value)?.text;

beforeEach(() => {
  localStorage.clear();
});

describe('Pivot editor', () => {
  test('Picks the pivot column, loads its values, ticks some, sums a column by the rows, and Apply stores the pivot', async () => {
    const { editorState, fake } = await render();
    expect(problems()).toEqual(['Pivot column does not have a name.']);
    // a float can't be pivoted
    expect(optionText('Pivot column', 'FREIGHT')).toContain(
      PIVOT_COLUMN_DISABLED_REASON.NOT_PIVOTABLE,
    );
    pick('Pivot column', 'SHIP_VIA');
    expect(problems()).toEqual([MESSAGE_CANNOT_BE_EMPTY('Pivot values')]);

    fake.execute.mockResolvedValueOnce({
      columns: ['SHIP_VIA'],
      rows: [['1'], ['2'], ['3']],
      sql: [],
      durationMs: 1,
    });
    fireEvent.click(
      within(panel()).getByRole('button', { name: 'Load values' }),
    );
    const values = await within(panel()).findByRole('list', { name: 'Values' });
    const boxes = within(values).getAllByRole('checkbox');
    expect(boxes.map((box) => box.closest('label')?.textContent)).toEqual([
      '1',
      '2',
      '3',
    ]);
    fireEvent.click(boxes[2] as HTMLElement);
    fireEvent.click(boxes[0] as HTMLElement);

    fireEvent.click(
      within(
        within(panel()).getByRole('list', { name: 'Row columns' }),
      ).getByText('SHIP_COUNTRY'),
    );
    pick('Aggregation function', 'Sum');
    pick('Aggregation column', 'FREIGHT');
    expect(problems()).toEqual([]);

    fireEvent.click(within(panel()).getByRole('button', { name: 'Apply' }));
    const stored = editorState.document.query.getNode('pivot101') as Pivot;
    expect(stored.rows).toEqual(['SHIP_COUNTRY']);
    expect(stored.column).toBe('SHIP_VIA');
    expect(stored.values).toEqual([
      { kind: 'integer', value: '1' },
      { kind: 'integer', value: '3' },
    ]);
    expect(stored.aggregation).toEqual({ function: 'Sum', column: 'FREIGHT' });
    expect(editorState.analysis.schemas.get('pivot101')?.names()).toEqual([
      'SHIP_COUNTRY',
      '1',
      '3',
    ]);
    expect(
      await within(await TEST__findCanvasNode('pivot101')).findByText(
        'Pivot "SHIP_VIA" into 1, 3',
      ),
    ).toBeDefined();
  });

  test('Greys a value differing only in case from one ticked, saying why', async () => {
    const { fake } = await render();
    pick('Pivot column', 'SHIP_COUNTRY');
    fake.execute.mockResolvedValueOnce({
      columns: ['SHIP_COUNTRY'],
      rows: [['FR'], ['Fr']],
      sql: [],
      durationMs: 1,
    });
    fireEvent.click(
      within(panel()).getByRole('button', { name: 'Load values' }),
    );
    const values = await within(panel()).findByRole('list', { name: 'Values' });
    const [fr, mixed] = within(values).getAllByRole('checkbox') as [
      HTMLInputElement,
      HTMLInputElement,
    ];
    fireEvent.click(fr);
    expect(mixed.disabled).toBe(true);
    expect(mixed.closest('label')?.title).toBe(
      PIVOT_VALUE_DISABLED_REASON.DIFFERS_ONLY_IN_CASE,
    );
    fireEvent.click(fr);
    expect(mixed.disabled).toBe(false);
  });

  test('Says why loading failed, and shows its notes', async () => {
    const { fake } = await render();
    pick('Pivot column', 'SHIP_VIA');
    fake.execute.mockRejectedValueOnce(new Error('The engine is down'));
    fireEvent.click(
      within(panel()).getByRole('button', { name: 'Load values' }),
    );
    expect(
      await within(panel()).findByText('The engine is down'),
    ).toBeDefined();
    PIVOT_EDITOR_NOTES.forEach((note) =>
      expect(within(panel()).getByText(note)).toBeDefined(),
    );
  });

  test("Shows on an H2 cube that its database can't pivot", async () => {
    await render('H2');
    await waitFor(() =>
      expect(problems()).toContain(MESSAGE_PIVOT_UNSUPPORTED_DATABASE('H2')),
    );
  });
});
