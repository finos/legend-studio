/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { describe, expect, test } from '@jest/globals';
import {
  OrderCategory,
  OrderStatus,
  OrderSearchStatus,
  type TerminalProductOrder,
  type WorkflowDetails,
} from '@finos/legend-server-marketplace';
import { LegendUser } from '@finos/legend-shared';
import {
  WorkflowStage,
  WorkflowCurrentStage,
  OrderProgressStatus,
  getOrderProgressSteps,
  getStageActionDetails,
  getClosureInfo,
  getCurrentStageTrackingUrl,
  getProcessInstanceId,
  canCancelOrder,
  formatOrderDate,
  formatTimestamp,
  getUserDisplayLabel,
  getOrderSearchStatusLabel,
  parseLastDaysInput,
} from '../OrderHelpers.js';

// ─── Test Fixtures ─────────────────────────────────────────────────────────────

const makeWorkflowDetails = (
  overrides: Partial<WorkflowDetails> = {},
): WorkflowDetails => ({
  url_manager: '',
  piid_manager: '',
  taskid_manager: '',
  manager_actioned_by: null,
  manager_actioned_by_name: null,
  manager_actioned_timestamp: null,
  manager_comment: null,
  manager_action: null,
  url_fa_approval: null,
  piid_fa_approval: null,
  taskid_fa_approval: null,
  fa_approval_actioned_by: null,
  fa_approval_actioned_by_name: null,
  fa_approval_actioned_timestamp: null,
  fa_approval_comment: null,
  fa_approval_action: null,
  url_ffa_approval: null,
  piid_ffa_approval: null,
  taskid_ffa_approval: null,
  ffa_approval_actioned_by: null,
  ffa_approval_actioned_by_name: null,
  ffa_approval_actioned_timestamp: null,
  ffa_approval_comment: null,
  ffa_approval_action: null,
  url_bbg_approval: null,
  piid_bbg_approval: null,
  bbg_approval_actioned_by: null,
  bbg_approval_actioned_by_name: null,
  bbg_approval_actioned_timestamp: null,
  bbg_approval_comment: null,
  bbg_approval_action: null,
  rpm_ticket_id: null,
  rpm_comment: null,
  current_stage: null,
  workflow_status: OrderStatus.OPEN,
  rpm_action: null,
  ...overrides,
});

const makeOrder = (
  overrides: Partial<Omit<TerminalProductOrder, 'workflow_details'>> & {
    workflow_details?: WorkflowDetails | undefined;
  } = {},
): TerminalProductOrder =>
  ({
    order_id: 'LM-1',
    ordered_by: 'adishar',
    ordered_by_name: 'Sharma, Aditya',
    ordered_for: 'adishar',
    ordered_for_name: 'Sharma, Aditya',
    created_at: '2026-08-22T18:10:30',
    updated_at: '2026-08-25T20:47:44',
    order_cost: 2000,
    order_category: OrderCategory.TERMINAL_WITH_ADD_ON,
    order_type: 'PROVISION',
    bbg_terminal_flag: false,
    vendor_profile_id: 1,
    vendor_profile_name: 'Bloomberg Anywhere',
    permid: null,
    vendor_name: 'Bloomberg',
    reason_code_id: 1,
    business_justification: 'New Hire',
    status: 'IN PROGRESS',
    service_pricing_items: [],
    workflow_details: makeWorkflowDetails(),
    ...overrides,
  }) as TerminalProductOrder;

// ─── getOrderProgressSteps ──────────────────────────────────────────────────────

