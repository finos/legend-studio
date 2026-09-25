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
  asCollection,
  asFunction,
  asProperty,
  at,
  getChainedFunction,
  getCollectionValues,
  getFunctionChain,
  getLambdaBody,
  getValue,
  type V1_ExecuteInput,
  type V1_Lambda,
} from '../support/QueryProtocol.js';

// Deep-link straight into the query builder for the mock data space served
// by the mock depot server (see `@finos/legend-fixture-mock-server`)
const TEST_DATA_SPACE_QUERY_URL =
  'extensions/dataspace/org.finos.legend.test:legend-query-test:0.0.1/test::DataSpace/dummyContext';

let captured: CapturedEngineRequests;

/** Project `Case Type` (grouped by) and `Cases` (aggregated). */
const buildProjection = async (page: Page): Promise<Locator> => {
  const explorer = page.getByTestId('query__builder__explorer');
  const projectionPanel = page.getByTestId('query__builder__tds__projection');
  await explorer
    .getByText('Case Type', { exact: true })
    .dragTo(projectionPanel);
  await explorer.getByText('Cases', { exact: true }).dragTo(projectionPanel);
  return page
    .getByTestId('QUERY_BUILDER_TDS_PROJECTION_COLUMN')
    .filter({ hasText: 'Cases' });
};

const chooseAggregateOperator = async (
  page: Page,
  column: Locator,
  operator: string,
): Promise<void> => {
  await column.getByTitle('Choose Aggregate Operator...').click();
  await page
    .locator(
      '.query-builder__projection__column__aggregate__operator__dropdown__option',
      { hasText: new RegExp(`^${operator}$`) },
    )
    .click();
};

/** Run the query and return the lambda the app sent to the engine. */
const runAndCaptureLambda = async (page: Page): Promise<V1_Lambda> => {
  await page
    .getByTestId('query__builder__result__panel')
    .getByText('Run Query', { exact: true })
    .click();
  await expect
    .poll(() => captured.executeInputs.length, { timeout: 30_000 })
    .toBeGreaterThan(0);
  return (at(captured.executeInputs, 0) as unknown as V1_ExecuteInput).function;
};

/** The single `agg(...)` of a `groupBy` query. */
const getAggregation = (lambda: V1_Lambda) =>
  asFunction(
    at(asCollection(at(getChainedFunction(lambda, 1).parameters, 2)).values, 0),
    'agg',
  );

test.beforeEach(async ({ page }) => {
  captured = await setupEngineMock(page);
  await page.goto(TEST_DATA_SPACE_QUERY_URL);
  await expect(
    page
      .getByTestId('query__builder__explorer')
      .getByText('Cases', { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
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
  await page
    .getByTestId('query__builder__explorer')
    .getByText('Id', { exact: true })
    .dragTo(weightDropZone);
  await expect(casesColumn.getByText('Drop weight value')).toBeHidden();

  const lambda = await runAndCaptureLambda(page);
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

  const lambda = await runAndCaptureLambda(page);
  expect(getFunctionChain(lambda)).toEqual(['take', 'groupBy', 'getAll']);

  const aggregation = getAggregation(lambda);
  expect(
    asProperty(getLambdaBody(at(aggregation.parameters, 0))).property,
  ).toBe('cases');
  const reducer = asFunction(getLambdaBody(at(aggregation.parameters, 1)));
  expect(reducer.function).toContain('percentile');
  // the UI takes a percentage, the protocol carries the fraction
  expect(getValue(at(reducer.parameters, 1))).toBe(0.9);
});
