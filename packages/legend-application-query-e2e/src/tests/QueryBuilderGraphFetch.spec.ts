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
  chooseAdvancedMenuItem,
  getExplorer,
  getResultPanel,
  openDataSpaceQuery,
  runQuery,
} from '../support/QueryBuilderHelpers.js';
import {
  asGraphFetchTree,
  at,
  getChainedFunction,
  getElementPath,
  getFunctionChain,
  getGraphFetchProperties,
} from '../support/QueryProtocol.js';

let captured: CapturedEngineRequests;

const getGraphFetchPanel = (page: Page): Locator =>
  page.getByTestId('query__builder__graph__fetch').first();

/**
 * Switch the fetch structure from the default tabular mode to graph fetch.
 * The `Tabular Data Structure` menu entry is a toggle: it carries a check
 * while tabular mode is active, and selecting it switches to graph fetch.
 */
const switchToGraphFetch = (page: Page): Promise<void> =>
  chooseAdvancedMenuItem(page, 'Tabular Data Structure');

/**
 * Drag the explorer's `label` into the graph fetch tree, which lists it by
 * its property name.
 */
const fetchProperty = async (
  page: Page,
  label: string,
  property: string,
): Promise<void> => {
  await getExplorer(page)
    .getByText(label, { exact: true })
    .dragTo(getGraphFetchPanel(page));
  // each node reads `<property> <type>`, e.g. `cases Float`
  await expect(getGraphFetchPanel(page).getByText(property)).toBeVisible();
};

test.beforeEach(async ({ page }) => {
  captured = await setupEngineMock(page);
  await openDataSpaceQuery(page);
});

test('the fetch structure can be switched to graph fetch', async ({ page }) => {
  // tabular mode shows the projection panel
  await expect(
    page.getByTestId('query__builder__tds__projection'),
  ).toBeVisible();

  await switchToGraphFetch(page);

  // graph fetch replaces it with the graph fetch tree panel
  await expect(getGraphFetchPanel(page)).toBeVisible();
  await expect(
    page.getByTestId('query__builder__tds__projection'),
  ).toBeHidden();
});

test('a property can be added to the graph fetch tree', async ({ page }) => {
  await switchToGraphFetch(page);
  await fetchProperty(page, 'Cases', 'cases');

  // the tree lists the fetched property under the queried class
  await expect(
    getGraphFetchPanel(page).getByText('Graph Fetch Tree'),
  ).toBeVisible();
});

test('graph fetch generates a serialize/graphFetch lambda', async ({
  page,
}) => {
  await switchToGraphFetch(page);
  await fetchProperty(page, 'Cases', 'cases');

  const lambda = (await runQuery(page, captured)).function;

  // graph fetch queries serialize a fetched object graph rather than
  // projecting columns into a tabular structure
  expect(getFunctionChain(lambda)).toEqual([
    'serialize',
    'graphFetch',
    'take',
    'getAll',
  ]);
  expect(getElementPath(at(getChainedFunction(lambda, 3).parameters, 0))).toBe(
    'test::COVIDData',
  );

  // both `graphFetch` and `serialize` carry the same tree, rooted at the
  // queried class and holding the property added in the UI
  const fetchTree = asGraphFetchTree(
    at(getChainedFunction(lambda, 1).parameters, 1),
  );
  const serializeTree = asGraphFetchTree(
    at(getChainedFunction(lambda, 0).parameters, 1),
  );
  for (const tree of [fetchTree, serializeTree]) {
    expect(tree.class).toBe('test::COVIDData');
    expect(getGraphFetchProperties(tree)).toEqual(['cases']);
  }
});

test('graph fetch results are the fetched properties of each instance, as JSON', async ({
  page,
}) => {
  await switchToGraphFetch(page);
  await fetchProperty(page, 'Cases', 'cases');
  await fetchProperty(page, 'Case Type', 'caseType');
  await runQuery(page, captured);

  // the result is JSON, not a grid: one object per instance, holding just
  // the fetched properties
  const result = getResultPanel(page);
  await expect(result.locator('.ag-center-cols-container')).toHaveCount(0);
  await expect(result).toContainText('"cases": 250');
  await expect(result).toContainText('"caseType": "Confirmed"');
  await expect(result).not.toContainText('"fips"');
});
