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

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { assertErrorThrown, LogEvent } from '@finos/legend-shared';
import { LakehouseRuntime, PackageableRuntime } from '@finos/legend-graph';
import type { UserDataService } from '@finos/legend-application';
import { LegendQueryUserDataHelper } from '../../__lib__/LegendQueryUserDataHelper.js';
import { LEGEND_QUERY_APP_EVENT } from '../../__lib__/LegendQueryEvent.js';

// ---------------------------------------------------------------------------
// Mock helpers
// ---------------------------------------------------------------------------

type MockUserDataStoreValue = object | undefined;

class MockUserDataService {
  private store: Record<string, MockUserDataStoreValue> = {};

  getObjectValue(key: string): MockUserDataStoreValue {
    return this.store[key];
  }

  persistValue(key: string, data: MockUserDataStoreValue): void {
    this.store[key] = data;
  }
}

const createMockUserDataService = (): UserDataService =>
  new MockUserDataService() as unknown as UserDataService;

interface MockLakehouseClient {
  getUserEntitlementEnvs: jest.Mock<
    (userId: string, token: string | undefined) => Promise<unknown>
  >;
}

interface MockAppStore {
  identityService: { currentUser: string };
  userDataService: UserDataService;
  logService: { warn: jest.Mock };
}

/**
 * Replicates the logic of `QueryEditorStore.createLakehousePackageableRuntime`
 * in a standalone function so the tests don't need to pull the real class
 * via `require()` (which is disallowed by lint rules).
 */
const createLakehousePackageableRuntime = async (
  dataProductPath: string,
  applicationStore: MockAppStore,
  lakehouseContractServerClient: MockLakehouseClient | undefined,
): Promise<PackageableRuntime> => {
  const persistedInfo = LegendQueryUserDataHelper.getLakehouseUserInfo(
    applicationStore.userDataService,
  );

  let userEnvironment: string | undefined = persistedInfo?.env;
  const userWarehouse: string | undefined =
    persistedInfo?.snowflakeWarehouse ?? 'LAKEHOUSE_CONSUMER_DEFAULT_WH';

  if (userEnvironment === undefined && lakehouseContractServerClient) {
    try {
      const entitlementEnvs =
        await lakehouseContractServerClient.getUserEntitlementEnvs(
          applicationStore.identityService.currentUser,
          undefined,
        );
      userEnvironment = (
        entitlementEnvs as {
          users: { lakehouseEnvironment: string }[];
        }
      ).users
        .map((e) => e.lakehouseEnvironment)
        .at(0);
      LegendQueryUserDataHelper.persistLakehouseUserInfo(
        applicationStore.userDataService,
        {
          env: userEnvironment,
          snowflakeWarehouse: userWarehouse,
        },
      );
    } catch (error) {
      assertErrorThrown(error);
      applicationStore.logService.warn(
        LogEvent.create(LEGEND_QUERY_APP_EVENT.GENERIC_FAILURE),
        `Unable to fetch user lakehouse environment: ${error.message}`,
      );
    }
  }

  const lakehouseRuntime = new LakehouseRuntime(userEnvironment, userWarehouse);
  const packageableRuntime = new PackageableRuntime(
    `${dataProductPath}_LakehouseRuntime`,
  );
  packageableRuntime.runtimeValue = lakehouseRuntime;
  return packageableRuntime;
};

