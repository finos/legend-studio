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
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import { TEST__findCanvasNode } from '../../../__test-utils__/CubeCanvasTestUtils.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import {
  createFakeCubeIngestCatalog,
  FAKE_INGEST_ORDERS_WITH_FILLS,
  type FakeCubeIngestCatalog,
} from '../../../__test-utils__/FakeCubeIngestCatalog.js';
import { CubeDataProductEnvironmentType } from '../../../graph-manager/CubeDataProduct.js';
import {
  CubeIngestEnvironment,
  CubeIngestProducer,
} from '../../../graph-manager/CubeIngestCatalog.js';
import type { CubeHost } from '../../../stores/CubeHost.js';
import { CubeEditorState } from '../../../stores/CubeEditorState.js';
import { CubeEditor } from '../../CubeEditor.js';
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
  act(() => {
    state.addNode(IngestDatasetSource.TYPE);
  });
  render(<CubeIngestTab tab={state.sourcePicker.ingestTab} />);
  return state;
};

/**
 * A host reading one project's ingest definitions, as Studio: one producer,
 * the project, and the environment and warehouse of its lakehouse runtime
 */
const createProjectHost = (): {
  host: CubeHost;
  ingest: FakeCubeIngestCatalog;
} => {
  const { host } = TEST__createCubeHost();
  const ingest = createFakeCubeIngestCatalog();
  ingest.listProducers.mockResolvedValue([
    new CubeIngestProducer({ deploymentId: '1234', urn: 'the project' }),
  ]);
  ingest.resolveEnvironment.mockResolvedValue(
    new CubeIngestEnvironment({
      environmentType: CubeDataProductEnvironmentType.PRODUCTION,
      name: 'demo-dev, from demo::Runtime',
      runtimeEnvironment: 'demo-dev',
      warehouse: 'DEMO_WH',
    }),
  );
  return {
    host: {
      ...host,
      ingestCatalog: ingest.catalog,
      project: {
        resolveRuntime: async () => ({ label: 'demo-dev, from demo::Runtime' }),
      },
    },
    ingest,
  };
};

