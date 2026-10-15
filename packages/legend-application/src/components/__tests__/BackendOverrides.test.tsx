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

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import {
  LegendApplicationConfig,
  type LegendApplicationConfigurationData,
} from '../../application/LegendApplicationConfig.js';
import type { LegendApplicationConfigurationInput } from '../../application/LegendApplication.js';
import { LegendApplicationPluginManager } from '../../application/LegendApplicationPluginManager.js';
import {
  readBackendOverrides,
  type LegendApplicationAppliedBackendOverride,
  type LegendApplicationBackendEntry,
} from '../../application/LegendApplicationBackendOverrides.js';
import type { LegendApplicationPlugin } from '../../stores/LegendApplicationPlugin.js';
import { ApplicationStore } from '../../stores/ApplicationStore.js';
import { TEST__getApplicationVersionData } from '../../stores/__test-utils__/ApplicationStoreTestUtils.js';
import { ApplicationStoreProvider } from '../ApplicationStoreProvider.js';
import { ApplicationFrameworkProvider } from '../ApplicationFrameworkProvider.js';
import { TEST__BrowserEnvironmentProvider } from '../__test-utils__/BrowserEnvironmentTestUtils.js';

interface TestConfigurationData extends LegendApplicationConfigurationData {
  sdlc: { url: string };
  engine: { url: string };
}

class TestApplicationConfig extends LegendApplicationConfig {
  readonly sdlcServerUrl: string;
  readonly engineServerUrl: string;

  constructor(
    input: LegendApplicationConfigurationInput<TestConfigurationData>,
  ) {
    super(input);
    this.sdlcServerUrl = input.configData.sdlc.url;
    this.engineServerUrl = input.configData.engine.url;
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
    ];
  }
}

const renderApplication = async (
  backendOverrides: LegendApplicationAppliedBackendOverride[],
): Promise<
  ApplicationStore<
    TestApplicationConfig,
    LegendApplicationPluginManager<LegendApplicationPlugin>
  >
> => {
  const configData: TestConfigurationData = {
    appName: 'test',
    env: 'local',
    application: { backendOverrides: { enabled: true } },
    sdlc: { url: 'http://localhost:6100/api' },
    engine: { url: 'http://localhost:6300/api' },
  };
  backendOverrides.forEach((override) => {
    if (override.configPath === 'sdlc.url') {
      configData.sdlc.url = override.url;
    }
  });
  const applicationStore = new ApplicationStore(
    new TestApplicationConfig({
      configData,
      versionData: TEST__getApplicationVersionData(),
      backendOverrides,
    }),
    new LegendApplicationPluginManager<LegendApplicationPlugin>(),
  );
  render(
    <ApplicationStoreProvider store={applicationStore}>
      <TEST__BrowserEnvironmentProvider initialEntries={['/test']}>
        <ApplicationFrameworkProvider disableVirtualAssistant={true}>
          <div data-testid="application-content">application</div>
        </ApplicationFrameworkProvider>
      </TEST__BrowserEnvironmentProvider>
    </ApplicationStoreProvider>,
  );
  await screen.findByTestId('application-content');
  return applicationStore;
};

beforeEach(() => {
  window.localStorage.clear();
});

describe('Backend overrides in the application', () => {
  test('Shows no banner without overrides', async () => {
    await renderApplication([]);
    expect(screen.queryByTestId('backend-overrides-banner')).toBeNull();
  });

  test('Shows a banner while overrides are in use, which opens the dialog seeded with them', async () => {
    const applicationStore = await renderApplication([
      {
        configPath: 'sdlc.url',
        configuredUrl: 'http://localhost:6100/api',
        url: 'http://sdlc.test/api',
      },
    ]);
    const banner = screen.getByTestId('backend-overrides-banner');
    expect(banner.textContent).toContain('SDLC Server → http://sdlc.test/api');

    fireEvent.click(within(banner).getByText('Edit'));
    const sdlcInput = await screen.findByLabelText('SDLC Server URL');
    expect((sdlcInput as HTMLInputElement).value).toBe('http://sdlc.test/api');
    const engineInput = screen.getByLabelText('Engine Server URL');
    expect((engineInput as HTMLInputElement).value).toBe('');
    expect(
      screen.getByText('configured: http://localhost:6100/api'),
    ).not.toBeNull();

    // a URL that isn't one can't be saved
    fireEvent.change(engineInput, { target: { value: 'not a url' } });
    expect(screen.getByText('Invalid URL')).not.toBeNull();
    const save = screen.getByRole('button', { name: 'Save and Reload' });
    expect((save as HTMLButtonElement).disabled).toBe(true);

    // reset all clears every field; saving then removes the overrides
    fireEvent.click(screen.getByRole('button', { name: 'Reset All' }));
    expect((sdlcInput as HTMLInputElement).value).toBe('');
    expect(screen.queryByText('Invalid URL')).toBeNull();
    const reload = jest.fn();
    applicationStore.navigationService.navigator.reload = reload;
    fireEvent.click(screen.getByRole('button', { name: 'Save and Reload' }));
    expect(reload).toHaveBeenCalledTimes(1);
    expect(readBackendOverrides(window.localStorage, 'test', 'local')).toEqual(
      {},
    );
    await waitFor(() =>
      expect(screen.queryByLabelText('SDLC Server URL')).toBeNull(),
    );
  });
});
