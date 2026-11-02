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
import { openGuideElement } from './GuideSetup.js';
import {
  markCallouts,
  saveRegion,
  saveRegionDownTo,
  STUDIO_GUIDE_IMAGES,
} from './UserGuideCallouts.js';

/** Where the editors show, beside the explorer: tabs and the open editor */
const getEditorGroup = (page: Page): Locator =>
  page.locator('.editor-group').first();

const button = (scope: Page | Locator, name: string): Locator =>
  scope.getByRole('button', { name, exact: true });

/** Opens the guide's service on one of its tabs */
const openServiceTab = async (page: Page, tab: string): Promise<Locator> => {
  await openGuideElement(page, 'guide::service::FirmEmployees');
  const editor = getEditorGroup(page);
  await editor.getByText(tab, { exact: true }).first().click();
  return editor;
};

test("a service's general settings", async ({ page }) => {
  // the tab is taller than the window
  await page.setViewportSize({ width: 1440, height: 1400 });
  const editor = await openServiceTab(page, 'General');
  await editor.getByText('MCP Server', { exact: true }).waitFor();
  // the focus out of the fields, so none shows it
  await page.mouse.click(1300, 300);
  await saveRegionDownTo(
    page,
    `${STUDIO_GUIDE_IMAGES}service-general.png`,
    editor,
    // the MCP Server field, the last on the tab
    editor.getByRole('textbox').last(),
  );
});

test("a service's execution", async ({ page }) => {
  const editor = await openServiceTab(page, 'Execution');
  await button(editor, 'See runtime').waitFor();
  await page.mouse.move(1300, 650);
  await markCallouts(page, [
    {
      n: 1,
      targets: [editor.locator('.monaco-editor').first()],
      at: 'inside-bottom-right',
    },
    {
      n: 2,
      targets: [button(editor, 'Edit Query').locator('..')],
      at: 'below',
    },
    {
      n: 3,
      targets: [button(editor, 'Run Query').locator('..')],
      at: 'below',
    },
    { n: 4, targets: [button(editor, 'Data Cube')], at: 'below' },
    { n: 5, targets: [button(editor, 'Advanced')], at: 'below' },
    {
      n: 6,
      targets: [
        editor.getByText('context', { exact: true }),
        button(editor, 'See mapping'),
        button(editor, 'See runtime'),
      ],
      at: 'below',
    },
  ]);
  await saveRegionDownTo(
    page,
    `${STUDIO_GUIDE_IMAGES}service-execution.png`,
    editor,
    button(editor, 'See runtime'),
  );
});

test("a service's tests", async ({ page }) => {
  const editor = await openServiceTab(page, 'Test');
  await button(editor, 'Run Suite Tests').click();
  // the suite's one test passes
  await expect(
    editor
      .locator(
        '.testable-test-assertion-explorer__header__summary__icon--passed',
      )
      .locator('..'),
  ).toHaveText('1', { timeout: 60_000 });
  await page.mouse.move(1300, 850);
  await markCallouts(page, [
    {
      n: 1,
      targets: [editor.getByText('employeesSuite', { exact: true })],
      at: 'right',
      textOnly: true,
    },
    {
      n: 2,
      targets: [editor.locator('.service-test-data-editor').first()],
      at: 'inside-bottom-right',
    },
    {
      n: 3,
      targets: [
        editor
          .locator('.testable-test-assertion-explorer__header__summary')
          .first(),
        button(editor, 'Add Service Test'),
        editor.getByText('listsEmployees', { exact: true }),
      ],
      at: 'below',
    },
    {
      n: 4,
      targets: [
        editor.getByText('Setup', { exact: true }),
        editor.getByText('Assertion', { exact: true }),
      ],
      at: 'right',
      textOnly: true,
    },
  ]);
  await saveRegion(page, `${STUDIO_GUIDE_IMAGES}service-test.png`, [editor], 0);
});
