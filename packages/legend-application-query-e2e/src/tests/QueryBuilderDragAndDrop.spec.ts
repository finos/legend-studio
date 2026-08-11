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

const COLUMNS = [
  'Cases',
  'Case Type',
  'Date',
  'Fips',
  'Id',
  'Last Reported Flag',
];

test.beforeEach(async ({ page }) => {
  await setupEngineMock(page);
  await page.goto(TEST_DATA_SPACE_QUERY_URL);
  // the graph is built in the browser from the mock depot project, wait for
  // the explorer tree to render before interacting
  await expect(
    page
      .getByTestId('query__builder__explorer')
      .getByText('Cases', { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
});

test('build and run a query with projection columns, filter, and post-filter', async ({
  page,
}) => {
  const explorer = page.getByTestId('query__builder__explorer');
  const projectionPanel = page.getByTestId('query__builder__tds__projection');
  const filterPanel = page.getByTestId('query__builder__filter__panel');
  const resultPanel = page.getByTestId('query__builder__result__panel');
  const projectionColumns = page.getByTestId(
    'QUERY_BUILDER_TDS_PROJECTION_COLUMN',
  );

  // 1. drag every property from the explorer into the projection panel
  for (const column of COLUMNS) {
    await explorer.getByText(column, { exact: true }).dragTo(projectionPanel);
    await expect(
      projectionColumns.getByText(column, { exact: true }),
    ).toBeVisible();
  }
  await expect(projectionColumns).toHaveCount(COLUMNS.length);

  // 2. run the query and check the result grid (the engine execute endpoint
  // is mocked to return 2 rows, see `TEST_DATA__ExecutionResult`)
  await resultPanel.getByText('Run Query', { exact: true }).click();
  const gridRows = resultPanel.locator('.ag-center-cols-container .ag-row');
  await expect(gridRows).toHaveCount(2);
  await expect(resultPanel.getByText('2021-04-01')).toBeVisible();
  await expect(resultPanel.getByText('2021-04-02')).toBeVisible();

  // 3. filter: `Case Type` is 'Confirmed'
  await explorer.getByText('Case Type', { exact: true }).dragTo(filterPanel);
  const filterCondition = page.getByTestId(
    'query__builder__filter__tree__condition__node-content',
  );
  await expect(filterCondition.getByText('Case Type')).toBeVisible();
  await page
    .getByTestId('query-builder-filter-tree__condition-node__value')
    .click();
  await filterPanel.locator('.value-spec-editor input').fill('Confirmed');
  await page.keyboard.press('Enter');
  await expect(filterCondition.getByText('Confirmed')).toBeVisible();

  // 4. post-filter: `Cases` > 200
  await page
    .getByTestId('query__builder__actions')
    .getByRole('button', { name: 'Advanced' })
    .click();
  await page.getByText('Show Post-Filter').click();
  const postFilterPanel = page.getByTestId(
    'query__builder__post__filter-panel',
  );
  await expect(postFilterPanel).toBeVisible();

  await projectionColumns
    .getByText('Cases', { exact: true })
    .dragTo(postFilterPanel);
  const postFilterCondition = page.getByTestId(
    'query__builder__post__filter__tree__node-content',
  );
  await expect(postFilterCondition.getByText('Cases')).toBeVisible();

  // switch the operator from the default `is` to `>`
  await postFilterPanel.getByTitle('Choose Operator...').click();
  await page
    .locator(
      '.query-builder-post-filter-tree__condition-node__operator__dropdown__option',
      { hasText: /^>$/ },
    )
    .click();
  await postFilterPanel
    .locator('.value-spec-editor__editable__display--content')
    .click();
  await postFilterPanel.locator('.value-spec-editor input').fill('200');
  await page.keyboard.press('Enter');
  await expect(postFilterCondition.getByText('200')).toBeVisible();

  // 5. re-run with filter and post-filter in place
  await resultPanel.getByText('Run Query', { exact: true }).click();
  await expect(gridRows).toHaveCount(2);
});
