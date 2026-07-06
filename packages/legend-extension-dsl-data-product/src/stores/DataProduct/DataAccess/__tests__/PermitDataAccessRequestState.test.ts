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
  V1_AccessPointGroupReference,
  V1_AdhocTeam,
  V1_AppDirLevel,
  V1_AppDirNode,
  V1_DataOwnerApprovalTask,
  V1_DataRequest,
  V1_DataRequestWithWorkflow,
  V1_EntitlementsDataProduct,
  V1_PrivilegeManagerApprovalTask,
  V1_RequestState,
  V1_ResourceType,
  V1_User,
  V1_Workflow,
  V1_WorkflowStatus,
  V1_WorkflowTaskAction,
  V1_WorkflowTaskStatus,
} from '@finos/legend-graph';
import {
  ApplicationStore,
  LegendApplicationConfig,
  type LegendApplicationPlugin,
  LegendApplicationPluginManager,
} from '@finos/legend-application';
import { TEST__getApplicationVersionData } from '@finos/legend-application/test';
import {
  PermitWorkflowServerClient,
  type PermitWorkflowServerClientConfig,
} from '@finos/legend-server-lakehouse';
import {
  PermitDataAccessRequestState,
  type PermitDataAccessRequestStateOptions,
} from '../PermitDataAccessRequestState.js';
import { DataAccessRequestStatus } from '../DataAccessRequestState.js';

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

const createTestPermitClient = (): PermitWorkflowServerClient => {
  const config: PermitWorkflowServerClientConfig = {
    authBaseUrl: 'http://test-auth',
    workflowBaseUrl: 'http://test-workflow',
  };
  return new PermitWorkflowServerClient(config);
};

const createMockDataProduct = (): V1_EntitlementsDataProduct => {
  const dp = new V1_EntitlementsDataProduct();
  dp.name = 'TestProduct';
  const owner = new V1_AppDirNode();
  owner.appDirId = 123;
  owner.level = V1_AppDirLevel.APPLICATION;
  dp.owner = owner;
  return dp;
};

const createMockResource = (): V1_AccessPointGroupReference => {
  const ref = new V1_AccessPointGroupReference();
  ref.dataProduct = createMockDataProduct();
  ref.accessPointGroup = 'TestAPG';
  return ref;
};

const createMockConsumer = (): V1_AdhocTeam => {
  const team = new V1_AdhocTeam();
  const user = new V1_User();
  user.name = 'consumer-user';
  team.users = [user];
  return team;
};

const createMockDataRequest = (
  state: V1_RequestState = V1_RequestState.SUBMITTED_FOR_APPROVALS,
): V1_DataRequest => {
  const req = new V1_DataRequest();
  req.businessJustification = 'Test justification';
  req.guid = 'req-1';
  req.version = 1;
  req.state = state;
  req.resource = createMockResource();
  req.resourceEnvType = 'PRODUCTION';
  req.consumer = createMockConsumer();
  req.createdBy = 'requester-user';
  req.members = [];
  return req;
};

const createMockPmTask = (
  overrides: Partial<{
    taskId: string;
    status: V1_WorkflowTaskStatus;
    action: V1_WorkflowTaskAction;
    assignees: string[];
  }> = {},
): V1_PrivilegeManagerApprovalTask => {
  const task = new V1_PrivilegeManagerApprovalTask();
  task.taskId = overrides.taskId ?? 'pm-task-1';
  task.status = overrides.status ?? V1_WorkflowTaskStatus.OPEN;
  task.createdOn = new Date('2026-01-01');
  task.assignees = overrides.assignees ?? ['pm-user'];
  task.url = 'http://task/pm-task-1';
  task.resourceId = 'TestProduct';
  task.accessPointGroup = 'TestAPG';
  task.consumer = createMockConsumer();
  if (overrides.action !== undefined) {
    task.action = overrides.action;
  }
  return task;
};

