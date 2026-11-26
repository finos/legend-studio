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

import { test, expect, type Locator, type Page } from '@playwright/test';
import {
  ALL_CASES_TEMPLATE,
  CONFIRMED_CASES_TEMPLATE,
  mockTemplateQueries,
} from '../support/DepotMock.js';
import {
  setupEngineMock,
  type CapturedEngineRequests,
} from '../support/EngineMock.js';
import {
  ALL_CASES,
  expectColumnValues,
  getFilterPanel,
  getProjectionColumns,
  getQueryTitle,
  openDataSpaceQuery,
  project,
  recordOpenedWindows,
  runQuery,
  saveNewQuery,
  TEST_PROJECT_GAV,
  waitForQueryBuilder,
} from '../support/QueryBuilderHelpers.js';
import {
  asFunction,
  asProperty,
  at,
  getChainedFunction,
  getLambdaBody,
  getValue,
} from '../support/QueryProtocol.js';

/**
 * A data space can curate template queries: ready-made queries its users
 * start from. They are listed in the query builder, and each can be opened at
 * its own URL.
 */

const templateQueryUrl = (templateQueryId: string): string =>
  `extensions/dataspace/${TEST_PROJECT_GAV}/test::DataSpace/template/${templateQueryId}`;

/** `Cases` of the confirmed reports, the rows the confirmed-cases template selects. */
const CONFIRMED_CASES = ['250', '301', '512', '640'];

let captured: CapturedEngineRequests;
let getOpenedWindows: () => Promise<string[]>;

/** Open the data space's list of curated template queries. */
const openTemplateQueries = async (page: Page): Promise<Locator> => {
  await page.getByRole('button', { name: 'Templates ( 2 )' }).click();
  const templates = page
    .locator('.query-builder__data-space__template-query-panel')
    .filter({ hasText: 'Curated Template Queries' });
  await expect(templates).toBeVisible();
  return templates;
};

/** The entry of the template query titled `title` in the list. */
const getTemplateEntry = (templates: Locator, title: string): Locator =>
  templates
    .locator('.query-builder__data-space__template-query-panel__query')
    .filter({ hasText: title });

/** Expect the confirmed-cases template's query to be loaded in the builder. */
const expectConfirmedCasesQuery = async (page: Page): Promise<void> => {
  await expect(getProjectionColumns(page)).toHaveText([/Case Type/, /Cases/]);
  await expect(getFilterPanel(page).getByText('"Confirmed"')).toBeVisible();
};

test.beforeEach(async ({ page }) => {
  captured = await setupEngineMock(page);
  await mockTemplateQueries(page);
  getOpenedWindows = await recordOpenedWindows(page);
});

test('the data space lists its curated template queries', async ({ page }) => {
  await openDataSpaceQuery(page);

  const templates = await openTemplateQueries(page);
  for (const template of [CONFIRMED_CASES_TEMPLATE, ALL_CASES_TEMPLATE]) {
    const entry = getTemplateEntry(templates, template.title);
    await expect(entry).toBeVisible();
    await expect(entry).toContainText(template.description);
  }
});

test('a template query loads into the builder, ready to run', async ({
  page,
}) => {
  await openDataSpaceQuery(page);
  const templates = await openTemplateQueries(page);
  await getTemplateEntry(templates, CONFIRMED_CASES_TEMPLATE.title)
    .getByTitle('click to load template query')
    .click();

  await expect(templates).toBeHidden();
  await expectConfirmedCasesQuery(page);

  // the template runs as curated: `project(filter(getAll, x | $x.caseType == 'Confirmed'))`
  const lambda = (await runQuery(page, captured)).function;
  const condition = asFunction(
    getLambdaBody(at(getChainedFunction(lambda, 2).parameters, 1)),
  );
  expect(condition.function).toBe('equal');
  expect(asProperty(at(condition.parameters, 0)).property).toBe('caseType');
  expect(getValue(at(condition.parameters, 1))).toBe('Confirmed');
  await expectColumnValues(page, 'Cases', CONFIRMED_CASES);
});

