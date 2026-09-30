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

import { expect, type Locator, type Page } from '@playwright/test';
import { TEST_PROJECT_ID, TEST_WORKSPACE_ID } from './TEST_DATA__SDLC.js';

/**
 * UI helpers for driving the workspace editor: opening the test workspace,
 * switching between form and text mode, editing the grammar, and reading
 * what the form editors show.
 */

export const WORKSPACE_URL = `edit/${TEST_PROJECT_ID}/${TEST_WORKSPACE_ID}/`;

// --------------------------------- Locators ---------------------------------

export const getExplorer = (page: Page): Locator =>
  page.getByTestId('explorer-trees');

export const getStatusBar = (page: Page): Locator =>
  page.getByTestId('status-bar');

/** The text mode editor, while the workspace is in text mode. */
export const getGrammarEditor = (page: Page): Locator =>
  page.locator('.editor-group').filter({
    has: page.getByRole('button', { name: 'Exit Text Mode' }),
  });

/** The inputs holding the property names of the class open in form mode. */
export const getPropertyNameInputs = (page: Page): Locator =>
  page.getByTestId('class-form-editor').getByPlaceholder('Property name');

// -------------------------------- Navigation --------------------------------

/** Open the test workspace, and wait for its model to show in form mode. */
export const openWorkspace = async (page: Page): Promise<void> => {
  await page.goto(WORKSPACE_URL);
  await expect(
    getExplorer(page).getByText('model', { exact: true }),
  ).toBeVisible();
};

/**
 * Open an element in its form editor from the explorer, e.g.
 * `openElement(page, 'model::Person')`.
 */
export const openElement = async (page: Page, path: string): Promise<void> => {
  const segments = path.split('::');
  const explorer = getExplorer(page);
  for (const [index, segment] of segments.entries()) {
    const node = explorer.getByText(segment, { exact: true }).first();
    const isElement = index === segments.length - 1;
    // expand packages that aren't open yet (the next segment isn't showing)
    if (
      isElement ||
      !(await explorer
        .getByText(segments[index + 1] as string, { exact: true })
        .first()
        .isVisible())
    ) {
      await node.click();
    }
  }
};

// --------------------------------- Modes -----------------------------------

/** Switch the workspace from form mode to text mode. */
export const enterTextMode = async (page: Page): Promise<void> => {
  await getStatusBar(page)
    .getByRole('button', { name: 'Toggle text mode (F8)' })
    .click();
  await expect(getGrammarEditor(page).locator('.view-lines')).toContainText(
    'Class',
  );
};

/**
 * Ask to leave text mode. Whether the workspace gets back to form mode
 * depends on whether the grammar compiles — assert on that separately
 * (e.g. with {@link expectFormMode}).
 */
export const clickExitTextMode = async (page: Page): Promise<void> => {
  await getGrammarEditor(page)
    .getByRole('button', { name: 'Exit Text Mode' })
    .click();
};

export const expectFormMode = async (page: Page): Promise<void> => {
  await expect(
    page.getByRole('button', { name: 'Exit Text Mode' }),
  ).toHaveCount(0);
  await expect(
    getStatusBar(page).getByRole('button', { name: 'Toggle text mode (F8)' }),
  ).toBeVisible();
};

export const expectTextMode = async (page: Page): Promise<void> => {
  await expect(
    page.getByRole('button', { name: 'Exit Text Mode' }),
  ).toBeVisible();
};

// ------------------------------- Text editing -------------------------------

const focusGrammarEditor = async (page: Page): Promise<void> => {
  await getGrammarEditor(page).locator('.view-lines').click();
};

/**
 * The whole grammar in the text mode editor. (The editor only renders the
 * lines in view, so this copies it out rather than reading the DOM.)
 */
export const getGrammarText = async (page: Page): Promise<string> => {
  await focusGrammarEditor(page);
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('ControlOrMeta+C');
  await page.keyboard.press('ControlOrMeta+Home');
  return page.evaluate(() => navigator.clipboard.readText());
};

/**
 * Replace the whole grammar in the text mode editor with `text`, as if the
 * user pasted it (so the editor's auto-closing of brackets and quotes
 * doesn't get in the way).
 */
export const setGrammarText = async (
  page: Page,
  text: string,
): Promise<void> => {
  await focusGrammarEditor(page);
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(text);
};

/**
 * Edit the grammar in the text mode editor: replace the first occurrence of
 * `search` with `replacement`.
 */
export const replaceInGrammar = async (
  page: Page,
  search: string,
  replacement: string,
): Promise<void> => {
  const text = await getGrammarText(page);
  expect(text, `the grammar should contain ${search}`).toContain(search);
  await setGrammarText(page, text.replace(search, replacement));
};

/** Compile the workspace, in form mode or text mode. */
export const compile = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: 'Compile (F9)' }).first().click();
};

// ------------------------------ Notifications ------------------------------

/** Expect the app to have notified the user with `message`. */
export const expectNotification = async (
  page: Page,
  message: string | RegExp,
): Promise<void> => {
  await expect(page.getByText(message).first()).toBeVisible();
};
