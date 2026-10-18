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

import { mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test, type Locator, type Page } from '@playwright/test';
import {
  CUBE_STEP_CUBES,
  CUBE_STEPS_WITH_EXPRESSIONS,
} from './CubeStepCubes.js';
import {
  type Callout,
  CUBE_GUIDE_IMAGES,
  markCallouts,
  openCubeExample,
} from './UserGuideCallouts.js';

// The images of docs/user-guide/cube/steps: each step's editor, its inputs
// numbered as its page explains them. Each step runs on a small cube
// imported from a spec (CubeStepCubes.ts), but Explode Array, shown on its
// example.

const STEP_IMAGES = join(CUBE_GUIDE_IMAGES, 'steps');

/** Each step's inputs, numbered, in its editor */
const STEP_CALLOUTS: Record<string, (editor: Locator) => Callout[]> = {
  sort: (editor) => [
    { n: 1, targets: [label(editor, 'Sort column 1')], at: 'left' },
    { n: 2, targets: [label(editor, 'Sort direction 1')], at: 'above' },
    {
      n: 3,
      targets: [
        label(editor, 'Move sort column 2 up'),
        label(editor, 'Move sort column 2 down'),
      ],
      at: 'below',
    },
    { n: 4, targets: [label(editor, 'Remove sort column 1')], at: 'right' },
    { n: 5, targets: [button(editor, 'Add sort column')], at: 'right' },
  ],
  group: (editor) => [
    {
      n: 1,
      targets: [label(editor, 'Group columns')],
      at: 'inside-right',
    },
    { n: 2, targets: [button(editor, 'None')], at: 'left' },
    { n: 3, targets: [label(editor, 'Aggregation column 1')], at: 'left' },
    { n: 4, targets: [label(editor, 'Aggregation function 1')], at: 'left' },
    {
      n: 5,
      targets: [label(editor, 'Aggregation output name 1')],
      at: 'right',
    },
    { n: 6, targets: [button(editor, 'Add aggregation')], at: 'right' },
  ],
  pivot: (editor) => [
    { n: 1, targets: [label(editor, 'Row columns')], at: 'inside-right' },
    {
      n: 2,
      targets: [
        editor.getByText('Pivot column', { exact: true }),
        label(editor, 'Pivot column'),
      ],
      at: 'left',
    },
    { n: 3, targets: [button(editor, 'Load values')], at: 'left' },
    { n: 4, targets: [label(editor, 'Values')], at: 'inside-right' },
    { n: 5, targets: [row(label(editor, 'Aggregation function'))], at: 'left' },
  ],
  filter: (editor) => [
    {
      n: 1,
      targets: [label(editor, 'Combine the conditions with')],
      at: 'right',
    },
    { n: 2, targets: [label(editor, 'Filter column')], at: 'left' },
    { n: 3, targets: [label(editor, 'Filter operator')], at: 'above' },
    { n: 4, targets: [label(editor, 'Negate the condition')], at: 'above' },
    { n: 5, targets: [label(editor, 'Filter value')], at: 'left' },
    {
      n: 6,
      targets: [button(editor, 'Add condition'), button(editor, 'Add group')],
      at: 'right',
    },
  ],
  expressionFilter: (editor) => [
    { n: 1, targets: [label(editor, 'Condition')], at: 'left' },
    { n: 2, targets: [label(editor, 'Expand the condition')], at: 'right' },
    {
      n: 3,
      targets: [
        editor.getByText(
          'One Boolean of a row: the rows for which it is true are kept',
        ),
      ],
      at: 'right',
    },
    { n: 4, targets: [label(editor, 'Input columns')], at: 'left' },
  ],
  restrict: (editor) => [
    {
      n: 1,
      targets: [label(editor, 'Columns to keep')],
      at: 'inside-right',
    },
    {
      n: 2,
      targets: [button(editor, 'All'), button(editor, 'None')],
      at: 'left',
    },
  ],
  rename: (editor) => [
    { n: 1, targets: [label(editor, 'Old column 1')], at: 'left' },
    { n: 2, targets: [label(editor, 'New column name 1')], at: 'above' },
    { n: 3, targets: [button(editor, 'Add column to rename')], at: 'right' },
  ],
  distinct: () => [],
  drop: (editor) => [
    { n: 1, targets: [label(editor, 'Rows to drop')], at: 'right' },
  ],
  limit: (editor) => [
    { n: 1, targets: [label(editor, 'Rows to keep')], at: 'right' },
  ],
  slice: (editor) => [
    { n: 1, targets: [label(editor, 'Start row index')], at: 'right' },
    { n: 2, targets: [label(editor, 'Stop row index')], at: 'right' },
  ],
  concat: (editor) => [
    {
      n: 1,
      targets: [editor.getByRole('checkbox', { name: 'Convert types' })],
      at: 'left',
    },
    { n: 2, targets: [editor.getByRole('table')], at: 'inside-right' },
  ],
  join: (editor) => [
    { n: 1, targets: [editor.locator('select').first()], at: 'right' },
    { n: 2, targets: [button(editor, 'Swap Inputs')], at: 'left' },
    { n: 3, targets: [label(editor, 'Left join column 1')], at: 'left' },
    { n: 4, targets: [label(editor, 'Right join column 1')], at: 'below' },
    { n: 5, targets: [button(editor, 'Add join columns')], at: 'right' },
  ],
  difference: (editor) => [
    {
      n: 1,
      targets: [
        label(editor, 'Left join column 1'),
        label(editor, 'Right join column 1'),
      ],
      at: 'left',
    },
    { n: 2, targets: [button(editor, 'Swap Inputs')], at: 'left' },
    { n: 3, targets: [button(editor, 'Add join columns')], at: 'right' },
    {
      n: 4,
      targets: [label(editor, 'Difference columns')],
      at: 'inside-right',
    },
  ],
  partition: (editor) => [
    {
      n: 1,
      targets: [
        label(editor, 'Aggregation function 1'),
        label(editor, 'Aggregation output name 1'),
      ],
      at: 'left',
    },
    { n: 2, targets: [button(editor, 'Add window function')], at: 'right' },
    {
      n: 3,
      targets: [label(editor, 'Partition columns')],
      at: 'inside-right',
    },
    {
      n: 4,
      targets: [
        label(editor, 'Sort column 1'),
        label(editor, 'Sort direction 1'),
      ],
      at: 'left',
    },
    { n: 5, targets: [button(editor, 'Add sort column')], at: 'right' },
  ],
  extend: (editor) => [
    { n: 1, targets: [label(editor, 'Column name 1')], at: 'left' },
    { n: 2, targets: [label(editor, 'Expression 1')], at: 'left' },
    {
      n: 3,
      targets: [
        label(editor, 'Move column 1 up'),
        label(editor, 'Move column 1 down'),
      ],
      at: 'above',
    },
    { n: 4, targets: [button(editor, 'Add column')], at: 'right' },
    { n: 5, targets: [label(editor, 'Input columns')], at: 'left' },
  ],
  explode: (editor) => [
    {
      n: 1,
      targets: [
        editor.getByText('Column', { exact: true }),
        label(editor, 'Explode column'),
      ],
      at: 'left',
    },
    { n: 2, targets: [row(label(editor, 'Path key 1'))], at: 'left' },
    { n: 3, targets: [button(editor, 'Add key')], at: 'right' },
    { n: 4, targets: [button(editor, 'Find arrays')], at: 'right' },
    { n: 5, targets: [row(label(editor, 'New column name'))], at: 'left' },
  ],
};

