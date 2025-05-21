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
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
} from '@mui/material';
import {
  Timeline,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineItem,
  TimelineOppositeContent,
  TimelineSeparator,
} from '@mui/lab';
import {
  V1_AccessPointGroupReference,
  V1_AdhocTeam,
  V1_ContractState,
  V1_UserType,
} from '@finos/legend-graph';
import React, { useEffect, useState } from 'react';
import { isNonNullable, LegendUser } from '@finos/legend-shared';
import {
  getUserById,
  isContractStateComplete,
  stringifyOrganizationalScope,
} from '../../../stores/lakehouse/LakehouseUtils.js';
import { useLegendMarketplaceBaseStore } from '../../../application/LegendMarketplaceFrameworkProvider.js';
import { flowResult } from 'mobx';
import { useAuth } from 'react-oidc-context';
import {
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  UserDisplay,
} from '@finos/legend-art';

const AssigneesList = (props: {
  users: (LegendUser | string)[];
}): React.ReactNode => {
  const { users } = props;
  return users.length === 1 ? (
    <span>
      Assignee:{' '}
      {users[0] instanceof LegendUser ? (
        <UserDisplay user={users[0]} />
      ) : (
        <div>{users[0]}</div>
      )}
    </span>
  ) : (
    <Accordion className="marketplace-lakehouse-entitlements__data-contract-viewer__user-list">
      <AccordionSummary>Assignees:</AccordionSummary>
      <AccordionDetails>
        {users.map((user) =>
          user instanceof LegendUser ? (
            <UserDisplay key={user.id} user={user} />
          ) : (
            <div key={user}>{user}</div>
          ),
        )}
      </AccordionDetails>
    </Accordion>
  );
};

