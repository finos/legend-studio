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
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import { TEST__getCanvasNodes } from '../../../__test-utils__/CubeCanvasTestUtils.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import { CubeEditor } from '../../CubeEditor.js';

const renderPage = async () => {
  const created = TEST__createCubeHost();
  await TEST__renderInCubeApplication(
    <CubeEditor host={created.host} />,
    created.host.applicationStore,
    LEGEND_CUBE_TEST_ID.EDITOR,
  );
  return created;
};

/** The Examples dialog, opened from the header's Examples button */
const openExamples = async (): Promise<HTMLElement> => {
  fireEvent.click(
    within(screen.getByTestId(LEGEND_CUBE_TEST_ID.GRAPH_REGION)).getByText(
      'Examples',
    ),
  );
  return screen.findByRole('dialog');
};

beforeEach(() => {
  localStorage.clear();
});

describe('Examples dialog', () => {
  test('Shows each dataset, then its example cubes, in one grid, each example with its steps', async () => {
    await renderPage();
    const dialog = await openExamples();
    const grid = within(dialog).getByLabelText('Examples');
    expect(
      within(grid)
        .getAllByRole('button')
        .map(
          (card) => card.querySelector('span')?.textContent ?? card.textContent,
        ),
    ).toEqual([
      'Northwind',
      'Top customers by orders',
      'Products in stock by category',
      'Sports',
      'Top watched sports',
      'Most watched finals in Europe',
      'Trades',
      'Notional by desk and asset class',
      'Desk league table',
      'Largest buys',
    ]);
    expect(
      within(grid).getByLabelText(
        'Steps: Relational Database Table, Filter by Column, Sort by Column, Take first <x> rows',
      ),
    ).toBeDefined();
    expect(
      within(grid).getByLabelText(
        'Steps: Relational Database Table, Relational Database Table, Join Another Input, Group by Column, Apply Window Functions, Sort by Column',
      ),
    ).toBeDefined();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  test('Opens an example in place of the cube and runs it, and Undo brings the empty cube back', async () => {
    const { fake } = await renderPage();
    fireEvent.click(screen.getByText('open an example'));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(
      within(dialog).getByRole('button', { name: /^Top customers by orders/u }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await screen.findByText('Top customers by orders');
    await waitFor(() => expect(fake.execute).toHaveBeenCalledTimes(1));
    expect(TEST__getCanvasNodes()).toHaveLength(7);

    fireEvent.click(screen.getByText('Undo'));
    expect(TEST__getCanvasNodes()).toHaveLength(0);
    expect(screen.getByText('open an example')).toBeDefined();
  });

  test("Starts a new cube on a dataset, in the source dialog's Sample Data tab on it", async () => {
    await renderPage();
    const dialog = await openExamples();
    fireEvent.click(within(dialog).getByRole('button', { name: /^Sports/u }));
    const picker = await screen.findByRole('dialog');
    expect(within(picker).getByText('Add a source')).toBeDefined();
    const model = within(picker).getByLabelText<HTMLSelectElement>('Dataset');
    // the cube's model, fixed
    expect(model.disabled).toBe(true);
    expect(model.selectedOptions[0]?.textContent).toBe('Sports');
  });
});
