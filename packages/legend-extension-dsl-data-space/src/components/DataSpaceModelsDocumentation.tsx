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
import type { ICellRendererParams } from '@ag-grid-community/core';
import {
  DataSpaceAssociationDocumentationEntry,
  DataSpaceBasicDocumentationEntry,
  DataSpaceClassDocumentationEntry,
  DataSpaceEnumerationDocumentationEntry,
  DataSpaceModelDocumentationEntry,
  DataSpacePropertyDocumentationEntry,
  type NormalizedDataSpaceDocumentationEntry,
} from '../graphManager/action/analytics/DataSpaceAnalysis.js';

const MIN_NUMBER_OF_ROWS_FOR_AUTO_HEIGHT = 20;

const ElementContentCellRenderer = (
  params: ICellRendererParams<NormalizedDataSpaceDocumentationEntry>,
): React.ReactNode => {
  const data = params.data;
  if (!data) {
    return null;
  } else if (data.elementEntry instanceof DataSpaceClassDocumentationEntry) {
    return <>{`C ${data.elementEntry.name}`}</>;
  } else if (
    data.elementEntry instanceof DataSpaceEnumerationDocumentationEntry
  ) {
    return <>{`E ${data.elementEntry.name}`}</>;
  } else if (
    data.elementEntry instanceof DataSpaceAssociationDocumentationEntry
  ) {
    return <>{`A ${data.elementEntry.name}`}</>;
  }
  return null;
};

const SubElementDocContentCellRenderer = (
  params: ICellRendererParams<NormalizedDataSpaceDocumentationEntry>,
): React.ReactNode => {
  const data = params.data;
  if (!data) {
    return null;
  } else if (data.entry instanceof DataSpaceModelDocumentationEntry) {
    return null;
  } else if (data.entry instanceof DataSpacePropertyDocumentationEntry) {
    return <>{`p ${data.text}`}</>;
  } else if (data.entry instanceof DataSpaceBasicDocumentationEntry) {
    return <>{`e ${data.text}`}</>;
  }
  return null;
};

const ElementDocumentationCellRenderer = (
  params: ICellRendererParams<NormalizedDataSpaceDocumentationEntry>,
): React.ReactNode => {
  const data = params.data;
  if (!data) {
    return null;
  }
  return data.documentation.trim() ? (
    data.documentation
  ) : (
    <div className="data-space__viewer__grid__empty-cell">
      No documentation provided
    </div>
  );
};

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
                  // highlight element row
                  getRowClass={(params) =>
                    params.data?.entry instanceof
                    DataSpaceModelDocumentationEntry
                      ? 'data-space__viewer__models-documentation__grid__element-row'
                      : undefined
                  }
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
                      cellRenderer: ElementContentCellRenderer,
                      headerName: 'Model',
                      flex: 1,
                    },
                    {
                      minWidth: 50,
                      sortable: false,
                      resizable: true,
                      cellRenderer: SubElementDocContentCellRenderer,
                      headerName: '',
                      flex: 1,
                    },
                    {
                      minWidth: 50,
                      sortable: false,
                      resizable: false,
                      headerClass:
                        'data-space__viewer__grid__last-column-header',
                      cellRenderer: ElementDocumentationCellRenderer,
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