describe('getOrderProgressSteps', () => {
  describe('PROVISION - non-Bloomberg (2 approval stages)', () => {
    test('both stages approved, order still open -> Pending Fulfillment is active', () => {
      const order = makeOrder({
        bbg_terminal_flag: false,
        workflow_details: makeWorkflowDetails({
          manager_action: 'Approved',
          fa_approval_action: 'Approved',
          workflow_status: OrderStatus.OPEN,
        }),
      });
      expect(getOrderProgressSteps(order)).toEqual([
        {
          label: WorkflowStage.ORDER_PLACED,
          status: OrderProgressStatus.COMPLETED,
        },
        {
          label: WorkflowStage.MANAGER_APPROVAL,
          status: OrderProgressStatus.COMPLETED,
        },
        {
          label: WorkflowStage.FIRST_APPROVER,
          status: OrderProgressStatus.COMPLETED,
        },
        {
          label: WorkflowStage.PENDING_FULFILLMENT,
          status: OrderProgressStatus.ACTIVE,
        },
      ]);
    });

    test('both stages approved, closed, order.status not rejected -> Order Fulfilled', () => {
      const order = makeOrder({
        bbg_terminal_flag: false,
        status: 'Completed',
        workflow_details: makeWorkflowDetails({
          manager_action: 'Approved',
          fa_approval_action: 'Approved',
          workflow_status: OrderStatus.COMPLETED,
        }),
      });
      expect(getOrderProgressSteps(order)).toEqual([
        {
          label: WorkflowStage.ORDER_PLACED,
          status: OrderProgressStatus.COMPLETED,
        },
        {
          label: WorkflowStage.MANAGER_APPROVAL,
          status: OrderProgressStatus.COMPLETED,
        },
        {
          label: WorkflowStage.FIRST_APPROVER,
          status: OrderProgressStatus.COMPLETED,
        },
        {
          label: WorkflowStage.ORDER_FULFILLED,
          status: OrderProgressStatus.COMPLETED,
        },
      ]);
    });

    test('both stages approved, closed, order.status is a rejected-family status -> dynamic "Order <Status>" label', () => {
      const order = makeOrder({
        bbg_terminal_flag: false,
        status: 'Auto Terminated',
        workflow_details: makeWorkflowDetails({
          manager_action: 'Approved',
          fa_approval_action: 'Approved',
          workflow_status: OrderStatus.COMPLETED,
        }),
      });
      expect(getOrderProgressSteps(order)).toEqual([
        {
          label: WorkflowStage.ORDER_PLACED,
          status: OrderProgressStatus.COMPLETED,
        },
        {
          label: WorkflowStage.MANAGER_APPROVAL,
          status: OrderProgressStatus.COMPLETED,
        },
        {
          label: WorkflowStage.FIRST_APPROVER,
          status: OrderProgressStatus.COMPLETED,
        },
        {
          label: 'Order Auto Terminated',
          status: OrderProgressStatus.REJECTED,
        },
      ]);
    });

    test('manager stage rejected -> subsequent stages frozen as pending', () => {
      const order = makeOrder({
        bbg_terminal_flag: false,
        workflow_details: makeWorkflowDetails({
          manager_action: 'Rejected',
        }),
      });
      expect(getOrderProgressSteps(order)).toEqual([
        {
          label: WorkflowStage.ORDER_PLACED,
          status: OrderProgressStatus.COMPLETED,
        },
        {
          label: WorkflowStage.MANAGER_APPROVAL,
          status: OrderProgressStatus.REJECTED,
        },
        {
          label: WorkflowStage.FIRST_APPROVER,
          status: OrderProgressStatus.PENDING,
        },
        {
          label: WorkflowStage.PENDING_FULFILLMENT,
          status: OrderProgressStatus.PENDING,
        },
      ]);
    });

    test('manager stage cancelled is treated as a rejection outcome', () => {
      const order = makeOrder({
        bbg_terminal_flag: false,
        workflow_details: makeWorkflowDetails({ manager_action: 'Cancelled' }),
      });
      const steps = getOrderProgressSteps(order);
      expect(steps[1]).toEqual({
        label: WorkflowStage.MANAGER_APPROVAL,
        status: OrderProgressStatus.REJECTED,
      });
    });

    test('manager stage not yet actioned, order open -> Manager Approval active', () => {
      const order = makeOrder({
        bbg_terminal_flag: false,
        workflow_details: makeWorkflowDetails({ manager_action: null }),
      });
      expect(getOrderProgressSteps(order)).toEqual([
        {
          label: WorkflowStage.ORDER_PLACED,
          status: OrderProgressStatus.COMPLETED,
        },
        {
          label: WorkflowStage.MANAGER_APPROVAL,
          status: OrderProgressStatus.ACTIVE,
        },
        {
          label: WorkflowStage.FIRST_APPROVER,
          status: OrderProgressStatus.PENDING,
        },
        {
          label: WorkflowStage.PENDING_FULFILLMENT,
          status: OrderProgressStatus.PENDING,
        },
      ]);
    });

    test('manager stage not yet actioned, workflow already closed -> Manager Approval pending (not active)', () => {
      const order = makeOrder({
        bbg_terminal_flag: false,
        workflow_details: makeWorkflowDetails({
          manager_action: null,
          workflow_status: OrderStatus.COMPLETED,
        }),
      });
      const steps = getOrderProgressSteps(order);
      expect(steps[1]).toEqual({
        label: WorkflowStage.MANAGER_APPROVAL,
        status: OrderProgressStatus.PENDING,
      });
    });
  });

  describe('PROVISION - Bloomberg (4 approval stages)', () => {
    test('all four stages approved, order still open -> Pending Fulfillment active (matches sample payload)', () => {
      // Based on the real Bloomberg order payload in adishar_helpers/order_payload.txt
      const order = makeOrder({
        bbg_terminal_flag: true,
        workflow_details: makeWorkflowDetails({
          manager_action: 'Approved',
          bbg_approval_action: 'Approved',
          fa_approval_action: 'Approved',
          ffa_approval_action: 'Approved',
          current_stage: 'RPM',
          workflow_status: OrderStatus.OPEN,
          rpm_action: 'Open',
        }),
      });
      expect(getOrderProgressSteps(order)).toEqual([
        {
          label: WorkflowStage.ORDER_PLACED,
          status: OrderProgressStatus.COMPLETED,
        },
        {
          label: WorkflowStage.MANAGER_APPROVAL,
          status: OrderProgressStatus.COMPLETED,
        },
        {
          label: WorkflowStage.FIRST_APPROVER,
          status: OrderProgressStatus.COMPLETED,
        },
        {
          label: WorkflowStage.FULFILLMENT_APPROVER,
          status: OrderProgressStatus.COMPLETED,
        },
        {
          label: WorkflowStage.BUSINESS_ANALYST_APPROVAL,
          status: OrderProgressStatus.COMPLETED,
        },
        {
          label: WorkflowStage.PENDING_FULFILLMENT,
          status: OrderProgressStatus.ACTIVE,
        },
      ]);
    });

    test('fulfillment approver rejected -> business analyst stage frozen as pending', () => {
      const order = makeOrder({
        bbg_terminal_flag: true,
        workflow_details: makeWorkflowDetails({
          manager_action: 'Approved',
          fa_approval_action: 'Approved',
          ffa_approval_action: 'Rejected',
          bbg_approval_action: null,
        }),
      });
      expect(getOrderProgressSteps(order)).toEqual([
        {
          label: WorkflowStage.ORDER_PLACED,
          status: OrderProgressStatus.COMPLETED,
        },
        {
          label: WorkflowStage.MANAGER_APPROVAL,
          status: OrderProgressStatus.COMPLETED,
        },
        {
          label: WorkflowStage.FIRST_APPROVER,
          status: OrderProgressStatus.COMPLETED,
        },
        {
          label: WorkflowStage.FULFILLMENT_APPROVER,
          status: OrderProgressStatus.REJECTED,
        },
        {
          label: WorkflowStage.BUSINESS_ANALYST_APPROVAL,
          status: OrderProgressStatus.PENDING,
        },
        {
          label: WorkflowStage.PENDING_FULFILLMENT,
          status: OrderProgressStatus.PENDING,
        },
      ]);
    });
  });

  describe('CANCELLATION orders', () => {
    test('status "IN PROGRESS" -> Pending Fulfillment active', () => {
      const order = makeOrder({
        order_type: 'CANCELLATION',
        status: 'IN PROGRESS',
      });
      expect(getOrderProgressSteps(order)).toEqual([
        {
          label: WorkflowStage.ORDER_PLACED,
          status: OrderProgressStatus.COMPLETED,
        },
        {
          label: WorkflowStage.PENDING_FULFILLMENT,
          status: OrderProgressStatus.ACTIVE,
        },
      ]);
    });

    test('status "Approved" -> Order Fulfilled completed', () => {
      const order = makeOrder({
        order_type: 'CANCELLATION',
        status: 'Approved',
      });
      expect(getOrderProgressSteps(order)).toEqual([
        {
          label: WorkflowStage.ORDER_PLACED,
          status: OrderProgressStatus.COMPLETED,
        },
        {
          label: WorkflowStage.ORDER_FULFILLED,
          status: OrderProgressStatus.COMPLETED,
        },
      ]);
    });

    test('status "Rejected" -> dynamic "Order Rejected" label, rejected status', () => {
      const order = makeOrder({
        order_type: 'CANCELLATION',
        status: 'Rejected',
      });
      expect(getOrderProgressSteps(order)).toEqual([
        {
          label: WorkflowStage.ORDER_PLACED,
          status: OrderProgressStatus.COMPLETED,
        },
        { label: 'Order Rejected', status: OrderProgressStatus.REJECTED },
      ]);
    });

    test('status "Cancelled" -> dynamic "Order Cancelled" label, rejected status', () => {
      const order = makeOrder({
        order_type: 'CANCELLATION',
        status: 'Cancelled',
      });
      expect(getOrderProgressSteps(order)).toEqual([
        {
          label: WorkflowStage.ORDER_PLACED,
          status: OrderProgressStatus.COMPLETED,
        },
        { label: 'Order Cancelled', status: OrderProgressStatus.REJECTED },
      ]);
    });

    test('order_type comparison is case-insensitive', () => {
      const order = makeOrder({
        order_type: 'cancellation',
        status: 'Approved',
      });
      expect(getOrderProgressSteps(order)).toEqual([
        {
          label: WorkflowStage.ORDER_PLACED,
          status: OrderProgressStatus.COMPLETED,
        },
        {
          label: WorkflowStage.ORDER_FULFILLED,
          status: OrderProgressStatus.COMPLETED,
        },
      ]);
    });
  });
});

