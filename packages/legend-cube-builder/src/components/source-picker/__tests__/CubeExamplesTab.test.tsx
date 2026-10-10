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

beforeEach(() => {
  localStorage.clear();
});

describe('Examples tab', () => {
  test('Opens an example from the empty canvas, which replaces the cube and runs it, and Undo brings the empty cube back', async () => {
    const { host, fake } = TEST__createCubeHost();
    await TEST__renderInCubeApplication(
      <CubeEditor host={host} />,
      host.applicationStore,
      LEGEND_CUBE_TEST_ID.EDITOR,
    );
    fireEvent.click(screen.getByText('open an example'));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog)
        .getByRole('tab', { name: 'Examples' })
        .getAttribute('aria-selected'),
    ).toBe('true');
    ['Northwind', 'Sports', 'Trades'].forEach((dataset) => {
      expect(
        within(
          within(dialog).getByRole('list', { name: `${dataset} examples` }),
        ).getAllByRole('button'),
      ).toHaveLength(2);
    });
    const open = within(dialog).getByRole<HTMLButtonElement>('button', {
      name: 'Open',
    });
    expect(open.disabled).toBe(true);

    const example = within(dialog).getByRole('button', {
      name: /^Top customers by orders/u,
    });
    fireEvent.click(example);
    expect(example.getAttribute('aria-pressed')).toBe('true');
    expect(open.disabled).toBe(false);
    fireEvent.click(open);

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await screen.findByText('Top customers by orders');
    await waitFor(() => expect(fake.execute).toHaveBeenCalledTimes(1));
    expect(TEST__getCanvasNodes()).toHaveLength(7);

    fireEvent.click(screen.getByText('Undo'));
    expect(TEST__getCanvasNodes()).toHaveLength(0);
    expect(screen.getByText('open an example')).toBeDefined();
  });
});
