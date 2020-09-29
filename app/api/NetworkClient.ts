/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// NOTE: Why use `whatwg-fetch`? It's Github's polyfill for a subset of features of Fetch API.
// See https://github.com/github/fetch#read-this-first
// What about `axios`? `axios` has pretty nice API, but larger for no reason (also why don't use
// native approach that the language supports)
// See https://github.com/axios/axios/issues/1333#issuecomment-511375282
// What about `node-fetch`? `node-fetch` is for server-side and `whatwg-fetch` is for client-side
// See https://www.npmjs.com/package/node-fetch#motivation

import { Span } from 'opentracing';
import { tracerClient, TRACER_TAG, TRACER_SPAN } from 'API/TracerClient';
import { StatusCodes } from 'http-status-codes';
import { isNonNullable, IllegalStateError, guaranteeNonNullable, isString, isObject, AssertionError } from 'Utilities/GeneralUtil';

export const HttpStatus = StatusCodes;
export const CHARSET = 'charset=utf-8';

export enum ContentType {
  APPLICATION_JSON = 'application/json',
  APPLICATION_XML = 'application/xml',
  APPLICATION_ZLIB = 'application/zlib',
  TEXT_PLAIN = 'text/plain',
  ALL = '*/*',
}

enum HttpMethod {
  GET = 'GET',
  PUT = 'PUT',
  POST = 'POST',
  DELETE = 'DELETE'
}

export const DEFAULT_OPTIONS = {
  mode: 'cors', // allow CORS - See https://developer.mozilla.org/en-US/docs/Web/API/Request/mode
  credentials: 'include', // allow sending credentials to other domain
  redirect: 'manual', // avoid following authentication redirects
};

/**
 * NOTE: the latter headers value will override the those of the first
 */
export const mergeRequestHeaders = (headersOne: RequestHeaders | undefined, headersTwo: RequestHeaders | undefined): RequestHeaders => {
  const requestHeaders: RequestHeaders = {};
  if (headersOne) { Object.entries(headersOne).forEach(([key, value]) => { requestHeaders[key] = value }) }
  if (headersTwo) { Object.entries(headersTwo).forEach(([key, value]) => { requestHeaders[key] = value }) }
  return requestHeaders;
};

const MAX_ERROR_MESSAGE_LENGTH = 500;

type ParamterValue = string | number | boolean | undefined;
/**
 * NOTE: we could not use the Headers class object since `fetch`
 * does not process it but treat it simply as an object, so we will in fact
 * lose header if we send the network request. As such we create this
 * type for request header purely for annotation purpose
 * See https://github.github.io/fetch/
 */
export type RequestHeaders = Record<string, string>;
export type Parameters = Record<string, ParamterValue | ParamterValue[]>;
export type ClientResponse = unknown;
export type Payload = Record<PropertyKey, unknown> | string;

/**
 * Custom error for service client with response details.
 * NOTE: Since is particular to execution error we might want to separate this out to another place and leave network client
 * as pure/generic as possible
 */
const extractMessage = (payload: Payload): string => {
  if (isObject(payload) && isString(payload.message)) { return payload.message }
  return isString(payload) ? payload : '';
};

// NOTE: status 0 is either timeout or client error possibly caused by authentication
export const unauthenticated = (response: Response): boolean => response.status === 0 || response.status === HttpStatus.UNAUTHORIZED;

export const authenticate = (authenticationUrl: string): Promise<void> => new Promise((resolve: Function): void => {
  const id = 'AUTHENTICATION_IFRAME';
  const previous = document.getElementById(id);
  previous?.remove();
  const element = document.createElement('iframe');
  element.id = id;
  element.src = authenticationUrl;
  element.style.display = 'none';
  element.addEventListener('load', (): void => {
    element.remove();
    resolve();
  });
  document.body.appendChild(element);
});

export class NetworkClientError extends Error {
  response: Response & { data?: Record<PropertyKey, unknown> };
  payload?: Payload;

