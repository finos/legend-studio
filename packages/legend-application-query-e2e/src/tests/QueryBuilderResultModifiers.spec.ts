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
import {
  setupEngineMock,
  type CapturedEngineRequests,
} from '../support/EngineMock.js';
import {
  expectColumnValues,
  getProjectionColumns,
  openDataSpaceQuery,
  openQueryOptions,
  project,
  runQuery,
} from '../support/QueryBuilderHelpers.js';
import {
  asCollection,
  asFunction,
  at,
  getChainedFunction,
  getFunctionChain,
  getValue,
} from '../support/QueryProtocol.js';

let captured: CapturedEngineRequests;

/** Project two columns so result modifiers have something to act on. */
const buildProjection = async (page: Page): Promise<void> => {
  await project(page, ['Case Type', 'Cases']);
  await expect(getProjectionColumns(page)).toHaveCount(2);
};

test.beforeEach(async ({ page }) => {
  captured = await setupEngineMock(page);
  await openDataSpaceQuery(page);
});

test('a sort column reaches the lambda and its direction can be flipped', async ({
  page,
}) => {
  await buildProjection(page);
  const modal = await openQueryOptions(page);

  // add a sort on the first column, which defaults to ascending
  await modal.getByRole('button', { name: 'Add Value' }).click();
  await expect(modal.getByText('asc')).toBeVisible();
  await modal.getByRole('button', { name: 'Apply' }).click();

  const lambda = (await runQuery(page, captured)).function;
  expect(getFunctionChain(lambda)).toEqual([
    'take',
    'sort',
    'project',
    'getAll',
  ]);
  const sortSpecs = asCollection(
    at(getChainedFunction(lambda, 1).parameters, 1),
  );
  const ascending = asFunction(at(sortSpecs.values, 0), 'asc');
  expect(getValue(at(ascending.parameters, 0))).toBe('Case Type');
  await expectColumnValues(page, 'Case Type', [
    'Active',
    'Active',
    'Confirmed',
    'Confirmed',
    'Confirmed',
    'Confirmed',
    'Death',
    'Death',
  ]);

  // flipping the direction in the UI changes the sort function
  const reopened = await openQueryOptions(page);
  await reopened.getByTitle('Choose SortBy Operator...').click();
  await expect(reopened.getByText('desc')).toBeVisible();
  await reopened.getByRole('button', { name: 'Apply' }).click();

  const resorted = (await runQuery(page, captured)).function;
  const descending = asFunction(
    at(
      asCollection(at(getChainedFunction(resorted, 1).parameters, 1)).values,
      0,
    ),
    'desc',
  );
  expect(getValue(at(descending.parameters, 0))).toBe('Case Type');
});

test('eliminating duplicate rows adds distinct to the lambda', async ({
  page,
}) => {
  await buildProjection(page);
  const modal = await openQueryOptions(page);

  await modal
    .locator('.panel__content__form__section')
    .filter({ hasText: 'Eliminate Duplicate Rows' })
    .locator('.panel__content__form__section__toggler')
    .click();
  await modal.getByRole('button', { name: 'Apply' }).click();

  const lambda = (await runQuery(page, captured)).function;
  expect(getFunctionChain(lambda)).toEqual([
    'take',
    'distinct',
    'project',
    'getAll',
  ]);
});

test('a row limit and slice reach the lambda', async ({ page }) => {
  await buildProjection(page);
  const modal = await openQueryOptions(page);

  await modal.getByRole('textbox', { name: 'Limit Results' }).fill('50');
  // the modal's three textboxes are `Limit Results` followed by the two
  // bounds of the slice range
  const textboxes = modal.getByRole('textbox');
  await expect(textboxes).toHaveCount(3);
  await textboxes.nth(1).fill('1');
  await textboxes.nth(2).fill('5');
  await modal.getByRole('button', { name: 'Apply' }).click();

  const lambda = (await runQuery(page, captured)).function;
  expect(getFunctionChain(lambda)).toEqual([
    'slice',
    'take',
    'project',
    'getAll',
  ]);

  // slice carries the requested range
  const slice = getChainedFunction(lambda, 0);
  expect(getValue(at(slice.parameters, 1))).toBe(1);
  expect(getValue(at(slice.parameters, 2))).toBe(5);

  // the app fetches one extra row beyond the limit so it can tell the user
  // the results were truncated
  expect(getValue(at(getChainedFunction(lambda, 1).parameters, 1))).toBe(51);

  // rows 1 to 4, counting from 0
  await expectColumnValues(page, 'Cases', ['301', '180', '420', '95']);
});
