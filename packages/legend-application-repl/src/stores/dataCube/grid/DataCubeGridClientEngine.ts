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
  GridApi,
  IRowNode,
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
import { buildExecutableQuery } from '../core/DataCubeQueryBuilder.js';
import { type TabularDataSet, V1_Lambda } from '@finos/legend-graph';
import { APPLICATION_EVENT } from '@finos/legend-application';
import { buildQuerySnapshot } from './DataCubeGridQuerySnapshotBuilder.js';
import { generateRowGroupingDrilldownExecutableQueryPostProcessor } from './DataCubeGridQueryBuilder.js';
import { makeObservable, observable, runInAction } from 'mobx';
import type { DataCubeConfigurationColorKey } from '../core/DataCubeConfiguration.js';

type GridClientCellValue = string | number | boolean | null | undefined;
type GridClientRowData = {
  [key: string]: GridClientCellValue;
};

export enum INTERNAL__GRID_CLIENT_UTILITY_CSS_CLASS_NAME {
  ROOT = 'data-cube-grid.ag-theme-balham',
  HIGHLIGHT_ROW = 'data-cube-grid__utility--highlight-row',
  SHOW_VERTICAL_GRID_LINES = 'data-cube-grid__utility--show-vertical-grid-lines',
  SHOW_HORIZONTAL_GRID_LINES = 'data-cube-grid__utility--show-horizontal-grid-lines',

  BLUR = 'data-cube-grid__utility--blur',

  FONT_FAMILY_PREFIX = 'data-cube-grid__utility--font-family-',
  FONT_SIZE_PREFIX = 'data-cube-grid__utility--font-size-',
  FONT_BOLD = 'data-cube-grid__utility--font-style-bold',
  FONT_ITALIC = 'data-cube-grid__utility--font-style-italic',
  FONT_UNDERLINE_PREFIX = 'data-cube-grid__utility--font-style-underline-',
  FONT_STRIKETHROUGH = 'data-cube-grid__utility--font-style-strikethrough',
  FONT_CASE_PREFIX = 'data-cube-grid__utility--font-style-case-',
  TEXT_ALIGN_PREFIX = 'data-cube-grid__utility--text-align-',
  TEXT_COLOR_PREFIX = 'data-cube-grid__utility--text-color-',
  BACKGROUND_COLOR_PREFIX = 'data-cube-grid__utility--background-color-',
}
export const generateFontFamilyUtilityClassName = (fontFamily: string) =>
  `${INTERNAL__GRID_CLIENT_UTILITY_CSS_CLASS_NAME.FONT_FAMILY_PREFIX}${fontFamily.replaceAll(' ', '-')}`;
export const generateFontSizeUtilityClassName = (fontSize: number) =>
  `${INTERNAL__GRID_CLIENT_UTILITY_CSS_CLASS_NAME.FONT_SIZE_PREFIX}${fontSize}`;
export const generateFontUnderlineUtilityClassName = (
  variant: string | undefined,
) =>
  `${INTERNAL__GRID_CLIENT_UTILITY_CSS_CLASS_NAME.FONT_UNDERLINE_PREFIX}${variant ?? 'none'}`;
export const generateFontCaseUtilityClassName = (
  fontCase: string | undefined,
) =>
  `${INTERNAL__GRID_CLIENT_UTILITY_CSS_CLASS_NAME.FONT_CASE_PREFIX}${fontCase ?? 'none'}`;
export const generateTextAlignUtilityClassName = (alignment: string) =>
  `${INTERNAL__GRID_CLIENT_UTILITY_CSS_CLASS_NAME.TEXT_ALIGN_PREFIX}${alignment}`;
export const generateTextColorUtilityClassName = (
  color: string,
  key: DataCubeConfigurationColorKey,
) =>
  `${INTERNAL__GRID_CLIENT_UTILITY_CSS_CLASS_NAME.TEXT_COLOR_PREFIX}${key}-${color.substring(1)}`;
export const generateBackgroundColorUtilityClassName = (
  color: string,
  key: DataCubeConfigurationColorKey,
) =>
  `${INTERNAL__GRID_CLIENT_UTILITY_CSS_CLASS_NAME.BACKGROUND_COLOR_PREFIX}${key}-${color.substring(1)}`;

