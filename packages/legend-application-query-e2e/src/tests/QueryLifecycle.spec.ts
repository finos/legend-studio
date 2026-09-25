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

import { test, expect, type Locator, type Page } from '@playwright/test';
import {
  setupEngineMock,
  type CapturedEngineRequests,
} from '../support/EngineMock.js';

// Deep-link straight into the query builder for the mock data space served
// by the mock depot server (see `@finos/legend-fixture-mock-server`)
const TEST_DATA_SPACE_QUERY_URL =
  'extensions/dataspace/org.finos.legend.test:legend-query-test:0.0.1/test::DataSpace/dummyContext';

// the fixture query the engine mock always knows about, owned by the current
// user (see `TEST_DATA__LightQueries`)
const FIXTURE_QUERY_NAME = 'MockTestQuery';

let captured: CapturedEngineRequests;

const getProjectionColumns = (page: Page): Locator =>
  page.getByTestId('QUERY_BUILDER_TDS_PROJECTION_COLUMN');

/** The saved query's name, as shown in the editor header. */
const getQueryTitle = (page: Page): Locator =>
  page.getByTitle('Double-click to rename query');

const addProjectionColumn = async (
  page: Page,
  property: string,
): Promise<void> => {
  await page
    .getByTestId('query__builder__explorer')
    .getByText(property, { exact: true })
    .dragTo(page.getByTestId('query__builder__tds__projection'));
  await expect(
    getProjectionColumns(page).getByText(property, { exact: true }),
  ).toBeVisible();
};

/**
 * Fill in and submit the `Create New Query` dialog, then wait for the app to
 * land on the persisted query's edit route. Returns the new query's id.
 */
const submitCreateQueryDialog = async (
  page: Page,
  name: string,
): Promise<string> => {
  const previousUrl = page.url();
  await expect(page.getByText('Create New Query')).toBeVisible();
  await page.getByTitle('New Query Name').fill(name);
  await page.getByRole('button', { name: 'Create Query' }).click();

  // on success the app reloads into the new query's edit route
  await expect(page).not.toHaveURL(previousUrl);
  await expect(page).toHaveURL(/\/edit\/[^/?]+/);
  await expect(getQueryTitle(page)).toHaveText(name, { timeout: 30_000 });
  const queryId = new URL(page.url()).pathname.split('/edit/')[1];
  if (!queryId) {
    throw new Error(`No query id in the edit route: ${page.url()}`);
  }
  return decodeURIComponent(queryId);
};

/** Save the query being built as a new query named `name`. */
const createQuery = async (page: Page, name: string): Promise<string> => {
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  return submitCreateQueryDialog(page, name);
};

/** Overwrite the open (already saved) query with the current changes. */
const saveExistingQuery = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const saveDialog = page
    .getByRole('dialog')
    .filter({ hasText: 'Save Existing Query' });
  await expect(saveDialog).toBeVisible();
  await saveDialog.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Successfully updated query!')).toBeVisible();
  await expect(saveDialog).toBeHidden();
};

