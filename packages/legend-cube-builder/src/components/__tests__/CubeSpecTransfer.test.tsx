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
import { CubeDocument, Query, serializeCubeSpec } from '@finos/legend-cube';
import {
  fireEvent,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from '@testing-library/react';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import { TEST__renderInCubeApplication } from '../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
  sliceQuery,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import { readFileAsText } from '@finos/legend-shared';
import type { FakeCubeEngine } from '../../__test-utils__/FakeCubeEngine.js';
import type { CubeHost } from '../../stores/CubeHost.js';
import { CUBE_NORTHWIND_MODEL } from '../../stores/fixtures/CubeNorthwindModel.js';
import { CubeEditor } from '../CubeEditor.js';

const CONTEXT = { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME };

const sliceDocument = (): CubeDocument =>
  new CubeDocument({
    name: 'Orders in France',
    context: CONTEXT,
    query: sliceQuery(),
  });

const ordersDocument = (): CubeDocument =>
  new CubeDocument({
    context: CONTEXT,
    query: new Query(
      [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS)],
      [],
      'relational101',
    ),
  });

const renderPage = async (
  initialDocument?: CubeDocument,
): Promise<{ host: CubeHost; fake: FakeCubeEngine }> => {
  const { host, fake } = TEST__createCubeHost();
  await TEST__renderInCubeApplication(
    <CubeEditor host={host} initialDocument={initialDocument} />,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.EDITOR,
  );
  return { host, fake };
};

const header = (): HTMLElement =>
  screen.getByTestId(LEGEND_CUBE_TEST_ID.GRAPH_REGION);
const headerButton = (text: string): HTMLButtonElement =>
  within(header()).getByText<HTMLButtonElement>(text);
const nodeIds = (): string[] =>
  screen
    .queryAllByTestId(LEGEND_CUBE_TEST_ID.NODE_ROW)
    .map((row) => row.querySelector('.text-sm')?.textContent ?? '');

/** Opens Import, pastes the text and presses Import */
const importText = async (text: string): Promise<HTMLElement> => {
  fireEvent.click(headerButton('Import (dev)'));
  const dialog = await screen.findByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText('Cube spec'), {
    target: { value: text },
  });
  fireEvent.click(within(dialog).getByText('Import'));
  return dialog;
};

// jsdom has no object URLs: a test defines one, and this puts back what was there
const CREATE_OBJECT_URL = Object.getOwnPropertyDescriptor(
  URL,
  'createObjectURL',
);

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  if (CREATE_OBJECT_URL) {
    Object.defineProperty(URL, 'createObjectURL', CREATE_OBJECT_URL);
  } else {
    delete (URL as { createObjectURL?: unknown }).createObjectURL;
  }
  jest.restoreAllMocks();
});

