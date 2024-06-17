/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import type {
  IServerSideDatasource,
  IServerSideGetRowsParams,
} from '@ag-grid-community/core';
import type { DataCubeGridState } from './DataCubeGridState.js';
import {
  LogEvent,
  assertErrorThrown,
  guaranteeNonNullable,
  isBoolean,
} from '@finos/legend-shared';
import { buildExecutableQueryFromSnapshot } from '../core/DataCubeQueryBuilder.js';
import { type TabularDataSet, V1_Lambda } from '@finos/legend-graph';
import { APPLICATION_EVENT } from '@finos/legend-application';
import { buildQuerySnapshot } from './DataCubeGridQuerySnapshotBuilder.js';

type GridClientResultCellDataType =
  | string
  | number
  | boolean
  | null
  | undefined;

type GridClientRowDataType = {
  [key: string]: GridClientResultCellDataType;
};

export enum GridClientSortDirection {
  ASCENDING = 'asc',
  DESCENDING = 'desc',
}

export enum GridClientAggregateOperation {
  COUNT = 'count',
  SUM = 'sum',
  MAX = 'max',
  MIN = 'min',
  AVERAGE = 'avg',
}

function toRowData(tds: TabularDataSet): GridClientRowDataType[] {
  return tds.rows.map((_row, rowIdx) => {
    const row: GridClientRowDataType = {};
    const cols = tds.columns;
    _row.values.forEach((value, colIdx) => {
      // `ag-grid` shows `false` value as empty string so we have
      // call `.toString()` to avoid this behavior.
      row[cols[colIdx] as string] = isBoolean(value) ? String(value) : value;
    });
    row.rowNumber = rowIdx;
    return row;
  });
}

export class DataCubeGridClientServerSideDataSource
  implements IServerSideDatasource
{
  readonly grid: DataCubeGridState;

  constructor(grid: DataCubeGridState) {
    this.grid = grid;
  }

  async fetchRows(
    params: IServerSideGetRowsParams<unknown, unknown>,
  ): Promise<void> {
    const currentSnapshot = guaranteeNonNullable(this.grid.getLatestSnapshot());
    const syncedSnapshot = buildQuerySnapshot(params.request, currentSnapshot);
    if (syncedSnapshot.uuid !== currentSnapshot.uuid) {
      this.grid.publishSnapshot(syncedSnapshot);
    }
    // TODO: @akphi - what we do here is wrong fundamentally, when we detect presence of groupKeys
    // i.e. drilldown in the request, we don't need to update the snapshot, but fire a modified query,
    // here we update the snapshot just so we can build the query to execute to get the result, which is
    // wrong. We must not uncessarily update the snapshot.
    try {
      const executableQuery = buildExecutableQueryFromSnapshot(syncedSnapshot);
      const lambda = new V1_Lambda();
      lambda.body.push(executableQuery);
      const result = await this.grid.dataCube.engine.executeQuery(lambda);
      const rowData = toRowData(result.result);
      params.success({ rowData });
    } catch (error) {
      assertErrorThrown(error);
      this.grid.dataCube.application.notificationService.notifyError(error);
      params.fail();
    }
  }

  getRows(params: IServerSideGetRowsParams<unknown, unknown>): void {
    this.fetchRows(params).catch((error: unknown) => {
      assertErrorThrown(error);
      this.grid.dataCube.application.logService.error(
        LogEvent.create(APPLICATION_EVENT.ILLEGAL_APPLICATION_STATE_OCCURRED),
        `Error ocurred while fetching data for grid should have been handled gracefully`,
        error,
      );
    });
  }
}
