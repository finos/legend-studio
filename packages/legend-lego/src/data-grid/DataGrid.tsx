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

import { AllCommunityModule } from 'ag-grid-community';
import { LicenseManager, AllEnterpriseModule } from 'ag-grid-enterprise';
import { AgGridReact, type AgGridReactProps } from 'ag-grid-react';

// Re-export AG Grid types with project-specific aliases.
// NOTE: eslint no-duplicate-imports warns because `ag-grid-community` and
// `ag-grid-react` also appear in the value imports above.  This is unavoidable
// when a module provides both values (AllCommunityModule) and types (ColDef etc).
// eslint-disable-next-line no-duplicate-imports
export type {
  CellClickedEvent as DataGridCellClickedEvent,
  CellKeyDownEvent as DataGridCellKeyDownEvent,
  CellMouseOverEvent as DataGridCellMouseOverEvent,
  CellRange as DataGridCellRange,
  CellSelectionChangedEvent as DataGridCellSelectionChangedEvent,
  ColDef as DataGridColumnDefinition,
  Column as DataGridColumn,
  ColumnState as DataGridColumnState,
  DefaultMenuItem as DataGridDefaultMenuItem,
  FirstDataRenderedEvent as DataGridFirstDataRenderedEvent,
  GetContextMenuItemsParams as DataGridGetContextMenuItemsParams,
  GridApi as DataGridApi,
  GridOptions as DataGridOptions,
  IAggFuncParams as DataGridIAggFuncParams,
  ICellRendererParams as DataGridCellRendererParams,
  IRowNode as DataGridIRowNode,
  IServerSideDatasource as DataGridServerSideDatasource,
  IServerSideGetRowsParams as DataGridServerSideGetRowsParams,
  MenuItemDef as DataGridMenuItemDef,
  RowClickedEvent as DataGridRowClickedEvent,
  RowSelectedEvent as DataGridRowSelectedEvent,
  RowSelectionOptions as DataGridRowSelectionOptions,
} from 'ag-grid-community';

// eslint-disable-next-line no-duplicate-imports
export type { CustomHeaderProps as DataGridCustomHeaderProps } from 'ag-grid-react';

declare const AG_GRID_LICENSE: string;

// NOTE: This is a workaround to prevent ag-grid license key check from flooding the console screen
// with its stack trace in Chrome.
// We MUST NEVER completely surpress this warning in production, else it's a violation of the ag-grid license!
// See https://www.ag-grid.com/react-data-grid/licensing/
const __INTERNAL__original_console_error = console.error; // eslint-disable-line no-console

export function DataGrid<TData = unknown>(
  props: AgGridReactProps<TData>,
): React.ReactNode {
  if (AG_GRID_LICENSE) {
    LicenseManager.setLicenseKey(AG_GRID_LICENSE);
  }

  // eslint-disable-next-line no-process-env
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.error = (message?: unknown, ...agrs: unknown[]) => {
      console.debug(`%c ${message}`, 'color: silver'); // eslint-disable-line no-console
    };
  }

  return (
    <AgGridReact
      theme="legacy"
      {...props}
      // NOTE: for test, we don't want to handle the error messages outputed by ag-grid so
      // we disable enterprise features for now
      modules={[AllCommunityModule, AllEnterpriseModule]}
      onGridReady={(params) => {
        props.onGridReady?.(params);
        // eslint-disable-next-line no-process-env
        if (process.env.NODE_ENV !== 'production') {
          // restore original error logging
          console.error = __INTERNAL__original_console_error; // eslint-disable-line no-console
        }
      }}
    />
  );
}
