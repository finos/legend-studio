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
import { cn, DataCubeIcon } from '@finos/legend-art';
import {
  type GridApi,
  type RowDragEndEvent,
  type SelectionChangedEvent,
  AllCommunityModule,
} from 'ag-grid-community';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AgGridReact,
  type CustomCellRendererProps,
  type CustomNoRowsOverlayProps,
} from 'ag-grid-react';
import { isNonNullable } from '@finos/legend-shared';
import { getDataForAllFilteredNodes } from '../../../stores/view/grid/DataCubeGridClientEngine.js';
import type { DataCubeViewState } from '../../../stores/view/DataCubeViewState.js';
import {
  FormAlert,
  FormBadge_WIP,
  FormCheckbox,
} from '../../core/DataCubeFormUtils.js';
import { DataCubeGridMode } from '../../../stores/core/DataCubeQueryEngine.js';
import { DataCubeEditorColumnsSelectorColumnState } from '../../../stores/view/editor/DataCubeEditorColumnsSelectorState.js';
import { getColumnsSelectorBaseGridProps } from './DataCubeEditorColumnsSelector.js';
import {
  DataCubeEditorDimensionState,
  type DataCubeEditorDimensionsPanelState,
  type DataCubeEditorDimensionsTreeNode,
} from '../../../stores/view/editor/DataCubeEditorDimensionsPanelState.js';
import { TreeDataModule } from 'ag-grid-enterprise';
import { _findCol } from '../../../stores/core/model/DataCubeColumn.js';
import { AlertType } from '../../../stores/services/DataCubeAlertService.js';
import { DEFAULT_ALERT_WINDOW_CONFIG } from '../../../stores/services/DataCubeLayoutService.js';

// NOTE: This is a workaround to prevent ag-grid license key check from flooding the console screen
// with its stack trace in Chrome.
// We MUST NEVER completely surpress this warning in production, else it's a violation of the ag-grid license!
// See https://www.ag-grid.com/react-data-grid/licensing/
const __INTERNAL__original_console_error = console.error; // eslint-disable-line no-console

/**
 * Move this display to a separate component to avoid re-rendering the header too frequently
 */
const AvailableColumnsSearchResultCountBadge = observer(
  (props: { panel: DataCubeEditorDimensionsPanelState; gridApi: GridApi }) => {
    const { panel, gridApi } = props;
    return (
      <div className="flex items-center justify-center rounded-lg bg-neutral-500 px-1 py-0.5 font-mono text-xs font-bold text-white">
        {`${getDataForAllFilteredNodes(gridApi).length}/${panel.availableColumnsForDisplay.length}`}
        <span className="hidden">
          {/* subscribing to the search text to trigger re-render as it changes */}
          {panel.availableColumnsSearchText}
        </span>
      </div>
    );
  },
);

/**
 * Move this display to a separate component to avoid re-rendering the header too frequently
 */
const DimensionsTreeSearchResultCountBadge = observer(
  (props: { panel: DataCubeEditorDimensionsPanelState; gridApi: GridApi }) => {
    const { panel, gridApi } = props;
    return (
      <div className="flex items-center justify-center rounded-lg bg-neutral-500 px-1 py-0.5 font-mono text-xs font-bold text-white">
        {`${
          getDataForAllFilteredNodes(gridApi)
            .map((node) => node.data)
            .filter((node) => node instanceof DataCubeEditorDimensionState)
            .length
        }/${panel.dimensions.length}`}
        <span className="hidden">
          {/* subscribing to the search text to trigger re-render as it changes */}
          {panel.dimensionsTreeSearchText}
        </span>
      </div>
    );
  },
);

/**
 * Move this display to a separate component to avoid re-rendering too frequently
 */
