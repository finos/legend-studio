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
  DataProductAccessPointSource,
  IngestDatasetSource,
  Join,
  JoinType,
  type ModelContext,
  type QueryRule,
} from '@finos/legend-cube';
import { flowResult } from 'mobx';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  createFakeCubeDataProductCatalog,
  FAKE_DATA_PRODUCT_CANDIDATES,
} from '../../__test-utils__/FakeCubeDataProductCatalog.js';
import {
  createFakeCubeIngestCatalog,
  FAKE_INGEST_DESKS,
  FAKE_INGEST_ORDERS,
  FAKE_INGEST_PRODUCER_ID,
  FAKE_INGEST_TRADES_SCHEMA,
  type FakeCubeIngestCatalog,
  fakeIngestEnvironmentOf,
  fakeIngestUrnOf,
} from '../../__test-utils__/FakeCubeIngestCatalog.js';
import { CUBE_INGEST_JOIN_MESSAGE } from '../../__lib__/LegendCubeIngestLabels.js';
import {
  createCubeDataProductModel,
  CUBE_DATA_PRODUCT_RUNTIME_PATH,
  CubeDataProductEnvironmentType,
  type CubeDataProductProject,
} from '../../graph-manager/CubeDataProduct.js';
import { CubeDataProductCandidate } from '../../graph-manager/CubeDataProductCatalog.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../graph-manager/CubeEngine.js';
import {
  createCubeIngestModel,
  CUBE_INGEST_RUNTIME_PATH,
  formatCubeIngestUrn,
} from '../../graph-manager/CubeIngest.js';
import {
  type CubeIngestCatalog,
  CubeIngestDefinitionCandidate,
  type CubeIngestDefinitionList,
} from '../../graph-manager/CubeIngestCatalog.js';
import { CubeEditorState } from '../CubeEditorState.js';
import type { CubeHost } from '../CubeHost.js';
import { readCubeLambdaDocument } from '../CubeLambdaImportState.js';
import { CUBE_LAMBDA_SOURCES_MESSAGE } from '../CubeLambdaSources.js';
import { buildCubeRunningStepLambda } from '../CubeRunningStepLambda.js';
import { CUBE_DATA_PRODUCT_TAB_MESSAGE } from '../source-picker/CubeDataProductTabState.js';
import { CubeSourcePickerTabKey } from '../source-picker/CubeSourcePickerTab.js';

// Data products and ingest data sets in one cube (PLAN §11.30): they mix when
// they are one project's, in one Mode, on a host whose ingest catalog lists a
// data product's project's definitions. Each tab adds to the other's cube,
// and a lambda reading both reads back into one cube; elsewhere they stay
// apart, as before

const { PRODUCTION, PRODUCTION_PARALLEL } = CubeDataProductEnvironmentType;

const ORDERS_PROJECT = {
  groupId: 'com.example.sales',
  artifactId: 'orders-products',
  versionId: '1.4.0',
};

/** A definition of the orders products' project, deployed to a class */
const ordersUrnOf = (
  definition: string,
  environmentType = PRODUCTION,
): string =>
  formatCubeIngestUrn({
    environmentType,
    groupId: ORDERS_PROJECT.groupId,
    artifactId: ORDERS_PROJECT.artifactId,
    definition,
  });

/** The orders products' project's definitions, deployed to a class */
const ordersDefinitions = (
  environmentType: CubeDataProductEnvironmentType,
): CubeIngestDefinitionList => ({
  candidates: [FAKE_INGEST_ORDERS, FAKE_INGEST_DESKS].map(
    (definition) =>
      new CubeIngestDefinitionCandidate({
        urn: ordersUrnOf(definition, environmentType),
        definition,
        groupId: ORDERS_PROJECT.groupId,
        artifactId: ORDERS_PROJECT.artifactId,
      }),
  ),
  droppedCount: 0,
});

/** Lets the flows an action started finish */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

/**
 * A host with both catalogs, whose producer 1234 deploys the orders
 * products' project's definitions, and its data products too: one whose
 * ingest catalog lists a data product's project's definitions, as Studio's
 * and Legend Analytics' do, or one that can't, as Analytics' without a
 * depot, which keeps them apart
 */