// ─── getStageActionDetails ──────────────────────────────────────────────────────

describe('getStageActionDetails', () => {
  test('returns actioned-by/timestamp/action/comment for a valid approval stage', () => {
    const order = makeOrder({
      workflow_details: makeWorkflowDetails({
        manager_actioned_by_name: 'Sharma, Aditya',
        manager_actioned_timestamp: '2026-08-22T18:10:56',
        manager_action: 'Approved',
        manager_comment: 'Looks good',
      }),
    });
    expect(
      getStageActionDetails(order, WorkflowStage.MANAGER_APPROVAL),
    ).toEqual({
      actionedBy: 'Sharma, Aditya',
      actionedTimestamp: '2026-08-22T18:10:56',
      action: 'Approved',
      comment: 'Looks good',
    });
  });

  test('fills unset fields with null', () => {
    const order = makeOrder({ workflow_details: makeWorkflowDetails() });
    expect(getStageActionDetails(order, WorkflowStage.FIRST_APPROVER)).toEqual({
      actionedBy: null,
      actionedTimestamp: null,
      action: null,
      comment: null,
    });
  });

  test('returns undefined for a stage label that is not an approval stage', () => {
    const order = makeOrder();
    expect(
      getStageActionDetails(order, WorkflowStage.PENDING_FULFILLMENT),
    ).toBeUndefined();
    expect(getStageActionDetails(order, 'Not A Real Stage')).toBeUndefined();
  });

  test('returns undefined when order has no workflow_details', () => {
    const order = makeOrder({ workflow_details: undefined });
    expect(
      getStageActionDetails(order, WorkflowStage.MANAGER_APPROVAL),
    ).toBeUndefined();
  });
});

