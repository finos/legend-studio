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

import { describe, expect, jest, test } from '@jest/globals';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  APPLICATION_EVENT,
  type TelemetryService,
} from '@finos/legend-application';
import type { LegendSourceInfo } from '@finos/legend-storage';
import { LEGEND_STUDIO_APP_EVENT } from '../LegendStudioEvent.js';
import {
  EDITOR_TAB_CLOSE_TRIGGER,
  EDITOR_TAB_KIND,
  EDITOR_TAB_OPEN_TRIGGER,
  FORM_MODE_COMPILATION_ERROR_KIND,
  GENERATION_MODE,
  GLOBAL_TEST_RUN_SCOPE,
  GRAPH_EDITOR_MODE_LABEL,
  GRAPH_INITIALIZATION_ERROR_KIND,
  LegendStudioTelemetryHelper,
  PROJECT_CONFIG_UPDATE_ACTION,
  PROJECT_OVERVIEW_ACTION,
  SDLC_REVIEW_ACTION,
  SDLC_REVIEW_ROLE,
  SERVICE_REGISTRATION_TRIGGER,
  SETUP_ACTION,
  SERVICE_TEST_SUITE_RUN_MODE,
  SHOWCASE_FEEDBACK_SURFACE,
  SHOWCASE_FEEDBACK_VOTE,
  SHOWCASE_LAUNCH_ENTRY_POINT,
  SHOWCASE_MANAGER_ENTRY_POINT,
  TESTABLE_KIND,
  TESTABLE_RUN_MODE,
  TEXT_MODE_ACTION,
  TEXT_MODE_ACTION_STATUS,
  TEXT_MODE_COMPILATION_ERROR_KIND,
  TEXT_MODE_ENTER_TRIGGER,
  TEXT_MODE_LEAVE_OUTCOME,
  TEXT_MODE_TOGGLE_DIRECTION,
  TEXT_MODE_TOGGLE_SOURCE,
  WORKFLOW_MANAGER_JOB_ACTION,
  WORKFLOW_MANAGER_SCOPE,
} from '../LegendStudioTelemetryHelper.js';

type LoggedCall = { event: string; data: Record<string, unknown> };

const buildTelemetryStub = (): {
  service: TelemetryService;
  calls: LoggedCall[];
} => {
  const calls: LoggedCall[] = [];
  const service = {
    logEvent: jest.fn((event: string, data: unknown) => {
      calls.push({ event, data: data as Record<string, unknown> });
    }),
  } as unknown as TelemetryService;
  return { service, calls };
};

const TEST_SOURCE_INFO = {
  projectId: 'PROJ-123',
  workspaceId: 'ws-1',
  workspaceType: 'USER',
} as unknown as LegendSourceInfo;

describe('LegendStudioTelemetryHelper - text mode session', () => {
  test('logEvent_TextModeEntered emits TEXT_MODE__ENTER with sourceInfo and trigger', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_TextModeEntered(
      service,
      TEST_SOURCE_INFO,
      {
        trigger: TEXT_MODE_ENTER_TRIGGER.MANUAL_TOGGLE,
        strict: false,
        elementPath: 'model::MyClass',
      },
    );

    expect(calls).toHaveLength(1);
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.TEXT_MODE__ENTER);
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      trigger: TEXT_MODE_ENTER_TRIGGER.MANUAL_TOGGLE,
      strict: false,
      elementPath: 'model::MyClass',
    });
  });

  test('logEvent_TextModeEntered supports fallback triggers and strict flag', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_TextModeEntered(service, undefined, {
      trigger: TEXT_MODE_ENTER_TRIGGER.FALLBACK_GRAPH_BUILD_FAILURE,
      strict: true,
    });

    const call = guaranteeNonNullable(calls[0]);
    expect(call.data).toEqual({
      sourceInfo: undefined,
      trigger: 'fallback-graph-build-failure',
      strict: true,
      elementPath: undefined,
    });
  });

  test('logEvent_TextModeLeft emits TEXT_MODE__LEAVE with duration and counts', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_TextModeLeft(
      service,
      TEST_SOURCE_INFO,
      {
        outcome: TEXT_MODE_LEAVE_OUTCOME.COMPILED_AND_LEFT,
        durationMs: 12345,
        editCount: 7,
        compilationCount: 2,
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.TEXT_MODE__LEAVE);
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      outcome: 'compiled-and-left',
      durationMs: 12345,
      editCount: 7,
      compilationCount: 2,
    });
  });

  test('logEvent_TextModeFirstEdit emits TEXT_MODE__FIRST_EDIT', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_TextModeFirstEdit(
      service,
      TEST_SOURCE_INFO,
      2500,
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.TEXT_MODE__FIRST_EDIT);
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      timeToFirstEditMs: 2500,
    });
  });
});

describe('LegendStudioTelemetryHelper - push local changes', () => {
  test('logEvent_PushLocalChangesLaunched emits PUSH_LOCAL_CHANGES__LAUNCH with mode', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_PushLocalChangesLaunched(
      service,
      TEST_SOURCE_INFO,
      { mode: GRAPH_EDITOR_MODE_LABEL.TEXT, changeCount: 3 },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.PUSH_LOCAL_CHANGES__LAUNCH);
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      mode: 'text',
      changeCount: 3,
    });
  });

  test('logEvent_PushLocalChangesSucceeded emits PUSH_LOCAL_CHANGES__SUCCESS with duration and revision', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_PushLocalChangesSucceeded(
      service,
      TEST_SOURCE_INFO,
      {
        mode: GRAPH_EDITOR_MODE_LABEL.FORM,
        changeCount: 5,
        durationMs: 800,
        revisionId: 'rev-abc',
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.PUSH_LOCAL_CHANGES__SUCCESS,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      mode: 'form',
      changeCount: 5,
      durationMs: 800,
      revisionId: 'rev-abc',
    });
  });

  test('logEvent_PushLocalChangesFailure emits PUSH_LOCAL_CHANGES__FAILURE with error message', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_PushLocalChangesFailure(
      service,
      TEST_SOURCE_INFO,
      {
        mode: GRAPH_EDITOR_MODE_LABEL.STRICT_TEXT,
        changeCount: 1,
        errorMessage: 'server rejected',
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.PUSH_LOCAL_CHANGES__FAILURE,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      mode: 'strict-text',
      changeCount: 1,
      errorMessage: 'server rejected',
    });
  });
});

describe('LegendStudioTelemetryHelper - workspace update', () => {
  test('logEvent_WorkspaceUpdateLaunched emits UPDATE_WORKSPACE__LAUNCH with sourceInfo', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_WorkspaceUpdateLaunched(
      service,
      TEST_SOURCE_INFO,
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.UPDATE_WORKSPACE__LAUNCH);
    expect(call.data).toEqual({ sourceInfo: TEST_SOURCE_INFO });
  });

  test('logEvent_WorkspaceUpdateSucceeded emits UPDATE_WORKSPACE__SUCCESS with status and duration', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_WorkspaceUpdateSucceeded(
      service,
      TEST_SOURCE_INFO,
      { status: 'UPDATED', durationMs: 42 },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.UPDATE_WORKSPACE__SUCCESS);
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      status: 'UPDATED',
      durationMs: 42,
    });
  });

  test('logEvent_WorkspaceUpdateFailure emits UPDATE_WORKSPACE__FAILURE with error message', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_WorkspaceUpdateFailure(
      service,
      TEST_SOURCE_INFO,
      'network down',
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.UPDATE_WORKSPACE__FAILURE);
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      errorMessage: 'network down',
    });
  });
});

