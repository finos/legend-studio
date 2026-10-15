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

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import { NetworkClient } from '@finos/legend-shared';
import {
  applyBackendOverrides,
  LEGEND_APPLICATION_BACKEND_OVERRIDES_STORAGE_KEY,
  readBackendOverrides,
  writeBackendOverrides,
  type LegendApplicationBackendEntry,
} from '../LegendApplicationBackendOverrides.js';
import {
  LegendApplicationConfig,
  type LegendApplicationConfigurationData,
} from '../LegendApplicationConfig.js';
import {
  LegendApplication,
  type LegendApplicationConfigurationInput,
} from '../LegendApplication.js';
import { LegendApplicationPluginManager } from '../LegendApplicationPluginManager.js';
import type { LegendApplicationPlugin } from '../../stores/LegendApplicationPlugin.js';
import { ApplicationStore } from '../../stores/ApplicationStore.js';
import { TEST__getApplicationVersionData } from '../../stores/__test-utils__/ApplicationStoreTestUtils.js';
import { TEST__getUndeclaredBackendUrlFields } from '../__test-utils__/BackendOverridesTestUtils.js';

interface TestConfigurationData extends LegendApplicationConfigurationData {
  sdlc: { url: string };
  engine: { url: string; queryUrl?: string };
  documentation?: { url: string };
}

class TestApplicationConfig extends LegendApplicationConfig {
  readonly sdlcServerUrl: string;
  readonly engineServerUrl: string;
  readonly engineQueryServerUrl?: string | undefined;

  constructor(
    input: LegendApplicationConfigurationInput<TestConfigurationData>,
  ) {
    super(input);
    this.sdlcServerUrl = input.configData.sdlc.url;
    this.engineServerUrl = input.configData.engine.url;
    this.engineQueryServerUrl = input.configData.engine.queryUrl;
  }

  override getDefaultApplicationStorageKey(): string {
    return 'test-application';
  }

  override getBackendEntries(): LegendApplicationBackendEntry[] {
    return [
      {
        key: 'sdlc',
        label: 'SDLC Server',
        configPath: 'sdlc.url',
        field: 'sdlcServerUrl',
      },
      {
        key: 'engine',
        label: 'Engine Server',
        configPath: 'engine.url',
        field: 'engineServerUrl',
      },
      {
        key: 'engineQuery',
        label: 'Engine Query Server',
        configPath: 'engine.queryUrl',
        field: 'engineQueryServerUrl',
      },
    ];
  }
}

class TestApplication extends LegendApplication {
  constructor() {
    super(new LegendApplicationPluginManager<LegendApplicationPlugin>());
  }

  async configureApplication(
    input: LegendApplicationConfigurationInput<TestConfigurationData>,
  ): Promise<LegendApplicationConfig> {
    return new TestApplicationConfig(input);
  }

  async loadApplication(): Promise<void> {
    // do nothing
  }
}

const getConfigData = (
  backendOverrides?: { enabled?: boolean } | undefined,
): TestConfigurationData => ({
  appName: 'test',
  env: 'local',
  sdlc: { url: 'http://localhost:6100/api' },
  engine: { url: 'http://localhost:6300/api' },
  application: backendOverrides ? { backendOverrides } : undefined,
});

const createConfig = (
  configData: TestConfigurationData,
  appliedOverrides: LegendApplicationConfigurationInput<TestConfigurationData>['backendOverrides'] = [],
): TestApplicationConfig =>
  new TestApplicationConfig({
    configData,
    versionData: TEST__getApplicationVersionData(),
    backendOverrides: appliedOverrides,
  });

