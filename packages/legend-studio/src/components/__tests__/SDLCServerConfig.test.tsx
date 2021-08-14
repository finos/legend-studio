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

import { LegendStudioApplication } from '../LegendStudioApplication';
import {
  integrationTest,
  MOBX__enableSpyOrMock,
  MOBX__disableSpyOrMock,
  Log,
} from '@finos/legend-studio-shared';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';
import {
  testApplicationConfigData,
  testApplicationVersionData,
} from '../../stores/StoreTestUtils';
import {
  getMockedApplicationStore,
  getMockedWebApplicationNavigator,
} from '../ComponentTestUtils';
import type { ApplicationStore } from '../../stores/ApplicationStore';
import { PluginManager } from '../../application/PluginManager';
import { ApplicationConfig } from '../../stores/application/ApplicationConfig';
import {
  generateSetupRoute,
  URL_PATH_PLACEHOLDER,
} from '../../stores/LegendStudioRouter';
import { WebApplicationNavigatorProvider } from '../../stores/application/WebApplicationNavigator';

let applicationStore: ApplicationStore;

const getTestApplicationConfigWithMultiSDLCServer = (
  extraConfigData = {},
): ApplicationConfig =>
  new ApplicationConfig(
    {
      ...testApplicationConfigData,
      ...extraConfigData,
    },
    testApplicationVersionData,
    '/studio/',
  );

const setupMockedApplicationStoreForSuccessfulLoadding = (): void => {
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
};

test(
  integrationTest(
    'URL is properly reset with configured SDLC when only one server is specified in the config (legacy SDLC config form)',
  ),
  async () => {
    const config = getTestApplicationConfigWithMultiSDLCServer({
      sdlc: { url: 'https://testSdlcUrl1' },
    });

    setupMockedApplicationStoreForSuccessfulLoadding();

    const navigator = getMockedWebApplicationNavigator();
    MOBX__enableSpyOrMock();
    const goToSpy = jest.spyOn(navigator, 'goTo').mockImplementation();
    MOBX__disableSpyOrMock();

    render(
      <MemoryRouter initialEntries={['/something/']}>
        <WebApplicationNavigatorProvider>
          <LegendStudioApplication
            config={config}
            pluginManager={PluginManager.create()}
            log={new Log()}
          />
        </WebApplicationNavigatorProvider>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(goToSpy).toHaveBeenCalledWith(
        generateSetupRoute(URL_PATH_PLACEHOLDER, undefined),
      ),
    );
  },
);

test(
  integrationTest(
    'SDLC server configuration is required when the SDLC server key in the URL is not recognised',
  ),
  async () => {
    const config = getTestApplicationConfigWithMultiSDLCServer({
      sdlc: [
        {
          label: 'Server1',
          key: 'server1',
          url: 'https://testSdlcUrl1',
        },
        {
          label: 'Server2',
          key: 'server2',
          url: 'https://testSdlcUrl2',
        },
      ],
    });

    setupMockedApplicationStoreForSuccessfulLoadding();

    const { queryByText } = render(
      <MemoryRouter initialEntries={['/something/']}>
        <WebApplicationNavigatorProvider>
          <LegendStudioApplication
            config={config}
            pluginManager={PluginManager.create()}
            log={new Log()}
          />
        </WebApplicationNavigatorProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(queryByText('SDLC Server')).not.toBeNull());
  },
);

test(
  integrationTest('SDLC server configuration can be done via URL'),
  async () => {
    const config = getTestApplicationConfigWithMultiSDLCServer({
      sdlc: [
        {
          label: 'Server1',
          key: 'server1',
          url: 'https://testSdlcUrl1',
        },
        {
          label: 'Server2',
          key: 'server2',
          url: 'https://testSdlcUrl2',
        },
        {
          label: 'Server3',
          key: 'server3',
          url: 'https://testSdlcUrl2',
        },
      ],
    });

    setupMockedApplicationStoreForSuccessfulLoadding();

    const { queryByText } = render(
      <MemoryRouter initialEntries={['/server1/']}>
        <WebApplicationNavigatorProvider>
          <LegendStudioApplication
            config={config}
            pluginManager={PluginManager.create()}
            log={new Log()}
          />
        </WebApplicationNavigatorProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(queryByText('Next')).not.toBeNull());
  },
);

test(
  integrationTest(
    'SDLC server configuration is not required when only one server is specified in the config',
  ),
  async () => {
    const config = getTestApplicationConfigWithMultiSDLCServer({
      sdlc: [
        {
          label: 'Server1',
          key: 'server1',
          url: 'https://testSdlcUrl1',
        },
      ],
    });

    setupMockedApplicationStoreForSuccessfulLoadding();

    const { queryByText } = render(
      <MemoryRouter initialEntries={['/server1/']}>
        <WebApplicationNavigatorProvider>
          <LegendStudioApplication
            config={config}
            pluginManager={PluginManager.create()}
            log={new Log()}
          />
        </WebApplicationNavigatorProvider>
      </MemoryRouter>,
    );

    await waitFor(() => expect(queryByText('Next')).not.toBeNull());
  },
);

test(
  integrationTest(
    'URL is properly reset with configured SDLC when only one server is specified in the config',
  ),
  async () => {
    const config = getTestApplicationConfigWithMultiSDLCServer({
      sdlc: [
        {
          label: 'Server1',
          key: 'server1',
          url: 'https://testSdlcUrl1',
        },
      ],
    });

    setupMockedApplicationStoreForSuccessfulLoadding();

    const navigator = getMockedWebApplicationNavigator();
    MOBX__enableSpyOrMock();
    const goToSpy = jest.spyOn(navigator, 'goTo').mockImplementation();
    MOBX__disableSpyOrMock();

    render(
      <MemoryRouter initialEntries={['/something/']}>
        <WebApplicationNavigatorProvider>
          <LegendStudioApplication
            config={config}
            pluginManager={PluginManager.create()}
            log={new Log()}
          />
        </WebApplicationNavigatorProvider>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(goToSpy).toHaveBeenCalledWith(
        generateSetupRoute('server1', undefined),
      ),
    );
  },
);