describe('Cube spec export and import, on the page', () => {
  test('Shows the spec, copies it, and downloads it as a .cube.json file named after the cube', async () => {
    const { host } = await renderPage(sliceDocument());
    const copy = jest
      .spyOn(host.applicationStore.clipboardService, 'copyTextToClipboard')
      .mockResolvedValue();
    // jsdom has no object URLs, and follows no download links
    const blobs: Blob[] = [];
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: (blob: Blob): string => {
        blobs.push(blob);
        return 'blob:cube';
      },
    });
    const clicked: HTMLAnchorElement[] = [];
    jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        clicked.push(this);
      });

    fireEvent.click(headerButton('Export (dev)'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Export spec (dev)')).toBeDefined();
    const spec = serializeCubeSpec(sliceDocument());
    expect(
      within(dialog).getByLabelText<HTMLTextAreaElement>('Cube spec').value,
    ).toBe(spec);

    fireEvent.click(within(dialog).getByText('Copy'));
    expect(copy).toHaveBeenCalledWith(spec, expect.anything());

    fireEvent.click(within(dialog).getByText('Download'));
    expect(clicked.map((link) => link.download)).toEqual([
      'Orders_in_France.cube.json',
    ]);
    // jsdom's Blob has no text()
    expect(
      await readFileAsText(new File([blobs[0] as Blob], 'spec.cube.json')),
    ).toBe(spec);
    expect(blobs[0]?.type).toBe('application/json');

    fireEvent.click(within(dialog).getByText('Close'));
    await waitForElementToBeRemoved(dialog);
  });

  test('Imports a pasted spec in place of the cube, runs nothing, and Undo brings the cube back', async () => {
    const { fake } = await renderPage(ordersDocument());
    expect(nodeIds()).toEqual(['relational101']);
    const dialog = await importText(serializeCubeSpec(sliceDocument()));
    await waitForElementToBeRemoved(dialog);
    expect(within(header()).getByText('Orders in France')).toBeDefined();
    expect(nodeIds()).toEqual([
      'relational101',
      'relational102',
      'join101',
      'filter101',
    ]);
    expect(fake.execute).not.toHaveBeenCalled();
    expect(
      screen.getByText('Execute the query to see its rows.'),
    ).toBeDefined();

    fireEvent.click(headerButton('Undo'));
    expect(nodeIds()).toEqual(['relational101']);
  });

  test('Shows where a broken spec is broken, keeps the dialog open and the cube as it was', async () => {
    await renderPage(ordersDocument());
    const spec = JSON.parse(serializeCubeSpec(ordersDocument())) as {
      query: { nodes: Record<string, unknown>[] };
    };
    spec.query.nodes[0] = { ...spec.query.nodes[0], table: 7 };
    const dialog = await importText(JSON.stringify(spec));
    expect(within(dialog).getByRole('alert').textContent).toBe(
      "Can't import the spec: query.nodes[0].table must be a string",
    );
    expect(nodeIds()).toEqual(['relational101']);
    expect(headerButton('Undo').disabled).toBe(true);
  });

  test("Can't import before a spec is pasted or chosen", async () => {
    await renderPage();
    fireEvent.click(headerButton('Import (dev)'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText<HTMLButtonElement>('Import').disabled).toBe(
      true,
    );
    fireEvent.click(within(dialog).getByText('Cancel'));
    await waitForElementToBeRemoved(dialog);
  });

  test('Reads a chosen .cube.json file into the spec to import', async () => {
    await renderPage();
    fireEvent.click(headerButton('Import (dev)'));
    const dialog = await screen.findByRole('dialog');
    const spec = serializeCubeSpec(sliceDocument());
    fireEvent.change(within(dialog).getByLabelText('Spec file'), {
      target: {
        files: [
          new File([spec], 'slice.cube.json', { type: 'application/json' }),
        ],
      },
    });
    const text =
      within(dialog).getByLabelText<HTMLTextAreaElement>('Cube spec');
    await waitFor(() => expect(text.value).toBe(spec));
    fireEvent.click(within(dialog).getByText('Import'));
    await waitForElementToBeRemoved(dialog);
    expect(nodeIds()).toHaveLength(4);
  });

  test('Opens a spec from a newer version read-only, says so, and still runs it', async () => {
    await renderPage(ordersDocument());
    const newer = JSON.stringify({
      ...JSON.parse(serializeCubeSpec(sliceDocument())),
      formatVersion: 2,
    });
    const dialog = await importText(newer);
    await waitForElementToBeRemoved(dialog);
    expect(within(header()).getByRole('status').textContent).toContain(
      'saved by a newer version of Legend Cube',
    );
    expect(headerButton('Add table').disabled).toBe(true);
    expect(headerButton('Undo').disabled).toBe(true);
    expect(headerButton('Export (dev)').disabled).toBe(true);
    expect(headerButton('Import (dev)').disabled).toBe(false);
    expect(
      within(
        screen.getByTestId(LEGEND_CUBE_TEST_ID.GRID_TOOLBAR),
      ).getByText<HTMLButtonElement>('Execute').disabled,
    ).toBe(false);
  });
});
