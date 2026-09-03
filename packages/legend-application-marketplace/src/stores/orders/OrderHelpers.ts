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

import {
  OrderStatus,
  OrderSearchStatus,
  type TerminalProductOrder,
  type WorkflowDetails,
} from '@finos/legend-server-marketplace';
import { type LegendUser } from '@finos/legend-shared';

export enum WorkflowStage {
  ORDER_PLACED = 'Order Placed',
  MANAGER_APPROVAL = 'Privilege Manager Approval',
  FIRST_APPROVER = 'Market Data - First Approver',
  FULFILLMENT_APPROVER = 'Market Data - Fulfillment Approver',
  BUSINESS_ANALYST_APPROVAL = 'Market Data -Business Analyst Approval',
  PENDING_FULFILLMENT = 'Pending Fulfillment',
  ORDER_FULFILLED = 'Order Fulfilled',
}

export enum OrderType {
  PROVISION = 'PROVISION',
  CANCELLATION = 'CANCELLATION',
}

export enum WorkflowCurrentStage {
  DIRECT_MANAGER = 'DIRECT MANAGER',
  // Confirmed against a live backend payload (2026-09-01): the stage is named
  // "MANAGER", not "APPROVER" as previously assumed.
  FULFILLMENT_APPROVER = 'MARKET DATA FULFILLMENT MANAGER',
  FIRST_APPROVER = 'MARKET DATA FIRST APPROVER',
  // NOTE: not confirmed against a live backend payload - inferred from the
  // naming convention of the other Market Data approval stages above. Given
  // FULFILLMENT_APPROVER's guessed value above turned out to be wrong, this
  // value should be verified against a real payload where `current_stage`
  // reaches the Business Analyst stage before being relied upon.
  BUSINESS_ANALYST = 'Business Analyst',
  RPM = 'RPM',
}

/**
 * The resolved visual status of a single progress-tracker step.
 */
export enum OrderProgressStatus {
  COMPLETED = 'completed',
  ACTIVE = 'active',
  REJECTED = 'rejected',
  PENDING = 'pending',
}

/**
 * A single, ordered step of the progress tracker along with its resolved
 * visual status, derived from the order's workflow/approval data.
 */
export interface OrderProgressStep {
  label: string;
  status: OrderProgressStatus;
}

export interface StageActionDetails {
  actionedBy: string | null;
  actionedTimestamp: string | null;
  action: string | null;
  comment: string | null;
}

type ApprovalStage =
  | WorkflowStage.MANAGER_APPROVAL
  | WorkflowStage.FIRST_APPROVER
  | WorkflowStage.FULFILLMENT_APPROVER
  | WorkflowStage.BUSINESS_ANALYST_APPROVAL;

const APPROVED_ACTION = 'APPROVED';
// Terminal, non-approved outcomes an individual approval stage (or the
// overall order) can end up in.
const REJECTED_STATUSES = new Set(['REJECTED', 'CANCELLED', 'AUTO TERMINATED']);

const APPROVAL_STAGE_DETAIL_FIELDS: Record<
  ApprovalStage,
  {
    actionedBy: keyof WorkflowDetails;
    actionedTimestamp: keyof WorkflowDetails;
    action: keyof WorkflowDetails;
    comment: keyof WorkflowDetails;
  }
> = {
  [WorkflowStage.MANAGER_APPROVAL]: {
    actionedBy: 'manager_actioned_by_name',
    actionedTimestamp: 'manager_actioned_timestamp',
    action: 'manager_action',
    comment: 'manager_comment',
  },
  [WorkflowStage.FIRST_APPROVER]: {
    actionedBy: 'fa_approval_actioned_by_name',
    actionedTimestamp: 'fa_approval_actioned_timestamp',
    action: 'fa_approval_action',
    comment: 'fa_approval_comment',
  },
  [WorkflowStage.FULFILLMENT_APPROVER]: {
    actionedBy: 'ffa_approval_actioned_by_name',
    actionedTimestamp: 'ffa_approval_actioned_timestamp',
    action: 'ffa_approval_action',
    comment: 'ffa_approval_comment',
  },
  [WorkflowStage.BUSINESS_ANALYST_APPROVAL]: {
    actionedBy: 'bbg_approval_actioned_by_name',
    actionedTimestamp: 'bbg_approval_actioned_timestamp',
    action: 'bbg_approval_action',
    comment: 'bbg_approval_comment',
  },
};

const normalizeStatus = (value: string | null | undefined): string =>
  (value ?? '').trim().toUpperCase();

