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
import type { TelemetryService } from '@finos/legend-application';
import type { LegendSourceInfo } from '@finos/legend-storage';
import { LEGEND_STUDIO_APP_EVENT } from '../LegendStudioEvent.js';
import {
  GRAPH_EDITOR_MODE_LABEL,
  LegendStudioTelemetryHelper,
  TEXT_MODE_ACTION,
  TEXT_MODE_ACTION_STATUS,
  TEXT_MODE_COMPILATION_ERROR_KIND,
  TEXT_MODE_ENTER_TRIGGER,
  TEXT_MODE_LEAVE_OUTCOME,
  TEXT_MODE_TOGGLE_DIRECTION,
  TEXT_MODE_TOGGLE_SOURCE,
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
