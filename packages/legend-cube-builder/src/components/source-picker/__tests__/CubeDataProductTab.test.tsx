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
import { CubeDocument } from '@finos/legend-cube';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { CUBE_SNAPSHOT_VERSION_LABEL } from '../../../__lib__/LegendCubeDataProductLabels.js';
import { UNSERVED_SOURCE_KIND_TITLE } from '../../../__lib__/LegendCubeLabels.js';
import { LEGEND_CUBE_TEST_ID } from '../../../__lib__/LegendCubeTesting.js';
import { TEST__findCanvasNode } from '../../../__test-utils__/CubeCanvasTestUtils.js';
import { TEST__renderInCubeApplication } from '../../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../../__test-utils__/CubeTestApplication.js';
import {
  createFakeCubeDataProductCatalog,
  FAKE_DATA_PRODUCT_CANDIDATES,
} from '../../../__test-utils__/FakeCubeDataProductCatalog.js';
import {
  CUBE_DATA_PRODUCT_RUNTIME_PATH,
  CubeDataProductEnvironmentType,
  createCubeDataProductModel,
} from '../../../graph-manager/CubeDataProduct.js';
import type { CubeDataProductCandidate } from '../../../graph-manager/CubeDataProductCatalog.js';
import type { CubeHost } from '../../../stores/CubeHost.js';
import { CubeEditor } from '../../CubeEditor.js';

const renderPage = async (
  prepare?: (host: CubeHost) => CubeHost,
): Promise<ReturnType<typeof TEST__createCubeHost>> => {
  const created = TEST__createCubeHost();
  const host = prepare?.(created.host) ?? created.host;
  await TEST__renderInCubeApplication(
    <CubeEditor host={host} />,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.EDITOR,
  );
  return created;
};

const paletteItem = (label: string): HTMLElement =>
  screen.getByRole('button', { name: new RegExp(`^${label}`, 'u') });

/** Opens the dialog from the palette's Data Product item */
const openFromPalette = async (): Promise<HTMLElement> => {
  fireEvent.click(paletteItem('Data Product'));
  const dialog = await screen.findByRole('dialog');
  await within(dialog).findByRole('list', { name: 'Data products' });
  return dialog;
};

beforeEach(() => {
  localStorage.clear();
});