describe('LegendStudioTelemetryHelper - Phase 2 text mode signals', () => {
  test('logEvent_TextModeCompilationFailure emits TEXT_MODE_COMPILATION__FAILURE with errorKind', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_TextModeCompilationFailure(
      service,
      TEST_SOURCE_INFO,
      {
        errorKind: TEXT_MODE_COMPILATION_ERROR_KIND.PARSER,
        errorMessage: 'unexpected token',
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.TEXT_MODE_COMPILATION__FAILURE,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      errorKind: 'parser',
      errorMessage: 'unexpected token',
    });
  });

  test('logEvent_TextModeStrictLaunch emits TEXT_MODE__STRICT_LAUNCH with sourceInfo', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_TextModeStrictLaunch(
      service,
      TEST_SOURCE_INFO,
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.TEXT_MODE__STRICT_LAUNCH);
    expect(call.data).toEqual({ sourceInfo: TEST_SOURCE_INFO });
  });

  test('logEvent_TextModeToggleShortcutInvoked emits with source and direction', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_TextModeToggleShortcutInvoked(
      service,
      TEST_SOURCE_INFO,
      {
        source: TEXT_MODE_TOGGLE_SOURCE.KEYBOARD_SHORTCUT,
        direction: TEXT_MODE_TOGGLE_DIRECTION.TO_TEXT,
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.TEXT_MODE__TOGGLE_SHORTCUT_INVOKED,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      source: 'keyboard-shortcut',
      direction: 'to-text',
    });
  });

  test('logEvent_TextModeAction emits TEXT_MODE__ACTION for success', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_TextModeAction(
      service,
      TEST_SOURCE_INFO,
      {
        action: TEXT_MODE_ACTION.GO_TO_DEFINITION,
        status: TEXT_MODE_ACTION_STATUS.SUCCESS,
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.TEXT_MODE__ACTION);
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      action: 'go-to-definition',
      status: 'success',
    });
  });

  test('logEvent_TextModeAction includes errorMessage on error status', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_TextModeAction(
      service,
      TEST_SOURCE_INFO,
      {
        action: TEXT_MODE_ACTION.GO_TO_DEFINITION,
        status: TEXT_MODE_ACTION_STATUS.ERROR,
        errorMessage: 'not found',
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      action: 'go-to-definition',
      status: 'error',
      errorMessage: 'not found',
    });
  });
});

describe('LegendStudioTelemetryHelper - Phase 2 save-side signals', () => {
  test('logEvent_PushLocalChangesEmpty emits PUSH_LOCAL_CHANGES__EMPTY with mode', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_PushLocalChangesEmpty(
      service,
      TEST_SOURCE_INFO,
      { mode: GRAPH_EDITOR_MODE_LABEL.TEXT },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.PUSH_LOCAL_CHANGES__EMPTY);
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      mode: 'text',
    });
  });
});

describe('LegendStudioTelemetryHelper - workflow manager', () => {
  test('logEvent_WorkflowManagerPanelOpened emits panel.open with scope', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_WorkflowManagerPanelOpened(
      service,
      TEST_SOURCE_INFO,
      { scope: WORKFLOW_MANAGER_SCOPE.WORKSPACE },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_PANEL__OPEN,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      scope: 'workspace',
    });
  });

  test('logEvent_WorkflowManagerPanelClosed emits panel.close with dwellMs', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_WorkflowManagerPanelClosed(
      service,
      undefined,
      { scope: WORKFLOW_MANAGER_SCOPE.PROJECT, dwellMs: 4200 },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_PANEL__CLOSE,
    );
    expect(call.data).toEqual({
      sourceInfo: undefined,
      scope: 'project',
      dwellMs: 4200,
    });
  });

  test('logEvent_WorkflowManagerFetchWorkflowsSucceeded emits duration, count and status breakdown', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_WorkflowManagerFetchWorkflowsSucceeded(
      service,
      TEST_SOURCE_INFO,
      {
        scope: WORKFLOW_MANAGER_SCOPE.WORKSPACE,
        durationMs: 812,
        workflowCount: 3,
        statusBreakdown: { SUCCEEDED: 2, FAILED: 1 },
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_FETCH_WORKFLOWS__SUCCESS,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      scope: 'workspace',
      durationMs: 812,
      workflowCount: 3,
      statusBreakdown: { SUCCEEDED: 2, FAILED: 1 },
    });
  });

  test('logEvent_WorkflowManagerFetchWorkflowsFailure carries errorMessage', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_WorkflowManagerFetchWorkflowsFailure(
      service,
      TEST_SOURCE_INFO,
      { scope: WORKFLOW_MANAGER_SCOPE.PROJECT_VERSION, errorMessage: 'boom' },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_FETCH_WORKFLOWS__FAILURE,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      scope: 'project-version',
      errorMessage: 'boom',
    });
  });

  test('logEvent_WorkflowManagerFetchJobsSucceeded emits jobCount and statusBreakdown', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_WorkflowManagerFetchJobsSucceeded(
      service,
      TEST_SOURCE_INFO,
      {
        scope: WORKFLOW_MANAGER_SCOPE.WORKSPACE,
        durationMs: 120,
        jobCount: 5,
        statusBreakdown: { SUCCEEDED: 4, WAITING_MANUAL: 1 },
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_FETCH_JOBS__SUCCESS,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      scope: 'workspace',
      durationMs: 120,
      jobCount: 5,
      statusBreakdown: { SUCCEEDED: 4, WAITING_MANUAL: 1 },
    });
  });

  test('logEvent_WorkflowManagerWorkflowExpand carries the workflow status', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_WorkflowManagerWorkflowExpand(
      service,
      TEST_SOURCE_INFO,
      {
        scope: WORKFLOW_MANAGER_SCOPE.WORKSPACE,
        workflowStatus: 'IN_PROGRESS',
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_WORKFLOW__EXPAND,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      scope: 'workspace',
      workflowStatus: 'IN_PROGRESS',
    });
  });

  test('logEvent_WorkflowManagerJobActionLaunched includes action, jobName and jobStatus', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_WorkflowManagerJobActionLaunched(
      service,
      TEST_SOURCE_INFO,
      {
        scope: WORKFLOW_MANAGER_SCOPE.WORKSPACE,
        action: WORKFLOW_MANAGER_JOB_ACTION.RETRY,
        jobName: 'build',
        jobStatus: 'FAILED',
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_JOB_ACTION__LAUNCH,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      scope: 'workspace',
      action: 'retry',
      jobName: 'build',
      jobStatus: 'FAILED',
    });
  });

  test('logEvent_WorkflowManagerJobActionSucceeded emits durationMs', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_WorkflowManagerJobActionSucceeded(
      service,
      TEST_SOURCE_INFO,
      {
        scope: WORKFLOW_MANAGER_SCOPE.WORKSPACE,
        action: WORKFLOW_MANAGER_JOB_ACTION.CANCEL,
        jobName: 'test',
        durationMs: 900,
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_JOB_ACTION__SUCCESS,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      scope: 'workspace',
      action: 'cancel',
      jobName: 'test',
      durationMs: 900,
    });
  });

  test('logEvent_WorkflowManagerJobActionFailure emits errorMessage', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_WorkflowManagerJobActionFailure(
      service,
      TEST_SOURCE_INFO,
      {
        scope: WORKFLOW_MANAGER_SCOPE.PROJECT,
        action: WORKFLOW_MANAGER_JOB_ACTION.RUN_MANUAL,
        jobName: 'deploy',
        errorMessage: 'nope',
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_JOB_ACTION__FAILURE,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      scope: 'project',
      action: 'run-manual',
      jobName: 'deploy',
      errorMessage: 'nope',
    });
  });

  test('logEvent_WorkflowManagerJobLogsClosed emits dwellMs and refreshCount', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_WorkflowManagerJobLogsClosed(
      service,
      TEST_SOURCE_INFO,
      {
        scope: WORKFLOW_MANAGER_SCOPE.WORKSPACE,
        jobName: 'build',
        dwellMs: 15000,
        refreshCount: 3,
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_JOB_LOGS__CLOSE,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      scope: 'workspace',
      jobName: 'build',
      dwellMs: 15000,
      refreshCount: 3,
    });
  });

  test('logEvent_WorkflowManagerJobLogsFetchSucceeded emits logSizeBytes', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_WorkflowManagerJobLogsFetchSucceeded(
      service,
      TEST_SOURCE_INFO,
      {
        scope: WORKFLOW_MANAGER_SCOPE.WORKSPACE,
        jobName: 'build',
        durationMs: 210,
        logSizeBytes: 4096,
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_JOB_LOGS_FETCH__SUCCESS,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      scope: 'workspace',
      jobName: 'build',
      durationMs: 210,
      logSizeBytes: 4096,
    });
  });
});

