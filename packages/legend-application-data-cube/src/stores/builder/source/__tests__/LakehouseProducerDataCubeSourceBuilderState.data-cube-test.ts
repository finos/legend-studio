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
  IngestDeploymentServerConfig,
} from '@finos/legend-server-lakehouse';

const TEST_PRODUCER_URN = 'urn:producer:test';
const TEST_INGEST_SERVER_URL = 'http://ingest.test';

const TEST_PRODUCER_ENVIRONMENT = (icebergEnabled: boolean) => ({
  _type: 'AWSSnowflake',
  appDirDeployment: { appDirId: 12345, level: 'DEPLOYMENT' },
  snowflakeRole: 'TEST_ROLE',
  databaseName: 'TEST_DB',
  warehouseName: 'TEST_WH',
  stageName: 'TEST_STAGE',
  icebergEnabled,
  databaseOwnerDeploymentId: 12345,
});

const TEST_INGEST_ENVIRONMENT = {
  _type: 'AWSSnowflake',
  urn: 'urn:ingest:env',
  version: '1.0.0',
  environmentClassification: 'prod',
  producers: { appDirId: 12345, level: 'DEPLOYMENT' },
  awsRegion: 'us-east-1',
  awsAccountId: '123456789',
  ingestStepFunctionsAvtivityArn: 'arn:activity',
  ingestStateMachineArn: 'arn:state-machine',
  ingestSystemAccount: 'system-account',
  snowflakeAccount: 'snowflake-account',
  snowflakeHost: 'snowflake-host',
  s3StagingBucketName: 'staging-bucket',
  storageIntegrationName: 'storage-integration',
  iceberg: {
    catalog: {
      _type: 'OpenCatalog',
      name: 'TEST_CATALOG',
      url: 'https://catalog.test',
      proxyUrl: 'https://catalog-proxy.test',
    },
  },
};

/**
 * Builds a state wired to a stub ingest server client, and collects the errors it
 * surfaces so tests can assert the user is actually told what went wrong.
 */
const buildHarness = (
  ingestServerClient: Partial<LakehouseIngestServerClient> = {},
) => {
  const alertedErrors: Error[] = [];
  const application = {
    notificationService: {
      notifyWarning: () => {
        // no-op
      },
      notifyError: () => {
        // no-op
      },
    },
  } as unknown as LegendDataCubeApplicationStore;
  const alertService = {
    alertError: (error: Error) => {
      alertedErrors.push(error);
    },
    alertUnhandledError: (error: Error) => {
      alertedErrors.push(error);
    },
  } as unknown as DataCubeAlertService;

  const state = new LakehouseProducerDataCubeSourceBuilderState(
    application,
    undefined as unknown as LegendDataCubeDataCubeEngine,
    undefined as unknown as LakehousePlatformServerClient,
    ingestServerClient as LakehouseIngestServerClient,
    undefined as unknown as LakehouseContractServerClient,
    alertService,
  );
  return { state, alertedErrors };
};

const buildState = () => buildHarness().state;

/**
 * Puts the state in the shape `fetchIngestUrns` expects: a selected lakehouse
 * environment (for the ingest server URL) and a selected producer environment.
 */
const selectProducer = (state: LakehouseProducerDataCubeSourceBuilderState) => {
  // NOTE: selecting the producer resets downstream state, so it must come first
  state.setSelectedProducerEnv(TEST_PRODUCER_URN);
  state.setSelectedLakehouseEnv({
    ingestServerUrl: TEST_INGEST_SERVER_URL,
  } as IngestDeploymentServerConfig);
};

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

test(
  unitTest('fetchIngestUrns resolves the Iceberg catalog when it is available'),
  async () => {
    const { state, alertedErrors } = buildHarness({
      getProducerEnvironmentDetails: async () =>
        TEST_PRODUCER_ENVIRONMENT(true),
      getIngestEnvironment: async () => TEST_INGEST_ENVIRONMENT,
      getIngestDefinitions: async () => ['urn:ingest:1', 'urn:ingest:2'],
    } as unknown as Partial<LakehouseIngestServerClient>);
    selectProducer(state);

    await state.fetchIngestUrns(undefined);

    expect(state.enableIceberg).toBe(true);
    expect(state.catalogUrl).toBe('https://catalog-proxy.test');
    expect(state.warehouse).toBe('TEST_CATALOG');
    expect(state.databaseName).toBe('TEST_DB');
    expect(state.ingestUrns).toEqual(['urn:ingest:1', 'urn:ingest:2']);
    expect(alertedErrors).toHaveLength(0);
  },
);

test(
  unitTest(
    'fetchIngestUrns still loads ingest definitions when the Iceberg catalog fails',
  ),
  async () => {
    const { state, alertedErrors } = buildHarness({
      getProducerEnvironmentDetails: async () =>
        TEST_PRODUCER_ENVIRONMENT(true),
      getIngestEnvironment: async () => {
        throw new Error('catalog unavailable');
      },
      getIngestDefinitions: async () => ['urn:ingest:1', 'urn:ingest:2'],
    } as unknown as Partial<LakehouseIngestServerClient>);
    selectProducer(state);

    await state.fetchIngestUrns(undefined);

    // the Iceberg failure must not take the rest of the form down with it,
    // else there is nothing left to select and turning Iceberg off can't recover
    expect(state.ingestUrns).toEqual(['urn:ingest:1', 'urn:ingest:2']);
    expect(state.databaseName).toBe('TEST_DB');
    // the selection stays as-is - it is the user's to change
    expect(state.enableIceberg).toBe(true);
    expect(state.catalogUrl).toBeUndefined();
    expect(alertedErrors).toHaveLength(1);
  },
);