const setUp = (
  mixes: boolean,
  queryRules?: readonly QueryRule[],
  options?: {
    /** The data products listed: by default the fake's, deployed by producer 1234 */
    readonly candidates?: readonly CubeDataProductCandidate[];
  },
): ReturnType<typeof TEST__createCubeHost> & {
  state: CubeEditorState;
  ingest: FakeCubeIngestCatalog;
  listProjectDefinitions: jest.Mock<
    NonNullable<CubeIngestCatalog['listProjectDefinitions']>
  >;
} => {
  const created = TEST__createCubeHost();
  const dataProducts = createFakeCubeDataProductCatalog(
    options?.candidates ??
      FAKE_DATA_PRODUCT_CANDIDATES.map(
        (candidate) =>
          new CubeDataProductCandidate({
            ...candidate,
            deploymentId: FAKE_INGEST_PRODUCER_ID,
          }),
      ),
  );
  const ingest = createFakeCubeIngestCatalog();
  ingest.listDefinitions.mockImplementation(
    async ({ environmentType }, producerDeploymentId) =>
      producerDeploymentId === FAKE_INGEST_PRODUCER_ID
        ? ordersDefinitions(environmentType)
        : { candidates: [], droppedCount: 0 },
  );
  const listProjectDefinitions = jest.fn<
    NonNullable<CubeIngestCatalog['listProjectDefinitions']>
  >(async (project: CubeDataProductProject) =>
    ordersDefinitions(project.environmentType),
  );
  const host: CubeHost = {
    ...created.host,
    dataProductCatalog: dataProducts.catalog,
    ingestCatalog: mixes
      ? { ...ingest.catalog, listProjectDefinitions }
      : ingest.catalog,
    queryRules,
  };
  return {
    ...created,
    dataProducts,
    ingest,
    listProjectDefinitions,
    state: new CubeEditorState(host),
  };
};

/** Adds the orders product's daily access point through the Data Product tab */
const addDailyOrders = async (state: CubeEditorState): Promise<void> => {
  state.addNode(DataProductAccessPointSource.TYPE);
  await settle();
  const tab = state.sourcePicker.dataProductTab;
  tab.selectCandidate(
    tab.visibleCandidates.find(
      (candidate) => candidate.id === 'ORDERS_PRODUCT',
    ),
  );
  await settle();
  tab.selectAccessPoint('core', 'daily_orders');
  await flowResult(state.sourcePicker.confirm());
  expect(
    state.document.query.nodes.some(
      (node) => node instanceof DataProductAccessPointSource,
    ),
  ).toBe(true);
};

/**
 * Adds the orders definition's TRADES through the Ingest tab: from producer
 * 1234 on a cube without a data product, in a mode and on a warehouse when a
 * new cube is given them; with no producer to pick on a data product cube
 */
const addTrades = async (
  state: CubeEditorState,
  settings?: {
    readonly environmentType: CubeDataProductEnvironmentType;
    readonly warehouse: string;
  },
): Promise<void> => {
  state.addNode(IngestDatasetSource.TYPE);
  await settle();
  const tab = state.sourcePicker.ingestTab;
  if (settings) {
    tab.setEnvironmentType(settings.environmentType);
    await settle();
  }
  if (!tab.joinedProject) {
    tab.selectProducer(FAKE_INGEST_PRODUCER_ID);
    await settle();
  }
  tab.selectDefinition(
    tab.shownDefinitions.find(
      (candidate) => candidate.definition === FAKE_INGEST_ORDERS,
    ),
  );
  await settle();
  expect(tab.dataSetNames).toEqual(['TRADES']);
  if (settings) {
    tab.setWarehouse(settings.warehouse);
  }
  await flowResult(state.sourcePicker.confirm());
  expect(
    state.document.query.nodes.some(
      (node) => node instanceof IngestDatasetSource,
    ),
  ).toBe(true);
};

/** TRADES of a definition, as a cube saves it */
const tradesOf = (id: string, urn: string): IngestDatasetSource =>
  new IngestDatasetSource(
    id,
    {
      ingestDefinitionUrn: urn,
      ingestDefinition: FAKE_INGEST_ORDERS,
      dataSet: 'TRADES',
    },
    { kind: 'resolved', schema: FAKE_INGEST_TRADES_SCHEMA },
  );

