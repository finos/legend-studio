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

import { expect, test } from '@jest/globals';
import {
  ApplicationStore,
  ApplicationStoreProvider,
} from '@finos/legend-application';
import { Route, Routes } from '@finos/legend-application/browser';
import { TEST__BrowserEnvironmentProvider } from '@finos/legend-application/test';
import { LEGEND_CUBE_TEST_ID } from '@finos/legend-cube-builder';
import { render } from '@testing-library/react';
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
  expect(page.textContent).toContain('Connect to a source to start a new one.');
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
  expect(page.textContent).toContain('Connect to a source to start a new one.');
});
