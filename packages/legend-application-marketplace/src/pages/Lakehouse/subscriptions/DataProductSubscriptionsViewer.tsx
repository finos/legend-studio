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
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
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
import React, { useState } from 'react';
import { guaranteeNonNullable, isType } from '@finos/legend-shared';
import { useLegendMarketplaceBaseStore } from '../../../application/LegendMarketplaceFrameworkProvider.js';
import { useAuth } from 'react-oidc-context';
import {
  CloseIcon,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';
import type { DataProductGroupAccessState } from '../../../stores/lakehouse/DataProductDataAccessState.js';
import {
  DataGrid,
  type DataGridCellRendererParams,
} from '@finos/legend-lego/data-grid';
import { flowResult } from 'mobx';
import { UserRenderer } from '../../../components/UserRenderer/UserRenderer.js';

const LakehouseSubscriptionsCreateDialog = observer(
  (props: {
    open: boolean;
    onClose: () => void;
    accessGroupState: DataProductGroupAccessState;
    onSubmit: (
      contract: V1_DataContract,
      target: V1_DataSubscriptionTarget,
    ) => Promise<void>;
  }) => {
    const { open, onClose, accessGroupState, onSubmit } = props;

    const associatedUserContract =
      accessGroupState.associatedContract || undefined;
    const systemAccountContracts =
      accessGroupState.associatedSystemAccountContracts;

    const [contract, setContract] = useState<V1_DataContract | undefined>(
      associatedUserContract,
    );
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

    // TODO: Figure out better way to get the preferred list of snowflake accounts instead
    // of relying upon ingest environment URN
    const ingestEnvironmentUrn =
      accessGroupState.accessState.viewerState.entitlementsDataProductDetails
        .lakehouseEnvironment?.producerEnvironmentName;

    const environmentDetails =
      accessGroupState.accessState.viewerState.lakehouseStore
        .lakehouseIngestEnvironmentDetails;
    const suggestedSnowflakeAccounts = Array.from(
      new Set(
        environmentDetails
          .filter((details) =>
            isType(details, V1_AWSSnowflakeIngestEnvironment),
          )
          .filter((details) => details.urn === ingestEnvironmentUrn)
          .map(
            (ingestEnvironmentDetails) =>
              ingestEnvironmentDetails.snowflakeAccount,
          ),
      ),
    );
    const otherSnowflakeAccounts = Array.from(
      new Set(
        environmentDetails
          .filter((details) =>
            isType(details, V1_AWSSnowflakeIngestEnvironment),
          )
          .map(
            (ingestEnvironmentDetails) =>
              ingestEnvironmentDetails.snowflakeAccount,
          )
          .filter((account) => !suggestedSnowflakeAccounts.includes(account)),
      ),
    );

    return (
      <Dialog
        open={open}
        onClose={onClose}
        className="marketplace-lakehouse-subscriptions__subscription-creator"
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
                void onSubmit(guaranteeNonNullable(contract), snowflakeTarget);
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
          <FormControl fullWidth={true} margin="dense">
            <InputLabel id="contract-select-label">Contract</InputLabel>
            <Select
              required={true}
              labelId="contract-select-label"
              id="contract-select"
              name="contract"
              value={contract?.guid ?? ''}
              label="Contract"
              disabled={systemAccountContracts.length === 0}
              onChange={(event: SelectChangeEvent<string>) => {
                setContract(
                  [associatedUserContract, ...systemAccountContracts].find(
                    (_contract) => _contract?.guid === event.target.value,
                  ),
                );
              }}
            >
              {[associatedUserContract, ...systemAccountContracts]
                .filter((_contract) => _contract instanceof V1_DataContract)
                .map((_contract) => (
                  <MenuItem key={_contract.guid} value={_contract.guid}>
                    {_contract.guid}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
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
              {Object.values(V1_DataSubscriptionTargetType).map(
                (_targetType) => (
                  <MenuItem key={_targetType} value={_targetType}>
                    {_targetType}
                  </MenuItem>
                ),
              )}
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
              {suggestedSnowflakeAccounts.length > 0 && (
                <ListSubheader className="marketplace-lakehouse-subscriptions__subscription-creator__select__subheader">
                  Suggested Accounts
                </ListSubheader>
              )}
              {suggestedSnowflakeAccounts.map((snowflakeAccount) => (
                <MenuItem
                  key={snowflakeAccount}
                  value={snowflakeAccount}
                  className="marketplace-lakehouse-subscriptions__subscription-creator__select__item"
                >
                  {snowflakeAccount}
                </MenuItem>
              ))}
              {suggestedSnowflakeAccounts.length > 0 &&
                otherSnowflakeAccounts.length > 0 && (
                  <ListSubheader className="marketplace-lakehouse-subscriptions__subscription-creator__select__subheader">
                    Other Accounts
                  </ListSubheader>
                )}
              {otherSnowflakeAccounts.map((snowflakeAccount) => (
                <MenuItem
                  key={snowflakeAccount}
                  value={snowflakeAccount}
                  className="marketplace-lakehouse-subscriptions__subscription-creator__select__item"
                >
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
          <Button type="submit" variant="contained" disabled={!contract}>
            Create Subsciption
          </Button>
        </DialogActions>
      </Dialog>
    );
  },
);

export const DataProductSubscriptionViewer = observer(
  (props: {
    open: boolean;
    accessGroupState: DataProductGroupAccessState;
    onClose: () => void;
  }) => {
    const { open, accessGroupState, onClose } = props;
    const auth = useAuth();
    const legendMarketplaceStore = useLegendMarketplaceBaseStore();
    const [showCreateDialog, setShowCreateDialog] = useState(false);

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
      _contract: V1_DataContract,
      target: V1_DataSubscriptionTarget,
    ): Promise<void> => {
      await flowResult(
        accessGroupState.createSubscription(
          _contract.guid,
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
                            <UserRenderer
                              userId={params.data?.createdBy}
                              marketplaceStore={legendMarketplaceStore}
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
          onSubmit={createDialogHandleSubmit}
        />
      </>
    );
  },
);
