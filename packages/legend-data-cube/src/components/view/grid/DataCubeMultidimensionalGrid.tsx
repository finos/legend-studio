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
import type { DataCubeViewState } from '../../../stores/view/DataCubeViewState.js';
import { DataCubeGridStyleController } from './DataCubeGrid.js';
import { AgGridReact } from 'ag-grid-react';
import { generateDimensionalBaseGridOptions } from '../../../stores/view/grid/DataCubeGridConfigurationBuilder.js';
import { AllCommunityModule } from 'ag-grid-community';
import { AllEnterpriseModule } from 'ag-grid-enterprise';

const __INTERNAL__original_console_error = console.error; // eslint-disable-line no-console

const DataCubeMultidimensionalGridClient = observer(
  (props: { view: DataCubeViewState }) => {
    const { view } = props;
    const grid = view.grid;

    // eslint-disable-next-line no-process-env
    if (process.env.NODE_ENV !== 'production' && !grid.isClientConfigured) {
      // eslint-disable-next-line no-console
      console.error = (message?: unknown) => {
        console.debug(`%c ${message}`, 'color: silver'); // eslint-disable-line no-console
      };
    }

    // We use the client row model to showcase multi-dimensionality;
    // Tree Data cannot be used in this case as the aggregation works on multiple columns
    // https://www.ag-grid.com/javascript-data-grid/row-models/#client-side
    return (
      <div className="relative h-[calc(100%_-_20px)] w-full">
        <AgGridReact
          theme="legacy"
          className="data-cube-grid ag-theme-quartz"
          context={{
            view,
          }}
          columnDefs={[]}
          rowData={[]}
          onCellDoubleClicked={(event) => {
            grid
              .retrieveDrilldownData(event)
              .catch((error) => view.alertService.alertUnhandledError(error));
          }}
          onGridReady={(params) => {
            grid
              .configureDimensionGridClient(params.api)
              .catch((error) => view.alertService.alertUnhandledError(error));
            // eslint-disable-next-line no-process-env
            if (process.env.NODE_ENV !== 'production') {
              // restore original error logging
              console.error = __INTERNAL__original_console_error; // eslint-disable-line no-console
            }
          }}
          modules={[AllCommunityModule, AllEnterpriseModule]}
          {...generateDimensionalBaseGridOptions(view)}
        />
      </div>
    );
  },
);

export const DataCubeMultidimensionalGrid = observer(
  (props: { view: DataCubeViewState }) => {
    const view = props.view;
    const configuration = props.view.grid.configuration;

    return (
      <div className="h-[calc(100%_-_48px)] w-full">
        <DataCubeGridStyleController configuration={configuration} />
        <DataCubeMultidimensionalGridClient view={view} />
      </div>
    );
  },
);
