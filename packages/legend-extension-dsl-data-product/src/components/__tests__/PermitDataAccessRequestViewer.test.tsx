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

import { describe, test, expect, jest } from '@jest/globals';
import { act, render, screen } from '@testing-library/react';
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
  V1_User,
  V1_Workflow,
  V1_WorkflowStatus,
  V1_WorkflowTaskAction,
  V1_WorkflowTaskStatus,
} from '@finos/legend-graph';
import { AuthProvider } from 'react-oidc-context';
import {
  TEST__getGenericApplicationConfig,
  TEST__LegendApplicationPluginManager,
} from '../__test-utils__/StateTestUtils.js';
import {
  ApplicationFrameworkProvider,
  ApplicationStore,
  ApplicationStoreProvider,
} from '@finos/legend-application';
import { Route, Routes } from '@finos/legend-application/browser';
import { TEST__BrowserEnvironmentProvider } from '@finos/legend-application/test';
import { PermitDataAccessRequestState } from '../../stores/DataProduct/DataAccess/PermitDataAccessRequestState.js';
import { DataAccessRequestViewer } from '../DataProduct/DataContract/DataAccessRequestViewer.js';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: Record<PropertyKey, unknown>;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

// -------------------------------- Helpers --------------------------------

const createMockDataProduct = (): V1_EntitlementsDataProduct => {
  const dp = new V1_EntitlementsDataProduct();
  dp.name = 'TestDataProduct';
  const owner = new V1_AppDirNode();
  owner.appDirId = 12345;
  owner.level = V1_AppDirLevel.APPLICATION;
  dp.owner = owner;
  return dp;
};

const createMockConsumer = (): V1_AdhocTeam => {
  const team = new V1_AdhocTeam();
  const user = new V1_User();
  user.name = 'test-consumer-user-id';
  team.users = [user];
  return team;
};

const createMockPmTask = (
  status: V1_WorkflowTaskStatus,
  action?: V1_WorkflowTaskAction,
): V1_PrivilegeManagerApprovalTask => {
  const task = new V1_PrivilegeManagerApprovalTask();
  task.taskId = 'pm-task-1';
  task.status = status;
  task.createdOn = new Date('2026-01-01T10:00:00Z');
  task.assignees = ['pm-approver-user'];
  task.url = 'http://pm-task/1';
  task.resourceId = 'TestDataProduct';
  task.accessPointGroup = 'TestAPG';
  task.consumer = createMockConsumer();
  task.workflowGuid = 'wf-1';
  if (action !== undefined) {
    task.action = action;
  }
  return task;
};

const createMockDoTask = (
  status: V1_WorkflowTaskStatus,
  action?: V1_WorkflowTaskAction,
): V1_DataOwnerApprovalTask => {
  const task = new V1_DataOwnerApprovalTask();
  task.taskId = 'do-task-1';
  task.status = status;
  task.createdOn = new Date('2026-01-02T10:00:00Z');
  task.assignees = ['do-approver-user'];
  task.url = 'http://do-task/1';
  task.resourceId = 'TestDataProduct';
  task.deploymentId = '12345';
  task.accessPointGroup = 'TestAPG';
  task.consumer = createMockConsumer();
  task.workflowGuid = 'wf-1';
  if (action !== undefined) {
    task.action = action;
  }
  return task;
};

const createTestData = (
  state: V1_RequestState,
  tasks: (V1_PrivilegeManagerApprovalTask | V1_DataOwnerApprovalTask)[],
): V1_DataRequestWithWorkflow => {
  const resource = new V1_AccessPointGroupReference();
  resource.dataProduct = createMockDataProduct();
  resource.accessPointGroup = 'TestAPG';

  const dataRequest = new V1_DataRequest();
  dataRequest.businessJustification = 'Need access for testing purposes';
  dataRequest.guid = 'permit-req-1';
  dataRequest.version = 1;
  dataRequest.state = state;
  dataRequest.resource = resource;
  dataRequest.resourceEnvType = 'PRODUCTION';
  dataRequest.consumer = createMockConsumer();
  dataRequest.createdBy = 'test-requester-user-id';
  dataRequest.members = [];

  const workflow = new V1_Workflow();
  workflow.workflowId = 'wf-1';
  workflow.dataRequestId = 'permit-req-1';
  workflow.status = V1_WorkflowStatus.OPEN;
  workflow.tasks = tasks;
  workflow.url = 'http://workflow/wf-1';

  const drww = new V1_DataRequestWithWorkflow();
  drww.dataRequest = dataRequest;
  drww.workflows = [workflow];
  return drww;
};