const fetchConfig = async (
  configData: TestConfigurationData,
): Promise<TestApplicationConfig> => {
  jest
    .spyOn(NetworkClient.prototype, 'get')
    .mockImplementation(async (url: string) =>
      url.endsWith('config.json')
        ? configData
        : TEST__getApplicationVersionData(),
    );
  const application = new TestApplication();
  application.setup({ baseAddress: '/test/' });
  const [config] = await application.fetchApplicationConfiguration();
  return config as TestApplicationConfig;
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Backend overrides storage', () => {
  test('Keeps overrides per application and environment', () => {
    writeBackendOverrides(window.localStorage, 'studio', 'local', {
      'sdlc.url': 'http://sdlc.test/api',
    });
    writeBackendOverrides(window.localStorage, 'query', 'local', {
      'engine.url': 'http://engine.test/api',
    });
    expect(
      readBackendOverrides(window.localStorage, 'studio', 'local'),
    ).toEqual({ 'sdlc.url': 'http://sdlc.test/api' });
    expect(readBackendOverrides(window.localStorage, 'studio', 'prod')).toEqual(
      {},
    );
    expect(readBackendOverrides(window.localStorage, 'query', 'local')).toEqual(
      {
        'engine.url': 'http://engine.test/api',
      },
    );
  });

  test('Removes the storage entry once no application has overrides', () => {
    writeBackendOverrides(window.localStorage, 'studio', 'local', {
      'sdlc.url': 'http://sdlc.test/api',
    });
    writeBackendOverrides(window.localStorage, 'studio', 'local', {});
    expect(
      window.localStorage.getItem(
        LEGEND_APPLICATION_BACKEND_OVERRIDES_STORAGE_KEY,
      ),
    ).toBeNull();
  });

  test('Ignores stored data it cannot read', () => {
    window.localStorage.setItem(
      LEGEND_APPLICATION_BACKEND_OVERRIDES_STORAGE_KEY,
      'not json',
    );
    expect(
      readBackendOverrides(window.localStorage, 'studio', 'local'),
    ).toEqual({});
    window.localStorage.setItem(
      LEGEND_APPLICATION_BACKEND_OVERRIDES_STORAGE_KEY,
      JSON.stringify({ 'studio:local': { 'sdlc.url': 42, 'engine.url': '' } }),
    );
    expect(
      readBackendOverrides(window.localStorage, 'studio', 'local'),
    ).toEqual({});
  });
});

describe('Applying backend overrides to config.json', () => {
  test('Replaces configured URLs and reports what it replaced, leaving the original untouched', () => {
    const configData = getConfigData();
    const result = applyBackendOverrides(configData, {
      'sdlc.url': 'http://sdlc.test/api',
    });
    expect(result.configData.sdlc.url).toBe('http://sdlc.test/api');
    expect(result.configData.engine.url).toBe('http://localhost:6300/api');
    expect(result.applied).toEqual([
      {
        configPath: 'sdlc.url',
        configuredUrl: 'http://localhost:6100/api',
        url: 'http://sdlc.test/api',
      },
    ]);
    expect(configData.sdlc.url).toBe('http://localhost:6100/api');
  });

  test('Does not add backends config.json does not configure, nor override non-string values', () => {
    const result = applyBackendOverrides(getConfigData(), {
      'engine.queryUrl': 'http://engine-query.test/api',
      'showcase.url': 'http://showcase.test/api',
      sdlc: 'http://sdlc.test/api',
    });
    expect(result.applied).toEqual([]);
    expect(result.configData).toEqual(getConfigData());
  });
});

describe('Backend overrides when the application starts', () => {
  test('Are applied when the deployment allows them', async () => {
    writeBackendOverrides(window.localStorage, 'test', 'local', {
      'sdlc.url': 'http://sdlc.test/api',
    });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {
      // the overrides in use are logged
    });
    const config = await fetchConfig(getConfigData({ enabled: true }));
    expect(warn).toHaveBeenCalledTimes(1);
    expect(config.sdlcServerUrl).toBe('http://sdlc.test/api');
    expect(config.enableBackendOverrides).toBe(true);
    expect(config.backendOverrides).toEqual([
      {
        configPath: 'sdlc.url',
        configuredUrl: 'http://localhost:6100/api',
        url: 'http://sdlc.test/api',
      },
    ]);
  });

  test('Are ignored when the deployment does not allow them', async () => {
    writeBackendOverrides(window.localStorage, 'test', 'local', {
      'sdlc.url': 'http://sdlc.test/api',
    });
    const config = await fetchConfig(getConfigData());
    expect(config.sdlcServerUrl).toBe('http://localhost:6100/api');
    expect(config.enableBackendOverrides).toBe(false);
    expect(config.backendOverrides).toEqual([]);
  });

  test('Are cleared by the reset query parameter, which is then removed from the address', async () => {
    writeBackendOverrides(window.localStorage, 'test', 'local', {
      'sdlc.url': 'http://sdlc.test/api',
    });
    window.history.replaceState(
      null,
      '',
      '/test/projects?resetBackendOverrides&other=1',
    );
    const config = await fetchConfig(getConfigData({ enabled: true }));
    expect(config.sdlcServerUrl).toBe('http://localhost:6100/api');
    expect(readBackendOverrides(window.localStorage, 'test', 'local')).toEqual(
      {},
    );
    expect(window.location.search).toBe('?other=1');
    window.history.replaceState(null, '', '/');
  });
});

