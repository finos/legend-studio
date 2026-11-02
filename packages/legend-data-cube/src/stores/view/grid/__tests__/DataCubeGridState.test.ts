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
import {
  AllCommunityModule,
  createGrid,
  type GridApi,
  type IServerSideGetRowsParams,
} from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';
import { PRIMITIVE_TYPE } from '@finos/legend-graph';
import { DataCubeGridState } from '../DataCubeGridState.js';
import type { DataCubeInitialDataFetchedEvent } from '../../../DataCubeOptions.js';
import { DataCubeSnapshot } from '../../../core/DataCubeSnapshot.js';
import { DataCubeConfiguration } from '../../../core/model/DataCubeConfiguration.js';
import { newColumnConfiguration } from '../../../core/DataCubeConfigurationBuilder.js';

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

// NOTE: drive `applySnapshot` against a real server-side row model grid, recording
// the group keys of each data fetch (an empty list is a full reload from the top)
const makeServerSideGrid = () => {
  const requests: string[][] = [];
  const grid = Object.create(DataCubeGridState.prototype) as DataCubeGridState;
  const element = document.createElement('div');
  document.body.appendChild(element);
  const client: GridApi = createGrid(
    element,
    {
      rowModelType: 'serverSide',
      serverSideDatasource: {
        getRows: (params: IServerSideGetRowsParams) => {
          requests.push(params.request.groupKeys);
          params.success({
            rowData: params.request.groupKeys.length
              ? [{ region: 'EU', amount: 1 }]
              : [
                  { region: 'EU', amount: 1 },
                  { region: 'US', amount: 2 },
                ],
          });
        },
      },
    },
    { modules: [AllCommunityModule, AllEnterpriseModule] },
  );
  Object.assign(grid, {
    _client: client,
    _view: { grid },
    _settingService: {
      getBooleanValue: () => false,
      getNumericValue: () => 10,
    },
    isPaginationEnabled: true,
  });
  return { grid, client, requests };
};

const makeGroupedSnapshot = (
  update?: (configuration: DataCubeConfiguration) => void,
) => {
  const columns = [
    { name: 'region', type: PRIMITIVE_TYPE.STRING },
    { name: 'amount', type: PRIMITIVE_TYPE.FLOAT },
  ];
  const configuration = new DataCubeConfiguration();
  configuration.columns = columns.map((column) =>
    newColumnConfiguration(column),
  );
  update?.(configuration);
  const snapshot = DataCubeSnapshot.create({});
  snapshot.data.sourceColumns = columns;
  snapshot.data.selectColumns = columns;
  snapshot.data.groupBy = { columns: [{ name: 'region', type: 'String' }] };
  snapshot.data.configuration = configuration.serialize();
  return snapshot;
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

describe('DataCubeGridState.applySnapshot', () => {
  // ag-grid enterprise logs its license notice as an error, which fails tests
  const silenceGridLogs = () =>
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

  test('expanding a row group fetches only that group, without reloading the grid', async () => {
    silenceGridLogs();
    const { grid, client, requests } = makeServerSideGrid();
    await grid.applySnapshot(makeGroupedSnapshot(), undefined);
    await settle();
    expect(requests).toContainEqual([]);

    requests.length = 0;
    client.getDisplayedRowAtIndex(0)?.setExpanded(true);
    await settle();
    // expanding a row records the expanded path, which publishes a new snapshot
    await grid.applySnapshot(
      makeGroupedSnapshot((configuration) => {
        configuration.pivotLayout.expandedPaths = ['EU'];
      }),
      undefined,
    );
    await settle();

    expect(requests).toEqual([['EU']]);
    client.destroy();
  });

  test('reloads the grid when the snapshot changes what data is fetched', async () => {
    silenceGridLogs();
    const { grid, client, requests } = makeServerSideGrid();
    await grid.applySnapshot(makeGroupedSnapshot(), undefined);
    await settle();

    requests.length = 0;
    await grid.applySnapshot(
      makeGroupedSnapshot((configuration) => {
        configuration.initialExpandLevel = 1;
      }),
      undefined,
    );
    await settle();

    expect(requests).toContainEqual([]);
    client.destroy();
  });
});
