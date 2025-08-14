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
  type V1_ContractUserEventDataProducerPayload,
  type V1_ContractUserEventPrivilegeManagerPayload,
  type V1_LiteDataContract,
  type V1_TaskResponse,
  V1_ApprovalType,
  V1_ContractEventPayloadType,
  V1_ContractState,
  V1_OrganizationalScopeType,
  V1_ResourceType,
  V1_UserApprovalStatus,
  V1_UserType,
} from '@finos/legend-graph';

export const getMockDataContract = (guid: string): V1_LiteDataContract => ({
  description: 'Test contract creation request',
  guid,
  version: 0,
  state: V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
  members: [],
  consumer: {
    _type: V1_OrganizationalScopeType.AdHocTeam,
    users: [
      {
        name: 'test-consumer-user-id',
        type: V1_UserType.WORKFORCE_USER,
      },
    ],
  },
  createdBy: 'test-requester-user-id',
  resourceId: 'MOCK_SDLC_DATAPRODUCT',
  resourceType: V1_ResourceType.ACCESS_POINT_GROUP,
  deploymentId: 11111,
  accessPointGroup: 'GROUP1',
});

export const getMockPendingManagerApprovalTasksResponse = (
  dataContractId: string,
): V1_TaskResponse => ({
  tasks: [
    {
      assignees: ['test-privilege-manager-user-id'],
      rec: {
        consumer: 'test-consumer-user-id',
        dataContractId,
        eventPayload: {
          type: V1_ContractEventPayloadType.SUBMITTED,
          eventTimestamp: '2025-08-06T20:54:46.069672876Z',
        },
        status: V1_UserApprovalStatus.PENDING,
        taskId: 'mock-privilege-manager-approval-task-id',
        type: V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
      },
    },
  ],
});

export const getMockPendingDataOwnerApprovalTasksResponse = (
  dataContractId: string,
): V1_TaskResponse => ({
  tasks: [
    {
      assignees: ['test-privilege-manager-user-id'],
      rec: {
        consumer: 'test-consumer-user-id',
        dataContractId,
        eventPayload: {
          type: V1_ContractEventPayloadType.PRIVILEGE_MANAGER_APPROVED,
          candidateIdentity: 'test-consumer-user-id',
          eventTimestamp: '2025-08-06T20:54:46.069672876Z',
          managerIdentity: 'test-privilege-manager-user-id',
          taskId: 'mock-privilege-manager-approval-task-id',
        } as V1_ContractUserEventPrivilegeManagerPayload,
        status: V1_UserApprovalStatus.APPROVED,
        taskId: 'mock-privilege-manager-approval-task-id',
        type: V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
      },
    },
    {
      assignees: ['test-data-owner-user-id'],
      rec: {
        consumer: 'test-consumer-user-id',
        dataContractId,
        eventPayload: {
          type: V1_ContractEventPayloadType.PRIVILEGE_MANAGER_APPROVED,
          candidateIdentity: 'test-consumer-user-id',
          eventTimestamp: '2025-08-06T20:54:46.069672876Z',
          managerIdentity: 'test-privilege-manager-user-id',
          taskId: 'mock-data-owner-approval-task-id',
        } as V1_ContractUserEventPrivilegeManagerPayload,
        status: V1_UserApprovalStatus.PENDING,
        taskId: 'mock-data-owner-approval-task-id',
        type: V1_ApprovalType.DATA_OWNER_APPROVAL,
      },
    },
  ],
});

export const getMockApprovedTasksResponse = (
  dataContractId: string,
): V1_TaskResponse => ({
  tasks: [
    {
      assignees: ['test-privilege-manager-user-id'],
      rec: {
        consumer: 'test-consumer-user-id',
        dataContractId,
        eventPayload: {
          type: V1_ContractEventPayloadType.PRIVILEGE_MANAGER_APPROVED,
          candidateIdentity: 'test-consumer-user-id',
          eventTimestamp: '2025-08-06T20:54:46.069672876Z',
          managerIdentity: 'test-privilege-manager-user-id',
          taskId: 'mock-privilege-manager-approval-task-id',
        } as V1_ContractUserEventPrivilegeManagerPayload,
        status: V1_UserApprovalStatus.APPROVED,
        taskId: 'mock-privilege-manager-approval-task-id',
        type: V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
      },
    },
    {
      assignees: ['test-data-owner-user-id'],
      rec: {
        consumer: 'test-consumer-user-id',
        dataContractId,
        eventPayload: {
          type: V1_ContractEventPayloadType.DATA_PRODUCER_APPROVED,
          candidateIdentity: 'test-consumer-user-id',
          eventTimestamp: '2025-08-07T20:54:46.069672876Z',
          dataProducerIdentity: 'test-privilege-manager-user-id',
          taskId: 'mock-data-owner-approval-task-id',
        } as V1_ContractUserEventDataProducerPayload,
        status: V1_UserApprovalStatus.APPROVED,
        taskId: 'mock-data-owner-approval-task-id',
        type: V1_ApprovalType.DATA_OWNER_APPROVAL,
      },
    },
  ],
});

export const getMockDeniedTasksResponse = (
  dataContractId: string,
): V1_TaskResponse => ({
  tasks: [
    {
      assignees: ['test-privilege-manager-user-id'],
      rec: {
        consumer: 'test-consumer-user-id',
        dataContractId,
        eventPayload: {
          type: V1_ContractEventPayloadType.PRIVILEGE_MANAGER_REJECTED,
          candidateIdentity: 'test-consumer-user-id',
          eventTimestamp: '2025-08-06T20:54:46.069672876Z',
          managerIdentity: 'test-privilege-manager-user-id',
          taskId: 'mock-privilege-manager-denied-task-id',
        } as V1_ContractUserEventPrivilegeManagerPayload,
        status: V1_UserApprovalStatus.DENIED,
        taskId: 'mock-privilege-manager-denied-task-id',
        type: V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
      },
    },
  ],
});