  constructor(response: Response, payload: Payload | undefined) {
    super();
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    // This only works in Chrome for now. Firefox (as of Feb 2020) will throw error
    // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
    Error.captureStackTrace(this, NetworkClientError);
    this.name = 'Network Client Error';
    this.response = response;
    const { status, statusText, url } = response;
    const summary = `Received response with status ${status} (${statusText}) for ${url}`;
    this.message = (payload ? extractMessage(payload).substr(0, MAX_ERROR_MESSAGE_LENGTH) : '') || summary;
    this.payload = payload;
  }
}

const makeUrl = (baseUrl: string | undefined, relativeUrl: string, parameters?: Parameters): string => {
  const url = new URL(relativeUrl, baseUrl ?? window.location.href);
  if (parameters instanceof Object) {
    Object.entries(parameters)
      .forEach(([name, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            // if value is an array, keep adding it to the URL with the same parameter name, for example: /reviews?revisionIds=rev2&revisionIds=rev1
            value.filter(isNonNullable).forEach(subVal => url.searchParams.append(name, subVal.toString()));
          } else {
            url.searchParams.append(name, value.toString());
          }
        }
      });
  }
  return url.toString();
};

// NOTE: in case of missing CORS headers, failed authentication manifests itself as CORS error
const couldBeCORS = (error: Error): boolean => error instanceof TypeError && error.message === 'Failed to fetch';

const err = async (response: Response): Promise<NetworkClientError> => {
  let payload;
  try {
    payload = await response.text();
    payload = JSON.parse(payload) as Payload;
  } catch {
    // NOTE: ignored, above is best effort
  }
  return Promise.reject(new NetworkClientError(response, payload));
};

const unwrap = async <T extends ClientResponse>(response: Response, init: RequestInit, tracingSpan?: Span): Promise<T> => {
  const accept = (init.headers as RequestHeaders).Accept;
  if (accept !== ContentType.APPLICATION_JSON && accept !== ContentType.TEXT_PLAIN) {
    return Promise.reject(new NetworkClientError(response, `Unexpected request accept type '${accept}'`));
  }
  tracingSpan?.setTag(TRACER_TAG.HTTP_STATUS, `${response.status} (${response.statusText})`);
  return response.ok
    ? response.status === HttpStatus.NO_CONTENT
      ? Promise.resolve(response)
      : accept === ContentType.APPLICATION_JSON
        ? await response.json()
        : await response.text()
    // TODO: might need to handle */* ContentType and other types
    // See https://github.github.io/fetch/
    : await err(response);
};

const retry = async <T extends ClientResponse>(url: string, init: RequestInit, authenticationUrl: string, tracingSpan?: Span): Promise<T> =>
  authenticate(authenticationUrl).then(() => fetch(url, init)).then(response => unwrap(response, init, tracingSpan));

/**
 * Simple "fetch" wrapper for JSON endpoints. For "options" see "fetch" documentation for "init".
 */
class NetworkClient {
  static instance: NetworkClient;
  private configured = false;
  private options = {};
  private baseUrl?: string;
  private authenticationUrl?: string; // help to re-authenticate app automatically

