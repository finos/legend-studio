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
import { useEffect } from 'react';
import { useREPLStore } from '../../REPLStoreProvider.js';

// NOTE: This is a workaround to prevent ag-grid license key check from flooding the console screen
// with its stack trace in Chrome.
// We MUST NEVER completely surpress this warning, else it's a violation of the ag-grid license
const __INTERNAL__original_console_error = console.error; // eslint-disable-line no-console
// eslint-disable-next-line no-process-env
if (process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line no-console
  console.error = (message?: unknown, ...optionalParams: unknown[]): void => {
    console.log(message); // eslint-disable-line no-console
  };
}

export const DataCubeGrid = observer(() => {
  const replStore = useREPLStore();
  const dataCubeState = replStore.dataCubeState;

  useEffect(() => {
    if (dataCubeState.grid.clientLicenseKey) {
      LicenseManager.setLicenseKey(dataCubeState.grid.clientLicenseKey);
    }
  }, [dataCubeState.grid.clientLicenseKey]);

  return (
    <>
      <AgGridReact
        rowGroupPanelShow="always"
        alwaysMultiSort={true}
        suppressBrowserResizeObserver={true}
        suppressScrollOnNewData={true}
        rowModelType="serverSide"
        serverSideDatasource={dataCubeState.grid.clientDataSource}
        suppressAggFuncInHeader={true}
        // TODO: @akphi - once we do pagination, we can remove reliance on this flag
        // Otherwise if we remove this flag now, when data is more than one page or 100 rows
        // it keeps making call to backend to fetch more data as ag-grid updates it’s request
        // for start row and end row. This would show incorrect data as you scroll since the
        // to the backend does not account for pagination.
        suppressServerSideInfiniteScroll={true}
        rowHeight={20}
        headerHeight={24}
        modules={[
          // community
          ClientSideRowModelModule,
          // enterprise
          ServerSideRowModelModule,
          RowGroupingModule,
          MenuModule,
        ]}
        onGridReady={(params): void => {
          dataCubeState.grid.configureClient(params.api);
          // eslint-disable-next-line no-process-env
          if (process.env.NODE_ENV === 'development') {
            console.error = __INTERNAL__original_console_error; // eslint-disable-line no-console
          }
        }}
        className="ag-theme-balham data-cube-grid"
      />
    </>
  );
});
