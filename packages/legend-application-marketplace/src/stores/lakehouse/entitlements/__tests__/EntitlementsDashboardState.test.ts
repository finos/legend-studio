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

import { describe, test, expect, type jest } from '@jest/globals';
import { flowResult } from 'mobx';
import { createSpy } from '@finos/legend-shared/test';
import {
  V1_LiteDataContract,
  V1_LiteDataContractWithUserStatus,
  V1_ContractUserEventRecord,
  V1_DataRequestUserEventRecord,
  V1_EntitlementsLakehouseEnvironmentType,
  V1_UserApprovalStatus,
  V1_PermitTaskAction,
  V1_Workflow,
  V1_ResourceType,
  type V1_DataRequestWithWorkflow,
  type V1_EntitlementsDataProductDetailsResponse,
  type V1_PureGraphManager,
} from '@finos/legend-graph';
import { guaranteeNonNullable, type PlainObject } from '@finos/legend-shared';
import type { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';
import type { ContractErrorLayer } from '@finos/legend-extension-dsl-data-product';
import { TEST__provideMockLegendMarketplaceBaseStore } from '../../../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import {
  TEST_FULL_PATH,
  TEST_GAV,
  mockDataProductDetailsResponse_sdlc,
} from '../../../../components/__test-utils__/TEST_DATA__ContractErrors.js';
import {
  EntitlementsDashboardState,
  ContractCreatedByUserDetails,
  TaskApprovalAction,
  TASK_ACTION_BATCH_SIZE,
  SYNC_STATUS_MAX_CONCURRENT_CALLS,
} from '../EntitlementsDashboardState.js';
import { ContractAccessStatus } from '../../../../utils/EntitlementsUtils.js';
import { LakehouseEntitlementsStore } from '../LakehouseEntitlementsStore.js';

const PROD_DEPLOYMENT_ID = 100;
const PROD_PAR_DEPLOYMENT_ID = 200;

const createMockLiteDataContract = (
  guid: string,
  deploymentId: number,
  resourceId: string,
): V1_LiteDataContract => {
  const contract = new V1_LiteDataContract();
  contract.guid = guid;
  contract.deploymentId = deploymentId;
  contract.resourceId = resourceId;
  return contract;
};

const createMockContractWithUserStatus = (
  contract: V1_LiteDataContract,
): V1_LiteDataContractWithUserStatus => {
  const result = new V1_LiteDataContractWithUserStatus();
  result.contractResultLite = contract;
  result.user = 'test-user';
  return result;
};

const createMockTask = (
  taskId: string,
  dataContractId: string,
): V1_ContractUserEventRecord => {
  const task = new V1_ContractUserEventRecord();
  task.taskId = taskId;
  task.dataContractId = dataContractId;
  return task;
};

const callFilterByUserEnvironment = (
  dashboardState: EntitlementsDashboardState,
  pendingData: {
    tasks: V1_ContractUserEventRecord[];
    taskContractMap: Map<string, V1_LiteDataContract>;
  },
  contractsForUser: V1_LiteDataContractWithUserStatus[],
  contractsCreatedByUserMap: Map<string, ContractCreatedByUserDetails>,
  envMap: Map<number, string>,
  dataRequests: V1_DataRequestWithWorkflow[] = [],
): {
  filteredTasks: V1_ContractUserEventRecord[];
  filteredContractsForUser: V1_LiteDataContractWithUserStatus[];
  filteredCreatedByUserMap: Map<string, ContractCreatedByUserDetails>;
  filteredDataRequests: V1_DataRequestWithWorkflow[];
} =>
  (
    dashboardState as unknown as {
      filterByUserEnvironment: (
        pendingData: {
          tasks: V1_ContractUserEventRecord[];
          taskContractMap: Map<string, V1_LiteDataContract>;
        },
        contractsForUser: V1_LiteDataContractWithUserStatus[],
        contractsCreatedByUserMap: Map<string, ContractCreatedByUserDetails>,
        dataRequests: V1_DataRequestWithWorkflow[],
        envMap: Map<number, string>,
      ) => {
        filteredTasks: V1_ContractUserEventRecord[];
        filteredContractsForUser: V1_LiteDataContractWithUserStatus[];
        filteredCreatedByUserMap: Map<string, ContractCreatedByUserDetails>;
        filteredDataRequests: V1_DataRequestWithWorkflow[];
      };
    }
  ).filterByUserEnvironment(
    pendingData,
    contractsForUser,
    contractsCreatedByUserMap,
    dataRequests,
    envMap,
  );

