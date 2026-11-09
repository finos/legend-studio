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
import { expect, type Page, test } from '@playwright/test';
import {
  clearCallouts,
  CUBE_GUIDE_IMAGES,
  markCallouts,
  openCubeExample,
  saveRegion,
} from './UserGuideCallouts.js';

// The images of the Notes part of docs/user-guide/cube/editor-overview.md:
// each callout's number is the one the page explains it under, so a change
// here changes the page too. The notes are written as a reader would, from
// the steps' menus, on the Trades example that adds up notional by desk.

const step = (page: Page, text: string) =>
  page.getByTestId('legend-cube__canvas-node').filter({ hasText: text });

/** The note under a step, in the step's React Flow node */
const noteOf = (page: Page, text: string) =>
  page
    .locator('.react-flow__node')
    .filter({ has: step(page, text) })
    .getByTestId('legend-cube__canvas-step-note');

/**
 * Opens a step's editor at its Note field, from its menu's Add Note…, writes
 * the note, and closes the editor, which stores it
 */
const writeNote = async (page: Page, text: string, note: string) => {
  await step(page, text).click({ button: 'right' });
  await page
    .getByRole('menu')
    .getByRole('button', { name: 'Add Note…', exact: true })
    .click();
  const field = page.getByTestId('legend-cube__step-note-field');
  await expect(field).toBeFocused();
  await field.fill(note);
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('legend-cube__node-editor')).toBeHidden();
};

test('Legend Cube: notes', async ({ page }) => {
  await openCubeExample(page, 'Notional by desk and asset class');

  // a step's menu: Add Note…, among the step's actions
  await step(page, 'Sort').click({ button: 'right' });
  const menu = page.getByRole('menu');
  const menuButton = (name: string) =>
    menu.getByRole('button', { name, exact: true });
  // the step's actions, at the end of a menu taller than the window
  await menuButton('Swap Inputs').scrollIntoViewIfNeeded();
  await page.mouse.move(1300, 120);
  await markCallouts(page, [
    { n: 1, targets: [menuButton('Add Note…')], at: 'left' },
  ]);
  await saveRegion(page, join(CUBE_GUIDE_IMAGES, 'notes-menu.png'), [
    menuButton('Set as output'),
    menuButton('Swap Inputs'),
  ]);
  await clearCallouts(page);
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();

  // two notes; the long one shown whole on hover
  await writeNote(
    page,
    'Rename 1 Column',
    'So the second join can tell the instrument’s ID from the ID of the desk joined before it',
  );
  await writeNote(page, 'Group by', 'For the weekly desk review');
  await noteOf(page, 'Rename 1 Column').hover();
  const tooltip = page.getByRole('tooltip');
  await tooltip.waitFor();
  await markCallouts(page, [
    { n: 2, targets: [noteOf(page, 'Group by')], at: 'below' },
    { n: 3, targets: [tooltip], at: 'right' },
  ]);
  // the canvas alone: its callouts are inside it
  await saveRegion(
    page,
    join(CUBE_GUIDE_IMAGES, 'notes.png'),
    [page.getByTestId('legend-cube__canvas')],
    0,
  );
  await clearCallouts(page);
});
