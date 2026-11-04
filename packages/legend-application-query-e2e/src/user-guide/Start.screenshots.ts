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
import { GUIDE_PROJECT } from './GuideProject.js';
import {
  getSetupSelector,
  openNewQuery,
  openSavedQuery,
} from './GuideHelpers.js';
import { setupGuideQuery } from './GuideSetup.js';
import {
  QUERY_GUIDE_IMAGES,
  markCallouts,
  saveRegion,
} from './UserGuideCallouts.js';

/** A field of the setup wizard, by its title, e.g. `Project` */
const getWizardField = (page: Page, title: string) =>
  page.locator('.query-setup__wizard__group').filter({
    has: page.locator('.query-setup__wizard__group__title', {
      hasText: new RegExp(`^${title}$`, 'u'),
    }),
  });

const chooseWizardOption = async (
  page: Page,
  title: string,
  option: string | RegExp,
): Promise<void> => {
  await getWizardField(page, title).getByRole('combobox').click();
  await page.getByRole('option').filter({ hasText: option }).first().click();
};

test('a new query, and the data spaces to start it on', async ({ page }) => {
  await openNewQuery(page);
  await getSetupSelector(page, 'Data Space').click();
  const options = page.locator('.selector-input__menu');
  await expect(
    options.locator('.selector-input__option', { hasText: 'Firm data' }),
  ).toBeVisible();

  await markCallouts(page, [
    {
      n: 1,
      targets: [page.locator('.query-editor__logo-header__combo')],
      at: 'right',
    },
    {
      n: 2,
      targets: [
        page
          .locator('.query-builder__setup__config-group__item__selector')
          .first(),
        options,
      ],
      at: 'below',
    },
    {
      n: 3,
      targets: [page.getByTitle('Open advanced search for data space...')],
      at: 'above',
    },
    {
      n: 4,
      targets: [page.getByRole('button', { name: 'Load Query' })],
      at: 'below',
    },
  ]);
  // the empty panels below the list show nothing more
  await saveRegion(page, `${QUERY_GUIDE_IMAGES}start.png`, [
    page.locator('.query-editor__logo-header'),
    options,
  ]);
});

test('the query setup page', async ({ page }) => {
  await setupGuideQuery(page);
  await page.goto('setup?showAdvancedActions=true&showAllGroups=true');
  await expect(page.getByText('Open Legend Studio')).toBeVisible();

  const action = (label: string) =>
    page.locator('.query-setup__landing-page__action', { hasText: label });
  await markCallouts(page, [
    { n: 1, targets: [action('Open an existing query')], at: 'left' },
    { n: 2, targets: [action('Create query from data space')], at: 'right' },
    {
      n: 3,
      targets: [
        action('Create new query on a mapping'),
        action('Clone an existing service query'),
      ],
      at: 'right',
    },
    {
      n: 4,
      targets: [
        page.locator('.query-setup__landing-page__action-group', {
          hasText: 'Productionization',
        }),
      ],
      at: 'left',
    },
    { n: 5, targets: [action('Open Legend Studio')], at: 'left' },
    { n: 6, targets: [page.getByTitle('Show settings...')], at: 'right' },
  ]);
  await saveRegion(page, `${QUERY_GUIDE_IMAGES}query-setup.png`, [
    page.locator('.query-setup__landing-page'),
  ]);
});

test('opening an existing query', async ({ page }) => {
  await setupGuideQuery(page);
  // the queries opened last are the ones the page lists first
  await openSavedQuery(page, 'firm-headcount');
  await openSavedQuery(page, 'people-at-a-firm');
  await page.goto('setup/existing-query');
  await expect(
    page.getByText('Showing 2 recently viewed queries'),
  ).toBeVisible();

  const firstResult = page.locator('.query-loader__result').first();
  await markCallouts(page, [
    { n: 1, targets: [page.getByTitle('Back to Main Menu')], at: 'left' },
    {
      n: 2,
      targets: [page.getByPlaceholder('Search for queries by name or ID')],
      at: 'right',
    },
    {
      n: 3,
      targets: [page.getByRole('button', { name: 'Mine Only' })],
      at: 'right',
    },
    {
      n: 4,
      targets: [
        page.getByText('Showing 2 recently viewed queries'),
        page.locator('.query-loader__result').last(),
      ],
      at: 'left',
    },
    {
      n: 5,
      targets: [firstResult.getByTitle('More Actions...')],
      at: 'above',
    },
  ]);
  await saveRegion(page, `${QUERY_GUIDE_IMAGES}existing-query.png`, [
    page.locator('.query-setup__wizard__header'),
    page.locator('.query-loader__result').last(),
  ]);
});

test('a new query on a mapping', async ({ page }) => {
  await setupGuideQuery(page);
  await page.goto('setup/manual');
  await chooseWizardOption(
    page,
    'Project',
    `${GUIDE_PROJECT.groupId}.${GUIDE_PROJECT.artifactId}`,
  );
  await chooseWizardOption(page, 'Version', GUIDE_PROJECT.versionId);
  await chooseWizardOption(page, 'Mapping', /^FirmMapping/u);
  await chooseWizardOption(page, 'Runtime', /^FirmRuntime/u);

  await markCallouts(page, [
    { n: 1, targets: [getWizardField(page, 'Project')], at: 'right' },
    { n: 2, targets: [getWizardField(page, 'Version')], at: 'right' },
    { n: 3, targets: [getWizardField(page, 'Mapping')], at: 'right' },
    { n: 4, targets: [getWizardField(page, 'Runtime')], at: 'right' },
    { n: 5, targets: [page.getByTitle('Create a new query')], at: 'right' },
  ]);
  await saveRegion(page, `${QUERY_GUIDE_IMAGES}mapping-query.png`, [
    page.locator('.query-setup__wizard'),
  ]);
});
