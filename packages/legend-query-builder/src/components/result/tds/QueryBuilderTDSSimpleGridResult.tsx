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

import { WarningIcon, clsx } from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import type { QueryBuilderState } from '../../../stores/QueryBuilderState.js';
import {
  DataGrid,
  type DataGridColumnDefinition,
  type DataGridCustomHeaderProps,
  type DataGridGetContextMenuItemsParams,
  type DataGridMenuItemDef,
  type DataGridDefaultMenuItem,
} from '@finos/legend-lego/data-grid';
import {
  getRowDataFromExecutionResult,
  type IQueryRendererParamsWithGridType,
} from './QueryBuilderTDSResultShared.js';
import { DEFAULT_LOCALE } from '../../../graph-manager/QueryBuilderConst.js';
import type { QueryBuilderResultState } from '../../../stores/QueryBuilderResultState.js';
import {
  guaranteeNonNullable,
  isBoolean,
  isNumber,
  isString,
  isValidURL,
} from '@finos/legend-shared';
import { useApplicationStore } from '@finos/legend-application';
import { useCallback, useEffect, useRef } from 'react';
import {
  type TDSResultCellCoordinate,
  type TDSResultCellData,
  type TDSResultCellDataType,
  type TDSRowDataType,
  TDSExecutionResult,
  getTDSRowRankByColumnInAsc,
  PRIMITIVE_TYPE,
} from '@finos/legend-graph';
import { QUERY_BUILDER_TEST_ID } from '../../../__lib__/QueryBuilderTesting.js';
import { QueryBuilderTDSCellSelectionStatsBar } from './QueryBuilderTDSCellSelectionStatsBar.js';
import { useAsyncCellSelectionStats } from './QueryBuilderTDSAsyncCellSelectionStats.js';
import { buildTDSGridContextMenuItems } from './QueryBuilderTDSGridShared.js';

export const MAXIMUM_FRACTION_DIGITS = 4;

export const FloatGridColumnCustomHeader = (
  props: DataGridCustomHeaderProps,
) => {
  return (
    <div
      data-testid={
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_GRID_CUSTOM_HEADER
      }
      className="query-builder__result__values__table__custom-header"
    >
      <div
        className="query-builder__result__values__table__custom-header__icon"
        title="some values have been rounded using en-us format in this preview grid (defaults to max 4 decimal places)"
      >
        <WarningIcon />
      </div>
      <div>{props.displayName}</div>
    </div>
  );
};

export const getTDSColumnCustomizations = (
  result: TDSExecutionResult,
  columnName: string,
): object => {
  const index = result.builder.columns.findIndex(
    (col) => col.name === columnName,
  );
  if (index >= 0) {
    const columnType = result.builder.columns[index]?.type;
    const colValues = result.result.rows.map((r) => r.values[index]);
    const isTruncated = (
      vals: (string | number | boolean | null | undefined)[],
    ): boolean =>
      Boolean(
        vals.some((val) => {
          if (val) {
            const decimalPart = val.toString().split('.')[1];
            return decimalPart && decimalPart.length > MAXIMUM_FRACTION_DIGITS;
          }
          return false;
        }),
      );
    switch (columnType) {
      case PRIMITIVE_TYPE.NUMBER:
      case PRIMITIVE_TYPE.DECIMAL:
      case PRIMITIVE_TYPE.FLOAT:
        return isTruncated(colValues)
          ? ({
              headerComponentParams: {
                innerHeaderComponent: FloatGridColumnCustomHeader,
              },
            } satisfies DataGridColumnDefinition)
          : {};
      default:
        return {};
    }
  }
  return {};
};