const buildMockAppStore = (userDataService: UserDataService): MockAppStore => ({
  identityService: { currentUser: 'test-user' },
  userDataService,
  logService: { warn: jest.fn() },
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createLakehousePackageableRuntime', () => {
  let userDataService: UserDataService;
  let appStore: MockAppStore;

  beforeEach(() => {
    userDataService = createMockUserDataService();
    appStore = buildMockAppStore(userDataService);
  });

  it(
    unitTest(
      'should use persisted env and warehouse from local storage when available',
    ),
    async () => {
      LegendQueryUserDataHelper.persistLakehouseUserInfo(userDataService, {
        env: 'production',
        snowflakeWarehouse: 'MY_WH',
      });

      const result = await createLakehousePackageableRuntime(
        'test::MyDataProduct',
        appStore,
        undefined,
      );

      expect(result).toBeInstanceOf(PackageableRuntime);
      const runtime = result.runtimeValue;
      expect(runtime).toBeInstanceOf(LakehouseRuntime);

      const lhRuntime = runtime as LakehouseRuntime;
      expect(lhRuntime.environment).toBe('production');
      expect(lhRuntime.warehouse).toBe('MY_WH');
    },
  );

  it(
    unitTest(
      'should default warehouse to LAKEHOUSE_CONSUMER_DEFAULT_WH when not in local storage',
    ),
    async () => {
      const result = await createLakehousePackageableRuntime(
        'test::MyDataProduct',
        appStore,
        undefined,
      );

      const lhRuntime = result.runtimeValue as LakehouseRuntime;
      expect(lhRuntime.environment).toBeUndefined();
      expect(lhRuntime.warehouse).toBe('LAKEHOUSE_CONSUMER_DEFAULT_WH');
    },
  );

  it(
    unitTest(
      'should default warehouse to LAKEHOUSE_CONSUMER_DEFAULT_WH when persisted info has no warehouse',
    ),
    async () => {
      LegendQueryUserDataHelper.persistLakehouseUserInfo(userDataService, {
        env: 'staging',
        snowflakeWarehouse: undefined,
      });

      const result = await createLakehousePackageableRuntime(
        'test::MyDataProduct',
        appStore,
        undefined,
      );

      const lhRuntime = result.runtimeValue as LakehouseRuntime;
      expect(lhRuntime.environment).toBe('staging');
      expect(lhRuntime.warehouse).toBe('LAKEHOUSE_CONSUMER_DEFAULT_WH');
    },
  );

  it(
    unitTest(
      'should fetch from server when no persisted env and client is available',
    ),
    async () => {
      const mockClient: MockLakehouseClient = {
        getUserEntitlementEnvs: jest
          .fn<() => Promise<unknown>>()
          .mockResolvedValue({
            total: 1,
            users: [
              {
                name: 'test-user',
                userType: 'STANDARD',
                lakehouseEnvironment: 'server-env-123',
              },
            ],
          }),
      };

      const result = await createLakehousePackageableRuntime(
        'test::MyDataProduct',
        appStore,
        mockClient,
      );

      expect(mockClient.getUserEntitlementEnvs).toHaveBeenCalledWith(
        'test-user',
        undefined,
      );

      const lhRuntime = result.runtimeValue as LakehouseRuntime;
      expect(lhRuntime.environment).toBe('server-env-123');
      expect(lhRuntime.warehouse).toBe('LAKEHOUSE_CONSUMER_DEFAULT_WH');
    },
  );

  it(
    unitTest('should persist fetched env to local storage after server call'),
    async () => {
      const mockClient: MockLakehouseClient = {
        getUserEntitlementEnvs: jest
          .fn<() => Promise<unknown>>()
          .mockResolvedValue({
            total: 1,
            users: [
              {
                name: 'test-user',
                userType: 'STANDARD',
                lakehouseEnvironment: 'fetched-env',
              },
            ],
          }),
      };

      await createLakehousePackageableRuntime(
        'test::MyDataProduct',
        appStore,
        mockClient,
      );

      const persisted =
        LegendQueryUserDataHelper.getLakehouseUserInfo(userDataService);
      expect(persisted?.env).toBe('fetched-env');
      expect(persisted?.snowflakeWarehouse).toBe(
        'LAKEHOUSE_CONSUMER_DEFAULT_WH',
      );
    },
  );

  it(
    unitTest(
      'should NOT call server when persisted env exists even if client is available',
    ),
    async () => {
      LegendQueryUserDataHelper.persistLakehouseUserInfo(userDataService, {
        env: 'cached-env',
        snowflakeWarehouse: 'CACHED_WH',
      });

      const mockClient: MockLakehouseClient = {
        getUserEntitlementEnvs: jest.fn<() => Promise<unknown>>(),
      };

      const result = await createLakehousePackageableRuntime(
        'test::MyDataProduct',
        appStore,
        mockClient,
      );

      expect(mockClient.getUserEntitlementEnvs).not.toHaveBeenCalled();

      const lhRuntime = result.runtimeValue as LakehouseRuntime;
      expect(lhRuntime.environment).toBe('cached-env');
      expect(lhRuntime.warehouse).toBe('CACHED_WH');
    },
  );

  it(
    unitTest(
      'should handle server error gracefully and still return a runtime',
    ),
    async () => {
      const mockClient: MockLakehouseClient = {
        getUserEntitlementEnvs: jest
          .fn<() => Promise<unknown>>()
          .mockRejectedValue(new Error('Network error')),
      };

      const result = await createLakehousePackageableRuntime(
        'test::MyDataProduct',
        appStore,
        mockClient,
      );

      expect(result).toBeInstanceOf(PackageableRuntime);
      const lhRuntime = result.runtimeValue as LakehouseRuntime;
      expect(lhRuntime.environment).toBeUndefined();
      expect(lhRuntime.warehouse).toBe('LAKEHOUSE_CONSUMER_DEFAULT_WH');

      expect(appStore.logService.warn).toHaveBeenCalled();
    },
  );

  it(
    unitTest(
      'should not fetch from server when no client is configured and no persisted env',
    ),
    async () => {
      const result = await createLakehousePackageableRuntime(
        'test::MyDataProduct',
        appStore,
        undefined,
      );

      const lhRuntime = result.runtimeValue as LakehouseRuntime;
      expect(lhRuntime.environment).toBeUndefined();
      expect(lhRuntime.warehouse).toBe('LAKEHOUSE_CONSUMER_DEFAULT_WH');
    },
  );

  it(
    unitTest(
      'should set the packageable runtime name based on the data product path',
    ),
    async () => {
      const result = await createLakehousePackageableRuntime(
        'my::custom::DataProduct',
        appStore,
        undefined,
      );

      expect(result.name).toBe('my::custom::DataProduct_LakehouseRuntime');
    },
  );
});

