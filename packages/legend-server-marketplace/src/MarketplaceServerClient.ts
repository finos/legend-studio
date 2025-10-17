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
import type { LightProvider, TerminalResult } from './models/Provider.js';
import type {
  DataProduct,
  DataProductSearchResult,
} from './models/DataProduct.js';
import type { Subscription } from './models/Subscription.js';
import type {
  CartItem,
  CartItemRequest,
  CartItemResponse,
  CartSummary,
} from './models/Cart.js';
import type { OrderDetails } from './models/Order.js';

export interface MarketplaceServerClientConfig {
  serverUrl: string;
  subscriptionUrl: string;
}

interface TerminalAddOnServerResponse<T> {
  hrid: string;
  desktops?: T;
  addons?: T;
  landing_addons?: T;
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

  getVendorsByCategory = async (
    user: string,
    category: string,
    viewType: string,
    filters: string,
    limit: number,
  ): Promise<PlainObject<TerminalResult>[]> => {
    const response = await this.get<
      TerminalAddOnServerResponse<PlainObject<TerminalResult>[]>
    >(`${this.baseUrl}/v1/service/${viewType}/${category}?kerberos=${user}`);
    let result = [];
    if (viewType === 'landing') {
      result =
        category === 'desktop'
          ? (response.desktops ?? [])
          : (response.landing_addons ?? []);
    } else {
      result =
        category === 'desktop'
          ? (response.desktops ?? [])
          : (response.addons ?? []);
    }

    return result;
  };

  // ------------------------------------------- Search- -------------------------------------------

  private _search = (): string => `${this.baseUrl}/v1/search`;

  semanticSearch = async (
    query: string,
    vendorName: string,
    limit: number,
  ): Promise<PlainObject<DataProductSearchResult>[]> =>
    (
      await this.get<
        MarketplaceServerResponse<PlainObject<DataProductSearchResult>[]>
      >(
        `${this._search()}/semantic/catalog?query=${query}&vendor_name=${vendorName}&limit=${limit}`,
      )
    ).results;

  // ------------------------------------------- Subscriptions -----------------------------------------

  getSubscriptions = async (
    user: string,
  ): Promise<PlainObject<Subscription>[]> =>
    (
      await this.get<{ subscription_feeds: PlainObject<Subscription>[] }>(
        `${this.subscriptionUrl}/v1/service/subscription/${user}`,
      )
    ).subscription_feeds;

  // ------------------------------------------- Data Products -----------------------------------------

  private _dataProducts = (): string => `${this.baseUrl}/v1/products`;

  getDataProducts = async (
    page_size: number,
  ): Promise<PlainObject<DataProduct>[]> =>
    (
      await this.get<MarketplaceServerResponse<PlainObject<DataProduct>[]>>(
        `${this._dataProducts()}/?page_size=${page_size}`,
      )
    ).results;

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
}
