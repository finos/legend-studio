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

import { test, expect, type Locator, type Page } from '@playwright/test';
import {
  setupEngineMock,
  type CapturedEngineRequests,
} from '../support/EngineMock.js';
import {
  chooseAggregateOperator,
  expectColumnValues,
  getColumnValues,
  getExplorer,
  getProjectionColumns,
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
  getFunctionChain,
  getLambdaBody,
  getValue,
  type V1_Lambda,
} from '../support/QueryProtocol.js';

let captured: CapturedEngineRequests;

/** Project `Case Type` (grouped by) and `Cases` (aggregated). */
const buildProjection = async (page: Page): Promise<Locator> => {
  await project(page, ['Case Type', 'Cases']);
  return getProjectionColumns(page).filter({ hasText: 'Cases' });
};

/** The single `agg(...)` of a `groupBy` query. */
const getAggregation = (lambda: V1_Lambda) =>
  asFunction(
    at(asCollection(at(getChainedFunction(lambda, 1).parameters, 2)).values, 0),
    'agg',
  );

/**
 * The numeric values of a result column, top to bottom — for aggregates
 * whose exact decimal rendering isn't what's under test.
 */
const getColumnNumbers = async (
  page: Page,
  column: string,
): Promise<number[]> => {
  await expect
    .poll(async () => (await getColumnValues(page, column)).length)
    .toBeGreaterThan(0);
  return (await getColumnValues(page, column)).map((value) =>
    Number(value.replaceAll(',', '')),
  );
};

test.beforeEach(async ({ page }) => {
  captured = await setupEngineMock(page);
  await openDataSpaceQuery(page);
});

test('a weighted average needs a weight column and reaches the lambda', async ({
  page,
}) => {
  const casesColumn = await buildProjection(page);
  await chooseAggregateOperator(page, casesColumn, 'wavg');

  // wavg is incomplete until a weight column is supplied
  const weightDropZone = page.getByTestId('query__builder__wavg__dropzone');
  await expect(weightDropZone).toBeVisible();
  await expect(casesColumn.getByText('Drop weight value')).toBeVisible();

  // weight by a different column than the aggregated one, so the assertions
  // below can tell the value slot apart from the weight slot
  await getExplorer(page)
    .getByText('Id', { exact: true })
    .dragTo(weightDropZone);
  await expect(casesColumn.getByText('Drop weight value')).toBeHidden();

  const lambda = (await runQuery(page, captured)).function;
  expect(getFunctionChain(lambda)).toEqual(['take', 'groupBy', 'getAll']);
  expect(
    getCollectionValues(at(getChainedFunction(lambda, 1).parameters, 3)),
  ).toEqual(['Case Type', 'Cases (wavg)']);

  // the mapper pairs the aggregated column with the chosen weight column,
  // and the reducer applies `wavg`
  const aggregation = getAggregation(lambda);
  const mapper = asFunction(getLambdaBody(at(aggregation.parameters, 0)));
  expect(mapper.function).toContain('wavgRowMapper');
  expect(asProperty(at(mapper.parameters, 0)).property).toBe('cases');
  expect(asProperty(at(mapper.parameters, 1)).property).toBe('id');
  asFunction(getLambdaBody(at(aggregation.parameters, 1)), 'wavg');

  // one row per case type, each averaging its cases weighted by id: e.g.
  // `Active` is (180 * 3 + 95 * 5) / (3 + 5)
  await expectColumnValues(page, 'Case Type', ['Confirmed', 'Active', 'Death']);
  const averages = (await getColumnNumbers(page, 'Cases (wavg)')).map((value) =>
    value.toFixed(3),
  );
  expect(averages).toEqual(['532.000', '126.875', '201.727']);
});

test('a percentile aggregation takes an argument and reaches the lambda', async ({
  page,
}) => {
  const casesColumn = await buildProjection(page);
  await chooseAggregateOperator(page, casesColumn, 'percentile');
  await expect(
    casesColumn.locator(
      '.query-builder__projection__column__aggregate__operator__label',
    ),
  ).toContainText('percentile');

  // the percentile value is configured through its own popover
  await casesColumn.getByTitle('Set Percentile Argument(s)...').click();
  const percentilePanel = page.getByTestId('query__builder__percentile__panel');
  await expect(percentilePanel).toBeVisible();
  await percentilePanel.locator('input').first().fill('90');
  // the popover applies its arguments when it closes
  await page.keyboard.press('Escape');
  await expect(percentilePanel).toBeHidden();

  const lambda = (await runQuery(page, captured)).function;
  expect(getFunctionChain(lambda)).toEqual(['take', 'groupBy', 'getAll']);

  const aggregation = getAggregation(lambda);
  expect(
    asProperty(getLambdaBody(at(aggregation.parameters, 0))).property,
  ).toBe('cases');
  const reducer = asFunction(getLambdaBody(at(aggregation.parameters, 1)));
  expect(reducer.function).toContain('percentile');
  // the UI takes a percentage, the protocol carries the fraction
  expect(getValue(at(reducer.parameters, 1))).toBe(0.9);

  // the 90th percentile of each case type's cases, interpolated: e.g.
  // `Active` (95, 180) is 95 + 0.9 * (180 - 95)
  await expectColumnValues(page, 'Case Type', ['Confirmed', 'Active', 'Death']);
  const percentiles = (await getColumnNumbers(page, 'Cases (percentile)')).map(
    (value) => value.toFixed(1),
  );
  expect(percentiles).toEqual(['601.6', '171.5', '385.7']);
});

test('grouping sums each group and counts its members', async ({ page }) => {
  await project(page, ['Case Type', 'Cases', 'Id']);
  const columns = getProjectionColumns(page);
  await chooseAggregateOperator(
    page,
    columns.filter({ hasText: 'Cases' }),
    'sum',
  );
  await chooseAggregateOperator(
    page,
    columns.filter({ has: page.getByText('Id', { exact: true }) }),
    'count',
  );

  const lambda = (await runQuery(page, captured)).function;
  expect(getFunctionChain(lambda)).toEqual(['take', 'groupBy', 'getAll']);

  await expectColumnValues(page, 'Case Type', ['Confirmed', 'Active', 'Death']);
  await expectColumnValues(page, 'Cases (sum)', ['1,703', '275', '497']);
  await expectColumnValues(page, 'Id (count)', ['4', '2', '2']);
});
