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

import { test, jest, expect, beforeEach } from '@jest/globals';
import { waitFor } from '@testing-library/dom';
import { Setup } from '../../setup/Setup.js';
import {
  integrationTest,
  MOBX__disableSpyOrMock,
  MOBX__enableSpyOrMock,
} from '@finos/legend-shared';
import { TEST_DATA__DefaultSDLCInfo } from '../../EditorComponentTestUtils.js';
import { MemoryRouter } from 'react-router';
import { render } from '@testing-library/react';
import {
  type SDLCServerClient,
  TEST__SDLCServerClientProvider,
  TEST__provideMockedSDLCServerClient,
} from '@finos/legend-server-sdlc';
import {
  TEST__ApplicationStoreProvider,
  TEST__provideMockedWebApplicationNavigator,
} from '@finos/legend-application';
import { TEST__getTestStudioConfig } from '../../../stores/EditorStoreTestUtils.js';
import { LegendStudioPluginManager } from '../../../application/LegendStudioPluginManager.js';

let sdlcServerClient: SDLCServerClient;

beforeEach(() => {
  sdlcServerClient = TEST__provideMockedSDLCServerClient();
});

test(
  integrationTest(
    'Shows project selector properly when there are at least 1 project',
  ),
  async () => {
    MOBX__enableSpyOrMock();
    jest
      .spyOn(sdlcServerClient, 'getProjects')
      .mockResolvedValueOnce([TEST_DATA__DefaultSDLCInfo.project])
      .mockResolvedValueOnce([]);
    MOBX__disableSpyOrMock();
    TEST__provideMockedWebApplicationNavigator();

    const { queryByText } = render(
      <MemoryRouter>
        <TEST__ApplicationStoreProvider
          config={TEST__getTestStudioConfig()}
          pluginManager={LegendStudioPluginManager.create()}
        >
          <TEST__SDLCServerClientProvider>
            <Setup />
          </TEST__SDLCServerClientProvider>
        </TEST__ApplicationStoreProvider>
      </MemoryRouter>,
    );

    // NOTE: react-select is not like a normal input box where we could set the placeholder, so we just
    // cannot use `queryByPlaceholderText` but have to use `queryByText`
    await waitFor(() =>
      expect(queryByText('Choose an existing project')).not.toBeNull(),
    );
  },
);

test(
  integrationTest('Disable project selector when there is no projects'),
  async () => {
    MOBX__enableSpyOrMock();
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
            <Setup />
          </TEST__SDLCServerClientProvider>
        </TEST__ApplicationStoreProvider>
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(
        queryByText(
          'You have no projects, please create or acquire access for at least one',
        ),
      ).not.toBeNull(),
    );
  },
);
