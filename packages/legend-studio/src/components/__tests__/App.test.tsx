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

import { AppRoot } from '../App';
import {
  integrationTest,
  MOBX__enableSpyOrMock,
  MOBX__disableSpyOrMock,
} from '@finos/legend-studio-shared';
import { waitFor } from '@testing-library/dom';
import { getTestApplicationConfig } from '../../stores/StoreTestUtils';
import {
  getApplicationNavigationHistory,
  getMockedApplicationStore,
} from '../ComponentTestUtils';
import type { ApplicationStore } from '../../stores/ApplicationStore';
import { ApplicationStoreProvider } from '../../stores/ApplicationStore';
import { SDLCServerClient } from '../../models/sdlc/SDLCServerClient';
import { render } from '@testing-library/react';
import { PluginManager } from '../../application/PluginManager';
import { Router } from 'react-router-dom';

let applicationStore: ApplicationStore;

test(integrationTest('App header is displayed properly'), async () => {
  applicationStore = getMockedApplicationStore(getTestApplicationConfig());
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

  const history = getApplicationNavigationHistory();
  const { queryByText } = render(
    <ApplicationStoreProvider
      config={getTestApplicationConfig()}
      history={history}
      pluginManager={PluginManager.create()}
    >
      <Router history={history}>
        <AppRoot />
      </Router>
    </ApplicationStoreProvider>,
  );

  expect(
    queryByText(getTestApplicationConfig().env.toUpperCase()),
  ).not.toBeNull();
});

test(integrationTest('Failed to authorize SDLC will redirect'), async () => {
  applicationStore = getMockedApplicationStore(getTestApplicationConfig());
  const stubURL = 'stubUrl';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).window = Object.create(window) as Window;
  // `jsdom` does not support changing window.location so we use the following workaround
  // See https://github.com/facebook/jest/issues/5124#issuecomment-415494099
  Object.defineProperty(window, 'location', { value: { href: stubURL } });
  MOBX__enableSpyOrMock();
  jest
    .spyOn(applicationStore.networkClientManager.sdlcClient, 'isAuthorized')
    .mockResolvedValueOnce(false);
  MOBX__disableSpyOrMock();

  const history = getApplicationNavigationHistory();
  render(
    <ApplicationStoreProvider
      config={getTestApplicationConfig()}
      history={history}
      pluginManager={PluginManager.create()}
    >
      <Router history={history}>
        <AppRoot />
      </Router>
    </ApplicationStoreProvider>,
  );

  await waitFor(() =>
    expect(window.location.href).toEqual(
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
    applicationStore = getMockedApplicationStore(getTestApplicationConfig());
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

    const history = getApplicationNavigationHistory();
    const { queryByText } = render(
      <ApplicationStoreProvider
        config={getTestApplicationConfig()}
        history={history}
        pluginManager={PluginManager.create()}
      >
        <Router history={history}>
          <AppRoot />
        </Router>
      </ApplicationStoreProvider>,
    );

    await waitFor(() =>
      expect(queryByText('See terms of services')).not.toBeNull(),
    );
  },
);
