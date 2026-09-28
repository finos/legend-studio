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

import { test, expect, type Page } from '@playwright/test';
import {
  setupEngineMock,
  type CapturedEngineRequests,
} from '../support/EngineMock.js';
import {
  addFilterCondition,
  ALL_CASES,
  chooseConditionOperator,
  expectColumnValues,
  getFilterPanel,
  getGridRows,
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
  getCollectionValues,
  getLambdaBody,
  getValue,
  type V1_AppliedFunction,
  type V1_ValueSpecification,
} from '../support/QueryProtocol.js';

/**
 * Every filter operator, picked in the UI: each must build the condition
 * the engine expects, and — as the engine mock evaluates it — select the
 * rows that condition describes. Rows are identified by their `Cases`.
 *
 * NOTE: string values are chosen so the value editor's typeahead has nothing
 * to suggest (see `setConditionValue`) — otherwise pressing Enter would pick
 * the suggestion rather than the value typed.
 */

let captured: CapturedEngineRequests;

interface OperatorCase {
  /** The operator's label in the operator dropdown. */
  operator: string;
  /** The explorer property filtered on. */
  property: string;
  /** Its name in the protocol. */
  propertyName: string;
  /** The value typed, if the operator takes one. */
  value?: string;
  /** The function the condition applies, e.g. `startsWith`. */
  function: string;
  /** Whether the operator is the negation of `function`, e.g. `is not`. */
  negated?: boolean;
  /** The value the condition compares against, in the protocol. */
  protocolValue?: string | number;
  /** The `Cases` of the rows the condition selects, in order. */
  cases: string[];
}

const OPERATOR_CASES: OperatorCase[] = [
  // strings
  {
    operator: 'is',
    property: 'Case Type',
    propertyName: 'caseType',
    value: 'Death',
    function: 'equal',
    protocolValue: 'Death',
    cases: ['420', '77'],
  },
  {
    operator: 'is not',
    property: 'Case Type',
    propertyName: 'caseType',
    value: 'Death',
    function: 'equal',
    negated: true,
    protocolValue: 'Death',
    cases: ['250', '301', '180', '95', '512', '640'],
  },
  {
    // a single character: too short to look up suggestions for
    operator: 'starts with',
    property: 'Case Type',
    propertyName: 'caseType',
    value: 'D',
    function: 'startsWith',
    protocolValue: 'D',
    cases: ['420', '77'],
  },
  {
    operator: "doesn't start with",
    property: 'Case Type',
    propertyName: 'caseType',
    value: 'D',
    function: 'startsWith',
    negated: true,
    protocolValue: 'D',
    cases: ['250', '301', '180', '95', '512', '640'],
  },
  {
    operator: 'contains',
    property: 'Case Type',
    propertyName: 'caseType',
    value: 'ea',
    function: 'contains',
    protocolValue: 'ea',
    cases: ['420', '77'],
  },
  {
    operator: "doesn't contain",
    property: 'Case Type',
    propertyName: 'caseType',
    value: 'ea',
    function: 'contains',
    negated: true,
    protocolValue: 'ea',
    cases: ['250', '301', '180', '95', '512', '640'],
  },
  {
    operator: 'ends with',
    property: 'Case Type',
    propertyName: 'caseType',
    value: 'ed',
    function: 'endsWith',
    protocolValue: 'ed',
    cases: ['250', '301', '512', '640'],
  },
  {
    operator: "doesn't end with",
    property: 'Case Type',
    propertyName: 'caseType',
    value: 'ed',
    function: 'endsWith',
    negated: true,
    protocolValue: 'ed',
    cases: ['180', '420', '95', '77'],
  },
  // numbers
  {
    operator: 'is',
    property: 'Cases',
    propertyName: 'cases',
    value: '250',
    function: 'equal',
    protocolValue: 250,
    cases: ['250'],
  },
  {
    operator: '<',
    property: 'Cases',
    propertyName: 'cases',
    value: '180',
    function: 'lessThan',
    protocolValue: 180,
    cases: ['95', '77'],
  },
  {
    operator: '<=',
    property: 'Cases',
    propertyName: 'cases',
    value: '180',
    function: 'lessThanEqual',
    protocolValue: 180,
    cases: ['180', '95', '77'],
  },
  {
    operator: '>',
    property: 'Cases',
    propertyName: 'cases',
    value: '420',
    function: 'greaterThan',
    protocolValue: 420,
    cases: ['512', '640'],
  },
  {
    operator: '>=',
    property: 'Cases',
    propertyName: 'cases',
    value: '420',
    function: 'greaterThanEqual',
    protocolValue: 420,
    cases: ['420', '512', '640'],
  },
  // emptiness, of an optional property every row has
  {
    operator: 'is empty',
    property: 'Fips',
    propertyName: 'fips',
    function: 'isEmpty',
    cases: [],
  },
  {
    operator: 'is not empty',
    property: 'Fips',
    propertyName: 'fips',
    function: 'isEmpty',
    negated: true,
    cases: ALL_CASES,
  },
];

