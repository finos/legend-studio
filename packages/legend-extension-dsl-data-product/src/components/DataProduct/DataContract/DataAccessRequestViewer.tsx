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
  V1_ProducerScope,
  V1_ResourceType,
  V1_SnowflakeTarget,
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
  CheckIcon,
  CloseIcon,
  clsx,
  CopyFilledIcon,
  CopyIcon,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  ExpandMoreIcon,
  InfoCircleIcon,
  RefreshIcon,
  TimesIcon,
  TrashIcon,
} from '@finos/legend-art';
import {
  getOrganizationalScopeTypeDetails,
  getOrganizationalScopeTypeName,
  stringifyOrganizationalScope,
} from '../../../utils/LakehouseUtils.js';
import { UserRenderer } from '../../UserRenderer/UserRenderer.js';

import {
  ActionAlertActionType,
  ActionAlertType,
  type GenericLegendApplicationStore,
} from '@finos/legend-application';
import {
  DataAccessRequestStatus,
  type DataAccessRequestState,
} from '../../../stores/DataProduct/DataAccess/DataAccessRequestState.js';

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
      className="marketplace-lakehouse-entitlements__data-access-request-viewer__user-list__container"
      elevation={0}
      disableGutters={true}
      defaultExpanded={true}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        Assignees ({userIds.length}):
      </AccordionSummary>
      <AccordionDetails className="marketplace-lakehouse-entitlements__data-access-request-viewer__user-list">
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
  status: string;
  approverId?: string | undefined;
  timestamp?: string | undefined;
  applicationStore: GenericLegendApplicationStore;
  userSearchService?: UserSearchService | undefined;
}): React.ReactNode => {
  const { status, approverId, timestamp, applicationStore, userSearchService } =
    props;

  return (
    <Box className="marketplace-lakehouse-entitlements__data-access-request-viewer__task-approval-view">
      <Box>
        {lodashCapitalize(status)}
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
      <Box className="marketplace-lakehouse-entitlements__data-access-request-viewer__task-approval-view__timestamp">
        {timestamp !== undefined
          ? formatDate(new Date(timestamp), `MM/dd/yyyy HH:mm:ss`)
          : 'Unknown datetime'}
      </Box>
    </Box>
  );
};

