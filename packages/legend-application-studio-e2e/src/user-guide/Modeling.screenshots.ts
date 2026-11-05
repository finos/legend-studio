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
import { getExplorer } from '../support/StudioHelpers.js';
import { openGuideElement, openGuideWorkspace } from './GuideSetup.js';
import {
  markCallouts,
  saveRegion,
  STUDIO_GUIDE_IMAGES,
} from './UserGuideCallouts.js';

const button = (scope: Page | Locator, name: string): Locator =>
  scope.getByRole('button', { name, exact: true });

/** The element editor's tab (`Properties`, `Derived Properties`, ...) */
const openTab = async (page: Page, tab: string): Promise<void> => {
  await page
    .locator('.uml-element-editor__tabs')
    .getByText(tab, { exact: true })
    .click();
};

/** Where the editors show, beside the explorer: tabs and the open editor */
const getEditorGroup = (page: Page): Locator =>
  page.locator('.editor-group').first();

/** The open element's header: its kind and its name, above its tabs */
const getElementHeader = (page: Page): Locator =>
  getEditorGroup(page)
    .locator('.panel__header:not(.editor-group__header)')
    .first();

/** Hides the explorer, for a wider editor */
const hideExplorer = async (page: Page): Promise<void> => {
  await button(page, 'Explorer (Ctrl + Shift + X)').click();
};

test('creating an element', async ({ page }) => {
  // tall enough for the whole menu
  await page.setViewportSize({ width: 1440, height: 1150 });
  await openGuideWorkspace(page);
  for (const node of ['guide', 'model']) {
    await getExplorer(page).getByText(node, { exact: true }).click();
  }
  await button(page, 'New Element... (Ctrl + Shift + N)').click();
  const menu = page.getByRole('menu');
  await menu.waitFor();
  await page.mouse.move(1300, 120);
  await markCallouts(page, [
    {
      n: 1,
      // by its title: the open menu hides the rest of the page from roles
      targets: [
        page.locator('button[title="New Element... (Ctrl + Shift + N)"]'),
      ],
      at: 'above',
    },
    { n: 2, targets: [menu], at: 'right' },
  ]);
  await saveRegion(page, `${STUDIO_GUIDE_IMAGES}new-element.png`, [
    page.locator('button[title="New Element... (Ctrl + Shift + N)"]'),
    getExplorer(page),
    menu,
  ]);
});

test('a class', async ({ page }) => {
  await openGuideElement(page, 'guide::model::Person');
  const form = page.getByTestId('class-form-editor');
  await form.waitFor();
  await hideExplorer(page);
  const properties = form.locator('.property-basic-editor');
  await page.mouse.move(700, 600);
  await markCallouts(page, [
    { n: 1, targets: [form.locator('.uml-element-editor__tabs')], at: 'above' },
    { n: 2, targets: [button(form, 'Add property')], at: 'below' },
    { n: 3, targets: [properties.first()], at: 'left' },
    { n: 4, targets: [properties.filter({ hasText: 'employer' })], at: 'left' },
  ]);
  await saveRegion(page, `${STUDIO_GUIDE_IMAGES}class.png`, [
    getElementHeader(page),
    properties.last(),
  ]);
});

test('a derived property and a constraint', async ({ page }) => {
  await openGuideElement(page, 'guide::model::Person');
  const form = page.getByTestId('class-form-editor');
  await openTab(page, 'Derived Properties');
  const lambda = form.locator('.lambda-editor').first();
  await lambda.waitFor();
  await page.mouse.move(700, 120);
  await markCallouts(page, [
    {
      n: 1,
      targets: [form.locator('.property-basic-editor').first()],
      at: 'left',
    },
    { n: 2, targets: [lambda.locator('.monaco-editor')], at: 'below' },
    {
      n: 3,
      targets: [lambda.getByText('String', { exact: true })],
      at: 'below',
    },
    { n: 4, targets: [button(form, 'Toggle Expand')], at: 'below' },
    { n: 5, targets: [button(form, 'Open in a popup...')], at: 'right' },
  ]);
  await saveRegion(
    page,
    `${STUDIO_GUIDE_IMAGES}derived-property.png`,
    [form.locator('.uml-element-editor__tabs'), lambda],
    44,
  );
});

test('an enumeration', async ({ page }) => {
  await openGuideElement(page, 'guide::model::IncType');
  const editor = getEditorGroup(page);
  const values = editor.getByRole('textbox', { name: 'Enum name' });
  await values.last().waitFor();
  await page.mouse.move(700, 600);
  await markCallouts(page, [
    { n: 1, targets: [button(editor, 'Add enum value')], at: 'left' },
    { n: 2, targets: [values.last()], at: 'below' },
    { n: 3, targets: [button(editor, 'See detail').last()], at: 'below' },
    { n: 4, targets: [button(editor, 'Remove').last()], at: 'right' },
  ]);
  await saveRegion(page, `${STUDIO_GUIDE_IMAGES}enumeration.png`, [
    getElementHeader(page),
    button(editor, 'Remove').last(),
  ]);
});

test('an association', async ({ page }) => {
  await openGuideElement(page, 'guide::model::Firm_Person');
  const editor = getEditorGroup(page);
  await editor.locator('.property-basic-editor').last().waitFor();
  await page.mouse.move(700, 600);
  await saveRegion(
    page,
    `${STUDIO_GUIDE_IMAGES}association.png`,
    [getElementHeader(page), button(editor, 'See detail').last()],
    16,
  );
});

test('a profile', async ({ page }) => {
  await openGuideElement(page, 'guide::model::Governance');
  const editor = getEditorGroup(page);
  const tags = editor.getByRole('textbox', { name: 'Tag value' });
  await tags.last().waitFor();
  await page.mouse.move(700, 600);
  await markCallouts(page, [
    {
      n: 1,
      targets: [editor.locator('.uml-element-editor__tabs')],
      at: 'right',
    },
    { n: 2, targets: [button(editor, 'Add tagged value')], at: 'left' },
    { n: 3, targets: [tags.last()], at: 'below' },
    { n: 4, targets: [button(editor, 'Remove').last()], at: 'right' },
  ]);
  await saveRegion(page, `${STUDIO_GUIDE_IMAGES}profile.png`, [
    getElementHeader(page),
    button(editor, 'Remove').last(),
  ]);
});

test('a diagram', async ({ page }) => {
  await openGuideElement(page, 'guide::model::FirmDiagram');
  await button(page, 'View Tool (V)').waitFor();
  // the class boxes drawn
  await page.waitForTimeout(1000);
  await page.mouse.move(1300, 800);
  await markCallouts(page, [
    {
      n: 1,
      targets: [button(page, 'View Tool (V)'), button(page, 'Zoom Out (Z)')],
      at: 'right',
    },
    {
      n: 2,
      targets: [
        button(page, 'Property Tool (P)'),
        button(page, 'Add class tool (C)'),
      ],
      at: 'right',
    },
    { n: 3, targets: [button(page, 'Show Hotkeys')], at: 'right' },
    {
      n: 4,
      targets: [button(page, 'Align left'), button(page, 'Space vertically')],
      at: 'below',
    },
    { n: 5, targets: [button(page, '100%')], at: 'below' },
  ]);
  await saveRegion(
    page,
    `${STUDIO_GUIDE_IMAGES}diagram.png`,
    [getEditorGroup(page)],
    0,
  );
});
