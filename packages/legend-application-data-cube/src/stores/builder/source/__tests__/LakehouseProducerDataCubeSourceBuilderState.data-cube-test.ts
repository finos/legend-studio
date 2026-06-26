/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import { unitTest } from '@finos/legend-shared/test';
import { expect, test } from '@jest/globals';
import { LakehouseProducerDataCubeSourceBuilderState } from '../LakehouseProducerDataCubeSourceBuilderState.js';
import type { LegendDataCubeApplicationStore } from '../../../LegendDataCubeBaseStore.js';
import type { LegendDataCubeDataCubeEngine } from '../../../LegendDataCubeDataCubeEngine.js';
import type { DataCubeAlertService } from '@finos/legend-data-cube';
import type {
  LakehousePlatformServerClient,
  LakehouseIngestServerClient,
  LakehouseContractServerClient,
} from '@finos/legend-server-lakehouse';

const buildState = () =>
  new LakehouseProducerDataCubeSourceBuilderState(
    undefined as unknown as LegendDataCubeApplicationStore,
    undefined as unknown as LegendDataCubeDataCubeEngine,
    undefined as unknown as LakehousePlatformServerClient,
    undefined as unknown as LakehouseIngestServerClient,
    undefined as unknown as LakehouseContractServerClient,
    undefined as unknown as DataCubeAlertService,
  );

test(
  unitTest(
    'setEnableIceberg(true) saves current warehouse to nonIcebergWarehouse',
  ),
  () => {
    const state = buildState();
    state.setWarehouse('LAKEHOUSE_PRODUCER_123_QUERY_WH');
    state.setEnableIceberg(true);
    expect(state.nonIcebergWarehouse).toBe('LAKEHOUSE_PRODUCER_123_QUERY_WH');
    expect(state.enableIceberg).toBe(true);
  },
);

test(
  unitTest(
    'setEnableIceberg(false) restores warehouse from nonIcebergWarehouse',
  ),
  () => {
    const state = buildState();
    state.setWarehouse('LAKEHOUSE_PRODUCER_123_QUERY_WH');
    state.setEnableIceberg(true);
    // Simulate iceberg overwriting the warehouse
    state.setWarehouse('iceberg-catalog-name');
    state.setEnableIceberg(false);
    expect(state.warehouse).toBe('LAKEHOUSE_PRODUCER_123_QUERY_WH');
    expect(state.enableIceberg).toBe(false);
  },
);

test(
  unitTest(
    'setEnableIceberg(false) keeps current warehouse when nonIcebergWarehouse is unset',
  ),
  () => {
    const state = buildState();
    state.setWarehouse('some-warehouse');
    // enableIceberg(false) without ever having been enabled — nonIcebergWarehouse is undefined
    state.setEnableIceberg(false);
    expect(state.warehouse).toBe('some-warehouse');
  },
);

test(
  unitTest('user-edited warehouse is captured when iceberg is re-enabled'),
  () => {
    const state = buildState();
    state.setWarehouse('LAKEHOUSE_PRODUCER_123_QUERY_WH');
    state.setEnableIceberg(true);
    state.setWarehouse('iceberg-catalog-name');

    // User unchecks iceberg — restores original warehouse
    state.setEnableIceberg(false);
    expect(state.warehouse).toBe('LAKEHOUSE_PRODUCER_123_QUERY_WH');

    // User manually edits the warehouse while iceberg is off
    state.setWarehouse('MY_CUSTOM_WH');

    // User re-enables iceberg — the custom warehouse is saved
    state.setEnableIceberg(true);
    expect(state.nonIcebergWarehouse).toBe('MY_CUSTOM_WH');

    // Simulate iceberg overwriting the warehouse
    state.setWarehouse('iceberg-catalog-name-2');

    // User unchecks again — should restore the custom warehouse
    state.setEnableIceberg(false);
    expect(state.warehouse).toBe('MY_CUSTOM_WH');
  },
);

test(unitTest('resetDownstreamState clears nonIcebergWarehouse'), () => {
  const state = buildState();
  state.setWarehouse('LAKEHOUSE_PRODUCER_123_QUERY_WH');
  state.setEnableIceberg(true);
  expect(state.nonIcebergWarehouse).toBe('LAKEHOUSE_PRODUCER_123_QUERY_WH');

  state.setSelectedProducerEnv(undefined); // triggers resetDownstreamState
  expect(state.nonIcebergWarehouse).toBeUndefined();
  expect(state.enableIceberg).toBe(false);
});
