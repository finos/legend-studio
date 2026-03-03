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
  type PureProtocolProcessorPlugin,
  type V1_ContractUserEventDataProducerPayload,
  type V1_ContractUserEventPrivilegeManagerPayload,
  type V1_DataContract,
  type V1_DataSubscription,
  type V1_TaskResponse,
  V1_ApprovalType,
  V1_ContractEventPayloadType,
  V1_ContractState,
  V1_dataContractModelSchema,
  V1_dataSubscriptionModelSchema,
  V1_OrganizationalScopeType,
  V1_taskResponseModelSchema,
  V1_UserApprovalStatus,
  V1_UserType,
} from '@finos/legend-graph';
import { deserialize } from 'serializr';

export const createMockContract = (
  plugins: PureProtocolProcessorPlugin[],
  overrides: Partial<V1_DataContract> & { guid: string; state: string },
): V1_DataContract =>
  deserialize(V1_dataContractModelSchema(plugins), {
    version: 0,
    description: 'Test contract',
    members: [],
    consumer: {
      _type: 'AdHocTeam',
      users: [
        {
          name: 'test-consumer-user-id',
          type: 'WORKFORCE_USER',
        },
      ],
    },
    createdBy: 'test-requester-user-id',
    createdAt: '2026-01-09T14:30:41.837Z',
    resource: {
      _type: 'AccessPointGroupReference',
      accessPointGroup: 'GROUP1',
      dataProduct: {
        name: 'MOCK_SDLC_DATAPRODUCT',
        owner: {
          appDirId: 12345,
        },
      },
    },
    ...overrides,
  }) as V1_DataContract;

export const mockContracts = {
  pendingPrivilegeManager: (plugins: PureProtocolProcessorPlugin[]) =>
    createMockContract(plugins, {
      guid: 'contract-pending-pm-id',
      state: 'OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL' as V1_ContractState,
      description: 'Test contract pending privilege manager approval',
    }),

  pendingPrivilegeManagerMultipleConsumers: (
    plugins: PureProtocolProcessorPlugin[],
  ) =>
    createMockContract(plugins, {
      guid: 'contract-pending-pm-id',
      state: 'OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL' as V1_ContractState,
      description: 'Test contract pending privilege manager approval',
      consumer: {
        _type: 'AdHocTeam',
        users: [
          {
            name: 'test-consumer-user-id-1',
            type: 'WORKFORCE_USER',
          },
          {
            name: 'test-consumer-user-id-2',
            type: 'WORKFORCE_USER',
          },
        ],
      },
    }),

  pendingPrivilegeManagerWithSystemAccountMember: (
    plugins: PureProtocolProcessorPlugin[],
  ) =>
    createMockContract(plugins, {
      description: 'Test data contract with system account member',
      guid: 'contract-pending-pm-system-account-id',
      state: 'OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL' as V1_ContractState,
      members: [
        {
          guid: 'member-1-guid',
          user: {
            name: 'test-consumer-user-id',
            userType: V1_UserType.WORKFORCE_USER,
          },
          status: V1_UserApprovalStatus.PENDING,
        },
        {
          guid: 'member-2-guid',
          user: {
            name: 'test-system-account-user-id',
            userType: V1_UserType.SYSTEM_ACCOUNT,
          },
          status: V1_UserApprovalStatus.PENDING,
        },
      ],
      consumer: {
        _type: V1_OrganizationalScopeType.AdHocTeam,
        users: [
          {
            name: 'test-consumer-user-id',
            type: V1_UserType.WORKFORCE_USER,
          },
          {
            name: 'test-system-account-user-id',
            type: V1_UserType.SYSTEM_ACCOUNT,
          },
        ],
      },
    }),

  pendingDataOwner: (plugins: PureProtocolProcessorPlugin[]) =>
    createMockContract(plugins, {
      guid: 'contract-pending-do-id',
      state: 'PENDING_DATA_OWNER_APPROVAL' as V1_ContractState,
      description: 'Test contract pending data owner approval',
    }),

  completedContract: (plugins: PureProtocolProcessorPlugin[]) =>
    createMockContract(plugins, {
      guid: 'contract-completed-id',
      state: 'COMPLETED' as V1_ContractState,
      description: 'Test completed contract',
    }),

  rejectedContract: (plugins: PureProtocolProcessorPlugin[]) =>
    createMockContract(plugins, {
      guid: 'contract-rejected-id',
      state: 'REJECTED' as V1_ContractState,
      description: 'Test rejected contract',
    }),

  pendingDataOwnerNoPrivilegeManager: (
    plugins: PureProtocolProcessorPlugin[],
  ) =>
    createMockContract(plugins, {
      guid: 'contract-no-pm-id',
      state: 'PENDING_DATA_OWNER_APPROVAL' as V1_ContractState,
      description:
        'Test contract pending data owner approval without privilege manager',
    }),

  closedContract: (plugins: PureProtocolProcessorPlugin[]) =>
    createMockContract(plugins, {
      description: 'Test closed contract',
      guid: 'contract-pending-pm-id',
      state: V1_ContractState.CLOSED,
    }),

  producerContract: (plugins: PureProtocolProcessorPlugin[]) =>
    createMockContract(plugins, {
      description: 'Test producer contract',
      guid: 'contract-producer-consumer-id',
      state: V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
      consumer: {
        _type: V1_OrganizationalScopeType.Producer,
        did: 12345,
      },
    }),
};