describe('LegendStudioTelemetryHelper - failure symmetry', () => {
  test('logEvent_GraphCompilationFailure emits FORM_MODE_COMPILATION__FAILURE with errorKind and fallbackToTextMode', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_GraphCompilationFailure(
      service,
      TEST_SOURCE_INFO,
      {
        errorKind: FORM_MODE_COMPILATION_ERROR_KIND.COMPILATION,
        errorMessage: 'type mismatch',
        fallbackToTextMode: true,
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.FORM_MODE_COMPILATION__FAILURE,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      errorKind: 'compilation',
      errorMessage: 'type mismatch',
      fallbackToTextMode: true,
    });
  });

  test('logEvent_GraphCompilationFailure supports ENGINE and OTHER error kinds without fallback', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_GraphCompilationFailure(
      service,
      undefined,
      {
        errorKind: FORM_MODE_COMPILATION_ERROR_KIND.ENGINE,
        errorMessage: 'engine boom',
        fallbackToTextMode: false,
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.data).toEqual({
      sourceInfo: undefined,
      errorKind: 'engine',
      errorMessage: 'engine boom',
      fallbackToTextMode: false,
    });
  });

  test('logEvent_TestDataGenerationFailure emits TEST_DATA_GENERATION__FAILURE with errorMessage', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_TestDataGenerationFailure(
      service,
      TEST_SOURCE_INFO,
      'connection refused',
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.TEST_DATA_GENERATION__FAILURE,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      errorMessage: 'connection refused',
    });
  });

  test('logEvent_GraphInitializationLaunched emits INITIALIZE_GRAPH__LAUNCH with sourceInfo', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_GraphInitializationLaunched(
      service,
      TEST_SOURCE_INFO,
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.INITIALIZE_GRAPH__LAUNCH);
    expect(call.data).toEqual({ sourceInfo: TEST_SOURCE_INFO });
  });

  test('logEvent_GraphInitializationFailure emits INITIALIZE_GRAPH__FAILURE with errorKind and fallbackToTextMode', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_GraphInitializationFailure(
      service,
      TEST_SOURCE_INFO,
      {
        errorKind: GRAPH_INITIALIZATION_ERROR_KIND.DEPENDENCY,
        errorMessage: 'dep missing',
        fallbackToTextMode: false,
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.INITIALIZE_GRAPH__FAILURE);
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      errorKind: 'dependency',
      errorMessage: 'dep missing',
      fallbackToTextMode: false,
    });
  });

  test('logEvent_GraphInitializationFailure supports OTHER error kind with fallback to text mode', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_GraphInitializationFailure(
      service,
      undefined,
      {
        errorKind: GRAPH_INITIALIZATION_ERROR_KIND.OTHER,
        errorMessage: 'unexpected',
        fallbackToTextMode: true,
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.data).toEqual({
      sourceInfo: undefined,
      errorKind: 'other',
      errorMessage: 'unexpected',
      fallbackToTextMode: true,
    });
  });
});

describe('LegendStudioTelemetryHelper - service registration', () => {
  const REG_BASE = {
    trigger: SERVICE_REGISTRATION_TRIGGER.SINGLE,
    executionMode: 'SEMI_INTERACTIVE',
    serviceCount: 1,
    activatePostRegistration: true,
  };

  test('logEvent_ServiceRegistrationLaunched emits SERVICE_REGISTRATION_LAUNCH with trigger and executionMode', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_ServiceRegistrationLaunched(
      service,
      TEST_SOURCE_INFO,
      REG_BASE,
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.SERVICE_REGISTRATION_LAUNCH,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      trigger: 'single',
      executionMode: 'SEMI_INTERACTIVE',
      serviceCount: 1,
      activatePostRegistration: true,
    });
  });

  test('logEvent_ServiceRegistrationSucceeded emits SERVICE_REGISTRATION_SUCCESS with durationMs', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_ServiceRegistrationSucceeded(
      service,
      TEST_SOURCE_INFO,
      {
        trigger: SERVICE_REGISTRATION_TRIGGER.BULK,
        executionMode: 'PROD',
        serviceCount: 4,
        activatePostRegistration: false,
        durationMs: 12500,
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.SERVICE_REGISTRATION_SUCCESS,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      trigger: 'bulk',
      executionMode: 'PROD',
      serviceCount: 4,
      activatePostRegistration: false,
      durationMs: 12500,
    });
  });

  test('logEvent_ServiceRegistrationFailure emits SERVICE_REGISTRATION_FAILURE with errorMessage', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_ServiceRegistrationFailure(
      service,
      undefined,
      {
        trigger: SERVICE_REGISTRATION_TRIGGER.SERVICE_QUERY_EDITOR,
        executionMode: 'SEMI_INTERACTIVE',
        serviceCount: 1,
        activatePostRegistration: true,
        errorMessage: 'server rejected',
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.SERVICE_REGISTRATION_FAILURE,
    );
    expect(call.data).toEqual({
      sourceInfo: undefined,
      trigger: 'service-query-editor',
      executionMode: 'SEMI_INTERACTIVE',
      serviceCount: 1,
      activatePostRegistration: true,
      errorMessage: 'server rejected',
    });
  });

  test('logEvent_ServiceRegistrationLaunched tolerates undefined executionMode (pre-selection)', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_ServiceRegistrationLaunched(
      service,
      TEST_SOURCE_INFO,
      { ...REG_BASE, executionMode: undefined },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      trigger: 'single',
      executionMode: undefined,
      serviceCount: 1,
      activatePostRegistration: true,
    });
  });
});

describe('LegendStudioTelemetryHelper - service test suite run', () => {
  const RUN_BASE = {
    servicePath: 'model::MyService',
    suiteId: 'suite_0',
    mode: SERVICE_TEST_SUITE_RUN_MODE.RUN_SUITE,
    testCount: 3,
  };

  test('logEvent_ServiceTestSuiteRunLaunched emits LAUNCH with sourceInfo and common data', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_ServiceTestSuiteRunLaunched(
      service,
      TEST_SOURCE_INFO,
      RUN_BASE,
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.SERVICE_TEST_SUITE_RUN__LAUNCH,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      servicePath: 'model::MyService',
      suiteId: 'suite_0',
      mode: 'run-suite',
      testCount: 3,
    });
  });

  test('logEvent_ServiceTestSuiteRunSucceeded emits SUCCESS with duration and result counts', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_ServiceTestSuiteRunSucceeded(
      service,
      TEST_SOURCE_INFO,
      {
        ...RUN_BASE,
        durationMs: 1234,
        passedCount: 2,
        failedCount: 1,
        erroredCount: 0,
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.SERVICE_TEST_SUITE_RUN__SUCCESS,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      servicePath: 'model::MyService',
      suiteId: 'suite_0',
      mode: 'run-suite',
      testCount: 3,
      durationMs: 1234,
      passedCount: 2,
      failedCount: 1,
      erroredCount: 0,
    });
  });

  test('logEvent_ServiceTestSuiteRunFailure emits FAILURE with errorMessage and run-failing mode', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_ServiceTestSuiteRunFailure(
      service,
      undefined,
      {
        ...RUN_BASE,
        mode: SERVICE_TEST_SUITE_RUN_MODE.RUN_FAILING,
        testCount: 1,
        errorMessage: 'engine unreachable',
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.SERVICE_TEST_SUITE_RUN__FAILURE,
    );
    expect(call.data).toEqual({
      sourceInfo: undefined,
      servicePath: 'model::MyService',
      suiteId: 'suite_0',
      mode: 'run-failing',
      testCount: 1,
      errorMessage: 'engine unreachable',
    });
  });
});

