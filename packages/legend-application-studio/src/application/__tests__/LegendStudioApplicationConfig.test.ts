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
import { applyBackendOverrides } from '@finos/legend-application';
import {
  TEST__getApplicationVersionData,
  TEST__getUndeclaredBackendUrlFields,
} from '@finos/legend-application/test';
import { SDLCServerClient } from '@finos/legend-server-sdlc';
import {
  LegendStudioApplicationConfig,
  type LegendStudioApplicationConfigurationData,
} from '../LegendStudioApplicationConfig.js';

const TEST_DATA__configData: LegendStudioApplicationConfigurationData = {
  appName: 'studio',
  env: 'local',
  application: { backendOverrides: { enabled: true } },
  sdlc: { url: 'http://localhost:6100/api' },
  engine: {
    url: 'http://localhost:6300/api',
    queryUrl: 'http://localhost:6300/query/api',
  },
  depot: { url: 'http://localhost:6200/depot/api' },
  query: { url: 'http://localhost:9001/query' },
  marketplace: { url: 'http://localhost:9005/marketplace' },
  showcase: { url: 'http://localhost:9003/api' },
  pct: { reportUrl: 'http://localhost:9999/pct' },
  lakehouse: { url: 'http://localhost:9020/lakehouse/api' },
  legendAI: { url: 'http://localhost:9010/api' },
  documentation: { url: 'https://legend.finos.org' },
};

describe('Legend Studio backend servers', () => {
  test('Declares every backend server URL of its config', () => {
    const config = new LegendStudioApplicationConfig({
      configData: TEST_DATA__configData,
      versionData: TEST__getApplicationVersionData(),
    });
    expect(
      TEST__getUndeclaredBackendUrlFields(config, [
        // links to other applications and pages, not servers Studio calls
        'queryApplicationUrl',
        'marketplaceApplicationUrl',
        'pctReportUrl',
        'documentationUrl',
      ]),
    ).toEqual([]);
  });

  test('Uses an overridden SDLC server, including for SDLC authorization', () => {
    const { configData, applied } = applyBackendOverrides(
      TEST_DATA__configData,
      { 'sdlc.url': 'https://sdlc.test/api' },
    );
    const config = new LegendStudioApplicationConfig({
      configData,
      versionData: TEST__getApplicationVersionData(),
      backendOverrides: applied,
    });
    expect(config.sdlcServerUrl).toBe('https://sdlc.test/api');
    expect(config.engineServerUrl).toBe('http://localhost:6300/api');
    expect(config.backendOverrides).toEqual([
      {
        configPath: 'sdlc.url',
        configuredUrl: 'http://localhost:6100/api',
        url: 'https://sdlc.test/api',
      },
    ]);
    // the boot-time and popup re-authentication flows build this URL from the config
    expect(
      SDLCServerClient.authorizeCallbackUrl(
        config.sdlcServerUrl,
        'http://localhost:9000/studio/',
      ),
    ).toMatch(/^https:\/\/sdlc\.test\/api\/auth\/authorize/u);
  });
});
