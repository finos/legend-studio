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

import { expect, type Locator, type Page } from '@playwright/test';
import { getExplorer } from '../support/QueryBuilderHelpers.js';
import { GUIDE_DATA_SPACE_TITLE } from './GuideProject.js';
import { setupGuideQuery, type GuideQueryStore } from './GuideSetup.js';

/** A selector of the setup panel, by its label, e.g. `Data Space` */
export const getSetupSelector = (page: Page, label: string): Locator =>
  page.getByRole('combobox', { name: label, exact: true });

/** Opens Legend Query on a new query, as it opens for a new user */
export const openNewQuery = async (page: Page): Promise<GuideQueryStore> => {
  const store = await setupGuideQuery(page);
  await page.goto('');
  await expect(page.getByText('Unsaved Query')).toBeVisible();
  return store;
};

/** Picks `option` of a setup panel selector labelled `label` */
export const chooseSetupOption = async (
  page: Page,
  label: string,
  option: string | RegExp,
): Promise<void> => {
  await getSetupSelector(page, label).click();
  await page.getByRole('option').filter({ hasText: option }).first().click();
};

/**
 * On a new query, picks the guide's data space, then `entity` (see
 * {@link openGuideDataSpace})
 */
export const chooseGuideDataSpace = async (
  page: Page,
  entity: string | undefined = 'Person',
): Promise<void> => {
  await chooseSetupOption(page, 'Data Space', GUIDE_DATA_SPACE_TITLE);
  await expect(getSetupSelector(page, 'Entity')).toBeVisible({
    timeout: 60_000,
  });
  if (entity) {
    await chooseSetupOption(page, 'Entity', new RegExp(`^${entity}`, 'u'));
    await expect(
      getExplorer(page).getByText(entity, { exact: true }).first(),
    ).toBeVisible();
  }
};

/**
 * Opens Legend Query on a new query of the guide's data space, its default
 * context and `entity`, e.g. `Person`; with no entity, the one the data space
 * starts on, so the query is still unchanged
 */
export const openGuideDataSpace = async (
  page: Page,
  entity: string | undefined = 'Person',
): Promise<GuideQueryStore> => {
  const store = await openNewQuery(page);
  await chooseGuideDataSpace(page, entity);
  return store;
};

/**
 * Opens a saved query in the editor, which also makes it one of the
 * recently viewed queries
 */
export const openSavedQuery = async (
  page: Page,
  queryId: string,
): Promise<void> => {
  await page.goto(`edit/${queryId}`);
  await expect(page.getByTitle('Double-click to rename query')).toBeVisible({
    timeout: 60_000,
  });
};

/**
 * Closes a menu by clicking away from it: Escape would leave the page hidden
 * from accessibility roles until the menu is gone
 */
export const closeMenu = async (page: Page): Promise<void> => {
  await page.mouse.click(4, 896);
  await expect(page.getByRole('menu')).toHaveCount(0);
};
