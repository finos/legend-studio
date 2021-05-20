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

import { StatusCodes } from 'http-status-codes';
import {
  isNonNullable,
  isString,
  isObject,
  AssertionError,
  assertTrue,
} from './AssertionUtils';
import { deflate } from 'pako';

/**
 * Unlike the download call (GET requests) which is gziped, the upload call send uncompressed data which is in megabytes realms
 * for bigger project. This really slows down operations. As such, we compress data using `zlib` for all network calls to execution
 * server. This requires the backend to uncompress, which for small models might end up adding a little overhead, so in the future, we might
 * want to make this decision `to compress or to not compress` more smartly and dynamicly (e.g. potentially to scan the size of the data/model
 * and decide the compression strategy).
 */
const compressData = (data: Record<PropertyKey, unknown> | string): Blob =>
  new Blob([deflate(isObject(data) ? JSON.stringify(data) : data)]);

export const HttpStatus = StatusCodes;
export const CHARSET = 'charset=utf-8';

export enum ContentType {
  APPLICATION_JSON = 'application/json',
  APPLICATION_XML = 'application/xml',
  APPLICATION_ZLIB = 'application/zlib',
  TEXT_PLAIN = 'text/plain',
  ALL = '*/*',
}

export enum HttpMethod {
  GET = 'GET',
  PUT = 'PUT',
  POST = 'POST',
  DELETE = 'DELETE',
}

const DEFAULT_CLIENT_REQUEST_OPTIONS = {
  mode: 'cors', // allow CORS - See https://developer.mozilla.org/en-US/docs/Web/API/Request/mode
  credentials: 'include', // allow sending credentials to other domain
  redirect: 'manual', // avoid following authentication redirects
};

/**
 * NOTE: the latter headers value will override the those of the first
 */
export const mergeRequestHeaders = (
  headersOne: RequestHeaders | undefined,
  headersTwo: RequestHeaders | undefined,
): RequestHeaders => {
  const requestHeaders: RequestHeaders = {};
  if (headersOne) {
    Object.entries(headersOne).forEach(([key, value]) => {
      requestHeaders[key] = value;
    });
  }
  if (headersTwo) {
    Object.entries(headersTwo).forEach(([key, value]) => {
      requestHeaders[key] = value;
    });
  }
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
export type Payload = Record<PropertyKey, unknown> | string;

/**
 * Custom error for service client with response details.
 * NOTE: Since is particular to execution error we might want to separate this out to another place and leave network client
 * as pure/generic as possible
 */
const extractMessage = (payload: Payload): string => {
  if (isObject(payload) && isString(payload.message)) {
    return payload.message;
  }
  return isString(payload) ? payload : '';
};

// NOTE: status 0 is either timeout or client error possibly caused by authentication
export const unauthenticated = (response: Response): boolean =>
  response.status === 0 || response.status === HttpStatus.UNAUTHORIZED;

export const authenticate = (authenticationUrl: string): Promise<void> =>
  new Promise((resolve: Function): void => {
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
    if (typeof Error.captureStackTrace === 'function') {
      // Maintains proper stack trace for where our error was thrown (only available on V8)
      // This only works in Chrome for now. Firefox (as of Feb 2020) will throw error
      // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
      Error.captureStackTrace(this, this.constructor);
    } else {
      // otherwise, use the non-standard but defacto stack trace (available in most browser)
      this.stack = new Error().stack;
    }
    this.name = 'Network Client Error';
    this.response = response;
    const { status, statusText, url } = response;
    const summary = `Received response with status ${status} (${statusText}) for ${url}`;
    this.message =
      (payload
        ? extractMessage(payload).substr(0, MAX_ERROR_MESSAGE_LENGTH)
        : '') || summary;
    this.payload = payload;
  }
}

export const makeUrl = (
  baseUrl: string | undefined,
  relativeUrl: string,
  parameters: Parameters,
): string => {
  const url = new URL(relativeUrl, baseUrl ?? window.location.href);
  if (parameters instanceof Object) {
    Object.entries(parameters).forEach(([name, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          // if value is an array, keep adding it to the URL with the same parameter name, for example: /reviews?revisionIds=rev2&revisionIds=rev1
          value
            .filter(isNonNullable)
            .forEach((subVal) =>
              url.searchParams.append(name, subVal.toString()),
            );
        } else {
          url.searchParams.append(name, value.toString());
        }
      }
    });
  }
  return url.toString();
};

// NOTE: in case of missing CORS headers, failed authentication manifests itself as CORS error
const couldBeCORS = (error: Error): boolean =>
  error instanceof TypeError && error.message === 'Failed to fetch';

export interface ResponseProcessConfig {
  skipProcessing?: boolean;
  preprocess?: (response: Response) => void;
  authenticationUrl?: string;
}

export interface RequestProcessConfig {
  enableCompression?: boolean;
}

const processResponse = async <T>(
  response: Response,
  init: RequestInit,
  responseProcessConfig?: ResponseProcessConfig,
): Promise<T> => {
  responseProcessConfig?.preprocess?.(response);
  if (!response.ok) {
    let payload;
    try {
      payload = await response.text();
      payload = JSON.parse(payload) as Payload;
    } catch {
      // NOTE: ignored, above is best effort
    }
    return Promise.reject(new NetworkClientError(response, payload));
  }
  if (responseProcessConfig?.skipProcessing) {
    return Promise.resolve(response) as unknown as Promise<T>;
  }
  if (response.status === HttpStatus.NO_CONTENT) {
    return Promise.resolve(undefined) as unknown as Promise<T>;
  }
  // TODO: might need to handle */* ContentType and other types
  // Note that right now what we support is rather simplistic, as we always expect `application/json` or `text/plain`
  // and use these to determine how we should decode the response. However, we should properly allow passing in
  // a field in response process config to specify the format of the expected response body
  //
  // See https://www.npmjs.com/package/mime-types
  // See https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types
  // See https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types
  // See https://github.github.io/fetch/
  const accept = (init.headers as RequestHeaders).Accept;
  switch (accept) {
    case ContentType.APPLICATION_JSON:
      return response.json();
    case ContentType.TEXT_PLAIN:
      return response.text() as unknown as Promise<T>;
    default:
      return Promise.reject(
        new NetworkClientError(
          response,
          `Can't process response for request with Content-Type '${accept}'`,
        ),
      );
  }
};

