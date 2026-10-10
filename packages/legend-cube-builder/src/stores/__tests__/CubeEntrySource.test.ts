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
  DataProductAccessPointSource,
  RelationalTableSource,
} from '@finos/legend-cube';
import { flowResult, runInAction } from 'mobx';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
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
import {
  type CubeAccessPointEntry,
  CubeEntrySourceState,
  formatCubeAccessPointEntryId,
  parseCubeAccessPointEntryId,
} from '../CubeEntrySource.js';

const { PRODUCTION, PRODUCTION_PARALLEL } = CubeDataProductEnvironmentType;
const TYPE = DataProductAccessPointSource.TYPE;

const DAILY_ORDERS: CubeAccessPointEntry = {
  environmentType: PRODUCTION,
  dataProductId: 'ORDERS_PRODUCT',
  deploymentId: 'deployment-orders_product',
  accessPointGroup: 'core',
  accessPoint: 'daily_orders',
};

const linkTo = (entry: Partial<CubeAccessPointEntry> = {}) => ({
  sourceType: TYPE,
  sourceId: formatCubeAccessPointEntryId({ ...DAILY_ORDERS, ...entry }),
});

const setUp = (options?: { withoutCatalog?: boolean }) => {
  const created = TEST__createCubeHost();
  const host = options?.withoutCatalog
    ? { ...created.host, dataProductCatalog: undefined }
    : created.host;
  const state = new CubeEditorState(host);
  return { ...created, host, state, entry: new CubeEntrySourceState(state) };
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

/** The cube has no source, no model and nothing to undo */
const expectNothingAdded = (state: CubeEditorState): void => {
  expect(state.document.query.nodes).toEqual([]);
  expect(state.document.context).toBeUndefined();
  expect(state.canUndo).toBe(false);
};

beforeEach(() => {
  localStorage.clear();
});

describe('Entry link ids', () => {
  test('Formats an access point as its class, product, deployment, group and access point, each URI-encoded, and reads it back', () => {
    const entry: CubeAccessPointEntry = {
      environmentType: PRODUCTION_PARALLEL,
      dataProductId: 'SALES/ORDERS',
      deploymentId: 'deploy 1',
      accessPointGroup: '100%',
      accessPoint: 'a/b c%',
    };
    const id = formatCubeAccessPointEntryId(entry);
    expect(id).toBe(
      'PRODUCTION_PARALLEL/SALES%2FORDERS/deploy%201/100%25/a%2Fb%20c%25',
    );
    expect(parseCubeAccessPointEntryId(id)).toEqual(entry);
    expect(
      parseCubeAccessPointEntryId(
        'PRODUCTION/ORDERS_PRODUCT/deployment-orders_product/core/daily_orders',
      ),
    ).toEqual(DAILY_ORDERS);
  });

  test.each([
    ['four parts', 'PRODUCTION/ORDERS_PRODUCT/deployment-orders_product/core'],
    [
      'six parts',
      'PRODUCTION/ORDERS_PRODUCT/deployment-orders_product/core/daily/orders',
    ],
    [
      'a bad percent-encoding',
      'PRODUCTION/ORDERS_PRODUCT/deployment-orders_product/core/daily%E0%A4%A',
    ],
    [
      'an unknown class',
      'STAGING/ORDERS_PRODUCT/deployment-orders_product/core/daily_orders',
    ],
    [
      'the development class',
      'DEVELOPMENT/ORDERS_PRODUCT/deployment-orders_product/core/daily_orders',
    ],
    ['an empty part', 'PRODUCTION/ORDERS_PRODUCT//core/daily_orders'],
    [
      'a blank part',
      'PRODUCTION/ORDERS_PRODUCT/deployment-orders_product/%20/daily_orders',
    ],
  ])('Reads an id with %s as naming no access point', (_label, id) => {
    expect(parseCubeAccessPointEntryId(id)).toBeUndefined();
  });
});

describe('Opening a linked access point', () => {
  test("Adds the access point alone, selected, on the product's model and the default warehouse, as one undo step, with no dialog, no editor and no run", async () => {
    const { state, entry, fake } = setUp();
    await flowResult(entry.open(linkTo()));
    expect(entry.error).toBeUndefined();
    expect(state.document.context).toEqual({
      model: createCubeDataProductModel({
        groupId: 'com.example.sales',
        artifactId: 'orders-products',
        versionId: '1.4.0',
        environmentType: PRODUCTION,
        warehouse: CUBE_DEFAULT_CONSUMER_WAREHOUSE,
      }),
      runtime: CUBE_DATA_PRODUCT_RUNTIME_PATH,
    });
    const { nodes, selected } = state.document.query;
    expect(nodes).toHaveLength(1);
    const [node] = nodes;
    expect(node).toBeInstanceOf(DataProductAccessPointSource);
    expect(node).toMatchObject({
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
    expect(selected).toBe(node?.id);
    expect(state.sourcePicker.isOpen).toBe(false);
    expect(state.nodeEditor.nodeId).toBeUndefined();
    expect(fake.execute).not.toHaveBeenCalled();

    // one undo step
    state.undo();
    expectNothingAdded(state);
  });

  test("Adds it on the viewer's remembered warehouse, in the link's class", async () => {
    const { state, entry, host } = setUp();
    rememberCubeWarehouse(host.applicationStore.userDataService, 'MY_WH');
    await flowResult(
      entry.open(linkTo({ environmentType: PRODUCTION_PARALLEL })),
    );
    expect(entry.error).toBeUndefined();
    expect(state.document.context?.model).toEqual(
      createCubeDataProductModel({
        groupId: 'com.example.sales',
        artifactId: 'orders-products',
        versionId: '1.4.0',
        environmentType: PRODUCTION_PARALLEL,
        warehouse: 'MY_WH',
      }),
    );
    expect(state.document.query.nodes).toHaveLength(1);
  });

  test('Is opening while the catalog answers, and not after', async () => {
    const { entry, dataProducts } = setUp();
    const search = deferred<readonly CubeDataProductCandidate[]>();
    dataProducts.search.mockImplementationOnce(async () => search.promise);
    expect(entry.isOpening).toBe(false);
    const opened = flowResult(entry.open(linkTo()));
    expect(entry.isOpening).toBe(true);
    search.resolve(FAKE_DATA_PRODUCT_CANDIDATES);
    await opened;
    expect(entry.isOpening).toBe(false);
    expect(entry.error).toBeUndefined();
  });

  test('Opens once: a second open while the first runs does nothing', async () => {
    const { state, entry, dataProducts } = setUp();
    const search = deferred<readonly CubeDataProductCandidate[]>();
    dataProducts.search.mockImplementationOnce(async () => search.promise);
    const first = flowResult(entry.open(linkTo()));
    await flowResult(entry.open(linkTo()));
    expect(dataProducts.search).toHaveBeenCalledTimes(1);
    search.resolve(FAKE_DATA_PRODUCT_CANDIDATES);
    await first;
    expect(entry.error).toBeUndefined();
    expect(state.document.query.nodes).toHaveLength(1);
  });

  test('Refuses a cube that is not new: one with a source, or read-only', async () => {
    const { state, entry, dataProducts } = setUp();
    await flowResult(entry.open(linkTo()));
    expect(state.document.query.nodes).toHaveLength(1);
    await flowResult(entry.open(linkTo()));
    expect(entry.error).toBe('A link opens a source on a new cube only.');
    expect(state.document.query.nodes).toHaveLength(1);
    expect(dataProducts.search).toHaveBeenCalledTimes(1);
    const readOnly = setUp();
    runInAction(() => {
      readOnly.state.readOnly = true;
    });
    await flowResult(readOnly.entry.open(linkTo()));
    expect(readOnly.entry.error).toBe(
      'A link opens a source on a new cube only.',
    );
    expectNothingAdded(readOnly.state);
  });

  test('Refuses a source of another type, adding nothing', async () => {
    const { state, entry, dataProducts } = setUp();
    await flowResult(
      entry.open({
        sourceType: RelationalTableSource.TYPE,
        sourceId: linkTo().sourceId,
      }),
    );
    expect(entry.error).toBe(
      `A link can't name a source of type "${RelationalTableSource.TYPE}": only data product access points.`,
    );
    expect(entry.isOpening).toBe(false);
    expect(dataProducts.search).not.toHaveBeenCalled();
    expectNothingAdded(state);
  });

  test('Refuses an id that names no access point, adding nothing', async () => {
    const { state, entry, dataProducts } = setUp();
    await flowResult(
      entry.open({ sourceType: TYPE, sourceId: 'PRODUCTION/ORDERS_PRODUCT' }),
    );
    expect(entry.error).toBe(
      `"PRODUCTION/ORDERS_PRODUCT" doesn't name an access point: it takes <class>/<data product id>/<deployment id>/<access point group>/<access point>.`,
    );
    expect(dataProducts.search).not.toHaveBeenCalled();
    expectNothingAdded(state);
  });

  test('Refuses on a host without data products, adding nothing', async () => {
    const { state, entry } = setUp({ withoutCatalog: true });
    await flowResult(entry.open(linkTo()));
    expect(entry.error).toBe('This page has no data products to open.');
    expectNothingAdded(state);
  });

  test.each([
    ['an unknown data product', { dataProductId: 'NO_SUCH_PRODUCT' }],
    ['a known data product on another deployment', { deploymentId: 'other' }],
  ])('Says %s is not deployed, adding nothing', async (_label, link) => {
    const { state, entry, dataProducts } = setUp();
    await flowResult(entry.open(linkTo(link)));
    const { dataProductId, deploymentId } = { ...DAILY_ORDERS, ...link };
    expect(entry.error).toBe(
      `No data product "${dataProductId}" is deployed as "${deploymentId}".`,
    );
    expect(dataProducts.describe).not.toHaveBeenCalled();
    expectNothingAdded(state);
  });

  test('Says the data product has no such access point, adding nothing', async () => {
    const { state, entry } = setUp();
    await flowResult(
      entry.open(
        linkTo({ accessPointGroup: 'reference', accessPoint: 'nope' }),
      ),
    );
    expect(entry.error).toBe(
      'The data product has no access point "nope" in group "reference".',
    );
    expectNothingAdded(state);
  });

  test("Gives a disabled access point's reason, adding nothing", async () => {
    const { state, entry } = setUp();
    await flowResult(entry.open(linkTo({ accessPoint: 'orders_as_of' })));
    expect(entry.error).toBe(
      'It takes parameters, which Cube does not support yet',
    );
    expectNothingAdded(state);
  });

  test("Gives the catalog's error when it can't search, adding nothing", async () => {
    const { state, entry, dataProducts } = setUp();
    dataProducts.search.mockRejectedValueOnce(
      new Error('The catalog is unreachable'),
    );
    await flowResult(entry.open(linkTo()));
    expect(entry.error).toBe('The catalog is unreachable');
    expect(entry.isOpening).toBe(false);
    expectNothingAdded(state);
  });

  test("Gives the catalog's error when it can't read the product, adding nothing", async () => {
    const { state, entry, dataProducts } = setUp();
    dataProducts.describe.mockImplementationOnce(
      async (): Promise<CubeDataProductDescription> =>
        Promise.reject(new Error('The product could not be read')),
    );
    await flowResult(entry.open(linkTo()));
    expect(entry.error).toBe('The product could not be read');
    expect(entry.isOpening).toBe(false);
    expectNothingAdded(state);
  });

  test('Dismissing the error clears it', async () => {
    const { entry } = setUp({ withoutCatalog: true });
    await flowResult(entry.open(linkTo()));
    expect(entry.error).toBeDefined();
    entry.dismissError();
    expect(entry.error).toBeUndefined();
  });
});
