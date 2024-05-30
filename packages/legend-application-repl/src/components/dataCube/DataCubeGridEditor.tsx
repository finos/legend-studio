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
import { AgGridComponent } from '../AgGrid.js';
import { getTDSRowData } from '../../components/grid/GridUtils.js';
import { ServerSideDataSource } from '../../components/grid/ServerSideDataSource.js';
import { PanelLoadingIndicator } from '@finos/legend-art';
import type { REPLGridClientStore } from '../../stores/REPLGridClientStore.js';

export const DataCubeGridEditor = observer(
  (props: { editorStore: REPLGridClientStore }) => {
    const { editorStore } = props;
    const dataCubeState = editorStore.dataCubeState;

    return (
      <>
        <div className="repl__query__label">Result</div>
        <PanelLoadingIndicator
          isLoading={dataCubeState.executeAction.isInProgress}
        />
        {dataCubeState.executeAction.hasCompleted && (
          <AgGridComponent
            onGridReady={(params): void => {
              dataCubeState.configState.setGridApi(params.api);
            }}
            className={
              editorStore.applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
                ? 'ag-theme-balham'
                : 'ag-theme-balham-dark'
            }
            gridOptions={
              dataCubeState.gridState.initialResult
                ? {
                    serverSideDatasource: new ServerSideDataSource(
                      getTDSRowData(
                        dataCubeState.gridState.initialResult.result,
                      ),
                      dataCubeState.gridState.initialResult.builder.columns,
                      editorStore,
                    ),
                    suppressServerSideInfiniteScroll:
                      !dataCubeState.configState.isPaginationEnabled,
                  }
                : {}
            }
            licenseKey={dataCubeState.configState.licenseKey ?? ''}
            rowData={dataCubeState.gridState.rowData}
            columnDefs={dataCubeState.gridState.columnDefs}
          />
        )}
      </>
    );
  },
);
