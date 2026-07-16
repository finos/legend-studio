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

import { describe, test, expect } from '@jest/globals';
import {
  type V1_LiteDataContract,
  type V1_TaskMetadata,
  type V1_ContractUserEventRecord,
  V1_AdhocTeam,
  V1_ApprovalType,
  V1_ContractState,
  V1_ResourceType,
  V1_UserApprovalStatus,
  V1_UserType,
  V1_User,
  V1_ContractEventPayloadType,
  V1_ContractUserEventPrivilegeManagerPayload,
  V1_ContractUserEventDataProducerPayload,
} from '@finos/legend-graph';
import {
  ApplicationStore,
  LegendApplicationConfig,
  type LegendApplicationPlugin,
  LegendApplicationPluginManager,
} from '@finos/legend-application';
import { TEST__getApplicationVersionData } from '@finos/legend-application/test';
import type { LakehouseContractServerClient } from '@finos/legend-server-lakehouse';
import { DataContractViewerState } from '../DataContractViewerState.js';
import { TimelineStepStatus } from '../DataAccessRequestState.js';

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
  currentUser = 'test-user',
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

const createAdhocTeamConsumer = (users: string[]): V1_AdhocTeam => {
  const team = new V1_AdhocTeam();
  team.users = users.map((name) => {
    const u = new V1_User();
    u.name = name;
    u.userType = V1_UserType.WORKFORCE_USER;
    return u;
  });
  return team;
};

const createLiteContract = (
  overrides: Partial<{
    guid: string;
    state: V1_ContractState;
    consumer: V1_AdhocTeam;
    resourceType: V1_ResourceType;
  }> = {},
): V1_LiteDataContract =>
  ({
    guid: overrides.guid ?? 'contract-1',
    description: 'Test contract',
    members: [],
    consumer: overrides.consumer ?? createAdhocTeamConsumer(['user-a']),
    createdBy: 'creator',
    createdAt: '2026-01-01T00:00:00Z',
    resourceId: 'TestProduct',
    resourceType: overrides.resourceType ?? V1_ResourceType.ACCESS_POINT_GROUP,
    deploymentId: 123,
    accessPointGroup: 'GROUP1',
    version: 1,
    state:
      overrides.state ?? V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
  }) as unknown as V1_LiteDataContract;

const createTaskMetadata = (
  overrides: Partial<{
    taskId: string;
    type: V1_ApprovalType;
    status: V1_UserApprovalStatus;
    consumer: string;
    assignees: string[];
    isEscalated: boolean;
    eventPayload: unknown;
  }>,
): V1_TaskMetadata => ({
  rec: {
    taskId: overrides.taskId ?? 'task-1',
    dataContractId: 'contract-1',
    type: overrides.type ?? V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
    status: overrides.status ?? V1_UserApprovalStatus.PENDING,
    consumer: overrides.consumer ?? 'user-a',
    effectiveFrom: '2026-01-01T00:00:00Z',
    effectiveTo: '9999-12-31T23:59:59Z',
    isEscalated: overrides.isEscalated ?? false,
    eventPayload: overrides.eventPayload ?? {
      type: V1_ContractEventPayloadType.SUBMITTED,
      eventTimestamp: '2026-01-01T00:00:00Z',
    },
  } as unknown as V1_ContractUserEventRecord,
  assignees: overrides.assignees ?? ['approver-1'],
});

const createState = (
  liteContract: V1_LiteDataContract,
  tasks: V1_TaskMetadata[] | undefined = undefined,
  currentUser = 'test-user',
): DataContractViewerState => {
  const appStore = createTestApplicationStore(currentUser);
  const mockClient = {} as unknown as LakehouseContractServerClient;
  const mockGraphState = {
    pluginManager: appStore.pluginManager,
  } as never;

  const state = new DataContractViewerState(
    liteContract,
    (contractId, taskId) => `/entitlements/${contractId}/${taskId}`,
    undefined,
    appStore,
    mockClient,
    mockGraphState,
    undefined,
  );
  state.setAssociatedTasks(tasks);
  return state;
};

