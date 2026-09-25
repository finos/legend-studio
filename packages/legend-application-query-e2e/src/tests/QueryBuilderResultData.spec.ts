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
  at,
  getFunctionChain,
  type V1_ExecuteInput,
} from '../support/QueryProtocol.js';

/**
 * The engine mock evaluates queries against its data (see
 * `MockExecution.ts`), so these tests assert on what the result grid shows,
 * not just on the query sent.
 */

// Deep-link straight into the query builder for the mock data space served
// by the mock depot server (see `@finos/legend-fixture-mock-server`)
const TEST_DATA_SPACE_QUERY_URL =
  'extensions/dataspace/org.finos.legend.test:legend-query-test:0.0.1/test::DataSpace/dummyContext';

// `Cases` of the mock data, in its natural order
const ALL_CASES = ['250', '301', '180', '420', '95', '512', '77', '640'];

let captured: CapturedEngineRequests;

const getResultPanel = (page: Page): Locator =>
  page.getByTestId('query__builder__result__panel');

const getGridRows = (page: Page): Locator =>
  getResultPanel(page).locator('.ag-center-cols-container .ag-row');

const project = async (page: Page, properties: string[]): Promise<void> => {
  const explorer = page.getByTestId('query__builder__explorer');
  const projectionPanel = page.getByTestId('query__builder__tds__projection');
  for (const property of properties) {
    await explorer.getByText(property, { exact: true }).dragTo(projectionPanel);
  }
  await expect(
    page.getByTestId('QUERY_BUILDER_TDS_PROJECTION_COLUMN'),
  ).toHaveCount(properties.length);
};

/** Filter to rows whose `Case Type` is `value`. */
const filterCaseType = async (page: Page, value: string): Promise<void> => {
  const filterPanel = page.getByTestId('query__builder__filter__panel');
  await page
    .getByTestId('query__builder__explorer')
    .getByText('Case Type', { exact: true })
    .dragTo(filterPanel);
  await page
    .getByTestId('query-builder-filter-tree__condition-node__value')
    .click();
  await filterPanel.locator('.value-spec-editor input').fill(value);
  await page.keyboard.press('Enter');
  await expect(filterPanel.getByText(`"${value}"`)).toBeVisible();
};

const runQuery = async (page: Page): Promise<void> => {
  await getResultPanel(page).getByText('Run Query', { exact: true }).click();
  await expect(getResultPanel(page).getByText(/\d+ row\(s\)/)).toBeVisible();
};

/**
 * The values of a result column, top to bottom as displayed — the grid
 * positions rows by their `row-index`, which needn't match DOM order.
 */
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

const openQueryOptions = async (page: Page): Promise<Locator> => {
  await page.getByTitle('Configure Query Options...').click();
  const modal = page.getByRole('dialog');
  await expect(modal.getByText('Query Options')).toBeVisible();
  return modal;
};

test.beforeEach(async ({ page }) => {
  captured = await setupEngineMock(page);
  await page.goto(TEST_DATA_SPACE_QUERY_URL);
  await expect(
    page
      .getByTestId('query__builder__explorer')
      .getByText('Cases', { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
});

test('a filter narrows the result to the matching rows', async ({ page }) => {
  await project(page, ['Case Type', 'Cases']);
  await filterCaseType(page, 'Death');
  await runQuery(page);

  await expect(getResultPanel(page).getByText('2 row(s)')).toBeVisible();
  expect(await getColumnValues(page, 'Case Type')).toEqual(['Death', 'Death']);
  expect(await getColumnValues(page, 'Cases')).toEqual(['420', '77']);
});

test('a query matching nothing returns an empty result', async ({ page }) => {
  await project(page, ['Case Type', 'Cases']);
  await filterCaseType(page, 'Recovered');
  await runQuery(page);

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
  await runQuery(page);

  expect(await getColumnValues(page, 'Cases')).toEqual(
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
  await runQuery(page);

  expect(await getColumnValues(page, 'Case Type')).toEqual([
    'Confirmed',
    'Active',
    'Death',
  ]);
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
  await runQuery(page);
  await expect(getGridRows(page)).toHaveCount(ALL_CASES.length);
  await expect(warning).toBeHidden();

  // below it: the grid shows only the first rows, and says so
  await resultPanel
    .getByRole('spinbutton', { name: 'preview row limit' })
    .fill('5');
  await page.keyboard.press('Enter');
  await runQuery(page);
  expect(await getColumnValues(page, 'Cases')).toEqual(ALL_CASES.slice(0, 5));
  await expect(warning).toBeVisible();
});

test('clicking a column header sorts the displayed rows', async ({ page }) => {
  await project(page, ['Cases']);
  await runQuery(page);
  const header = getResultPanel(page).locator('.ag-header-cell', {
    hasText: 'Cases',
  });

  await header.click();
  await expect
    .poll(() => getColumnValues(page, 'Cases'))
    .toEqual(ALL_CASES.toSorted((a, b) => Number(a) - Number(b)));

  // sorting happens in the grid: the query is not re-run
  expect(captured.executeInputs).toHaveLength(1);
});

test('selected cells are summarized in the stats bar', async ({ page }) => {
  await project(page, ['Cases']);
  await runQuery(page);
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
    const exportInput = at(
      captured.executeInputs,
      captured.executeInputs.length - 1,
    ) as unknown as V1_ExecuteInput;
    expect(getFunctionChain(exportInput.function)).not.toContain('take');
  });
});
