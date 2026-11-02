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

import { expect, test, type Page } from '@playwright/test';
import { GUIDE_PROJECT, GUIDE_WORKSPACE_URL } from './GuideProject.js';
import {
  hideAssistant,
  setupGuideStudio,
  showStudioLogo,
} from './GuideSetup.js';
import {
  markCallouts,
  saveRegion,
  STUDIO_GUIDE_IMAGES,
} from './UserGuideCallouts.js';

/**
 * Opens the start screen with the guide's project and workspace picked, and
 * the workspace listed under Recent workspaces
 */
const openStartScreen = async (page: Page): Promise<void> => {
  await setupGuideStudio(page);
  // opened once, so the start screen lists it as recent
  await page.goto(GUIDE_WORKSPACE_URL);
  await page
    .getByTestId('explorer-trees')
    .getByText('guide', { exact: true })
    .waitFor();
  await page.goto('./');
  await page.getByText('Welcome to Legend Studio').waitFor();
  await showStudioLogo(page);
  await hideAssistant(page);
  const [projectSelector, workspaceSelector] = [
    page.locator('.workspace-setup__selector').first(),
    page.locator('.workspace-setup__selector').nth(1),
  ];
  await projectSelector.getByRole('combobox').click();
  await page.getByRole('option', { name: GUIDE_PROJECT.project.name }).click();
  await workspaceSelector.getByRole('combobox').click();
  await page.getByRole('option', { name: GUIDE_PROJECT.workspaceId }).click();
  await expect(page.getByRole('button', { name: 'Go' })).toBeEnabled();
  // the pointer away from the controls, so none shows its hover
  await page.mouse.move(1300, 60);
};

test('the start screen', async ({ page }) => {
  // tall enough for the Showcase Projects card below the selectors
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openStartScreen(page);
  await markCallouts(page, [
    {
      n: 1,
      targets: [
        page.locator('.workspace-setup__recents__header__title'),
        page.locator('.workspace-setup__recents__tile'),
      ],
      at: 'right',
    },
    {
      n: 2,
      targets: [page.locator('.workspace-setup__selector').first()],
      at: 'left',
    },
    {
      n: 3,
      targets: [page.getByRole('button', { name: 'view' })],
      at: 'above',
    },
    {
      n: 4,
      targets: [page.locator('.workspace-setup__selector').nth(1)],
      at: 'left',
    },
    {
      n: 5,
      targets: [
        page.getByRole('button', { name: 'Need to create a new workspace?' }),
      ],
      at: 'left',
      textOnly: true,
    },
    { n: 6, targets: [page.getByRole('button', { name: 'Go' })], at: 'right' },
    {
      n: 7,
      targets: [page.getByRole('button', { name: 'Create New Project' })],
      at: 'right',
    },
    {
      n: 8,
      targets: [page.getByRole('button', { name: 'Showcase explorer' })],
      at: 'right',
    },
  ]);
  await page.screenshot({ path: `${STUDIO_GUIDE_IMAGES}start-screen.png` });
});

test('creating a workspace', async ({ page }) => {
  await openStartScreen(page);
  await page
    .getByRole('button', { name: 'Need to create a new workspace?' })
    .click();
  const dialog = page.getByRole('dialog');
  await dialog.getByPlaceholder('MyWorkspace').fill('add-firm-address');
  await page.mouse.move(1300, 60);
  await markCallouts(page, [
    {
      n: 1,
      targets: [dialog.getByPlaceholder('MyWorkspace')],
      at: 'left',
    },
    {
      n: 2,
      targets: [dialog.getByText('HEAD', { exact: true })],
      at: 'left',
    },
    {
      n: 3,
      // the prompt's row, with its checkbox
      targets: [
        dialog
          .getByText(
            'Group workspaces can be accessed by all users in the project',
          )
          .locator('..'),
      ],
      at: 'left',
    },
    {
      n: 4,
      targets: [dialog.getByRole('button', { name: 'Create' })],
      at: 'below',
    },
  ]);
  await saveRegion(page, `${STUDIO_GUIDE_IMAGES}create-workspace.png`, [
    dialog,
  ]);
});
