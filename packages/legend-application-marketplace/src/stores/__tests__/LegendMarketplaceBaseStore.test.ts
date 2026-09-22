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
import { AbstractServerClient } from '@finos/legend-shared';
import { ApplicationStore } from '@finos/legend-application';
import { flowResult } from 'mobx';
import { TEST__getTestLegendMarketplaceApplicationConfig } from '../../application/__test-utils__/LegendMarketplaceApplicationTestUtils.js';
import { LegendMarketplacePluginManager } from '../../application/LegendMarketplacePluginManager.js';
import {
  type LegendMarketplaceApplicationStore,
  LegendMarketplaceBaseStore,
} from '../LegendMarketplaceBaseStore.js';

const CLIENT_NAME = 'test-client';
const ACCESS_TOKEN = 'test-token';
const CURRENT_USER_PATH = '/server/v1/currentUser';

let fetchSpy: jest.SpiedFunction<typeof globalThis.fetch>;

beforeEach(() => {
  fetchSpy = jest.spyOn(globalThis, 'fetch');
  fetchSpy.mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve('testUser'),
  } as Response);
});

afterEach(() => {
  jest.restoreAllMocks();
  AbstractServerClient.setDefaultAuthenticationTokenProvider(undefined);
});

const createApplicationStore = (overrides?: {
  engineClientName?: string | undefined;
  engineUseCookieAuthOnly?: boolean | undefined;
}): LegendMarketplaceApplicationStore =>
  new ApplicationStore(
    TEST__getTestLegendMarketplaceApplicationConfig(overrides),
    LegendMarketplacePluginManager.create(),
  );

const currentUserRequest = (): [string, RequestInit] => {
  const call = fetchSpy.mock.calls.find(([url]) =>
    String(url).includes(CURRENT_USER_PATH),
  );
  expect(call).toBeDefined();
  const [url, options] = call as [string, RequestInit];
  return [String(url), options];
};

describe(unitTest('LegendMarketplaceBaseStore - engine authentication'), () => {
  test('the configured client name reaches the identity request', async () => {
    const baseStore = new LegendMarketplaceBaseStore(
      createApplicationStore({ engineClientName: CLIENT_NAME }),
    );

    await flowResult(baseStore.initialize());

    expect(currentUserRequest()[0]).toContain(`client_name=${CLIENT_NAME}`);
  });

  test('the identity request carries no client name when none is configured', async () => {
    const baseStore = new LegendMarketplaceBaseStore(createApplicationStore());

    await flowResult(baseStore.initialize());

    expect(currentUserRequest()[0]).not.toContain('client_name');
  });

  test('the identity request carries the bearer token once the token client is on', async () => {
    const applicationStore = createApplicationStore({
      engineClientName: CLIENT_NAME,
    });
    applicationStore.setEnableTokenClient(true);
    applicationStore.setAccessToken(ACCESS_TOKEN);
    const baseStore = new LegendMarketplaceBaseStore(applicationStore);

    await flowResult(baseStore.initialize());

    const [, options] = currentUserRequest();
    expect(
      (options.headers as Record<string, string> | undefined)?.Authorization,
    ).toBe(`Bearer ${ACCESS_TOKEN}`);
    expect(options.credentials).toBe('omit');
  });

  test('a cookie-only engine keeps the identity request on the session cookie', async () => {
    const applicationStore = createApplicationStore({
      engineClientName: CLIENT_NAME,
      engineUseCookieAuthOnly: true,
    });
    applicationStore.setEnableTokenClient(true);
    applicationStore.setAccessToken(ACCESS_TOKEN);
    const baseStore = new LegendMarketplaceBaseStore(applicationStore);

    await flowResult(baseStore.initialize());

    const [url, options] = currentUserRequest();
    expect(
      (options.headers as Record<string, string> | undefined)?.Authorization,
    ).toBeUndefined();
    expect(options.credentials).toBe('include');
    expect(url).toContain(`client_name=${CLIENT_NAME}`);
  });
});
