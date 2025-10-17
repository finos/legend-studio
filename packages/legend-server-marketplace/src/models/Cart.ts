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

import type { TerminalResult } from './Provider.js';

export interface CartItemRequest {
  id: number;
  productName: string;
  providerName: string;
  category: string;
  price: number;
  model?: string;
  description: string;
  isOwned: string;
  vendorProfileId?: number;
}

export interface CartItem extends CartItemRequest {
  cartId: number;
}

export interface CartSummary {
  total_items: number;
  total_cost: number;
  formatted_total_cost: string;
}

export interface CartItemResponse {
  message: string;
  status_code: number;
  marketplace_addons: TerminalResult[] | null;
  marketplace_terminals: TerminalResult[] | null;
}
