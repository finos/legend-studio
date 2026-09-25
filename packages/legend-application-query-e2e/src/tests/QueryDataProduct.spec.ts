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
  COVID_ACCESS_POINT_GROUP_ID,
  COVID_DATA_PRODUCT_PATH,
  COVID_DATA_PRODUCT_TITLE,
  COVID_DEATHS_ACCESS_POINT_ID,
  COVID_LAKEHOUSE_ACCESS_POINT_GROUP_ID,
  COVID_LAKEHOUSE_ACCESS_POINT_ID,
  COVID_MORTALITY_ACCESS_POINT_GROUP_ID,
  COVID_REPORTING_ACCESS_POINT_GROUP_ID,
  mockModelAccessDataProduct,
  TEST_PROJECT_VERSION,
} from '../support/DepotMock.js';
import {
  setupEngineMock,
  type CapturedEngineRequests,
} from '../support/EngineMock.js';
import {
  AD_HOC_DATA_PRODUCT_TITLE,
  mockLakehouseUserEnvironment,
  mockLiteDataProducts,
  SECOND_PAGE_DATA_PRODUCT_TITLE,
  TEST_LAKEHOUSE_ENVIRONMENT,
} from '../support/LakehouseMock.js';
import {
  at,
  getChainedFunction,
  getElementPath,
  getFunctionChain,
  type V1_ExecuteInput,
} from '../support/QueryProtocol.js';

/**
 * Data products are queried through a model access point group (a mapping
 * over the model) or a Lakehouse access point (a relation), both run on a
 * Lakehouse runtime created for the user's Lakehouse environment. They are
 * listed for picking by the Lakehouse contract server.
 */

const PROJECT_GAV = `org.finos.legend.test:legend-query-test:${TEST_PROJECT_VERSION}`;
const MODEL_ACCESS_URL = `data-product/model/${PROJECT_GAV}/${COVID_DATA_PRODUCT_PATH}/${COVID_ACCESS_POINT_GROUP_ID}`;
const LAKEHOUSE_ACCESS_URL = `data-product/lakehouse/${PROJECT_GAV}/${COVID_DATA_PRODUCT_PATH}/${COVID_LAKEHOUSE_ACCESS_POINT_ID}`;

// `Cases` of the mock data, and of its confirmed cases only
const ALL_CASES = ['250', '301', '180', '420', '95', '512', '77', '640'];
const CONFIRMED_CASES = ['250', '301', '512', '640'];
const DEATH_CASES = ['420', '77'];

let captured: CapturedEngineRequests;

const getExplorer = (page: Page): Locator =>
  page.getByTestId('query__builder__explorer');

const getResultPanel = (page: Page): Locator =>
  page.getByTestId('query__builder__result__panel');

/** The data product picker, showing the data product being queried. */
const getDataProductSelector = (page: Page): Locator =>
  page.locator('.query-builder__setup__config-group__item', {
    hasText: 'Data Product',
  });

/**
 * The access point group picker (labelled "Execution ID"), showing the model
 * access point group or Lakehouse access point being queried.
 */
const getAccessSelector = (page: Page): Locator =>
  page.getByRole('combobox', { name: 'Execution ID' });

const getAccessSelected = (page: Page): Locator =>
  page.locator('.query-builder__setup__config-group__item', {
    has: getAccessSelector(page),
  });

/** Pick the model access point group, or Lakehouse access point, `id`. */
const chooseAccess = async (page: Page, id: string): Promise<void> => {
  await getAccessSelector(page).click();
  await page.getByRole('option', { name: new RegExp(`^${id}`) }).click();
};

/** Wait for the explorer to show the model's root class. */
const waitForModel = async (page: Page): Promise<void> => {
  await expect(getExplorer(page).getByText('COVIDData')).toBeVisible({
    timeout: 30_000,
  });
};

/** Wait for the explorer to show the Lakehouse access point `id`. */
const waitForAccessPoint = async (page: Page, id: string): Promise<void> => {
  await expect(getExplorer(page).getByText(id, { exact: true })).toBeVisible({
    timeout: 30_000,
  });
};

const project = async (page: Page, column: string): Promise<void> => {
  await getExplorer(page)
    .getByText(column, { exact: true })
    .dragTo(page.getByTestId('query__builder__tds__projection'));
  await expect(
    page.getByTestId('QUERY_BUILDER_TDS_PROJECTION_COLUMN'),
  ).toHaveCount(1);
};

