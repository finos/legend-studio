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

import { describe, expect, jest, test } from '@jest/globals';
import {
  type CubeEngineClientControls,
  CubeEngineClientSettings,
} from '../CubeEngineClientSettings.js';

const client = (): {
  setBaseUrl: jest.Mock<CubeEngineClientControls['setBaseUrl']>;
  setCompression: jest.Mock<CubeEngineClientControls['setCompression']>;
} => ({
  setBaseUrl: jest.fn<CubeEngineClientControls['setBaseUrl']>(),
  setCompression: jest.fn<CubeEngineClientControls['setCompression']>(),
});

describe('Engine client settings (PLAN §11.16)', () => {
  test('Changes every client registered, and gives a client registered later the settings changed since', () => {
    const settings = new CubeEngineClientSettings({
      baseUrl: 'http://a/api',
      enableCompression: true,
    });
    const first = client();
    settings.register(first);
    // built from the same configuration: only its compression is set again
    expect(first.setBaseUrl).not.toHaveBeenCalled();
    expect(first.setCompression).toHaveBeenLastCalledWith(true);
    settings.setBaseUrl('http://b/api');
    settings.setRequestCompression(false);
    expect(first.setBaseUrl).toHaveBeenLastCalledWith('http://b/api');
    expect(first.setCompression).toHaveBeenLastCalledWith(false);
    const second = client();
    settings.register(second);
    expect(second.setBaseUrl).toHaveBeenLastCalledWith('http://b/api');
    expect(second.setCompression).toHaveBeenLastCalledWith(false);
    expect(settings.defaultBaseUrl).toBe('http://a/api');
  });
});