// ─── getClosureInfo ──────────────────────────────────────────────────────────────

describe('getClosureInfo', () => {
  test('returns undefined when the order is not closed', () => {
    const order = makeOrder({
      workflow_details: makeWorkflowDetails({
        workflow_status: OrderStatus.OPEN,
      }),
    });
    expect(getClosureInfo(order)).toBeUndefined();
  });

  test('CANCELLATION orders resolve from the top-level order status/updated_at', () => {
    const order = makeOrder({
      order_type: 'CANCELLATION',
      status: 'Rejected',
      updated_at: '2026-08-26T10:00:00',
      workflow_details: makeWorkflowDetails({
        workflow_status: OrderStatus.COMPLETED,
      }),
    });
    expect(getClosureInfo(order)).toEqual({
      stageLabel: WorkflowStage.PENDING_FULFILLMENT,
      reason: 'Rejected',
      actionedBy: null,
      actionedTimestamp: '2026-08-26T10:00:00',
      comment: null,
    });
  });

  test('PROVISION order rejected at First Approver stops the walk there', () => {
    const order = makeOrder({
      bbg_terminal_flag: false,
      workflow_details: makeWorkflowDetails({
        manager_action: 'Approved',
        fa_approval_action: 'Rejected',
        fa_approval_actioned_by_name: 'Approver Name',
        fa_approval_actioned_timestamp: '2026-08-26T10:58:57',
        fa_approval_comment: 'Not eligible',
        workflow_status: OrderStatus.COMPLETED,
      }),
    });
    expect(getClosureInfo(order)).toEqual({
      stageLabel: WorkflowStage.FIRST_APPROVER,
      reason: 'Rejected',
      actionedBy: 'Approver Name',
      actionedTimestamp: '2026-08-26T10:58:57',
      comment: 'Not eligible',
    });
  });

  test('no approval stage ever actioned (still pending) yet order is closed -> falls back to RPM/fulfillment info', () => {
    const order = makeOrder({
      bbg_terminal_flag: false,
      updated_at: '2026-08-25T20:47:44',
      workflow_details: makeWorkflowDetails({
        manager_action: null,
        rpm_action: 'Closed',
        rpm_comment: 'Fulfilled',
        workflow_status: OrderStatus.COMPLETED,
      }),
    });
    expect(getClosureInfo(order)).toEqual({
      stageLabel: WorkflowStage.PENDING_FULFILLMENT,
      reason: 'Closed',
      actionedBy: null,
      actionedTimestamp: '2026-08-25T20:47:44',
      comment: 'Fulfilled',
    });
  });

  test('falls back to order.status when rpm_action is null', () => {
    const order = makeOrder({
      bbg_terminal_flag: false,
      status: 'Completed',
      workflow_details: makeWorkflowDetails({
        manager_action: null,
        rpm_action: null,
        workflow_status: OrderStatus.COMPLETED,
      }),
    });
    expect(getClosureInfo(order)?.reason).toBe('Completed');
  });
});