const QueryResultCellRenderer = observer(
  (params: IQueryRendererParamsWithGridType) => {
    const resultState = params.resultState;
    const tdsExecutionResult = params.tdsExecutionResult;
    const cellValue = params.value as TDSResultCellDataType;
    const nodeRowIndex = guaranteeNonNullable(params.node.rowIndex);

    const formattedCellValue = (): TDSResultCellDataType => {
      if (isNumber(cellValue)) {
        return Intl.NumberFormat(DEFAULT_LOCALE, {
          maximumFractionDigits: MAXIMUM_FRACTION_DIGITS,
        }).format(Number(cellValue));
      } else if (isBoolean(cellValue)) {
        return String(cellValue);
      }
      return cellValue;
    };
    const cellValueUrlLink =
      isString(cellValue) && isValidURL(cellValue) ? cellValue : undefined;
    const columnName = params.column?.getColId() ?? '';
    const findCoordinatesFromResultValue = (
      colId: string,
      rowNumber: number,
    ): TDSResultCellCoordinate => {
      const colIndex = tdsExecutionResult.result.columns.findIndex(
        (col) => col === colId,
      );
      return { rowIndex: rowNumber, colIndex: colIndex };
    };

    const currentCellCoordinates = findCoordinatesFromResultValue(
      columnName,
      nodeRowIndex,
    );
    const cellInFilteredResults = resultState.selectedCells.some(
      (result) =>
        result.coordinates.colIndex === currentCellCoordinates.colIndex &&
        result.coordinates.rowIndex === currentCellCoordinates.rowIndex,
    );

    const findColumnFromCoordinates = (
      colIndex: number,
    ): TDSResultCellDataType => {
      if (
        !resultState.executionResult ||
        !(resultState.executionResult instanceof TDSExecutionResult)
      ) {
        return undefined;
      }
      return resultState.executionResult.result.columns[colIndex];
    };

    const findResultValueFromCoordinates = (
      resultCoordinate: [number, number],
    ): TDSResultCellDataType => {
      const rowIndex = resultCoordinate[0];
      const colIndex = resultCoordinate[1];

      if (
        !resultState.executionResult ||
        !(resultState.executionResult instanceof TDSExecutionResult)
      ) {
        return undefined;
      }
      if (params.api.getColumnState()[colIndex]?.sort === 'asc') {
        resultState.executionResult.result.rows.sort((a, b) =>
          getTDSRowRankByColumnInAsc(a, b, colIndex),
        );
      } else if (params.api.getColumnState()[colIndex]?.sort === 'desc') {
        resultState.executionResult.result.rows.sort((a, b) =>
          getTDSRowRankByColumnInAsc(b, a, colIndex),
        );
      }
      return resultState.executionResult.result.rows[rowIndex]?.values[
        colIndex
      ];
    };

    const isCoordinatesSelected = (
      resultCoordinate: TDSResultCellCoordinate,
    ): boolean =>
      resultState.selectedCells.some(
        (cell) =>
          cell.coordinates.rowIndex === resultCoordinate.rowIndex &&
          cell.coordinates.colIndex === resultCoordinate.colIndex,
      );

    const mouseDown: React.MouseEventHandler = (event) => {
      event.preventDefault();

      if (event.shiftKey) {
        const coordinates = findCoordinatesFromResultValue(
          columnName,
          nodeRowIndex,
        );
        const actualValue = findResultValueFromCoordinates([
          coordinates.rowIndex,
          coordinates.colIndex,
        ]);
        resultState.addSelectedCell({
          value: actualValue,
          columnName: columnName,
          coordinates: coordinates,
        });
        return;
      }

      if (event.button === 0) {
        resultState.setIsSelectingCells(true);
        resultState.setSelectedCells([]);
        const coordinates = findCoordinatesFromResultValue(
          columnName,
          nodeRowIndex,
        );
        const actualValue = findResultValueFromCoordinates([
          coordinates.rowIndex,
          coordinates.colIndex,
        ]);
        resultState.setSelectedCells([
          {
            value: actualValue,
            columnName: columnName,
            coordinates: coordinates,
          },
        ]);
        resultState.setMouseOverCell(resultState.selectedCells[0] ?? null);
      }

      if (event.button === 2) {
        const coordinates = findCoordinatesFromResultValue(
          columnName,
          nodeRowIndex,
        );
        const isInSelected = isCoordinatesSelected(coordinates);
        if (!isInSelected) {
          const actualValue = findResultValueFromCoordinates([
            coordinates.rowIndex,
            coordinates.colIndex,
          ]);
          resultState.setSelectedCells([
            {
              value: actualValue,
              columnName: columnName,
              coordinates: coordinates,
            },
          ]);
          resultState.setMouseOverCell(resultState.selectedCells[0] ?? null);
        }
      }
    };

    const mouseUp: React.MouseEventHandler = (event) => {
      resultState.setIsSelectingCells(false);
    };

    const mouseOver: React.MouseEventHandler = (event) => {
      if (resultState.isSelectingCells) {
        if (resultState.selectedCells.length < 1) {
          return;
        }
        const results = resultState.selectedCells[0];
        if (!results) {
          return;
        }

        const firstCorner = results.coordinates;
        const secondCorner = findCoordinatesFromResultValue(
          columnName,
          nodeRowIndex,
        );

        resultState.setSelectedCells([results]);

        const minRow = Math.min(firstCorner.rowIndex, secondCorner.rowIndex);
        const minCol = Math.min(firstCorner.colIndex, secondCorner.colIndex);
        const maxRow = Math.max(firstCorner.rowIndex, secondCorner.rowIndex);
        const maxCol = Math.max(firstCorner.colIndex, secondCorner.colIndex);

        for (let x = minRow; x <= maxRow; x++) {
          for (let y = minCol; y <= maxCol; y++) {
            const actualValue = findResultValueFromCoordinates([x, y]);

            const valueAndColumnId = {
              value: actualValue,
              columnName: findColumnFromCoordinates(y),
              coordinates: {
                rowIndex: x,
                colIndex: y,
              },
            } as TDSResultCellData;

            if (
              !resultState.selectedCells.find(
                (result) =>
                  result.coordinates.colIndex === y &&
                  result.coordinates.rowIndex === x,
              )
            ) {
              resultState.addSelectedCell(valueAndColumnId);
            }
          }
        }
      }

      resultState.setMouseOverCell(resultState.selectedCells[0] ?? null);
    };

    return (
      <div
        className={clsx('query-builder__result__values__table__cell', {
          'query-builder__result__values__table__cell--active':
            cellInFilteredResults,
        })}
        onMouseDown={(event) => mouseDown(event)}
        onMouseUp={(event) => mouseUp(event)}
        onMouseOver={(event) => mouseOver(event)}
      >
        {cellValueUrlLink ? (
          <a href={cellValueUrlLink} target="_blank" rel="noreferrer">
            {cellValueUrlLink}
          </a>
        ) : (
          <span>{formattedCellValue()}</span>
        )}
      </div>
    );
  },
);

