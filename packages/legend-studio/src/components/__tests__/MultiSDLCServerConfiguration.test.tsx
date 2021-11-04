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
  guaranteeType,
  unitTest,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { MemoryRouter } from 'react-router-dom';
import { render } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';
import {
  WebApplicationNavigatorProvider,
  TEST_DATA__applicationVersion,
  WebApplicationNavigator,
  useWebApplicationNavigator,
} from '@finos/legend-application';
import {
  generateSetupRoute,
  updateRouteWithNewSDLCServerOption,
} from '../../stores/LegendStudioRouter';
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
  jest.spyOn(sdlcServerClient, 'isAuthorized').mockResolvedValue(true);
  jest
    .spyOn(sdlcServerClient, 'getCurrentUser')
    .mockResolvedValue({ name: 'testUser', userId: 'testUserId' });
  jest
    .spyOn(sdlcServerClient, 'hasAcceptedTermsOfService')
    .mockResolvedValue([]);
  jest.spyOn(sdlcServerClient, 'getProjects').mockResolvedValue([]);
  MOBX__disableSpyOrMock();
};

test(
  integrationTest('Non SDLC-instance URL is respected and not modified'),
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

    let navigator;
    const CaptureNavigator: React.FC = () => {
      navigator = useWebApplicationNavigator();
      return null;
    };

    const TEST_ROUTE_PATTERN = '/someApplicationRouteThatWeWouldNeverSupport/';

    const { queryByText } = render(
      <MemoryRouter initialEntries={[TEST_ROUTE_PATTERN]}>
        <WebApplicationNavigatorProvider>
          <CaptureNavigator />
          <LegendStudioApplication
            config={config}
            pluginManager={StudioPluginManager.create()}
            log={new Log()}
          />
        </WebApplicationNavigatorProvider>
      </MemoryRouter>,
    );

    expect(
      guaranteeType(
        navigator,
        WebApplicationNavigator,
      ).getCurrentLocationPath(),
    ).toEqual(TEST_ROUTE_PATTERN);
    await waitFor(() => expect(queryByText('Next')).not.toBeNull());
    // now because such route pattern would never be supported, the app would redirect user to the setup page
    // with the default SDLC instance
    expect(
      guaranteeType(
        navigator,
        WebApplicationNavigator,
      ).getCurrentLocationPath(),
    ).toEqual(generateSetupRoute(config.defaultSDLCServerOption, undefined));
  },
);

test(integrationTest('SDLC server can be specified via URL'), async () => {
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
    <MemoryRouter initialEntries={['/sdlc-server2/']}>
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
    expect(config.currentSDLCServerOption.key).toEqual('server2'),
  );
  await waitFor(() => expect(queryByText('Next')).not.toBeNull());
});

test(
  integrationTest(
    'Default SDLC server option is picked when an unknown SDLC server option key is specified in the URL',
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

    let navigator;
    const CaptureNavigator: React.FC = () => {
      navigator = useWebApplicationNavigator();
      return null;
    };

    const { queryByText } = render(
      <MemoryRouter initialEntries={['/sdlc-someServer/somethingElse']}>
        <WebApplicationNavigatorProvider>
          <CaptureNavigator />
          <LegendStudioApplication
            config={config}
            pluginManager={StudioPluginManager.create()}
            log={new Log()}
          />
        </WebApplicationNavigatorProvider>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(config.currentSDLCServerOption.key).toEqual('server1'),
    );
    expect(
      guaranteeType(
        navigator,
        WebApplicationNavigator,
      ).getCurrentLocationPath(),
    ).toEqual(generateSetupRoute(config.defaultSDLCServerOption, undefined));
    await waitFor(() => expect(queryByText('Next')).not.toBeNull());
  },
);

test(
  integrationTest(
    'Default SDLC server option is picked when an unknown SDLC server option key is specified in the URL (legacy SDLC config form)',
  ),
  async () => {
    const config = getTestStudioConfigWithMultiSDLCServer({
      sdlc: { url: 'https://testSdlcUrl1' },
    });

    setup();

    let navigator;
    const CaptureNavigator: React.FC = () => {
      navigator = useWebApplicationNavigator();
      return null;
    };

    const { queryByText } = render(
      <MemoryRouter initialEntries={['/sdlc-someServer/']}>
        <WebApplicationNavigatorProvider>
          <CaptureNavigator />
          <LegendStudioApplication
            config={config}
            pluginManager={StudioPluginManager.create()}
            log={new Log()}
          />
        </WebApplicationNavigatorProvider>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(config.currentSDLCServerOption.key).toEqual('default'),
    );
    expect(
      guaranteeType(
        navigator,
        WebApplicationNavigator,
      ).getCurrentLocationPath(),
    ).toEqual(generateSetupRoute(config.defaultSDLCServerOption, undefined));
    await waitFor(() => expect(queryByText('Next')).not.toBeNull());
  },
);

test(unitTest('Route update with SDLC server option changes'), async () => {
  const config = new StudioConfig(
    {
      ...TEST_DATA__studioConfig,
      ...{
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
      },
    },
    TEST_DATA__applicationVersion,
    '/studio/',
  );

  const server1 = guaranteeNonNullable(
    config.SDLCServerOptions.find((option) => option.key === 'server1'),
  );
  const server2 = guaranteeNonNullable(
    config.SDLCServerOptions.find((option) => option.key === 'server2'),
  );
  const server3 = guaranteeNonNullable(
    config.SDLCServerOptions.find((option) => option.key === 'server3'),
  );

  expect(
    updateRouteWithNewSDLCServerOption('/something1/something-2', server1),
  ).toBe(undefined);
  expect(
    updateRouteWithNewSDLCServerOption('/something1/something-2', server2),
  ).toBe(undefined);

  expect(
    updateRouteWithNewSDLCServerOption('/-/something1/something-2', server1),
  ).toBe(undefined);
  expect(
    updateRouteWithNewSDLCServerOption('/-/something1/something-2', server2),
  ).toBe('/sdlc-server2/something1/something-2');
  expect(
    updateRouteWithNewSDLCServerOption('/-/something1/something-2', server3),
  ).toBe('/sdlc-server3/something1/something-2');
  expect(
    updateRouteWithNewSDLCServerOption(
      '/sdlc-server2/something1/something-2',
      server2,
    ),
  ).toBe(undefined);
  expect(
    updateRouteWithNewSDLCServerOption(
      '/sdlc-server2/something1/something-2',
      server3,
    ),
  ).toBe('/sdlc-server3/something1/something-2');
  expect(
    updateRouteWithNewSDLCServerOption(
      '/sdlc-server2/something1/something-2',
      server1,
    ),
  ).toBe('/-/something1/something-2');
});
