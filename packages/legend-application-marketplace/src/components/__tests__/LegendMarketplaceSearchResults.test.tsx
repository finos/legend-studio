/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import { integrationTest } from '@finos/legend-shared/test';
import { expect, jest, test } from '@jest/globals';
import {
  fireEvent,
  getAllByText,
  getByRole,
  getByText,
  screen,
} from '@testing-library/dom';
import {
  TEST__provideMockedLegendMarketplaceBaseStore,
  TEST__setUpMarketplace,
} from '../__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { LEGEND_MARKETPLACE_ROUTE_PATTERN } from '../../__lib__/LegendMarketplaceNavigation.js';
import { guaranteeNonNullable } from '@finos/legend-shared';

test(
  integrationTest(
    'Legend Marketplace search results page loads and displays results',
  ),
  async () => {
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendMarketplaceBaseStore();
    await TEST__setUpMarketplace(
      mockedLegendDataCubeBuilderStore,
      LEGEND_MARKETPLACE_ROUTE_PATTERN.SEARCH_RESULTS,
    );
    await screen.findByText(/^Legend Marketplace$/);
    await screen.findByText('Data Product 1');
    expect(screen.getAllByText('Vendor Beta')).toHaveLength(2);
    screen.getByText(
      'Comprehensive dataset containing sales information for business analysis.',
    );
    expect(screen.getAllByRole('button', { name: 'Preview' }).length).toBe(10);
    expect(screen.getAllByRole('button', { name: 'Learn More' }).length).toBe(
      10,
    );
  },
);

test(
  integrationTest(
    'Legend Marketplace search result Preview button opens drawer with more info',
  ),
  async () => {
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendMarketplaceBaseStore();
    await TEST__setUpMarketplace(
      mockedLegendDataCubeBuilderStore,
      LEGEND_MARKETPLACE_ROUTE_PATTERN.SEARCH_RESULTS,
    );
    await screen.findByText(/^Legend Marketplace$/);
    const dataProductCard = guaranteeNonNullable(
      (await screen.findByText('Data Product 4')).parentElement?.parentElement,
    );
    const previewButton = getByRole(dataProductCard, 'button', {
      name: 'Preview',
    });
    fireEvent.click(previewButton);

    // Check for drawer content
    const drawer = await screen.findByRole('presentation');
    getByText(drawer, 'Vendor Epsilon');
    getByText(drawer, 'Data Product 4');
    getByText(
      drawer,
      /^Enterprise financial analytics dataset containing detailed P&L statements,/,
    );
    expect(getAllByText(drawer, 'Table Name:')).toHaveLength(3);
    expect(getAllByText(drawer, 'Description:')).toHaveLength(3);
    getByText(drawer, 'orders_table_1');
    getByText(
      drawer,
      'Contains detailed orders data with comprehensive attributes.',
    );
    expect(getAllByText(drawer, 'Field Name')).toHaveLength(3);
    expect(getAllByText(drawer, 'Field Description')).toHaveLength(3);
    getByText(drawer, 'created_at');
    getByText(drawer, 'Creation timestamp');
  },
);

test(
  integrationTest(
    'Legend Marketplace search result Learn More button opens data product link',
  ),
  async () => {
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendMarketplaceBaseStore();
    await TEST__setUpMarketplace(
      mockedLegendDataCubeBuilderStore,
      LEGEND_MARKETPLACE_ROUTE_PATTERN.SEARCH_RESULTS,
    );
    // Mock navigation service
    const mockVisitAddress = jest.fn();
    mockedLegendDataCubeBuilderStore.applicationStore.navigationService.navigator.visitAddress =
      mockVisitAddress;

    await screen.findByText(/^Legend Marketplace$/);
    const dataProductCard = guaranteeNonNullable(
      (await screen.findByText('Data Product 4')).parentElement?.parentElement,
    );
    const previewButton = getByRole(dataProductCard, 'button', {
      name: 'Learn More',
    });
    fireEvent.click(previewButton);

    expect(mockVisitAddress).toHaveBeenCalledWith(
      'https://example.com/products/dp-4',
    );
  },
);
