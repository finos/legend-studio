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

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import {
  Connection,
  CubeDocument,
  DataProductAccessPointSource,
  Join,
  printIR,
  Query,
} from '@finos/legend-cube';
import { flowResult } from 'mobx';
import { LEGEND_CUBE_USER_DATA_KEY } from '../../__lib__/LegendCubeLabels.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  createFakeCubeDataProductCatalog,
  FAKE_CUSTOMERS_SCHEMA,
  FAKE_DAILY_ORDERS_SCHEMA,
  FAKE_DATA_PRODUCT_CANDIDATES,
} from '../../__test-utils__/FakeCubeDataProductCatalog.js';
import {
  createCubeDataProductModel,
  CUBE_DATA_PRODUCT_RUNTIME_PATH,
  CUBE_DEFAULT_CONSUMER_WAREHOUSE,
  CubeDataProductEnvironmentType,
} from '../../graph-manager/CubeDataProduct.js';
import type {
  CubeDataProductCandidate,
  CubeDataProductDescription,
} from '../../graph-manager/CubeDataProductCatalog.js';
import { rememberCubeWarehouse } from '../CubeDataProductWarehouse.js';
import { CubeEditorState } from '../CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';
import { CubeSourcePickerTabKey } from '../source-picker/CubeSourcePickerTab.js';

const { PRODUCTION, PRODUCTION_PARALLEL } = CubeDataProductEnvironmentType;

const setUp = (
  document?: CubeDocument,
): ReturnType<typeof TEST__createCubeHost> & { state: CubeEditorState } => {
  const created = TEST__createCubeHost();
  return { ...created, state: new CubeEditorState(created.host, document) };
};

/** Lets the flows started by an action run */
const settle = async (): Promise<void> => {
  for (let tries = 0; tries < 10; tries++) {
    await Promise.resolve();
  }
};

/** A deferred promise, to hold a catalog call open */
const deferred = <T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
};

/** Opens the dialog on the Data product tab and waits for the products */
const openTab = async (state: CubeEditorState) => {
  state.sourcePicker.open(CubeSourcePickerTabKey.DATA_PRODUCT);
  await settle();
  return state.sourcePicker.dataProductTab;
};

/** Picks a product by id, and waits for its access points */
const pickProduct = async (
  tab: CubeEditorState['sourcePicker']['dataProductTab'],
  id: string,
): Promise<void> => {
  tab.selectCandidate(
    tab.visibleCandidates.find((candidate) => candidate.id === id),
  );
  await settle();
};

/** Adds an access point through the dialog */
const add = async (
  state: CubeEditorState,
  group: string,
  accessPoint: string,
): Promise<void> => {
  state.sourcePicker.dataProductTab.selectAccessPoint(group, accessPoint);
  await flowResult(state.sourcePicker.confirm());
};

const nodeIds = (state: CubeEditorState): string[] =>
  state.document.query.nodes.map(({ id }) => id);

beforeEach(() => {
  localStorage.clear();
});

