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

import { expect, jest, test } from '@jest/globals';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  TEST__provideMockedLegendMarketplaceBaseStore,
  TEST__setUpMarketplaceLakehouse,
} from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { guaranteeNonNullable } from '@finos/legend-shared';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual(
    '@finos/legend-shared/test',
  ) as Record<string, unknown>;
  return MOCK__reactOIDCContext;
});

const setupTestComponent = async () => {
  const mockedStore = await TEST__provideMockedLegendMarketplaceBaseStore();
  const { renderResult, MOCK__store } =
    await TEST__setUpMarketplaceLakehouse(mockedStore);

  return { mockedStore: MOCK__store, renderResult };
};

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

  await screen.findByText('Test Data Product');
  await screen.findByText('Sandbox Data Product');
  await screen.findByText('1.0.0');
});

// test('shows info popper for SDLC data products with correct details', async () => {
//   await setupTestComponent();

//   await waitFor(() => {
//     expect(screen.getByText('TestDataProduct')).toBeDefined();
//   });

//   const infoButtons = screen.getAllByLabelText('Info');
//   expect(infoButtons.length).toBeGreaterThan(0);

//   fireEvent.click(guaranteeNonNullable(infoButtons[0]));

//   await waitFor(() => {
//     expect(screen.getByText('Test Data Product')).toBeDefined();
//     expect(
//       screen.getByText('A test data product for testing purposes'),
//     ).toBeDefined();
//     expect(screen.getByText('com.example')).toBeDefined();
//     expect(screen.getByText('test-data-product')).toBeDefined();
//     expect(screen.getByText('1.0.0')).toBeDefined();
//     expect(
//       screen.getByText('test::dataproduct::TestDataProduct'),
//     ).toBeDefined();
//   });
// });

// test('filters data products by name when typing in search box', async () => {
//   await setupTestComponent();

//   await waitFor(() => {
//     expect(screen.getByText('TestDataProduct')).toBeDefined();
//   });

//   expect(screen.getByText('TestDataProduct')).toBeDefined();
//   expect(screen.getByText('Sandbox Data Product')).toBeDefined();

//   const searchBox = screen.getByPlaceholderText('Search Legend Marketplace');
//   fireEvent.change(searchBox, { target: { value: 'Test' } });

//   await waitFor(() => {
//     expect(screen.getByText('TestDataProduct')).toBeDefined();
//   });

//   expect(screen.queryByText('Sandbox Data Product')).toBeNull();
// });

// test('renders sort/filter panel with all expected options', async () => {
//   await setupTestComponent();

//   await waitFor(
//     () => {
//       expect(screen.getByText('Sort By')).toBeDefined();
//     },
//     { timeout: 10000 },
//   );

//   expect(screen.getByText('Sort By')).toBeDefined();
//   expect(screen.getByText('Name A-Z')).toBeDefined();
//   expect(screen.getByText('Filter By')).toBeDefined();
//   expect(screen.getByText('Deploy Type')).toBeDefined();
//   expect(screen.getByText('SDLC Deployed')).toBeDefined();
//   expect(screen.getByText('Sandbox Deployed')).toBeDefined();
//   expect(screen.getByText('Deploy Environment')).toBeDefined();
//   expect(screen.getByText('Dev')).toBeDefined();
//   expect(screen.getByText('Prod-Parallel')).toBeDefined();
//   expect(screen.getByText('Prod')).toBeDefined();
// });

// test('uses path-based naming for data products without titles', async () => {
//   await setupTestComponent();

//   await waitFor(() => {
//     expect(screen.getByText('AnotherDataProduct')).toBeDefined();
//   });

//   expect(screen.getByText('AnotherDataProduct')).toBeDefined();
// });
