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
import { ClipboardModule } from '@ag-grid-enterprise/clipboard';
import { MenuModule } from '@ag-grid-enterprise/menu';
import { AgGridReact } from '@ag-grid-community/react';
import { useEffect, useRef, useState } from 'react';
import { useREPLStore } from '../../REPLStoreProvider.js';
import { DataCubeIcon, Switch, cn } from '@finos/legend-art';
import {
  INTERNAL__GRID_CLIENT_HEADER_HEIGHT,
  INTERNAL__GRID_CLIENT_ROW_HEIGHT,
} from '../../../stores/dataCube/grid/DataCubeGridClientEngine.js';
import { RangeSelectionModule } from '@ag-grid-enterprise/range-selection';
import { buildGridMenu } from './menu/DataCubeGridMenu.js';
import {
  DEFAULT_ROW_BACKGROUND_COLOR,
  DEFAULT_ROW_BUFFER,
  DEFAULT_ROW_HIGHLIGHT_BACKGROUND_COLOR,
} from '../../../stores/dataCube/core/DataCubeQueryEngine.js';

// NOTE: This is a workaround to prevent ag-grid license key check from flooding the console screen
// with its stack trace in Chrome.
// We MUST NEVER completely surpress this warning in production, else it's a violation of the ag-grid license!
// See https://www.ag-grid.com/javascript-data-grid/licensing/
const __INTERNAL__original_console_error = console.error; // eslint-disable-line no-console
// eslint-disable-next-line no-console
console.error = (message?: unknown, ...agrs: unknown[]): void => {
  console.log(`%c ${message}`, 'color: silver'); // eslint-disable-line no-console
};

