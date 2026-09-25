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

import { test, expect, type Locator, type Page } from '@playwright/test';
import {
  COVID_CASES_SERVICE_PATH,
  mockProjectListing,
  mockServiceModel,
  TEST_PROJECT_VERSION,
} from '../support/DepotMock.js';
import {
  setupEngineMock,
  type CapturedEngineRequests,
} from '../support/EngineMock.js';
import { at, type V1_ExecuteInput } from '../support/QueryProtocol.js';

/**
 * Every other spec deep-links into the query builder for a data space; these
 * cover the other ways into it.
 */

const PROJECT_GAV = `org.finos.legend.test:legend-query-test:${TEST_PROJECT_VERSION}`;
const MAPPING_PATH = 'test::CovidDataMapping';
const RUNTIME_PATH = 'test::H2Runtime';

const TEST_DATA_SPACE_QUERY_URL = `extensions/dataspace/${PROJECT_GAV}/test::DataSpace/dummyContext`;
const MAPPING_QUERY_URL = `create/manual/${PROJECT_GAV}/${MAPPING_PATH}/${RUNTIME_PATH}`;
const SERVICE_QUERY_URL = `create-from-service/${PROJECT_GAV}/${COVID_CASES_SERVICE_PATH}`;

let captured: CapturedEngineRequests;

const getExplorer = (page: Page): Locator =>
  page.getByTestId('query__builder__explorer');

const getProjectionColumns = (page: Page): Locator =>
  page.getByTestId('QUERY_BUILDER_TDS_PROJECTION_COLUMN');

const getGridRows = (page: Page): Locator =>
  page
    .getByTestId('query__builder__result__panel')
    .locator('.ag-center-cols-container .ag-row');

/** Wait for the builder to load, i.e. its explorer to list the class. */
const waitForQueryBuilder = async (page: Page): Promise<void> => {
  await expect(
    getExplorer(page).getByText('Cases', { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
};

/** Run the query; return what the app sent to execute it. */
const runQuery = async (page: Page): Promise<V1_ExecuteInput> => {
  await page
    .getByTestId('query__builder__result__panel')
    .getByText('Run Query', { exact: true })
    .click();
  await expect
    .poll(() => captured.executeInputs.length, { timeout: 30_000 })
    .toBeGreaterThan(0);
  return at(
    captured.executeInputs,
    captured.executeInputs.length - 1,
  ) as unknown as V1_ExecuteInput;
};

/** The setup wizard's field titled `title`, e.g. `Project`. */
const getWizardField = (page: Page, title: string): Locator =>
  page.locator('.query-setup__wizard__group').filter({
    has: page.locator('.query-setup__wizard__group__title', {
      hasText: new RegExp(`^${title}$`),
    }),
  });

/** Pick `option` in the setup wizard's field titled `title`. */
const choose = async (
  page: Page,
  title: string,
  option: string,
): Promise<void> => {
  await getWizardField(page, title).getByRole('combobox').click();
  await page.getByRole('option', { name: option, exact: true }).click();
};

test.beforeEach(async ({ page }) => {
  captured = await setupEngineMock(page);
});

test('a query can be built directly on a mapping and runtime', async ({
  page,
}) => {
  await page.goto(MAPPING_QUERY_URL);
  await waitForQueryBuilder(page);

  await getExplorer(page)
    .getByText('Cases', { exact: true })
    .dragTo(page.getByTestId('query__builder__tds__projection'));
  const executeInput = await runQuery(page);
  await expect(getGridRows(page)).toHaveCount(8);

  // the query runs against the chosen mapping and runtime
  expect(executeInput.mapping).toBe(MAPPING_PATH);
  expect(executeInput.runtime).toMatchObject({ runtime: RUNTIME_PATH });
});

test('the setup wizard creates a query on a chosen mapping and runtime', async ({
  page,
}) => {
  await mockProjectListing(page);
  await page.goto('setup');
  // querying a mapping directly is an advanced action
  await page.getByTitle('Show advanced actions').click();
  await page.getByText('Create new query on a mapping').click();
  await expect(page).toHaveURL(/\/setup\/manual/);

  await choose(page, 'Project', 'org.finos.legend.test.legend-query-test');
  await choose(page, 'Version', TEST_PROJECT_VERSION);
  // element options show the element's name and its full path
  await choose(page, 'Mapping', `CovidDataMapping ${MAPPING_PATH}`);
  // the mapping's only compatible runtime is picked for us
  await expect(getWizardField(page, 'Runtime')).toContainText('H2Runtime');

  await page.getByTitle('Create a new query').click();
  await expect(page).toHaveURL(new RegExp(`/${MAPPING_QUERY_URL}$`));
  await waitForQueryBuilder(page);
});

test("the setup wizard clones a service's query", async ({ page }) => {
  await mockProjectListing(page);
  await mockServiceModel(page);
  await page.goto('setup');
  await page.getByTitle('Show advanced actions').click();
  await page.getByText('Clone an existing service query').click();
  await expect(page).toHaveURL(/\/setup\/clone-service-query/);

  await choose(page, 'Project', 'org.finos.legend.test.legend-query-test');
  await choose(page, 'Version', TEST_PROJECT_VERSION);
  await choose(page, 'Service', 'CovidCasesService');

  await page.getByTitle('Create a new query').click();
  await expect(page).toHaveURL(new RegExp(`/${SERVICE_QUERY_URL}$`));
  await waitForQueryBuilder(page);
  await expect(getProjectionColumns(page)).toHaveText(['Case Type', 'Cases']);
});

test("a service's query opens in the builder, ready to run", async ({
  page,
}) => {
  await mockServiceModel(page);
  await page.goto(SERVICE_QUERY_URL);
  await waitForQueryBuilder(page);

  // the service's projection and filter are loaded into the builder
  await expect(getProjectionColumns(page)).toHaveText(['Case Type', 'Cases']);
  const filterPanel = page.getByTestId('query__builder__filter__panel');
  await expect(filterPanel.getByText('Case Type')).toBeVisible();
  await expect(filterPanel.getByText('"Confirmed"')).toBeVisible();

  // and runs as-is, with the service's mapping and runtime
  const executeInput = await runQuery(page);
  expect(executeInput.mapping).toBe(MAPPING_PATH);
  expect(executeInput.runtime).toMatchObject({ runtime: RUNTIME_PATH });
  await expect(getGridRows(page)).toHaveCount(4);
});

test('a saved query can be opened from the query setup', async ({ page }) => {
  // save a query to open
  await page.goto(TEST_DATA_SPACE_QUERY_URL);
  await waitForQueryBuilder(page);
  await getExplorer(page)
    .getByText('Case Type', { exact: true })
    .dragTo(page.getByTestId('query__builder__tds__projection'));
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByTitle('New Query Name').fill('Entry Route Saved Query');
  await page.getByRole('button', { name: 'Create Query' }).click();
  await expect(page).toHaveURL(/\/edit\//);
  const queryId = new URL(page.url()).pathname.split('/edit/')[1];

  await page.goto('setup');
  await page.getByText('Open an existing query').click();
  await page
    .getByPlaceholder('Search for queries by name or ID')
    .fill('Entry Route');
  await page
    .locator('.query-loader__result', { hasText: 'Entry Route Saved Query' })
    .getByTitle(/^Click to .+\.\.\.$/)
    .first()
    .click();

  await expect(page).toHaveURL(new RegExp(`/edit/${queryId}$`));
  await expect(page.getByTitle('Double-click to rename query')).toHaveText(
    'Entry Route Saved Query',
    { timeout: 30_000 },
  );
  await expect(getProjectionColumns(page)).toHaveText(['Case Type']);
});
