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
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
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
  V1_ContractState,
  V1_ContractUserEventDataProducerPayload,
  V1_ContractUserEventPrivilegeManagerPayload,
  V1_ProducerScope,
  V1_ResourceType,
  V1_SnowflakeTarget,
  V1_UserApprovalStatus,
  V1_UserType,
} from '@finos/legend-graph';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  type UserSearchService,
  assertErrorThrown,
  formatDate,
  lodashCapitalize,
} from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { useAuth } from 'react-oidc-context';
import {
  ArrowUpFromBracketIcon,
  CloseIcon,
  CopyFilledIcon,
  CopyIcon,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  ExpandMoreIcon,
  InfoCircleIcon,
  RefreshIcon,
  TrashIcon,
} from '@finos/legend-art';
import type { EntitlementsDataContractViewerState } from '../../../stores/DataProduct/EntitlementsDataContractViewerState.js';
import {
  getOrganizationalScopeTypeDetails,
  getOrganizationalScopeTypeName,
  stringifyOrganizationalScope,
} from '../../../utils/LakehouseUtils.js';
import { UserRenderer } from '../../UserRenderer/UserRenderer.js';
import { isContractInTerminalState } from '../../../utils/DataContractUtils.js';
import {
  ActionAlertActionType,
  ActionAlertType,
  type GenericLegendApplicationStore,
} from '@finos/legend-application';

const AssigneesList = (props: {
  userIds: string[];
  applicationStore: GenericLegendApplicationStore;
  userSearchService?: UserSearchService | undefined;
}): React.ReactNode => {
  const { userIds, applicationStore, userSearchService } = props;
  return userIds.length === 0 ? (
    <span>No Assignees</span>
  ) : userIds.length === 1 ? (
    <span>
      Assignee:{' '}
      <UserRenderer
        userId={userIds[0]}
        applicationStore={applicationStore}
        userSearchService={userSearchService}
      />
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
            applicationStore={applicationStore}
            userSearchService={userSearchService}
          />
        ))}
      </AccordionDetails>
    </Accordion>
  );
};

const TaskApprovalView = (props: {
  task: V1_TaskMetadata | undefined;
  applicationStore: GenericLegendApplicationStore;
  userSearchService?: UserSearchService | undefined;
}): React.ReactNode => {
  const { task, applicationStore, userSearchService } = props;
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
                applicationStore={applicationStore}
                userSearchService={userSearchService}
              />
            </>
          )}
        </Box>
        <Box className="marketplace-lakehouse-entitlements__data-contract-viewer__task-approval-view__timestamp">
          {task.rec.eventPayload?.eventTimestamp
            ? formatDate(
                new Date(task.rec.eventPayload.eventTimestamp),
                `MM/dd/yyyy HH:mm:ss`,
              )
            : 'Unknown datetime'}
        </Box>
      </Box>
    );
  } else {
    return undefined;
  }
};

