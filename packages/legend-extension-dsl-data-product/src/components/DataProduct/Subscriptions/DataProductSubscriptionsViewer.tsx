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
  type TextFieldProps,
  Autocomplete,
  Box,
  Button,
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
  Tooltip,
} from '@mui/material';
import {
  type V1_DataSubscription,
  type V1_DataSubscriptionTarget,
  V1_AdhocTeam,
  V1_AWSSnowflakeIngestEnvironment,
  V1_DataContract,
  V1_DataSubscriptionTargetType,
  V1_EnrichedUserApprovalStatus,
  V1_SnowflakeNetwork,
  V1_SnowflakeRegion,
  V1_SnowflakeTarget,
} from '@finos/legend-graph';
import React, { useState } from 'react';
import { guaranteeNonNullable, isType } from '@finos/legend-shared';
import { useAuth } from 'react-oidc-context';
import {
  CloseIcon,
  CopyIcon,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  InfoCircleIcon,
} from '@finos/legend-art';
import {
  DataGrid,
  type DataGridCellRendererParams,
} from '@finos/legend-lego/data-grid';
import { flowResult } from 'mobx';
import { UserRenderer } from '../../UserRenderer/UserRenderer.js';
import { MultiUserRenderer } from '../../UserRenderer/MultiUserRenderer.js';
import {
  getOrganizationalScopeTypeDetails,
  getOrganizationalScopeTypeName,
} from '../../../utils/LakehouseUtils.js';
import type { DataProductAPGState } from '../../../stores/DataProduct/DataProductAPGState.js';
import type { DataProductDataAccessState } from '../../../stores/DataProduct/DataProductDataAccessState.js';

const LakehouseSubscriptionsCreateDialogContractRenderer = observer(
  (props: {
    contract: V1_DataContract;
    dataAccessState: DataProductDataAccessState;
  }) => {
    const { contract, dataAccessState } = props;
    const consumer = contract.consumer;
    let consumerComponent = null;

    const copyContractId = (id: string): void => {
      dataAccessState.applicationStore.clipboardService
        .copyTextToClipboard(id)
        .then(() =>
          dataAccessState.applicationStore.notificationService.notifySuccess(
            'ID Copied to Clipboard',
            undefined,
            2500,
          ),
        )
        .catch(dataAccessState.applicationStore.alertUnhandledError);
    };

    if (consumer instanceof V1_AdhocTeam) {
      consumerComponent = (
        <MultiUserRenderer
          userIds={consumer.users.map((_user) => _user.name)}
          applicationStore={dataAccessState.applicationStore}
          userSearchService={
            dataAccessState.dataProductViewerState.userSearchService
          }
        />
      );
    } else {
      const typeDetails = getOrganizationalScopeTypeDetails(
        consumer,
        dataAccessState.applicationStore.pluginManager.getApplicationPlugins(),
      );
      consumerComponent = (
        <Box className="marketplace-lakehouse-subscriptions__subscription-creator__contract-details__users__details">
          {getOrganizationalScopeTypeName(
            consumer,
            dataAccessState.applicationStore.pluginManager.getApplicationPlugins(),
          )}
          {typeDetails !== undefined && (
            <Tooltip
              className="marketplace-lakehouse-subscriptions__subscription-creator__contract-details__users__tooltip__icon"
              title={typeDetails}
            >
              <InfoCircleIcon />
            </Tooltip>
          )}
        </Box>
      );
    }

    return (
      <Box className="marketplace-lakehouse-subscriptions__subscription-creator__contract-details">
        <Box className="marketplace-lakehouse-subscriptions__subscription-creator__contract-details__users">
          User(s): {consumerComponent}
        </Box>
        <Box className="marketplace-lakehouse-subscriptions__subscription-creator__contract-details__footer">
          <Box className="marketplace-lakehouse-subscriptions__subscription-creator__contract-details__description">
            Description: {contract.description}
          </Box>
          <Box className="marketplace-lakehouse-subscriptions__subscription-creator__contract-details__id">
            ID: {contract.guid}
            <IconButton
              onClick={(event) => {
                event.stopPropagation();
                copyContractId(contract.guid);
              }}
              onMouseDown={(event) => {
                event.stopPropagation();
              }}
            >
              <CopyIcon />
            </IconButton>
          </Box>
        </Box>
      </Box>
    );
  },
);