const DimensionLabel = observer(
  (props: {
    panel: DataCubeEditorDimensionsPanelState;
    dimension: DataCubeEditorDimensionState;
    gridApi: GridApi;
  }) => {
    const { panel, dimension, gridApi } = props;
    const nameInputRef = useRef<HTMLInputElement>(null);
    const [name, setName] = useState(dimension.name);
    const validationError =
      name.trim() === ''
        ? `Name is required`
        : Boolean(
              panel.dimensions
                .filter((dim) => dim.name !== dimension.name)
                .find((dim) => dim.name === name),
            )
          ? `Name must be unique`
          : undefined;
    const isNameValid = !validationError;

    const updateName = () => {
      if (!isNameValid) {
        return;
      }
      dimension.setName(name);
      dimension.setIsRenaming(false);
      gridApi.clearFocusedCell();
    };

    useEffect(() => {
      setName(dimension.name);
    }, [dimension.name]);

    useEffect(() => {
      if (dimension.isRenaming) {
        nameInputRef.current?.focus();
      }
    }, [dimension.isRenaming]);

    return (
      <div
        className={cn('flex h-full w-full items-center pl-1', {
          'cursor-pointer': !dimension.isRenaming,
        })}
        title={
          dimension.isRenaming
            ? undefined
            : `[Dimension: ${dimension.name}]\nDouble-click to rename dimension`
        }
      >
        <div className="text-2xs flex h-3 flex-shrink-0 items-center justify-center rounded-sm bg-neutral-500 px-1 font-bold text-white">
          DIM
        </div>
        {!dimension.isRenaming && (
          <div
            className="h-full flex-1 items-center overflow-hidden overflow-ellipsis whitespace-nowrap pl-1"
            /**
             * ag-grid row select event listener is at a deeper layer so we need to stop
             * the propagation as event capturing is happening, not when it's bubbling.
             */
            onDoubleClickCapture={(event) => {
              event.stopPropagation();
              dimension.setIsRenaming(true);
              gridApi.clearFocusedCell();
            }}
          >
            {dimension.name}
          </div>
        )}
        {dimension.isRenaming && (
          <div
            className="relative flex items-center"
            /**
             * ag-grid row select event listener is at a deeper layer so we need to stop
             * the propagation as event capturing is happening, not when it's bubbling.
             */
            onDoubleClickCapture={(event) => {
              event.stopPropagation();
              gridApi.clearFocusedCell();
            }}
          >
            <input
              ref={nameInputRef}
              className={cn(
                'ml-0.5 h-4 border border-neutral-300 pl-[1px] pr-6 focus:border-sky-600 focus:!outline-none',
                {
                  'border-red-600 focus:border-red-600': !isNameValid,
                },
              )}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
              onKeyDown={(event) => {
                if (event.code === 'Escape') {
                  nameInputRef.current?.focus();
                  nameInputRef.current?.select();
                }
              }}
              onKeyDownCapture={(event) => {
                if (event.code === 'Enter') {
                  event.stopPropagation();
                  updateName();
                }
              }}
              onBlur={() => {
                dimension.setIsRenaming(false);
                setName(dimension.name);
              }}
            />
            {isNameValid && (
              <button
                className="text-2xs absolute right-0.5 flex h-3 w-5 items-center justify-center rounded-sm bg-sky-600 text-white"
                onClick={(event) => {
                  event.stopPropagation();
                  updateName();
                }}
              >
                Save
              </button>
            )}
          </div>
        )}
      </div>
    );
  },
);

function confirmPopulateStubDimensionForColumnsAdding(
  view: DataCubeViewState,
  handler: () => void,
) {
  view.alertService.alert({
    message: `No target dimensions to add columns to`,
    text: `Columns need to be added to a dimension, but no dimension has been specified.\nDo you want to proceed with creating a new dimension and add the columns to it?`,
    type: AlertType.WARNING,
    actions: [
      {
        label: 'Proceed',
        handler,
      },
      {
        label: 'Cancel',
        handler: () => {},
      },
    ],
    windowConfig: {
      ...DEFAULT_ALERT_WINDOW_CONFIG,
      width: 550,
      height: 180,
    },
  });
}

