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

import { AgGridReact, type AgGridReactProps } from '@ag-grid-community/react';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { CsvExportModule } from '@ag-grid-community/csv-export';
import { ClipboardModule } from '@ag-grid-enterprise/clipboard';
import { ColumnsToolPanelModule } from '@ag-grid-enterprise/column-tool-panel';
import { ExcelExportModule } from '@ag-grid-enterprise/excel-export';
import { FiltersToolPanelModule } from '@ag-grid-enterprise/filter-tool-panel';
import { MenuModule } from '@ag-grid-enterprise/menu';
import { RangeSelectionModule } from '@ag-grid-enterprise/range-selection';
import { RowGroupingModule } from '@ag-grid-enterprise/row-grouping';
import { ServerSideRowModelModule } from '@ag-grid-enterprise/server-side-row-model';
import { SideBarModule } from '@ag-grid-enterprise/side-bar';
import { StatusBarModule } from '@ag-grid-enterprise/status-bar';
import {
  type CellRange,
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
  ModuleRegistry,
} from '@ag-grid-community/core';
import { LicenseManager } from '@ag-grid-enterprise/core';

export const communityModules = [ClientSideRowModelModule, CsvExportModule];

export const enterpriseModules = [
  ClipboardModule,
  ColumnsToolPanelModule,
  ExcelExportModule,
  FiltersToolPanelModule,
  MenuModule,
  RangeSelectionModule,
  RowGroupingModule,
  ServerSideRowModelModule,
  SideBarModule,
  StatusBarModule,
];

export const allModules = communityModules.concat(enterpriseModules);

declare const AG_GRID_LICENSE: string;

export function DataGrid<TData = unknown>(
  props: AgGridReactProps<TData>,
): JSX.Element {
  if (AG_GRID_LICENSE) {
    LicenseManager.setLicenseKey(AG_GRID_LICENSE);
  }
  return (
    <AgGridReact
      // Temporarily disable usage the browser's ResizeObserver as sometimes, this causes the error
      // `ResizeObserver loop limit exceeded` when we zoom in too much, in our cases, the problem
      // seem to arise when the scrollbar visibility changes as row data is being supplied
      // one way to resolve this problem is to set `alwaysShowVerticalScroll={true}`
      // See https://github.com/ag-grid/ag-grid/issues/2588
      suppressBrowserResizeObserver={true}
      {...props}
      // NOTE: for test, we don't want to handle the error messages outputed by ag-grid so
      // we disable enterprise features for now
      // eslint-disable-next-line no-process-env
      modules={process.env.NODE_ENV === 'test' ? communityModules : allModules}
    />
  );
}

export const configureDataGridComponent = (): void => {
  ModuleRegistry.registerModules([ClientSideRowModelModule]);
};

export type {
  CellRange as DataGridCellRange,
  CellMouseOverEvent as DataGridCellMouseOverEvent,
  ICellRendererParams as DataGridCellRendererParams,
  GridOptions as DataGridOptions,
  ColDef as DataGridColumnDefinition,
  ColumnState as DataGridColumnState,
  GridApi as DataGridApi,
  IRowNode as DataGridIRowNode,
  GetContextMenuItemsParams as DataGridGetContextMenuItemsParams,
  MenuItemDef as DataGridMenuItemDef,
  IAggFuncParams as DataGridIAggFuncParams,
};
