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
  asFunction,
  asProperty,
  at,
  getChainedFunction,
  getConstantBindings,
  getLambdaBody,
  getVariableName,
  type V1_ExecuteInput,
} from '../support/QueryProtocol.js';

// Deep-link straight into the query builder for the mock data space served
// by the mock depot server (see `@finos/legend-fixture-mock-server`)
const TEST_DATA_SPACE_QUERY_URL =
  'extensions/dataspace/org.finos.legend.test:legend-query-test:0.0.1/test::DataSpace/dummyContext';

const CONSTANT_NAME = 'confirmedCaseType';
const CONSTANT_VALUE = 'Confirmed';

let captured: CapturedEngineRequests;

/** Open the constants panel and create a single `String` constant. */
const addStringConstant = async (page: Page): Promise<void> => {
  await page
    .getByTestId('query__builder__actions')
    .getByRole('button', { name: 'Advanced' })
    .click();
  await page.getByText('Show Constant(s)').click();

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
  await page.goto(TEST_DATA_SPACE_QUERY_URL);
  await expect(
    page
      .getByTestId('query__builder__explorer')
      .getByText('Cases', { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
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
  const explorer = page.getByTestId('query__builder__explorer');
  const filterPanel = page.getByTestId('query__builder__filter__panel');

  await explorer
    .getByText('Case Type', { exact: true })
    .dragTo(page.getByTestId('query__builder__tds__projection'));
  await addStringConstant(page);

  // drag the constant onto the filter condition's value
  await explorer.getByText('Case Type', { exact: true }).dragTo(filterPanel);
  await page
    .getByTestId('query-builder__constants')
    .getByText(CONSTANT_NAME)
    .dragTo(
      page.getByTestId('query-builder-filter-tree__condition-node__value'),
    );
  await expect(filterPanel.getByText(CONSTANT_NAME)).toBeVisible();

  await page
    .getByTestId('query__builder__result__panel')
    .getByText('Run Query', { exact: true })
    .click();
  await expect
    .poll(() => captured.executeInputs.length, { timeout: 30_000 })
    .toBeGreaterThan(0);

  const lambda = (at(captured.executeInputs, 0) as unknown as V1_ExecuteInput)
    .function;

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
});
