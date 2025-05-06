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
import { useAuth } from 'react-oidc-context';
import { useEffect, useState } from 'react';
import {
  clsx,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import { DataGrid } from '@finos/legend-lego/data-grid';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
  type SelectChangeEvent,
} from '@mui/material';
import { LakehouseMarketplaceHeader } from '../LakehouseHeader.js';
import {
  type V1_DataSubscriptionTarget,
  V1_DataSubscriptionTargetType,
  V1_SnowflakeNetwork,
  V1_SnowflakeRegion,
  V1_SnowflakeTarget,
} from '@finos/legend-graph';
import {
  useLakehouseSubscriptionsStore,
  withLakehouseSubscriptionsStore,
} from './LakehouseSubscriptionsStoreProvider.js';
import { assertErrorThrown } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import type { LakehouseSubscriptionsStore } from '../../../stores/lakehouse/subscriptions/LakehouseSubscriptionsStore.js';

export const LakehouseSubscriptionsCreateDialog = (props: {
  open: boolean;
  onClose: () => void;
  onSubmit: (
    contractId: string,
    target: V1_DataSubscriptionTarget,
  ) => Promise<void>;
}) => {
  const { open, onClose, onSubmit } = props;

  const [contractId, setContractId] = useState<string>('');
  const [targetType] = useState<V1_DataSubscriptionTargetType>(
    V1_DataSubscriptionTargetType.Snowflake,
  );
  const [snowflakeAccountId, setSnowflakeAccountId] = useState<string>('');
  const [snowflakeRegion, setSnowflakeRegion] = useState<V1_SnowflakeRegion>(
    V1_SnowflakeRegion.AWS_US_EAST_1,
  );
  const [snowflakeNetwork] = useState<V1_SnowflakeNetwork>(
    V1_SnowflakeNetwork.GOLDMAN,
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          component: 'form',
          onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (targetType === V1_DataSubscriptionTargetType.Snowflake) {
              const snowflakeTarget = new V1_SnowflakeTarget();
              snowflakeTarget.snowflakeAccountId = snowflakeAccountId;
              snowflakeTarget.snowflakeRegion = snowflakeRegion;
              snowflakeTarget.snowflakeNetwork = snowflakeNetwork;
              // eslint-disable-next-line no-void
              void onSubmit(contractId, snowflakeTarget);
              onClose();
            } else {
              onClose();
              throw new Error(`Unsupported target type: ${targetType}`);
            }
          },
        },
      }}
    >
      <DialogTitle>Create New Subscription</DialogTitle>
      <DialogContent>
        <TextField
          required={true}
          margin="dense"
          id="contractId"
          name="contractId"
          label="Contract ID"
          fullWidth={true}
          variant="outlined"
          value={contractId}
          onChange={(event) => setContractId(event.target.value)}
        />
        <FormControl fullWidth={true} margin="dense">
          <InputLabel id="target-type-select-label">Target Type</InputLabel>
          <Select
            required={true}
            labelId="target-type-select-label"
            id="target-type-select"
            value={targetType}
            label="Target Type"
            disabled={true}
          >
            {Object.values(V1_DataSubscriptionTargetType).map((_targetType) => (
              <MenuItem key={_targetType} value={_targetType}>
                {_targetType}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          required={true}
          margin="dense"
          id="snowflakeAccountId"
          name="snowflakeAccountId"
          label="Snowflake Account ID"
          fullWidth={true}
          variant="outlined"
          value={snowflakeAccountId}
          onChange={(event) => setSnowflakeAccountId(event.target.value)}
        />
        <FormControl fullWidth={true} margin="dense">
          <InputLabel id="snowflake-region-select-label">
            Snowflake Region
          </InputLabel>
          <Select
            required={true}
            labelId="snowflake-region-select-label"
            id="snowflake-region-select"
            value={snowflakeRegion}
            label="Snowflake Region"
            onChange={(event: SelectChangeEvent<V1_SnowflakeRegion>) => {
              setSnowflakeRegion(event.target.value as V1_SnowflakeRegion);
            }}
          >
            {Object.values(V1_SnowflakeRegion).map((region) => (
              <MenuItem key={region} value={region}>
                {region}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth={true} margin="dense">
          <InputLabel id="snowflake-network-select-label">
            Snowflake Network
          </InputLabel>
          <Select
            required={true}
            labelId="snowflake-network-select-label"
            id="snowflake-network-select"
            value={snowflakeNetwork}
            label="Snowflake Network"
            disabled={true}
          >
            {Object.values(V1_SnowflakeNetwork).map((_snowflakeNetwork) => (
              <MenuItem key={_snowflakeNetwork} value={_snowflakeNetwork}>
                {_snowflakeNetwork}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button type="submit" variant="contained">
          Create Subsciption
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const LakehouseSubscriptionsMainView = observer(
  (props: { subscriptionsStore: LakehouseSubscriptionsStore }) => {
    const { subscriptionsStore } = props;
    const auth = useAuth();

    const [isCreateDialogOpen, setIsCreateDialogOpen] =
      useState<boolean>(false);

    const subscriptions = subscriptionsStore.subscriptions;

    const createDialogHandleSubmit = async (
      contractId: string,
      target: V1_DataSubscriptionTarget,
    ): Promise<void> => {
      try {
        const createdSubscription = await subscriptionsStore.createSubscription(
          contractId,
          target,
          auth.user?.access_token,
        );
        subscriptionsStore.applicationStore.notificationService.notifySuccess(
          `Created subscription ${createdSubscription.guid}`,
        );
        flowResult(subscriptionsStore.init(auth.user?.access_token)).catch(
          subscriptionsStore.applicationStore.alertUnhandledError,
        );
      } catch (error) {
        assertErrorThrown(error);
        subscriptionsStore.applicationStore.alertUnhandledError(error);
      }
    };

    return (
      <>
        <Box className="subscriptions">
          <Box className="subscriptions__header">
            <Typography variant="h4">ALL SUBSCRIPTIONS</Typography>
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              variant="contained"
            >
              Create New Subscription
            </Button>
          </Box>
          <div
            className={clsx('subscriptions__grid', {
              'ag-theme-balham': true,
            })}
          >
            <DataGrid
              rowData={subscriptions}
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
                  headerName: 'Subscription Id',
                  valueGetter: (p) => p.data?.guid,
                  flex: 1,
                },
                {
                  minWidth: 50,
                  sortable: true,
                  resizable: true,
                  headerName: 'Contract ID',
                  valueGetter: (p) => p.data?.dataContractId,
                  flex: 1,
                },
                {
                  minWidth: 50,
                  sortable: true,
                  resizable: true,
                  headerName: 'Target Type',
                  valueGetter: (p) =>
                    p.data?.target instanceof V1_SnowflakeTarget
                      ? 'Snowflake'
                      : 'Unknown',
                  flex: 1,
                },
                {
                  minWidth: 50,
                  sortable: true,
                  resizable: true,
                  headerName: 'Snowflake Account ID',
                  valueGetter: (p) =>
                    p.data?.target instanceof V1_SnowflakeTarget
                      ? p.data.target.snowflakeAccountId
                      : 'Unknown',
                  flex: 1,
                },
                {
                  minWidth: 50,
                  sortable: true,
                  resizable: true,
                  headerName: 'Snowflake Region',
                  valueGetter: (p) =>
                    p.data?.target instanceof V1_SnowflakeTarget
                      ? p.data.target.snowflakeRegion
                      : 'Unknown',
                  flex: 1,
                },
                {
                  minWidth: 50,
                  sortable: true,
                  resizable: true,
                  headerName: 'Snowflake Network',
                  valueGetter: (p) =>
                    p.data?.target instanceof V1_SnowflakeTarget
                      ? p.data.target.snowflakeNetwork
                      : 'Unknown',
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
          </div>
        </Box>
        <LakehouseSubscriptionsCreateDialog
          open={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onSubmit={createDialogHandleSubmit}
        />
      </>
    );
  },
);

export const LakehouseSubscriptions = withLakehouseSubscriptionsStore(
  observer(() => {
    const subscriptionsStore = useLakehouseSubscriptionsStore();
    const auth = useAuth();

    useEffect(() => {
      subscriptionsStore.init(auth.user?.access_token);
    }, [auth.user?.access_token, subscriptionsStore]);

    return (
      <div className="app__page">
        <div className="legend-marketplace-home">
          <div className="legend-marketplace-data-product-home__body">
            <LakehouseMarketplaceHeader />
            <div className="legend-marketplace-home__content">
              <div className="legend-marketplace-data-product__content">
                <CubesLoadingIndicator
                  isLoading={Boolean(
                    subscriptionsStore.initializationState.isInProgress,
                  )}
                >
                  <CubesLoadingIndicatorIcon />
                </CubesLoadingIndicator>
                <LakehouseSubscriptionsMainView
                  subscriptionsStore={subscriptionsStore}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }),
);
