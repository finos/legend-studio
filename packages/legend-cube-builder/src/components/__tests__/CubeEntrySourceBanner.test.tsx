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
import { DataProductAccessPointSource } from '@finos/legend-cube';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import {
  TEST__findCanvasNode,
  TEST__getCanvasNodes,
} from '../../__test-utils__/CubeCanvasTestUtils.js';
import { TEST__renderInCubeApplication } from '../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import { FAKE_DATA_PRODUCT_CANDIDATES } from '../../__test-utils__/FakeCubeDataProductCatalog.js';
import { CubeDataProductEnvironmentType } from '../../graph-manager/CubeDataProduct.js';
import type { CubeDataProductCandidate } from '../../graph-manager/CubeDataProductCatalog.js';
import {
  type CubeEntrySource,
  formatCubeAccessPointEntryId,
} from '../../stores/CubeEntrySource.js';
import { CubeEditor } from '../CubeEditor.js';

const linkTo = (dataProductId: string): CubeEntrySource => ({
  sourceType: DataProductAccessPointSource.TYPE,
  sourceId: formatCubeAccessPointEntryId({
    environmentType: CubeDataProductEnvironmentType.PRODUCTION,
    dataProductId,
    deploymentId: 'deployment-orders_product',
    accessPointGroup: 'core',
    accessPoint: 'daily_orders',
  }),
});

const renderPage = async (
  initialSource: CubeEntrySource,
  prepare?: (created: ReturnType<typeof TEST__createCubeHost>) => void,
): Promise<ReturnType<typeof TEST__createCubeHost>> => {
  const created = TEST__createCubeHost();
  prepare?.(created);
  await TEST__renderInCubeApplication(
    <CubeEditor host={created.host} initialSource={initialSource} />,
    created.host.applicationStore,
    LEGEND_CUBE_TEST_ID.EDITOR,
  );
  return created;
};

beforeEach(() => {
  localStorage.clear();
});

describe('Entry link', () => {
  test('Opens the page on the linked access point, alone on the canvas, with no dialog and no run', async () => {
    const { fake } = await renderPage(linkTo('ORDERS_PRODUCT'));
    expect(
      await TEST__findCanvasNode('dataProductAccessPoint101'),
    ).toBeDefined();
    expect(TEST__getCanvasNodes()).toHaveLength(1);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(
      screen.queryByTestId(LEGEND_CUBE_TEST_ID.ENTRY_SOURCE_ERROR),
    ).toBeNull();
    expect(fake.execute).not.toHaveBeenCalled();
  });

  test('Says the linked source is being opened while the catalog answers', async () => {
    let answer: (
      candidates: readonly CubeDataProductCandidate[],
    ) => void = () => undefined;
    await renderPage(linkTo('ORDERS_PRODUCT'), ({ dataProducts }) => {
      dataProducts.search.mockImplementationOnce(
        async () =>
          new Promise((resolve) => {
            answer = resolve;
          }),
      );
    });
    expect(
      (await screen.findByText('Opening the linked source…')).getAttribute(
        'role',
      ),
    ).toBe('status');
    answer(FAKE_DATA_PRODUCT_CANDIDATES);
    expect(
      await TEST__findCanvasNode('dataProductAccessPoint101'),
    ).toBeDefined();
    expect(screen.queryByText('Opening the linked source…')).toBeNull();
  });

  test("Shows why a linked source couldn't be added in a banner, which Dismiss removes; the canvas stays empty", async () => {
    await renderPage(linkTo('NO_SUCH_PRODUCT'));
    const banner = await screen.findByTestId(
      LEGEND_CUBE_TEST_ID.ENTRY_SOURCE_ERROR,
    );
    expect(banner.getAttribute('role')).toBe('alert');
    expect(within(banner).getByText('Error resolving source!')).toBeDefined();
    expect(
      within(banner).getByText(
        'No data product "NO_SUCH_PRODUCT" is deployed as "deployment-orders_product".',
      ),
    ).toBeDefined();
    expect(TEST__getCanvasNodes()).toHaveLength(0);
    fireEvent.click(within(banner).getByRole('button', { name: 'Dismiss' }));
    await waitFor(() =>
      expect(
        screen.queryByTestId(LEGEND_CUBE_TEST_ID.ENTRY_SOURCE_ERROR),
      ).toBeNull(),
    );
  });
});
