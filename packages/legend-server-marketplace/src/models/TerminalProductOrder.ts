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

export enum OrderCategory {
  TERMINAL = 'TERMINAL',
  TERMINAL_WITH_ADD_ON = 'TERMINAL WITH ADD-ON',
}

export enum OrderStatus {
  IN_PROGRESS = 'IN PROGRESS',
  OPEN = 'OPEN',
  COMPLETED = 'COMPLETED',
}

export enum OrderStatusCategory {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export interface TerminalProductOrder {
  order_id: string;
  ordered_by: string;
  ordered_by_name: string;
  ordered_for: string;
  ordered_for_name: string;
  created_at: string;
  updated_at: string;
  order_cost: number;
  order_category: OrderCategory;
  order_type: string; //enum
  bbg_terminal_flag: boolean;
  vendor_profile_id: number;
  vendor_profile_name: string;
  permid: string | null;
  vendor_name: string;
  reason_code_id: number;
  business_justification: string;
  status: string;
  service_pricing_items: ServicePricingItems[];
  workflow_details?: WorkflowDetails;
}

export interface ServicePricingItems {
  entity_id: number;
  entity_name: string;
  entity_category: string;
  entity_type: string;
  entity_cost: number;
}

export interface WorkflowDetails {
  url_manager: string;
  piid_manager: string;
  taskid_manager: string;
  manager_actioned_by: string | null;
  manager_actioned_timestamp: string | null;
  manager_comment: string | null;
  manager_action: string | null;
  bbg_approval_process_id: string | null;
  bbg_approval_actioned_by: string | null;
  bbg_approval_actioned_timestamp: string | null;
  bbg_approval_comment: string | null;
  bbg_approval_action: string | null;
  rpm_ticket_id: string | null;
  current_stage: string | null;
  workflow_status: OrderStatus;
  rpm_action: string | null;
}

export interface TerminalProductOrderResponse {
  orders: TerminalProductOrder[];
  total_count: number;
  status_filter: OrderStatusCategory;
  kerberos: string;
}