test('loading a template query over unsaved changes to a saved query asks for confirmation', async ({
  page,
}) => {
  await openDataSpaceQuery(page);
  await project(page, ['Fips']);
  await saveNewQuery(page, 'Fips Query');
  await expect(getQueryTitle(page)).toHaveText('Fips Query', {
    timeout: 30_000,
  });
  await project(page, ['Case Type']);
  const unsavedChangesAlert = page.getByRole('dialog').filter({
    hasText: 'Unsaved changes will be lost if you continue',
  });

  // aborting keeps the changes
  let templates = await openTemplateQueries(page);
  await getTemplateEntry(templates, ALL_CASES_TEMPLATE.title)
    .getByTitle('click to load template query')
    .click();
  await unsavedChangesAlert.getByRole('button', { name: 'Abort' }).click();
  await expect(unsavedChangesAlert).toBeHidden();
  await expect(getProjectionColumns(page)).toHaveText([/Fips/, /Case Type/]);

  // proceeding replaces them with the template
  templates = await openTemplateQueries(page);
  await getTemplateEntry(templates, ALL_CASES_TEMPLATE.title)
    .getByTitle('click to load template query')
    .click();
  await unsavedChangesAlert.getByRole('button', { name: 'Proceed' }).click();
  await expect(getProjectionColumns(page)).toHaveText([/Fips/, /Cases/]);
  await runQuery(page, captured);
  await expectColumnValues(page, 'Cases', ALL_CASES);
});

test('a template query can be visited at its own URL', async ({ page }) => {
  await openDataSpaceQuery(page);
  const templates = await openTemplateQueries(page);
  await getTemplateEntry(templates, CONFIRMED_CASES_TEMPLATE.title)
    .getByTitle('Visit...')
    .click();

  // the template opens in a new tab, at its own route
  const appUrl = `${new URL(page.url()).origin}/query/`;
  await expect
    .poll(getOpenedWindows)
    .toEqual([appUrl + templateQueryUrl(CONFIRMED_CASES_TEMPLATE.id)]);
});

test('the template query route opens the template, titled as curated', async ({
  page,
}) => {
  await page.goto(templateQueryUrl(CONFIRMED_CASES_TEMPLATE.id));
  await waitForQueryBuilder(page);

  const header = page.locator('.query-editor__dataspace__header');
  await expect(header).toContainText(CONFIRMED_CASES_TEMPLATE.title);
  await expect(
    header.locator('.query-editor__dataspace__header__title__tag'),
  ).toHaveText('template');
  await expectConfirmedCasesQuery(page);

  await runQuery(page, captured);
  await expectColumnValues(page, 'Cases', CONFIRMED_CASES);
});

test('a query saved from a template reopens as a query of its own', async ({
  page,
}) => {
  await page.goto(templateQueryUrl(CONFIRMED_CASES_TEMPLATE.id));
  await waitForQueryBuilder(page);
  await expectConfirmedCasesQuery(page);

  await saveNewQuery(page, 'Confirmed Cases Query');

  // the saved query reopens on the data space, as the template left it
  await expect(getQueryTitle(page)).toHaveText('Confirmed Cases Query', {
    timeout: 30_000,
  });
  await expect(
    page.locator('.query-editor__dataspace__header__title__tag'),
  ).toBeHidden();
  await expectConfirmedCasesQuery(page);
  await runQuery(page, captured);
  await expectColumnValues(page, 'Cases', CONFIRMED_CASES);
});

test("a template query route naming a template the data space doesn't curate fails to open", async ({
  page,
}) => {
  await page.goto(templateQueryUrl('missingTemplate'));
  await expect(
    page.getByText("Can't find template query with id 'missingTemplate'"),
  ).toBeVisible({ timeout: 30_000 });
});
