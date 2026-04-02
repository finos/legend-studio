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

import { observer } from 'mobx-react-lite';
import type { QueryBuilderState } from '../../../stores/QueryBuilderState.js';
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  DataGrid,
  type DataGridApi,
  type DataGridCellKeyDownEvent,
  type DataGridColumnDefinition,
  type DataGridGetContextMenuItemsParams,
  type DataGridMenuItemDef,
  type DataGridIAggFuncParams,
  type DataGridDefaultMenuItem,
} from '@finos/legend-lego/data-grid';
import { handleGridKeyboardShortcut } from './QueryBuilderTDSGridKeyboardShortcuts.js';
import {
  getRowDataFromExecutionResult,
  type IQueryRendererParamsWithGridType,
} from './QueryBuilderTDSResultShared.js';
import {
  type QueryBuilderResultState,
  QueryBuilderResultWavgAggregationState,
} from '../../../stores/QueryBuilderResultState.js';
import {
  type TDSResultCellDataType,
  type TDSRowDataType,
  type TDSExecutionResult,
  PRIMITIVE_TYPE,
} from '@finos/legend-graph';
import { DEFAULT_LOCALE } from '../../../graph-manager/QueryBuilderConst.js';
import {
  assertErrorThrown,
  guaranteeNonNullable,
  isBoolean,
  isNumber,
  isString,
  isValidURL,
} from '@finos/legend-shared';
import { useApplicationStore } from '@finos/legend-application';
import { QUERY_BUILDER_TEST_ID } from '../../../__lib__/QueryBuilderTesting.js';
import {
  clsx,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
  ModalFooterButton,
  Dialog,
  CustomSelectorInput,
} from '@finos/legend-art';
import {
  getTDSColumnCustomizations,
  MAXIMUM_FRACTION_DIGITS,
} from './QueryBuilderTDSSimpleGridResult.js';
import { QueryBuilderTDSCellSelectionStatsBar } from './QueryBuilderTDSCellSelectionStatsBar.js';
import { useAsyncCellSelectionStats } from './QueryBuilderTDSAsyncCellSelectionStats.js';
import { buildTDSGridContextMenuItems } from './QueryBuilderTDSGridShared.js';

export const enum QueryBuilderDataGridCustomAggregationFunction {
  wavg = 'wavg',
  WAVG = 'WAVG',
}

const getAggregationTDSColumnCustomizations = (
  result: TDSExecutionResult,
  columnName: string,
): object => {
  const columnType = result.builder.columns.find(
    (col) => col.name === columnName,
  )?.type;
  switch (columnType) {
    case PRIMITIVE_TYPE.STRING:
      return {
        filter: 'agTextColumnFilter',
        allowedAggFuncs: ['count'],
      };
    case PRIMITIVE_TYPE.DATE:
    case PRIMITIVE_TYPE.DATETIME:
    case PRIMITIVE_TYPE.STRICTDATE:
      return {
        filter: 'agDateColumnFilter',
        allowedAggFuncs: ['count'],
      };
    case PRIMITIVE_TYPE.DECIMAL:
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.INTEGER:
    case PRIMITIVE_TYPE.FLOAT:
      return {
        filter: 'agNumberColumnFilter',
        allowedAggFuncs: ['count', 'sum', 'max', 'min', 'avg', 'wavg'],
      };
    default:
      return {
        allowedAggFuncs: ['count'],
      };
  }
};

