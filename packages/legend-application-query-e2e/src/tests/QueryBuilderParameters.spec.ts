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
  addFilterCondition,
  chooseAdvancedMenuItem,
  chooseConditionOperator,
  expectColumnValues,
  getFilterPanel,
  getQueryTitle,
  getResultPanel,
  openDataSpaceQuery,
  project,
  saveNewQuery,
  waitForExecution,
} from '../support/QueryBuilderHelpers.js';
import {
  asFunction,
  asProperty,
  at,
  getChainedFunction,
  getLambdaBody,
  getVariableName,
  type V1_ExecuteInput,
  type V1_ValueSpecification,
} from '../support/QueryProtocol.js';

const PARAMETER_NAME = 'caseTypeParam';

let captured: CapturedEngineRequests;

const getParametersPanel = (page: Page): Locator =>
  page.getByTestId('query-builder__parameters');

/**
 * Create a parameter from the parameters panel (opening it if needed): by
 * default a required `String`.
 */
const addParameter = async (
  page: Page,
  name: string,
  { type, multiplicity }: { type?: string; multiplicity?: string } = {},
): Promise<void> => {
  if (!(await getParametersPanel(page).isVisible())) {
    await chooseAdvancedMenuItem(page, 'Show Parameter(s)');
  }
  await getParametersPanel(page).getByTitle('Add Parameter').click();

  const modal = page.getByRole('dialog');
  await expect(modal.getByText('Create Parameter')).toBeVisible();
  await modal.getByRole('textbox').first().fill(name);
  // the type selector, then the multiplicity selector
  const selectors = modal.getByRole('combobox');
  if (type) {
    await selectors.nth(0).fill(type);
    await page.keyboard.press('Enter');
    await expect(modal).toContainText(type);
  }
  if (multiplicity) {
    await selectors.nth(1).click();
    await page
      .locator('.selector-input__option', { hasText: multiplicity })
      .click();
  }
  await modal.getByRole('button', { name: 'Create' }).click();
  await expect(modal).toBeHidden();
};

/** Drop the parameter `name` onto the (only) filter condition's value. */
const dropParameterOntoFilterValue = async (
  page: Page,
  name: string,
): Promise<void> => {
  await getParametersPanel(page)
    .getByText(name)
    .dragTo(
      page.getByTestId('query-builder-filter-tree__condition-node__value'),
    );
  await expect(getFilterPanel(page).getByText(name)).toBeVisible();
};

/**
 * Run the query, which first asks for its parameters' values; fill them in
 * with `setValues`, run, and return what was executed.
 */
const runWithParameterValues = async (
  page: Page,
  setValues: (valuesModal: Locator) => Promise<void>,
): Promise<V1_ExecuteInput> => {
  const executionsBefore = captured.executeInputs.length;
  await getResultPanel(page).getByText('Run Query', { exact: true }).click();
  const valuesModal = page
    .getByRole('dialog')
    .filter({ hasText: 'Set Parameter Values' });
  await expect(valuesModal).toBeVisible();
  await setValues(valuesModal);
  await valuesModal.getByRole('button', { name: 'Run', exact: true }).click();
  return waitForExecution(page, captured, executionsBefore);
};

/** Type `value` as the (only) parameter's value. */
const typeValue =
  (value: string) =>
  async (valuesModal: Locator): Promise<void> => {
    await valuesModal.locator('input').first().fill(value);
  };

/** The condition of the query's filter, `x | <condition>`. */
const getFilterCondition = (executeInput: V1_ExecuteInput) =>
  asFunction(
    getLambdaBody(
      at(getChainedFunction(executeInput.function, 2).parameters, 1),
    ),
  );

/** The value the query was run with for the parameter `name`. */
const getParameterValue = (
  executeInput: V1_ExecuteInput,
  name: string,
): V1_ValueSpecification | undefined =>
  (
    executeInput as V1_ExecuteInput & {
      parameterValues?: { name: string; value: V1_ValueSpecification }[];
    }
  ).parameterValues?.find((parameter) => parameter.name === name)?.value;

