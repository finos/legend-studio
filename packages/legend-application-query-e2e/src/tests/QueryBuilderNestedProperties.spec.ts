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
  expectColumnValues,
  getExplorer,
  getFilterPanel,
  getProjectionPanel,
  openDataSpaceQuery,
  project,
  runQuery,
} from '../support/QueryBuilderHelpers.js';
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
} from '../support/QueryProtocol.js';

let captured: CapturedEngineRequests;

/** Expand `COVIDData.demographics` in the explorer, revealing its properties. */
const expandDemographics = async (page: Page): Promise<void> => {
  await getExplorer(page).getByText('Demographics', { exact: true }).click();
  await expect(
    getExplorer(page).getByText('State', { exact: true }),
  ).toBeVisible();
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
  await openDataSpaceQuery(page);
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
    .dragTo(getProjectionPanel(page));
  await expect(
    page.getByTestId('QUERY_BUILDER_TDS_PROJECTION_COLUMN'),
  ).toHaveCount(1);

  const projection = getChainedFunction(
    (await runQuery(page, captured)).function,
    1,
  );
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
  // each row holds its instance's state
  await expectColumnValues(page, 'Demographics/State', [
    'NY',
    'NJ',
    'CA',
    'NY',
    'TX',
    'NJ',
    'CA',
    'NY',
  ]);
});

test('a nested property can be filtered on', async ({ page }) => {
  const filterPanel = getFilterPanel(page);

  await project(page, ['Cases']);
  await expandDemographics(page);
  await getExplorer(page)
    .getByText('State', { exact: true })
    .dragTo(filterPanel);

  // a new condition opens its (typeahead) value editor straight away
  await filterPanel.getByRole('combobox').fill('NY');
  await page.keyboard.press('Enter');
  await expect(filterPanel.getByText('"NY"')).toBeVisible();

  const lambda = (await runQuery(page, captured)).function;
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
  // the cases of the instances in NY
  await expectColumnValues(page, 'Cases', ['250', '420', '640']);
  // whatever suggestions typing the value looked up (through the execute
  // endpoint too), the run is the only query executed
  expect(captured.executeInputs).toHaveLength(1);
});
