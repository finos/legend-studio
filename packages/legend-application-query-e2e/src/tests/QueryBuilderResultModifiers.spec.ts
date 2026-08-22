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
  at,
  getChainedFunction,
  getFunctionChain,
  getValue,
  type V1_ExecuteInput,
  type V1_Lambda,
} from '../support/QueryProtocol.js';

// Deep-link straight into the query builder for the mock data space served
// by the mock depot server (see `@finos/legend-fixture-mock-server`)
const TEST_DATA_SPACE_QUERY_URL =
  'extensions/dataspace/org.finos.legend.test:legend-query-test:0.0.1/test::DataSpace/dummyContext';

let captured: CapturedEngineRequests;

/** Project two columns so result modifiers have something to act on. */
const buildProjection = async (page: Page): Promise<void> => {
  const explorer = page.getByTestId('query__builder__explorer');
  const projectionPanel = page.getByTestId('query__builder__tds__projection');
  await explorer
    .getByText('Case Type', { exact: true })
    .dragTo(projectionPanel);
  await explorer.getByText('Cases', { exact: true }).dragTo(projectionPanel);
  await expect(
    page.getByTestId('QUERY_BUILDER_TDS_PROJECTION_COLUMN'),
  ).toHaveCount(2);
};

const openQueryOptions = async (page: Page): Promise<Locator> => {
  await page.getByTitle('Configure Query Options...').click();
  const modal = page.getByRole('dialog');
  await expect(modal.getByText('Query Options')).toBeVisible();
  return modal;
};

/** Run the query and return the lambda the app sent to the engine. */
const runAndCaptureLambda = async (page: Page): Promise<V1_Lambda> => {
  await page
    .getByTestId('query__builder__result__panel')
    .getByText('Run Query', { exact: true })
    .click();
  await expect.poll(() => captured.executeInputs.length).toBeGreaterThan(0);
  return (at(captured.executeInputs, 0) as unknown as V1_ExecuteInput).function;
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

test('a sort column reaches the lambda and its direction can be flipped', async ({
  page,
}) => {
  await buildProjection(page);
  const modal = await openQueryOptions(page);

  // add a sort on the first column, which defaults to ascending
  await modal.getByRole('button', { name: 'Add Value' }).click();
  await expect(modal.getByText('asc')).toBeVisible();
  await modal.getByRole('button', { name: 'Apply' }).click();

  const lambda = await runAndCaptureLambda(page);
  expect(getFunctionChain(lambda)).toEqual([
    'take',
    'sort',
    'project',
    'getAll',
  ]);
  const sortSpecs = asCollection(
    at(getChainedFunction(lambda, 1).parameters, 1),
  );
  const ascending = asFunction(at(sortSpecs.values, 0), 'asc');
  expect(getValue(at(ascending.parameters, 0))).toBe('Case Type');

  // flipping the direction in the UI changes the sort function
  const reopened = await openQueryOptions(page);
  await reopened.getByTitle('Choose SortBy Operator...').click();
  await expect(reopened.getByText('desc')).toBeVisible();
  await reopened.getByRole('button', { name: 'Apply' }).click();

  captured.executeInputs.length = 0;
  const resorted = await runAndCaptureLambda(page);
  const descending = asFunction(
    at(
      asCollection(at(getChainedFunction(resorted, 1).parameters, 1)).values,
      0,
    ),
    'desc',
  );
  expect(getValue(at(descending.parameters, 0))).toBe('Case Type');
});

test('eliminating duplicate rows adds distinct to the lambda', async ({
  page,
}) => {
  await buildProjection(page);
  const modal = await openQueryOptions(page);

  await modal
    .locator('.panel__content__form__section')
    .filter({ hasText: 'Eliminate Duplicate Rows' })
    .locator('.panel__content__form__section__toggler')
    .click();
  await modal.getByRole('button', { name: 'Apply' }).click();

  const lambda = await runAndCaptureLambda(page);
  expect(getFunctionChain(lambda)).toEqual([
    'take',
    'distinct',
    'project',
    'getAll',
  ]);
});

test('a row limit and slice reach the lambda', async ({ page }) => {
  await buildProjection(page);
  const modal = await openQueryOptions(page);

  await modal.getByRole('textbox', { name: 'Limit Results' }).fill('50');
  // the modal's three textboxes are `Limit Results` followed by the two
  // bounds of the slice range
  const textboxes = modal.getByRole('textbox');
  await expect(textboxes).toHaveCount(3);
  await textboxes.nth(1).fill('1');
  await textboxes.nth(2).fill('5');
  await modal.getByRole('button', { name: 'Apply' }).click();

  const lambda = await runAndCaptureLambda(page);
  expect(getFunctionChain(lambda)).toEqual([
    'slice',
    'take',
    'project',
    'getAll',
  ]);

  // slice carries the requested range
  const slice = getChainedFunction(lambda, 0);
  expect(getValue(at(slice.parameters, 1))).toBe(1);
  expect(getValue(at(slice.parameters, 2))).toBe(5);

  // the app fetches one extra row beyond the limit so it can tell the user
  // the results were truncated
  expect(getValue(at(getChainedFunction(lambda, 1).parameters, 1))).toBe(51);
});
