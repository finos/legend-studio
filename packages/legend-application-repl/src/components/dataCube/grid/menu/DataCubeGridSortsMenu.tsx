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

import type { Column, MenuItemDef } from '@ag-grid-community/core';
import type { DataCubeEditorState } from '../../../../stores/dataCube/editor/DataCubeEditorState.js';
import { DataCubeQuerySnapshotSortOperation } from '../../../../stores/dataCube/core/DataCubeQuerySnapshot.js';
import { WIP_GridMenuItem } from '../DataCubeGridShared.js';

export function buildGridSortsMenu(
  editor: DataCubeEditorState,
  column: Column | undefined,
  value: unknown,
): MenuItemDef {
  if (!column) {
    return {
      name: 'Sort',
      disabled: true,
      subMenu: [],
    };
  }

  return {
    name: 'Sort',
    subMenu: [
      {
        name: 'Ascending',
        disabled: !editor.sortsPanel.getActionableSortColumn(
          column.getColId(),
          DataCubeQuerySnapshotSortOperation.ASCENDING,
        ),
        action: () =>
          editor.sortsPanel.sortByColumn(
            column.getColId(),
            DataCubeQuerySnapshotSortOperation.ASCENDING,
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
        disabled: !editor.sortsPanel.getActionableSortColumn(
          column.getColId(),
          DataCubeQuerySnapshotSortOperation.DESCENDING,
        ),
        action: () =>
          editor.sortsPanel.sortByColumn(
            column.getColId(),
            DataCubeQuerySnapshotSortOperation.DESCENDING,
          ),
      },
      {
        name: 'Descending Absolute',
        menuItem: WIP_GridMenuItem,
        cssClasses: ['!opacity-100'],
        disabled: true,
      },
      'separator',
      {
        name: 'Add Ascending',
        disabled: !editor.sortsPanel.getActionableSortColumn(
          column.getColId(),
          DataCubeQuerySnapshotSortOperation.ASCENDING,
        ),
        action: () =>
          editor.sortsPanel.addSortByColumn(
            column.getColId(),
            DataCubeQuerySnapshotSortOperation.ASCENDING,
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
        disabled: !editor.sortsPanel.getActionableSortColumn(
          column.getColId(),
          DataCubeQuerySnapshotSortOperation.DESCENDING,
        ),
        action: () =>
          editor.sortsPanel.addSortByColumn(
            column.getColId(),
            DataCubeQuerySnapshotSortOperation.DESCENDING,
          ),
      },
      {
        name: 'Add Descending Absolute',
        menuItem: WIP_GridMenuItem,
        cssClasses: ['!opacity-100'],
        disabled: true,
      },
      'separator',
      {
        name: 'Clear All Sorts',
        disabled:
          editor.sortsPanel.columnsSelector.selectedColumns.length === 0,
        action: () => editor.sortsPanel.clearAllSorts(),
      },
    ],
  };
}
