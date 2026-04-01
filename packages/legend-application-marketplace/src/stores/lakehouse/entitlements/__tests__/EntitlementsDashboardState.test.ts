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

import { describe, test, expect } from '@jest/globals';
import {
  V1_LiteDataContract,
  V1_LiteDataContractWithUserStatus,
  V1_ContractUserEventRecord,
  V1_EntitlementsLakehouseEnvironmentType,
} from '@finos/legend-graph';
import { TEST__provideMockLegendMarketplaceBaseStore } from '../../../../components/__test-utils__/LegendMarketplaceStoreTestUtils.js';
import {
  EntitlementsDashboardState,
  ContractCreatedByUserDetails,
} from '../EntitlementsDashboardState.js';
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
): {
  filteredTasks: V1_ContractUserEventRecord[];
  filteredContractsForUser: V1_LiteDataContractWithUserStatus[];
  filteredCreatedByUserMap: Map<string, ContractCreatedByUserDetails>;
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
        envMap: Map<number, string>,
      ) => {
        filteredTasks: V1_ContractUserEventRecord[];
        filteredContractsForUser: V1_LiteDataContractWithUserStatus[];
        filteredCreatedByUserMap: Map<string, ContractCreatedByUserDetails>;
      };
    }
  ).filterByUserEnvironment(
    pendingData,
    contractsForUser,
    contractsCreatedByUserMap,
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
});
