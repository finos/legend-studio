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
import { NetworkClientError } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import {
  CompilationError,
  DependencyGraphBuilderError,
  EngineError,
  GraphDataDeserializationError,
} from '@finos/legend-graph';
import { TEST__getTestEditorStore } from '../__test-utils__/EditorStoreTestUtils.js';
import type { EditorStore } from '../EditorStore.js';
import type { GraphEditFormModeState } from '../GraphEditFormModeState.js';
import {
  FORM_MODE_COMPILATION_ERROR_KIND,
  GRAPH_INITIALIZATION_ERROR_KIND,
  LegendStudioTelemetryHelper,
} from '../../../__lib__/LegendStudioTelemetryHelper.js';

/**
 * These tests protect the errorKind classification contract that lives in the
 * catch blocks of `EditorGraphState.buildGraph` and
 * `GraphEditFormModeState.globalCompile`. We spy on the telemetry helper,
 * force each error subclass through the catch, and assert that the emitted
 * payload's `errorKind` (and `fallbackToTextMode`) matches what the mapping
 * promised.
 *
 * We are intentionally NOT exercising the downstream recovery UI (mode
 * switches, tab reveals, model-importer redirect) — those side effects are
 * stubbed out. The only behaviour under test is the classification.
 */

const buildFailingEditorStore = (throwFn: () => void): EditorStore => {
  const editorStore = TEST__getTestEditorStore();
  // The very first side-effecting call in `buildGraph`'s try block. Making it
  // throw drops us straight into the catch with our error of choice, without
  // needing to spin up dependency fetching or the graph manager.
  jest
    .spyOn(editorStore.graphManagerState, 'resetGraph')
    .mockImplementation(throwFn);
  // `OTHER` and (in some branches) `NETWORK`/`DESERIALIZATION` recovery paths
  // yield into `editorStore.switchModes`. Stub it to a resolved flow so
  // `flowResult` returns without exercising the real mode-switch pipeline.
  jest
    .spyOn(editorStore, 'switchModes')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .mockReturnValue(Promise.resolve() as any);
  // The DESERIALIZATION branch calls this private helper — stub it so the
  // model-importer side effects (which need a real graph) don't fire.
  jest
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .spyOn(editorStore.graphState as any, 'redirectToModelImporterForDebugging')
    .mockImplementation(() => {});
  return editorStore;
};