interface MockTaskData {
  taskId: string;
  type: V1_ApprovalType;
  status: V1_UserApprovalStatus;
  consumer: string;
  assignees: string[];
  isEscalated?: boolean;
  eventPayload?: Partial<
    | V1_ContractUserEventPrivilegeManagerPayload
    | V1_ContractUserEventDataProducerPayload
  >;
}

export const mockTasks = {
  privilegeManagerPending: {
    taskId: 'pm-task-pending-id',
    type: V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
    status: V1_UserApprovalStatus.PENDING,
    assignees: ['test-privilege-manager-user-id'],
    consumer: 'test-consumer-user-id',
  },

  privilegeManagerPendingAdditionalConsumer: {
    taskId: 'pm-task-pending-id-2',
    type: V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
    status: V1_UserApprovalStatus.PENDING,
    assignees: ['test-privilege-manager-user-id'],
    consumer: 'test-consumer-user-id-2',
  },

  privilegeManagerEscalated: {
    taskId: 'pm-task-escalated-id',
    type: V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
    status: V1_UserApprovalStatus.PENDING,
    assignees: [
      'test-privilege-manager-user-id',
      'test-privilege-manager-user-id-2',
      'test-privilege-manager-user-id-3',
    ],
    consumer: 'test-consumer-user-id',
    isEscalated: true,
  },

  privilegeManagerApproved: {
    taskId: 'pm-task-pending-id',
    type: V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
    status: V1_UserApprovalStatus.APPROVED,
    assignees: ['test-privilege-manager-user-id'],
    consumer: 'test-consumer-user-id',
    eventPayload: {
      type: V1_ContractEventPayloadType.PRIVILEGE_MANAGER_APPROVED,
      eventTimestamp: '2025-08-06T08:00:00.000Z',
      candidateIdentity: 'test-consumer-user-id',
      managerIdentity: 'test-privilege-manager-user-id',
      taskId: 'pm-task-pending-id',
    },
  },

  privilegeManagerDenied: {
    taskId: 'pm-task-denied-id',
    type: V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
    status: V1_UserApprovalStatus.DENIED,
    assignees: ['test-privilege-manager-user-id'],
    consumer: 'test-consumer-user-id',
    eventPayload: {
      type: V1_ContractEventPayloadType.PRIVILEGE_MANAGER_REJECTED,
      eventTimestamp: '2025-08-06T08:00:00.000Z',
      candidateIdentity: 'test-consumer-user-id',
      managerIdentity: 'test-privilege-manager-user-id',
      taskId: 'pm-task-denied-id',
    },
  },

  dataOwnerPending: {
    taskId: 'do-task-pending-id',
    type: V1_ApprovalType.DATA_OWNER_APPROVAL,
    status: V1_UserApprovalStatus.PENDING,
    assignees: ['test-data-owner-user-id'],
    consumer: 'test-consumer-user-id',
  },

  dataOwnerPendingMultipleAssignees: {
    taskId: 'do-task-pending-multiple-assignees-id',
    type: V1_ApprovalType.DATA_OWNER_APPROVAL,
    status: V1_UserApprovalStatus.PENDING,
    assignees: ['test-data-owner-user-id-1', 'test-data-owner-user-id-2'],
    consumer: 'test-consumer-user-id',
  },

  dataOwnerApproved: {
    taskId: 'do-task-approved-id',
    type: V1_ApprovalType.DATA_OWNER_APPROVAL,
    status: V1_UserApprovalStatus.APPROVED,
    assignees: ['test-data-owner-user-id'],
    consumer: 'test-consumer-user-id',
    eventPayload: {
      type: V1_ContractEventPayloadType.DATA_PRODUCER_APPROVED,
      eventTimestamp: '2025-08-07T08:15:00.000Z',
      candidateIdentity: 'test-consumer-user-id',
      dataProducerIdentity: 'test-data-owner-user-id',
      taskId: 'do-task-approved-id',
    },
  },

  dataOwnerDenied: {
    taskId: 'do-task-denied-id',
    type: V1_ApprovalType.DATA_OWNER_APPROVAL,
    status: V1_UserApprovalStatus.DENIED,
    assignees: ['test-data-owner-user-id'],
    consumer: 'test-consumer-user-id',
    eventPayload: {
      type: V1_ContractEventPayloadType.DATA_PRODUCER_REJECTED,
      eventTimestamp: '2025-08-07T08:15:00.000Z',
      candidateIdentity: 'test-consumer-user-id',
      dataProducerIdentity: 'test-data-owner-user-id',
      taskId: 'do-task-denied-id',
    },
  },

  closed: {
    taskId: 'closed-task-id',
    type: V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
    status: V1_UserApprovalStatus.CLOSED,
    assignees: ['test-privilege-manager-user-id'],
    consumer: 'test-consumer-user-id',
    eventPayload: {
      type: V1_ContractEventPayloadType.CLOSED,
      eventTimestamp: '2025-08-07T11:54:46.069672876Z',
    },
  },
};

