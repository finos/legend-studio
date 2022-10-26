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

import { test, expect, beforeEach } from '@jest/globals';
import { render, waitFor } from '@testing-library/react';
import { WorkspaceSetup } from '../WorkspaceSetup.js';
import { createSpy, integrationTest } from '@finos/legend-shared';
import { TEST_DATA__DefaultSDLCInfo } from '../../EditorComponentTestUtils.js';
import {
  type SDLCServerClient,
  TEST__SDLCServerClientProvider,
  TEST__provideMockedSDLCServerClient,
} from '@finos/legend-server-sdlc';
import {
  MemoryRouter,
  TEST__ApplicationStoreProvider,
  TEST__provideMockedWebApplicationNavigator,
} from '@finos/legend-application';
import { TEST__getLegendStudioApplicationConfig } from '../../../stores/EditorStoreTestUtils.js';
import { LegendStudioPluginManager } from '../../../application/LegendStudioPluginManager.js';

let sdlcServerClient: SDLCServerClient;

beforeEach(() => {
  sdlcServerClient = TEST__provideMockedSDLCServerClient();
});

test(integrationTest('Shows project searcher properly'), async () => {
  createSpy(sdlcServerClient, 'getProjects')
    .mockResolvedValueOnce([TEST_DATA__DefaultSDLCInfo.project])
    .mockResolvedValueOnce([]);

  TEST__provideMockedWebApplicationNavigator();

  const { queryByText } = render(
    <MemoryRouter>
      <TEST__ApplicationStoreProvider
        config={TEST__getLegendStudioApplicationConfig()}
        pluginManager={LegendStudioPluginManager.create()}
      >
        <TEST__SDLCServerClientProvider>
          <WorkspaceSetup />
        </TEST__SDLCServerClientProvider>
      </TEST__ApplicationStoreProvider>
    </MemoryRouter>,
  );

  // NOTE: react-select does not seem to produce a normal input box where we could set the placeholder attribute
  // as such, we cannot use `queryByPlaceholderText` but use `queryByText` instead
  await waitFor(() =>
    expect(queryByText('Search for project...')).not.toBeNull(),
  );
});