/**
 * Build a `Case Type` projection, filtered by a `String` parameter:
 * `x | $x.caseType == $caseTypeParam`.
 */
const buildParameterizedQuery = async (page: Page): Promise<void> => {
  await project(page, ['Case Type', 'Cases']);
  await addParameter(page, PARAMETER_NAME);
  await addFilterCondition(page, 'Case Type');
  await dropParameterOntoFilterValue(page, PARAMETER_NAME);
};

test.beforeEach(async ({ page }) => {
  captured = await setupEngineMock(page);
  await openDataSpaceQuery(page);
});

test('a parameter can be created and is listed with its type', async ({
  page,
}) => {
  await addParameter(page, PARAMETER_NAME);

  await expect(
    getParametersPanel(page).getByText(PARAMETER_NAME),
  ).toBeVisible();
  await expect(getParametersPanel(page).getByText('String')).toBeVisible();
});

test('a parameter can be used as a filter value and reaches the lambda', async ({
  page,
}) => {
  await buildParameterizedQuery(page);

  // running a parameterized query prompts for values first
  const executeInput = await runWithParameterValues(
    page,
    typeValue('Confirmed'),
  );

  // the filter must compare against the parameter variable, not a literal
  const condition = getFilterCondition(executeInput);
  expect(condition.function).toBe('equal');
  expect(asProperty(at(condition.parameters, 0)).property).toBe('caseType');
  expect(getVariableName(at(condition.parameters, 1))).toBe(PARAMETER_NAME);
  // and the value is passed alongside
  expect(getParameterValue(executeInput, PARAMETER_NAME)).toMatchObject({
    _type: 'string',
    value: 'Confirmed',
  });
  await expectColumnValues(page, 'Cases', ['250', '301', '512', '640']);
});

test('a date parameter is compared against the date given at run time', async ({
  page,
}) => {
  await project(page, ['Cases']);
  await addParameter(page, 'reportDate', { type: 'StrictDate' });
  await addFilterCondition(page, 'Date');
  await dropParameterOntoFilterValue(page, 'reportDate');

  // a date parameter defaults to today, and takes a date from its picker
  const executeInput = await runWithParameterValues(
    page,
    async (valuesModal) => {
      await valuesModal
        .getByTitle('Click to edit and pick from more date options')
        .click();
      await page.getByRole('radio', { name: 'Absolute Date' }).check();
      await page.locator('input[type="date"]').fill('2021-04-05');
      await page.keyboard.press('Escape');
      await expect(
        valuesModal.getByTitle('Click to edit and pick from more date options'),
      ).toHaveText('2021-04-05');
    },
  );

  const condition = getFilterCondition(executeInput);
  expect(asProperty(at(condition.parameters, 0)).property).toBe('date');
  expect(getVariableName(at(condition.parameters, 1))).toBe('reportDate');
  expect(getParameterValue(executeInput, 'reportDate')).toMatchObject({
    _type: 'strictDate',
    value: '2021-04-05',
  });
  await expectColumnValues(page, 'Cases', ['95']);
});

test('a number parameter works with a comparison operator', async ({
  page,
}) => {
  await project(page, ['Cases']);
  await addParameter(page, 'minCases', { type: 'Float' });
  await addFilterCondition(page, 'Cases');
  await chooseConditionOperator(page, getFilterPanel(page), '>');
  await dropParameterOntoFilterValue(page, 'minCases');

  const executeInput = await runWithParameterValues(page, typeValue('420'));

  const condition = getFilterCondition(executeInput);
  expect(condition.function).toBe('greaterThan');
  expect(getVariableName(at(condition.parameters, 1))).toBe('minCases');
  await expectColumnValues(page, 'Cases', ['512', '640']);
});