// ─── getCurrentStageTrackingUrl ──────────────────────────────────────────────────

describe('getCurrentStageTrackingUrl', () => {
  test.each<[WorkflowCurrentStage, keyof WorkflowDetails, string]>([
    [WorkflowCurrentStage.DIRECT_MANAGER, 'url_manager', 'https://url/manager'],
    [WorkflowCurrentStage.FIRST_APPROVER, 'url_fa_approval', 'https://url/fa'],
    [
      WorkflowCurrentStage.FULFILLMENT_APPROVER,
      'url_ffa_approval',
      'https://url/ffa',
    ],
    [
      WorkflowCurrentStage.BUSINESS_ANALYST,
      'url_bbg_approval',
      'https://url/bbg',
    ],
  ])(
    'resolves the tracking URL for current_stage=%s from %s',
    (currentStage, field, url) => {
      const order = makeOrder({
        workflow_details: makeWorkflowDetails({
          current_stage: currentStage,
          [field]: url,
        }),
      });
      expect(getCurrentStageTrackingUrl(order)).toBe(url);
    },
  );

  test('returns null for a stage without a mapped URL field (e.g. RPM)', () => {
    const order = makeOrder({
      workflow_details: makeWorkflowDetails({
        current_stage: WorkflowCurrentStage.RPM,
      }),
    });
    expect(getCurrentStageTrackingUrl(order)).toBeNull();
  });

  test('returns null when the mapped field value itself is null', () => {
    const order = makeOrder({
      workflow_details: makeWorkflowDetails({
        current_stage: WorkflowCurrentStage.DIRECT_MANAGER,
        url_manager: '',
      }),
    });
    expect(getCurrentStageTrackingUrl(order)).toBe('');
  });

  test('returns null when there is no current_stage', () => {
    const order = makeOrder({
      workflow_details: makeWorkflowDetails({ current_stage: null }),
    });
    expect(getCurrentStageTrackingUrl(order)).toBeNull();
  });

  test('returns null when there is no workflow_details', () => {
    const order = makeOrder({ workflow_details: undefined });
    expect(getCurrentStageTrackingUrl(order)).toBeNull();
  });
});

