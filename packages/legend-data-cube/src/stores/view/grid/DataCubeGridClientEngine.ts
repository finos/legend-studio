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
} from 'ag-grid-community';
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
import { buildExecutableQuery } from '../../core/DataCubeQueryBuilder.js';
import {
  PRIMITIVE_TYPE,
  PureClientVersion,
  type TabularDataSet,
} from '@finos/legend-graph';
import { makeObservable, observable, runInAction } from 'mobx';
import type {
  DataCubeConfiguration,
  DataCubeConfigurationColorKey,
} from '../../core/model/DataCubeConfiguration.js';
import { type DataCubeSnapshot } from '../../core/DataCubeSnapshot.js';
import { _findCol, _sortByColName } from '../../core/model/DataCubeColumn.js';
import { isPivotResultColumnName } from '../../core/DataCubeQueryEngine.js';
import { buildSnapshotFromGridState } from './DataCubeGridSnapshotBuilder.js';
import { AlertType } from '../../services/DataCubeAlertService.js';
import type { DataCubeViewState } from '../DataCubeViewState.js';
import { buildGridDataFetchExecutableQuery } from './DataCubeGridQueryBuilder.js';
import { DataCubeSettingKey } from '../../../__lib__/DataCubeSetting.js';
import { DEFAULT_ALERT_WINDOW_CONFIG } from '../../services/DataCubeLayoutService.js';
import {
  DataCubeExecutionError,
  type DataCubeExecutionResult,
} from '../../core/DataCubeEngine.js';
import { _lambda } from '../../core/DataCubeQueryBuilderUtils.js';
import { sum } from 'mathjs';

