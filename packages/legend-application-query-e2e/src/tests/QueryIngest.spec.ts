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
  COVID_INGEST_PATH,
  HOSPITAL_INGEST_PATH,
  mockIngestDefinitions,
  TEST_PROJECT_VERSION,
} from '../support/DepotMock.js';
import {
  setupEngineMock,
  type CapturedEngineRequests,
} from '../support/EngineMock.js';
import {
  mockLakehouseUserEnvironment,
  TEST_LAKEHOUSE_ENVIRONMENT,
} from '../support/LakehouseMock.js';
import {
  at,
  getChainedFunction,
  getFunctionChain,
  type V1_ExecuteInput,
} from '../support/QueryProtocol.js';

/**
 * An ingest query queries a data set of an ingest definition — data ingested
 * into Lakehouse — on a Lakehouse runtime created for the user's Lakehouse
 * environment. Its route names the ingest definition and the data set.
 */

const PROJECT_GAV = `org.finos.legend.test:legend-query-test:${TEST_PROJECT_VERSION}`;
const ingestUrl = (ingestPath: string, dataSet: string): string =>
  `ingest/${PROJECT_GAV}/${ingestPath}/${dataSet}`;
const COVID_CASES_URL = ingestUrl(COVID_INGEST_PATH, 'CovidCases');

// `Cases` of the mock data
const ALL_CASES = ['250', '301', '180', '420', '95', '512', '77', '640'];

let captured: CapturedEngineRequests;

const getExplorer = (page: Page): Locator =>
  page.getByTestId('query__builder__explorer');

const getResultPanel = (page: Page): Locator =>
  page.getByTestId('query__builder__result__panel');

/** The setup panel's selector labelled `label`, e.g. `Data Set`. */
const getSelector = (page: Page, label: string): Locator =>
  page.getByRole('combobox', { name: label, exact: true });

/** What the setup panel's selector labelled `label` has selected. */
const getSelected = (page: Page, label: string): Locator =>
  page.locator('.query-builder__setup__config-group__item', {
    has: getSelector(page, label),
  });

const choose = async (
  page: Page,
  label: string,
  option: string,
): Promise<void> => {
  await getSelector(page, label).click();
  await page.getByRole('option', { name: option, exact: true }).click();
};

/** Wait for the explorer to list the data set's columns. */
const waitForColumns = async (page: Page, columns: string[]): Promise<void> => {
  for (const column of columns) {
    await expect(
      getExplorer(page).getByText(column, { exact: true }),
    ).toBeVisible({ timeout: 30_000 });
  }
};

const project = async (page: Page, column: string): Promise<void> => {
  await getExplorer(page)
    .getByText(column, { exact: true })
    .dragTo(page.getByTestId('query__builder__tds__projection'));
  await expect(
    page.getByTestId('QUERY_BUILDER_TDS_PROJECTION_COLUMN'),
  ).toContainText([column]);
};

/** Run the query; return what the app sent to execute it. */
const runQuery = async (page: Page): Promise<V1_ExecuteInput> => {
  const executionsBefore = captured.executeInputs.length;
  await getResultPanel(page).getByText('Run Query', { exact: true }).click();
  await expect
    .poll(() => captured.executeInputs.length, { timeout: 30_000 })
    .toBeGreaterThan(executionsBefore);
  await expect(getResultPanel(page).getByText(/\d+ row\(s\)/)).toBeVisible();
  return at(
    captured.executeInputs,
    captured.executeInputs.length - 1,
  ) as unknown as V1_ExecuteInput;
};

/** The values of a result column, top to bottom as displayed. */
const getColumnValues = (page: Page, column: string): Promise<string[]> =>
  getResultPanel(page)
    .locator(`.ag-center-cols-container .ag-cell[col-id="${column}"]`)
    .evaluateAll((cells) =>
      cells
        .map((cell) => ({
          index: Number(cell.closest('.ag-row')?.getAttribute('row-index')),
          text: cell.textContent?.trim() ?? '',
        }))
        .sort((a, b) => a.index - b.index)
        .map((cell) => cell.text),
    );

/** The ingest data set the query reads, e.g. `#I{test::CovidIngest.CovidCases}#`. */
const getQueriedDataSet = (executeInput: V1_ExecuteInput): unknown =>
  at(getChainedFunction(executeInput.function, 2).parameters, 0);

/** The Lakehouse runtime the query runs on, from the model sent with it. */
const getLakehouseRuntime = (executeInput: V1_ExecuteInput): unknown =>
  JSON.stringify(executeInput.model).match(
    /"runtimeValue":(?<runtime>\{"_type":"LakehouseRuntime"[^}]*\})/,
  )?.groups?.runtime;

test.beforeEach(async ({ page }) => {
  captured = await setupEngineMock(page);
  await mockIngestDefinitions(page);
  await mockLakehouseUserEnvironment(page);
});

