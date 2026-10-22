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
  ALL_CASES,
  addFilterCondition,
  chooseConditionOperator,
  expectColumnValues,
  getFilterPanel,
  openDataSpaceQuery,
  project,
  runQuery,
} from '../support/QueryBuilderHelpers.js';
import {
  asFunction,
  asProperty,
  at,
  getChainedFunction,
  getLambdaBody,
  getValue,
  type V1_AppliedFunction,
} from '../support/QueryProtocol.js';

let captured: CapturedEngineRequests;

/**
 * Project `Cases` (so the query is runnable) and add a filter condition on
 * `property`, whose value editor then depends on the property's type.
 */
const projectAndFilterOn = async (
  page: Page,
  property: string,
): Promise<void> => {
  await project(page, ['Cases']);
  await addFilterCondition(page, property);
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
  const lambda = (await runQuery(page, captured)).function;
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

/** Set the (only) date filter condition to the absolute date `date`. */
const setAbsoluteDate = async (page: Page, date: string): Promise<void> => {
  await openDatePicker(page);
  await page.getByRole('radio', { name: 'Absolute Date' }).check();
  await page.locator('input[type="date"]').fill(date);
  await page.keyboard.press('Escape');
  await expect(getFilterPanel(page).getByText(`"${date}"`)).toBeVisible();
};

test.beforeEach(async ({ page }) => {
  captured = await setupEngineMock(page);
  await mockEnrichedModel(page);
  await openDataSpaceQuery(page);
});

test('an enum filter offers exactly the enumeration values', async ({
  page,
}) => {
  await projectAndFilterOn(page, 'Report Status');

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
  await projectAndFilterOn(page, 'Report Status');
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
  // the rows reported as final
  await expectColumnValues(page, 'Cases', ['250', '301', '512', '77']);
});

test('a date filter can compare against an absolute date', async ({ page }) => {
  await projectAndFilterOn(page, 'Date');
  await setAbsoluteDate(page, '2021-04-05');

  const condition = await runAndCaptureFilterCondition(page);

  // filter: `x | $x.date == %2021-04-05`, a `StrictDate` literal
  expect(condition.function).toBe('equal');
  expect(asProperty(at(condition.parameters, 0)).property).toBe('date');
  const dateValue = at(condition.parameters, 1);
  expect(dateValue._type).toBe('strictDate');
  expect(getValue(dateValue)).toBe('2021-04-05');
  // the one row reported that day
  await expectColumnValues(page, 'Cases', ['95']);
});

test('a date filter can compare against a relative date', async ({ page }) => {
  await projectAndFilterOn(page, 'Date');
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

/**
 * The other comparisons a date filter offers, against an absolute date: each
 * must reach the lambda as that comparison, and select the rows on its side
 * of the date — one row is reported a day, from 2021-04-01 to 2021-04-08.
 */
const DATE_COMPARISON_CASES: {
  operator: string;
  function: string;
  negated?: boolean;
  cases: string[];
}[] = [
  {
    operator: 'is not',
    function: 'equal',
    negated: true,
    cases: ALL_CASES.filter((cases) => cases !== '95'),
  },
  { operator: '<', function: 'lessThan', cases: ['250', '301', '180', '420'] },
  {
    operator: '<=',
    function: 'lessThanEqual',
    cases: ['250', '301', '180', '420', '95'],
  },
  { operator: '>', function: 'greaterThan', cases: ['512', '77', '640'] },
  {
    operator: '>=',
    function: 'greaterThanEqual',
    cases: ['95', '512', '77', '640'],
  },
];

for (const comparison of DATE_COMPARISON_CASES) {
  test(`a date filter can compare with '${comparison.operator}' against an absolute date`, async ({
    page,
  }) => {
    await projectAndFilterOn(page, 'Date');
    await chooseConditionOperator(
      page,
      getFilterPanel(page),
      comparison.operator,
    );
    await setAbsoluteDate(page, '2021-04-05');

    const filterCondition = await runAndCaptureFilterCondition(page);
    const condition = comparison.negated
      ? asFunction(at(asFunction(filterCondition, 'not').parameters, 0))
      : filterCondition;

    // filter: `x | $x.date <comparison> %2021-04-05`
    expect(condition.function).toBe(comparison.function);
    expect(asProperty(at(condition.parameters, 0)).property).toBe('date');
    const dateValue = at(condition.parameters, 1);
    expect(dateValue._type).toBe('strictDate');
    expect(getValue(dateValue)).toBe('2021-04-05');
    await expectColumnValues(page, 'Cases', comparison.cases);
  });
}

test('a boolean filter compares against false until its box is ticked', async ({
  page,
}) => {
  await projectAndFilterOn(page, 'Last Reported Flag');

  // filter: `x | $x.lastReportedFlag == false`, the editor's default
  let condition = await runAndCaptureFilterCondition(page);
  expect(condition.function).toBe('equal');
  expect(asProperty(at(condition.parameters, 0)).property).toBe(
    'lastReportedFlag',
  );
  expect(at(condition.parameters, 1)._type).toBe('boolean');
  expect(getValue(at(condition.parameters, 1))).toBe(false);
  await expectColumnValues(page, 'Cases', ['301', '420', '512', '640']);

  // ticking the box compares against true instead
  await getFilterPanel(page).getByRole('checkbox').click();
  condition = await runAndCaptureFilterCondition(page);
  expect(condition.function).toBe('equal');
  expect(getValue(at(condition.parameters, 1))).toBe(true);
  await expectColumnValues(page, 'Cases', ['250', '180', '95', '77']);
});

test("a boolean filter's 'is not' keeps the rows of the other value", async ({
  page,
}) => {
  await projectAndFilterOn(page, 'Last Reported Flag');
  await chooseConditionOperator(page, getFilterPanel(page), 'is not');
  await getFilterPanel(page).getByRole('checkbox').click();

  // filter: `x | !($x.lastReportedFlag == true)`
  const condition = asFunction(
    at(
      asFunction(await runAndCaptureFilterCondition(page), 'not').parameters,
      0,
    ),
  );
  expect(condition.function).toBe('equal');
  expect(asProperty(at(condition.parameters, 0)).property).toBe(
    'lastReportedFlag',
  );
  expect(getValue(at(condition.parameters, 1))).toBe(true);
  await expectColumnValues(page, 'Cases', ['301', '420', '512', '640']);
});
