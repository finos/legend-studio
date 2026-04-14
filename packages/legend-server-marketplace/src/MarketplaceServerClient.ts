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

import {
  type PlainObject,
  AbstractServerClient,
  isNonEmptyString,
} from '@finos/legend-shared';
import type {
  LightProvider,
  TerminalServicesResponse,
  FetchProductsParams,
} from './models/Provider.js';
import type { DataProductSearchResponse } from './models/DataProductSearchResult.js';
import type {
  SubscriptionRequest,
  SubscriptionResponse,
} from './models/Subscription.js';
import type {
  CartItem,
  CartItemRequest,
  CartItemResponse,
  CartSummary,
  VendorAddonsSearchParams,
  VendorAddonsSearchResponse,
} from './models/Cart.js';
import type { OrderDetails } from './models/Order.js';
import type { FeedbackRequest, FeedbackResponse } from './models/Feedback.js';
import type { V1_EntitlementsLakehouseEnvironmentType } from '@finos/legend-graph';
import {
  type TerminalProductOrderResponse,
  OrderStatusCategory,
} from './models/TerminalProductOrder.js';
import type { AutosuggestResponse } from './models/AutosuggestResult.js';
import type { TaxonomyTreeResponse } from './models/Taxonomy.js';

export interface TrendingDataProductEntry {
  dataProductId?: string;
  deploymentId?: string;
  dataProductType: string;
  productName: string;
  productDescription?: string;
  dataProductName?: string;
  groupId?: string;
  artifactId?: string;
  versionId?: string;
  dataProductPath?: string;
  originType?: string;
  producerEnvironmentName?: string;
  producerEnvironmentType?: string;
  dataProductSource?: string;
  licenseTo?: string;
}

export interface MarketplaceServerClientConfig {
  serverUrl: string;
  subscriptionUrl: string;
}

export class MarketplaceServerClient extends AbstractServerClient {
  subscriptionUrl: string;
  constructor(config: MarketplaceServerClientConfig) {
    super({
      baseUrl: config.serverUrl,
      networkClientOptions: {
        // NOTE: with the way we setup this server, we allow any (*) origin for CORS
        // so here we have to explicit omit credentials
        // See https://fetch.spec.whatwg.org/#concept-request-credentials-mode
        credentials: 'omit',
      },
    });

    this.subscriptionUrl = config.subscriptionUrl;
  }

  // ------------------------------------------- Vendors -------------------------------------------

  private _vendors = (): string => `${this.baseUrl}/v1/vendors`;

  getVendors = (): Promise<PlainObject<LightProvider>[]> =>
    this.get(this._vendors());

  private _products = (): string => `${this.baseUrl}/v1/workflow/products`;

  fetchProducts = async (
    params: FetchProductsParams,
  ): Promise<PlainObject<TerminalServicesResponse>> => {
    const queryParams: Record<string, string | number | boolean> = {
      kerberos: params.kerberos,
      product_type: params.product_type,
      preferred_products: params.preferred_products,
    };

    if (params.page_number !== undefined) {
      queryParams.page_number = params.page_number;
    }
    if (params.page_size !== undefined) {
      queryParams.page_size = params.page_size;
    }
    if (params.search !== undefined && params.search !== '') {
      queryParams.search = params.search;
    }

    return this.get<PlainObject<TerminalServicesResponse>>(
      this._products(),
      undefined,
      undefined,
      queryParams,
    );
  };

  // ------------------------------------------- Search -------------------------------------------

  private _search = (): string => `${this.baseUrl}/v1/search`;

  private _autosuggest = (): string => `${this.baseUrl}/v1/autosuggest`;

  dataProductSearch = async (
    query: string,
    lakehouseEnv: V1_EntitlementsLakehouseEnvironmentType,
    searchType: string = 'hybrid',
    searchFilters: string[] = [],
    pageSize: number = 12,
    pageNumber: number = 1,
    showAll: boolean = false,
  ): Promise<PlainObject<DataProductSearchResponse>> => {
    const filters = searchFilters.join('&search_filters=');
    const searchFilterParam = filters ? `&search_filters=${filters}` : '';
    return this.get<PlainObject<DataProductSearchResponse>>(
      `${this._search()}/dataProducts/${lakehouseEnv}?query=${query}&search_type=${searchType}${searchFilterParam}&page_size=${pageSize}&page_number=${pageNumber}&include_filter_metadata=true&show_all=${showAll}`,
    );
  };

  getAutosuggestions = async (
    query: string,
    environment: string,
    limit: number = 5,
    signal?: AbortSignal,
  ): Promise<AutosuggestResponse> =>
    this.get<AutosuggestResponse>(
      `${this._autosuggest()}/dataProducts/${environment}`,
      signal ? { signal } : {},
      undefined,
      { query, limit },
    );

  // ------------------------------------------- Trending -------------------------------------------

