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
import { LicenseManager } from '@ag-grid-enterprise/core';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { ServerSideRowModelModule } from '@ag-grid-enterprise/server-side-row-model';
import { RowGroupingModule } from '@ag-grid-enterprise/row-grouping';
import { MenuModule } from '@ag-grid-enterprise/menu';
import { AgGridReact } from '@ag-grid-community/react';
import { useEffect, useState } from 'react';
import { useREPLStore } from '../../REPLStoreProvider.js';
import { DataCubeIcon, Switch, cn } from '@finos/legend-art';
import {
  INTERNAL__GRID_CLIENT_HEADER_HEIGHT,
  INTERNAL__GRID_CLIENT_ROW_BUFFER,
  INTERNAL__GRID_CLIENT_ROW_HEIGHT,
} from '../../../stores/dataCube/grid/DataCubeGridClientEngine.js';
import { ModuleRegistry } from '@ag-grid-community/core';
import { CsvExportModule } from '@ag-grid-community/csv-export';
import { ExcelExportModule } from '@ag-grid-enterprise/excel-export';

// NOTE: This is a workaround to prevent ag-grid license key check from flooding the console screen
// with its stack trace in Chrome.
// We MUST NEVER completely surpress this warning in production, else it's a violation of the ag-grid license!
// See https://www.ag-grid.com/javascript-data-grid/licensing/
const __INTERNAL__original_console_error = console.error; // eslint-disable-line no-console
// eslint-disable-next-line no-console
console.error = (message?: unknown, ...agrs: unknown[]): void => {
  console.log(`%c ${message}`, 'color: silver'); // eslint-disable-line no-console
};

ModuleRegistry.registerModules([CsvExportModule, ExcelExportModule]);

export const DataCubeGrid = observer(() => {
  const replStore = useREPLStore();
  const dataCubeState = replStore.dataCubeState;
  const grid = dataCubeState.grid;

  const [scrollHintText, setScrollHintText] = useState('');

  useEffect(() => {
    if (grid.clientLicenseKey) {
      LicenseManager.setLicenseKey(grid.clientLicenseKey);
    }
  }, [grid.clientLicenseKey]);

  return (
    <div className="data-cube-grid flex-1">
      <div className="h-[calc(100%_-_20px)] w-full">
        <AgGridReact
          className="ag-theme-balham"
          modules={[
            // community
            ClientSideRowModelModule,
            // enterprise
            ServerSideRowModelModule,
            RowGroupingModule,
            MenuModule,
          ]}
          onGridReady={(params): void => {
            grid.configureClient(params.api);
            // restore original error logging
            console.error = __INTERNAL__original_console_error; // eslint-disable-line no-console
          }}
          // -------------------------------------- ROW GROUPING --------------------------------------
          rowGroupPanelShow="always"
          suppressScrollOnNewData={true}
          groupDisplayType="custom" // keeps the column set stable even when row grouping is used
          suppressRowGroupHidesColumns={true} // keeps the column set stable even when row grouping is used
          // -------------------------------------- PIVOT --------------------------------------
          // pivotPanelShow="always"
          // pivotMode={true}
          // -------------------------------------- SERVER SIDE ROW MODEL --------------------------------------
          rowModelType="serverSide"
          serverSideDatasource={grid.clientDataSource}
          // -------------------------------------- GENERIC --------------------------------------
          suppressBrowserResizeObserver={true}
          animateRows={false} // improve performance
          // NOTE: since we shrink the spacing, more rows can be shown, as such, setting higher row
          // buffer will improve scrolling performance, but compromise initial load and various
          // actions performance
          rowBuffer={INTERNAL__GRID_CLIENT_ROW_BUFFER}
          rowHeight={INTERNAL__GRID_CLIENT_ROW_HEIGHT}
          headerHeight={INTERNAL__GRID_CLIENT_HEADER_HEIGHT}
          // Force multi-sorting since this is what the query supports anyway
          alwaysMultiSort={true}
          // Keeps the columns stable even when aggregation is used
          suppressAggFuncInHeader={true}
          // Show cursor position when scrolling
          onBodyScroll={(event) => {
            const rowCount = event.api.getDisplayedRowCount();
            const range = event.api.getVerticalPixelRange();
            const start = Math.max(
              1,
              Math.ceil(range.top / INTERNAL__GRID_CLIENT_ROW_HEIGHT) + 1,
            );
            const end = Math.min(
              rowCount,
              Math.floor(range.bottom / INTERNAL__GRID_CLIENT_ROW_HEIGHT),
            );
            setScrollHintText(`${start}-${end}/${rowCount}`);
          }}
          onBodyScrollEnd={() => setScrollHintText('')}
        />
      </div>
      <div className="relative flex h-5 w-full justify-between border-b border-b-neutral-200 bg-neutral-100">
        {Boolean(scrollHintText) && (
          <div className="absolute -top-8 right-4 flex items-center rounded-sm border border-neutral-300 bg-neutral-100 p-1 pr-2 text-neutral-500 shadow-sm">
            <DataCubeIcon.TableScroll className="text-lg" />
            <div className="ml-1 font-mono text-sm">{scrollHintText}</div>
          </div>
        )}
        <div />
        <div className="flex items-center">
          <div className="select-none p-2 font-mono text-sm text-neutral-500">
            {grid.clientDataSource.rowCount
              ? `(${grid.clientDataSource.rowCount} rows)`
              : ''}
          </div>
          <div className="h-3 w-[1px] bg-neutral-200" />
          <button
            className="flex h-full items-center p-2"
            onClick={(): void =>
              grid.setPaginationEnabled(!grid.isPaginationEnabled)
            }
          >
            <Switch
              checked={grid.isPaginationEnabled}
              classes={{
                root: 'p-0 w-6 h-5 flex items-center',
                input: 'w-2',
                checked: '!translate-x-2 ease-in-out duration-100 transition',
                thumb: cn('w-2 h-2', {
                  'bg-sky-600': grid.isPaginationEnabled,
                  'bg-neutral-500': !grid.isPaginationEnabled,
                }),
                switchBase:
                  'p-0.5 mt-1 translate-x-0 ease-in-out duration-100 transition',
                track: cn('h-3 w-5 border', {
                  '!bg-sky-100 border-sky-600': grid.isPaginationEnabled,
                  '!bg-neutral-100 border-neutral-500':
                    !grid.isPaginationEnabled,
                }),
              }}
              disableRipple={true}
              disableFocusRipple={true}
            />
            <div
              className={cn('text-sm', {
                'text-sky-600': grid.isPaginationEnabled,
                'text-neutral-500': !grid.isPaginationEnabled,
              })}
            >
              Pagination
            </div>
          </button>
        </div>
      </div>
    </div>
  );
});