export const EntitlementsDataContractViewer = observer(
  (props: {
    currentViewer: EntitlementsDataContractViewerState;
    onClose: () => void;
  }) => {
    const { currentViewer, onClose } = props;
    const auth = useAuth();
    const legendMarketplaceStore = useLegendMarketplaceBaseStore();
    const [userData, setUserData] = useState<Map<string, LegendUser>>(
      new Map<string, LegendUser>(),
    );
    const [isLoadingUserData, setIsLoadingUserData] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
      setIsLoading(true);
      flowResult(currentViewer.init(auth.user?.access_token))
        .catch(legendMarketplaceStore.applicationStore.alertUnhandledError)
        .finally(() => setIsLoading(false));
    }, [
      currentViewer,
      auth.user?.access_token,
      legendMarketplaceStore.applicationStore.alertUnhandledError,
    ]);

    useEffect(() => {
      const fetchUserData = async (userIds: string[]): Promise<void> => {
        if (legendMarketplaceStore.userSearchService) {
          setIsLoadingUserData(true);
          try {
            const users = (
              await Promise.all(
                userIds.map(async (userId) =>
                  getUserById(
                    userId,
                    legendMarketplaceStore.userSearchService!,
                  ),
                ),
              )
            ).filter(isNonNullable);
            const userMap = new Map<string, LegendUser>();
            users.forEach((user) => {
              userMap.set(user.id, user);
            });
            setUserData(userMap);
          } finally {
            setIsLoadingUserData(false);
          }
        }
      };
      const userIds: string[] = [
        currentViewer.value.createdBy,
        ...(currentViewer.value.consumer instanceof V1_AdhocTeam
          ? currentViewer.value.consumer.users
              .map((user) =>
                user.userType === V1_UserType.WORKFORCE_USER
                  ? user.name
                  : undefined,
              )
              .filter(isNonNullable)
          : []),
        ...(currentViewer.associatedTasks
          ?.map((task) => task.assignees)
          .flat() ?? []),
      ];
      fetchUserData(userIds);
    }, [
      legendMarketplaceStore.userSearchService,
      currentViewer.associatedTasks,
      currentViewer.value.consumer,
      currentViewer.value.createdBy,
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

    const steps: {
      key: string;
      label: React.ReactNode;
      isCompleteOrActive: boolean;
      description?: React.ReactNode;
    }[] = [
      { key: 'submitted', isCompleteOrActive: true, label: <>Submitted</> },
      {
        key: 'privilege-manager-approval',
        label: <>Privilege Manager Approval</>,
        isCompleteOrActive:
          currentState ===
            V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL ||
          isContractStateComplete(
            currentState,
            V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL,
          ),
        description:
          currentState ===
          V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL ? (
            currentViewer.associatedTasks ? (
              <AssigneesList
                users={currentViewer.associatedTasks
                  .map((task) => task.assignees)
                  .flat()
                  .map((asignee) => userData.get(asignee) ?? asignee)}
              />
            ) : (
              <span>No tasks associated with contract</span>
            )
          ) : currentState === V1_ContractState.COMPLETED ? (
            <>Approved</>
          ) : currentState === V1_ContractState.REJECTED ? (
            <>Rejected</>
          ) : undefined,
      },
      {
        key: 'data-producer-approval',
        label: <>Data Producer Approval</>,
        isCompleteOrActive:
          currentState === V1_ContractState.PENDING_DATA_OWNER_APPROVAL ||
          isContractStateComplete(
            currentState,
            V1_ContractState.PENDING_DATA_OWNER_APPROVAL,
          ),
        description:
          currentState === V1_ContractState.PENDING_DATA_OWNER_APPROVAL ? (
            currentViewer.associatedTasks ? (
              <AssigneesList
                users={currentViewer.associatedTasks
                  .map((task) => task.assignees)
                  .flat()
                  .map((asignee) => userData.get(asignee) ?? asignee)}
              />
            ) : (
              <span>No tasks associated with contract</span>
            )
          ) : currentState === V1_ContractState.COMPLETED ? (
            <>Approved</>
          ) : currentState === V1_ContractState.REJECTED ? (
            <>Rejected</>
          ) : undefined,
      },
      {
        key: 'complete',
        isCompleteOrActive:
          currentState === V1_ContractState.COMPLETED ||
          isContractStateComplete(currentState, V1_ContractState.COMPLETED),
        label: <>Complete</>,
      },
    ];

    return (
      <Dialog open={true} onClose={onClose} fullWidth={true} maxWidth="md">
        <DialogTitle>Pending Data Contract Request</DialogTitle>
        <DialogContent className="marketplace-lakehouse-entitlements__data-contract-viewer__content">
          <CubesLoadingIndicator isLoading={isLoading}>
            <CubesLoadingIndicatorIcon />
          </CubesLoadingIndicator>
          {!isLoading && (
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
                  {isLoadingUserData ? (
                    <CircularProgress size={20} />
                  ) : (
                    (userData.get(currentViewer.value.createdBy)?.displayName ??
                    currentViewer.value.createdBy)
                  )}
                </div>
                <div>
                  <b>Ordered For: </b>
                  {isLoadingUserData ? (
                    <CircularProgress size={20} />
                  ) : currentViewer.value.consumer instanceof V1_AdhocTeam ? (
                    currentViewer.value.consumer.users
                      .map(
                        (user) =>
                          userData.get(user.name)?.displayName ?? user.name,
                      )
                      .join(', ')
                  ) : (
                    stringifyOrganizationalScope(currentViewer.value.consumer)
                  )}
                </div>
                <div>
                  <b>Business Justification: </b>
                  {currentViewer.value.description}
                </div>
              </Box>
              <Box className="marketplace-lakehouse-entitlements__data-contract-viewer__timeline">
                <Timeline>
                  {steps.map((step, index) => (
                    <TimelineItem key={step.key}>
                      <TimelineOppositeContent>
                        {step.label}
                      </TimelineOppositeContent>
                      <TimelineSeparator>
                        <TimelineDot
                          color="primary"
                          variant={
                            step.isCompleteOrActive ? 'filled' : 'outlined'
                          }
                        />
                        {index < steps.length - 1 && <TimelineConnector />}
                      </TimelineSeparator>
                      <TimelineContent>{step.description}</TimelineContent>
                    </TimelineItem>
                  ))}
                </Timeline>
              </Box>
            </>
          )}
        </DialogContent>
      </Dialog>
    );
  },
);
