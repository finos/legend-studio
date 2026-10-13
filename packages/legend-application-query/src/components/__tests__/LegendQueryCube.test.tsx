/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { expect, jest, test } from '@jest/globals';
import {
  ApplicationStore,
  ApplicationStoreProvider,
} from '@finos/legend-application';
import {
  BrowserNavigator,
  Route,
  Routes,
} from '@finos/legend-application/browser';
import { TEST__BrowserEnvironmentProvider } from '@finos/legend-application/test';
import { LEGEND_CUBE_TEST_ID } from '@finos/legend-cube-builder';
import { render, waitFor } from '@testing-library/react';
import { LEGEND_QUERY_ROUTE_PATTERN } from '../../__lib__/LegendQueryNavigation.js';
import { LegendQueryPluginManager } from '../../application/LegendQueryPluginManager.js';
import { TEST__getTestLegendQueryApplicationConfig } from '../../stores/__test-utils__/LegendQueryApplicationTestUtils.js';
import { LegendQueryCubeRoute } from '../cube/LegendQueryCubeRoute.js';
import { LegendQueryFrameworkProvider } from '../LegendQueryFrameworkProvider.js';

test('Opens the Cube page at /cube, empty', async () => {
  const applicationStore = new ApplicationStore(
    TEST__getTestLegendQueryApplicationConfig(),
    LegendQueryPluginManager.create(),
  );
  const { findByTestId } = render(
    <ApplicationStoreProvider store={applicationStore}>
      <TEST__BrowserEnvironmentProvider
        initialEntries={[LEGEND_QUERY_ROUTE_PATTERN.CUBE]}
      >
        <LegendQueryFrameworkProvider>
          <Routes>
            <Route
              path={LEGEND_QUERY_ROUTE_PATTERN.CUBE}
              element={<LegendQueryCubeRoute />}
            />
          </Routes>
        </LegendQueryFrameworkProvider>
      </TEST__BrowserEnvironmentProvider>
    </ApplicationStoreProvider>,
  );
  // the page loads lazily
  const page = await findByTestId(LEGEND_CUBE_TEST_ID.EDITOR);
  expect(page.textContent).toContain('Unsaved Query');
  expect(page.textContent).toContain(
    'Connect to a source to start a new one, or open an example.',
  );
});

test('Says why a linked source could not be added, leaving the cube empty', async () => {
  const applicationStore = new ApplicationStore(
    TEST__getTestLegendQueryApplicationConfig(),
    LegendQueryPluginManager.create(),
  );
  const { findByTestId } = render(
    <ApplicationStoreProvider store={applicationStore}>
      <TEST__BrowserEnvironmentProvider
        initialEntries={[LEGEND_QUERY_ROUTE_PATTERN.CUBE]}
        // the test navigator reads the parameters from its base URL
        baseUrl="/cube?sourceType=dataProductAccessPoint&sourceId=bad"
      >
        <LegendQueryFrameworkProvider>
          <Routes>
            <Route
              path={LEGEND_QUERY_ROUTE_PATTERN.CUBE}
              element={<LegendQueryCubeRoute />}
            />
          </Routes>
        </LegendQueryFrameworkProvider>
      </TEST__BrowserEnvironmentProvider>
    </ApplicationStoreProvider>,
  );
  const banner = await findByTestId(LEGEND_CUBE_TEST_ID.ENTRY_SOURCE_ERROR);
  expect(banner.textContent).toContain('Error resolving source!');
  expect(banner.textContent).toContain(`"bad" doesn't name an access point`);
  const page = await findByTestId(LEGEND_CUBE_TEST_ID.EDITOR);
  expect(page.textContent).toContain(
    'Connect to a source to start a new one, or open an example.',
  );
});

/** The Cube page mounted as Query mounts it, at an address */
const renderCubePage = (
  applicationStore: ApplicationStore<
    ReturnType<typeof TEST__getTestLegendQueryApplicationConfig>,
    ReturnType<typeof LegendQueryPluginManager.create>
  >,
  entry: string,
  baseUrl?: string,
): ReturnType<typeof render> =>
  render(
    <ApplicationStoreProvider store={applicationStore}>
      <TEST__BrowserEnvironmentProvider
        initialEntries={[entry]}
        {...(baseUrl ? { baseUrl } : {})}
      >
        <LegendQueryFrameworkProvider>
          <Routes>
            <Route
              path={LEGEND_QUERY_ROUTE_PATTERN.CUBE_WITH_ID}
              element={<LegendQueryCubeRoute />}
            />
          </Routes>
        </LegendQueryFrameworkProvider>
      </TEST__BrowserEnvironmentProvider>
    </ApplicationStoreProvider>,
  );

test('Opens the saved cube /cube/:cubeId names, and says why it could not, the address kept', async () => {
  const applicationStore = new ApplicationStore(
    TEST__getTestLegendQueryApplicationConfig(),
    LegendQueryPluginManager.create(),
  );
  const update = jest.spyOn(
    BrowserNavigator.prototype,
    'updateCurrentLocation',
  );
  try {
    const { findByTestId } = renderCubePage(applicationStore, '/cube/cube-1');
    // the test environment refuses network calls: the store can't be reached
    const banner = await findByTestId(LEGEND_CUBE_TEST_ID.LOAD_ERROR);
    expect(banner.textContent).toContain('Error loading query!');
    expect(banner.textContent).toContain("The Cube store couldn't be reached");
    // the address keeps naming the cube (the test navigator reads jsdom's
    // address, not the router's entry, so it may write the same path again)
    expect(
      update.mock.calls.every(([location]) =>
        String(location).startsWith('/cube/cube-1'),
      ),
    ).toBe(true);
  } finally {
    update.mockRestore();
  }
});

test('Reads ?queryId= as the saved cube, and moves it into the path', async () => {
  const applicationStore = new ApplicationStore(
    TEST__getTestLegendQueryApplicationConfig(),
    LegendQueryPluginManager.create(),
  );
  const update = jest.spyOn(
    BrowserNavigator.prototype,
    'updateCurrentLocation',
  );
  try {
    const { findByTestId } = renderCubePage(
      applicationStore,
      LEGEND_QUERY_ROUTE_PATTERN.CUBE,
      // the test navigator reads the parameters from its base URL
      '/cube?queryId=cube-2',
    );
    await findByTestId(LEGEND_CUBE_TEST_ID.LOAD_ERROR);
    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        expect.stringMatching(/^\/cube\/cube-2(?:[?#]|$)/u),
        { replace: true },
      ),
    );
  } finally {
    update.mockRestore();
  }
});
