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
import { type Page, test } from '@playwright/test';
import {
  clearCallouts,
  CUBE_GUIDE_IMAGES,
  markCallouts,
  openCubeExample,
  saveRegion,
} from './UserGuideCallouts.js';

// The images of the Containers part of docs/user-guide/cube/editor-overview.md:
// each callout's number is the one the page explains it under, so a change
// here changes the page too. The containers are made as a reader would, from
// the steps' menus, on the Trades example that adds up notional by desk.

const step = (page: Page, text: string) =>
  page.getByTestId('legend-cube__canvas-node').filter({ hasText: text });

const containerHead = (page: Page, title: string) =>
  page
    .getByTestId('legend-cube__canvas-container')
    .filter({ hasText: title })
    .locator('.legend-cube__container-head');

/** Right-clicks a step and opens its Put in a Container menu */
const openPutInMenu = async (page: Page, text: string) => {
  await step(page, text).click({ button: 'right' });
  await page
    .getByRole('menu')
    .getByRole('button', { name: 'Put in a Container', exact: true })
    .click();
  const submenu = page.getByRole('menu', { name: 'Put in a Container' });
  await submenu.waitFor();
  return submenu;
};

/** Renames a container in place, as a double-click on its title does */
const rename = async (page: Page, from: string, to: string) => {
  await containerHead(page, from).getByText(from, { exact: true }).dblclick();
  const input = page.getByLabel('Container title');
  await input.fill(to);
  await input.press('Enter');
};

test('Legend Cube: containers', async ({ page }) => {
  await openCubeExample(page, 'Notional by desk and asset class');

  // the trades and the desks, and the join of the two: one container
  const first = await openPutInMenu(page, 'DESK_ID');
  await first
    .getByRole('button', { name: 'With the Steps Before It', exact: true })
    .click();
  await rename(page, 'Container 1', 'Trades with their desks');

  // the menu of a step beside it: a new container, or that one
  const submenu = await openPutInMenu(page, 'INSTRUMENT_ID');
  await page.mouse.move(1300, 120);
  const menuButton = (name: string) =>
    submenu.getByRole('button', { name, exact: true });
  await markCallouts(page, [
    {
      n: 1,
      targets: [
        page
          .getByRole('menu')
          .first()
          .getByRole('button', { name: 'Put in a Container', exact: true }),
      ],
      at: 'left',
    },
    {
      n: 2,
      targets: [
        menuButton('This Step Alone'),
        menuButton('With the Steps Before It'),
      ],
      at: 'right',
    },
    { n: 3, targets: [menuButton('Trades with their desks')], at: 'right' },
  ]);
  await saveRegion(page, join(CUBE_GUIDE_IMAGES, 'containers-menu.png'), [
    page.getByRole('menu').first(),
    submenu,
  ]);
  await clearCallouts(page);
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');

  // the Rename and the join it feeds: a second container, folded
  await (await openPutInMenu(page, 'Rename 1 Column'))
    .getByRole('button', { name: 'This Step Alone', exact: true })
    .click();
  await (await openPutInMenu(page, 'INSTRUMENT_ID'))
    .getByRole('button', { name: 'Container 2', exact: true })
    .click();
  await rename(page, 'Container 2', 'Add the instruments');
  await containerHead(page, 'Add the instruments')
    .getByRole('button', { name: 'Fold the container' })
    .click();
  const folded = page.getByTestId('legend-cube__canvas-folded-container');
  await folded.waitFor();
  await page.mouse.move(1300, 120);

  const head = containerHead(page, 'Trades with their desks');
  await markCallouts(page, [
    {
      n: 4,
      targets: [
        head.getByRole('button', { name: 'Fold the container' }),
        head.getByText('3 steps'),
      ],
      at: 'above',
    },
    {
      n: 5,
      targets: [head.getByRole('button', { name: 'Take the container away' })],
      at: 'right',
    },
    { n: 6, targets: [folded], at: 'below' },
  ]);
  // the canvas alone: its callouts are inside it
  await saveRegion(
    page,
    join(CUBE_GUIDE_IMAGES, 'containers.png'),
    [page.getByTestId('legend-cube__canvas')],
    0,
  );
});
