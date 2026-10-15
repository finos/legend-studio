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

import { describe, expect, jest, test } from '@jest/globals';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CubeJsonViewerDialog } from '../CubeJsonViewerDialog.js';

const DOCUMENT =
  '{"user":{"name":"ann","address":{"city":"Paris"}},"amount":12.50,"items":[{"sku":"x"},{"sku":"y"}],"note":null}';

const renderViewer = async (
  text: string,
): Promise<{ state: CubeEditorState; dialog: HTMLElement }> => {
  const { host } = TEST__createCubeHost();
  const state = new CubeEditorState(host);
  state.jsonViewer.open('PAYLOAD', text);
  await TEST__renderInCubeApplication(
    <CubeJsonViewerDialog editorState={state} />,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.JSON_VIEWER,
  );
  return { state, dialog: screen.getByRole('dialog') };
};

describe('Open JSON (PLAN §11.20)', () => {
  test("Shows the cell's document as a tree, open two levels deep, each object or array opened and closed by a click", async () => {
    const { dialog } = await renderViewer(DOCUMENT);
    expect(within(dialog).getByText('JSON of PAYLOAD')).not.toBeNull();
    const tree = within(dialog).getByTestId(LEGEND_CUBE_TEST_ID.JSON_VIEWER);
    // the document and its fields are open; deeper objects are closed
    expect(tree.textContent).toContain('user: {2 keys}');
    expect(tree.textContent).toContain('name: "ann"');
    expect(tree.textContent).toContain('amount: 12.50');
    expect(tree.textContent).toContain('note: null');
    expect(tree.textContent).toContain('address: {1 key}');
    expect(tree.textContent).not.toContain('Paris');
    fireEvent.click(within(tree).getByLabelText('Open address'));
    expect(tree.textContent).toContain('city: "Paris"');
    // an array's elements are named by their index
    expect(tree.textContent).toContain('items: [2 items]');
    expect(tree.textContent).toContain('[0]: {1 key}');
    expect(tree.textContent).not.toContain('sku');
    fireEvent.click(within(tree).getByLabelText('Open [0]'));
    expect(tree.textContent).toContain('sku: "x"');
    fireEvent.click(within(tree).getByLabelText('Close user'));
    expect(tree.textContent).not.toContain('name: "ann"');
  });

  test('Copies the document indented, numbers as written, and closes', async () => {
    const { state, dialog } = await renderViewer('{"a":[1,1.0]}');
    const copy = jest
      .spyOn(
        state.host.applicationStore.clipboardService,
        'copyTextToClipboard',
      )
      .mockResolvedValue(undefined);
    fireEvent.click(within(dialog).getByText('Copy JSON'));
    expect(copy).toHaveBeenCalledWith('{\n  "a": [\n    1,\n    1.0\n  ]\n}');
    fireEvent.click(within(dialog).getByText('Close'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(state.jsonViewer.isOpen).toBe(false);
  });

  test("Shows text that isn't JSON as it is", async () => {
    const { dialog } = await renderViewer('not { json');
    expect(
      within(dialog).getByTestId(LEGEND_CUBE_TEST_ID.JSON_VIEWER).textContent,
    ).toBe('not { json');
    act(() => undefined);
  });
});
