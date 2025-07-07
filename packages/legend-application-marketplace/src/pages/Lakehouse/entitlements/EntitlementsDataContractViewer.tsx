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
  Dialog,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  Link,
  MenuItem,
  Select,
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
  V1_AccessPointGroupReference,
  V1_AdhocTeam,
  V1_ApprovalType,
  V1_ContractUserEventDataProducerPayload,
  V1_ContractUserEventPrivilegeManagerPayload,
  V1_UserApprovalStatus,
} from '@finos/legend-graph';
import React, { useEffect, useState } from 'react';
import { formatDate, lodashCapitalize } from '@finos/legend-shared';
import {
  isContractInTerminalState,
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
} from '@finos/legend-art';
import { generateLakehouseTaskPath } from '../../../__lib__/LegendMarketplaceNavigation.js';
import type { DataProductViewerState } from '../../../stores/lakehouse/DataProductViewerState.js';
import type { DataProductGroupAccessState } from '../../../stores/lakehouse/DataProductDataAccessState.js';
import { UserRenderer } from '../../../components/UserRenderer/UserRenderer.js';
import type { LegendMarketplaceBaseStore } from '../../../stores/LegendMarketplaceBaseStore.js';

const AssigneesList = (props: {
  userIds: string[];
  marketplaceStore: LegendMarketplaceBaseStore;
}): React.ReactNode => {
  const { userIds, marketplaceStore } = props;
  return userIds.length === 1 ? (
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
        {userIds.map((userId) => (
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
          {lodashCapitalize(taskStatus)} by{' '}
          <UserRenderer
            userId={approverId}
            marketplaceStore={marketplaceStore}
          />
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
    dataProductViewerState?: DataProductViewerState | undefined;
    onClose: () => void;
  }) => {
    const {
      open,
      currentViewer,
      dataProductGroupAccessState,
      dataProductViewerState,
      onClose,
    } = props;
    const auth = useAuth();
    const legendMarketplaceStore = useLegendMarketplaceBaseStore();
    const consumer = currentViewer.value.consumer;
    const [selectedTargetUser, setSelectedTargetUser] = useState<
      string | undefined
    >(consumer instanceof V1_AdhocTeam ? consumer.users[0]?.name : undefined);
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

    const refresh = async (): Promise<void> => {
      setIsLoading(true);
      await flowResult(
        dataProductViewerState?.fetchContracts(auth.user?.access_token),
      );
      if (dataProductGroupAccessState?.associatedContract) {
        dataProductViewerState?.setDataContract(
          dataProductGroupAccessState.associatedContract,
        );
      }
      await flowResult(currentViewer.init(auth.user?.access_token))
        .catch(legendMarketplaceStore.applicationStore.alertUnhandledError)
        .finally(() => setIsLoading(false));
    };

    if (
      !(currentViewer.value.resource instanceof V1_AccessPointGroupReference)
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
            Unable to display data contract request details for this resource.
          </DialogContent>
        </Dialog>
      );
    }

    const dataProduct = currentViewer.value.resource.dataProduct;
    const accessPointGroup = currentViewer.value.resource.accessPointGroup;
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
                <span className="marketplace-lakehouse-text__emphasis">
                  {dataProduct.name}
                </span>{' '}
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
                  <b>Ordered For: </b>
                  {consumer instanceof V1_AdhocTeam ? (
                    consumer.users.length === 1 &&
                    consumer.users[0] !== undefined ? (
                      <UserRenderer
                        key={consumer.users[0].name}
                        userId={consumer.users[0].name}
                        marketplaceStore={legendMarketplaceStore}
                      />
                    ) : (
                      <FormControl size="small">
                        <Select
                          value={selectedTargetUser}
                          onChange={(event) =>
                            setSelectedTargetUser(event.target.value)
                          }
                        >
                          {consumer.users.map((user) => (
                            <MenuItem key={user.name} value={user.name}>
                              <UserRenderer
                                userId={user.name}
                                marketplaceStore={legendMarketplaceStore}
                                disableOnClick={true}
                              />
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
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
