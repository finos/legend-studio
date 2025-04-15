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

export interface DepotServerClientConfig {
  serverUrl: string;
}

export class MarketplaceServerClient extends AbstractServerClient {
  constructor(config: DepotServerClientConfig) {
    super({
      baseUrl: config.serverUrl,
    });
  }

  // ------------------------------------------- Vendors -------------------------------------------

  private _vendors = (): string => `${this.baseUrl}/v1/vendors`;

  getVendors = (): Promise<PlainObject<Vendor>[]> => this.get(this._vendors());

  // ------------------------------------------- Search- -------------------------------------------

  private _search = (): string => `${this.baseUrl}/v1/search`;

  semanticSearch = (
    query: string,
    vendorName: string,
    limit: number,
  ): Promise<PlainObject<ProductSearchResult>[]> =>
    this.get(
      `${this._search()}/semantic/catalog?query=${query}&vendor_name=${vendorName}&limit=${limit}`,
    );
}
