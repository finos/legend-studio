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

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import { flowResult } from 'mobx';
import { unitTest } from '@finos/legend-shared/test';
import {
  Workflow,
  WorkflowJob,
  WorkflowJobStatus,
  WorkflowStatus,
} from '@finos/legend-server-sdlc';
import { TEST__getTestEditorStore } from '../../__test-utils__/EditorStoreTestUtils.js';
import {
  WorkflowState,
  type WorkflowManagerState,
} from '../WorkflowManagerState.js';
import {
  LegendStudioTelemetryHelper,
  WORKFLOW_MANAGER_JOB_ACTION,
  WORKFLOW_MANAGER_SCOPE,
} from '../../../../__lib__/LegendStudioTelemetryHelper.js';

/**
 * These tests protect the telemetry contract of the shared `runJobAction`
 * wrapper introduced when `retryJob` / `runManualJob` / `cancelJob` were
 * consolidated. We assert that:
 *   - Launched fires up-front with `{scope, action, jobName, jobStatus}`.
 *   - Succeeded fires after the invoke completes, with `durationMs` present.
 *   - Failure fires when the invoke throws, with `errorMessage` propagated,
 *     and that Succeeded does NOT also fire.
 * We stub `refreshWorkflow` because it is exercised in its own path — here
 * we only care about the wrapper's classification / lifecycle.
 */

const buildWorkflow = (): Workflow =>
  Object.assign(new Workflow(), {
    id: 'wf-1',
    projectId: 'PROJ-1',
    revisionId: 'rev-1',
    status: WorkflowStatus.SUCCEEDED,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    webURL: 'https://example.test/wf-1',
  });

const buildJob = (): WorkflowJob =>
  Object.assign(new WorkflowJob(), {
    id: 'job-1',
    workflowId: 'wf-1',
    name: 'build',
    projectId: 'PROJ-1',
    revisionId: 'rev-1',
    status: WorkflowJobStatus.FAILED,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    webURL: 'https://example.test/job-1',
  });

const buildWorkflowManagerStateStub = (): WorkflowManagerState =>
  ({
    scope: WORKFLOW_MANAGER_SCOPE.WORKSPACE,
    retryJob: jest.fn(() => Promise.resolve()),
    runManualJob: jest.fn(() => Promise.resolve()),
  }) as unknown as WorkflowManagerState;

const buildWorkflowState = (): WorkflowState => {
  const editorStore = TEST__getTestEditorStore();
  const managerState = buildWorkflowManagerStateStub();
  const state = new WorkflowState(editorStore, managerState, buildWorkflow(), [
    buildJob(),
  ]);
  // `refreshWorkflow` is a flow that touches `getWorkflow` + `getJobs` on
  // the underlying manager state. It has its own emit contract; stub it to
  // a no-op so this test only exercises the `runJobAction` wrapper.
  jest
    .spyOn(state, 'refreshWorkflow')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .mockReturnValue((async function* () {})() as any);
  return state;
};

describe(unitTest('WorkflowState.runJobAction telemetry lifecycle'), () => {
  let launchedSpy: jest.SpiedFunction<
    typeof LegendStudioTelemetryHelper.logEvent_WorkflowManagerJobActionLaunched
  >;
  let succeededSpy: jest.SpiedFunction<
    typeof LegendStudioTelemetryHelper.logEvent_WorkflowManagerJobActionSucceeded
  >;
  let failureSpy: jest.SpiedFunction<
    typeof LegendStudioTelemetryHelper.logEvent_WorkflowManagerJobActionFailure
  >;

  beforeEach(() => {
    launchedSpy = jest
      .spyOn(
        LegendStudioTelemetryHelper,
        'logEvent_WorkflowManagerJobActionLaunched',
      )
      .mockImplementation(() => {});
    succeededSpy = jest
      .spyOn(
        LegendStudioTelemetryHelper,
        'logEvent_WorkflowManagerJobActionSucceeded',
      )
      .mockImplementation(() => {});
    failureSpy = jest
      .spyOn(
        LegendStudioTelemetryHelper,
        'logEvent_WorkflowManagerJobActionFailure',
      )
      .mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test.each([
    ['retryJob' as const, WORKFLOW_MANAGER_JOB_ACTION.RETRY],
    ['runManualJob' as const, WORKFLOW_MANAGER_JOB_ACTION.RUN_MANUAL],
  ])(
    'success path: %s emits Launched then Succeeded with the correct action + payload',
    async (method, expectedAction) => {
      const state = buildWorkflowState();
      const job = buildJob();
      await flowResult(state[method](job, state.treeData));

      expect(launchedSpy).toHaveBeenCalledTimes(1);
      expect(launchedSpy.mock.calls[0]?.[2]).toEqual({
        scope: WORKFLOW_MANAGER_SCOPE.WORKSPACE,
        action: expectedAction,
        jobName: job.name,
        jobStatus: job.status,
      });

      expect(succeededSpy).toHaveBeenCalledTimes(1);
      const succeededPayload = succeededSpy.mock.calls[0]?.[2];
      expect(succeededPayload).toMatchObject({
        scope: WORKFLOW_MANAGER_SCOPE.WORKSPACE,
        action: expectedAction,
        jobName: job.name,
      });
      // `durationMs` is Date.now()-based; assert it exists and is >= 0.
      expect(typeof succeededPayload?.durationMs).toBe('number');
      expect(succeededPayload?.durationMs).toBeGreaterThanOrEqual(0);

      expect(failureSpy).not.toHaveBeenCalled();
    },
  );

  test.each([
    ['retryJob' as const, WORKFLOW_MANAGER_JOB_ACTION.RETRY],
    ['runManualJob' as const, WORKFLOW_MANAGER_JOB_ACTION.RUN_MANUAL],
  ])(
    'failure path: %s emits Launched then Failure (not Succeeded) with the error message',
    async (method, expectedAction) => {
      const state = buildWorkflowState();
      // Force the underlying manager-state call to reject.
      (
        state.workflowManagerState[method] as unknown as jest.Mock<
          () => Promise<void>
        >
      ).mockRejectedValueOnce(new Error(`${method} boom`) as never);

      const job = buildJob();
      await flowResult(state[method](job, state.treeData));

      expect(launchedSpy).toHaveBeenCalledTimes(1);
      expect(succeededSpy).not.toHaveBeenCalled();
      expect(failureSpy).toHaveBeenCalledTimes(1);
      expect(failureSpy.mock.calls[0]?.[2]).toEqual({
        scope: WORKFLOW_MANAGER_SCOPE.WORKSPACE,
        action: expectedAction,
        jobName: job.name,
        errorMessage: `${method} boom`,
      });
    },
  );
});