describe('LegendStudioTelemetryHelper - unified testable run', () => {
  const RUN_BASE = {
    testableKind: TESTABLE_KIND.MAPPING,
    testablePath: 'model::MyMapping',
    suiteId: 'suite_0',
    mode: TESTABLE_RUN_MODE.RUN_SUITE,
    testCount: 4,
  };

  test('logEvent_TestableRunLaunched emits LAUNCH with kind, path, mode and sourceInfo', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_TestableRunLaunched(
      service,
      TEST_SOURCE_INFO,
      RUN_BASE,
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.TESTABLE_RUN__LAUNCH);
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      testableKind: 'mapping',
      testablePath: 'model::MyMapping',
      suiteId: 'suite_0',
      mode: 'run-suite',
      testCount: 4,
    });
  });

  test('logEvent_TestableRunSucceeded emits SUCCESS with duration + result buckets', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_TestableRunSucceeded(
      service,
      undefined,
      {
        ...RUN_BASE,
        testableKind: TESTABLE_KIND.DATA_PRODUCT,
        testablePath: 'model::MyProduct',
        mode: TESTABLE_RUN_MODE.RUN_TESTABLE,
        suiteId: undefined,
        durationMs: 2500,
        passedCount: 3,
        failedCount: 1,
        erroredCount: 0,
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.TESTABLE_RUN__SUCCESS);
    expect(call.data).toEqual({
      sourceInfo: undefined,
      testableKind: 'data-product',
      testablePath: 'model::MyProduct',
      suiteId: undefined,
      mode: 'run-testable',
      testCount: 4,
      durationMs: 2500,
      passedCount: 3,
      failedCount: 1,
      erroredCount: 0,
    });
  });

  test('logEvent_TestableRunFailure emits FAILURE with errorMessage and run-all-failing mode', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_TestableRunFailure(
      service,
      TEST_SOURCE_INFO,
      {
        ...RUN_BASE,
        testableKind: TESTABLE_KIND.INGEST,
        testablePath: 'model::MyIngest',
        mode: TESTABLE_RUN_MODE.RUN_ALL_FAILING,
        suiteId: undefined,
        testCount: 2,
        errorMessage: 'engine unreachable',
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.TESTABLE_RUN__FAILURE);
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      testableKind: 'ingest',
      testablePath: 'model::MyIngest',
      suiteId: undefined,
      mode: 'run-all-failing',
      testCount: 2,
      errorMessage: 'engine unreachable',
    });
  });
});

describe('LegendStudioTelemetryHelper - global test run', () => {
  const RUN_BASE = {
    scope: GLOBAL_TEST_RUN_SCOPE.ALL,
    testableCount: 5,
  };

  test('logEvent_GlobalTestRunLaunched emits LAUNCH with scope and testableCount', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_GlobalTestRunLaunched(
      service,
      TEST_SOURCE_INFO,
      RUN_BASE,
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.GLOBAL_TEST_RUN__LAUNCH);
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      scope: 'all',
      testableCount: 5,
    });
  });

  test('logEvent_GlobalTestRunSucceeded emits SUCCESS with duration and result buckets', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_GlobalTestRunSucceeded(
      service,
      undefined,
      {
        ...RUN_BASE,
        scope: GLOBAL_TEST_RUN_SCOPE.DEPENDENCIES,
        testableCount: 3,
        durationMs: 4200,
        passedCount: 7,
        failedCount: 2,
        erroredCount: 1,
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.GLOBAL_TEST_RUN__SUCCESS);
    expect(call.data).toEqual({
      sourceInfo: undefined,
      scope: 'dependencies',
      testableCount: 3,
      durationMs: 4200,
      passedCount: 7,
      failedCount: 2,
      erroredCount: 1,
    });
  });

  test('logEvent_GlobalTestRunFailure emits FAILURE with errorMessage', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_GlobalTestRunFailure(
      service,
      TEST_SOURCE_INFO,
      { ...RUN_BASE, errorMessage: 'engine unreachable' },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.GLOBAL_TEST_RUN__FAILURE);
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      scope: 'all',
      testableCount: 5,
      errorMessage: 'engine unreachable',
    });
  });
});

describe('LegendStudioTelemetryHelper - SDLC review lifecycle', () => {
  test('logEvent_SdlcReviewActionLaunched (author create) omits reviewId and carries sourceInfo', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_SdlcReviewActionLaunched(
      service,
      TEST_SOURCE_INFO,
      {
        action: SDLC_REVIEW_ACTION.CREATE,
        role: SDLC_REVIEW_ROLE.AUTHOR,
        projectId: 'PROJ-123',
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.SDLC_REVIEW_ACTION__LAUNCH);
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      action: 'create',
      role: 'author',
      projectId: 'PROJ-123',
    });
  });

  test('logEvent_SdlcReviewActionSucceeded (author create) carries reviewId and durationMs', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_SdlcReviewActionSucceeded(
      service,
      TEST_SOURCE_INFO,
      {
        action: SDLC_REVIEW_ACTION.CREATE,
        role: SDLC_REVIEW_ROLE.AUTHOR,
        projectId: 'PROJ-123',
        reviewId: 'R-42',
        durationMs: 900,
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.SDLC_REVIEW_ACTION__SUCCESS,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      action: 'create',
      role: 'author',
      projectId: 'PROJ-123',
      reviewId: 'R-42',
      durationMs: 900,
    });
  });

  test('logEvent_SdlcReviewActionFailure (author commit) carries reviewId, errorMessage and patchReleaseVersionId', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_SdlcReviewActionFailure(
      service,
      TEST_SOURCE_INFO,
      {
        action: SDLC_REVIEW_ACTION.COMMIT,
        role: SDLC_REVIEW_ROLE.AUTHOR,
        projectId: 'PROJ-123',
        patchReleaseVersionId: '1.2.3',
        reviewId: 'R-42',
        errorMessage: 'conflict on server',
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.SDLC_REVIEW_ACTION__FAILURE,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      action: 'commit',
      role: 'author',
      projectId: 'PROJ-123',
      patchReleaseVersionId: '1.2.3',
      reviewId: 'R-42',
      errorMessage: 'conflict on server',
    });
  });

  test('logEvent_SdlcReviewActionSucceeded (reviewer approve) omits sourceInfo', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_SdlcReviewActionSucceeded(
      service,
      undefined,
      {
        action: SDLC_REVIEW_ACTION.APPROVE,
        role: SDLC_REVIEW_ROLE.REVIEWER,
        projectId: 'PROJ-123',
        reviewId: 'R-99',
        durationMs: 350,
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.SDLC_REVIEW_ACTION__SUCCESS,
    );
    expect(call.data).toEqual({
      sourceInfo: undefined,
      action: 'approve',
      role: 'reviewer',
      projectId: 'PROJ-123',
      reviewId: 'R-99',
      durationMs: 350,
    });
  });
});

