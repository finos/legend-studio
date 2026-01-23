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

import type { TerminalProductOrder } from '@finos/legend-server-marketplace';

export enum WorkflowStage {
  ORDER_PLACED = 'Order Placed',
  MANAGER_APPROVAL = 'Manager Approval',
  BUSINESS_ANALYST_APPROVAL = 'Business Analyst Approval',
  PENDING_FULFILLMENT = 'Pending Fulfillment',
  CANCELLED = 'Cancelled',
}

export enum WorkflowStatus {
  COMPLETED = 'COMPLETED',
}

export enum OrderType {
  CANCELLATION = 'CANCELLATION',
}

export enum WorkflowCurrentStage {
  DIRECT_MANAGER = 'DIRECT MANAGER',
  BUSINESS_ANALYST = 'Business Analyst',
  RPM = 'RPM',
}

export enum RejectedActionStatus {
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  AUTO_CANCELLED = 'auto cancelled',
  DENIED = 'denied',
}

export const STAGE_MAP: Record<WorkflowCurrentStage, WorkflowStage> = {
  [WorkflowCurrentStage.DIRECT_MANAGER]: WorkflowStage.MANAGER_APPROVAL,
  [WorkflowCurrentStage.BUSINESS_ANALYST]:
    WorkflowStage.BUSINESS_ANALYST_APPROVAL,
  [WorkflowCurrentStage.RPM]: WorkflowStage.PENDING_FULFILLMENT,
};

export const getWorkflowSteps = (
  order: TerminalProductOrder,
): WorkflowStage[] => {
  if (order.order_type.toUpperCase() === OrderType.CANCELLATION) {
    return [
      WorkflowStage.ORDER_PLACED,
      WorkflowStage.MANAGER_APPROVAL,
      WorkflowStage.CANCELLED,
    ];
  }

  return [
    WorkflowStage.ORDER_PLACED,
    WorkflowStage.MANAGER_APPROVAL,
    WorkflowStage.PENDING_FULFILLMENT,
  ];
};

export const getProcessInstanceId = (
  order: TerminalProductOrder,
): string | null => {
  if (!order.workflow_details) {
    return null;
  }

  if (
    order.workflow_details.current_stage === WorkflowCurrentStage.DIRECT_MANAGER
  ) {
    return order.workflow_details.piid_manager;
  } else if (
    order.workflow_details.current_stage ===
    WorkflowCurrentStage.BUSINESS_ANALYST
  ) {
    return order.workflow_details.bbg_approval_process_id;
  }
  return null;
};

export const canCancelOrder = (order: TerminalProductOrder): boolean => {
  const currentStage = order.workflow_details?.current_stage;
  return (
    currentStage === WorkflowCurrentStage.DIRECT_MANAGER ||
    currentStage === WorkflowCurrentStage.BUSINESS_ANALYST
  );
};

export const isStageCompleted = (
  order: TerminalProductOrder,
  stageName: string,
): boolean => {
  if (!order.workflow_details) {
    return false;
  }

  if (stageName === WorkflowStage.MANAGER_APPROVAL) {
    return !!order.workflow_details.manager_actioned_by;
  } else if (stageName === WorkflowStage.BUSINESS_ANALYST_APPROVAL) {
    return !!order.workflow_details.bbg_approval_actioned_by;
  }
  return false;
};

export const isStageRejected = (
  order: TerminalProductOrder,
  stageName: string,
): boolean => {
  if (!order.workflow_details) {
    return false;
  }

  const rejectedStatuses = Object.values(RejectedActionStatus);

  if (stageName === WorkflowStage.MANAGER_APPROVAL) {
    return rejectedStatuses.some((status) =>
      order.workflow_details?.manager_action
        ?.toLowerCase()
        .includes(status.toLowerCase()),
    );
  } else if (stageName === WorkflowStage.BUSINESS_ANALYST_APPROVAL) {
    return rejectedStatuses.some((status) =>
      order.workflow_details?.bbg_approval_action
        ?.toLowerCase()
        .includes(status.toLowerCase()),
    );
  } else if (stageName === WorkflowStage.PENDING_FULFILLMENT) {
    return rejectedStatuses.some((status) =>
      order.workflow_details?.rpm_action
        ?.toLowerCase()
        .includes(status.toLowerCase()),
    );
  }
  return false;
};

export const formatOrderDate = (dateString?: string): string | undefined => {
  return dateString
    ? new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : undefined;
};

export const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
