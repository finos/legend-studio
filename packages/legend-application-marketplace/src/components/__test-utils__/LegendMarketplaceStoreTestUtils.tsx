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
import { createMock, createSpy } from '@finos/legend-shared/test';
import { jest } from '@jest/globals';
import {
  ApplicationStore,
  ApplicationStoreProvider,
} from '@finos/legend-application';
import { AuthProvider } from 'react-oidc-context';
import { TEST__BrowserEnvironmentProvider } from '@finos/legend-application/test';
import {
  type LegendMarketplaceApplicationStore,
  LegendMarketplaceBaseStore,
} from '../../stores/LegendMarketplaceBaseStore.js';
import { LEGEND_MARKETPLACE_TEST_ID } from '../../__lib__/LegendMarketplaceTesting.js';
import { LegendMarketplacePluginManager } from '../../application/LegendMarketplacePluginManager.js';
import { Core_LegendMarketplaceApplicationPlugin } from '../../application/extensions/Core_LegendMarketplaceApplicationPlugin.js';
import { TEST__getTestLegendMarketplaceApplicationConfig } from '../../application/__test-utils__/LegendMarketplaceApplicationTestUtils.js';
import { LegendMarketplaceFrameworkProvider } from '../../application/providers/LegendMarketplaceFrameworkProvider.js';
import searchResults from './TEST_DATA__SearchResults.json' with { type: 'json' };
import { LegendMarketplaceWebApplicationRouter } from '../../application/LegendMarketplaceWebApplication.js';
import type { LegendMarketplaceApplicationConfigurationData } from '../../application/LegendMarketplaceApplicationConfig.js';

jest.mock('@finos/legend-graph', () => {
  const actual: Record<string, unknown> = jest.requireActual(
    '@finos/legend-graph',
  );
  return {
    ...actual,
    getCurrentUserIDFromEngineServer: jest.fn(() =>
      Promise.resolve('test-consumer-user-id'),
    ),
  };
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

export const TEST__provideMockLegendMarketplaceBaseStore =
  async (customization?: {
    mockBaseStore?: LegendMarketplaceBaseStore;
    applicationStore?: LegendMarketplaceApplicationStore;
    pluginManager?: LegendMarketplacePluginManager;
    extraPlugins?: AbstractPlugin[];
    extraPresets?: AbstractPreset[];
    extraConfigData?:
      | Partial<LegendMarketplaceApplicationConfigurationData>
      | undefined;
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
        TEST__getTestLegendMarketplaceApplicationConfig(
          customization?.extraConfigData,
        ),
        pluginManager,
      );
    const mockBaseStore =
      customization?.mockBaseStore ??
      new LegendMarketplaceBaseStore(applicationStore);

    createSpy(
      mockBaseStore.lakehousePlatformServerClient,
      'getIngestEnvironmentSummaries',
    ).mockResolvedValue([]);

    const MOCK__LegendMarketplaceBaseStoreProvider = require('../../application/providers/LegendMarketplaceFrameworkProvider.js'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-require-imports
    MOCK__LegendMarketplaceBaseStoreProvider.useLegendMarketplaceBaseStore =
      createMock();
    MOCK__LegendMarketplaceBaseStoreProvider.useLegendMarketplaceBaseStore.mockReturnValue(
      mockBaseStore,
    );
    return mockBaseStore;
  };

export const TEST__setUpMarketplace = async (
  MOCK__store: LegendMarketplaceBaseStore,
  route?: string,
): Promise<{
  renderResult: RenderResult;
}> => {
  createSpy(
    MOCK__store.marketplaceServerClient,
    'semanticSearch',
  ).mockResolvedValue(searchResults);

  const renderResult = render(
    <ApplicationStoreProvider store={MOCK__store.applicationStore}>
      <TEST__BrowserEnvironmentProvider initialEntries={[route ?? '/']}>
        <LegendMarketplaceFrameworkProvider>
          <LegendMarketplaceWebApplicationRouter />
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

export const TEST__setUpMarketplaceLakehouse = async (
  MOCK__baseStore: LegendMarketplaceBaseStore,
  route?: string,
) => {
  const renderResult = render(
    <ApplicationStoreProvider store={MOCK__baseStore.applicationStore}>
      <AuthProvider>
        <TEST__BrowserEnvironmentProvider
          initialEntries={[route ?? '/']}
          baseUrl={route ?? '/'}
        >
          <LegendMarketplaceFrameworkProvider>
            <LegendMarketplaceWebApplicationRouter />
          </LegendMarketplaceFrameworkProvider>
        </TEST__BrowserEnvironmentProvider>
      </AuthProvider>
    </ApplicationStoreProvider>,
  );

  await waitFor(() =>
    renderResult.getByTestId(LEGEND_MARKETPLACE_TEST_ID.HEADER),
  );

  return {
    renderResult,
  };
};