describe('The Ingest tab', () => {
  test('Walks environment, producer, definition and data set, then shows its columns', async () => {
    const state = renderTab();
    // every environment of both classes, the viewer's own production one picked
    await waitFor(() =>
      expect(
        screen.getByLabelText<HTMLSelectElement>('Environment')
          .selectedOptions[0]?.textContent,
      ).toBe('env-a · Production'),
    );
    expect(
      within(screen.getByLabelText('Environment'))
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual([
      'env-a · Production',
      'env-a · Production parallel',
      'env-b · Production',
    ]);
    expect(screen.queryByLabelText('Mode')).toBeNull();
    // producers are named as the deployment directory knows them
    expect(
      within(screen.getByLabelText('Producer'))
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Choose…', 'Sales Feed (1234)', 'Deployment 5678']);
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

  test('On a host reading one project, as Studio, lists its definitions by name with their paths, under the runtime its runs use', async () => {
    const state = new CubeEditorState(createProjectHost().host);
    act(() => {
      state.addNode(IngestDatasetSource.TYPE);
    });
    render(<CubeIngestTab tab={state.sourcePicker.ingestTab} />);
    await waitFor(() =>
      expect(screen.getByLabelText('Runtime').textContent).toBe(
        'Runs on demo-dev, from demo::Runtime',
      ),
    );
    // no class, deployment or warehouse to pick
    expect(screen.queryByLabelText('Mode')).toBeNull();
    expect(screen.queryByLabelText('Producer')).toBeNull();
    expect(screen.queryByLabelText('Warehouse')).toBeNull();
    const definitions = await screen.findByRole('list', {
      name: 'Ingest definitions',
    });
    expect(
      within(definitions)
        .getAllByRole('button')
        .map((button) => button.textContent),
    ).toEqual([
      'OrdersIngestsales::ingest::OrdersIngest',
      'DesksIngestsales::ingest::DesksIngest',
    ]);
    fireEvent.click(within(definitions).getByText('OrdersIngest'));
    await screen.findByRole('list', { name: 'Data sets' });
    expect(state.sourcePicker.ingestTab.warehouse).toBe('DEMO_WH');
    expect(state.sourcePicker.ingestTab.canConfirm).toBe(true);
  });

  test('On a host reading one project, as Studio, picks several data sets with their checkboxes, or a Cmd click, and adds them all', async () => {
    const { host, ingest } = createProjectHost();
    ingest.describe.mockResolvedValue(FAKE_INGEST_ORDERS_WITH_FILLS);
    await TEST__renderInCubeApplication(
      <CubeEditor host={host} />,
      host.applicationStore,
      LEGEND_CUBE_TEST_ID.EDITOR,
    );
    fireEvent.click(screen.getByRole('button', { name: /^Ingest Dataset/u }));
    const dialog = await screen.findByRole('dialog');
    const definitions = await within(dialog).findByRole('list', {
      name: 'Ingest definitions',
    });
    fireEvent.click(within(definitions).getByText('OrdersIngest'));
    const dataSets = await within(dialog).findByRole('list', {
      name: 'Data sets',
    });
    fireEvent.click(within(dataSets).getByLabelText('Pick TRADES'));
    fireEvent.click(within(dataSets).getByText('FILLS'), { metaKey: true });
    expect(
      within(dataSets)
        .getAllByRole<HTMLInputElement>('checkbox')
        .map((box) => [box.getAttribute('aria-label'), box.checked]),
    ).toEqual([
      ['Pick TRADES', true],
      ['Pick DAILY', false],
      ['Pick FILLS', true],
    ]);
    // a materialized view can't be ticked
    expect(
      within(dataSets).getByLabelText<HTMLInputElement>('Pick DAILY').disabled,
    ).toBe(true);
    // the data set picked last is previewed
    expect(
      within(
        within(dialog).getByRole('region', { name: 'Data set preview' }),
      ).getByText('FILL_ID'),
    ).toBeDefined();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add 2' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await TEST__findCanvasNode('ingestDataset101')).toBeDefined();
    expect(await TEST__findCanvasNode('ingestDataset102')).toBeDefined();
  });

  test('On a host reading one project, as Studio, a plain click on a data set picks it alone', async () => {
    const { host, ingest } = createProjectHost();
    ingest.describe.mockResolvedValue(FAKE_INGEST_ORDERS_WITH_FILLS);
    const state = new CubeEditorState(host);
    act(() => {
      state.addNode(IngestDatasetSource.TYPE);
    });
    render(<CubeIngestTab tab={state.sourcePicker.ingestTab} />);
    const definitions = await screen.findByRole('list', {
      name: 'Ingest definitions',
    });
    fireEvent.click(within(definitions).getByText('OrdersIngest'));
    const dataSets = await screen.findByRole('list', { name: 'Data sets' });
    fireEvent.click(within(dataSets).getByLabelText('Pick TRADES'));
    fireEvent.click(within(dataSets).getByLabelText('Pick FILLS'));
    fireEvent.click(within(dataSets).getByText('TRADES'));
    expect(
      within(dataSets).getByLabelText<HTMLInputElement>('Pick TRADES').checked,
    ).toBe(true);
    expect(
      within(dataSets).getByLabelText<HTMLInputElement>('Pick FILLS').checked,
    ).toBe(false);
    expect(state.sourcePicker.ingestTab.pickedCount).toBe(1);
  });

  test('On a host reading one project, as Studio, ticks several definitions and adds data sets of each, listed under their names', async () => {
    const { host } = createProjectHost();
    await TEST__renderInCubeApplication(
      <CubeEditor host={host} />,
      host.applicationStore,
      LEGEND_CUBE_TEST_ID.EDITOR,
    );
    fireEvent.click(screen.getByRole('button', { name: /^Ingest Dataset/u }));
    const dialog = await screen.findByRole('dialog');
    const definitions = await within(dialog).findByRole('list', {
      name: 'Ingest definitions',
    });
    fireEvent.click(within(definitions).getByText('OrdersIngest'));
    await within(dialog).findByLabelText('Pick TRADES');
    // ticked beside it: each one's data sets under its name, its only one picked
    fireEvent.click(within(definitions).getByLabelText('Pick DesksIngest'));
    await within(dialog).findByLabelText('Pick DESKS of DesksIngest');
    const dataSets = within(dialog).getByRole('list', { name: 'Data sets' });
    expect(
      within(dataSets)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'OrdersIngest',
      expect.stringContaining('TRADES'),
      expect.stringContaining('DAILY'),
      'DesksIngest',
      expect.stringContaining('DESKS'),
    ]);
    expect(
      within(dataSets)
        .getAllByRole<HTMLInputElement>('checkbox')
        .map((box) => [box.getAttribute('aria-label'), box.checked]),
    ).toEqual([
      ['Pick TRADES of OrdersIngest', true],
      ['Pick DAILY of OrdersIngest', false],
      ['Pick DESKS of DesksIngest', true],
    ]);
    // the data set picked last is previewed, with its definition
    within(
      within(dialog).getByRole('region', { name: 'Data set preview' }),
    ).getByText('DESKS of DesksIngest');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add 2' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await TEST__findCanvasNode('ingestDataset101')).toBeDefined();
    expect(await TEST__findCanvasNode('ingestDataset102')).toBeDefined();
  });
});
