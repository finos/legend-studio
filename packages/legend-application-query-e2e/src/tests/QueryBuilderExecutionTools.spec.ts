/**
 * Copyright (c) 2026-present, Goldman Sachs
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
  holdEngineEndpoint,
  setupEngineMock,
  type CapturedEngineRequests,
} from '../support/EngineMock.js';
import {
  ALL_CASES,
  chooseAdvancedMenuItem,
  expectColumnValues,
  getGridRows,
  getResultPanel,
  openDataSpaceQuery,
  project,
  runQuery,
} from '../support/QueryBuilderHelpers.js';
import {
  getFunctionChain,
  type V1_ExecuteInput,
  type V1_Lambda,
} from '../support/QueryProtocol.js';

/**
 * What the query builder offers around running a query: compiling it,
 * inspecting the plan the engine would execute it with, and stopping it.
 */

const COMPILE_ENDPOINT = 'pure/v1/compilation/lambdaReturnType';
const EXECUTE_ENDPOINT = 'pure/v1/execution/execute';

let captured: CapturedEngineRequests;

/** Pick `item` from the menu next to `Run Query`, e.g. `Generate Plan`. */
const chooseRunMenuItem = async (page: Page, item: string): Promise<void> => {
  await getResultPanel(page)
    .locator('.btn__dropdown-combo__dropdown-btn')
    .click();
  await page.getByText(item, { exact: true }).click();
};

const getPlanViewer = (page: Page): Locator =>
  page.getByRole('dialog').filter({ hasText: 'EXECUTION PLAN EXPLORER' });

test.beforeEach(async ({ page }) => {
  captured = await setupEngineMock(page);
  await openDataSpaceQuery(page);
  await project(page, ['Cases']);
});

test('compiling a valid query reports success', async ({ page }) => {
  await chooseAdvancedMenuItem(page, 'Compile Query (F9)');

  await expect(page.getByText('Compiled successfully')).toBeVisible();
  // the engine compiled the query as built — without the row limit only
  // previews get — and nothing was executed
  expect(captured.compiledLambdas).toHaveLength(1);
  expect(
    getFunctionChain(captured.compiledLambdas[0] as unknown as V1_Lambda),
  ).toEqual(['project', 'getAll']);
  expect(captured.executeInputs).toHaveLength(0);
});

test('F9 compiles the query', async ({ page }) => {
  await page.getByTestId('query__builder__explorer').click();
  await page.keyboard.press('F9');

  await expect(page.getByText('Compiled successfully')).toBeVisible();
  expect(captured.compiledLambdas).toHaveLength(1);
});

test('a compilation error the form cannot point at opens the query as text', async ({
  page,
}) => {
  captured.failures.set(COMPILE_ENDPOINT, {
    status: 400,
    message: "Can't find property 'bogus'",
  });

  await chooseAdvancedMenuItem(page, 'Compile Query (F9)');

  // the error carries no source information to reveal in the form, so the
  // query opens in text mode for the user to find it there
  await expect(
    page.getByText(
      'Compilation failed and error cannot be located in form mode',
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('dialog').filter({ hasText: 'Edit Pure Query' }),
  ).toBeVisible();
  await expect(page.getByText('Compiled successfully')).toHaveCount(0);
});

test('generating a plan shows the plan the engine would execute', async ({
  page,
}) => {
  await chooseRunMenuItem(page, 'Generate Plan');

  // the plan is for the query as built — without the row limit only
  // previews get — and generating it runs nothing
  await expect(getPlanViewer(page)).toBeVisible();
  expect(captured.planInputs).toHaveLength(1);
  expect(
    getFunctionChain(
      (captured.planInputs[0] as unknown as V1_ExecuteInput).function,
    ),
  ).toEqual(['project', 'getAll']);
  expect(captured.executeInputs).toHaveLength(0);

  // the explorer walks the plan's nodes down to the SQL it runs
  const planViewer = getPlanViewer(page);
  await planViewer
    .getByRole('button', { name: 'Execution Plan', exact: true })
    .first()
    .click();
  await planViewer
    .getByRole('button', {
      name: 'Relational TDS Instantiation Execution Node',
      exact: true,
    })
    .first()
    .click();
  await planViewer
    .getByRole('button', { name: 'SQL Execution Node', exact: true })
    .click();
  // (formatted for reading, over several lines)
  await expect(planViewer.getByRole('textbox')).toHaveValue(
    /select\s+"Cases"\s+from\s+COVID_DATA/,
  );
  await expect(
    planViewer.getByRole('row', { name: 'Cases DOUBLE' }),
  ).toBeVisible();
});

test('debugging plan generation shows the debug log alongside the plan', async ({
  page,
}) => {
  await chooseRunMenuItem(page, 'Debug');

  const planViewer = getPlanViewer(page);
  await expect(planViewer).toBeVisible();
  await expect(planViewer.getByText('DEBUG LOG')).toBeVisible();
  await expect(planViewer).toContainText(
    'plan generated by the e2e engine mock',
  );
  expect(captured.planInputs).toHaveLength(1);
});

test('a running query can be stopped, and its late result is discarded', async ({
  page,
}) => {
  const resultPanel = getResultPanel(page);
  const release = holdEngineEndpoint(captured, EXECUTE_ENDPOINT);

  // while the engine is busy, `Run Query` turns into `Stop`
  await resultPanel.getByText('Run Query', { exact: true }).click();
  const stopButton = resultPanel.getByText('Stop', { exact: true });
  await expect(stopButton).toBeVisible();

  // stopping asks the engine to cancel the user's executions, and frees the
  // builder at once
  await stopButton.click();
  await expect(
    resultPanel.getByText('Run Query', { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => captured.cancelledExecutionUsers)
    .toEqual(['anonymous']);

  // the engine answering the stopped query after all changes nothing
  release();
  await expect.poll(() => captured.executeInputs.length).toBe(1);
  await expect(getGridRows(page)).toHaveCount(0);

  // and the next run goes through
  await runQuery(page, captured);
  await expectColumnValues(page, 'Cases', ALL_CASES);
});
