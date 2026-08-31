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

import { test, expect } from '@playwright/test';
import { setupEngineMock } from '../support/EngineMock.js';

// Deep-link straight into the query builder for the mock data space served
// by the mock depot server (see `@finos/legend-fixture-mock-server`)
const TEST_DATA_SPACE_QUERY_URL =
  'extensions/dataspace/org.finos.legend.test:legend-query-test:0.0.1/test::DataSpace/dummyContext';

const QUERY_NAME = 'My E2E Query';

test.beforeEach(async ({ page }) => {
  await setupEngineMock(page);
  await page.goto(TEST_DATA_SPACE_QUERY_URL);
  await expect(
    page
      .getByTestId('query__builder__explorer')
      .getByText('Cases', { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
});

test('save a new query and load it back', async ({ page }) => {
  const explorer = page.getByTestId('query__builder__explorer');
  const projectionPanel = page.getByTestId('query__builder__tds__projection');
  const projectionColumns = page.getByTestId(
    'QUERY_BUILDER_TDS_PROJECTION_COLUMN',
  );

  // build a simple one-column query
  await explorer.getByText('Cases', { exact: true }).dragTo(projectionPanel);
  await expect(
    projectionColumns.getByText('Cases', { exact: true }),
  ).toBeVisible();

  // save it: the header `Save` button opens the create dialog for a new query
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Create New Query')).toBeVisible();
  await page.getByTitle('New Query Name').fill(QUERY_NAME);
  await page.getByRole('button', { name: 'Create Query' }).click();

  // on success the app navigates to the persisted query's edit route and
  // shows the saved query's name in the header
  await expect(page).toHaveURL(/\/edit\//);
  await expect(page.getByText(QUERY_NAME)).toBeVisible();

  // reload to force full rehydration from the backend: the app fetches the
  // saved query by id, rebuilds the graph, and parses the saved lambda back
  // into the builder (see the stateful round-trip mocks in `EngineMock.ts`)
  await page.reload();
  await expect(page.getByText(QUERY_NAME)).toBeVisible({ timeout: 30_000 });
  await expect(
    projectionColumns.getByText('Cases', { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
});
