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

import { readFile } from 'node:fs/promises';
import { test, expect, type Locator, type Page } from '@playwright/test';
import {
  setupEngineMock,
  type CapturedEngineRequests,
} from '../support/EngineMock.js';
import {
  addFilterCondition,
  ALL_CASES,
  expectColumnValues,
  getFilterPanel,
  getGridRows,
  getLatestExecution,
  getResultPanel,
  openDataSpaceQuery,
  openQueryOptions,
  project,
  runQuery,
  setConditionValue,
} from '../support/QueryBuilderHelpers.js';
import { getFunctionChain } from '../support/QueryProtocol.js';

/**
 * The engine mock evaluates queries against its data (see
 * `MockExecution.ts`), so these tests assert on what the result grid shows,
 * not just on the query sent.
 */

let captured: CapturedEngineRequests;

/** Filter to rows whose `Case Type` is `value`. */
const filterCaseType = async (page: Page, value: string): Promise<void> => {
  await addFilterCondition(page, 'Case Type');
  await setConditionValue(page, getFilterPanel(page), value);
  await expect(getFilterPanel(page).getByText(`"${value}"`)).toBeVisible();
};

test.beforeEach(async ({ page }) => {
  captured = await setupEngineMock(page);
  await openDataSpaceQuery(page);
});

test('a filter narrows the result to the matching rows', async ({ page }) => {
  await project(page, ['Case Type', 'Cases']);
  await filterCaseType(page, 'Death');
  await runQuery(page, captured);

  await expect(getResultPanel(page).getByText('2 row(s)')).toBeVisible();
  await expectColumnValues(page, 'Case Type', ['Death', 'Death']);
  await expectColumnValues(page, 'Cases', ['420', '77']);
});

test('a query matching nothing returns an empty result', async ({ page }) => {
  await project(page, ['Case Type', 'Cases']);
  await filterCaseType(page, 'Recovered');
  await runQuery(page, captured);

  await expect(getResultPanel(page).getByText('0 row(s)')).toBeVisible();
  await expect(getGridRows(page)).toHaveCount(0);
});

test('a sort result modifier orders the rows', async ({ page }) => {
  await project(page, ['Cases']);
  const modal = await openQueryOptions(page);
  // a new sort applies to the first column, ascending; flip it
  await modal.getByRole('button', { name: 'Add Value' }).click();
  await modal.getByTitle('Choose SortBy Operator...').click();
  await expect(modal.getByText('desc')).toBeVisible();
  await modal.getByRole('button', { name: 'Apply' }).click();
  await runQuery(page, captured);

  await expectColumnValues(
    page,
    'Cases',
    ALL_CASES.toSorted((a, b) => Number(b) - Number(a)),
  );
});

test('eliminating duplicate rows keeps one row per distinct value', async ({
  page,
}) => {
  await project(page, ['Case Type']);
  const modal = await openQueryOptions(page);
  await modal
    .locator('.panel__content__form__section')
    .filter({ hasText: 'Eliminate Duplicate Rows' })
    .locator('.panel__content__form__section__toggler')
    .click();
  await modal.getByRole('button', { name: 'Apply' }).click();
  await runQuery(page, captured);

  await expectColumnValues(page, 'Case Type', ['Confirmed', 'Active', 'Death']);
});

test('a result larger than the preview limit is truncated with a warning', async ({
  page,
}) => {
  await project(page, ['Cases']);
  const resultPanel = getResultPanel(page);
  const warning = resultPanel.getByText(
    'Data below is not complete - query produces more rows than the set grid preview limit',
  );

  // within the limit: every row, no warning
  await runQuery(page, captured);
  await expect(getGridRows(page)).toHaveCount(ALL_CASES.length);
  await expect(warning).toBeHidden();

  // below it: the grid shows only the first rows, and says so
  await resultPanel
    .getByRole('spinbutton', { name: 'preview row limit' })
    .fill('5');
  await page.keyboard.press('Enter');
  await runQuery(page, captured);
  await expectColumnValues(page, 'Cases', ALL_CASES.slice(0, 5));
  await expect(warning).toBeVisible();
});

test('clicking a column header sorts the displayed rows', async ({ page }) => {
  await project(page, ['Cases']);
  await runQuery(page, captured);
  const header = getResultPanel(page).locator('.ag-header-cell', {
    hasText: 'Cases',
  });

  await header.click();
  await expectColumnValues(
    page,
    'Cases',
    ALL_CASES.toSorted((a, b) => Number(a) - Number(b)),
  );

  // sorting happens in the grid: the query is not re-run
  expect(captured.executeInputs).toHaveLength(1);
});

test('selected cells are summarized in the stats bar', async ({ page }) => {
  await project(page, ['Cases']);
  await runQuery(page, captured);
  const cell = (value: string): Locator =>
    getResultPanel(page).locator('.ag-cell[col-id="Cases"]', {
      hasText: new RegExp(`^${value}$`),
    });

  // click one cell, then shift-click to add more
  await cell('250').click();
  await cell('301').click({ modifiers: ['Shift'] });
  await cell('180').click({ modifiers: ['Shift'] });

  // each stat is an item of `<label> <value>`
  const stat = (label: string): Locator =>
    getResultPanel(page)
      .locator('.query-builder__result__tds-grid__stats-bar__item')
      .filter({
        has: page.getByText(label, { exact: true }),
      })
      .locator('.query-builder__result__tds-grid__stats-bar__item__value');
  await expect(stat('Sum:')).toHaveText('731');
  await expect(stat('Min:')).toHaveText('180');
  await expect(stat('Max:')).toHaveText('301');
});

// The app streams downloads through a service worker when one is registered,
// which Playwright can't observe as a download; blocking it makes the app
// fall back to an in-memory download of the same content.
test.describe('with service workers blocked', () => {
  test.use({ serviceWorkers: 'block' });

  test('results can be exported as CSV', async ({ page }) => {
    await project(page, ['Case Type', 'Cases']);
    await filterCaseType(page, 'Death');

    await getResultPanel(page).getByTitle('Export').click();
    await page.getByRole('button', { name: 'CSV' }).click();
    // exporting data asks the user to attest to handling it responsibly
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Accept' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toBe('result.csv');
    const csv = await readFile(await download.path(), 'utf-8');
    expect(csv).toBe('Case Type,Cases\nDeath,420\nDeath,77\n');

    // the export is not capped by the grid's preview limit
    expect(
      getFunctionChain(getLatestExecution(captured).function),
    ).not.toContain('take');
  });
});
