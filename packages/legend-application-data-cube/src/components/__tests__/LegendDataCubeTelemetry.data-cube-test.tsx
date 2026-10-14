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

import { createSpy, integrationTest } from '@finos/legend-shared/test';
import { expect, jest, test } from '@jest/globals';
import { guaranteeType, type PlainObject } from '@finos/legend-shared';
import { V1_AppDirLevel, V1_DataProductOriginType } from '@finos/legend-graph';
import { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';
import {
  TEST__provideMockedLegendDataCubeBaseStore,
  TEST__provideMockedLegendDataCubeBuilderStore,
  TEST__provideMockedLegendDataCubeEngine,
  mockAdHocDataProductPMCD,
  mockLakehouseConsumerAdHocDataProduct,
  mockLakehouseProducerAdHocDataProduct,
  DEFAULT_MOCK_ADHOC_DATA_PRODUCT,
  columns,
  DEFAULT_MOCK_PMCD,
} from '../__test-utils__/LegendDataCubeStoreTestUtils.js';
import {
  LakehouseConsumerDataCubeSource,
  LAKEHOUSE_CONSUMER_DATA_CUBE_SOURCE_TYPE,
} from '../../stores/model/LakehouseConsumerDataCubeSource.js';
import {
  LakehouseProducerDataCubeSource,
  LAKEHOUSE_PRODUCER_DATA_CUBE_SOURCE_TYPE,
} from '../../stores/model/LakehouseProducerDataCubeSource.js';
import {
  DATA_CUBE_OPEN_KIND,
  LEGEND_DATACUBE_APP_EVENT,
} from '../../__lib__/LegendDataCubeEvent.js';

jest.mock('../../stores/LegendDataCubeDuckDBEngine', () => {
  return {
    LegendDataCubeDuckDBEngine: jest.fn(() => ({
      initialize: jest.fn(),
      dispose: jest.fn(),
    })),
  };
});

type RawSourceTelemetryDataBuilder = {
  _getRawSourceTelemetryData: (source?: PlainObject) => PlainObject;
};

const telemetryPayloadsFor = (
  telemetrySpy: { mock: { calls: unknown[][] } },
  event: string,
): PlainObject[] =>
  telemetrySpy.mock.calls
    .filter((call) => call[0] === event)
    .map((call) => call[1] as PlainObject);

test(
  integrationTest(
    'DataCube telemetry data tags processed lakehouse sources with producer/consumer role',
  ),
  async () => {
    await TEST__provideMockedLegendDataCubeBaseStore();
    const engine = await TEST__provideMockedLegendDataCubeEngine({
      mockPMCD: DEFAULT_MOCK_PMCD,
      mockEntitlementsAdHocDataProduct: DEFAULT_MOCK_ADHOC_DATA_PRODUCT,
    });
    createSpy(engine, 'parseCompatibleModel').mockResolvedValue(
      mockAdHocDataProductPMCD,
    );
    createSpy(engine, '_getLambdaRelationType').mockResolvedValue({ columns });

    const consumerSource = guaranteeType(
      await engine.processSource(mockLakehouseConsumerAdHocDataProduct),
      LakehouseConsumerDataCubeSource,
    );
    const consumerData = engine.getDataFromSource(consumerSource);
    expect(consumerData.sourceType).toBe(
      LAKEHOUSE_CONSUMER_DATA_CUBE_SOURCE_TYPE,
    );
    const consumerDataProduct = consumerData.dataProduct as PlainObject;
    expect(consumerDataProduct.path).toBe('dataProduct::test_DataProduct');
    expect(consumerDataProduct.accessPoint).toBe('test_dataset');
    expect(consumerDataProduct.id).toBe('test-id');
    expect(consumerDataProduct.owner).toEqual({
      appDirId: 22222,
      level: V1_AppDirLevel.DEPLOYMENT,
    });
    expect(consumerDataProduct.environment).toEqual({
      name: 'DEVELOPMENT',
      type: 'DEVELOPMENT',
    });

    const producerSource = guaranteeType(
      await engine.processSource(mockLakehouseProducerAdHocDataProduct),
      LakehouseProducerDataCubeSource,
    );
    const producerData = engine.getDataFromSource(producerSource);
    expect(producerData.sourceType).toBe(
      LAKEHOUSE_PRODUCER_DATA_CUBE_SOURCE_TYPE,
    );
  },
);

test(
  integrationTest(
    'DataCube telemetry data tags raw lakehouse sources with producer/consumer role',
  ),
  async () => {
    await TEST__provideMockedLegendDataCubeBaseStore();
    const engine = await TEST__provideMockedLegendDataCubeEngine({
      mockPMCD: DEFAULT_MOCK_PMCD,
      mockEntitlementsAdHocDataProduct: DEFAULT_MOCK_ADHOC_DATA_PRODUCT,
    });

    const consumerData = (
      engine as unknown as RawSourceTelemetryDataBuilder
    )._getRawSourceTelemetryData(mockLakehouseConsumerAdHocDataProduct);
    expect(consumerData.sourceType).toBe(
      LAKEHOUSE_CONSUMER_DATA_CUBE_SOURCE_TYPE,
    );

    const producerData = (
      engine as unknown as RawSourceTelemetryDataBuilder
    )._getRawSourceTelemetryData(mockLakehouseProducerAdHocDataProduct);
    expect(producerData.sourceType).toBe(
      LAKEHOUSE_PRODUCER_DATA_CUBE_SOURCE_TYPE,
    );
  },
);

test(
  integrationTest(
    'DataCube telemetry data omits the source type for an unresolved source',
  ),
  async () => {
    await TEST__provideMockedLegendDataCubeBaseStore();
    const engine = await TEST__provideMockedLegendDataCubeEngine({
      mockPMCD: DEFAULT_MOCK_PMCD,
      mockEntitlementsAdHocDataProduct: DEFAULT_MOCK_ADHOC_DATA_PRODUCT,
    });

    const fromMissingSource = engine.getDataFromSource(undefined);
    expect(fromMissingSource.sourceType).toBeUndefined();

    const fromMissingRawSource = (
      engine as unknown as RawSourceTelemetryDataBuilder
    )._getRawSourceTelemetryData(undefined);
    expect(fromMissingRawSource.sourceType).toBeUndefined();
  },
);

test(
  integrationTest(
    'DataCube telemetry data enriches raw lakehouse consumer sources with data-product owner and environment details',
  ),
  async () => {
    await TEST__provideMockedLegendDataCubeBaseStore();
    const engine = await TEST__provideMockedLegendDataCubeEngine({
      mockPMCD: DEFAULT_MOCK_PMCD,
      mockEntitlementsAdHocDataProduct: DEFAULT_MOCK_ADHOC_DATA_PRODUCT,
    });

    const enrichedData = await engine.getEnrichedDataFromRawSource(
      mockLakehouseConsumerAdHocDataProduct,
    );
    const enrichedDataProduct = enrichedData.dataProduct as PlainObject;
    expect(enrichedDataProduct.path).toBe('dataProduct::test_DataProduct');
    expect(enrichedDataProduct.id).toBe('test-id');
    expect(enrichedDataProduct.owner).toEqual({
      appDirId: 22222,
      level: V1_AppDirLevel.DEPLOYMENT,
    });
    expect(enrichedDataProduct.environment).toEqual({
      name: 'DEVELOPMENT',
      type: 'DEVELOPMENT',
    });
  },
);

test(
  integrationTest(
    'DataCube telemetry data enriches raw lakehouse consumer sources stored with an entitlements environment type',
  ),
  async () => {
    await TEST__provideMockedLegendDataCubeBaseStore();
    const engine = await TEST__provideMockedLegendDataCubeEngine({
      mockPMCD: DEFAULT_MOCK_PMCD,
      mockEntitlementsAdHocDataProduct: DEFAULT_MOCK_ADHOC_DATA_PRODUCT,
    });

    const enrichedData = await engine.getEnrichedDataFromRawSource({
      ...mockLakehouseConsumerAdHocDataProduct,
      environment: 'DEVELOPMENT',
    });
    const enrichedDataProduct = enrichedData.dataProduct as PlainObject;
    expect(enrichedDataProduct.id).toBe('test-id');
    expect(enrichedDataProduct.environment).toEqual({
      name: 'DEVELOPMENT',
      type: 'DEVELOPMENT',
    });
  },
);

test(
  integrationTest(
    'DataCube telemetry data is not enriched with a data product from a different environment',
  ),
  async () => {
    await TEST__provideMockedLegendDataCubeBaseStore();
    const engine = await TEST__provideMockedLegendDataCubeEngine({
      mockPMCD: DEFAULT_MOCK_PMCD,
      mockEntitlementsAdHocDataProduct: DEFAULT_MOCK_ADHOC_DATA_PRODUCT,
    });

    const enrichedData = await engine.getEnrichedDataFromRawSource({
      ...mockLakehouseConsumerAdHocDataProduct,
      environment: 'PRODUCTION',
    });
    const enrichedDataProduct = enrichedData.dataProduct as PlainObject;
    expect(enrichedDataProduct.path).toBe('dataProduct::test_DataProduct');
    expect(enrichedDataProduct.id).toBeUndefined();
    expect(enrichedDataProduct.owner).toBeUndefined();
  },
);

test(
  integrationTest(
    'DataCube telemetry data enrichment of raw sources never throws',
  ),
  async () => {
    await TEST__provideMockedLegendDataCubeBaseStore();
    const engine = await TEST__provideMockedLegendDataCubeEngine({
      mockPMCD: DEFAULT_MOCK_PMCD,
      mockEntitlementsAdHocDataProduct: DEFAULT_MOCK_ADHOC_DATA_PRODUCT,
    });
    createSpy(
      engine as unknown as RawSourceTelemetryDataBuilder,
      '_getRawSourceTelemetryData',
    ).mockImplementation(() => {
      throw new Error('cannot deserialize source');
    });

    await expect(
      engine.getEnrichedDataFromRawSource(
        mockLakehouseConsumerAdHocDataProduct,
      ),
    ).resolves.toEqual({});
  },
);

test(
  integrationTest(
    'DataCube processes SDLC lakehouse consumer sources without waiting for the telemetry data product lookup',
  ),
  async () => {
    await TEST__provideMockedLegendDataCubeBaseStore();
    const lakehouseContractServerClient = new LakehouseContractServerClient({
      baseUrl: 'https://test-lakehouse-contract-server.com',
    });
    let resolveDataProduct: ((value: PlainObject) => void) | undefined;
    createSpy(lakehouseContractServerClient, 'getDataProduct').mockReturnValue(
      new Promise<PlainObject>((resolve) => {
        resolveDataProduct = resolve;
      }),
    );
    const engine = await TEST__provideMockedLegendDataCubeEngine({
      mockPMCD: DEFAULT_MOCK_PMCD,
      lakehouseContractServerClient,
    });
    createSpy(engine, '_getLambdaRelationType').mockResolvedValue({ columns });

    const source = guaranteeType(
      await engine.processSource({
        ...mockLakehouseConsumerAdHocDataProduct,
        origin: {
          _type: V1_DataProductOriginType.SDLC_DEPLOYMENT,
          dpCoordinates: {
            groupId: 'test.group',
            artifactId: 'test-artifact',
            versionId: '1.0.0',
          },
        },
      }),
      LakehouseConsumerDataCubeSource,
    );
    expect(
      (engine.getDataFromSource(source).dataProduct as PlainObject).owner,
    ).toBeUndefined();

    resolveDataProduct?.(DEFAULT_MOCK_ADHOC_DATA_PRODUCT);
    const enrichedData = await engine.getEnrichedDataFromSource(source);
    const enrichedDataProduct = enrichedData.dataProduct as PlainObject;
    expect(enrichedDataProduct.origin).toBe(
      V1_DataProductOriginType.SDLC_DEPLOYMENT,
    );
    expect(enrichedDataProduct.owner).toEqual({
      appDirId: 22222,
      level: V1_AppDirLevel.DEPLOYMENT,
    });
  },
);

test(
  integrationTest(
    'DataCube deferred telemetry is sent once its data resolves and ignores failures',
  ),
  async () => {
    await TEST__provideMockedLegendDataCubeBaseStore();
    const engine = await TEST__provideMockedLegendDataCubeEngine({
      mockPMCD: DEFAULT_MOCK_PMCD,
      mockEntitlementsAdHocDataProduct: DEFAULT_MOCK_ADHOC_DATA_PRODUCT,
    });
    const telemetrySpy = createSpy(engine, 'sendTelemetry').mockImplementation(
      () => {
        // no-op
      },
    );
    const flushPromises = () =>
      new Promise((resolve) => {
        setTimeout(resolve, 0);
      });

    engine.sendDeferredTelemetry('test-event', Promise.resolve({ key: 1 }));
    expect(telemetrySpy).not.toHaveBeenCalled();
    await flushPromises();
    expect(telemetrySpy).toHaveBeenCalledTimes(1);
    expect(telemetrySpy).toHaveBeenCalledWith('test-event', { key: 1 });

    engine.sendDeferredTelemetry(
      'test-event',
      Promise.reject(new Error('cannot enrich data')),
    );
    await flushPromises();
    expect(telemetrySpy).toHaveBeenCalledTimes(1);
  },
);

const buildLakehouseConsumerSource =
  async (): Promise<LakehouseConsumerDataCubeSource> => {
    const engine = await TEST__provideMockedLegendDataCubeEngine({
      mockPMCD: DEFAULT_MOCK_PMCD,
      mockEntitlementsAdHocDataProduct: DEFAULT_MOCK_ADHOC_DATA_PRODUCT,
    });
    createSpy(engine, 'parseCompatibleModel').mockResolvedValue(
      mockAdHocDataProductPMCD,
    );
    createSpy(engine, '_getLambdaRelationType').mockResolvedValue({ columns });
    return guaranteeType(
      await engine.processSource(mockLakehouseConsumerAdHocDataProduct),
      LakehouseConsumerDataCubeSource,
    );
  };

test(
  integrationTest(
    'DataCube time-to-first-data telemetry emits a single success event tagged with source type and open kind',
  ),
  async () => {
    const source = await buildLakehouseConsumerSource();
    const store = await TEST__provideMockedLegendDataCubeBuilderStore();
    const telemetrySpy = createSpy(
      store.engine,
      'sendTelemetry',
    ).mockImplementation(() => {
      // no-op
    });

    store.markDataCubeLoadStart(DATA_CUBE_OPEN_KIND.SAVED_LOAD);
    store.markDataCubeDataLoaded(source);

    const launchPayloads = telemetryPayloadsFor(
      telemetrySpy,
      LEGEND_DATACUBE_APP_EVENT.LOAD_DATACUBE_TO_DATA__LAUNCH,
    );
    expect(launchPayloads).toHaveLength(1);
    expect(launchPayloads[0]?.openKind).toBe(DATA_CUBE_OPEN_KIND.SAVED_LOAD);
    expect(launchPayloads[0]?.sourceType).toBeUndefined();

    const successPayloads = telemetryPayloadsFor(
      telemetrySpy,
      LEGEND_DATACUBE_APP_EVENT.LOAD_DATACUBE_TO_DATA__SUCCESS,
    );
    expect(successPayloads).toHaveLength(1);
    const payload = successPayloads[0] as PlainObject;
    expect(payload.openKind).toBe(DATA_CUBE_OPEN_KIND.SAVED_LOAD);
    expect(payload.sourceType).toBe(LAKEHOUSE_CONSUMER_DATA_CUBE_SOURCE_TYPE);
    const timings = payload.timings as PlainObject;
    expect(typeof timings.total).toBe('number');
    expect(timings.total as number).toBeGreaterThanOrEqual(0);

    // only the first outcome of a load is reported
    store.markDataCubeDataLoaded(source);
    store.markDataCubeDataLoaded(source, new Error('late failure'));
    expect(
      telemetryPayloadsFor(
        telemetrySpy,
        LEGEND_DATACUBE_APP_EVENT.LOAD_DATACUBE_TO_DATA__SUCCESS,
      ),
    ).toHaveLength(1);
    expect(
      telemetryPayloadsFor(
        telemetrySpy,
        LEGEND_DATACUBE_APP_EVENT.LOAD_DATACUBE_TO_DATA__FAILURE,
      ),
    ).toHaveLength(0);
  },
);

test(
  integrationTest(
    'DataCube time-to-first-data telemetry emits a failure event when the first data fetch fails',
  ),
  async () => {
    const source = await buildLakehouseConsumerSource();
    const store = await TEST__provideMockedLegendDataCubeBuilderStore();
    const telemetrySpy = createSpy(
      store.engine,
      'sendTelemetry',
    ).mockImplementation(() => {
      // no-op
    });

    store.markDataCubeLoadStart(DATA_CUBE_OPEN_KIND.NEW);
    store.markDataCubeDataLoaded(source, new Error('boom'));

    const failurePayloads = telemetryPayloadsFor(
      telemetrySpy,
      LEGEND_DATACUBE_APP_EVENT.LOAD_DATACUBE_TO_DATA__FAILURE,
    );
    expect(failurePayloads).toHaveLength(1);
    const payload = failurePayloads[0] as PlainObject;
    expect(payload.openKind).toBe(DATA_CUBE_OPEN_KIND.NEW);
    expect(payload.sourceType).toBe(LAKEHOUSE_CONSUMER_DATA_CUBE_SOURCE_TYPE);
    expect(payload.error).toBe('boom');
    expect(typeof (payload.timings as PlainObject).total).toBe('number');
    expect(
      telemetryPayloadsFor(
        telemetrySpy,
        LEGEND_DATACUBE_APP_EVENT.LOAD_DATACUBE_TO_DATA__SUCCESS,
      ),
    ).toHaveLength(0);
  },
);

test(
  integrationTest(
    'DataCube time-to-first-data telemetry emits a launch event up front, even when data never loads',
  ),
  async () => {
    const store = await TEST__provideMockedLegendDataCubeBuilderStore();
    const telemetrySpy = createSpy(
      store.engine,
      'sendTelemetry',
    ).mockImplementation(() => {
      // no-op
    });

    store.markDataCubeLoadStart(DATA_CUBE_OPEN_KIND.NEW);

    const launchPayloads = telemetryPayloadsFor(
      telemetrySpy,
      LEGEND_DATACUBE_APP_EVENT.LOAD_DATACUBE_TO_DATA__LAUNCH,
    );
    expect(launchPayloads).toHaveLength(1);
    expect(launchPayloads[0]?.openKind).toBe(DATA_CUBE_OPEN_KIND.NEW);
    expect(launchPayloads[0]?.timings).toBeUndefined();
    expect(
      telemetryPayloadsFor(
        telemetrySpy,
        LEGEND_DATACUBE_APP_EVENT.LOAD_DATACUBE_TO_DATA__SUCCESS,
      ),
    ).toHaveLength(0);
  },
);

test(
  integrationTest(
    'DataCube time-to-first-data telemetry does not emit when no load was started',
  ),
  async () => {
    const source = await buildLakehouseConsumerSource();
    const store = await TEST__provideMockedLegendDataCubeBuilderStore();
    const telemetrySpy = createSpy(
      store.engine,
      'sendTelemetry',
    ).mockImplementation(() => {
      // no-op
    });

    store.markDataCubeDataLoaded(source);
    expect(telemetrySpy).not.toHaveBeenCalled();
  },
);