const createMockDoTask = (
  overrides: Partial<{
    taskId: string;
    status: V1_WorkflowTaskStatus;
    action: V1_WorkflowTaskAction;
    assignees: string[];
  }> = {},
): V1_DataOwnerApprovalTask => {
  const task = new V1_DataOwnerApprovalTask();
  task.taskId = overrides.taskId ?? 'do-task-1';
  task.status = overrides.status ?? V1_WorkflowTaskStatus.OPEN;
  task.createdOn = new Date('2026-01-02');
  task.assignees = overrides.assignees ?? ['do-user'];
  task.url = 'http://task/do-task-1';
  task.resourceId = 'TestProduct';
  task.deploymentId = '123';
  task.accessPointGroup = 'TestAPG';
  task.consumer = createMockConsumer();
  if (overrides.action !== undefined) {
    task.action = overrides.action;
  }
  return task;
};

const createMockWorkflow = (
  tasks: (V1_PrivilegeManagerApprovalTask | V1_DataOwnerApprovalTask)[] = [],
): V1_Workflow => {
  const wf = new V1_Workflow();
  wf.workflowId = 'wf-1';
  wf.dataRequestId = 'req-1';
  wf.status = V1_WorkflowStatus.OPEN;
  wf.tasks = tasks;
  wf.url = 'http://workflow/wf-1';
  return wf;
};

const createMockDataRequestWithWorkflow = (
  state: V1_RequestState = V1_RequestState.SUBMITTED_FOR_APPROVALS,
  tasks: (V1_PrivilegeManagerApprovalTask | V1_DataOwnerApprovalTask)[] = [],
): V1_DataRequestWithWorkflow => {
  const drww = new V1_DataRequestWithWorkflow();
  drww.dataRequest = createMockDataRequest(state);
  drww.workflows = [createMockWorkflow(tasks)];
  return drww;
};

const createState = (
  initialData?: V1_DataRequestWithWorkflow,
  options: {
    currentUser?: string;
    permitClient?: PermitWorkflowServerClient;
    getTaskPageUrl?: (id: string) => string;
  } = {},
): PermitDataAccessRequestState => {
  const appStore = createTestApplicationStore(
    options.currentUser ?? 'test-user',
  );
  const stateOptions: PermitDataAccessRequestStateOptions = {
    ...(initialData !== undefined ? { initialData } : {}),
    ...(options.getTaskPageUrl !== undefined
      ? { getTaskPageUrl: options.getTaskPageUrl }
      : {}),
  };
  return new PermitDataAccessRequestState(
    'req-1',
    appStore,
    options.permitClient,
    undefined,
    stateOptions,
  );
};

// -------------------------------- Tests --------------------------------