describe('Data product tab', () => {
  test("Lists a class's deployed products, Production first, and lists again on another mode", async () => {
    const { state, dataProducts } = setUp();
    const tab = await openTab(state);
    expect(tab.environmentType).toBe(PRODUCTION);
    expect(tab.visibleCandidates.map((candidate) => candidate.id)).toEqual([
      'ORDERS_PRODUCT',
      'RETURNS_PRODUCT',
    ]);
    tab.setSearch('returns');
    expect(tab.visibleCandidates.map((candidate) => candidate.id)).toEqual([
      'RETURNS_PRODUCT',
    ]);
    tab.setSearch('');
    tab.setEnvironmentType(PRODUCTION_PARALLEL);
    await settle();
    expect(
      tab.visibleCandidates.map((candidate) => candidate.environmentType),
    ).toEqual([PRODUCTION_PARALLEL]);
    expect(dataProducts.search).toHaveBeenCalledTimes(2);
  });

  test("Shows a product's access points, and lets only a pickable one be added, with a warehouse", async () => {
    const { state } = setUp();
    const tab = await openTab(state);
    await pickProduct(tab, 'ORDERS_PRODUCT');
    expect(
      tab.description?.groups.map((group) => [
        group.id,
        group.accessPoints.map((point) => [point.id, point.isPickable]),
      ]),
    ).toEqual([
      [
        'core',
        [
          ['daily_orders', true],
          ['orders_as_of', false],
        ],
      ],
      [
        'reference',
        [
          ['customers', true],
          ['raw_feed', false],
        ],
      ],
    ]);
    expect(state.sourcePicker.canConfirm).toBe(false);
    tab.selectAccessPoint('core', 'orders_as_of');
    expect(state.sourcePicker.canConfirm).toBe(false);
    tab.selectAccessPoint('core', 'daily_orders');
    expect(tab.warehouse).toBe(CUBE_DEFAULT_CONSUMER_WAREHOUSE);
    expect(state.sourcePicker.canConfirm).toBe(true);
    tab.setWarehouse('  ');
    expect(state.sourcePicker.canConfirm).toBe(false);
  });

  test("Adds an access point typed by the product's artifact, with no engine call; the first saves the project and the warehouse, which is remembered", async () => {
    const { state, fake, host } = setUp();
    const tab = await openTab(state);
    await pickProduct(tab, 'ORDERS_PRODUCT');
    tab.setWarehouse('SALES_WH');
    await add(state, 'core', 'daily_orders');
    expect(state.sourcePicker.isOpen).toBe(false);
    expect(state.document.context).toEqual({
      model: createCubeDataProductModel({
        groupId: 'com.example.sales',
        artifactId: 'orders-products',
        versionId: '1.4.0',
        environmentType: PRODUCTION,
        warehouse: 'SALES_WH',
      }),
      runtime: CUBE_DATA_PRODUCT_RUNTIME_PATH,
    });
    const [node] = state.document.query.nodes;
    expect(node).toBeInstanceOf(DataProductAccessPointSource);
    expect(node).toMatchObject({
      id: 'dataProductAccessPoint101',
      dataProduct: 'sales::products::OrdersProduct',
      accessPointGroup: 'core',
      accessPoint: 'daily_orders',
      dataProductId: 'ORDERS_PRODUCT',
      deploymentId: 'deployment-orders_product',
    });
    const { resolution } = node as DataProductAccessPointSource;
    expect(
      resolution.kind === 'resolved' &&
        resolution.schema === FAKE_DAILY_ORDERS_SCHEMA,
    ).toBe(true);
    expect(fake.resolveSchemas).not.toHaveBeenCalled();
    expect(
      host.applicationStore.userDataService.getStringValue(
        LEGEND_CUBE_USER_DATA_KEY.DATA_PRODUCT_WAREHOUSE,
      ),
    ).toBe('SALES_WH');

    // one undo step
    state.undo();
    expect(state.document.context).toBeUndefined();
    expect(nodeIds(state)).toEqual([]);
  });

  test('Starts a new cube on the warehouse the viewer last picked', async () => {
    const { state, host } = setUp();
    host.applicationStore.userDataService.persistValue(
      LEGEND_CUBE_USER_DATA_KEY.DATA_PRODUCT_WAREHOUSE,
      'MY_WH',
    );
    const tab = await openTab(state);
    expect(tab.warehouse).toBe('MY_WH');
  });

  test("Keeps a data product cube to its project and version, reopening on its product's access points, expanded", async () => {
    const { state, dataProducts } = setUp();
    let tab = await openTab(state);
    await pickProduct(tab, 'ORDERS_PRODUCT');
    await add(state, 'core', 'daily_orders');

    // a new page on the saved cube
    const reopened = new CubeEditorState(state.host, state.document);
    dataProducts.describe.mockClear();
    tab = await openTab(reopened);
    expect(reopened.sourcePicker.activeTab.key).toBe(
      CubeSourcePickerTabKey.DATA_PRODUCT,
    );
    // the snapshot-version product is from another version: not offered
    expect(tab.visibleCandidates.map((candidate) => candidate.id)).toEqual([
      'ORDERS_PRODUCT',
    ]);
    expect(tab.candidate?.id).toBe('ORDERS_PRODUCT');
    expect(tab.description?.groups.length).toBe(2);
    expect(dataProducts.describe).toHaveBeenCalledTimes(1);
    // the mode and the warehouse are the cube's
    tab.setEnvironmentType(PRODUCTION_PARALLEL);
    tab.setWarehouse('OTHER_WH');
    expect(tab.environmentType).toBe(PRODUCTION);
    expect(tab.warehouse).toBe(CUBE_DEFAULT_CONSUMER_WAREHOUSE);
    // and the other tabs are disabled
    expect(
      reopened.sourcePicker.tabs.map((each) => [
        each.key,
        reopened.sourcePicker.isTabEnabled(each),
      ]),
    ).toEqual([
      [CubeSourcePickerTabKey.MODEL, false],
      [CubeSourcePickerTabKey.DIRECT_CONNECTION, false],
      [CubeSourcePickerTabKey.DATA_PRODUCT, true],
    ]);
    expect(reopened.canAddNode('relational')).toBe(false);
    expect(reopened.canAddNode('dataProductAccessPoint')).toBe(true);
  });

  test('Joins two access points of the same data product, added through the tab, and runs the cube', async () => {
    const { state, fake } = setUp();
    let tab = await openTab(state);
    await pickProduct(tab, 'ORDERS_PRODUCT');
    await add(state, 'core', 'daily_orders');
    tab = await openTab(state);
    expect(tab.candidate?.id).toBe('ORDERS_PRODUCT');
    await add(state, 'reference', 'customers');
    expect(nodeIds(state)).toEqual([
      'dataProductAccessPoint101',
      'dataProductAccessPoint102',
    ]);
    const [orders, customers] = state.document.query.nodes as [
      DataProductAccessPointSource,
      DataProductAccessPointSource,
    ];
    expect(
      customers.resolution.kind === 'resolved' &&
        customers.resolution.schema === FAKE_CUSTOMERS_SCHEMA,
    ).toBe(true);
    const join = new Join('join101', {
      leftColumns: ['CUSTOMER_ID'],
      rightColumns: ['CUSTOMER_ID'],
    });
    state.applyDocument(
      state.document.withQuery(
        new Query(
          [orders, customers, join],
          [
            new Connection(orders.id, join.id, 'leftTds'),
            new Connection(customers.id, join.id, 'rightTds'),
          ],
          join.id,
        ),
      ),
    );
    const schema = state.analysis.schemas.get('join101');
    expect(schema).toBeDefined();
    const columns = schema?.columns.map((column) => column.name) ?? [];
    fake.execute.mockResolvedValueOnce({
      columns,
      rows: [columns.map(() => 'x')],
      sql: [],
      durationMs: 1,
    });
    await flowResult(state.execution.execute());
    expect(state.execution.error).toBeUndefined();
    expect(state.execution.result?.rows).toHaveLength(1);
    const [model, lambda] = fake.execute.mock.calls[0] as [
      unknown,
      Parameters<typeof printIR>[0],
    ];
    expect(model).toBe(state.document.context?.model);
    const printed = printIR(lambda);
    expect(printed).toContain(
      '#P{sales::products::OrdersProduct.daily_orders}#',
    );
    expect(printed).toContain('#P{sales::products::OrdersProduct.customers}#');
    expect(printed).toContain(`->from(${CUBE_DATA_PRODUCT_RUNTIME_PATH})`);
  });

  test('Offers no data product on a cube of tables, and no tab on a host without a catalog', async () => {
    const { state } = setUp(
      new CubeDocument().withContext({ model: CUBE_NORTHWIND_MODEL }),
    );
    expect(state.canAddNode('dataProductAccessPoint')).toBe(false);
    expect(state.sourcePicker.dataProductTab.canConfirm).toBe(false);
    const { host } = TEST__createCubeHost();
    const withoutCatalog = new CubeEditorState({
      ...host,
      dataProductCatalog: undefined,
    });
    expect(
      withoutCatalog.sourcePicker.tabs.map((each) => each.key),
    ).not.toContain(CubeSourcePickerTabKey.DATA_PRODUCT);
    expect(
      withoutCatalog.offeredSources.map((definition) => definition.type),
    ).toEqual(['relational']);
  });

  test("Drops a product's access points that arrive after another product was picked, or after the dialog closed", async () => {
    const { state, dataProducts } = setUp();
    const tab = await openTab(state);
    const late = deferred<CubeDataProductDescription>();
    dataProducts.describe.mockReturnValueOnce(late.promise);
    const [orders, returns] = tab.visibleCandidates;
    tab.selectCandidate(orders);
    expect(tab.isDescribing).toBe(true);
    tab.selectCandidate(returns);
    await settle();
    expect(tab.description?.candidate).toBe(returns);
    late.resolve(
      await dataProducts.catalog.describe(orders as NonNullable<typeof orders>),
    );
    await settle();
    expect(tab.description?.candidate).toBe(returns);

    const closed = deferred<CubeDataProductDescription>();
    dataProducts.describe.mockReturnValueOnce(closed.promise);
    tab.selectCandidate(orders);
    state.sourcePicker.close();
    closed.resolve(
      await dataProducts.catalog.describe(orders as NonNullable<typeof orders>),
    );
    await settle();
    expect(tab.description).toBeUndefined();
    expect(tab.isDescribing).toBe(false);
  });

  test("Doesn't leave a product stuck without its access points after a close mid-load or a failure", async () => {
    const { state, dataProducts } = setUp();
    let tab = await openTab(state);
    const [orders] = tab.visibleCandidates;
    const held = deferred<CubeDataProductDescription>();
    dataProducts.describe.mockReturnValueOnce(held.promise);
    tab.selectCandidate(orders);
    state.sourcePicker.close();
    expect(tab.candidate).toBeUndefined();
    tab = await openTab(state);
    await pickProduct(tab, 'ORDERS_PRODUCT');
    expect(tab.description).toBeDefined();

    // a failed read is read again on picking the product again
    tab.selectCandidate(undefined);
    dataProducts.describe.mockRejectedValueOnce(new Error('Depot unavailable'));
    await pickProduct(tab, 'ORDERS_PRODUCT');
    expect(tab.error).toEqual({ message: 'Depot unavailable' });
    expect(tab.description).toBeUndefined();
    tab.selectCandidate(tab.candidate);
    await settle();
    expect(tab.description).toBeDefined();
  });

  test("Keeps a cube to its deployment class: the same version deployed to the other class isn't offered", async () => {
    // Production's products are listed on an empty cube first
    const { state, dataProducts } = setUp();
    let tab = await openTab(state);
    expect(
      tab.visibleCandidates.find(({ id }) => id === 'ORDERS_PRODUCT')
        ?.versionId,
    ).toBe('1.4.0');
    state.sourcePicker.close();
    state.importDocument(
      new CubeDocument().withContext({
        model: createCubeDataProductModel({
          groupId: 'com.example.sales',
          artifactId: 'orders-products',
          versionId: '1.4.0',
          environmentType: PRODUCTION_PARALLEL,
        }),
        runtime: CUBE_DATA_PRODUCT_RUNTIME_PATH,
      }),
      false,
    );
    // while the cube's class is listed, Production's list is still loaded
    const held = deferred<readonly CubeDataProductCandidate[]>();
    const search = dataProducts.search.getMockImplementation();
    dataProducts.search.mockReturnValueOnce(held.promise);
    tab = await openTab(state);
    expect(tab.environmentType).toBe(PRODUCTION_PARALLEL);
    expect(tab.isListing).toBe(true);
    expect(tab.visibleCandidates).toEqual([]);
    held.resolve(
      await (search as NonNullable<typeof search>)({
        text: '',
        environmentType: PRODUCTION_PARALLEL,
      }),
    );
    await settle();
    expect(
      tab.visibleCandidates.map((candidate) => candidate.environmentType),
    ).toEqual([PRODUCTION_PARALLEL]);
  });

  test("Starts an emptied cube on the viewer's warehouse, not the previous cube's", async () => {
    const { state, host } = setUp();
    let tab = await openTab(state);
    await pickProduct(tab, 'ORDERS_PRODUCT');
    tab.setWarehouse('CUBE_WH');
    await add(state, 'core', 'daily_orders');
    rememberCubeWarehouse(host.applicationStore.userDataService, 'VIEWER_WH');
    // the cube opens on its own warehouse and its product, which stays picked
    tab = await openTab(state);
    expect(tab.warehouse).toBe('CUBE_WH');
    expect(tab.description).toBeDefined();
    state.sourcePicker.close();
    expect(tab.candidate?.id).toBe('ORDERS_PRODUCT');
    state.importDocument(new CubeDocument(), false);
    tab = await openTab(state);
    expect(tab.warehouse).toBe('VIEWER_WH');
  });

  test('Stops the listing under way on another mode or on closing the dialog', async () => {
    const { state, dataProducts } = setUp();
    const held = deferred<readonly CubeDataProductCandidate[]>();
    dataProducts.search.mockReturnValueOnce(held.promise);
    const tab = await openTab(state);
    const signalOf = (call: number): AbortSignal | undefined =>
      dataProducts.search.mock.calls[call]?.[1];
    expect(signalOf(0)?.aborted).toBe(false);
    dataProducts.search.mockReturnValueOnce(held.promise);
    tab.setEnvironmentType(PRODUCTION_PARALLEL);
    expect(signalOf(0)?.aborted).toBe(true);
    expect(signalOf(1)?.aborted).toBe(false);
    state.sourcePicker.close();
    expect(signalOf(1)?.aborted).toBe(true);
    // a late answer changes nothing
    held.resolve([]);
    await settle();
    expect(tab.candidates).toBeUndefined();
    expect(tab.isListing).toBe(false);
  });

  test('Shows a failed listing in the tab, with its own retry, which lists again', async () => {
    const { state, dataProducts } = setUp();
    dataProducts.search.mockRejectedValueOnce(
      new Error('Lakehouse unavailable'),
    );
    const tab = await openTab(state);
    expect(tab.listError).toEqual({ message: 'Lakehouse unavailable' });
    expect(tab.error).toBeUndefined();
    tab.retryListing();
    await settle();
    expect(tab.listError).toBeUndefined();
    expect(tab.visibleCandidates).toHaveLength(2);
    expect(dataProducts.search).toHaveBeenCalledTimes(2);
  });

  test("Drops a product's failed read on another mode, with the product", async () => {
    const { state, dataProducts } = setUp();
    const tab = await openTab(state);
    dataProducts.describe.mockRejectedValueOnce(new Error('Depot unavailable'));
    await pickProduct(tab, 'ORDERS_PRODUCT');
    expect(tab.error).toEqual({ message: 'Depot unavailable' });
    tab.setEnvironmentType(PRODUCTION_PARALLEL);
    await settle();
    expect(tab.candidate).toBeUndefined();
    expect(tab.error).toBeUndefined();
  });

  test("Never says a lakehouse's list is cut short", async () => {
    const { host } = TEST__createCubeHost();
    const dataProducts = createFakeCubeDataProductCatalog(undefined, {
      searchLimit: 1,
    });
    const state = new CubeEditorState({
      ...host,
      dataProductCatalog: dataProducts.catalog,
    });
    const tab = await openTab(state);
    expect(tab.visibleCandidates).toHaveLength(2);
    expect(tab.isTruncated).toBe(false);
  });
});

