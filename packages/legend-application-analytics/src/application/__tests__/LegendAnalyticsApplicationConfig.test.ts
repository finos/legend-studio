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
import { TEST__getApplicationVersionData } from '@finos/legend-application/test';
import { LegendAnalyticsApplicationConfig } from '../LegendAnalyticsApplicationConfig.js';
import { TEST__getTestLegendAnalyticsApplicationConfig } from '../__test-utils__/LegendAnalyticsApplicationTestUtils.js';

describe("Legend Analytics' config", () => {
  test('Needs only an engine, and has no depot, lakehouse or marketplace without them', () => {
    const config = TEST__getTestLegendAnalyticsApplicationConfig();
    expect(config.engineServerUrl).toBe('https://testEngineUrl');
    expect(config.engineQueryServerUrl).toBeUndefined();
    expect(config.engineUseCookieAuthOnly).toBe(false);
    expect(config.depotServerUrl).toBeUndefined();
    expect(config.lakehouseContractUrl).toBeUndefined();
    expect(config.lakehousePlatformUrl).toBeUndefined();
    expect(config.marketplaceApplicationUrl).toBeUndefined();
    expect(config.marketplaceProductionParallelUrl).toBeUndefined();
    expect(config.marketplaceServerUrl).toBeUndefined();
    expect(config.options.oidcConfig).toBeUndefined();
    expect(config.options.enableOauthFlow).toBe(false);
    expect(config.getDefaultApplicationStorageKey()).toBe('legend-analytics');
  });

  test('Refuses a config without an engine URL', () => {
    const configure = (configData: object): LegendAnalyticsApplicationConfig =>
      new LegendAnalyticsApplicationConfig({
        configData: { appName: 'analytics', env: 'test-env', ...configData },
        versionData: TEST__getApplicationVersionData(),
        baseAddress: '/analytics/',
      } as never);
    expect(() => configure({})).toThrow("'engine' field is missing");
    expect(() => configure({ engine: { url: '' } })).toThrow(
      "'engine.url' field is missing or empty",
    );
  });

  test("Reads the engine's options and the servers the deployment names", () => {
    const config = TEST__getTestLegendAnalyticsApplicationConfig({
      engine: {
        url: 'https://engine.test/api',
        queryUrl: 'https://engine-query.test/api',
        useCookieAuthOnly: true,
        queryClientName: 'analytics',
      },
      depot: { url: 'https://depot.test/depot/api' },
      lakehouse: {
        url: 'https://lakehouse.test/api',
        platformUrl: 'https://platform.test',
      },
      marketplace: {
        url: 'https://marketplace.test',
        productionParallelUrl: 'https://marketplace-parallel.test',
        serverUrl: 'https://marketplace-server.test',
      },
    });
    expect(config.engineQueryServerUrl).toBe('https://engine-query.test/api');
    expect(config.engineUseCookieAuthOnly).toBe(true);
    expect(config.engineQueryClientName).toBe('analytics');
    expect(config.depotServerUrl).toBe('https://depot.test/depot/api');
    expect(config.lakehouseContractUrl).toBe('https://lakehouse.test/api');
    expect(config.lakehousePlatformUrl).toBe('https://platform.test');
    expect(config.marketplaceApplicationUrl).toBe('https://marketplace.test');
    expect(config.marketplaceProductionParallelUrl).toBe(
      'https://marketplace-parallel.test',
    );
    expect(config.marketplaceServerUrl).toBe('https://marketplace-server.test');
  });

  test('Reads OIDC and the data product stereotype from the core extension, as Legend Query does', () => {
    const config = TEST__getTestLegendAnalyticsApplicationConfig({
      extensions: {
        core: {
          oidcConfig: {
            redirectPath: '/callback',
            silentRedirectPath: '/callback?silent=true',
            authProviderProps: {
              authority: 'http://localhost:8080/auth',
              client_id: 'test-client-id',
            },
          },
          enableOauthFlow: true,
          dataProductConfig: {
            publicStereotype: {
              profile: 'meta::pure::profiles::access',
              stereotype: 'enterprise',
            },
          },
        },
      },
    });
    expect(config.options.oidcConfig?.redirectPath).toBe('/callback');
    expect(config.options.oidcConfig?.authProviderProps).toEqual({
      authority: 'http://localhost:8080/auth',
      client_id: 'test-client-id',
    });
    expect(config.options.enableOauthFlow).toBe(true);
    expect(config.options.dataProductConfig?.publicStereotype?.stereotype).toBe(
      'enterprise',
    );
  });
});
