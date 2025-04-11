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
import { test } from '@jest/globals';
import { screen } from '@testing-library/dom';
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
    await screen.findByText('Welcome to Legend Marketplace');
  },
);
