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
import { GUIDE_DATA_SPACE_TITLE } from './GuideProject.js';
import {
  getSetupSelector,
  openGuideDataSpace,
  openNewQuery,
} from './GuideHelpers.js';
import {
  QUERY_GUIDE_IMAGES,
  markCallouts,
  saveRegion,
} from './UserGuideCallouts.js';

/** A row of the setup panel, by its label, e.g. `Context` */
const getSetupRow = (page: Page, label: string): Locator =>
  page.locator('.query-builder__setup__config-group__item').filter({
    has: getSetupSelector(page, label),
  });

/**
 * Opens the data space search on the guide's data space, which shows it in
 * the data space viewer
 */
const openDataSpaceSearch = async (page: Page): Promise<Locator> => {
  await openNewQuery(page);
  await page.getByTitle('Open advanced search for data space...').click();
  const dialog = page.getByRole('dialog');
  await dialog.locator('.selector-input__control').click();
  await page
    .locator('.selector-input__option', { hasText: GUIDE_DATA_SPACE_TITLE })
    .click();
  await expect(dialog.getByTitle('Models Documentation')).toBeVisible();
  return dialog;
};

/**
 * Scrolls the data space viewer to one of its sections, by its heading, e.g.
 * `Models Documentation`, below the viewer's header
 */
const scrollToSection = async (
  dialog: Locator,
  heading: string,
): Promise<Locator> => {
  const title = dialog
    .locator('[class*="wiki__section__header__label"]', {
      hasText: new RegExp(`^${heading}$`, 'iu'),
    })
    .first();
  await title.evaluate((element) => {
    let container = element.parentElement;
    while (
      container &&
      !(
        ['auto', 'scroll'].includes(getComputedStyle(container).overflowY) &&
        container.scrollHeight > container.clientHeight
      )
    ) {
      container = container.parentElement;
    }
    if (!container) {
      throw new Error(`No scrolling container around '${element.textContent}'`);
    }
    // below the viewer's header, with the data space's title, which stays on
    // top as the viewer scrolls
    container.scrollTop +=
      element.getBoundingClientRect().top -
      container.getBoundingClientRect().top -
      150;
  });
  return title;
};

test('a data space, its context, runtime and entity', async ({ page }) => {
  await openGuideDataSpace(page);
  await page.getByTitle('Show Settings...').first().click();
  await page.getByText('Show Runtime Selector').click();
  await expect(getSetupSelector(page, 'Runtime')).toBeVisible();
  await expect(page.getByRole('menu')).toHaveCount(0);

  const templates = page.locator('.query-builder__data-space__template-query');
  await markCallouts(page, [
    { n: 1, targets: [getSetupRow(page, 'Data Space')], at: 'right' },
    { n: 2, targets: [getSetupRow(page, 'Context')], at: 'right' },
    { n: 3, targets: [getSetupRow(page, 'Runtime')], at: 'right' },
    { n: 4, targets: [getSetupRow(page, 'Entity')], at: 'right' },
    {
      n: 5,
      targets: [
        page.getByTitle('copy data space query set up link to clipboard'),
      ],
      at: 'left',
    },
    {
      n: 6,
      targets: [page.getByTitle('Show Settings...').first()],
      at: 'above',
    },
    {
      n: 7,
      targets: [templates.getByRole('button', { name: /Templates/u })],
      at: 'left',
    },
  ]);
  await saveRegion(page, `${QUERY_GUIDE_IMAGES}data-space.png`, [
    page.locator('.query-builder__setup__config-group'),
    templates,
  ]);
});

