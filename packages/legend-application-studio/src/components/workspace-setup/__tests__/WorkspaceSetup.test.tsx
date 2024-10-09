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
import { render, waitFor } from '@testing-library/react';
import { WorkspaceSetup } from '../WorkspaceSetup.js';
import { createSpy, integrationTest } from '@finos/legend-shared/test';
import { TEST_DATA__DefaultSDLCInfo } from '../../editor/__test-utils__/EditorComponentTestUtils.js';
import { ApplicationStoreProvider } from '@finos/legend-application';
import { TEST__BrowserEnvironmentProvider } from '@finos/legend-application/test';
import { LegendStudioFrameworkProvider } from '../../LegendStudioFrameworkProvider.js';
import { TEST__provideMockedLegendStudioBaseStore } from '../../__test-utils__/LegendStudioFrameworkTestUtils.js';
import {
  generateSetupRoute,
  LEGEND_STUDIO_ROUTE_PATTERN,
} from '../../../__lib__/LegendStudioNavigation.js';
import { Route, Routes } from '@finos/legend-application/browser';

test(integrationTest('Shows project searcher properly'), async () => {
  const baseStore = TEST__provideMockedLegendStudioBaseStore();

  createSpy(baseStore.sdlcServerClient, 'getProjects')
    .mockResolvedValueOnce([TEST_DATA__DefaultSDLCInfo.project])
    .mockResolvedValueOnce([]);

  const { queryByText } = render(
    <ApplicationStoreProvider store={baseStore.applicationStore}>
      <TEST__BrowserEnvironmentProvider
        initialEntries={[
          generateSetupRoute(
            TEST_DATA__DefaultSDLCInfo.project.projectId,
            undefined,
          ),
        ]}
      >
        <LegendStudioFrameworkProvider>
          <Routes>
            <Route
              path={LEGEND_STUDIO_ROUTE_PATTERN.SETUP_WORKSPACE}
              element={<WorkspaceSetup />}
            />
          </Routes>
        </LegendStudioFrameworkProvider>
      </TEST__BrowserEnvironmentProvider>
    </ApplicationStoreProvider>,
  );

  // NOTE: react-select does not seem to produce a normal input box where we could set the placeholder attribute
  // as such, we cannot use `queryByPlaceholderText` but use `queryByText` instead
  await waitFor(() =>
    expect(queryByText('Welcome to Legend Studio')).not.toBeNull(),
  );
  await waitFor(() =>
    expect(queryByText('Search for project...')).not.toBeNull(),
  );
  await waitFor(() =>
    expect(queryByText('Search for an existing project')).not.toBeNull(),
  );
  await waitFor(() =>
    expect(queryByText('Choose an existing workspace')).not.toBeNull(),
  );
  await waitFor(() =>
    expect(
      queryByText('In order to choose a workspace, a project must be chosen'),
    ).not.toBeNull(),
  );
  await waitFor(() => expect(queryByText('Go')).not.toBeNull());
  await waitFor(() => expect(queryByText('Create New Project')).not.toBeNull());
  await waitFor(() =>
    expect(queryByText(`Need to create a new workspace?`)).not.toBeNull(),
  );
  //check successfully load cards
  await waitFor(() => expect(queryByText('Showcase Projects')).not.toBeNull());
});
