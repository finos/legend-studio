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
  mockEnrichedModel,
  REPORT_STATUS_ENUMERATION_PATH,
  REPORT_STATUS_VALUES,
} from '../support/DepotMock.js';
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
  type V1_AppliedFunction,
  type V1_ExecuteInput,
} from '../support/QueryProtocol.js';

// Deep-link straight into the query builder for the mock data space served
// by the mock depot server (see `@finos/legend-fixture-mock-server`)
const TEST_DATA_SPACE_QUERY_URL =
  'extensions/dataspace/org.finos.legend.test:legend-query-test:0.0.1/test::DataSpace/dummyContext';

let captured: CapturedEngineRequests;

const getFilterPanel = (page: Page) =>
  page.getByTestId('query__builder__filter__panel');

/**
 * Project `Cases` (so the query is runnable) and add a filter condition on
 * `property`, whose value editor then depends on the property's type.
 */
const addFilterCondition = async (
  page: Page,
  property: string,
): Promise<void> => {
  const explorer = page.getByTestId('query__builder__explorer');
  await explorer
    .getByText('Cases', { exact: true })
    .dragTo(page.getByTestId('query__builder__tds__projection'));
  await explorer
    .getByText(property, { exact: true })
    .dragTo(getFilterPanel(page));
  await expect(
    getFilterPanel(page).getByTestId(
      'query__builder__filter__tree__condition__node-content',
    ),
  ).toHaveCount(1);
};

/**
 * Run the query and return the condition of its filter — `x | <condition>`
 * — as the app sent it to the engine.
 */
const runAndCaptureFilterCondition = async (
  page: Page,
): Promise<V1_AppliedFunction> => {
  await page
    .getByTestId('query__builder__result__panel')
    .getByText('Run Query', { exact: true })
    .click();
  await expect
    .poll(() => captured.executeInputs.length, { timeout: 30_000 })
    .toBeGreaterThan(0);
  const lambda = (at(captured.executeInputs, 0) as unknown as V1_ExecuteInput)
    .function;
  return asFunction(
    getLambdaBody(at(getChainedFunction(lambda, 2).parameters, 1)),
  );
};

/** Open the date picker of the (only) date filter condition. */
const openDatePicker = async (page: Page): Promise<void> => {
  await getFilterPanel(page)
    .getByTitle('Click to edit and pick from more date options')
    .click();
  await expect(page.getByRole('radio', { name: 'Today' })).toBeVisible();
};

test.beforeEach(async ({ page }) => {
  captured = await setupEngineMock(page);
  await mockEnrichedModel(page);
  await page.goto(TEST_DATA_SPACE_QUERY_URL);
  await expect(
    page
      .getByTestId('query__builder__explorer')
      .getByText('Cases', { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
});

test('an enum filter offers exactly the enumeration values', async ({
  page,
}) => {
  await addFilterCondition(page, 'Report Status');

  await getFilterPanel(page)
    .locator('.value-spec-editor__enum-selector')
    .click();
  await expect(page.locator('.selector-input__option')).toHaveText(
    REPORT_STATUS_VALUES,
  );
});

test('a chosen enum value reaches the lambda as an enum reference', async ({
  page,
}) => {
  await addFilterCondition(page, 'Report Status');
  await getFilterPanel(page)
    .locator('.value-spec-editor__enum-selector')
    .click();
  await page.locator('.selector-input__option', { hasText: 'Final' }).click();
  await expect(getFilterPanel(page).getByText('"Final"')).toBeVisible();

  const condition = await runAndCaptureFilterCondition(page);

  // filter: `x | $x.reportStatus == test::ReportStatus.Final`
  expect(condition.function).toBe('equal');
  expect(asProperty(at(condition.parameters, 0)).property).toBe('reportStatus');
  // the value is a reference into the enumeration, not a plain string
  expect(at(condition.parameters, 1)).toEqual({
    _type: 'enumValue',
    fullPath: REPORT_STATUS_ENUMERATION_PATH,
    value: 'Final',
  });
});

test('a date filter can compare against an absolute date', async ({ page }) => {
  await addFilterCondition(page, 'Date');
  await openDatePicker(page);
  await page.getByRole('radio', { name: 'Absolute Date' }).check();
  await page.locator('input[type="date"]').fill('2021-04-05');
  await page.keyboard.press('Escape');
  await expect(getFilterPanel(page).getByText('"2021-04-05"')).toBeVisible();

  const condition = await runAndCaptureFilterCondition(page);

  // filter: `x | $x.date == %2021-04-05`, a `StrictDate` literal
  expect(condition.function).toBe('equal');
  expect(asProperty(at(condition.parameters, 0)).property).toBe('date');
  const dateValue = at(condition.parameters, 1);
  expect(dateValue._type).toBe('strictDate');
  expect(getValue(dateValue)).toBe('2021-04-05');
});

test('a date filter can compare against a relative date', async ({ page }) => {
  await addFilterCondition(page, 'Date');
  await openDatePicker(page);
  await page.getByRole('radio', { name: 'Today' }).check();
  await page.keyboard.press('Escape');
  await expect(getFilterPanel(page).getByText('"Today"')).toBeVisible();

  const condition = await runAndCaptureFilterCondition(page);

  // filter: `x | $x.date == today()`, resolved when the query runs rather
  // than frozen to the day it was built
  expect(condition.function).toBe('equal');
  expect(asProperty(at(condition.parameters, 0)).property).toBe('date');
  asFunction(at(condition.parameters, 1), 'meta::pure::functions::date::today');
});
