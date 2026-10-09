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

import { beforeEach, describe, expect, test } from '@jest/globals';
import {
  Connection,
  CubeDocument,
  type DataProductAccessPointSource,
  Join,
  type ModelContext,
  Query,
} from '@finos/legend-cube';
import { flowResult, runInAction } from 'mobx';
import { LEGEND_CUBE_USER_DATA_KEY } from '../../__lib__/LegendCubeLabels.js';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  createCubeDataProductModel,
  CUBE_DATA_PRODUCT_RUNTIME_PATH,
  CUBE_DEFAULT_CONSUMER_WAREHOUSE,
  CubeDataProductEnvironmentType,
} from '../../graph-manager/CubeDataProduct.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type CubeResult,
} from '../../graph-manager/CubeEngine.js';
import {
  classifyCubeDataProductRunError,
  CubeDataProductRunErrorKind,
} from '../CubeDataProductRuntimeState.js';
import { getCubeRememberedWarehouse } from '../CubeDataProductWarehouse.js';
import { CubeEditorState } from '../CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';
import { CubeSourcePickerTabKey } from '../source-picker/CubeSourcePickerTab.js';

const PROJECT = {
  groupId: 'com.example.sales',
  artifactId: 'orders-products',
  versionId: '1.4.0',
  environmentType: CubeDataProductEnvironmentType.PRODUCTION,
};

const cubeOf = (model: ModelContext): CubeDocument =>
  new CubeDocument().withContext({
    model,
    runtime: CUBE_DATA_PRODUCT_RUNTIME_PATH,
  });

/** Lets the flows started by an action run */
const settle = async (): Promise<void> => {
  for (let tries = 0; tries < 10; tries++) {
    await Promise.resolve();
  }
};

/** The warehouse user data holds for the viewer */
const rememberedIn = (state: CubeEditorState): string | undefined =>
  getCubeRememberedWarehouse(state.host.applicationStore.userDataService);

/** A data product cube with one access point added through the tab, on CUBE_WH */
const setUpCube = async (): Promise<
  ReturnType<typeof TEST__createCubeHost> & { state: CubeEditorState }
> => {
  const created = TEST__createCubeHost();
  const state = new CubeEditorState(created.host);
  state.sourcePicker.open(CubeSourcePickerTabKey.DATA_PRODUCT);
  await settle();
  const tab = state.sourcePicker.dataProductTab;
  tab.selectCandidate(
    tab.visibleCandidates.find(({ id }) => id === 'ORDERS_PRODUCT'),
  );
  await settle();
  tab.setWarehouse('CUBE_WH');
  tab.selectAccessPoint('core', 'daily_orders');
  await flowResult(state.sourcePicker.confirm());
  expect(state.document.query.nodes).toHaveLength(1);
  return { ...created, state };
};

/** An answer for the capture node's columns */
const answerFor = (state: CubeEditorState): CubeResult => {
  const columns =
    state.analysis.schemas
      .get(state.document.query.selected as string)
      ?.columns.map(({ name }) => name) ?? [];
  return { columns, rows: [columns.map(() => 'x')], sql: [], durationMs: 1 };
};

const deferred = <T>(): {
  promise: Promise<T>;
  reject: (error: unknown) => void;
} => {
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((_resolve, onReject) => {
    reject = onReject;
  });
  return { promise, reject };
};

beforeEach(() => {
  localStorage.clear();
});

