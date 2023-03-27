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
import { BlankPanelContent } from '@finos/legend-art';
import { type DataSpaceViewerState } from '../stores/DataSpaceViewerState.js';
import { AgGridReact } from '@ag-grid-community/react';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';

export const DataSpaceModelsDocumentation = observer(
  (props: { dataSpaceViewerState: DataSpaceViewerState }) => {
    const { dataSpaceViewerState } = props;
    const documentationEntries =
      dataSpaceViewerState.dataSpaceAnalysisResult.elementDocs;

    if (documentationEntries.length === 0) {
      return <BlankPanelContent>No documentation available</BlankPanelContent>;
    }

    return (
      <div className="data-space__viewer__panel__content data-space__viewer__overview">
        <AgGridReact
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
            },
          ]}
        />
      </div>
    );
  },
);
