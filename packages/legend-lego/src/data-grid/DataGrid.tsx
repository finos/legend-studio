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
  AgGridReact,
  type AgReactUiProps,
  type AgGridReactProps,
} from '@ag-grid-community/react';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import {
  type CellMouseOverEvent,
  type ICellRendererParams,
  ModuleRegistry,
} from '@ag-grid-community/core';

export function DataGrid<TData = unknown>(
  props: AgGridReactProps<TData> | AgReactUiProps<TData>,
): JSX.Element {
  return (
    <AgGridReact
      // Temporarily disable usage the browser's ResizeObserver as sometimes, this causes the error
      // `ResizeObserver loop limit exceeded` when we zoom in too much, in our cases, the problem
      // seem to arise when the scrollbar visibility changes as row data is being supplied
      // one way to resolve this problem is to set `alwaysShowVerticalScroll={true}`
      // See https://github.com/ag-grid/ag-grid/issues/2588
      suppressBrowserResizeObserver={true}
      {...props}
      modules={[ClientSideRowModelModule]}
    />
  );
}

export const configureDataGridComponent = (): void => {
  ModuleRegistry.registerModules([ClientSideRowModelModule]);
};

export type {
  CellMouseOverEvent as DataGridCellMouseOverEvent,
  ICellRendererParams as DataGridCellRendererParams,
};
