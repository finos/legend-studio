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
  ordered_for: string;
  created_at: string;
  updated_at: string;
  order_cost: number;
  order_category: OrderCategory;
  order_type: string; //enum
  vendor_profile_id: number;
  vendor_profile_name: string;
  vendor_name: string;
  status: string;
  business_justification: string;
  service_pricing_items: ServicePricingItems[];
  workflow_details?: WorkflowDetails;
}

export interface ServicePricingItems {
  service_pricing_id: number;
  service_pricing_name: string;
}

export interface WorkflowDetails {
  current_stage: string;
  workflow_status: OrderStatus;
}

export interface TerminalProductOrderResponse {
  orders: TerminalProductOrder[];
  total_count: number;
  status_filter: OrderStatusCategory;
  kerberos: string;
}
