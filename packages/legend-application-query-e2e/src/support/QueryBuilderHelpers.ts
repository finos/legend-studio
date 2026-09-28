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

import { expect, type Locator, type Page } from '@playwright/test';
import { TEST_PROJECT_VERSION } from './DepotMock.js';
import type { CapturedEngineRequests } from './EngineMock.js';
import { at, type V1_ExecuteInput } from './QueryProtocol.js';

/**
 * Locators and actions shared by the query builder specs, so each spec reads
 * as the flow it tests rather than as the DOM it drives.
 */

/** The fixture project's coordinates, as the app's routes spell them. */
export const TEST_PROJECT_GAV = `org.finos.legend.test:legend-query-test:${TEST_PROJECT_VERSION}`;

/**
 * Deep link into the query builder for the mock data space served by the
 * mock depot server (see `@finos/legend-fixture-mock-server`).
 */
export const TEST_DATA_SPACE_QUERY_URL = `extensions/dataspace/${TEST_PROJECT_GAV}/test::DataSpace/dummyContext`;

/** `Cases` of the mock data (see `TEST_DATA__COVIDData`), in its natural order. */
export const ALL_CASES = ['250', '301', '180', '420', '95', '512', '77', '640'];

/** A regular expression matching exactly `text`, e.g. a menu option label. */
const exactly = (text: string): RegExp =>
  new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`);

// --------------------------------- panels ---------------------------------

export const getExplorer = (page: Page): Locator =>
  page.getByTestId('query__builder__explorer');

export const getProjectionPanel = (page: Page): Locator =>
  page.getByTestId('query__builder__tds__projection');

export const getProjectionColumns = (page: Page): Locator =>
  page.getByTestId('QUERY_BUILDER_TDS_PROJECTION_COLUMN');

export const getFilterPanel = (page: Page): Locator =>
  page.getByTestId('query__builder__filter__panel');

export const getPostFilterPanel = (page: Page): Locator =>
  page.getByTestId('query__builder__post__filter-panel');

export const getResultPanel = (page: Page): Locator =>
  page.getByTestId('query__builder__result__panel');

export const getGridRows = (page: Page): Locator =>
  getResultPanel(page).locator('.ag-center-cols-container .ag-row');

/** The saved query's name, as shown in the editor header. */
export const getQueryTitle = (page: Page): Locator =>
  page.getByTitle('Double-click to rename query');

// ------------------------------- navigation -------------------------------

/**
 * Wait for the query builder to load: the graph is built in the browser from
 * the mock depot project, so wait for the explorer to list the class.
 */
export const waitForQueryBuilder = async (page: Page): Promise<void> => {
  await expect(
    getExplorer(page).getByText('Cases', { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
};

/** Open the query builder on the test data space, ready to build a query. */
export const openDataSpaceQuery = async (page: Page): Promise<void> => {
  await page.goto(TEST_DATA_SPACE_QUERY_URL);
  await waitForQueryBuilder(page);
};

/** Pick `item` in the query builder's `Advanced` menu, e.g. `Show Parameter(s)`. */
export const chooseAdvancedMenuItem = async (
  page: Page,
  item: string,
): Promise<void> => {
  await page
    .getByTestId('query__builder__actions')
    .getByRole('button', { name: 'Advanced' })
    .click();
  await page.getByText(item, { exact: true }).click();
};

// ----------------------------- building queries -----------------------------

/** Drag each of `properties` from the explorer into the projection. */
export const project = async (
  page: Page,
  properties: string[],
): Promise<void> => {
  for (const property of properties) {
    await getExplorer(page)
      .getByText(property, { exact: true })
      .dragTo(getProjectionPanel(page));
    await expect(
      getProjectionColumns(page).getByText(property, { exact: true }),
    ).toBeVisible();
  }
};

/** Drag `property` from the explorer into the filter, as a new condition. */
export const addFilterCondition = async (
  page: Page,
  property: string,
): Promise<void> => {
  await getExplorer(page)
    .getByText(property, { exact: true })
    .dragTo(getFilterPanel(page));
};

/**
 * Pick `operator` for the filter (or post-filter) condition in `panel`, by
 * its label, e.g. `is not`, `>=` or `contains`.
 */
export const chooseConditionOperator = async (
  page: Page,
  panel: Locator,
  operator: string,
  index = 0,
): Promise<void> => {
  await panel.getByTitle('Choose Operator...').nth(index).click();
  // filter and post-filter options share the class suffix
  await page
    .locator('[class*="condition-node__operator__dropdown__option"]', {
      hasText: exactly(operator),
    })
    .click();
};

/**
 * Set the value of the `index`th condition in `panel` by typing it. A
 * condition just added opens its value editor straight away; otherwise its
 * value renders as a read-only display until clicked, which swaps in the
 * editor.
 */
export const setConditionValue = async (
  page: Page,
  panel: Locator,
  value: string,
  index = 0,
): Promise<void> => {
  const input = panel.locator('.value-spec-editor input').first();
  const display = panel
    .locator('.value-spec-editor__editable__display--content')
    .nth(index);
  await expect(input.or(display).first()).toBeVisible();
  if (!(await input.isVisible())) {
    await display.click();
  }
  await input.fill(value);
  await page.keyboard.press('Enter');
};

/** Pick an aggregate operator, e.g. `sum`, for a projection column. */
export const chooseAggregateOperator = async (
  page: Page,
  column: Locator,
  operator: string,
): Promise<void> => {
  await column.getByTitle('Choose Aggregate Operator...').click();
  await page
    .locator(
      '.query-builder__projection__column__aggregate__operator__dropdown__option',
      { hasText: exactly(operator) },
    )
    .click();
};

/** Open the `Query Options` (result modifiers) dialog. */
export const openQueryOptions = async (page: Page): Promise<Locator> => {
  await page.getByTitle('Configure Query Options...').click();
  const modal = page.getByRole('dialog');
  await expect(modal.getByText('Query Options')).toBeVisible();
  return modal;
};

// ----------------------------- running queries -----------------------------

/** The latest query the app executed (typeahead lookups aside). */
export const getLatestExecution = (
  captured: CapturedEngineRequests,
): V1_ExecuteInput =>
  at(
    captured.executeInputs,
    captured.executeInputs.length - 1,
  ) as unknown as V1_ExecuteInput;

/**
 * Wait for the app to execute a query beyond the first `executionsBefore`,
 * and for the result panel to be done with it; return what was executed.
 */
export const waitForExecution = async (
  page: Page,
  captured: CapturedEngineRequests,
  executionsBefore: number,
): Promise<V1_ExecuteInput> => {
  await expect
    .poll(() => captured.executeInputs.length, { timeout: 30_000 })
    .toBeGreaterThan(executionsBefore);
  // `Run Query` turns into `Stop` while the query runs
  await expect(
    getResultPanel(page).getByText('Run Query', { exact: true }),
  ).toBeVisible();
  return getLatestExecution(captured);
};

/**
 * Click `Run Query` and return the query the app executed — the one this
 * click triggered, whatever ran before it — once the result panel is done
 * with it, successfully or not.
 */
export const runQuery = async (
  page: Page,
  captured: CapturedEngineRequests,
): Promise<V1_ExecuteInput> => {
  const executionsBefore = captured.executeInputs.length;
  await getResultPanel(page).getByText('Run Query', { exact: true }).click();
  return waitForExecution(page, captured, executionsBefore);
};

/**
 * The values of a result column, top to bottom as displayed — the grid
 * positions rows by their `row-index`, which needn't match DOM order.
 */
export const getColumnValues = (
  page: Page,
  column: string,
): Promise<string[]> =>
  getResultPanel(page)
    .locator(`.ag-center-cols-container .ag-cell[col-id="${column}"]`)
    .evaluateAll((cells) =>
      cells
        .map((cell) => ({
          index: Number(cell.closest('.ag-row')?.getAttribute('row-index')),
          text: cell.textContent?.trim() ?? '',
        }))
        .sort((a, b) => a.index - b.index)
        .map((cell) => cell.text),
    );

/**
 * Assert a result column shows `values`, top to bottom, retrying until the
 * grid has rendered the latest result.
 */
export const expectColumnValues = async (
  page: Page,
  column: string,
  values: string[],
): Promise<void> => {
  await expect.poll(() => getColumnValues(page, column)).toEqual(values);
};

// ----------------------------- saving queries -----------------------------

/**
 * Fill in and submit the `Create New Query` dialog, then wait for the app to
 * move to the new query's edit route. Returns the new query's id.
 *
 * The app then reloads the editor on the saved query: wait for whatever the
 * test needs next (e.g. {@link getQueryTitle}) — or reload or navigate away
 * straight away, without paying for that load.
 */
export const submitCreateQueryDialog = async (
  page: Page,
  name: string,
): Promise<string> => {
  const previousUrl = page.url();
  await expect(page.getByText('Create New Query')).toBeVisible();
  await page.getByTitle('New Query Name').fill(name);
  await page.getByRole('button', { name: 'Create Query' }).click();

  await expect(page).not.toHaveURL(previousUrl);
  await expect(page).toHaveURL(/\/edit\/[^/?]+/);
  const queryId = new URL(page.url()).pathname.split('/edit/')[1];
  if (!queryId) {
    throw new Error(`No query id in the edit route: ${page.url()}`);
  }
  return decodeURIComponent(queryId);
};

/**
 * Save the query being built as a new query named `name`; return its id
 * once the app has moved to its edit route (see
 * {@link submitCreateQueryDialog}).
 */
export const saveNewQuery = async (
  page: Page,
  name: string,
): Promise<string> => {
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  return submitCreateQueryDialog(page, name);
};
