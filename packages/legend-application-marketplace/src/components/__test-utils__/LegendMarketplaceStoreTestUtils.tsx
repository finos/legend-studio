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

import { type RenderResult, render, waitFor } from '@testing-library/react';
import { type AbstractPlugin, type AbstractPreset } from '@finos/legend-shared';
import { createMock } from '@finos/legend-shared/test';
import {
  ApplicationStore,
  ApplicationStoreProvider,
} from '@finos/legend-application';
import { TEST__BrowserEnvironmentProvider } from '@finos/legend-application/test';
import { Route, Routes } from '@finos/legend-application/browser';
import {
  type LegendMarketplaceApplicationStore,
  LegendMarketplaceBaseStore,
} from '../../stores/LegendMarketplaceBaseStore.js';
import { LEGEND_MARKETPLACE_ROUTE_PATTERN } from '../../__lib__/LegendMarketplaceNavigation.js';
import { LegendMarketplaceHome } from '../../pages/Home/LegendMarketplaceHome.js';
import { LEGEND_MARKETPLACE_TEST_ID } from '../../__lib__/LegendMarketplaceTesting.js';
import { LegendMarketplacePluginManager } from '../../application/LegendMarketplacePluginManager.js';
import { Core_LegendMarketplaceApplicationPlugin } from '../../application/extensions/Core_LegendMarketplaceApplicationPlugin.js';
import { TEST__getTestLegendMarketplaceApplicationConfig } from '../../application/__test-utils__/LegendMarketplaceApplicationTestUtils.js';
import { LegendMarketplaceFrameworkProvider } from '../../application/LegendMarketplaceFrameworkProvider.js';

export const TEST__provideMockedLegendMarketplaceBaseStore =
  async (customization?: {
    mock?: LegendMarketplaceBaseStore;
    applicationStore?: LegendMarketplaceApplicationStore;
    pluginManager?: LegendMarketplacePluginManager;
    extraPlugins?: AbstractPlugin[];
    extraPresets?: AbstractPreset[];
  }): Promise<LegendMarketplaceBaseStore> => {
    const pluginManager =
      customization?.pluginManager ?? LegendMarketplacePluginManager.create();
    pluginManager
      .usePlugins([
        new Core_LegendMarketplaceApplicationPlugin(),
        ...(customization?.extraPlugins ?? []),
      ])
      .usePresets([...(customization?.extraPresets ?? [])])
      .install();
    const applicationStore =
      customization?.applicationStore ??
      new ApplicationStore(
        TEST__getTestLegendMarketplaceApplicationConfig(),
        pluginManager,
      );
    const value =
      customization?.mock ?? new LegendMarketplaceBaseStore(applicationStore);
    const MOCK__LegendMarketplaceBaseStoreProvider = require('../../application/LegendMarketplaceFrameworkProvider.js'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
    MOCK__LegendMarketplaceBaseStoreProvider.useLegendMarketplaceBaseStore =
      createMock();
    MOCK__LegendMarketplaceBaseStoreProvider.useLegendMarketplaceBaseStore.mockReturnValue(
      value,
    );
    return value;
  };

export const TEST__setUpMarketplace = async (
  MOCK__store: LegendMarketplaceBaseStore,
): Promise<{
  renderResult: RenderResult;
}> => {
  const renderResult = render(
    <ApplicationStoreProvider store={MOCK__store.applicationStore}>
      <TEST__BrowserEnvironmentProvider initialEntries={['/']}>
        <LegendMarketplaceFrameworkProvider>
          <Routes>
            <Route
              path={LEGEND_MARKETPLACE_ROUTE_PATTERN.DEFAULT}
              element={<LegendMarketplaceHome />}
            />
          </Routes>
        </LegendMarketplaceFrameworkProvider>
      </TEST__BrowserEnvironmentProvider>
    </ApplicationStoreProvider>,
  );
  await waitFor(() =>
    renderResult.getByTestId(LEGEND_MARKETPLACE_TEST_ID.HEADER),
  );

  return {
    renderResult,
  };
};