const toTitleCase = (value: string): string =>
  value
    .toLowerCase()
    .split(' ')
    .filter((word) => word.length > 0)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');

const getApprovalActionStatus = (
  details: WorkflowDetails | undefined,
  stage: ApprovalStage,
): 'approved' | 'rejected' | 'pending' => {
  const action = normalizeStatus(
    details?.[APPROVAL_STAGE_DETAIL_FIELDS[stage].action],
  );
  if (action === APPROVED_ACTION) {
    return 'approved';
  }
  if (REJECTED_STATUSES.has(action)) {
    return 'rejected';
  }
  return 'pending';
};

const getProvisionProgressSteps = (
  order: TerminalProductOrder,
): OrderProgressStep[] => {
  const details = order.workflow_details;
  const approvalStages: ApprovalStage[] = order.bbg_terminal_flag
    ? [
        WorkflowStage.MANAGER_APPROVAL,
        WorkflowStage.FIRST_APPROVER,
        WorkflowStage.FULFILLMENT_APPROVER,
        WorkflowStage.BUSINESS_ANALYST_APPROVAL,
      ]
    : [WorkflowStage.MANAGER_APPROVAL, WorkflowStage.FIRST_APPROVER];

  const isClosed = details?.workflow_status === OrderStatus.COMPLETED;
  const steps: OrderProgressStep[] = [
    {
      label: WorkflowStage.ORDER_PLACED,
      status: OrderProgressStatus.COMPLETED,
    },
  ];

  // Once an approval stage is rejected (or is still outstanding), every
  // subsequent stage - including final fulfillment - can never be reached.
  let allApprovalsPassed = true;
  for (const stage of approvalStages) {
    if (!allApprovalsPassed) {
      steps.push({ label: stage, status: OrderProgressStatus.PENDING });
      continue;
    }

    const actionStatus = getApprovalActionStatus(details, stage);
    if (actionStatus === 'approved') {
      steps.push({ label: stage, status: OrderProgressStatus.COMPLETED });
    } else if (actionStatus === 'rejected') {
      steps.push({ label: stage, status: OrderProgressStatus.REJECTED });
      allApprovalsPassed = false;
    } else {
      steps.push({
        label: stage,
        status: isClosed
          ? OrderProgressStatus.PENDING
          : OrderProgressStatus.ACTIVE,
      });
      allApprovalsPassed = false;
    }
  }

  if (!allApprovalsPassed) {
    steps.push({
      label: WorkflowStage.PENDING_FULFILLMENT,
      status: OrderProgressStatus.PENDING,
    });
    return steps;
  }

  if (!isClosed) {
    steps.push({
      label: WorkflowStage.PENDING_FULFILLMENT,
      status: OrderProgressStatus.ACTIVE,
    });
    return steps;
  }

  const orderStatus = normalizeStatus(order.status);
  if (REJECTED_STATUSES.has(orderStatus)) {
    steps.push({
      label: `Order ${toTitleCase(order.status)}`,
      status: OrderProgressStatus.REJECTED,
    });
  } else {
    steps.push({
      label: WorkflowStage.ORDER_FULFILLED,
      status: OrderProgressStatus.COMPLETED,
    });
  }
  return steps;
};

const getCancellationProgressSteps = (
  order: TerminalProductOrder,
): OrderProgressStep[] => {
  const orderPlaced: OrderProgressStep = {
    label: WorkflowStage.ORDER_PLACED,
    status: OrderProgressStatus.COMPLETED,
  };
  const status = normalizeStatus(order.status);

  if (status === 'IN PROGRESS') {
    return [
      orderPlaced,
      {
        label: WorkflowStage.PENDING_FULFILLMENT,
        status: OrderProgressStatus.ACTIVE,
      },
    ];
  }
  if (status === APPROVED_ACTION) {
    return [
      orderPlaced,
      {
        label: WorkflowStage.ORDER_FULFILLED,
        status: OrderProgressStatus.COMPLETED,
      },
    ];
  }
  return [
    orderPlaced,
    {
      label: `Order ${toTitleCase(order.status)}`,
      status: OrderProgressStatus.REJECTED,
    },
  ];
};

/**
 * Resolves the ordered list of progress-tracker steps (and each step's
 * visual status) for an order, based on its `order_type`, `bbg_terminal_flag`,
 * and workflow/approval action data.
 */
export const getOrderProgressSteps = (
  order: TerminalProductOrder,
): OrderProgressStep[] =>
  order.order_type.toUpperCase() === OrderType.CANCELLATION
    ? getCancellationProgressSteps(order)
    : getProvisionProgressSteps(order);