describe("A data product cube's warehouse", () => {
  test("Is the cube's own, else the one the viewer last picked, else the default", () => {
    const { host } = TEST__createCubeHost();
    const state = new CubeEditorState(
      host,
      cubeOf(createCubeDataProductModel(PROJECT)),
    );
    const runtime = state.dataProductRuntime;
    expect(runtime.effectiveWarehouse).toBe(CUBE_DEFAULT_CONSUMER_WAREHOUSE);
    // remembered by another page after this one opened
    host.applicationStore.userDataService.persistValue(
      LEGEND_CUBE_USER_DATA_KEY.DATA_PRODUCT_WAREHOUSE,
      'VIEWER_WH',
    );
    expect(runtime.effectiveWarehouse).toBe('VIEWER_WH');
    const own = new CubeEditorState(
      host,
      cubeOf(createCubeDataProductModel({ ...PROJECT, warehouse: 'CUBE_WH' })),
    );
    expect(own.dataProductRuntime.effectiveWarehouse).toBe('CUBE_WH');
    // a cube of tables has none
    expect(
      new CubeEditorState(host).dataProductRuntime.effectiveWarehouse,
    ).toBeUndefined();
  });

  test('Runs the cube on an edited warehouse, as one undo step that keeps the rest of the cube, with no engine or catalog call', () => {
    const { host, fake, dataProducts } = TEST__createCubeHost();
    const model = {
      ...createCubeDataProductModel({ ...PROJECT, warehouse: 'CUBE_WH' }),
      laterKey: { kept: true },
    } as ModelContext;
    const state = new CubeEditorState(host, cubeOf(model));
    const { query } = state.document;
    expect(state.dataProductRuntime.setWarehouse('  NEW_WH  ')).toBe(true);
    expect(state.document.context?.model).toEqual({
      ...model,
      warehouse: 'NEW_WH',
    });
    expect(state.document.context?.runtime).toBe(
      CUBE_DATA_PRODUCT_RUNTIME_PATH,
    );
    expect(state.document.query).toBe(query);
    expect(state.history).toHaveLength(1);
    expect(rememberedIn(state)).toBe('NEW_WH');
    [
      fake.loadModel,
      fake.resolveSchemas,
      fake.typeLambdas,
      fake.execute,
      dataProducts.search,
      dataProducts.describe,
      dataProducts.resolveSchemas,
    ].forEach((call) => expect(call).not.toHaveBeenCalled());
  });

  test('Changes nothing for an empty name or the warehouse already used', () => {
    const { host } = TEST__createCubeHost();
    const state = new CubeEditorState(
      host,
      cubeOf(createCubeDataProductModel({ ...PROJECT, warehouse: 'CUBE_WH' })),
    );
    const { document } = state;
    expect(state.dataProductRuntime.setWarehouse('   ')).toBe(false);
    expect(state.dataProductRuntime.setWarehouse(' CUBE_WH ')).toBe(false);
    expect(state.document).toBe(document);
    expect(state.history).toHaveLength(0);
    expect(rememberedIn(state)).toBeUndefined();
  });

  test("Undo brings back the cube's warehouse, while the viewer keeps the newer one", () => {
    const { host } = TEST__createCubeHost();
    const state = new CubeEditorState(
      host,
      cubeOf(createCubeDataProductModel({ ...PROJECT, warehouse: 'CUBE_WH' })),
    );
    state.dataProductRuntime.setWarehouse('NEW_WH');
    state.undo();
    expect(state.dataProductRuntime.effectiveWarehouse).toBe('CUBE_WH');
    expect(state.dataProductRuntime.rememberedWarehouse).toBe('NEW_WH');
    // a new cube starts on it
    expect(
      new CubeEditorState(host, cubeOf(createCubeDataProductModel(PROJECT)))
        .dataProductRuntime.effectiveWarehouse,
    ).toBe('NEW_WH');
  });

  test('Sends the warehouse it shows', async () => {
    const { state, fake } = await setUpCube();
    state.dataProductRuntime.setWarehouse('NEW_WH');
    fake.execute.mockResolvedValueOnce(answerFor(state));
    await flowResult(state.execution.execute());
    const model = fake.execute.mock.calls[0]?.[0];
    expect(model?.warehouse).toBe('NEW_WH');
    expect(state.dataProductRuntime.effectiveWarehouse).toBe('NEW_WH');
  });

  test('Marks the shown rows stale after a warehouse edit, and current again after undo', async () => {
    const { state, fake } = await setUpCube();
    fake.execute.mockResolvedValueOnce(answerFor(state));
    await flowResult(state.execution.execute());
    expect(state.execution.isStale).toBe(false);
    state.dataProductRuntime.setWarehouse('NEW_WH');
    expect(state.execution.isStale).toBe(true);
    state.undo();
    expect(state.execution.isStale).toBe(false);
  });

  test("Drops a run's error once the warehouse is edited, and an error that arrives after the edit", async () => {
    const { state, fake } = await setUpCube();
    const capture = state.document.query.selected as string;
    fake.execute.mockRejectedValueOnce(
      new CubeEngineError(
        CubeEngineErrorKind.EXECUTION,
        'No active warehouse selected in the current session',
        capture,
      ),
    );
    await flowResult(state.execution.execute());
    expect(state.execution.error).toBeDefined();
    expect(state.hostIssues.size).toBe(1);
    state.dataProductRuntime.setWarehouse('NEW_WH');
    expect(state.execution.error).toBeUndefined();
    expect(state.hostIssues.size).toBe(0);

    // a run under way when the warehouse changes
    const held = deferred<CubeResult>();
    fake.execute.mockReturnValueOnce(held.promise);
    const run = flowResult(state.execution.execute());
    state.dataProductRuntime.setWarehouse('OTHER_WH');
    held.reject(
      new CubeEngineError(CubeEngineErrorKind.EXECUTION, 'Boom', capture),
    );
    await run;
    expect(state.execution.error).toBeUndefined();
    expect(state.hostIssues.size).toBe(0);
  });

  test('Allows no change on a read-only cube: no warehouse edit, no Add, nothing remembered', async () => {
    const { state } = await setUpCube();
    state.importDocument(state.document, true);
    const { document } = state;
    expect(state.dataProductRuntime.canEditWarehouse).toBe(false);
    expect(state.dataProductRuntime.setWarehouse('NEW_WH')).toBe(false);
    expect(state.document).toBe(document);
    expect(rememberedIn(state)).toBe('CUBE_WH');
    const tab = state.sourcePicker.dataProductTab;
    tab.selectAccessPoint('reference', 'customers');
    expect(tab.canConfirm).toBe(false);
    expect(await flowResult(tab.confirm())).toBe(false);
    expect(state.document).toBe(document);
  });

  test('Says when the project is at a moving SNAPSHOT version', () => {
    const { host } = TEST__createCubeHost();
    expect(
      new CubeEditorState(
        host,
        cubeOf(
          createCubeDataProductModel({
            ...PROJECT,
            versionId: 'feature-returns-SNAPSHOT',
          }),
        ),
      ).dataProductRuntime.isSnapshot,
    ).toBe(true);
    expect(
      new CubeEditorState(host, cubeOf(createCubeDataProductModel(PROJECT)))
        .dataProductRuntime.isSnapshot,
    ).toBe(false);
  });

  test('Reads a run refused for its warehouse from the whole error, and one refused for access to the data, on data product cubes only', async () => {
    const { state, fake } = await setUpCube();
    const capture = state.document.query.selected as string;
    const runFailing = async (detail: string): Promise<void> => {
      fake.execute.mockRejectedValueOnce(
        new CubeEngineError(CubeEngineErrorKind.EXECUTION, detail, capture),
      );
      await flowResult(state.execution.execute());
    };
    // the database's words on a later line
    await runFailing(
      'SQL compilation error:\nNo active warehouse selected in the current session',
    );
    expect(state.dataProductRuntime.runErrorKind).toBe(
      CubeDataProductRunErrorKind.WAREHOUSE,
    );
    await runFailing('Insufficient privileges to operate on table ORDERS');
    expect(state.dataProductRuntime.runErrorKind).toBe(
      CubeDataProductRunErrorKind.ENTITLEMENT,
    );
    // about both: the warehouse
    await runFailing(
      'Insufficient privileges: the role lacks the operate privilege on the warehouse',
    );
    expect(state.dataProductRuntime.runErrorKind).toBe(
      CubeDataProductRunErrorKind.WAREHOUSE,
    );
    await runFailing('Column ORDER_ID is ambiguous');
    expect(state.dataProductRuntime.runErrorKind).toBeUndefined();
    expect(
      classifyCubeDataProductRunError(
        new CubeEngineError(
          CubeEngineErrorKind.EXECUTION,
          'Insufficient privileges',
        ),
      ),
    ).toBe(CubeDataProductRunErrorKind.ENTITLEMENT);
    // a cube of tables refused the same way
    const tables = new CubeEditorState(
      state.host,
      new CubeDocument({
        context: { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME },
        query: new Query(
          [northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS)],
          [],
          'relational101',
        ),
      }),
    );
    runInAction(() => {
      tables.execution.error = new CubeEngineError(
        CubeEngineErrorKind.EXECUTION,
        'Insufficient privileges to operate on table ORDERS',
        'relational101',
      );
    });
    expect(tables.dataProductRuntime.runErrorKind).toBeUndefined();
  });

  test('Links each access point group the refused node reads to its page in the marketplace, once each', async () => {
    const { state, fake, dataProducts } = await setUpCube();
    const tab = state.sourcePicker.dataProductTab;
    state.sourcePicker.open(CubeSourcePickerTabKey.DATA_PRODUCT);
    await settle();
    tab.selectAccessPoint('reference', 'customers');
    await flowResult(state.sourcePicker.confirm());
    state.sourcePicker.open(CubeSourcePickerTabKey.DATA_PRODUCT);
    await settle();
    tab.selectAccessPoint('core', 'daily_orders');
    await flowResult(state.sourcePicker.confirm());
    const [orders, customers, moreOrders] = state.document.query.nodes as [
      DataProductAccessPointSource,
      DataProductAccessPointSource,
      DataProductAccessPointSource,
    ];
    const join = new Join('join101', {
      leftColumns: ['CUSTOMER_ID'],
      rightColumns: ['CUSTOMER_ID'],
    });
    state.applyDocument(
      state.document.withQuery(
        new Query(
          [orders, customers, moreOrders, join],
          [
            new Connection(orders.id, join.id, 'leftTds'),
            new Connection(customers.id, join.id, 'rightTds'),
          ],
          join.id,
        ),
      ),
    );
    fake.execute.mockRejectedValueOnce(
      new CubeEngineError(
        CubeEngineErrorKind.EXECUTION,
        'Insufficient privileges to operate on table CUSTOMERS',
        join.id,
      ),
    );
    await flowResult(state.execution.execute());
    expect(
      state.dataProductRuntime.accessRequestLinks.map(({ label, url }) => [
        label,
        url,
      ]),
    ).toEqual([
      [
        'Request access to core in OrdersProduct',
        'https://marketplace.test/dataProduct/deployed/ORDERS_PRODUCT/deployment-orders_product#core',
      ],
      [
        'Request access to reference in OrdersProduct',
        'https://marketplace.test/dataProduct/deployed/ORDERS_PRODUCT/deployment-orders_product#reference',
      ],
    ]);
    // a node reading one group: one link, plainly named
    state.select(orders.id);
    fake.execute.mockRejectedValueOnce(
      new CubeEngineError(
        CubeEngineErrorKind.EXECUTION,
        'Insufficient privileges',
        orders.id,
      ),
    );
    await flowResult(state.execution.execute());
    expect(
      state.dataProductRuntime.accessRequestLinks.map(({ label }) => label),
    ).toEqual(['Request access']);
    // two access points of one group, upstream of the refused node: one link
    const selfJoin = new Join('join102', {
      leftColumns: ['ORDER_ID'],
      rightColumns: ['ORDER_ID'],
    });
    state.applyDocument(
      state.document.withQuery(
        new Query(
          [orders, customers, moreOrders, selfJoin],
          [
            new Connection(orders.id, selfJoin.id, 'leftTds'),
            new Connection(moreOrders.id, selfJoin.id, 'rightTds'),
          ],
          selfJoin.id,
        ),
      ),
    );
    runInAction(() => {
      state.execution.error = new CubeEngineError(
        CubeEngineErrorKind.EXECUTION,
        'Insufficient privileges',
        selfJoin.id,
      );
    });
    expect(
      state.dataProductRuntime.accessRequestLinks.map(({ label }) => label),
    ).toEqual(['Request access']);
    // no marketplace, no link
    dataProducts.getMarketplaceLink.mockReturnValue(undefined);
    expect(state.dataProductRuntime.accessRequestLinks).toEqual([]);
  });
});
