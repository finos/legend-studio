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
  type V1_ExecuteInput,
} from '../support/QueryProtocol.js';

// Deep-link straight into the query builder for the mock data space served
// by the mock depot server (see `@finos/legend-fixture-mock-server`)
const TEST_DATA_SPACE_QUERY_URL =
  'extensions/dataspace/org.finos.legend.test:legend-query-test:0.0.1/test::DataSpace/dummyContext';

/**
 * Build `Case Type`/`Cases` projection, filtered to `Case Type == 'Confirmed'`
 * with a `Cases > 200` post-filter — the query all assertions below describe.
 */
const buildQuery = async (page: Page): Promise<void> => {
  const explorer = page.getByTestId('query__builder__explorer');
  const projectionPanel = page.getByTestId('query__builder__tds__projection');
  const filterPanel = page.getByTestId('query__builder__filter__panel');

  await explorer
    .getByText('Case Type', { exact: true })
    .dragTo(projectionPanel);
  await explorer.getByText('Cases', { exact: true }).dragTo(projectionPanel);

  // filter: `Case Type` is 'Confirmed'
  await explorer.getByText('Case Type', { exact: true }).dragTo(filterPanel);
  await page
    .getByTestId('query-builder-filter-tree__condition-node__value')
    .click();
  await filterPanel.locator('.value-spec-editor input').fill('Confirmed');
  await page.keyboard.press('Enter');

  // post-filter: `Cases` > 200
  await page
    .getByTestId('query__builder__actions')
    .getByRole('button', { name: 'Advanced' })
    .click();
  await page.getByText('Show Post-Filter').click();
  const postFilterPanel = page.getByTestId(
    'query__builder__post__filter-panel',
  );
  await page
    .getByTestId('QUERY_BUILDER_TDS_PROJECTION_COLUMN')
    .filter({ hasText: 'Cases' })
    .getByText('Cases', { exact: true })
    .dragTo(postFilterPanel);
  await postFilterPanel.getByTitle('Choose Operator...').click();
  await page
    .locator(
      '.query-builder-post-filter-tree__condition-node__operator__dropdown__option',
      { hasText: /^>$/ },
    )
    .click();
  await postFilterPanel
    .locator('.value-spec-editor__editable__display--content')
    .click();
  await postFilterPanel.locator('.value-spec-editor input').fill('200');
  await page.keyboard.press('Enter');
};

let captured: CapturedEngineRequests;

test.beforeEach(async ({ page }) => {
  captured = await setupEngineMock(page);
  await page.goto(TEST_DATA_SPACE_QUERY_URL);
  await expect(
    page
      .getByTestId('query__builder__explorer')
      .getByText('Cases', { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
});

test('the query protocol viewer shows the built query', async ({ page }) => {
  await buildQuery(page);

  await page
    .getByTestId('query__builder__actions')
    .getByRole('button', { name: 'Advanced' })
    .click();
  await page.getByText('Show Protocol').click();

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
  await page
    .getByTestId('query__builder__result__panel')
    .getByText('Run Query', { exact: true })
    .click();
  await expect(
    page.locator('.ag-center-cols-container .ag-row'),
  ).not.toHaveCount(0);

  const executeInput = at(
    captured.executeInputs,
    0,
  ) as unknown as V1_ExecuteInput;
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
});

test('an aggregation produces a groupBy lambda with the right aggregate', async ({
  page,
}) => {
  const explorer = page.getByTestId('query__builder__explorer');
  const projectionPanel = page.getByTestId('query__builder__tds__projection');

  // group by `Case Type`, aggregating `Cases` with `sum`
  await explorer
    .getByText('Case Type', { exact: true })
    .dragTo(projectionPanel);
  await explorer.getByText('Cases', { exact: true }).dragTo(projectionPanel);
  const casesColumn = page
    .getByTestId('QUERY_BUILDER_TDS_PROJECTION_COLUMN')
    .filter({ hasText: 'Cases' });
  await casesColumn.getByTitle('Choose Aggregate Operator...').click();
  await page
    .locator(
      '.query-builder__projection__column__aggregate__operator__dropdown__option',
      { hasText: /^sum$/ },
    )
    .click();

  await page
    .getByTestId('query__builder__result__panel')
    .getByText('Run Query', { exact: true })
    .click();
  await expect(
    page.locator('.ag-center-cols-container .ag-row'),
  ).not.toHaveCount(0);

  const lambda = (at(captured.executeInputs, 0) as unknown as V1_ExecuteInput)
    .function;

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
});

test('a window function produces an olapGroupBy lambda', async ({ page }) => {
  const explorer = page.getByTestId('query__builder__explorer');
  const projectionPanel = page.getByTestId('query__builder__tds__projection');

  await explorer
    .getByText('Case Type', { exact: true })
    .dragTo(projectionPanel);
  await explorer.getByText('Cases', { exact: true }).dragTo(projectionPanel);

  await page
    .getByTestId('query__builder__actions')
    .getByRole('button', { name: 'Advanced' })
    .click();
  await page.getByText('Show Window Function(s)').click();
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

  await page
    .getByTestId('query__builder__result__panel')
    .getByText('Run Query', { exact: true })
    .click();
  await expect(
    page.locator('.ag-center-cols-container .ag-row'),
  ).not.toHaveCount(0);

  const lambda = (at(captured.executeInputs, 0) as unknown as V1_ExecuteInput)
    .function;

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
  expect(getValue(at(windowOperator.parameters, 0))).toBe('Case Type');
  asFunction(getLambdaBody(at(windowOperator.parameters, 1)), 'sum');
  expect(getValue(at(olapGroupBy.parameters, 3))).toBe('sum of Case Type');
});