// ---------------------------------------------------------------------------
// Simple-grid keyboard shortcut helpers (extracted to avoid >4-level nesting)
// ---------------------------------------------------------------------------

type SimpleGridRow = { values: (string | number | boolean | null)[] };

/** Build TDSResultCellData[] for all cells in the grid. */
const buildAllCells = (
  columns: string[],
  rows: SimpleGridRow[],
): TDSResultCellData[] => {
  const cells: TDSResultCellData[] = [];
  rows.forEach((row, rowIndex) => {
    columns.forEach((colName, colIndex) => {
      cells.push({
        value: row.values[colIndex],
        columnName: colName,
        coordinates: { rowIndex, colIndex },
      });
    });
  });
  return cells;
};

/** Build TDSResultCellData[] for specific column indices across all rows. */
const buildColumnCells = (
  columns: string[],
  rows: SimpleGridRow[],
  colIndices: number[],
): TDSResultCellData[] => {
  const cells: TDSResultCellData[] = [];
  rows.forEach((row, ri) => {
    colIndices.forEach((ci) => {
      cells.push({
        value: row.values[ci],
        columnName: columns[ci] ?? '',
        coordinates: { rowIndex: ri, colIndex: ci },
      });
    });
  });
  return cells;
};

/** Build TDSResultCellData[] for specific row indices across all columns. */
const buildRowCells = (
  columns: string[],
  rows: SimpleGridRow[],
  rowIndices: number[],
): TDSResultCellData[] => {
  const cells: TDSResultCellData[] = [];
  rowIndices.forEach((ri) => {
    columns.forEach((cn, ci) => {
      cells.push({
        value: rows[ri]?.values[ci],
        columnName: cn,
        coordinates: { rowIndex: ri, colIndex: ci },
      });
    });
  });
  return cells;
};

