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

import { test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { unitTest } from '../../__test-utils__/TestUtils.js';
import {
  AbstractServerClient,
  type ServerClientConfig,
} from '../AbstractServerClient.js';
import { TracerService } from '../TracerService.js';

class TestServerClient extends AbstractServerClient {
  constructor(config: ServerClientConfig) {
    super(config);
    this.setTracerService(new TracerService());
  }

  fetchSomething(): Promise<unknown> {
    return this.get(`${this.baseUrl}/something`);
  }
}

const mockFetchResponse = (): Response =>
  ({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
  }) as Response;

let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn(() => Promise.resolve(mockFetchResponse()));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  jest.restoreAllMocks();
  // avoid leaking the static default across tests
  AbstractServerClient.setDefaultAuthenticationTokenProvider(undefined);
});

test(
  unitTest(
    'AbstractServerClient falls back to cookie-based auth when getAuthenticationToken is absent',
  ),
  async () => {
    const client = new TestServerClient({ baseUrl: 'http://example.org' });
    await client.fetchSomething();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestInit.credentials).toEqual('include');
    expect(
      (requestInit.headers as Record<string, string>).Authorization,
    ).toBeUndefined();
  },
);

test(
  unitTest(
    'AbstractServerClient attaches a Bearer header and omits credentials when getAuthenticationToken resolves a token',
  ),
  async () => {
    const client = new TestServerClient({
      baseUrl: 'http://example.org',
      getAuthenticationToken: () => 'test-token',
    });
    await client.fetchSomething();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestInit.credentials).toEqual('omit');
    expect(
      (requestInit.headers as Record<string, string>).Authorization,
    ).toEqual('Bearer test-token');
  },
);

test(
  unitTest(
    'AbstractServerClient falls back to cookie-based auth when getAuthenticationToken resolves undefined',
  ),
  async () => {
    const client = new TestServerClient({
      baseUrl: 'http://example.org',
      getAuthenticationToken: () => undefined,
    });
    await client.fetchSomething();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestInit.credentials).toEqual('include');
    expect(
      (requestInit.headers as Record<string, string>).Authorization,
    ).toBeUndefined();
  },
);

test(
  unitTest(
    'AbstractServerClient falls back to the static default provider when the instance has none of its own',
  ),
  async () => {
    AbstractServerClient.setDefaultAuthenticationTokenProvider(
      () => 'default-token',
    );
    const client = new TestServerClient({ baseUrl: 'http://example.org' });
    await client.fetchSomething();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestInit.credentials).toEqual('omit');
    expect(
      (requestInit.headers as Record<string, string>).Authorization,
    ).toEqual('Bearer default-token');
  },
);

test(
  unitTest(
    'AbstractServerClient prefers its own getAuthenticationToken over the static default provider',
  ),
  async () => {
    AbstractServerClient.setDefaultAuthenticationTokenProvider(
      () => 'default-token',
    );
    const client = new TestServerClient({
      baseUrl: 'http://example.org',
      getAuthenticationToken: () => 'instance-token',
    });
    await client.fetchSomething();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(
      (requestInit.headers as Record<string, string>).Authorization,
    ).toEqual('Bearer instance-token');
  },
);

test(
  unitTest(
    'AbstractServerClient falls back to cookie-based auth when no instance override and no default provider are set',
  ),
  async () => {
    const client = new TestServerClient({ baseUrl: 'http://example.org' });
    await client.fetchSomething();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(requestInit.credentials).toEqual('include');
    expect(
      (requestInit.headers as Record<string, string>).Authorization,
    ).toBeUndefined();
  },
);
