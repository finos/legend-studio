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
import type { EntitlementsDataContractViewerState } from '../../stores/lakehouse/entitlements/EntitlementsDataContractViewerState.js';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Link,
  MenuItem,
  Select,
  Tooltip,
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
  type V1_TaskMetadata,
  V1_AdhocTeam,
  V1_ApprovalType,
  V1_ContractUserEventDataProducerPayload,
  V1_ContractUserEventPrivilegeManagerPayload,
  V1_ResourceType,
  V1_UserApprovalStatus,
} from '@finos/legend-graph';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActionState,
  formatDate,
  lodashCapitalize,
} from '@finos/legend-shared';
import {
  getOrganizationalScopeTypeDetails,
  getOrganizationalScopeTypeName,
  isContractInTerminalState,
  stringifyOrganizationalScope,
} from '../../stores/lakehouse/LakehouseUtils.js';
import { useLegendMarketplaceBaseStore } from '../../application/LegendMarketplaceFrameworkProvider.js';
import { flowResult } from 'mobx';
import { useAuth } from 'react-oidc-context';
import {
  CloseIcon,
  CopyIcon,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  ExpandMoreIcon,
  InfoCircleIcon,
  RefreshIcon,
} from '@finos/legend-art';
import {
  generateLakehouseDataProductPath,
  generateLakehouseTaskPath,
} from '../../__lib__/LegendMarketplaceNavigation.js';
import { type DataProductGroupAccessState } from '../../stores/lakehouse/DataProductDataAccessState.js';
import { UserRenderer } from '../../components/UserRenderer/UserRenderer.js';
import type { LegendMarketplaceBaseStore } from '../../stores/LegendMarketplaceBaseStore.js';

const AssigneesList = (props: {
  userIds: string[];
  marketplaceStore: LegendMarketplaceBaseStore;
}): React.ReactNode => {
  const { userIds, marketplaceStore } = props;
  return userIds.length === 0 ? (
    <span>No Assignees</span>
  ) : userIds.length === 1 ? (
    <span>
      Assignee:{' '}
      <UserRenderer userId={userIds[0]} marketplaceStore={marketplaceStore} />
    </span>
  ) : (
    <Accordion
      className="marketplace-lakehouse-entitlements__data-contract-viewer__user-list__container"
      elevation={0}
      disableGutters={true}
      defaultExpanded={true}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        Assignees ({userIds.length}):
      </AccordionSummary>
      <AccordionDetails className="marketplace-lakehouse-entitlements__data-contract-viewer__user-list">
        {[...userIds].sort().map((userId) => (
          <UserRenderer
            key={userId}
            userId={userId}
            marketplaceStore={marketplaceStore}
          />
        ))}
      </AccordionDetails>
    </Accordion>
  );
};

const TaskApprovalView = (props: {
  task: V1_TaskMetadata | undefined;
  marketplaceStore: LegendMarketplaceBaseStore;
}): React.ReactNode => {
  const { task, marketplaceStore } = props;
  const approverId =
    task?.rec.eventPayload instanceof
    V1_ContractUserEventPrivilegeManagerPayload
      ? task.rec.eventPayload.managerIdentity
      : task?.rec.eventPayload instanceof
          V1_ContractUserEventDataProducerPayload
        ? task.rec.eventPayload.dataProducerIdentity
        : undefined;

  if (task) {
    const taskStatus = task.rec.status;

    return (
      <Box className="marketplace-lakehouse-entitlements__data-contract-viewer__task-approval-view">
        <Box>
          {lodashCapitalize(taskStatus)}
          {approverId !== undefined && (
            <>
              {' '}
              by{' '}
              <UserRenderer
                userId={approverId}
                marketplaceStore={marketplaceStore}
              />
            </>
          )}
        </Box>
        <Box className="marketplace-lakehouse-entitlements__data-contract-viewer__task-approval-view__timestamp">
          {formatDate(
            new Date(task.rec.eventPayload.eventTimestamp),
            `MM/dd/yyyy HH:mm:ss`,
          )}
        </Box>
      </Box>
    );
  } else {
    return undefined;
  }
};