const LakehouseSubscriptionsCreateDialog = observer(
  (props: {
    open: boolean;
    onClose: () => void;
    apgState: DataProductAPGState;
    dataAccessState: DataProductDataAccessState;
    onSubmit: (
      contract: V1_DataContract,
      target: V1_DataSubscriptionTarget,
    ) => Promise<void>;
  }) => {
    const { open, onClose, apgState, dataAccessState, onSubmit } = props;

    const approvedUserContract =
      apgState.userAccessStatus === V1_EnrichedUserApprovalStatus.APPROVED &&
      apgState.associatedContract instanceof V1_DataContract
        ? apgState.associatedContract
        : undefined;
    const approvedSystemAccountContracts =
      apgState.associatedSystemAccountContractsAndApprovedUsers
        .filter((_contract) => _contract.approvedUsers.length > 0)
        .map((_contract) => _contract.contract);

    const [contract, setContract] = useState<V1_DataContract | undefined>(
      approvedUserContract ??
        (approvedSystemAccountContracts.length === 1
          ? approvedSystemAccountContracts[0]
          : undefined),
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
      dataAccessState.entitlementsDataProductDetails.lakehouseEnvironment
        ?.producerEnvironmentName;

    const environmentDetails =
      dataAccessState.lakehouseIngestEnvironmentDetails;
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

    const snowflakeAccountOptions = [
      ...suggestedSnowflakeAccounts,
      ...otherSnowflakeAccounts,
    ].map((account) => {
      return {
        isSuggested: suggestedSnowflakeAccounts.includes(account)
          ? 'Suggested Accounts'
          : 'Other Accounts',
        account,
      };
    });

    return (
      <Dialog
        open={open}
        onClose={onClose}
        className="marketplace-lakehouse-subscriptions__subscription-creator"
        fullWidth={true}
        maxWidth="md"
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
        <DialogContent
          classes={{
            root: 'marketplace-lakehouse-subscriptions__subscription-creator__content',
          }}
        >
          <FormControl fullWidth={true} margin="dense">
            <InputLabel id="contract-select-label">Contract</InputLabel>
            <Select
              required={true}
              labelId="contract-select-label"
              id="contract-select"
              name="contract"
              value={contract?.guid ?? ''}
              label="Contract"
              autoFocus={contract === undefined}
              onChange={(event: SelectChangeEvent<string>) => {
                setContract(
                  [
                    approvedUserContract,
                    ...approvedSystemAccountContracts,
                  ].find((_contract) => _contract?.guid === event.target.value),
                );
              }}
            >
              {[approvedUserContract, ...approvedSystemAccountContracts]
                .filter((_contract) => _contract instanceof V1_DataContract)
                .map((_contract) => (
                  <MenuItem key={_contract.guid} value={_contract.guid}>
                    <LakehouseSubscriptionsCreateDialogContractRenderer
                      contract={_contract}
                      dataAccessState={dataAccessState}
                    />
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
            <Autocomplete
              fullWidth={true}
              freeSolo={true}
              options={snowflakeAccountOptions}
              groupBy={(option) => option.isSuggested}
              getOptionLabel={(option) =>
                typeof option === 'string' ? option : option.account
              }
              renderInput={(params) => (
                <TextField
                  {...(params as TextFieldProps)}
                  label="Snowflake Account ID"
                  required={true}
                  autoFocus={contract !== undefined}
                />
              )}
              onChange={(_, value) =>
                setSnowflakeAccountId(
                  typeof value === 'string' ? value : (value?.account ?? ''),
                )
              }
              slotProps={{
                listbox: {
                  className:
                    'marketplace-lakehouse-subscriptions__subscription-creator__autocomplete__listbox',
                },
              }}
            />
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
  },
);

export const DataProductSubscriptionViewer = observer(
  (props: {
    open: boolean;
    apgState: DataProductAPGState;
    dataAccessState: DataProductDataAccessState;
    onClose: () => void;
  }) => {
    const { open, apgState, dataAccessState, onClose } = props;
    const auth = useAuth();
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    const subscriptions = apgState.subscriptions;
    const isLoading = apgState.fetchingSubscriptionsState.isInProgress;

    const createDialogHandleSubmit = async (
      _contract: V1_DataContract,
      target: V1_DataSubscriptionTarget,
    ): Promise<void> => {
      await flowResult(
        apgState.createSubscription(
          _contract.guid,
          target,
          dataAccessState.lakehouseContractServerClient,
          auth.user?.access_token,
        ),
      );
    };

    return (
      <>
        <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth="lg">
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
                    {apgState.apg.id}
                  </span>{' '}
                  Access Point Group in{' '}
                  <span className="marketplace-lakehouse-text__emphasis">
                    {apgState.dataProductViewerState.product.name}
                  </span>{' '}
                  Data Product
                </div>
                <span
                  className="marketplace-lakehouse-subscriptions__subscriptions-viewer__create-btn"
                  title={
                    !apgState.canCreateSubscription
                      ? 'Cannot create subscription. No approved contracts found for this Access Point Group.'
                      : undefined
                  }
                >
                  <Button
                    onClick={() => setShowCreateDialog(true)}
                    variant="contained"
                    disabled={!apgState.canCreateSubscription}
                    loading={
                      apgState.fetchingAccessState.isInProgress ||
                      apgState.fetchingApprovedContractsState.isInProgress
                    }
                  >
                    Create New Subscription
                  </Button>
                </span>

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
                              applicationStore={apgState.applicationStore}
                              userSearchService={
                                apgState.dataProductViewerState
                                  .userSearchService
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
        {showCreateDialog && (
          <LakehouseSubscriptionsCreateDialog
            open={showCreateDialog}
            onClose={() => setShowCreateDialog(false)}
            apgState={apgState}
            dataAccessState={dataAccessState}
            onSubmit={createDialogHandleSubmit}
          />
        )}
      </>
    );
  },
);