describe('LegendStudioTelemetryHelper - service registration precheck', () => {
  const CHECK_BASE = { servicePath: 'demo::Service', envCount: 3 };

  test('logEvent_ServiceRegistrationCheckLaunched emits SERVICE_REGISTRATION_CHECK_LAUNCH with servicePath and envCount', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_ServiceRegistrationCheckLaunched(
      service,
      TEST_SOURCE_INFO,
      CHECK_BASE,
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.SERVICE_REGISTRATION_CHECK_LAUNCH,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      servicePath: 'demo::Service',
      envCount: 3,
    });
  });

  test('logEvent_ServiceRegistrationCheckSucceeded emits SERVICE_REGISTRATION_CHECK_SUCCESS with counts and durationMs', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_ServiceRegistrationCheckSucceeded(
      service,
      TEST_SOURCE_INFO,
      {
        ...CHECK_BASE,
        durationMs: 987,
        registeredEnvCount: 2,
        errorCount: 1,
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.SERVICE_REGISTRATION_CHECK_SUCCESS,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      servicePath: 'demo::Service',
      envCount: 3,
      durationMs: 987,
      registeredEnvCount: 2,
      errorCount: 1,
    });
  });

  test('logEvent_ServiceRegistrationCheckFailure emits SERVICE_REGISTRATION_CHECK_FAILURE with env and errorMessage', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_ServiceRegistrationCheckFailure(
      service,
      undefined,
      {
        servicePath: 'demo::Service',
        env: 'PROD',
        errorMessage: 'timeout',
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.SERVICE_REGISTRATION_CHECK_FAILURE,
    );
    expect(call.data).toEqual({
      sourceInfo: undefined,
      servicePath: 'demo::Service',
      env: 'PROD',
      errorMessage: 'timeout',
    });
  });
});

describe('LegendStudioTelemetryHelper - generation lifecycle', () => {
  test('logEvent_GenerationLaunched emits GENERATION_LAUNCH with mode and enableArtifactGeneration for global runs', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_GenerationLaunched(
      service,
      TEST_SOURCE_INFO,
      { mode: GENERATION_MODE.GLOBAL, enableArtifactGeneration: true },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.GENERATION_LAUNCH);
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      mode: 'global',
      enableArtifactGeneration: true,
    });
  });

  test('logEvent_GenerationSucceeded emits GENERATION_SUCCESS with elementPath, generationType, and durationMs for element-schema runs', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_GenerationSucceeded(
      service,
      TEST_SOURCE_INFO,
      {
        mode: GENERATION_MODE.ELEMENT_SCHEMA,
        elementPath: 'demo::MyClass',
        generationType: 'Avro',
        durationMs: 4321,
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.GENERATION_SUCCESS);
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      mode: 'element-schema',
      elementPath: 'demo::MyClass',
      generationType: 'Avro',
      durationMs: 4321,
    });
  });

  test('logEvent_GenerationFailure emits GENERATION_FAILURE with errorMessage', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_GenerationFailure(service, undefined, {
      mode: GENERATION_MODE.GLOBAL,
      errorMessage: 'no generation specification found',
    });

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.GENERATION_FAILURE);
    expect(call.data).toEqual({
      sourceInfo: undefined,
      mode: 'global',
      errorMessage: 'no generation specification found',
    });
  });
});

describe('LegendStudioTelemetryHelper - editor tabs', () => {
  test('logEvent_EditorTabOpened emits EDITOR_TAB__OPEN for an element tab with kind + path + trigger', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_EditorTabOpened(
      service,
      TEST_SOURCE_INFO,
      {
        tabKind: EDITOR_TAB_KIND.ELEMENT,
        elementKind: 'MAPPING',
        elementPath: 'demo::MyMapping',
        trigger: EDITOR_TAB_OPEN_TRIGGER.PROGRAMMATIC,
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.EDITOR_TAB__OPEN);
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      tabKind: 'element',
      elementKind: 'MAPPING',
      elementPath: 'demo::MyMapping',
      trigger: 'programmatic',
    });
  });

  test('logEvent_EditorTabOpened supports non-element tabs without elementKind/elementPath', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_EditorTabOpened(
      service,
      TEST_SOURCE_INFO,
      {
        tabKind: EDITOR_TAB_KIND.MODEL_IMPORTER,
        trigger: EDITOR_TAB_OPEN_TRIGGER.PROGRAMMATIC,
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.EDITOR_TAB__OPEN);
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      tabKind: 'model-importer',
      trigger: 'programmatic',
    });
  });

  test('logEvent_EditorTabOpened supports RESTORE trigger for cache-recovered tabs', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_EditorTabOpened(
      service,
      TEST_SOURCE_INFO,
      {
        tabKind: EDITOR_TAB_KIND.ELEMENT,
        elementKind: 'SERVICE',
        elementPath: 'demo::MyService',
        trigger: EDITOR_TAB_OPEN_TRIGGER.RESTORE,
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.data.trigger).toBe('restore');
  });

  test('logEvent_EditorTabClosed emits EDITOR_TAB__CLOSE with dwellMs and trigger', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_EditorTabClosed(
      service,
      TEST_SOURCE_INFO,
      {
        tabKind: EDITOR_TAB_KIND.ELEMENT,
        elementKind: 'CLASS',
        elementPath: 'demo::MyClass',
        dwellMs: 15000,
        trigger: EDITOR_TAB_CLOSE_TRIGGER.USER_CLOSE,
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.EDITOR_TAB__CLOSE);
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      tabKind: 'element',
      elementKind: 'CLASS',
      elementPath: 'demo::MyClass',
      dwellMs: 15000,
      trigger: 'user-close',
    });
  });

  test('logEvent_EditorTabClosed supports the bulk close triggers', () => {
    const closeOthers = buildTelemetryStub();
    LegendStudioTelemetryHelper.logEvent_EditorTabClosed(
      closeOthers.service,
      TEST_SOURCE_INFO,
      {
        tabKind: EDITOR_TAB_KIND.ELEMENT,
        elementKind: 'SERVICE',
        elementPath: 'demo::S',
        dwellMs: 0,
        trigger: EDITOR_TAB_CLOSE_TRIGGER.CLOSE_OTHERS,
      },
    );
    expect(guaranteeNonNullable(closeOthers.calls[0]).data.trigger).toBe(
      'close-others',
    );

    const closeAll = buildTelemetryStub();
    LegendStudioTelemetryHelper.logEvent_EditorTabClosed(
      closeAll.service,
      TEST_SOURCE_INFO,
      {
        tabKind: EDITOR_TAB_KIND.ELEMENT,
        elementKind: 'SERVICE',
        elementPath: 'demo::S',
        dwellMs: 0,
        trigger: EDITOR_TAB_CLOSE_TRIGGER.CLOSE_ALL,
      },
    );
    expect(guaranteeNonNullable(closeAll.calls[0]).data.trigger).toBe(
      'close-all',
    );

    const navigateAway = buildTelemetryStub();
    LegendStudioTelemetryHelper.logEvent_EditorTabClosed(
      navigateAway.service,
      undefined,
      {
        tabKind: EDITOR_TAB_KIND.ELEMENT,
        elementKind: 'SERVICE',
        elementPath: 'demo::S',
        dwellMs: 0,
        trigger: EDITOR_TAB_CLOSE_TRIGGER.NAVIGATE_AWAY,
      },
    );
    expect(guaranteeNonNullable(navigateAway.calls[0]).data.trigger).toBe(
      'navigate-away',
    );
  });
});

describe('LegendStudioTelemetryHelper - workspace setup actions', () => {
  test('logEvent_SetupActionLaunched (create-project) omits sourceInfo and identifier fields', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_SetupActionLaunched(service, {
      action: SETUP_ACTION.CREATE_PROJECT,
    });

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.SETUP_ACTION__LAUNCH);
    expect(call.data).toEqual({
      sourceInfo: undefined,
      action: 'create-project',
    });
  });

  test('logEvent_SetupActionLaunched (create-workspace) carries projectId, workspaceType and patch flag', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_SetupActionLaunched(service, {
      action: SETUP_ACTION.CREATE_WORKSPACE,
      projectId: 'PROJ-1',
      workspaceType: 'USER',
      hasPatchReleaseVersion: true,
    });

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.SETUP_ACTION__LAUNCH);
    expect(call.data).toEqual({
      sourceInfo: undefined,
      action: 'create-workspace',
      projectId: 'PROJ-1',
      workspaceType: 'USER',
      hasPatchReleaseVersion: true,
    });
  });

  test('logEvent_SetupActionSucceeded (import-project) carries projectId and durationMs', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_SetupActionSucceeded(service, {
      action: SETUP_ACTION.IMPORT_PROJECT,
      projectId: 'PROJ-9',
      durationMs: 1200,
    });

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.SETUP_ACTION__SUCCESS);
    expect(call.data).toEqual({
      sourceInfo: undefined,
      action: 'import-project',
      projectId: 'PROJ-9',
      durationMs: 1200,
    });
  });

  test('logEvent_SetupActionFailure (create-sandbox-project) carries errorMessage', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_SetupActionFailure(service, {
      action: SETUP_ACTION.CREATE_SANDBOX_PROJECT,
      errorMessage: 'no sandbox access',
    });

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.SETUP_ACTION__FAILURE);
    expect(call.data).toEqual({
      sourceInfo: undefined,
      action: 'create-sandbox-project',
      errorMessage: 'no sandbox access',
    });
  });
});

