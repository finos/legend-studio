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
import { mockEnrichedModel } from '../support/DepotMock.js';
import {
  setupEngineMock,
  type CapturedEngineRequests,
} from '../support/EngineMock.js';
import {
  asCollection,
  asFunction,
  asProperty,
  at,
  getChainedFunction,
  getCollectionValues,
  getLambdaBody,
  getValue,
  getVariableName,
  type V1_ExecuteInput,
  type V1_Lambda,
} from '../support/QueryProtocol.js';

// Deep-link straight into the query builder for the mock data space served
// by the mock depot server (see `@finos/legend-fixture-mock-server`)
const TEST_DATA_SPACE_QUERY_URL =
  'extensions/dataspace/org.finos.legend.test:legend-query-test:0.0.1/test::DataSpace/dummyContext';

let captured: CapturedEngineRequests;

const getExplorer = (page: Page) =>
  page.getByTestId('query__builder__explorer');

/** Expand `COVIDData.demographics` in the explorer, revealing its properties. */
const expandDemographics = async (page: Page): Promise<void> => {
  await getExplorer(page).getByText('Demographics', { exact: true }).click();
  await expect(
    getExplorer(page).getByText('State', { exact: true }),
  ).toBeVisible();
};

/**
 * Run the query and return the lambda the app sent to the engine.
 *
 * NOTE: string value editors fetch typeahead suggestions through the execute
 * endpoint too, so take the execution the run itself triggered.
 */
const runAndCaptureLambda = async (page: Page): Promise<V1_Lambda> => {
  const executionsBefore = captured.executeInputs.length;
  await page
    .getByTestId('query__builder__result__panel')
    .getByText('Run Query', { exact: true })
    .click();
  await expect
    .poll(() => captured.executeInputs.length, { timeout: 30_000 })
    .toBeGreaterThan(executionsBefore);
  return (
    at(
      captured.executeInputs,
      captured.executeInputs.length - 1,
    ) as unknown as V1_ExecuteInput
  ).function;
};

/**
 * The chain of properties an expression navigates, outermost last, e.g.
 * `['demographics', 'state']` for `$x.demographics.state`, and the variable
 * the navigation starts from.
 */
const getPropertyPath = (
  node: Parameters<typeof asProperty>[0],
): { variable: string; path: string[] } => {
  const path: string[] = [];
  let current = node;
  while (current?._type === 'property') {
    const property = asProperty(current);
    path.unshift(property.property);
    current = property.parameters[0];
  }
  return { variable: getVariableName(current), path };
};

test.beforeEach(async ({ page }) => {
  captured = await setupEngineMock(page);
  await mockEnrichedModel(page);
  await page.goto(TEST_DATA_SPACE_QUERY_URL);
  await expect(
    getExplorer(page).getByText('Cases', { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
});

test('a class-typed property expands to show its own properties', async ({
  page,
}) => {
  const explorer = getExplorer(page);

  // collapsed: only the root class's own `Fips` is listed
  await expect(
    explorer.getByText('Demographics', { exact: true }),
  ).toBeVisible();
  await expect(explorer.getByText('State', { exact: true })).toBeHidden();
  await expect(explorer.getByText('Fips', { exact: true })).toHaveCount(1);

  await expandDemographics(page);

  // expanded: `Demographics` contributes its own `Fips` and `State`
  await expect(explorer.getByText('Fips', { exact: true })).toHaveCount(2);
});

test('a nested property projects along its navigation path', async ({
  page,
}) => {
  await expandDemographics(page);
  await getExplorer(page)
    .getByText('State', { exact: true })
    .dragTo(page.getByTestId('query__builder__tds__projection'));
  await expect(
    page.getByTestId('QUERY_BUILDER_TDS_PROJECTION_COLUMN'),
  ).toHaveCount(1);

  const projection = getChainedFunction(await runAndCaptureLambda(page), 1);
  expect(projection.function).toBe('project');

  // the column reads `x | $x.demographics.state`, navigating the association
  const [columnLambda] = asCollection(at(projection.parameters, 1)).values;
  expect(getPropertyPath(getLambdaBody(columnLambda))).toEqual({
    variable: 'x',
    path: ['demographics', 'state'],
  });
  // and is named after the full path
  expect(getCollectionValues(at(projection.parameters, 2))).toEqual([
    'Demographics/State',
  ]);
});

test('a nested property can be filtered on', async ({ page }) => {
  const explorer = getExplorer(page);
  const filterPanel = page.getByTestId('query__builder__filter__panel');

  await explorer
    .getByText('Cases', { exact: true })
    .dragTo(page.getByTestId('query__builder__tds__projection'));
  await expandDemographics(page);
  await explorer.getByText('State', { exact: true }).dragTo(filterPanel);

  // a new condition opens its (typeahead) value editor straight away
  await filterPanel.getByRole('combobox').fill('NY');
  await page.keyboard.press('Enter');
  await expect(filterPanel.getByText('"NY"')).toBeVisible();

  const lambda = await runAndCaptureLambda(page);
  // filter: `x | $x.demographics.state == 'NY'`
  const condition = asFunction(
    getLambdaBody(at(getChainedFunction(lambda, 2).parameters, 1)),
    'equal',
  );
  expect(getPropertyPath(at(condition.parameters, 0))).toEqual({
    variable: 'x',
    path: ['demographics', 'state'],
  });
  expect(getValue(at(condition.parameters, 1))).toBe('NY');
});
