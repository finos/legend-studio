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
  TEST__provideMockLegendMarketplaceBaseStore,
  TEST__setUpMarketplaceLakehouse,
} from '../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { TestLegendMarketplaceApplicationPlugin } from '../../application/__test-utils__/LegendMarketplaceApplicationTestUtils.js';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

jest.mock('swiper/react', () => ({
  Swiper: ({}) => <div></div>,
  SwiperSlide: ({}) => <div></div>,
}));

jest.mock('swiper/modules', () => ({
  Navigation: ({}) => <div></div>,
  Pagination: ({}) => <div></div>,
  Autoplay: ({}) => <div></div>,
}));

const setupTestComponent = async () => {
  const MOCK__baseStore = await TEST__provideMockLegendMarketplaceBaseStore({
    extraPlugins: [new TestLegendMarketplaceApplicationPlugin()],
  });

  const { renderResult } =
    await TEST__setUpMarketplaceLakehouse(MOCK__baseStore);

  return { MOCK__baseStore, renderResult };
};

test('renders header with Marketplace title and Entitlements button and Marketplace landing title', async () => {
  await setupTestComponent();
  expect(screen.getByText('Data Products')).toBeDefined();
  expect(screen.getByText('Data APIs')).toBeDefined();
  expect(screen.getByText('Intelligence and AI Agents')).toBeDefined();
  expect(screen.getByText('Terminals and Addons')).toBeDefined();
});

test('renders search box with correct placeholder', async () => {
  await setupTestComponent();

  expect(
    screen.getByPlaceholderText('Which data can I help you find?'),
  ).toBeDefined();
});

// TODO: update tests when API ready and mock API call
test.skip('renders highlighted data products from plugin', async () => {
  await setupTestComponent();

  await screen.findByText('SDLC Release Data Product');
  await screen.findByText(
    'Comprehensive customer analytics data for business intelligence and reporting',
  );
});

test("doesn't navigate to search results page if search box is empty", async () => {
  const { MOCK__baseStore } = await setupTestComponent();
  const mockGoToLocation = jest.fn();
  MOCK__baseStore.applicationStore.navigationService.navigator.goToLocation =
    mockGoToLocation;

  const searchInput = screen.getByPlaceholderText(
    'Which data can I help you find?',
  );
  fireEvent.keyPress(searchInput, {
    key: 'Enter',
    code: 'Enter',
  });

  expect(mockGoToLocation).not.toHaveBeenCalled();
});

test('navigates to search results page if search box contains text', async () => {
  const { MOCK__baseStore } = await setupTestComponent();
  const mockGoToLocation = jest.fn();
  MOCK__baseStore.applicationStore.navigationService.navigator.goToLocation =
    mockGoToLocation;

  const searchInput = screen.getByPlaceholderText(
    'Which data can I help you find?',
  );
  const searchButton = screen.getByTitle('search');
  fireEvent.change(searchInput, { target: { value: 'data' } });
  fireEvent.click(searchButton);

  await waitFor(() =>
    expect(mockGoToLocation).toHaveBeenLastCalledWith(
      '/dataProduct/results?query=data',
    ),
  );
});
