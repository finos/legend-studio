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
  type SelectChangeEvent,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import {
  type V1_DataSubscription,
  type V1_DataSubscriptionTarget,
  V1_AWSSnowflakeIngestEnvironment,
  V1_DataContract,
  V1_DataSubscriptionTargetType,
  V1_SnowflakeNetwork,
  V1_SnowflakeRegion,
  V1_SnowflakeTarget,
} from '@finos/legend-graph';
import React, { useEffect, useState } from 'react';
import { isNonNullable, isType, LegendUser } from '@finos/legend-shared';
import { getUserById } from '../../../stores/lakehouse/LakehouseUtils.js';
import { useLegendMarketplaceBaseStore } from '../../../application/LegendMarketplaceFrameworkProvider.js';
import { useAuth } from 'react-oidc-context';
import {
  CloseIcon,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  UserDisplay,
} from '@finos/legend-art';
import type { DataProductGroupAccessState } from '../../../stores/lakehouse/DataProductDataAccessState.js';
import {
  DataGrid,
  type DataGridCellRendererParams,
} from '@finos/legend-lego/data-grid';
import type { NavigationService } from '@finos/legend-application';
import { flowResult } from 'mobx';

const UserCellRenderer = (props: {
  userId: string | undefined;
  userDataMap: Map<string, LegendUser | string>;
  navigationService: NavigationService;
  isLoading: boolean;
  userProfileImageUrl?: string | undefined;
  applicationDirectoryUrl?: string | undefined;
}): React.ReactNode => {
  const {
    userId,
    userDataMap,
    navigationService,
    isLoading,
    userProfileImageUrl,
    applicationDirectoryUrl,
  } = props;

  const userData = userId ? userDataMap.get(userId) : undefined;

  if (isLoading) {
    return <CircularProgress size={20} />;
  } else if (userData instanceof LegendUser) {
    const imgSrc = userProfileImageUrl?.replace('{userId}', userData.id);
    const openUserDirectoryLink = (): void =>
      navigationService.navigator.visitAddress(
        `${applicationDirectoryUrl}/${userId}`,
      );

    return (
      <UserDisplay
        user={userData}
        imgSrc={imgSrc}
        onClick={() => openUserDirectoryLink()}
        className="marketplace-lakehouse-subscriptions__subscriptions-viewer__grid__user-display"
      />
    );
  } else if (userData) {
    return <>{userData}</>;
  } else {
    return <>{userId}</>;
  }
};

