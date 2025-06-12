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
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import {
  DataGrid,
  type DataGridRowClickedEvent,
} from '@finos/legend-lego/data-grid';
import { Box } from '@mui/material';
import { type V1_DataContract } from '@finos/legend-graph';
import type { LakehouseAdminStore } from '../../../stores/lakehouse/admin/LakehouseAdminStore.js';
import { useState } from 'react';
import { EntitlementsDataContractViewer } from '../entitlements/EntitlementsDataContractViewer.js';
import { EntitlementsDataContractViewerState } from '../../../stores/lakehouse/entitlements/EntitlementsDataContractViewerState.js';

export const LakehouseAdminContractsDashboard = observer(
  (props: { adminStore: LakehouseAdminStore }) => {
    const { adminStore } = props;

    const contracts = adminStore.contracts;

    const [selectedContract, setSelectedContract] = useState<
      V1_DataContract | undefined
    >();

    const handleRowClicked = (
      event: DataGridRowClickedEvent<V1_DataContract>,
    ) => {
      setSelectedContract(event.data);
    };

    return (
      <>
        <CubesLoadingIndicator
          isLoading={Boolean(
            adminStore.contractsInitializationState.isInProgress,
          )}
        >
          <CubesLoadingIndicatorIcon />
        </CubesLoadingIndicator>
        <Box className="marketplace-lakehouse-admin__contracts__grid ag-theme-balham">
          <DataGrid
            rowData={contracts}
            onRowDataUpdated={(params) => {
              params.api.refreshCells({ force: true });
            }}
            suppressFieldDotNotation={true}
            suppressContextMenu={false}
            onRowClicked={handleRowClicked}
            columnDefs={[
              {
                minWidth: 50,
                sortable: true,
                resizable: true,
                headerName: 'Contract Id',
                valueGetter: (p) => p.data?.guid,
                flex: 2,
              },
              {
                minWidth: 50,
                sortable: true,
                resizable: true,
                headerName: 'Contract Description',
                valueGetter: (p) => p.data?.description,
                flex: 2,
              },
              {
                minWidth: 10,
                sortable: true,
                resizable: true,
                headerName: 'Version',
                valueGetter: (p) => p.data?.version,
                flex: 1,
              },
              {
                minWidth: 50,
                sortable: true,
                resizable: true,
                headerName: 'State',
                valueGetter: (p) => p.data?.state,
                flex: 2,
              },
              {
                minWidth: 50,
                sortable: true,
                resizable: true,
                headerName: 'Members',
                valueGetter: (p) => p.data?.members.map((m) => m.user),
                flex: 1,
              },
              {
                minWidth: 50,
                sortable: true,
                resizable: true,
                headerName: 'Created By',
                valueGetter: (p) => p.data?.createdBy,
                flex: 1,
              },
            ]}
          />
        </Box>
        {selectedContract !== undefined && (
          <EntitlementsDataContractViewer
            open={true}
            currentViewer={
              new EntitlementsDataContractViewerState(
                selectedContract,
                adminStore.lakehouseServerClient,
              )
            }
            onClose={() => setSelectedContract(undefined)}
          />
        )}
      </>
    );
  },
);
