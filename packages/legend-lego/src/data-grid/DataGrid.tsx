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
  type CellRange,
  type CellSelectionChangedEvent,
  type CellMouseOverEvent,
  type ICellRendererParams,
  type GridOptions,
  type ColDef,
  type ColumnState,
  type GridApi,
  type IRowNode,
  type GetContextMenuItemsParams,
  type MenuItemDef,
  type IAggFuncParams,
  type DefaultMenuItem,
  type Module,
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
  CellRange as DataGridCellRange,
  CellMouseOverEvent as DataGridCellMouseOverEvent,
  CellSelectionChangedEvent as DataGridCellSelectionChangedEvent,
  ICellRendererParams as DataGridCellRendererParams,
  GridOptions as DataGridOptions,
  ColDef as DataGridColumnDefinition,
  ColumnState as DataGridColumnState,
  GridApi as DataGridApi,
  IRowNode as DataGridIRowNode,
  GetContextMenuItemsParams as DataGridGetContextMenuItemsParams,
  MenuItemDef as DataGridMenuItemDef,
  IAggFuncParams as DataGridIAggFuncParams,
  CustomHeaderProps as DataGridCustomHeaderProps,
  DefaultMenuItem as DataGridDefaultMenuItem,
};
