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
  IRowNode,
  RowDragEndEvent,
  SelectionChangedEvent,
} from '@ag-grid-community/core';
import { useCallback, useEffect, useState } from 'react';
import {
  AgGridReact,
  type AgGridReactProps,
  type CustomCellRendererProps,
} from '@ag-grid-community/react';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import type {
  DataCubeEditorColumnsSelectorColumnState,
  DataCubeEditorColumnsSelectorState,
} from '../../../stores/dataCube/editor/DataCubeEditorColumnsSelectorState.js';
import { isNonNullable } from '@finos/legend-shared';

function getBaseGridProps<
  T extends DataCubeEditorColumnsSelectorColumnState,
>(): AgGridReactProps<T> {
  return {
    modules: [ClientSideRowModelModule],
    className: 'ag-theme-balham',
    animateRows: false,
    getRowId: (params) => params.data.name,
    editType: 'fullRow',
    rowSelection: 'multiple',
    rowDragMultiRow: true,
    rowDragEntireRow: true,
    suppressRowClickSelection: false,
    suppressMoveWhenRowDragging: true,
    rowHeight: 20,
    headerHeight: 20,
    suppressRowHoverHighlight: false,
    reactiveCustomComponents: true, // TODO: remove on v32 as this would be default to `true` then
    noRowsOverlayComponent: () => <div />,
  };
}

function getBaseColumnDef<
  T extends DataCubeEditorColumnsSelectorColumnState,
>(): ColDef<T> {
  return {
    field: 'name' as ColDefField<T>,
    flex: 1,
    minWidth: 100,
    filter: true,
    sortable: false,
    resizable: false,
    suppressHeaderMenuButton: true,
    colId: 'checkbox',
    checkboxSelection: true,
    headerCheckboxSelection: true,
    rowDrag: true,
    rowDragText: (params, dragItemCount) => {
      if (dragItemCount > 1) {
        return `${dragItemCount} columns`;
      }
      return (params.rowNode?.data as T).name;
    },
  };
}

