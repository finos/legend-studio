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
import { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';
import {
  type CubeDataProductProject,
  CubeDataProductEnvironmentType,
} from '../../../../CubeDataProduct.js';
import { CubeEngineError } from '../../../../CubeEngine.js';
import {
  V1_CUBE_NO_LAKEHOUSE_ENVIRONMENT,
  V1_CubeLakehouseEnvironmentResolver,
} from '../V1_CubeLakehouseEnvironmentResolver.js';

const PROJECT: CubeDataProductProject = {
  groupId: 'com.example.sales',
  artifactId: 'orders-products',
  versionId: '1.4.0',
  environmentType: CubeDataProductEnvironmentType.PRODUCTION,
};

const setUp = (
  answer: () => Promise<unknown>,
  getPreferredEnvironment?: () => string | undefined,
): {
  resolver: V1_CubeLakehouseEnvironmentResolver;
  getUserEntitlementEnvs: jest.Mock;
} => {
  const client = new LakehouseContractServerClient({
    baseUrl: 'http://lakehouse.test',
  });
  const getUserEntitlementEnvs = jest
    .spyOn(client, 'getUserEntitlementEnvs')
    .mockImplementation(answer as never);
  let token = 0;
  return {
    resolver: new V1_CubeLakehouseEnvironmentResolver(
      client,
      () => `token-${++token}`,
      () => 'viewer',
      getPreferredEnvironment,
    ),
    getUserEntitlementEnvs: getUserEntitlementEnvs as unknown as jest.Mock,
  };
};

describe("The viewer's lakehouse environment", () => {
  test("Is the viewer's first entitlement environment, read once per page visit, with the parallel realm for production-parallel and snapshot versions", async () => {
    const { resolver, getUserEntitlementEnvs } = setUp(async () => ({
      users: [
        { lakehouseEnvironment: 'sales-env' },
        { lakehouseEnvironment: 'other-env' },
      ],
    }));
    expect(await resolver.resolveEnvironment(PROJECT)).toBe('sales-env');
    expect(
      await resolver.resolveEnvironment({
        ...PROJECT,
        environmentType: CubeDataProductEnvironmentType.PRODUCTION_PARALLEL,
      }),
    ).toBe('sales-env-pp');
    expect(
      await resolver.resolveEnvironment({
        ...PROJECT,
        versionId: 'feature-returns-SNAPSHOT',
      }),
    ).toBe('sales-env-pp');
    expect(getUserEntitlementEnvs).toHaveBeenCalledTimes(1);
    expect(getUserEntitlementEnvs).toHaveBeenCalledWith('viewer', 'token-1');
  });

  test('Uses the environment the host remembers for the viewer first, with no entitlements call', async () => {
    const { resolver, getUserEntitlementEnvs } = setUp(
      async () => ({ users: [{ lakehouseEnvironment: 'sales-env' }] }),
      () => 'chosen-env',
    );
    expect(await resolver.resolveEnvironment(PROJECT)).toBe('chosen-env');
    expect(
      await resolver.resolveEnvironment({
        ...PROJECT,
        environmentType: CubeDataProductEnvironmentType.PRODUCTION_PARALLEL,
      }),
    ).toBe('chosen-env-pp');
    expect(getUserEntitlementEnvs).not.toHaveBeenCalled();
  });

  test('Says how to fix a viewer without an environment', async () => {
    const { resolver } = setUp(async () => ({ users: [] }));
    await expect(resolver.resolveEnvironment(PROJECT)).rejects.toMatchObject({
      detail: V1_CUBE_NO_LAKEHOUSE_ENVIRONMENT,
    });
  });

  test('Reads the environment again on the next run after a failure', async () => {
    let calls = 0;
    const { resolver, getUserEntitlementEnvs } = setUp(async () => {
      calls++;
      if (calls === 1) {
        throw new Error('Service unavailable');
      }
      return { users: [{ lakehouseEnvironment: 'sales-env' }] };
    });
    const failure = await resolver
      .resolveEnvironment(PROJECT)
      .catch((error: unknown) => error);
    expect(failure).toBeInstanceOf(CubeEngineError);
    expect((failure as CubeEngineError).detail).toContain(
      'Service unavailable',
    );
    expect(await resolver.resolveEnvironment(PROJECT)).toBe('sales-env');
    expect(getUserEntitlementEnvs).toHaveBeenCalledTimes(2);
  });
});