/** Filter on `property` with `operator`; project `Cases` to tell rows apart. */
const addCondition = async (
  page: Page,
  property: string,
  operator: string,
): Promise<void> => {
  await project(page, ['Cases']);
  await addFilterCondition(page, property);
  await expect(
    getFilterPanel(page).getByTestId(
      'query__builder__filter__tree__condition__node-content',
    ),
  ).toHaveCount(1);
  await chooseConditionOperator(page, getFilterPanel(page), operator);
  await expect(
    getFilterPanel(page).getByTitle('Choose Operator...'),
  ).toHaveText(operator);
};

/**
 * The condition of the query's filter, `x | <condition>`, unwrapped from its
 * `not()` if negated — the query is `take(project(filter(getAll)))`.
 */
const getCondition = (
  lambda: Parameters<typeof getChainedFunction>[0],
  negated: boolean,
): V1_AppliedFunction => {
  const condition = asFunction(
    getLambdaBody(at(getChainedFunction(lambda, 2).parameters, 1)),
  );
  return negated
    ? asFunction(at(asFunction(condition, 'not').parameters, 0))
    : condition;
};

test.beforeEach(async ({ page }) => {
  captured = await setupEngineMock(page);
  await openDataSpaceQuery(page);
});

for (const operatorCase of OPERATOR_CASES) {
  const { operator, property, value } = operatorCase;
  test(`'${property} ${operator}${value === undefined ? '' : ` ${value}`}' filters the rows`, async ({
    page,
  }) => {
    await addCondition(page, property, operator);
    if (value !== undefined) {
      await setConditionValue(page, getFilterPanel(page), value);
    }

    const lambda = (await runQuery(page, captured)).function;
    const condition = getCondition(lambda, Boolean(operatorCase.negated));
    expect(condition.function).toBe(operatorCase.function);
    expect(asProperty(at(condition.parameters, 0)).property).toBe(
      operatorCase.propertyName,
    );
    if (operatorCase.protocolValue !== undefined) {
      expect(getValue(at(condition.parameters, 1))).toBe(
        operatorCase.protocolValue,
      );
    }

    await expect(getGridRows(page)).toHaveCount(operatorCase.cases.length);
    await expectColumnValues(page, 'Cases', operatorCase.cases);
  });
}

/**
 * Enter `values` in the list editor of the (only) filter condition: it opens
 * on click, takes each value on `Enter`, and applies them on `Save`.
 */
const setConditionValues = async (
  page: Page,
  values: string[],
): Promise<void> => {
  const filterPanel = getFilterPanel(page);
  await filterPanel.getByTitle('Click to edit').click();
  const input = filterPanel.locator('.value-spec-editor input');
  for (const listValue of values) {
    await input.fill(listValue);
    await page.keyboard.press('Enter');
  }
  await filterPanel.getByTitle('Save', { exact: true }).click();
};

const getListValues = (node: V1_ValueSpecification | undefined): unknown[] =>
  getCollectionValues(node).toSorted();

test("'Case Type is in list of' filters to the rows with any of the values", async ({
  page,
}) => {
  await addCondition(page, 'Case Type', 'is in list of');
  await setConditionValues(page, ['Active', 'Death']);

  const condition = getCondition(
    (await runQuery(page, captured)).function,
    false,
  );
  expect(condition.function).toBe('in');
  expect(asProperty(at(condition.parameters, 0)).property).toBe('caseType');
  expect(getListValues(at(condition.parameters, 1))).toEqual([
    'Active',
    'Death',
  ]);

  await expectColumnValues(page, 'Cases', ['180', '420', '95', '77']);
});

test("'Case Type is not in list of' filters to the rows with none of the values", async ({
  page,
}) => {
  await addCondition(page, 'Case Type', 'is not in list of');
  await setConditionValues(page, ['Active', 'Death']);

  const condition = getCondition(
    (await runQuery(page, captured)).function,
    true,
  );
  expect(condition.function).toBe('in');
  expect(getListValues(at(condition.parameters, 1))).toEqual([
    'Active',
    'Death',
  ]);

  await expectColumnValues(page, 'Cases', ['250', '301', '512', '640']);
});