const errorsOf = (state: CubeEditorState): [string, readonly string[]][] =>
  state.document.query.nodes.map(({ id }) => [
    id,
    state.analysis.validity.get(id) ?? [],
  ]);

beforeEach(() => {
  localStorage.clear();
});

describe('Data products and ingest data sets in one cube', () => {
  test("Stay apart on a host whose ingest catalog can't list a data product's project's definitions, as before", async () => {
    const { state } = setUp(false);
    await addDailyOrders(state);
    const picker = state.sourcePicker;
    expect(picker.isTabEnabled(picker.ingestTab)).toBe(false);
    // the Ingest Dataset palette item opens the cube's own tab, and says why
    // it can't add a data set
    state.addNode(IngestDatasetSource.TYPE);
    expect(picker.activeTabKey).toBe(CubeSourcePickerTabKey.DATA_PRODUCT);
    expect(picker.getOtherKindTitle(IngestDatasetSource.TYPE)).toBe(
      "This cube reads data products: it can't also read ingest data sets",
    );
    picker.close();
    // a data set added another way, e.g. in a spec edited by hand, is flagged
    // with the message one kind per query gave it
    state.applyDocument(
      state.document.withQuery(
        state.document.query.add(
          tradesOf('ingestDataset101', ordersUrnOf(FAKE_INGEST_ORDERS)),
        ),
      ),
    );
    expect(errorsOf(state)).toEqual([
      ['dataProductAccessPoint101', []],
      [
        'ingestDataset101',
        [
          'Data products and ingest data sets cannot be mixed in one query; this query reads from data products.',
        ],
      ],
    ]);
  });

  test("Join a data product cube from the Ingest tab: its project's definitions, in its Mode and on its warehouse, with no producer to pick, the cube's model kept", async () => {
    const { state, ingest, listProjectDefinitions } = setUp(true);
    await addDailyOrders(state);
    const model = state.document.context?.model;
    expect(model).toMatchObject({
      _type: 'cubeDataProduct',
      environmentType: PRODUCTION,
    });
    const picker = state.sourcePicker;
    expect(picker.isTabEnabled(picker.ingestTab)).toBe(true);
    // the palette item opens the Ingest tab, on the cube's mode and warehouse
    ingest.listProducers.mockClear();
    state.addNode(IngestDatasetSource.TYPE);
    await settle();
    expect(picker.activeTabKey).toBe(CubeSourcePickerTabKey.INGEST);
    const tab = picker.ingestTab;
    expect(tab.joinedProject).toMatchObject(ORDERS_PROJECT);
    expect(tab.isClassFixed).toBe(true);
    expect(tab.environmentType).toBe(PRODUCTION);
    tab.setEnvironmentType(PRODUCTION_PARALLEL);
    expect(tab.environmentType).toBe(PRODUCTION);
    const { warehouse } = tab;
    tab.setWarehouse('ANOTHER_WH');
    expect(tab.warehouse).toBe(warehouse);
    // the project's definitions, with no producer deployment to pick
    expect(ingest.listProducers).not.toHaveBeenCalled();
    // the data product's deployment, which deploys its project's definitions
    expect(listProjectDefinitions).toHaveBeenCalledWith(
      expect.objectContaining({
        ...ORDERS_PROJECT,
        environmentType: PRODUCTION,
      }),
      FAKE_INGEST_PRODUCER_ID,
    );
    expect(tab.shownDefinitions.map((each) => each.urn)).toEqual([
      ordersUrnOf(FAKE_INGEST_ORDERS),
      ordersUrnOf(FAKE_INGEST_DESKS),
    ]);
    await addTrades(state);
    expect(state.document.context).toEqual({
      model,
      runtime: CUBE_DATA_PRODUCT_RUNTIME_PATH,
    });
    expect(
      state.document.query.nodes.map((node) =>
        node instanceof IngestDatasetSource
          ? [node.id, node.ingestDefinitionUrn]
          : [node.id],
      ),
    ).toEqual([
      ['dataProductAccessPoint101'],
      ['ingestDataset101', ordersUrnOf(FAKE_INGEST_ORDERS)],
    ]);
    expect(errorsOf(state)).toEqual([
      ['dataProductAccessPoint101', []],
      ['ingestDataset101', []],
    ]);
    // read again in the cube's mode, the viewer's own environment of it
    ingest.resolveSchemas.mockClear();
    await flowResult(state.reresolveSources(undefined, true));
    expect(ingest.resolveSchemas).toHaveBeenCalledTimes(1);
    expect(ingest.resolveSchemas.mock.calls[0]?.[0]).toEqual({
      environmentType: PRODUCTION,
    });
  });

  test('Make an ingest cube a data product cube of its Mode and warehouse when an access point of its project joins it, in one undo step', async () => {
    const { state } = setUp(true);
    await addTrades(state, {
      environmentType: PRODUCTION_PARALLEL,
      warehouse: 'TRADES_WH',
    });
    const ingestContext = state.document.context;
    expect(ingestContext).toEqual({
      model: createCubeIngestModel({
        environmentType: PRODUCTION_PARALLEL,
        producerDeploymentId: FAKE_INGEST_PRODUCER_ID,
        warehouse: 'TRADES_WH',
      }),
      runtime: CUBE_INGEST_RUNTIME_PATH,
    });
    const picker = state.sourcePicker;
    expect(picker.isTabEnabled(picker.dataProductTab)).toBe(true);
    picker.open(CubeSourcePickerTabKey.DATA_PRODUCT);
    await settle();
    const tab = picker.dataProductTab;
    expect(tab.joinedIngest).toMatchObject({
      environmentType: PRODUCTION_PARALLEL,
    });
    expect(tab.environmentType).toBe(PRODUCTION_PARALLEL);
    tab.setEnvironmentType(PRODUCTION);
    expect(tab.environmentType).toBe(PRODUCTION_PARALLEL);
    expect(tab.warehouse).toBe('TRADES_WH');
    tab.selectCandidate(
      tab.visibleCandidates.find(
        (candidate) => candidate.id === 'ORDERS_PRODUCT',
      ),
    );
    await settle();
    tab.selectAccessPoint('core', 'daily_orders');
    await flowResult(picker.confirm());
    expect(state.document.context).toEqual({
      model: createCubeDataProductModel({
        ...ORDERS_PROJECT,
        environmentType: PRODUCTION_PARALLEL,
        warehouse: 'TRADES_WH',
      }),
      runtime: CUBE_DATA_PRODUCT_RUNTIME_PATH,
    });
    expect(state.document.query.nodes.map(({ id }) => id)).toEqual([
      'ingestDataset101',
      'dataProductAccessPoint101',
    ]);
    expect(errorsOf(state)).toEqual([
      ['ingestDataset101', []],
      ['dataProductAccessPoint101', []],
    ]);
    state.undo();
    expect(state.document.context).toEqual(ingestContext);
    expect(state.document.query.nodes.map(({ id }) => id)).toEqual([
      'ingestDataset101',
    ]);
  });

  test("Flag, in a data product cube, a data set of another project or another Mode, saying why, so it can't run", async () => {
    const { state } = setUp(true);
    await addDailyOrders(state);
    state.applyDocument(
      state.document.withQuery(
        state.document.query
          .add(
            tradesOf('ingestDataset101', fakeIngestUrnOf(FAKE_INGEST_ORDERS)),
          )
          .add(
            tradesOf(
              'ingestDataset102',
              ordersUrnOf(FAKE_INGEST_ORDERS, PRODUCTION_PARALLEL),
            ),
          )
          .add(
            tradesOf(
              'ingestDataset103',
              `urn:lakehouse:prod:ingest:definition:rest-api:${FAKE_INGEST_ORDERS}`,
            ),
          )
          .add(tradesOf('ingestDataset104', ordersUrnOf(FAKE_INGEST_ORDERS))),
      ),
    );
    expect(errorsOf(state)).toEqual([
      ['dataProductAccessPoint101', []],
      [
        'ingestDataset101',
        [
          `Ingest definition ${FAKE_INGEST_ORDERS} is in another project than the cube's data products, com.example.sales:orders-products`,
        ],
      ],
      [
        'ingestDataset102',
        [
          `Ingest definition ${FAKE_INGEST_ORDERS} is deployed to another Mode than the cube's, Production`,
        ],
      ],
      [
        'ingestDataset103',
        [
          `Ingest definition ${FAKE_INGEST_ORDERS} wasn't deployed from a project, so this data product cube can't read it`,
        ],
      ],
      ['ingestDataset104', []],
    ]);
  });

  test("Add the host's own rules to the editor's: a step one flags can't run", async () => {
    const reason = 'The host refuses this access point';
    const { state } = setUp(true, [
      (query) =>
        new Map(
          query.nodes
            .filter((node) => node instanceof DataProductAccessPointSource)
            .map((node) => [node.id, [reason]]),
        ),
    ]);
    await addDailyOrders(state);
    expect(errorsOf(state)).toEqual([['dataProductAccessPoint101', [reason]]]);
    expect(state.execution.canExecute).toBe(false);
  });

  test("Write one lambda that reads both, which Import Pure reads back into one data product cube; a host that can't list a project's definitions refuses it", async () => {
    const { state } = setUp(true);
    await addDailyOrders(state);
    await addTrades(state);
    const join = new Join('join101', {
      leftColumns: ['REGION'],
      rightColumns: ['DESK'],
      joinType: JoinType.INNER,
    });
    state.applyDocument(
      state.document.withQuery(
        state.document.query
          .add(join)
          .connect('dataProductAccessPoint101', 'join101', 'leftTds')
          .connect('ingestDataset101', 'join101', 'rightTds')
          .select('join101'),
      ),
    );
    expect(state.execution.disabledReasons).toEqual([]);
    // Add MatView's lambda: the step that runs, with no runtime and no limit
    const lambda = await buildCubeRunningStepLambda(state);
    const text = JSON.stringify(lambda);
    expect(text).toContain('"type":"P"');
    expect(text).toContain('"type":"I"');
    expect(text).toContain('"function":"join"');

    // Edit MatView: a new cube, read from the lambda, its data sets bound
    // among the project's definitions, with no producer to pick
    const studio = setUp(true);
    const reading = await readCubeLambdaDocument(studio.state, lambda);
    expect(studio.ingest.listProducers).not.toHaveBeenCalled();
    expect(reading.document.context).toEqual({
      model: createCubeDataProductModel({
        ...ORDERS_PROJECT,
        environmentType: PRODUCTION,
        warehouse: state.document.context?.model.warehouse as string,
      }),
      runtime: CUBE_DATA_PRODUCT_RUNTIME_PATH,
    });
    expect(
      reading.document.query.nodes.map((node) =>
        node instanceof IngestDatasetSource
          ? [node.type, node.ingestDefinitionUrn]
          : [node.type],
      ),
    ).toEqual([
      [DataProductAccessPointSource.TYPE],
      [IngestDatasetSource.TYPE, ordersUrnOf(FAKE_INGEST_ORDERS)],
      [Join.TYPE],
    ]);
    studio.state.applyDocument(reading.document);
    expect(studio.state.execution.disabledReasons).toEqual([]);
    expect(await buildCubeRunningStepLambda(studio.state)).toEqual(lambda);

    const elsewhere = setUp(false);
    await expect(
      readCubeLambdaDocument(elsewhere.state, lambda),
    ).rejects.toThrow(CUBE_LAMBDA_SOURCES_MESSAGE.MIXED);
  });
});

