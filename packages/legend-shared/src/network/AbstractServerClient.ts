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

import type {
  Parameters,
  RequestHeaders,
  RequestProcessConfig,
  ResponseProcessConfig,
} from './NetworkUtils';
import {
  HttpMethod,
  makeUrl,
  createRequestHeaders,
  NetworkClient,
} from './NetworkUtils';
import type { TraceData, TracerServicePlugin } from './TracerService';
import { TracerService } from './TracerService';

export interface ServerClientConfig {
  baseUrl?: string;
  networkClientOptions?: Record<PropertyKey, unknown>;
  enableCompression?: boolean;
  /**
   * This supports a basic re-authenticate mechanism using <iframe>.
   * The provided URL will be loaded in the <iframe> in the background
   * and supposedly re-authentication would happen without user's action
   * i.e. could be that auth cookie is being refreshed.
   *
   * NOTE: this is very specific to the deployment context.
   */
  autoReAuthenticateUrl?: string;
}

/**
 * This is a template for server clients, it is a wrapper around `NetworkClient` with more features
 * such as request payload compression, etc.
 */
export abstract class AbstractServerClient {
  protected networkClient: NetworkClient;
  private readonly tracerService = new TracerService();
  enableCompression: boolean;
  baseUrl?: string | undefined;
  autoReAuthenticateUrl?: string | undefined;

  constructor(config: ServerClientConfig) {
    this.networkClient = new NetworkClient({
      baseUrl: config.baseUrl,
      options: config.networkClientOptions,
    });
    this.baseUrl = config.baseUrl;
    this.enableCompression = Boolean(config.enableCompression);
    this.autoReAuthenticateUrl = config.autoReAuthenticateUrl;
  }

  setBaseUrl(val: string | undefined): void {
    this.baseUrl = val;
    this.networkClient.baseUrl = val;
  }

  setCompression(val: boolean): void {
    this.enableCompression = val;
  }

  registerTracerServicePlugins(plugins: TracerServicePlugin<unknown>[]): void {
    this.tracerService.registerPlugins(plugins);
  }

  async get<T>(
    url: string,
    options: RequestInit = {},
    headers?: RequestHeaders,
    parameters?: Parameters,
    requestProcessConfig?: RequestProcessConfig,
    responseProcessConfig?: ResponseProcessConfig,
  ): Promise<T> {
    // NOTE: do not use Content-Type for GET to avoid unnecessary pre-flight when cross-origin
    return this.request(
      HttpMethod.GET,
      url,
      undefined,
      options,
      headers,
      parameters,
      requestProcessConfig,
      responseProcessConfig,
    );
  }

  async put<T>(
    url: string,
    data: unknown = {},
    options: RequestInit = {},
    headers?: RequestHeaders,
    parameters?: Parameters,
    requestProcessConfig?: RequestProcessConfig,
    responseProcessConfig?: ResponseProcessConfig,
  ): Promise<T> {
    return this.request(
      HttpMethod.PUT,
      url,
      data,
      options,
      headers,
      parameters,
      requestProcessConfig,
      responseProcessConfig,
    );
  }

  async post<T>(
    url: string,
    data: unknown = {},
    options: RequestInit = {},
    headers?: RequestHeaders,
    parameters?: Parameters,
    requestProcessConfig?: RequestProcessConfig,
    responseProcessConfig?: ResponseProcessConfig,
  ): Promise<T> {
    return this.request(
      HttpMethod.POST,
      url,
      data,
      options,
      headers,
      parameters,
      requestProcessConfig,
      responseProcessConfig,
    );
  }

  async delete<T>(
    url: string,
    data: unknown = {},
    options: RequestInit = {},
    headers?: RequestHeaders,
    parameters?: Parameters,
    requestProcessConfig?: RequestProcessConfig,
    responseProcessConfig?: ResponseProcessConfig,
  ): Promise<T> {
    return this.request(
      HttpMethod.DELETE,
      url,
      data,
      options,
      headers,
      parameters,
      requestProcessConfig,
      responseProcessConfig,
    );
  }

  async getWithTracing<T>(
    traceData: TraceData,
    url: string,
    options: RequestInit = {},
    headers?: RequestHeaders,
    parameters?: Parameters,
    requestProcessConfig?: RequestProcessConfig,
    responseProcessConfig?: ResponseProcessConfig,
  ): Promise<T> {
    // NOTE: do not use Content-Type for GET to avoid unnecessary pre-flight when cross-origin
    return this.request(
      HttpMethod.GET,
      url,
      undefined,
      options,
      headers,
      parameters,
      requestProcessConfig,
      responseProcessConfig,
      traceData,
    );
  }

  async putWithTracing<T>(
    traceData: TraceData,
    url: string,
    data: unknown = {},
    options: RequestInit = {},
    headers?: RequestHeaders,
    parameters?: Parameters,
    requestProcessConfig?: RequestProcessConfig,
    responseProcessConfig?: ResponseProcessConfig,
  ): Promise<T> {
    return this.request(
      HttpMethod.PUT,
      url,
      data,
      options,
      headers,
      parameters,
      requestProcessConfig,
      responseProcessConfig,
      traceData,
    );
  }

  async postWithTracing<T>(
    traceData: TraceData,
    url: string,
    data: unknown = {},
    options: RequestInit = {},
    headers?: RequestHeaders,
    parameters?: Parameters,
    requestProcessConfig?: RequestProcessConfig,
    responseProcessConfig?: ResponseProcessConfig,
  ): Promise<T> {
    return this.request(
      HttpMethod.POST,
      url,
      data,
      options,
      headers,
      parameters,
      requestProcessConfig,
      responseProcessConfig,
      traceData,
    );
  }

  async deleteWithTracing<T>(
    traceData: TraceData,
    url: string,
    data: unknown = {},
    options: RequestInit = {},
    headers?: RequestHeaders,
    parameters?: Parameters,
    requestProcessConfig?: RequestProcessConfig,
    responseProcessConfig?: ResponseProcessConfig,
  ): Promise<T> {
    return this.request(
      HttpMethod.DELETE,
      url,
      data,
      options,
      headers,
      parameters,
      requestProcessConfig,
      responseProcessConfig,
      traceData,
    );
  }

  async request<T>(
    method: HttpMethod,
    url: string,
    data: unknown,
    options: RequestInit,
    headers?: RequestHeaders | undefined,
    parameters?: Parameters | undefined,
    requestProcessConfig?: RequestProcessConfig | undefined,
    responseProcessConfig?: ResponseProcessConfig | undefined,
    traceData?: TraceData | undefined,
  ): Promise<T> {
    const requestUrl = makeUrl(
      this.networkClient.baseUrl,
      url,
      parameters ?? {},
    );
    // tracing
    const trace = this.tracerService.createTrace(
      traceData,
      method.toString(),
      requestUrl,
      createRequestHeaders(method, headers),
    );
    return this.networkClient
      .request<T>(
        method,
        url,
        data,
        options,
        headers,
        parameters,
        {
          ...(requestProcessConfig ?? {}),
          enableCompression:
            requestProcessConfig?.enableCompression && this.enableCompression,
        },
        {
          ...(responseProcessConfig ?? {}),
          preprocess: (response: Response) => trace.bootstrap(response),
          autoReAuthenticateUrl: this.autoReAuthenticateUrl,
        },
      )
      .then((result) => {
        trace.reportSuccess();
        return Promise.resolve(result);
      })
      .catch((error) => {
        trace.reportError(error);
        return Promise.reject(error);
      })
      .finally(() => {
        trace.close();
      });
  }
}
