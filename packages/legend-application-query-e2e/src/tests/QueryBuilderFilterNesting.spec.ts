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
  asFunction,
  asProperty,
  at,
  getChainedFunction,
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

const groupNodes = (page: Page) =>
  page
    .getByTestId('query__builder__filter__panel')
    .locator('.query-builder-filter-tree__group-node');

/**
 * Set the value of the nth filter condition. Values render as a read-only
 * display until clicked, which swaps in the editor input.
 */
const setConditionValue = async (
  page: Page,
  index: number,
  value: string,
): Promise<void> => {
  const panel = page.getByTestId('query__builder__filter__panel');
  await panel
    .locator('.value-spec-editor__editable__display--content')
    .nth(index)
    .click();
  await panel.locator('.value-spec-editor input').fill(value);
  await page.keyboard.press('Enter');
};

/**
 * Build `Fips` and `Case Type` conditions, then nest the first one inside
 * its own logical group, giving `(Fips = ...) AND (Case Type = ...)` where
 * the left operand is itself a group.
 */
const buildNestedFilter = async (page: Page): Promise<void> => {
  const explorer = page.getByTestId('query__builder__explorer');
  const filterPanel = page.getByTestId('query__builder__filter__panel');

  await explorer
    .getByText('Case Type', { exact: true })
    .dragTo(page.getByTestId('query__builder__tds__projection'));
  await explorer.getByText('Case Type', { exact: true }).dragTo(filterPanel);
  await explorer.getByText('Fips', { exact: true }).dragTo(filterPanel);

  // dropping two properties onto the panel groups them under a single `and`
  await expect(groupNodes(page)).toHaveCount(1);

  await page
    .getByTestId('query__builder__filter__tree__condition__node-content')
    .nth(1)
    .click({ button: 'right' });
  await page.getByText('Form a New Logical Group', { exact: true }).click();
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

/** The condition lambda passed to the query's `filter()`. */
const getFilterCondition = (lambda: V1_Lambda) =>
  asFunction(getLambdaBody(at(getChainedFunction(lambda, 2).parameters, 1)));

test.beforeEach(async ({ page }) => {
  captured = await setupEngineMock(page);
  await page.goto(TEST_DATA_SPACE_QUERY_URL);
  await expect(
    page
      .getByTestId('query__builder__explorer')
      .getByText('Cases', { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
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
  await setConditionValue(page, 0, 'AAA');
  await setConditionValue(page, 1, 'BBB');

  const condition = getFilterCondition(await runAndCaptureLambda(page));

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
  await setConditionValue(page, 0, 'AAA');
  await setConditionValue(page, 1, 'BBB');

  // flip only the outer group, leaving the nested one as `and`
  await groupNodes(page).nth(0).click();
  await expect(groupNodes(page).nth(0)).toHaveText('or');
  await expect(groupNodes(page).nth(1)).toHaveText('and');

  const condition = getFilterCondition(await runAndCaptureLambda(page));
  expect(condition.function).toBe('or');
  asFunction(at(condition.parameters, 0), 'and');
});