export const EntitlementsDataContractViewer = observer(
  (props: {
    open: boolean;
    currentViewer: EntitlementsDataContractViewerState;
    dataProductGroupAccessState?: DataProductGroupAccessState | undefined;
    onClose: () => void;
    initialSelectedUser?: string | undefined;
  }) => {
    const {
      open,
      currentViewer,
      dataProductGroupAccessState,
      onClose,
      initialSelectedUser,
    } = props;
    const auth = useAuth();
    const legendMarketplaceStore = useLegendMarketplaceBaseStore();
    const consumer = currentViewer.value.consumer;

    // We try to get the target users from the associated tasks first, since the
    // tasks are what drive the timeline view. If there are no associated tasks,
    // then we use the contract consumer.
    const targetUsers = useMemo(
      () =>
        currentViewer.associatedTasks?.length
          ? Array.from(
              new Set<string>(
                currentViewer.associatedTasks.map((task) => task.rec.consumer),
              ),
            ).sort()
          : consumer instanceof V1_AdhocTeam
            ? consumer.users.map((user) => user.name).sort()
            : undefined,
      [consumer, currentViewer.associatedTasks],
    );

    // In order to ensure the Select menu is properly resized after we load
    // all the target user data, track how many users have finished loading
    // so that we can trigger a window resize event once all the user data is loaded.
    const [, setNumUsersLoaded] = useState(0);
    const finishedLoadingUserCallback = useCallback(() => {
      setNumUsersLoaded((prev) => {
        if (prev + 1 === targetUsers?.length) {
          // Trigger a window resize event to ensure the Select menu is properly resized
          window.dispatchEvent(new Event('resize'));
        }
        return prev + 1;
      });
    }, [targetUsers]);
    const targetUserSelectItems = useMemo(
      () =>
        targetUsers?.map((user) => (
          <MenuItem key={user} value={user}>
            <UserRenderer
              userId={user}
              marketplaceStore={legendMarketplaceStore}
              disableOnClick={true}
              onFinishedLoadingCallback={finishedLoadingUserCallback}
            />
          </MenuItem>
        )),
      [targetUsers, legendMarketplaceStore, finishedLoadingUserCallback],
    );

    const [selectedTargetUser, setSelectedTargetUser] = useState<
      string | undefined
    >(initialSelectedUser ?? targetUsers?.[0]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
      if (!currentViewer.initializationState.hasCompleted) {
        setIsLoading(true);
        flowResult(currentViewer.init(auth.user?.access_token))
          .catch(legendMarketplaceStore.applicationStore.alertUnhandledError)
          .finally(() => setIsLoading(false));
      }
    }, [
      auth.user?.access_token,
      currentViewer,
      currentViewer.initializationState,
      legendMarketplaceStore.applicationStore.alertUnhandledError,
    ]);

    useEffect(() => {
      if (selectedTargetUser === undefined) {
        setSelectedTargetUser(initialSelectedUser ?? targetUsers?.[0]);
      }
    }, [initialSelectedUser, selectedTargetUser, targetUsers]);

    const refresh = async (): Promise<void> => {
      setIsLoading(true);
      if (dataProductGroupAccessState?.associatedContract) {
        dataProductGroupAccessState.fetchUserAccessStatus(
          dataProductGroupAccessState.associatedContract.guid,
          auth.user?.access_token,
        );
      }
      currentViewer.initializationState = ActionState.create();
    };

    if (
      currentViewer.value.resourceType !== V1_ResourceType.ACCESS_POINT_GROUP
    ) {
      return (
        <Dialog open={true} onClose={onClose} fullWidth={true} maxWidth="md">
          <DialogTitle>Data Contract Request</DialogTitle>
          <IconButton
            onClick={onClose}
            className="marketplace-dialog-close-btn"
          >
            <CloseIcon />
          </IconButton>
          <DialogContent className="marketplace-lakehouse-entitlements__data-contract-viewer__content">
            Unable to display data contract request details for resource of type{' '}
            {currentViewer.value.resourceType} on data product{' '}
            {currentViewer.value.resourceId}.
          </DialogContent>
        </Dialog>
      );
    }

    const dataProduct = currentViewer.value.resourceId;
    const accessPointGroup = currentViewer.value.accessPointGroup;
    const privilegeManagerApprovalTask = currentViewer.associatedTasks?.find(
      (task) =>
        task.rec.consumer === selectedTargetUser &&
        task.rec.type === V1_ApprovalType.CONSUMER_PRIVILEGE_MANAGER_APPROVAL,
    );
    const dataOwnerApprovalTask = currentViewer.associatedTasks?.find(
      (task) =>
        task.rec.consumer === selectedTargetUser &&
        task.rec.type === V1_ApprovalType.DATA_OWNER_APPROVAL,
    );

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

    const steps: {
      key: string;
      label: React.ReactNode;
      isCompleteOrActive: boolean;
      description?: React.ReactNode;
      isDeniedStep?: boolean;
    }[] = [
      { key: 'submitted', isCompleteOrActive: true, label: <>Submitted</> },
      {
        key: 'privilege-manager-approval',
        label:
          privilegeManagerApprovalTask?.rec.status ===
          V1_UserApprovalStatus.PENDING ? (
            <>
              <Link
                href={legendMarketplaceStore.applicationStore.navigationService.navigator.generateAddress(
                  generateLakehouseTaskPath(
                    privilegeManagerApprovalTask.rec.taskId,
                  ),
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
                      generateLakehouseTaskPath(
                        privilegeManagerApprovalTask.rec.taskId,
                      ),
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
        isCompleteOrActive: true,
        description:
          privilegeManagerApprovalTask?.rec.status ===
          V1_UserApprovalStatus.PENDING ? (
            <AssigneesList
              userIds={privilegeManagerApprovalTask.assignees}
              marketplaceStore={legendMarketplaceStore}
            />
          ) : (
            <TaskApprovalView
              task={privilegeManagerApprovalTask}
              marketplaceStore={legendMarketplaceStore}
            />
          ),
        isDeniedStep:
          privilegeManagerApprovalTask?.rec.status ===
            V1_UserApprovalStatus.DENIED ||
          privilegeManagerApprovalTask?.rec.status ===
            V1_UserApprovalStatus.REVOKED,
      },
      {
        key: 'data-producer-approval',
        label:
          dataOwnerApprovalTask?.rec.status ===
          V1_UserApprovalStatus.PENDING ? (
            <>
              <Link
                href={legendMarketplaceStore.applicationStore.navigationService.navigator.generateAddress(
                  generateLakehouseTaskPath(dataOwnerApprovalTask.rec.taskId),
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
                      generateLakehouseTaskPath(
                        dataOwnerApprovalTask.rec.taskId,
                      ),
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
        isCompleteOrActive: dataOwnerApprovalTask !== undefined,
        description:
          dataOwnerApprovalTask?.rec.status ===
          V1_UserApprovalStatus.PENDING ? (
            <AssigneesList
              userIds={dataOwnerApprovalTask.assignees}
              marketplaceStore={legendMarketplaceStore}
            />
          ) : dataOwnerApprovalTask !== undefined ? (
            <TaskApprovalView
              task={dataOwnerApprovalTask}
              marketplaceStore={legendMarketplaceStore}
            />
          ) : undefined,
        isDeniedStep:
          dataOwnerApprovalTask?.rec.status === V1_UserApprovalStatus.DENIED ||
          dataOwnerApprovalTask?.rec.status === V1_UserApprovalStatus.REVOKED,
      },
      {
        key: 'complete',
        isCompleteOrActive:
          privilegeManagerApprovalTask?.rec.status ===
            V1_UserApprovalStatus.APPROVED &&
          dataOwnerApprovalTask?.rec.status === V1_UserApprovalStatus.APPROVED,
        label: <>Complete</>,
      },
    ];

    return (
      <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth="md">
        <DialogTitle>
          {isContractInTerminalState(currentViewer.value) ? '' : 'Pending '}Data
          Contract Request
        </DialogTitle>
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
                <Link
                  className="marketplace-lakehouse-text__emphasis"
                  href={legendMarketplaceStore.applicationStore.navigationService.navigator.generateAddress(
                    generateLakehouseDataProductPath(
                      dataProduct,
                      currentViewer.value.deploymentId,
                    ),
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {dataProduct}
                </Link>{' '}
                Data Product
              </div>
              <Box className="marketplace-lakehouse-entitlements__data-contract-viewer__metadata">
                <div className="marketplace-lakehouse-entitlements__data-contract-viewer__metadata__ordered-by">
                  <b>Ordered By: </b>
                  <UserRenderer
                    userId={currentViewer.value.createdBy}
                    marketplaceStore={legendMarketplaceStore}
                  />
                </div>
                <div className="marketplace-lakehouse-entitlements__data-contract-viewer__metadata__ordered-for">
                  <b>
                    Ordered For
                    <Tooltip
                      className="marketplace-lakehouse-entitlements__data-contract-viewer__metadata__ordered-for__tooltip__icon"
                      title={
                        <>
                          Contract consumer type:{' '}
                          {getOrganizationalScopeTypeName(
                            consumer,
                            legendMarketplaceStore.applicationStore.pluginManager.getApplicationPlugins(),
                          )}
                          {getOrganizationalScopeTypeDetails(
                            consumer,
                            legendMarketplaceStore.applicationStore.pluginManager.getApplicationPlugins(),
                          )}
                        </>
                      }
                    >
                      <InfoCircleIcon />
                    </Tooltip>
                    :{' '}
                  </b>
                  {targetUsers !== undefined ? (
                    targetUsers.length === 1 ? (
                      <UserRenderer
                        key={targetUsers[0]}
                        userId={targetUsers[0]}
                        marketplaceStore={legendMarketplaceStore}
                      />
                    ) : (
                      <Select
                        value={selectedTargetUser}
                        onChange={(event) =>
                          setSelectedTargetUser(event.target.value)
                        }
                        size="small"
                        className="marketplace-lakehouse-entitlements__data-contract-viewer__metadata__ordered-for__select"
                      >
                        {targetUserSelectItems}
                      </Select>
                    )
                  ) : (
                    stringifyOrganizationalScope(consumer)
                  )}
                </div>
                <div>
                  <b>Business Justification: </b>
                  {currentViewer.value.description}
                </div>
              </Box>
              {!isContractInTerminalState(currentViewer.value) && (
                <Box className="marketplace-lakehouse-entitlements__data-contract-viewer__refresh-btn">
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={() => {
                      // eslint-disable-next-line no-void
                      void refresh();
                    }}
                  >
                    Refresh
                  </Button>
                </Box>
              )}
              <Box className="marketplace-lakehouse-entitlements__data-contract-viewer__timeline">
                <Timeline>
                  {steps.map((step, index) => (
                    <TimelineItem key={step.key}>
                      <TimelineOppositeContent className="marketplace-lakehouse-entitlements__data-contract-viewer__timeline__content">
                        {step.label}
                      </TimelineOppositeContent>
                      <TimelineSeparator>
                        <TimelineDot
                          color={step.isDeniedStep ? 'error' : 'primary'}
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
