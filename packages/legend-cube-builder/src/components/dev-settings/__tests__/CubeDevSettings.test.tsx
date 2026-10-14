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
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import {
  TEST__createCubeHost,
  TEST__CUBE_ENGINE_URL,
} from '../../../__test-utils__/CubeTestApplication.js';
import { CubeEditor } from '../../CubeEditor.js';

beforeEach(() => {
  localStorage.clear();
});

const openDevSettings = async (): Promise<HTMLElement> => {
  fireEvent.click(
    within(screen.getByTestId(LEGEND_CUBE_TEST_ID.PALETTE)).getByTitle('Menu'),
  );
  fireEvent.click(await screen.findByText('Dev Settings'));
  return screen.findByRole('dialog');
};

describe('Dev Settings (PLAN §11.16)', () => {
  test("Opens from the menu at the top left, and changes the engine clients' URL and compression", async () => {
    const { host, engineClient } = TEST__createCubeHost();
    await TEST__renderInCubeApplication(
      <CubeEditor host={host} />,
      host.applicationStore,
      LEGEND_CUBE_TEST_ID.EDITOR,
    );
    const dialog = await openDevSettings();
    const url = within(dialog).getByDisplayValue(TEST__CUBE_ENGINE_URL);
    fireEvent.change(url, { target: { value: 'nope' } });
    expect(within(dialog).getByText('Invalid URL')).not.toBeNull();
    expect(engineClient.setBaseUrl).not.toHaveBeenCalled();
    fireEvent.change(url, { target: { value: 'http://localhost:6301/api' } });
    expect(engineClient.setBaseUrl).toHaveBeenLastCalledWith(
      'http://localhost:6301/api',
    );
    fireEvent.click(within(dialog).getByText('Reset engine URL'));
    expect(engineClient.setBaseUrl).toHaveBeenLastCalledWith(
      TEST__CUBE_ENGINE_URL,
    );
    expect(
      within(dialog).getByText<HTMLButtonElement>('Reset engine URL').disabled,
    ).toBe(true);
    fireEvent.click(
      within(dialog).getByText(
        /^Specifies if request payload should be compressed/u,
      ),
    );
    expect(engineClient.setCompression).toHaveBeenLastCalledWith(false);
    fireEvent.click(within(dialog).getByText('Close'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  test('Opens from the menu with the palette collapsed', async () => {
    const { host } = TEST__createCubeHost();
    await TEST__renderInCubeApplication(
      <CubeEditor host={host} />,
      host.applicationStore,
      LEGEND_CUBE_TEST_ID.EDITOR,
    );
    fireEvent.click(screen.getByTitle('Collapse the palette'));
    const dialog = await openDevSettings();
    expect(within(dialog).getByText('Dev Settings')).not.toBeNull();
  });
});
