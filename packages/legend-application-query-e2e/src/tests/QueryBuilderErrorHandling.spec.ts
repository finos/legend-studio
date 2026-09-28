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
import {
  setupEngineMock,
  type CapturedEngineRequests,
} from '../support/EngineMock.js';
import {
  getGridRows,
  getResultPanel,
  openDataSpaceQuery,
  project,
  runQuery,
} from '../support/QueryBuilderHelpers.js';

const EXECUTE_ENDPOINT = 'pure/v1/execution/execute';
const CREATE_QUERY_ENDPOINT = 'pure/v1/query';

let captured: CapturedEngineRequests;

test.beforeEach(async ({ page }) => {
  captured = await setupEngineMock(page);
  await openDataSpaceQuery(page);
  // project a single column so the query is runnable
  await project(page, ['Cases']);
});

test('a failing query execution surfaces the engine error', async ({
  page,
}) => {
  captured.failures.set(EXECUTE_ENDPOINT, {
    status: 500,
    message: 'Cannot execute: table COVID_DATA does not exist',
  });

  await getResultPanel(page).getByText('Run Query', { exact: true }).click();

  // the engine's message is shown to the user rather than swallowed
  await expect(page.getByText('table COVID_DATA does not exist')).toBeVisible();

  // and no results are rendered
  await expect(getGridRows(page)).toHaveCount(0);
});

test('the query builder stays usable after a failed execution', async ({
  page,
}) => {
  captured.failures.set(EXECUTE_ENDPOINT, {
    status: 500,
    message: 'transient engine failure',
  });
  await getResultPanel(page).getByText('Run Query', { exact: true }).click();
  await expect(page.getByText('transient engine failure')).toBeVisible();

  // recovering the backend lets the very next run succeed — the failure
  // must not leave the result state stuck in a running/broken state
  captured.failures.delete(EXECUTE_ENDPOINT);
  await runQuery(page, captured);
  await expect(getGridRows(page)).not.toHaveCount(0);
});

test('a failing query save surfaces the error and keeps the editor open', async ({
  page,
}) => {
  captured.failures.set(CREATE_QUERY_ENDPOINT, {
    status: 500,
    message: 'query store unavailable',
  });

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Create New Query')).toBeVisible();
  await page.getByTitle('New Query Name').fill('Doomed Query');
  await page.getByRole('button', { name: 'Create Query' }).click();

  await expect(page.getByText('query store unavailable')).toBeVisible();

  // the app must not navigate away from the unsaved query
  await expect(page).not.toHaveURL(/\/edit\//);
});
