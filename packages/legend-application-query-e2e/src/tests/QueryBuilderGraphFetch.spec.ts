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
  asGraphFetchTree,
  at,
  getChainedFunction,
  getElementPath,
  getFunctionChain,
  getGraphFetchProperties,
  type V1_ExecuteInput,
} from '../support/QueryProtocol.js';

// Deep-link straight into the query builder for the mock data space served
// by the mock depot server (see `@finos/legend-fixture-mock-server`)
const TEST_DATA_SPACE_QUERY_URL =
  'extensions/dataspace/org.finos.legend.test:legend-query-test:0.0.1/test::DataSpace/dummyContext';

let captured: CapturedEngineRequests;

/**
 * Switch the fetch structure from the default tabular mode to graph fetch.
 * The `Tabular Data Structure` menu entry is a toggle: it carries a check
 * while tabular mode is active, and selecting it switches to graph fetch.
 */
const switchToGraphFetch = async (page: Page): Promise<Page> => {
  await page
    .getByTestId('query__builder__actions')
    .getByRole('button', { name: 'Advanced' })
    .click();
  await page.getByText('Tabular Data Structure').click();
  return page;
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

test('the fetch structure can be switched to graph fetch', async ({ page }) => {
  // tabular mode shows the projection panel
  await expect(
    page.getByTestId('query__builder__tds__projection'),
  ).toBeVisible();

  await switchToGraphFetch(page);

  // graph fetch replaces it with the graph fetch tree panel
  const graphFetchPanel = page.getByTestId('query__builder__graph__fetch');
  await expect(graphFetchPanel.first()).toBeVisible();
  await expect(
    page.getByTestId('query__builder__tds__projection'),
  ).toBeHidden();
});

test('a property can be added to the graph fetch tree', async ({ page }) => {
  await switchToGraphFetch(page);
  const graphFetchPanel = page.getByTestId('query__builder__graph__fetch');

  await page
    .getByTestId('query__builder__explorer')
    .getByText('Cases', { exact: true })
    .dragTo(graphFetchPanel.first());

  // the tree lists the fetched property under the queried class
  await expect(
    graphFetchPanel.first().getByText('Graph Fetch Tree'),
  ).toBeVisible();
  await expect(graphFetchPanel.first().getByText('cases')).toBeVisible();
});

test('graph fetch generates a serialize/graphFetch lambda', async ({
  page,
}) => {
  await switchToGraphFetch(page);
  const graphFetchPanel = page.getByTestId('query__builder__graph__fetch');
  await page
    .getByTestId('query__builder__explorer')
    .getByText('Cases', { exact: true })
    .dragTo(graphFetchPanel.first());
  await expect(graphFetchPanel.first().getByText('cases')).toBeVisible();

  await page
    .getByTestId('query__builder__result__panel')
    .getByText('Run Query', { exact: true })
    .click();
  await expect.poll(() => captured.executeInputs.length).toBeGreaterThan(0);

  const lambda = (at(captured.executeInputs, 0) as unknown as V1_ExecuteInput)
    .function;

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