describe('PermitDataAccessRequestState', () => {
  describe('constructor and initial state', () => {
    test('should initialize with provided data', () => {
      const data = createMockDataRequestWithWorkflow();
      const state = createState(data);

      expect(state.dataAccessRequestId).toBe('req-1');
      expect(state.dataRequestWithWorkflow).toBe(data);
    });

    test('should mark initialization complete when no fetchFresh and no permitClient', () => {
      const data = createMockDataRequestWithWorkflow();
      const state = createState(data);

      expect(state.initializationState.hasCompleted).toBe(true);
    });

    test('should not mark initialization complete when permitClient is present', () => {
      const data = createMockDataRequestWithWorkflow();
      const state = createState(data, {
        permitClient: createTestPermitClient(),
      });

      expect(state.initializationState.hasCompleted).toBe(false);
    });
  });

  describe('computed properties', () => {
    test('guid returns dataAccessRequestId', () => {
      const state = createState(createMockDataRequestWithWorkflow());
      expect(state.guid).toBe('req-1');
    });

    test('description returns businessJustification', () => {
      const state = createState(createMockDataRequestWithWorkflow());
      expect(state.description).toBe('Test justification');
    });

    test('createdBy returns dataRequest.createdBy', () => {
      const state = createState(createMockDataRequestWithWorkflow());
      expect(state.createdBy).toBe('requester-user');
    });

    test('resourceId returns dataProduct name', () => {
      const state = createState(createMockDataRequestWithWorkflow());
      expect(state.resourceId).toBe('TestProduct');
    });

    test('resourceType returns ACCESS_POINT_GROUP', () => {
      const state = createState(createMockDataRequestWithWorkflow());
      expect(state.resourceType).toBe(V1_ResourceType.ACCESS_POINT_GROUP);
    });

    test('accessPointGroup returns correct value', () => {
      const state = createState(createMockDataRequestWithWorkflow());
      expect(state.accessPointGroup).toBe('TestAPG');
    });

    test('status maps SUBMITTED_FOR_APPROVALS to OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL', () => {
      const state = createState(
        createMockDataRequestWithWorkflow(
          V1_RequestState.SUBMITTED_FOR_APPROVALS,
        ),
      );
      expect(state.status).toBe(
        DataAccessRequestStatus.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
      );
    });

    test('status maps COMPLETED to COMPLETED', () => {
      const state = createState(
        createMockDataRequestWithWorkflow(V1_RequestState.COMPLETED),
      );
      expect(state.status).toBe(DataAccessRequestStatus.COMPLETED);
    });

    test('status maps REJECTED to REJECTED', () => {
      const state = createState(
        createMockDataRequestWithWorkflow(V1_RequestState.REJECTED),
      );
      expect(state.status).toBe(DataAccessRequestStatus.REJECTED);
    });

    test('status maps INVALIDATED to CLOSED', () => {
      const state = createState(
        createMockDataRequestWithWorkflow(V1_RequestState.INVALIDATED),
      );
      expect(state.status).toBe(DataAccessRequestStatus.CLOSED);
    });

    test('status maps OBSOLETE to CLOSED', () => {
      const state = createState(
        createMockDataRequestWithWorkflow(V1_RequestState.OBSOLETE),
      );
      expect(state.status).toBe(DataAccessRequestStatus.CLOSED);
    });

    test('status defaults to DRAFT for unknown states', () => {
      const data = createMockDataRequestWithWorkflow();
      data.dataRequest.state = 'UNKNOWN' as V1_RequestState;
      const state = createState(data);
      expect(state.status).toBe(DataAccessRequestStatus.DRAFT);
    });

    test('isInTerminalState returns true for COMPLETED', () => {
      const state = createState(
        createMockDataRequestWithWorkflow(V1_RequestState.COMPLETED),
      );
      expect(state.isInTerminalState).toBe(true);
    });

    test('isInTerminalState returns true for REJECTED', () => {
      const state = createState(
        createMockDataRequestWithWorkflow(V1_RequestState.REJECTED),
      );
      expect(state.isInTerminalState).toBe(true);
    });

    test('isInTerminalState returns false for SUBMITTED_FOR_APPROVALS', () => {
      const state = createState(
        createMockDataRequestWithWorkflow(
          V1_RequestState.SUBMITTED_FOR_APPROVALS,
        ),
      );
      expect(state.isInTerminalState).toBe(false);
    });

    test('isInProgress returns true when open tasks exist', () => {
      const pmTask = createMockPmTask({
        status: V1_WorkflowTaskStatus.OPEN,
      });
      const state = createState(
        createMockDataRequestWithWorkflow(
          V1_RequestState.SUBMITTED_FOR_APPROVALS,
          [pmTask],
        ),
      );
      expect(state.isInProgress).toBe(true);
    });

    test('isInProgress returns false when no open tasks', () => {
      const pmTask = createMockPmTask({
        status: V1_WorkflowTaskStatus.COMPLETED,
      });
      const state = createState(
        createMockDataRequestWithWorkflow(
          V1_RequestState.SUBMITTED_FOR_APPROVALS,
          [pmTask],
        ),
      );
      expect(state.isInProgress).toBe(false);
    });

    test('targetUsers returns undefined when no members', () => {
      const state = createState(createMockDataRequestWithWorkflow());
      expect(state.targetUsers).toBeUndefined();
    });

    test('createdAt returns task createdOn as ISO string', () => {
      const pmTask = createMockPmTask();
      const state = createState(
        createMockDataRequestWithWorkflow(
          V1_RequestState.SUBMITTED_FOR_APPROVALS,
          [pmTask],
        ),
      );
      expect(state.createdAt).toBe(new Date('2026-01-01').toISOString());
    });
  });

  describe('getTimelineSteps', () => {
    test('returns empty when resourceType is not ACCESS_POINT_GROUP', () => {
      const data = createMockDataRequestWithWorkflow();
      // Use a non-AccessPointGroupReference resource
      data.dataRequest.resource = {} as V1_DataRequest['resource'];
      const state = createState(data);
      expect(state.getTimelineSteps(undefined)).toEqual([]);
    });

    test('returns submitted+complete when no workflow exists', () => {
      const data = createMockDataRequestWithWorkflow();
      data.workflows = [];
      const state = createState(data);
      const steps = state.getTimelineSteps(undefined);
      expect(steps).toHaveLength(2);
      expect(steps[0]?.key).toBe('submitted');
      expect(steps[0]?.status).toBe('complete');
      expect(steps[1]?.key).toBe('complete');
      expect(steps[1]?.status).toBe('upcoming');
    });

    test('returns 4 steps for normal workflow with open PM task', () => {
      const pmTask = createMockPmTask({
        status: V1_WorkflowTaskStatus.OPEN,
      });
      const state = createState(
        createMockDataRequestWithWorkflow(
          V1_RequestState.SUBMITTED_FOR_APPROVALS,
          [pmTask],
        ),
      );
      const steps = state.getTimelineSteps(undefined);
      expect(steps).toHaveLength(4);
      expect(steps[0]?.key).toBe('submitted');
      expect(steps[0]?.status).toBe('complete');
      expect(steps[1]?.key).toBe('privilege-manager-approval');
      expect(steps[1]?.status).toBe('active');
      expect(steps[2]?.key).toBe('data-producer-approval');
      expect(steps[2]?.status).toBe('upcoming');
      expect(steps[3]?.key).toBe('complete');
      expect(steps[3]?.status).toBe('upcoming');
    });

    test('PM step shows as complete when approved', () => {
      const pmTask = createMockPmTask({
        status: V1_WorkflowTaskStatus.COMPLETED,
        action: V1_WorkflowTaskAction.APPROVED,
      });
      const doTask = createMockDoTask({
        status: V1_WorkflowTaskStatus.OPEN,
      });
      const state = createState(
        createMockDataRequestWithWorkflow(
          V1_RequestState.SUBMITTED_FOR_APPROVALS,
          [pmTask, doTask],
        ),
      );
      const steps = state.getTimelineSteps(undefined);
      expect(steps[1]?.status).toBe('complete');
      expect(steps[2]?.status).toBe('active');
    });

    test('PM step shows as denied when rejected', () => {
      const pmTask = createMockPmTask({
        status: V1_WorkflowTaskStatus.COMPLETED,
        action: V1_WorkflowTaskAction.REJECTED,
      });
      const state = createState(
        createMockDataRequestWithWorkflow(
          V1_RequestState.SUBMITTED_FOR_APPROVALS,
          [pmTask],
        ),
      );
      const steps = state.getTimelineSteps(undefined);
      expect(steps[1]?.status).toBe('denied');
    });

    test('complete step is complete when DO task approved', () => {
      const pmTask = createMockPmTask({
        status: V1_WorkflowTaskStatus.COMPLETED,
        action: V1_WorkflowTaskAction.APPROVED,
      });
      const doTask = createMockDoTask({
        status: V1_WorkflowTaskStatus.COMPLETED,
        action: V1_WorkflowTaskAction.APPROVED,
      });
      const state = createState(
        createMockDataRequestWithWorkflow(V1_RequestState.COMPLETED, [
          pmTask,
          doTask,
        ]),
      );
      const steps = state.getTimelineSteps(undefined);
      expect(steps[3]?.status).toBe('complete');
    });

    test('shows escalate button for creator when PM step is active', () => {
      const pmTask = createMockPmTask({
        status: V1_WorkflowTaskStatus.OPEN,
        assignees: ['pm-user'],
      });
      const state = createState(
        createMockDataRequestWithWorkflow(
          V1_RequestState.SUBMITTED_FOR_APPROVALS,
          [pmTask],
        ),
        { currentUser: 'requester-user' },
      );
      const steps = state.getTimelineSteps(undefined);
      expect(steps[1]?.label.showEscalateButton).toBe(true);
      expect(steps[1]?.label.isEscalatable).toBe(true);
    });

    test('does not show escalate button for unrelated user', () => {
      const pmTask = createMockPmTask({
        status: V1_WorkflowTaskStatus.OPEN,
        assignees: ['pm-user'],
      });
      const state = createState(
        createMockDataRequestWithWorkflow(
          V1_RequestState.SUBMITTED_FOR_APPROVALS,
          [pmTask],
        ),
        { currentUser: 'other-user' },
      );
      const steps = state.getTimelineSteps(undefined);
      expect(steps[1]?.label.showEscalateButton).toBe(false);
    });

    test('shows escalate button for PM assignee', () => {
      const pmTask = createMockPmTask({
        status: V1_WorkflowTaskStatus.OPEN,
        assignees: ['pm-user'],
      });
      const state = createState(
        createMockDataRequestWithWorkflow(
          V1_RequestState.SUBMITTED_FOR_APPROVALS,
          [pmTask],
        ),
        { currentUser: 'pm-user' },
      );
      const steps = state.getTimelineSteps(undefined);
      expect(steps[1]?.label.showEscalateButton).toBe(true);
    });

    test('isEscalatable is false when already escalated', () => {
      const pmTask1 = createMockPmTask({
        taskId: 'pm-task-1',
        status: V1_WorkflowTaskStatus.COMPLETED,
        action: V1_WorkflowTaskAction.ESCALATED,
      });
      const pmTask2 = createMockPmTask({
        taskId: 'pm-task-2',
        status: V1_WorkflowTaskStatus.OPEN,
        assignees: ['pm-user-2'],
      });
      const state = createState(
        createMockDataRequestWithWorkflow(
          V1_RequestState.SUBMITTED_FOR_APPROVALS,
          [pmTask1, pmTask2],
        ),
        { currentUser: 'requester-user' },
      );
      const steps = state.getTimelineSteps(undefined);
      expect(steps[1]?.label.showEscalateButton).toBe(true);
      expect(steps[1]?.label.isEscalatable).toBe(false);
      expect(steps[1]?.label.isEscalated).toBe(true);
    });

    test('uses getTaskPageUrl for link when provided', () => {
      const pmTask = createMockPmTask({
        status: V1_WorkflowTaskStatus.OPEN,
      });
      const state = createState(
        createMockDataRequestWithWorkflow(
          V1_RequestState.SUBMITTED_FOR_APPROVALS,
          [pmTask],
        ),
        { getTaskPageUrl: (id) => `/tasks/${id}` },
      );
      const steps = state.getTimelineSteps(undefined);
      expect(steps[1]?.label.link).toBe('/tasks/req-1');
    });

    test('falls back to externalLink when getTaskPageUrl is not provided', () => {
      const pmTask = createMockPmTask({
        status: V1_WorkflowTaskStatus.OPEN,
      });
      const state = createState(
        createMockDataRequestWithWorkflow(
          V1_RequestState.SUBMITTED_FOR_APPROVALS,
          [pmTask],
        ),
      );
      const steps = state.getTimelineSteps(undefined);
      expect(steps[1]?.label.link).toBeUndefined();
      expect(steps[1]?.label.externalLink).toBe('http://task/pm-task-1');
    });

    test('PM step includes approval payload when completed', () => {
      const pmTask = createMockPmTask({
        status: V1_WorkflowTaskStatus.COMPLETED,
        action: V1_WorkflowTaskAction.APPROVED,
      });
      pmTask.actionedOn = new Date('2026-01-05');
      pmTask.actionedBy = 'approver-user';

      const state = createState(
        createMockDataRequestWithWorkflow(
          V1_RequestState.SUBMITTED_FOR_APPROVALS,
          [pmTask],
        ),
      );
      const steps = state.getTimelineSteps(undefined);
      expect(steps[1]?.approvalPayload).toEqual({
        status: 'APPROVED',
        approvalTimestamp: new Date('2026-01-05').toISOString(),
        approverId: 'approver-user',
      });
    });

    test('PM step shows DENIED status when rejected', () => {
      const pmTask = createMockPmTask({
        status: V1_WorkflowTaskStatus.COMPLETED,
        action: V1_WorkflowTaskAction.REJECTED,
      });
      pmTask.actionedOn = new Date('2026-01-05');
      pmTask.actionedBy = 'rejector-user';

      const state = createState(
        createMockDataRequestWithWorkflow(
          V1_RequestState.SUBMITTED_FOR_APPROVALS,
          [pmTask],
        ),
      );
      const steps = state.getTimelineSteps(undefined);
      expect(steps[1]?.approvalPayload).toEqual({
        status: 'DENIED',
        approvalTimestamp: new Date('2026-01-05').toISOString(),
        approverId: 'rejector-user',
      });
    });

    test('assignees shown when step is active', () => {
      const pmTask = createMockPmTask({
        status: V1_WorkflowTaskStatus.OPEN,
        assignees: ['pm-user-1', 'pm-user-2'],
      });
      const state = createState(
        createMockDataRequestWithWorkflow(
          V1_RequestState.SUBMITTED_FOR_APPROVALS,
          [pmTask],
        ),
      );
      const steps = state.getTimelineSteps(undefined);
      expect(steps[1]?.assignees).toEqual(['pm-user-1', 'pm-user-2']);
    });

    test('assignees not shown when step is not active', () => {
      const pmTask = createMockPmTask({
        status: V1_WorkflowTaskStatus.COMPLETED,
        action: V1_WorkflowTaskAction.APPROVED,
      });
      const state = createState(
        createMockDataRequestWithWorkflow(
          V1_RequestState.SUBMITTED_FOR_APPROVALS,
          [pmTask],
        ),
      );
      const steps = state.getTimelineSteps(undefined);
      expect(steps[1]?.assignees).toBeUndefined();
    });

    test('escalated PM task results in complete step status', () => {
      const pmTask = createMockPmTask({
        status: V1_WorkflowTaskStatus.COMPLETED,
        action: V1_WorkflowTaskAction.ESCALATED,
      });
      const state = createState(
        createMockDataRequestWithWorkflow(
          V1_RequestState.SUBMITTED_FOR_APPROVALS,
          [pmTask],
        ),
      );
      const steps = state.getTimelineSteps(undefined);
      expect(steps[1]?.status).toBe('complete');
    });
  });

  describe('init', () => {
    test('completes immediately when no fetchFresh and no permitClient', () => {
      const data = createMockDataRequestWithWorkflow();
      const state = createState(data);
      // initializationState is already complete from constructor
      expect(state.initializationState.hasCompleted).toBe(true);
    });
  });

  describe('getFirstOpenTask', () => {
    test('returns first open task', () => {
      const pmTask = createMockPmTask({
        status: V1_WorkflowTaskStatus.OPEN,
      });
      const state = createState(
        createMockDataRequestWithWorkflow(
          V1_RequestState.SUBMITTED_FOR_APPROVALS,
          [pmTask],
        ),
      );
      expect(state.getFirstOpenTask()).toBe(pmTask);
    });

    test('returns undefined when no open tasks', () => {
      const pmTask = createMockPmTask({
        status: V1_WorkflowTaskStatus.COMPLETED,
      });
      const state = createState(
        createMockDataRequestWithWorkflow(
          V1_RequestState.SUBMITTED_FOR_APPROVALS,
          [pmTask],
        ),
      );
      expect(state.getFirstOpenTask()).toBeUndefined();
    });
  });

  describe('setDataRequestWithWorkflow', () => {
    test('updates the observable', () => {
      const state = createState(createMockDataRequestWithWorkflow());
      const newData = createMockDataRequestWithWorkflow(
        V1_RequestState.COMPLETED,
      );
      state.setDataRequestWithWorkflow(newData);
      expect(state.dataRequestWithWorkflow).toBe(newData);
    });
  });

  describe('getContractUserType', () => {
    test('always returns undefined', () => {
      const state = createState(createMockDataRequestWithWorkflow());
      expect(state.getContractUserType('any-user')).toBeUndefined();
    });
  });
});
