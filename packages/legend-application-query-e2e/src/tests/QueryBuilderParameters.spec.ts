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
  getLambdaBody,
  getVariableName,
  type V1_ExecuteInput,
} from '../support/QueryProtocol.js';

// Deep-link straight into the query builder for the mock data space served
// by the mock depot server (see `@finos/legend-fixture-mock-server`)
const TEST_DATA_SPACE_QUERY_URL =
  'extensions/dataspace/org.finos.legend.test:legend-query-test:0.0.1/test::DataSpace/dummyContext';

const PARAMETER_NAME = 'caseTypeParam';

let captured: CapturedEngineRequests;

/** Open the parameters panel and create a single `String` parameter. */
const addStringParameter = async (page: Page): Promise<void> => {
  await page
    .getByTestId('query__builder__actions')
    .getByRole('button', { name: 'Advanced' })
    .click();
  await page.getByText('Show Parameter(s)').click();

  const parametersPanel = page.getByTestId('query-builder__parameters');
  await expect(parametersPanel).toBeVisible();
  await parametersPanel.getByTitle('Add Parameter').click();

  const parameterModal = page.getByRole('dialog');
  await expect(parameterModal.getByText('Create Parameter')).toBeVisible();
  await parameterModal.locator('input').first().fill(PARAMETER_NAME);
  await parameterModal.getByRole('button', { name: 'Create' }).click();
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

test('a parameter can be created and is listed with its type', async ({
  page,
}) => {
  await addStringParameter(page);

  const parametersPanel = page.getByTestId('query-builder__parameters');
  await expect(parametersPanel.getByText(PARAMETER_NAME)).toBeVisible();
  await expect(parametersPanel.getByText('String')).toBeVisible();
});

test('a parameter can be used as a filter value and reaches the lambda', async ({
  page,
}) => {
  const explorer = page.getByTestId('query__builder__explorer');
  const filterPanel = page.getByTestId('query__builder__filter__panel');

  await explorer
    .getByText('Case Type', { exact: true })
    .dragTo(page.getByTestId('query__builder__tds__projection'));
  await addStringParameter(page);

  // drag the parameter onto the filter condition's value
  await explorer.getByText('Case Type', { exact: true }).dragTo(filterPanel);
  await page
    .getByTestId('query-builder__parameters')
    .getByText(PARAMETER_NAME)
    .dragTo(
      page.getByTestId('query-builder-filter-tree__condition-node__value'),
    );
  await expect(filterPanel.getByText(PARAMETER_NAME)).toBeVisible();

  // running a parameterized query prompts for values first
  await page
    .getByTestId('query__builder__result__panel')
    .getByText('Run Query', { exact: true })
    .click();
  const valuesModal = page.getByRole('dialog');
  await expect(valuesModal.getByText('Set Parameter Values')).toBeVisible();
  await expect(valuesModal.getByText(PARAMETER_NAME)).toBeVisible();
  await valuesModal.locator('input').first().fill('Confirmed');
  await valuesModal.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(
    page.locator('.ag-center-cols-container .ag-row'),
  ).not.toHaveCount(0);

  // the filter must compare against the parameter variable, not a literal
  const executeInput = at(
    captured.executeInputs,
    0,
  ) as unknown as V1_ExecuteInput;
  const lambda = executeInput.function;
  const filterCondition = asFunction(
    getLambdaBody(at(getChainedFunction(lambda, 2).parameters, 1)),
    'equal',
  );
  expect(asProperty(at(filterCondition.parameters, 0)).property).toBe(
    'caseType',
  );
  expect(getVariableName(at(filterCondition.parameters, 1))).toBe(
    PARAMETER_NAME,
  );
});
