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
  getFilterPanel,
  openDataSpaceQuery,
  project,
  runQuery,
  setConditionValue,
} from '../support/QueryBuilderHelpers.js';
import {
  asFunction,
  asProperty,
  at,
  getChainedFunction,
  getLambdaBody,
  getValue,
  type V1_Lambda,
} from '../support/QueryProtocol.js';

let captured: CapturedEngineRequests;

const groupNodes = (page: Page) =>
  getFilterPanel(page).locator('.query-builder-filter-tree__group-node');

/**
 * Build `Fips` and `Case Type` conditions, then nest the first one inside
 * its own logical group, giving `(Fips = ...) AND (Case Type = ...)` where
 * the left operand is itself a group.
 */
const buildNestedFilter = async (page: Page): Promise<void> => {
  await project(page, ['Case Type']);
  await addFilterCondition(page, 'Case Type');
  await addFilterCondition(page, 'Fips');

  // dropping two properties onto the panel groups them under a single `and`
  await expect(groupNodes(page)).toHaveCount(1);

  await page
    .getByTestId('query__builder__filter__tree__condition__node-content')
    .nth(1)
    .click({ button: 'right' });
  await page.getByText('Form a New Logical Group', { exact: true }).click();
};

/** Set both conditions' values: `Fips` to `AAA`, `Case Type` to `BBB`. */
const setConditionValues = async (page: Page): Promise<void> => {
  await setConditionValue(page, getFilterPanel(page), 'AAA', 0);
  await setConditionValue(page, getFilterPanel(page), 'BBB', 1);
};

/** The condition lambda passed to the query's `filter()`. */
const getFilterCondition = (lambda: V1_Lambda) =>
  asFunction(getLambdaBody(at(getChainedFunction(lambda, 2).parameters, 1)));

test.beforeEach(async ({ page }) => {
  captured = await setupEngineMock(page);
  await openDataSpaceQuery(page);
});

test('a condition can be formed into a nested logical group', async ({
  page,
}) => {
  await buildNestedFilter(page);

  // the tree now holds a group inside a group
  await expect(groupNodes(page)).toHaveCount(2);
  await expect(groupNodes(page).nth(0)).toHaveText('and');
  await expect(groupNodes(page).nth(1)).toHaveText('and');
});

test('a nested group is preserved in the generated lambda', async ({
  page,
}) => {
  await buildNestedFilter(page);
  await setConditionValues(page);

  const condition = getFilterCondition(
    (await runQuery(page, captured)).function,
  );

  // the outer `and` combines the nested group with the ungrouped condition
  expect(condition.function).toBe('and');
  const nestedGroup = asFunction(at(condition.parameters, 0), 'and');
  const ungrouped = asFunction(at(condition.parameters, 1), 'equal');

  // the nested group holds the condition that was grouped
  const nestedCondition = asFunction(at(nestedGroup.parameters, 0), 'equal');
  expect(asProperty(at(nestedCondition.parameters, 0)).property).toBe('fips');
  expect(getValue(at(nestedCondition.parameters, 1))).toBe('AAA');

  expect(asProperty(at(ungrouped.parameters, 0)).property).toBe('caseType');
  expect(getValue(at(ungrouped.parameters, 1))).toBe('BBB');
});

test('switching the outer group to OR changes the generated lambda', async ({
  page,
}) => {
  await buildNestedFilter(page);
  await setConditionValues(page);

  // flip only the outer group, leaving the nested one as `and`
  await groupNodes(page).nth(0).click();
  await expect(groupNodes(page).nth(0)).toHaveText('or');
  await expect(groupNodes(page).nth(1)).toHaveText('and');

  const condition = getFilterCondition(
    (await runQuery(page, captured)).function,
  );
  expect(condition.function).toBe('or');
  asFunction(at(condition.parameters, 0), 'and');
});
