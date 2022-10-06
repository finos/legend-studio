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

import { test, jest, expect } from '@jest/globals';
import { LegendStudioApplicationRoot } from '../LegendStudioApplication.js';
import {
  integrationTest,
  noop,
  type TEMPORARY__JestMock,
} from '@finos/legend-shared';
import {
  WebApplicationNavigator,
  TEST__provideMockedApplicationStore,
  TEST__ApplicationStoreProvider,
  TEST__provideMockedWebApplicationNavigator,
  LegendApplicationComponentFrameworkProvider,
} from '@finos/legend-application';
import { TEST__LegendStudioBaseStoreProvider } from '../EditorComponentTestUtils.js';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { createMemoryHistory } from 'history';
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

    jest
      .spyOn(sdlcServerClient, 'isAuthorized')
      .mockReturnValueOnce(Promise.resolve(true));
    jest
      .spyOn(sdlcServerClient, 'getCurrentUser')
      .mockReturnValueOnce(
        Promise.resolve({ name: 'testUser', userId: 'testUserId' }),
      );
    jest
      .spyOn(sdlcServerClient, 'hasAcceptedTermsOfService')
      .mockReturnValueOnce(Promise.resolve(['stubUrl']));
    jest
      .spyOn(sdlcServerClient, 'getProjects')
      .mockReturnValue(Promise.resolve([]));
    jest
      .spyOn(sdlcServerClient, 'fetchServerFeaturesConfiguration')
      .mockReturnValue(Promise.resolve());

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
  const applicationStore = TEST__provideMockedApplicationStore(
    TEST__getLegendStudioApplicationConfig(),
    LegendStudioPluginManager.create(),
  );
  const sdlcServerClient = TEST__provideMockedSDLCServerClient();
  const stubURL = 'stubUrl';

  jest
    .spyOn(sdlcServerClient, 'isAuthorized')
    .mockReturnValueOnce(Promise.resolve(false));
  jest
    .spyOn(sdlcServerClient, 'getCurrentUser')
    .mockReturnValueOnce(
      Promise.resolve({ name: 'testUser', userId: 'testUserId' }),
    );
  const navigator = new WebApplicationNavigator(createMemoryHistory());
  applicationStore.navigator = navigator;
  const navigationActionSpy = jest
    .spyOn(navigator, 'visitAddress')
    .mockImplementation(noop);
  jest
    .spyOn(navigator, 'getCurrentAddress')
    .mockImplementationOnce(() => stubURL);

  TEST__provideMockedWebApplicationNavigator();

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
    expect(navigationActionSpy as TEMPORARY__JestMock).toHaveBeenCalledWith(
      SDLCServerClient.authorizeCallbackUrl(
        applicationStore.config.sdlcServerUrl,
        stubURL,
      ),
      expect.anything(),
    ),
  );
});
