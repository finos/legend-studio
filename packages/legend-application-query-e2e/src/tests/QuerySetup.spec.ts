/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import { test, expect } from '@playwright/test';
import { setupEngineMock } from '../support/EngineMock.js';

test.beforeEach(async ({ page }) => {
  await setupEngineMock(page);
});

test('query setup landing page shows entry actions', async ({ page }) => {
  await page.goto('setup');
  await expect(page.getByText('What do you want to do today')).toBeVisible();
  await expect(page.getByText('Open an existing query')).toBeVisible();
  await expect(page.getByText('Create query from data space')).toBeVisible();
});

test('existing queries can be searched and listed', async ({ page }) => {
  await page.goto('setup');
  await page.getByText('Open an existing query').click();
  await expect(page).toHaveURL(/\/setup\/existing-query/);

  const searchInput = page.getByPlaceholder('Search for queries by name or ID');
  await expect(searchInput).toBeVisible();
  await searchInput.fill('MockTest');
  await expect(page.getByText('MockTestQuery')).toBeVisible();
});

test('query creator lists data products from depot', async ({ page }) => {
  await page.goto('setup');
  await page.getByText('Create query from data space').click();

  const dataProductSelector = page.locator('.selector-input__control', {
    hasText: 'Search for data product...',
  });
  await expect(dataProductSelector).toBeVisible();
  await dataProductSelector.click();
  await expect(
    page.locator('.selector-input__option', { hasText: 'Test DataSpace' }),
  ).toBeVisible();
});
