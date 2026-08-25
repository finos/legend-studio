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

test.beforeEach(async ({ page }) => {
  await setupEngineMock(page);
  await page.goto(TEST_DATA_SPACE_QUERY_URL);
  await expect(
    page
      .getByTestId('query__builder__explorer')
      .getByText('Cases', { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
});

test('filter conditions can be grouped and the group operator switched', async ({
  page,
}) => {
  const explorer = page.getByTestId('query__builder__explorer');
  const filterPanel = page.getByTestId('query__builder__filter__panel');

  // dropping two properties into the filter panel nests them under a group
  await explorer.getByText('Case Type', { exact: true }).dragTo(filterPanel);
  await explorer.getByText('Fips', { exact: true }).dragTo(filterPanel);

  const conditions = page.getByTestId(
    'query__builder__filter__tree__condition__node-content',
  );
  await expect(conditions).toHaveCount(2);

  // the group node defaults to `and`, and clicking it toggles to `or`
  const groupNode = filterPanel.locator(
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
  const explorer = page.getByTestId('query__builder__explorer');
  const projectionPanel = page.getByTestId('query__builder__tds__projection');
  const projectionColumns = page.getByTestId(
    'QUERY_BUILDER_TDS_PROJECTION_COLUMN',
  );

  // project two columns: one to group by, one to aggregate
  await explorer
    .getByText('Case Type', { exact: true })
    .dragTo(projectionPanel);
  await explorer.getByText('Cases', { exact: true }).dragTo(projectionPanel);
  await expect(projectionColumns).toHaveCount(2);

  // apply `sum` to the `Cases` column (`Case Type` does not contain the
  // substring `Cases`, so this filter is unambiguous)
  const casesColumn = projectionColumns.filter({ hasText: 'Cases' });
  await casesColumn.getByTitle('Choose Aggregate Operator...').click();
  await page
    .locator(
      '.query-builder__projection__column__aggregate__operator__dropdown__option',
      { hasText: /^sum$/ },
    )
    .click();

  // the operator badge is shown and the column is renamed to reflect it
  await expect(
    casesColumn.locator(
      '.query-builder__projection__column__aggregate__operator__label',
    ),
  ).toHaveText('sum');
  await expect(casesColumn.getByText('Cases (sum)')).toBeVisible();
});

test('a window function column can be created', async ({ page }) => {
  const projectionPanel = page.getByTestId('query__builder__tds__projection');
  const explorer = page.getByTestId('query__builder__explorer');

  // a window function operates on projection columns, so project one first
  await explorer.getByText('Cases', { exact: true }).dragTo(projectionPanel);

  // enable the window function panel from the advanced menu
  await page
    .getByTestId('query__builder__actions')
    .getByRole('button', { name: 'Advanced' })
    .click();
  await page.getByText('Show Window Function(s)').click();
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
  const explorer = page.getByTestId('query__builder__explorer');
  const projectionPanel = page.getByTestId('query__builder__tds__projection');

  await explorer.getByText('Cases', { exact: true }).dragTo(projectionPanel);

  // the toolbar prompt starts in its unset state
  const optionsPrompt = page.getByTestId(
    'query-builder__tds__result-modifier-prompt',
  );
  await expect(optionsPrompt.getByText('Set Query Options')).toBeVisible();

  // open the query options modal from the projection panel toolbar
  await page.getByTitle('Configure Query Options...').click();
  const optionsModal = page.getByRole('dialog');
  await expect(optionsModal.getByText('Query Options')).toBeVisible();

  // set a row limit and apply
  await optionsModal
    .getByRole('textbox', { name: 'Limit Results' })
    .fill('100');
  await optionsModal.getByRole('button', { name: 'Apply' }).click();

  // the prompt reflects that options are now set
  await expect(optionsPrompt.getByText('Query Options')).toBeVisible();
  await expect(optionsPrompt.getByText('Set Query Options')).toBeHidden();
});
