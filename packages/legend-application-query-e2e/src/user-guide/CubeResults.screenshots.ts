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

// The images of docs/user-guide/cube/results.md, on the example "Top
// customers by orders": a cell's menu, drilling down, the group rows'
// settings, a column's format, Runs, and the grid in Local mode.

const RESULT_IMAGES = join(CUBE_GUIDE_IMAGES, 'results');

const menuItem = (page: Page, text: string | RegExp): Locator =>
  page.locator('.ag-menu-option').filter({ hasText: text });

const cell = (page: Page, text: string): Locator =>
  page.locator('.ag-cell').filter({ hasText: text }).first();

const gridRegion = (page: Page): Locator =>
  page.getByTestId('legend-cube__grid-region');

test('Legend Cube: the results', async ({ page }) => {
  mkdirSync(RESULT_IMAGES, { recursive: true });
  await openCubeExample(page, 'Top customers by orders');
  const save = (file: string, regions: Locator[], margin?: number) =>
    saveRegion(page, join(RESULT_IMAGES, file), regions, margin);

  // a cell's menu, its Export open
  await cell(page, 'Germany').click({ button: 'right' });
  await menuItem(page, 'Export').hover();
  await menuItem(page, 'CSV (whole query)').waitFor();
  await markCallouts(page, [
    {
      n: 1,
      targets: [menuItem(page, 'Drilldown by "COUNTRY"')],
      at: 'left',
    },
    {
      n: 2,
      targets: [
        menuItem(page, 'Sort by "COUNTRY"'),
        menuItem(page, 'Filter by "COUNTRY"'),
      ],
      at: 'left',
    },
    { n: 3, targets: [menuItem(page, 'Format Column…')], at: 'left' },
    {
      n: 4,
      targets: [
        menuItem(page, 'Autosize All Columns'),
        menuItem(page, 'Reset Columns'),
      ],
      at: 'left',
    },
    {
      n: 5,
      targets: [
        menuItem(page, /^Copy\s*Ctrl/u),
        menuItem(page, 'Copy with Headers'),
      ],
      at: 'left',
    },
    {
      n: 6,
      targets: [
        menuItem(page, 'CSV (whole query)'),
        menuItem(page, 'Excel (rows shown)'),
      ],
      at: 'right',
    },
  ]);
  await save('cell-menu.png', [
    cell(page, 'Germany'),
    page.locator('.ag-menu').first(),
    page.locator('.ag-menu').last(),
  ]);
  await clearCallouts(page);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');

  // drilling down by COUNTRY, Austria's group open
  await cell(page, 'Germany').click({ button: 'right' });
  await menuItem(page, 'Drilldown by "COUNTRY"').click();
  const groupRows = page.locator('.ag-row-group');
  await groupRows.first().waitFor();
  await groupRows.first().locator('.ag-group-contracted').click();
  await page.getByText('Ernst Handel').waitFor();
  await page.mouse.move(5, 895);
  await markCallouts(page, [
    {
      n: 1,
      targets: [
        page.getByRole('button', { name: 'Stop drilling down by COUNTRY' }),
      ],
      at: 'right',
    },
    {
      n: 2,
      targets: [page.getByRole('button', { name: 'Group rows…' })],
      at: 'left',
    },
    {
      n: 3,
      targets: [page.getByRole('button', { name: 'Clear', exact: true })],
      at: 'below',
    },
    {
      n: 4,
      targets: [groupRows.first().locator('.ag-cell').first()],
      at: 'right',
    },
    {
      n: 5,
      // the group row's value, in the grid's own part of the row
      targets: [page.locator('.ag-row[row-index="0"] .ag-cell').last()],
      at: 'right',
    },
  ]);
  await save('drilldown.png', [
    page.getByTestId('legend-cube__drilldown-bar'),
    groupRows.last(),
  ]);
  await clearCallouts(page);

  // the group rows' settings
  await page.getByRole('button', { name: 'Group rows…' }).click();
  const groupRowsDialog = page.getByRole('dialog');
  await markCallouts(page, [
    {
      n: 1,
      targets: [
        groupRowsDialog.getByLabel("Group rows' COMPANY_NAME"),
        groupRowsDialog.getByLabel("Group rows' ORDER_COUNT"),
      ],
      at: 'left',
    },
  ]);
  await save('group-rows.png', [groupRowsDialog.locator('.modal').first()]);
  await clearCallouts(page);
  await groupRowsDialog.getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Clear', exact: true }).click();
  await groupRows.first().waitFor({ state: 'detached' });

  // a number column's format
  await cell(page, 'Ernst Handel').click();
  await page
    .locator('.ag-row')
    .filter({ hasText: 'Ernst Handel' })
    .locator('.ag-cell')
    .last()
    .click({ button: 'right' });
  await menuItem(page, 'Format Column…').click();
  const formatDialog = page.getByRole('dialog');
  await formatDialog.getByText('Preview:').waitFor();
  await page.mouse.move(5, 895);
  const option = (text: string) =>
    formatDialog.getByText(text, { exact: true });
  await markCallouts(page, [
    { n: 1, targets: [formatDialog.locator('select').first()], at: 'right' },
    { n: 2, targets: [formatDialog.locator('input').first()], at: 'right' },
    {
      n: 3,
      targets: [
        option('Thousands separators'),
        option('Parentheses if negative'),
      ],
      at: 'right',
    },
    { n: 4, targets: [option('Apply to every number column')], at: 'right' },
    { n: 5, targets: [formatDialog.getByText('Preview:')], at: 'left' },
  ]);
  await save('format.png', [formatDialog.locator('.modal').first()]);
  await clearCallouts(page);
  await formatDialog.getByRole('button', { name: 'Cancel' }).click();

  // Runs
  await page.getByRole('button', { name: /^Runs/u }).click();
  const runs = page.getByTestId('legend-cube__run-stats');
  await runs.waitFor();
  await page.mouse.move(5, 895);
  await markCallouts(page, [
    {
      n: 1,
      // the oldest run, the first Execute, which has room below it
      targets: [runs.getByText('Execute', { exact: true })],
      at: 'left',
    },
    {
      n: 2,
      targets: [runs.getByRole('button', { name: 'Show Pure' }).last()],
      at: 'below',
    },
    {
      n: 3,
      targets: [runs.getByRole('button', { name: 'Copy JSON' }).last()],
      at: 'below',
    },
    {
      n: 4,
      targets: [runs.getByRole('button', { name: 'Copy SQL' }).last()],
      at: 'below',
    },
  ]);
  await save('runs.png', [runs], 36);
  await clearCallouts(page);
  await page.getByRole('button', { name: /^Runs/u }).click();

  // Local mode
  await page.getByRole('button', { name: 'Local', exact: true }).click();
  await page.getByText('Drag here to set row groups').first().waitFor();
  await page.mouse.move(5, 895);
  await markCallouts(page, [
    {
      n: 1,
      targets: [page.getByText('Drag here to set row groups').first()],
      at: 'right',
    },
    {
      n: 2,
      targets: [
        page
          .locator('.ag-header-cell')
          .filter({ hasText: 'COUNTRY' })
          .locator('.ag-header-cell-filter-button')
          .first(),
      ],
      at: 'below',
    },
    { n: 3, targets: [page.locator('.ag-side-buttons')], at: 'left' },
  ]);
  await save('local.png', [gridRegion(page)], 0);
});
