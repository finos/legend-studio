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

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import {
  CubeDocument,
  DataProductAccessPointSource,
  type ModelContext,
  PrimitiveType,
  Query,
  Schema,
  SchemaColumn,
  serializeCubeSpec,
  type SourceResolution,
} from '@finos/legend-cube';
import { flowResult } from 'mobx';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  NORTHWIND_RUNTIME,
  northwindTable,
  ORDERS_COLUMNS,
} from '../../__test-utils__/CubeNorthwindTestQueries.js';
import {
  FAKE_CUSTOMERS_SCHEMA,
  FAKE_DAILY_ORDERS_SCHEMA,
} from '../../__test-utils__/FakeCubeDataProductCatalog.js';
import {
  createCubeDataProductModel,
  CUBE_DATA_PRODUCT_RUNTIME_PATH,
  CubeDataProductEnvironmentType,
} from '../../graph-manager/CubeDataProduct.js';
import type { CubeDataProductCatalog } from '../../graph-manager/CubeDataProductCatalog.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
  type NodeId,
} from '../../graph-manager/CubeEngine.js';
import { CubeEditorState } from '../CubeEditorState.js';
import { CUBE_NORTHWIND_MODEL } from '../fixtures/CubeNorthwindModel.js';
import { CubeSourcePickerTabKey } from '../source-picker/CubeSourcePickerTab.js';

const P = 'meta::pure::precisePrimitives::';

const PROJECT = {
  groupId: 'com.example.sales',
  artifactId: 'orders-products',
  versionId: '1.4.0',
  environmentType: CubeDataProductEnvironmentType.PRODUCTION,
  warehouse: 'SALES_WH',
};

/** daily_orders as an earlier deployment typed it: no REGION, and a narrower AMOUNT */
const OLD_DAILY_ORDERS = new Schema(
  FAKE_DAILY_ORDERS_SCHEMA.columns
    .filter((column) => column.name !== 'REGION')
    .map((column) =>
      column.name === 'AMOUNT'
        ? new SchemaColumn(
            'AMOUNT',
            PrimitiveType.get(`${P}Numeric`, [8, 2]),
            false,
          )
        : column,
    ),
);

const DRIFT_WARNING =
  'This access point changed since the cube was saved: added REGION; changed AMOUNT (Numeric(8,2) to Numeric(10,2))';

const accessPoint = (
  id: string,
  group: string,
  name: string,
  resolution?: SourceResolution,
): DataProductAccessPointSource =>
  new DataProductAccessPointSource(
    id,
    {
      dataProduct: 'sales::products::OrdersProduct',
      accessPointGroup: group,
      accessPoint: name,
      dataProductId: 'ORDERS_PRODUCT',
      deploymentId: '1234',
    },
    resolution,
  );

const resolved = (schema: Schema): SourceResolution => ({
  kind: 'resolved',
  schema,
});

/** A data product cube of daily_orders and customers, saved with the columns given */
const dataProductCube = (
  /** null: saved without its columns */
  dailyOrders: SourceResolution | null = resolved(OLD_DAILY_ORDERS),
  model: ModelContext = createCubeDataProductModel(PROJECT),
): CubeDocument =>
  new CubeDocument({
    context: { model, runtime: CUBE_DATA_PRODUCT_RUNTIME_PATH },
    query: new Query(
      [
        accessPoint(
          'dataProductAccessPoint101',
          'core',
          'daily_orders',
          dailyOrders ?? undefined,
        ),
        accessPoint(
          'dataProductAccessPoint102',
          'reference',
          'customers',
          resolved(FAKE_CUSTOMERS_SCHEMA),
        ),
      ],
      [],
      'dataProductAccessPoint101',
    ),
  });

const settle = async (): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

