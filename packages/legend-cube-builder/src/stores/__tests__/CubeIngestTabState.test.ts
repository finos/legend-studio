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
  FAKE_INGEST_ORDERS,
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
} from '../../graph-manager/CubeIngest.js';
import { getCubeRememberedWarehouse } from '../CubeDataProductWarehouse.js';
import { CubeEditorState } from '../CubeEditorState.js';
import { CubeSourcePickerTabKey } from '../source-picker/CubeSourcePickerTab.js';

const { PRODUCTION, PRODUCTION_PARALLEL } = CubeDataProductEnvironmentType;

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
    expect(ingest.listDefinitions.mock.calls).toEqual([[PRODUCTION, '1234']]);
    expect(tab.definitionList?.droppedCount).toBe(1);
    tab.setDefinitionSearch('desks');
    expect(tab.shownDefinitions.map((each) => each.definition)).toEqual([
      FAKE_INGEST_DESKS,
    ]);
    tab.setDefinitionSearch('com.example:sales');
    expect(tab.shownDefinitions).toHaveLength(2);
    expect(ingest.describe.mock.calls).toEqual([
      [fakeIngestUrnOf(FAKE_INGEST_ORDERS), PRODUCTION],
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

  test('Reads the class the Mode names, and starts over on another', async () => {
    const { state, ingest } = setUp();
    const tab = await openOnOrders(state);
    tab.setEnvironmentType(PRODUCTION_PARALLEL);
    expect(tab.producerDeploymentId).toBeUndefined();
    expect(tab.definition).toBeUndefined();
    await settle();
    expect(ingest.resolveEnvironment.mock.calls.at(-1)).toEqual([
      PRODUCTION_PARALLEL,
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
});
