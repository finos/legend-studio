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

import {
  test,
  describe,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { guaranteeNonNullable, TracerService } from '@finos/legend-shared';
import { V1_EngineServerClient } from '../V1_EngineServerClient.js';

const BASE_URL = 'http://engine.test/api';
const CLIENT_NAME = 'test-client';

const mockFetchResponse = (): Response =>
  ({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
  }) as Response;

let fetchSpy: jest.SpiedFunction<typeof globalThis.fetch>;

beforeEach(() => {
  fetchSpy = jest.spyOn(globalThis, 'fetch');
  fetchSpy.mockResolvedValue(mockFetchResponse());
});

afterEach(() => {
  jest.restoreAllMocks();
});

const createClient = (
  clientName?: string | undefined,
): V1_EngineServerClient => {
  const client = new V1_EngineServerClient({
    baseUrl: BASE_URL,
    ...(clientName !== undefined ? { clientName } : {}),
  });
  client.setTracerService(new TracerService());
  return client;
};

const requestedUrls = (): string[] =>
  fetchSpy.mock.calls.map(([url]) => String(guaranteeNonNullable(url)));

const requestedUrl = (): string => {
  expect(fetchSpy).toHaveBeenCalledTimes(1);
  return guaranteeNonNullable(requestedUrls()[0]);
};

describe(unitTest('V1_EngineServerClient - engine client name'), () => {
  test('the client name is sent on the current user lookup', async () => {
    await createClient(CLIENT_NAME).getCurrentUserId();

    expect(requestedUrl()).toEqual(
      `${BASE_URL}/server/v1/currentUser?client_name=${CLIENT_NAME}`,
    );
  });

  test('the client name is sent on the terminal lookup', async () => {
    await createClient(CLIENT_NAME).getTerminalById('terminal1');

    expect(requestedUrl()).toEqual(
      `${BASE_URL}/user/marketplace/terminals/terminal1?client_name=${CLIENT_NAME}`,
    );
  });

  test('the client name is sent on no other request', async () => {
    const client = createClient(CLIENT_NAME);
    await client.runQuery({});
    await client.compile({});
    await client.getQueries(['query1']);

    expect(requestedUrls()).toHaveLength(3);
    requestedUrls().forEach((url) => expect(url).not.toContain('client_name'));
    expect(requestedUrls()[2]).toContain('queryIds=query1');
  });

  test('an empty client name is treated as not configured', async () => {
    await createClient('').getCurrentUserId();

    expect(requestedUrl()).toEqual(`${BASE_URL}/server/v1/currentUser`);
  });

  test('no client name is sent when none is configured', async () => {
    await createClient().getCurrentUserId();

    expect(requestedUrl()).toEqual(`${BASE_URL}/server/v1/currentUser`);
  });
});