const retry = async <T>(
  url: string,
  init: RequestInit,
  responseProcessConfig?: ResponseProcessConfig,
): Promise<T> => {
  if (responseProcessConfig?.authenticationUrl) {
    return authenticate(responseProcessConfig.authenticationUrl)
      .then(() => fetch(url, init))
      .then((response) =>
        processResponse(response, init, responseProcessConfig),
      );
  }
  return fetch(url, init).then((response) =>
    processResponse(response, init, responseProcessConfig),
  );
};

export const createRequestHeaders = (
  method: HttpMethod,
  headers?: RequestHeaders,
): RequestHeaders => {
  const baseRequestHeaders: RequestHeaders = {};
  /**
   * NOTE: here we set the accept header to application/json instead of the default value
   * as that will imply the server can send us text/html sometimes when there is an
   * authentication problem, which is not desirable.
   */
  baseRequestHeaders.Accept = ContentType.APPLICATION_JSON;
  if (method !== HttpMethod.GET) {
    baseRequestHeaders[
      'Content-Type'
    ] = `${ContentType.APPLICATION_JSON}; ${CHARSET}`;
  }
  return mergeRequestHeaders(baseRequestHeaders, headers);
};

interface NetworkClientConfig {
  options?: Record<PropertyKey, unknown>;
  baseUrl?: string;
}

/**
 * Simple wrapper around native `fetch` API. For `options`, see documentation for "init"
 * See https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
 */
export class NetworkClient {
  private options = {};
  baseUrl?: string;

  constructor(config?: NetworkClientConfig) {
    this.baseUrl = config?.baseUrl;
    this.options = {
      ...DEFAULT_CLIENT_REQUEST_OPTIONS,
      ...(config?.options ?? {}),
    };
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

  async request<T>(
    method: HttpMethod,
    url: string,
    data: unknown,
    options: RequestInit,
    headers?: RequestHeaders,
    parameters?: Parameters,
    requestProcessConfig?: RequestProcessConfig,
    responseProcessConfig?: ResponseProcessConfig,
  ): Promise<T> {
    const requestUrl = makeUrl(this.baseUrl, url, parameters ?? {});
    if (data && requestProcessConfig?.enableCompression) {
      assertTrue(
        method !== HttpMethod.GET,
        ' GET request should not have any request payload',
      );
      data = compressData(data as Record<PropertyKey, unknown> | string);
      // NOTE: do not use Content-Type for GET to avoid unnecessary pre-flight when cross-origin
      headers = mergeRequestHeaders(
        { 'Content-Type': `${ContentType.APPLICATION_ZLIB};${CHARSET}` },
        headers,
      );
    }
    let body: Blob | string | undefined;
    if (data !== undefined) {
      if (isString(data) || data instanceof Blob) {
        body = data;
      } else if (isObject(data)) {
        body = JSON.stringify(data);
      } else {
        throw new AssertionError(
          `Request body can only be either a 'string' or an 'object'`,
        );
      }
    }
    const requestInit = {
      ...this.options,
      ...options,
      method,
      body,
      headers: createRequestHeaders(method, headers),
    };

    /**
     * For network client to work, we need an implementation of `window.fetch` to be present.
     * Modern browsers should already have native support for `fetch`.
     * In case they don't, there are several ways to go about this, but we recommend using `whatwg-fetch` polyfill.
     *
     * Why favor `whatwg-fetch`?
     * It's Github's polyfill for a subset of features of Fetch API.
     * See https://github.com/github/fetch#read-this-first
     * What about `axios`? `axios` has pretty nice API, but larger bundle-size for no particular reason
     * See https://github.com/axios/axios/issues/1333#issuecomment-511375282
     * What about `node-fetch`? `node-fetch` is for server-side only, while `whatwg-fetch` is for client-side
     * See https://www.npmjs.com/package/node-fetch#motivation
     */
    return fetch(requestUrl, requestInit)
      .then((response) =>
        unauthenticated(response)
          ? retry<T>(requestUrl, requestInit, responseProcessConfig)
          : processResponse<T>(response, requestInit, responseProcessConfig),
      )
      .catch((error) =>
        couldBeCORS(error)
          ? retry<T>(requestUrl, requestInit, responseProcessConfig)
          : Promise.reject(error),
      );
  }
}

/**
 * Create and download a file using data URI
 * See http://stackoverflow.com/questions/283956
 */
export const downloadFile = (
  fileName: string,
  content: string,
  contentType: ContentType,
): void => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  if (typeof link.download === 'string') {
    document.body.appendChild(link); // Firefox requires the link to be in the body
    link.download = fileName;
    link.href = url;
    link.click();
    document.body.removeChild(link); // remove the link when done
  } else {
    location.replace(url);
  }
};

export const createUrlStringFromData = (
  data: string,
  contentType: ContentType,
  base64: boolean,
): string =>
  base64
    ? `data:${contentType};base64,${btoa(data)}`
    : `data:${contentType},${encodeURIComponent(data)}`;

export {
  parse as getQueryParams,
  parseUrl as getQueryParamsFromUrl,
} from 'query-string';