function label(editor: Locator, name: string): Locator {
  return editor.getByLabel(name, { exact: true });
}

/** The row a control is in, its label included */
function row(control: Locator): Locator {
  return control.locator('xpath=..');
}

function button(editor: Locator, name: string): Locator {
  return editor.getByRole('button', { name, exact: true });
}

const graphHeader = (page: Page): Locator =>
  page.getByTestId('legend-cube__graph-region');

const nodeEditor = (page: Page): Locator =>
  page.getByTestId('legend-cube__node-editor');

/** The cube's spec as Cube > Export downloads it */
const exportSpec = async (page: Page): Promise<Record<string, unknown>> => {
  await graphHeader(page)
    .getByRole('button', { name: 'Cube', exact: true })
    .click();
  await page.getByRole('menuitem', { name: 'Export' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('dialog').getByText('Download').click(),
  ]);
  await page.keyboard.press('Escape');
  return JSON.parse(readFileSync(await download.path(), 'utf8')) as Record<
    string,
    unknown
  >;
};

/** Imports a cube, as Cube > Import does */
const importSpec = async (
  page: Page,
  spec: Record<string, unknown>,
): Promise<void> => {
  await graphHeader(page)
    .getByRole('button', { name: 'Cube', exact: true })
    .click();
  await page.getByRole('menuitem', { name: 'Import', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Cube spec').last().fill(JSON.stringify(spec));
  await dialog
    .getByRole('button', { name: /^Import/u })
    .last()
    .click();
  await dialog.waitFor({ state: 'detached' });
};

/** Opens the node's editor */
const openStep = async (page: Page, id: string): Promise<Locator> => {
  await page.locator(`.react-flow__node[data-id="${id}"]`).click();
  const editor = nodeEditor(page);
  await editor.waitFor();
  return editor;
};

/** Runs the cube, so its steps' editors know their input columns */
const execute = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: 'Execute', exact: true }).click();
  await page.getByText(/^\d+ rows? in /u).waitFor();
};

