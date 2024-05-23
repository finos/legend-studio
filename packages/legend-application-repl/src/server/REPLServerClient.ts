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
import type { CompletionItem } from '../stores/CompletionResult.js';
import { TDSQuery } from '../components/grid/TDSQuery.js';

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

  executeLambda = (
    lambda: string,
    isPaginationEnabled: boolean,
  ): Promise<PlainObject<REPLGridServerResult>> =>
    this.networkClient.post(
      `${this.baseUrl}/executeLambda`,
      lambda,
      undefined,
      undefined,
      {
        isPaginationEnabled,
      },
    );

  getTypeaheadResults = (
    lambda: string,
  ): Promise<PlainObject<CompletionItem>[]> =>
    this.networkClient.post(
      `${this.baseUrl}/typeahead`,
      lambda,
      undefined,
      undefined,
    );

  parseQuery = (lambda: string): Promise<void> =>
    this.networkClient.post(
      `${this.baseUrl}/parseQuery`,
      lambda,
      undefined,
      undefined,
    );

  getInitialREPLGridServerResult = (
    isPaginationEnabled: boolean,
  ): Promise<PlainObject<REPLGridServerResult>> =>
    this.networkClient.get(`${this.baseUrl}/gridResult`, undefined, undefined, {
      isPaginationEnabled,
    });

  getLicenseKey = (): Promise<string> =>
    this.networkClient.get(
      `${this.baseUrl}/licenseKey`,
      undefined,
      undefined,
      undefined,
    );

  getREPLQuery = (queryId: string): Promise<PlainObject<TDSQuery>> =>
    this.networkClient.get(
      `${this.baseUrl}/query/${queryId}`,
      undefined,
      undefined,
      undefined,
    );

  saveQuery = (tdsQuery: PlainObject<TDSQuery>): Promise<string> =>
    this.networkClient.post(
      `${this.baseUrl}/saveQuery`,
      tdsQuery,
      undefined,
      undefined,
    );
}
