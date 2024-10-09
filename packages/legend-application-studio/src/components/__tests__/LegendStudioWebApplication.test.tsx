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

import { test, expect } from '@jest/globals';
import { noop } from '@finos/legend-shared';
import {
  type TEMPORARY__JestMatcher,
  integrationTest,
  createSpy,
} from '@finos/legend-shared/test';
import {
  ApplicationStore,
  ApplicationStoreProvider,
} from '@finos/legend-application';
import {
  TEST__BrowserEnvironmentProvider,
  TEST__provideMockedBrowserPlatform,
} from '@finos/legend-application/test';
import { render, waitFor } from '@testing-library/react';
import { SDLCServerClient } from '@finos/legend-server-sdlc';
import { TEST__provideMockedLegendStudioBaseStore } from '../__test-utils__/LegendStudioFrameworkTestUtils.js';
import { LegendStudioFrameworkProvider } from '../LegendStudioFrameworkProvider.js';
import { LegendStudioWebApplicationRouter } from '../LegendStudioWebApplication.js';
import { TEST__getLegendStudioApplicationConfig } from '../../stores/__test-utils__/LegendStudioApplicationTestUtils.js';
import { LegendStudioPluginManager } from '../../application/LegendStudioPluginManager.js';

test(
  integrationTest('Failed to accept SDLC Terms of Service will show alert'),
  async () => {
    const baseStore = TEST__provideMockedLegendStudioBaseStore();

    createSpy(baseStore.sdlcServerClient, 'isAuthorized').mockResolvedValueOnce(
      true,
    );
    createSpy(
      baseStore.sdlcServerClient,
      'getCurrentUser',
    ).mockResolvedValueOnce({
      name: 'testUser',
      userId: 'testUserId',
    });
    createSpy(
      baseStore.sdlcServerClient,
      'hasAcceptedTermsOfService',
    ).mockResolvedValueOnce(['stubUrl']);
    createSpy(baseStore.sdlcServerClient, 'getProjects').mockResolvedValue([]);
    createSpy(
      baseStore.sdlcServerClient,
      'fetchServerFeaturesConfiguration',
    ).mockResolvedValue();

    const { queryByText } = render(
      <ApplicationStoreProvider store={baseStore.applicationStore}>
        <TEST__BrowserEnvironmentProvider initialEntries={['/']}>
          <LegendStudioFrameworkProvider>
            <LegendStudioWebApplicationRouter />
          </LegendStudioFrameworkProvider>
        </TEST__BrowserEnvironmentProvider>
      </ApplicationStoreProvider>,
    );

    await waitFor(() =>
      expect(queryByText('See terms of services')).not.toBeNull(),
    );
  },
);

test(integrationTest('Failed to authorize SDLC will redirect'), async () => {
  const applicationStore = new ApplicationStore(
    TEST__getLegendStudioApplicationConfig(),
    LegendStudioPluginManager.create(),
  );
  const MOCK__browserPlatform =
    TEST__provideMockedBrowserPlatform(applicationStore);
  const baseStore = TEST__provideMockedLegendStudioBaseStore({
    applicationStore,
  });

  const stubURL = 'stubUrl';

  createSpy(baseStore.sdlcServerClient, 'isAuthorized').mockResolvedValueOnce(
    false,
  );
  createSpy(baseStore.sdlcServerClient, 'getCurrentUser').mockResolvedValueOnce(
    {
      name: 'testUser',
      userId: 'testUserId',
    },
  );

  const navigator = MOCK__browserPlatform.getNavigator();
  createSpy(MOCK__browserPlatform, 'getNavigator').mockReturnValue(navigator);
  createSpy(navigator, 'getCurrentAddress').mockImplementation(() => stubURL);
  const navigationActionSpy = createSpy(
    navigator,
    'goToAddress',
  ).mockImplementation(noop);

  render(
    <ApplicationStoreProvider store={baseStore.applicationStore}>
      <TEST__BrowserEnvironmentProvider initialEntries={['/']}>
        <LegendStudioFrameworkProvider>
          <LegendStudioWebApplicationRouter />
        </LegendStudioFrameworkProvider>
      </TEST__BrowserEnvironmentProvider>
    </ApplicationStoreProvider>,
  );

  await waitFor(() =>
    expect(navigationActionSpy as TEMPORARY__JestMatcher).toHaveBeenCalledWith(
      SDLCServerClient.authorizeCallbackUrl(
        baseStore.applicationStore.config.sdlcServerUrl,
        stubURL,
      ),
    ),
  );
});