/** The editor and its callouts, cut out of the page */
const shootEditor = async (
  page: Page,
  editor: Locator,
  file: string,
): Promise<void> => {
  // the pointer away, so no control shows its hover
  await page.mouse.move(5, 895);
  const box = await editor.boundingBox();
  if (!box) {
    throw new Error(`No editor to show for ${file}`);
  }
  // room around the editor for the numbers beside it
  const margin = { side: 44, top: 40, bottom: 16 };
  await page.screenshot({
    path: join(STEP_IMAGES, file),
    clip: {
      x: box.x - margin.side,
      y: box.y - margin.top,
      width: box.width + 2 * margin.side,
      height: box.height + margin.top + margin.bottom,
    },
  });
};

// tall enough for the longest editors to show without scrolling
test.use({ viewport: { width: 1440, height: 1400 } });

test('Legend Cube: each step and its inputs', async ({ page }) => {
  mkdirSync(STEP_IMAGES, { recursive: true });
  await openCubeExample(page, 'Sales by country and year');
  const base = await exportSpec(page);

  for (const [kind, nodes] of Object.entries(CUBE_STEP_CUBES)) {
    const step = nodes[nodes.length - 1];
    if (!step) {
      continue;
    }
    await importSpec(page, {
      ...base,
      name: `Step: ${kind}`,
      query: { selected: step.id, nodes },
    });
    if (CUBE_STEPS_WITH_EXPRESSIONS.includes(kind)) {
      // its expression checked by the engine as the editor opens, then applied
      const editor = await openStep(page, step.id);
      const apply = button(editor, 'Apply');
      await test.expect(apply).toBeEnabled();
      await apply.click();
    }
    await execute(page);
    const editor = await openStep(page, step.id);
    const callouts = STEP_CALLOUTS[kind]?.(editor) ?? [];
    await markCallouts(page, callouts);
    await shootEditor(page, editor, `${kind}.png`);
    await page.keyboard.press('Escape');
  }

  // Explode Array, on its example
  await openCubeExample(page, 'Order lines from JSON');
  const explode = await openStep(page, 'explode101');
  await markCallouts(page, STEP_CALLOUTS.explode?.(explode) ?? []);
  await shootEditor(page, explode, 'explode.png');
});
