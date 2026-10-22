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

import { describe, expect, test } from '@jest/globals';
import { ApplicationStore } from '@finos/legend-application';
import { BUNDLED_MODELS } from '@finos/legend-cube-builder';
import { LegendAnalyticsPluginManager } from '../../application/LegendAnalyticsPluginManager.js';
import { TEST__getTestLegendAnalyticsApplicationConfig } from '../../application/__test-utils__/LegendAnalyticsApplicationTestUtils.js';
import {
  buildLegendAnalyticsCubeHostConfig,
  createLegendAnalyticsCubeHost,
} from '../LegendAnalyticsCubeHost.js';
import { LegendAnalyticsDataSpaceEditor } from '../data-space/LegendAnalyticsDataSpaceEditor.js';

const createApplicationStore = (
  extraConfigData = {},
): Parameters<typeof createLegendAnalyticsCubeHost>[0] =>
  new ApplicationStore(
    TEST__getTestLegendAnalyticsApplicationConfig(extraConfigData),
    LegendAnalyticsPluginManager.create(),
  );

describe('Legend Analytics as the Cube host', () => {
  test('Configures the engine as Legend Query does, compressed, and passes on the servers the deployment names', () => {
    const config = TEST__getTestLegendAnalyticsApplicationConfig({
      engine: {
        url: 'https://engine.test/api',
        queryUrl: 'https://engine-query.test/api',
        useCookieAuthOnly: true,
        queryClientName: 'analytics',
      },
      depot: { url: 'https://depot.test' },
      lakehouse: {
        url: 'https://lakehouse.test',
        platformUrl: 'https://platform.test',
      },
      marketplace: {
        url: 'https://marketplace.test',
        productionParallelUrl: 'https://marketplace-parallel.test',
        serverUrl: 'https://marketplace-server.test',
      },
      extensions: {
        core: {
          dataProductConfig: {
            publicStereotype: {
              profile: 'meta::pure::profiles::access',
              stereotype: 'enterprise',
            },
            producer: {
              deploymentLegendServiceUrl: '/directory/deploymentNames',
            },
          },
        },
      },
    });
    expect(buildLegendAnalyticsCubeHostConfig(config)).toEqual({
      engine: {
        baseUrl: 'https://engine.test/api',
        queryBaseUrl: 'https://engine-query.test/api',
        queryClientName: 'analytics',
        enableCompression: true,
        useCookieAuthOnly: true,
      },
      depotServerUrl: 'https://depot.test',
      lakehouseContractUrl: 'https://lakehouse.test',
      lakehousePlatformUrl: 'https://platform.test',
      marketplaceServerUrl: 'https://marketplace-server.test',
      marketplaceApplicationUrl: 'https://marketplace.test',
      marketplaceProductionParallelUrl: 'https://marketplace-parallel.test',
      enterpriseStereotype: {
        profile: 'meta::pure::profiles::access',
        value: 'enterprise',
      },
      deploymentNameServiceUrl: '/directory/deploymentNames',
    });
  });

  test('Offers the bundled models, direct connections and services with only an engine', () => {
    const applicationStore = createApplicationStore();
    const host = createLegendAnalyticsCubeHost(applicationStore);
    expect(host.applicationStore).toBe(applicationStore);
    expect(host.modelCatalog.models).toBe(BUNDLED_MODELS);
    expect(host.connectionExplorer).toBeDefined();
    expect(host.serviceCatalog).toBeDefined();
    expect(host.projectCatalog).toBeUndefined();
    expect(host.dataProductCatalog).toBeUndefined();
    expect(host.ingestCatalog).toBeUndefined();
    expect(host.dataSpaceEditor).toBeUndefined();
    expect(host.engineClientSettings.defaultBaseUrl).toBe(
      'https://testEngineUrl',
    );
  });

  test('Offers projects with a depot, and data products and ingest data sets with a lakehouse and its platform beside it', () => {
    const host = createLegendAnalyticsCubeHost(
      createApplicationStore({
        depot: { url: 'https://depot.test' },
        lakehouse: {
          url: 'https://lakehouse.test',
          platformUrl: 'https://platform.test',
        },
      }),
    );
    expect(host.projectCatalog).toBeDefined();
    expect(host.dataProductCatalog).toBeDefined();
    expect(host.ingestCatalog).toBeDefined();
  });

  test('Offers data spaces with a depot, their editor the query builder (PLAN §11.25)', () => {
    const host = createLegendAnalyticsCubeHost(
      createApplicationStore({ depot: { url: 'https://depot.test' } }),
    );
    expect(host.dataSpaceEditor).toBeInstanceOf(LegendAnalyticsDataSpaceEditor);
  });
});