test('a list parameter feeds an is-in-list filter', async ({ page }) => {
  await project(page, ['Cases']);
  await addParameter(page, 'caseTypes', { multiplicity: '[*] - List' });
  await addFilterCondition(page, 'Case Type');
  // values can't be dropped onto a list condition: drop the parameter onto
  // an `is` condition, which keeps it when switched to `is in list of`
  await dropParameterOntoFilterValue(page, 'caseTypes');
  await chooseConditionOperator(page, getFilterPanel(page), 'is in list of');
  await expect(getFilterPanel(page).getByText('caseTypes')).toBeVisible();

  // the values modal takes the list like the list editor does: one value
  // per `Enter`, applied on `Save`
  const executeInput = await runWithParameterValues(
    page,
    async (valuesModal) => {
      await valuesModal.getByTitle('Click to edit').click();
      const input = valuesModal.locator('.value-spec-editor input');
      for (const value of ['Active', 'Death']) {
        await input.fill(value);
        await page.keyboard.press('Enter');
      }
      await valuesModal.getByTitle('Save', { exact: true }).click();
    },
  );

  const condition = getFilterCondition(executeInput);
  expect(condition.function).toBe('in');
  expect(getVariableName(at(condition.parameters, 1))).toBe('caseTypes');
  expect(getParameterValue(executeInput, 'caseTypes')).toMatchObject({
    _type: 'collection',
    values: [
      { _type: 'string', value: 'Active' },
      { _type: 'string', value: 'Death' },
    ],
  });
  await expectColumnValues(page, 'Cases', ['180', '420', '95', '77']);
});

test('a parameter used in the query cannot be deleted', async ({ page }) => {
  await buildParameterizedQuery(page);

  const parameter = getParametersPanel(page)
    .locator('.query-builder__variables__variable')
    .filter({ hasText: PARAMETER_NAME });
  await expect(parameter.getByTitle('Used in query')).toBeDisabled();

  // once nothing uses it, it can go
  await getFilterPanel(page).getByTitle('Remove').click();
  await parameter.getByTitle('Remove').click();
  await expect(getParametersPanel(page).getByText(PARAMETER_NAME)).toHaveCount(
    0,
  );
});

test.describe('parameter values of a saved query', () => {
  /**
   * Save the parameterized query, run with `Death` so it saves that value,
   * and wait for the editor to reopen on it. Returns the query's id.
   */
  const saveWithParameterValue = async (page: Page): Promise<string> => {
    await buildParameterizedQuery(page);
    await runWithParameterValues(page, typeValue('Death'));
    const queryId = await saveNewQuery(page, 'Parameterized Query');
    await expect(getQueryTitle(page)).toHaveText('Parameterized Query', {
      timeout: 30_000,
    });
    return queryId;
  };

  test('are restored when the query is reopened', async ({ page }) => {
    await saveWithParameterValue(page);

    await page.reload();
    await expect(getQueryTitle(page)).toHaveText('Parameterized Query', {
      timeout: 30_000,
    });

    // the value the query was saved with is offered again, and used
    const executeInput = await runWithParameterValues(
      page,
      async (valuesModal) => {
        await expect(valuesModal.locator('input').first()).toHaveValue('Death');
      },
    );
    expect(getParameterValue(executeInput, PARAMETER_NAME)).toMatchObject({
      value: 'Death',
    });
    await expectColumnValues(page, 'Cases', ['420', '77']);
  });

  test("can be overridden from the query's URL", async ({ page }) => {
    const queryId = await saveWithParameterValue(page);

    // `?p:<parameter>=<value>` presets a parameter's value, over the saved one
    await page.goto(`edit/${queryId}?p:${PARAMETER_NAME}=Active`);
    await expect(getQueryTitle(page)).toHaveText('Parameterized Query', {
      timeout: 30_000,
    });

    const executeInput = await runWithParameterValues(
      page,
      async (valuesModal) => {
        await expect(valuesModal.locator('input').first()).toHaveValue(
          'Active',
        );
      },
    );
    expect(getParameterValue(executeInput, PARAMETER_NAME)).toMatchObject({
      value: 'Active',
    });
    await expectColumnValues(page, 'Cases', ['180', '95']);
  });
});
