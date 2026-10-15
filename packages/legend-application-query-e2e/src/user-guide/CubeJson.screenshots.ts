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

import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { test, type Locator, type Page } from '@playwright/test';
import {
  clearCallouts,
  CUBE_GUIDE_IMAGES,
  markCallouts,
  openCubeExample,
  saveRegion,
} from './UserGuideCallouts.js';

// The images of docs/user-guide/cube/json.md, on the examples "Orders from
// JSON" and "Order lines from JSON" (DuckDB): a JSON (Variant) cell's menu,
// Open JSON, Explore JSON, a text column's Parse as JSON, and a JSON
// column's fields in the Extend editor.

const JSON_IMAGES = join(CUBE_GUIDE_IMAGES, 'json');

const menuItem = (page: Page, text: string | RegExp): Locator =>
  page.locator('.ag-menu-option').filter({ hasText: text });

test('Legend Cube: JSON columns', async ({ page }) => {
  mkdirSync(JSON_IMAGES, { recursive: true });
  await openCubeExample(page, 'Orders from JSON');
  const save = (file: string, regions: Locator[], margin?: number) =>
    saveRegion(page, join(JSON_IMAGES, file), regions, margin);
  // a JSON cell reads on one line, without JSON's quotes
  const jsonCell = page
    .locator('.ag-cell')
    .filter({ hasText: /^\{customer: \{name: Ann/u })
    .first();
  const textCell = page
    .locator('.ag-cell')
    .filter({ hasText: /^\{"customer":\{"name":"Ann"/u })
    .first();

  // a JSON cell's menu
  await jsonCell.click({ button: 'right' });
  await menuItem(page, 'Explore JSON…').waitFor();
  await markCallouts(page, [
    { n: 1, targets: [jsonCell], at: 'left' },
    { n: 2, targets: [menuItem(page, 'Open JSON')], at: 'right' },
    { n: 3, targets: [menuItem(page, 'Explore JSON…')], at: 'right' },
  ]);
  await save('cell-menu.png', [jsonCell, page.locator('.ag-menu').first()]);
  await clearCallouts(page);

  // Open JSON
  await menuItem(page, 'Open JSON').click();
  const viewer = page.getByTestId('legend-cube__json-viewer');
  await viewer.waitFor();
  await page.mouse.move(5, 895);
  await save(
    'open-json.png',
    [page.getByRole('dialog').locator('.modal').first()],
    8,
  );
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Close', exact: true })
    .click();

  // Explore JSON: a field picked, and a column it can become ticked
  await jsonCell.click({ button: 'right' });
  await menuItem(page, 'Explore JSON…').click();
  const explorer = page.getByTestId('legend-cube__json-explorer');
  await explorer.getByRole('status').waitFor();
  await explorer.getByLabel('Field document_json.customer.country').click();
  const offers = explorer.getByRole('group', { name: 'Columns it can become' });
  await offers.getByRole('checkbox').first().check();
  await page.mouse.move(5, 895);
  await markCallouts(page, [
    { n: 1, targets: [explorer.getByRole('status')], at: 'right' },
    { n: 2, targets: [explorer.getByLabel('Find a field')], at: 'right' },
    {
      n: 3,
      targets: [explorer.getByLabel('Field document_json.customer.country')],
      at: 'inside-right',
    },
    { n: 4, targets: [offers], at: 'inside-right' },
    {
      n: 5,
      targets: [
        page
          .getByRole('dialog')
          .getByRole('button', { name: /^Add \d+ columns?$/u }),
      ],
      at: 'left',
    },
  ]);
  await save(
    'explore-json.png',
    [page.getByRole('dialog').locator('.modal').first()],
    8,
  );
  await clearCallouts(page);
  await page.keyboard.press('Escape');
  await explorer.waitFor({ state: 'detached' });

  // a text column's Parse as JSON
  await textCell.click({ button: 'right' });
  await menuItem(page, 'Parse as JSON').waitFor();
  await markCallouts(page, [
    { n: 1, targets: [menuItem(page, 'Parse as JSON')], at: 'right' },
  ]);
  await save('parse-json.png', [textCell, page.locator('.ag-menu').first()]);
  await clearCallouts(page);
  await page.keyboard.press('Escape');

  // a JSON column's fields in the Extend editor
  await openCubeExample(page, 'Order lines from JSON');
  await page.locator('.react-flow__node[data-id="extend102"]').click();
  const editor = page.getByTestId('legend-cube__node-editor');
  await editor.waitFor();
  await editor.getByRole('button', { name: 'Fields of item' }).click();
  const fields = editor.getByRole('list', { name: 'Fields of item' });
  await fields.waitFor();
  // the editor scrolled to its fields
  await editor
    .getByRole('button', { name: 'Add item.qty as a column' })
    .scrollIntoViewIfNeeded();
  await page.mouse.move(5, 895);
  await markCallouts(page, [
    {
      n: 1,
      targets: [editor.getByRole('button', { name: 'Fields of item' })],
      at: 'above',
    },
    {
      n: 2,
      targets: [editor.getByRole('button', { name: 'Read again' })],
      at: 'right',
    },
    { n: 3, targets: [editor.getByLabel('Find a field')], at: 'left' },
    {
      n: 4,
      targets: [editor.getByRole('button', { name: 'Write item.product' })],
      at: 'left',
    },
    {
      n: 5,
      targets: [
        editor.getByRole('button', { name: 'Add item.product as a column' }),
      ],
      at: 'right',
    },
    {
      n: 6,
      targets: [editor.getByRole('button', { name: 'Other forms of item' })],
      at: 'right',
    },
  ]);
  await save('extend-fields.png', [editor], 44);
});
