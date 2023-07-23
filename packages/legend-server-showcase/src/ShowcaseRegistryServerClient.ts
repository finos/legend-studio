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

import { NetworkClient, type PlainObject } from '@finos/legend-shared';
import { Showcase, ShowcaseMetadata } from './Showcase.js';
import type { ShowcaseTextSearchResult } from './ShowcaseSearchResult.js';

export class ShowcaseRegistryServerClient {
  private readonly networkClient: NetworkClient;
  private readonly baseUrl: string;

  constructor(config: { baseUrl: string }) {
    this.networkClient = new NetworkClient({
      ...config,
      options: {
        // NOTE: with the way we setup this server, we allow any (*) origin for CORS
        // so here we have to explicit omit credentials
        // See https://fetch.spec.whatwg.org/#concept-request-credentials-mode
        credentials: 'omit',
      },
    });
    this.baseUrl = config.baseUrl;
  }

  async getShowcases(): Promise<ShowcaseMetadata[]> {
    return (
      await this.networkClient.get<PlainObject<ShowcaseMetadata>[]>(
        `${this.baseUrl}/showcases`,
      )
    ).map((showcase) => ShowcaseMetadata.serialization.fromJson(showcase));
  }

  async getShowcase(path: string): Promise<Showcase> {
    return Showcase.serialization.fromJson(
      await this.networkClient.get(
        `${this.baseUrl}/showcase/${encodeURIComponent(path)}`,
      ),
    );
  }

  search(searchText: string): Promise<ShowcaseTextSearchResult> {
    return this.networkClient.get(
      `${this.baseUrl}/showcases/search`,
      {},
      {},
      {
        searchText: encodeURIComponent(searchText),
      },
    );
  }
}
