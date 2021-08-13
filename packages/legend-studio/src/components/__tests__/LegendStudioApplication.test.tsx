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
} from '@finos/legend-studio-shared';
import { waitFor } from '@testing-library/dom';
import { getTestApplicationConfig } from '../../stores/StoreTestUtils';
import {
  getApplicationNavigator,
  getMockedApplicationStore,
} from '../ComponentTestUtils';
import type { ApplicationStore } from '../../stores/ApplicationStore';
import { ApplicationStoreProvider } from '../../stores/ApplicationStore';
import { SDLCServerClient } from '../../models/sdlc/SDLCServerClient';
import { render } from '@testing-library/react';
import { PluginManager } from '../../application/PluginManager';
import { WebApplicationNavigatorProvider } from '../../stores/application/WebApplicationNavigator';
import { Router } from 'react-router-dom';

let applicationStore: ApplicationStore;

test(integrationTest('App header is displayed properly'), async () => {
  applicationStore = getMockedApplicationStore();
  MOBX__enableSpyOrMock();
  jest
    .spyOn(applicationStore.networkClientManager.sdlcClient, 'isAuthorized')
    .mockResolvedValueOnce(true);
  jest
    .spyOn(applicationStore.networkClientManager.sdlcClient, 'getCurrentUser')
    .mockResolvedValueOnce({ name: 'testUser', userId: 'testUSerId' });
  jest
    .spyOn(
      applicationStore.networkClientManager.sdlcClient,
      'hasAcceptedTermsOfService',
    )
    .mockResolvedValueOnce([]);
  jest
    .spyOn(applicationStore.networkClientManager.sdlcClient, 'getProjects')
    .mockResolvedValue([]);
  MOBX__disableSpyOrMock();

  const navigator = getApplicationNavigator();
  const { queryByText } = render(
    <Router history={navigator.historyApiClient}>
      <WebApplicationNavigatorProvider>
        <ApplicationStoreProvider
          config={getTestApplicationConfig()}
          navigator={navigator}
          pluginManager={PluginManager.create()}
        >
          <LegendStudioApplicationRoot />
        </ApplicationStoreProvider>
      </WebApplicationNavigatorProvider>
    </Router>,
  );

  expect(
    queryByText(getTestApplicationConfig().env.toUpperCase()),
  ).not.toBeNull();
});

test(integrationTest('Failed to authorize SDLC will redirect'), async () => {
  applicationStore = getMockedApplicationStore();
  const stubURL = 'stubUrl';

  MOBX__enableSpyOrMock();
  jest
    .spyOn(applicationStore.networkClientManager.sdlcClient, 'isAuthorized')
    .mockResolvedValueOnce(false);
  const navigator = getApplicationNavigator();
  applicationStore.navigator = navigator;
  const jumpToSpy = jest.spyOn(navigator, 'jumpTo').mockImplementation();
  jest
    .spyOn(navigator, 'getCurrentLocation')
    .mockImplementationOnce(() => stubURL);
  MOBX__disableSpyOrMock();

  render(
    <Router history={navigator.historyApiClient}>
      <ApplicationStoreProvider
        config={getTestApplicationConfig()}
        navigator={navigator}
        pluginManager={PluginManager.create()}
      >
        <LegendStudioApplicationRoot />
      </ApplicationStoreProvider>
    </Router>,
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
    applicationStore = getMockedApplicationStore();
    MOBX__enableSpyOrMock();
    jest
      .spyOn(applicationStore.networkClientManager.sdlcClient, 'isAuthorized')
      .mockResolvedValueOnce(true);
    jest
      .spyOn(
        applicationStore.networkClientManager.sdlcClient,
        'hasAcceptedTermsOfService',
      )
      .mockResolvedValueOnce(['stubUrl']);
    jest
      .spyOn(applicationStore.networkClientManager.sdlcClient, 'getProjects')
      .mockResolvedValue([]);
    MOBX__disableSpyOrMock();

    const navigator = getApplicationNavigator();
    const { queryByText } = render(
      <Router history={navigator.historyApiClient}>
        <ApplicationStoreProvider
          config={getTestApplicationConfig()}
          navigator={navigator}
          pluginManager={PluginManager.create()}
        >
          <LegendStudioApplicationRoot />
        </ApplicationStoreProvider>
      </Router>,
    );

    await waitFor(() =>
      expect(queryByText('See terms of services')).not.toBeNull(),
    );
  },
);
