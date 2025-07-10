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
} from '../error/AssertionUtils.js';
import { deflate } from 'pako';
import queryString from 'query-string';
import { returnUndefOnError } from '../error/ErrorUtils.js';
import { sanitizeUrl } from '@braintree/sanitize-url';
import type { PlainObject } from '../CommonUtils.js';

/**
 * Unlike the download call (GET requests) which is gziped, the upload call send uncompressed data which is in megabytes realms
 * for bigger project. This really slows down operations. As such, we compress data using `zlib` for all network calls to execution
 * server. This requires the backend to uncompress, which for small models might end up adding a little overhead, so in the future, we might
 * want to make this decision `to compress or to not compress` more smartly and dynamicly (e.g. potentially to scan the size of the data/model
 * and decide the compression strategy).
 */
const compressData = (data: object | string): Blob =>
  new Blob([deflate(isObject(data) ? JSON.stringify(data) : data)]);

export const URL_SEPARATOR = '/';
/**
 *  Reference: https://uibakery.io/regex-library/url
 */
const URL_REGEX = new RegExp(
  '^(?:https?|ssh|ftp|file)://(?:www.)?[-a-zA-Z0-9@:%._+~#=]{1,256}.[a-zA-Z0-9()]{1,6}\\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$',
);
export const HttpStatus = StatusCodes;
export const CHARSET = 'charset=utf-8';

export enum HttpHeader {
  CONTENT_TYPE = 'Content-Type',
  ACCEPT = 'Accept',
}

export enum ContentType {
  APPLICATION_JSON = 'application/json',
  APPLICATION_XML = 'application/xml',
  APPLICATION_ZLIB = 'application/zlib',
  APPLICATION_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  TEXT_PLAIN = 'text/plain',
  TEXT_HTML = 'text/html',
  TEXT_CSV = 'text/csv',
  ALL = '*/*',
  MESSAGE_RFC822 = 'message/rfc822',
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
  /**
   * NOTE: We must set this to `follow` for the fetch to handle 3xx redirects automatically.
   * The other modes available are `error` which will throw error and does not really give a
   * response object, and `manual` which returns an opaque response object with status code 0;
   * either way, we cannot really handle the redirect manually ourselves.
   * See https://fetch.spec.whatwg.org/#concept-request-redirect-mode
   * See https://fetch.spec.whatwg.org/#concept-filtered-response-opaque-redirect
   */
  redirect: 'follow',
};