describe('Data product tab, searching on a server', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const [ORDERS, RETURNS] = FAKE_DATA_PRODUCT_CANDIDATES as [
    CubeDataProductCandidate,
    CubeDataProductCandidate,
  ];

  /** A host whose catalog searches on a server */
  const setUpSearch = (
    searchLimit?: number,
  ): ReturnType<typeof setUp> & {
    dataProducts: ReturnType<typeof createFakeCubeDataProductCatalog>;
  } => {
    const created = TEST__createCubeHost();
    const dataProducts = createFakeCubeDataProductCatalog(undefined, {
      searchesOnServer: true,
      ...(searchLimit === undefined ? {} : { searchLimit }),
    });
    const host = { ...created.host, dataProductCatalog: dataProducts.catalog };
    return {
      ...created,
      host,
      dataProducts,
      state: new CubeEditorState(host),
    };
  };

  /** Types in the search box, and lets the typing pause */
  const type = async (
    tab: CubeEditorState['sourcePicker']['dataProductTab'],
    text: string,
  ): Promise<void> => {
    tab.setSearch(text);
    jest.advanceTimersByTime(300);
    await settle();
  };

  test("Searches as the viewer types, once typing pauses, and shows only the latest search's matches, in the server's order", async () => {
    const { state, dataProducts } = setUpSearch();
    const tab = await openTab(state);
    const searchOf = (call: number) => dataProducts.search.mock.calls[call];
    expect(searchOf(0)?.[0]).toEqual({ text: '', environmentType: PRODUCTION });
    const first = deferred<readonly CubeDataProductCandidate[]>();
    const second = deferred<readonly CubeDataProductCandidate[]>();
    dataProducts.search
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    tab.setSearch('a');
    jest.advanceTimersByTime(299);
    expect(dataProducts.search).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1);
    expect(searchOf(1)?.[0]).toEqual({
      text: 'a',
      environmentType: PRODUCTION,
    });
    tab.setSearch('ab ');
    jest.advanceTimersByTime(300);
    expect(searchOf(2)?.[0]).toEqual({
      text: 'ab',
      environmentType: PRODUCTION,
    });
    expect(searchOf(1)?.[1]?.aborted).toBe(true);
    // the server's match for 'ab' is kept, though its title doesn't hold it
    second.resolve([RETURNS]);
    await settle();
    first.resolve([ORDERS]);
    await settle();
    expect(tab.visibleCandidates).toEqual([RETURNS]);
    expect(dataProducts.search).toHaveBeenCalledTimes(3);
  });

  test("Keeps the search text on another mode, searching it there, and drops the previous mode's late answer", async () => {
    const { state, dataProducts } = setUpSearch();
    const tab = await openTab(state);
    const late = deferred<readonly CubeDataProductCandidate[]>();
    dataProducts.search.mockReturnValueOnce(late.promise);
    await type(tab, 'orders');
    // typed, and the mode changed before the typing paused
    tab.setSearch('orders ');
    tab.setEnvironmentType(PRODUCTION_PARALLEL);
    jest.advanceTimersByTime(300);
    await settle();
    expect(dataProducts.search).toHaveBeenCalledTimes(3);
    expect(dataProducts.search.mock.calls[2]?.[0]).toEqual({
      text: 'orders',
      environmentType: PRODUCTION_PARALLEL,
    });
    late.resolve([ORDERS]);
    await settle();
    expect(tab.search).toBe('orders ');
    expect(
      tab.visibleCandidates.map((candidate) => candidate.environmentType),
    ).toEqual([PRODUCTION_PARALLEL]);
  });

  test('Searches nothing typed as the dialog closed, takes no answer after it closed, and searches the typed text on reopening', async () => {
    const { state, dataProducts } = setUpSearch();
    let tab = await openTab(state);
    const held = deferred<readonly CubeDataProductCandidate[]>();
    dataProducts.search.mockReturnValueOnce(held.promise);
    await type(tab, 'ord');
    tab.setSearch('orde');
    state.sourcePicker.close();
    jest.advanceTimersByTime(300);
    await settle();
    expect(dataProducts.search).toHaveBeenCalledTimes(2);
    held.resolve([]);
    await settle();
    expect(tab.visibleCandidates).toEqual([ORDERS, RETURNS]);
    expect(tab.listError).toBeUndefined();
    tab = await openTab(state);
    expect(dataProducts.search).toHaveBeenCalledTimes(3);
    expect(dataProducts.search.mock.calls[2]?.[0]).toEqual({
      text: 'orde',
      environmentType: PRODUCTION,
    });
    expect(tab.visibleCandidates).toEqual([ORDERS]);
  });

  test('Shows a failed search in the tab, and searches the same text again on retry, leaving the other tabs alone', async () => {
    const { state, dataProducts } = setUpSearch();
    const tab = await openTab(state);
    dataProducts.search.mockRejectedValueOnce(
      new Error('Marketplace unavailable'),
    );
    await type(tab, 'ord');
    expect(tab.listError).toEqual({ message: 'Marketplace unavailable' });
    expect(tab.error).toBeUndefined();
    expect(state.sourcePicker.modelTab.error).toBeUndefined();
    expect(state.sourcePicker.directTab.error).toBeUndefined();
    tab.retryListing();
    await settle();
    expect(dataProducts.search).toHaveBeenCalledTimes(3);
    expect(dataProducts.search.mock.calls[2]?.[0]).toEqual({
      text: 'ord',
      environmentType: PRODUCTION,
    });
    expect(tab.listError).toBeUndefined();
    expect(tab.visibleCandidates).toEqual([ORDERS]);
  });

  test("Reopens a data product cube on its own product, expanded, with no search, and keeps a search to the cube's project", async () => {
    const { state, dataProducts } = setUpSearch();
    let tab = await openTab(state);
    await pickProduct(tab, 'ORDERS_PRODUCT');
    await add(state, 'core', 'daily_orders');

    // a new page on the saved cube
    const reopened = new CubeEditorState(state.host, state.document);
    dataProducts.search.mockClear();
    dataProducts.describe.mockClear();
    tab = await openTab(reopened);
    expect(dataProducts.search).not.toHaveBeenCalled();
    expect(dataProducts.describe).toHaveBeenCalledTimes(1);
    expect(tab.candidate).toMatchObject({
      id: 'ORDERS_PRODUCT',
      deploymentId: 'deployment-orders_product',
      dataProductPath: 'sales::products::OrdersProduct',
      groupId: 'com.example.sales',
      artifactId: 'orders-products',
      versionId: '1.4.0',
      environmentType: PRODUCTION,
    });
    expect(tab.description?.groups).toHaveLength(2);
    // the snapshot-version product the server matches is from another version
    await type(tab, 'returns');
    expect(dataProducts.search).toHaveBeenCalledTimes(1);
    expect(tab.visibleCandidates).toEqual([]);
    // reopening on the same search searches nothing again
    reopened.sourcePicker.close();
    tab = await openTab(reopened);
    expect(dataProducts.search).toHaveBeenCalledTimes(1);
    await type(tab, '');
    expect(dataProducts.search).toHaveBeenCalledTimes(1);
    expect(tab.visibleCandidates.map((candidate) => candidate.id)).toEqual([
      'ORDERS_PRODUCT',
    ]);
  });

  test("Keeps a cube's own product picked and expanded on reopening, and searches the server again for a new cube", async () => {
    const { state, dataProducts } = setUpSearch();
    let tab = await openTab(state);
    await pickProduct(tab, 'ORDERS_PRODUCT');
    await add(state, 'core', 'daily_orders');
    tab = await openTab(state);
    expect(dataProducts.search).toHaveBeenCalledTimes(1);
    expect(tab.visibleCandidates).toHaveLength(1);
    expect(tab.visibleCandidates[0]).toBe(tab.candidate);
    expect(tab.description).toBeDefined();
    state.sourcePicker.close();
    state.importDocument(new CubeDocument(), false);
    tab = await openTab(state);
    expect(dataProducts.search).toHaveBeenCalledTimes(2);
    expect(dataProducts.search.mock.calls[1]?.[0]).toEqual({
      text: '',
      environmentType: PRODUCTION,
    });
    expect(tab.visibleCandidates).toEqual([ORDERS, RETURNS]);
  });

  test("Reopens on another data product cube's own product, after a cube's own were listed", async () => {
    const { state, dataProducts } = setUpSearch();
    let tab = await openTab(state);
    await pickProduct(tab, 'RETURNS_PRODUCT');
    await add(state, 'core', 'daily_orders');
    const returnsCube = state.document;
    state.importDocument(new CubeDocument(), false);
    tab = await openTab(state);
    await pickProduct(tab, 'ORDERS_PRODUCT');
    await add(state, 'core', 'daily_orders');

    // the orders cube on a new page, on its own product
    const reopened = new CubeEditorState(state.host, state.document);
    tab = await openTab(reopened);
    expect(tab.candidate?.id).toBe('ORDERS_PRODUCT');
    reopened.sourcePicker.close();
    reopened.importDocument(returnsCube, false);
    dataProducts.search.mockClear();
    dataProducts.describe.mockClear();
    tab = await openTab(reopened);
    expect(dataProducts.search).not.toHaveBeenCalled();
    expect(tab.candidate?.id).toBe('RETURNS_PRODUCT');
    expect(tab.description).toBeDefined();
    expect(dataProducts.describe).toHaveBeenCalledTimes(1);
  });

  test("Reopens on a data product cube's own product when the server's matches listed before miss it", async () => {
    const { state, dataProducts } = setUpSearch();
    const built = new CubeEditorState(state.host);
    const builtTab = await openTab(built);
    await pickProduct(builtTab, 'ORDERS_PRODUCT');
    await add(built, 'core', 'daily_orders');
    dataProducts.search.mockResolvedValueOnce([RETURNS]);
    await openTab(state);
    state.sourcePicker.close();
    state.importDocument(built.document, false);
    dataProducts.search.mockClear();
    const tab = await openTab(state);
    expect(dataProducts.search).not.toHaveBeenCalled();
    expect(tab.candidate?.id).toBe('ORDERS_PRODUCT');
    expect(tab.description).toBeDefined();
  });

  test("Says a server's matches may be cut short when it gives as many as one search gives", async () => {
    const { state } = setUpSearch(2);
    const tab = await openTab(state);
    expect(tab.visibleCandidates).toHaveLength(2);
    expect(tab.isTruncated).toBe(true);
    await type(tab, 'returns');
    expect(tab.visibleCandidates).toHaveLength(1);
    expect(tab.isTruncated).toBe(false);
  });
});
