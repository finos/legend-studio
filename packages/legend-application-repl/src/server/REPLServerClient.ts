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
  guaranteeNonNullable,
  type NetworkClient,
  type PlainObject,
} from '@finos/legend-shared';
import type { REPLGridServerResult } from '../components/grid/REPLGridServerResult.js';
import type { V1_Lambda } from '@finos/legend-graph';

export class REPLServerClient {
  private readonly networkClient: NetworkClient;

  constructor(networkClient: NetworkClient) {
    this.networkClient = networkClient;
  }

  get baseUrl(): string {
    return guaranteeNonNullable(
      this.networkClient.baseUrl,
      `REPL client has not been configured properly`,
    );
  }

  getREPLGridServerResult = (
    request: PlainObject<V1_Lambda>,
  ): Promise<PlainObject<REPLGridServerResult>> =>
    this.networkClient.post(
      `${this.baseUrl}/gridResult`,
      request,
      undefined,
      undefined,
    );

  getIntialQueryLambda = (): Promise<PlainObject<V1_Lambda>> =>
    this.networkClient.get(
      `${this.baseUrl}/initialLambda`,
      undefined,
      undefined,
      undefined,
    );

  getInitialREPLGridServerResult = (): Promise<
    PlainObject<REPLGridServerResult>
  > =>
    this.networkClient.get(
      `${this.baseUrl}/gridResult`,
      undefined,
      undefined,
      undefined,
    );

  getLicenseKey = (): Promise<string> =>
    this.networkClient.get(
      `${this.baseUrl}/licenseKey`,
      undefined,
      undefined,
      undefined,
    );
}
