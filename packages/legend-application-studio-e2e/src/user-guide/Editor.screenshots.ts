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

import { test, type Locator, type Page } from '@playwright/test';
import { getExplorer, getGrammarEditor } from '../support/StudioHelpers.js';
import { GUIDE_WORKSPACE_URL } from './GuideProject.js';
import { hideAssistant, setupGuideStudio } from './GuideSetup.js';
import {
  markCallouts,
  saveRegion,
  STUDIO_GUIDE_IMAGES,
} from './UserGuideCallouts.js';

/**
 * Opens the guide's workspace with the class `guide::model::Firm` open, and
 * the Showcases panel, which opens with the workspace, closed
 */
export const openGuideClass = async (page: Page): Promise<void> => {
  await setupGuideStudio(page);
  await page.goto(GUIDE_WORKSPACE_URL);
  const explorer = getExplorer(page);
  await explorer.getByText('guide', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Close Showcases' }).click();
  await hideAssistant(page);
  for (const node of ['guide', 'model', 'Firm']) {
    await explorer.getByText(node, { exact: true }).click();
  }
  await page.getByTestId('class-form-editor').waitFor();
};

const button = (page: Page, name: string): Locator =>
  page.getByRole('button', { name, exact: true });

test('the editor', async ({ page }) => {
  await openGuideClass(page);
  await button(page, 'Toggle panel (Ctrl + `)').click();
  await page.locator('.panel-group__header__tabs').waitFor();
  // the pointer away from the controls, so none shows its hover
  await page.mouse.move(700, 600);
  await markCallouts(page, [
    {
      n: 1,
      targets: [
        page.locator('.activity-bar__menu'),
        button(page, 'End to End Workflows (Beta)'),
      ],
      at: 'below',
    },
    {
      n: 2,
      targets: [
        button(page, 'Open Model Importer (F2)'),
        button(page, 'Open Element... (Ctrl + P)'),
      ],
      at: 'above',
    },
    { n: 3, targets: [getExplorer(page)], at: 'inside-right' },
    { n: 4, targets: [button(page, 'C Firm')], at: 'below' },
    { n: 5, targets: [button(page, 'Form')], at: 'left' },
    {
      n: 6,
      targets: [page.locator('.class-editor > .reflex-element').first()],
      at: 'inside-right',
    },
    {
      n: 7,
      targets: [page.getByTestId('class-form-editor')],
      at: 'inside-right',
    },
    {
      n: 8,
      targets: [page.locator('.panel-group__header__tabs')],
      at: 'above',
    },
    {
      n: 9,
      targets: [page.locator('.editor__status-bar__left')],
      at: 'above',
    },
    {
      n: 10,
      targets: [page.locator('.editor__status-bar__right')],
      at: 'above',
    },
    {
      n: 11,
      targets: [button(page, 'Open Showcases'), button(page, 'Settings')],
      at: 'right',
    },
  ]);
  await page.screenshot({ path: `${STUDIO_GUIDE_IMAGES}editor.png` });
});

test('text mode', async ({ page }) => {
  await openGuideClass(page);
  await button(page, 'Toggle text mode (F8)').click();
  const textMode = getGrammarEditor(page);
  await textMode.locator('.view-lines').getByText('Class').first().waitFor();
  await page.mouse.move(700, 600);
  const header = textMode.locator('.editor-group__header');
  await markCallouts(page, [
    {
      n: 1,
      targets: [
        header.getByText('Text Mode', { exact: true }),
        header.getByText('Firm', { exact: true }),
      ],
      at: 'below',
    },
    { n: 2, targets: [button(page, 'Compile')], at: 'below' },
    { n: 3, targets: [button(page, 'Exit Text Mode')], at: 'below' },
    { n: 4, targets: [header.getByText('Advanced')], at: 'below' },
    {
      n: 5,
      targets: [textMode.locator('.monaco-editor')],
      at: 'inside-right',
    },
  ]);
  await saveRegion(page, `${STUDIO_GUIDE_IMAGES}text-mode.png`, [textMode]);
});
