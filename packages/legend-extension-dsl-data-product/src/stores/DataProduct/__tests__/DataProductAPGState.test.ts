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

import { describe, test, expect, jest } from '@jest/globals';
import {
  type V1_LiteDataContractWithUserStatus,
  V1_AccessPointGroup,
  V1_EnrichedUserApprovalStatus,
  V1_ResourceType,
} from '@finos/legend-graph';
import {
  ApplicationStore,
  LegendApplicationConfig,
  type LegendApplicationPlugin,
  LegendApplicationPluginManager,
} from '@finos/legend-application';
import type { PlainObject } from '@finos/legend-shared';
import { TEST__getApplicationVersionData } from '@finos/legend-application/test';
import type { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';
import {
  AccessPointGroupAccess,
  DataProductAPGState,
} from '../DataProductAPGState.js';
import type { DataProductViewerState } from '../DataProductViewerState.js';
import {
  DSL_DATAPRODUCT_EVENT,
  DSL_DATAPRODUCT_EVENT_STATUS,
} from '../../../__lib__/DSL_DataProduct_Event.js';

// This test suite guards against a regression where a consumer with multiple
// contracts for the same access point group (e.g. an approved contract of
// their own plus a duplicate pending contract submitted by someone else on
// their behalf) would have their access status driven by whichever contract
// happened to come first in the server response, rather than the one furthest
// along in the approval process. That bug caused the Marketplace UI to show
// "pending manager approval" even though the user's access was already
// approved and working.

const TEST_APG_ID = 'GROUP1';
const TEST_DATA_PRODUCT_NAME = 'TestProduct';
const TEST_DEPLOYMENT_ID = 123;
const TEST_CURRENT_USER = 'consumer-user';

// -------------------------------- Test Helpers --------------------------------

class TEST__PluginManager extends LegendApplicationPluginManager<LegendApplicationPlugin> {
  private constructor() {
    super();
  }
  static create(): TEST__PluginManager {
    return new TEST__PluginManager();
  }
}

const TEST__getApplicationConfig = (): LegendApplicationConfig =>
  new (class extends LegendApplicationConfig {
    override getDefaultApplicationStorageKey(): string {
      return 'test';
    }
  })({
    configData: { env: 'TEST', appName: 'TEST' },
    versionData: TEST__getApplicationVersionData(),
    baseAddress: '/',
  });

const createTestApplicationStore = (
  currentUser = TEST_CURRENT_USER,
): ApplicationStore<
  LegendApplicationConfig,
  LegendApplicationPluginManager<LegendApplicationPlugin>
> => {
  const pluginManager = TEST__PluginManager.create();
  const appStore = new ApplicationStore(
    TEST__getApplicationConfig(),
    pluginManager,
  );
  appStore.identityService.setCurrentUser(currentUser);
  return appStore;
};

const createUserContract = (
  guid: string,
  status: V1_EnrichedUserApprovalStatus,
): V1_LiteDataContractWithUserStatus =>
  ({
    contractResultLite: {
      guid,
      description: 'Test contract',
      members: [],
      consumer: {},
      createdBy: 'creator',
      createdAt: '2026-01-01T00:00:00Z',
      resourceId: TEST_DATA_PRODUCT_NAME,
      resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
      deploymentId: TEST_DEPLOYMENT_ID,
      accessPointGroup: TEST_APG_ID,
      version: 1,
    },
    status,
    pendingTaskWithAssignees: null,
    user: TEST_CURRENT_USER,
  }) as unknown as V1_LiteDataContractWithUserStatus;

/**
 * lakehouseContractServerClient.getDataContract is mocked to return a minimal
 * (but real, schema-valid) V1_DataContractsResponse payload echoing back the
 * requested guid, so the production V1_deserializeDataContractResponse code
 * path runs unmocked and tests can assert on which contract guid the
 * "handleDataProductContracts" flow picked.
 */
const createMockLakehouseClient = (): jest.Mocked<
  Pick<
    LakehouseContractServerClient,
    | 'getDataContract'
    | 'getContractUserStatus'
    | 'getConsumerGrantsByContractId'
  >
> =>
  ({
    getDataContract: jest.fn(async (guid: string) =>
      Promise.resolve({
        dataContracts: [
          {
            dataContract: {
              guid,
              description: 'Test contract',
              version: 1,
              state: 'COMPLETED',
              createdBy: 'creator',
              createdAt: '2026-01-01T00:00:00Z',
            },
          },
        ],
      } as PlainObject<unknown>),
    ),
    getContractUserStatus: jest.fn(async () =>
      Promise.resolve({
        status: V1_EnrichedUserApprovalStatus.APPROVED,
      } as PlainObject<unknown>),
    ),
    getConsumerGrantsByContractId: jest.fn(async (contractId: string) =>
      Promise.resolve({
        contractId,
        accessPointGroups: [],
        users: [
          {
            username: TEST_CURRENT_USER,
            contractId,
            targetAccount: 'test-account',
          },
        ],
      } as PlainObject<unknown>),
    ),
  }) as unknown as jest.Mocked<
    Pick<
      LakehouseContractServerClient,
      | 'getDataContract'
      | 'getContractUserStatus'
      | 'getConsumerGrantsByContractId'
    >
  >;

const createState = (
  projectGAV?:
    | { groupId: string; artifactId: string; versionId: string }
    | undefined,
): DataProductAPGState => {
  const appStore = createTestApplicationStore();
  const apg = new V1_AccessPointGroup();
  apg.id = TEST_APG_ID;
  const mockViewerState = {
    applicationStore: appStore,
    dataProductConfig: undefined,
    product: { path: TEST_DATA_PRODUCT_NAME },
    projectGAV,
    entitlementsDataProductDetails: {
      dataProduct: { name: TEST_DATA_PRODUCT_NAME },
      deploymentId: TEST_DEPLOYMENT_ID,
    },
    graphManagerState: {
      pluginManager: { getPureProtocolProcessorPlugins: () => [] },
    },
    dataProductDataAccessState: undefined,
    layoutState: {
      sectionCollapseState: {
        registerChild: jest.fn(),
      },
    },
  } as unknown as DataProductViewerState;
  return new DataProductAPGState(apg, mockViewerState);
};

// -------------------------------- Tests --------------------------------

describe('DataProductAPGState', () => {
  describe('handleDataProductContracts', () => {
    test.each([
      ['pending contract listed before the approved one', true],
      ['pending contract listed after the approved one', false],
    ])(
      'prefers the approved contract over a pending duplicate for the same consumer and access point group (%s)',
      async (_label, pendingFirst) => {
        const state = createState();
        const client = createMockLakehouseClient();
        const tokenProvider = (): string => 'test-token';

        const pendingContract = createUserContract(
          'contract-pending',
          V1_EnrichedUserApprovalStatus.PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
        );
        const approvedContract = createUserContract(
          'contract-approved',
          V1_EnrichedUserApprovalStatus.APPROVED,
        );
        const userContracts = pendingFirst
          ? [pendingContract, approvedContract]
          : [approvedContract, pendingContract];

        await state.handleDataProductContracts(
          [],
          userContracts,
          client as unknown as LakehouseContractServerClient,
          tokenProvider,
        );

        expect(client.getDataContract).toHaveBeenCalledWith(
          'contract-approved',
          true,
          'test-token',
        );
        expect(client.getDataContract).not.toHaveBeenCalledWith(
          'contract-pending',
          expect.anything(),
          expect.anything(),
        );
        expect(
          state.associatedUserContract
            ? state.associatedUserContract.guid
            : undefined,
        ).toBe('contract-approved');
      },
    );

    test('prefers the most advanced pending stage among multiple non-approved duplicates', async () => {
      const state = createState();
      const client = createMockLakehouseClient();
      const tokenProvider = (): string => 'test-token';

      const submittedContract = createUserContract(
        'contract-submitted',
        V1_EnrichedUserApprovalStatus.SUBMITTED_FOR_APPROVALS,
      );
      const dataOwnerApprovalContract = createUserContract(
        'contract-pending-do',
        V1_EnrichedUserApprovalStatus.PENDING_DATA_OWNER_APPROVAL,
      );

      await state.handleDataProductContracts(
        [],
        [submittedContract, dataOwnerApprovalContract],
        client as unknown as LakehouseContractServerClient,
        tokenProvider,
      );

      expect(client.getDataContract).toHaveBeenCalledWith(
        'contract-pending-do',
        true,
        'test-token',
      );
    });

    test('regression: UI access status reflects the approved contract, not a duplicate pending one', async () => {
      const state = createState();
      const client = createMockLakehouseClient();
      const tokenProvider = (): string => 'test-token';

      const pendingContract = createUserContract(
        'contract-pending',
        V1_EnrichedUserApprovalStatus.PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
      );
      const approvedContract = createUserContract(
        'contract-approved',
        V1_EnrichedUserApprovalStatus.APPROVED,
      );

      const fetchUserAccessStatusSpy = jest.spyOn(
        state,
        'fetchUserAccessStatus',
      );

      await state.handleDataProductContracts(
        [],
        [pendingContract, approvedContract],
        client as unknown as LakehouseContractServerClient,
        tokenProvider,
      );
      // fetchUserAccessStatus is fired (but not awaited) from within
      // setAssociatedUserContract, so wait for it explicitly here.
      await fetchUserAccessStatusSpy.mock.results[0]?.value;

      expect(state.access).toBe(AccessPointGroupAccess.APPROVED);
      expect(state.access).not.toBe(
        AccessPointGroupAccess.PENDING_MANAGER_APPROVAL,
      );
    });
  });

  describe('logCreatingSubscription', () => {
    const TEST_REQUEST = {
      contractId: 'contract-1',
      target: {
        _type: 'snowflake',
        snowflakeAccountId: 'ACCOUNT_1',
        snowflakeRegion: 'US_EAST',
        snowflakeNetwork: 'PUBLIC',
      },
    } as unknown as PlainObject<never>;

    test('includes dataProduct and accessPointGroup, but no SDLC coordinates, for an adhoc data product', () => {
      const state = createState();
      const logEventSpy = jest.spyOn(
        state.applicationStore.telemetryService,
        'logEvent',
      );

      state.logCreatingSubscription(TEST_REQUEST, undefined);

      expect(logEventSpy).toHaveBeenCalledWith(
        DSL_DATAPRODUCT_EVENT.CREATE_SUBSCRIPTION,
        expect.objectContaining({
          ...TEST_REQUEST,
          dataProduct: TEST_DATA_PRODUCT_NAME,
          accessPointGroup: TEST_APG_ID,
          status: DSL_DATAPRODUCT_EVENT_STATUS.SUCCESS,
        }),
      );
      const loggedData = logEventSpy.mock.calls[0]?.[1] as Record<
        string,
        unknown
      >;
      expect(loggedData.groupId).toBeUndefined();
      expect(loggedData.artifactId).toBeUndefined();
      expect(loggedData.versionId).toBeUndefined();
    });

    test('includes SDLC groupId/artifactId/versionId for an SDLC-backed data product', () => {
      const state = createState({
        groupId: 'com.example',
        artifactId: 'my-artifact',
        versionId: '1.0.0',
      });
      const logEventSpy = jest.spyOn(
        state.applicationStore.telemetryService,
        'logEvent',
      );

      state.logCreatingSubscription(TEST_REQUEST, undefined);

      expect(logEventSpy).toHaveBeenCalledWith(
        DSL_DATAPRODUCT_EVENT.CREATE_SUBSCRIPTION,
        expect.objectContaining({
          dataProduct: TEST_DATA_PRODUCT_NAME,
          accessPointGroup: TEST_APG_ID,
          groupId: 'com.example',
          artifactId: 'my-artifact',
          versionId: '1.0.0',
          status: DSL_DATAPRODUCT_EVENT_STATUS.SUCCESS,
        }),
      );
    });

    test('logs failure status with the error message', () => {
      const state = createState();
      const logEventSpy = jest.spyOn(
        state.applicationStore.telemetryService,
        'logEvent',
      );

      state.logCreatingSubscription(TEST_REQUEST, 'creation failed');

      expect(logEventSpy).toHaveBeenCalledWith(
        DSL_DATAPRODUCT_EVENT.CREATE_SUBSCRIPTION,
        expect.objectContaining({
          status: DSL_DATAPRODUCT_EVENT_STATUS.FAILURE,
          error: 'creation failed',
        }),
      );
    });
  });
});
