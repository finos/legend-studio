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

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import { DataSpaceSource } from '@finos/legend-cube';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { CUBE_DATA_SPACE_MESSAGE } from '../../../__lib__/LegendCubeDataSpaceLabels.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import {
  createFakeCubeDataSpaceEditor,
  FAKE_TRADES_DATA_SPACE,
} from '../../../__test-utils__/FakeCubeDataSpaceEditor.js';
import type { CubeProjectCatalog } from '../../../graph-manager/CubeProjectCatalog.js';
import { createFakeCubeProjectCatalog } from '../../../__test-utils__/FakeCubeProjectCatalog.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CubeDataSpaceTab } from '../CubeDataSpaceTab.js';

let consoleError: jest.SpiedFunction<typeof console.error>;

beforeEach(() => {
  consoleError = jest.spyOn(console, 'error');
});

afterEach(() => {
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockRestore();
});

const renderTab = async (): Promise<CubeEditorState> => {
  const { host } = TEST__createCubeHost();
  const projects = createFakeCubeProjectCatalog();
  const state = new CubeEditorState({
    ...host,
    projectCatalog: {
      ...projects.catalog,
      listVersions: jest.fn<CubeProjectCatalog['listVersions']>(async () =>
        Promise.resolve(['2.4.0', '2.3.0']),
      ),
    },
    dataSpaceEditor: createFakeCubeDataSpaceEditor().editor,
  });
  act(() => {
    state.addNode(DataSpaceSource.TYPE);
  });
  render(<CubeDataSpaceTab tab={state.sourcePicker.dataSpaceTab} />);
  await screen.findByRole('list', { name: 'Data spaces' });
  return state;
};

describe('The Data Space tab', () => {
  test("Lists the data spaces by title with their project, and shows the picked one's version and context", async () => {
    const state = await renderTab();
    const list = screen.getByRole('list', { name: 'Data spaces' });
    expect(
      within(list)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual([
      'risk::RiskDataSpacecom.example:risk',
      'Tradescom.example:trading',
    ]);
    fireEvent.click(within(list).getByText('Trades'));
    const details = await screen.findByRole('region', {
      name: 'Data space details',
    });
    expect(within(details).getByText(FAKE_TRADES_DATA_SPACE.path)).toBeTruthy();
    expect(within(details).getByText('Every trade, by desk')).toBeTruthy();
    const version =
      await within(details).findByLabelText<HTMLSelectElement>('Version');
    await screen.findByText('From com.example:trading 2.3.0');
    expect(version.value).toBe('2.3.0');
    expect([...version.options].map((option) => option.textContent)).toEqual([
      '2.4.0 (latest)',
      '2.3.0',
    ]);
    const context =
      within(details).getByLabelText<HTMLSelectElement>('Context');
    expect(context.value).toBe('production');
    expect([...context.options].map((option) => option.textContent)).toEqual([
      'Production',
      'uat',
    ]);
    fireEvent.change(context, { target: { value: 'uat' } });
    expect(state.sourcePicker.dataSpaceTab.executionContext).toBe('uat');
    expect(state.sourcePicker.dataSpaceTab.canConfirm).toBe(true);
  });

  test('Says when the search matches no data space', async () => {
    await renderTab();
    fireEvent.change(screen.getByLabelText('Search data spaces'), {
      target: { value: 'positions' },
    });
    expect(screen.getByText(CUBE_DATA_SPACE_MESSAGE.NO_MATCH)).toBeTruthy();
  });
});
