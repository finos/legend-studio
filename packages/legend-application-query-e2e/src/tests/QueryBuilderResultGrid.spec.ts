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

import { test, expect, type Page } from '@playwright/test';
import { setupEngineMock } from '../support/EngineMock.js';
import { TEST_DATA__EXECUTION_RESULT_ROW_COUNT } from '../support/TEST_DATA__EngineResponses.js';

// Deep-link straight into the query builder for the mock data space served
// by the mock depot server (see `@finos/legend-fixture-mock-server`)
const TEST_DATA_SPACE_QUERY_URL =
  'extensions/dataspace/org.finos.legend.test:legend-query-test:0.0.1/test::DataSpace/dummyContext';

const COLUMNS = [
  'Cases',
  'Case Type',
  'Date',
  'Fips',
  'Id',
  'Last Reported Flag',
];

/** Project every column and execute, leaving the result grid populated. */
const buildAndRunQuery = async (page: Page): Promise<void> => {
  const explorer = page.getByTestId('query__builder__explorer');
  const projectionPanel = page.getByTestId('query__builder__tds__projection');
  for (const column of COLUMNS) {
    await explorer.getByText(column, { exact: true }).dragTo(projectionPanel);
  }
  await page
    .getByTestId('query__builder__result__panel')
    .getByText('Run Query', { exact: true })
    .click();
  await expect(page.locator('.ag-center-cols-container .ag-row')).toHaveCount(
    TEST_DATA__EXECUTION_RESULT_ROW_COUNT,
  );
};

test.beforeEach(async ({ page }) => {
  await setupEngineMock(page);
  await page.goto(TEST_DATA_SPACE_QUERY_URL);
  await expect(
    page
      .getByTestId('query__builder__explorer')
      .getByText('Cases', { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
});

test('result grid renders all mocked rows and columns', async ({ page }) => {
  await buildAndRunQuery(page);
  const resultPanel = page.getByTestId('query__builder__result__panel');

  // every projected column has a header
  for (const column of COLUMNS) {
    await expect(
      resultPanel.locator('.ag-header-cell-text', { hasText: column }).first(),
    ).toBeVisible();
  }

  // spot-check first and last row values from the mock result
  await expect(resultPanel.getByText('2021-04-01')).toBeVisible();
  await expect(resultPanel.getByText('2021-04-08')).toBeVisible();
});

test('a cell value can be filtered by from the result grid', async ({
  page,
}) => {
  await buildAndRunQuery(page);
  const filterPanel = page.getByTestId('query__builder__filter__panel');

  // right-click a `Case Type` cell holding 'Death' to open the grid menu
  await page
    .locator('.ag-cell', { hasText: /^Death$/ })
    .first()
    .click({ button: 'right' });
  await page.getByText('Filter By', { exact: true }).click();

  // the filter panel gains an equality condition on that value
  const condition = page.getByTestId(
    'query__builder__filter__tree__condition__node-content',
  );
  await expect(condition.getByText('Case Type')).toBeVisible();
  await expect(filterPanel.getByText('Death')).toBeVisible();
});

test('a cell value can be filtered out from the result grid', async ({
  page,
}) => {
  await buildAndRunQuery(page);
  const filterPanel = page.getByTestId('query__builder__filter__panel');

  await page
    .locator('.ag-cell', { hasText: /^Death$/ })
    .first()
    .click({ button: 'right' });
  await page.getByText('Filter Out', { exact: true }).click();

  // `Filter Out` builds the negated form of the condition
  await expect(filterPanel.getByText('is not')).toBeVisible();
  await expect(filterPanel.getByText('Death')).toBeVisible();
});

// NOTE: multi-cell range selection (which would let `Filter By` build an
// `in` list from several cells) and `Copy Row Value` both depend on ag-grid
// enterprise features. The app only renders the enterprise grid when
// `TEMPORARY__enableGridEnterpriseMode` is set, and the dev build this suite
// runs against builds without an ag-grid license, so those flows can't be
// covered here — `Filter By` falls back to the single right-clicked cell.

test('a cell value can be copied to the clipboard', async ({ page }) => {
  await buildAndRunQuery(page);

  // the grid menu offers `Copy` (cell) and `Copy Row Value` (whole row)
  await page
    .locator('.ag-cell', { hasText: /^Death$/ })
    .first()
    .click({ button: 'right' });
  await page.getByText('Copy', { exact: true }).click();

  const cellClipboard = await page.evaluate(() =>
    navigator.clipboard.readText(),
  );
  expect(cellClipboard.trim()).toBe('Death');
});
