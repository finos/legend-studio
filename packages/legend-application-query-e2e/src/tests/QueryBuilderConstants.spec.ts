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
  addFilterCondition,
  chooseAdvancedMenuItem,
  expectColumnValues,
  getFilterPanel,
  openDataSpaceQuery,
  project,
  runQuery,
} from '../support/QueryBuilderHelpers.js';
import {
  asFunction,
  asProperty,
  at,
  getChainedFunction,
  getConstantBindings,
  getLambdaBody,
  getVariableName,
} from '../support/QueryProtocol.js';

const CONSTANT_NAME = 'confirmedCaseType';
const CONSTANT_VALUE = 'Confirmed';

let captured: CapturedEngineRequests;

/** Open the constants panel and create a single `String` constant. */
const addStringConstant = async (page: Page): Promise<void> => {
  await chooseAdvancedMenuItem(page, 'Show Constant(s)');

  const constantsPanel = page.getByTestId('query-builder__constants');
  await expect(constantsPanel).toBeVisible();
  await constantsPanel.getByTitle('Add Constant').click();

  const modal = page.getByRole('dialog');
  await expect(modal.getByText('Create Constant')).toBeVisible();
  // the modal's inputs are the name, the type selector, then the value
  const inputs = modal.locator('input');
  await inputs.first().fill(CONSTANT_NAME);
  await inputs.last().fill(CONSTANT_VALUE);
  await modal.getByRole('button', { name: 'Create' }).click();
  await expect(modal).toBeHidden();
};

test.beforeEach(async ({ page }) => {
  captured = await setupEngineMock(page);
  await openDataSpaceQuery(page);
});

test('a constant can be created and is listed with its value', async ({
  page,
}) => {
  await addStringConstant(page);

  const constantsPanel = page.getByTestId('query-builder__constants');
  await expect(constantsPanel.getByText(CONSTANT_NAME)).toBeVisible();
  await expect(constantsPanel.getByText(CONSTANT_VALUE)).toBeVisible();
});

test('a constant can be used as a filter value and reaches the lambda', async ({
  page,
}) => {
  await project(page, ['Case Type']);
  await addStringConstant(page);

  // drag the constant onto the filter condition's value
  await addFilterCondition(page, 'Case Type');
  await page
    .getByTestId('query-builder__constants')
    .getByText(CONSTANT_NAME)
    .dragTo(
      page.getByTestId('query-builder-filter-tree__condition-node__value'),
    );
  await expect(getFilterPanel(page).getByText(CONSTANT_NAME)).toBeVisible();

  const lambda = (await runQuery(page, captured)).function;

  // the constant is bound ahead of the query itself
  expect(getConstantBindings(lambda)).toEqual([
    { name: CONSTANT_NAME, value: CONSTANT_VALUE },
  ]);

  // and the filter references that variable rather than inlining its value
  const condition = asFunction(
    getLambdaBody(at(getChainedFunction(lambda, 2).parameters, 1)),
    'equal',
  );
  expect(asProperty(at(condition.parameters, 0)).property).toBe('caseType');
  expect(getVariableName(at(condition.parameters, 1))).toBe(CONSTANT_NAME);

  // the query runs with the constant's value
  await expectColumnValues(
    page,
    'Case Type',
    Array<string>(4).fill('Confirmed'),
  );
});
