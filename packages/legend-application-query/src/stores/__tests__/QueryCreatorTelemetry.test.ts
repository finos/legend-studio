/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import { describe, test, expect } from '@jest/globals';
import { createSpy, unitTest } from '@finos/legend-shared/test';
import { NetworkClientError } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import {
  ApplicationStore,
  type UserDataService,
} from '@finos/legend-application';
import { DepotServerClient } from '@finos/legend-server-depot';
import { LegendQueryPluginManager } from '../../application/LegendQueryPluginManager.js';
import { Core_LegendQueryApplicationPlugin } from '../../components/Core_LegendQueryApplicationPlugin.js';
import { TEST__getTestLegendQueryApplicationConfig } from '../__test-utils__/LegendQueryApplicationTestUtils.js';
import type { LegendQueryApplicationStore } from '../LegendQueryBaseStore.js';
import { MappingQueryCreatorStore } from '../QueryEditorStore.js';
import { DataProductQueryCreatorStore } from '../data-space/DataProductQueryCreatorStore.js';
import { LegendQueryUserDataHelper } from '../../__lib__/LegendQueryUserDataHelper.js';
import { createSimpleVisitedDataspace } from '../../__lib__/LegendQueryUserDataSpaceHelper.js';
import { LEGEND_QUERY_APP_EVENT } from '../../__lib__/LegendQueryEvent.js';
import {
  type LegendQueryMappingSourceInfo,
  LegendQuerySourceType,
} from '../../__lib__/LegendQuerySourceInfo.js';

class MockUserDataService {
  private store: Record<string, object | undefined> = {};

  getObjectValue(key: string): object | undefined {
    return this.store[key];
  }

  persistValue(key: string, data: object | undefined): void {
    this.store[key] = data;
  }
}

const buildApplicationStore = (): LegendQueryApplicationStore => {
  const pluginManager = LegendQueryPluginManager.create();
  pluginManager
    .usePlugins([new Core_LegendQueryApplicationPlugin()])
    .usePresets([])
    .install();
  const applicationStore = new ApplicationStore(
    TEST__getTestLegendQueryApplicationConfig(),
    pluginManager,
  );
  (
    applicationStore as unknown as { userDataService: UserDataService }
  ).userDataService = new MockUserDataService() as unknown as UserDataService;
  return applicationStore;
};

const buildDepotServerClient = (
  applicationStore: LegendQueryApplicationStore,
): DepotServerClient =>
  new DepotServerClient({
    serverUrl: applicationStore.config.depotServerUrl,
  });

const buildMappingQueryCreatorStore = (): MappingQueryCreatorStore => {
  const applicationStore = buildApplicationStore();
  return new MappingQueryCreatorStore(
    applicationStore,
    buildDepotServerClient(applicationStore),
    'org.finos',
    'my-artifact',
    '1.0.0',
    'model::MyMapping',
    'model::MyRuntime',
  );
};

const MAPPING_SOURCE_INFO: LegendQueryMappingSourceInfo = {
  sourceType: LegendQuerySourceType.MAPPING,
  groupId: 'org.finos',
  artifactId: 'my-artifact',
  versionId: '1.0.0',
  mapping: 'model::MyMapping',
  runtime: 'model::MyRuntime',
};

describe(unitTest('Query creator initialization telemetry'), () => {
  test(
    unitTest('logs failure with the source and the error when a creator fails'),
    async () => {
      const store = buildMappingQueryCreatorStore();
      createSpy(
        store.graphManagerState.graphManager,
        'initialize',
      ).mockRejectedValue(new Error('Engine is down'));
      const logEventSpy = createSpy(
        store.applicationStore.telemetryService,
        'logEvent',
      );

      await flowResult(store.initialize());

      expect(store.initState.hasFailed).toBe(true);
      expect(logEventSpy).toHaveBeenCalledWith(
        LEGEND_QUERY_APP_EVENT.INITIALIZE_QUERY_CREATOR__FAILURE,
        {
          source: MAPPING_SOURCE_INFO,
          restoredFromRecent: false,
          errorMessage: 'Engine is down',
          errorName: 'Error',
          httpStatus: undefined,
          timings: expect.objectContaining({ total: expect.any(Number) }),
        },
      );
      expect(logEventSpy).not.toHaveBeenCalledWith(
        LEGEND_QUERY_APP_EVENT.INITIALIZE_QUERY_CREATOR__SUCCESS,
        expect.anything(),
      );
    },
  );

  test(
    unitTest('logs the response status when a creator fails on a request'),
    async () => {
      const store = buildMappingQueryCreatorStore();
      createSpy(
        store.graphManagerState.graphManager,
        'initialize',
      ).mockRejectedValue(
        new NetworkClientError(
          {
            status: 403,
            statusText: 'Forbidden',
            url: 'http://localhost/depot',
          } as Response,
          undefined,
        ),
      );
      const logEventSpy = createSpy(
        store.applicationStore.telemetryService,
        'logEvent',
      );

      await flowResult(store.initialize());

      expect(logEventSpy).toHaveBeenCalledWith(
        LEGEND_QUERY_APP_EVENT.INITIALIZE_QUERY_CREATOR__FAILURE,
        expect.objectContaining({
          source: MAPPING_SOURCE_INFO,
          errorName: 'Network Client Error',
          httpStatus: 403,
        }),
      );
    },
  );

  test(
    unitTest(
      'logs the reopened data space when it fails, before falling back to the bare selector',
    ),
    async () => {
      const applicationStore = buildApplicationStore();
      LegendQueryUserDataHelper.addVisitedDatspace(
        applicationStore.userDataService,
        createSimpleVisitedDataspace(
          'org.finos',
          'my-artifact',
          '1.0.0',
          'model::MyDS',
          'default',
        ),
      );
      const store = new DataProductQueryCreatorStore(
        applicationStore,
        buildDepotServerClient(applicationStore),
        undefined,
      );
      // skip loading the data product / data space options
      store.productSelectorState.setLegacyDataProducts([]);
      store.productSelectorState.setDataProducts([]);
      createSpy(
        store.graphManagerState.graphManager,
        'initialize',
      ).mockRejectedValue(new Error('Data space no longer exists'));
      const logEventSpy = createSpy(
        store.applicationStore.telemetryService,
        'logEvent',
      );

      await flowResult(store.initialize());

      expect(logEventSpy).toHaveBeenCalledWith(
        LEGEND_QUERY_APP_EVENT.INITIALIZE_QUERY_CREATOR__FAILURE,
        expect.objectContaining({
          source: {
            sourceType: LegendQuerySourceType.DATA_SPACE,
            groupId: 'org.finos',
            artifactId: 'my-artifact',
            versionId: '1.0.0',
            dataSpace: 'model::MyDS',
            executionContext: 'default',
          },
          restoredFromRecent: true,
          errorMessage: 'Data space no longer exists',
        }),
      );
      // the failure handling resets the store to the bare selector afterwards
      expect(store.queryableElement).toBeUndefined();
    },
  );
});
