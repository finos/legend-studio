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
  IllegalStateError,
  assertErrorThrown,
  guaranteeNonNullable,
  hashObject,
  isBoolean,
  isNonNullable,
  pruneObject,
} from '@finos/legend-shared';
import { buildExecutableQuery } from '../core/DataCubeQueryBuilder.js';
import {
  type TabularDataSet,
  type V1_AppliedFunction,
  V1_Lambda,
} from '@finos/legend-graph';
import { generateRowGroupingDrilldownExecutableQueryPostProcessor } from './DataCubeGridQueryBuilder.js';
import { makeObservable, observable, runInAction } from 'mobx';
import type {
  DataCubeConfiguration,
  DataCubeConfigurationColorKey,
} from '../core/DataCubeConfiguration.js';
import { DEFAULT_LARGE_ALERT_WINDOW_CONFIG } from '../../../components/shared/LayoutManagerState.js';
import {
  _sortByColName,
  type DataCubeQuerySnapshot,
  type DataCubeQuerySnapshotData,
} from '../core/DataCubeQuerySnapshot.js';
import type { DataCubeEngine } from '../DataCubeEngine.js';
import { generateColumnDefs } from './DataCubeGridConfigurationBuilder.js';
import { type DataCubeQueryFunctionMap } from '../core/DataCubeQueryEngine.js';
import type { DataCubeQueryFilterOperation } from '../core/filter/DataCubeQueryFilterOperation.js';
import type { DataCubeQueryAggregateOperation } from '../core/aggregation/DataCubeQueryAggregateOperation.js';
import { buildQuerySnapshot } from './DataCubeGridQuerySnapshotBuilder.js';
import { AlertType } from '../../../components/shared/Alert.js';

type GridClientCellValue = string | number | boolean | null | undefined;
type GridClientRowData = {
  [key: string]: GridClientCellValue;
};

export enum DataCubeGridClientExportFormat {
  CSV = 'CSV',
  EXCEL = 'EXCEL',
  PLAIN_TEXT = 'PLAIN_TEXT',
  HTML = 'HTML',
  PDF = 'PDF',
}

export enum INTERNAL__GridClientUtilityCssClassName {
  ROOT = 'data-cube-grid.ag-theme-quartz',
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

  PIVOT_COLUMN_GROUP = 'data-cube-grid__utility--pivot-column-group',
  PIVOT_COLUMN_GROUP_PREFIX = 'data-cube-grid__utility--pivot-column-group-',
}
export const generateFontFamilyUtilityClassName = (fontFamily: string) =>
  `${INTERNAL__GridClientUtilityCssClassName.FONT_FAMILY_PREFIX}${fontFamily.replaceAll(' ', '-')}`;
export const generateFontSizeUtilityClassName = (fontSize: number) =>
  `${INTERNAL__GridClientUtilityCssClassName.FONT_SIZE_PREFIX}${fontSize}`;
export const generateFontUnderlineUtilityClassName = (
  variant: string | undefined,
) =>
  `${INTERNAL__GridClientUtilityCssClassName.FONT_UNDERLINE_PREFIX}${variant ?? 'none'}`;
export const generateFontCaseUtilityClassName = (
  fontCase: string | undefined,
) =>
  `${INTERNAL__GridClientUtilityCssClassName.FONT_CASE_PREFIX}${fontCase ?? 'none'}`;
export const generateTextAlignUtilityClassName = (alignment: string) =>
  `${INTERNAL__GridClientUtilityCssClassName.TEXT_ALIGN_PREFIX}${alignment}`;
export const generateTextColorUtilityClassName = (
  color: string,
  key: DataCubeConfigurationColorKey,
) =>
  `${INTERNAL__GridClientUtilityCssClassName.TEXT_COLOR_PREFIX}${key}-${color.substring(1)}`;
export const generateBackgroundColorUtilityClassName = (
  color: string,
  key: DataCubeConfigurationColorKey,
) =>
  `${INTERNAL__GridClientUtilityCssClassName.BACKGROUND_COLOR_PREFIX}${key}-${color.substring(1)}`;