/**
 * Returns the actioned-by/date/action/comment details for a given approval
 * stage label, if applicable and available on the order.
 */
const isApprovalStage = (stageLabel: string): stageLabel is ApprovalStage =>
  Object.hasOwn(APPROVAL_STAGE_DETAIL_FIELDS, stageLabel);

export const getStageActionDetails = (
  order: TerminalProductOrder,
  stageLabel: string,
): StageActionDetails | undefined => {
  const details = order.workflow_details;
  if (!details || !isApprovalStage(stageLabel)) {
    return undefined;
  }
  const fields = APPROVAL_STAGE_DETAIL_FIELDS[stageLabel];
  return {
    actionedBy: details[fields.actionedBy] ?? null,
    actionedTimestamp: details[fields.actionedTimestamp] ?? null,
    action: details[fields.action] ?? null,
    comment: details[fields.comment] ?? null,
  };
};

export interface ClosureInfo {
  stageLabel: string;
  reason: string | null;
  actionedBy: string | null;
  actionedTimestamp: string | null;
  comment: string | null;
}

/**
 * Resolves the details of the last stage that actually closed a closed
 * (`workflow_status === COMPLETED`) order - i.e. whichever approval stage
 * rejected it, or (if every approval stage passed) the fulfillment/RPM stage
 * that completed it - rather than always assuming the Privilege Manager
 * stage. Returns `undefined` for orders that aren't closed.
 */
export const getClosureInfo = (
  order: TerminalProductOrder,
): ClosureInfo | undefined => {
  const details = order.workflow_details;
  if (details?.workflow_status !== OrderStatus.COMPLETED) {
    return undefined;
  }

  if (order.order_type.toUpperCase() === OrderType.CANCELLATION) {
    return {
      stageLabel: WorkflowStage.PENDING_FULFILLMENT,
      reason: order.status,
      actionedBy: null,
      actionedTimestamp: order.updated_at,
      comment: null,
    };
  }

  const approvalStages: ApprovalStage[] = order.bbg_terminal_flag
    ? [
        WorkflowStage.MANAGER_APPROVAL,
        WorkflowStage.FIRST_APPROVER,
        WorkflowStage.FULFILLMENT_APPROVER,
        WorkflowStage.BUSINESS_ANALYST_APPROVAL,
      ]
    : [WorkflowStage.MANAGER_APPROVAL, WorkflowStage.FIRST_APPROVER];

  // Walk the approval stages in order, tracking the last one that was
  // actually actioned; stop early at the first rejection since that's what
  // closed the order.
  let lastActionedStage: ApprovalStage | undefined;
  for (const stage of approvalStages) {
    const status = getApprovalActionStatus(details, stage);
    if (status === 'pending') {
      break;
    }
    lastActionedStage = stage;
    if (status === 'rejected') {
      break;
    }
  }

  if (lastActionedStage) {
    const stageDetails = getStageActionDetails(order, lastActionedStage);
    if (stageDetails) {
      return {
        stageLabel: lastActionedStage,
        reason: stageDetails.action,
        actionedBy: stageDetails.actionedBy,
        actionedTimestamp: stageDetails.actionedTimestamp,
        comment: stageDetails.comment,
      };
    }
  }

  // Every approval stage passed - the order was closed at the
  // fulfillment/RPM stage, which doesn't track an actioned-by/timestamp.
  return {
    stageLabel: WorkflowStage.PENDING_FULFILLMENT,
    reason: details.rpm_action ?? order.status,
    actionedBy: null,
    actionedTimestamp: order.updated_at,
    comment: details.rpm_comment,
  };
};

// Maps each known `current_stage` code to the `WorkflowDetails` field that
// holds the tracking URL for that stage.
const CURRENT_STAGE_URL_FIELD: Partial<
  Record<WorkflowCurrentStage, keyof WorkflowDetails>
> = {
  [WorkflowCurrentStage.DIRECT_MANAGER]: 'url_manager',
  [WorkflowCurrentStage.FIRST_APPROVER]: 'url_fa_approval',
  [WorkflowCurrentStage.FULFILLMENT_APPROVER]: 'url_ffa_approval',
  [WorkflowCurrentStage.BUSINESS_ANALYST]: 'url_bbg_approval',
};

