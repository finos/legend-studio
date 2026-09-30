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
import { setupStudio, type StudioBackends } from '../support/StudioSetup.js';
import {
  clickExitTextMode,
  expectClassProperties,
  expectFormMode,
  expectNotification,
  expectTextMode,
  getCursorLine,
  getErrorLines,
  getExplorer,
  getGrammarText,
  getLineNumber,
  getProblemsIndicator,
  openWorkspace,
  replaceInGrammar,
  waitForCompileToFinish,
  WORKSPACE_URL,
} from '../support/StudioHelpers.js';
import {
  TEST_PROJECT_ID,
  TEST_WORKSPACE_ID,
} from '../support/TEST_DATA__SDLC.js';

/**
 * How the workspace opens: in form mode normally; in text mode, to debug,
 * when its model can't be built; and in strict text mode from its `/text`
 * route.
 */

/** A model the form editors can't build: `employer` has no such type. */
const UNBUILDABLE_MODEL = `Class model::Person
{
  firstName: String[1];
  employer: model::Missing[1];
}

Class model::Firm
{
  legalName: String[1];
}
`;

let backends: StudioBackends;

test.afterEach(() => {
  expect(backends.unmockedCalls).toEqual([]);
});

test('the workspace opens in form mode, with its model', async ({ page }) => {
  backends = await setupStudio(page);
  await openWorkspace(page);

  await expectFormMode(page);
  await expectClassProperties(page, 'model::Person', [
    'firstName',
    'lastName',
    'age',
  ]);
});

test.describe('a workspace whose model cannot be built', () => {
  test.beforeEach(async ({ page }) => {
    backends = await setupStudio(page, { grammar: UNBUILDABLE_MODEL });
    await page.goto(WORKSPACE_URL);
    await expectNotification(
      page,
      /Can't build graph\. Redirected to text mode for debugging\. Error: Can't build element 'model::Person'/,
    );
    await expectTextMode(page);
    // entering text mode compiles the model, to point at the error
    await waitForCompileToFinish(page);
  });

  test('opens in text mode, at the error', async ({ page }) => {
    // (read before `getGrammarText()`, which moves the cursor)
    const cursorLine = await getCursorLine(page);
    const line = getLineNumber(await getGrammarText(page), 'model::Missing');

    expect(cursorLine).toBe(line);
    await expect.poll(() => getErrorLines(page)).toEqual([line]);
    await expect(getProblemsIndicator(page)).toHaveAttribute(
      'title',
      'Error: 1, Warnings: 0',
    );
    await expect(getExplorer(page)).toHaveCount(0);
    await expect(page.getByText('Failed to build graph')).toBeVisible();
  });

  test('once fixed there, gets to form mode', async ({ page }) => {
    await replaceInGrammar(page, 'model::Missing[1]', 'model::Firm[1]');
    await clickExitTextMode(page);

    await expectFormMode(page);
    await expectClassProperties(page, 'model::Person', [
      'firstName',
      'employer',
    ]);
  });

  test('cannot be left while still broken, with nothing to discard back to', async ({
    page,
  }) => {
    await clickExitTextMode(page);

    await expectNotification(
      page,
      /Can't build graph, please resolve compilation error before leaving text mode\. Compilation failed with error: Can't find type 'model::Missing'/,
    );
    await expectTextMode(page);
    // unlike leaving with an error made in text mode, there is no model
    // that last built to discard back to: the user isn't offered to
    await expect(
      page
        .getByRole('dialog')
        .filter({ hasText: 'Project is not in a compiled state' }),
    ).toHaveCount(0);
  });
});

test.describe('strict text mode, from the /text route', () => {
  const getFormModeNotSupportedDialog = (page: Page): Locator =>
    page
      .getByRole('dialog')
      .filter({ hasText: 'Form Mode Not Supported in Text Studio' });

  test.beforeEach(async ({ page }) => {
    backends = await setupStudio(page);
    await page.goto(`text/${TEST_PROJECT_ID}/${TEST_WORKSPACE_ID}/`);
    await expectTextMode(page);
    // opening compiles the model; the app ignores leaving until that's done
    await expectNotification(page, 'Compiled successfully');
    await waitForCompileToFinish(page);
  });

  test('opens the workspace in text mode', async ({ page }) => {
    await expect(page.getByText('Strict Text Mode (BETA)')).toBeVisible();
    const grammar = await getGrammarText(page);
    expect(grammar).toContain('Class model::Person');
    expect(grammar).toContain('age: Integer[0..1];');
    // there is no form mode to toggle to
    await expect(
      page.getByRole('button', { name: 'Toggle text mode (F8)' }),
    ).toHaveCount(0);
  });

  test('has no form mode: leaving offers the full editor instead', async ({
    page,
  }) => {
    await clickExitTextMode(page);
    const dialog = getFormModeNotSupportedDialog(page);
    await expect(dialog).toBeVisible();

    // cancelling stays in strict text mode
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expectTextMode(page);

    // or the user opens the full editor — in a new tab, in form mode
    await clickExitTextMode(page);
    const [fullEditor] = await Promise.all([
      page.context().waitForEvent('page'),
      dialog
        .getByRole('button', { name: 'Open Studio Full Edit Mode' })
        .click(),
    ]);
    await expect(fullEditor).toHaveURL(
      new RegExp(`/edit/${TEST_PROJECT_ID}/${TEST_WORKSPACE_ID}/?$`),
    );
    await expectFormMode(fullEditor);
    await expect(
      getExplorer(fullEditor).getByText('model', { exact: true }),
    ).toBeVisible();
  });
});
