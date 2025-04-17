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
import { fireEvent, screen } from '@testing-library/dom';
import {
  TEST__provideMockedLegendMarketplaceBaseStore,
  TEST__setUpMarketplace,
} from '../__test-utils__/LegendMarketplaceStoreTestUtils.js';

test(
  integrationTest('Legend Marketplace home page with header loads'),
  async () => {
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendMarketplaceBaseStore();
    await TEST__setUpMarketplace(mockedLegendDataCubeBuilderStore);
    await screen.findByText(/^Legend Marketplace$/);
    screen.getByText('All data in');
    screen.getByText('One Place');
    screen.getByText(
      'Discover the right data and accelerate analytic productivity.',
    );
    screen.getByPlaceholderText('Search');
    screen.getByText('Explore our Data');
  },
);

test(
  integrationTest(
    'Legend Marketplace search box navigates to search results page with query paramereters',
  ),
  async () => {
    const mockedLegendDataCubeBuilderStore =
      await TEST__provideMockedLegendMarketplaceBaseStore();
    await TEST__setUpMarketplace(mockedLegendDataCubeBuilderStore);
    // Mock navigation service
    mockedLegendDataCubeBuilderStore.applicationStore.navigationService.navigator.goToLocation =
      jest.fn();

    await screen.findByText(/^Legend Marketplace$/);

    const searchBox = screen.getByPlaceholderText('Search');
    fireEvent.change(searchBox, { target: { value: 'test' } });
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));

    expect(
      mockedLegendDataCubeBuilderStore.applicationStore.navigationService
        .navigator.goToLocation,
    ).toHaveBeenCalledWith('/results?query=test');
  },
);
