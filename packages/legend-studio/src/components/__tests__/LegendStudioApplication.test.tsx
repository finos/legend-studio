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

import { LegendStudioApplicationRoot } from '../LegendStudioApplication';
import {
  integrationTest,
  MOBX__enableSpyOrMock,
  MOBX__disableSpyOrMock,
} from '@finos/legend-shared';
import { waitFor } from '@testing-library/dom';
import {
  WebApplicationNavigator,
  TEST__provideMockedApplicationStore,
  TEST__ApplicationStoreProvider,
  TEST__provideMockedWebApplicationNavigator,
} from '@finos/legend-application';
import { TEST__LegendStudioStoreProvider } from '../EditorComponentTestUtils';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import {
  SDLCServerClient,
  TEST__provideMockedSDLCServerClient,
  TEST__SDLCServerClientProvider,
} from '@finos/legend-server-sdlc';
import { TEST__DepotServerClientProvider } from '@finos/legend-server-depot';
import { TEST__getTestStudioConfig } from '../../stores/EditorStoreTestUtils';
import { LegendStudioPluginManager } from '../../application/LegendStudioPluginManager';

test(integrationTest('App header is displayed properly'), async () => {
  const sdlcServerClient = TEST__provideMockedSDLCServerClient();

  MOBX__enableSpyOrMock();
  jest.spyOn(sdlcServerClient, 'isAuthorized').mockResolvedValueOnce(true);
  jest
    .spyOn(sdlcServerClient, 'getCurrentUser')
    .mockResolvedValueOnce({ name: 'testUser', userId: 'testUserId' });
  jest
    .spyOn(sdlcServerClient, 'hasAcceptedTermsOfService')
    .mockResolvedValueOnce([]);
  jest.spyOn(sdlcServerClient, 'getProjects').mockResolvedValue([]);
  MOBX__disableSpyOrMock();
  TEST__provideMockedWebApplicationNavigator();

  const { queryByText } = render(
    <MemoryRouter>
      <TEST__ApplicationStoreProvider
        config={TEST__getTestStudioConfig()}
        pluginManager={LegendStudioPluginManager.create()}
      >
        <TEST__SDLCServerClientProvider>
          <TEST__DepotServerClientProvider>
            <TEST__LegendStudioStoreProvider>
              <LegendStudioApplicationRoot />
            </TEST__LegendStudioStoreProvider>
          </TEST__DepotServerClientProvider>
        </TEST__SDLCServerClientProvider>
      </TEST__ApplicationStoreProvider>
    </MemoryRouter>,
  );

  expect(
    queryByText(TEST__getTestStudioConfig().env.toUpperCase()),
  ).not.toBeNull();
});

test(integrationTest('Failed to authorize SDLC will redirect'), async () => {
  const applicationStore = TEST__provideMockedApplicationStore(
    TEST__getTestStudioConfig(),
    LegendStudioPluginManager.create(),
  );
  const sdlcServerClient = TEST__provideMockedSDLCServerClient();
  const stubURL = 'stubUrl';

  MOBX__enableSpyOrMock();
  jest.spyOn(sdlcServerClient, 'isAuthorized').mockResolvedValueOnce(false);
  jest
    .spyOn(sdlcServerClient, 'getCurrentUser')
    .mockResolvedValueOnce({ name: 'testUser', userId: 'testUserId' });
  const navigator = new WebApplicationNavigator(createMemoryHistory());
  applicationStore.navigator = navigator;
  const jumpToSpy = jest.spyOn(navigator, 'jumpTo').mockImplementation();
  jest
    .spyOn(navigator, 'getCurrentLocation')
    .mockImplementationOnce(() => stubURL);
  MOBX__disableSpyOrMock();
  TEST__provideMockedWebApplicationNavigator();

  render(
    <MemoryRouter>
      <TEST__ApplicationStoreProvider
        config={TEST__getTestStudioConfig()}
        pluginManager={LegendStudioPluginManager.create()}
      >
        <TEST__SDLCServerClientProvider>
          <TEST__DepotServerClientProvider>
            <TEST__LegendStudioStoreProvider>
              <LegendStudioApplicationRoot />
            </TEST__LegendStudioStoreProvider>
          </TEST__DepotServerClientProvider>
        </TEST__SDLCServerClientProvider>
      </TEST__ApplicationStoreProvider>
    </MemoryRouter>,
  );

  await waitFor(() =>
    expect(jumpToSpy).toHaveBeenCalledWith(
      SDLCServerClient.authorizeCallbackUrl(
        applicationStore.config.sdlcServerUrl,
        stubURL,
      ),
    ),
  );
});

test(
  integrationTest('Failed to accept SDLC Terms of Service will show alert'),
  async () => {
    const sdlcServerClient = TEST__provideMockedSDLCServerClient();

    MOBX__enableSpyOrMock();
    jest.spyOn(sdlcServerClient, 'isAuthorized').mockResolvedValueOnce(true);
    jest
      .spyOn(sdlcServerClient, 'getCurrentUser')
      .mockResolvedValueOnce({ name: 'testUser', userId: 'testUserId' });
    jest
      .spyOn(sdlcServerClient, 'hasAcceptedTermsOfService')
      .mockResolvedValueOnce(['stubUrl']);
    jest.spyOn(sdlcServerClient, 'getProjects').mockResolvedValue([]);
    MOBX__disableSpyOrMock();
    TEST__provideMockedWebApplicationNavigator();

    const { queryByText } = render(
      <MemoryRouter>
        <TEST__ApplicationStoreProvider
          config={TEST__getTestStudioConfig()}
          pluginManager={LegendStudioPluginManager.create()}
        >
          <TEST__SDLCServerClientProvider>
            <TEST__DepotServerClientProvider>
              <TEST__LegendStudioStoreProvider>
                <LegendStudioApplicationRoot />
              </TEST__LegendStudioStoreProvider>
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
