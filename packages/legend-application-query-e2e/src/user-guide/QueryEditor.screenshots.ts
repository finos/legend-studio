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

import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  chooseAdvancedMenuItem,
  chooseConditionOperator,
  getExplorer,
  getFilterPanel,
  getPostFilterPanel,
  getProjectionColumns,
  getProjectionPanel,
  getResultPanel,
  setConditionValue,
} from '../support/QueryBuilderHelpers.js';
import { openGuideDataSpace } from './GuideHelpers.js';
import {
  QUERY_GUIDE_IMAGES,
  markCallouts,
  saveRegion,
} from './UserGuideCallouts.js';

const getParametersPanel = (page: Page): Locator =>
  page.getByTestId('query-builder__parameters');

/** Drags properties of the explorer, by their labels, to the columns */
const addColumns = async (page: Page, labels: string[]): Promise<void> => {
  for (const label of labels) {
    await getExplorer(page)
      .getByText(label, { exact: true })
      .dragTo(getProjectionPanel(page));
    await expect(
      getProjectionColumns(page).getByText(label, { exact: true }),
    ).toBeVisible();
  }
};

/**
 * The query the page builds: the people over 40, their names and the legal
 * name of the firm that employs them
 */
const buildPeopleOver40 = async (page: Page): Promise<void> => {
  await openGuideDataSpace(page);
  await addColumns(page, ['First Name', 'Last Name']);
  await getExplorer(page).getByText('Employer', { exact: true }).click();
  await getExplorer(page)
    .getByText('Legal Name', { exact: true })
    .dragTo(getProjectionPanel(page));
  await getExplorer(page)
    .getByText('Age', { exact: true })
    .dragTo(getFilterPanel(page));
  await chooseConditionOperator(page, getFilterPanel(page), '>');
  await setConditionValue(page, getFilterPanel(page), '40');
};

/** Runs the query, once its values are set, and waits for its results */
const runQuery = async (page: Page): Promise<void> => {
  await getResultPanel(page).getByText('Run Query', { exact: true }).click();
  await expect(getResultPanel(page).getByText(/row\(s\) in/u)).toBeVisible();
};

test('the query editor', async ({ page }) => {
  await buildPeopleOver40(page);
  await runQuery(page);

  const actions = page.getByTestId('query__builder__actions');
  await markCallouts(page, [
    { n: 1, targets: [page.getByText('Unsaved Query')], at: 'right' },
    {
      n: 2,
      targets: [
        page.getByRole('button', { name: 'Undo' }),
        page.getByRole('button', { name: 'Save', exact: true }),
      ],
      at: 'below',
    },
    {
      n: 3,
      targets: [
        actions.getByRole('button', { name: 'Advanced' }),
        page.getByRole('button', { name: 'Help...' }),
      ],
      at: 'below',
    },
    {
      n: 4,
      targets: [
        page.getByTitle('Open Legend AI Agent Chat'),
        page.getByTitle('Toggle light/dark mode'),
      ],
      at: 'left',
    },
    {
      n: 5,
      targets: [page.locator('.query-builder__setup__config-group')],
      at: 'inside-bottom-right',
    },
    {
      n: 6,
      targets: [page.getByTestId('query__builder__explorer')],
      at: 'inside-bottom-right',
    },
    {
      n: 7,
      targets: [page.getByTestId('query__builder__fetch__structure')],
      at: 'inside-bottom-right',
    },
    { n: 8, targets: [getFilterPanel(page)], at: 'inside-bottom-right' },
    {
      n: 9,
      targets: [getResultPanel(page)],
      at: 'inside-bottom-right',
    },
  ]);
  await page.screenshot({ path: `${QUERY_GUIDE_IMAGES}query-editor.png` });
});

test("a query's results", async ({ page }) => {
  await buildPeopleOver40(page);
  await runQuery(page);
  const results = getResultPanel(page);
  await results
    .locator('.ag-center-cols-container .ag-cell')
    .first()
    .click({ button: 'right' });
  // the grid's menu, outside the panel
  const cellMenu = page.locator('.ag-menu');
  await expect(cellMenu.getByText('Filter By')).toBeVisible();

  await markCallouts(page, [
    { n: 1, targets: [results.getByTitle('Executed SQL')], at: 'below' },
    {
      n: 2,
      targets: [results.getByText(/row\(s\) in/u)],
      at: 'right',
    },
    {
      n: 3,
      targets: [
        results.getByText('preview row limit'),
        results.locator('input').first(),
      ],
      at: 'above',
    },
    {
      n: 4,
      targets: [results.locator('.query-builder__result__execute-btn')],
      at: 'above',
    },
    { n: 5, targets: [results.getByTitle('Export')], at: 'above' },
    { n: 6, targets: [cellMenu], at: 'right' },
  ]);
  await saveRegion(page, `${QUERY_GUIDE_IMAGES}query-results.png`, [results]);
});