const setupDashboardState = async (
  dataProductEnv: string,
): Promise<EntitlementsDashboardState> => {
  const baseStore = await TEST__provideMockLegendMarketplaceBaseStore({
    dataProductEnv,
  });
  const entitlementsStore = new LakehouseEntitlementsStore(baseStore);
  return new EntitlementsDashboardState(entitlementsStore);
};

const buildStandardTestData = () => {
  const prodContract1 = createMockLiteDataContract(
    'prod-1',
    PROD_DEPLOYMENT_ID,
    'dp-prod-1',
  );
  const prodContract2 = createMockLiteDataContract(
    'prod-2',
    PROD_DEPLOYMENT_ID,
    'dp-prod-2',
  );
  const prodParContract1 = createMockLiteDataContract(
    'pp-1',
    PROD_PAR_DEPLOYMENT_ID,
    'dp-pp-1',
  );
  const prodParContract2 = createMockLiteDataContract(
    'pp-2',
    PROD_PAR_DEPLOYMENT_ID,
    'dp-pp-2',
  );

  const envMap = new Map<number, string>();
  envMap.set(
    PROD_DEPLOYMENT_ID,
    V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
  );
  envMap.set(
    PROD_PAR_DEPLOYMENT_ID,
    V1_EntitlementsLakehouseEnvironmentType.PRODUCTION_PARALLEL,
  );

  const taskContractMap = new Map<string, V1_LiteDataContract>();
  taskContractMap.set('prod-1', prodContract1);
  taskContractMap.set('prod-2', prodContract2);
  taskContractMap.set('pp-1', prodParContract1);
  taskContractMap.set('pp-2', prodParContract2);
  const pendingData = {
    tasks: [
      createMockTask('task-prod-1', 'prod-1'),
      createMockTask('task-prod-2', 'prod-2'),
      createMockTask('task-pp-1', 'pp-1'),
      createMockTask('task-pp-2', 'pp-2'),
    ],
    taskContractMap,
  };

  const contractsForUser = [
    createMockContractWithUserStatus(prodContract1),
    createMockContractWithUserStatus(prodContract2),
    createMockContractWithUserStatus(prodParContract1),
    createMockContractWithUserStatus(prodParContract2),
  ];

  const contractsCreatedByUserMap = new Map<
    string,
    ContractCreatedByUserDetails
  >();
  contractsCreatedByUserMap.set(
    'prod-1',
    new ContractCreatedByUserDetails(prodContract1),
  );
  contractsCreatedByUserMap.set(
    'prod-2',
    new ContractCreatedByUserDetails(prodContract2),
  );
  contractsCreatedByUserMap.set(
    'pp-1',
    new ContractCreatedByUserDetails(prodParContract1),
  );
  contractsCreatedByUserMap.set(
    'pp-2',
    new ContractCreatedByUserDetails(prodParContract2),
  );

  return {
    prodContract1,
    prodContract2,
    prodParContract1,
    prodParContract2,
    envMap,
    pendingData,
    contractsForUser,
    contractsCreatedByUserMap,
  };
};

