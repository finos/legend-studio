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
import { DataCubeIcon } from '@finos/legend-art';
import type {
  ColDef,
  ColDefField,
  GridApi,
  ModelUpdatedEvent,
  RowDragEndEvent,
  SelectionChangedEvent,
} from '@ag-grid-community/core';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AgGridReact,
  type AgGridReactProps,
  type CustomCellRendererProps,
  type CustomNoRowsOverlayProps,
} from '@ag-grid-community/react';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import {
  type DataCubeEditorColumnsSelectorColumnState,
  type DataCubeEditorColumnsSelectorState,
} from '../../../stores/dataCube/editor/DataCubeEditorColumnsSelectorState.js';
import { isNonNullable } from '@finos/legend-shared';
import {
  getDataForAllFilteredNodes,
  getDataForAllNodes,
} from '../../../stores/dataCube/grid/DataCubeGridClientEngine.js';

function getBaseGridProps<
  T extends DataCubeEditorColumnsSelectorColumnState,
>(): AgGridReactProps<T> {
  return {
    modules: [ClientSideRowModelModule],
    className: 'ag-theme-quartz',
    animateRows: false,
    getRowId: (params) => params.data.name,
    editType: 'fullRow',
    rowDragMultiRow: true,
    rowDragEntireRow: true,
    selection: {
      mode: 'multiRow',
      checkboxes: true,
      headerCheckbox: true,
      enableClickSelection: true,
    },
    selectionColumnDef: {
      width: 40,
      headerClass: '!pl-[23px]',
      cellClass: '!pl-1.5',
      rowDrag: true,
      rowDragText: (params, dragItemCount) => {
        if (dragItemCount > 1) {
          return `${dragItemCount} columns`;
        }
        return (params.rowNode?.data as T).name;
      },
      sortable: false,
      resizable: false,
      suppressHeaderMenuButton: true,
    },
    suppressMoveWhenRowDragging: true,
    rowHeight: 20,
    headerHeight: 20,
    suppressRowHoverHighlight: false,
    noRowsOverlayComponent: (
      params: CustomNoRowsOverlayProps<T> & {
        noColumnsSelectedRenderer?: (() => React.ReactNode) | undefined;
      },
    ) => {
      if (params.api.getQuickFilter()) {
        return (
          <div className="flex items-center border-[1.5px] border-neutral-300 p-2 font-semibold text-neutral-400">
            <div>
              <DataCubeIcon.WarningCircle className="mr-1 text-lg" />
            </div>
            No match found
          </div>
        );
      }
      if (params.noColumnsSelectedRenderer) {
        return params.noColumnsSelectedRenderer();
      }
      return <div />;
    },
    // Show no rows overlay when there are no search results
    // See https://stackoverflow.com/a/72637410
    onModelUpdated: (event: ModelUpdatedEvent<T>) => {
      if (event.api.getDisplayedRowCount() === 0) {
        event.api.showNoRowsOverlay();
      } else {
        event.api.hideOverlay();
      }
    },
  };
}

function getBaseColumnDef<
  T extends DataCubeEditorColumnsSelectorColumnState,
>(): ColDef<T> {
  return {
    field: 'name' as ColDefField<T>,
    colId: 'name',
    flex: 1,
    minWidth: 100,
    filter: true,
    sortable: false,
    resizable: false,
    suppressHeaderMenuButton: true,
    getQuickFilterText: (params) => params.value,
  };
}

/**
 * Move this display to a separate component to avoid re-rendering the header too frequently
 */
const ColumnsSearchResultCountBadge = observer(
  function ColumnsSearchResultCountBadge<
    T extends DataCubeEditorColumnsSelectorColumnState,
  >(props: {
    selector: DataCubeEditorColumnsSelectorState<T>;
    gridApi: GridApi<T>;
    scope: 'available' | 'selected';
  }) {
    const { selector, gridApi, scope } = props;
    return (
      <div className="flex items-center justify-center rounded-lg bg-neutral-500 px-1 py-0.5 font-mono text-xs font-bold text-white">
        {`${getDataForAllFilteredNodes(gridApi).length}/${scope === 'available' ? selector.availableColumnsForDisplay.length : selector.selectedColumnsForDisplay.length}`}
        <span className="hidden">
          {scope === 'available'
            ? // subscribing to the search text to trigger re-render as it changes
              selector.availableColumnsSearchText
            : selector.selectedColumnsSearchText}
        </span>
      </div>
    );
  },
);