describe('LegendStudioTelemetryHelper - project configuration update', () => {
  test('logEvent_ProjectConfigUpdateLaunched carries action and sourceInfo', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_ProjectConfigUpdateLaunched(
      service,
      TEST_SOURCE_INFO,
      { action: PROJECT_CONFIG_UPDATE_ACTION.UPDATE_CONFIGS },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.PROJECT_CONFIG_UPDATE__LAUNCH,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      action: 'update-configs',
    });
  });

  test('logEvent_ProjectConfigUpdateSucceeded carries durationMs', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_ProjectConfigUpdateSucceeded(
      service,
      TEST_SOURCE_INFO,
      {
        action: PROJECT_CONFIG_UPDATE_ACTION.UPDATE_TO_LATEST_STRUCTURE,
        durationMs: 1500,
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.PROJECT_CONFIG_UPDATE__SUCCESS,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      action: 'update-to-latest-structure',
      durationMs: 1500,
    });
  });

  test('logEvent_ProjectConfigUpdateFailure carries errorMessage', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_ProjectConfigUpdateFailure(
      service,
      undefined,
      {
        action: PROJECT_CONFIG_UPDATE_ACTION.CHANGE_PROJECT_TYPE,
        errorMessage: 'server rejected',
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.PROJECT_CONFIG_UPDATE__FAILURE,
    );
    expect(call.data).toEqual({
      sourceInfo: undefined,
      action: 'change-project-type',
      errorMessage: 'server rejected',
    });
  });
});

describe('LegendStudioTelemetryHelper - project overview actions', () => {
  test('logEvent_ProjectOverviewActionLaunched (delete-workspace) carries projectId, patch and workspace type', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_ProjectOverviewActionLaunched(
      service,
      TEST_SOURCE_INFO,
      {
        action: PROJECT_OVERVIEW_ACTION.DELETE_WORKSPACE,
        projectId: 'PROJ-1',
        patchReleaseVersionId: '1.2.3',
        workspaceType: 'USER',
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.PROJECT_OVERVIEW_ACTION__LAUNCH,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      action: 'delete-workspace',
      projectId: 'PROJ-1',
      patchReleaseVersionId: '1.2.3',
      workspaceType: 'USER',
    });
  });

  test('logEvent_ProjectOverviewActionSucceeded (update-project) carries durationMs', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_ProjectOverviewActionSucceeded(
      service,
      TEST_SOURCE_INFO,
      {
        action: PROJECT_OVERVIEW_ACTION.UPDATE_PROJECT,
        projectId: 'PROJ-2',
        durationMs: 500,
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.PROJECT_OVERVIEW_ACTION__SUCCESS,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      action: 'update-project',
      projectId: 'PROJ-2',
      durationMs: 500,
    });
  });

  test('logEvent_ProjectOverviewActionSucceeded (release-patch) carries patchReleaseVersionId', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_ProjectOverviewActionSucceeded(
      service,
      undefined,
      {
        action: PROJECT_OVERVIEW_ACTION.RELEASE_PATCH,
        projectId: 'PROJ-3',
        patchReleaseVersionId: '2.0.0',
        durationMs: 3200,
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.PROJECT_OVERVIEW_ACTION__SUCCESS,
    );
    expect(call.data).toEqual({
      sourceInfo: undefined,
      action: 'release-patch',
      projectId: 'PROJ-3',
      patchReleaseVersionId: '2.0.0',
      durationMs: 3200,
    });
  });

  test('logEvent_ProjectOverviewActionFailure (create-version) carries errorMessage', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_ProjectOverviewActionFailure(
      service,
      TEST_SOURCE_INFO,
      {
        action: PROJECT_OVERVIEW_ACTION.CREATE_VERSION,
        projectId: 'PROJ-4',
        errorMessage: 'server rejected',
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.PROJECT_OVERVIEW_ACTION__FAILURE,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      action: 'create-version',
      projectId: 'PROJ-4',
      errorMessage: 'server rejected',
    });
  });

  test('logEvent_ProjectOverviewActionFailure (create-patch) carries patchReleaseVersionId, workspaceType and errorMessage', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_ProjectOverviewActionFailure(
      service,
      TEST_SOURCE_INFO,
      {
        action: PROJECT_OVERVIEW_ACTION.CREATE_PATCH,
        projectId: 'PROJ-5',
        patchReleaseVersionId: '1.5.0',
        workspaceType: 'GROUP',
        errorMessage: 'name conflict',
      },
    );

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.PROJECT_OVERVIEW_ACTION__FAILURE,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      action: 'create-patch',
      projectId: 'PROJ-5',
      patchReleaseVersionId: '1.5.0',
      workspaceType: 'GROUP',
      errorMessage: 'name conflict',
    });
  });
});

describe('LegendStudioTelemetryHelper - ad-hoc workspace creation', () => {
  test('logEvent_SdlcWorkspaceCreateLaunched omits sourceInfo and carries identity', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_SdlcWorkspaceCreateLaunched(service, {
      projectId: 'PROJ-1',
      workspaceId: 'ws-1',
      workspaceType: 'USER',
      hasPatchReleaseVersion: false,
    });

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.SDLC_WORKSPACE_CREATE__LAUNCH,
    );
    expect(call.data).toEqual({
      sourceInfo: undefined,
      projectId: 'PROJ-1',
      workspaceId: 'ws-1',
      workspaceType: 'USER',
      hasPatchReleaseVersion: false,
    });
  });

  test('logEvent_SdlcWorkspaceCreateSucceeded carries durationMs and patch flag', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_SdlcWorkspaceCreateSucceeded(service, {
      projectId: 'PROJ-2',
      workspaceId: 'ws-2',
      workspaceType: 'GROUP',
      hasPatchReleaseVersion: true,
      durationMs: 900,
    });

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.SDLC_WORKSPACE_CREATE__SUCCESS,
    );
    expect(call.data).toEqual({
      sourceInfo: undefined,
      projectId: 'PROJ-2',
      workspaceId: 'ws-2',
      workspaceType: 'GROUP',
      hasPatchReleaseVersion: true,
      durationMs: 900,
    });
  });

  test('logEvent_SdlcWorkspaceCreateFailure carries errorMessage', () => {
    const { service, calls } = buildTelemetryStub();

    LegendStudioTelemetryHelper.logEvent_SdlcWorkspaceCreateFailure(service, {
      projectId: 'PROJ-3',
      workspaceId: 'ws-3',
      workspaceType: 'USER',
      hasPatchReleaseVersion: false,
      errorMessage: 'permission denied',
    });

    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.SDLC_WORKSPACE_CREATE__FAILURE,
    );
    expect(call.data).toEqual({
      sourceInfo: undefined,
      projectId: 'PROJ-3',
      workspaceId: 'ws-3',
      workspaceType: 'USER',
      hasPatchReleaseVersion: false,
      errorMessage: 'permission denied',
    });
  });
});