test("the ingest route opens on the data set, and queries it on a Lakehouse runtime for the user's environment", async ({
  page,
}) => {
  await page.goto(COVID_CASES_URL);
  await waitForColumns(page, ['Fips', 'Date', 'Case Type', 'Cases']);
  await expect(getSelected(page, 'Ingest')).toContainText(COVID_INGEST_PATH);
  await expect(getSelected(page, 'Data Set')).toContainText('CovidCases');

  await project(page, 'Cases');
  const executeInput = await runQuery(page);
  expect(await getColumnValues(page, 'Cases')).toEqual(ALL_CASES);

  // `#I{test::CovidIngest.CovidCases}#->project(...)`, run on a Lakehouse
  // runtime
  expect(getFunctionChain(executeInput.function)).toEqual([
    'from',
    'take',
    'project',
  ]);
  expect(getQueriedDataSet(executeInput)).toMatchObject({
    _type: 'classInstance',
    type: 'I',
    value: { path: [COVID_INGEST_PATH, 'CovidCases'] },
  });
  expect(getLakehouseRuntime(executeInput)).toContain(
    `"environment":"${TEST_LAKEHOUSE_ENVIRONMENT}"`,
  );
});

test('another data set of the ingest definition can be queried', async ({
  page,
}) => {
  await page.goto(COVID_CASES_URL);
  await waitForColumns(page, ['Cases']);

  await choose(page, 'Data Set', 'Demographics');
  await waitForColumns(page, ['Fips', 'State']);
  await expect(
    getExplorer(page).getByText('Cases', { exact: true }),
  ).toHaveCount(0);

  await project(page, 'State');
  const executeInput = await runQuery(page);
  expect(await getColumnValues(page, 'State')).toEqual([
    'NY',
    'NJ',
    'CA',
    'NY',
    'TX',
    'NJ',
    'CA',
    'NY',
  ]);
  expect(getQueriedDataSet(executeInput)).toMatchObject({
    value: { path: [COVID_INGEST_PATH, 'Demographics'] },
  });
});

test('another ingest definition of the project can be queried', async ({
  page,
}) => {
  await page.goto(COVID_CASES_URL);
  await waitForColumns(page, ['Cases']);

  // every ingest definition of the project is listed
  await getSelector(page, 'Ingest').click();
  await expect(page.getByRole('option')).toHaveText([
    COVID_INGEST_PATH,
    HOSPITAL_INGEST_PATH,
  ]);
  await page.getByRole('option', { name: HOSPITAL_INGEST_PATH }).click();

  // switching opens its first data set, whose batch milestoned write mode
  // adds Lakehouse's milestoning columns
  await expect(getSelected(page, 'Data Set')).toContainText('Admissions');
  await waitForColumns(page, [
    'Hospital',
    'Patients',
    'Lake in Id',
    'Lake out Id',
    'Lake Digest',
  ]);

  await project(page, 'Patients');
  const executeInput = await runQuery(page);
  expect(await getColumnValues(page, 'Patients')).toEqual(['12', '30', '7']);
  expect(getQueriedDataSet(executeInput)).toMatchObject({
    value: { path: [HOSPITAL_INGEST_PATH, 'Admissions'] },
  });
});

test('the copied link to an ingest query reopens it on the same data set', async ({
  page,
}) => {
  await page.goto(COVID_CASES_URL);
  await waitForColumns(page, ['Cases']);
  await choose(page, 'Data Set', 'Demographics');
  await waitForColumns(page, ['State']);

  await page.getByTitle('copy ingest query set up link to clipboard').click();
  await expect(
    page.getByText('Copied ingest query set up link to clipboard'),
  ).toBeVisible();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toMatch(
    new RegExp(`/query/${ingestUrl(COVID_INGEST_PATH, 'Demographics')}$`),
  );

  await page.goto(link);
  await waitForColumns(page, ['Fips', 'State']);
  await expect(getSelected(page, 'Data Set')).toContainText('Demographics');
});

test('a saved ingest query reopens on its ingest definition and data set', async ({
  page,
}) => {
  await page.goto(ingestUrl(HOSPITAL_INGEST_PATH, 'Admissions'));
  await waitForColumns(page, ['Hospital']);
  await project(page, 'Hospital');

  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByTitle('New Query Name').fill('Hospital Admissions');
  await page.getByRole('button', { name: 'Create Query' }).click();
  await expect(page).toHaveURL(/\/edit\//);

  await page.reload();
  await expect(page.getByTitle('Double-click to rename query')).toHaveText(
    'Hospital Admissions',
    { timeout: 30_000 },
  );
  await expect(getSelected(page, 'Ingest')).toContainText(HOSPITAL_INGEST_PATH);
  await expect(getSelected(page, 'Data Set')).toContainText('Admissions');
  await expect(
    page.getByTestId('QUERY_BUILDER_TDS_PROJECTION_COLUMN'),
  ).toHaveText(['Hospital']);

  await runQuery(page);
  expect(await getColumnValues(page, 'Hospital')).toEqual([
    'Mercy',
    'St. Mary',
    'General',
  ]);
});

test("an ingest route naming an ingest definition that doesn't exist fails to open", async ({
  page,
}) => {
  await page.goto(ingestUrl('test::MissingIngest', 'CovidCases'));
  await expect(
    page.getByText(
      `Can't find ingest definition 'test::MissingIngest' in project ${PROJECT_GAV}`,
    ),
  ).toBeVisible({ timeout: 30_000 });
});
