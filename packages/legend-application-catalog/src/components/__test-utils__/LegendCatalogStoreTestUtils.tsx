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
  LegendCatalogBaseStore,
  type LegendCatalogApplicationStore,
} from '../../stores/LegendCatalogBaseStore.js';
import { LegendCatalogFrameworkProvider } from '../LegendCatalogFrameworkProvider.js';
import { LEGEND_CATALOG_ROUTE_PATTERN } from '../../__lib__/LegendCatalogNavigation.js';
import { LegendCatalogHome } from '../home/LegendCatalogHome.js';
import { LEGEND_CATALOG_TEST_ID } from '../../__lib__/LegendCatalogTesting.js';
import { LegendCatalogPluginManager } from '../../application/LegendCatalogPluginManager.js';
import { Core_LegendCatalogApplicationPlugin } from '../extensions/Core_LegendCatalogApplicationPlugin.js';
import { TEST__getTestLegendCatalogApplicationConfig } from '../../application/__test-utils__/LegendCatalogApplicationTestUtils.js';

export const TEST__provideMockedLegendCatalogBaseStore =
  async (customization?: {
    mock?: LegendCatalogBaseStore;
    applicationStore?: LegendCatalogApplicationStore;
    pluginManager?: LegendCatalogPluginManager;
    extraPlugins?: AbstractPlugin[];
    extraPresets?: AbstractPreset[];
  }): Promise<LegendCatalogBaseStore> => {
    const pluginManager =
      customization?.pluginManager ?? LegendCatalogPluginManager.create();
    pluginManager
      .usePlugins([
        new Core_LegendCatalogApplicationPlugin(),
        ...(customization?.extraPlugins ?? []),
      ])
      .usePresets([...(customization?.extraPresets ?? [])])
      .install();
    const applicationStore =
      customization?.applicationStore ??
      new ApplicationStore(
        TEST__getTestLegendCatalogApplicationConfig(),
        pluginManager,
      );
    const value =
      customization?.mock ?? new LegendCatalogBaseStore(applicationStore);
    const MOCK__LegendCatalogBaseStoreProvider = require('../LegendCatalogFrameworkProvider.js'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
    MOCK__LegendCatalogBaseStoreProvider.useLegendCatalogBaseStore =
      createMock();
    MOCK__LegendCatalogBaseStoreProvider.useLegendCatalogBaseStore.mockReturnValue(
      value,
    );
    return value;
  };

export const TEST__setUpCatalog = async (
  MOCK__store: LegendCatalogBaseStore,
): Promise<{
  renderResult: RenderResult;
}> => {
  const renderResult = render(
    <ApplicationStoreProvider store={MOCK__store.applicationStore}>
      <TEST__BrowserEnvironmentProvider initialEntries={['/']}>
        <LegendCatalogFrameworkProvider>
          <Routes>
            <Route
              path={LEGEND_CATALOG_ROUTE_PATTERN.DEFAULT}
              element={<LegendCatalogHome />}
            />
          </Routes>
        </LegendCatalogFrameworkProvider>
      </TEST__BrowserEnvironmentProvider>
    </ApplicationStoreProvider>,
  );
  await waitFor(() => renderResult.getByTestId(LEGEND_CATALOG_TEST_ID.HEADER));

  return {
    renderResult,
  };
};