const setupPermitViewerTest = async (
  data: V1_DataRequestWithWorkflow,
  currentUser = 'test-consumer-user-id',
) => {
  const pluginManager = TEST__LegendApplicationPluginManager.create();
  const applicationStore = new ApplicationStore(
    TEST__getGenericApplicationConfig(),
    pluginManager,
  );
  applicationStore.identityService.setCurrentUser(currentUser);
  applicationStore.navigationService.navigator.generateAddress = jest.fn(
    (location: string) => location,
  );

  const viewerState = new PermitDataAccessRequestState(
    data.dataRequest.guid,
    applicationStore,
    undefined,
    undefined,
    { initialData: data },
  );

  await act(async () => {
    render(
      <AuthProvider>
        <ApplicationStoreProvider store={applicationStore}>
          <TEST__BrowserEnvironmentProvider initialEntries={['/']}>
            <ApplicationFrameworkProvider>
              <Routes>
                <Route
                  path="*"
                  element={
                    <DataAccessRequestViewer
                      open={true}
                      onClose={jest.fn()}
                      viewerState={viewerState}
                      getDataProductUrl={() => ''}
                    />
                  }
                />
              </Routes>
            </ApplicationFrameworkProvider>
          </TEST__BrowserEnvironmentProvider>
        </ApplicationStoreProvider>
      </AuthProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  return { viewerState };
};

// -------------------------------- Tests --------------------------------

describe('DataAccessRequestViewer with PermitDataAccessRequestState', () => {
  describe('renders permit-based data access request details', () => {
    test('displays pending request with PM approval step active', async () => {
      const pmTask = createMockPmTask(V1_WorkflowTaskStatus.OPEN);
      const data = createTestData(V1_RequestState.SUBMITTED_FOR_APPROVALS, [
        pmTask,
      ]);

      await setupPermitViewerTest(data);

      // Verify title shows "Pending"
      await screen.findByText('Pending Data Access Request');

      // Verify resource details
      screen.getByText(/TestAPG/);
      screen.getByText(/TestDataProduct/);

      // Verify business justification
      screen.getByText('Need access for testing purposes');

      // Verify timeline steps
      screen.getByText('Submitted');
      screen.getByText('Privilege Manager Approval');
      screen.getByText('Data Producer Approval');
      screen.getByText('Complete');

      // Verify request ID
      screen.getByText('Request ID: permit-req-1');
    });

    test('displays completed request title without "Pending"', async () => {
      const pmTask = createMockPmTask(
        V1_WorkflowTaskStatus.COMPLETED,
        V1_WorkflowTaskAction.APPROVED,
      );
      const doTask = createMockDoTask(
        V1_WorkflowTaskStatus.COMPLETED,
        V1_WorkflowTaskAction.APPROVED,
      );
      const data = createTestData(V1_RequestState.COMPLETED, [pmTask, doTask]);

      await setupPermitViewerTest(data);

      await screen.findByText('Data Access Request');
      expect(screen.queryByText('Pending Data Access Request')).toBeNull();
    });

    test('displays PM approval step as active with assignees', async () => {
      const pmTask = createMockPmTask(V1_WorkflowTaskStatus.OPEN);
      const data = createTestData(V1_RequestState.SUBMITTED_FOR_APPROVALS, [
        pmTask,
      ]);

      await setupPermitViewerTest(data);

      await screen.findByText('Privilege Manager Approval');
      // Assignees should be visible for active step
      screen.getByText('pm-approver-user');
    });

    test('displays DO approval step as active when PM is completed', async () => {
      const pmTask = createMockPmTask(
        V1_WorkflowTaskStatus.COMPLETED,
        V1_WorkflowTaskAction.APPROVED,
      );
      const doTask = createMockDoTask(V1_WorkflowTaskStatus.OPEN);
      const data = createTestData(V1_RequestState.SUBMITTED_FOR_APPROVALS, [
        pmTask,
        doTask,
      ]);

      await setupPermitViewerTest(data);

      await screen.findByText('Data Producer Approval');
      screen.getByText('do-approver-user');
    });

    test('shows requester user', async () => {
      const pmTask = createMockPmTask(V1_WorkflowTaskStatus.OPEN);
      const data = createTestData(V1_RequestState.SUBMITTED_FOR_APPROVALS, [
        pmTask,
      ]);

      await setupPermitViewerTest(data);

      await screen.findByText('Ordered By:');
      screen.getByText('test-requester-user-id');
    });

    test('shows consumer info', async () => {
      const pmTask = createMockPmTask(V1_WorkflowTaskStatus.OPEN);
      const data = createTestData(V1_RequestState.SUBMITTED_FOR_APPROVALS, [
        pmTask,
      ]);

      await setupPermitViewerTest(data);

      await screen.findByText(/Ordered For/);
      screen.getByText('test-consumer-user-id');
    });
  });
});
