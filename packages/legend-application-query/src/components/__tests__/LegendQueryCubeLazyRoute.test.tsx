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

import { beforeEach, expect, jest, test } from '@jest/globals';
import * as TestingLibrary from '@testing-library/react';
import * as React from 'react';
import * as ReactJSXRuntime from 'react/jsx-runtime';
import * as ReactDOM from 'react-dom';
import * as ReactDOMClient from 'react-dom/client';

// The counts below need a module registry in which nothing has loaded Query's
// modules or the builder yet, so each test (and each Jest retry of it)
// imports them in a registry of its own. React and Testing Library are
// shared: the page must render with the React that renders it, and Testing
// Library registers hooks when it loads.
const isolated = async (run: () => Promise<void>): Promise<void> => {
  await jest.isolateModulesAsync(async () => {
    jest.doMock('react', () => React);
    jest.doMock('react/jsx-runtime', () => ReactJSXRuntime);
    jest.doMock('react-dom', () => ReactDOM);
    jest.doMock('react-dom/client', () => ReactDOMClient);
    jest.doMock('@testing-library/react', () => TestingLibrary);
    await run();
  });
};

beforeEach(() => {
  localStorage.clear();
});

test("Loads no Cube builder code with Query's application", async () => {
  let builderLoads = 0;
  await isolated(async () => {
    jest.doMock('@finos/legend-cube-builder', () => {
      builderLoads += 1;
      return jest.requireActual('@finos/legend-cube-builder');
    });
    const { LegendQueryWebApplication } = await import(
      '../LegendQueryWebApplication.js'
    );
    expect(LegendQueryWebApplication).toBeDefined();
    expect(builderLoads).toBe(0);
    // the count sees a load of the builder
    await import('@finos/legend-cube-builder');
    expect(builderLoads).toBe(1);
  });
});

test('Loads the Cube page module only when the /cube route renders', async () => {
  let pageLoads = 0;
  await isolated(async () => {
    jest.doMock('../cube/LegendQueryCubePage.js', () => {
      pageLoads += 1;
      return jest.requireActual('../cube/LegendQueryCubePage.js');
    });
    const { LegendQueryCubeRoute } = await import(
      '../cube/LegendQueryCubeRoute.js'
    );
    // importing the route does not load the page
    expect(pageLoads).toBe(0);
    const [
      { ApplicationStore, ApplicationStoreProvider },
      { Route, Routes },
      { TEST__BrowserEnvironmentProvider },
      { LEGEND_CUBE_TEST_ID },
      { LEGEND_QUERY_ROUTE_PATTERN },
      { LegendQueryPluginManager },
      { TEST__getTestLegendQueryApplicationConfig },
      { LegendQueryFrameworkProvider },
    ] = await Promise.all([
      import('@finos/legend-application'),
      import('@finos/legend-application/browser'),
      import('@finos/legend-application/test'),
      import('@finos/legend-cube-builder'),
      import('../../__lib__/LegendQueryNavigation.js'),
      import('../../application/LegendQueryPluginManager.js'),
      import('../../stores/__test-utils__/LegendQueryApplicationTestUtils.js'),
      import('../LegendQueryFrameworkProvider.js'),
    ]);
    expect(pageLoads).toBe(0);
    const applicationStore = new ApplicationStore(
      TEST__getTestLegendQueryApplicationConfig(),
      LegendQueryPluginManager.create(),
    );
    const { findByTestId } = TestingLibrary.render(
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
    const page = await findByTestId(LEGEND_CUBE_TEST_ID.EDITOR);
    expect(page.textContent).toContain('Unsaved Query');
    // the route's first render loads it, through the lazy import
    expect(pageLoads).toBe(1);
  });
});
