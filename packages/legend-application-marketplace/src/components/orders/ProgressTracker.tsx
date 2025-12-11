/**
 * Copyright (c) 2025-present, Goldman Sachs
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

import React from 'react';
import { observer } from 'mobx-react-lite';
import {
  Box,
  Typography,
  Stepper,
  Step,
  StepLabel,
  StepConnector,
  stepConnectorClasses,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
  CheckCircleIcon,
  CircleIcon,
  TimesCircleIcon,
} from '@finos/legend-art';
import type { TerminalProductOrder } from '@finos/legend-server-marketplace';
import {
  getWorkflowSteps,
  STAGE_MAP,
  isStageCompleted,
  isStageRejected,
  formatTimestamp,
  WorkflowStage,
  WorkflowStatus,
  WorkflowCurrentStage,
} from '../../stores/orders/OrderHelpers.js';

interface ProgressTrackerProps {
  order: TerminalProductOrder;
}

const CustomConnector = styled(StepConnector)(({ theme }) => ({
  [`&.${stepConnectorClasses.alternativeLabel}`]: {
    top: 10,
    left: 'calc(-50% + 16px)',
    right: 'calc(50% + 16px)',
  },
  [`&.${stepConnectorClasses.active}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      borderColor: theme.palette.primary.main,
    },
  },
  [`&.${stepConnectorClasses.completed}`]: {
    [`& .${stepConnectorClasses.line}`]: {
      borderColor: theme.palette.primary.main,
    },
  },
  [`& .${stepConnectorClasses.line}`]: {
    borderColor: theme.palette.grey[400],
    borderTopWidth: 2,
    borderRadius: 1,
  },
}));

const StepIconComponent = (props: {
  active: boolean;
  completed: boolean;
  rejected?: boolean;
}): React.ReactElement => {
  const { active, completed, rejected } = props;

  if (rejected) {
    return (
      <TimesCircleIcon className="legend-marketplace-progress-tracker__step-icon--rejected" />
    );
  }
  if (completed) {
    return (
      <CheckCircleIcon className="legend-marketplace-progress-tracker__step-icon--completed" />
    );
  }
  if (active) {
    return (
      <CircleIcon className="legend-marketplace-progress-tracker__step-icon--active" />
    );
  }
  return (
    <CircleIcon className="legend-marketplace-progress-tracker__step-icon--pending" />
  );
};

export const ProgressTracker: React.FC<ProgressTrackerProps> = observer(
  ({ order }) => {
    const steps = getWorkflowSteps(order);
    const currentStageName = order.workflow_details?.current_stage
      ? STAGE_MAP[order.workflow_details.current_stage as WorkflowCurrentStage]
      : WorkflowStage.ORDER_PLACED;

    const currentStageIndex = steps.indexOf(currentStageName);
    const activeStepIndex = currentStageIndex >= 0 ? currentStageIndex : 0;

    const getFinalStepIndex = (): number => {
      if (!order.workflow_details) {
        return 0;
      }

      for (let i = steps.length - 1; i >= 0; i--) {
        if (
          isStageRejected(order, steps[i] ?? WorkflowStage.ORDER_PLACED) &&
          isStageCompleted(order, steps[i] ?? WorkflowStage.ORDER_PLACED)
        ) {
          return i;
        }
      }

      for (let i = steps.length - 1; i >= 0; i--) {
        if (isStageCompleted(order, steps[i] ?? WorkflowStage.ORDER_PLACED)) {
          return i;
        }
      }

      if (
        order.workflow_details.rpm_ticket_id &&
        order.workflow_details.current_stage === WorkflowCurrentStage.RPM
      ) {
        return steps.indexOf(WorkflowStage.PENDING_FULFILLMENT);
      }

      return activeStepIndex;
    };

    const isClosedOrder =
      order.workflow_details?.workflow_status.toString() ===
      WorkflowStatus.COMPLETED;
    const finalStepIndex = isClosedOrder
      ? getFinalStepIndex()
      : activeStepIndex;

    return (
      <Box className="legend-marketplace-progress-tracker">
        <Stepper
          alternativeLabel={true}
          activeStep={finalStepIndex}
          connector={<CustomConnector />}
        >
          {steps.map((label, index) => {
            const isCompleted = isClosedOrder
              ? index <= finalStepIndex
              : index < activeStepIndex;
            const isActive = !isClosedOrder && index === activeStepIndex;
            const stageCompleted = isStageCompleted(order, label);
            const rejected = isStageRejected(order, label);

            return (
              <Step key={label} completed={isCompleted && !rejected}>
                <StepLabel
                  StepIconComponent={() =>
                    StepIconComponent({
                      active: isActive,
                      completed: isCompleted && !rejected,
                      rejected: rejected && isCompleted,
                    })
                  }
                >
                  <Typography className="legend-marketplace-progress-tracker__step-label">
                    {label}
                  </Typography>

                  {label === WorkflowStage.MANAGER_APPROVAL &&
                    isCompleted &&
                    stageCompleted &&
                    order.workflow_details &&
                    !isActive && (
                      <Box className="legend-marketplace-progress-tracker__step-details">
                        {order.workflow_details.manager_actioned_by && (
                          <Typography className="legend-marketplace-progress-tracker__step-detail">
                            <strong>Actioned by:</strong>{' '}
                            {order.workflow_details.manager_actioned_by}
                          </Typography>
                        )}
                        {order.workflow_details.manager_actioned_timestamp && (
                          <Typography className="legend-marketplace-progress-tracker__step-detail">
                            <strong>Date:</strong>{' '}
                            {formatTimestamp(
                              order.workflow_details.manager_actioned_timestamp,
                            )}
                          </Typography>
                        )}
                        {order.workflow_details.manager_action && (
                          <Typography className="legend-marketplace-progress-tracker__step-detail">
                            <strong>Action:</strong>{' '}
                            {order.workflow_details.manager_action}
                          </Typography>
                        )}
                        {order.workflow_details.manager_comment && (
                          <Typography className="legend-marketplace-progress-tracker__step-detail">
                            <strong>Comments:</strong>{' '}
                            {order.workflow_details.manager_comment}
                          </Typography>
                        )}
                      </Box>
                    )}

                  {label === WorkflowStage.BUSINESS_ANALYST_APPROVAL &&
                    isCompleted &&
                    stageCompleted &&
                    order.workflow_details &&
                    !isActive && (
                      <Box className="legend-marketplace-progress-tracker__step-details">
                        {order.workflow_details.bbg_approval_actioned_by && (
                          <Typography className="legend-marketplace-progress-tracker__step-detail">
                            <strong>Actioned by:</strong>{' '}
                            {order.workflow_details.bbg_approval_actioned_by}
                          </Typography>
                        )}
                        {order.workflow_details
                          .bbg_approval_actioned_timestamp && (
                          <Typography className="legend-marketplace-progress-tracker__step-detail">
                            <strong>Date:</strong>{' '}
                            {formatTimestamp(
                              order.workflow_details
                                .bbg_approval_actioned_timestamp,
                            )}
                          </Typography>
                        )}
                        {order.workflow_details.bbg_approval_action && (
                          <Typography className="legend-marketplace-progress-tracker__step-detail">
                            <strong>Action:</strong>{' '}
                            {order.workflow_details.bbg_approval_action}
                          </Typography>
                        )}
                        {order.workflow_details.bbg_approval_comment && (
                          <Typography className="legend-marketplace-progress-tracker__step-detail">
                            <strong>Comments:</strong>{' '}
                            {order.workflow_details.bbg_approval_comment}
                          </Typography>
                        )}
                      </Box>
                    )}

                  {label === WorkflowStage.PENDING_FULFILLMENT &&
                    order.workflow_details?.rpm_ticket_id && (
                      <Box className="legend-marketplace-progress-tracker__step-details">
                        <Typography className="legend-marketplace-progress-tracker__step-detail">
                          <strong>RPM Ticket:</strong>{' '}
                          {order.workflow_details.rpm_ticket_id}
                        </Typography>
                      </Box>
                    )}
                </StepLabel>
              </Step>
            );
          })}
        </Stepper>
      </Box>
    );
  },
);