export const DataCubeGrid = observer(() => {
  const replStore = useREPLStore();
  const dataCube = replStore.dataCube;
  const grid = dataCube.grid;
  const gridContainerRef = useRef<HTMLDivElement | null>(null);
  const [scrollHintText, setScrollHintText] = useState('');

  useEffect(() => {
    if (grid.clientLicenseKey) {
      LicenseManager.setLicenseKey(grid.clientLicenseKey);
    }
  }, [grid.clientLicenseKey]);

  useEffect(() => {
    if (gridContainerRef.current) {
      gridContainerRef.current.style.setProperty(
        '--ag-grid-line-color',
        grid.queryConfiguration.gridLineColor,
      );
      gridContainerRef.current.style.setProperty(
        '--ag-row-highlight-color',
        grid.queryConfiguration.alternateRows
          ? grid.queryConfiguration.alternateRowsColor
          : DEFAULT_ROW_BACKGROUND_COLOR,
      );
      gridContainerRef.current.style.setProperty(
        '--ag-odd-row-background-color',
        grid.queryConfiguration.alternateRowsStandardMode &&
          !grid.queryConfiguration.alternateRows
          ? DEFAULT_ROW_HIGHLIGHT_BACKGROUND_COLOR
          : DEFAULT_ROW_BACKGROUND_COLOR,
      );
    }
  }, [grid.queryConfiguration]);

  return (
    <div
      className="data-cube-grid ag-theme-balham flex-1"
      ref={gridContainerRef}
    >
      <div
        className={cn('relative h-[calc(100%_-_20px)] w-full', {
          'data-cube-grid__utility--show-horizontal-grid-lines':
            grid.queryConfiguration.showHorizontalGridLines,
          'data-cube-grid__utility--show-vertical-grid-lines':
            grid.queryConfiguration.showVerticalGridLines,
        })}
      >
        <AgGridReact
          // -------------------------------------- ROW GROUPING --------------------------------------
          rowGroupPanelShow="always"
          suppressScrollOnNewData={true}
          groupDisplayType="custom" // keeps the column set stable even when row grouping is used
          suppressRowGroupHidesColumns={true} // keeps the column set stable even when row grouping is used
          // Keeps the columns stable even when aggregation is used
          suppressAggFuncInHeader={true}
          // -------------------------------------- PIVOT --------------------------------------
          // pivotPanelShow="always"
          // pivotMode={true}
          // -------------------------------------- SORT --------------------------------------
          // Force multi-sorting since this is what the query supports anyway
          alwaysMultiSort={true}
          // -------------------------------------- DISPLAY & INTERACTION --------------------------------------
          {...(grid.queryConfiguration.alternateRows
            ? {
                // NOTE: this feature is fairly heavy in terms of performance because it requires computation
                // per row being renderd on the screen, causing fast scrolls to result in janks and lags due to rows
                // not being rendered in time
                // See https://www.ag-grid.com/javascript-data-grid/row-styles/#refresh-of-styles
                rowClassRules: {
                  'data-cube-grid__utility--highlight-row': (params) =>
                    params.rowIndex %
                      (grid.queryConfiguration.alternateRowsCount * 2) >=
                    grid.queryConfiguration.alternateRowsCount,
                },
              }
            : {})}
          rowHeight={INTERNAL__GRID_CLIENT_ROW_HEIGHT}
          headerHeight={INTERNAL__GRID_CLIENT_HEADER_HEIGHT}
          suppressBrowserResizeObserver={true}
          reactiveCustomComponents={true} // TODO: remove on v32 as this would be default to `true` then
          noRowsOverlayComponent={() => (
            <div className="flex items-center border-[1.5px] border-neutral-300 p-2 font-medium text-neutral-400">
              <div>
                <DataCubeIcon.WarningCircle className="mr-1 stroke-2 text-lg" />
              </div>
              0 rows
            </div>
          )}
          loadingOverlayComponent={() => (
            <div className="flex items-center border-[1.5px] border-neutral-300 p-2 font-medium text-neutral-400">
              <div>
                <DataCubeIcon.Loader className="mr-1 animate-spin stroke-2 text-lg" />
              </div>
              Loading...
            </div>
          )}
          preventDefaultOnContextMenu={true}
          columnMenu="new" // ensure context menu works on header
          getContextMenuItems={buildGridMenu}
          getMainMenuItems={buildGridMenu}
          enableRangeSelection={true}
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
            event.api.hidePopupMenu(); // hide context-menu while scrolling
          }}
          onBodyScrollEnd={() => setScrollHintText('')}
          // -------------------------------------- SERVER SIDE ROW MODEL --------------------------------------
          rowModelType="serverSide"
          serverSideDatasource={grid.clientDataSource}
          // -------------------------------------- PERFORMANCE --------------------------------------
          // NOTE: since we shrink the spacing, more rows can be shown, as such, setting higher row
          // buffer will improve scrolling performance, but compromise initial load and various
          // actions performance
          rowBuffer={DEFAULT_ROW_BUFFER}
          animateRows={false} // improve performance
          suppressColumnMoveAnimation={true} // improve performance
          // -------------------------------------- SETUP --------------------------------------
          modules={[
            // community
            ClientSideRowModelModule,
            // enterprise
            ServerSideRowModelModule,
            RowGroupingModule,
            MenuModule,
            ClipboardModule,
            RangeSelectionModule,
          ]}
          onGridReady={(params): void => {
            grid.configureClient(params.api);
            // restore original error logging
            console.error = __INTERNAL__original_console_error; // eslint-disable-line no-console
          }}
          context={{
            dataCube,
          }}
        />
        {Boolean(scrollHintText) && (
          <div className="absolute bottom-4 right-4 flex items-center rounded-sm border border-neutral-300 bg-neutral-100 p-1 pr-2 text-neutral-500 shadow-sm">
            <DataCubeIcon.TableScroll className="text-lg" />
            <div className="ml-1 font-mono text-sm">{scrollHintText}</div>
          </div>
        )}
      </div>

      <div className="relative flex h-5 w-full select-none justify-between border-b border-neutral-200 bg-neutral-100">
        <div />
        <div className="flex h-full items-center">
          <div className="flex h-full items-center px-2 font-mono text-sm text-neutral-500">
            {grid.clientDataSource.rowCount
              ? `Rows: ${grid.clientDataSource.rowCount}`
              : ''}
          </div>
          {grid.datasourceConfiguration.limit !== undefined &&
            grid.queryConfiguration.showWarningForTruncatedResult && (
              // TODO: if we want to properly warn if the data has been truncated due to row limit,
              // this would require us to fetch n+1 rows when limit=n
              // This is feature is not difficult to implement, but it would be implemented most cleanly
              // when we change the query execution engine to return the total number of rows,
              // so for now, we simply just warn about truncation whenever a limit != -1 is specified
              <>
                <div className="h-3 w-[1px] bg-neutral-200" />
                <div className="flex h-full items-center px-2 text-orange-500">
                  <DataCubeIcon.Warning className="stroke-[3px]" />
                  <div className="ml-1 text-sm font-semibold">{`Results truncated to fit within row limit (${grid.datasourceConfiguration.limit})`}</div>
                </div>
              </>
            )}
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