describe('LegendStudioTelemetryHelper - workflow manager (fetch / logs / refresh)', () => {
  test('logEvent_WorkflowManagerFetchWorkflowsLaunched carries scope + sourceInfo', () => {
    const { service, calls } = buildTelemetryStub();
    LegendStudioTelemetryHelper.logEvent_WorkflowManagerFetchWorkflowsLaunched(
      service,
      TEST_SOURCE_INFO,
      { scope: WORKFLOW_MANAGER_SCOPE.WORKSPACE },
    );
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_FETCH_WORKFLOWS__LAUNCH,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      scope: WORKFLOW_MANAGER_SCOPE.WORKSPACE,
    });
  });

  test('logEvent_WorkflowManagerFetchJobsLaunched carries scope', () => {
    const { service, calls } = buildTelemetryStub();
    LegendStudioTelemetryHelper.logEvent_WorkflowManagerFetchJobsLaunched(
      service,
      undefined,
      { scope: WORKFLOW_MANAGER_SCOPE.PROJECT },
    );
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_FETCH_JOBS__LAUNCH,
    );
    expect(call.data).toEqual({
      sourceInfo: undefined,
      scope: WORKFLOW_MANAGER_SCOPE.PROJECT,
    });
  });

  test('logEvent_WorkflowManagerFetchJobsFailure carries errorMessage', () => {
    const { service, calls } = buildTelemetryStub();
    LegendStudioTelemetryHelper.logEvent_WorkflowManagerFetchJobsFailure(
      service,
      TEST_SOURCE_INFO,
      { scope: WORKFLOW_MANAGER_SCOPE.WORKSPACE, errorMessage: 'jobs boom' },
    );
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_FETCH_JOBS__FAILURE,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      scope: WORKFLOW_MANAGER_SCOPE.WORKSPACE,
      errorMessage: 'jobs boom',
    });
  });

  test('logEvent_WorkflowManagerWorkflowRefresh carries workflow status', () => {
    const { service, calls } = buildTelemetryStub();
    LegendStudioTelemetryHelper.logEvent_WorkflowManagerWorkflowRefresh(
      service,
      TEST_SOURCE_INFO,
      {
        scope: WORKFLOW_MANAGER_SCOPE.WORKSPACE,
        workflowStatus: 'SUCCEEDED',
      },
    );
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_WORKFLOW__REFRESH,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      scope: WORKFLOW_MANAGER_SCOPE.WORKSPACE,
      workflowStatus: 'SUCCEEDED',
    });
  });

  test('logEvent_WorkflowManagerJobLogsOpened carries job name + status', () => {
    const { service, calls } = buildTelemetryStub();
    LegendStudioTelemetryHelper.logEvent_WorkflowManagerJobLogsOpened(
      service,
      TEST_SOURCE_INFO,
      {
        scope: WORKFLOW_MANAGER_SCOPE.WORKSPACE,
        jobName: 'build',
        jobStatus: 'FAILED',
      },
    );
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_JOB_LOGS__OPEN,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      scope: WORKFLOW_MANAGER_SCOPE.WORKSPACE,
      jobName: 'build',
      jobStatus: 'FAILED',
    });
  });

  test('logEvent_WorkflowManagerJobLogsRefresh carries job name', () => {
    const { service, calls } = buildTelemetryStub();
    LegendStudioTelemetryHelper.logEvent_WorkflowManagerJobLogsRefresh(
      service,
      TEST_SOURCE_INFO,
      { scope: WORKFLOW_MANAGER_SCOPE.WORKSPACE, jobName: 'build' },
    );
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_JOB_LOGS__REFRESH,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      scope: WORKFLOW_MANAGER_SCOPE.WORKSPACE,
      jobName: 'build',
    });
  });

  test('logEvent_WorkflowManagerJobLogsFetchFailure carries errorMessage', () => {
    const { service, calls } = buildTelemetryStub();
    LegendStudioTelemetryHelper.logEvent_WorkflowManagerJobLogsFetchFailure(
      service,
      TEST_SOURCE_INFO,
      {
        scope: WORKFLOW_MANAGER_SCOPE.WORKSPACE,
        jobName: 'build',
        errorMessage: 'logs boom',
      },
    );
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.WORKFLOW_MANAGER_JOB_LOGS_FETCH__FAILURE,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      scope: WORKFLOW_MANAGER_SCOPE.WORKSPACE,
      jobName: 'build',
      errorMessage: 'logs boom',
    });
  });
});

describe('LegendStudioTelemetryHelper - showcase manager', () => {
  test('logEvent_ShowcaseManagerLaunch forwards the metadata payload as-is', () => {
    const { service, calls } = buildTelemetryStub();
    const data = {
      showcasesTotalCount: 42,
      showcasesDevelopmentCount: 7,
      entryPoint: SHOWCASE_MANAGER_ENTRY_POINT.ACTIVITY_BAR,
    };
    LegendStudioTelemetryHelper.logEvent_ShowcaseManagerLaunch(service, data);
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.SHOWCASE_MANAGER_LAUNCH);
    expect(call.data).toEqual(data);
  });

  test('logEvent_ShowcaseManagerShowcaseProjectLaunch forwards the project payload', () => {
    const { service, calls } = buildTelemetryStub();
    const data = {
      showcasePath: 'demo::Case',
      title: 'Demo',
      isDevelopment: true,
      entryPoint: SHOWCASE_LAUNCH_ENTRY_POINT.EXPLORER,
    };
    LegendStudioTelemetryHelper.logEvent_ShowcaseManagerShowcaseProjectLaunch(
      service,
      data,
    );
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.SHOWCASE_MANAGER_SHOWCASE_PROJECT_LAUNCH,
    );
    expect(call.data).toEqual(data);
  });

  test('logEvent_ShowcaseViewerLaunch forwards the project payload', () => {
    const { service, calls } = buildTelemetryStub();
    const data = { showcasePath: 'demo::Case' };
    LegendStudioTelemetryHelper.logEvent_ShowcaseViewerLaunch(service, data);
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.SHOWCASE_VIEWER_LAUNCH);
    expect(call.data).toEqual(data);
  });

  test('logEvent_ShowcaseViewerClose forwards showcasePath + dwellMs', () => {
    const { service, calls } = buildTelemetryStub();
    const data = { showcasePath: 'demo::Case', dwellMs: 12345 };
    LegendStudioTelemetryHelper.logEvent_ShowcaseViewerClose(service, data);
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(LEGEND_STUDIO_APP_EVENT.SHOWCASE_VIEWER_CLOSE);
    expect(call.data).toEqual(data);
  });

  test('logEvent_ShowcaseSearchInitiated forwards searchText', () => {
    const { service, calls } = buildTelemetryStub();
    LegendStudioTelemetryHelper.logEvent_ShowcaseSearchInitiated(service, {
      searchText: 'dataspace',
    });
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.SHOWCASE_MANAGER_SEARCH__INITIATED,
    );
    expect(call.data).toEqual({ searchText: 'dataspace' });
  });

  test('logEvent_ShowcaseSearchCompleted forwards result counts and dwellMs', () => {
    const { service, calls } = buildTelemetryStub();
    const data = {
      searchText: 'dataspace',
      resultCount: 5,
      showcaseMatchCount: 3,
      textMatchCount: 2,
      durationMs: 250,
      hadResults: true,
    };
    LegendStudioTelemetryHelper.logEvent_ShowcaseSearchCompleted(service, data);
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.SHOWCASE_MANAGER_SEARCH__COMPLETED,
    );
    expect(call.data).toEqual(data);
  });

  test('logEvent_ShowcaseFeedbackSubmit forwards vote + surface', () => {
    const { service, calls } = buildTelemetryStub();
    const data = {
      showcasePath: 'demo::Case',
      vote: SHOWCASE_FEEDBACK_VOTE.UP,
      surface: SHOWCASE_FEEDBACK_SURFACE.DEEP_LINK_VIEWER,
    };
    LegendStudioTelemetryHelper.logEvent_ShowcaseFeedbackSubmit(service, data);
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.SHOWCASE_VIEWER_FEEDBACK__SUBMIT,
    );
    expect(call.data).toEqual(data);
  });

  test('logEvent_ShowcaseManagerInitFailure forwards errorMessage', () => {
    const { service, calls } = buildTelemetryStub();
    LegendStudioTelemetryHelper.logEvent_ShowcaseManagerInitFailure(service, {
      errorMessage: 'init boom',
    });
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.SHOWCASE_MANAGER_INIT__FAILURE,
    );
    expect(call.data).toEqual({ errorMessage: 'init boom' });
  });

  test('logEvent_ShowcaseManagerOpenFailure forwards errorMessage + showcasePath', () => {
    const { service, calls } = buildTelemetryStub();
    LegendStudioTelemetryHelper.logEvent_ShowcaseManagerOpenFailure(service, {
      errorMessage: 'open boom',
      showcasePath: 'demo::Case',
    });
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.SHOWCASE_MANAGER_OPEN__FAILURE,
    );
    expect(call.data).toEqual({
      errorMessage: 'open boom',
      showcasePath: 'demo::Case',
    });
  });

  test('logEvent_ShowcaseManagerSearchFailure forwards errorMessage + searchText', () => {
    const { service, calls } = buildTelemetryStub();
    LegendStudioTelemetryHelper.logEvent_ShowcaseManagerSearchFailure(service, {
      errorMessage: 'search boom',
      searchText: 'dataspace',
    });
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.SHOWCASE_MANAGER_SEARCH__FAILURE,
    );
    expect(call.data).toEqual({
      errorMessage: 'search boom',
      searchText: 'dataspace',
    });
  });
});

