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
import { fireEvent, screen, waitFor, getByTitle } from '@testing-library/react';
import {
  TEST__provideMockedLegendMarketplaceBaseStore,
  TEST__setUpMarketplaceLakehouse,
} from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { guaranteeNonNullable } from '@finos/legend-shared';

jest.mock('react-oidc-context', () => {
  const mockedModule: { MOCK__reactOIDCContext: unknown } = jest.requireActual(
    '@finos/legend-shared/test',
  );
  return mockedModule.MOCK__reactOIDCContext;
});

const setupTestComponent = async () => {
  const mockedStore = await TEST__provideMockedLegendMarketplaceBaseStore();
  const { renderResult, MOCK__store } =
    await TEST__setUpMarketplaceLakehouse(mockedStore);

  return { mockedStore: MOCK__store, renderResult };
};

beforeEach(() => {
  localStorage.clear();
});

test('renders header with Legend Marketplace title and Entitlements button and Marketplace landing title', async () => {
  await setupTestComponent();

  expect(await screen.findAllByText(/^Legend Marketplace$/)).toHaveLength(2);

  expect(screen.getByText('Entitlements')).toBeDefined();
});

test('renders search box with correct placeholder', async () => {
  await setupTestComponent();

  expect(
    screen.getByPlaceholderText('Search Legend Marketplace'),
  ).toBeDefined();
});

test('displays cards for both SDLC and sandbox data products', async () => {
  await setupTestComponent();

  await screen.findByText('Test SDLC Data Product');
  await screen.findByText('1.0.0');
  await screen.findByText('Prod Sandbox Data Product');
});

test('shows info popper for SDLC data products with correct details', async () => {
  await setupTestComponent();

  const dataProductTitle = await screen.findByText('Test SDLC Data Product');
  const dataProductCard = guaranteeNonNullable(
    dataProductTitle.parentElement?.parentElement,
  );

  const infoButton = getByTitle(dataProductCard, 'More Info');

  fireEvent.click(guaranteeNonNullable(infoButton));

  await screen.findByText('Description');
  screen.getByText('Data Product Project');
  screen.getByText('Group');
  screen.getByText('Artifact');
  screen.getByText('Version');
  screen.getByText('Path');
  expect(await screen.findAllByText('Test SDLC Data Product')).toHaveLength(2);
  expect(
    screen.getAllByText('A test SDLC data product for testing purposes'),
  ).toHaveLength(2);
  screen.getByText('com.example');
  screen.getByText('test-sdlc-data-product');
  expect(screen.getAllByText('1.0.0')).toHaveLength(2);
  screen.getByText('test::dataproduct::TestSDLCDataProduct');
});

test('filters data products by name when typing in search box', async () => {
  await setupTestComponent();

  await screen.findByText('Test SDLC Data Product');
  screen.getByText('Prod Sandbox Data Product');

  const searchBox = screen.getByPlaceholderText('Search Legend Marketplace');
  fireEvent.change(searchBox, { target: { value: 'Test' } });

  screen.getByText('Test SDLC Data Product');

  expect(screen.queryByText('Prod Sandbox Data Product')).toBeNull();
});

test('Sort/Filter Panel correctly sorts and filters data products', async () => {
  await setupTestComponent();

  // Check sort option displays
  screen.getByText('Sort By');
  screen.getByText('Name A-Z');

  // Check filtering deploy type
  screen.getByText('Filter By');
  screen.getByText('Deploy Type');
  const sdlcFilterButton = screen.getByText('SDLC Deployed');
  const sandboxFilterButton = screen.getByText('Sandbox Deployed');
  screen.getByText('Test SDLC Data Product');
  screen.getByText('Prod Sandbox Data Product');
  fireEvent.click(sdlcFilterButton);
  expect(screen.queryByText('Test SDLC Data Product')).toBeNull();
  screen.getByText('Prod Sandbox Data Product');
  fireEvent.click(sandboxFilterButton);
  expect(screen.queryByText('Test SDLC Data Product')).toBeNull();
  expect(screen.queryByText('Prod Sandbox Data Product')).toBeNull();

  // Check filtering by deploy environment
  screen.getByText('Deploy Environment');
  fireEvent.click(sandboxFilterButton);
  const devFilterButton = screen.getByText('Dev');
  const prodParallelFilterButton = screen.getByText('Prod-Parallel');
  const prodFilterButton = screen.getByText('Prod');
  screen.getByText('Prod Sandbox Data Product');

  fireEvent.click(prodFilterButton);
  expect(screen.queryByText('Dev Sandbox Data Product')).toBeNull();
  expect(screen.queryByText('Prod-Parallel Sandbox Data Product')).toBeNull();
  expect(screen.queryByText('Prod Sandbox Data Product')).toBeNull();

  fireEvent.click(devFilterButton);
  screen.getByText('Dev Sandbox Data Product');
  expect(screen.queryByText('Prod-Parallel Sandbox Data Product')).toBeNull();
  expect(screen.queryByText('Prod Sandbox Data Product')).toBeNull();
  fireEvent.click(devFilterButton);

  fireEvent.click(prodParallelFilterButton);
  expect(screen.queryByText('Dev Sandbox Data Product')).toBeNull();
  screen.queryByText('Prod-Parallel Sandbox Data Product');
  expect(screen.queryByText('Prod Sandbox Data Product')).toBeNull();
});

test('Uses packageable element name for data products without titles', async () => {
  await setupTestComponent();

  await screen.findByText('AnotherSDLCDataProduct');
});

test('Clicking on SDLC version button shows list of available versions', async () => {
  await setupTestComponent();

  await screen.findByText('Test SDLC Data Product');
  const versionButton = screen.getByText('1.0.0');

  fireEvent.click(versionButton);

  const snapshotMenuItem = await screen.findByText('master-SNAPSHOT');
  fireEvent.click(snapshotMenuItem);
  await waitFor(() =>
    expect(screen.getAllByText('master-SNAPSHOT')).toHaveLength(1),
  );

  await screen.findByText('Test Snapshot SDLC Data Product');
  screen.getByText('master-SNAPSHOT');
  expect(screen.queryByText('Test SDLC Data Product')).toBeNull();
  expect(screen.queryByText('1.0.0')).toBeNull();
});

test('Clicking on SDLC data product card navigates to data product viewer page', async () => {
  const { mockedStore } = await setupTestComponent();

  const mockGoToLocation = jest.fn();
  mockedStore.applicationStore.navigationService.navigator.goToLocation =
    mockGoToLocation;

  const dataProductTitle = await screen.findByText('Test SDLC Data Product');
  fireEvent.click(dataProductTitle);

  expect(mockGoToLocation).toHaveBeenCalledWith(
    '/lakehouse/dataProduct/com.example:test-sdlc-data-product:1.0.0/test::dataproduct::TestSDLCDataProduct',
  );
});

test('Clicking on sandbox data product card navigates to data product viewer page', async () => {
  const { mockedStore } = await setupTestComponent();

  const mockGoToLocation = jest.fn();
  mockedStore.applicationStore.navigationService.navigator.goToLocation =
    mockGoToLocation;

  const dataProductTitle = await screen.findByText('Prod Sandbox Data Product');
  fireEvent.click(dataProductTitle);

  expect(mockGoToLocation).toHaveBeenCalledWith(
    '/lakehouse/dataProduct/sandbox/test-prod-urn/sandbox%3A%3Adataproduct%3A%3AProdSandboxDataProduct',
  );
});