// NOTE: We could further improve this by using the MIME library https://flaviocopes.com/node-get-file-extension-mime-type/
export const getContentTypeFileExtension = (type: ContentType): string => {
  switch (type) {
    case ContentType.APPLICATION_JSON:
      return 'json';
    case ContentType.APPLICATION_XML:
      return 'xml';
    case ContentType.TEXT_CSV:
      return 'csv';
    default:
      return 'txt';
  }
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

const MAX_ERROR_MESSAGE_LENGTH = 5000;

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
export type Payload = PlainObject | string;

/**
 * Custom error for service client with response details.
 * NOTE: Since is particular to execution error we might want to separate this out to another place and leave network client
 * as pure/generic as possible
 */
const extractMessage = (payload: Payload): string => {
  if (isObject(payload)) {
    return isString(payload.message)
      ? payload.message
      : JSON.stringify(payload);
  }
  let payloadAsObject: PlainObject | undefined;
  try {
    payloadAsObject = JSON.parse(payload) as PlainObject;
  } catch {
    // NOTE: ignored, above is best effort
  }
  return payloadAsObject && isString(payloadAsObject.message)
    ? payloadAsObject.message
    : payload;
};

/**
 * This is a fairly basic way to attempt re-authentication.
 * We create an <iframe> to load a re-authentication url
 * which suppose to silently refresh the authentication cookie
 * and requires no action from users.
 *
 * NOTE: authentication is very specific to the deployment context
 * i.e. how the servers are being setup, so this way of re-authenticate
 * should be optional and configurable.
 */
export const autoReAuthenticate = (url: string): Promise<void> =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  new Promise((resolve: Function): void => {
    const id = 'AUTO_AUTHENTICATION_IFRAME';
    const previous = document.getElementById(id);
    previous?.remove();
    const element = document.createElement('iframe');
    element.id = id;
    element.src = url;
    element.style.display = 'none';
    element.addEventListener('load', (): void => {
      element.remove();
      resolve();
    });
    document.body.appendChild(element);
  });

export class NetworkClientError extends Error {
  response: Response & { data?: object };
  payload?: Payload | undefined;

  constructor(response: Response, payload: Payload | undefined) {
    super();
    if (typeof Error.captureStackTrace === 'function') {
      // Maintains proper stack trace for where our error was thrown (only available on V8)
      // This only works in Chrome for now. Firefox (as of Feb 2020) will throw error
      // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
      Error.captureStackTrace(this, this.constructor);
    } else {
      // otherwise, use the non-standard but defacto stack trace (available in most browser)
      this.stack = new Error().stack as string;
    }
    this.name = 'Network Client Error';
    this.response = response;
    const { status, statusText, url } = response;
    const summary = `Received response with status ${status} (${statusText}) for ${url}`;
    this.message =
      (payload
        ? extractMessage(payload).substring(0, MAX_ERROR_MESSAGE_LENGTH)
        : '') || summary;
    this.payload = payload;
  }
}

export const makeUrl = (
  baseUrl: string | undefined,
  url: string,
  parameters: Parameters,
): string => {
  if (!baseUrl && !returnUndefOnError(() => new URL(url))) {
    throw new Error(
      `Can't build URL string: base URL is not specified and the provided URL '${url}' is not absolute`,
    );
  }
  const fullUrl = new URL(url, baseUrl);
  if (parameters instanceof Object) {
    Object.entries(parameters).forEach(([name, value]) => {
      if (value !== undefined) {
        if (Array.isArray(value)) {
          // if value is an array, keep adding it to the URL with the same parameter name, for example: /reviews?revisionIds=rev2&revisionIds=rev1
          value
            .filter(isNonNullable)
            .forEach((subVal) =>
              fullUrl.searchParams.append(name, subVal.toString()),
            );
        } else {
          fullUrl.searchParams.append(name, value.toString());
        }
      }
    });
  }
  return fullUrl.toString();
};

// NOTE: in case of missing CORS headers, failed authentication manifests itself as CORS error
const couldBeCORS = (error: Error): boolean =>
  error instanceof TypeError && error.message === 'Failed to fetch';

export interface ResponseProcessConfig {
  skipProcessing?: boolean | undefined;
  preprocess?: ((response: Response) => void) | undefined;
  autoReAuthenticateUrl?: string | undefined;
}

export interface RequestProcessConfig {
  enableCompression?: boolean | undefined;
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
    baseRequestHeaders[HttpHeader.CONTENT_TYPE] =
      `${ContentType.APPLICATION_JSON};${CHARSET}`;
  }
  return mergeRequestHeaders(baseRequestHeaders, headers);
};

export interface NetworkClientConfig {
  options?: PlainObject | undefined;
  baseUrl?: string | undefined;
}

/**
 * Simple wrapper around native `fetch` API. For `options`, see documentation for "init"
 * See https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
 */
