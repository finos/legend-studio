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
import { DataCubeGridState } from '../DataCubeGridState.js';
import type { DataCubeInitialDataFetchedEvent } from '../../../DataCubeOptions.js';

// NOTE: skip the constructor (which requires a fully set up view) and only provide
// the view dependencies `notifyInitialDataFetched` reaches into.
const makeGrid = (
  onInitialDataFetched?: (event: DataCubeInitialDataFetchedEvent) => void,
) => {
  const source = {};
  const currentSource = {};
  const api = {};
  const grid = Object.create(DataCubeGridState.prototype) as DataCubeGridState;
  Object.assign(grid, {
    _hasFetchedInitialData: false,
    _view: {
      source: currentSource,
      getInitialSource: () => source,
      dataCube: {
        api,
        options: onInitialDataFetched ? { onInitialDataFetched } : undefined,
      },
    },
  });
  return { grid, source, api };
};

describe('DataCubeGridState.notifyInitialDataFetched', () => {
  test('reports the first data load of the view to the options callback', () => {
    const onInitialDataFetched =
      jest.fn<(event: DataCubeInitialDataFetchedEvent) => void>();
    const { grid, source, api } = makeGrid(onInitialDataFetched);

    grid.notifyInitialDataFetched();

    expect(onInitialDataFetched).toHaveBeenCalledTimes(1);
    expect(onInitialDataFetched).toHaveBeenCalledWith({
      api,
      source,
      error: undefined,
    });
    expect(onInitialDataFetched.mock.calls[0]?.[0].source).toBe(source);
  });

  test('only reports the first outcome', () => {
    const onInitialDataFetched =
      jest.fn<(event: DataCubeInitialDataFetchedEvent) => void>();
    const { grid } = makeGrid(onInitialDataFetched);
    const error = new Error('boom');

    grid.notifyInitialDataFetched(error);
    // e.g. subsequent empty/failed fetches, or the grid re-rendering after a grid mode switch
    grid.notifyInitialDataFetched();
    grid.notifyInitialDataFetched(new Error('later failure'));

    expect(onInitialDataFetched).toHaveBeenCalledTimes(1);
    expect(onInitialDataFetched.mock.calls[0]?.[0].error).toBe(error);
  });

  test('does nothing when no callback is provided', () => {
    const { grid } = makeGrid();

    expect(() => grid.notifyInitialDataFetched()).not.toThrow();
  });
});