export const DataCubeEditorColumnsSelector = observer(
  function DataCubeEditorColumnsSelector<
    T extends DataCubeEditorColumnsSelectorColumnState,
  >(props: {
    selector: DataCubeEditorColumnsSelectorState<T>;
    columnLabelRenderer?:
      | ((p: {
          selector: DataCubeEditorColumnsSelectorState<T>;
          column: T;
        }) => React.ReactNode)
      | undefined;
    columnActionRenderer?:
      | ((p: {
          selector: DataCubeEditorColumnsSelectorState<T>;
          column: T;
        }) => React.ReactNode)
      | undefined;
    noColumnsSelectedRenderer?: (() => React.ReactNode) | undefined;
  }) {
    const {
      selector,
      columnLabelRenderer,
      columnActionRenderer,
      noColumnsSelectedRenderer,
    } = props;
    const [selectedAvailableColumns, setSelectedAvailableColumns] = useState<
      T[]
    >([]);
    const [selectedSelectedColumns, setSelectedSelectedColumns] = useState<T[]>(
      [],
    );
    const [availableColumnsGridApi, setAvailableColumnsGridApi] =
      useState<GridApi | null>(null);
    const [selectedColumnsGridApi, setSelectedColumnsGridApi] =
      useState<GridApi | null>(null);
    const searchAvailableColumnsInputRef = useRef<HTMLInputElement | null>(
      null,
    );
    const searchSelectedColumnsInputRef = useRef<HTMLInputElement | null>(null);

    /**
     * Since we use managed row dragging for selected columns,
     * we just need to sync the row data with the state.
     * Dragging (multiple) row(s) to specific position have been
     * handled by ag-grid.
     */
    const onSelectedColumnsDragStop = useCallback(
      (params: RowDragEndEvent<T>) => {
        selector.setSelectedColumns(getDataForAllNodes(params.api));
      },
      [selector],
    );

    const onAvailableColumnsDragStop = useCallback(
      (params: RowDragEndEvent<T>) => {
        const nodes = params.nodes;
        const columnsToMove = nodes
          .map((node) => node.data)
          .filter(isNonNullable);
        selector.setSelectedColumns(
          selector.selectedColumns.filter(
            (column) => !columnsToMove.includes(column),
          ),
        );
      },
      [selector],
    );

    /**
     * Since we use managed row dragging for selected columns,
     * we just need to sync the row data with the state
     * Dragging (multiple) row(s) to specific position have been
     * handled by ag-grid.
     */
    const onSelectedColumnsDragEnd = useCallback(
      (event: RowDragEndEvent) => {
        if (event.overIndex === -1) {
          return;
        }
        selector.setSelectedColumns(getDataForAllNodes(event.api));
      },
      [selector],
    );

    /**
     * Setup row drop zones for each grid to be the other
     * See https://www.ag-grid.com/react-data-grid/row-dragging-to-grid/
     */
    useEffect(() => {
      if (!availableColumnsGridApi || !selectedColumnsGridApi) {
        return;
      }
      const selectedColumnsDropZoneParams =
        selectedColumnsGridApi.getRowDropZoneParams({
          onDragStop: (event) => {
            onSelectedColumnsDragStop(event);
            availableColumnsGridApi.clearFocusedCell();
          },
        });
      availableColumnsGridApi.removeRowDropZone(selectedColumnsDropZoneParams);
      availableColumnsGridApi.addRowDropZone(selectedColumnsDropZoneParams);

      const availableColumnsDropZoneParams =
        availableColumnsGridApi.getRowDropZoneParams({
          onDragStop: (event) => {
            onAvailableColumnsDragStop(event);
            selectedColumnsGridApi.clearFocusedCell();
          },
        });
      selectedColumnsGridApi.removeRowDropZone(availableColumnsDropZoneParams);
      selectedColumnsGridApi.addRowDropZone(availableColumnsDropZoneParams);
    }, [
      availableColumnsGridApi,
      selectedColumnsGridApi,
      onSelectedColumnsDragStop,
      onAvailableColumnsDragStop,
    ]);

    return (
      <div className="data-cube-column-selector flex h-full w-full">
        <div className="h-full w-[calc(50%_-_20px)]">
          <div className="flex h-5 items-center text-sm">
            Available columns:
          </div>
          <div className="h-[calc(100%_-_20px)] rounded-sm border border-neutral-200">
            <div className="relative h-6 border-b border-neutral-200">
              <input
                className="h-full w-full pl-10 pr-6 placeholder-neutral-400"
                ref={searchAvailableColumnsInputRef}
                placeholder="Click here to search..."
                value={selector.availableColumnsSearchText}
                onChange={(event) =>
                  selector.setAvailableColumnsSearchText(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.code === 'Escape') {
                    event.stopPropagation();
                    searchAvailableColumnsInputRef.current?.select();
                    selector.setAvailableColumnsSearchText('');
                  }
                }}
              />
              <div className="absolute left-0 top-0 flex h-6 w-10 items-center justify-center">
                <DataCubeIcon.Search className="stroke-[3px] text-lg text-neutral-500" />
              </div>
              <button
                className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center text-neutral-500 disabled:text-neutral-300"
                disabled={!selector.availableColumnsSearchText}
                title="Clear search [Esc]"
                onClick={() => {
                  selector.setAvailableColumnsSearchText('');
                  searchAvailableColumnsInputRef.current?.focus();
                }}
              >
                <DataCubeIcon.X className="text-lg" />
              </button>
            </div>
            <div className="h-[calc(100%_-_24px)]">
              <AgGridReact
                {...getBaseGridProps<T>()}
                // Disable managed row-dragging to disallow changing the order of columns
                // and to make sure the row data and the available columns state are in sync
                rowDragManaged={false}
                onGridReady={(params) => setAvailableColumnsGridApi(params.api)}
                onSelectionChanged={(event: SelectionChangedEvent<T>) => {
                  setSelectedAvailableColumns(
                    event.api
                      .getSelectedNodes()
                      .map((node) => node.data)
                      .filter(isNonNullable),
                  );
                }}
                // Using ag-grid quick filter is a cheap way to implement search
                quickFilterText={selector.availableColumnsSearchText}
                rowData={selector.availableColumnsForDisplay}
                columnDefs={[
                  {
                    ...getBaseColumnDef<T>(),
                    /**
                     * Support double-click to add all (filtered by search) columns
                     */
                    headerComponent: (params: CustomCellRendererProps<T>) => (
                      <button
                        title="Double-click to add all columns"
                        className="flex h-full w-full items-center justify-between pl-0.5"
                        onDoubleClick={() => {
                          // The columns being moved are scoped by the current search
                          const filteredData = getDataForAllFilteredNodes(
                            params.api,
                          );
                          selector.setSelectedColumns([
                            ...selector.selectedColumns,
                            ...filteredData,
                          ]);
                          params.api.clearFocusedCell();
                        }}
                      >
                        <div>{`[All Columns]`}</div>
                        <ColumnsSearchResultCountBadge
                          selector={selector}
                          gridApi={params.api}
                          scope="available"
                        />
                      </button>
                    ),
                    cellRenderer: (params: CustomCellRendererProps<T>) => {
                      const data = params.data;
                      if (!data) {
                        return null;
                      }

                      return (
                        <div
                          className="flex h-full w-full cursor-pointer items-center"
                          title={`[${data.name}]\nDouble-click to add column`}
                          onDoubleClick={() => {
                            selector.setSelectedColumns([
                              ...selector.selectedColumns,
                              data,
                            ]);
                            params.api.clearFocusedCell();
                          }}
                        >
                          {columnLabelRenderer?.({
                            selector,
                            column: data,
                          }) ?? (
                            <div className="h-full flex-1 items-center overflow-hidden overflow-ellipsis whitespace-nowrap pl-2">
                              {data.name}
                            </div>
                          )}
                          <div className="flex h-full">
                            {columnActionRenderer?.({
                              selector,
                              column: data,
                            }) ?? null}
                          </div>
                        </div>
                      );
                    },
                  },
                ]}
              />
            </div>
          </div>
        </div>
        <div className="flex h-full w-10 items-center justify-center">
          <div className="flex flex-col">
            <button
              className="flex items-center justify-center rounded-sm border border-neutral-300 bg-neutral-100 text-neutral-500 hover:bg-neutral-200 disabled:bg-neutral-200 disabled:text-neutral-400"
              title="Add selected columns"
              /**
               * Support add selected (filtered by search) columns
               * We reset the selection after this operation
               */
              onClick={() => {
                if (!availableColumnsGridApi) {
                  return;
                }
                // The columns being moved are scoped by the current search
                const filteredData = getDataForAllFilteredNodes(
                  availableColumnsGridApi,
                );
                const columnsToMove = selectedAvailableColumns.filter(
                  (column) => filteredData.includes(column),
                );
                selector.setSelectedColumns([
                  ...selector.selectedColumns,
                  ...columnsToMove,
                ]);
                availableColumnsGridApi.clearFocusedCell();
              }}
              disabled={selectedAvailableColumns.length === 0}
            >
              <DataCubeIcon.ChevronRight className="text-2xl" />
            </button>
            <button
              className="mt-2 flex items-center justify-center rounded-sm border border-neutral-300 bg-neutral-100 text-neutral-500 hover:bg-neutral-200 disabled:bg-neutral-200 disabled:text-neutral-400"
              title="Remove selected columns"
              /**
               * Support remove selected (filtered by search) columns
               * We reset the selection after this operation
               */
              onClick={() => {
                if (!selectedColumnsGridApi) {
                  return;
                }
                // The columns being moved are scoped by the current search
                const filteredData = getDataForAllFilteredNodes(
                  selectedColumnsGridApi,
                );
                const columnsToMove = selectedSelectedColumns.filter((column) =>
                  filteredData.includes(column),
                );
                selector.setSelectedColumns(
                  selector.selectedColumns.filter(
                    (column) => !columnsToMove.includes(column),
                  ),
                );
                selectedColumnsGridApi.clearFocusedCell();
              }}
              disabled={selectedSelectedColumns.length === 0}
            >
              <DataCubeIcon.ChevronLeft className="text-2xl" />
            </button>
          </div>
        </div>
        <div className="h-full w-[calc(50%_-_20px)]">
          <div className="flex h-5 items-center text-sm">Selected columns:</div>
          <div className="h-[calc(100%_-_20px)] rounded-sm border border-neutral-200">
            <div className="relative h-6 border-b border-neutral-200">
              <input
                className="h-full w-full pl-10 placeholder-neutral-400"
                ref={searchSelectedColumnsInputRef}
                placeholder="Click here to search..."
                value={selector.selectedColumnsSearchText}
                onChange={(event) =>
                  selector.setSelectedColumnsSearchText(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.code === 'Escape') {
                    event.stopPropagation();
                    selector.setSelectedColumnsSearchText('');
                  }
                }}
              />
              <div className="absolute left-0 top-0 flex h-6 w-10 items-center justify-center">
                <DataCubeIcon.Search className="stroke-[3px] text-lg text-neutral-500" />
              </div>
              <button
                className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center text-neutral-500 disabled:text-neutral-300"
                disabled={!selector.selectedColumnsSearchText}
                title="Clear search [Esc]"
                onClick={() => {
                  selector.setSelectedColumnsSearchText('');
                  searchSelectedColumnsInputRef.current?.focus();
                }}
              >
                <DataCubeIcon.X className="text-lg" />
              </button>
            </div>
            <div className="h-[calc(100%_-_24px)]">
              <AgGridReact
                {...getBaseGridProps<T>()}
                // NOTE: technically, we don't want to enable managed row-dragging here
                // but enabling this gives us free row moving management and interaction
                // comes out of the box from ag-grid, we will just sync the state with
                // grid row data afterwards to ensure consistency
                rowDragManaged={true}
                onRowDragEnd={onSelectedColumnsDragEnd}
                onGridReady={(params) => setSelectedColumnsGridApi(params.api)}
                onSelectionChanged={(event: SelectionChangedEvent<T>) => {
                  setSelectedSelectedColumns(
                    event.api
                      .getSelectedNodes()
                      .map((node) => node.data)
                      .filter(isNonNullable),
                  );
                }}
                // Using ag-grid quick filter is a cheap way to implement search
                quickFilterText={selector.selectedColumnsSearchText}
                noRowsOverlayComponentParams={{
                  noColumnsSelectedRenderer,
                }}
                rowData={selector.selectedColumnsForDisplay}
                columnDefs={[
                  {
                    ...getBaseColumnDef<T>(),
                    /**
                     * Support double-click to remove all (filtered by search) columns
                     */
                    headerComponent: (params: CustomCellRendererProps<T>) => (
                      <button
                        title="Double-click to remove all columns"
                        className="flex h-full w-full items-center justify-between pl-0.5"
                        onDoubleClick={() => {
                          // The columns being moved are scoped by the current search
                          const filteredData = getDataForAllFilteredNodes(
                            params.api,
                          );
                          selector.setSelectedColumns(
                            selector.selectedColumns.filter(
                              (column) => !filteredData.includes(column),
                            ),
                          );
                          params.api.clearFocusedCell();
                        }}
                      >
                        <div>{`[All Columns]`}</div>
                        <ColumnsSearchResultCountBadge
                          selector={selector}
                          gridApi={params.api}
                          scope="selected"
                        />
                      </button>
                    ),
                    cellRenderer: (params: CustomCellRendererProps<T>) => {
                      const data = params.data;
                      if (!data) {
                        return null;
                      }

                      return (
                        <div
                          className="flex h-full w-full cursor-pointer items-center"
                          title={`[${data.name}]\nDouble-click to add column`}
                          onDoubleClick={() => {
                            selector.setSelectedColumns(
                              selector.selectedColumns.filter(
                                (column) => column !== data,
                              ),
                            );
                            params.api.clearFocusedCell();
                          }}
                        >
                          {columnLabelRenderer?.({
                            selector,
                            column: data,
                          }) ?? (
                            <div className="h-full flex-1 items-center overflow-hidden overflow-ellipsis whitespace-nowrap pl-2">
                              {data.name}
                            </div>
                          )}
                          <div className="flex h-full">
                            {columnActionRenderer?.({
                              selector,
                              column: data,
                            }) ?? null}
                          </div>
                        </div>
                      );
                    },
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </div>
    );
  },
);
