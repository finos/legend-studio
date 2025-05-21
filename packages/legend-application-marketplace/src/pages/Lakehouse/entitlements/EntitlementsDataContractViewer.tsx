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
import type { EntitlementsDataContractViewerState } from '../../../stores/lakehouse/entitlements/EntitlementsDataContractViewerState.js';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Step,
  StepContent,
  StepLabel,
  Stepper,
} from '@mui/material';
import {
  V1_AccessPointGroupReference,
  V1_AdhocTeam,
  V1_ContractState,
  V1_UserType,
} from '@finos/legend-graph';
import { useEffect, useState } from 'react';
import { LegendUser } from '@finos/legend-shared';
import {
  getUserById,
  stringifyOrganizationalScope,
} from '../../../stores/lakehouse/LakehouseUtils.js';
import { useLegendMarketplaceBaseStore } from '../../../application/LegendMarketplaceFrameworkProvider.js';
import { flowResult } from 'mobx';
import { useAuth } from 'react-oidc-context';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
} from '@finos/legend-art';

export const EntitlementsDataContractViewer = observer(
  (props: {
    currentViewer: EntitlementsDataContractViewerState;
    onClose: () => void;
  }) => {
    const { currentViewer, onClose } = props;
    const auth = useAuth();
    const legendMarketplaceStore = useLegendMarketplaceBaseStore();
    const [orderedByUser, setOrderedByUser] = useState<
      LegendUser | undefined
    >();
    const [orderedForUsers, setOrderedForUsers] = useState<
      LegendUser[] | undefined
    >();
    const [loading, setLoading] = useState(false);
    const [loadingOrderedByUser, setLoadingOrderedByUser] = useState(false);
    const [loadingOrderedForUsers, setLoadingOrderedForUsers] = useState(false);

    useEffect(() => {
      setLoading(true);
      flowResult(currentViewer.init(auth.user?.access_token))
        .catch(legendMarketplaceStore.applicationStore.alertUnhandledError)
        .finally(() => setLoading(false));
    }, [
      currentViewer,
      auth.user?.access_token,
      legendMarketplaceStore.applicationStore.alertUnhandledError,
    ]);

    useEffect(() => {
      const fetchOrderedByUser = async (): Promise<void> => {
        if (legendMarketplaceStore.userSearchService) {
          setLoadingOrderedByUser(true);
          try {
            const user = await getUserById(
              currentViewer.value.createdBy,
              legendMarketplaceStore.userSearchService,
            );
            setOrderedByUser(user);
          } finally {
            setLoadingOrderedByUser(false);
          }
        }
      };
      fetchOrderedByUser();
    }, [
      currentViewer.value.createdBy,
      legendMarketplaceStore.userSearchService,
    ]);

    useEffect(() => {
      const fetchOrderedForUsers = async (): Promise<void> => {
        if (
          legendMarketplaceStore.userSearchService &&
          currentViewer.value.consumer instanceof V1_AdhocTeam
        ) {
          setLoadingOrderedForUsers(true);
          try {
            const users = await Promise.all(
              currentViewer.value.consumer.users.map(async (user) =>
                user.userType === V1_UserType.WORKFORCE_USER
                  ? ((await getUserById(
                      user.name,
                      legendMarketplaceStore.userSearchService!,
                    )) ?? new LegendUser(user.name, user.name))
                  : new LegendUser(user.name, user.name),
              ),
            );
            setOrderedForUsers(users);
          } finally {
            setLoadingOrderedForUsers(false);
          }
        }
      };
      fetchOrderedForUsers();
    }, [
      currentViewer.value.consumer,
      legendMarketplaceStore.userSearchService,
    ]);

    if (
      !(currentViewer.value.resource instanceof V1_AccessPointGroupReference)
    ) {
      return (
        <Dialog open={true} onClose={onClose} fullWidth={true} maxWidth="md">
          <DialogTitle>Pending Data Contract Request</DialogTitle>
          <DialogContent className="marketplace-lakehouse-entitlements__data-contract-viewer__content">
            Unable to display data contract request details for this resource.
          </DialogContent>
        </Dialog>
      );
    }

    const dataProduct = currentViewer.value.resource.dataProduct;
    const accessPointGroup = currentViewer.value.resource.accessPointGroup;
    const currentState = currentViewer.value.state;

    const steps = [
      { label: 'Submitted' },
      {
        label: 'Privilege Manager Approval',
        description:
          currentState === V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL
            ? 'Asignee'
            : 'Approved By',
      },
      {
        label: 'Data Producer Approval',
        description:
          currentState === V1_ContractState.PENDING_DATA_OWNER_APPROVAL
            ? 'Asignee'
            : currentState === V1_ContractState.COMPLETED
              ? 'Approved By'
              : currentState === V1_ContractState.REJECTED
                ? 'Rejected By'
                : undefined,
      },
      { label: 'Complete' },
    ];
    const activeStep =
      currentState === V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL
        ? 1
        : currentState === V1_ContractState.PENDING_DATA_OWNER_APPROVAL
          ? 2
          : currentState === V1_ContractState.COMPLETED
            ? 3
            : 0;

    return (
      <Dialog open={true} onClose={onClose} fullWidth={true} maxWidth="md">
        <DialogTitle>Pending Data Contract Request</DialogTitle>
        <DialogContent className="marketplace-lakehouse-entitlements__data-contract-viewer__content">
          <CubesLoadingIndicator isLoading={loading}>
            <CubesLoadingIndicatorIcon />
          </CubesLoadingIndicator>
          {!loading && (
            <>
              <div>
                Access request for{' '}
                <span className="marketplace-lakehouse-text__emphasis">
                  {accessPointGroup}
                </span>{' '}
                Access Point Group in{' '}
                <span className="marketplace-lakehouse-text__emphasis">
                  {dataProduct.name}
                </span>{' '}
                Data Product
              </div>
              <Box className="marketplace-lakehouse-entitlements__data-contract-viewer__metadata">
                <div>
                  <b>Ordered By: </b>
                  {loadingOrderedByUser ? (
                    <CircularProgress size={20} />
                  ) : (
                    (orderedByUser?.displayName ??
                    currentViewer.value.createdBy)
                  )}
                </div>
                <div>
                  <b>Ordered For: </b>
                  {loadingOrderedForUsers ? (
                    <CircularProgress size={20} />
                  ) : orderedForUsers !== undefined ? (
                    orderedForUsers.map((user) => user.displayName).join(', ')
                  ) : (
                    stringifyOrganizationalScope(currentViewer.value.consumer)
                  )}
                </div>
                <div>
                  <b>Business Justification: </b>
                  {currentViewer.value.description}
                </div>
              </Box>
              <Box className="marketplace-lakehouse-entitlements__data-contract-viewer__steps">
                <Stepper activeStep={activeStep} orientation="vertical">
                  {steps.map((step) => (
                    <Step key={step.label}>
                      <StepLabel>{step.label}</StepLabel>
                      <StepContent>{step.description}</StepContent>
                    </Step>
                  ))}
                </Stepper>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>
    );
  },
);