export const DataCubeEditorDimensionsPanel = observer(
  (props: { view: DataCubeViewState }) => {
    const { view } = props;
    const editor = view.editor;
    const panel = editor.dimensions;

    const searchAvailableColumnsInputRef = useRef<HTMLInputElement | null>(
      null,
    );
    const searchDimensionsTreeInputRef = useRef<HTMLInputElement | null>(null);
    const [selectedAvailableColumns, setSelectedAvailableColumns] = useState<
      DataCubeEditorColumnsSelectorColumnState[]
    >([]);
    const [selectedSelectedColumns, setSelectedSelectedColumns] = useState<
      DataCubeEditorColumnsSelectorColumnState[]
    >([]);
    const [selectedDimensions, setSelectedDimensions] = useState<
      DataCubeEditorDimensionState[]
    >([]);
    const [availableColumnsGridApi, setAvailableColumnsGridApi] =
      useState<GridApi | null>(null);

    const [dimensionsTreeGridApi, setDimensionsTreeGridApi] =
      useState<GridApi | null>(null);

    /**
     * Since we use managed row dragging for selected columns,
     * we just need to sync the row data with the state.
     * Dragging (multiple) rows to specific position have been
     * handled by ag-grid.
     */
    // const onSelectedColumnsDragStop = useCallback(
    //   (params: RowDragEndEvent<>) => {
    //     // panel.setSelectedColumns(getDataForAllNodes(params.api));
    //   },
    //   [panel],
    // );

    // const onAvailableColumnsDragStop = useCallback(
    //   (params: RowDragEndEvent<T>) => {
    //     const nodes = params.nodes;
    //     const columnsToMove = nodes
    //       .map((node) => node.data)
    //       .filter(isNonNullable);
    //     selector.setSelectedColumns(
    //       selector.selectedColumns.filter(
    //         (column) => !columnsToMove.includes(column),
    //       ),
    //     );
    //   },
    //   [selector],
    // );

    /**
     * Since we use managed row dragging for selected columns,
     * we just need to sync the row data with the state
     * Dragging (multiple) rows to specific position have been
     * handled by ag-grid.
     */
    // const onSelectedColumnsDragEnd = useCallback(
    //   (event: RowDragEndEvent) => {
    //     if (event.overIndex === -1) {
    //       return;
    //     }
    //     selector.setSelectedColumns(getDataForAllNodes(event.api));
    //   },
    //   [selector],
    // );

    /**
     * Setup row drop zones for each grid to be the other
     * See https://www.ag-grid.com/react-data-grid/row-dragging-to-grid/
     */
    // useEffect(() => {
    //   if (!availableColumnsGridApi || !selectedColumnsGridApi) {
    //     return;
    //   }
    //   const selectedColumnsDropZoneParams =
    //     selectedColumnsGridApi.getRowDropZoneParams({
    //       onDragStop: (event) => {
    //         onSelectedColumnsDragStop(event);
    //         availableColumnsGridApi.clearFocusedCell();
    //       },
    //     });
    //   if (selectedColumnsDropZoneParams) {
    //     availableColumnsGridApi.removeRowDropZone(selectedColumnsDropZoneParams);
    //     availableColumnsGridApi.addRowDropZone(selectedColumnsDropZoneParams);
    //   }

    //   const availableColumnsDropZoneParams =
    //     availableColumnsGridApi.getRowDropZoneParams({
    //       onDragStop: (event) => {
    //         onAvailableColumnsDragStop(event);
    //         selectedColumnsGridApi.clearFocusedCell();
    //       },
    //     });
    //   if (availableColumnsDropZoneParams) {
    //     selectedColumnsGridApi.removeRowDropZone(availableColumnsDropZoneParams);
    //     selectedColumnsGridApi.addRowDropZone(availableColumnsDropZoneParams);
    //   }
    // }, [
    //   availableColumnsGridApi,
    //   selectedColumnsGridApi,
    //   onSelectedColumnsDragStop,
    //   onAvailableColumnsDragStop,
    // ]);

    // const overDimensionRef =
    //   useRef<IRowNode<DataCubeEditorDimensionsTreeNode>>(null);

    // const setPotentialParentForNode = (
    //   api: GridApi,
    //   overNode: IRowNode<DataCubeEditorDimensionsTreeNode> | undefined | null,
    // ) => {
    //   let potentialParentNode;
    //   if (overNode) {
    //     potentialParentNode =
    //       overNode.data?.data instanceof DataCubeEditorDimensionState
    //         ? // if over a dimension, we take the immediate row
    //           overNode
    //         : // if over a column, we take the parent row (which will be a folder)
    //           overNode.parent;
    //   } else {
    //     potentialParentNode = null;
    //   }
    //   if (overDimensionRef.current === potentialParentNode) {
    //     return;
    //   }
    //   // we refresh the previous selection (if it exists) to clear
    //   // the highlighted and then the new selection.
    //   const rowsToRefresh = [];
    //   if (overDimensionRef.current) {
    //     rowsToRefresh.push(overDimensionRef.current);
    //   }
    //   if (potentialParentNode) {
    //     rowsToRefresh.push(potentialParentNode);
    //   }
    //   overDimensionRef.current = potentialParentNode;

    //   api.refreshCells({
    //     // refresh these rows only.
    //     rowNodes: rowsToRefresh,
    //     // because the grid does change detection, the refresh
    //     // will not happen because the underlying value has not
    //     // changed. to get around this, we force the refresh,
    //     // which skips change detection.
    //     force: true,
    //   });
    // };

    // const onDimensionsTreeRowDragMove = useCallback(
    //   (event: RowDragMoveEvent<DataCubeEditorDimensionsTreeNode>) => {
    //     setPotentialParentForNode(event.api, event.overNode);
    //   },
    //   [],
    // );

    // const onDimensionsTreeRowDragLeave = useCallback(
    //   (event: RowDragLeaveEvent<DataCubeEditorDimensionsTreeNode>) => {
    //     setPotentialParentForNode(event.api, null);
    //   },
    //   [],
    // );

    const isDimensionsTreeRowDragEnabled =
      selectedDimensions.length === 0 || selectedSelectedColumns.length === 0;
    const onDimensionsTreeRowDragEnd = useCallback(
      (event: RowDragEndEvent<DataCubeEditorDimensionsTreeNode>) => {
        // console.log(event);
        // console.log('end');
        // if (!overDimensionRef.current) {
        //   return;
        // }
        // const movingData = event.node.data;
        // // take new parent path from parent, if data is missing, means it's the root node,
        // // which has no data.
        // const newParentPath = potentialParent.data
        //   ? potentialParent.data.filePath
        //   : [];
        // const needToChangeParent = !arePathsEqual(
        //   newParentPath,
        //   movingData.filePath,
        // );
        // // check we are not moving a folder into a child folder
        // const invalidMode = isSelectionParentOfTarget(
        //   event.node,
        //   potentialParent,
        // );
        // if (invalidMode) {
        //   console.log('invalid move');
        // }
        // if (needToChangeParent && !invalidMode) {
        //   const updatedRows: any[] = [];
        //   moveToPath(newParentPath, event.node, updatedRows);
        //   gridRef.current!.api.applyTransaction({
        //     update: updatedRows,
        //   });
        //   gridRef.current!.api.clearFocusedCell();
        // }
        // clear node to highlight
        // setPotentialParentForNode(event.api, null);
      },
      [],
    );

    // const onDimensionsTreeRowDragCancel = useCallback(
    //   (event: RowDragCancelEvent<DataCubeEditorDimensionsTreeNode>) => {
    //     setPotentialParentForNode(event.api, null);
    //   },
    //   [],
    // );

    // on load, reset all renaming state for all dimensions
    useEffect(() => {
      panel.dimensions.forEach((dimension) => dimension.setIsRenaming(false));
    }, [panel]);

    // eslint-disable-next-line no-process-env
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error = (message?: unknown, ...agrs: unknown[]) => {
        console.debug(`%c ${message}`, 'color: silver'); // eslint-disable-line no-console
      };
    }

    return (
      <div className="h-full w-full select-none p-2">
        <div className="flex h-6">
          <div className="flex h-6 items-center text-xl font-medium">
            <DataCubeIcon.TableDimension />
          </div>
          <div className="ml-1 flex h-6 items-center text-xl font-medium">
            Dimensions
            <FormBadge_WIP />
          </div>
        </div>
        <div className="h-[calc(100%_-_24px)] w-full">
          <div className="h-10 py-2">
            <div className="flex h-6 w-full items-center">
              <FormCheckbox
                label="Enable multidimensional grid mode"
                checked={
                  editor.generalProperties.configuration.gridMode ===
                  DataCubeGridMode.MULTIDIMENSIONAL
                }
                onChange={() => {
                  if (
                    editor.generalProperties.configuration.gridMode ===
                    DataCubeGridMode.MULTIDIMENSIONAL
                  ) {
                    editor.generalProperties.configuration.setGridMode(
                      DataCubeGridMode.STANDARD,
                    );
                  } else {
                    if (
                      // only suggest converting vertical pivots if no dimensions have been specified
                      editor.verticalPivots.selector.selectedColumns.length !==
                        0 &&
                      panel.dimensions.length === 0
                    ) {
                      view.alertService.alert({
                        message: `Specified vertical pivots will be ignored in multidimensional grid mode.`,
                        text: `Multidimensional grid mode will ignore any specified vertical pivots, essentially, vertical pivot columns can be considered as one dimension.\nFor convenience, these vertical pivots can be converted into a dimension, do you want this conversion to happen?`,
                        type: AlertType.WARNING,
                        actions: [
                          {
                            label: 'Yes',
                            handler: () => {
                              const groupByColumns =
                                editor.verticalPivots.selector.selectedColumns;
                              const newDimension = panel.newDimension();
                              newDimension.setColumns(
                                panel.availableColumns.filter((column) =>
                                  _findCol(groupByColumns, column.name),
                                ),
                              );
                              editor.verticalPivots.selector.setSelectedColumns(
                                [],
                              );
                              panel.refreshDimensionsTreeData();

                              editor.generalProperties.configuration.setGridMode(
                                DataCubeGridMode.MULTIDIMENSIONAL,
                              );
                            },
                          },
                          {
                            label: 'No',
                            handler: () => {
                              editor.generalProperties.configuration.setGridMode(
                                DataCubeGridMode.MULTIDIMENSIONAL,
                              );
                            },
                          },
                        ],
                        windowConfig: {
                          ...DEFAULT_ALERT_WINDOW_CONFIG,
                          width: 550,
                          height: 220,
                        },
                      });
                    } else {
                      editor.generalProperties.configuration.setGridMode(
                        DataCubeGridMode.MULTIDIMENSIONAL,
                      );
                    }
                  }
                }}
              />
            </div>
          </div>

          {editor.generalProperties.configuration.gridMode !==
            DataCubeGridMode.MULTIDIMENSIONAL && (
            <FormAlert
              message="Multidimensional grid mode is experimental"
              type={AlertType.WARNING}
              text={`This is an alternative grid view for DataCube with a different mode of interaction: dimensions (ordered list of columns to group by) are defined and will be used to explore data "top-down". Initially, the grid will show the root aggregation, then user can drill down into each dimension. This grid mode comes with the following limitations:
- Specified vertical pivots will be ignored: essentially, vertical pivot can be considered as one dimension in this mode
- No support for pagination
- Initial view can take longer to materialize if drilldown is deep`}
            />
          )}
          {editor.generalProperties.configuration.gridMode ===
            DataCubeGridMode.MULTIDIMENSIONAL && (
            <div className="flex h-[calc(100%_-_40px)] w-full">
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
                        placeholder="Search columns..."
                        value={panel.availableColumnsSearchText}
                        onChange={(event) =>
                          panel.setAvailableColumnsSearchText(
                            event.target.value,
                          )
                        }
                        onKeyDown={(event) => {
                          if (event.code === 'Escape') {
                            event.stopPropagation();
                            searchAvailableColumnsInputRef.current?.select();
                            panel.setAvailableColumnsSearchText('');
                          }
                        }}
                      />
                      <div className="absolute left-0 top-0 flex h-6 w-10 items-center justify-center">
                        <DataCubeIcon.Search className="stroke-[3px] text-lg text-neutral-500" />
                      </div>
                      <button
                        className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center text-neutral-500 disabled:text-neutral-300"
                        disabled={!panel.availableColumnsSearchText}
                        title="Clear search [Esc]"
                        onClick={() => {
                          panel.setAvailableColumnsSearchText('');
                          searchAvailableColumnsInputRef.current?.focus();
                        }}
                      >
                        <DataCubeIcon.X className="text-lg" />
                      </button>
                    </div>
                    <div className="h-[calc(100%_-_24px)]">
                      <AgGridReact
                        {...getColumnsSelectorBaseGridProps()}
                        // Disable managed row-dragging to disallow changing the order of columns
                        // and to make sure the row data and the available columns state are in sync
                        rowDragManaged={false}
                        onGridReady={(params) =>
                          setAvailableColumnsGridApi(params.api)
                        }
                        onSelectionChanged={(event) => {
                          setSelectedAvailableColumns(
                            event.api
                              .getSelectedNodes()
                              .map((node) => node.data)
                              .filter(isNonNullable),
                          );
                        }}
                        // Using ag-grid quick filter is a cheap way to implement search
                        quickFilterText={panel.availableColumnsSearchText}
                        rowData={panel.availableColumnsForDisplay}
                        columnDefs={[
                          {
                            field: 'name',
                            colId: 'name',
                            flex: 1,
                            minWidth: 100,
                            filter: true,
                            sortable: false,
                            resizable: false,
                            suppressHeaderMenuButton: true,
                            getQuickFilterText: (params) => params.value,
                            /**
                             * Support double-click to add all (filtered by search) columns
                             */
                            headerComponent: (
                              params: CustomCellRendererProps<DataCubeEditorColumnsSelectorColumnState>,
                            ) => (
                              <button
                                title="Double-click to add all columns"
                                className="flex h-full w-full items-center justify-between pl-0.5"
                                onDoubleClick={() => {
                                  // The columns being moved are scoped by the current search
                                  const filteredNodes =
                                    getDataForAllFilteredNodes(params.api);

                                  const dimension = panel.dimensions.at(-1);
                                  if (dimension) {
                                    dimension.setColumns([
                                      ...dimension.columns,
                                      ...filteredNodes,
                                    ]);
                                    panel.refreshDimensionsTreeData();
                                  } else {
                                    confirmPopulateStubDimensionForColumnsAdding(
                                      view,
                                      () => {
                                        const newDimension =
                                          panel.newDimension();
                                        newDimension.setColumns([
                                          ...filteredNodes,
                                        ]);
                                        panel.refreshDimensionsTreeData();
                                      },
                                    );
                                  }

                                  params.api.clearFocusedCell();
                                }}
                              >
                                <div>{`[All Columns]`}</div>
                                <AvailableColumnsSearchResultCountBadge
                                  panel={panel}
                                  gridApi={params.api}
                                />
                              </button>
                            ),
                            cellRenderer: (
                              params: CustomCellRendererProps<DataCubeEditorColumnsSelectorColumnState>,
                            ) => {
                              const data = params.data;
                              if (!data) {
                                return null;
                              }

                              return (
                                <div
                                  className="flex h-full w-full cursor-pointer items-center"
                                  title={`[${data.name}]\nDouble-click to add column`}
                                  onDoubleClick={() => {
                                    const dimension = panel.dimensions.at(-1);
                                    if (dimension) {
                                      dimension.setColumns([
                                        ...dimension.columns,
                                        data,
                                      ]);
                                      panel.refreshDimensionsTreeData();
                                    } else {
                                      confirmPopulateStubDimensionForColumnsAdding(
                                        view,
                                        () => {
                                          const newDimension =
                                            panel.newDimension();
                                          newDimension.setColumns([data]);
                                          panel.refreshDimensionsTreeData();
                                        },
                                      );
                                    }

                                    params.api.clearFocusedCell();
                                  }}
                                >
                                  <div className="h-full flex-1 items-center overflow-hidden overflow-ellipsis whitespace-nowrap pl-2">
                                    {data.name}
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
                      title="Add selected column(s)"
                      /**
                       * Support add selected (filtered by search) columns
                       * We reset the selection after this operation
                       */
                      onClick={() => {
                        if (
                          !availableColumnsGridApi ||
                          selectedAvailableColumns.length === 0
                        ) {
                          return;
                        }

                        // The columns being moved are scoped by the current search
                        const filteredNodes = getDataForAllFilteredNodes(
                          availableColumnsGridApi,
                        );
                        const columnsToMove = selectedAvailableColumns.filter(
                          (column) => _findCol(filteredNodes, column.name),
                        );

                        const dimension = panel.dimensions.at(-1);
                        if (dimension) {
                          dimension.setColumns([
                            ...dimension.columns,
                            ...columnsToMove,
                          ]);
                          panel.refreshDimensionsTreeData();
                        } else {
                          confirmPopulateStubDimensionForColumnsAdding(
                            view,
                            () => {
                              const newDimension = panel.newDimension();
                              newDimension.setColumns([...columnsToMove]);
                              panel.refreshDimensionsTreeData();
                            },
                          );
                        }

                        availableColumnsGridApi.clearFocusedCell();
                      }}
                      disabled={
                        !availableColumnsGridApi ||
                        selectedAvailableColumns.length === 0
                      }
                    >
                      <DataCubeIcon.ChevronRight className="text-2xl" />
                    </button>
                    <button
                      className="mt-2 flex items-center justify-center rounded-sm border border-neutral-300 bg-neutral-100 text-neutral-500 hover:bg-neutral-200 disabled:bg-neutral-200 disabled:text-neutral-400"
                      title="Remove selected column(s)"
                      /**
                       * Support remove selected (filtered by search) columns
                       * We reset the selection after this operation
                       */
                      onClick={() => {
                        if (
                          !dimensionsTreeGridApi ||
                          selectedSelectedColumns.length === 0
                        ) {
                          return;
                        }

                        // The columns being moved are scoped by the current search
                        const filteredNodes = getDataForAllFilteredNodes(
                          dimensionsTreeGridApi,
                        );
                        const columnsToMove = selectedSelectedColumns.filter(
                          (column) => _findCol(filteredNodes, column.name),
                        );

                        panel.deselectColumns(columnsToMove);
                        panel.refreshDimensionsTreeData();
                        dimensionsTreeGridApi.clearFocusedCell();
                      }}
                      disabled={
                        !dimensionsTreeGridApi ||
                        selectedSelectedColumns.length === 0
                      }
                    >
                      <DataCubeIcon.ChevronLeft className="text-2xl" />
                    </button>
                  </div>
                </div>
                <div className="data-cube-tree-selector h-full w-[calc(50%_-_20px)]">
                  <div className="flex h-5 items-center text-sm">
                    Dimensions:
                  </div>
                  <div className="h-[calc(100%_-_20px)] rounded-sm border border-neutral-200">
                    <div className="flex h-6">
                      <div className="relative h-6 w-[calc(100%_-_124px)] border-b border-r border-neutral-200">
                        <input
                          className="h-full w-full pl-10 pr-6 placeholder-neutral-400"
                          ref={searchDimensionsTreeInputRef}
                          placeholder="Search..."
                          value={panel.dimensionsTreeSearchText}
                          onChange={(event) =>
                            panel.setDimensionsTreeSearchText(
                              event.target.value,
                            )
                          }
                          onKeyDown={(event) => {
                            if (event.code === 'Escape') {
                              event.stopPropagation();
                              searchDimensionsTreeInputRef.current?.select();
                              panel.setDimensionsTreeSearchText('');
                            }
                          }}
                        />
                        <div className="absolute left-0 top-0 flex h-6 w-10 items-center justify-center">
                          <DataCubeIcon.Search className="stroke-[3px] text-lg text-neutral-500" />
                        </div>
                        <button
                          className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center text-neutral-500 disabled:text-neutral-300"
                          disabled={!panel.dimensionsTreeSearchText}
                          title="Clear search [Esc]"
                          onClick={() => {
                            panel.setDimensionsTreeSearchText('');
                            searchDimensionsTreeInputRef.current?.focus();
                          }}
                        >
                          <DataCubeIcon.X className="text-lg" />
                        </button>
                      </div>
                      <div className="flex h-6 items-center border-b border-neutral-200">
                        <button
                          className="flex h-6 w-6 items-center justify-center text-neutral-500 disabled:text-neutral-300"
                          title="Add new dimension"
                          onClick={() => {
                            panel.newDimension();
                            panel.refreshDimensionsTreeData();
                          }}
                        >
                          <DataCubeIcon.Plus className="text-lg" />
                        </button>
                        <div className="h-3 w-[1px] bg-neutral-200" />
                        <button
                          className="flex h-6 w-6 items-center justify-center text-neutral-500 disabled:text-neutral-300"
                          title="Move dimension(s) up"
                          disabled={selectedDimensions.length === 0}
                          onClick={() => {
                            if (selectedDimensions.length === 0) {
                              return;
                            }

                            const minIdx = Math.min(
                              ...selectedDimensions.map((dimension) =>
                                panel.dimensions.indexOf(dimension),
                              ),
                            );
                            const precedings = [
                              ...panel.dimensions.slice(
                                0,
                                Math.max(minIdx - 1, 0),
                              ),
                              // ensure moving dimensions maintain their relative ordering
                              ...panel.dimensions
                                .map((dimension) =>
                                  selectedDimensions.find(
                                    (dim) => dim.name === dimension.name,
                                  ),
                                )
                                .filter(isNonNullable),
                            ];

                            panel.setDimensions([
                              ...precedings,
                              ...panel.dimensions.filter(
                                (dimension) =>
                                  !precedings.find(
                                    (dim) => dim.name === dimension.name,
                                  ),
                              ),
                            ]);

                            panel.refreshDimensionsTreeData();
                          }}
                        >
                          <DataCubeIcon.ChevronUp className="text-lg" />
                        </button>
                        <div className="h-3 w-[1px] bg-neutral-200" />
                        <button
                          className="flex h-6 w-6 items-center justify-center text-neutral-500 disabled:text-neutral-300"
                          title="Move dimension(s) down"
                          disabled={selectedDimensions.length === 0}
                          onClick={() => {
                            if (selectedDimensions.length === 0) {
                              return;
                            }

                            const maxIdx = Math.max(
                              ...selectedDimensions.map((dimension) =>
                                panel.dimensions.indexOf(dimension),
                              ),
                            );
                            const followings = [
                              // ensure moving dimensions maintain their relative ordering
                              ...panel.dimensions
                                .map((dimension) =>
                                  selectedDimensions.find(
                                    (dim) => dim.name === dimension.name,
                                  ),
                                )
                                .filter(isNonNullable),
                              ...panel.dimensions.slice(
                                Math.min(maxIdx + 1, panel.dimensions.length) +
                                  1,
                              ),
                            ];

                            panel.setDimensions([
                              ...panel.dimensions.filter(
                                (dimension) =>
                                  !followings.find(
                                    (dim) => dim.name === dimension.name,
                                  ),
                              ),
                              ...followings,
                            ]);

                            panel.refreshDimensionsTreeData();
                          }}
                        >
                          <DataCubeIcon.ChevronDown className="text-lg" />
                        </button>
                        <div className="h-3 w-[1px] bg-neutral-200" />
                        <button
                          className="flex h-6 w-6 items-center justify-center text-neutral-500 disabled:text-neutral-300"
                          title="Remove dimension(s)"
                          disabled={selectedDimensions.length === 0}
                          onClick={() => {
                            if (selectedDimensions.length === 0) {
                              return;
                            }

                            selectedDimensions.at(0)?.setIsRenaming(true);
                          }}
                        >
                          <DataCubeIcon.Pencil className="text-lg" />
                        </button>
                        <div className="h-3 w-[1px] bg-neutral-200" />
                        <button
                          className="flex h-6 w-6 items-center justify-center text-neutral-500 disabled:text-neutral-300"
                          title="Rename dimension"
                          disabled={selectedDimensions.length === 0}
                          onClick={() => {
                            if (selectedDimensions.length === 0) {
                              return;
                            }

                            panel.setDimensions(
                              panel.dimensions.filter(
                                (dimension) =>
                                  !selectedDimensions.find(
                                    (dim) => dim.name === dimension.name,
                                  ),
                              ),
                            );
                            panel.refreshDimensionsTreeData();
                          }}
                        >
                          <DataCubeIcon.Delete className="text-lg" />
                        </button>
                      </div>
                    </div>
                    <div className="h-[calc(100%_-_24px)]">
                      <AgGridReact
                        {...getColumnsSelectorBaseGridProps<DataCubeEditorDimensionsTreeNode>()}
                        modules={[AllCommunityModule, TreeDataModule]}
                        className="ag-theme-quartz"
                        treeData={true}
                        treeDataChildrenField="children"
                        groupDefaultExpanded={-1} // expand all groups by default
                        // Disable managed row-dragging to disallow changing the order of columns
                        // and to make sure the row data and the available columns state are in sync
                        onGridReady={(params) => {
                          setDimensionsTreeGridApi(params.api);

                          // eslint-disable-next-line no-process-env
                          if (process.env.NODE_ENV !== 'production') {
                            // restore original error logging
                            console.error = __INTERNAL__original_console_error; // eslint-disable-line no-console
                          }
                        }}
                        onSelectionChanged={(event: SelectionChangedEvent) => {
                          const selectedNodes = event.api
                            .getSelectedNodes()
                            .map(
                              (node) =>
                                node.data as DataCubeEditorDimensionsTreeNode,
                            )
                            .filter(isNonNullable);
                          const _selectedColumns: DataCubeEditorColumnsSelectorColumnState[] =
                            [];
                          const _selectedDimensions: DataCubeEditorDimensionState[] =
                            [];
                          selectedNodes.forEach((node) => {
                            if (
                              node.data instanceof DataCubeEditorDimensionState
                            ) {
                              _selectedDimensions.push(node.data);
                            } else if (
                              node.data instanceof
                              DataCubeEditorColumnsSelectorColumnState
                            ) {
                              _selectedColumns.push(node.data);
                            }
                          });
                          setSelectedDimensions(_selectedDimensions);
                          setSelectedSelectedColumns(_selectedColumns);
                        }}
                        rowSelection={{
                          mode: 'multiRow',
                          groupSelects: 'self',
                        }}
                        columnDefs={[]}
                        // Using ag-grid quick filter is a cheap way to implement search
                        quickFilterText={panel.dimensionsTreeSearchText}
                        rowData={panel.dimensionsTreeData.nodes}
                        autoGroupColumnDef={{
                          headerName: 'Name',
                          field: 'name',
                          colId: 'name',
                          flex: 1,
                          minWidth: 100,
                          filter: true,
                          sortable: false,
                          resizable: false,
                          suppressHeaderMenuButton: true,
                          getQuickFilterText: (params) => params.value,
                          /**
                           * Support double-click to remove all (filtered by search) columns
                           */
                          headerComponent: (
                            params: CustomCellRendererProps,
                          ) => (
                            <button
                              title="Double-click to remove all columns"
                              className="flex h-full w-full items-center justify-between pl-0.5"
                              onDoubleClick={() => {
                                // The columns being moved are scoped by the current search
                                const filteredNodes =
                                  getDataForAllFilteredNodes(params.api);

                                panel.deselectColumns(
                                  panel.selectedColumns.filter((column) =>
                                    _findCol(filteredNodes, column.name),
                                  ),
                                );
                                panel.refreshDimensionsTreeData();
                                params.api.clearFocusedCell();
                              }}
                            >
                              <div>{`[All Dimensions]`}</div>
                              <DimensionsTreeSearchResultCountBadge
                                panel={panel}
                                gridApi={params.api}
                              />
                            </button>
                          ),
                          onCellDoubleClicked: (params) => {
                            if (
                              params.data?.data instanceof
                              DataCubeEditorDimensionState
                            ) {
                              params.data.data.setColumns([]);
                              panel.refreshDimensionsTreeData();
                              params.api.clearFocusedCell();
                            }
                          },
                          cellRendererParams: {
                            innerRenderer: (
                              params: CustomCellRendererProps<DataCubeEditorDimensionsTreeNode>,
                            ) => {
                              const data = params.data;

                              if (!data) {
                                return null;
                              }
                              if (
                                data.data instanceof
                                DataCubeEditorDimensionState
                              ) {
                                return (
                                  <DimensionLabel
                                    panel={panel}
                                    dimension={data.data}
                                    gridApi={params.api}
                                  />
                                );
                              }
                              return (
                                <div
                                  className="flex h-full w-full cursor-pointer items-center"
                                  title={`[${data.name}]\nDouble-click to remove column`}
                                  onDoubleClick={() => {
                                    if (
                                      data.data instanceof
                                      DataCubeEditorColumnsSelectorColumnState
                                    ) {
                                      panel.deselectColumns([data.data]);
                                      panel.refreshDimensionsTreeData();
                                    }
                                    params.api.clearFocusedCell();
                                  }}
                                >
                                  <div className="h-full flex-1 items-center overflow-hidden overflow-ellipsis whitespace-nowrap pl-1">
                                    {data.name}
                                  </div>
                                </div>
                              );
                            },
                          },
                        }}
                        noRowsOverlayComponent={(
                          params: CustomNoRowsOverlayProps,
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
                          return (
                            <div className="flex items-center border-[1.5px] border-neutral-200 p-2 font-semibold text-neutral-400">
                              <div>
                                <DataCubeIcon.Warning className="mr-1 text-lg" />
                              </div>
                              No dimensions specified
                            </div>
                          );
                        }}
                        suppressRowDrag={!isDimensionsTreeRowDragEnabled}
                        rowDragEntireRow={isDimensionsTreeRowDragEnabled}
                        onRowDragEnd={onDimensionsTreeRowDragEnd}
                        // rowDragText={(params, dragItemCount) => {
                        //   // const nodes = params.rowNodes;
                        //   // if (
                        //   //   params.rowNodes?.data instanceof
                        //   //   DataCubeEditorDimensionState
                        //   // ) {
                        //   //   return `Move dimension: ${params.node.data.name}`;
                        //   // }
                        //   // return `Move column: ${params.node.data.name}`;
                        // }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  },
);