test(
  unitTest('fetchIngestUrns skips the catalog when Iceberg is not enabled'),
  async () => {
    let getIngestEnvironmentCalls = 0;
    const { state } = buildHarness({
      getProducerEnvironmentDetails: async () =>
        TEST_PRODUCER_ENVIRONMENT(false),
      getIngestEnvironment: async () => {
        getIngestEnvironmentCalls += 1;
        return TEST_INGEST_ENVIRONMENT;
      },
      getIngestDefinitions: async () => ['urn:ingest:1'],
    } as unknown as Partial<LakehouseIngestServerClient>);
    selectProducer(state);

    await state.fetchIngestUrns(undefined);

    expect(getIngestEnvironmentCalls).toBe(0);
    expect(state.enableIceberg).toBe(false);
    expect(state.ingestUrns).toEqual(['urn:ingest:1']);
  },
);

test(
  unitTest('toggleIceberg(true) resolves a catalog that was never loaded'),
  async () => {
    const { state } = buildHarness({
      getIngestEnvironment: async () => TEST_INGEST_ENVIRONMENT,
    } as unknown as Partial<LakehouseIngestServerClient>);

    await state.toggleIceberg(true, undefined);

    expect(state.enableIceberg).toBe(true);
    expect(state.catalogUrl).toBe('https://catalog-proxy.test');
    expect(state.warehouse).toBe('TEST_CATALOG');
  },
);

test(
  unitTest('toggleIceberg(true) keeps Iceberg selected when the catalog fails'),
  async () => {
    const { state, alertedErrors } = buildHarness({
      getIngestEnvironment: async () => {
        throw new Error('catalog still unavailable');
      },
    } as unknown as Partial<LakehouseIngestServerClient>);

    await state.toggleIceberg(true, undefined);

    // the user asked for Iceberg, so the checkbox must reflect that even though
    // the catalog didn't resolve; they can toggle it off and on again to retry
    expect(state.enableIceberg).toBe(true);
    expect(state.catalogUrl).toBeUndefined();
    expect(alertedErrors).toHaveLength(1);
  },
);

test(
  unitTest('a source cannot be built while Iceberg has no resolved catalog'),
  async () => {
    const { state } = buildHarness({
      getIngestEnvironment: async () => {
        throw new Error('catalog unavailable');
      },
    } as unknown as Partial<LakehouseIngestServerClient>);
    selectProducer(state);
    state.deploymentId = 12345;
    state.setSelectedIngestUrn('urn:ingest:1');
    state.setSelectedTable('TEST_TABLE');
    state.setWarehouse('SOME_WH');

    expect(state.isValid).toBe(true);

    await state.toggleIceberg(true, undefined);

    // `generateSourceData` requires a catalog URL for an Iceberg source, so the
    // action stays disabled rather than blowing up once the user commits
    expect(state.enableIceberg).toBe(true);
    expect(state.isValid).toBe(false);
  },
);

test(
  unitTest('a source can be built again once Iceberg is turned back off'),
  async () => {
    const { state } = buildHarness({
      getIngestEnvironment: async () => {
        throw new Error('catalog unavailable');
      },
    } as unknown as Partial<LakehouseIngestServerClient>);
    selectProducer(state);
    state.deploymentId = 12345;
    state.setSelectedIngestUrn('urn:ingest:1');
    state.setSelectedTable('TEST_TABLE');
    state.setWarehouse('SOME_WH');

    await state.toggleIceberg(true, undefined);
    expect(state.isValid).toBe(false);

    await state.toggleIceberg(false, undefined);
    expect(state.isValid).toBe(true);
  },
);

test(
  unitTest('toggleIceberg(true) does not re-resolve an already loaded catalog'),
  async () => {
    let getIngestEnvironmentCalls = 0;
    const { state } = buildHarness({
      getIngestEnvironment: async () => {
        getIngestEnvironmentCalls += 1;
        return TEST_INGEST_ENVIRONMENT;
      },
    } as unknown as Partial<LakehouseIngestServerClient>);

    await state.toggleIceberg(true, undefined);
    await state.toggleIceberg(false, undefined);
    await state.toggleIceberg(true, undefined);

    expect(getIngestEnvironmentCalls).toBe(1);
    expect(state.enableIceberg).toBe(true);
    expect(state.catalogUrl).toBe('https://catalog-proxy.test');
  },
);

test(
  unitTest(
    'toggleIceberg(false) disables Iceberg without touching the catalog',
  ),
  async () => {
    let getIngestEnvironmentCalls = 0;
    const { state } = buildHarness({
      getIngestEnvironment: async () => {
        getIngestEnvironmentCalls += 1;
        return TEST_INGEST_ENVIRONMENT;
      },
    } as unknown as Partial<LakehouseIngestServerClient>);

    await state.toggleIceberg(false, undefined);

    expect(state.enableIceberg).toBe(false);
    expect(getIngestEnvironmentCalls).toBe(0);
  },
);