/** Resolve the distinct column indices to select for Ctrl+Space. */
const resolveColumnIndices = (
  selectedCells: TDSResultCellData[],
  fallbackColIndex: number,
): number[] =>
  selectedCells.length > 0
    ? [...new Set(selectedCells.map((c) => c.coordinates.colIndex))]
    : [fallbackColIndex];

/** Resolve the distinct row indices to select for Shift+Space. */
const resolveRowIndices = (
  selectedCells: TDSResultCellData[],
  fallbackRowIndex: number,
): number[] =>
  selectedCells.length > 0
    ? [...new Set(selectedCells.map((c) => c.coordinates.rowIndex))]
    : [fallbackRowIndex];

/** Apply a cell selection to the result state if non-empty. */
const applySelection = (
  cells: TDSResultCellData[],
  resultState: QueryBuilderResultState,
): void => {
  if (cells.length > 0) {
    resultState.setSelectedCells(cells);
    resultState.setMouseOverCell(cells[0] ?? null);
  }
};

export const QueryBuilderTDSSimpleGridResult = observer(
  (props: {
    executionResult: TDSExecutionResult;
    queryBuilderState: QueryBuilderState;
    /**
     * Whether to show the cell-selection summary statistics bar below the grid.
     * Defaults to `true`.
     */
    showSummaryStats?: boolean;
  }) => {
    const {
      executionResult,
      queryBuilderState,
      showSummaryStats = true,
    } = props;
    const applicationStore = useApplicationStore();
    const resultState = queryBuilderState.resultState;
    const darkMode =
      !queryBuilderState.applicationStore.layoutService
        .TEMPORARY__isLightColorThemeEnabled;
    const colDefs = executionResult.result.columns.map(
      (colName) =>
        ({
          minWidth: 50,
          sortable: true,
          resizable: true,
          field: colName,
          flex: 1,
          headerName: colName,
          ...getTDSColumnCustomizations(executionResult, colName),
          cellRenderer: QueryResultCellRenderer,
          cellRendererParams: {
            resultState: resultState,
            tdsExecutionResult: executionResult,
          },
        }) as DataGridColumnDefinition,
    );

    // Simple grid: no AG Grid cell-range API, so we keep selectedCells in
    // MobX and pass a null gridApiRef. The hook falls back to reading from
    // selectedCells directly when the gridApiRef is null.
    const selectedCells = resultState.selectedCells;
    const columnTypes = new Map<string, string | undefined>(
      executionResult.builder.columns.map((c) => [c.name, c.type]),
    );
    const simpleGridApiRef = useRef<null>(null);
    const cellSelectionStats = useAsyncCellSelectionStats(
      selectedCells.length, // version counter — changes when selection changes
      columnTypes,
      simpleGridApiRef,
      selectedCells, // fallback cells for when gridApiRef is null
    );

    const gridContainerRef = useRef<HTMLDivElement>(null);
    // Track the last cell the user clicked so keyboard shortcuts know
    // which row/column to act on (AG Grid internal focus is not used here
    // because we move DOM focus to the container div, not into a grid cell).
    const lastClickedCellRef = useRef<{
      colName: string;
      colIndex: number;
      rowIndex: number;
    } | null>(null);

    // All keyboard shortcuts handled in the native capture-phase listener so
    // they fire reliably when the container div has focus.
    useEffect(() => {
      const el = gridContainerRef.current;
      if (!el) {
        return undefined;
      }
      const handler = (e: KeyboardEvent): void => {
        const columns = executionResult.result.columns;
        const rows = executionResult.result.rows;

        // Ctrl+A — select all cells
        if (e.ctrlKey && e.code === 'KeyA') {
          e.preventDefault();
          // eslint-disable-next-line no-console
          console.debug(
            `[TDS Simple Grid] Ctrl+A → selecting all: ${rows.length} rows × ${columns.length} columns`,
          );
          const allCells = buildAllCells(columns, rows);
          applySelection(allCells, resultState);
          return;
        }

        // Ctrl+Space — select entire columns for all columns in the current selection.
        if (e.ctrlKey && e.code === 'Space') {
          e.preventDefault();
          const cell = lastClickedCellRef.current;
          if (!cell) {
            return;
          }
          const colIndices = resolveColumnIndices(
            resultState.selectedCells,
            cell.colIndex,
          );
          // eslint-disable-next-line no-console
          console.debug(
            `[TDS Simple Grid] Ctrl+Space → selecting ${colIndices.length} column(s), ${rows.length} rows`,
          );
          const newCells = buildColumnCells(columns, rows, colIndices);
          applySelection(newCells, resultState);
          return;
        }

        // Shift+Space — select entire rows for all rows in the current selection.
        if (e.shiftKey && e.code === 'Space') {
          e.preventDefault();
          const cell = lastClickedCellRef.current;
          if (!cell) {
            return;
          }
          const rowIndices = resolveRowIndices(
            resultState.selectedCells,
            cell.rowIndex,
          );
          // eslint-disable-next-line no-console
          console.debug(
            `[TDS Simple Grid] Shift+Space → selecting ${rowIndices.length} row(s), ${columns.length} columns`,
          );
          const newCells = buildRowCells(columns, rows, rowIndices);
          applySelection(newCells, resultState);
        }
      };
      el.addEventListener('keydown', handler, { capture: true });
      return () =>
        el.removeEventListener('keydown', handler, { capture: true });
    }, [
      executionResult.result.columns,
      executionResult.result.rows,
      resultState,
    ]);

    const getContextMenuItems = useCallback(
      (
        params: DataGridGetContextMenuItemsParams<TDSRowDataType>,
      ): (DataGridDefaultMenuItem | DataGridMenuItemDef)[] =>
        buildTDSGridContextMenuItems(
          params,
          applicationStore,
          resultState,
          queryBuilderState.applicationStore.alertUnhandledError,
        ),
      [
        applicationStore,
        resultState,
        queryBuilderState.applicationStore.alertUnhandledError,
      ],
    );

    return (
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_VALUES_TDS}
        className="query-builder__result__values__table"
      >
        <div
          ref={gridContainerRef}
          tabIndex={-1}
          className={clsx('query-builder__result__tds-grid', {
            'query-builder__result__tds-grid--with-stats-bar': showSummaryStats,
            'ag-theme-balham': !darkMode,
            'ag-theme-balham-dark': darkMode,
          })}
        >
          <DataGrid
            rowData={getRowDataFromExecutionResult(executionResult)}
            gridOptions={{
              suppressScrollOnNewData: true,
              getRowId: (data) => `${data.data.rowNumber}`,
            }}
            // NOTE: when column definition changed, we need to force refresh the cell to make sure the cell renderer is updated
            // See https://stackoverflow.com/questions/56341073/how-to-refresh-an-ag-grid-when-a-change-occurs-inside-a-custom-cell-renderer-com
            onRowDataUpdated={(params) => {
              params.api.refreshCells({ force: true });
            }}
            suppressFieldDotNotation={true}
            columnDefs={colDefs}
            getContextMenuItems={(params) => getContextMenuItems(params)}
            onCellClicked={(event) => {
              // Skip clicks originated from keyboard shortcuts (Ctrl/Shift+Space fires
              // a synthetic click that would reset the range selection we just set).
              const e = event.event as MouseEvent | undefined;
              if (e?.ctrlKey || e?.shiftKey) {
                return;
              }
              const colName = event.column.getColId();
              const colIndex = executionResult.result.columns.indexOf(colName);
              // eslint-disable-next-line no-console
              console.debug(
                `[TDS Simple Grid] onCellClicked: col=${colName} row=${event.rowIndex}`,
              );
              lastClickedCellRef.current = {
                colName,
                colIndex,
                rowIndex: event.rowIndex ?? 0,
              };
              gridContainerRef.current?.focus({ preventScroll: true });
            }}
          />
          {showSummaryStats && cellSelectionStats !== undefined && (
            <QueryBuilderTDSCellSelectionStatsBar
              stats={cellSelectionStats.stats}
              cellCount={cellSelectionStats.cellCount}
              countReady={cellSelectionStats.countReady}
              darkMode={darkMode}
            />
          )}
        </div>
      </div>
    );
  },
);
