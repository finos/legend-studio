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
  chooseConditionOperator,
  getExplorer,
  getFilterPanel,
  getProjectionPanel,
  setConditionValue,
} from '../support/QueryBuilderHelpers.js';
import {
  chooseGuideDataSpace,
  closeMenu,
  openSavedQuery,
} from './GuideHelpers.js';
import { setupGuideQuery } from './GuideSetup.js';
import {
  QUERY_GUIDE_IMAGES,
  markCallouts,
  saveRegion,
} from './UserGuideCallouts.js';

/** The query the page saves */
const QUERY_NAME = 'People over 40';

/**
 * Dialogs take most of the window: a smaller window leaves less of them
 * empty
 */
const DIALOG_VIEWPORT = { width: 1180, height: 640 };
const VIEWPORT = { width: 1440, height: 900 };

const getDialog = (page: Page, title: string): Locator =>
  page.getByRole('dialog').filter({ hasText: title });

test('saving, changing and loading a query', async ({ page }) => {
  const store = await setupGuideQuery(page);
  // a query opened before, which the query loader lists among those viewed
  await openSavedQuery(page, 'firm-headcount');
  await page.goto('');
  await chooseGuideDataSpace(page);
  for (const label of ['First Name', 'Last Name']) {
    await getExplorer(page)
      .getByText(label, { exact: true })
      .dragTo(getProjectionPanel(page));
  }
  await getExplorer(page)
    .getByText('Age', { exact: true })
    .dragTo(getFilterPanel(page));
  await chooseConditionOperator(page, getFilterPanel(page), '>');
  await setConditionValue(page, getFilterPanel(page), '40');

  // Save: a new query
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const createDialog = getDialog(page, 'Create New Query');
  await expect(createDialog).toBeVisible();
  await page.getByTitle('New Query Name').fill(QUERY_NAME);
  await page
    .getByTitle('Query Description')
    .fill('The people over 40, by name');
  await markCallouts(page, [
    { n: 1, targets: [page.getByTitle('New Query Name')], at: 'right' },
    { n: 2, targets: [page.getByTitle('Query Description')], at: 'right' },
    {
      n: 3,
      targets: [createDialog.getByRole('button', { name: 'Create Query' })],
      at: 'left',
    },
  ]);
  await saveRegion(page, `${QUERY_GUIDE_IMAGES}save-query.png`, [
    createDialog.locator('.modal').first(),
  ]);
  await createDialog.getByRole('button', { name: 'Create Query' }).click();
  await expect(page).toHaveURL(/\/edit\/[^/?]+$/u);
  const queryTitle = page.getByTitle('Double-click to rename query');
  await expect(queryTitle).toHaveText(QUERY_NAME, { timeout: 60_000 });
  const queryId = store.find(QUERY_NAME)?.id;
  if (!queryId) {
    throw new Error(`The query store has no query named '${QUERY_NAME}'`);
  }

  // the saved query, and what Help... has for it
  await page.getByRole('button', { name: 'Help...' }).click();
  const helpMenu = page.locator('.MuiPaper-root', {
    hasText: 'About Query Info',
  });
  await expect(helpMenu).toBeVisible();
  await markCallouts(page, [
    { n: 1, targets: [queryTitle], at: 'right' },
    {
      n: 2,
      targets: [
        page.locator('.query-editor__header__action-combo__main-btn'),
        page.getByTitle('query__editor__save-dropdown'),
      ],
      at: 'below',
    },
    {
      n: 3,
      targets: [
        helpMenu.locator('.menu__item', { hasText: 'About Query Info' }),
        helpMenu.locator('.menu__item', { hasText: 'Go to Project' }),
      ],
      at: 'left',
    },
  ]);
  await saveRegion(page, `${QUERY_GUIDE_IMAGES}saved-query.png`, [
    page.locator('.query-editor__logo-header'),
    helpMenu,
  ]);

  // About Query Info
  await page.getByText('About Query Info').click();
  const infoDialog = getDialog(page, 'Query Info');
  await expect(infoDialog).toBeVisible();
  const field = (label: string): Locator =>
    infoDialog.locator('.query-preview__field').filter({
      has: page.locator('.query-preview__field__label', {
        hasText: new RegExp(`^${label}$`, 'u'),
      }),
    });
  await markCallouts(page, [
    { n: 1, targets: [field('Project')], at: 'left' },
    { n: 2, targets: [field('Data Product')], at: 'left' },
    { n: 3, targets: [field('Version')], at: 'left' },
    { n: 4, targets: [field('Owner')], at: 'left' },
    {
      n: 5,
      targets: [infoDialog.getByRole('button', { name: 'Update' })],
      at: 'left',
    },
  ]);
  await saveRegion(page, `${QUERY_GUIDE_IMAGES}query-info.png`, [
    infoDialog.locator('.modal').first(),
  ]);
  await infoDialog.getByRole('button', { name: 'Close' }).click();
  await expect(infoDialog).toBeHidden();

  // a change, saved over the query
  await setConditionValue(page, getFilterPanel(page), '45');
  await page.setViewportSize(DIALOG_VIEWPORT);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const saveDialog = getDialog(page, 'Save Existing Query');
  await expect(saveDialog.getByText('45').first()).toBeVisible();
  // the query as saved, and with the change
  const diff = saveDialog.locator('.monaco-diff-editor');
  await markCallouts(page, [
    {
      n: 1,
      targets: [diff.locator('.editor.original')],
      at: 'inside-bottom-right',
    },
    {
      n: 2,
      targets: [diff.locator('.editor.modified')],
      at: 'inside-bottom-right',
    },
    {
      n: 3,
      targets: [saveDialog.getByRole('button', { name: 'Save', exact: true })],
      at: 'left',
    },
  ]);
  await saveRegion(page, `${QUERY_GUIDE_IMAGES}save-existing-query.png`, [
    saveDialog.locator('.modal').first(),
  ]);
  await saveDialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Successfully updated query!')).toBeVisible();

  // its history, as it shows when the query is opened again
  await openSavedQuery(page, queryId);
  await page.getByRole('button', { name: 'Help...' }).click();
  await page.getByText('Query History').click();
  const historyDialog = getDialog(page, 'Query History');
  await expect(historyDialog.getByText('Revision 1')).toBeVisible();
  const revisions = historyDialog.locator('.query-loader__result');
  await markCallouts(page, [
    { n: 1, targets: [revisions.first()], at: 'above' },
    {
      n: 2,
      targets: [historyDialog.getByRole('button', { name: 'Revert' })],
      at: 'below',
    },
    {
      n: 3,
      targets: [
        historyDialog.locator('input[type="checkbox"]').first(),
        historyDialog.locator('input[type="checkbox"]').last(),
      ],
      at: 'left',
    },
    {
      n: 4,
      targets: [historyDialog.getByRole('button', { name: 'Compare' })],
      at: 'below',
    },
  ]);
  // the list ends well above the dialog's bottom
  await saveRegion(page, `${QUERY_GUIDE_IMAGES}query-history.png`, [
    historyDialog.getByText('Query History', { exact: true }),
    historyDialog.getByRole('button', { name: 'Compare' }),
    revisions.last(),
  ]);
  await historyDialog.getByTitle('Close').click();
  await expect(historyDialog).toBeHidden();

  // Load Query
  await page.getByRole('button', { name: 'Load Query' }).click();
  const loadDialog = getDialog(page, 'Select a Query to Load');
  await expect(loadDialog.getByText(/recently viewed quer/u)).toBeVisible();
  await markCallouts(page, [
    {
      n: 1,
      targets: [
        loadDialog.getByPlaceholder('Search for queries by name or ID'),
      ],
      at: 'right',
    },
    {
      n: 2,
      targets: [
        loadDialog.getByRole('button', { name: 'Mine Only' }),
        loadDialog.getByRole('button', { name: 'Curated Template Query' }),
      ],
      at: 'below',
    },
    {
      n: 3,
      targets: [
        loadDialog.getByText(/recently viewed quer/u),
        loadDialog.locator('.query-loader__result').last(),
      ],
      at: 'left',
    },
  ]);
  // the list ends well above the dialog's bottom
  await saveRegion(page, `${QUERY_GUIDE_IMAGES}load-query.png`, [
    loadDialog.getByText('Select a Query to Load'),
    loadDialog.getByTitle('Close'),
    loadDialog.locator('.query-loader__result').last(),
  ]);
  await page.setViewportSize(VIEWPORT);
  await closeMenu(page).catch(() => undefined);
});