const ContractEscalationModal = (props: {
  open: boolean;
  onClose: () => void;
  currentViewer: EntitlementsDataContractViewerState;
  selectedUser: string | undefined;
  refresh: () => Promise<void>;
}) => {
  const { open, onClose, currentViewer, selectedUser, refresh } = props;

  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  if (!selectedUser) {
    return (
      <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth="sm">
        <DialogContent className="marketplace-lakehouse-entitlements__data-contract-viewer__escalation__content">
          <div>
            Can&apos;t escalate privilege manager approval request. No user
            selected.
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} variant="outlined" disabled={isLoading}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  const handleEscalate = async () => {
    setIsLoading(true);
    try {
      await currentViewer.lakehouseContractServerClient.escalateUserOnContract(
        currentViewer.liteContract.guid,
        selectedUser,
        false,
        auth.user?.access_token,
      );
      currentViewer.applicationStore.notificationService.notifySuccess(
        'Successfully escalated contract request',
      );
      // eslint-disable-next-line no-void
      void refresh();
      onClose();
    } catch (error) {
      assertErrorThrown(error);
      currentViewer.applicationStore.alertUnhandledError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth="sm">
      <DialogContent className="marketplace-lakehouse-entitlements__data-contract-viewer__escalation__content">
        <CubesLoadingIndicator isLoading={isLoading}>
          <CubesLoadingIndicatorIcon />
        </CubesLoadingIndicator>
        {!isLoading && (
          <div>
            Are you sure you want to escalate the privilege manager approval
            request?
          </div>
        )}
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            // eslint-disable-next-line no-void
            void handleEscalate();
          }}
          variant="contained"
          disabled={isLoading}
        >
          Escalate
        </Button>
        <Button onClick={onClose} variant="outlined" disabled={isLoading}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const EntitlementsDataContractContent = observer(
  (props: {
    currentViewer: EntitlementsDataContractViewerState;
    getContractTaskUrl: (contractId: string, taskId: string) => string;
    getDataProductUrl: (dataProductId: string, deploymentId: number) => string;
    initialSelectedUser?: string | undefined;
    onRefresh?: (() => void) | (() => Promise<void>);
    isReadOnly?: boolean | undefined;
  }) => {
    const {
      currentViewer,
      getContractTaskUrl,
      getDataProductUrl,
      initialSelectedUser,
      onRefresh,
      isReadOnly,
    } = props;
    const auth = useAuth();
    const consumer = currentViewer.liteContract.consumer;

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
              applicationStore={currentViewer.applicationStore}
              userSearchService={currentViewer.userSearchService}
              disableOnClick={true}
              onFinishedLoadingCallback={finishedLoadingUserCallback}
            />
          </MenuItem>
        )),
      [
        currentViewer.applicationStore,
        currentViewer.userSearchService,
        finishedLoadingUserCallback,
        targetUsers,
      ],
    );

    const [selectedTargetUser, setSelectedTargetUser] = useState<
      string | undefined
    >(initialSelectedUser);

    const [isLoading, setIsLoading] = useState(false);
    const [showEscalationModal, setShowEscalationModal] = useState(false);

    useEffect(() => {
      if (!currentViewer.initializationState.hasCompleted) {
        setIsLoading(true);
        flowResult(currentViewer.init(auth.user?.access_token))
          .catch(currentViewer.applicationStore.alertUnhandledError)
          .finally(() => setIsLoading(false));
      }
    }, [
      auth.user?.access_token,
      currentViewer,
      currentViewer.initializationState,
      currentViewer.initializationState.hasCompleted,
      currentViewer.applicationStore.alertUnhandledError,
    ]);

    useEffect(() => {
      if (selectedTargetUser === undefined && targetUsers?.[0]) {
        setSelectedTargetUser(targetUsers[0]);
      }
    }, [selectedTargetUser, targetUsers]);

    const refresh = async (): Promise<void> => {
      setIsLoading(true);
      currentViewer.initializationState.reset();
      await onRefresh?.();
    };

    const dataProduct = currentViewer.liteContract.resourceId;
    const accessPointGroup = currentViewer.liteContract.accessPointGroup;
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
    const showEscalationButton =
      selectedTargetUser ===
        currentViewer.applicationStore.identityService.currentUser ||
      (selectedTargetUser !== undefined &&
        currentViewer.getContractUserType(selectedTargetUser) ===
          V1_UserType.SYSTEM_ACCOUNT);
    const isContractEscalated =
      privilegeManagerApprovalTask?.rec.isEscalated === true;
    const canEscalateContract = showEscalationButton && !isContractEscalated;

    const copyContractId = (): void => {
      currentViewer.applicationStore.clipboardService
        .copyTextToClipboard(currentViewer.liteContract.guid)
        .then(() =>
          currentViewer.applicationStore.notificationService.notifySuccess(
            'Contract ID Copied to Clipboard',
            undefined,
            2500,
          ),
        )
        .catch(currentViewer.applicationStore.alertUnhandledError);
    };

    const copyTaskLink = (text: string): void => {
      currentViewer.applicationStore.clipboardService
        .copyTextToClipboard(text)
        .then(() =>
          currentViewer.applicationStore.notificationService.notifySuccess(
            'Task Link Copied to Clipboard',
            undefined,
            2500,
          ),
        )
        .catch(currentViewer.applicationStore.alertUnhandledError);
    };

    const checkBeforeClosingContract = (): void => {
      currentViewer.applicationStore.alertService.setActionAlertInfo({
        message: 'Are you sure you want to close this contract?',
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Close Contract',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler: () => {
              const invalidateContract = async (): Promise<void> => {
                try {
                  await flowResult(
                    currentViewer.invalidateContract(auth.user?.access_token),
                  );
                  await refresh();
                } catch (error) {
                  assertErrorThrown(error);
                  currentViewer.applicationStore.notificationService.notifyError(
                    `Error closing contract: ${error.message}`,
                  );
                }
              };
              // eslint-disable-next-line no-void
              void invalidateContract();
            },
          },
          {
            label: 'Cancel',
            type: ActionAlertActionType.PROCEED,
            default: true,
          },
        ],
      });
    };

    const contractMetadataSection = (
      <Box className="marketplace-lakehouse-entitlements__data-contract-viewer__metadata">
        <div className="marketplace-lakehouse-entitlements__data-contract-viewer__metadata__ordered-by">
          <b>Ordered By:&nbsp;</b>
          <UserRenderer
            userId={currentViewer.liteContract.createdBy}
            applicationStore={currentViewer.applicationStore}
            userSearchService={currentViewer.userSearchService}
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
                    currentViewer.applicationStore.pluginManager.getApplicationPlugins(),
                  )}
                  {getOrganizationalScopeTypeDetails(
                    consumer,
                    currentViewer.applicationStore.pluginManager.getApplicationPlugins(),
                  )}
                </>
              }
            >
              <InfoCircleIcon />
            </Tooltip>
            :&nbsp;
          </b>
          {!(consumer instanceof V1_ProducerScope) &&
          targetUsers !== undefined ? (
            isReadOnly || targetUsers.length === 1 ? (
              <UserRenderer
                key={selectedTargetUser ?? targetUsers[0]}
                userId={selectedTargetUser ?? targetUsers[0]}
                applicationStore={currentViewer.applicationStore}
                userSearchService={currentViewer.userSearchService}
              />
            ) : (
              <Select
                value={selectedTargetUser}
                onChange={(event) => setSelectedTargetUser(event.target.value)}
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
          {currentViewer.liteContract.description}
        </div>
      </Box>
    );

    const contractTimelineSteps: {
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
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
              }}
            >
              <Link
                href={getContractTaskUrl(
                  currentViewer.liteContract.guid,
                  privilegeManagerApprovalTask.rec.taskId,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                Privilege Manager Approval
              </Link>
              <IconButton
                onClick={() =>
                  copyTaskLink(
                    getContractTaskUrl(
                      currentViewer.liteContract.guid,
                      privilegeManagerApprovalTask.rec.taskId,
                    ),
                  )
                }
                className="marketplace-lakehouse-entitlements__data-contract-viewer__icon-group"
                title="Copy Task Link"
              >
                <CopyFilledIcon />
                <div className="marketplace-lakehouse-entitlements__data-contract-viewer__icon-label">
                  Copy
                </div>
              </IconButton>
              {showEscalationButton && (
                <span
                  title={
                    canEscalateContract
                      ? 'Escalate request'
                      : isContractEscalated
                        ? 'Request has already been escalated'
                        : 'Cannot escalate request'
                  }
                >
                  <IconButton
                    onClick={() => setShowEscalationModal(true)}
                    disabled={!canEscalateContract}
                    className="marketplace-lakehouse-entitlements__data-contract-viewer__icon-group"
                  >
                    <ArrowUpFromBracketIcon />
                    <div className="marketplace-lakehouse-entitlements__data-contract-viewer__icon-label">
                      Escalate
                    </div>
                  </IconButton>
                </span>
              )}
            </Box>
          ) : (
            <>Privilege Manager Approval</>
          ),
        isCompleteOrActive: true,
        description:
          privilegeManagerApprovalTask?.rec.status ===
          V1_UserApprovalStatus.PENDING ? (
            <AssigneesList
              userIds={privilegeManagerApprovalTask.assignees}
              applicationStore={currentViewer.applicationStore}
              userSearchService={currentViewer.userSearchService}
            />
          ) : (
            <TaskApprovalView
              task={privilegeManagerApprovalTask}
              applicationStore={currentViewer.applicationStore}
              userSearchService={currentViewer.userSearchService}
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
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
              }}
            >
              <Link
                href={getContractTaskUrl(
                  currentViewer.liteContract.guid,
                  dataOwnerApprovalTask.rec.taskId,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                Data Producer Approval
              </Link>
              <IconButton
                onClick={() =>
                  copyTaskLink(
                    getContractTaskUrl(
                      currentViewer.liteContract.guid,
                      dataOwnerApprovalTask.rec.taskId,
                    ),
                  )
                }
                className="marketplace-lakehouse-entitlements__data-contract-viewer__icon-group"
                title="Copy Task Link"
              >
                <CopyFilledIcon />
                <div className="marketplace-lakehouse-entitlements__data-contract-viewer__icon-label">
                  Copy
                </div>
              </IconButton>
            </Box>
          ) : (
            <>Data Producer Approval</>
          ),
        isCompleteOrActive: dataOwnerApprovalTask !== undefined,
        description:
          dataOwnerApprovalTask?.rec.status ===
          V1_UserApprovalStatus.PENDING ? (
            <AssigneesList
              userIds={dataOwnerApprovalTask.assignees}
              applicationStore={currentViewer.applicationStore}
              userSearchService={currentViewer.userSearchService}
            />
          ) : dataOwnerApprovalTask !== undefined ? (
            <TaskApprovalView
              task={dataOwnerApprovalTask}
              applicationStore={currentViewer.applicationStore}
              userSearchService={currentViewer.userSearchService}
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

    const contractTimelineSection =
      currentViewer.liteContract.resourceType ===
      V1_ResourceType.ACCESS_POINT_GROUP ? (
        <Box className="marketplace-lakehouse-entitlements__data-contract-viewer__timeline">
          <Timeline>
            {contractTimelineSteps.map((step, index) => (
              <TimelineItem key={step.key}>
                <TimelineOppositeContent className="marketplace-lakehouse-entitlements__data-contract-viewer__timeline__content">
                  {step.label}
                </TimelineOppositeContent>
                <TimelineSeparator>
                  <TimelineDot
                    color={step.isDeniedStep ? 'error' : 'primary'}
                    variant={step.isCompleteOrActive ? 'filled' : 'outlined'}
                  />
                  {index < contractTimelineSteps.length - 1 && (
                    <TimelineConnector />
                  )}
                </TimelineSeparator>
                <TimelineContent className="marketplace-lakehouse-entitlements__data-contract-viewer__timeline__content">
                  {step.description}
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        </Box>
      ) : (
        <Box className="marketplace-lakehouse-entitlements__data-contract-viewer__timeline">
          Unable to display data contract tasks for resource of type{' '}
          {currentViewer.liteContract.resourceType} on data product{' '}
          {currentViewer.liteContract.resourceId}.
        </Box>
      );

    return (
      <>
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
                href={getDataProductUrl(
                  dataProduct,
                  currentViewer.liteContract.deploymentId,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                {dataProduct}
              </Link>{' '}
              Data Product
            </div>
            {contractMetadataSection}
            {!isContractInTerminalState(currentViewer.liteContract) && (
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
            {contractTimelineSection}
          </>
        )}

        <Box className="marketplace-lakehouse-entitlements__data-contract-viewer__footer">
          {currentViewer.subscription !== undefined && (
            <Alert
              severity="info"
              className="marketplace-lakehouse-entitlements__data-contract-viewer__footer__subscription-info"
            >
              A subscription has been auto-created for you
              {currentViewer.subscription.target instanceof V1_SnowflakeTarget
                ? ` with Snowflake account ${currentViewer.subscription.target.snowflakeAccountId}`
                : ''}
              .
            </Alert>
          )}
          <Box className="marketplace-lakehouse-entitlements__data-contract-viewer__footer__contract-details">
            <Box>
              Contract ID: {currentViewer.liteContract.guid}
              <IconButton
                onClick={() => copyContractId()}
                title="Copy Contract ID"
              >
                <CopyIcon />
              </IconButton>
            </Box>
            <span
              title={
                currentViewer.liteContract.state === V1_ContractState.CLOSED
                  ? 'Contract is already closed'
                  : 'Close Contract'
              }
            >
              <IconButton
                onClick={() => checkBeforeClosingContract()}
                disabled={
                  currentViewer.initializationState.isInProgress ||
                  currentViewer.invalidatingContractState.isInProgress ||
                  currentViewer.liteContract.state === V1_ContractState.CLOSED
                }
                className="marketplace-lakehouse-entitlements__data-contract-viewer__footer__contract-details__close-contract-btn"
              >
                <TrashIcon />
              </IconButton>
            </span>
          </Box>
        </Box>

        <ContractEscalationModal
          open={showEscalationModal && canEscalateContract}
          onClose={() => setShowEscalationModal(false)}
          currentViewer={currentViewer}
          selectedUser={selectedTargetUser}
          refresh={refresh}
        />
      </>
    );
  },
);

export const EntitlementsDataContractViewer = observer(
  (props: {
    open: boolean;
    onClose: () => void;
    currentViewer: EntitlementsDataContractViewerState;
    getContractTaskUrl: (contractId: string, taskId: string) => string;
    getDataProductUrl: (dataProductId: string, deploymentId: number) => string;
    initialSelectedUser?: string | undefined;
    onRefresh?: (() => void) | (() => Promise<void>);
    isReadOnly?: boolean | undefined;
  }) => {
    const { open, onClose, currentViewer, ...contentProps } = props;

    const isContractInProgressForUser =
      currentViewer.associatedTasks?.some(
        (task) => task.rec.status === V1_UserApprovalStatus.PENDING,
      ) ?? false;

    return (
      <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth="md">
        <DialogTitle>
          {isContractInProgressForUser ? 'Pending ' : ''}Data Contract Request
        </DialogTitle>
        <IconButton onClick={onClose} className="marketplace-dialog-close-btn">
          <CloseIcon />
        </IconButton>
        <DialogContent className="marketplace-lakehouse-entitlements__data-contract-viewer__content">
          <EntitlementsDataContractContent
            currentViewer={currentViewer}
            {...contentProps}
          />
        </DialogContent>
      </Dialog>
    );
  },
);
