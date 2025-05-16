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
import type { IngestDeploymentServerConfig } from '../../application/LegendIngestionConfiguration.js';

export class IngestDiscoveryServerClient extends AbstractServerClient {
  constructor(url: string) {
    super({
      baseUrl: url,
    });
  }
  private _ingest = (): string =>
    `${this.baseUrl}/ingest/discovery/environments/producers`;

  private _env = (): string => `${this.baseUrl}/ingest/discovery/environments`;

  private _token = (token?: string) => ({
    Authorization: `Bearer ${token}`,
  });

  discover(
    token?: string | undefined,
  ): Promise<PlainObject<IngestDeploymentServerConfig[]>> {
    return this.get(`${this._env()}`, {}, this._token(token));
  }

  findProducerServer(
    id: number,
    level: string,
    token?: string | undefined,
  ): Promise<PlainObject<IngestDeploymentServerConfig>> {
    return this.get(
      `${this._ingest()}/${id}/${level}/search`,
      {},
      this._token(token),
    );
  }
}
