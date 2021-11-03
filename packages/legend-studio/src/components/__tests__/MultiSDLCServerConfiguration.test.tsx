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
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';
import {
  WebApplicationNavigatorProvider,
  TEST__provideMockedWebApplicationNavigator,
  TEST_DATA__applicationVersion,
} from '@finos/legend-application';
import { generateSetupRoute } from '../../stores/LegendStudioRouter';
import { TEST__provideMockedSDLCServerClient } from '@finos/legend-server-sdlc';
import { StudioPluginManager } from '../../application/StudioPluginManager';
import { TEST_DATA__studioConfig } from '../../stores/EditorStoreTestUtils';
import { StudioConfig } from '../../application/StudioConfig';

const getTestStudioConfigWithMultiSDLCServer = (
  extraConfigData = {},
): StudioConfig =>
  new StudioConfig(
    {
      ...TEST_DATA__studioConfig,
      ...extraConfigData,
    },
    TEST_DATA__applicationVersion,
    '/studio/',
  );

const setup = (): void => {
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
};

test(
  integrationTest(
    'URL is properly reset with configured SDLC when only one server is specified in the config (legacy SDLC config form)',
  ),
  async () => {
    const config = getTestStudioConfigWithMultiSDLCServer({
      sdlc: { url: 'https://testSdlcUrl1' },
    });

    setup();

    const navigator = TEST__provideMockedWebApplicationNavigator();

    MOBX__enableSpyOrMock();
    const goToSpy = jest.spyOn(navigator, 'goTo').mockImplementation();
    MOBX__disableSpyOrMock();

    render(
      <MemoryRouter initialEntries={['/something/']}>
        <WebApplicationNavigatorProvider>
          <LegendStudioApplication
            config={config}
            pluginManager={StudioPluginManager.create()}
            log={new Log()}
          />
        </WebApplicationNavigatorProvider>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(goToSpy).toHaveBeenCalledWith(
        generateSetupRoute(config.defaultSDLCServerOption, undefined),
      ),
    );
  },
);

test(
  integrationTest(
    'SDLC server configuration is required when the SDLC server key in the URL is not recognised',
  ),
  async () => {
    const config = getTestStudioConfigWithMultiSDLCServer({
      sdlc: [
        {
          label: 'Server1',
          key: 'server1',
          url: 'https://testSdlcUrl1',
          default: true,
        },
        {
          label: 'Server2',
          key: 'server2',
          url: 'https://testSdlcUrl2',
        },
      ],
    });

    setup();

    const { queryByText } = render(
      <MemoryRouter initialEntries={['/something/']}>
        <WebApplicationNavigatorProvider>
          <LegendStudioApplication
            config={config}
            pluginManager={StudioPluginManager.create()}
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
    const config = getTestStudioConfigWithMultiSDLCServer({
      sdlc: [
        {
          label: 'Server1',
          key: 'server1',
          url: 'https://testSdlcUrl1',
          default: true,
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

    setup();

    const { queryByText } = render(
      <MemoryRouter initialEntries={['/sdlc-server1/']}>
        <WebApplicationNavigatorProvider>
          <LegendStudioApplication
            config={config}
            pluginManager={StudioPluginManager.create()}
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
    const config = getTestStudioConfigWithMultiSDLCServer({
      sdlc: [
        {
          label: 'Server1',
          key: 'server1',
          url: 'https://testSdlcUrl1',
          default: true,
        },
      ],
    });

    setup();

    const { queryByText } = render(
      <MemoryRouter initialEntries={['/sdlc-server1/']}>
        <WebApplicationNavigatorProvider>
          <LegendStudioApplication
            config={config}
            pluginManager={StudioPluginManager.create()}
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
    const config = getTestStudioConfigWithMultiSDLCServer({
      sdlc: [
        {
          label: 'Server1',
          key: 'server1',
          url: 'https://testSdlcUrl1',
          default: true,
        },
      ],
    });

    setup();

    const navigator = TEST__provideMockedWebApplicationNavigator();
    MOBX__enableSpyOrMock();
    const goToSpy = jest.spyOn(navigator, 'goTo').mockImplementation();
    MOBX__disableSpyOrMock();

    render(
      <MemoryRouter initialEntries={['/something/']}>
        <WebApplicationNavigatorProvider>
          <LegendStudioApplication
            config={config}
            pluginManager={StudioPluginManager.create()}
            log={new Log()}
          />
        </WebApplicationNavigatorProvider>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(goToSpy).toHaveBeenCalledWith(
        generateSetupRoute(
          guaranteeNonNullable(
            config.SDLCServerOptions.find((option) => option.key === 'server1'),
          ),
          undefined,
        ),
      ),
    );
  },
);