test("the data space's templates", async ({ page }) => {
  await openGuideDataSpace(page);
  await page
    .locator('.query-builder__data-space__template-query')
    .getByRole('button', { name: /Templates/u })
    .click();
  const panel = page.locator(
    '.query-builder__data-space__template-query-panel',
  );
  await expect(panel.getByText('Headcount by firm')).toBeVisible();

  const template = panel
    .locator('.query-builder__data-space__template-query-panel__query')
    .filter({ hasText: 'Headcount by firm' });
  await markCallouts(page, [
    {
      n: 1,
      targets: [
        template.locator(
          '.query-builder__data-space__template-query-panel__query__entry',
        ),
      ],
      at: 'below',
    },
    { n: 2, targets: [template.getByTitle('Visit...')], at: 'right' },
  ]);
  // the list ends well above the panel's bottom
  await saveRegion(page, `${QUERY_GUIDE_IMAGES}data-space-templates.png`, [
    page.locator('.query-builder__data-space__template-query'),
    panel.locator('.query-builder__data-space__template-query-panel__header'),
    template,
  ]);
});

test('searching data spaces, and what a data space documents', async ({
  page,
}) => {
  const dialog = await openDataSpaceSearch(page);
  await scrollToSection(dialog, 'Models Documentation');

  await markCallouts(page, [
    {
      n: 1,
      targets: [dialog.locator('.selector-input__control')],
      at: 'below',
    },
    {
      n: 2,
      targets: [dialog.getByTitle(/Toggle show data spaces from snapshot/u)],
      at: 'below',
    },
    {
      n: 3,
      targets: [dialog.getByTitle('Proceed to create query')],
      at: 'below',
    },
    {
      n: 4,
      targets: [dialog.locator('.data-space__viewer__activity-bar')],
      at: 'right',
    },
    {
      n: 5,
      targets: [dialog.locator('.models-documentation__viewer__wiki__section')],
      at: 'inside-right',
    },
  ]);
  await page.screenshot({
    path: `${QUERY_GUIDE_IMAGES}data-space-search.png`,
  });
});

test("a data space's quick start", async ({ page }) => {
  const dialog = await openDataSpaceSearch(page);
  await scrollToSection(dialog, 'Quick Start');
  const executable = dialog
    .locator('.data-space__viewer__quickstart__item')
    .first();

  const grid = executable.locator('.ag-root-wrapper').first();
  const lastRow = grid.locator('.ag-center-cols-container .ag-row').last();
  await markCallouts(page, [
    {
      n: 1,
      targets: [
        executable.locator('.data-space__viewer__quickstart__item__header'),
      ],
      at: 'right',
    },
    {
      n: 2,
      targets: [
        executable.locator(
          '.data-space__viewer__quickstart__item__content__tabs',
        ),
        executable.locator(
          '.data-space__viewer__quickstart__item__content__action-tab-group',
        ),
      ],
      at: 'right',
    },
    {
      n: 3,
      targets: [grid.locator('.ag-header'), lastRow],
      at: 'right',
    },
  ]);
  // the grid's rows end well above its bottom
  await saveRegion(
    page,
    `${QUERY_GUIDE_IMAGES}data-space-quick-start.png`,
    [
      dialog.locator('[class*="wiki__section__header__label"]', {
        hasText: /^Quick Start$/iu,
      }),
      lastRow,
    ],
    32,
  );
});

test('about the data space', async ({ page }) => {
  await openGuideDataSpace(page);
  await page.getByRole('button', { name: 'Help...' }).click();
  await page.getByText('About Data Space').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Execution Context')).toBeVisible();

  const field = (label: string): Locator =>
    dialog.locator('.dataspace-info-modal__field').filter({
      has: page.locator('.dataspace-info-modal__field__label', {
        hasText: new RegExp(`^${label}$`, 'u'),
      }),
    });
  await markCallouts(page, [
    { n: 1, targets: [field('Project')], at: 'left' },
    {
      n: 2,
      targets: [field('Name'), field('Execution Context')],
      at: 'left',
    },
    {
      n: 3,
      targets: [
        field('Mapping'),
        field('Runtime'),
        field('Store'),
        field('Connection'),
      ],
      at: 'left',
    },
    { n: 4, targets: [field('Configuration')], at: 'left' },
    {
      n: 5,
      targets: [dialog.getByRole('button', { name: 'Open Data Space' })],
      at: 'below',
    },
  ]);
  await saveRegion(page, `${QUERY_GUIDE_IMAGES}about-data-space.png`, [
    dialog.locator('.dataspace-info-modal'),
  ]);
});
