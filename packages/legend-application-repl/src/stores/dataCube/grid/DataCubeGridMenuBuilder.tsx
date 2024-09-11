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
  DataCubeQuerySortOperator,
  DataCubeColumnPinPlacement,
  DEFAULT_COLUMN_MIN_WIDTH,
  DataCubeColumnKind,
  type DataCubeOperationValue,
  DataCubeQueryFilterOperator,
} from '../core/DataCubeQueryEngine.js';
import {
  guaranteeIsNumber,
  isNonNullable,
  UnsupportedOperationError,
} from '@finos/legend-shared';
import type { DataCubeGridControllerState } from './DataCubeGridControllerState.js';
import {
  DataCubeGridClientExportFormat,
  INTERNAL__GRID_CLIENT_MISSING_VALUE,
} from './DataCubeGridClientEngine.js';
import { PRIMITIVE_TYPE } from '@finos/legend-graph';
import type { DataCubeColumnConfiguration } from '../core/DataCubeConfiguration.js';
import { DataCubeFilterEditorConditionTreeNode } from '../core/filter/DataCubeQueryFilterEditorState.js';
import { DataCubeEditorTab } from '../editor/DataCubeEditorState.js';

function toFilterValue(
  value: unknown,
  columnConfiguration: DataCubeColumnConfiguration,
): { label: string; value: DataCubeOperationValue } {
  const label = `${columnConfiguration.type === PRIMITIVE_TYPE.STRING ? `'${value}'` : value}`;
  let val: unknown;
  switch (columnConfiguration.type) {
    case PRIMITIVE_TYPE.STRING: {
      val = value;
      break;
    }
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.DECIMAL:
    case PRIMITIVE_TYPE.FLOAT:
    case PRIMITIVE_TYPE.INTEGER: {
      val = guaranteeIsNumber(Number(value));
      break;
    }
    case PRIMITIVE_TYPE.DATE:
    case PRIMITIVE_TYPE.STRICTDATE:
    case PRIMITIVE_TYPE.DATETIME: {
      val = value; // TODO?: make sure this is a parsable date string
      break;
    }
    default: {
      throw new UnsupportedOperationError(
        `Can't filter on column with unsupported type '${columnConfiguration.type}'`,
      );
    }
  }
  return { label, value: { type: columnConfiguration.type, value: val } };
}

function getColumnFilterOperations(
  columnConfiguration: DataCubeColumnConfiguration,
): string[] {
  switch (columnConfiguration.type) {
    case PRIMITIVE_TYPE.STRING: {
      return [
        DataCubeQueryFilterOperator.EQUAL,
        DataCubeQueryFilterOperator.NOT_EQUAL,
        DataCubeQueryFilterOperator.LESS_THAN,
        DataCubeQueryFilterOperator.LESS_THAN_OR_EQUAL,
        DataCubeQueryFilterOperator.GREATER_THAN,
        DataCubeQueryFilterOperator.GREATER_THAN_OR_EQUAL,
        DataCubeQueryFilterOperator.CONTAIN,
        DataCubeQueryFilterOperator.NOT_CONTAIN,
        DataCubeQueryFilterOperator.START_WITH,
        DataCubeQueryFilterOperator.NOT_START_WITH,
        DataCubeQueryFilterOperator.END_WITH,
        DataCubeQueryFilterOperator.NOT_END_WITH,
      ];
    }
    case PRIMITIVE_TYPE.NUMBER:
    case PRIMITIVE_TYPE.DECIMAL:
    case PRIMITIVE_TYPE.FLOAT:
    case PRIMITIVE_TYPE.INTEGER: {
      return [
        DataCubeQueryFilterOperator.EQUAL,
        DataCubeQueryFilterOperator.NOT_EQUAL,
        DataCubeQueryFilterOperator.LESS_THAN,
        DataCubeQueryFilterOperator.LESS_THAN_OR_EQUAL,
        DataCubeQueryFilterOperator.GREATER_THAN,
        DataCubeQueryFilterOperator.GREATER_THAN_OR_EQUAL,
      ];
    }
    case PRIMITIVE_TYPE.DATE:
    case PRIMITIVE_TYPE.STRICTDATE:
    case PRIMITIVE_TYPE.DATETIME: {
      return [
        DataCubeQueryFilterOperator.EQUAL,
        DataCubeQueryFilterOperator.NOT_EQUAL,
        DataCubeQueryFilterOperator.LESS_THAN,
        DataCubeQueryFilterOperator.LESS_THAN_OR_EQUAL,
        DataCubeQueryFilterOperator.GREATER_THAN,
        DataCubeQueryFilterOperator.GREATER_THAN_OR_EQUAL,
      ];
    }
    default: {
      return [];
    }
  }
}

