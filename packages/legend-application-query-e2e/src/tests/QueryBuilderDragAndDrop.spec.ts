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
  addFilterCondition,
  chooseAdvancedMenuItem,
  chooseConditionOperator,
  getFilterPanel,
  getGridRows,
  getPostFilterPanel,
  getProjectionColumns,
  getResultPanel,
  openDataSpaceQuery,
  project,
  runQuery,
  setConditionValue,
} from '../support/QueryBuilderHelpers.js';
import { TEST_DATA__EXECUTION_RESULT_ROW_COUNT } from '../support/TEST_DATA__EngineResponses.js';

const COLUMNS = [
  'Cases',
  'Case Type',
  'Date',
  'Fips',
  'Id',
  'Last Reported Flag',
];

let captured: CapturedEngineRequests;

test.beforeEach(async ({ page }) => {
  captured = await setupEngineMock(page);
  await openDataSpaceQuery(page);
});

test('build and run a query with projection columns, filter, and post-filter', async ({
  page,
}) => {
  const filterPanel = getFilterPanel(page);
  const resultPanel = getResultPanel(page);
  const projectionColumns = getProjectionColumns(page);

  // 1. drag every property from the explorer into the projection panel
  await project(page, COLUMNS);
  await expect(projectionColumns).toHaveCount(COLUMNS.length);

  // 2. run the query and check the result grid (the engine mock evaluates
  // the query against its data, see `MockExecution.ts`)
  await runQuery(page, captured);
  await expect(getGridRows(page)).toHaveCount(
    TEST_DATA__EXECUTION_RESULT_ROW_COUNT,
  );
  await expect(resultPanel.getByText('2021-04-01')).toBeVisible();
  await expect(resultPanel.getByText('2021-04-02')).toBeVisible();

  // 3. filter: `Case Type` is 'Confirmed'
  await addFilterCondition(page, 'Case Type');
  const filterCondition = page.getByTestId(
    'query__builder__filter__tree__condition__node-content',
  );
  await expect(filterCondition.getByText('Case Type')).toBeVisible();
  await setConditionValue(page, filterPanel, 'Confirmed');
  await expect(filterCondition.getByText('Confirmed')).toBeVisible();

  // 4. post-filter: `Cases` > 200
  await chooseAdvancedMenuItem(page, 'Show Post-Filter');
  const postFilterPanel = getPostFilterPanel(page);
  await expect(postFilterPanel).toBeVisible();

  await projectionColumns
    .getByText('Cases', { exact: true })
    .dragTo(postFilterPanel);
  const postFilterCondition = page.getByTestId(
    'query__builder__post__filter__tree__node-content',
  );
  await expect(postFilterCondition.getByText('Cases')).toBeVisible();

  // switch the operator from the default `is` to `>`
  await chooseConditionOperator(page, postFilterPanel, '>');
  await setConditionValue(page, postFilterPanel, '200');
  await expect(postFilterCondition.getByText('200')).toBeVisible();

  // 5. re-run with filter and post-filter in place: only the `Confirmed`
  // rows with more than 200 cases remain
  await runQuery(page, captured);
  await expect(getGridRows(page)).toHaveCount(4);
  await expect(resultPanel.getByText('Death')).toHaveCount(0);
  await expect(resultPanel.getByText('640', { exact: true })).toBeVisible();

  // 6. clean up in reverse: post-filter first (a projection column used by
  // the post-filter cannot be removed), then filter, then each column
  await postFilterPanel.getByTitle('Remove').click();
  await expect(
    postFilterPanel.getByText('Add a post-filter condition'),
  ).toBeVisible();

  await filterPanel.getByTitle('Remove').click();
  await expect(filterPanel.getByText('Add a filter condition')).toBeVisible();

  for (const column of COLUMNS) {
    await projectionColumns
      .filter({ has: page.getByText(column, { exact: true }) })
      .getByTitle('Remove')
      .click();
  }
  await expect(projectionColumns).toHaveCount(0);

  // 7. the emptied query is now invalid: the fetch-structure panel flags
  // 1 issue, whose hover tooltip explains the missing projection column
  const issueBadge = page
    .getByTestId('query__builder__fetch__structure')
    .locator('.query-builder-panel-issue-count-badge');
  await expect(issueBadge).toBeVisible();
  await expect(issueBadge).toHaveText('1 issue');
  await issueBadge.hover();
  await expect(issueBadge).toHaveAttribute(
    'title',
    'Found 1 issue:\n• Query has no projection columns',
  );
});
