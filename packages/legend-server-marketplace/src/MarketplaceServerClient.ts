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

import { type PlainObject, AbstractServerClient } from '@finos/legend-shared';
import type {
  LightProvider,
  TerminalServicesResponse,
  ProductType,
} from './models/Provider.js';
import type { DataProductSearchResult } from './models/DataProductSearchResult.js';
import type {
  SubscriptionRequest,
  SubscriptionResponse,
} from './models/Subscription.js';
import type {
  CartItem,
  CartItemRequest,
  CartItemResponse,
  CartSummary,
} from './models/Cart.js';
import type { OrderDetails } from './models/Order.js';
import type { V1_EntitlementsLakehouseEnvironmentType } from '@finos/legend-graph';
import {
  type TerminalProductOrderResponse,
  OrderStatusCategory,
} from './models/TerminalProductOrder.js';
import type { FetchProductsParams } from '@finos/legend-application-marketplace';

export interface MarketplaceServerClientConfig {
  serverUrl: string;
  subscriptionUrl: string;
}

interface MarketplaceServerResponse<T> {
  response_code: string;
  status: string;
  results: T;
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

  dataProductSearch = async (
    query: string,
    lakehouseEnv: V1_EntitlementsLakehouseEnvironmentType,
    searchType: string = 'hybrid',
  ): Promise<PlainObject<DataProductSearchResult>[]> =>
    (
      await this.get<
        MarketplaceServerResponse<PlainObject<DataProductSearchResult>[]>
      >(
        `${this._search()}/dataProducts/${lakehouseEnv}?query=${query}&search_type=${searchType}`,
      )
    ).results;

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
}