// Indicates how many rows for each block in the cache, i.e. how many rows returned from the server at a time.
// ag-grid will dedicte space in advanced to store these rows. In server-side row model, this is used as the page size.
// See https://www.ag-grid.com/react-data-grid/server-side-model-configuration/#server-side-cache
export const INTERNAL__GRID_CLIENT_DEFAULT_CACHE_BLOCK_SIZE = 100;
// NOTE: The cache block size is used by ag-grid to pre-allocate memory for the grid
// so the value set must be reasonable, or else it can crash the application!
export const INTERNAL__GRID_CLIENT_MAX_CACHE_BLOCK_SIZE = 1e5;

export const INTERNAL__GRID_CLIENT_PIVOT_COLUMN_GROUP_COLOR_ROTATION_SIZE = 5;
export const INTERNAL__GRID_CLIENT_SIDE_BAR_WIDTH = 200;
export const INTERNAL__GRID_CLIENT_COLUMN_MIN_WIDTH = 50;
export const INTERNAL__GRID_CLIENT_HEADER_HEIGHT = 24;
export const INTERNAL__GRID_CLIENT_ROW_HEIGHT = 20;
export const INTERNAL__GRID_CLIENT_TOOLTIP_SHOW_DELAY = 1500;
export const INTERNAL__GRID_CLIENT_AUTO_RESIZE_PADDING = 10;
export const INTERNAL__GRID_CLIENT_MISSING_VALUE = '__MISSING';
export const INTERNAL__GRID_CLIENT_TREE_COLUMN_ID = 'ag-Grid-AutoColumn';
export const INTERNAL__GRID_CLIENT_DATA_FETCH_MANUAL_TRIGGER_COLUMN_ID =
  'INTERNAL__dataFetchManualTrigger';
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

/**
 * This method computes the hash code for the parts of the snapshot that should trigger data fetching.
 * This is used to manually trigger server-side row model data source getRows() method.
 */
export function computeHashCodeForDataFetchManualTrigger(
  snapshot: DataCubeQuerySnapshot,
  configuration: DataCubeConfiguration,
) {
  return hashObject(
    pruneObject({
      ...snapshot.data,
      name: '', // name change should not trigger data fetching
      configuration: {
        initialExpandLevel: configuration.initialExpandLevel,
        showRootAggregation: configuration.showRootAggregation,
        pivotTotalColumnPlacement: configuration.pivotTotalColumnPlacement,
        treeGroupSortFunction: configuration.treeGroupSortFunction,
        columns: configuration.columns
          .map((column) => ({
            name: column.name,
            type: column.type,
            kind: column.kind,
            aggregateOperator: column.aggregateOperator,
            aggregationParameters: column.aggregationParameters,
            excludedFromHorizontalPivot: column.excludedFromHorizontalPivot,
            horizontalPivotSortFunction: column.horizontalPivotSortFunction,
          }))
          .sort(_sortByColName), // sort to make sure column reordering does not trigger data fetching
      },
      selectColumns: snapshot.data.selectColumns.slice().sort(_sortByColName), // sort to make sure column reordering does not trigger data fetching
      pivot: undefined,
      groupBy: undefined,
      sortColumns: [],
    } satisfies DataCubeQuerySnapshotData),
  );
}

function TDStoRowData(tds: TabularDataSet): GridClientRowData[] {
  return tds.rows.map((_row, rowIdx) => {
    const row: GridClientRowData = {};
    const cols = tds.columns;
    _row.values.forEach((value, colIdx) => {
      // `ag-grid` shows `false` value as empty string so we have
      // call `.toString()` to avoid this behavior.
      row[cols[colIdx] as string] = isBoolean(value)
        ? String(value)
        : isNonNullable(value)
          ? value
          : INTERNAL__GRID_CLIENT_MISSING_VALUE;
    });
    return row;
  });
}

