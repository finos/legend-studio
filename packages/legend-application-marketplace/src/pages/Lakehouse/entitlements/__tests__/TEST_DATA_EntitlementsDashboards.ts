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

export const PROD_DEPLOYMENT_ID = 100;
export const PROD_PAR_DEPLOYMENT_ID = 200;

export const createMockRawDataContractResponse = (
  contractId: string,
  description: string,
  deploymentId: number,
) => ({
  dataContracts: [
    {
      dataContract: {
        description,
        guid: contractId,
        resource: {
          _type: 'AccessPointGroupReference',
          dataProduct: {
            name: 'TestDataProduct',
            owner: { appDirId: deploymentId },
          },
          accessPointGroup: 'TestAPG',
        },
        consumer: { _type: 'AdHocTeam', users: [] },
      },
    },
  ],
});

export const createMockRawContractForUserResponse = (
  guid: string,
  description: string,
  state: string,
  status: string,
  deploymentId: number,
) => ({
  contractResultLite: {
    description,
    guid,
    state,
    consumer: { _type: 'AdHocTeam', users: [] },
    resourceId: 'TestDataProduct',
    deploymentId,
  },
  status,
  user: 'test-consumer-user-id',
});

export const createMockDataProductDetailsResponse = (deploymentId: number) => ({
  dataProducts: [
    {
      lakehouseEnvironment: {
        type:
          deploymentId === PROD_DEPLOYMENT_ID
            ? 'PRODUCTION'
            : 'PRODUCTION_PARALLEL',
      },
      origin: { type: 'SdlcDeployment' },
      dataProduct: { owner: {} },
    },
  ],
});

export const taskContractDescriptions: Record<
  string,
  { description: string; deploymentId: number }
> = {
  'contract-pm-prod-1': {
    description: 'Prod PM task 1',
    deploymentId: PROD_DEPLOYMENT_ID,
  },
  'contract-pm-prod-2': {
    description: 'Prod PM task 2',
    deploymentId: PROD_DEPLOYMENT_ID,
  },
  'contract-pm-pp-1': {
    description: 'ProdPar PM task 1',
    deploymentId: PROD_PAR_DEPLOYMENT_ID,
  },
  'contract-pm-pp-2': {
    description: 'ProdPar PM task 2',
    deploymentId: PROD_PAR_DEPLOYMENT_ID,
  },
  'contract-do-prod-1': {
    description: 'Prod DO task 1',
    deploymentId: PROD_DEPLOYMENT_ID,
  },
  'contract-do-prod-2': {
    description: 'Prod DO task 2',
    deploymentId: PROD_DEPLOYMENT_ID,
  },
  'contract-do-pp-1': {
    description: 'ProdPar DO task 1',
    deploymentId: PROD_PAR_DEPLOYMENT_ID,
  },
  'contract-do-pp-2': {
    description: 'ProdPar DO task 2',
    deploymentId: PROD_PAR_DEPLOYMENT_ID,
  },
};

export const mockPendingTasksRawResponse = {
  privilegeManager: [
    {
      taskId: 'pm-task-prod-1',
      dataContractId: 'contract-pm-prod-1',
      status: 'PENDING',
      consumer: 'user1',
      type: 'CONSUMER_PRIVILEGE_MANAGER_APPROVAL',
    },
    {
      taskId: 'pm-task-prod-2',
      dataContractId: 'contract-pm-prod-2',
      status: 'PENDING',
      consumer: 'user2',
      type: 'CONSUMER_PRIVILEGE_MANAGER_APPROVAL',
    },
    {
      taskId: 'pm-task-pp-1',
      dataContractId: 'contract-pm-pp-1',
      status: 'PENDING',
      consumer: 'user3',
      type: 'CONSUMER_PRIVILEGE_MANAGER_APPROVAL',
    },
    {
      taskId: 'pm-task-pp-2',
      dataContractId: 'contract-pm-pp-2',
      status: 'PENDING',
      consumer: 'user4',
      type: 'CONSUMER_PRIVILEGE_MANAGER_APPROVAL',
    },
  ],
  dataOwner: [
    {
      taskId: 'do-task-prod-1',
      dataContractId: 'contract-do-prod-1',
      status: 'PENDING',
      consumer: 'user5',
      type: 'DATA_OWNER_APPROVAL',
    },
    {
      taskId: 'do-task-prod-2',
      dataContractId: 'contract-do-prod-2',
      status: 'PENDING',
      consumer: 'user6',
      type: 'DATA_OWNER_APPROVAL',
    },
    {
      taskId: 'do-task-pp-1',
      dataContractId: 'contract-do-pp-1',
      status: 'PENDING',
      consumer: 'user7',
      type: 'DATA_OWNER_APPROVAL',
    },
    {
      taskId: 'do-task-pp-2',
      dataContractId: 'contract-do-pp-2',
      status: 'PENDING',
      consumer: 'user8',
      type: 'DATA_OWNER_APPROVAL',
    },
  ],
};

export const mockContractsForUserRawResponse = [
  createMockRawContractForUserResponse(
    'pending-prod-1',
    'Prod pending contract 1',
    'OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL',
    'PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL',
    PROD_DEPLOYMENT_ID,
  ),
  createMockRawContractForUserResponse(
    'pending-prod-2',
    'Prod pending contract 2',
    'OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL',
    'PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL',
    PROD_DEPLOYMENT_ID,
  ),
  createMockRawContractForUserResponse(
    'pending-pp-1',
    'ProdPar pending contract 1',
    'OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL',
    'PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL',
    PROD_PAR_DEPLOYMENT_ID,
  ),
  createMockRawContractForUserResponse(
    'pending-pp-2',
    'ProdPar pending contract 2',
    'OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL',
    'PENDING_CONSUMER_PRIVILEGE_MANAGER_APPROVAL',
    PROD_PAR_DEPLOYMENT_ID,
  ),
  createMockRawContractForUserResponse(
    'closed-prod-1',
    'Prod closed contract 1',
    'COMPLETED',
    'APPROVED',
    PROD_DEPLOYMENT_ID,
  ),
  createMockRawContractForUserResponse(
    'closed-prod-2',
    'Prod closed contract 2',
    'COMPLETED',
    'APPROVED',
    PROD_DEPLOYMENT_ID,
  ),
  createMockRawContractForUserResponse(
    'closed-pp-1',
    'ProdPar closed contract 1',
    'COMPLETED',
    'APPROVED',
    PROD_PAR_DEPLOYMENT_ID,
  ),
  createMockRawContractForUserResponse(
    'closed-pp-2',
    'ProdPar closed contract 2',
    'COMPLETED',
    'APPROVED',
    PROD_PAR_DEPLOYMENT_ID,
  ),
];
