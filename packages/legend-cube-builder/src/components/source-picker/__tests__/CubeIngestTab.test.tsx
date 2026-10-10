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
import { IngestDatasetSource } from '@finos/legend-cube';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import { createFakeCubeIngestCatalog } from '../../../__test-utils__/FakeCubeIngestCatalog.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CubeIngestTab } from '../CubeIngestTab.js';

let consoleError: jest.SpiedFunction<typeof console.error>;

beforeEach(() => {
  localStorage.clear();
  consoleError = jest.spyOn(console, 'error');
});

afterEach(() => {
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockRestore();
});

const renderTab = (): CubeEditorState => {
  const { host } = TEST__createCubeHost();
  const state = new CubeEditorState({
    ...host,
    ingestCatalog: createFakeCubeIngestCatalog().catalog,
  });
  act(() => state.addNode(IngestDatasetSource.TYPE));
  render(<CubeIngestTab tab={state.sourcePicker.ingestTab} />);
  return state;
};

describe('The Ingest tab', () => {
  test('Walks Mode, environment, producer, definition and data set, then shows its columns', async () => {
    const state = renderTab();
    await waitFor(() =>
      expect(screen.getByLabelText('Environment').textContent).toBe('env-a'),
    );
    expect(
      within(screen.getByLabelText('Mode'))
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Production', 'Production (parallel)']);
    fireEvent.change(screen.getByLabelText('Producer'), {
      target: { value: '1234' },
    });
    const definitions = await screen.findByRole('list', {
      name: 'Ingest definitions',
    });
    expect(
      within(definitions)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual([
      'OrdersIngestcom.example:sales',
      'DesksIngestcom.example:sales',
    ]);
    expect(
      screen.getByText(
        '1 definition not deployed from a project, or deployed to another environment, not shown',
      ),
    ).toBeTruthy();
    fireEvent.click(within(definitions).getByText('OrdersIngest'));
    const dataSets = await screen.findByRole('list', { name: 'Data sets' });
    const daily = within(dataSets).getByText('DAILY').closest('button');
    expect(daily).toHaveProperty('disabled', true);
    expect(
      within(dataSets).getByText(
        'It is a materialized view, which Cube does not support yet',
      ),
    ).toBeTruthy();
    const preview = screen.getByRole('region', { name: 'Data set preview' });
    expect(within(preview).getByText('TRADE_ID')).toBeTruthy();
    expect(screen.getByLabelText('Warehouse')).toHaveProperty(
      'value',
      'LAKEHOUSE_CONSUMER_DEFAULT_WH',
    );
    expect(state.sourcePicker.ingestTab.canConfirm).toBe(true);
  });
});
