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

import { afterEach, beforeEach, expect, test } from '@jest/globals';
import {
  ApplicationStore,
  ApplicationStoreProvider,
} from '@finos/legend-application';
import { LEGEND_CUBE_TEST_ID } from '@finos/legend-cube-builder';
import { render } from '@testing-library/react';
import { LegendQueryPluginManager } from '../../application/LegendQueryPluginManager.js';
import { TEST__getTestLegendQueryApplicationConfig } from '../../stores/__test-utils__/LegendQueryApplicationTestUtils.js';
import { LegendQueryWebApplication } from '../LegendQueryWebApplication.js';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

/** The config option that mounts the Cube page, a proof of concept */
const NON_PRODUCTION = {
  extensions: { core: { NonProductionFeatureFlag: true } },
};

const renderAt = (
  url: string,
  configData: object = NON_PRODUCTION,
): ReturnType<typeof render> => {
  window.history.replaceState({}, '', url);
  return render(
    <ApplicationStoreProvider
      store={
        new ApplicationStore(
          TEST__getTestLegendQueryApplicationConfig(configData),
          LegendQueryPluginManager.create(),
        )
      }
    >
      <LegendQueryWebApplication baseUrl="/query/" />
    </ApplicationStoreProvider>,
  );
};

test("Opens the Cube page at /query/cube through Query's own router where non-production features are on", async () => {
  // Query's base URL is `/query/`; the route is hard-wired at `/cube`, not
  // under `/extensions/` as a plugin page entry would be. The routes mount
  // once the base store is initialized; its identity call fails on Jest's
  // blocked fetch, and the store goes on without a user
  const { findByTestId } = renderAt('/query/cube');
  const page = await findByTestId(LEGEND_CUBE_TEST_ID.EDITOR);
  expect(page.textContent).toContain('Unsaved Query');
  expect(page.textContent).toContain(
    'Connect to a source to start a new one, or open an example.',
  );
});

test('Shows no Cube page where non-production features are off, as in production', async () => {
  const { findByTestId } = renderAt('/query/cube', {});
  // the page above shows well within this
  await expect(
    findByTestId(LEGEND_CUBE_TEST_ID.EDITOR, undefined, { timeout: 3000 }),
  ).rejects.toThrow();
  expect(document.body.textContent).not.toContain('Unsaved Query');
});

test("Says why a linked source couldn't be added, and takes the link out of the address", async () => {
  const { findByTestId } = renderAt(
    '/query/cube?sourceType=dataProductAccessPoint&sourceId=bad',
  );
  const banner = await findByTestId(LEGEND_CUBE_TEST_ID.ENTRY_SOURCE_ERROR);
  expect(banner.textContent).toContain('Error resolving source!');
  expect(banner.textContent).toContain('"bad" doesn\'t name an access point');
  expect(
    (await findByTestId(LEGEND_CUBE_TEST_ID.EDITOR)).textContent,
  ).toContain('Connect to a source to start a new one, or open an example.');
  expect(window.location.pathname).toBe('/query/cube');
  expect(window.location.search).toBe('');
});

test('Opens no linked source when a saved query is named, keeping it in the address', async () => {
  const { findByTestId, queryByTestId } = renderAt(
    '/query/cube?queryId=my-query&sourceType=dataProductAccessPoint&sourceId=bad',
  );
  await findByTestId(LEGEND_CUBE_TEST_ID.EDITOR);
  expect(queryByTestId(LEGEND_CUBE_TEST_ID.ENTRY_SOURCE_ERROR)).toBeNull();
  expect(window.location.pathname).toBe('/query/cube');
  expect(window.location.search).toBe('?queryId=my-query');
});