// -------------------------------- Tests --------------------------------

describe('DataContractViewerState', () => {
  describe('getTimelineSteps', () => {
    test('returns empty when resourceType is not ACCESS_POINT_GROUP', () => {
      const contract = createLiteContract({
        resourceType: V1_ResourceType.UNKNOWN,
      });
      const state = createState(contract, []);
      expect(state.getTimelineSteps('user-a')).toEqual([]);
    });

    test('PM skipped and DO active with assignees when only DO task exists', () => {
      const contract = createLiteContract({
        state: V1_ContractState.PENDING_DATA_OWNER_APPROVAL,
      });
      const doTask = createTaskMetadata({
        taskId: 'do-task-1',
        type: V1_ApprovalType.DATA_OWNER_APPROVAL,
        status: V1_UserApprovalStatus.PENDING,
        consumer: 'user-a',
        assignees: ['owner-1', 'owner-2'],
      });
      const state = createState(contract, [doTask]);
      const steps = state.getTimelineSteps('user-a');

      expect(steps[1]?.status).toBe(TimelineStepStatus.SKIPPED);
      expect(steps[2]?.status).toBe(TimelineStepStatus.ACTIVE);
      expect(steps[2]?.assignees).toEqual(['owner-1', 'owner-2']);
      expect(steps[3]?.status).toBe(TimelineStepStatus.UPCOMING);
    });

    test('non-AdhocTeam consumer matches all tasks regardless of selectedTargetUser', () => {
      // Use a non-AdhocTeam consumer (falls through to return true)
      const contract = createLiteContract();
      // Override consumer to a non-AdhocTeam
      (contract as unknown as { consumer: object }).consumer = {
        _type: 'RMS',
        rmsNode: 'OC_GRO123',
      };
      const doTask = createTaskMetadata({
        taskId: 'do-task-1',
        type: V1_ApprovalType.DATA_OWNER_APPROVAL,
        status: V1_UserApprovalStatus.PENDING,
        consumer: 'some-rms-consumer',
        assignees: ['owner-1'],
      });
      const state = createState(contract, [doTask]);
      // selectedTargetUser doesn't match task.rec.consumer but should still work
      const steps = state.getTimelineSteps('whatever-display-string');

      expect(steps[2]?.status).toBe(TimelineStepStatus.ACTIVE);
      expect(steps[2]?.assignees).toEqual(['owner-1']);
    });

    test('completed contract with no tasks shows all steps complete', () => {
      const contract = createLiteContract({
        state: V1_ContractState.COMPLETED,
      });
      const state = createState(contract, []);
      const steps = state.getTimelineSteps('user-a');

      expect(steps[0]?.status).toBe(TimelineStepStatus.COMPLETE); // submitted
      expect(steps[1]?.status).toBe(TimelineStepStatus.SKIPPED); // PM
      expect(steps[2]?.status).toBe(TimelineStepStatus.COMPLETE); // DO
      expect(steps[3]?.status).toBe(TimelineStepStatus.COMPLETE); // complete
    });

    test('rejected contract with no tasks shows DO and complete as upcoming', () => {
      const contract = createLiteContract({
        state: V1_ContractState.REJECTED,
      });
      const state = createState(contract, []);
      const steps = state.getTimelineSteps('user-a');

      expect(steps[1]?.status).toBe(TimelineStepStatus.SKIPPED); // PM
      expect(steps[2]?.status).toBe(TimelineStepStatus.UPCOMING); // DO
      expect(steps[3]?.status).toBe(TimelineStepStatus.UPCOMING); // complete
    });

    test('PM denied cascades DO and complete to upcoming', () => {
      const contract = createLiteContract({
        state: V1_ContractState.REJECTED,
      });
      const pmTask = createTaskMetadata({
        taskId: 'pm-task-1',
        type: V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
        status: V1_UserApprovalStatus.DENIED,
        consumer: 'user-a',
        assignees: ['pm-user'],
      });
      const doTask = createTaskMetadata({
        taskId: 'do-task-1',
        type: V1_ApprovalType.DATA_OWNER_APPROVAL,
        status: V1_UserApprovalStatus.PENDING,
        consumer: 'user-a',
        assignees: ['owner-1'],
      });
      const state = createState(contract, [pmTask, doTask]);
      const steps = state.getTimelineSteps('user-a');

      expect(steps[1]?.status).toBe(TimelineStepStatus.DENIED); // PM
      expect(steps[2]?.status).toBe(TimelineStepStatus.UPCOMING); // DO (cascaded)
      expect(steps[3]?.status).toBe(TimelineStepStatus.UPCOMING); // complete
    });

    test('PM approved and DO approved shows all complete', () => {
      const contract = createLiteContract({
        state: V1_ContractState.COMPLETED,
      });
      const pmPayload = new V1_ContractUserEventPrivilegeManagerPayload();
      pmPayload.type = V1_ContractEventPayloadType.PRIVILEGE_MANAGER_APPROVED;
      pmPayload.eventTimestamp = '2026-01-02T00:00:00Z';
      pmPayload.managerIdentity = 'pm-user';
      pmPayload.candidateIdentity = 'user-a';
      pmPayload.taskId = 'pm-task-1';

      const doPayload = new V1_ContractUserEventDataProducerPayload();
      doPayload.type = V1_ContractEventPayloadType.DATA_PRODUCER_APPROVED;
      doPayload.eventTimestamp = '2026-01-03T00:00:00Z';
      doPayload.dataProducerIdentity = 'owner-1';
      doPayload.candidateIdentity = 'user-a';
      doPayload.taskId = 'do-task-1';

      const pmTask = createTaskMetadata({
        taskId: 'pm-task-1',
        type: V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
        status: V1_UserApprovalStatus.APPROVED,
        consumer: 'user-a',
        assignees: ['pm-user'],
        eventPayload: pmPayload,
      });
      const doTask = createTaskMetadata({
        taskId: 'do-task-1',
        type: V1_ApprovalType.DATA_OWNER_APPROVAL,
        status: V1_UserApprovalStatus.APPROVED,
        consumer: 'user-a',
        assignees: ['owner-1'],
        eventPayload: doPayload,
      });
      const state = createState(contract, [pmTask, doTask]);
      const steps = state.getTimelineSteps('user-a');

      expect(steps[1]?.status).toBe(TimelineStepStatus.COMPLETE);
      expect(steps[1]?.approvalPayload?.approverId).toBe('pm-user');
      expect(steps[2]?.status).toBe(TimelineStepStatus.COMPLETE);
      expect(steps[2]?.approvalPayload?.approverId).toBe('owner-1');
      expect(steps[3]?.status).toBe(TimelineStepStatus.COMPLETE);
    });

    test('AdhocTeam task matching only returns tasks for selected user', () => {
      const contract = createLiteContract({
        consumer: createAdhocTeamConsumer(['user-a', 'user-b']),
      });
      const pmTaskA = createTaskMetadata({
        taskId: 'pm-task-a',
        type: V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
        status: V1_UserApprovalStatus.PENDING,
        consumer: 'user-a',
        assignees: ['pm-user'],
      });
      const pmTaskB = createTaskMetadata({
        taskId: 'pm-task-b',
        type: V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
        status: V1_UserApprovalStatus.APPROVED,
        consumer: 'user-b',
        assignees: ['pm-user'],
      });
      const state = createState(contract, [pmTaskA, pmTaskB]);

      // Viewing user-a: PM should be active
      const stepsA = state.getTimelineSteps('user-a');
      expect(stepsA[1]?.status).toBe(TimelineStepStatus.ACTIVE);

      // Viewing user-b: PM should be complete
      const stepsB = state.getTimelineSteps('user-b');
      expect(stepsB[1]?.status).toBe(TimelineStepStatus.COMPLETE);
    });

    test('DO denied keeps completion step as upcoming', () => {
      const contract = createLiteContract({
        state: V1_ContractState.REJECTED,
      });
      const pmTask = createTaskMetadata({
        taskId: 'pm-task-1',
        type: V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
        status: V1_UserApprovalStatus.APPROVED,
        consumer: 'user-a',
        assignees: ['pm-user'],
      });
      const doTask = createTaskMetadata({
        taskId: 'do-task-1',
        type: V1_ApprovalType.DATA_OWNER_APPROVAL,
        status: V1_UserApprovalStatus.DENIED,
        consumer: 'user-a',
        assignees: ['owner-1'],
      });
      const state = createState(contract, [pmTask, doTask]);
      const steps = state.getTimelineSteps('user-a');

      expect(steps[1]?.status).toBe(TimelineStepStatus.COMPLETE); // PM approved
      expect(steps[2]?.status).toBe(TimelineStepStatus.DENIED); // DO denied
      expect(steps[3]?.status).toBe(TimelineStepStatus.UPCOMING); // not complete
    });

    test('escalation button shown when PM is active and selectedTargetUser is current user', () => {
      const contract = createLiteContract({
        state: V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
      });
      const pmTask = createTaskMetadata({
        taskId: 'pm-task-1',
        type: V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
        status: V1_UserApprovalStatus.PENDING,
        consumer: 'test-user',
        assignees: ['pm-user'],
      });
      // currentUser is 'test-user' and selectedTargetUser is also 'test-user'
      const state = createState(contract, [pmTask], 'test-user');
      const steps = state.getTimelineSteps('test-user');

      expect(steps[1]?.status).toBe(TimelineStepStatus.ACTIVE);
      expect(steps[1]?.label.showEscalateButton).toBe(true);
      expect(steps[1]?.label.isEscalatable).toBe(true);
      expect(steps[1]?.label.isEscalated).toBe(false);
    });

    test('escalation button not shown when selectedTargetUser differs from current user', () => {
      const contract = createLiteContract({
        state: V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
      });
      const pmTask = createTaskMetadata({
        taskId: 'pm-task-1',
        type: V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
        status: V1_UserApprovalStatus.PENDING,
        consumer: 'other-user',
        assignees: ['pm-user'],
      });
      // currentUser is 'test-user' but selectedTargetUser is 'other-user'
      const state = createState(contract, [pmTask], 'test-user');
      const steps = state.getTimelineSteps('other-user');

      expect(steps[1]?.status).toBe(TimelineStepStatus.ACTIVE);
      expect(steps[1]?.label.showEscalateButton).toBe(false);
      expect(steps[1]?.label.isEscalatable).toBe(false);
    });

    test('already escalated task shows isEscalated true and isEscalatable false', () => {
      const contract = createLiteContract({
        state: V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
      });
      const pmTask = createTaskMetadata({
        taskId: 'pm-task-1',
        type: V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
        status: V1_UserApprovalStatus.PENDING,
        consumer: 'test-user',
        assignees: ['pm-user'],
        isEscalated: true,
      });
      const state = createState(contract, [pmTask], 'test-user');
      const steps = state.getTimelineSteps('test-user');

      expect(steps[1]?.label.showEscalateButton).toBe(true);
      expect(steps[1]?.label.isEscalatable).toBe(false);
      expect(steps[1]?.label.isEscalated).toBe(true);
    });

    test('tasks undefined (still loading) renders sensible defaults', () => {
      const contract = createLiteContract({
        state: V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
      });
      const state = createState(contract, undefined);
      const steps = state.getTimelineSteps('user-a');

      expect(steps[0]?.status).toBe(TimelineStepStatus.COMPLETE); // submitted
      expect(steps[1]?.status).toBe(TimelineStepStatus.SKIPPED); // PM (no task found)
      expect(steps[2]?.status).toBe(TimelineStepStatus.UPCOMING); // DO
      expect(steps[3]?.status).toBe(TimelineStepStatus.UPCOMING); // complete
    });
  });
});