  constructor(options = {}, baseUrl?: string) {
    this.baseUrl = baseUrl;
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  configure(authenticationUrl: string): void {
    if (this.configured) { throw new IllegalStateError('Network client initialization should only happen once') }
    this.authenticationUrl = authenticationUrl;
    this.configured = true;
  }

  get authUrl(): string { return guaranteeNonNullable(this.authenticationUrl, 'Authentication URL has not been configured') }

  async get<T extends ClientResponse>(url: string, options: RequestInit = {}, headers?: RequestHeaders, parameters?: Parameters): Promise<T> {
    // NOTE: do not use Content-Type for GET to avoid unnecessary pre-flight when cross-origin
    return this.request(HttpMethod.GET, url, undefined, options, headers, parameters);
  }

  async put<T extends ClientResponse>(url: string, data: unknown = {}, options: RequestInit = {}, headers?: RequestHeaders, parameters?: Parameters): Promise<T> {
    return this.request(HttpMethod.PUT, url, data, options, headers, parameters);
  }

  async post<T extends ClientResponse>(url: string, data: unknown = {}, options: RequestInit = {}, headers?: RequestHeaders, parameters?: Parameters): Promise<T> {
    return this.request(HttpMethod.POST, url, data, options, headers, parameters);
  }

  async delete<T extends ClientResponse>(url: string, data: unknown = {}, options: RequestInit = {}, headers?: RequestHeaders, parameters?: Parameters): Promise<T> {
    return this.request(HttpMethod.DELETE, url, data, options, headers, parameters);
  }

  async getWithTracing<T extends ClientResponse>(tracingSpanName: TRACER_SPAN, url: string, options: RequestInit = {}, headers?: RequestHeaders, parameters?: Parameters, tracingTags?: Record<PropertyKey, unknown>): Promise<T> {
    // NOTE: do not use Content-Type for GET to avoid unnecessary pre-flight when cross-origin
    return tracerClient.wrapInSpan(tracingSpanName, tracingTags ?? {}, span => this.request(HttpMethod.GET, url, undefined, options, headers, parameters, span));
  }

  async putWithTracing<T extends ClientResponse>(tracingSpanName: TRACER_SPAN, url: string, data: unknown = {}, options: RequestInit = {}, headers?: RequestHeaders, parameters?: Parameters, tracingTags?: Record<PropertyKey, unknown>): Promise<T> {
    return tracerClient.wrapInSpan(tracingSpanName, tracingTags ?? {}, span => this.request(HttpMethod.PUT, url, data, options, headers, parameters, span));
  }

  async postWithTracing<T extends ClientResponse>(tracingSpanName: TRACER_SPAN, url: string, data: unknown = {}, options: RequestInit = {}, headers?: RequestHeaders, parameters?: Parameters, tracingTags?: Record<PropertyKey, unknown>): Promise<T> {
    return tracerClient.wrapInSpan(tracingSpanName, tracingTags ?? {}, span => this.request(HttpMethod.POST, url, data, options, headers, parameters, span));
  }

  async deleteWithTracing<T extends ClientResponse>(tracingSpanName: TRACER_SPAN, url: string, data: unknown = {}, options: RequestInit = {}, headers?: RequestHeaders, parameters?: Parameters, tracingTags?: Record<PropertyKey, unknown>): Promise<T> {
    return tracerClient.wrapInSpan(tracingSpanName, tracingTags ?? {}, span => this.request(HttpMethod.DELETE, url, data, options, headers, parameters, span));
  }

  async request<T extends ClientResponse>(method: HttpMethod, url: string, data: unknown = undefined, options: RequestInit, headers?: RequestHeaders, parameters?: Parameters, tracingSpan?: Span): Promise<T> {
    const requestUrl = makeUrl(this.baseUrl, url, parameters);
    let body: Blob | string | undefined;
    if (data !== undefined) {
      if (isString(data) || data instanceof Blob) {
        body = data;
      } else if (isObject(data)) {
        body = JSON.stringify(data);
      } else {
        throw new AssertionError(`Request body can only be either a 'string' or an 'object'`);
      }
    }
    const requestInit = { ...this.options, ...options, method, body };
    const baseRequestHeaders: RequestHeaders = {};
    /**
     * NOTE: here we set the accept header to application/json instead of the default value
     * as that will imply the server can send us text/html sometimes when there is an
     * authentication problem, which is not desirable.
     */
    baseRequestHeaders.Accept = ContentType.APPLICATION_JSON;
    if (method !== HttpMethod.GET) { baseRequestHeaders['Content-Type'] = `${ContentType.APPLICATION_JSON}; ${CHARSET}` }
    requestInit.headers = mergeRequestHeaders(baseRequestHeaders, headers);

    let placeholderSpan: Span | undefined = undefined;
    if (tracingSpan) {
      placeholderSpan = tracerClient.createPlaceholderChildSpan(tracingSpan, method.toString(), requestUrl, requestInit.headers);
    }

    return fetch(requestUrl, requestInit)
      .then(response => (unauthenticated(response) ? retry<T>(requestUrl, requestInit, this.authUrl, tracingSpan) : unwrap<T>(response, requestInit, tracingSpan)))
      .catch(error => (couldBeCORS(error) ? retry<T>(requestUrl, requestInit, this.authUrl, tracingSpan) : Promise.reject(error)))
      .finally(() => {
        placeholderSpan?.finish();
        tracingSpan?.finish();
      });
  }
}

NetworkClient.instance = new NetworkClient();
export const client = NetworkClient.instance;