export const DataCubeEditorColumnsSelector = observer(
  function DataCubeEditorColumnsSelector<
    T extends DataCubeEditorColumnsSelectorColumnState,
  >(props: { selector: DataCubeEditorColumnsSelectorState<T> }) {
    const { selector } = props;
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

    /**
     * Since we use managed row dragging for selected columns,
     * we just need to sync the row data with the state.
     * Dragging (multiple) row(s) to specific position have been
     * handled by ag-grid.
     */
    const onSelectedColumnsDragStop = useCallback(
      (params: RowDragEndEvent<T>) => {
        const newRowData: T[] = [];
        params.api.forEachNode((node: IRowNode<T>) => {
          if (node.data) {
            newRowData.push(node.data);
          }
        });
        selector.setSelectedColumns(newRowData);
        selector.setAvailableColumns(
          selector.availableColumns.filter(
            (column) => !newRowData.includes(column),
          ),
        );
      },
      [selector],
    );

    const onAvailableColumnsDragStop = useCallback(
      (params: RowDragEndEvent<T>) => {
        const nodes = params.nodes;
        const columnsToMove = nodes
          .map((node) => node.data)
          .filter(isNonNullable);

        selector.setAvailableColumns([
          ...selector.availableColumns,
          ...columnsToMove,
        ]);
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
        const newRowData: T[] = [];
        event.api.forEachNode((node: IRowNode<T>) => {
          if (node.data) {
            newRowData.push(node.data);
          }
        });
        selector.setSelectedColumns(newRowData);
      },
      [selector],
    );

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
      <div className="flex h-full w-full">
        <div className="h-full w-[calc(50%_-_20px)]">
          <div className="flex h-5 items-center text-sm">
            Available columns:
          </div>
          <div className="h-[calc(100%_-_20px)] rounded-sm border border-neutral-200">
            <div className="relative h-6 border-b border-neutral-200">
              <input
                className="h-full w-full pl-10 placeholder-neutral-400"
                placeholder="Click here to search..."
              />
              <div className="absolute left-0 top-0 flex h-6 w-10 items-center justify-center">
                <DataCubeIcon.Search className="stroke-[3px] text-lg text-neutral-500" />
              </div>
            </div>
            <div className="h-[calc(100%_-_24px)]">
              <AgGridReact
                {...getBaseGridProps<T>()}
                // Disable managed row-dragging to disallow changing the order of columns
                // and to make sure the row data and the available columns state are in sync
                rowDragManaged={false}
                onGridReady={(params) => setAvailableColumnsGridApi(params.api)}
                rowData={selector.availableColumns}
                onSelectionChanged={(event: SelectionChangedEvent<T>) => {
                  setSelectedAvailableColumns(
                    event.api
                      .getSelectedNodes()
                      .map((node) => node.data)
                      .filter(isNonNullable),
                  );
                }}
                columnDefs={[
                  {
                    ...getBaseColumnDef<T>(),
                    headerComponent: (params: CustomCellRendererProps<T>) => (
                      <div
                        title="Double-click to add all columns"
                        className="flex h-full w-full cursor-pointer items-center pl-0.5"
                        onDoubleClick={() => {
                          // TODO: scope this by the current search
                          selector.setSelectedColumns([
                            ...selector.selectedColumns,
                            ...selector.availableColumns,
                          ]);
                          selector.setAvailableColumns([]);
                          params.api.clearFocusedCell();
                        }}
                      >{`[All Columns]`}</div>
                    ),
                    cellRenderer: (params: CustomCellRendererProps<T>) => {
                      const data = params.data;
                      if (!data) {
                        return null;
                      }
                      return (
                        <div
                          className="h-full w-full cursor-pointer pl-2"
                          title={`[${data.name}]\nDouble-click to add column`}
                          onDoubleClick={() => {
                            selector.setSelectedColumns([
                              ...selector.selectedColumns,
                              data,
                            ]);
                            selector.setAvailableColumns(
                              selector.availableColumns.filter(
                                (column) => column !== data,
                              ),
                            );
                            params.api.clearFocusedCell();
                          }}
                        >
                          {data.name}
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
              className="flex cursor-pointer items-center justify-center rounded-sm border border-neutral-300 bg-neutral-100 text-neutral-500 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
              title="Add selected columns"
              onClick={() => {
                // TODO: scope this by the current search
                selector.setSelectedColumns([
                  ...selector.selectedColumns,
                  ...selectedAvailableColumns,
                ]);
                selector.setAvailableColumns(
                  selector.availableColumns.filter(
                    (column) => !selectedAvailableColumns.includes(column),
                  ),
                );
                availableColumnsGridApi?.clearFocusedCell();
              }}
              disabled={selectedAvailableColumns.length === 0}
            >
              <DataCubeIcon.ChevronRight className="text-2xl" />
            </button>
            <button
              className="mt-2 flex cursor-pointer items-center justify-center rounded-sm border border-neutral-300 bg-neutral-100 text-neutral-500 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
              title="Remove selected columns"
              onClick={() => {
                // TODO: scope this by the current search
                selector.setAvailableColumns([
                  ...selector.availableColumns,
                  ...selectedSelectedColumns,
                ]);
                selector.setSelectedColumns(
                  selector.selectedColumns.filter(
                    (column) => !selectedSelectedColumns.includes(column),
                  ),
                );
                selectedColumnsGridApi?.clearFocusedCell();
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
                placeholder="Click here to search..."
              />
              <div className="absolute left-0 top-0 flex h-6 w-10 items-center justify-center">
                <DataCubeIcon.Search className="stroke-[3px] text-lg text-neutral-500" />
              </div>
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
                rowData={selector.selectedColumns}
                columnDefs={[
                  {
                    ...getBaseColumnDef<T>(),
                    headerComponent: (params: CustomCellRendererProps<T>) => (
                      <div
                        title="Double-click to remove all columns"
                        className="flex h-full w-full cursor-pointer items-center pl-0.5"
                        onDoubleClick={() => {
                          // TODO: scope this by the current search
                          selector.setAvailableColumns([
                            ...selector.availableColumns,
                            ...selector.selectedColumns,
                          ]);
                          selector.setSelectedColumns([]);
                          params.api.clearFocusedCell();
                        }}
                      >{`[All Columns]`}</div>
                    ),
                    cellRenderer: (params: CustomCellRendererProps<T>) => {
                      const data = params.data;
                      if (!data) {
                        return null;
                      }
                      return (
                        <div
                          className="h-full w-full cursor-pointer pl-2"
                          title={`[${data.name}]\nDouble-click to remove column`}
                          onDoubleClick={() => {
                            selector.setAvailableColumns([
                              ...selector.availableColumns,
                              data,
                            ]);
                            selector.setSelectedColumns(
                              selector.selectedColumns.filter(
                                (column) => column !== data,
                              ),
                            );
                            params.api.clearFocusedCell();
                          }}
                        >
                          {data.name}
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
