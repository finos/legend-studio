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
import { LEGEND_CUBE_USER_DATA_KEY } from '../../__lib__/LegendCubeLabels.js';
import {
  TEST__createCubeHost,
  TEST__CUBE_ENGINE_URL,
} from '../../__test-utils__/CubeTestApplication.js';
import { CubeDevSettingsState } from '../CubeDevSettingsState.js';

beforeEach(() => {
  localStorage.clear();
});

describe('Dev Settings (PLAN §11.16)', () => {
  test("Turns the engine clients' request compression off and on, and remembers it for the user", () => {
    const { host, engineClient } = TEST__createCubeHost();
    const settings = new CubeDevSettingsState(host);
    // compressed by default: the clients are left alone
    expect(settings.requestCompression).toBe(true);
    expect(engineClient.setCompression).not.toHaveBeenCalled();
    settings.setRequestCompression(false);
    expect(engineClient.setCompression).toHaveBeenLastCalledWith(false);
    expect(
      host.applicationStore.userDataService.getBooleanValue(
        LEGEND_CUBE_USER_DATA_KEY.UNCOMPRESSED_REQUESTS,
      ),
    ).toBe(true);
    // a new page turns it off again for the user
    const next = TEST__createCubeHost(undefined, host.applicationStore);
    expect(new CubeDevSettingsState(next.host).requestCompression).toBe(false);
    expect(next.engineClient.setCompression).toHaveBeenLastCalledWith(false);
    settings.setRequestCompression(true);
    expect(engineClient.setCompression).toHaveBeenLastCalledWith(true);
  });

  test('Uses a typed engine URL once it is a URL, and goes back to the one the host configured', () => {
    const { host, engineClient } = TEST__createCubeHost();
    const settings = new CubeDevSettingsState(host);
    expect(settings.baseUrlText).toBe(TEST__CUBE_ENGINE_URL);
    expect(settings.defaultBaseUrl).toBe(TEST__CUBE_ENGINE_URL);
    expect(settings.baseUrlError).toBeUndefined();
    settings.setBaseUrlText('not a url');
    expect(settings.baseUrlError).toBe('Invalid URL');
    expect(engineClient.setBaseUrl).not.toHaveBeenCalled();
    settings.setBaseUrlText('http://localhost:6301/api');
    expect(settings.baseUrlError).toBeUndefined();
    expect(engineClient.setBaseUrl).toHaveBeenLastCalledWith(
      'http://localhost:6301/api',
    );
    expect(host.engineClientSettings?.baseUrl).toBe(
      'http://localhost:6301/api',
    );
    settings.resetBaseUrl();
    expect(settings.baseUrlText).toBe(TEST__CUBE_ENGINE_URL);
    expect(engineClient.setBaseUrl).toHaveBeenLastCalledWith(
      TEST__CUBE_ENGINE_URL,
    );
  });

  test("Changes nothing on a host that doesn't share its engine clients' settings", () => {
    const { host } = TEST__createCubeHost();
    const settings = new CubeDevSettingsState({
      ...host,
      engineClientSettings: undefined,
    });
    expect(settings.isAvailable).toBe(false);
    settings.setRequestCompression(false);
    expect(settings.requestCompression).toBe(true);
    settings.open();
    expect(settings.isOpen).toBe(true);
    settings.close();
    expect(settings.isOpen).toBe(false);
  });
});