  private readonly _analytics = (): string => `${this.baseUrl}/v1/analytics`;
  getTrendingDataProducts = async (
    lakehouseEnv: V1_EntitlementsLakehouseEnvironmentType,
  ): Promise<TrendingDataProductEntry[]> =>
    this.get<TrendingDataProductEntry[]>(
      `${this._analytics()}/top-products/${lakehouseEnv}`,
      undefined,
      undefined,
    );

  // ------------------------------------------- Taxonomy -------------------------------------------

  private _taxonomyTree = (): string => `${this.baseUrl}/v1/taxonomy/tree`;

  getTaxonomyTree = async (
    lakehouseEnv: V1_EntitlementsLakehouseEnvironmentType,
    searchQuery?: string | undefined,
    refresh: boolean = false,
  ): Promise<TaxonomyTreeResponse> => {
    const queryParams: Record<string, string | boolean> = {
      refresh,
    };
    if (searchQuery) {
      queryParams.search_query = searchQuery;
    }
    return this.get<TaxonomyTreeResponse>(
      `${this._taxonomyTree()}/${lakehouseEnv}`,
      undefined,
      undefined,
      queryParams,
    );
  };

  // ------------------------------------------- Subscriptions -----------------------------------------

  private _subscriptions = (user: string): string =>
    `${this.baseUrl}/v1/service/subscription/${user}`;

  getSubscriptions = async (
    user: string,
  ): Promise<PlainObject<SubscriptionResponse>> =>
    this.get<PlainObject<SubscriptionResponse>>(this._subscriptions(user));

  cancelSubscriptions = async (
    cancellationRequest: SubscriptionRequest,
  ): Promise<PlainObject<{ message: string }>> =>
    this.post(
      `${this.baseUrl}/v1/workflow/cancel/subscription`,
      cancellationRequest,
    );

  // ------------------------------------------- Cart -------------------------------------------

  private _cart = (user: string): string => `${this.baseUrl}/v1/cart/${user}`;

  getCart = async (
    user: string,
  ): Promise<PlainObject<Record<number, CartItem[]>>> =>
    this.get<PlainObject<Record<number, CartItem[]>>>(this._cart(user));

  getCartSummary = async (user: string): Promise<PlainObject<CartSummary>> =>
    this.get<PlainObject<CartSummary>>(`${this._cart(user)}/summary`);

  clearCart = async (user: string): Promise<void> =>
    this.delete(this._cart(user));

  deleteCartItem = async (user: string, cartId: number): Promise<void> =>
    this.delete(`${this._cart(user)}/item/${cartId}`);

  addToCart = async (
    user: string,
    cartItemData: CartItemRequest,
  ): Promise<PlainObject<CartItemResponse>> =>
    this.post(this._cart(user), cartItemData);

  searchVendorAddons = async (
    user: string,
    providerName: string,
    params?: VendorAddonsSearchParams,
    signal?: AbortSignal,
  ): Promise<PlainObject<VendorAddonsSearchResponse>> => {
    const queryParams: Record<string, string | number | boolean> = {};

    if (params?.page !== undefined) {
      queryParams.page = params.page;
    }
    if (params?.page_size !== undefined) {
      queryParams.page_size = params.page_size;
    }
    if (isNonEmptyString(params?.search)) {
      queryParams.search = params.search;
    }
    if (params?.sort_by_price !== undefined) {
      queryParams.sort_by_price = params.sort_by_price;
    }

    return this.get<PlainObject<VendorAddonsSearchResponse>>(
      `${this._cart(user)}/vendor-addons/${encodeURIComponent(providerName)}`,
      signal ? { signal } : {},
      undefined,
      queryParams,
    );
  };

  submitOrder = async (
    user: string,
    orderData: OrderDetails,
  ): Promise<PlainObject<unknown>> =>
    this.post(`${this.baseUrl}/v1/workflow/create/order`, orderData);

  // ------------------------------------------- Orders -------------------------------------------
  private _orders = (): string => `${this.baseUrl}/v1/workflow/fetch/orders`;

  fetchOrders = async (
    user: string,
    category: OrderStatusCategory = OrderStatusCategory.OPEN,
  ): Promise<PlainObject<TerminalProductOrderResponse>> =>
    this.get<PlainObject<TerminalProductOrderResponse>>(
      this._orders(),
      undefined,
      undefined,
      {
        kerberos: user,
        category,
      },
    );

  cancelOrder = async (cancelData: {
    order_id: string;
    kerberos: string;
    comments: string;
    process_instance_id: string;
  }): Promise<PlainObject<{ status_code: number; message: string }>> =>
    this.post(`${this.baseUrl}/v1/workflow/cancel/order`, cancelData);

  // ------------------------------------------- Feedback -------------------------------------------

  private _feedback = (): string => `${this.baseUrl}/v1/feedback`;

  submitFeedback = async (
    feedbackData: FeedbackRequest,
  ): Promise<PlainObject<FeedbackResponse>> =>
    this.post(this._feedback(), feedbackData);
}