describe('Backend override service', () => {
  const createApplicationStore = (
    config: TestApplicationConfig,
  ): ApplicationStore<
    TestApplicationConfig,
    LegendApplicationPluginManager<LegendApplicationPlugin>
  > =>
    new ApplicationStore(
      config,
      new LegendApplicationPluginManager<LegendApplicationPlugin>(),
    );

  test('Lists the configured backends with the URL in use and the configured URL', () => {
    const applicationStore = createApplicationStore(
      createConfig(
        {
          ...getConfigData({ enabled: true }),
          sdlc: { url: 'http://sdlc.test/api' },
        },
        [
          {
            configPath: 'sdlc.url',
            configuredUrl: 'http://localhost:6100/api',
            url: 'http://sdlc.test/api',
          },
        ],
      ),
    );
    const service = applicationStore.backendOverrideService;
    expect(service.isEnabled).toBe(true);
    // the engine query server isn't configured, so it isn't listed
    expect(
      service.entries.map((entry) => [
        entry.entry.key,
        entry.url,
        entry.configuredUrl,
      ]),
    ).toEqual([
      ['sdlc', 'http://sdlc.test/api', 'http://localhost:6100/api'],
      ['engine', 'http://localhost:6300/api', 'http://localhost:6300/api'],
    ]);
    expect(service.activeOverrides.map((entry) => entry.entry.key)).toEqual([
      'sdlc',
    ]);
  });

  test('Is not enabled unless the deployment allows it', () => {
    const applicationStore = createApplicationStore(
      createConfig(getConfigData()),
    );
    expect(applicationStore.backendOverrideService.isEnabled).toBe(false);
  });

  test('Opens with the overrides in use, checks typed URLs, and saves only the changed ones before reloading', () => {
    const applicationStore = createApplicationStore(
      createConfig(
        {
          ...getConfigData({ enabled: true }),
          sdlc: { url: 'http://sdlc.test/api' },
        },
        [
          {
            configPath: 'sdlc.url',
            configuredUrl: 'http://localhost:6100/api',
            url: 'http://sdlc.test/api',
          },
        ],
      ),
    );
    const reload = jest.fn();
    applicationStore.navigationService.navigator.reload = reload;
    const service = applicationStore.backendOverrideService;

    service.open();
    expect(service.isOpen).toBe(true);
    expect(service.getDraft('sdlc')).toBe('http://sdlc.test/api');
    expect(service.getDraft('engine')).toBe('');

    service.setDraft('engine', 'not a url');
    expect(service.getDraftError('engine')).toBe('Invalid URL');
    expect(service.hasDraftErrors).toBe(true);
    service.saveAndReload();
    expect(reload).not.toHaveBeenCalled();

    // an override equal to the configured URL is no override
    service.setDraft('engine', 'http://localhost:6300/api');
    service.setDraft('sdlc', 'http://sdlc-2.test/api');
    service.saveAndReload();
    expect(readBackendOverrides(window.localStorage, 'test', 'local')).toEqual({
      'sdlc.url': 'http://sdlc-2.test/api',
    });
    expect(reload).toHaveBeenCalledTimes(1);

    service.resetAndReload();
    expect(readBackendOverrides(window.localStorage, 'test', 'local')).toEqual(
      {},
    );
    expect(reload).toHaveBeenCalledTimes(2);
  });

  test('Finds URL fields of the config that are not declared as backends', () => {
    class IncompleteConfig extends TestApplicationConfig {
      readonly depotServerUrl = 'http://localhost:6200/depot/api';
      readonly studioApplicationUrl = 'http://localhost:9000/studio';
    }
    const config = new IncompleteConfig({
      configData: getConfigData(),
      versionData: TEST__getApplicationVersionData(),
    });
    expect(
      TEST__getUndeclaredBackendUrlFields(config, ['studioApplicationUrl']),
    ).toEqual(['depotServerUrl']);
  });
});
