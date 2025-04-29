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

import { AbstractServerClient, type PlainObject } from '@finos/legend-shared';

export interface MarketplaceLakehouseServerClientConfig {
  baseUrl: string;
}

export class MarketplaceLakehouseServerClient extends AbstractServerClient {
  constructor(config: MarketplaceLakehouseServerClientConfig) {
    super({
      baseUrl: config.baseUrl,
    });
  }

  // --------------------------------------- Contracts ---------------------------------------

  private _contracts = (): string => `${this.baseUrl}/v1/contracts`;

  getDataProducts = (token?: string | undefined): Promise<PlainObject[]> =>
    this.get(
      `${this._contracts()}/dataProducts`,
      {},
      { Authorization: `Bearer ${token}` },
    );
}
