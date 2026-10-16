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
import { IngestDatasetSource, RelationalTableSource } from '@finos/legend-cube';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import {
  createFakeCubeIngestCatalog,
  FAKE_INGEST_DESKS,
  FAKE_INGEST_DESKS_SCHEMA,
  FAKE_INGEST_FILLS_SCHEMA,
  FAKE_INGEST_ORDERS,
  FAKE_INGEST_ORDERS_WITH_FILLS,
  FAKE_INGEST_TRADES_SCHEMA,
  type FakeCubeIngestCatalog,
  fakeIngestUrnOf,
} from '../../__test-utils__/FakeCubeIngestCatalog.js';
import {
  CUBE_DEFAULT_CONSUMER_WAREHOUSE,
  CubeDataProductEnvironmentType,
} from '../../graph-manager/CubeDataProduct.js';
import {
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../graph-manager/CubeEngine.js';
import {
  CUBE_INGEST_MODEL_TYPE,
  CUBE_INGEST_RUNTIME_PATH,
  formatCubeIngestUrn,
  parseCubeIngestUrn,
} from '../../graph-manager/CubeIngest.js';
import {
  type CubeIngestCatalog,
  CubeIngestEnvironment,
  CubeIngestProducer,
} from '../../graph-manager/CubeIngestCatalog.js';
import { getCubeRememberedWarehouse } from '../CubeDataProductWarehouse.js';
import { CubeEditorState } from '../CubeEditorState.js';
import { CubeSourcePickerTabKey } from '../source-picker/CubeSourcePickerTab.js';

const { PRODUCTION, PRODUCTION_PARALLEL } = CubeDataProductEnvironmentType;
/** The viewer's own production environment, as a cube naming none reads it */
const VIEWER_PRODUCTION = { environmentType: PRODUCTION, name: undefined };

/** Lets the flows an action started finish */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

const setUp = (
  withCatalog = true,
): {
  state: CubeEditorState;
  ingest: FakeCubeIngestCatalog;
} => {
  const { host } = TEST__createCubeHost();
  const ingest = createFakeCubeIngestCatalog();
  const state = new CubeEditorState(
    withCatalog ? { ...host, ingestCatalog: ingest.catalog } : host,
  );
  return { state, ingest };
};

/** Opens the Ingest tab and picks producer 1234's orders definition */
const openOnOrders = async (
  state: CubeEditorState,
): Promise<CubeEditorState['sourcePicker']['ingestTab']> => {
  state.addNode(IngestDatasetSource.TYPE);
  await settle();
  const tab = state.sourcePicker.ingestTab;
  tab.selectProducer('1234');
  await settle();
  tab.selectDefinition(
    tab.shownDefinitions.find(
      (candidate) => candidate.definition === FAKE_INGEST_ORDERS,
    ),
  );
  await settle();
  return tab;
};

beforeEach(() => {
  localStorage.clear();
});

describe('The Ingest tab', () => {
  test('Is offered, with its palette item, only by a host with an ingest catalog', () => {
    const without = setUp(false).state;
    expect(without.sourcePicker.ingestTab.isAvailable).toBe(false);
    expect(
      without.offeredSources.map((definition) => definition.type),
    ).not.toContain(IngestDatasetSource.TYPE);
    expect(without.canAddNode(IngestDatasetSource.TYPE)).toBe(false);
    const { state } = setUp();
    expect(state.offeredSources.map((definition) => definition.type)).toContain(
      IngestDatasetSource.TYPE,
    );
    expect(state.canAddNode(IngestDatasetSource.TYPE)).toBe(true);
    state.addNode(IngestDatasetSource.TYPE);
    expect(state.sourcePicker.isOpen).toBe(true);
    expect(state.sourcePicker.activeTabKey).toBe(CubeSourcePickerTabKey.INGEST);
  });

  test("Reads the viewer's environment and producers, then a producer's definitions, then a definition's data sets", async () => {
    const { state, ingest } = setUp();
    const tab = await openOnOrders(state);
    expect(tab.environment?.name).toBe('env-a');
    expect(tab.producers?.map((producer) => producer.deploymentId)).toEqual([
      '1234',
      '5678',
    ]);
    expect(ingest.listDefinitions.mock.calls).toEqual([
      [VIEWER_PRODUCTION, '1234'],
    ]);
    expect(tab.definitionList?.droppedCount).toBe(1);
    tab.setDefinitionSearch('desks');
    expect(tab.shownDefinitions.map((each) => each.definition)).toEqual([
      FAKE_INGEST_DESKS,
    ]);
    tab.setDefinitionSearch('com.example:sales');
    expect(tab.shownDefinitions).toHaveLength(2);
    expect(ingest.describe.mock.calls).toEqual([
      [fakeIngestUrnOf(FAKE_INGEST_ORDERS), VIEWER_PRODUCTION],
    ]);
    // the only data set that can be added is picked; a materialized view can't be
    expect(tab.dataSetName).toBe('TRADES');
    tab.selectDataSet('DAILY');
    expect(tab.dataSetName).toBe('TRADES');
    expect(tab.dataSet?.schema).toBe(FAKE_INGEST_TRADES_SCHEMA);
    expect(tab.warehouse).toBe(CUBE_DEFAULT_CONSUMER_WAREHOUSE);
    expect(tab.canConfirm).toBe(true);
    tab.setWarehouse(' ');
    expect(tab.canConfirm).toBe(false);
  });

  test("Labels the producers with the names the host's deployment directory knows, else their ids, and asks once", async () => {
    const { state, ingest } = setUp();
    const tab = await openOnOrders(state);
    expect(tab.getProducerLabel('1234')).toBe('Sales Feed (1234)');
    expect(tab.getProducerLabel('5678')).toBe('Deployment 5678');
    expect(ingest.getProducerNames.mock.calls).toEqual([[['1234', '5678']]]);
    // a producer already named isn't asked of the directory again
    await flowResult(tab.loadProducerNames(['1234']));
    expect(ingest.getProducerNames).toHaveBeenCalledTimes(1);
  });

  test("Labels the producers with their ids when the directory can't answer, and on a host without one", async () => {
    const failing = setUp();
    failing.ingest.getProducerNames.mockRejectedValue(
      new CubeEngineError(CubeEngineErrorKind.NETWORK, 'directory down'),
    );
    const tab = await openOnOrders(failing.state);
    expect(tab.getProducerLabel('1234')).toBe('Deployment 1234');
    // the tab still works
    expect(tab.error).toBeUndefined();
    expect(tab.dataSetName).toBe('TRADES');

    const { host } = TEST__createCubeHost();
    const ingest = createFakeCubeIngestCatalog();
    const withoutDirectory: CubeIngestCatalog = { ...ingest.catalog };
    delete withoutDirectory.getProducerNames;
    const state = new CubeEditorState({
      ...host,
      ingestCatalog: withoutDirectory,
    });
    expect((await openOnOrders(state)).getProducerLabel('1234')).toBe(
      'Deployment 1234',
    );
  });

  test("Adds the data set, typed, and saves the cube's class, producer deployment and warehouse in the same step", async () => {
    const { state } = setUp();
    const tab = await openOnOrders(state);
    tab.setWarehouse('SALES_WH');
    await flowResult(state.sourcePicker.confirm());
    expect(state.sourcePicker.isOpen).toBe(false);
    expect(state.document.context).toEqual({
      model: {
        _type: CUBE_INGEST_MODEL_TYPE,
        environmentType: 'PRODUCTION',
        // left on the viewer's own environment, it names none: each viewer reads theirs
        producerDeploymentId: '1234',
        warehouse: 'SALES_WH',
      },
      runtime: CUBE_INGEST_RUNTIME_PATH,
    });
    const [node] = state.document.query.nodes;
    expect(node).toBeInstanceOf(IngestDatasetSource);
    expect((node as IngestDatasetSource).ingestDefinitionUrn).toBe(
      fakeIngestUrnOf(FAKE_INGEST_ORDERS),
    );
    expect((node as IngestDatasetSource).resolution).toEqual({
      kind: 'resolved',
      schema: FAKE_INGEST_TRADES_SCHEMA,
    });
    expect(
      getCubeRememberedWarehouse(state.host.applicationStore.userDataService),
    ).toBe('SALES_WH');
    state.undo();
    expect(state.document.context).toBeUndefined();
    expect(state.document.query.nodes).toHaveLength(0);
  });

  test('Adds several data sets picked at once in one undo step, the first picked running, the last previewed', async () => {
    const { state, ingest } = setUp();
    ingest.describe.mockResolvedValueOnce(FAKE_INGEST_ORDERS_WITH_FILLS);
    const tab = await openOnOrders(state);
    // two can be added, so neither is picked for the viewer
    expect(tab.pickedCount).toBe(0);
    expect(tab.canConfirm).toBe(false);
    tab.toggleDataSet('FILLS');
    tab.toggleDataSet('TRADES');
    expect(tab.pickedCount).toBe(2);
    // the preview shows the data set picked last
    expect(tab.dataSet?.schema).toBe(FAKE_INGEST_TRADES_SCHEMA);
    expect(state.sourcePicker.canConfirm).toBe(true);
    await flowResult(state.sourcePicker.confirm());
    expect(state.sourcePicker.isOpen).toBe(false);
    const nodes = state.document.query.nodes as IngestDatasetSource[];
    expect(nodes.map((node) => [node.id, node.dataSet])).toEqual([
      ['ingestDataset101', 'FILLS'],
      ['ingestDataset102', 'TRADES'],
    ]);
    expect(nodes.map((node) => node.resolution)).toEqual([
      { kind: 'resolved', schema: FAKE_INGEST_FILLS_SCHEMA },
      { kind: 'resolved', schema: FAKE_INGEST_TRADES_SCHEMA },
    ]);
    expect(state.document.query.selected).toBe('ingestDataset101');
    expect(state.document.context?.runtime).toBe(CUBE_INGEST_RUNTIME_PATH);
    expect(state.history).toHaveLength(1);
    expect(tab.pickedCount).toBe(0);
  });

  test("A plain pick replaces the picked data sets, ticking one again takes it out, and one that can't be added is never picked", async () => {
    const { state, ingest } = setUp();
    ingest.describe.mockResolvedValueOnce(FAKE_INGEST_ORDERS_WITH_FILLS);
    const tab = await openOnOrders(state);
    tab.toggleDataSet('TRADES');
    tab.toggleDataSet('FILLS');
    tab.selectDataSet('TRADES');
    expect(tab.dataSetNames).toEqual(['TRADES']);
    // a materialized view can't be added
    tab.toggleDataSet('DAILY');
    expect(tab.dataSetNames).toEqual(['TRADES']);
    tab.toggleDataSet('TRADES');
    expect(tab.dataSetNames).toEqual([]);
    expect(tab.dataSet).toBeUndefined();
    expect(tab.canConfirm).toBe(false);
    // another definition starts on its own data sets, its only one picked
    tab.toggleDataSet('FILLS');
    tab.selectDefinition(
      tab.shownDefinitions.find(
        (candidate) => candidate.definition === FAKE_INGEST_DESKS,
      ),
    );
    expect(tab.dataSetNames).toEqual([]);
    await settle();
    expect(tab.dataSetNames).toEqual(['DESKS']);
  });

  test('Opens several definitions, ticked, and adds data sets of each in one undo step; a plain pick opens one alone again', async () => {
    const { state } = setUp();
    const tab = await openOnOrders(state);
    const orders = guaranteeNonNullable(tab.definition);
    const desks = guaranteeNonNullable(
      tab.shownDefinitions.find(
        (candidate) => candidate.definition === FAKE_INGEST_DESKS,
      ),
    );
    // ticked beside the orders definition: its only data set is picked too
    tab.toggleDefinition(desks);
    expect(tab.definitions).toEqual([orders, desks]);
    await settle();
    expect(tab.picks).toEqual([
      { definitionUrn: orders.urn, dataSet: 'TRADES' },
      { definitionUrn: desks.urn, dataSet: 'DESKS' },
    ]);
    expect(tab.getDataSets(orders.urn)?.map((each) => each.name)).toEqual([
      'TRADES',
      'DAILY',
    ]);
    // the preview shows the data set picked last, of its definition
    expect(tab.dataSet?.schema).toBe(FAKE_INGEST_DESKS_SCHEMA);
    expect(tab.previewedDefinition).toBe(desks);
    expect(tab.pickedCount).toBe(2);

    // unticked, a definition's picks go with it; ticked again, they come back
    tab.toggleDefinition(desks);
    expect(tab.definitions).toEqual([orders]);
    expect(tab.dataSetNames).toEqual(['TRADES']);
    tab.toggleDefinition(desks);
    await settle();
    expect(tab.dataSetNames).toEqual(['TRADES', 'DESKS']);

    await flowResult(state.sourcePicker.confirm());
    const nodes = state.document.query.nodes as IngestDatasetSource[];
    expect(
      nodes.map((node) => [node.ingestDefinitionUrn, node.dataSet]),
    ).toEqual([
      [orders.urn, 'TRADES'],
      [desks.urn, 'DESKS'],
    ]);
    expect(nodes.map((node) => node.resolution)).toEqual([
      { kind: 'resolved', schema: FAKE_INGEST_TRADES_SCHEMA },
      { kind: 'resolved', schema: FAKE_INGEST_DESKS_SCHEMA },
    ]);
    expect(state.history).toHaveLength(1);

    // a plain pick of an opened definition opens it alone, its data sets kept
    state.addNode(IngestDatasetSource.TYPE);
    await settle();
    tab.toggleDataSet('DESKS', desks.urn);
    tab.selectDefinition(desks);
    expect(tab.definitions).toEqual([desks]);
    expect(tab.dataSetNames).toEqual(['DESKS']);
  });

  test('Keeps a cube to its class, producer deployment and warehouse, and to ingest data sets', async () => {
    const { state, ingest } = setUp();
    const tab = await openOnOrders(state);
    await flowResult(state.sourcePicker.confirm());
    state.addNode(IngestDatasetSource.TYPE);
    await settle();
    expect(state.sourcePicker.fixedTab).toBe(tab);
    expect(state.sourcePicker.isTabEnabled(state.sourcePicker.modelTab)).toBe(
      false,
    );
    expect(state.canAddNode(RelationalTableSource.TYPE)).toBe(false);
    tab.setEnvironmentType(PRODUCTION_PARALLEL);
    tab.selectProducer('5678');
    tab.setWarehouse('OTHER_WH');
    expect(tab.environmentType).toBe(PRODUCTION);
    expect(tab.producerDeploymentId).toBe('1234');
    expect(tab.warehouse).toBe(CUBE_DEFAULT_CONSUMER_WAREHOUSE);
    // the environment and the producers were read once
    expect(ingest.listProducers).toHaveBeenCalledTimes(1);
    tab.selectDefinition(
      tab.shownDefinitions.find(
        (candidate) => candidate.definition === FAKE_INGEST_DESKS,
      ),
    );
    await settle();
    await flowResult(state.sourcePicker.confirm());
    expect(
      state.document.query.nodes.map(
        (node) => (node as IngestDatasetSource).dataSet,
      ),
    ).toEqual(['TRADES', 'DESKS']);
  });

  test("Lists every ingest environment, starts on the viewer's own production one, and reads the one picked", async () => {
    const { state, ingest } = setUp();
    const tab = await openOnOrders(state);
    expect(
      tab.environments?.map((each) => [each.name, each.environmentType]),
    ).toEqual([
      ['env-a', PRODUCTION],
      ['env-a', PRODUCTION_PARALLEL],
      ['env-b', PRODUCTION],
    ]);
    expect(tab.environment?.name).toBe('env-a');
    expect(tab.environment?.environmentType).toBe(PRODUCTION);
    const envB = guaranteeNonNullable(
      tab.environments?.find((each) => each.name === 'env-b'),
    );
    tab.setEnvironment(envB);
    // its producers are read again, the producer and definitions dropped
    expect(tab.producerDeploymentId).toBeUndefined();
    expect(tab.definition).toBeUndefined();
    await settle();
    expect(tab.environment?.runtimeEnvironment).toBe('lakehouse-ingest-env-b');
    expect(ingest.listProducers.mock.calls.at(-1)).toEqual([
      { environmentType: PRODUCTION, name: 'env-b' },
    ]);
    // listed once
    expect(ingest.listEnvironments).toHaveBeenCalledTimes(1);
    tab.selectProducer('1234');
    await settle();
    expect(ingest.listDefinitions.mock.calls.at(-1)).toEqual([
      { environmentType: PRODUCTION, name: 'env-b' },
      '1234',
    ]);
    tab.selectDefinition(
      tab.shownDefinitions.find(
        (candidate) => candidate.definition === FAKE_INGEST_ORDERS,
      ),
    );
    await settle();
    await flowResult(state.sourcePicker.confirm());
    expect(state.document.context?.model).toMatchObject({
      environmentType: PRODUCTION,
      environment: 'env-b',
      producerDeploymentId: '1234',
    });
    // the cube keeps to it
    state.addNode(IngestDatasetSource.TYPE);
    await settle();
    tab.setEnvironment(
      guaranteeNonNullable(
        tab.environments?.find(
          (each) =>
            each.name === 'env-a' && each.environmentType === PRODUCTION,
        ),
      ),
    );
    expect(tab.environment?.name).toBe('env-b');
  });

  test("Lists the environments to pick from when the viewer's own can't be read", async () => {
    const { state, ingest } = setUp();
    ingest.resolveEnvironment.mockRejectedValueOnce(
      new CubeEngineError(
        CubeEngineErrorKind.EXECUTION,
        'Unable to resolve lakehouse user environment.',
      ),
    );
    state.addNode(IngestDatasetSource.TYPE);
    await settle();
    const tab = state.sourcePicker.ingestTab;
    expect(tab.error?.message).toBe(
      'Unable to resolve lakehouse user environment.',
    );
    expect(tab.environment).toBeUndefined();
    expect(tab.environments).toHaveLength(3);
    tab.setEnvironment(
      guaranteeNonNullable(
        tab.environments?.find((each) => each.name === 'env-b'),
      ),
    );
    await settle();
    expect(tab.error).toBeUndefined();
    expect(tab.environment?.name).toBe('env-b');
    expect(tab.producers).toHaveLength(2);
  });

  test('Reads the class the Mode names, and starts over on another', async () => {
    const { state, ingest } = setUp();
    const tab = await openOnOrders(state);
    tab.setEnvironmentType(PRODUCTION_PARALLEL);
    expect(tab.producerDeploymentId).toBeUndefined();
    expect(tab.definition).toBeUndefined();
    await settle();
    expect(ingest.resolveEnvironment.mock.calls.at(-1)).toEqual([
      { environmentType: PRODUCTION_PARALLEL, name: undefined },
    ]);
    expect(tab.environment?.runtimeEnvironment).toBe(
      'lakehouse-ingest-env-a-pp',
    );
  });

  test('Shows what failed, and reads that step again on Retry', async () => {
    const { state, ingest } = setUp();
    ingest.listProducers.mockImplementationOnce(async () => {
      throw new CubeEngineError(
        CubeEngineErrorKind.NETWORK,
        'The ingest server is down\nat a call',
      );
    });
    state.addNode(IngestDatasetSource.TYPE);
    await settle();
    const tab = state.sourcePicker.ingestTab;
    expect(tab.error).toEqual({
      message: 'The ingest server is down',
      detail: 'The ingest server is down\nat a call',
    });
    tab.retry();
    await settle();
    expect(tab.error).toBeUndefined();
    expect(tab.producers).toHaveLength(2);
    tab.selectProducer('1234');
    await settle();
    ingest.describe.mockImplementationOnce(async () => {
      throw new CubeEngineError(
        CubeEngineErrorKind.NETWORK,
        'Ingest definition sales::ingest::OrdersIngest is no longer deployed',
      );
    });
    tab.selectDefinition(guaranteeNonNullable(tab.shownDefinitions[0]));
    await settle();
    expect(tab.error?.message).toContain('no longer deployed');
    tab.retry();
    await settle();
    expect(tab.dataSetName).toBe('TRADES');
  });

  test('Drops the data sets that arrive after the dialog closed', async () => {
    const { state, ingest } = setUp();
    let release: () => void = () => undefined;
    ingest.describe.mockImplementationOnce(
      async () =>
        new Promise((resolve) => {
          release = () => resolve([]);
        }),
    );
    state.addNode(IngestDatasetSource.TYPE);
    await settle();
    const tab = state.sourcePicker.ingestTab;
    tab.selectProducer('1234');
    await settle();
    tab.selectDefinition(guaranteeNonNullable(tab.shownDefinitions[0]));
    state.sourcePicker.close();
    release();
    await settle();
    expect(tab.definition).toBeUndefined();
    expect(tab.dataSets).toBeUndefined();
    expect(tab.isDescribing).toBe(false);
  });

  test("Reads the only producer deployment's definitions, and starts a new cube on the environment's own warehouse", async () => {
    const { state, ingest } = setUp();
    ingest.listProducers.mockResolvedValueOnce([
      new CubeIngestProducer({
        deploymentId: '1234',
        urn: 'urn:lakehouse:prod:producer:deployment:1234',
      }),
    ]);
    ingest.resolveEnvironment.mockResolvedValueOnce(
      new CubeIngestEnvironment({
        environmentType: PRODUCTION,
        name: 'env-a',
        runtimeEnvironment: 'lakehouse-ingest-env-a',
        warehouse: 'PROJECT_WH',
      }),
    );
    state.addNode(IngestDatasetSource.TYPE);
    await settle();
    const tab = state.sourcePicker.ingestTab;
    expect(tab.producerDeploymentId).toBe('1234');
    expect(ingest.listDefinitions.mock.calls).toEqual([
      [VIEWER_PRODUCTION, '1234'],
    ]);
    expect(tab.shownDefinitions).toHaveLength(2);
    expect(tab.warehouse).toBe('PROJECT_WH');
  });
});

describe("An ingest definition's URN", () => {
  test('Reads back as the class, project and definition it was written from', () => {
    const urn = {
      environmentType: PRODUCTION_PARALLEL,
      groupId: 'org.finos.demo',
      artifactId: 'trades-ingest',
      definition: 'demo::ingest::TradesIngest',
    };
    expect(formatCubeIngestUrn(urn)).toBe(
      'urn:lakehouse:prod-parallel:ingest:definition:alloy-git:org.finos.demo~trades-ingest~demo::ingest::TradesIngest',
    );
    expect(parseCubeIngestUrn(formatCubeIngestUrn(urn))).toEqual(urn);
  });
});
