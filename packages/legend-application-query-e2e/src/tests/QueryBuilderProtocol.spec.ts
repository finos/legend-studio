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
  chooseAggregateOperator,
  chooseConditionOperator,
  expectColumnValues,
  getFilterPanel,
  getPostFilterPanel,
  getProjectionColumns,
  openDataSpaceQuery,
  project,
  runQuery,
  setConditionValue,
} from '../support/QueryBuilderHelpers.js';
import {
  asCollection,
  asFunction,
  asProperty,
  at,
  getChainedFunction,
  getCollectionProperties,
  getCollectionValues,
  getElementPath,
  getFunctionChain,
  getLambdaBody,
  getValue,
} from '../support/QueryProtocol.js';

/**
 * Build `Case Type`/`Cases` projection, filtered to `Case Type == 'Confirmed'`
 * with a `Cases > 200` post-filter — the query all assertions below describe.
 */
const buildQuery = async (page: Page): Promise<void> => {
  await project(page, ['Case Type', 'Cases']);

  // filter: `Case Type` is 'Confirmed'
  await addFilterCondition(page, 'Case Type');
  await setConditionValue(page, getFilterPanel(page), 'Confirmed');

  // post-filter: `Cases` > 200
  await chooseAdvancedMenuItem(page, 'Show Post-Filter');
  const postFilterPanel = getPostFilterPanel(page);
  await getProjectionColumns(page)
    .filter({ hasText: 'Cases' })
    .getByText('Cases', { exact: true })
    .dragTo(postFilterPanel);
  await chooseConditionOperator(page, postFilterPanel, '>');
  await setConditionValue(page, postFilterPanel, '200');
};

let captured: CapturedEngineRequests;

test.beforeEach(async ({ page }) => {
  captured = await setupEngineMock(page);
  await openDataSpaceQuery(page);
});

test('the query protocol viewer shows the built query', async ({ page }) => {
  await buildQuery(page);

  await chooseAdvancedMenuItem(page, 'Show Protocol');

  // the protocol viewer renders the lambda as JSON
  const protocolViewer = page.getByRole('dialog');
  await expect(protocolViewer).toBeVisible();
  await expect(
    protocolViewer.getByText('"_type": "lambda"').first(),
  ).toBeVisible();
});

test('the generated lambda matches the query built in the UI', async ({
  page,
}) => {
  await buildQuery(page);

  // running the query sends the built lambda to the engine — assert on that
  // payload, which is exactly what a real engine would receive
  const executeInput = await runQuery(page, captured);
  const lambda = executeInput.function;

  // the query builder nests each operation inside the next, so the chain
  // reads outermost (row limit) to innermost (class selection)
  expect(getFunctionChain(lambda)).toEqual([
    'take', // preview row limit
    'filter', // post-filter, over projected rows
    'project', // projection
    'filter', // filter, over class instances
    'getAll', // source class
  ]);

  // the query runs against the data space's mapping and source class
  expect(executeInput.mapping).toBe('test::CovidDataMapping');
  expect(getElementPath(at(getChainedFunction(lambda, 4).parameters, 0))).toBe(
    'test::COVIDData',
  );

  // filter: `x | $x.caseType == 'Confirmed'`
  const filterCondition = asFunction(
    getLambdaBody(at(getChainedFunction(lambda, 3).parameters, 1)),
    'equal',
  );
  expect(asProperty(at(filterCondition.parameters, 0)).property).toBe(
    'caseType',
  );
  expect(getValue(at(filterCondition.parameters, 1))).toBe('Confirmed');

  // projection: source properties and their column names, in order
  const projection = getChainedFunction(lambda, 2);
  expect(getCollectionProperties(at(projection.parameters, 1))).toEqual([
    'caseType',
    'cases',
  ]);
  expect(getCollectionValues(at(projection.parameters, 2))).toEqual([
    'Case Type',
    'Cases',
  ]);

  // post-filter: `row | $row.getFloat('Cases') > 200`
  const postFilterCondition = asFunction(
    getLambdaBody(at(getChainedFunction(lambda, 1).parameters, 1)),
    'greaterThan',
  );
  const postFilterColumn = asProperty(at(postFilterCondition.parameters, 0));
  expect(postFilterColumn.property).toBe('getFloat');
  expect(getValue(at(postFilterColumn.parameters, 1))).toBe('Cases');
  expect(getValue(at(postFilterCondition.parameters, 1))).toBe(200);

  // and the rows are those the query selects: confirmed, above 200
  await expectColumnValues(page, 'Cases', ['250', '301', '512', '640']);
});

test('an aggregation produces a groupBy lambda with the right aggregate', async ({
  page,
}) => {
  // group by `Case Type`, aggregating `Cases` with `sum`
  await project(page, ['Case Type', 'Cases']);
  await chooseAggregateOperator(
    page,
    getProjectionColumns(page).filter({ hasText: 'Cases' }),
    'sum',
  );

  const lambda = (await runQuery(page, captured)).function;

  // aggregating replaces `project` with `groupBy`
  expect(getFunctionChain(lambda)).toEqual(['take', 'groupBy', 'getAll']);

  const groupBy = getChainedFunction(lambda, 1);
  // grouped-by columns, then aggregations, then the resulting column names
  expect(getCollectionProperties(at(groupBy.parameters, 1))).toEqual([
    'caseType',
  ]);
  expect(getCollectionValues(at(groupBy.parameters, 3))).toEqual([
    'Case Type',
    'Cases (sum)',
  ]);

  // the aggregation reads `cases` and reduces it with `sum`
  const aggregation = asFunction(
    at(asCollection(at(groupBy.parameters, 2)).values, 0),
    'agg',
  );
  expect(
    asProperty(getLambdaBody(at(aggregation.parameters, 0))).property,
  ).toBe('cases');
  asFunction(getLambdaBody(at(aggregation.parameters, 1)), 'sum');

  // one row per case type, with its total cases
  await expectColumnValues(page, 'Case Type', ['Confirmed', 'Active', 'Death']);
  await expectColumnValues(page, 'Cases (sum)', ['1,703', '275', '497']);
});

test('a window function produces an olapGroupBy lambda', async ({ page }) => {
  // the default window function sums the first projected column
  await project(page, ['Cases', 'Case Type']);

  await chooseAdvancedMenuItem(page, 'Show Window Function(s)');
  const windowPanel = page.getByTestId('query__builder__window');
  await windowPanel
    .getByRole('button', { name: 'Create Window Function Column' })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Create', exact: true })
    .click();
  await expect(
    windowPanel.locator('.query-builder__olap__column__operation'),
  ).toHaveCount(1);

  const lambda = (await runQuery(page, captured)).function;

  // the window function wraps the projection in an `olapGroupBy`
  expect(getFunctionChain(lambda)).toEqual([
    'take',
    'olapGroupBy',
    'project',
    'getAll',
  ]);

  const olapGroupBy = getChainedFunction(lambda, 1);
  // the default window function partitions by nothing...
  expect(asCollection(at(olapGroupBy.parameters, 1)).values).toHaveLength(0);
  // ...applies `sum` over the first column, and names the output after it
  const windowOperator = asFunction(at(olapGroupBy.parameters, 2), 'func');
  expect(getValue(at(windowOperator.parameters, 0))).toBe('Cases');
  asFunction(getLambdaBody(at(windowOperator.parameters, 1)), 'sum');
  expect(getValue(at(olapGroupBy.parameters, 3))).toBe('sum of Cases');

  // unpartitioned, every row carries the total over all rows
  await expectColumnValues(
    page,
    'sum of Cases',
    Array<string>(8).fill('2,475'),
  );
});
