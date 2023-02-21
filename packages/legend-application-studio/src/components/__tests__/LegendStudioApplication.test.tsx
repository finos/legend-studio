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
import { LegendStudioApplicationRoot } from '../LegendStudioApplication.js';
import {
  type TEMPORARY__JestMatcher,
  integrationTest,
  noop,
  createSpy,
} from '@finos/legend-shared';
import {
  WebApplicationNavigator,
  TEST__provideMockedApplicationStore,
  TEST__ApplicationStoreProvider,
  TEST__provideMockedWebApplicationNavigator,
  LegendApplicationComponentFrameworkProvider,
  MemoryRouter,
  createMemoryHistory,
} from '@finos/legend-application';
import { TEST__LegendStudioBaseStoreProvider } from '../EditorComponentTestUtils.js';
import { render, waitFor } from '@testing-library/react';
import {
  SDLCServerClient,
  TEST__provideMockedSDLCServerClient,
  TEST__SDLCServerClientProvider,
} from '@finos/legend-server-sdlc';
import { TEST__DepotServerClientProvider } from '@finos/legend-server-depot';
import { TEST__getLegendStudioApplicationConfig } from '../../stores/EditorStoreTestUtils.js';
import { LegendStudioPluginManager } from '../../application/LegendStudioPluginManager.js';

test(
  integrationTest('Failed to accept SDLC Terms of Service will show alert'),
  async () => {
    const sdlcServerClient = TEST__provideMockedSDLCServerClient();

    createSpy(sdlcServerClient, 'isAuthorized').mockResolvedValueOnce(true);
    createSpy(sdlcServerClient, 'getCurrentUser').mockResolvedValueOnce({
      name: 'testUser',
      userId: 'testUserId',
    });
    createSpy(
      sdlcServerClient,
      'hasAcceptedTermsOfService',
    ).mockResolvedValueOnce(['stubUrl']);
    createSpy(sdlcServerClient, 'getProjects').mockResolvedValue([]);
    createSpy(
      sdlcServerClient,
      'fetchServerFeaturesConfiguration',
    ).mockResolvedValue();

    TEST__provideMockedWebApplicationNavigator();

    const { queryByText } = render(
      <MemoryRouter>
        <TEST__ApplicationStoreProvider
          config={TEST__getLegendStudioApplicationConfig()}
          pluginManager={LegendStudioPluginManager.create()}
        >
          <TEST__SDLCServerClientProvider>
            <TEST__DepotServerClientProvider>
              <TEST__LegendStudioBaseStoreProvider>
                <LegendApplicationComponentFrameworkProvider>
                  <LegendStudioApplicationRoot />
                </LegendApplicationComponentFrameworkProvider>
              </TEST__LegendStudioBaseStoreProvider>
            </TEST__DepotServerClientProvider>
          </TEST__SDLCServerClientProvider>
        </TEST__ApplicationStoreProvider>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(queryByText('See terms of services')).not.toBeNull(),
    );
  },
);

test(integrationTest('Failed to authorize SDLC will redirect'), async () => {
  const navigator = new WebApplicationNavigator(createMemoryHistory());
  TEST__provideMockedWebApplicationNavigator({ mock: navigator });

  const applicationStore = TEST__provideMockedApplicationStore(
    TEST__getLegendStudioApplicationConfig(),
    LegendStudioPluginManager.create(),
    { navigator },
  );
  const sdlcServerClient = TEST__provideMockedSDLCServerClient();
  const stubURL = 'stubUrl';

  createSpy(sdlcServerClient, 'isAuthorized').mockResolvedValueOnce(false);
  createSpy(sdlcServerClient, 'getCurrentUser').mockResolvedValueOnce({
    name: 'testUser',
    userId: 'testUserId',
  });

  const navigationActionSpy = createSpy(
    navigator,
    'goToAddress',
  ).mockImplementation(noop);
  createSpy(navigator, 'getCurrentAddress').mockImplementationOnce(
    () => stubURL,
  );

  render(
    <MemoryRouter>
      <TEST__ApplicationStoreProvider
        config={TEST__getLegendStudioApplicationConfig()}
        pluginManager={LegendStudioPluginManager.create()}
      >
        <TEST__SDLCServerClientProvider>
          <TEST__DepotServerClientProvider>
            <TEST__LegendStudioBaseStoreProvider>
              <LegendApplicationComponentFrameworkProvider>
                <LegendStudioApplicationRoot />
              </LegendApplicationComponentFrameworkProvider>
            </TEST__LegendStudioBaseStoreProvider>
          </TEST__DepotServerClientProvider>
        </TEST__SDLCServerClientProvider>
      </TEST__ApplicationStoreProvider>
    </MemoryRouter>,
  );

  await waitFor(() =>
    expect(navigationActionSpy as TEMPORARY__JestMatcher).toHaveBeenCalledWith(
      SDLCServerClient.authorizeCallbackUrl(
        applicationStore.config.sdlcServerUrl,
        stubURL,
      ),
    ),
  );
});
