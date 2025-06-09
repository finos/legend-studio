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

import {
  type CellClickedEvent,
  type CellMouseOverEvent,
  type CellRange,
  type CellSelectionChangedEvent,
  type ColDef,
  type ColumnState,
  type DefaultMenuItem,
  type FirstDataRenderedEvent,
  type GetContextMenuItemsParams,
  type GridApi,
  type GridOptions,
  type IAggFuncParams,
  type ICellRendererParams,
  type IRowNode,
  type MenuItemDef,
  type Module,
  type RowClickedEvent,
  type RowSelectedEvent,
  type RowSelectionOptions,
  AllCommunityModule,
} from 'ag-grid-community';
import { LicenseManager, AllEnterpriseModule } from 'ag-grid-enterprise';
import {
  AgGridReact,
  type AgGridReactProps,
  type CustomHeaderProps,
} from 'ag-grid-react';

export const communityModules: Module[] = [AllCommunityModule];
export const enterpriseModules: Module[] = [AllEnterpriseModule];
export const allModules: Module[] = communityModules.concat(enterpriseModules);

declare const AG_GRID_LICENSE: string;

export function DataGrid<TData = unknown>(
  props: AgGridReactProps<TData>,
): React.ReactNode {
  if (AG_GRID_LICENSE) {
    LicenseManager.setLicenseKey(AG_GRID_LICENSE);
  }
  return (
    <AgGridReact
      theme="legacy"
      {...props}
      // NOTE: for test, we don't want to handle the error messages outputed by ag-grid so
      // we disable enterprise features for now
      // eslint-disable-next-line no-process-env
      modules={process.env.NODE_ENV === 'test' ? communityModules : allModules}
    />
  );
}

export type {
  CellClickedEvent as DataGridCellClickedEvent,
  CellMouseOverEvent as DataGridCellMouseOverEvent,
  CellRange as DataGridCellRange,
  CellSelectionChangedEvent as DataGridCellSelectionChangedEvent,
  ColDef as DataGridColumnDefinition,
  ColumnState as DataGridColumnState,
  CustomHeaderProps as DataGridCustomHeaderProps,
  DefaultMenuItem as DataGridDefaultMenuItem,
  FirstDataRenderedEvent as DataGridFirstDataRenderedEvent,
  GetContextMenuItemsParams as DataGridGetContextMenuItemsParams,
  GridApi as DataGridApi,
  GridOptions as DataGridOptions,
  IAggFuncParams as DataGridIAggFuncParams,
  ICellRendererParams as DataGridCellRendererParams,
  IRowNode as DataGridIRowNode,
  MenuItemDef as DataGridMenuItemDef,
  RowClickedEvent as DataGridRowClickedEvent,
  RowSelectedEvent as DataGridRowSelectedEvent,
  RowSelectionOptions as DataGridRowSelectionOptions,
};
