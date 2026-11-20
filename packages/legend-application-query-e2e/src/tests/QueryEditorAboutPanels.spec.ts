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

import { test, expect, type Locator, type Page } from '@playwright/test';
import {
  mockProjectListing,
  mockSDLCProject,
  TEST_PROJECT_VERSION,
  TEST_SDLC_PROJECT_ID,
} from '../support/DepotMock.js';
import {
  setupEngineMock,
  type CapturedEngineRequests,
} from '../support/EngineMock.js';
import {
  getAboutDialogField,
  getHelpMenuItem,
  getQueryTitle,
  openDataSpaceQuery,
  project,
  recordOpenedWindows,
  saveNewQuery,
  TEST_PROJECT_GAV,
} from '../support/QueryBuilderHelpers.js';

/**
 * The query builder's `Help...` menu tells the user what they are querying,
 * and links to where it is defined: Studio for the model, Marketplace for the
 * data space.
 */

const PROJECT_COORDINATES = 'org.finos.legend.test:legend-query-test';
const DATA_SPACE_TITLE = 'Test DataSpace';

// the other Legend applications, as the app's dev config locates them
const STUDIO_URL = 'http://localhost:9000/studio';
const MARKETPLACE_URL = 'http://localhost:6400/marketplace';

let captured: CapturedEngineRequests;
let getOpenedWindows: () => Promise<string[]>;

/** Pick `label` in the `Help...` menu, and return the dialog it opens. */
const openAboutDialog = async (
  page: Page,
  label: string,
  title: string,
): Promise<Locator> => {
  await (await getHelpMenuItem(page, label)).click();
  const dialog = page.getByRole('dialog').filter({ hasText: title });
  await expect(dialog).toBeVisible();
  return dialog;
};

/** The value of the `Query Info` dialog's field labelled `label`. */
const getQueryInfoField = (dialog: Locator, label: string): Locator =>
  dialog
    .locator('.query-preview__field')
    .filter({
      has: dialog.page().getByText(label, { exact: true }),
    })
    .locator('.query-preview__field__value, .query-preview__field__input');

/** Save the query being built, so it has query info to show. */
const saveQuery = async (page: Page, name: string): Promise<string> => {
  await project(page, ['Cases']);
  const queryId = await saveNewQuery(page, name);
  await expect(getQueryTitle(page)).toHaveText(name, { timeout: 30_000 });
  return queryId;
};

test.beforeEach(async ({ page }) => {
  captured = await setupEngineMock(page);
  getOpenedWindows = await recordOpenedWindows(page);
});

test('About Legend Query shows the servers the app talks to, and copies them', async ({
  page,
}) => {
  await openDataSpaceQuery(page);
  const dialog = await openAboutDialog(
    page,
    'About Legend Query',
    'About Legend Query',
  );

  // the engine is the one the e2e mocks answer for, which proves the app is
  // configured as the tests expect
  await expect(
    dialog.getByRole('link', { name: 'http://localhost:6399/api' }),
  ).toBeVisible();
  await expect(
    dialog.getByRole('link', { name: 'http://localhost:6200/depot/api' }),
  ).toBeVisible();

  await dialog.getByTitle('Copy application info').click();
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toMatch(
      /Engine Server: http:\/\/localhost:6399\/api\nDepot Server: http:\/\/localhost:6200\/depot\/api/,
    );
});

/** Expect the `Help...` menu to offer exactly the About items `labels`. */
const expectAboutMenuItems = async (
  page: Page,
  labels: string[],
): Promise<void> => {
  await page.getByTitle('See more options').click();
  await expect(
    page
      .getByRole('menu')
      .getByRole('button', { name: /^(?:About|Query History|Go to Project)/ }),
  ).toHaveText(labels);
  // the menu covers the page, and closes on a click anywhere (not on Escape)
  await page.mouse.click(1, 1);
  await expect(page.getByRole('menu')).toBeHidden();
};

test('the Help menu only offers what applies to the query', async ({
  page,
}) => {
  // an unsaved data space query has no query info, history or project yet
  await openDataSpaceQuery(page);
  await expectAboutMenuItems(page, ['About Legend Query', 'About Data Space']);

  // a saved one does
  await saveQuery(page, 'Menu Query');
  await expectAboutMenuItems(page, [
    'About Query Info',
    'Query History',
    'Go to Project',
    'About Legend Query',
    'About Data Space',
  ]);
});