export const createMockTaskResponse = (
  tasks: MockTaskData[],
): V1_TaskResponse =>
  deserialize(V1_taskResponseModelSchema, {
    tasks: tasks.map((task) => ({
      rec: {
        taskId: task.taskId,
        type: task.type,
        status: task.status,
        consumer: task.consumer,
        dataContractId: 'test-contract-id',
        effectiveFrom: '2025-08-07T00:00:00.000Z',
        effectiveTo: '2026-08-07T00:00:00.000Z',
        isEscalated: task.isEscalated ?? false,
        eventPayload: {
          type: 'SUBMITTED',
          eventTimestamp: '2025-08-05T08:00:00.069672876Z',
          ...task.eventPayload,
        },
      },
      assignees: task.assignees,
    })),
  });

export const getMockPendingManagerApprovalTasksResponse = () =>
  createMockTaskResponse([mockTasks.privilegeManagerPending]);

export const getMockPendingManagerApprovaMultipleConsumersTasksResponse = () =>
  createMockTaskResponse([
    mockTasks.privilegeManagerPending,
    mockTasks.privilegeManagerPendingAdditionalConsumer,
  ]);

export const getMockPendingManagerEscalatedTasksResponse = () =>
  createMockTaskResponse([mockTasks.privilegeManagerEscalated]);

export const getMockPendingDataOwnerApprovalTasksResponse = () =>
  createMockTaskResponse([
    mockTasks.privilegeManagerApproved,
    mockTasks.dataOwnerPending,
  ]);

export const getMockPendingDataOwnerApprovalMultipleAssigneesTasksResponse =
  () =>
    createMockTaskResponse([
      mockTasks.privilegeManagerApproved,
      mockTasks.dataOwnerPendingMultipleAssignees,
    ]);

export const getMockDeniedPrivilegeManagerTasksResponse = () =>
  createMockTaskResponse([mockTasks.privilegeManagerDenied]);

export const getMockDeniedDataOwnerTasksResponse = () =>
  createMockTaskResponse([
    mockTasks.privilegeManagerApproved,
    mockTasks.dataOwnerDenied,
  ]);

export const getMockCompletedTasksResponse = () =>
  createMockTaskResponse([
    mockTasks.privilegeManagerApproved,
    mockTasks.dataOwnerApproved,
  ]);

export const getMockNoPrivilegeManagerTasksResponse = () =>
  createMockTaskResponse([mockTasks.dataOwnerPending]);

export const getMockNoPrivilegeManagerCompletedTasksResponse = () =>
  createMockTaskResponse([mockTasks.dataOwnerApproved]);

export const getMockClosedTasksResponse = () =>
  createMockTaskResponse([mockTasks.closed]);

export const mockAutoCreatedSubscription: V1_DataSubscription = deserialize(
  V1_dataSubscriptionModelSchema,
  {
    guid: 'test-subscription-guid',
    dataContractId: 'test-data-contract-id',
    target: {
      _type: 'Snowflake',
      snowflakeAccountId: 'test-snowflake-account-id',
      snowflakeRegion: 'AWS_US_EAST_1',
      snowflakeNetwork: 'PUBLIC',
    },
    createdBy: 'test-requester-user-id',
    createdAt: '2026-01-09T14:30:41.837Z',
  },
);
