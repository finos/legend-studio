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
  GetContextMenuItemsParams,
  GetMainMenuItemsParams,
  MenuItemDef,
} from '@ag-grid-community/core';
import { WIP_GridMenuItem } from '../../../components/dataCube/grid/DataCubeGridShared.js';
import {
  DataCubeQuerySortOperation,
  DataCubeColumnPinPlacement,
  DEFAULT_COLUMN_MIN_WIDTH,
  DataCubeColumnKind,
} from '../core/DataCubeQueryEngine.js';
import { isNonNullable } from '@finos/legend-shared';
import type { DataCubeGridControllerState } from './DataCubeGridControllerState.js';

export function generateMenuBuilder(
  controller: DataCubeGridControllerState,
): (
  params: GetContextMenuItemsParams | GetMainMenuItemsParams,
) => (string | MenuItemDef)[] {
  const dataCube = controller.dataCube;
  const editor = dataCube.editor;

  return (params: GetContextMenuItemsParams | GetMainMenuItemsParams) => {
    const column = params.column ?? undefined;
    const columnName = column?.getColId();
    const columnConfiguration = controller.getColumnConfiguration(columnName);
    const value: unknown = 'value' in params ? params.value : undefined;

    const sortMenu = [
      {
        name: 'Sort',
        subMenu: [
          ...(column && columnName
            ? [
                {
                  name: 'Ascending',
                  action: () =>
                    controller.setSortByColumn(
                      columnName,
                      DataCubeQuerySortOperation.ASCENDING,
                    ),
                },
                {
                  name: 'Ascending Absolute',
                  menuItem: WIP_GridMenuItem,
                  cssClasses: ['!opacity-100'],
                  disabled: true,
                },
                {
                  name: 'Descending',
                  action: () =>
                    controller.setSortByColumn(
                      columnName,
                      DataCubeQuerySortOperation.DESCENDING,
                    ),
                },
                {
                  name: 'Descending Absolute',
                  menuItem: WIP_GridMenuItem,
                  cssClasses: ['!opacity-100'],
                  disabled: true,
                },
                {
                  name: 'Clear Sort',
                  disabled: !controller.sortColumns.find(
                    (col) => col.name === columnName,
                  ),
                  action: () => controller.clearSortByColumn(columnName),
                },
                'separator',
                {
                  name: 'Add Ascending',
                  disabled: Boolean(
                    controller.sortColumns.find(
                      (col) =>
                        col.name === columnName &&
                        col.operation === DataCubeQuerySortOperation.ASCENDING,
                    ),
                  ),
                  action: () =>
                    controller.addSortByColumn(
                      columnName,
                      DataCubeQuerySortOperation.ASCENDING,
                    ),
                },
                {
                  name: 'Add Ascending Absolute',
                  menuItem: WIP_GridMenuItem,
                  cssClasses: ['!opacity-100'],
                  disabled: true,
                },
                {
                  name: 'Add Descending',
                  disabled: Boolean(
                    controller.sortColumns.find(
                      (col) =>
                        col.name === columnName &&
                        col.operation === DataCubeQuerySortOperation.DESCENDING,
                    ),
                  ),
                  action: () =>
                    controller.addSortByColumn(
                      columnName,
                      DataCubeQuerySortOperation.DESCENDING,
                    ),
                },
                {
                  name: 'Add Descending Absolute',
                  menuItem: WIP_GridMenuItem,
                  cssClasses: ['!opacity-100'],
                  disabled: true,
                },
                'separator',
              ]
            : []),
          {
            name: 'Clear All Sorts',
            disabled: controller.sortColumns.length === 0,
            action: () => controller.clearAllSorts(),
          },
        ],
      },
    ];

    return [
      {
        name: 'Export',
        menuItem: WIP_GridMenuItem,
        cssClasses: ['!opacity-100'],
        subMenu: [
          {
            name: 'HTML',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          {
            name: 'Plain Text',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          {
            name: 'PDF',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          {
            name: 'Excel',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          {
            name: 'CSV',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          'separator',
          {
            name: 'DataCube Specification',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
        ],
      },
      {
        name: 'Email',
        menuItem: WIP_GridMenuItem,
        cssClasses: ['!opacity-100'],
        subMenu: [
          {
            name: 'HTML',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          {
            name: 'Plain Text',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          'separator',
          {
            name: 'HTML Attachment',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          {
            name: 'Plain Text',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          {
            name: 'PDF Attachment',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          {
            name: 'Excel Attachment',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          {
            name: 'CSV Attachment',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          {
            name: 'DataCube Specification Attachment',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
        ],
      },
      {
        name: 'Copy',
        menuItem: WIP_GridMenuItem,
        cssClasses: ['!opacity-100'],
        subMenu: [
          {
            name: 'Plain Text',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          {
            name: 'Selected Row(s) as Plain Text',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          {
            name: 'Selected Column as Plain Text',
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
        ],
      },
      'separator',
      ...sortMenu,
      {
        name: 'Filter',
        menuItem: WIP_GridMenuItem,
        disabled: true,
        cssClasses: ['!opacity-100'],
        subMenu: [
          ...(column && value
            ? [
                {
                  name: `Add Filter: ${column.getColId()} = {value}`,
                  menuItem: WIP_GridMenuItem,
                  cssClasses: ['!opacity-100'],
                  disabled: true,
                },
                {
                  name: `More Filters on ${column.getColId()}...`,
                  menuItem: WIP_GridMenuItem,
                  cssClasses: ['!opacity-100'],
                  disabled: true,
                  subMenu: [], // TODO
                },
                'separator',
              ]
            : []),
          {
            name: 'Filters...',
          },
          {
            name: 'Clear All Filters',
          },
        ],
      },
      {
        name: 'Pivot',
        subMenu: [
          ...(column &&
          columnName &&
          columnConfiguration?.kind === DataCubeColumnKind.DIMENSION
            ? [
                {
                  name: `Vertical Pivot on ${column.getColId()}`,
                  action: () => controller.setVerticalPivotOnColumn(columnName),
                },
                {
                  name: `Add Vertical Pivot on ${column.getColId()}`,
                  disabled: Boolean(
                    controller.verticalPivotedColumns.find(
                      (col) => col.name === columnName,
                    ),
                  ),
                  action: () => controller.addVerticalPivotOnColumn(columnName),
                },
                {
                  name: `Remove Vertical Pivot on ${column.getColId()}`,
                  disabled: !controller.verticalPivotedColumns.find(
                    (col) => col.name === columnName,
                  ),
                  action: () =>
                    controller.removeVerticalPivotOnColumn(columnName),
                },
                'separator',
              ]
            : []),
          {
            name: `Clear All Vertical Pivots`,
            disabled: controller.verticalPivotedColumns.length === 0,
            action: () => controller.clearAllVerticalPivots(),
          },
        ],
      },
      {
        name: 'Heatmap',
        menuItem: WIP_GridMenuItem,
        cssClasses: ['!opacity-100'],
        disabled: !column,
        subMenu: column
          ? [
              {
                name: `Add to ${column.getColId()}`,
                menuItem: WIP_GridMenuItem,
                cssClasses: ['!opacity-100'],
                disabled: true,
              },
              {
                name: `Remove from ${column.getColId()}`,
                menuItem: WIP_GridMenuItem,
                cssClasses: ['!opacity-100'],
                disabled: true,
              },
            ]
          : [],
      },
      {
        name: 'Extended Columns',
        menuItem: WIP_GridMenuItem,
        cssClasses: ['!opacity-100'],
        disabled: true,
        subMenu: [
          {
            name: `Add New Column...`,
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          {
            name: `Edit {column}`,
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          {
            name: `Remove {column}`,
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
        ],
      },
      {
        name: 'Custom Groupings',
        menuItem: WIP_GridMenuItem,
        cssClasses: ['!opacity-100'],
        disabled: true,
        subMenu: [
          {
            name: `Add New Grouping...`,
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          {
            name: `Edit {column}`,
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
          {
            name: `Remove {column}`,
            menuItem: WIP_GridMenuItem,
            cssClasses: ['!opacity-100'],
            disabled: true,
          },
        ],
      },
      'separator',
      {
        name: 'Resize',
        subMenu: [
          {
            name: `Auto-size to Fit Content`,
            action: () =>
              params.api.autoSizeColumns(
                [column?.getColId()].filter(isNonNullable),
              ),
            disabled: !column,
          },
          {
            name: `Minimize Column`,
            action: () => {
              if (column) {
                params.api.setColumnWidths([
                  {
                    key: column.getColId(),
                    newWidth:
                      controller.getColumnConfiguration(columnName)?.minWidth ??
                      DEFAULT_COLUMN_MIN_WIDTH,
                  },
                ]);
              }
            },
            disabled: !column,
          },
          'separator',
          {
            name: `Auto-size All Columns`,
            action: () => params.api.autoSizeAllColumns(),
          },
          {
            name: `Minimize All Columns`,
            action: () => {
              params.api.setColumnWidths(
                // TODO: take care of pivot columns
                controller.configuration.columns.map((col) => ({
                  key: col.name,
                  newWidth:
                    controller.getColumnConfiguration(columnName)?.minWidth ??
                    DEFAULT_COLUMN_MIN_WIDTH,
                })),
              );
            },
          },
          {
            name: `Size Grid to Fit Screen`,
            action: () => params.api.sizeColumnsToFit(),
          },
        ],
      },
      {
        name: 'Pin',
        subMenu: [
          {
            name: `Pin Left`,
            disabled: !column || column.isPinnedLeft(),
            checked: Boolean(column?.isPinnedLeft()),
            action: () =>
              controller.pinColumn(columnName, DataCubeColumnPinPlacement.LEFT),
          },
          {
            name: `Pin Right`,
            disabled: !column || column.isPinnedRight(),
            checked: Boolean(column?.isPinnedRight()),
            action: () =>
              controller.pinColumn(
                columnName,
                DataCubeColumnPinPlacement.RIGHT,
              ),
          },
          {
            name: `Unpin`,
            disabled: !column?.isPinned(),
            action: () => controller.pinColumn(columnName, undefined),
          },
          'separator',
          {
            name: `Remove All Pinnings`,
            disabled: controller.configuration.columns.every(
              (col) => col.pinned === undefined,
            ),
            action: () => controller.removeAllPins(),
          },
        ],
      },
      {
        name: 'Hide',
        disabled: !column,
        action: () => controller.showColumn(columnName, false),
      },
      'separator',
      {
        name: 'Show Plot...',
        menuItem: WIP_GridMenuItem,
        cssClasses: ['!opacity-100'],
        disabled: true,
      },
      {
        name: 'Show TreeMap...',
        menuItem: WIP_GridMenuItem,
        cssClasses: ['!opacity-100'],
        disabled: true,
      },
      'separator',
      {
        name: 'Properties...',
        disabled: editor.isPanelOpen,
        action: () => {
          if (!editor.isPanelOpen) {
            editor.openPanel();
          }
        },
      },
    ];
  };
}