describe('LegendStudioTelemetryHelper - virtual assistant', () => {
  test('logEvent_VirtualAssistantPanelOpened emits application VIRTUAL_ASSISTANT_PANEL__OPEN', () => {
    const { service, calls } = buildTelemetryStub();
    LegendStudioTelemetryHelper.logEvent_VirtualAssistantPanelOpened(service);
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(APPLICATION_EVENT.VIRTUAL_ASSISTANT_PANEL__OPEN);
    expect(call.data).toEqual({});
  });

  test('logEvent_VirtualAssistantPanelClosed emits application VIRTUAL_ASSISTANT_PANEL__CLOSE', () => {
    const { service, calls } = buildTelemetryStub();
    LegendStudioTelemetryHelper.logEvent_VirtualAssistantPanelClosed(service);
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(APPLICATION_EVENT.VIRTUAL_ASSISTANT_PANEL__CLOSE);
    expect(call.data).toEqual({});
  });

  test('logEvent_VirtualAssistantTabAccessed carries tab name', () => {
    const { service, calls } = buildTelemetryStub();
    LegendStudioTelemetryHelper.logEvent_VirtualAssistantTabAccessed(
      service,
      'search',
    );
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(APPLICATION_EVENT.VIRTUAL_ASSISTANT_TAB__ACCESS);
    expect(call.data).toEqual({ tab: 'search' });
  });

  test('logEvent_VirtualAssistantDocumentationSearchInitiated carries searchText', () => {
    const { service, calls } = buildTelemetryStub();
    LegendStudioTelemetryHelper.logEvent_VirtualAssistantDocumentationSearchInitiated(
      service,
      'graph builder',
    );
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      APPLICATION_EVENT.VIRTUAL_ASSISTANT_DOCUMENTATION_SEARCH__INITIATED,
    );
    expect(call.data).toEqual({ searchText: 'graph builder' });
  });
});

describe('LegendStudioTelemetryHelper - data product LegendAI suggest', () => {
  const DATA_PRODUCT_PATH = 'demo::Product';

  test('logEvent_DataProductLegendAISuggestLaunched carries dataProductPath', () => {
    const { service, calls } = buildTelemetryStub();
    LegendStudioTelemetryHelper.logEvent_DataProductLegendAISuggestLaunched(
      service,
      DATA_PRODUCT_PATH,
      TEST_SOURCE_INFO,
    );
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.DATA_PRODUCT_LEGENDAI_SUGGEST__LAUNCH,
    );
    expect(call.data).toEqual({
      dataProductPath: DATA_PRODUCT_PATH,
      sourceInfo: TEST_SOURCE_INFO,
    });
  });

  test('logEvent_DataProductLegendAISuggestApplied emits APPLY event', () => {
    const { service, calls } = buildTelemetryStub();
    LegendStudioTelemetryHelper.logEvent_DataProductLegendAISuggestApplied(
      service,
      DATA_PRODUCT_PATH,
    );
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.DATA_PRODUCT_LEGENDAI_SUGGEST__APPLY,
    );
    expect(call.data).toEqual({
      dataProductPath: DATA_PRODUCT_PATH,
      sourceInfo: undefined,
    });
  });

  test('logEvent_DataProductLegendAISuggestDiscarded emits DISCARD event', () => {
    const { service, calls } = buildTelemetryStub();
    LegendStudioTelemetryHelper.logEvent_DataProductLegendAISuggestDiscarded(
      service,
      DATA_PRODUCT_PATH,
    );
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.DATA_PRODUCT_LEGENDAI_SUGGEST__DISCARD,
    );
    expect(call.data).toEqual({
      dataProductPath: DATA_PRODUCT_PATH,
      sourceInfo: undefined,
    });
  });

  test('logEvent_DataProductLegendAISuggestFailure carries errorMessage', () => {
    const { service, calls } = buildTelemetryStub();
    LegendStudioTelemetryHelper.logEvent_DataProductLegendAISuggestFailure(
      service,
      DATA_PRODUCT_PATH,
      'suggest boom',
      TEST_SOURCE_INFO,
    );
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.DATA_PRODUCT_LEGENDAI_SUGGEST__FAILURE,
    );
    expect(call.data).toEqual({
      dataProductPath: DATA_PRODUCT_PATH,
      errorMessage: 'suggest boom',
      sourceInfo: TEST_SOURCE_INFO,
    });
  });
});

describe('LegendStudioTelemetryHelper - dev metadata push', () => {
  const LAKEHOUSE_COUNTS = { ingestCount: 3, dataProductCount: 5 };

  test('logEvent_DevMetadataPushLaunched flattens counts + coords into payload', () => {
    const { service, calls } = buildTelemetryStub();
    LegendStudioTelemetryHelper.logEvent_DevMetadataPushLaunched(
      service,
      TEST_SOURCE_INFO,
      'org.finos.legend',
      'my-project',
      '1.0.0',
      LAKEHOUSE_COUNTS,
    );
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.METADATA_PUSH_TO_METADATA__LAUNCH,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      groupId: 'org.finos.legend',
      artifactId: 'my-project',
      versionId: '1.0.0',
      ingestCount: 3,
      dataProductCount: 5,
    });
  });

  test('logEvent_DevMetadataPushSucceeded carries status + counts', () => {
    const { service, calls } = buildTelemetryStub();
    LegendStudioTelemetryHelper.logEvent_DevMetadataPushSucceeded(
      service,
      TEST_SOURCE_INFO,
      'org.finos.legend',
      'my-project',
      undefined,
      'COMPLETED',
      LAKEHOUSE_COUNTS,
    );
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.METADATA_PUSH_TO_METADATA__SUCCESS,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      groupId: 'org.finos.legend',
      artifactId: 'my-project',
      versionId: undefined,
      status: 'COMPLETED',
      ingestCount: 3,
      dataProductCount: 5,
    });
  });

  test('logEvent_DevMetadataPushFailure carries errorMessage', () => {
    const { service, calls } = buildTelemetryStub();
    LegendStudioTelemetryHelper.logEvent_DevMetadataPushFailure(
      service,
      TEST_SOURCE_INFO,
      'push boom',
    );
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(
      LEGEND_STUDIO_APP_EVENT.METADATA_PUSH_TO_METADATA__FAILURE,
    );
    expect(call.data).toEqual({
      sourceInfo: TEST_SOURCE_INFO,
      errorMessage: 'push boom',
    });
  });
});