type DataCubeGridClientCellValue = string | number | boolean | null | undefined;
type DataCubeGridClientRowData = {
  [key: string]: DataCubeGridClientCellValue;
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
export const INTERNAL__GRID_CLIENT_DEFAULT_CACHE_BLOCK_SIZE = 500;
export const INTERNAL__GRID_CLIENT_DEFAULT_ENABLE_PAGINATION = true;
export const INTERNAL__GRID_CLIENT_DEFAULT_ENABLE_CACHING = false;
// NOTE: The cache block size is used by ag-grid to pre-allocate memory for the grid
// so the value set must be reasonable, or else it can crash the engine!
export const INTERNAL__GRID_CLIENT_MAX_CACHE_BLOCK_SIZE = 1e3;

export const INTERNAL__GRID_CLIENT_PIVOT_COLUMN_GROUP_COLOR_ROTATION_SIZE = 5;
export const INTERNAL__GRID_CLIENT_SIDE_BAR_WIDTH = 200;
export const INTERNAL__GRID_CLIENT_COLUMN_MIN_WIDTH = 50;
export const INTERNAL__GRID_CLIENT_HEADER_HEIGHT = 24;
export const INTERNAL__GRID_CLIENT_ROW_HEIGHT = 20;
export const INTERNAL__GRID_CLIENT_TOOLTIP_SHOW_DELAY = 1500;
export const INTERNAL__GRID_CLIENT_AUTO_RESIZE_PADDING = 10;
export const INTERNAL__GRID_CLIENT_MISSING_VALUE = '__MISSING';
export const INTERNAL__GRID_CLIENT_TREE_COLUMN_ID = 'ag-Grid-AutoColumn';
export const INTERNAL__GRID_CLIENT_ROOT_AGGREGATION_COLUMN_ID =
  'INTERNAL__rootAggregation';
export const INTERNAL__GRID_CLIENT_DATA_FETCH_MANUAL_TRIGGER_COLUMN_ID =
  'INTERNAL__dataFetchManualTrigger';
export const INTERNAL__GRID_CLIENT_ROW_GROUPING_COUNT_AGG_COLUMN_ID = 'count';

export enum DataCubeGridClientPinnedAlignement {
  LEFT = 'left',
  RIGHT = 'right',
}

export enum DataCubeGridClientSortDirection {
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
  snapshot: DataCubeSnapshot,
  configuration: DataCubeConfiguration,
) {
  return hashObject(
    pruneObject({
      configuration: {
        showRootAggregation: configuration.showRootAggregation,
        pivotStatisticColumnPlacement:
          configuration.pivotStatisticColumnPlacement,
        treeColumnSortDirection: configuration.treeColumnSortDirection,
        columns: configuration.columns
          .map((column) => ({
            name: column.name,
            type: column.type,
            kind: column.kind,
            aggregateOperator: column.aggregateOperator,
            aggregationParameters: column.aggregationParameters,
            excludedFromPivot: column.excludedFromPivot,
            pivotSortDirection: column.pivotSortDirection,
            // technically, we just need to refresh the row-data since this computation
            // is done on the client-side, but to simplify the flow, we can just refetch data
            pivotStatisticColumnFunction: column.pivotStatisticColumnFunction,
          }))
          .sort(_sortByColName), // sort to make sure column reordering does not trigger data fetching
      },
      leafExtendedColumns: snapshot.data.leafExtendedColumns,
      filter: snapshot.data.filter,
      selectColumns: snapshot.data.selectColumns.toSorted(_sortByColName), // sort to make sure column reordering does not trigger data fetching
      groupExtendedColumns: snapshot.data.groupExtendedColumns,
      limit: snapshot.data.limit,
    }),
  );
}

function buildRowData(
  result: TabularDataSet,
  snapshot: DataCubeSnapshot,
): DataCubeGridClientRowData[] {
  return result.rows.map((_row, rowIdx) => {
    const row: DataCubeGridClientRowData = {};
    const cols = result.columns;
    _row.values.forEach((value, colIdx) => {
      // `ag-grid` shows `false` value as empty string so we have
      // call `.toString()` to avoid this behavior.
      row[cols[colIdx] as string] = isBoolean(value)
        ? String(value)
        : isNonNullable(value)
          ? value
          : INTERNAL__GRID_CLIENT_MISSING_VALUE;
      if (snapshot.data.pivot && snapshot.data.groupBy) {
        row[INTERNAL__GRID_CLIENT_ROW_GROUPING_COUNT_AGG_COLUMN_ID] = Number(
          sum(
            result.columns
              .filter(
                (col) =>
                  isPivotResultColumnName(col) &&
                  col.endsWith(
                    INTERNAL__GRID_CLIENT_ROW_GROUPING_COUNT_AGG_COLUMN_ID,
                  ),
              )
              .map((col) => (row[col] as number | undefined) ?? 0),
          ).toString(),
        );
      }
    });
    return row;
  });
}

async function getCastColumns(
  currentSnapshot: DataCubeSnapshot,
  view: DataCubeViewState,
) {
  if (!currentSnapshot.data.pivot) {
    throw new IllegalStateError(
      `Can't build cast columns collector query when no pivot is specified`,
    );
  }
  const snapshot = currentSnapshot.clone();
  guaranteeNonNullable(snapshot.data.pivot).castColumns = [];
  snapshot.data.groupBy = undefined;
  snapshot.data.groupExtendedColumns = [];
  snapshot.data.sortColumns = [];
  snapshot.data.limit = 0;
  const query = buildExecutableQuery(snapshot, view.source, view.engine);

  const result = await view.engine.executeQuery(
    _lambda([], [query]),
    view.source,
    {
      debug: view.settingService.getBooleanValue(
        DataCubeSettingKey.DEBUGGER__ENABLE_DEBUG_MODE,
      ),
      clientVersion: view.settingService.getBooleanValue(
        DataCubeSettingKey.DEBUGGER__USE_DEV_CLIENT_PROTOCOL_VERSION,
      )
        ? PureClientVersion.VX_X_X
        : undefined,
    },
  );

  return result.result.builder.columns.map((column) => {
    const type = column.type as string;
    return {
      name: column.name,
      // FIXME: this is a workaround to help plan generation does not handle well decimal type
      // Remove this once https://github.com/finos/legend-engine/pull/3400 is productionized
      type: type === PRIMITIVE_TYPE.DECIMAL ? PRIMITIVE_TYPE.FLOAT : type,
    };
  });
}

export type DataCubeGridClientDataFetchRequest = {
  startRow: number | undefined;
  endRow: number | undefined;
  rowGroupColumns: string[];
  groupKeys: (string | null | undefined)[]; // NOTE: it's possible for these values to be nullish depending on row data
  pivotColumns: string[];
  sortColumns: {
    name: string;
    direction: DataCubeGridClientSortDirection;
  }[];
};

export class DataCubeGridClientServerSideDataSource
  implements IServerSideDatasource
{
  private readonly _view: DataCubeViewState;
  private readonly _grid: DataCubeGridState;

  rowCount: number | undefined = undefined;

  constructor(grid: DataCubeGridState, view: DataCubeViewState) {
    makeObservable(this, {
      rowCount: observable,
    });

    this._grid = grid;
    this._view = view;
  }

  async fetchRows(params: IServerSideGetRowsParams<unknown, unknown>) {
    const task = this._view.taskService.newTask('Fetching data...');

    // ------------------------------ SNAPSHOT ------------------------------

    const currentSnapshot = guaranteeNonNullable(
      this._grid.getLatestSnapshot(),
    );
    const request: DataCubeGridClientDataFetchRequest = {
      startRow: params.request.startRow,
      endRow: params.request.endRow,
      rowGroupColumns: params.request.rowGroupCols.map((col) => col.id),
      groupKeys: params.request.groupKeys.map((key) => key),
      pivotColumns: params.request.pivotCols.map((col) => col.id),
      sortColumns: params.request.sortModel.map((item) => ({
        name: item.colId,
        direction: item.sort as DataCubeGridClientSortDirection,
      })),
    };
    const isTopLevelRequest = request.groupKeys.length === 0;

    let newSnapshot = currentSnapshot;

    // only recompute the snapshot if this is not a drilldown request
    if (isTopLevelRequest) {
      newSnapshot = buildSnapshotFromGridState(request, currentSnapshot);

      // NOTE: if h-pivot is enabled, update the cast columns
      // and panels which might be affected by this (e.g. sorts)
      // Because this can be an expensive operation, we will only
      // recompute when it's not a drilldown or paging request,
      // but we could still optimize further if needed.
      if (!this._grid.isPaginationEnabled || request.startRow === 0) {
        if (newSnapshot.data.pivot) {
          try {
            const castColumns = await getCastColumns(newSnapshot, this._view);
            newSnapshot.data.pivot.castColumns = castColumns;
            newSnapshot.data.sortColumns = newSnapshot.data.sortColumns.filter(
              (column) =>
                _findCol(
                  [...castColumns, ...newSnapshot.data.groupExtendedColumns],
                  column.name,
                ),
            );
          } catch (error) {
            assertErrorThrown(error);
            if (error instanceof DataCubeExecutionError) {
              this._view.alertService.alertExecutionError(error, {
                message: `Query Validation Failure: Can't retrieve pivot results column metadata.`,
                text: `Error: ${error.message}`,
              });
            } else {
              this._view.alertService.alertError(error, {
                message: `Query Validation Failure: Can't retrieve pivot results column metadata. ${error.message}`,
              });
            }
            // fail early since we can't proceed without the cast columns validated
            params.fail();
            this._view.taskService.endTask(task);
            return;
          }
        }
      }

      newSnapshot.finalize();
      if (newSnapshot.hashCode !== currentSnapshot.hashCode) {
        // NOTE: we need to be careful with the computation of the snapshot
        // here since we run the risk of triggering an multiple data-fetches,
        // as applying snapshot to grid state could potentially update the grid
        // options and set SSRM filter model.
        newSnapshot.markAsPatchChange();
        await this._grid.applySnapshot(newSnapshot, currentSnapshot);
        this._grid.publishSnapshot(newSnapshot);
      }
    }

    // ------------------------------ DATA ------------------------------

    const executableQuery = buildGridDataFetchExecutableQuery(
      request,
      newSnapshot,
      this._view.source,
      this._view.engine,
      this._grid.isPaginationEnabled,
    );
    let result: DataCubeExecutionResult;
    let rowData: DataCubeGridClientRowData[];

    try {
      result = await this._view.engine.executeQuery(
        _lambda([], [executableQuery]),
        this._view.source,
        {
          debug: this._view.settingService.getBooleanValue(
            DataCubeSettingKey.DEBUGGER__ENABLE_DEBUG_MODE,
          ),
          clientVersion: this._view.settingService.getBooleanValue(
            DataCubeSettingKey.DEBUGGER__USE_DEV_CLIENT_PROTOCOL_VERSION,
          )
            ? PureClientVersion.VX_X_X
            : undefined,
        },
      );
      rowData = buildRowData(result.result.result, newSnapshot);
    } catch (error) {
      assertErrorThrown(error);
      if (error instanceof DataCubeExecutionError) {
        this._view.alertService.alertExecutionError(error, {
          message: `Data Fetch Failure: Can't execute query.`,
          text: `Error: ${error.message}`,
        });
      } else {
        this._view.alertService.alertError(error, {
          message: `Data Fetch Failure: ${error.message}`,
        });
      }
      this._view.taskService.endTask(task);
      params.fail();
      return;
    }

    if (
      this._view.settingService.getBooleanValue(
        DataCubeSettingKey.DEBUGGER__ENABLE_DEBUG_MODE,
      )
    ) {
      this._view.engine.debugProcess(
        `Execution`,
        ['Query', result.executedQuery],
        [
          'Stats',
          `${rowData.length} rows, ${result.result.result.columns.length} columns`,
        ],
        [
          'SQL',
          result.executedSQL ?? `-- Error: failed to extract executed SQL`,
        ],
        ['SQL Execution Time', result.executionTime],
      );
    }

    if (this._grid.isPaginationEnabled) {
      params.success({ rowData });
      // only update row count when loading the top-level drilldown data
      if (isTopLevelRequest) {
        runInAction(() => {
          this.rowCount = (request.startRow ?? 0) + rowData.length;
        });
      }

      // toggle no-rows overlay
      if (isTopLevelRequest && request.startRow === 0 && rowData.length === 0) {
        this._grid.client.showNoRowsOverlay();
      } else {
        this._grid.client.hideOverlay();
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
        if (
          !this._view.settingService.getBooleanValue(
            DataCubeSettingKey.GRID_CLIENT__SUPPRESS_LARGE_DATASET_WARNING,
          )
        ) {
          this._view.alertService.alert({
            message: `Large dataset (>${INTERNAL__GRID_CLIENT_MAX_CACHE_BLOCK_SIZE} rows) detected!`,
            text: `Overall app performance can be impacted by large dataset due to longer query execution time and increased memory usage. At its limit, the engine can crash!\nTo boost performance, consider enabling pagination while working with large dataset.`,
            type: AlertType.WARNING,
            actions: [
              {
                label: 'Enable Pagination',
                handler: () => {
                  this._grid.setPaginationEnabled(true);
                },
              },
              {
                label: 'Dismiss Warning',
                handler: () => {
                  this._view.settingService.updateValue(
                    this._view.dataCube.api,
                    DataCubeSettingKey.GRID_CLIENT__SUPPRESS_LARGE_DATASET_WARNING,
                    true,
                  );
                },
              },
            ],
            windowConfig: {
              ...DEFAULT_ALERT_WINDOW_CONFIG,
              width: 600,
              minWidth: 300,
              minHeight: 150,
            },
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
      if (isTopLevelRequest) {
        runInAction(() => {
          this.rowCount = rowData.length;
        });
      }

      // toggle no-rows overlay
      if (isTopLevelRequest && rowData.length === 0) {
        this._grid.client.showNoRowsOverlay();
      } else {
        this._grid.client.hideOverlay();
      }
    }

    // Resize columns to fit content on all actions (drilldown, changing queries, fetching new page, etc.)
    // NOTE: we might want to restrict this to only happen on certain actions
    //
    // `setTimeout()` is need to ensure this runs after the grid has been updated with the new data
    // since ag-grid does not provide an event hook for this action for server-side row model.
    setTimeout(() => {
      this._grid.client.autoSizeAllColumns();
    }, 0);
    this._view.taskService.endTask(task);
  }

  getRows(params: IServerSideGetRowsParams<unknown, unknown>) {
    this.fetchRows(params).catch((error: unknown) => {
      assertErrorThrown(error);
      this._view.logService.logIllegalStateError(
        `Error ocurred while fetching data for grid should have been handled gracefully`,
        error,
      );
    });
  }
}
