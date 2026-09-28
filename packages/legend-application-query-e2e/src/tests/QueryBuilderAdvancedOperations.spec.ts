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
import {
  addFilterCondition,
  chooseAdvancedMenuItem,
  chooseAggregateOperator,
  getFilterPanel,
  getProjectionColumns,
  openDataSpaceQuery,
  openQueryOptions,
  project,
} from '../support/QueryBuilderHelpers.js';

test.beforeEach(async ({ page }) => {
  await setupEngineMock(page);
  await openDataSpaceQuery(page);
});

test('filter conditions can be grouped and the group operator switched', async ({
  page,
}) => {
  // dropping two properties into the filter panel nests them under a group
  await addFilterCondition(page, 'Case Type');
  await addFilterCondition(page, 'Fips');

  const conditions = page.getByTestId(
    'query__builder__filter__tree__condition__node-content',
  );
  await expect(conditions).toHaveCount(2);

  // the group node defaults to `and`, and clicking it toggles to `or`
  const groupNode = getFilterPanel(page).locator(
    '.query-builder-filter-tree__group-node__label',
  );
  await expect(groupNode).toHaveText('and');
  await groupNode.click();
  await expect(groupNode).toHaveText('or');
  await groupNode.click();
  await expect(groupNode).toHaveText('and');
});

test('an aggregate operator can be applied to a projection column', async ({
  page,
}) => {
  // project two columns: one to group by, one to aggregate
  await project(page, ['Case Type', 'Cases']);
  await expect(getProjectionColumns(page)).toHaveCount(2);

  // apply `sum` to the `Cases` column (`Case Type` does not contain the
  // substring `Cases`, so this filter is unambiguous)
  const casesColumn = getProjectionColumns(page).filter({ hasText: 'Cases' });
  await chooseAggregateOperator(page, casesColumn, 'sum');

  // the operator badge is shown and the column is renamed to reflect it
  await expect(
    casesColumn.locator(
      '.query-builder__projection__column__aggregate__operator__label',
    ),
  ).toHaveText('sum');
  await expect(casesColumn.getByText('Cases (sum)')).toBeVisible();
});

test('a window function column can be created', async ({ page }) => {
  // a window function operates on projection columns, so project one first
  await project(page, ['Cases']);

  // enable the window function panel from the advanced menu
  await chooseAdvancedMenuItem(page, 'Show Window Function(s)');
  const windowPanel = page.getByTestId('query__builder__window');
  await expect(windowPanel).toBeVisible();

  // create a window function column through the modal
  await windowPanel
    .getByRole('button', { name: 'Create Window Function Column' })
    .click();
  const windowModal = page.getByRole('dialog');
  await expect(windowModal.getByText('Window Operator')).toBeVisible();
  await windowModal
    .getByRole('button', { name: 'Create', exact: true })
    .click();

  // the panel now holds one window function column
  await expect(
    windowPanel.locator('.query-builder__olap__column__operation'),
  ).toHaveCount(1);
});

test('query options can be configured', async ({ page }) => {
  await project(page, ['Cases']);

  // the toolbar prompt starts in its unset state
  const optionsPrompt = page.getByTestId(
    'query-builder__tds__result-modifier-prompt',
  );
  await expect(optionsPrompt.getByText('Set Query Options')).toBeVisible();

  // set a row limit and apply
  const optionsModal = await openQueryOptions(page);
  await optionsModal
    .getByRole('textbox', { name: 'Limit Results' })
    .fill('100');
  await optionsModal.getByRole('button', { name: 'Apply' }).click();

  // the prompt reflects that options are now set
  await expect(optionsPrompt.getByText('Query Options')).toBeVisible();
  await expect(optionsPrompt.getByText('Set Query Options')).toBeHidden();
});