describe('EntitlementsDashboardState', () => {
  describe('filterByUserEnvironment', () => {
    test('filters out contracts from non-matching environment', async () => {
      const dashboardState = await setupDashboardState('prod');
      const {
        envMap,
        pendingData,
        contractsForUser,
        contractsCreatedByUserMap,
      } = buildStandardTestData();

      const result = callFilterByUserEnvironment(
        dashboardState,
        pendingData,
        contractsForUser,
        contractsCreatedByUserMap,
        envMap,
      );

      expect(result.filteredTasks).toHaveLength(2);
      expect(result.filteredTasks[0]?.dataContractId).toBe('prod-1');
      expect(result.filteredTasks[1]?.dataContractId).toBe('prod-2');

      expect(result.filteredContractsForUser).toHaveLength(2);
      expect(result.filteredContractsForUser[0]?.contractResultLite.guid).toBe(
        'prod-1',
      );
      expect(result.filteredContractsForUser[1]?.contractResultLite.guid).toBe(
        'prod-2',
      );

      expect(result.filteredCreatedByUserMap.size).toBe(2);
      expect(result.filteredCreatedByUserMap.has('prod-1')).toBe(true);
      expect(result.filteredCreatedByUserMap.has('prod-2')).toBe(true);
      expect(result.filteredCreatedByUserMap.has('pp-1')).toBe(false);
      expect(result.filteredCreatedByUserMap.has('pp-2')).toBe(false);
    });

    test('filters out prod contracts when user env is prod-par', async () => {
      const dashboardState = await setupDashboardState('prod-par');
      const {
        envMap,
        pendingData,
        contractsForUser,
        contractsCreatedByUserMap,
      } = buildStandardTestData();

      const result = callFilterByUserEnvironment(
        dashboardState,
        pendingData,
        contractsForUser,
        contractsCreatedByUserMap,
        envMap,
      );

      expect(result.filteredTasks).toHaveLength(2);
      expect(result.filteredTasks[0]?.dataContractId).toBe('pp-1');
      expect(result.filteredTasks[1]?.dataContractId).toBe('pp-2');

      expect(result.filteredContractsForUser).toHaveLength(2);
      expect(result.filteredContractsForUser[0]?.contractResultLite.guid).toBe(
        'pp-1',
      );
      expect(result.filteredContractsForUser[1]?.contractResultLite.guid).toBe(
        'pp-2',
      );

      expect(result.filteredCreatedByUserMap.size).toBe(2);
      expect(result.filteredCreatedByUserMap.has('pp-1')).toBe(true);
      expect(result.filteredCreatedByUserMap.has('pp-2')).toBe(true);
      expect(result.filteredCreatedByUserMap.has('prod-1')).toBe(false);
      expect(result.filteredCreatedByUserMap.has('prod-2')).toBe(false);
    });
  });

  describe('changeTaskStatuses', () => {
    test('approving a contract task sends the justification to approveTask', async () => {
      const dashboardState = await setupDashboardState('prod');
      const task = createMockTask('task-1', 'contract-1');
      const approveTaskSpy = createSpy(
        dashboardState.lakehouseEntitlementsStore.lakehouseContractServerClient,
        'approveTask',
      ).mockResolvedValue({ status: V1_UserApprovalStatus.APPROVED });

      await flowResult(
        dashboardState.changeTaskStatuses(
          [task],
          () => 'token-1',
          TaskApprovalAction.APPROVE,
          'because I said so',
        ),
      );

      expect(approveTaskSpy).toHaveBeenCalledWith(
        'task-1',
        'token-1',
        'because I said so',
      );
      expect(task.status).toBe(V1_UserApprovalStatus.APPROVED);
    });

    test('denying a contract task sends the justification to denyTask', async () => {
      const dashboardState = await setupDashboardState('prod');
      const task = createMockTask('task-2', 'contract-2');
      const denyTaskSpy = createSpy(
        dashboardState.lakehouseEntitlementsStore.lakehouseContractServerClient,
        'denyTask',
      ).mockResolvedValue({ status: V1_UserApprovalStatus.DENIED });

      await flowResult(
        dashboardState.changeTaskStatuses(
          [task],
          () => 'token-2',
          TaskApprovalAction.DENY,
          'does not meet policy',
        ),
      );

      expect(denyTaskSpy).toHaveBeenCalledWith(
        'task-2',
        'token-2',
        'does not meet policy',
      );
      expect(task.status).toBe(V1_UserApprovalStatus.DENIED);
    });

    test('approving a data request task sends the justification to performTaskAction', async () => {
      const dashboardState = await setupDashboardState('prod');

      const task = new V1_DataRequestUserEventRecord();
      task.taskId = 'task-3';
      task.dataRequestId = 'data-request-1';

      const workflow = new V1_Workflow();
      workflow.workflowId = 'workflow-1';
      const dataRequestWithWorkflow: V1_DataRequestWithWorkflow = {
        workflows: [workflow],
      } as V1_DataRequestWithWorkflow;
      dashboardState.pendingDataRequestDetailsMap.set(
        'data-request-1',
        dataRequestWithWorkflow,
      );

      const permitClient =
        dashboardState.lakehouseEntitlementsStore.marketplaceBaseStore
          .permitWorkflowServerClient;
      if (!permitClient) {
        throw new Error('Permit workflow client is not configured in tests');
      }
      const performTaskActionSpy = createSpy(
        permitClient,
        'performTaskAction',
      ).mockResolvedValue({});

      await flowResult(
        dashboardState.changeTaskStatuses(
          [task],
          () => 'token-3',
          TaskApprovalAction.APPROVE,
          'looks good to me',
        ),
      );

      expect(performTaskActionSpy).toHaveBeenCalledWith(
        'workflow-1',
        'task-3',
        V1_PermitTaskAction.APPROVE,
        'looks good to me',
        'token-3',
      );
      expect(task.status).toBe(V1_UserApprovalStatus.APPROVED);
    });

    test('denying a data request task sends the justification to performTaskAction', async () => {
      const dashboardState = await setupDashboardState('prod');

      const task = new V1_DataRequestUserEventRecord();
      task.taskId = 'task-4';
      task.dataRequestId = 'data-request-2';

      const workflow = new V1_Workflow();
      workflow.workflowId = 'workflow-2';
      const dataRequestWithWorkflow: V1_DataRequestWithWorkflow = {
        workflows: [workflow],
      } as V1_DataRequestWithWorkflow;
      dashboardState.pendingDataRequestDetailsMap.set(
        'data-request-2',
        dataRequestWithWorkflow,
      );

      const permitClient =
        dashboardState.lakehouseEntitlementsStore.marketplaceBaseStore
          .permitWorkflowServerClient;
      if (!permitClient) {
        throw new Error('Permit workflow client is not configured in tests');
      }
      const performTaskActionSpy = createSpy(
        permitClient,
        'performTaskAction',
      ).mockResolvedValue({});

      await flowResult(
        dashboardState.changeTaskStatuses(
          [task],
          () => 'token-4',
          TaskApprovalAction.DENY,
          'not authorized',
        ),
      );

      expect(performTaskActionSpy).toHaveBeenCalledWith(
        'workflow-2',
        'task-4',
        V1_PermitTaskAction.REJECT,
        'not authorized',
        'token-4',
      );
      expect(task.status).toBe(V1_UserApprovalStatus.DENIED);
    });

    test('collects failed tasks without stopping the others', async () => {
      const dashboardState = await setupDashboardState('prod');
      const failingTask = createMockTask('task-5', 'contract-5');
      const passingTask = createMockTask('task-6', 'contract-6');
      createSpy(
        dashboardState.lakehouseEntitlementsStore.lakehouseContractServerClient,
        'approveTask',
      ).mockImplementation(async (taskId) =>
        taskId === 'task-5'
          ? { status: V1_UserApprovalStatus.PENDING, errorMessage: 'boom' }
          : { status: V1_UserApprovalStatus.APPROVED },
      );

      const result = await flowResult(
        dashboardState.changeTaskStatuses(
          [failingTask, passingTask],
          () => 'token-5',
          TaskApprovalAction.APPROVE,
          undefined,
        ),
      );

      expect(result.successCount).toBe(1);
      expect(result.errorMessages).toHaveLength(1);
      expect(result.errorMessages[0]?.[0]).toBe(failingTask);
      expect(result.errorMessages[0]?.[1]).toMatch(/boom/);
      expect(failingTask.status).toBeUndefined();
      expect(passingTask.status).toBe(V1_UserApprovalStatus.APPROVED);
    });

    test('sends requests in batches and reports progress instead of per-task notifications', async () => {
      const dashboardState = await setupDashboardState('prod');
      const tasks = Array.from({ length: TASK_ACTION_BATCH_SIZE + 1 }, (_, i) =>
        createMockTask(`task-${i}`, `contract-${i}`),
      );
      dashboardState.pendingTasks = tasks;
      let inFlight = 0;
      let maxInFlight = 0;
      const approveTaskSpy = createSpy(
        dashboardState.lakehouseEntitlementsStore.lakehouseContractServerClient,
        'approveTask',
      ).mockImplementation(async () => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        await Promise.resolve();
        inFlight -= 1;
        return { status: V1_UserApprovalStatus.APPROVED };
      });
      const { applicationStore } = dashboardState.lakehouseEntitlementsStore;
      const notifySuccessSpy = createSpy(
        applicationStore.notificationService,
        'notifySuccess',
      );
      const setBlockingAlertSpy = createSpy(
        applicationStore.alertService,
        'setBlockingAlert',
      );

      const result = await flowResult(
        dashboardState.changeTaskStatuses(
          tasks,
          () => 'token-6',
          TaskApprovalAction.APPROVE,
          undefined,
        ),
      );

      expect(result.successCount).toBe(tasks.length);
      expect(approveTaskSpy).toHaveBeenCalledTimes(tasks.length);
      expect(maxInFlight).toBe(TASK_ACTION_BATCH_SIZE);
      expect(notifySuccessSpy).not.toHaveBeenCalled();
      expect(setBlockingAlertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: `${TASK_ACTION_BATCH_SIZE} of ${tasks.length} processed`,
        }),
      );
      expect(setBlockingAlertSpy).toHaveBeenLastCalledWith(undefined);
      expect(dashboardState.pendingTasks).not.toBe(tasks);
    });
  });

  describe('sync status requests', () => {
    const NOT_SYNCED = {
      status: 'NOT_FULLY_SYNCED',
      subscriptions: [{ guid: 'sub-1' }],
      unsyncedUsers: [{ username: 'USER1' }],
    };
    const SYNCED = {
      status: 'FULLY_SYNCED',
      subscriptions: [{ guid: 'sub-1' }],
    };
    const UNSYNCED_USERS_LAYER = {
      title: 'Unsynced Entities:',
      childLayers: [{ title: 'Users:', errorItems: ['USER1'] }],
    };

    // lets the calls that are made finish: they only take a few ticks
    const settle = (): Promise<void> =>
      new Promise((resolve) => setTimeout(resolve, 0));

    // Calls that the test finishes by hand, in the order they were made
    const holdCalls = (
      dashboardState: EntitlementsDashboardState,
    ): {
      spy: jest.SpiedFunction<
        LakehouseContractServerClient['getContractSyncStatus']
      >;
      finish: (response: PlainObject) => void;
      madeFor: () => string[];
    } => {
      const resolvers: ((response: PlainObject) => void)[] = [];
      const spy = createSpy(
        dashboardState.lakehouseEntitlementsStore.lakehouseContractServerClient,
        'getContractSyncStatus',
      ).mockImplementation(
        () =>
          new Promise<PlainObject>((resolve) => {
            resolvers.push(resolve);
          }),
      );
      return {
        spy,
        finish: (response) => resolvers.shift()?.(response),
        madeFor: () => spy.mock.calls.map(([id]) => id),
      };
    };

    test('a requested id is fetched, and its access status and unsynced entities are kept', async () => {
      const dashboardState = await setupDashboardState('prod');
      const syncStatusSpy = createSpy(
        dashboardState.lakehouseEntitlementsStore.lakehouseContractServerClient,
        'getContractSyncStatus',
      ).mockResolvedValue(NOT_SYNCED);

      dashboardState.requestAccessStatus('c1', 'token-1');
      await settle();

      expect(syncStatusSpy).toHaveBeenCalledWith('c1', 'token-1');
      expect(dashboardState.contractAccessStatuses.get('c1')?.status).toBe(
        ContractAccessStatus.SETTING_UP,
      );
      expect(
        await dashboardState.getContractSyncErrors('c1', 'token-1'),
      ).toEqual(UNSYNCED_USERS_LAYER);
      expect(syncStatusSpy).toHaveBeenCalledTimes(1);
    });

    test('no more than the limit are being made at once, whoever asks for them', async () => {
      const dashboardState = await setupDashboardState('prod');
      const { spy, finish, madeFor } = holdCalls(dashboardState);
      const ids = Array.from(
        { length: SYNC_STATUS_MAX_CONCURRENT_CALLS * 2 + 2 },
        (_, i) => `c${i}`,
      );

      // each id is asked for separately, as the cells of the rows do
      ids.forEach((id) => dashboardState.requestAccessStatus(id, 'token-2'));
      await settle();
      expect(spy).toHaveBeenCalledTimes(SYNC_STATUS_MAX_CONCURRENT_CALLS);

      // one finishing lets the next one start, and the limit holds
      finish(SYNCED);
      await settle();
      expect(spy).toHaveBeenCalledTimes(SYNC_STATUS_MAX_CONCURRENT_CALLS + 1);

      ids.forEach(() => finish(SYNCED));
      await settle();
      ids.forEach(() => finish(SYNCED));
      await settle();
      expect(madeFor()).toEqual(ids);
    });

    test('a request that is cancelled before its call starts is never made', async () => {
      const dashboardState = await setupDashboardState('prod');
      const { finish, madeFor } = holdCalls(dashboardState);
      const ids = Array.from(
        { length: SYNC_STATUS_MAX_CONCURRENT_CALLS + 2 },
        (_, i) => `c${i}`,
      );
      const cancels = ids.map((id) =>
        dashboardState.requestAccessStatus(id, 'token-3'),
      );
      await settle();
      expect(madeFor()).toEqual(ids.slice(0, SYNC_STATUS_MAX_CONCURRENT_CALLS));

      // the first one waiting scrolled out of view
      guaranteeNonNullable(cancels[SYNC_STATUS_MAX_CONCURRENT_CALLS])();
      finish(SYNCED);
      await settle();

      expect(madeFor()).toEqual([
        ...ids.slice(0, SYNC_STATUS_MAX_CONCURRENT_CALLS),
        guaranteeNonNullable(ids[SYNC_STATUS_MAX_CONCURRENT_CALLS + 1]),
      ]);
    });

    test('a request asked for by two rows is only dropped when both have cancelled', async () => {
      const dashboardState = await setupDashboardState('prod');
      const { finish, madeFor } = holdCalls(dashboardState);
      Array.from({ length: SYNC_STATUS_MAX_CONCURRENT_CALLS }, (_, i) =>
        dashboardState.requestAccessStatus(`busy${i}`, 'token-4'),
      );
      const cancelFirstOfKept = dashboardState.requestAccessStatus(
        'kept',
        'token-4',
      );
      dashboardState.requestAccessStatus('kept', 'token-4');
      const cancelFirstOfDropped = dashboardState.requestAccessStatus(
        'dropped',
        'token-4',
      );
      const cancelSecondOfDropped = dashboardState.requestAccessStatus(
        'dropped',
        'token-4',
      );

      cancelFirstOfKept();
      cancelFirstOfDropped();
      cancelSecondOfDropped();
      Array.from({ length: SYNC_STATUS_MAX_CONCURRENT_CALLS }, () =>
        finish(SYNCED),
      );
      await settle();

      expect(madeFor()).toContain('kept');
      expect(madeFor()).not.toContain('dropped');
    });

    test('nothing is called again for an id that is being fetched or was fetched', async () => {
      const dashboardState = await setupDashboardState('prod');
      const { spy, finish } = holdCalls(dashboardState);

      dashboardState.requestAccessStatus('c1', 'token-5');
      dashboardState.requestAccessStatus('c1', 'token-5');
      await settle();
      expect(spy).toHaveBeenCalledTimes(1);

      finish(SYNCED);
      await settle();
      dashboardState.requestAccessStatus('c1', 'token-5');
      await settle();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    test('a call that failed shows Not checked, and is made again by the next request', async () => {
      const dashboardState = await setupDashboardState('prod');
      const syncStatusSpy = createSpy(
        dashboardState.lakehouseEntitlementsStore.lakehouseContractServerClient,
        'getContractSyncStatus',
      )
        .mockRejectedValueOnce(new Error('503'))
        .mockResolvedValue(NOT_SYNCED);

      dashboardState.requestAccessStatus('c1', 'token-6');
      await settle();
      expect(dashboardState.contractAccessStatuses.get('c1')?.status).toBe(
        ContractAccessStatus.NOT_CHECKED,
      );

      dashboardState.requestAccessStatus('c1', 'token-6');
      await settle();
      expect(dashboardState.contractAccessStatuses.get('c1')?.status).toBe(
        ContractAccessStatus.SETTING_UP,
      );
      expect(syncStatusSpy).toHaveBeenCalledTimes(2);
    });

    test('a response that cannot be used is Not checked and does not stop the other ids', async () => {
      const dashboardState = await setupDashboardState('prod');
      const alertSpy = createSpy(
        dashboardState.lakehouseEntitlementsStore.applicationStore,
        'alertUnhandledError',
      );
      createSpy(
        dashboardState.lakehouseEntitlementsStore.lakehouseContractServerClient,
        'getContractSyncStatus',
      ).mockImplementation(async (id: string) => (id === 'bad' ? {} : SYNCED));

      ['bad', 'good-1', 'good-2'].forEach((id) =>
        dashboardState.requestAccessStatus(id, 'token-7'),
      );
      await settle();

      expect(dashboardState.contractAccessStatuses.get('bad')?.status).toBe(
        ContractAccessStatus.NOT_CHECKED,
      );
      expect(dashboardState.contractAccessStatuses.get('good-1')?.status).toBe(
        ContractAccessStatus.ACTIVE,
      );
      expect(dashboardState.contractAccessStatuses.get('good-2')?.status).toBe(
        ContractAccessStatus.ACTIVE,
      );
      expect(alertSpy).not.toHaveBeenCalled();
    });

    test('opening a contract whose chip says Setting up shows why, even when no unsynced entity is listed', async () => {
      const dashboardState = await setupDashboardState('prod');
      createSpy(
        dashboardState.lakehouseEntitlementsStore.lakehouseContractServerClient,
        'getContractSyncStatus',
      ).mockResolvedValue({
        status: 'NOT_FULLY_SYNCED',
        subscriptions: [{ guid: 'sub-1' }],
      });

      dashboardState.requestAccessStatus('c1', 'token-13');
      await settle();

      expect(dashboardState.contractAccessStatuses.get('c1')?.status).toBe(
        ContractAccessStatus.SETTING_UP,
      );
      expect(
        await dashboardState.getContractSyncErrors('c1', 'token-13'),
      ).toEqual({ title: 'Approved. Waiting for access to be granted.' });
    });

    test('opening a contract whose chip says Needs attention shows the sync failures', async () => {
      const dashboardState = await setupDashboardState('prod');
      createSpy(
        dashboardState.lakehouseEntitlementsStore.lakehouseContractServerClient,
        'getContractSyncStatus',
      ).mockResolvedValue({
        status: 'NOT_FULLY_SYNCED',
        subscriptions: [{ guid: 'sub-1' }],
        syncFailures: [{ sqlStatement: 'GRANT ...', exception: 'boom' }],
      });

      dashboardState.requestAccessStatus('c1', 'token-14');
      await settle();

      expect(
        (await dashboardState.getContractSyncErrors('c1', 'token-14'))?.title,
      ).toContain('1 sync failure');
    });

    test('unsynced entities are shown rather than the reason when there are some', async () => {
      const dashboardState = await setupDashboardState('prod');
      createSpy(
        dashboardState.lakehouseEntitlementsStore.lakehouseContractServerClient,
        'getContractSyncStatus',
      ).mockResolvedValue(NOT_SYNCED);

      dashboardState.requestAccessStatus('c1', 'token-15');
      await settle();

      expect(
        await dashboardState.getContractSyncErrors('c1', 'token-15'),
      ).toEqual(UNSYNCED_USERS_LAYER);
    });

    test('nothing is shown for a contract that is fully synced', async () => {
      const dashboardState = await setupDashboardState('prod');
      createSpy(
        dashboardState.lakehouseEntitlementsStore.lakehouseContractServerClient,
        'getContractSyncStatus',
      ).mockResolvedValue(SYNCED);

      dashboardState.requestAccessStatus('c1', 'token-16');
      await settle();

      expect(
        await dashboardState.getContractSyncErrors('c1', 'token-16'),
      ).toBeUndefined();
    });

    test('the errors are reported as they come in, the unsynced entities without waiting for the missing ingests', async () => {
      const dashboardState = await setupDashboardState('prod');
      createSpy(
        dashboardState.lakehouseEntitlementsStore.lakehouseContractServerClient,
        'getContractSyncStatus',
      ).mockResolvedValue(NOT_SYNCED);
      let finishIngests: (ingests: string[]) => void = () => undefined;
      createSpy(
        dashboardState,
        'getUnverifiedIngestDefinitions',
      ).mockReturnValue(
        new Promise<string[]>((resolve) => {
          finishIngests = resolve;
        }),
      );
      const reported: (ContractErrorLayer | undefined)[] = [];

      const errors = dashboardState.getContractErrors(
        createMockLiteDataContract('c1', PROD_DEPLOYMENT_ID, 'dp-1'),
        'token-17',
        true,
        (layer) => reported.push(layer),
      );
      await settle();

      // the ingests are still being looked up, the unsynced entities are shown
      expect(reported).toEqual([
        { title: 'Contract Errors:', childLayers: [UNSYNCED_USERS_LAYER] },
      ]);

      finishIngests(['com.example::MissingIngest']);
      const result = await errors;
      expect(result?.childLayers).toEqual([
        {
          title: 'Ingest Not Found:',
          errorItems: ['com.example::MissingIngest'],
        },
        UNSYNCED_USERS_LAYER,
      ]);
      expect(reported.at(-1)).toEqual(result);
    });

    test('opening a contract while its call is being made joins that call', async () => {
      const dashboardState = await setupDashboardState('prod');
      const { spy, finish } = holdCalls(dashboardState);

      dashboardState.requestAccessStatus('c1', 'token-8');
      await settle();
      const opening = dashboardState.getContractSyncErrors('c1', 'token-8');
      finish(NOT_SYNCED);

      expect(await opening).toEqual(UNSYNCED_USERS_LAYER);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    test('opening a contract that was never requested makes the call, ahead of the queue', async () => {
      const dashboardState = await setupDashboardState('prod');
      const { spy, finish, madeFor } = holdCalls(dashboardState);
      Array.from({ length: SYNC_STATUS_MAX_CONCURRENT_CALLS + 1 }, (_, i) =>
        dashboardState.requestAccessStatus(`c${i}`, 'token-9'),
      );
      await settle();
      expect(spy).toHaveBeenCalledTimes(SYNC_STATUS_MAX_CONCURRENT_CALLS);

      const opening = dashboardState.getContractSyncErrors('opened', 'token-9');
      expect(madeFor()).toContain('opened');
      Array.from({ length: SYNC_STATUS_MAX_CONCURRENT_CALLS }, () =>
        finish(SYNCED),
      );
      finish(NOT_SYNCED);
      expect(await opening).toEqual(UNSYNCED_USERS_LAYER);
    });

    test('opening a contract whose call failed tries again', async () => {
      const dashboardState = await setupDashboardState('prod');
      const syncStatusSpy = createSpy(
        dashboardState.lakehouseEntitlementsStore.lakehouseContractServerClient,
        'getContractSyncStatus',
      )
        .mockRejectedValueOnce(new Error('503'))
        .mockResolvedValue(NOT_SYNCED);

      dashboardState.requestAccessStatus('c1', 'token-10');
      await settle();
      const layer = await dashboardState.getContractSyncErrors(
        'c1',
        'token-10',
      );

      expect(layer).toEqual(UNSYNCED_USERS_LAYER);
      expect(syncStatusSpy).toHaveBeenCalledTimes(2);
    });

    test('refreshing fetches again, and replaces the access status and the unsynced entities', async () => {
      const dashboardState = await setupDashboardState('prod');
      const syncStatusSpy = createSpy(
        dashboardState.lakehouseEntitlementsStore.lakehouseContractServerClient,
        'getContractSyncStatus',
      ).mockResolvedValue(NOT_SYNCED);
      dashboardState.requestAccessStatus('c1', 'token-11');
      await settle();
      expect(dashboardState.contractAccessStatuses.get('c1')?.status).toBe(
        ContractAccessStatus.SETTING_UP,
      );

      // the sync finished since
      syncStatusSpy.mockResolvedValue(SYNCED);
      await dashboardState.refreshAccessStatus('c1', 'token-11');

      expect(syncStatusSpy).toHaveBeenCalledTimes(2);
      expect(dashboardState.contractAccessStatuses.get('c1')?.status).toBe(
        ContractAccessStatus.ACTIVE,
      );
      expect(
        await dashboardState.getContractSyncErrors('c1', 'token-11'),
      ).toBeUndefined();
      expect(syncStatusSpy).toHaveBeenCalledTimes(2);
    });

    test('the status shown stays while a refresh is running', async () => {
      const dashboardState = await setupDashboardState('prod');
      createSpy(
        dashboardState.lakehouseEntitlementsStore.lakehouseContractServerClient,
        'getContractSyncStatus',
      ).mockResolvedValueOnce(NOT_SYNCED);
      dashboardState.requestAccessStatus('c1', 'token-12');
      await settle();

      const { finish } = holdCalls(dashboardState);
      const refreshing = dashboardState.refreshAccessStatus('c1', 'token-12');
      expect(dashboardState.contractAccessStatuses.get('c1')?.status).toBe(
        ContractAccessStatus.SETTING_UP,
      );

      finish(SYNCED);
      await refreshing;
      expect(dashboardState.contractAccessStatuses.get('c1')?.status).toBe(
        ContractAccessStatus.ACTIVE,
      );
    });
  });

  describe('getUnverifiedIngestDefinitions', () => {
    test('uses the given contract, fetches only its data product entity and reuses one graph manager', async () => {
      const dashboardState = await setupDashboardState('prod');
      const baseStore =
        dashboardState.lakehouseEntitlementsStore.marketplaceBaseStore;
      const contract = createMockLiteDataContract(
        'contract-1',
        PROD_DEPLOYMENT_ID,
        'dp-1',
      );
      contract.resourceType = V1_ResourceType.ACCESS_POINT_GROUP;
      contract.accessPointGroup = 'GROUP';
      const getDataContractSpy = createSpy(
        baseStore.lakehouseContractServerClient,
        'getDataContract',
      );
      const getDataProductByIdAndDIDSpy = createSpy(
        baseStore.lakehouseContractServerClient,
        'getDataProductByIdAndDID',
      ).mockResolvedValue(
        mockDataProductDetailsResponse_sdlc({
          deploymentId: PROD_DEPLOYMENT_ID,
          resourceId: 'dp-1',
          envType: V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
        }) as unknown as PlainObject<V1_EntitlementsDataProductDetailsResponse>,
      );
      const getVersionEntitySpy = createSpy(
        baseStore.depotServerClient,
        'getVersionEntity',
      ).mockResolvedValue({
        path: TEST_FULL_PATH,
        content: {
          _type: 'dataProduct',
          name: 'dp-1',
          package: 'test',
          accessPointGroups: [{ id: 'GROUP', accessPoints: [] }],
        },
      });
      const createInitializedGraphManagerSpy = createSpy(
        baseStore,
        'createInitializedGraphManager',
      ).mockResolvedValue({
        pluginManager: baseStore.applicationStore.pluginManager,
      } as unknown as V1_PureGraphManager);

      await dashboardState.getUnverifiedIngestDefinitions(contract, 'token-1');
      await dashboardState.getUnverifiedIngestDefinitions(contract, 'token-1');

      expect(getDataContractSpy).not.toHaveBeenCalled();
      expect(getDataProductByIdAndDIDSpy).toHaveBeenCalledTimes(1);
      expect(createInitializedGraphManagerSpy).toHaveBeenCalledTimes(1);
      expect(getVersionEntitySpy).toHaveBeenCalledWith(
        TEST_GAV.groupId,
        TEST_GAV.artifactId,
        TEST_GAV.versionId,
        TEST_FULL_PATH,
      );
    });
  });
});

describe('TaskApprovalAction', () => {
  test('is a string enum of approve/deny', () => {
    expect(TaskApprovalAction.APPROVE).toBe('approve');
    expect(TaskApprovalAction.DENY).toBe('deny');
  });
});
