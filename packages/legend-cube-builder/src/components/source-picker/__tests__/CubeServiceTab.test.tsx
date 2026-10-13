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
import { ServiceSource } from '@finos/legend-cube';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import {
  createFakeCubeServiceCatalog,
  type FakeCubeServiceCatalog,
} from '../../../__test-utils__/FakeCubeServiceCatalog.js';
import { CUBE_SERVICE_MESSAGE } from '../../../__lib__/LegendCubeServiceLabels.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CubeServiceTab } from '../CubeServiceTab.js';

let consoleError: jest.SpiedFunction<typeof console.error>;

beforeEach(() => {
  consoleError = jest.spyOn(console, 'error');
});

afterEach(() => {
  expect(consoleError).not.toHaveBeenCalled();
  consoleError.mockRestore();
});

const renderTab = (
  registry: FakeCubeServiceCatalog = createFakeCubeServiceCatalog(),
): CubeEditorState => {
  const { host } = TEST__createCubeHost();
  const state = new CubeEditorState({
    ...host,
    serviceCatalog: registry.catalog,
  });
  act(() => {
    state.addNode(ServiceSource.TYPE);
  });
  render(<CubeServiceTab tab={state.sourcePicker.serviceTab} />);
  return state;
};

describe('The Service tab', () => {
  test("Says services are in progress, lists them by title with their pattern, and shows the picked one's details", async () => {
    const state = renderTab();
    expect(screen.getByText(CUBE_SERVICE_MESSAGE.IN_PROGRESS)).toBeTruthy();
    const list = await screen.findByRole('list', { name: 'Services' });
    expect(
      within(list)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual([
      'trading::services::Desks/desks',
      'Trades by desk/trades/byDesk',
    ]);
    fireEvent.click(within(list).getByText('Trades by desk'));
    const details = screen.getByRole('region', { name: 'Service details' });
    expect(
      within(details).getByText('trading::services::TradesByDesk'),
    ).toBeTruthy();
    expect(within(details).getByText('Owners: alice, bob')).toBeTruthy();
    expect(within(details).getByText('Every trade, by desk')).toBeTruthy();
    expect(state.sourcePicker.serviceTab.canConfirm).toBe(true);
  });

  test('Filters by the search, and says when nothing matches', async () => {
    renderTab();
    await screen.findByRole('list', { name: 'Services' });
    fireEvent.change(screen.getByLabelText('Search services'), {
      target: { value: 'desks' },
    });
    expect(
      within(screen.getByRole('list', { name: 'Services' }))
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual(['trading::services::Desks/desks']);
    fireEvent.change(screen.getByLabelText('Search services'), {
      target: { value: 'nothing' },
    });
    expect(screen.getByText(CUBE_SERVICE_MESSAGE.NO_MATCH)).toBeTruthy();
  });

  test('Shows a failed list with Retry, which reads it again', async () => {
    const registry = createFakeCubeServiceCatalog();
    registry.listServices.mockRejectedValueOnce(
      new Error('The registry is down'),
    );
    renderTab(registry);
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('The registry is down')).toBeTruthy();
    fireEvent.click(within(alert).getByText('Retry'));
    await waitFor(() =>
      expect(screen.getByRole('list', { name: 'Services' })).toBeTruthy(),
    );
    expect(registry.listServices).toHaveBeenCalledTimes(2);
  });
});