function buildNewFilterConditionMenuItem(
  columnConfiguration: DataCubeColumnConfiguration,
  operator: string,
  value: { label: string; value: DataCubeOperationValue } | undefined,
  controller: DataCubeGridControllerState,
): MenuItemDef {
  const operation = controller.dataCube.engine.getFilterOperation(operator);
  return {
    name: `Add Filter: ${columnConfiguration.name} ${operation.textLabel}${value ? ` ${value.label}` : ''}`,
    action: () => {
      controller.addNewFilterCondition(
        new DataCubeFilterEditorConditionTreeNode(
          controller.filterTree.root,
          {
            name: columnConfiguration.name,
            type: columnConfiguration.type,
          },
          operation,
          value?.value,
          undefined,
        ),
      );
    },
  };
}

export function generateMenuBuilder(
  controller: DataCubeGridControllerState,
): (
  params: GetContextMenuItemsParams | GetMainMenuItemsParams,
  fromHeader: boolean,
) => (string | MenuItemDef)[] {
  const dataCube = controller.dataCube;

  // NOTE: we need to minimize the usage of these states
  // since the grid context-menu should be solely driven
  // by the grid controller
  const filter = dataCube.filter;
  const editor = dataCube.editor;
  const extend = dataCube.extend;

  return (
    params: GetContextMenuItemsParams | GetMainMenuItemsParams,
    fromHeader: boolean,
  ) => {
    const column = params.column ?? undefined;
    const columnName = column?.getColId();
    const columnConfiguration = controller.getColumnConfiguration(columnName);
    const isExtendedColumn =
      columnName &&
      controller.extendedColumns.find((col) => col.name === columnName);
    // NOTE: here we assume the value must be coming from the same column
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
                      DataCubeQuerySortOperator.ASCENDING,
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
                      DataCubeQuerySortOperator.DESCENDING,
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
                        col.operation === DataCubeQuerySortOperator.ASCENDING,
                    ),
                  ),
                  action: () =>
                    controller.addSortByColumn(
                      columnName,
                      DataCubeQuerySortOperator.ASCENDING,
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
                        col.operation === DataCubeQuerySortOperator.DESCENDING,
                    ),
                  ),
                  action: () =>
                    controller.addSortByColumn(
                      columnName,
                      DataCubeQuerySortOperator.DESCENDING,
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

    let newFilterMenu: MenuItemDef[] = [];
    if (columnConfiguration && column && value !== undefined) {
      if (value !== INTERNAL__GRID_CLIENT_MISSING_VALUE) {
        const filterValue = toFilterValue(value, columnConfiguration);
        const filterOperations = getColumnFilterOperations(columnConfiguration);

        if (
          filterOperations.length &&
          filterOperations.includes(DataCubeQueryFilterOperator.EQUAL)
        ) {
          const moreFilterOperations = filterOperations.filter(
            (op) => op !== DataCubeQueryFilterOperator.EQUAL,
          );

          newFilterMenu = [
            buildNewFilterConditionMenuItem(
              columnConfiguration,
              DataCubeQueryFilterOperator.EQUAL,
              filterValue,
              controller,
            ),
            moreFilterOperations.length
              ? {
                  name: `More Filters on ${column.getColId()}...`,
                  subMenu: moreFilterOperations.map((operator) =>
                    buildNewFilterConditionMenuItem(
                      columnConfiguration,
                      operator,
                      filterValue,
                      controller,
                    ),
                  ),
                }
              : undefined,
          ].filter(isNonNullable);
        }
      } else {
        newFilterMenu = [
          buildNewFilterConditionMenuItem(
            columnConfiguration,
            DataCubeQueryFilterOperator.IS_NULL,
            undefined,
            controller,
          ),
          buildNewFilterConditionMenuItem(
            columnConfiguration,
            DataCubeQueryFilterOperator.IS_NOT_NULL,
            undefined,
            controller,
          ),
        ];
      }
    }

    return [
      {
        name: 'Export',
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
            action: () =>
              dataCube.grid.exportEngine.exportFile(
                DataCubeGridClientExportFormat.EXCEL,
              ),
          },
          {
            name: 'CSV',
            action: () =>
              dataCube.grid.exportEngine.exportFile(
                DataCubeGridClientExportFormat.CSV,
              ),
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
            name: 'Plain Text Attachment',
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
            action: () => {
              dataCube.grid.exportEngine
                .exportEmail(DataCubeGridClientExportFormat.EXCEL)
                .catch(dataCube.application.logUnhandledError);
            },
          },
          {
            name: 'CSV Attachment',
            action: () => {
              dataCube.grid.exportEngine
                .exportEmail(DataCubeGridClientExportFormat.CSV)
                .catch(dataCube.application.logUnhandledError);
            },
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
        subMenu: [
          ...newFilterMenu,
          newFilterMenu.length ? 'separator' : undefined,
          {
            name: 'Filters...',
            action: () => {
              filter.display.open();
            },
          },
          {
            name: 'Clear All Filters',
            action: () => controller.clearFilters(),
          },
        ].filter(isNonNullable),
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
        name: 'Extended Columns',
        subMenu: [
          {
            name: `Add New Column...`,
            action: () => extend.openNewColumnEditor(),
          },
          ...(columnConfiguration && columnName
            ? [
                {
                  name: `Extend Column ${columnName}...`,
                  action: () => extend.openNewColumnEditor(columnConfiguration),
                },
              ]
            : []),
          ...(isExtendedColumn
            ? [
                'separator',
                {
                  name: `Edit Column ${columnName}...`,
                  menuItem: WIP_GridMenuItem,
                  cssClasses: ['!opacity-100'],
                  disabled: true,
                },
                {
                  name: `Delete Column ${columnName}`,
                  menuItem: WIP_GridMenuItem,
                  cssClasses: ['!opacity-100'],
                  disabled: true,
                },
              ]
            : []),
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
            disabled:
              !column ||
              !columnConfiguration ||
              columnConfiguration.fixedWidth !== undefined,
            action: () =>
              params.api.autoSizeColumns(
                [column?.getColId()].filter(isNonNullable),
              ),
          },
          {
            name: `Minimize Column`,
            disabled:
              !column ||
              !columnConfiguration ||
              columnConfiguration.fixedWidth !== undefined,
            action: () => {
              if (column) {
                params.api.setColumnWidths([
                  {
                    key: column.getColId(),
                    newWidth:
                      columnConfiguration?.minWidth ?? DEFAULT_COLUMN_MIN_WIDTH,
                  },
                ]);
              }
            },
          },
          'separator',
          {
            name: `Auto-size All Columns`,
            action: () =>
              params.api.autoSizeColumns(
                controller.configuration.columns
                  .filter((col) => col.fixedWidth === undefined)
                  .map((col) => col.name),
              ),
          },
          {
            name: `Minimize All Columns`,
            action: () => {
              params.api.setColumnWidths(
                // TODO: take care of pivot columns
                controller.configuration.columns
                  .filter((col) => col.fixedWidth === undefined)
                  .map((col) => ({
                    key: col.name,
                    newWidth:
                      columnConfiguration?.minWidth ?? DEFAULT_COLUMN_MIN_WIDTH,
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
        disabled: editor.display.isOpen,
        action: () => {
          // open the column property
          if (column && fromHeader) {
            editor.setCurrentTab(DataCubeEditorTab.COLUMN_PROPERTIES);
            editor.columnProperties.setSelectedColumnName(column.getColId());
          }
          editor.display.open();
        },
      },
    ];
  };
}
