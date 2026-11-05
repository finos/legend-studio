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
import { getExplorer } from '../support/StudioHelpers.js';
import { openGuideWorkspace } from './GuideSetup.js';
import {
  markCallouts,
  saveRegion,
  STUDIO_GUIDE_IMAGES,
} from './UserGuideCallouts.js';

const button = (scope: Page | Locator, name: string): Locator =>
  scope.getByRole('button', { name, exact: true });

/**
 * Builds the query the guide shows, as a reader would: the people over 40,
 * with their first and last names and their employer's name, then runs it.
 * Returns the query builder.
 */
const buildGuideQuery = async (page: Page): Promise<Locator> => {
  await openGuideWorkspace(page);
  for (const node of ['guide', 'model']) {
    await getExplorer(page).getByText(node, { exact: true }).click();
  }
  await getExplorer(page)
    .getByText('Person', { exact: true })
    .click({ button: 'right' });
  await button(page, 'Query...').click();
  const queryBuilder = page.getByTestId('query__builder');
  const explorer = queryBuilder.getByTestId('query__builder__explorer');
  const property = (name: string): Locator =>
    explorer.getByText(name, { exact: true });
  const columns = queryBuilder.getByTestId('query__builder__tds__projection');
  await property('First Name').dragTo(columns);
  await property('Last Name').dragTo(columns);
  // a class node opens on a click, to show the properties of the class
  await property('Employer').click();
  await property('Legal Name').dragTo(columns);
  await expect(
    columns.getByText('Employer/Legal Name', { exact: true }),
  ).toBeVisible();
  await property('Age').dragTo(
    queryBuilder.getByText('Add a filter condition'),
  );
  const filter = queryBuilder.getByTestId('query__builder__filter__panel');
  await button(filter, 'is').click();
  await page
    .getByRole('menu')
    .getByRole('button', { name: '>', exact: true })
    .click();
  await filter.getByText('""', { exact: true }).click();
  await page.keyboard.type('40');
  await page.keyboard.press('Enter');
  await button(queryBuilder, 'Run Query').click();
  await expect(
    queryBuilder
      .getByTestId('QUERY_BUILDER_RESULT_VALUES_TDS')
      .getByText('Dijkstra', { exact: true }),
  ).toBeVisible({ timeout: 60_000 });
  return queryBuilder;
};

test('the query builder', async ({ page }) => {
  const queryBuilder = await buildGuideQuery(page);
  const dialog = page.getByRole('dialog');
  // the pointer away from the controls, so none shows its hover
  await page.mouse.move(700, 470);
  await markCallouts(page, [
    {
      n: 1,
      targets: [queryBuilder.getByTestId('query__builder__setup')],
      at: 'inside-right',
    },
    {
      n: 2,
      targets: [queryBuilder.getByTestId('query__builder__explorer')],
      at: 'inside-bottom-right',
    },
    {
      n: 3,
      targets: [queryBuilder.getByTestId('query__builder__fetch__structure')],
      at: 'inside-bottom-right',
    },
    {
      n: 4,
      targets: [queryBuilder.getByTestId('query__builder__filter__panel')],
      at: 'inside-bottom-right',
    },
    {
      n: 5,
      targets: [
        button(queryBuilder, 'Executed SQL'),
        queryBuilder.getByTestId('query__builder__result__analytics'),
      ],
      at: 'right',
    },
    {
      n: 6,
      targets: [
        queryBuilder.getByText('preview row limit', { exact: true }),
        button(queryBuilder, 'Run Query'),
        button(queryBuilder, 'Export'),
      ],
      at: 'left',
    },
    {
      n: 7,
      targets: [queryBuilder.getByTestId('QUERY_BUILDER_RESULT_VALUES_TDS')],
      at: 'inside-bottom-right',
    },
    { n: 8, targets: [button(dialog, 'Save As...')], at: 'left' },
    {
      n: 9,
      targets: [button(dialog, 'Undo'), button(dialog, 'Help...')],
      at: 'left',
    },
  ]);
  await saveRegion(
    page,
    `${STUDIO_GUIDE_IMAGES}query-builder.png`,
    [dialog],
    0,
  );
});

// The dialogs below take 80% of the window: a smaller window leaves less of
// them empty below the text

test('the query in the Legend language', async ({ page }) => {
  await buildGuideQuery(page);
  await page.setViewportSize({ width: 1000, height: 600 });
  await button(page.getByRole('dialog'), 'Advanced').click();
  await page.getByRole('menu').getByText('Edit Pure', { exact: true }).click();
  const textEditor = page
    .getByRole('dialog')
    .filter({ hasText: 'Edit Pure Query' });
  await textEditor.getByText("'Employer/Legal Name'").waitFor();
  // the focus out of the text, so its cursor doesn't show
  await textEditor.getByText('Edit Pure Query', { exact: true }).click();
  await saveRegion(
    page,
    `${STUDIO_GUIDE_IMAGES}query-pure.png`,
    [textEditor],
    0,
  );
});

test('the SQL the engine ran', async ({ page }) => {
  const queryBuilder = await buildGuideQuery(page);
  await page.setViewportSize({ width: 1000, height: 600 });
  await button(queryBuilder, 'Executed SQL').click();
  const sql = page
    .getByRole('dialog')
    .filter({ hasText: 'Executed SQL Query' });
  await sql.getByText('PERSON', { exact: true }).waitFor();
  await saveRegion(page, `${STUDIO_GUIDE_IMAGES}query-sql.png`, [sql], 0);
});
