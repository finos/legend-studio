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

import type { V1_TerminalProvisionPayload } from '@finos/legend-graph';
import { AbstractServerClient, type PlainObject } from '@finos/legend-shared';

export interface TerminalAccessServerClientConfig {
  baseUrl: string;
}

export class TerminalAccessServerClient extends AbstractServerClient {
  constructor(config: TerminalAccessServerClientConfig) {
    super({
      baseUrl: config.baseUrl,
    });
  }

  // ------------------------------------------- Terminals -------------------------------------------

  private _terminal = (): string => `${this.baseUrl}`;

  createTerminalOrder = (
    provisionRequest: PlainObject<V1_TerminalProvisionPayload>,
  ): Promise<PlainObject> => {
    return this.post(
      `${this._terminal()}/workflow/create/order`,
      provisionRequest,
    );
  };

  orderableTerminals = (kerberos: string): Promise<PlainObject> => {
    return this.get(
      `${this._terminal()}/service/list/desktop`,
      {},
      {},
      { kerberos },
    );
  };
}