describe('Data product tab', () => {
  test("Opens from the palette on the Data product tab, as Data Cube's selection goes: mode, product, access point, warehouse", async () => {
    await renderPage();
    const dialog = await openFromPalette();
    expect(
      within(dialog)
        .getByRole('tab', { name: 'Data product' })
        .getAttribute('aria-selected'),
    ).toBe('true');
    expect(
      within(within(dialog).getByLabelText('Mode'))
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['Production', 'Production (parallel)']);
    const products = within(dialog).getByRole('list', {
      name: 'Data products',
    });
    fireEvent.click(within(products).getByText('Orders Product'));
    const accessPoints = await within(dialog).findByRole('list', {
      name: 'Access points',
    });
    // one that can't be picked says why
    expect(
      within(accessPoints).getByText('Orders as of a date').closest('button')
        ?.disabled,
    ).toBe(true);
    expect(
      within(accessPoints).getByText(
        'It takes parameters, which Cube does not support yet',
      ),
    ).toBeDefined();
    expect(
      within(dialog).getByLabelText<HTMLInputElement>('Warehouse').value,
    ).toBe('LAKEHOUSE_CONSUMER_DEFAULT_WH');
    const add = within(dialog).getByRole<HTMLButtonElement>('button', {
      name: 'Add',
    });
    expect(add.disabled).toBe(true);
    fireEvent.click(within(accessPoints).getByText('Daily orders'));
    expect(add.disabled).toBe(false);
    fireEvent.click(add);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(
      await TEST__findCanvasNode('dataProductAccessPoint101'),
    ).toBeDefined();
  });

  test("Reopens a data product cube on its product's access points, its mode and warehouse fixed", async () => {
    await renderPage();
    let dialog = await openFromPalette();
    fireEvent.click(within(dialog).getByText('Orders Product'));
    fireEvent.click(await within(dialog).findByText('Daily orders'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    dialog = await openFromPalette();
    expect(
      await within(dialog).findByRole('list', { name: 'Access points' }),
    ).toBeDefined();
    expect(
      within(dialog).getByLabelText<HTMLSelectElement>('Mode').disabled,
    ).toBe(true);
    expect(
      within(dialog).getByLabelText<HTMLInputElement>('Warehouse').disabled,
    ).toBe(true);
    expect(
      within(dialog).getByText(
        "All of the cube's data products come from com.example.sales:orders-products:1.4.0.",
      ),
    ).toBeDefined();
    // the cube's tables tabs are disabled
    expect(
      within(dialog).getByRole<HTMLButtonElement>('tab', { name: 'Model' })
        .disabled,
    ).toBe(true);
  });

  test('Shows a failed listing with a Retry, which lists again', async () => {
    const { dataProducts } = await renderPage();
    dataProducts.search.mockRejectedValueOnce(
      new Error('Lakehouse unavailable'),
    );
    fireEvent.click(paletteItem('Data Product'));
    const dialog = await screen.findByRole('dialog');
    const alert = await within(dialog).findByRole('alert');
    expect(within(alert).getByText('Lakehouse unavailable')).toBeDefined();
    fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(await within(dialog).findByText('Orders Product')).toBeDefined();
    expect(within(dialog).queryByRole('alert')).toBeNull();
    expect(dataProducts.search).toHaveBeenCalledTimes(2);
  });

  test('Says it searches on a host that searches on a server, and when the matches may be cut short', async () => {
    const searching = createFakeCubeDataProductCatalog(undefined, {
      searchesOnServer: true,
      searchLimit: 2,
    });
    let answer!: (candidates: readonly CubeDataProductCandidate[]) => void;
    searching.search.mockReturnValueOnce(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    await renderPage((host) => ({
      ...host,
      dataProductCatalog: searching.catalog,
    }));
    fireEvent.click(paletteItem('Data Product'));
    const dialog = await screen.findByRole('dialog');
    expect(
      await within(dialog).findByText('searching data products'),
    ).toBeDefined();
    answer(FAKE_DATA_PRODUCT_CANDIDATES.slice(0, 2));
    expect(
      await within(dialog).findByText(
        'Too many matching items; list truncated.',
      ),
    ).toBeDefined();
    expect(within(dialog).queryByText('searching data products')).toBeNull();
  });

  test('Says when the picked product is at a moving SNAPSHOT version', async () => {
    await renderPage();
    const dialog = await openFromPalette();
    expect(within(dialog).queryByText(CUBE_SNAPSHOT_VERSION_LABEL)).toBeNull();
    fireEvent.click(within(dialog).getByText('Returns Product'));
    expect(
      await within(dialog).findByText(CUBE_SNAPSHOT_VERSION_LABEL),
    ).not.toBeNull();
    fireEvent.click(within(dialog).getByText('Orders Product'));
    expect(await within(dialog).findByText('Daily orders')).not.toBeNull();
    expect(within(dialog).queryByText(CUBE_SNAPSHOT_VERSION_LABEL)).toBeNull();
  });

  test('Has no Data Product item or tab on a host without a catalog', async () => {
    await renderPage((host) => ({ ...host, dataProductCatalog: undefined }));
    expect(screen.queryByRole('button', { name: /^Data Product/u })).toBeNull();
    fireEvent.click(screen.getByText('add a table'));
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).queryByRole('tab', { name: 'Data product' }),
    ).toBeNull();
  });

  test('Disables Add table, saying why, on a data product cube a host without a catalog opens', async () => {
    const created = TEST__createCubeHost();
    const host = { ...created.host, dataProductCatalog: undefined };
    // imported with its context and no source yet
    const document = new CubeDocument().withContext({
      model: createCubeDataProductModel({
        groupId: 'com.example.sales',
        artifactId: 'orders-products',
        versionId: '1.4.0',
        environmentType: CubeDataProductEnvironmentType.PRODUCTION,
      }),
      runtime: CUBE_DATA_PRODUCT_RUNTIME_PATH,
    });
    await TEST__renderInCubeApplication(
      <CubeEditor host={host} initialDocument={document} />,
      host.applicationStore,
      LEGEND_CUBE_TEST_ID.EDITOR,
    );
    [
      screen.getByRole<HTMLButtonElement>('button', { name: 'Add table' }),
      screen.getByRole<HTMLButtonElement>('button', { name: 'add a table' }),
    ].forEach((control) => {
      expect(control.disabled).toBe(true);
      expect(control.title).toBe(UNSERVED_SOURCE_KIND_TITLE);
      fireEvent.click(control);
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