const LakehouseSubscriptionsCreateDialog = (props: {
  open: boolean;
  onClose: () => void;
  accessGroupState: DataProductGroupAccessState;
  contractId: string;
  onSubmit: (target: V1_DataSubscriptionTarget) => Promise<void>;
}) => {
  const { open, onClose, accessGroupState, contractId, onSubmit } = props;

  const [targetType] = useState<V1_DataSubscriptionTargetType>(
    V1_DataSubscriptionTargetType.Snowflake,
  );
  const [snowflakeAccountId, setSnowflakeAccountId] = useState<string>('');
  const [snowflakeRegion] = useState<V1_SnowflakeRegion>(
    V1_SnowflakeRegion.AWS_US_EAST_1,
  );
  const [snowflakeNetwork] = useState<V1_SnowflakeNetwork>(
    V1_SnowflakeNetwork.GOLDMAN,
  );

  const handleClose = (): void => {
    setSnowflakeAccountId('');
    onClose();
  };

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
              void onSubmit(snowflakeTarget);
              handleClose();
            } else {
              handleClose();
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
          disabled={true}
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
        <FormControl fullWidth={true} margin="dense">
          <InputLabel id="snowflake-account-id-select-label">
            Snowflake Account ID
          </InputLabel>
          <Select
            required={true}
            labelId="snowflake-account-id-select-label"
            id="snowflake-account-id-select"
            value={snowflakeAccountId}
            label="Snowflake Account ID"
            onChange={(event: SelectChangeEvent<string>) => {
              setSnowflakeAccountId(event.target.value);
            }}
            autoFocus={true}
          >
            {Array.from(
              new Set(
                accessGroupState.accessState.viewerState.lakehouseStore.lakehouseIngestEnvironmentDetails
                  .filter((details) =>
                    isType(details, V1_AWSSnowflakeIngestEnvironment),
                  )
                  .map(
                    (ingestEnvironmentDetails) =>
                      ingestEnvironmentDetails.snowflakeAccount,
                  ),
              ),
            ).map((snowflakeAccount) => (
              <MenuItem key={snowflakeAccount} value={snowflakeAccount}>
                {snowflakeAccount}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
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
            disabled={true}
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
        <Button onClick={handleClose} variant="outlined">
          Cancel
        </Button>
        <Button type="submit" variant="contained">
          Create Subsciption
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const DataProductSubscriptionViewer = observer(
  (props: {
    open: boolean;
    accessGroupState: DataProductGroupAccessState;
    onClose: () => void;
  }) => {
    const { open, accessGroupState, onClose } = props;
    const auth = useAuth();
    const legendMarketplaceStore = useLegendMarketplaceBaseStore();
    const [userDataMap, setUserDataMap] = useState<Map<string, LegendUser>>(
      new Map<string, LegendUser>(),
    );
    const [isLoadingUserData, setIsLoadingUserData] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    useEffect(() => {
      const fetchUserData = async (userIds: string[]): Promise<void> => {
        const userSearchService = legendMarketplaceStore.userSearchService;
        if (userSearchService) {
          setIsLoadingUserData(true);
          try {
            const users = (
              await Promise.all(
                userIds.map(async (userId) =>
                  getUserById(userId, userSearchService),
                ),
              )
            ).filter(isNonNullable);
            const userMap = new Map<string, LegendUser>();
            users.forEach((user) => {
              userMap.set(user.id, user);
            });
            setUserDataMap(userMap);
          } finally {
            setIsLoadingUserData(false);
          }
        }
      };
      const userIds: string[] = accessGroupState.subscriptions?.map(
        (subscription) => subscription.createdBy,
      );
      // eslint-disable-next-line no-void
      void fetchUserData(userIds);
    }, [
      accessGroupState.subscriptions,
      legendMarketplaceStore.userSearchService,
    ]);

    const contract = accessGroupState.associatedContract;
    const subscriptions = accessGroupState.subscriptions;
    const isLoading = accessGroupState.fetchingSubscriptionsState.isInProgress;

    if (!(contract instanceof V1_DataContract)) {
      return (
        <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth="md">
          <DialogTitle>Data Product Subscriptions</DialogTitle>
          <IconButton
            onClick={onClose}
            className="marketplace-dialog-close-btn"
          >
            <CloseIcon />
          </IconButton>
          <DialogContent>
            <div>
              Unable to show subscriptions for{' '}
              <span className="marketplace-lakehouse-text__emphasis">
                {accessGroupState.group.id}
              </span>{' '}
              Access Point Group in{' '}
              <span className="marketplace-lakehouse-text__emphasis">
                {accessGroupState.accessState.viewerState.product.name}
              </span>{' '}
              Data Product.
            </div>
            <div>No contract found for Access Point Group.</div>
          </DialogContent>
        </Dialog>
      );
    }

    const createDialogHandleSubmit = async (
      target: V1_DataSubscriptionTarget,
    ): Promise<void> => {
      flowResult(
        accessGroupState.createSubscription(
          contract.guid,
          target,
          auth.user?.access_token,
        ),
      );
    };

    return (
      <>
        <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth="md">
          <DialogTitle>Data Product Subscriptions</DialogTitle>
          <IconButton
            onClick={onClose}
            className="marketplace-dialog-close-btn"
          >
            <CloseIcon />
          </IconButton>
          <DialogContent className="marketplace-lakehouse-subscriptions__subscriptions-viewer__content">
            <CubesLoadingIndicator isLoading={isLoading}>
              <CubesLoadingIndicatorIcon />
            </CubesLoadingIndicator>
            {!isLoading && (
              <>
                <div className="marketplace-lakehouse-subscriptions__subscriptions-viewer__description">
                  Subscriptions for{' '}
                  <span className="marketplace-lakehouse-text__emphasis">
                    {accessGroupState.group.id}
                  </span>{' '}
                  Access Point Group in{' '}
                  <span className="marketplace-lakehouse-text__emphasis">
                    {accessGroupState.accessState.viewerState.product.name}
                  </span>{' '}
                  Data Product
                </div>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  variant="contained"
                  className="marketplace-lakehouse-subscriptions__subscriptions-viewer__create-btn"
                >
                  Create New Subscription
                </Button>
                <Box className="marketplace-lakehouse-subscriptions__subscriptions-viewer__grid ag-theme-balham">
                  <DataGrid
                    rowData={subscriptions}
                    onRowDataUpdated={(params) => {
                      params.api.refreshCells({ force: true });
                    }}
                    suppressFieldDotNotation={true}
                    suppressContextMenu={false}
                    rowHeight={45}
                    columnDefs={[
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
                        cellRenderer: (
                          params: DataGridCellRendererParams<V1_DataSubscription>,
                        ) => {
                          return (
                            <UserCellRenderer
                              userId={params.data?.createdBy}
                              userDataMap={userDataMap}
                              navigationService={
                                legendMarketplaceStore.applicationStore
                                  .navigationService
                              }
                              isLoading={isLoadingUserData}
                              userProfileImageUrl={
                                legendMarketplaceStore.applicationStore.config
                                  .marketplaceUserProfileImageUrl
                              }
                              applicationDirectoryUrl={
                                legendMarketplaceStore.applicationStore.config
                                  .lakehouseEntitlementsConfig
                                  ?.applicationDirectoryUrl
                              }
                            />
                          );
                        },
                        flex: 2,
                      },
                      {
                        minWidth: 50,
                        sortable: true,
                        resizable: true,
                        headerName: 'Subscription Id',
                        valueGetter: (p) => p.data?.guid,
                        flex: 1,
                        hide: true,
                      },
                      {
                        minWidth: 50,
                        sortable: true,
                        resizable: true,
                        headerName: 'Contract ID',
                        valueGetter: (p) => p.data?.dataContractId,
                        flex: 1,
                        hide: true,
                      },
                    ]}
                  />
                </Box>
              </>
            )}
          </DialogContent>
        </Dialog>
        <LakehouseSubscriptionsCreateDialog
          open={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          accessGroupState={accessGroupState}
          contractId={contract.guid}
          onSubmit={createDialogHandleSubmit}
        />
      </>
    );
  },
);
