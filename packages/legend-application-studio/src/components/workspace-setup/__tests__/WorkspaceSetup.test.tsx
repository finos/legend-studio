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
import {
  fireEvent,
  render,
  screen,
  waitFor,
  type RenderResult,
} from '@testing-library/react';
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
import { WorkspaceType } from '@finos/legend-server-sdlc';
import { LegendStudioUserDataHelper } from '../../../__lib__/LegendStudioUserDataHelper.js';
import type { LegendStudioBaseStore } from '../../../stores/LegendStudioBaseStore.js';

beforeEach(() => {
  // recents live in user data, which jsdom's localStorage backs
  window.localStorage.clear();
});

const renderWorkspaceSetup = (
  baseStore: LegendStudioBaseStore,
  projectId?: string,
): RenderResult =>
  render(
    <ApplicationStoreProvider store={baseStore.applicationStore}>
      <TEST__BrowserEnvironmentProvider
        initialEntries={[generateSetupRoute(projectId, undefined)]}
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

const seedRecentWorkspace = (baseStore: LegendStudioBaseStore): void => {
  const { project } = TEST_DATA__DefaultSDLCInfo;
  LegendStudioUserDataHelper.workspaceSetup_recordRecentProject(
    baseStore.applicationStore.userDataService,
    {
      projectId: project.projectId,
      name: project.name,
      description: '',
      webUrl: '',
      tags: [],
    },
  );
  LegendStudioUserDataHelper.workspaceSetup_recordRecentWorkspace(
    baseStore.applicationStore.userDataService,
    {
      projectId: project.projectId,
      workspaceId: 'my-workspace',
      workspaceType: WorkspaceType.USER,
    },
  );
};

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

test(
  integrationTest(
    'Recent workspace tiles hold the open and remove buttons side by side',
  ),
  async () => {
    const baseStore = TEST__provideMockedLegendStudioBaseStore();
    createSpy(baseStore.sdlcServerClient, 'getProjects').mockResolvedValue([]);
    seedRecentWorkspace(baseStore);

    const { container } = renderWorkspaceSetup(baseStore);

    const removeButton = await screen.findByRole('button', {
      name: 'Remove TEST_SDLC / my-workspace from recents',
    });
    // a button can't contain another button
    expect(container.querySelector('button button')).toBeNull();
    expect(screen.getByTitle('Open TEST_SDLC / my-workspace').tagName).toBe(
      'BUTTON',
    );
    // the remove button is reachable with the keyboard
    expect(removeButton.getAttribute('tabindex')).toBeNull();

    fireEvent.click(removeButton);
    await waitFor(() =>
      expect(screen.queryByText('Recent workspaces')).toBeNull(),
    );
  },
);

test(
  integrationTest('Clear recents is reachable with the keyboard'),
  async () => {
    const baseStore = TEST__provideMockedLegendStudioBaseStore();
    createSpy(baseStore.sdlcServerClient, 'getProjects').mockResolvedValue([]);
    seedRecentWorkspace(baseStore);

    const { container } = renderWorkspaceSetup(baseStore);

    const clearRecents = await screen.findByRole('button', {
      name: 'Clear recents',
    });
    expect(clearRecents.getAttribute('tabindex')).toBeNull();
    expect(
      screen.getByTitle('Toggle assistant').getAttribute('tabindex'),
    ).toBeNull();
    // the logo is decorative: the heading names the page
    expect(
      container
        .querySelector('.workspace-setup__logo__icon')
        ?.getAttribute('alt'),
    ).toBe('');
  },
);

test(integrationTest('Escape closes the project menu'), async () => {
  const baseStore = TEST__provideMockedLegendStudioBaseStore();
  createSpy(baseStore.sdlcServerClient, 'getProjects').mockResolvedValue([
    TEST_DATA__DefaultSDLCInfo.project,
  ]);

  const { container } = renderWorkspaceSetup(baseStore);

  await screen.findByText('Search for project...');
  const projectInput = container.querySelector(
    '.workspace-setup__selector input',
  ) as HTMLInputElement;
  fireEvent.focus(projectInput);
  await screen.findByText('TEST_SDLC');

  fireEvent.keyDown(projectInput, { key: 'Escape' });
  await waitFor(() => expect(screen.queryByText('TEST_SDLC')).toBeNull());
});
