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
import { setupEngineMock } from '../support/EngineMock.js';
import {
  openDataSpaceQuery,
  project,
  waitForQueryBuilder,
} from '../support/QueryBuilderHelpers.js';

/**
 * The editor header's own controls, beside the query builder's: the color
 * theme, the developer settings, and the Legend AI agent chat.
 */

const getThemeToggle = (page: Page): Locator =>
  page.getByTitle('Toggle light/dark mode');

const getOpenAgentChatButton = (page: Page): Locator =>
  page.getByTitle('Open Legend AI Agent Chat');

const getCloseAgentChatButton = (page: Page): Locator =>
  page.getByTitle('Close Legend AI Agent Chat');

/** Open the `Dev Settings` dialog from the menu beside the app's name. */
const openDevSettings = async (page: Page): Promise<Locator> => {
  // the menu's button is an unlabelled icon
  await page.locator('.query-editor__logo-header__combo__menu-item').click();
  await page.getByRole('button', { name: 'Dev Settings' }).click();
  const dialog = page.getByRole('dialog').filter({ hasText: 'Dev Settings' });
  await expect(dialog).toBeVisible();
  return dialog;
};

test('the light/dark toggle switches the color theme, and remembers it across reloads', async ({
  page,
}) => {
  await setupEngineMock(page);
  await openDataSpaceQuery(page);
  const body = page.locator('body');
  await expect(body).toHaveClass(/theme__legacy-light/);

  await getThemeToggle(page).click();
  await expect(body).toHaveClass(/theme__default-dark/);
  await expect(body).not.toHaveClass(/theme__legacy-light/);

  await page.reload();
  await waitForQueryBuilder(page);
  await expect(body).toHaveClass(/theme__default-dark/);

  await getThemeToggle(page).click();
  await expect(body).toHaveClass(/theme__legacy-light/);
});

test('Dev Settings shows the engine server, and validates a replacement', async ({
  page,
}) => {
  await setupEngineMock(page);
  await openDataSpaceQuery(page);

  const dialog = await openDevSettings(page);
  const engineUrl = dialog.getByRole('textbox');
  await expect(engineUrl).toHaveValue('http://localhost:6399/api');

  await engineUrl.fill('not a url');
  await expect(dialog.getByText('Invalid URL')).toBeVisible();
  await engineUrl.fill('http://localhost:6399/api');
  await expect(dialog.getByText('Invalid URL')).toBeHidden();
});

test('Dev Settings can point the engine client at another server', async ({
  page,
}) => {
  await setupEngineMock(page);
  await openDataSpaceQuery(page);
  await project(page, ['Cases']);

  const dialog = await openDevSettings(page);
  await dialog.getByRole('textbox').fill('http://localhost:6399/api/elsewhere');
  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();

  // the next run goes to the server set
  const execution = page.waitForRequest(
    /:6399\/api\/elsewhere\/pure\/v1\/execution\/execute/,
  );
  await page.getByRole('button', { name: 'Run Query' }).click();
  await execution;
});

test('the Legend AI button opens and closes the agent chat, and remembers the choice', async ({
  page,
}) => {
  await setupEngineMock(page);
  await openDataSpaceQuery(page);

  await getOpenAgentChatButton(page).click();
  await expect(getCloseAgentChatButton(page)).toBeVisible();

  // the chat reopens with the editor
  await page.reload();
  await waitForQueryBuilder(page);
  await expect(getCloseAgentChatButton(page)).toBeVisible();

  await getCloseAgentChatButton(page).click();
  await expect(getOpenAgentChatButton(page)).toBeVisible();
});

test('a deployment can turn the Legend AI agent chat off', async ({ page }) => {
  await setupEngineMock(page, {
    coreOptions: {
      queryBuilderConfig: { TEMPORARY__disableQueryBuilderAgentChat: true },
    },
  });
  await openDataSpaceQuery(page);

  await expect(getThemeToggle(page)).toBeVisible();
  await expect(getOpenAgentChatButton(page)).toBeHidden();
  await expect(getCloseAgentChatButton(page)).toBeHidden();
});
