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
import type { DataCubeState } from '../../../../stores/dataCube/DataCubeState.js';
import { buildGridSortsMenu } from './DataCubeGridSortsMenu.js';
import { WIP_GridMenuItem } from '../DataCubeGridShared.js';
import {
  DataCubeColumnPinPlacement,
  DEFAULT_COLUMN_MIN_WIDTH,
} from '../../../../stores/dataCube/core/DataCubeQueryEngine.js';
import { isNonNullable } from '@finos/legend-shared';

export function buildGridMenu(
  params:
    | GetContextMenuItemsParams<unknown, { dataCube: DataCubeState }>
    | GetMainMenuItemsParams<unknown, { dataCube: DataCubeState }>,
): (string | MenuItemDef)[] {
  const context = params.context;
  const dataCube = context.dataCube;
  const editor = dataCube.editor;
  const column = params.column ?? undefined;
  const columnConfiguration = editor.columnProperties.getColumnConfiguration(
    column?.getColId(),
  );
  const value: unknown = 'value' in params ? params.value : undefined;

  const result: (string | MenuItemDef)[] = [
    {
      name: 'Export',
      // menuItem: WIP_GridMenuItem,
      // cssClasses: ['!opacity-100'],
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
          action: () => {
            dataCube.grid.generateExcelFile();
          },
        },
        {
          name: 'CSV',
          action: () => {
            dataCube.grid.generateCSVFile();
          },
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
          action: () => {
            dataCube.grid.generateEmail(true, true);
          },
        },
        {
          name: 'Plain Text',
          action: () => {
            dataCube.grid.generateEmail(false, true);
          },
        },
        'separator',
        {
          name: 'HTML Attachment',
          action: () => {
            dataCube.grid.generateEmail(true, true);
          },
        },
        {
          name: 'Plain Text',
          action: () => {
            dataCube.grid.generateEmail(false, true);
          },
        },
        {
          name: 'Plain Text',
          action: () => {
            dataCube.grid.generateEmail(false, true);
          },
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
    buildGridSortsMenu(editor, column, value),
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
      menuItem: WIP_GridMenuItem,
      disabled: true,
      cssClasses: ['!opacity-100'],
      subMenu: [
        ...(column
          ? [
              {
                name: `VPivot on ${column.getColId()}`,
                menuItem: WIP_GridMenuItem,
                cssClasses: ['!opacity-100'],
                disabled: true,
              },
              {
                name: `Add VPivot on ${column.getColId()}`,
                menuItem: WIP_GridMenuItem,
                cssClasses: ['!opacity-100'],
                disabled: true,
              },
              {
                name: `Remove VPivot on ${column.getColId()}`,
                menuItem: WIP_GridMenuItem,
                cssClasses: ['!opacity-100'],
                disabled: true,
              },
              'separator',
            ]
          : []),
        {
          name: `Clear All VPivots`,
          menuItem: WIP_GridMenuItem,
          cssClasses: ['!opacity-100'],
          disabled: true,
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
                    columnConfiguration?.minWidth ?? DEFAULT_COLUMN_MIN_WIDTH,
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
              dataCube.editor.columnProperties.columns.map((col) => ({
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
          action: () => {
            columnConfiguration?.setPinned(DataCubeColumnPinPlacement.LEFT);
            editor.applyChanges();
          },
        },
        {
          name: `Pin Right`,
          disabled: !column || column.isPinnedRight(),
          checked: Boolean(column?.isPinnedRight()),
          action: () => {
            columnConfiguration?.setPinned(DataCubeColumnPinPlacement.RIGHT);
            editor.applyChanges();
          },
        },
        {
          name: `Unpin`,
          disabled: !column?.isPinned(),
          action: () => {
            columnConfiguration?.setPinned(undefined);
            editor.applyChanges();
          },
        },
        'separator',
        {
          name: `Remove All Pinnings`,
          disabled: editor.columnProperties.columns.every(
            (col) => col.pinned === undefined,
          ),
          action: () => {
            editor.columnProperties.columns.forEach((col) =>
              col.setPinned(undefined),
            );
            editor.applyChanges();
          },
        },
      ],
    },
    {
      name: 'Hide',
      menuItem: WIP_GridMenuItem,
      cssClasses: ['!opacity-100'],
      disabled: true,
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
  return result;
}