// Maps each known `current_stage` code to the `WorkflowDetails` field that
// holds the process instance ID for that stage (used to cancel the order).
const CURRENT_STAGE_PROCESS_INSTANCE_ID_FIELD: Partial<
  Record<WorkflowCurrentStage, keyof WorkflowDetails>
> = {
  [WorkflowCurrentStage.DIRECT_MANAGER]: 'piid_manager',
  [WorkflowCurrentStage.FIRST_APPROVER]: 'piid_fa_approval',
  [WorkflowCurrentStage.FULFILLMENT_APPROVER]: 'piid_ffa_approval',
  [WorkflowCurrentStage.BUSINESS_ANALYST]: 'piid_bbg_approval',
};

/**
 * Returns the tracking URL for the order's *current* workflow stage (e.g. the
 * Privilege Manager's URL while pending manager approval, the Business
 * Analyst's URL once at that stage, etc.) rather than always the Privilege
 * Manager's URL. Stages without a trackable URL (e.g. RPM/fulfillment) return
 * `null`.
 */
export const getCurrentStageTrackingUrl = (
  order: TerminalProductOrder,
): string | null => {
  const details = order.workflow_details;
  const currentStage = details?.current_stage as
    | WorkflowCurrentStage
    | undefined;
  if (!details || !currentStage) {
    return null;
  }
  const field = CURRENT_STAGE_URL_FIELD[currentStage];
  return field ? (details[field] ?? null) : null;
};

export const getProcessInstanceId = (
  order: TerminalProductOrder,
): string | null => {
  const details = order.workflow_details;
  const currentStage = details?.current_stage as
    | WorkflowCurrentStage
    | undefined;
  if (!details || !currentStage) {
    return null;
  }
  const field = CURRENT_STAGE_PROCESS_INSTANCE_ID_FIELD[currentStage];
  return field ? (details[field] ?? null) : null;
};

/**
 * An order can be cancelled at any approval stage; once it reaches RPM
 * (fulfillment), it can no longer be cancelled.
 */
export const canCancelOrder = (order: TerminalProductOrder): boolean => {
  const currentStage = order.workflow_details?.current_stage;
  return !!currentStage && currentStage !== WorkflowCurrentStage.RPM;
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

// ----------------------------------------- Advanced Order Search -----------------------------------------

/** Bound applied by the UI (and mirrored to the backend) when "Show Last (Days)" is left blank. */
export const ORDER_SEARCH_DEFAULT_LAST_DAYS = 365;
export const ORDER_SEARCH_DEFAULT_LIMIT = 100;
export const ORDER_SEARCH_MIN_LAST_DAYS = 1;
export const ORDER_SEARCH_MAX_LAST_DAYS = 365;

/**
 * Resolves a human-readable label for a `LegendUser` selected in the advanced
 * search form (falls back to the raw kerberos id when no display name is
 * available), or `undefined` if no user was selected.
 */
export const getUserDisplayLabel = (
  user: LegendUser | undefined,
): string | undefined => {
  if (!user) {
    return undefined;
  }
  const id = user.id.trim();
  if (!id) {
    return undefined;
  }
  const displayName = user.displayName;
  return displayName === undefined || displayName === '' ? id : displayName;
};

const ORDER_SEARCH_STATUS_LABEL: Record<OrderSearchStatus, string> = {
  [OrderSearchStatus.ALL]: 'All',
  [OrderSearchStatus.PENDING_APPROVAL]: 'Pending Approval',
  [OrderSearchStatus.PENDING_FULFILLMENT]: 'Pending Fulfillment',
  [OrderSearchStatus.COMPLETED]: 'Completed',
  [OrderSearchStatus.CANCELLED]: 'Cancelled',
  [OrderSearchStatus.REJECTED]: 'Rejected',
};

/** Human-readable label for an `OrderSearchStatus` value, for display in the advanced search form/summary. */
export const getOrderSearchStatusLabel = (status: OrderSearchStatus): string =>
  ORDER_SEARCH_STATUS_LABEL[status];

/**
 * Parses the raw "Show Last (Days)" text input into a valid integer within
 * the API's supported `1-365` range, or `undefined` if the input is blank or
 * out of range (in which case the backend's/UI's default applies instead).
 */
export const parseLastDaysInput = (rawValue: string): number | undefined => {
  const trimmed = rawValue.trim();
  if (trimmed === '') {
    return undefined;
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (
    Number.isNaN(parsed) ||
    parsed < ORDER_SEARCH_MIN_LAST_DAYS ||
    parsed > ORDER_SEARCH_MAX_LAST_DAYS
  ) {
    return undefined;
  }
  return parsed;
};
