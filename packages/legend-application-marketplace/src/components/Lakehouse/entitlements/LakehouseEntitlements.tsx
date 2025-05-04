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
  useLakehouseEntitlementsStore,
  withLakehouseEntitlementsStore,
} from './LakehouseEntitlementsStoreProvider.js';
import { useAuth, withAuth, type AuthContextProps } from 'react-oidc-context';
import { useEffect } from 'react';
import {
  clsx,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import {
  DataGrid,
  type DataGridCellRendererParams,
} from '@finos/legend-lego/data-grid';
import { useParams } from '@finos/legend-application/browser';
import {
  generateLakehouseContractPath,
  generateLakehouseTaskPath,
  LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN,
  type LakehouseEntitlementsTasksParam,
} from '../../../__lib__/LegendMarketplaceNavigation.js';
import { Box, Button, Divider, Grid2, Stack, Typography } from '@mui/material';
import type { ContractUserEventState } from '../../../stores/lakehouse/entitlements/LakehouseEntitlementsStore.js';
import { LakehouseMarketplaceHeader } from '../LakehouseHeader.js';

const TDSColumnApprovalCellRenderer = (
  params: DataGridCellRendererParams<ContractUserEventState>,
): React.ReactNode => {
  const data = params.data;
  if (!data) {
    return null;
  }
  const onApprove = () => {
    //
    // data.approve();
  };
  const onDeny = () => {
    //
    // data.deny();
  };
  return (
    <Stack direction={'row'} spacing={1} justifyContent={'center'}>
      <Button
        variant="contained"
        size="small"
        onClick={onApprove}
        color="success"
      >
        Approve
      </Button>
      <Button color="error" variant="contained" size="small" onClick={onDeny}>
        Deny
      </Button>
    </Stack>
  );
};

const TDSColumnClickableCellRenderer = (
  params: DataGridCellRendererParams<ContractUserEventState>,
): React.ReactNode => {
  const data = params.data;
  if (!data) {
    return null;
  }
  const handleClick = () => {
    data.state.applicationStore.navigationService.navigator.updateCurrentLocation(
      generateLakehouseTaskPath(data.value.taskId),
    );
  };
  return (
    <span
      className="entitlements-tasks__grid-taskid-cell"
      onClick={handleClick}
    >
      {data.value.taskId}
    </span>
  );
};

const TDSColumnContractClickableCellRenderer = (
  params: DataGridCellRendererParams<ContractUserEventState>,
): React.ReactNode => {
  const data = params.data;
  if (!data) {
    return null;
  }
  const handleClick = () => {
    data.state.applicationStore.navigationService.navigator.updateCurrentLocation(
      generateLakehouseContractPath(data.value.dataContractId),
    );
  };
  return (
    <span
      className="entitlements-tasks__grid-taskid-cell"
      onClick={handleClick}
    >
      {data.value.dataContractId}
    </span>
  );
};

export const LakehouseEntitlementsTasks = observer(() => {
  const entitlementsStore = useLakehouseEntitlementsStore();
  const tasks = entitlementsStore.tasks;
  if (tasks === undefined) {
    return null;
  }

  return (
    <Box className="entitlements-tasks">
      <Typography variant="h4" gutterBottom={true}>
        PENDING TASKS
      </Typography>
      <div
        className={clsx('entitlements-tasks__grid data-access-overview__grid', {
          'ag-theme-balham': true,
        })}
      >
        <DataGrid
          rowData={tasks}
          onRowDataUpdated={(params) => {
            params.api.refreshCells({ force: true });
          }}
          suppressFieldDotNotation={true}
          suppressContextMenu={false}
          columnDefs={[
            {
              minWidth: 50,
              sortable: true,
              resizable: true,
              headerName: 'Task Id',
              cellRenderer: TDSColumnClickableCellRenderer,
              flex: 1,
            },
            {
              minWidth: 50,
              sortable: true,
              resizable: true,
              headerName: 'Contract Id',
              cellRenderer: TDSColumnContractClickableCellRenderer,
              flex: 1,
            },
            {
              minWidth: 50,
              sortable: true,
              resizable: true,
              headerName: 'Consumer',
              valueGetter: (p) => p.data?.value.consumer,
              flex: 1,
            },
            {
              minWidth: 50,
              sortable: true,
              resizable: true,
              headerName: 'Status',
              valueGetter: (p) => p.data?.value.status,
              flex: 1,
            },
            {
              minWidth: 50,
              sortable: true,
              resizable: true,
              headerName: 'Approve/Deny',
              flex: 1,
              cellRenderer: TDSColumnApprovalCellRenderer,
            },
          ]}
        />
      </div>
    </Box>
  );
});

const LakehouseEntitlementsContract = observer(() => {
  const entitlementsStore = useLakehouseEntitlementsStore();
  const currentDataContract = entitlementsStore.currentDataContract;
  if (currentDataContract === undefined) {
    return null;
  }

  return (
    <div className="entitlements-tasks">
      <Grid2
        className="entitlements-task__details"
        container={true}
        spacing={1}
      >
        {currentDataContract.taskDetails.map((v) => (
          <>
            <Grid2 container={false} size={4}>
              <Typography variant="body2" fontWeight={'bold'}>
                {v.name}
              </Typography>
            </Grid2>
            <Grid2 container={false} size={8}>
              <Typography variant="body2" fontWeight={'bold'}>
                {v.value}
              </Typography>
            </Grid2>
          </>
        ))}
      </Grid2>
    </div>
  );
});

export const LakehouseEntitlementsTask = withAuth(
  observer((props) => {
    const entitlementsStore = useLakehouseEntitlementsStore();
    const currentTask = entitlementsStore.currentTask;
    if (currentTask === undefined) {
      return null;
    }
    const auth = (props as { auth: AuthContextProps }).auth;

    const handleApprove = (): void => {
      currentTask.approve(auth.user?.access_token);
    };

    const handleDeny = (): void => {
      currentTask.deny(auth.user?.access_token);
    };

    return (
      <div className="entitlements-task">
        {currentTask.canApprove && (
          <>
            <Stack
              className="entitlements-task__action"
              direction={'row'}
              spacing={1}
            >
              <Button
                variant="contained"
                size="small"
                onClick={handleApprove}
                color="success"
              >
                Approve
              </Button>
              <Button
                color="error"
                variant="contained"
                size="small"
                onClick={handleDeny}
              >
                Deny
              </Button>
            </Stack>
            <Divider />
          </>
        )}
        <Grid2
          className="entitlements-task__details"
          container={true}
          spacing={1}
        >
          {currentTask.taskDetails.map((v) => (
            <>
              <Grid2 container={false} size={4}>
                <Typography variant="body2" fontWeight={'bold'}>
                  {v.name}
                </Typography>
              </Grid2>
              <Grid2 container={false} size={8}>
                <Typography variant="body2" fontWeight={'bold'}>
                  {v.value}
                </Typography>
              </Grid2>
            </>
          ))}
        </Grid2>
      </div>
    );
  }),
);

export const LakehouseEntitlements = withLakehouseEntitlementsStore(
  observer(() => {
    const entitlementsStore = useLakehouseEntitlementsStore();
    const auth = useAuth();
    const params = useParams<LakehouseEntitlementsTasksParam>();

    useEffect(() => {
      entitlementsStore.init(
        params[LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.TASK_ID],
        params[LEGEND_MARKETPLACE_ROUTE_PATTERN_TOKEN.CONTRACT_ID],
        auth.user?.access_token,
      );
    }, [auth.user?.access_token, entitlementsStore, params]);

    return (
      <div className="app__page">
        <div className="legend-marketplace-home">
          <div className="legend-marketplace-data-product-home__body">
            <LakehouseMarketplaceHeader />
            <div className="legend-marketplace-home__content">
              <div className="legend-marketplace-data-product__content">
                <CubesLoadingIndicator
                  isLoading={entitlementsStore.fetchingTasks.isInProgress}
                >
                  <CubesLoadingIndicatorIcon />
                </CubesLoadingIndicator>
                <LakehouseEntitlementsTasks />
                <LakehouseEntitlementsTask />
                <LakehouseEntitlementsContract />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }),
);