describe(unitTest('EditorGraphState.buildGraph error classification'), () => {
  let failureSpy: jest.SpiedFunction<
    typeof LegendStudioTelemetryHelper.logEvent_GraphInitializationFailure
  >;

  beforeEach(() => {
    failureSpy = jest
      .spyOn(LegendStudioTelemetryHelper, 'logEvent_GraphInitializationFailure')
      .mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const expectClassification = async (
    error: Error,
    expected: {
      errorKind: GRAPH_INITIALIZATION_ERROR_KIND;
      fallbackToTextMode: boolean;
    },
  ): Promise<void> => {
    const editorStore = buildFailingEditorStore(() => {
      throw error;
    });
    await flowResult(editorStore.graphState.buildGraph([]));
    expect(failureSpy).toHaveBeenCalledTimes(1);
    const payload = failureSpy.mock.calls[0]?.[2];
    expect(payload).toEqual({
      errorKind: expected.errorKind,
      errorMessage: error.message,
      fallbackToTextMode: expected.fallbackToTextMode,
    });
  };

  test('DependencyGraphBuilderError classifies as DEPENDENCY (no text-mode fallback)', async () => {
    await expectClassification(new DependencyGraphBuilderError('dep boom'), {
      errorKind: GRAPH_INITIALIZATION_ERROR_KIND.DEPENDENCY,
      fallbackToTextMode: false,
    });
  });

  test('GraphDataDeserializationError classifies as DESERIALIZATION (no text-mode fallback)', async () => {
    await expectClassification(
      new GraphDataDeserializationError('deser boom'),
      {
        errorKind: GRAPH_INITIALIZATION_ERROR_KIND.DESERIALIZATION,
        fallbackToTextMode: false,
      },
    );
  });

  test('NetworkClientError classifies as NETWORK (no text-mode fallback)', async () => {
    const networkError = new NetworkClientError(
      {
        status: 503,
        statusText: 'Service Unavailable',
        url: 'https://example.test/graph',
      } as unknown as Response,
      undefined,
    );
    await expectClassification(networkError, {
      errorKind: GRAPH_INITIALIZATION_ERROR_KIND.NETWORK,
      fallbackToTextMode: false,
    });
  });

  test('Unknown Error classifies as OTHER and falls back to text mode', async () => {
    await expectClassification(new Error('unexpected boom'), {
      errorKind: GRAPH_INITIALIZATION_ERROR_KIND.OTHER,
      fallbackToTextMode: true,
    });
  });
});

describe(
  unitTest('GraphEditFormModeState.globalCompile error classification'),
  () => {
    let failureSpy: jest.SpiedFunction<
      typeof LegendStudioTelemetryHelper.logEvent_GraphCompilationFailure
    >;

    beforeEach(() => {
      failureSpy = jest
        .spyOn(LegendStudioTelemetryHelper, 'logEvent_GraphCompilationFailure')
        .mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    const runCompile = async (
      error: Error,
      options?: { switchModesError?: Error },
    ): Promise<void> => {
      const editorStore = TEST__getTestEditorStore();
      // Force the compile step to reject with our target error.
      jest
        .spyOn(editorStore.graphManagerState.graphManager, 'compileGraph')
        .mockRejectedValue(error);
      // Both reachable branches (CompilationError with unresolvable coords,
      // and plain EngineError) end up yielding `switchModes` for the
      // text-mode fallback. Stub it to a resolved (or rejected) flow.
      const switchModesError = options?.switchModesError;
      const switchModes = (): Promise<void> =>
        switchModesError ? Promise.reject(switchModesError) : Promise.resolve();
      jest
        .spyOn(editorStore, 'switchModes')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .mockImplementation(switchModes as any);
      const formMode = editorStore.graphEditorMode as GraphEditFormModeState;
      await flowResult(formMode.globalCompile());
    };

    test('CompilationError (no source information) classifies as COMPILATION and falls back to text mode', async () => {
      const error = new CompilationError('compile boom');
      await runCompile(error);
      expect(failureSpy).toHaveBeenCalledTimes(1);
      expect(failureSpy.mock.calls[0]?.[2]).toEqual({
        errorKind: FORM_MODE_COMPILATION_ERROR_KIND.COMPILATION,
        errorMessage: error.message,
        fallbackToTextMode: true,
      });
    });

    test('plain EngineError classifies as ENGINE and falls back to text mode', async () => {
      const error = new EngineError('engine boom');
      await runCompile(error);
      expect(failureSpy).toHaveBeenCalledTimes(1);
      expect(failureSpy.mock.calls[0]?.[2]).toEqual({
        errorKind: FORM_MODE_COMPILATION_ERROR_KIND.ENGINE,
        errorMessage: error.message,
        fallbackToTextMode: true,
      });
    });

    test('non-engine error classifies as OTHER (no text-mode fallback) before being re-thrown', async () => {
      const error = new Error('network boom');
      await expect(runCompile(error)).rejects.toThrow();
      expect(failureSpy).toHaveBeenCalledTimes(1);
      expect(failureSpy.mock.calls[0]?.[2]).toEqual({
        errorKind: FORM_MODE_COMPILATION_ERROR_KIND.OTHER,
        errorMessage: error.message,
        fallbackToTextMode: false,
      });
    });

    test('failure is emitted even when the text-mode fallback itself throws', async () => {
      const error = new EngineError('engine boom');
      await expect(
        runCompile(error, { switchModesError: new Error('switch boom') }),
      ).rejects.toThrow('switch boom');
      expect(failureSpy).toHaveBeenCalledTimes(1);
      expect(failureSpy.mock.calls[0]?.[2]).toMatchObject({
        errorKind: FORM_MODE_COMPILATION_ERROR_KIND.ENGINE,
        fallbackToTextMode: true,
      });
    });
  },
);
