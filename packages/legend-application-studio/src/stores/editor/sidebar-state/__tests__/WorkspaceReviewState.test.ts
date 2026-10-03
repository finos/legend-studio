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

import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { flowResult, runInAction } from 'mobx';
import { unitTest } from '@finos/legend-shared/test';
import { Review } from '@finos/legend-server-sdlc';
import { TEST__getTestEditorStore } from '../../__test-utils__/EditorStoreTestUtils.js';
import { LegendStudioTelemetryHelper } from '../../../../__lib__/LegendStudioTelemetryHelper.js';

/**
 * Telemetry identity lookups (e.g. `sdlcState.activeProject`) can throw. They
 * must run inside the action's `try` so a failure is surfaced as a
 * notification and the in-progress flag is reset, rather than escaping the
 * flow with the UI stuck in a loading state.
 */
describe('WorkspaceReviewState telemetry identity lookups', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test(
    unitTest(
      'closeWorkspaceReview handles a failing identity lookup inside the try',
    ),
    async () => {
      const editorStore = TEST__getTestEditorStore();
      const workspaceReviewState = editorStore.workspaceReviewState;
      runInAction(() => {
        workspaceReviewState.workspaceReview = Object.assign(new Review(), {
          id: 'review-1',
        });
      });
      // no active project is set on the SDLC state, so `activeProject` throws
      expect(editorStore.sdlcState.currentProject).toBeUndefined();

      const notifyErrorSpy = jest
        .spyOn(editorStore.applicationStore.notificationService, 'notifyError')
        .mockImplementation(() => {});
      const launchSpy = jest
        .spyOn(LegendStudioTelemetryHelper, 'logEvent_SdlcReviewActionLaunched')
        .mockImplementation(() => {});
      const failureSpy = jest
        .spyOn(LegendStudioTelemetryHelper, 'logEvent_SdlcReviewActionFailure')
        .mockImplementation(() => {});

      await expect(
        flowResult(workspaceReviewState.closeWorkspaceReview()),
      ).resolves.toBeUndefined();

      expect(notifyErrorSpy).toHaveBeenCalledTimes(1);
      expect(workspaceReviewState.isClosingWorkspaceReview).toBe(false);
      // identity was never built, so neither lifecycle event is emitted
      expect(launchSpy).not.toHaveBeenCalled();
      expect(failureSpy).not.toHaveBeenCalled();
    },
  );
});