const RequestEscalationModal = (props: {
  open: boolean;
  onClose: () => void;
  viewerState: DataAccessRequestState;
  selectedUser: string | undefined;
  refresh: () => Promise<void>;
}) => {
  const { open, onClose, viewerState, selectedUser, refresh } = props;

  const auth = useAuth();

  if (!selectedUser) {
    return (
      <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth="sm">
        <DialogContent className="marketplace-lakehouse-entitlements__data-access-request-viewer__escalation__content">
          <div>
            Can&apos;t escalate privilege manager approval request. No user
            selected.
          </div>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={onClose}
            variant="outlined"
            disabled={viewerState.escalatingState.isInProgress}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  const handleEscalate = async () => {
    try {
      await flowResult(
        viewerState.escalateRequest?.(selectedUser, auth.user?.access_token),
      );
      // eslint-disable-next-line no-void
      void refresh();
      viewerState.applicationStore.notificationService.notifySuccess(
        'Successfully escalated access request',
      );
      onClose();
    } catch (error) {
      assertErrorThrown(error);
      viewerState.applicationStore.notificationService.notifyError(
        `Error escalating request: ${error.message}`,
      );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth="sm">
      <DialogContent className="marketplace-lakehouse-entitlements__data-access-request-viewer__escalation__content">
        <CubesLoadingIndicator
          isLoading={viewerState.escalatingState.isInProgress}
        >
          <CubesLoadingIndicatorIcon />
        </CubesLoadingIndicator>
        {!viewerState.escalatingState.isInProgress && (
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
          disabled={viewerState.escalatingState.isInProgress}
        >
          Escalate
        </Button>
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={viewerState.escalatingState.isInProgress}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const DataAccessRequestContent = observer(
  (props: {
    viewerState: DataAccessRequestState;
    getDataProductUrl: (dataProductId: string, deploymentId: number) => string;
    initialSelectedUser?: string | undefined;
    onRefresh?: (() => void) | (() => Promise<void>);
    isReadOnly?: boolean | undefined;
  }) => {
    const {
      viewerState,
      getDataProductUrl,
      initialSelectedUser,
      onRefresh,
      isReadOnly,
    } = props;
    const auth = useAuth();
    const consumer = viewerState.consumer;

    const targetUsers = viewerState.targetUsers;

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
              applicationStore={viewerState.applicationStore}
              userSearchService={viewerState.userSearchService}
              disableOnClick={true}
              onFinishedLoadingCallback={finishedLoadingUserCallback}
            />
          </MenuItem>
        )),
      [
        viewerState.applicationStore,
        viewerState.userSearchService,
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
      if (!viewerState.initializationState.hasCompleted) {
        setIsLoading(true);
        flowResult(viewerState.init(auth.user?.access_token))
          .catch(viewerState.applicationStore.alertUnhandledError)
          .finally(() => setIsLoading(false));
      }
    }, [
      auth.user?.access_token,
      viewerState,
      viewerState.initializationState,
      viewerState.initializationState.hasCompleted,
      viewerState.applicationStore.alertUnhandledError,
    ]);

    useEffect(() => {
      if (selectedTargetUser === undefined) {
        setSelectedTargetUser(initialSelectedUser ?? targetUsers?.[0]);
      }
    }, [selectedTargetUser, initialSelectedUser, targetUsers]);

    const refresh = async (): Promise<void> => {
      setIsLoading(true);
      viewerState.initializationState.reset();
      await onRefresh?.();
    };

    const dataProduct = viewerState.resourceId;
    const accessPointGroup = viewerState.accessPointGroup;
    const timelineSteps = viewerState.getTimelineSteps(selectedTargetUser);

    const copyToClipboard = (text: string): void => {
      viewerState.applicationStore.clipboardService
        .copyTextToClipboard(text)
        .then(() =>
          viewerState.applicationStore.notificationService.notifySuccess(
            'Copied to Clipboard',
            undefined,
            2500,
          ),
        )
        .catch(viewerState.applicationStore.alertUnhandledError);
    };

    const checkBeforeClosingRequest = (): void => {
      viewerState.applicationStore.alertService.setActionAlertInfo({
        message: 'Are you sure you want to close this request?',
        type: ActionAlertType.CAUTION,
        actions: [
          {
            label: 'Close Request',
            type: ActionAlertActionType.PROCEED_WITH_CAUTION,
            handler: () => {
              const invalidateRequest = async (): Promise<void> => {
                try {
                  await flowResult(
                    viewerState.invalidateRequest?.(auth.user?.access_token),
                  );
                  await refresh();
                } catch (error) {
                  assertErrorThrown(error);
                  viewerState.applicationStore.notificationService.notifyError(
                    `Error closing request: ${error.message}`,
                  );
                }
              };
              // eslint-disable-next-line no-void
              void invalidateRequest();
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

    const metadataSection = (
      <Box className="marketplace-lakehouse-entitlements__data-access-request-viewer__metadata">
        <div className="marketplace-lakehouse-entitlements__data-access-request-viewer__metadata__ordered-by">
          <b>Ordered By:&nbsp;</b>
          <UserRenderer
            userId={viewerState.createdBy}
            applicationStore={viewerState.applicationStore}
            userSearchService={viewerState.userSearchService}
          />
        </div>
        <div className="marketplace-lakehouse-entitlements__data-access-request-viewer__metadata__ordered-for">
          <b>
            Ordered For
            <Tooltip
              className="marketplace-lakehouse-entitlements__data-access-request-viewer__metadata__ordered-for__tooltip__icon"
              title={
                <>
                  Request consumer type:{' '}
                  {getOrganizationalScopeTypeName(
                    consumer,
                    viewerState.applicationStore.pluginManager.getApplicationPlugins(),
                  )}
                  {getOrganizationalScopeTypeDetails(
                    consumer,
                    viewerState.applicationStore.pluginManager.getApplicationPlugins(),
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
                applicationStore={viewerState.applicationStore}
                userSearchService={viewerState.userSearchService}
              />
            ) : (
              <Select
                value={selectedTargetUser}
                onChange={(event) => setSelectedTargetUser(event.target.value)}
                size="small"
                className="marketplace-lakehouse-entitlements__data-access-request-viewer__metadata__ordered-for__select"
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
          {viewerState.description}
        </div>
        <div>
          <b>Date Created: </b>
          {formatDate(new Date(viewerState.createdAt), 'MMM d, yyyy')}
        </div>
      </Box>
    );

    const timelineSection =
      viewerState.resourceType === V1_ResourceType.ACCESS_POINT_GROUP ? (
        <Box className="marketplace-lakehouse-entitlements__data-access-request-viewer__timeline">
          <Timeline>
            {timelineSteps.map((step, index) => (
              <TimelineItem key={step.key}>
                <TimelineOppositeContent
                  className={clsx(
                    'marketplace-lakehouse-entitlements__data-access-request-viewer__timeline__content',
                    {
                      'marketplace-lakehouse-entitlements__data-access-request-viewer__timeline__content--with-button':
                        step.status === 'active',
                    },
                  )}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '1rem',
                    }}
                  >
                    {step.label.link ? (
                      <>
                        <Link
                          href={step.label.link}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {step.label.title}
                        </Link>
                        <IconButton
                          onClick={() => copyToClipboard(step.label.link ?? '')}
                          className="marketplace-lakehouse-entitlements__data-access-request-viewer__icon-group"
                          title="Copy Task Link"
                        >
                          <CopyFilledIcon />
                          <div className="marketplace-lakehouse-entitlements__data-access-request-viewer__icon-label">
                            Copy
                          </div>
                        </IconButton>
                      </>
                    ) : (
                      step.label.title
                    )}
                    {step.label.showEscalateButton && (
                      <span
                        title={
                          step.label.isEscalatable
                            ? 'Escalate request'
                            : step.label.isEscalated
                              ? 'Request has already been escalated'
                              : 'Cannot escalate request'
                        }
                      >
                        <IconButton
                          onClick={() => setShowEscalationModal(true)}
                          disabled={!step.label.isEscalatable}
                          className="marketplace-lakehouse-entitlements__data-access-request-viewer__icon-group"
                        >
                          <ArrowUpFromBracketIcon />
                          <div className="marketplace-lakehouse-entitlements__data-access-request-viewer__icon-label">
                            Escalate
                          </div>
                        </IconButton>
                      </span>
                    )}
                  </Box>
                </TimelineOppositeContent>
                <TimelineSeparator>
                  <TimelineDot
                    color={
                      step.status === 'denied'
                        ? 'error'
                        : step.status === 'skipped'
                          ? 'grey'
                          : 'primary'
                    }
                    variant={step.status === 'upcoming' ? 'outlined' : 'filled'}
                    title={
                      step.status === 'skipped'
                        ? 'This step was skipped because it is not required for this access request'
                        : undefined
                    }
                  >
                    {step.status === 'complete' && <CheckIcon />}
                    {step.status === 'denied' && <TimesIcon />}
                  </TimelineDot>
                  {index < timelineSteps.length - 1 && <TimelineConnector />}
                </TimelineSeparator>
                <TimelineContent className="marketplace-lakehouse-entitlements__data-access-request-viewer__timeline__content">
                  {step.assignees ? (
                    <AssigneesList
                      userIds={step.assignees}
                      applicationStore={viewerState.applicationStore}
                      userSearchService={viewerState.userSearchService}
                    />
                  ) : step.approvalPayload ? (
                    <TaskApprovalView
                      status={step.approvalPayload.status}
                      timestamp={step.approvalPayload.approvalTimestamp}
                      approverId={step.approvalPayload.approverId}
                      applicationStore={viewerState.applicationStore}
                      userSearchService={viewerState.userSearchService}
                    />
                  ) : null}
                </TimelineContent>
              </TimelineItem>
            ))}
          </Timeline>
        </Box>
      ) : (
        <Box className="marketplace-lakehouse-entitlements__data-access-request-viewer__timeline">
          Unable to display access request tasks for resource of type{' '}
          {viewerState.resourceType} on data product {viewerState.resourceId}.
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
                href={getDataProductUrl(dataProduct, viewerState.deploymentId)}
                target="_blank"
                rel="noopener noreferrer"
              >
                {dataProduct}
              </Link>{' '}
              Data Product
            </div>
            {metadataSection}
            {!viewerState.isInTerminalState && (
              <Box className="marketplace-lakehouse-entitlements__data-access-request-viewer__refresh-btn">
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
            {timelineSection}
          </>
        )}

        <Box className="marketplace-lakehouse-entitlements__data-access-request-viewer__footer">
          {viewerState.subscription !== undefined && (
            <Alert
              severity="info"
              className="marketplace-lakehouse-entitlements__data-access-request-viewer__footer__subscription-info"
            >
              A subscription has been auto-created for you
              {viewerState.subscription.target instanceof V1_SnowflakeTarget
                ? ` with Snowflake account ${viewerState.subscription.target.snowflakeAccountId}`
                : ''}
              .
            </Alert>
          )}
          <Box className="marketplace-lakehouse-entitlements__data-access-request-viewer__footer__request-details">
            <Box>
              Request ID: {viewerState.guid}
              <IconButton
                onClick={() => copyToClipboard(viewerState.guid)}
                title="Copy Request ID"
              >
                <CopyIcon />
              </IconButton>
            </Box>
            {viewerState.invalidateRequest !== undefined && (
              <span
                title={
                  viewerState.status === DataAccessRequestStatus.CLOSED
                    ? 'Request is already closed'
                    : 'Close Request'
                }
              >
                <IconButton
                  onClick={() => checkBeforeClosingRequest()}
                  disabled={
                    viewerState.initializationState.isInProgress ||
                    viewerState.invalidatingState.isInProgress ||
                    viewerState.status === DataAccessRequestStatus.CLOSED
                  }
                  className="marketplace-lakehouse-entitlements__data-access-request-viewer__footer__request-details__close-request-btn"
                >
                  <TrashIcon />
                </IconButton>
              </span>
            )}
          </Box>
        </Box>
        <RequestEscalationModal
          open={showEscalationModal}
          onClose={() => setShowEscalationModal(false)}
          viewerState={viewerState}
          selectedUser={selectedTargetUser}
          refresh={refresh}
        />
      </>
    );
  },
);

export const DataAccessRequestViewer = observer(
  (props: {
    open: boolean;
    onClose: () => void;
    viewerState: DataAccessRequestState;
    getDataProductUrl: (dataProductId: string, deploymentId: number) => string;
    initialSelectedUser?: string | undefined;
    onRefresh?: (() => void) | (() => Promise<void>);
    isReadOnly?: boolean | undefined;
  }) => {
    const { open, onClose, viewerState, ...contentProps } = props;

    const isRequestInProgress = viewerState.isInProgress;

    return (
      <Dialog open={open} onClose={onClose} fullWidth={true} maxWidth="md">
        <DialogTitle>
          {isRequestInProgress ? 'Pending ' : ''}Data Access Request
        </DialogTitle>
        <IconButton onClick={onClose} className="marketplace-dialog-close-btn">
          <CloseIcon />
        </IconButton>
        <DialogContent className="marketplace-lakehouse-entitlements__data-access-request-viewer__content">
          <DataAccessRequestContent
            viewerState={viewerState}
            {...contentProps}
          />
        </DialogContent>
      </Dialog>
    );
  },
);
