/**
 * Copyright (c) 2026-present, Goldman Sachs
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
import type { RegistryMetadataResponse } from './models/Registry.js';

export interface RegistryServerClientConfig {
  baseUrl: string;
}

export class RegistryServerClient extends AbstractServerClient {
  constructor(config: RegistryServerClientConfig) {
    super({
      baseUrl: `${config.baseUrl}/api`,
    });
  }

  private _registration = (): string => `${this.baseUrl}/registration`;

  getRegistrationMetadata = async (
    uri: string,
  ): Promise<PlainObject<RegistryMetadataResponse>> =>
    this.get<PlainObject<RegistryMetadataResponse>>(
      `${this._registration()}/uri/${uri}`,
    );
}
