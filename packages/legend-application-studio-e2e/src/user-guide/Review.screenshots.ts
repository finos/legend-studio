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

import { expect, test, type Locator, type Page } from '@playwright/test';
import { openGuideElement } from './GuideSetup.js';
import {
  markCallouts,
  saveRegionDownTo,
  STUDIO_GUIDE_IMAGES,
} from './UserGuideCallouts.js';

const button = (scope: Page | Locator, name: string): Locator =>
  scope.getByRole('button', { name, exact: true });

/** The editors' tabs, and the label of the open diff, e.g. Local */
const getDiffHeader = (page: Page): Locator[] => [
  page.locator('.tab-manager__tab--active'),
  page.locator('.entity-diff-view__header__info__revision-summary'),
];

// One walk through a change's way to a release, as a reader takes it: the
// change, pushed, reviewed, and the release the project's reviews go into
test('a change, from the workspace to a release', async ({ page }) => {
  // the change: an email for each person
  await openGuideElement(page, 'guide::model::Person');
  await button(page, 'Add property').click();
  await page.getByPlaceholder('Property name').last().fill('email');
  await page.getByTitle(/^Local Changes/u).click();
  const changes = page.locator('.side-bar');
  await changes.getByText('guide::model::Person').click();
  await page.locator('.entity-diff-view__header__info').waitFor();
  await page.mouse.move(1000, 700);
  await markCallouts(page, [
    {
      n: 1,
      targets: [
        page.getByTitle('Download local entity changes'),
        page.getByTitle('Pull remote workspace changes'),
      ],
      at: 'below',
    },
    {
      n: 2,
      targets: [
        changes.getByText('CHANGES', { exact: true }),
        changes.getByText('guide::model::Person'),
      ],
      at: 'right',
    },
    { n: 3, targets: getDiffHeader(page), at: 'right' },
    {
      n: 4,
      targets: [
        page.getByText('1 unpushed changes'),
        page.getByTitle('Push local changes (Ctrl + S)').last(),
      ],
      at: 'above',
    },
  ]);
  await page.screenshot({ path: `${STUDIO_GUIDE_IMAGES}local-changes.png` });

  // pushed, then up for review
  await page
    .locator('#user-guide-callouts')
    .evaluate((layer) => layer.remove());
  await page.keyboard.press('Control+s');
  await expect(page.getByText('no changes detected')).toBeVisible();
  await page.getByTitle(/^Review/u).click();
  const review = page.locator('.side-bar');
  // the change the review holds, once the panel has it
  await review.getByText('guide::model::Person').waitFor();
  await review.getByPlaceholder('Title').fill('Add an email to Person');
  await button(review, 'Create review').click();
  await review.getByText('Add an email to Person').waitFor();
  await review.getByText('guide::model::Person').click();
  await expect(page.locator('.entity-diff-view__header__info')).toContainText(
    'BASE',
  );
  await page.mouse.move(1000, 700);
  await markCallouts(page, [
    {
      n: 1,
      targets: [page.getByTitle('Refresh'), page.getByTitle('Close review')],
      at: 'left',
    },
    {
      n: 2,
      targets: [
        review.getByText('Add an email to Person'),
        review.getByText(/^created /u),
      ],
      at: 'right',
      textOnly: true,
    },
    { n: 3, targets: [page.getByTitle('Commit review')], at: 'below' },
    {
      n: 4,
      targets: [
        review.getByText('CHANGES', { exact: true }),
        review.getByText('guide::model::Person'),
      ],
      at: 'right',
    },
    { n: 5, targets: getDiffHeader(page), at: 'right' },
  ]);
  await page.screenshot({ path: `${STUDIO_GUIDE_IMAGES}review.png` });

  // the project's release
  await page
    .locator('#user-guide-callouts')
    .evaluate((layer) => layer.remove());
  await page.getByTitle(/^Project$/u).click();
  const project = page.locator('.side-bar');
  await project.getByText('RELEASE', { exact: true }).click();
  await project.getByText('Map employee records').waitFor();
  await page.mouse.move(1000, 700);
  await markCallouts(page, [
    {
      n: 1,
      targets: [project.getByPlaceholder('Release notes')],
      at: 'inside-right',
    },
    {
      n: 2,
      targets: [button(project, 'MAJOR'), button(project, 'PATCH')],
      at: 'below',
    },
    {
      n: 3,
      targets: [
        project.getByText('LATEST RELEASE', { exact: true }),
        project.getByText('Firms and their employees'),
      ],
      at: 'inside-right',
    },
    {
      n: 4,
      targets: [
        project.getByText('COMMITTED REVIEWS', { exact: true }),
        project.getByText('Map employee records'),
        project.getByText('Grace Hopper'),
        project.getByText('Ada Lovelace'),
      ],
      at: 'below',
    },
  ]);
  await saveRegionDownTo(
    page,
    `${STUDIO_GUIDE_IMAGES}release.png`,
    project,
    project.getByText('Map employee records'),
    56,
  );
});
