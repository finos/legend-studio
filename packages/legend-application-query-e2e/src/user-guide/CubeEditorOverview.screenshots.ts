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

import { join } from 'node:path';
import { test } from '@playwright/test';
import {
  clearCallouts,
  CUBE_GUIDE_IMAGES,
  markCallouts,
  openCubeExample,
} from './UserGuideCallouts.js';

// The images of docs/user-guide/cube/editor-overview.md: each callout's
// number is the one the page explains it under, so a change here changes
// the page too.

test('Legend Cube: the editor overview', async ({ page }) => {
  await openCubeExample(page, 'Top customers by orders');
  const header = page.getByTestId('legend-cube__graph-region');
  const button = (name: string) =>
    header.getByRole('button', { name, exact: true });
  const paletteItem = (label: string) =>
    page.getByTestId('legend-cube__palette-item').filter({ hasText: label });
  const toolbar = page.getByTestId('legend-cube__grid-toolbar');
  const tool = (name: string | RegExp) =>
    toolbar.getByRole('button', {
      name,
      exact: typeof name === 'string',
    });

  await markCallouts(page, [
    {
      n: 1,
      targets: [
        paletteItem('Relational Database Table'),
        paletteItem('Service'),
      ],
      at: 'inside-right',
    },
    {
      n: 2,
      targets: [paletteItem('Sort by Column'), paletteItem('Explode Array')],
      at: 'inside-right',
    },
    { n: 3, targets: [button('Cube')] },
    { n: 4, targets: [button('Add Items')] },
    { n: 5, targets: [button('Examples')] },
    { n: 6, targets: [button('Undo'), button('Redo')] },
    { n: 7, targets: [button('Show Pure')] },
    { n: 8, targets: [button('Hide graph')] },
    {
      n: 9,
      targets: [
        page
          .getByTestId('legend-cube__canvas-node')
          .filter({ hasText: 'Group by' }),
      ],
    },
    {
      n: 10,
      targets: [page.getByTestId('legend-cube__running-node-badge')],
      at: 'above',
    },
    {
      n: 11,
      targets: [
        page.getByRole('button', { name: 'zoom in' }),
        page.getByRole('button', { name: 'fit view' }),
      ],
      at: 'right',
    },
    {
      n: 12,
      targets: [tool('Execute'), toolbar.getByText(/^\d+ rows? in /u)],
      at: 'above',
    },
    {
      n: 13,
      targets: [tool('Server-side'), tool('Local')],
      at: 'above',
    },
    { n: 14, targets: [tool('Show SQL')], at: 'above' },
    { n: 15, targets: [tool(/^Runs/u)], at: 'left' },
    {
      n: 16,
      targets: [
        page.locator('.ag-header-cell').filter({ hasText: 'ORDER_COUNT' }),
      ],
      at: 'right',
    },
  ]);
  await page.screenshot({ path: join(CUBE_GUIDE_IMAGES, 'editor.png') });

  // a step's editor: the Group step's, opened by a click on it
  await clearCallouts(page);
  await page
    .getByTestId('legend-cube__canvas-node')
    .filter({ hasText: 'Group by' })
    .click();
  const editor = page.getByTestId('legend-cube__node-editor');
  await editor.waitFor();
  await page.mouse.move(1300, 120);
  const editorButton = (name: string) =>
    editor.getByRole('button', { name, exact: true });
  await markCallouts(page, [
    {
      n: 1,
      targets: [editor.getByText('Group By Column', { exact: true })],
      at: 'left',
    },
    { n: 2, targets: [editor.getByLabel('Help')], at: 'above' },
    { n: 3, targets: [editorButton('Run this step')], at: 'above' },
    {
      n: 4,
      targets: [editor.getByRole('button', { name: 'Close the editor' })],
      at: 'right',
    },
    { n: 5, targets: [editorButton('None')], at: 'right' },
    {
      n: 6,
      targets: [editor.getByRole('list', { name: 'Group columns' })],
      at: 'inside-right',
      cutAbove: editorButton('Cancel'),
    },
    {
      n: 7,
      targets: [editorButton('Cancel'), editorButton('Apply')],
      at: 'right',
    },
  ]);
  await page.screenshot({ path: join(CUBE_GUIDE_IMAGES, 'step-editor.png') });
});