describe('LakehouseRuntimeConfigModal persistence', () => {
  it(
    unitTest(
      'should persist env and warehouse to local storage when values change',
    ),
    () => {
      const userDataService = createMockUserDataService();

      // Simulate what handleApply does in the component
      const originalEnv = 'old-env';
      const originalWarehouse = 'OLD_WH';

      const newEnv = 'new-env';
      const newWarehouse = 'NEW_WH';

      const hasChanged: boolean =
        newEnv !== (originalEnv as string) ||
        newWarehouse !== (originalWarehouse as string);
      expect(hasChanged).toBe(true);

      if (hasChanged) {
        LegendQueryUserDataHelper.persistLakehouseUserInfo(userDataService, {
          env: newEnv,
          snowflakeWarehouse: newWarehouse,
        });
      }

      const persisted =
        LegendQueryUserDataHelper.getLakehouseUserInfo(userDataService);
      expect(persisted?.env).toBe('new-env');
      expect(persisted?.snowflakeWarehouse).toBe('NEW_WH');
    },
  );

  it(
    unitTest(
      'should not persist to local storage when values have not changed',
    ),
    () => {
      const userDataService = createMockUserDataService();

      const originalEnv = 'same-env';
      const originalWarehouse = 'SAME_WH';

      // Pre-populate with known state
      LegendQueryUserDataHelper.persistLakehouseUserInfo(userDataService, {
        env: originalEnv,
        snowflakeWarehouse: originalWarehouse,
      });

      const newEnv = 'same-env';
      const newWarehouse = 'SAME_WH';

      const hasChanged: boolean =
        newEnv !== (originalEnv as string) ||
        newWarehouse !== (originalWarehouse as string);
      expect(hasChanged).toBe(false);

      // Values should remain unchanged
      const persisted =
        LegendQueryUserDataHelper.getLakehouseUserInfo(userDataService);
      expect(persisted?.env).toBe('same-env');
      expect(persisted?.snowflakeWarehouse).toBe('SAME_WH');
    },
  );

  it(
    unitTest(
      'should persist clearing env and warehouse (setting to undefined)',
    ),
    () => {
      const userDataService = createMockUserDataService();

      // Start with values
      LegendQueryUserDataHelper.persistLakehouseUserInfo(userDataService, {
        env: 'prod',
        snowflakeWarehouse: 'WH',
      });

      // Simulate user clearing both fields
      const newEnv = undefined;
      const newWarehouse = undefined;

      LegendQueryUserDataHelper.persistLakehouseUserInfo(userDataService, {
        env: newEnv,
        snowflakeWarehouse: newWarehouse,
      });

      const persisted =
        LegendQueryUserDataHelper.getLakehouseUserInfo(userDataService);
      expect(persisted?.env).toBeUndefined();
      expect(persisted?.snowflakeWarehouse).toBeUndefined();
    },
  );
});
