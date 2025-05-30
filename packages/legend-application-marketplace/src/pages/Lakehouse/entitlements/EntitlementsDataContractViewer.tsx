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
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
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
  V1_ApprovalType,
  V1_ContractState,
  V1_UserType,
} from '@finos/legend-graph';
import React, { useEffect, useState } from 'react';
import {
  guaranteeNonNullable,
  isNonNullable,
  LegendUser,
} from '@finos/legend-shared';
import {
  getUserById,
  isContractStateComplete,
  stringifyOrganizationalScope,
} from '../../../stores/lakehouse/LakehouseUtils.js';
import { useLegendMarketplaceBaseStore } from '../../../application/LegendMarketplaceFrameworkProvider.js';
import { flowResult } from 'mobx';
import { useAuth } from 'react-oidc-context';
import {
  CloseIcon,
  CopyIcon,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  ExpandMoreIcon,
  RefreshIcon,
  UserDisplay,
} from '@finos/legend-art';
import { generateLakehouseTaskPath } from '../../../__lib__/LegendMarketplaceNavigation.js';
import type { DataProductViewerState } from '../../../stores/lakehouse/DataProductViewerState.js';

const AssigneesList = (props: {
  users: (LegendUser | string)[];
  userProfileImageUrl?: string | undefined;
  onUserClick?: (userId: string) => void;
}): React.ReactNode => {
  const { users, userProfileImageUrl, onUserClick } = props;
  return users.length === 1 ? (
    <span>
      Assignee:{' '}
      {users[0] instanceof LegendUser ? (
        <UserDisplay
          user={users[0]}
          imgSrc={userProfileImageUrl?.replace('{userId}', users[0].id)}
          onClick={() => onUserClick?.((users[0] as LegendUser).id)}
        />
      ) : (
        <div>{users[0]}</div>
      )}
    </span>
  ) : (
    <Accordion
      className="marketplace-lakehouse-entitlements__data-contract-viewer__user-list__container"
      elevation={0}
      disableGutters={true}
      defaultExpanded={true}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        Assignees ({users.length}):
      </AccordionSummary>
      <AccordionDetails className="marketplace-lakehouse-entitlements__data-contract-viewer__user-list">
        {users.map((user) =>
          user instanceof LegendUser ? (
            <UserDisplay
              key={user.id}
              user={user}
              imgSrc={userProfileImageUrl?.replace('{userId}', user.id)}
              onClick={() => onUserClick?.(user.id)}
            />
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
    dataProductViewerState?: DataProductViewerState | undefined;
    onClose: () => void;
  }) => {
    const { currentViewer, dataProductViewerState, onClose } = props;
    const auth = useAuth();
    const legendMarketplaceStore = useLegendMarketplaceBaseStore();
    const [userDataMap, setUserDataMap] = useState<Map<string, LegendUser>>(
      new Map<string, LegendUser>(),
    );
    const [isLoadingUserData, setIsLoadingUserData] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
      if (!currentViewer.initializationState.hasCompleted) {
        setIsLoading(true);
        flowResult(currentViewer.init(auth.user?.access_token))
          .catch(legendMarketplaceStore.applicationStore.alertUnhandledError)
          .finally(() => setIsLoading(false));
      }
    }, [
      currentViewer,
      auth.user?.access_token,
      legendMarketplaceStore.applicationStore.alertUnhandledError,
    ]);

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
      // eslint-disable-next-line no-void
      void fetchUserData(userIds);
    }, [
      legendMarketplaceStore.userSearchService,
      currentViewer.associatedTasks,
      currentViewer.value.consumer,
      currentViewer.value.createdBy,
    ]);

    const refresh = async (): Promise<void> => {
      setIsLoading(true);
      await flowResult(
        dataProductViewerState?.fetchContracts(auth.user?.access_token),
      );
      await flowResult(currentViewer.init(auth.user?.access_token))
        .catch(legendMarketplaceStore.applicationStore.alertUnhandledError)
        .finally(() => setIsLoading(false));
    };

    if (
      !(currentViewer.value.resource instanceof V1_AccessPointGroupReference)
    ) {
      return (
        <Dialog open={true} onClose={onClose} fullWidth={true} maxWidth="md">
          <DialogTitle>Pending Data Contract Request</DialogTitle>
          <IconButton
            onClick={onClose}
            className="marketplace-dialog-close-btn"
          >
            <CloseIcon />
          </IconButton>
          <DialogContent className="marketplace-lakehouse-entitlements__data-contract-viewer__content">
            Unable to display data contract request details for this resource.
          </DialogContent>
        </Dialog>
      );
    }

    const dataProduct = currentViewer.value.resource.dataProduct;
    const accessPointGroup = currentViewer.value.resource.accessPointGroup;
    const currentState = currentViewer.value.state;
    const currentTask =
      currentState === V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL
        ? currentViewer.associatedTasks?.find(
            (task) =>
              task.rec.type ===
              V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
          )
        : currentState === V1_ContractState.PENDING_DATA_OWNER_APPROVAL
          ? currentViewer.associatedTasks?.find(
              (task) => task.rec.type === V1_ApprovalType.DATA_OWNER_APPROVAL,
            )
          : undefined;

    const copyTaskLink = (text: string): void => {
      legendMarketplaceStore.applicationStore.clipboardService
        .copyTextToClipboard(text)
        .then(() =>
          legendMarketplaceStore.applicationStore.notificationService.notifySuccess(
            'Task Link Copied to Clipboard',
            undefined,
            2500,
          ),
        )
        .catch(legendMarketplaceStore.applicationStore.alertUnhandledError);
    };

    const openUserDirectoryLink = (userId: string): void =>
      legendMarketplaceStore.applicationStore.navigationService.navigator.visitAddress(
        `${legendMarketplaceStore.applicationStore.config.lakehouseEntitlementsConfig?.applicationDirectoryUrl}/${userId}`,
      );

    const steps: {
      key: string;
      label: React.ReactNode;
      isCompleteOrActive: boolean;
      description?: React.ReactNode;
    }[] = [
      { key: 'submitted', isCompleteOrActive: true, label: <>Submitted</> },
      {
        key: 'privilege-manager-approval',
        label:
          currentState ===
            V1_ContractState.OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL &&
          currentTask ? (
            <>
              <Link
                href={legendMarketplaceStore.applicationStore.navigationService.navigator.generateAddress(
                  generateLakehouseTaskPath(currentTask.rec.taskId),
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                Privilege Manager Approval
              </Link>
              <IconButton
                onClick={() =>
                  copyTaskLink(
                    legendMarketplaceStore.applicationStore.navigationService.navigator.generateAddress(
                      generateLakehouseTaskPath(currentTask.rec.taskId),
                    ),
                  )
                }
              >
                <CopyIcon />
              </IconButton>
            </>
          ) : (
            <>Privilege Manager Approval</>
          ),
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
                  .map((asignee) => userDataMap.get(asignee) ?? asignee)}
                userProfileImageUrl={
                  legendMarketplaceStore.applicationStore.config
                    .marketplaceUserProfileImageUrl
                }
                onUserClick={openUserDirectoryLink}
              />
            ) : (
              <span>No tasks associated with contract</span>
            )
          ) : currentState === V1_ContractState.PENDING_DATA_OWNER_APPROVAL ||
            currentState === V1_ContractState.COMPLETED ? (
            <>Approved</>
          ) : currentState === V1_ContractState.REJECTED ? (
            <>Rejected</>
          ) : undefined,
      },
      {
        key: 'data-producer-approval',
        label:
          currentState === V1_ContractState.PENDING_DATA_OWNER_APPROVAL &&
          currentTask ? (
            <>
              <Link
                href={legendMarketplaceStore.applicationStore.navigationService.navigator.generateAddress(
                  generateLakehouseTaskPath(currentTask.rec.taskId),
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                Data Producer Approval
              </Link>
              <IconButton
                onClick={() =>
                  copyTaskLink(
                    legendMarketplaceStore.applicationStore.navigationService.navigator.generateAddress(
                      generateLakehouseTaskPath(currentTask.rec.taskId),
                    ),
                  )
                }
              >
                <CopyIcon />
              </IconButton>
            </>
          ) : (
            <>Data Producer Approval</>
          ),
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
                  .map((asignee) => userDataMap.get(asignee) ?? asignee)}
                userProfileImageUrl={
                  legendMarketplaceStore.applicationStore.config
                    .marketplaceUserProfileImageUrl
                }
                onUserClick={openUserDirectoryLink}
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
        <IconButton onClick={onClose} className="marketplace-dialog-close-btn">
          <CloseIcon />
        </IconButton>
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
                <div className="marketplace-lakehouse-entitlements__data-contract-viewer__metadata__ordered-by">
                  <b>Ordered By: </b>
                  {isLoadingUserData ? (
                    <CircularProgress size={20} />
                  ) : userDataMap.get(currentViewer.value.createdBy) ? (
                    <UserDisplay
                      user={guaranteeNonNullable(
                        userDataMap.get(currentViewer.value.createdBy),
                      )}
                      imgSrc={legendMarketplaceStore.applicationStore.config.marketplaceUserProfileImageUrl?.replace(
                        '{userId}',
                        userDataMap.get(currentViewer.value.createdBy)?.id ??
                          '',
                      )}
                      onClick={() =>
                        openUserDirectoryLink(
                          guaranteeNonNullable(
                            userDataMap.get(currentViewer.value.createdBy),
                          ).id,
                        )
                      }
                    />
                  ) : (
                    currentViewer.value.createdBy
                  )}
                </div>
                <div className="marketplace-lakehouse-entitlements__data-contract-viewer__metadata__ordered-for">
                  <b>Ordered For: </b>
                  {isLoadingUserData ? (
                    <CircularProgress size={20} />
                  ) : currentViewer.value.consumer instanceof V1_AdhocTeam ? (
                    currentViewer.value.consumer.users.map((user, index) => {
                      const userData = userDataMap.get(user.name);
                      if (userData) {
                        return (
                          <UserDisplay
                            key={user.name}
                            user={userData}
                            imgSrc={legendMarketplaceStore.applicationStore.config.marketplaceUserProfileImageUrl?.replace(
                              '{userId}',
                              userDataMap.get(user.name)?.id ?? '',
                            )}
                            onClick={() => openUserDirectoryLink(userData.id)}
                          />
                        );
                      } else {
                        return `${user.name}${index < (currentViewer.value.consumer as V1_AdhocTeam).users.length - 1 ? ', ' : ''}`;
                      }
                    })
                  ) : (
                    stringifyOrganizationalScope(currentViewer.value.consumer)
                  )}
                </div>
                <div>
                  <b>Business Justification: </b>
                  {currentViewer.value.description}
                </div>
              </Box>
              <Box className="marketplace-lakehouse-entitlements__data-contract-viewer__refresh-btn">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={refresh}
                >
                  Refresh
                </Button>
              </Box>
              <Box className="marketplace-lakehouse-entitlements__data-contract-viewer__timeline">
                <Timeline>
                  {steps.map((step, index) => (
                    <TimelineItem key={step.key}>
                      <TimelineOppositeContent className="marketplace-lakehouse-entitlements__data-contract-viewer__timeline__content">
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
                      <TimelineContent className="marketplace-lakehouse-entitlements__data-contract-viewer__timeline__content">
                        {step.description}
                      </TimelineContent>
                    </TimelineItem>
                  ))}
                </Timeline>
              </Box>
            </>
          )}
          <Box className="marketplace-lakehouse-entitlements__data-contract-viewer__footer">
            Contract ID: {currentViewer.value.guid}
          </Box>
        </DialogContent>
      </Dialog>
    );
  },
);