test('About Query Info shows where a saved query comes from', async ({
  page,
}) => {
  await mockProjectListing(page);
  await openDataSpaceQuery(page);
  await saveQuery(page, 'Info Query');

  const dialog = await openAboutDialog(page, 'About Query Info', 'Query Info');
  await expect(getQueryInfoField(dialog, 'Project')).toHaveText(
    PROJECT_COORDINATES,
  );
  await expect(getQueryInfoField(dialog, 'Data Product')).toHaveText(
    DATA_SPACE_TITLE,
  );
  await expect(getQueryInfoField(dialog, 'Version')).toContainText(
    TEST_PROJECT_VERSION,
  );
  // nothing to update until another version is picked
  await expect(dialog.getByRole('button', { name: 'Update' })).toBeDisabled();
});

test('a saved query can be moved to another version of its project from its query info', async ({
  page,
}) => {
  await mockProjectListing(page);
  await openDataSpaceQuery(page);
  const queryId = await saveQuery(page, 'Versioned Query');

  const dialog = await openAboutDialog(page, 'About Query Info', 'Query Info');
  await getQueryInfoField(dialog, 'Version').getByRole('combobox').click();
  await page.getByRole('option', { name: /latest/i }).click();
  await expect(
    dialog.getByText('Update action will reload query'),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Update' }).click();

  // the query is updated to follow the project's latest version, and reloaded
  await expect
    .poll(() =>
      captured.updatedQueries.map((query) => [query.id, query.versionId]),
    )
    .toEqual([[queryId, 'latest']]);
  await expect(getQueryTitle(page)).toHaveText('Versioned Query', {
    timeout: 30_000,
  });
  const reopened = await openAboutDialog(
    page,
    'About Query Info',
    'Query Info',
  );
  await expect(getQueryInfoField(reopened, 'Version')).toContainText(/latest/i);
});

test("About Data Space shows the data space's execution context, and links each of its elements to Studio", async ({
  page,
}) => {
  await mockSDLCProject(page);
  await openDataSpaceQuery(page);
  const dialog = await openAboutDialog(
    page,
    'About Data Space',
    'About Data Space',
  );

  await expect(getAboutDialogField(dialog, 'Project')).toHaveText(
    TEST_PROJECT_GAV,
  );
  await expect(getAboutDialogField(dialog, 'Name')).toHaveText(
    DATA_SPACE_TITLE,
  );
  await expect(getAboutDialogField(dialog, 'Execution Context')).toHaveText(
    'dummyContext',
  );
  await expect(getAboutDialogField(dialog, 'Mapping')).toHaveText(
    'CovidDataMapping',
  );
  await expect(getAboutDialogField(dialog, 'Runtime')).toHaveText('H2Runtime');

  // the mapping opens in Studio, in the project version queried
  await getAboutDialogField(dialog, 'Mapping').click();
  await expect
    .poll(getOpenedWindows)
    .toEqual([
      `${STUDIO_URL}/view/${TEST_SDLC_PROJECT_ID}/version/${TEST_PROJECT_VERSION}/entity/test::CovidDataMapping`,
    ]);

  // and the data space itself in Marketplace
  await dialog.getByRole('button', { name: 'Open Data Space' }).click();
  await expect
    .poll(async () => (await getOpenedWindows())[1])
    .toBe(`${MARKETPLACE_URL}/dataspace/${TEST_PROJECT_GAV}/test::DataSpace`);
});

test("Go to Project opens a saved query's project in Studio", async ({
  page,
}) => {
  await mockSDLCProject(page);
  await openDataSpaceQuery(page);
  await saveQuery(page, 'Project Query');

  await (await getHelpMenuItem(page, 'Go to Project')).click();
  await expect
    .poll(getOpenedWindows)
    .toEqual([`${STUDIO_URL}/view/${TEST_SDLC_PROJECT_ID}`]);
});

test('Go to Project warns when no Studio instance hosts the project', async ({
  page,
}) => {
  // the dev config only lists a Studio instance for `PROD` projects
  await mockSDLCProject(page, 'UAT-1234');
  await openDataSpaceQuery(page);
  await saveQuery(page, 'Unhosted Query');

  await (await getHelpMenuItem(page, 'Go to Project')).click();
  await expect(
    page.getByText(
      "Can't find the corresponding SDLC instance to view the SDLC project",
    ),
  ).toBeVisible();
  expect(await getOpenedWindows()).toEqual([]);
});
