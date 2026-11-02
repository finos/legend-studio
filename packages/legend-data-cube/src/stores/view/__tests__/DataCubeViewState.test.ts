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
import { ActionState } from '@finos/legend-shared';
import { DataCubeViewState } from '../DataCubeViewState.js';
import { DataCubeSpecification } from '../../core/model/DataCubeSpecification.js';

// `validateAndBuildSnapshot` talks to the engine and builds a full snapshot tree;
// irrelevant here, where we only care about which source `initialize()` ends up with
jest.mock('../../core/DataCubeSnapshotBuilder.js', () => ({
  validateAndBuildSnapshot: async () => ({}),
}));

// NOTE: skip the constructor (which builds real info/editor/grid/filter/extend
// states and a real snapshot service) and only provide what `initialize()` reaches into.
const makeView = (
  options: {
    initialSource?: unknown;
    processSource?: jest.Mock<(data: unknown) => Promise<unknown>>;
  } = {},
) => {
  const broadcastedSnapshots: unknown[] = [];
  const registeredSubscribers: unknown[] = [];
  const processSource =
    options.processSource ??
    jest.fn(async (data: unknown) => ({ data }) as unknown);

  const view = Object.create(DataCubeViewState.prototype) as DataCubeViewState;
  Object.assign(view, {
    dataCube: {
      options:
        options.initialSource !== undefined
          ? { initialSource: options.initialSource }
          : undefined,
      api: {},
    },
    engine: {
      processSource,
      parseValueSpecification: async () => ({}),
    },
    taskService: {
      newTask: (description: string) => description,
      endTask: () => {
        // no-op
      },
    },
    snapshotService: {
      registerSubscriber: (state: unknown) => {
        registeredSubscribers.push(state);
      },
      broadcastSnapshot: (snapshot: unknown) => {
        broadcastedSnapshots.push(snapshot);
      },
    },
    alertService: {
      alertError: () => {
        // no-op
      },
    },
    settingService: {
      getBooleanValue: () => false,
    },
    initializeState: ActionState.create(),
    info: {},
    editor: {},
    grid: { controller: {}, setCachingEnabled: async () => {} },
    filter: {},
    extend: {},
  });

  return { view, processSource, broadcastedSnapshots, registeredSubscribers };
};

const makeSpecification = () => {
  const specification = new DataCubeSpecification();
  specification.source = {};
  specification.query = '';
  return specification;
};

describe('DataCubeViewState.initialize', () => {
  test('reuses a pre-resolved initialSource instead of calling processSource again', async () => {
    const initialSource = { from: 'already-resolved' };
    const { view, processSource, broadcastedSnapshots } = makeView({
      initialSource,
    });

    await view.initialize(makeSpecification());

    expect(processSource).not.toHaveBeenCalled();
    expect(view.getInitialSource()).toBe(initialSource);
    expect(view.initializeState.hasSucceeded).toBe(true);
    expect(broadcastedSnapshots).toHaveLength(1);
  });

  test('resolves the source via processSource when no initialSource is provided', async () => {
    const resolvedSource = { from: 'resolved' };
    const { view, processSource } = makeView({
      processSource: jest.fn(async () => resolvedSource),
    });

    await view.initialize(makeSpecification());

    expect(processSource).toHaveBeenCalledTimes(1);
    expect(view.getInitialSource()).toBe(resolvedSource);
    expect(view.initializeState.hasSucceeded).toBe(true);
  });
});
