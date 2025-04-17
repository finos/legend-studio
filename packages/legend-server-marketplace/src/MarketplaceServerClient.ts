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
import type { Vendor } from './models/Vendor.js';
import type { ProductSearchResult } from './models/ProductSearchResult.js';

export interface MarketplaceServerClientConfig {
  serverUrl: string;
}

interface MarketplaceServerResponse<T> {
  response_code: string;
  status: string;
  results: T;
}

export class MarketplaceServerClient extends AbstractServerClient {
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
  }

  // ------------------------------------------- Vendors -------------------------------------------

  private _vendors = (): string => `${this.baseUrl}/v1/vendors`;

  getVendors = (): Promise<PlainObject<Vendor>[]> => this.get(this._vendors());

  // ------------------------------------------- Search- -------------------------------------------

  private _search = (): string => `${this.baseUrl}/v1/search`;

  semanticSearch = async (
    query: string,
    vendorName: string,
    limit: number,
  ): Promise<PlainObject<ProductSearchResult>[]> =>
    (
      await this.get<
        MarketplaceServerResponse<PlainObject<ProductSearchResult>[]>
      >(
        `${this._search()}/semantic/catalog?query=${query}&vendor_name=${vendorName}&limit=${limit}`,
      )
    ).results;
}