async function getCastColumns(
  currentSnapshot: DataCubeQuerySnapshot,
  engine: DataCubeEngine,
) {
  if (!currentSnapshot.data.pivot) {
    throw new IllegalStateError(
      `Can't build cast columns collector query when no pivot is specified`,
    );
  }
  const snapshot = currentSnapshot.clone();
  guaranteeNonNullable(snapshot.data.pivot).castColumns = [];
  snapshot.data.groupBy = undefined;
  snapshot.data.sortColumns = [];
  snapshot.data.limit = 0;
  const query = buildExecutableQuery(
    snapshot,
    engine.filterOperations,
    engine.aggregateOperations,
    {
      postProcessor: (
        _snapshot: DataCubeQuerySnapshot,
        sequence: V1_AppliedFunction[],
        funcMap: DataCubeQueryFunctionMap,
        configuration: DataCubeConfiguration,
        filterOperations: DataCubeQueryFilterOperation[],
        aggregateOperations: DataCubeQueryAggregateOperation[],
      ) => {
        const _unprocess = (funcMapKey: keyof DataCubeQueryFunctionMap) => {
          const func = funcMap[funcMapKey];
          if (func) {
            sequence.splice(sequence.indexOf(func), 1);
            funcMap[funcMapKey] = undefined;
          }
        };

        if (funcMap.groupExtend) {
          _unprocess('groupExtend');
        }
      },
    },
  );

  const lambda = new V1_Lambda();
  lambda.body.push(query);
  const result = await engine.executeQuery(lambda);

  return result.result.builder.columns.map((column) => ({
    name: column.name,
    type: column.type as string,
  }));
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

  async fetchRows(params: IServerSideGetRowsParams<unknown, unknown>) {
    const task = this.grid.view.newTask('Fetching data');

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
    const newSnapshot = buildQuerySnapshot(params.request, currentSnapshot);
    // NOTE: if h-pivot is enabled
    // if h-pivot is enabled, update the cast columns
    // and panels which might be affected by this (e.g. sorts)
    // TOOD?: this is an expensive operation in certain case, so we might want to
    // optimize when this gets called
    if (newSnapshot.data.pivot) {
      try {
        const castColumns = await getCastColumns(
          newSnapshot,
          this.grid.view.engine,
        );
        newSnapshot.data.pivot.castColumns = castColumns;
        newSnapshot.data.sortColumns = newSnapshot.data.sortColumns.filter(
          (column) =>
            [...castColumns, ...newSnapshot.data.groupExtendedColumns].find(
              (col) => column.name === col.name,
            ),
        );
      } catch (error) {
        assertErrorThrown(error);
        this.grid.view.dataCube.alertError(error, {
          message: `Query Validation Failure: Can't retrieve pivot results column metadata. ${error.message}`,
        });
        // fail early since we can't proceed without the cast columns validated
        params.fail();
        this.grid.view.endTask(task);
        return;
      }
    }

    newSnapshot.finalize();
    if (newSnapshot.hashCode !== currentSnapshot.hashCode) {
      // update grid column definitions since new columns could have been added
      // due to changes in pivot
      this.grid.client.updateGridOptions({
        columnDefs: generateColumnDefs(
          newSnapshot,
          this.grid.queryConfiguration,
          this.grid.view,
        ),
      });
      this.grid.publishSnapshot(newSnapshot);
    }

    // ------------------------------ DATA ------------------------------

    try {
      const executableQuery = buildExecutableQuery(
        newSnapshot,
        this.grid.view.engine.filterOperations,
        this.grid.view.engine.aggregateOperations,
        {
          postProcessor:
            generateRowGroupingDrilldownExecutableQueryPostProcessor(
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
        },
      );
      const lambda = new V1_Lambda();
      lambda.body.push(executableQuery);
      const result = await this.grid.view.engine.executeQuery(lambda);
      const rowData = TDStoRowData(result.result.result);
      if (this.grid.view.engine.enableDebugMode) {
        this.grid.view.application.debugProcess(
          `Execution`,
          `\nQuery: ${result.executedQuery}`,
          `\nConfig: pagination=${this.grid.isPaginationEnabled}`,
          `\nStats: ${rowData.length} rows, ${result.result.result.columns.length} columns`,
          `\nSQL: ${result.executedSQL}`,
        );
      }

      if (this.grid.isPaginationEnabled) {
        params.success({ rowData });
        // only update row count when loading the top-level drilldown data
        if (params.request.groupKeys.length === 0) {
          runInAction(() => {
            this.rowCount = (params.request.startRow ?? 0) + rowData.length;
          });
        }

        // toggle no-rows overlay
        if (
          params.request.groupKeys.length === 0 &&
          params.request.startRow === 0 &&
          rowData.length === 0
        ) {
          this.grid.client.showNoRowsOverlay();
        } else {
          this.grid.client.hideOverlay();
        }
      } else {
        // NOTE: When pagination is disabled and the user currently scrolls to somewhere in the grid, as data is fetched
        // and the operation does not force a scroll top (for example, grouping will always force scrolling to the
        // top, while sorting will leave scroll position as is), the grid ends up showing the wrong data because
        // the data being displayed does not take into account the scroll position, but by the start and end row
        // which stay constant as pagination is disabled.
        //
        // In order to handle this, when pagination is disabled, we tune the start and end row by setting the cache block size
        // to a high-enough value (100k-1m). However, ag-grid use cache block size to pre-allocate memory for the rows,
        // which means we must cap/tune this value reasonably to prevent the app from crashing.
        //
        // When there are just too many rows (exceeding the maximum cache block size), we will fallback to a slightly less ideal
        // behavior by forcing a scroll top for every data fetch and also reset the cache block size to the default value to save memory
        if (rowData.length > INTERNAL__GRID_CLIENT_MAX_CACHE_BLOCK_SIZE) {
          if (!this.grid.view.engine.gridClientSuppressLargeDatasetWarning) {
            this.grid.view.dataCube.alert({
              message: `Large dataset (>${INTERNAL__GRID_CLIENT_MAX_CACHE_BLOCK_SIZE} rows) detected!`,
              text: `Overall app performance can be impacted by large dataset due to longer query execution time and increased memory usage. At its limit, the application can crash!\nTo boost performance, consider enabling pagination while working with large dataset.`,
              type: AlertType.WARNING,
              actions: [
                {
                  label: 'Enable Pagination',
                  handler: () => {
                    this.grid.setPaginationEnabled(true);
                  },
                },
                {
                  label: 'Dismiss Warning',
                  handler: () => {
                    // this.grid.setPaginationEnabled(true);
                    this.grid.view.engine.setGridClientSuppressLargeDatasetWarning(
                      true,
                    );
                  },
                },
              ],
              windowConfig: DEFAULT_LARGE_ALERT_WINDOW_CONFIG,
            });
          }

          // NOTE: when drilldown occurs, we will scroll top until the drilldown row is reached
          params.api.ensureIndexVisible(params.parentNode.rowIndex ?? 0, 'top');
        }

        params.success({
          rowData,
          // Setting row count to disable infinite-scrolling when pagination is disabled
          // See https://www.ag-grid.com/react-data-grid/infinite-scrolling/#setting-last-row-index
          rowCount: rowData.length,
        });

        // only update row count when loading the top-level drilldown data
        if (params.request.groupKeys.length === 0) {
          runInAction(() => {
            this.rowCount = rowData.length;
          });
        }

        // toggle no-rows overlay
        if (params.request.groupKeys.length === 0 && rowData.length === 0) {
          this.grid.client.showNoRowsOverlay();
        } else {
          this.grid.client.hideOverlay();
        }
      }
    } catch (error) {
      assertErrorThrown(error);
      this.grid.view.dataCube.alertError(error, {
        message: `Data Fetch Failure: ${error.message}`,
      });
      params.fail();
    } finally {
      this.grid.view.endTask(task);
    }
  }

  getRows(params: IServerSideGetRowsParams<unknown, unknown>) {
    this.fetchRows(params).catch((error: unknown) => {
      assertErrorThrown(error);
      this.grid.view.application.logIllegalStateError(
        `Error ocurred while fetching data for grid should have been handled gracefully`,
        error,
      );
    });
  }
}