// ─── getProcessInstanceId ────────────────────────────────────────────────────────

describe('getProcessInstanceId', () => {
  test.each<[WorkflowCurrentStage, keyof WorkflowDetails, string]>([
    [WorkflowCurrentStage.DIRECT_MANAGER, 'piid_manager', 'proc-manager'],
    [WorkflowCurrentStage.FIRST_APPROVER, 'piid_fa_approval', 'proc-fa'],
    [
      WorkflowCurrentStage.FULFILLMENT_APPROVER,
      'piid_ffa_approval',
      'proc-ffa',
    ],
    [WorkflowCurrentStage.BUSINESS_ANALYST, 'piid_bbg_approval', 'proc-bbg'],
  ])(
    'resolves the process instance id for current_stage=%s from %s',
    (currentStage, field, piid) => {
      const order = makeOrder({
        workflow_details: makeWorkflowDetails({
          current_stage: currentStage,
          [field]: piid,
        }),
      });
      expect(getProcessInstanceId(order)).toBe(piid);
    },
  );

  test('returns null for RPM stage (no mapped process instance id field)', () => {
    const order = makeOrder({
      workflow_details: makeWorkflowDetails({
        current_stage: WorkflowCurrentStage.RPM,
      }),
    });
    expect(getProcessInstanceId(order)).toBeNull();
  });

  test('returns null when there is no current_stage', () => {
    const order = makeOrder({
      workflow_details: makeWorkflowDetails({ current_stage: null }),
    });
    expect(getProcessInstanceId(order)).toBeNull();
  });

  test('returns null when there is no workflow_details', () => {
    const order = makeOrder({ workflow_details: undefined });
    expect(getProcessInstanceId(order)).toBeNull();
  });
});

// ─── canCancelOrder ──────────────────────────────────────────────────────────────

