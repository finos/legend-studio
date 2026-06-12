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

import { SerializationFactory, type PlainObject } from '@finos/legend-shared';
import {
  createModelSchema,
  list,
  object,
  optional,
  primitive,
} from 'serializr';

export interface LightProvider {
  description: string;
  provider: string;
  type: string;
}

export enum ProductType {
  ALL = 'ALL',
  VENDOR_PROFILE = 'VENDOR_PROFILE',
  SERVICE_PRICING = 'SERVICE_PRICING',
  ORDER_PROFILE = 'ORDER_PROFILE',
}

export interface FetchProductsParams {
  kerberos: string;
  product_type: ProductType;
  preferred_products: boolean;
  page_size?: number;
  search?: string;
  page_number?: number;
}

export enum TerminalItemType {
  TERMINAL = 'Terminal',
  ADD_ON = 'Add-On',
}

export enum RecommendationSource {
  CART = 'cart',
  INVENTORY = 'inventory',
  MARKETPLACE = 'marketplace',
}

export class TerminalResult {
  id!: number;
  category!: string;
  providerName!: string;
  productName!: string;
  description!: string;
  price!: number;
  phystr!: string;
  model!: string | null;
  isMandatory?: boolean;
  skipWorkflow?: boolean;
  isOwned?: boolean;
  vendorProfileId?: number;
  permissionId?: number;
  source?: RecommendationSource;

  static readonly serialization = new SerializationFactory(
    createModelSchema(TerminalResult, {
      id: primitive(),
      category: primitive(),
      providerName: primitive(),
      productName: primitive(),
      description: primitive(),
      price: primitive(),
      phystr: primitive(),
      model: primitive(),
      isMandatory: optional(primitive()),
      skipWorkflow: optional(primitive()),
      isOwned: primitive(),
      vendorProfileId: primitive(),
      permissionId: optional(primitive()),
      source: optional(primitive()),
    }),
  );

  get terminalItemType(): TerminalItemType {
    return this.category.toLowerCase() === 'vendor profile'
      ? TerminalItemType.TERMINAL
      : TerminalItemType.ADD_ON;
  }
}

export interface Filter {
  label: string;
  value: string;
}

export class TraderProfileItem {
  id!: number;
  category!: string;
  providerName!: string;
  productName!: string;
  price!: number;
  isOwned?: boolean;
  vendorProfileId?: number;
  description?: string;
  phystr?: string;
  model?: string | null;
  isMandatory?: boolean;
  skipWorkflow?: boolean;
  permissionId?: number;

  static readonly serialization = new SerializationFactory(
    createModelSchema(TraderProfileItem, {
      id: primitive(),
      category: primitive(),
      providerName: primitive(),
      productName: primitive(),
      price: primitive(),
      isOwned: optional(primitive()),
      vendorProfileId: optional(primitive()),
      description: optional(primitive()),
      phystr: optional(primitive()),
      model: optional(primitive()),
      isMandatory: optional(primitive()),
      skipWorkflow: optional(primitive()),
      permissionId: optional(primitive()),
    }),
  );

  get isTerminal(): boolean {
    return this.category.toLowerCase() === 'vendor profile';
  }
}

export class TraderProfile {
  id!: number;
  productName!: string;
  providerName!: string;
  description?: string;
  price!: number;
  multiselect!: boolean;
  isOwned?: boolean;
  items!: TraderProfileItem[];

  static readonly serialization = new SerializationFactory(
    createModelSchema(TraderProfile, {
      id: primitive(),
      productName: primitive(),
      providerName: primitive(),
      description: optional(primitive()),
      price: primitive(),
      multiselect: primitive(),
      isOwned: optional(primitive()),
      items: list(object(TraderProfileItem.serialization.schema)),
    }),
  );
}

export interface TerminalServicesResponse {
  hrid: string;
  vendor_profiles?: PlainObject<TerminalResult>[];
  service_pricing?: PlainObject<TerminalResult>[];
  order_profile?: PlainObject<TraderProfile>[];
  vendor_profiles_total_count?: number;
  service_pricing_total_count?: number;
  order_profile_total_count?: number;
  total_count?: number;
}