test('an aggregation, and a post-filter on it', async ({ page }) => {
  // a template, which counts each firm's employees: loaded before the query
  // changes, so it doesn't ask to replace it
  await openGuideDataSpace(page, undefined);
  await page
    .locator('.query-builder__data-space__template-query')
    .getByRole('button', { name: /Templates/u })
    .click();
  await page
    .locator('.query-builder__data-space__template-query-panel__query__entry', {
      hasText: 'Headcount by firm',
    })
    .click();
  await expect(
    getProjectionColumns(page).getByText('Employees', { exact: true }),
  ).toBeVisible();

  await chooseAdvancedMenuItem(page, 'Show Post-Filter');
  const postFilter = getPostFilterPanel(page);
  await getProjectionColumns(page)
    .getByText('Employees', { exact: true })
    .dragTo(postFilter);
  await chooseConditionOperator(page, postFilter, '>');
  await setConditionValue(page, postFilter, '2');
  await runQuery(page);

  const employees = getProjectionColumns(page).filter({
    hasText: 'Employees',
  });
  const lastResultRow = getResultPanel(page)
    .locator('.ag-center-cols-container .ag-row')
    .last();
  await markCallouts(page, [
    {
      n: 1,
      targets: [
        employees.getByTitle('Choose Aggregate Operator...'),
        employees.locator('[class*="aggregate"]').first(),
      ],
      at: 'left',
    },
    {
      n: 2,
      targets: [
        postFilter.getByTestId(
          'query__builder__post__filter__tree__node-content',
        ),
      ],
      at: 'below',
    },
    {
      n: 3,
      targets: [getResultPanel(page).locator('.ag-header'), lastResultRow],
      at: 'inside-right',
    },
  ]);
  // down to the results' last row: the grid is empty below it
  await saveRegion(
    page,
    `${QUERY_GUIDE_IMAGES}query-post-filter.png`,
    [
      page.getByTestId('query__builder__fetch__structure'),
      postFilter,
      lastResultRow,
    ],
    24,
  );
});

test('a parameter, and its value when the query runs', async ({ page }) => {
  await openGuideDataSpace(page);
  await addColumns(page, ['First Name', 'Last Name', 'Age']);
  await getExplorer(page)
    .getByText('Age', { exact: true })
    .dragTo(getFilterPanel(page));
  await chooseConditionOperator(page, getFilterPanel(page), '>');

  // a parameter, `minAge`, for the filter's value
  await chooseAdvancedMenuItem(page, 'Show Parameter(s)');
  await chooseAdvancedMenuItem(page, 'Show Constant(s)');
  await getParametersPanel(page).getByTitle('Add Parameter').click();
  const createDialog = page.getByRole('dialog');
  await expect(createDialog.getByText('Create Parameter')).toBeVisible();
  await createDialog.getByRole('textbox').first().fill('minAge');
  await createDialog.getByRole('combobox').first().fill('Integer');
  await page.keyboard.press('Enter');
  await expect(createDialog).toContainText('Integer');
  await createDialog.getByRole('button', { name: 'Create' }).click();
  await expect(createDialog).toBeHidden();
  await getParametersPanel(page)
    .getByText('minAge')
    .dragTo(
      page.getByTestId('query-builder-filter-tree__condition-node__value'),
    );
  await expect(getFilterPanel(page).getByText('minAge')).toBeVisible();

  await markCallouts(page, [
    {
      n: 1,
      targets: [getParametersPanel(page)],
      at: 'inside-bottom-right',
    },
    {
      n: 2,
      targets: [page.getByTestId('query-builder__constants')],
      at: 'inside-bottom-right',
    },
    {
      n: 3,
      targets: [
        page.getByTestId('query-builder-filter-tree__condition-node__value'),
      ],
      at: 'right',
    },
  ]);
  // the panels above the results, which are empty until the query runs
  await saveRegion(page, `${QUERY_GUIDE_IMAGES}query-parameters.png`, [
    page.locator('.query-builder__setup__config-group'),
    getFilterPanel(page),
    page.getByTestId('query-builder__constants'),
  ]);

  // running the query asks for the parameter's value, in a dialog as tall as
  // most of the window: a smaller window leaves less of it empty
  await page.setViewportSize({ width: 1000, height: 520 });
  await getResultPanel(page).getByText('Run Query', { exact: true }).click();
  const valuesDialog = page
    .getByRole('dialog')
    .filter({ hasText: 'Set Parameter Values' });
  await expect(valuesDialog).toBeVisible();
  await valuesDialog.locator('input').first().fill('40');
  await markCallouts(page, [
    {
      n: 1,
      targets: [valuesDialog.locator('input').first()],
      at: 'right',
    },
    {
      n: 2,
      targets: [valuesDialog.getByRole('button', { name: 'Run', exact: true })],
      at: 'left',
    },
  ]);
  await saveRegion(page, `${QUERY_GUIDE_IMAGES}query-parameter-values.png`, [
    valuesDialog.locator('.modal').first(),
  ]);
});
