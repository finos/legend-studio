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

import { beforeEach, expect, test } from '@jest/globals';
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

test("Opens the Cube page at /query/cube through Query's own router, with no flag set", async () => {
  // Query's base URL is `/query/`; the route is hard-wired at `/cube`, not
  // under `/extensions/` as a plugin page entry would be
  window.history.replaceState({}, '', '/query/cube');
  const applicationStore = new ApplicationStore(
    // the test config sets no option, so nothing turns the page on
    TEST__getTestLegendQueryApplicationConfig(),
    LegendQueryPluginManager.create(),
  );
  // the routes mount once the base store is initialized; its identity call
  // fails on Jest's blocked fetch, and the store goes on without a user
  const { findByTestId } = render(
    <ApplicationStoreProvider store={applicationStore}>
      <LegendQueryWebApplication baseUrl="/query/" />
    </ApplicationStoreProvider>,
  );
  const page = await findByTestId(LEGEND_CUBE_TEST_ID.EDITOR);
  expect(page.textContent).toContain('Unsaved Query');
  expect(page.textContent).toContain('Connect to a source to start a new one.');
});
