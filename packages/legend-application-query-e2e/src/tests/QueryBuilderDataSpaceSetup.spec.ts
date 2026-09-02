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

import { test, expect, type Page } from '@playwright/test';
import { setupEngineMock } from '../support/EngineMock.js';
import {
  EXTRA_DATA_SPACE_TITLE_PREFIX,
  mockAdditionalDataSpaces,
  mockSecondExecutionContext,
  SECOND_EXECUTION_CONTEXT_NAME,
} from '../support/DepotMock.js';

// Deep-link straight into the query builder for the mock data space served
// by the mock depot server (see `@finos/legend-fixture-mock-server`)
const TEST_DATA_SPACE_QUERY_URL =
  'extensions/dataspace/org.finos.legend.test:legend-query-test:0.0.1/test::DataSpace/dummyContext';

const DATA_SPACE_COUNT = 10;

const openQueryBuilder = async (page: Page): Promise<void> => {
  await page.goto(TEST_DATA_SPACE_QUERY_URL);
  await expect(
    page
      .getByTestId('query__builder__explorer')
      .getByText('Cases', { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
};

test.beforeEach(async ({ page }) => {
  await setupEngineMock(page);
});

test('the data space selector lists every data space from depot', async ({
  page,
}) => {
  await mockAdditionalDataSpaces(page, DATA_SPACE_COUNT);
  await openQueryBuilder(page);

  const dataSpaceSelector = page.getByRole('combobox', {
    name: 'Data Space',
  });
  await dataSpaceSelector.click();
  const options = page.locator('.selector-input__option');

  // the dropdown is virtualized (`react-window`), so only the options in
  // view exist in the DOM — the selector's own status message is what
  // reports the full size of the list
  await expect(
    page.getByText(`${DATA_SPACE_COUNT} results available`),
  ).toBeVisible();
  await expect(
    options.filter({ hasText: `${EXTRA_DATA_SPACE_TITLE_PREFIX} 1` }),
  ).toBeVisible();

  // searching reaches the entries virtualization keeps out of the DOM,
  // proving every data space depot returned is selectable
  const lastDataSpaceTitle = `${EXTRA_DATA_SPACE_TITLE_PREFIX} ${DATA_SPACE_COUNT - 1}`;
  await dataSpaceSelector.fill(lastDataSpaceTitle);
  await expect(options).toHaveCount(1);
  await expect(options.filter({ hasText: lastDataSpaceTitle })).toBeVisible();
});

test('a data space with one execution context shows no context selector', async ({
  page,
}) => {
  await openQueryBuilder(page);

  // the selector is only worth showing when there is a choice to make
  await expect(page.getByRole('combobox', { name: 'Context' })).toHaveCount(0);
});

test('execution contexts can be listed and switched', async ({ page }) => {
  await mockSecondExecutionContext(page);
  await openQueryBuilder(page);

  const contextSelector = page.getByRole('combobox', { name: 'Context' });
  await expect(contextSelector).toBeVisible();

  // the deep link selects `dummyContext`; contexts are labelled by name
  const contextGroup = page
    .locator('.query-builder__setup__config-group__item')
    .filter({ has: contextSelector });
  await expect(contextGroup).toContainText('dummyContext');

  await contextSelector.click();
  const options = page.locator('.selector-input__option');
  await expect(options).toHaveCount(2);
  await expect(options.filter({ hasText: 'dummyContext' })).toBeVisible();
  await expect(
    options.filter({ hasText: SECOND_EXECUTION_CONTEXT_NAME }),
  ).toBeVisible();

  // switching updates the selection
  await options.filter({ hasText: SECOND_EXECUTION_CONTEXT_NAME }).click();
  await expect(contextGroup).toContainText(SECOND_EXECUTION_CONTEXT_NAME);
});

test('the runtime selector can be enabled and lists the compatible runtime', async ({
  page,
}) => {
  await openQueryBuilder(page);

  // the runtime selector is hidden until switched on from the settings menu
  await expect(page.getByRole('combobox', { name: 'Runtime' })).toHaveCount(0);
  await page.getByTitle('Show Settings...').click();
  await page.getByText('Show Runtime Selector').click();

  const runtimeSelector = page.getByRole('combobox', { name: 'Runtime' });
  await expect(runtimeSelector).toBeVisible();

  const runtimeGroup = page
    .locator('.query-builder__setup__config-group__item')
    .filter({ has: runtimeSelector });
  await expect(runtimeGroup).toContainText('H2Runtime');
});

test('the data space query setup link can be copied to the clipboard', async ({
  page,
}) => {
  await openQueryBuilder(page);

  await page
    .getByTitle('copy data space query set up link to clipboard')
    .click();

  // the copied link is an absolute address that reopens this exact setup:
  // same project coordinates, data space, and execution context
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain('/query/');
  expect(link).toContain('org.finos.legend.test:legend-query-test:0.0.1');
  expect(link).toContain('test::DataSpace');
  expect(link).toContain('dummyContext');
});
