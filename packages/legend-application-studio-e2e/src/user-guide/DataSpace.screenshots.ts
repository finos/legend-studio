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

/**
 * One of the data space editor's sections, by its title: the editor's own
 * sections, or the shared editor form's
 */
const section = (scope: Locator, title: string): Locator =>
  scope
    .locator('.editor-form-section, .dataSpace-editor__configuration__section')
    .filter({
      has: scope
        .page()
        .locator(
          '.editor-form-section__title, .dataSpace-editor__configuration__section__title',
          { hasText: new RegExp(`^${title}$`, 'u') },
        ),
    });

/** Opens the guide's data space on one of the pages of its editor */
const openDataSpacePage = async (
  page: Page,
  name: string,
): Promise<Locator> => {
  await openGuideElement(page, 'guide::dataspace::FirmData');
  const editor = getEditorGroup(page);
  await section(editor, 'About').waitFor();
  await editor
    .locator('.dataSpace-editor__sidebar')
    .getByRole('button', { name: new RegExp(`^${name}`, 'u') })
    .click();
  return editor;
};

test("a data space's home page", async ({ page }) => {
  // the page is taller than the window
  await page.setViewportSize({ width: 1440, height: 1500 });
  const editor = await openDataSpacePage(page, 'Home');
  await page.mouse.move(1300, 1450);
  await markCallouts(page, [
    {
      n: 1,
      targets: [
        editor.locator('.dataSpace-editor-header__name'),
        editor.locator('.dataSpace-editor-header__path'),
      ],
      at: 'right',
      textOnly: true,
    },
    { n: 2, targets: [button(editor, 'Preview')], at: 'left' },
    {
      n: 3,
      targets: [
        editor.locator(
          '.dataSpace-editor__sidebar .data-space__viewer__activity-bar__items',
        ),
      ],
      at: 'below',
    },
    { n: 4, targets: [section(editor, 'About')], at: 'inside-right' },
    { n: 5, targets: [section(editor, 'Diagrams')], at: 'inside-right' },
    { n: 6, targets: [section(editor, 'Elements')], at: 'inside-right' },
    { n: 7, targets: [section(editor, 'Support')], at: 'inside-right' },
  ]);
  await saveRegionDownTo(
    page,
    `${STUDIO_GUIDE_IMAGES}data-space.png`,
    editor,
    section(editor, 'Support'),
    24,
  );
});

test("a data space's execution context", async ({ page }) => {
  const editor = await openDataSpacePage(page, 'Execution Contexts');
  await page.mouse.move(1300, 880);
  await markCallouts(page, [
    {
      n: 1,
      targets: [
        editor.getByRole('tab', { name: 'Firm database default' }),
        button(editor, 'Add an execution context'),
      ],
      at: 'right',
    },
    {
      n: 2,
      targets: [section(editor, 'General')],
      at: 'inside-bottom-right',
    },
    { n: 3, targets: [section(editor, 'Mapping Source')], at: 'inside-right' },
    {
      n: 4,
      targets: [section(editor, 'Default Runtime')],
      at: 'inside-right',
    },
  ]);
  await saveRegionDownTo(
    page,
    `${STUDIO_GUIDE_IMAGES}data-space-execution-context.png`,
    editor,
    section(editor, 'Default Runtime'),
    24,
  );
});

test("a data space's executable", async ({ page }) => {
  const editor = await openDataSpacePage(page, 'Executables');
  await page.mouse.move(1300, 880);
  await markCallouts(page, [
    {
      n: 1,
      targets: [
        editor.getByRole('tab', { name: 'Service Firm employees' }),
        button(editor, 'Add an executable'),
      ],
      at: 'right',
    },
    { n: 2, targets: [section(editor, 'General')], at: 'inside-right' },
    { n: 3, targets: [section(editor, 'Element')], at: 'inside-right' },
    {
      n: 4,
      targets: [section(editor, 'Execution Context')],
      at: 'inside-right',
    },
    { n: 5, targets: [section(editor, 'Sample Values')], at: 'inside-right' },
  ]);
  await saveRegionDownTo(
    page,
    `${STUDIO_GUIDE_IMAGES}data-space-executable.png`,
    editor,
    section(editor, 'Sample Values'),
    24,
  );
});

test("a data space's info", async ({ page }) => {
  const editor = await openDataSpacePage(page, 'Info');
  await page.mouse.move(1300, 880);
  await markCallouts(page, [
    { n: 1, targets: [section(editor, 'Status')], at: 'inside-right' },
    { n: 2, targets: [section(editor, 'Deprecation')], at: 'inside-right' },
    {
      n: 3,
      targets: [section(editor, 'Related data spaces')],
      at: 'inside-right',
    },
  ]);
  await saveRegionDownTo(
    page,
    `${STUDIO_GUIDE_IMAGES}data-space-info.png`,
    editor,
    section(editor, 'Related data spaces'),
    24,
  );
});

test("a data space's preview", async ({ page }) => {
  const editor = await openDataSpacePage(page, 'Home');
  await button(editor, 'Preview').click();
  const preview = page.locator('.data-space-preview__dialog');
  await preview.getByText('Firms and their employees').first().waitFor();
  await page.mouse.move(1300, 700);
  await markCallouts(page, [
    {
      n: 1,
      targets: [button(preview, 'Description'), button(preview, 'Support')],
      at: 'right',
    },
    {
      n: 2,
      // the label, its icon and its menu
      targets: [preview.getByText('Run Query', { exact: true }).locator('..')],
      at: 'left',
    },
    {
      n: 3,
      targets: [preview.getByText('Description', { exact: true }).last()],
      at: 'right',
      textOnly: true,
    },
  ]);
  await saveRegion(
    page,
    `${STUDIO_GUIDE_IMAGES}data-space-preview.png`,
    [preview],
    0,
  );
});
