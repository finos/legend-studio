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
import { AnchorLinkIcon, SearchIcon, clsx } from '@finos/legend-art';
import { type DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';
import { AgGridReact } from '@ag-grid-community/react';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { DataSpaceWikiPlaceholder } from './DataSpacePlaceholder.js';

const MIN_NUMBER_OF_ROWS_FOR_AUTO_HEIGHT = 20;

export const DataSpaceModelsDocumentation = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const documentationEntries =
      dataSpaceViewerState.dataSpaceAnalysisResult.elementDocs;
    const autoHeight =
      documentationEntries.length <= MIN_NUMBER_OF_ROWS_FOR_AUTO_HEIGHT;

    return (
      <div className="data-space__viewer__wiki__section">
        <div className="data-space__viewer__wiki__section__header">
          <div className="data-space__viewer__wiki__section__header__label">
            Models Documentation
            <div className="data-space__viewer__wiki__section__header__anchor">
              <AnchorLinkIcon />
            </div>
          </div>
        </div>
        <div className="data-space__viewer__wiki__section__content">
          {documentationEntries.length > 0 && (
            <div
              className={clsx('data-space__viewer__models-documentation', {
                'data-space__viewer__models-documentation--auto-height':
                  autoHeight,
              })}
            >
              <div className="data-space__viewer__models-documentation__search">
                <div className="data-space__viewer__models-documentation__search__input-group">
                  <input className="data-space__viewer__models-documentation__search__input-group__input input" />
                  <div className="data-space__viewer__models-documentation__search__input-group__icon">
                    <SearchIcon />
                  </div>
                </div>
              </div>
              <div className="data-space__viewer__models-documentation__grid data-space__viewer__grid ag-theme-balham-dark">
                <AgGridReact
                  domLayout={autoHeight ? 'autoHeight' : 'normal'}
                  rowData={documentationEntries}
                  gridOptions={{
                    suppressScrollOnNewData: true,
                    getRowId: (rowData) => rowData.data.uuid,
                  }}
                  modules={[ClientSideRowModelModule]}
                  suppressFieldDotNotation={true}
                  columnDefs={[
                    {
                      minWidth: 50,
                      sortable: true,
                      resizable: true,
                      field: 'elementPath',
                      headerName: 'Model',
                      flex: 1,
                    },
                    {
                      minWidth: 50,
                      sortable: false,
                      resizable: true,
                      field: 'subElementText',
                      headerName: '',
                      flex: 1,
                    },
                    {
                      minWidth: 50,
                      sortable: false,
                      resizable: true,
                      field: 'doc',
                      headerName: 'Documentation',
                      flex: 1,
                      wrapText: true,
                      autoHeight: true,
                    },
                  ]}
                />
              </div>
            </div>
          )}
          {documentationEntries.length === 0 && (
            <DataSpaceWikiPlaceholder message="No documentation provided" />
          )}
        </div>
      </div>
    );
  },
);