const QueryResultCellRenderer = observer(
  (params: IQueryRendererParamsWithGridType) => {
    const resultState = params.resultState;
    const cellValue = params.value as TDSResultCellDataType;
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

    const mouseDown: React.MouseEventHandler = (event) => {
      // NOTE: do NOT call preventDefault() here — it would block the browser's
      // native focus-on-click, preventing AG Grid from receiving keyboard events.
      if (event.button === 0 || event.button === 2) {
        resultState.setMouseOverCell(resultState.selectedCells[0] ?? null);
      }
    };
    const mouseUp: React.MouseEventHandler = (event) => {
      resultState.setIsSelectingCells(false);
    };
    const mouseOver: React.MouseEventHandler = (event) => {
      resultState.setMouseOverCell(resultState.selectedCells[0] ?? null);
    };
    return (
      <div
        className={clsx('query-builder__result__values__table__cell')}
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

const getLocalColDefs = (
  executionResult: TDSExecutionResult,
  resultState: QueryBuilderResultState,
): DataGridColumnDefinition<TDSRowDataType, TDSResultCellDataType>[] =>
  executionResult.result.columns.map((colName) => {
    const col = {
      minWidth: 50,
      sortable: true,
      resizable: true,
      field: colName,
      flex: 1,
      enablePivot: true,
      enableRowGroup: true,
      enableValue: true,
      cellRenderer: QueryResultCellRenderer,
      cellRendererParams: {
        resultState: resultState,
        tdsExecutionResult: executionResult,
      },
      ...getAggregationTDSColumnCustomizations(executionResult, colName),
      ...getTDSColumnCustomizations(executionResult, colName),
    } as DataGridColumnDefinition;
    const persistedColumn = resultState.gridConfig?.columns.find(
      (c) => c.colId === colName,
    );
    if (persistedColumn) {
      if (persistedColumn.width) {
        col.width = persistedColumn.width;
      }
      col.pinned = persistedColumn.pinned ?? null;
      col.rowGroup = persistedColumn.rowGroup ?? false;
      col.rowGroupIndex = persistedColumn.rowGroupIndex ?? null;
      col.aggFunc = persistedColumn.aggFunc ?? null;
      col.pivot = persistedColumn.pivot ?? false;
      col.hide = persistedColumn.hide ?? false;
    }
    return col;
  });

export const getFilterTDSColumnCustomizations = (
  result: TDSExecutionResult,
  columnName: string,
): object => {
  const columnType = result.builder.columns.find(
    (col) => col.name === columnName,
  )?.type;
  switch (columnType) {
    case PRIMITIVE_TYPE.DATE:
    case PRIMITIVE_TYPE.DATETIME:
    case PRIMITIVE_TYPE.STRICTDATE:
      return {
        filter: 'agDateColumnFilter',
      };
    case PRIMITIVE_TYPE.DECIMAL:
    case PRIMITIVE_TYPE.INTEGER:
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.FLOAT:
      return {
        filter: 'agNumberColumnFilter',
      };
    default:
      // we default all other columns to use filter true which defaults to set filters
      return {
        filter: true,
      };
  }
};

const getColDefs = (
  executionResult: TDSExecutionResult,
  resultState: QueryBuilderResultState,
): DataGridColumnDefinition<TDSRowDataType, TDSResultCellDataType>[] =>
  executionResult.result.columns.map(
    (colName) =>
      ({
        minWidth: 50,
        sortable: true,
        resizable: true,
        field: colName,
        flex: 1,
        cellRenderer: QueryResultCellRenderer,
        cellRendererParams: {
          resultState: resultState,
          tdsExecutionResult: executionResult,
        },
        ...getFilterTDSColumnCustomizations(executionResult, colName),
        ...getTDSColumnCustomizations(executionResult, colName),
      }) as DataGridColumnDefinition,
  );

export const QueryBuilderTDSGridResult = observer(
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
    const darkMode =
      !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled;
    const [gridApi, setGridApi] = useState<DataGridApi | undefined>(undefined);
    const [aggFuncParams, setAggFuncParams] = useState<
      DataGridIAggFuncParams | undefined
    >(undefined);
    const resultState = queryBuilderState.resultState;
    const isLocalModeEnabled = queryBuilderState.isLocalModeEnabled;
    const colDefs = isLocalModeEnabled
      ? getLocalColDefs(executionResult, resultState)
      : getColDefs(executionResult, resultState);

    const onSaveGridColumnState = (): void => {
      if (!gridApi) {
        return;
      }
      resultState.setGridConfig({
        columns: gridApi.getColumnState(),
        isPivotModeEnabled: gridApi.isPivotMode(),
        isLocalModeEnabled: true,
        previewLimit: resultState.previewLimit,
        ...(resultState.wavgAggregationState?.weightedColumnIdPairs && {
          weightedColumnPairs:
            resultState.wavgAggregationState.weightedColumnIdPairs,
        }),
      });
    };

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

    const weightedColumnOptions = gridApi
      ?.getColumns()
      ?.filter((c) => c.getColDef().cellDataType === 'number')
      .map((col) => ({
        label: col.getColId(),
        value: col.getColId(),
      }));

    const selectedWeightedColumn =
      aggFuncParams?.colDef.field &&
      resultState.wavgAggregationState?.weightedColumnIdPairs.get(
        aggFuncParams.colDef.field,
      )
        ? {
            label: guaranteeNonNullable(
              resultState.wavgAggregationState.weightedColumnIdPairs.get(
                aggFuncParams.colDef.field,
              ),
            ),
            value: guaranteeNonNullable(
              resultState.wavgAggregationState.weightedColumnIdPairs.get(
                aggFuncParams.colDef.field,
              ),
            ),
          }
        : null;

    const onWeightedColumnOptionChange = (
      option: { label: string; value: string } | null,
    ) => {
      if (aggFuncParams?.colDef.field && option?.value) {
        resultState.wavgAggregationState?.addWeightedColumnIdPair(
          aggFuncParams.colDef.field,
          option.value,
        );
      }
    };

    const weightedAverage = (param: DataGridIAggFuncParams): void => {
      if (param.colDef.field) {
        if (!resultState.wavgAggregationState) {
          resultState.setWavgAggregationState(
            new QueryBuilderResultWavgAggregationState(),
          );
        }
        resultState.wavgAggregationState?.addWeightedColumnIdPair(
          param.colDef.field,
          param.colDef.field,
        );
        resultState.wavgAggregationState?.setIsApplyingWavg(true);
        setAggFuncParams(param);
      } else {
        applicationStore.notificationService.notifyError(
          'The id of this column can`t be retrieved to perform weighted average',
        );
      }
    };

    const weightedAverageHelper = (param: DataGridIAggFuncParams): number => {
      try {
        const column = param.colDef.field;
        if (column) {
          const weightedColumnId =
            resultState.wavgAggregationState?.weightedColumnIdPairs.get(column);
          if (weightedColumnId) {
            const weightedColumnSum = (param.rowNode.allLeafChildren ?? [])
              .map((node) => node.data[weightedColumnId])
              .reduce((a, b) => a + b) as number;
            const weightedColumnMultiply = (param.rowNode.allLeafChildren ?? [])
              .map((node) => node.data[weightedColumnId] * node.data[column])
              .reduce((a, b) => a + b);
            if (weightedColumnSum !== 0) {
              onSaveGridColumnState();
              return weightedColumnMultiply / weightedColumnSum;
            } else {
              applicationStore.notificationService.notifyError(
                'The weighted column sum is 0',
              );
            }
          } else {
            applicationStore.notificationService.notifyError(
              'The weighted column Id is not defined',
            );
          }
        }
      } catch (error) {
        assertErrorThrown(error);
        applicationStore.notificationService.notifyError(error);
      }
      return -1;
    };

    useEffect(() => {
      if (aggFuncParams) {
        aggFuncParams.api.setColumnAggFunc(
          guaranteeNonNullable(aggFuncParams.colDef.field),
          QueryBuilderDataGridCustomAggregationFunction.WAVG,
        );
      }
    }, [resultState.wavgAggregationState, aggFuncParams]);

    // Stats panel: use a lightweight version counter so onCellSelectionChanged
    // only does O(1) work. The hook reads from gridApiRef lazily when debounces fire.
    const [selectionVersion, setSelectionVersion] = useState(0);
    const columnTypes = new Map<string, string | undefined>(
      executionResult.builder.columns.map((c) => [c.name, c.type]),
    );
    const gridApiRef = useRef<DataGridApi<TDSRowDataType> | null>(null);
    const cellSelectionStats = useAsyncCellSelectionStats(
      selectionVersion,
      columnTypes,
      gridApiRef,
    );

    return (
      <div
        data-testid={QUERY_BUILDER_TEST_ID.QUERY_BUILDER_RESULT_VALUES_TDS}
        className="query-builder__result__values__table"
      >
        <div
          className={clsx('query-builder__result__tds-grid', {
            'query-builder__result__tds-grid--with-stats-bar': showSummaryStats,
            'ag-theme-balham': !darkMode,
            'ag-theme-balham-dark': darkMode,
          })}
        >
          {isLocalModeEnabled ? (
            <DataGrid
              rowData={getRowDataFromExecutionResult(executionResult)}
              onGridReady={(params): void => {
                gridApiRef.current = params.api;
                setGridApi(params.api);
                params.api.updateGridOptions({
                  pivotMode: Boolean(
                    resultState.gridConfig?.isPivotModeEnabled,
                  ),
                });
              }}
              gridOptions={{
                suppressScrollOnNewData: true,
                getRowId: (data) => `${data.data.rowNumber}`,
                pivotPanelShow: 'always',
                rowGroupPanelShow: 'always',
                cellSelection: true,
              }}
              // NOTE: when column definition changed, we need to force refresh the cell to make sure the cell renderer is updated
              // See https://stackoverflow.com/questions/56341073/how-to-refresh-an-ag-grid-when-a-change-occurs-inside-a-custom-cell-renderer-com
              onRowDataUpdated={(params) => {
                params.api.refreshCells({ force: true });
              }}
              suppressFieldDotNotation={true}
              suppressContextMenu={false}
              columnDefs={colDefs}
              aggFuncs={{
                wavg: weightedAverage,
                WAVG: weightedAverageHelper,
              }}
              sideBar={['columns', 'filters']}
              onColumnVisible={onSaveGridColumnState}
              onColumnPinned={onSaveGridColumnState}
              onColumnResized={onSaveGridColumnState}
              onColumnRowGroupChanged={onSaveGridColumnState}
              onColumnValueChanged={onSaveGridColumnState}
              onColumnPivotChanged={onSaveGridColumnState}
              onColumnPivotModeChanged={onSaveGridColumnState}
              onCellSelectionChanged={() => {
                // O(1) — just increment the version counter.
                // getSelectedCells() is deferred into the stats hook debounce.
                // eslint-disable-next-line no-console
                console.debug(`[TDS Grid (local)] onCellSelectionChanged`);
                setSelectionVersion((v) => v + 1);
              }}
              onCellClicked={(event) => {
                // Skip clicks that originated from a keyboard shortcut (Ctrl/Shift+Space
                // fires a synthetic click that would reset the range selection we just set).
                const e = event.event as MouseEvent | undefined;
                if (e?.ctrlKey || e?.shiftKey) {
                  return;
                }
                // eslint-disable-next-line no-console
                console.debug(
                  `[TDS Grid (local)] onCellClicked: col=${event.column.getColId()} row=${event.rowIndex}`,
                );
                if (event.rowIndex !== null) {
                  // Set AG Grid's internal keyboard focus to the clicked cell so
                  // subsequent keypresses act on this cell, not wherever AG Grid
                  // last had focus before the grid lost focus.
                  event.api.setFocusedCell(event.rowIndex, event.column);
                }
              }}
              onCellKeyDown={(
                event: DataGridCellKeyDownEvent<TDSRowDataType>,
              ) => {
                handleGridKeyboardShortcut(event);
              }}
            />
          ) : (
            <DataGrid
              rowData={getRowDataFromExecutionResult(executionResult)}
              onGridReady={(params): void => {
                gridApiRef.current = params.api;
              }}
              gridOptions={{
                suppressScrollOnNewData: true,
                getRowId: (data) => `${data.data.rowNumber}`,
                cellSelection: true,
              }}
              // NOTE: when column definition changed, we need to force refresh the cell to make sure the cell renderer is updated
              // See https://stackoverflow.com/questions/56341073/how-to-refresh-an-ag-grid-when-a-change-occurs-inside-a-custom-cell-renderer-com
              onRowDataUpdated={(params) => {
                params.api.refreshCells({ force: true });
              }}
              onCellSelectionChanged={() => {
                // O(1) — just increment the version counter.
                // getSelectedCells() is deferred into the stats hook debounce.
                // eslint-disable-next-line no-console
                console.debug(`[TDS Grid] onCellSelectionChanged`);
                setSelectionVersion((v) => v + 1);
              }}
              onCellClicked={(event) => {
                const e = event.event as MouseEvent | undefined;
                if (e?.ctrlKey || e?.shiftKey) {
                  return;
                }
                // eslint-disable-next-line no-console
                console.debug(
                  `[TDS Grid] onCellClicked: col=${event.column.getColId()} row=${event.rowIndex}`,
                );
                if (event.rowIndex !== null) {
                  event.api.setFocusedCell(event.rowIndex, event.column);
                }
              }}
              suppressFieldDotNotation={true}
              suppressClipboardPaste={false}
              suppressContextMenu={false}
              columnDefs={colDefs}
              getContextMenuItems={(params) => getContextMenuItems(params)}
              onCellKeyDown={(
                event: DataGridCellKeyDownEvent<TDSRowDataType>,
              ) => {
                handleGridKeyboardShortcut(event);
              }}
            />
          )}
          {showSummaryStats && cellSelectionStats !== undefined && (
            <QueryBuilderTDSCellSelectionStatsBar
              stats={cellSelectionStats.stats}
              cellCount={cellSelectionStats.cellCount}
              countReady={cellSelectionStats.countReady}
              darkMode={darkMode}
            />
          )}
          {resultState.wavgAggregationState?.isApplyingWavg && (
            <Dialog
              open={resultState.wavgAggregationState.isApplyingWavg}
              onClose={() =>
                resultState.wavgAggregationState?.setIsApplyingWavg(false)
              }
              classes={{
                root: 'editor-modal__root-container',
                container: 'editor-modal__container',
                paper: 'editor-modal__content',
              }}
            >
              <Modal
                darkMode={
                  !applicationStore.layoutService
                    .TEMPORARY__isLightColorThemeEnabled
                }
                className="query-editor__blocking-alert"
              >
                <ModalHeader title="Applying Weighted Average" />
                <ModalBody>
                  <div className="query-builder__result__tds-grid__text">
                    choose a weighted column from dropdown
                  </div>
                  <CustomSelectorInput
                    options={weightedColumnOptions}
                    onChange={onWeightedColumnOptionChange}
                    value={selectedWeightedColumn}
                    placeholder={'Choose a weighted column'}
                    darkMode={
                      !applicationStore.layoutService
                        .TEMPORARY__isLightColorThemeEnabled
                    }
                  />
                </ModalBody>
                <ModalFooter>
                  <ModalFooterButton
                    onClick={() => {
                      resultState.wavgAggregationState?.setIsApplyingWavg(
                        false,
                      );
                    }}
                    text="Apply"
                  />
                </ModalFooter>
              </Modal>
            </Dialog>
          )}
        </div>
      </div>
    );
  },
);
