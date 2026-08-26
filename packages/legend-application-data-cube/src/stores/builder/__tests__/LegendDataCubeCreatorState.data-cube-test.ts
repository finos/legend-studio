/**
 * Copyright (c) 2025-present, Goldman Sachs
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

// NOTE: this must come first to break an existing module cycle
// (builder component -> store provider -> builder store -> builder component).
// The cycle only resolves when entered from the component side; reaching it from
// the store side leaves `withLegendDataCubeBuilderStore` undefined at evaluation.
import '../../../components/builder/LegendDataCubeBuilder.js';
import { unitTest } from '@finos/legend-shared/test';
import { expect, jest, test } from '@jest/globals';
import { DataCubeSpecification } from '@finos/legend-data-cube';
import { LegendDataCubeCreatorState } from '../LegendDataCubeCreatorState.js';
import type { LegendDataCubeBuilderStore } from '../LegendDataCubeBuilderStore.js';
import type { LegendDataCubeSourceBuilderState } from '../source/LegendDataCubeSourceBuilderState.js';

// `LegendDataCubeDuckDBEngine` uses `import.meta`, which jest can't parse; it is
// pulled in transitively through the creator's source builders and is unused here
// NOTE: the factory is hoisted above the `@jest/globals` import, so it must not
// reference `jest` itself - plain functions only
jest.mock('../../LegendDataCubeDuckDBEngine', () => ({
  LegendDataCubeDuckDBEngine: function LegendDataCubeDuckDBEngine() {
    return {
      initialize: () => Promise.resolve(),
      dispose: () => Promise.resolve(),
    };
  },
}));

// the creator always builds a default Legend Query source builder, whose
// constructor deserializes the core system models - irrelevant here, and it trips
// over serializr when this module graph is loaded from the store side
jest.mock('../source/LegendQueryDataCubeSourceBuilderState', () => ({
  LegendQueryDataCubeSourceBuilderState:
    function LegendQueryDataCubeSourceBuilderState() {
      return {
        label: 'Legend Query',
        isValid: false,
        generateSourceData: () => Promise.resolve({}),
        finalizeConfiguration: () => undefined,
      };
    },
}));

/**
 * A stand-in for a source builder, recording which instance the creator ends up
 * finalizing against so we can catch it finalizing the wrong one.
 */
const buildFakeSourceBuilder = (
  name: string,
  finalized: string[],
  generateSourceData: () => Promise<Record<string, unknown>> = async () => ({
    from: name,
  }),
) =>
  ({
    label: name,
    isValid: true,
    generateSourceData,
    finalizeConfiguration: () => {
      finalized.push(name);
    },
  }) as unknown as LegendDataCubeSourceBuilderState;

const buildHarness = (
  options: {
    processSource?: (data: unknown) => Promise<unknown>;
  } = {},
) => {
  const endedTasks: unknown[] = [];
  const alertedErrors: Error[] = [];

  const specification = new DataCubeSpecification();
  // a configuration must be present, else `finalizeConfiguration` is skipped
  specification.configuration = {} as DataCubeSpecification['configuration'];

  const store = {
    application: {
      navigationService: {
        navigator: {
          updateCurrentLocation: () => {
            // no-op
          },
        },
      },
    },
    engine: {
      processSource:
        options.processSource ?? (async (data: unknown) => ({ source: data })),
      generateBaseSpecification: async () => specification,
      sendTelemetry: () => {
        // no-op
      },
      getDataFromSource: () => ({}),
      getDataFromRawSource: () => ({}),
    },
    alertService: {
      alertError: (error: Error) => {
        alertedErrors.push(error);
      },
      alertUnhandledError: (error: Error) => {
        alertedErrors.push(error);
      },
    },
    layoutService: {
      newDisplay: () => ({
        open: () => {
          // no-op
        },
        close: () => {
          // no-op
        },
      }),
    },
    taskService: {
      newTask: (description: string) => description,
      endTask: (task: unknown) => {
        endedTasks.push(task);
      },
    },
    setBuilder: () => {
      // no-op
    },
  } as unknown as LegendDataCubeBuilderStore;

  return {
    state: new LegendDataCubeCreatorState(store),
    endedTasks,
    alertedErrors,
  };
};

test(
  unitTest(
    'finalize keeps using the source builder it started with when the source type changes mid-flight',
  ),
  async () => {
    const finalized: string[] = [];
    const { state } = buildHarness();

    let release: (() => void) | undefined;
    const inFlight = new Promise<void>((resolve) => {
      release = resolve;
    });

    state.sourceBuilder = buildFakeSourceBuilder('A', finalized, async () => {
      await inFlight;
      return { from: 'A' };
    });

    const finalizing = state.finalize();
    // the user switches source type while the request is still in flight
    state.sourceBuilder = buildFakeSourceBuilder('B', finalized);
    release?.();
    await finalizing;

    // finalizing against 'B' would apply a configuration derived from 'A'
    // to a completely different source
    expect(finalized).toEqual(['A']);
    expect(state.finalizeState.hasSucceeded).toBe(true);
  },
);

test(
  unitTest('finalize ignores a second call while one is already in progress'),
  async () => {
    const finalized: string[] = [];
    const { state } = buildHarness();

    let generateCalls = 0;
    let release: (() => void) | undefined;
    const inFlight = new Promise<void>((resolve) => {
      release = resolve;
    });

    state.sourceBuilder = buildFakeSourceBuilder('A', finalized, async () => {
      generateCalls += 1;
      await inFlight;
      return { from: 'A' };
    });

    const first = state.finalize();
    const second = state.finalize();
    release?.();
    await Promise.all([first, second]);

    expect(generateCalls).toBe(1);
    expect(finalized).toEqual(['A']);
  },
);

test(
  unitTest('finalize ends its task and reports the error when creation fails'),
  async () => {
    const finalized: string[] = [];
    const { state, endedTasks, alertedErrors } = buildHarness({
      processSource: async () => {
        throw new Error('cannot process source');
      },
    });
    state.sourceBuilder = buildFakeSourceBuilder('A', finalized);

    await state.finalize();

    expect(state.finalizeState.hasFailed).toBe(true);
    expect(endedTasks).toHaveLength(1);
    expect(alertedErrors).toHaveLength(1);
  },
);

test(
  unitTest('finalize ends its task on success so the status bar clears'),
  async () => {
    const finalized: string[] = [];
    const { state, endedTasks } = buildHarness();
    state.sourceBuilder = buildFakeSourceBuilder('A', finalized);

    await state.finalize();

    expect(state.finalizeState.hasSucceeded).toBe(true);
    expect(endedTasks).toHaveLength(1);
  },
);
