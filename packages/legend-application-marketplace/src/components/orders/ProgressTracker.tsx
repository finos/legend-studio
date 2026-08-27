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
  getOrderProgressSteps,
  getStageActionDetails,
  formatTimestamp,
  WorkflowStage,
  OrderProgressStatus,
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
    const steps = getOrderProgressSteps(order);
    const activeIndex = steps.findIndex(
      (step) =>
        step.status === OrderProgressStatus.ACTIVE ||
        step.status === OrderProgressStatus.PENDING,
    );
    const stepperActiveIndex =
      activeIndex >= 0 ? activeIndex : steps.length - 1;

    return (
      <Box className="legend-marketplace-progress-tracker">
        <Stepper
          alternativeLabel={true}
          activeStep={stepperActiveIndex}
          connector={<CustomConnector />}
        >
          {steps.map((step) => {
            const isCompleted = step.status === OrderProgressStatus.COMPLETED;
            const isActive = step.status === OrderProgressStatus.ACTIVE;
            const isRejected = step.status === OrderProgressStatus.REJECTED;
            const details = getStageActionDetails(order, step.label);
            const hasDetails =
              details !== undefined &&
              (details.actionedBy !== null ||
                details.actionedTimestamp !== null ||
                details.action !== null ||
                details.comment !== null);

            return (
              <Step key={step.label} completed={isCompleted} active={isActive}>
                <StepLabel
                  StepIconComponent={() =>
                    StepIconComponent({
                      active: isActive,
                      completed: isCompleted,
                      rejected: isRejected,
                    })
                  }
                >
                  <Typography className="legend-marketplace-progress-tracker__step-label">
                    {step.label}
                  </Typography>

                  {hasDetails && (
                    <Box className="legend-marketplace-progress-tracker__step-details">
                      {details.actionedBy && (
                        <Typography className="legend-marketplace-progress-tracker__step-detail">
                          <strong>Actioned by:</strong> {details.actionedBy}
                        </Typography>
                      )}
                      {details.actionedTimestamp && (
                        <Typography className="legend-marketplace-progress-tracker__step-detail">
                          <strong>Date:</strong>{' '}
                          {formatTimestamp(details.actionedTimestamp)}
                        </Typography>
                      )}
                      {details.action && (
                        <Typography className="legend-marketplace-progress-tracker__step-detail">
                          <strong>Action:</strong> {details.action}
                        </Typography>
                      )}
                      {details.comment && (
                        <Typography className="legend-marketplace-progress-tracker__step-detail">
                          <strong>Comments:</strong> {details.comment}
                        </Typography>
                      )}
                    </Box>
                  )}

                  {(step.label === WorkflowStage.PENDING_FULFILLMENT ||
                    step.label === WorkflowStage.ORDER_FULFILLED) &&
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
