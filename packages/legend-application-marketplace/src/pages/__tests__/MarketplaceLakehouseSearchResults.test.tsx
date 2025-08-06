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

import { beforeEach, expect, jest, test } from '@jest/globals';
import { fireEvent, screen, getByTitle } from '@testing-library/react';
import {
  TEST__provideMockedLegendMarketplaceBaseStore,
  TEST__setUpMarketplaceLakehouse,
} from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { guaranteeNonNullable } from '@finos/legend-shared';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

const setupTestComponent = async (query?: string) => {
  const mockedStore = await TEST__provideMockedLegendMarketplaceBaseStore();
  jest
    .spyOn(
      mockedStore.applicationStore.navigationService.navigator,
      'getCurrentAddress',
    )
    .mockReturnValue('http://localhost/lakehouse/results?query=data');

  const { renderResult, MOCK__store } = await TEST__setUpMarketplaceLakehouse(
    mockedStore,
    `/lakehouse/results?query=${query ?? 'data'}`,
  );

  return { mockedStore: MOCK__store, renderResult };
};

beforeEach(() => {
  localStorage.clear();
});

test('renders search box pre-filled based on URL query param', async () => {
  expect(screen.getByDisplayValue('data')).toBeDefined();
});

test('displays cards for SDLC data products', async () => {
  await setupTestComponent();

  // Turn on prod-parallel filters
  const prodParallelFilterButton = screen.getByText('Prod-Parallel');
  fireEvent.click(prodParallelFilterButton);

  // Check for SLDC data products
  await screen.findByText('SDLC Release Data Product');
  screen.getByText('1.2.0');
  screen.getByText('PRODUCTION');
  screen.getByText(
    'Comprehensive customer analytics data for business intelligence and reporting',
  );

  // Check that SDLC data product without title uses ID
  await screen.findByText('SDLC_SNAPSHOT_DATAPRODUCT');
  screen.getByText('master-SNAPSHOT');
  screen.getByText('PRODUCTION_PARALLEL');
});

test('shows info popper for SDLC data products with correct details', async () => {
  await setupTestComponent();

  const dataProductTitle = await screen.findByText('SDLC Release Data Product');
  const dataProductCard = guaranteeNonNullable(
    dataProductTitle.parentElement?.parentElement,
  );

  const infoButton = getByTitle(dataProductCard, 'More Info');

  fireEvent.click(guaranteeNonNullable(infoButton));

  await screen.findByText('Description');
  expect(
    screen.getAllByText(
      'Comprehensive customer analytics data for business intelligence and reporting',
    ),
  ).toHaveLength(2);

  screen.getByText('Deployment Details');
  screen.getByText('Data Product ID');
  screen.getByText('SDLC_RELEASE_DATAPRODUCT');
  screen.getByText('Deployment ID');
  screen.getByText('12345');
  screen.getByText('Producer Environment Name');
  screen.getByText('production-analytics');
  screen.getByText('Producer Environment Type');
  expect(screen.getAllByText('PRODUCTION')).toHaveLength(2);

  screen.getByText('Data Product Project');
  screen.getByText('Group');
  screen.getByText('com.example.analytics');
  screen.getByText('Artifact');
  screen.getByText('customer-analytics');
  screen.getByText('Version');
  expect(screen.getAllByText('1.2.0')).toHaveLength(2);
  screen.getByText('Path');
  screen.getByText('test::dataproduct::Sdlc_Release_DataProduct');
});

test('filters data products by name based on query param', async () => {
  await setupTestComponent('release');

  await screen.findByText('SDLC Release Data Product');
  expect(screen.queryByText('SDLC_SNAPSHOT_DATAPRODUCT')).toBeNull();
});

test('Sort/Filter Panel correctly sorts and filters data products', async () => {
  await setupTestComponent();

  // Check sort option displays
  screen.getByText('Sort By');
  screen.getByText('Name A-Z');

  // Check filtering type
  screen.getByText('Filter By');
  screen.getByText('Deploy Type');
  const sdlcFilterButton = screen.getByText('SDLC Deployed');
  screen.getByText('Sandbox Deployed');
  screen.getByText('SDLC Release Data Product');
  fireEvent.click(sdlcFilterButton);
  expect(screen.queryByText('SDLC Release Data Product')).toBeNull();
  fireEvent.click(sdlcFilterButton);

  // Check filtering by deploy environment
  screen.getByText('Deploy Environment');
  screen.getByText('Dev');
  const prodParallelFilterButton = screen.getByText('Prod-Parallel');
  const prodFilterButton = screen.getByText('Prod');

  fireEvent.click(prodFilterButton);
  expect(screen.queryByText('SDLC Release Data Product')).toBeNull();

  fireEvent.click(prodParallelFilterButton);
  expect(screen.queryByText('SDLC Release Data Product')).toBeNull();
  expect(screen.queryByText('SDLC Snapshot Data Product')).toBeNull();
});

test('Clicking on SDLC data product card navigates to data product viewer page', async () => {
  const { mockedStore } = await setupTestComponent();

  const mockGoToLocation = jest.fn();
  mockedStore.applicationStore.navigationService.navigator.goToLocation =
    mockGoToLocation;

  const dataProductTitle = await screen.findByText('SDLC Release Data Product');
  fireEvent.click(dataProductTitle);

  expect(mockGoToLocation).toHaveBeenCalledWith(
    '/lakehouse/dataProduct/deployed/SDLC_RELEASE_DATAPRODUCT/12345',
  );
});