export class NetworkClient {
  private options = {};
  baseUrl?: string | undefined;

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
    headers?: RequestHeaders | undefined,
    parameters?: Parameters | undefined,
    requestProcessConfig?: RequestProcessConfig | undefined,
    responseProcessConfig?: ResponseProcessConfig | undefined,
  ): Promise<T> {
    const requestUrl = makeUrl(this.baseUrl, url, parameters ?? {});
    if (
      (isString(data) || isObject(data)) &&
      requestProcessConfig?.enableCompression
    ) {
      assertTrue(
        method !== HttpMethod.GET,
        ' GET request should not have any request payload',
      );
      data = compressData(data);
      // NOTE: do not use Content-Type for GET to avoid unnecessary pre-flight when cross-origin
      headers = mergeRequestHeaders(headers, {
        // Override Content-Type header when compression is enabled
        [HttpHeader.CONTENT_TYPE]: `${ContentType.APPLICATION_ZLIB};${CHARSET}`,
      });
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
    const requestInit: RequestInit = {
      ...this.options,
      ...options,
      method,
      body: body as BodyInit,
      headers: createRequestHeaders(method, headers),
    };

    /**
     * For network client to work, we need an implementation of `window.fetch` to be present.
     * Modern browsers should already have native support for `fetch`.
     * In case they don't (such as in test where we use `jsdom` for example),
     * there are several ways to go about this,but we recommend using `whatwg-fetch` polyfill.
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
      .then((response) => {
        if (
          // NOTE: status 0 is either timeout or client error possibly caused by authentication
          response.status === 0 ||
          response.status === HttpStatus.UNAUTHORIZED
        ) {
          // NOTE: we might want to consider different handling here rather than just proceeding with a retry
          // this is a good place to add an auto retry/authenticate mechanism
          if (responseProcessConfig?.autoReAuthenticateUrl) {
            return autoReAuthenticate(
              responseProcessConfig.autoReAuthenticateUrl,
            )
              .then(() => fetch(requestUrl, requestInit))
              .then((resp) =>
                processResponse<T>(resp, requestInit, responseProcessConfig),
              );
          }
          return fetch(requestUrl, requestInit).then((resp) =>
            processResponse<T>(resp, requestInit, responseProcessConfig),
          );
        }
        return processResponse<T>(response, requestInit, responseProcessConfig);
      })
      .catch((error) =>
        couldBeCORS(error)
          ? // NOTE: we might want to consider different handling here rather than just proceeding with a retry
            fetch(requestUrl, requestInit).then((resp) =>
              processResponse<T>(resp, requestInit, responseProcessConfig),
            )
          : Promise.reject(error),
      );
  }
}

/**
 * Create and download a file using data URI
 * See http://stackoverflow.com/questions/283956
 */
export const downloadFileUsingDataURI = (
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
    ? `data:${contentType};base64,${window.btoa(data)}`
    : `data:${contentType},${encodeURIComponent(data)}`;

// Buffer.from(str, 'base64')` and`buf.toString('base64')
// NOTE: we can potentially use the native `URLSearchParams` as it provides
// fairly good API and structured output, but it does not support duplicated query
// such as `?foo=1&foo=2`, only the first value of `foo` will be recorded
// See https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams
export const getQueryParameters = <T>(url: string, isFullUrl = false): T => {
  const params = isFullUrl
    ? queryString.parseUrl(url).query
    : queryString.parse(url);
  return params as unknown as T;
};

export const getQueryParameterValue = (
  key: string,
  data: Record<string, string | undefined>,
  replaceUrlSafeBase64Characters: boolean = false,
): string | undefined => {
  const paramValue = data[key];
  if (replaceUrlSafeBase64Characters) {
    return paramValue
      ? decodeURIComponent(paramValue).replace(/-/g, '+').replace(/_/g, '/')
      : undefined;
  } else {
    return paramValue ? decodeURIComponent(paramValue) : undefined;
  }
};

export const stringifyQueryParams = (params: PlainObject): string => {
  const data: PlainObject = {};
  Object.entries(params).forEach(([key, value]) => {
    if (!value) {
      return;
    }
    data[key] = value.toString();
  });
  return queryString.stringify(data);
};

export const addQueryParametersToUrl = (
  url: string,
  val: string | undefined,
): string => (val ? `${url}?${val}` : url);

export const buildUrl = (parts: string[]): string =>
  parts
    .map((part) => part.replaceAll(/^\/+/g, '').replaceAll(/\/+$/g, ''))
    .join(URL_SEPARATOR);

export const sanitizeURL = (val: string): string => {
  // eslint-disable-next-line no-process-env
  if (process.env.NODE_ENV === 'test') {
    // NOTE: the library we use for sanizing URL use URL.canParse() which is not available in JSDOM
    // so we skip sanitizing URL in test environment for now
    return val;
  }
  return sanitizeUrl(val);
};

export const isValidURL = (val: string): boolean => URL_REGEX.test(val);