/** Open the version history of the open query from the `Help...` menu. */
const openQueryHistory = async (page: Page): Promise<Locator> => {
  await page.getByTitle('See more options').click();
  await page.getByRole('button', { name: 'Query History' }).click();
  const historyDialog = page
    .getByRole('dialog')
    .filter({ hasText: 'Query History' });
  await expect(historyDialog.getByText('Latest revision')).toBeVisible();
  return historyDialog;
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

test('saving an existing query overwrites it in place', async ({ page }) => {
  await addProjectionColumn(page, 'Cases');
  const queryId = await createQuery(page, 'Lifecycle Updated Query');

  await addProjectionColumn(page, 'Case Type');
  await saveExistingQuery(page);

  // the same query is updated, rather than a new one being created
  expect(captured.updatedQueries.map((query) => query.id)).toEqual([queryId]);
  await expect(page).toHaveURL(new RegExp(`/edit/${queryId}`));

  // the change is persisted: a full reload rebuilds it from the backend
  await page.reload();
  await expect(
    getProjectionColumns(page).getByText('Case Type', { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(getProjectionColumns(page)).toHaveCount(2);
});

test('save as creates a new query and leaves the original untouched', async ({
  page,
}) => {
  await addProjectionColumn(page, 'Cases');
  const originalId = await createQuery(page, 'Lifecycle Original Query');

  await addProjectionColumn(page, 'Case Type');
  await page.getByTitle('query__editor__save-dropdown').click();
  await page.getByRole('button', { name: 'Save As New Query' }).click();
  const copyId = await submitCreateQueryDialog(page, 'Lifecycle Copied Query');

  expect(copyId).not.toEqual(originalId);
  expect(captured.updatedQueries).toHaveLength(0);
  await expect(getProjectionColumns(page)).toHaveCount(2, { timeout: 30_000 });

  // the original keeps the content it was saved with
  await page.goto(`edit/${originalId}`);
  await expect(getQueryTitle(page)).toHaveText('Lifecycle Original Query', {
    timeout: 30_000,
  });
  await expect(
    getProjectionColumns(page).getByText('Cases', { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(getProjectionColumns(page)).toHaveCount(1);
});

test('a query can be renamed from the editor header', async ({ page }) => {
  await addProjectionColumn(page, 'Cases');
  const queryId = await createQuery(page, 'Lifecycle Unnamed Query');

  await getQueryTitle(page).getByRole('button').click();
  const renameDialog = page
    .getByRole('dialog')
    .filter({ hasText: 'Rename Query' });
  await renameDialog
    .getByRole('textbox', { name: 'Query Name' })
    .fill('Lifecycle Renamed Query');
  await renameDialog.getByRole('button', { name: 'Update Query' }).click();

  await expect(page.getByText('Successfully updated query!')).toBeVisible();
  await expect(getQueryTitle(page)).toHaveText('Lifecycle Renamed Query');
  expect(captured.updatedQueries.at(-1)).toMatchObject({
    id: queryId,
    name: 'Lifecycle Renamed Query',
  });

  await page.reload();
  await expect(getQueryTitle(page)).toHaveText('Lifecycle Renamed Query', {
    timeout: 30_000,
  });
});

test('a name already used by one of your queries cannot be reused', async ({
  page,
}) => {
  await addProjectionColumn(page, 'Cases');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  const nameInput = page.getByTitle('New Query Name');
  const createButton = page.getByRole('button', { name: 'Create Query' });

  await nameInput.fill(FIXTURE_QUERY_NAME);
  await expect(
    page.getByTitle(`Query named '${FIXTURE_QUERY_NAME}' already exists`),
  ).toBeVisible();
  await expect(createButton).toBeDisabled();

  // a name that is not taken can be used
  await nameInput.fill(`${FIXTURE_QUERY_NAME} Copy`);
  await expect(createButton).toBeEnabled();
});

test('a deleted query disappears from the query loader', async ({ page }) => {
  await addProjectionColumn(page, 'Cases');
  const queryId = await createQuery(page, 'Lifecycle Doomed Query');

  await page.getByRole('button', { name: 'Load Query' }).click();
  const loaderDialog = page
    .getByRole('dialog')
    .filter({ hasText: 'Select a Query to Load' });
  await loaderDialog
    .getByPlaceholder('Search for queries by name or ID')
    .fill('Lifecycle Doomed');
  const result = loaderDialog.locator('.query-loader__result', {
    hasText: 'Lifecycle Doomed Query',
  });
  await expect(result).toBeVisible();

  await result.getByTitle('More Actions...').click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();

  await expect(page.getByText('Deleted query successfully')).toBeVisible();
  expect(captured.deletedQueryIds).toEqual([queryId]);
  // the list is refreshed without it
  await expect(result).toHaveCount(0);
});

test('opening a query that no longer exists shows the engine error', async ({
  page,
}) => {
  // KNOWN BUG: when the saved query can't be fetched, the editor still renders
  // `QueryEditorExistingQueryVersionRevertModal` (meant for queries
  // incompatible with their project version), which reads the never-loaded
  // `ExistingQueryEditorStore.lightQuery` and crashes the page with
  // "Query has not been loaded" instead of surfacing the engine's error.
  // Remove this annotation once fixed — the test will then report as
  // unexpectedly passing.
  test.fail();

  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  const missingQueryId = 'e2e-deleted-query-id';

  await page.goto(`edit/${missingQueryId}`);
  await expect(
    page.getByText(`Can't find query with ID '${missingQueryId}'`),
  ).toBeVisible({ timeout: 30_000 });
  expect(pageErrors).toEqual([]);
});

test('an earlier revision can be opened from the query history without changing the query', async ({
  page,
}) => {
  await addProjectionColumn(page, 'Cases');
  const queryId = await createQuery(page, 'Lifecycle Revisions Query');
  await addProjectionColumn(page, 'Case Type');
  await saveExistingQuery(page);

  const historyDialog = await openQueryHistory(page);
  await historyDialog
    .locator('.query-loader__result', { hasText: 'Revision 1' })
    .getByTitle('Load this revision')
    .first()
    .click();

  // the revision is loaded as it was before the update
  await expect(page).toHaveURL(new RegExp(`/edit/${queryId}.*revisionId=1`));
  await expect(
    getProjectionColumns(page).getByText('Cases', { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(getProjectionColumns(page)).toHaveCount(1);

  // viewing a revision writes nothing back
  expect(captured.updatedQueries).toHaveLength(1);
});

test('reverting to an earlier revision saves it as the latest version', async ({
  page,
}) => {
  await addProjectionColumn(page, 'Cases');
  const queryId = await createQuery(page, 'Lifecycle Reverted Query');
  await addProjectionColumn(page, 'Case Type');
  await saveExistingQuery(page);

  const historyDialog = await openQueryHistory(page);
  await historyDialog
    .locator('.query-loader__result', { hasText: 'Revision 1' })
    .getByRole('button', { name: 'Revert' })
    .click();
  // the revert must be confirmed
  await page
    .getByRole('dialog')
    .filter({ hasText: 'Revert this query to "Revision 1"?' })
    .getByRole('button', { name: 'Revert' })
    .click();

  // the reverted content is written back as a new update of the same query
  // (the success toast can't be asserted on: the editor reloads right away)
  await expect
    .poll(() => captured.updatedQueries.map((query) => query.id))
    .toEqual([queryId, queryId]);

  // and the editor reloads the query's (now reverted) latest version
  await expect(page).toHaveURL(new RegExp(`/edit/${queryId}$`));
  await expect(
    getProjectionColumns(page).getByText('Cases', { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(getProjectionColumns(page)).toHaveCount(1);
});

test('leaving a query with unsaved changes asks for confirmation', async ({
  page,
}) => {
  await addProjectionColumn(page, 'Cases');
  const queryId = await createQuery(page, 'Lifecycle Unsaved Query');
  await addProjectionColumn(page, 'Case Type');

  const newQueryButton = page.getByRole('button', { name: 'New Query' });
  const unsavedChangesAlert = page.getByRole('dialog').filter({
    hasText: 'Unsaved changes will be lost if you continue',
  });

  // aborting keeps the user on the query, changes intact
  await newQueryButton.click();
  await unsavedChangesAlert.getByRole('button', { name: 'Abort' }).click();
  await expect(unsavedChangesAlert).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`/edit/${queryId}`));
  await expect(getProjectionColumns(page)).toHaveCount(2);

  // proceeding discards the changes and starts a new query
  await newQueryButton.click();
  await unsavedChangesAlert.getByRole('button', { name: 'Proceed' }).click();
  await expect(page).not.toHaveURL(/\/edit\//);
  await expect(
    page
      .getByTestId('query__builder__explorer')
      .getByText('Cases', { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(getProjectionColumns(page)).toHaveCount(0);
  expect(captured.updatedQueries).toHaveLength(0);
});