/** Run the query; return what the app sent to execute it. */
const runQuery = async (page: Page): Promise<V1_ExecuteInput> => {
  const executionsBefore = captured.executeInputs.length;
  await getResultPanel(page).getByText('Run Query', { exact: true }).click();
  await expect
    .poll(() => captured.executeInputs.length, { timeout: 30_000 })
    .toBeGreaterThan(executionsBefore);
  await expect(getResultPanel(page).getByText(/\d+ row\(s\)/)).toBeVisible();
  return at(
    captured.executeInputs,
    captured.executeInputs.length - 1,
  ) as unknown as V1_ExecuteInput;
};

/** The values of a result column, top to bottom as displayed. */
const getColumnValues = (page: Page, column: string): Promise<string[]> =>
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

/** The Lakehouse runtime the query runs on, from the model sent with it. */
const getLakehouseRuntime = (executeInput: V1_ExecuteInput): unknown =>
  JSON.stringify(executeInput.model).match(
    /"runtimeValue":(?<runtime>\{"_type":"LakehouseRuntime"[^}]*\})/,
  )?.groups?.runtime;

test.beforeEach(async ({ page }) => {
  captured = await setupEngineMock(page, {
    // Lakehouse data products are only listed behind this flag, for now
    coreOptions: { NonProductionFeatureFlag: true },
  });
  await mockModelAccessDataProduct(page);
  await mockLiteDataProducts(page);
});