export const INTERNAL__GRID_CLIENT_COLUMN_MIN_WIDTH = 50;
export const INTERNAL__GRID_CLIENT_HEADER_HEIGHT = 24;
export const INTERNAL__GRID_CLIENT_ROW_HEIGHT = 20;
export const INTERNAL__GRID_CLIENT_TOOLTIP_SHOW_DELAY = 1000;
export const INTERNAL__GRID_CLIENT_AUTO_RESIZE_PADDING = 10;
export const INTERNAL__GRID_CLIENT_TREE_COLUMN_ID = 'INTERNAL__tree';
export const INTERNAL__GRID_CLIENT_ROW_GROUPING_COUNT_AGG_COLUMN_ID =
  'INTERNAL__count';

export enum GridClientPinnedAlignement {
  LEFT = 'left',
  RIGHT = 'right',
}

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

export function getDataForAllNodes<T>(client: GridApi<T>): T[] {
  const rows: T[] = [];
  client.forEachNode((node: IRowNode<T>) => {
    if (node.data) {
      rows.push(node.data);
    }
  });
  return rows;
}

/**
 * NOTE: this method does not work for server-side row model.
 * It only works when client-side filter is being applied
 */
export function getDataForAllFilteredNodes<T>(client: GridApi<T>): T[] {
  const rows: T[] = [];
  client.forEachNodeAfterFilter((node: IRowNode<T>) => {
    if (node.data) {
      rows.push(node.data);
    }
  });
  return rows;
}

function TDStoRowData(tds: TabularDataSet): GridClientRowData[] {
  return tds.rows.map((_row, rowIdx) => {
    const row: GridClientRowData = {};
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
  rowCount: number | undefined = undefined;

  constructor(grid: DataCubeGridState) {
    makeObservable(this, {
      rowCount: observable,
    });

    this.grid = grid;
  }

  async fetchRows(
    params: IServerSideGetRowsParams<unknown, unknown>,
  ): Promise<void> {
    const task = this.grid.dataCube.newTask('Fetching data');

    // ------------------------------ GRID OPTIONS ------------------------------
    // Here, we make adjustments to the grid display in response to the new
    // request, in case the grid action has not impacted the layout in an
    // adequate way.

    // Toggle the visibility of the tree column based on the presence of row-group columns
    if (params.request.rowGroupCols.length) {
      params.api.setColumnsVisible(
        [INTERNAL__GRID_CLIENT_TREE_COLUMN_ID],
        true,
      );
    } else {
      params.api.setColumnsVisible(
        [INTERNAL__GRID_CLIENT_TREE_COLUMN_ID],
        false,
      );
    }

    // ------------------------------ SNAPSHOT ------------------------------

    const currentSnapshot = guaranteeNonNullable(this.grid.getLatestSnapshot());
    // TODO: when we support pivoting, we should make a quick call to check for columns
    // created by pivots and specify them as cast columns when pivot is activated
    const syncedSnapshot = buildQuerySnapshot(params.request, currentSnapshot);
    if (syncedSnapshot.hashCode !== currentSnapshot.hashCode) {
      this.grid.publishSnapshot(syncedSnapshot);
    }

    // ------------------------------ DATA ------------------------------

    try {
      const executableQuery = buildExecutableQuery(syncedSnapshot, {
        postProcessor: generateRowGroupingDrilldownExecutableQueryPostProcessor(
          params.request.groupKeys,
        ),
        pagination:
          this.grid.isPaginationEnabled &&
          params.request.startRow !== undefined &&
          params.request.endRow !== undefined
            ? {
                start: params.request.startRow,
                end: params.request.endRow,
              }
            : undefined,
      });
      const lambda = new V1_Lambda();
      lambda.body.push(executableQuery);
      const result =
        await this.grid.dataCube.infrastructure.engine.executeQuery(lambda);
      const rowData = TDStoRowData(result.result);
      if (this.grid.isPaginationEnabled) {
        params.success({ rowData });
        // Only update row count when loading the top-level drilldown data
        if (params.request.groupKeys.length === 0) {
          runInAction(() => {
            this.rowCount = (params.request.startRow ?? 0) + rowData.length;
          });
        }
      } else {
        params.success({
          rowData,
          // Setting row count to disable inifite-scrolling when pagination is disabled
          // See https://www.ag-grid.com/javascript-data-grid/infinite-scrolling/#setting-last-row-index
          rowCount: rowData.length,
        });
        // Only update row count when loading the top-level drilldown data
        if (params.request.groupKeys.length === 0) {
          runInAction(() => {
            this.rowCount = rowData.length;
          });
        }
      }
    } catch (error) {
      assertErrorThrown(error);
      this.grid.dataCube.application.notificationService.notifyError(error);
      params.fail();
    } finally {
      this.grid.dataCube.endTask(task);
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
