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

import { describe, test, expect, jest } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { ActionState } from '@finos/legend-shared';
import { QueryBuilderResultState } from '../QueryBuilderResultState.js';

/**
 * Regression tests for the `exportState` lifecycle on the export failure path.
 *
 * `ActionState.complete()` defaults to `hasSucceeded = true`, so calling it
 * after `fail()` silently flips a genuine failure back to SUCCEEDED and the UI
 * reports a broken export as a successful one. These tests pin the terminal
 * state so that footgun cannot be reintroduced.
 */

/**
 * Minimal runner for the `exportData` generator. Rejections are fed back in
 * with `gen.throw()` so the generator's own try/catch handles them, the way
 * MobX `flow` does.
 */
const drive = async (generator: Generator): Promise<void> => {
  let step = generator.next();
  while (!step.done) {
    try {
      step = generator.next(await step.value);
    } catch (error) {
      step = generator.throw(error);
    }
  }
};

const buildResultState = (
  exportDataImpl: () => Promise<unknown>,
): { state: unknown; exportState: ActionState; logEvent: jest.Mock } => {
  const exportState = ActionState.create();
  const logEvent = jest.fn();
  const state = Object.assign(
    Object.create(QueryBuilderResultState.prototype) as object,
    {
      exportState,
      buildExecutionRawLambda: () => ({}),
      queryBuilderState: {
        applicationStore: {
          telemetryService: { logEvent },
          logService: { error: jest.fn(), warn: jest.fn() },
          notificationService: {
            notifySuccess: jest.fn(),
            notifyError: jest.fn(),
          },
        },
        fetchStructureState: {
          implementation: {
            getExportDataInfo: () => ({
              contentType: 'text/csv',
              serializationFormat: undefined,
            }),
          },
        },
        executionContextState: {
          explicitMappingValue: undefined,
          explicitRuntimeValue: undefined,
        },
        parametersState: { parameterStates: [] },
        graphManagerState: {
          graph: {},
          graphManager: { exportData: exportDataImpl },
        },
        forceFromExpressionForExec: false,
        floatingExecutionElements: undefined,
        safeGetQueryInfo: () => undefined,
        safeGetTelemetryContext: () => ({}),
        safeGetExtraTelemetryMetadata: () => ({}),
      },
    },
  );
  return { state, exportState, logEvent };
};

describe(unitTest('QueryBuilderResultState.exportData — failure state'), () => {
  test(
    unitTest('leaves exportState FAILED when the export request rejects'),
    async () => {
      const { state, exportState } = buildResultState(() =>
        Promise.reject(new Error('export blew up')),
      );

      await drive(
        QueryBuilderResultState.prototype.exportData.call(
          state as never,
          'CSV',
        ) as Generator,
      );

      // the bug this guards: `complete()` after `fail()` reported the failed
      // export as SUCCEEDED
      expect(exportState.hasFailed).toBe(true);
      expect(exportState.hasSucceeded).toBe(false);
      expect(exportState.isInProgress).toBe(false);
    },
  );

  test(
    unitTest('reports the export failure to telemetry with the error message'),
    async () => {
      const { state, logEvent } = buildResultState(() =>
        Promise.reject(new Error('export blew up')),
      );

      await drive(
        QueryBuilderResultState.prototype.exportData.call(
          state as never,
          'CSV',
        ) as Generator,
      );

      const failureCall = logEvent.mock.calls.find(
        (call) => call[0] === 'query-builder.export-query-data.failure',
      );
      expect(failureCall).toBeDefined();
      expect(failureCall?.[1]).toEqual(
        expect.objectContaining({
          errorMessage: 'export blew up',
          errorName: 'Error',
        }),
      );
    },
  );

  test(
    unitTest('never leaves exportState stuck in progress after a failure'),
    async () => {
      const { state, exportState } = buildResultState(() =>
        Promise.reject(new Error('export blew up')),
      );
      expect(exportState.isInInitialState).toBe(true);

      await drive(
        QueryBuilderResultState.prototype.exportData.call(
          state as never,
          'CSV',
        ) as Generator,
      );

      expect(exportState.isInProgress).toBe(false);
    },
  );
});