test.describe('with a Lakehouse environment', () => {
  test.beforeEach(async ({ page }) => {
    await mockLakehouseUserEnvironment(page);
  });

  test('a model access point group opens on its queryable classes', async ({
    page,
  }) => {
    await page.goto(MODEL_ACCESS_URL);
    await expect(getExplorer(page).getByText('COVIDData')).toBeVisible({
      timeout: 30_000,
    });

    await expect(getDataProductSelector(page)).toContainText(
      COVID_DATA_PRODUCT_TITLE,
    );
    // the group's mapping is queried starting from its root class
    await expect(
      page
        .locator('.query-builder__setup__config-group__item', {
          hasText: 'Entity',
        })
        // setup items nest; take the innermost
        .last(),
    ).toContainText('COVIDData');
    await expect(
      getExplorer(page).getByText('Cases', { exact: true }),
    ).toBeVisible();
  });

  test("a model access query runs on the data product, with a Lakehouse runtime for the user's environment", async ({
    page,
  }) => {
    await page.goto(MODEL_ACCESS_URL);
    await project(page, 'Cases');
    const executeInput = await runQuery(page);

    expect(await getColumnValues(page, 'Cases')).toEqual(ALL_CASES);

    // `...->with(test::CovidDataProduct)->from(<Lakehouse runtime>)`
    const lambda = executeInput.function;
    expect(getFunctionChain(lambda)).toEqual([
      'from',
      'with',
      'take',
      'project',
      'getAll',
    ]);
    expect(
      getElementPath(at(getChainedFunction(lambda, 1).parameters, 1)),
    ).toBe(COVID_DATA_PRODUCT_PATH);
    expect(getLakehouseRuntime(executeInput)).toContain(
      `"environment":"${TEST_LAKEHOUSE_ENVIRONMENT}"`,
    );
  });

  test('a saved data product query reopens on the data product', async ({
    page,
  }) => {
    await page.goto(MODEL_ACCESS_URL);
    await project(page, 'Cases');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByTitle('New Query Name').fill('Data Product Query');
    await page.getByRole('button', { name: 'Create Query' }).click();
    await expect(page).toHaveURL(/\/edit\//);

    await page.reload();
    await expect(page.getByTitle('Double-click to rename query')).toHaveText(
      'Data Product Query',
      { timeout: 30_000 },
    );
    await expect(getDataProductSelector(page)).toContainText(
      COVID_DATA_PRODUCT_TITLE,
    );
    await expect(
      page.getByTestId('QUERY_BUILDER_TDS_PROJECTION_COLUMN'),
    ).toHaveText(['Cases']);
    await runQuery(page);
    expect(await getColumnValues(page, 'Cases')).toEqual(ALL_CASES);
  });

  test('a Lakehouse access point lists its columns and queries them', async ({
    page,
  }) => {
    await page.goto(LAKEHOUSE_ACCESS_URL);
    // the access point's relation columns, rather than a class's properties
    await expect(
      getExplorer(page).getByText(COVID_LAKEHOUSE_ACCESS_POINT_ID),
    ).toBeVisible({
      timeout: 30_000,
    });
    for (const column of ['Case Type', 'Cases', 'Date']) {
      await expect(
        getExplorer(page).getByText(column, { exact: true }),
      ).toBeVisible();
    }

    await project(page, 'Cases');
    const executeInput = await runQuery(page);
    expect(await getColumnValues(page, 'Cases')).toEqual(CONFIRMED_CASES);

    // `#>{test::CovidDataProduct.confirmed_cases}#->project(...)`, run on a
    // Lakehouse runtime
    const lambda = executeInput.function;
    expect(getFunctionChain(lambda)).toEqual(['from', 'take', 'project']);
    expect(at(getChainedFunction(lambda, 2).parameters, 0)).toMatchObject({
      _type: 'classInstance',
      value: {
        path: [COVID_DATA_PRODUCT_PATH, COVID_LAKEHOUSE_ACCESS_POINT_ID],
      },
    });
    expect(getLakehouseRuntime(executeInput)).toContain(
      `"environment":"${TEST_LAKEHOUSE_ENVIRONMENT}"`,
    );
  });

  test('a Lakehouse access point query can be filtered', async ({ page }) => {
    await page.goto(LAKEHOUSE_ACCESS_URL);
    await project(page, 'Cases');
    const filterPanel = page.getByTestId('query__builder__filter__panel');
    await getExplorer(page)
      .getByText('Cases', { exact: true })
      .dragTo(filterPanel);

    // `Cases > 300`
    await filterPanel.getByTitle('Choose Operator...').click();
    await page
      .locator(
        '.query-builder-filter-tree__condition-node__operator__dropdown__option',
        { hasText: /^>$/ },
      )
      .click();
    await filterPanel
      .locator('.value-spec-editor__editable__display--content')
      .click();
    await filterPanel.locator('.value-spec-editor input').fill('300');
    await page.keyboard.press('Enter');

    await runQuery(page);
    expect(await getColumnValues(page, 'Cases')).toEqual(['301', '512', '640']);
  });

  test('the data product dropdown lists the data products deployed from projects, from every page of the listing', async ({
    page,
  }) => {
    await page.goto('');
    await page.getByRole('combobox', { name: 'Data Space' }).click();

    // alongside data spaces
    const options = page.locator('.selector-input__option');
    await expect(options.filter({ hasText: 'Test DataSpace' })).toBeVisible();
    await expect(
      options.filter({ hasText: COVID_DATA_PRODUCT_TITLE }),
    ).toBeVisible();
    await expect(
      options.filter({ hasText: SECOND_PAGE_DATA_PRODUCT_TITLE }),
    ).toBeVisible();
    // ad hoc deployments have no project to query from
    await expect(
      options.filter({ hasText: AD_HOC_DATA_PRODUCT_TITLE }),
    ).toHaveCount(0);
  });

  test('picking a data product opens it on its first model access point group', async ({
    page,
  }) => {
    await page.goto('');
    await page.getByRole('combobox', { name: 'Data Space' }).click();
    await page
      .locator('.selector-input__option', {
        hasText: COVID_DATA_PRODUCT_TITLE,
      })
      .click();

    await waitForModel(page);
    await expect(getDataProductSelector(page)).toContainText(
      COVID_DATA_PRODUCT_TITLE,
    );
    await expect(getAccessSelected(page)).toContainText(
      COVID_ACCESS_POINT_GROUP_ID,
    );

    await project(page, 'Cases');
    const executeInput = await runQuery(page);
    expect(await getColumnValues(page, 'Cases')).toEqual(ALL_CASES);
    expect(
      getElementPath(
        at(getChainedFunction(executeInput.function, 1).parameters, 1),
      ),
    ).toBe(COVID_DATA_PRODUCT_PATH);
  });

  test('a model access query can switch to another model access point group, and is saved on it', async ({
    page,
  }) => {
    await page.goto(MODEL_ACCESS_URL);
    await waitForModel(page);

    // only the model access point groups: Lakehouse access points aren't
    // loaded for a model access query
    await getAccessSelector(page).click();
    await expect(page.getByRole('option')).toHaveText([
      `${COVID_ACCESS_POINT_GROUP_ID}MODEL`,
      `${COVID_REPORTING_ACCESS_POINT_GROUP_ID}MODEL`,
    ]);
    await page
      .getByRole('option', {
        name: new RegExp(`^${COVID_REPORTING_ACCESS_POINT_GROUP_ID}`),
      })
      .click();
    await expect(getAccessSelected(page)).toContainText(
      COVID_REPORTING_ACCESS_POINT_GROUP_ID,
    );

    await waitForModel(page);
    await project(page, 'Cases');
    await runQuery(page);
    expect(await getColumnValues(page, 'Cases')).toEqual(ALL_CASES);

    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await page.getByTitle('New Query Name').fill('Reporting Query');
    await page.getByRole('button', { name: 'Create Query' }).click();
    await expect(page).toHaveURL(/\/edit\//);
    await page.reload();
    await expect(page.getByTitle('Double-click to rename query')).toHaveText(
      'Reporting Query',
      { timeout: 30_000 },
    );
    await expect(getAccessSelected(page)).toContainText(
      COVID_REPORTING_ACCESS_POINT_GROUP_ID,
    );
  });

  test('a Lakehouse access query can switch to another Lakehouse access point', async ({
    page,
  }) => {
    await page.goto(LAKEHOUSE_ACCESS_URL);
    await waitForAccessPoint(page, COVID_LAKEHOUSE_ACCESS_POINT_ID);

    // each access point is shown with its group
    await getAccessSelector(page).click();
    await expect(page.getByRole('option')).toHaveText([
      `${COVID_LAKEHOUSE_ACCESS_POINT_ID}${COVID_LAKEHOUSE_ACCESS_POINT_GROUP_ID}LAKEHOUSE`,
      `${COVID_DEATHS_ACCESS_POINT_ID}${COVID_MORTALITY_ACCESS_POINT_GROUP_ID}LAKEHOUSE`,
    ]);
    await page
      .getByRole('option', {
        name: new RegExp(`^${COVID_DEATHS_ACCESS_POINT_ID}`),
      })
      .click();
    await waitForAccessPoint(page, COVID_DEATHS_ACCESS_POINT_ID);

    await project(page, 'Cases');
    const executeInput = await runQuery(page);
    expect(await getColumnValues(page, 'Cases')).toEqual(DEATH_CASES);
    expect(
      at(getChainedFunction(executeInput.function, 2).parameters, 0),
    ).toMatchObject({
      value: { path: [COVID_DATA_PRODUCT_PATH, COVID_DEATHS_ACCESS_POINT_ID] },
    });
    expect(getLakehouseRuntime(executeInput)).toContain(
      `"environment":"${TEST_LAKEHOUSE_ENVIRONMENT}"`,
    );
  });

  test('the copied link to a data product query follows the access point switched to', async ({
    page,
  }) => {
    await page.goto(LAKEHOUSE_ACCESS_URL);
    await waitForAccessPoint(page, COVID_LAKEHOUSE_ACCESS_POINT_ID);
    await chooseAccess(page, COVID_DEATHS_ACCESS_POINT_ID);
    await waitForAccessPoint(page, COVID_DEATHS_ACCESS_POINT_ID);

    await page
      .getByTitle('copy data product query set up link to clipboard')
      .click();
    await expect(
      page.getByText('Copied data product query set up link to clipboard'),
    ).toBeVisible();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toMatch(
      new RegExp(
        `/query/data-product/lakehouse/${PROJECT_GAV}/${COVID_DATA_PRODUCT_PATH}/${COVID_DEATHS_ACCESS_POINT_ID}$`,
      ),
    );

    await page.goto(link);
    await waitForAccessPoint(page, COVID_DEATHS_ACCESS_POINT_ID);
    await expect(getAccessSelected(page)).toContainText(
      COVID_DEATHS_ACCESS_POINT_ID,
    );
  });
});

test('a data product needs a Lakehouse environment to be queried', async ({
  page,
}) => {
  await mockLakehouseUserEnvironment(page, { environment: undefined });
  await page.goto(MODEL_ACCESS_URL);

  await expect(
    page.getByText(
      'Unable to resolve lakehouse user environment. Please ensure your lakehouse entitlements are configured.',
    ),
  ).toBeVisible({ timeout: 30_000 });
  // nothing is loaded to query
  await expect(
    getExplorer(page).getByText(
      'Specify the class, mapping, and runtime to start building query',
    ),
  ).toBeVisible();
});