/** Imports the cube through its spec text, as a viewer would, and waits for the re-check */
const importAndWait = async (
  state: CubeEditorState,
  document: CubeDocument,
): Promise<void> => {
  state.specTransfer.openImport();
  state.specTransfer.setImportText(serializeCubeSpec(document));
  expect(state.specTransfer.importSpec()).toBe(true);
  await settle();
};

const warningsOf = (
  state: CubeEditorState,
  id: string,
): readonly string[] | undefined =>
  state.warnings.get(state.document.query.getNode(id)?.key ?? -1);

const resolutionOf = (
  state: CubeEditorState,
  id: string,
): SourceResolution | undefined =>
  (state.document.query.getNode(id) as DataProductAccessPointSource | undefined)
    ?.resolution;

const answering =
  (
    answers: (nodeId: NodeId) => Schema | CubeEngineError,
  ): Parameters<
    jest.Mock<CubeDataProductCatalog['resolveSchemas']>['mockImplementation']
  >[0] =>
  async (_project, sources) =>
    new Map([...sources.keys()].map((nodeId) => [nodeId, answers(nodeId)]));

beforeEach(() => {
  localStorage.clear();
});

describe("Re-checking a data product cube's access points", () => {
  test("Re-checks an imported cube's access points through the catalog once, at the cube's project, with no engine call", async () => {
    const { host, fake, dataProducts } = TEST__createCubeHost();
    const state = new CubeEditorState(host);
    await importAndWait(state, dataProductCube());
    expect(dataProducts.resolveSchemas).toHaveBeenCalledTimes(1);
    const [project, locations] = dataProducts.resolveSchemas.mock.calls[0] as [
      unknown,
      ReadonlyMap<string, unknown>,
    ];
    expect(project).toEqual(PROJECT);
    expect([...locations]).toEqual([
      [
        'dataProductAccessPoint101',
        {
          dataProduct: 'sales::products::OrdersProduct',
          accessPointGroup: 'core',
          accessPoint: 'daily_orders',
        },
      ],
      [
        'dataProductAccessPoint102',
        {
          dataProduct: 'sales::products::OrdersProduct',
          accessPointGroup: 'reference',
          accessPoint: 'customers',
        },
      ],
    ]);
    [fake.resolveSchemas, fake.typeLambdas, fake.execute].forEach((call) =>
      expect(call).not.toHaveBeenCalled(),
    );
  });

  test("Takes the new columns of an access point that changed, in the access point's words, with no undo step", async () => {
    const { host } = TEST__createCubeHost();
    const state = new CubeEditorState(host);
    await importAndWait(state, dataProductCube());
    expect(
      state.analysis.schemas
        .get('dataProductAccessPoint101')
        ?.isIdenticalTo(FAKE_DAILY_ORDERS_SCHEMA),
    ).toBe(true);
    expect(warningsOf(state, 'dataProductAccessPoint101')).toEqual([
      DRIFT_WARNING,
    ]);
    expect(warningsOf(state, 'dataProductAccessPoint102')).toBeUndefined();
    // the import only
    expect(state.history).toHaveLength(1);
  });

  test("Keeps an access point's saved columns when the catalog can't read it, and says why", async () => {
    const { host, dataProducts } = TEST__createCubeHost();
    const state = new CubeEditorState(host);
    dataProducts.resolveSchemas.mockImplementationOnce(
      answering(
        (nodeId) =>
          new CubeEngineError(
            CubeEngineErrorKind.NETWORK,
            "Cube couldn't read the data product sales::products::OrdersProduct\nDepot unavailable",
            nodeId,
          ),
      ),
    );
    await importAndWait(state, dataProductCube());
    expect(resolutionOf(state, 'dataProductAccessPoint101')).toEqual(
      resolved(OLD_DAILY_ORDERS),
    );
    expect(warningsOf(state, 'dataProductAccessPoint101')).toEqual([
      "Could not re-check this access point, so it keeps its saved columns: Cube couldn't read the data product sales::products::OrdersProduct",
    ]);
  });

  test('Keeps the saved columns of every access point when the catalog fails outright, with no unhandled alert', async () => {
    const { host, dataProducts } = TEST__createCubeHost();
    const alert = jest.spyOn(host.applicationStore, 'alertUnhandledError');
    const state = new CubeEditorState(host);
    dataProducts.resolveSchemas.mockRejectedValueOnce(new Error('Boom'));
    await importAndWait(state, dataProductCube());
    expect(warningsOf(state, 'dataProductAccessPoint101')).toEqual([
      'Could not re-check this access point, so it keeps its saved columns: Boom',
    ]);
    expect(alert).not.toHaveBeenCalled();
  });

  test('Re-checks only the access point refreshed, and drops its warning once it re-checks clean, keeping the node', async () => {
    const { host, fake, dataProducts } = TEST__createCubeHost();
    const state = new CubeEditorState(host);
    await importAndWait(
      state,
      dataProductCube(resolved(FAKE_DAILY_ORDERS_SCHEMA)),
    );
    dataProducts.resolveSchemas.mockClear();
    dataProducts.resolveSchemas.mockRejectedValueOnce(new Error('Boom'));
    await flowResult(state.refreshSource('dataProductAccessPoint102'));
    expect([
      ...(dataProducts.resolveSchemas.mock.calls[0]?.[1] ?? new Map()).keys(),
    ]).toEqual(['dataProductAccessPoint102']);
    expect(warningsOf(state, 'dataProductAccessPoint102')).toHaveLength(1);
    const node = state.document.query.getNode('dataProductAccessPoint102');
    const { history } = state;
    await flowResult(state.refreshSource('dataProductAccessPoint102'));
    expect(state.document.query.getNode('dataProductAccessPoint102')).toBe(
      node,
    );
    expect(warningsOf(state, 'dataProductAccessPoint102')).toBeUndefined();
    expect(state.history).toBe(history);
    expect(fake.resolveSchemas).not.toHaveBeenCalled();
  });

  test("Types an access point saved without its columns, and shows the catalog's error on one it can't find", async () => {
    const { host } = TEST__createCubeHost();
    const state = new CubeEditorState(host);
    const cube = dataProductCube(null);
    await importAndWait(
      state,
      cube.withQuery(
        cube.query.add(
          accessPoint('dataProductAccessPoint103', 'reference', 'raw_feed'),
        ),
      ),
    );
    expect(resolutionOf(state, 'dataProductAccessPoint101')).toEqual(
      resolved(FAKE_DAILY_ORDERS_SCHEMA),
    );
    expect(warningsOf(state, 'dataProductAccessPoint101')).toBeUndefined();
    expect(resolutionOf(state, 'dataProductAccessPoint103')).toEqual({
      kind: 'failed',
      message: 'The access point "raw_feed" can\'t be found',
    });
  });

  test('Keeps the access points re-checked when an edit made while they were re-checked is undone', async () => {
    const { host, dataProducts } = TEST__createCubeHost();
    const state = new CubeEditorState(host);
    let answer: () => void = () => undefined;
    dataProducts.resolveSchemas.mockImplementationOnce(
      async (_project, sources) =>
        new Promise((resolve) => {
          answer = () =>
            resolve(
              new Map(
                [...sources.keys()].map((nodeId) => [
                  nodeId,
                  nodeId === 'dataProductAccessPoint101'
                    ? FAKE_DAILY_ORDERS_SCHEMA
                    : FAKE_CUSTOMERS_SCHEMA,
                ]),
              ),
            );
        }),
    );
    await importAndWait(state, dataProductCube());
    state.select('dataProductAccessPoint102');
    answer();
    await settle();
    state.undo();
    expect(
      state.analysis.schemas
        .get('dataProductAccessPoint101')
        ?.isIdenticalTo(FAKE_DAILY_ORDERS_SCHEMA),
    ).toBe(true);
    expect(warningsOf(state, 'dataProductAccessPoint101')).toEqual([
      DRIFT_WARNING,
    ]);
    expect(dataProducts.resolveSchemas).toHaveBeenCalledTimes(1);
  });

  test('Makes no catalog call for a cube saved as a development deployment, and keeps its saved columns', async () => {
    const { host, dataProducts } = TEST__createCubeHost();
    const state = new CubeEditorState(host);
    await importAndWait(
      state,
      dataProductCube(null, {
        ...createCubeDataProductModel(PROJECT),
        environmentType: 'DEVELOPMENT',
      }).withQuery(
        new Query(
          [
            accessPoint(
              'dataProductAccessPoint101',
              'core',
              'daily_orders',
              resolved(OLD_DAILY_ORDERS),
            ),
          ],
          [],
          'dataProductAccessPoint101',
        ),
      ),
    );
    expect(dataProducts.resolveSchemas).not.toHaveBeenCalled();
    expect(warningsOf(state, 'dataProductAccessPoint101')).toEqual([
      "Could not re-check this access point, so it keeps its saved columns: Cube doesn't read development data products yet",
    ]);
  });

  test('Leaves an access point on a cube of tables to the rule that keeps the kinds apart', async () => {
    const { host, fake, dataProducts } = TEST__createCubeHost();
    const state = new CubeEditorState(host);
    await importAndWait(
      state,
      new CubeDocument({
        context: { model: CUBE_NORTHWIND_MODEL, runtime: NORTHWIND_RUNTIME },
        query: new Query(
          [
            northwindTable('relational101', 'ORDERS', ORDERS_COLUMNS),
            accessPoint(
              'dataProductAccessPoint101',
              'core',
              'daily_orders',
              resolved(OLD_DAILY_ORDERS),
            ),
          ],
          [],
          'relational101',
        ),
      }),
    );
    expect(dataProducts.resolveSchemas).not.toHaveBeenCalled();
    expect([
      ...(
        (fake.resolveSchemas.mock.calls[0]?.[1] as
          | ReadonlyMap<string, unknown>
          | undefined) ?? new Map()
      ).keys(),
    ]).toEqual(['relational101']);
    expect(warningsOf(state, 'dataProductAccessPoint101')).toBeUndefined();
  });

  test("Keeps the saved columns, and says why, on a host that doesn't serve data products", async () => {
    const created = TEST__createCubeHost();
    const state = new CubeEditorState({
      ...created.host,
      dataProductCatalog: undefined,
    });
    await importAndWait(state, dataProductCube());
    expect(resolutionOf(state, 'dataProductAccessPoint101')).toEqual(
      resolved(OLD_DAILY_ORDERS),
    );
    expect(warningsOf(state, 'dataProductAccessPoint101')).toEqual([
      "Could not re-check this access point, so it keeps its saved columns: This Legend deployment doesn't serve data products",
    ]);
  });

  test('Re-checks clean an access point added through the tab, exported and imported again', async () => {
    const { host } = TEST__createCubeHost();
    const state = new CubeEditorState(host);
    state.sourcePicker.open(CubeSourcePickerTabKey.DATA_PRODUCT);
    await settle();
    const tab = state.sourcePicker.dataProductTab;
    tab.selectCandidate(
      tab.visibleCandidates.find(({ id }) => id === 'ORDERS_PRODUCT'),
    );
    await settle();
    tab.selectAccessPoint('core', 'daily_orders');
    await flowResult(state.sourcePicker.confirm());
    const reopened = new CubeEditorState(host);
    await importAndWait(reopened, state.document);
    expect(warningsOf(reopened, 'dataProductAccessPoint101')).toBeUndefined();
    expect(
      reopened.analysis.schemas
        .get('dataProductAccessPoint101')
        ?.isIdenticalTo(FAKE_DAILY_ORDERS_SCHEMA),
    ).toBe(true);
  });
});