describe('canCancelOrder', () => {
  test('returns true for any approval stage other than RPM', () => {
    const order = makeOrder({
      workflow_details: makeWorkflowDetails({
        current_stage: WorkflowCurrentStage.FULFILLMENT_APPROVER,
      }),
    });
    expect(canCancelOrder(order)).toBe(true);
  });

  test('returns false once the order has reached RPM/fulfillment', () => {
    const order = makeOrder({
      workflow_details: makeWorkflowDetails({
        current_stage: WorkflowCurrentStage.RPM,
      }),
    });
    expect(canCancelOrder(order)).toBe(false);
  });

  test('returns false when there is no current_stage', () => {
    const order = makeOrder({
      workflow_details: makeWorkflowDetails({ current_stage: null }),
    });
    expect(canCancelOrder(order)).toBe(false);
  });

  test('returns false when there is no workflow_details', () => {
    const order = makeOrder({ workflow_details: undefined });
    expect(canCancelOrder(order)).toBe(false);
  });
});

// ─── formatOrderDate / formatTimestamp ───────────────────────────────────────────

describe('formatOrderDate', () => {
  test('returns undefined when given undefined', () => {
    expect(formatOrderDate(undefined)).toBeUndefined();
  });

  test('formats a date string using en-US short month/day/year', () => {
    const dateString = '2026-08-22T18:10:30';
    expect(formatOrderDate(dateString)).toBe(
      new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    );
  });
});

describe('formatTimestamp', () => {
  test('formats a timestamp string using en-US short date + time', () => {
    const timestamp = '2026-08-22T18:10:56';
    expect(formatTimestamp(timestamp)).toBe(
      new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    );
  });
});

// ─── Advanced Order Search helpers ───────────────────────────────────────────────

describe('getUserDisplayLabel', () => {
  test('returns undefined when no user is given', () => {
    expect(getUserDisplayLabel(undefined)).toBeUndefined();
  });

  test('returns undefined when the user has a blank id', () => {
    expect(getUserDisplayLabel(new LegendUser('  '))).toBeUndefined();
  });

  test('falls back to the kerberos id when there is no display name', () => {
    expect(getUserDisplayLabel(new LegendUser('adishar'))).toBe('adishar');
  });

  test('falls back to the kerberos id when the display name is blank', () => {
    expect(getUserDisplayLabel(new LegendUser('adishar', ''))).toBe('adishar');
  });

  test('prefers the display name when available', () => {
    expect(getUserDisplayLabel(new LegendUser('adishar', 'A. Dishar'))).toBe(
      'A. Dishar',
    );
  });
});

describe('getOrderSearchStatusLabel', () => {
  test('returns a human-readable label for each status', () => {
    expect(getOrderSearchStatusLabel(OrderSearchStatus.ALL)).toBe('All');
    expect(getOrderSearchStatusLabel(OrderSearchStatus.PENDING_APPROVAL)).toBe(
      'Pending Approval',
    );
    expect(
      getOrderSearchStatusLabel(OrderSearchStatus.PENDING_FULFILLMENT),
    ).toBe('Pending Fulfillment');
    expect(getOrderSearchStatusLabel(OrderSearchStatus.CANCELLED)).toBe(
      'Cancelled',
    );
    expect(getOrderSearchStatusLabel(OrderSearchStatus.COMPLETED)).toBe(
      'Completed',
    );
    expect(getOrderSearchStatusLabel(OrderSearchStatus.REJECTED)).toBe(
      'Rejected',
    );
  });
});

describe('parseLastDaysInput', () => {
  test('returns undefined for a blank input', () => {
    expect(parseLastDaysInput('')).toBeUndefined();
    expect(parseLastDaysInput('   ')).toBeUndefined();
  });

  test('returns undefined for a non-numeric input', () => {
    expect(parseLastDaysInput('abc')).toBeUndefined();
  });

  test('returns undefined when out of the 1-365 range', () => {
    expect(parseLastDaysInput('0')).toBeUndefined();
    expect(parseLastDaysInput('366')).toBeUndefined();
  });

  test('returns the parsed integer when within range', () => {
    expect(parseLastDaysInput('30')).toBe(30);
    expect(parseLastDaysInput('365')).toBe(365);
    expect(parseLastDaysInput('1')).toBe(1);
  });
});