describe('Data products and ingest data sets in one cube, as Legend Analytics reads them', () => {
  const ADDED_AFTER = "Added after this data product's version 1.4.0";

  /** The orders products' project's definitions, as 1.4.0 has them: DesksIngest was added after it */
  const atVersion = (
    environmentType: CubeDataProductEnvironmentType,
    greyed = FAKE_INGEST_DESKS,
  ): CubeIngestDefinitionList => ({
    candidates: ordersDefinitions(environmentType).candidates.map(
      (candidate) =>
        candidate.definition === greyed
          ? new CubeIngestDefinitionCandidate({
              urn: candidate.urn,
              definition: candidate.definition,
              groupId: candidate.groupId,
              artifactId: candidate.artifactId,
              disabledReason: ADDED_AFTER,
            })
          : candidate,
    ),
    droppedCount: 0,
  });

  /** Adds an access point of a listed product through the Data Product tab: whether it was added */
  const addAccessPoint = async (
    state: CubeEditorState,
    productId: string,
  ): Promise<boolean> => {
    const picker = state.sourcePicker;
    picker.open(CubeSourcePickerTabKey.DATA_PRODUCT);
    await settle();
    const tab = picker.dataProductTab;
    tab.selectCandidate(
      tab.visibleCandidates.find((candidate) => candidate.id === productId),
    );
    await settle();
    tab.selectAccessPoint('core', 'daily_orders');
    return flowResult(tab.confirm());
  };

  test("The Ingest tab lists the definitions of the data products' deployment, greys one their version lacks, which can't be opened, and reads data sets as that version has them", async () => {
    const { state, ingest, listProjectDefinitions } = setUp(true);
    listProjectDefinitions.mockImplementation(async (project) =>
      atVersion(project.environmentType),
    );
    await addDailyOrders(state);
    state.addNode(IngestDatasetSource.TYPE);
    await settle();
    const tab = state.sourcePicker.ingestTab;
    expect(tab.joinedDeploymentIds).toEqual([FAKE_INGEST_PRODUCER_ID]);
    expect(listProjectDefinitions).toHaveBeenCalledWith(
      expect.objectContaining(ORDERS_PROJECT),
      FAKE_INGEST_PRODUCER_ID,
    );
    // the deployment is named as its producer is
    expect(tab.getProducerLabel(FAKE_INGEST_PRODUCER_ID)).toBe(
      'Sales Feed (1234)',
    );
    const desks = tab.shownDefinitions.find(
      (each) => each.definition === FAKE_INGEST_DESKS,
    ) as CubeIngestDefinitionCandidate;
    expect(desks.disabledReason).toBe(ADDED_AFTER);
    tab.selectDefinition(desks);
    tab.toggleDefinition(desks);
    expect(tab.definitions).toEqual([]);
    expect(ingest.describe).not.toHaveBeenCalled();
    tab.selectDefinition(
      tab.shownDefinitions.find(
        (each) => each.definition === FAKE_INGEST_ORDERS,
      ),
    );
    await settle();
    expect(ingest.describe).toHaveBeenCalledWith(
      ordersUrnOf(FAKE_INGEST_ORDERS),
      { environmentType: PRODUCTION },
      { project: expect.objectContaining(ORDERS_PROJECT) },
    );
  });

  test("The Ingest tab lists again for another version of the project, and says why when the cube's access points come from several deployments", async () => {
    const { state, listProjectDefinitions } = setUp(true);
    await addDailyOrders(state);
    const picker = state.sourcePicker;
    picker.open(CubeSourcePickerTabKey.INGEST);
    await settle();
    picker.close();
    // the same cube reopens on the same list
    picker.open(CubeSourcePickerTabKey.INGEST);
    await settle();
    picker.close();
    expect(listProjectDefinitions).toHaveBeenCalledTimes(1);
    // a cube of another version lists its own
    state.removeNode('dataProductAccessPoint101');
    expect(await addAccessPoint(state, 'RETURNS_PRODUCT')).toBe(true);
    picker.open(CubeSourcePickerTabKey.INGEST);
    await settle();
    picker.close();
    expect(listProjectDefinitions).toHaveBeenCalledTimes(2);
    expect(listProjectDefinitions.mock.calls[1]?.[0]).toMatchObject({
      versionId: 'feature-returns-SNAPSHOT',
    });
    // access points of two deployments: neither is known to deploy the definitions
    const [point] = state.document.query
      .nodes as DataProductAccessPointSource[];
    const other = point as DataProductAccessPointSource;
    state.applyDocument(
      state.document.withQuery(
        state.document.query.add(
          new DataProductAccessPointSource(
            'dataProductAccessPoint102',
            {
              dataProduct: other.dataProduct,
              accessPointGroup: other.accessPointGroup,
              accessPoint: other.accessPoint,
              dataProductId: other.dataProductId,
              deploymentId: '5678',
            },
            other.resolution,
          ),
        ),
      ),
    );
    picker.open(CubeSourcePickerTabKey.INGEST);
    await settle();
    expect(picker.ingestTab.error?.message).toBe(
      CUBE_INGEST_JOIN_MESSAGE.SEVERAL_DEPLOYMENTS([
        FAKE_INGEST_PRODUCER_ID,
        '5678',
      ]),
    );
    expect(listProjectDefinitions).toHaveBeenCalledTimes(2);
  });

  test("The Data Product tab on an ingest cube lists only its data sets' project's products that its producer deployment deployed", async () => {
    const [orders] = FAKE_DATA_PRODUCT_CANDIDATES;
    const productOf = (
      fields: Partial<
        ConstructorParameters<typeof CubeDataProductCandidate>[0]
      >,
    ): CubeDataProductCandidate =>
      new CubeDataProductCandidate({
        ...(orders as CubeDataProductCandidate),
        deploymentId: FAKE_INGEST_PRODUCER_ID,
        ...fields,
      });
    const candidates = [
      productOf({}),
      productOf({
        id: 'ORDERS_ELSEWHERE',
        title: 'Orders Elsewhere',
        deploymentId: '5678',
      }),
      productOf({
        id: 'OTHER_PROJECT',
        title: 'Other Project',
        groupId: 'com.other',
        artifactId: 'elsewhere',
      }),
    ];
    const { state } = setUp(true, undefined, { candidates });
    await addTrades(state);
    state.sourcePicker.open(CubeSourcePickerTabKey.DATA_PRODUCT);
    await settle();
    const tab = state.sourcePicker.dataProductTab;
    expect(tab.joinedIngestScope).toEqual({
      groupId: ORDERS_PROJECT.groupId,
      artifactId: ORDERS_PROJECT.artifactId,
      deploymentId: FAKE_INGEST_PRODUCER_ID,
    });
    expect(tab.visibleCandidates.map((each) => each.id)).toEqual([
      'ORDERS_PRODUCT',
    ]);
    expect(tab.getCandidateDisabledReason(candidates[1] as never)).toBe(
      CUBE_DATA_PRODUCT_TAB_MESSAGE.OTHER_DEPLOYMENT('5678'),
    );
    expect(tab.getCandidateDisabledReason(candidates[2] as never)).toBe(
      CUBE_DATA_PRODUCT_TAB_MESSAGE.OTHER_PROJECT('com.other', 'elsewhere'),
    );
    tab.selectCandidate(candidates[1]);
    expect(tab.candidate).toBeUndefined();
  });

  test('The Data Product tab refuses an ingest cube that reads another environment than the viewer’s own, naming both', async () => {
    const { state } = setUp(true);
    state.addNode(IngestDatasetSource.TYPE);
    await settle();
    const ingestTab = state.sourcePicker.ingestTab;
    ingestTab.setEnvironment(fakeIngestEnvironmentOf(PRODUCTION, 'env-b'));
    await settle();
    ingestTab.selectProducer(FAKE_INGEST_PRODUCER_ID);
    await settle();
    ingestTab.selectDefinition(
      ingestTab.shownDefinitions.find(
        (each) => each.definition === FAKE_INGEST_ORDERS,
      ),
    );
    await settle();
    await flowResult(state.sourcePicker.confirm());
    const model = state.document.context?.model;
    expect(model).toMatchObject({ environment: 'env-b' });
    const picker = state.sourcePicker;
    picker.open(CubeSourcePickerTabKey.DATA_PRODUCT);
    await settle();
    const tab = picker.dataProductTab;
    expect(tab.joinRefusal).toBe(
      CUBE_DATA_PRODUCT_TAB_MESSAGE.OTHER_INGEST_ENVIRONMENT('env-b', 'env-a'),
    );
    expect(tab.visibleCandidates).toEqual([]);
    expect(tab.canConfirm).toBe(false);
    picker.close();
    // the viewer's own environment, named, can be joined
    state.applyDocument(
      state.document.withContext({
        model: { ...(model as ModelContext), environment: 'env-a' },
        runtime: CUBE_INGEST_RUNTIME_PATH,
      }),
    );
    picker.open(CubeSourcePickerTabKey.DATA_PRODUCT);
    await settle();
    expect(tab.joinRefusal).toBeUndefined();
    // the project's products of the deployment, at any version
    expect(tab.visibleCandidates.map((each) => each.id)).toEqual([
      'ORDERS_PRODUCT',
      'RETURNS_PRODUCT',
    ]);
  });

  test("Reads an ingest cube's data sets again as the data product's version has them when its access point joins: one the version lacks fails, saying so, and Undo brings the ingest cube back", async () => {
    const { state, ingest } = setUp(true);
    await addTrades(state);
    const ingestContext = state.document.context;
    const [trades] = state.document.query.nodes;
    ingest.resolveSchemas.mockImplementation(
      async (_environment, sources) =>
        new Map(
          [...sources.keys()].map((nodeId) => [
            nodeId,
            new CubeEngineError(
              CubeEngineErrorKind.COMPILE,
              ADDED_AFTER,
              nodeId,
            ),
          ]),
        ),
    );
    expect(await addAccessPoint(state, 'ORDERS_PRODUCT')).toBe(true);
    expect(ingest.resolveSchemas).toHaveBeenCalledTimes(1);
    expect(ingest.resolveSchemas.mock.calls[0]?.[2]).toEqual({
      fresh: false,
      project: expect.objectContaining({
        ...ORDERS_PROJECT,
        environmentType: PRODUCTION,
      }),
    });
    expect(errorsOf(state)).toEqual([
      ['ingestDataset101', [ADDED_AFTER]],
      ['dataProductAccessPoint101', []],
    ]);
    state.undo();
    expect(state.document.context).toEqual(ingestContext);
    expect(state.document.query.nodes).toHaveLength(1);
    expect(state.document.query.nodes[0]).toBe(trades);
    // a version that can't be read changes nothing
    ingest.resolveSchemas.mockImplementation(
      async (_environment, sources) =>
        new Map(
          [...sources.keys()].map((nodeId) => [
            nodeId,
            new CubeEngineError(
              CubeEngineErrorKind.NETWORK,
              'Depot is down',
              nodeId,
            ),
          ]),
        ),
    );
    expect(await addAccessPoint(state, 'ORDERS_PRODUCT')).toBe(false);
    expect(state.sourcePicker.dataProductTab.error?.message).toBe(
      'Depot is down',
    );
    expect(state.document.context).toEqual(ingestContext);
  });

  test("Import Pure reads a lambda's data sets among the definitions of its data products' deployment, as their version has them, and refuses one the version lacks", async () => {
    const { state } = setUp(true);
    await addDailyOrders(state);
    await addTrades(state);
    state.applyDocument(
      state.document.withQuery(
        state.document.query
          .add(
            new Join('join101', {
              leftColumns: ['REGION'],
              rightColumns: ['DESK'],
              joinType: JoinType.INNER,
            }),
          )
          .connect('dataProductAccessPoint101', 'join101', 'leftTds')
          .connect('ingestDataset101', 'join101', 'rightTds')
          .select('join101'),
      ),
    );
    const lambda = await buildCubeRunningStepLambda(state);

    const analytics = setUp(true);
    await readCubeLambdaDocument(analytics.state, lambda);
    expect(analytics.listProjectDefinitions).toHaveBeenCalledWith(
      expect.objectContaining(ORDERS_PROJECT),
      FAKE_INGEST_PRODUCER_ID,
    );
    expect(analytics.ingest.describe).toHaveBeenCalledWith(
      ordersUrnOf(FAKE_INGEST_ORDERS),
      { environmentType: PRODUCTION },
      { project: expect.objectContaining(ORDERS_PROJECT) },
    );

    const older = setUp(true);
    older.listProjectDefinitions.mockImplementation(async (project) =>
      atVersion(project.environmentType, FAKE_INGEST_ORDERS),
    );
    await expect(readCubeLambdaDocument(older.state, lambda)).rejects.toThrow(
      CUBE_LAMBDA_SOURCES_MESSAGE.DEFINITION_UNREADABLE(
        FAKE_INGEST_ORDERS,
        ADDED_AFTER,
      ),
    );
  });
});
