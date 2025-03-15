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

import { test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { unitTest } from '../../__test-utils__/TestUtils.js';
import {
  makeUrl,
  createRequestHeaders,
  mergeRequestHeaders,
  NetworkClient,
  HttpMethod,
  ContentType,
  HttpHeader,
  buildUrl,
  NetworkClientError,
} from '../NetworkUtils.js';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Helper to create mock responses
const createMockResponse = (
  status: number,
  body: unknown,
  contentType = ContentType.APPLICATION_JSON,
) => {
  const mockResponse = {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Headers({
      'Content-Type': contentType,
    }),
    url: 'http://example.com/test',
    json: jest.fn().mockResolvedValue(body),
    text: jest.fn().mockResolvedValue(JSON.stringify(body)),
  };
  return mockResponse;
};

beforeEach(() => {
  mockFetch.mockClear();
});

afterEach(() => {
  jest.resetAllMocks();
});

test(unitTest('Build URL'), () => {
  expect(buildUrl(['http://www.example.org/', '/subroute'])).toEqual(
    'http://www.example.org/subroute',
  );
  expect(
    buildUrl([
      'http://www.example.org/',
      '/subroute/////',
      '//////another-subroute////',
    ]),
  ).toEqual('http://www.example.org/subroute/another-subroute');
  expect(
    buildUrl(['http://www.example.org', 'subroute', 'another-subroute']),
  ).toEqual('http://www.example.org/subroute/another-subroute');
});

test(unitTest('makeUrl builds URL correctly'), () => {
  // Test with base URL and path
  expect(makeUrl('http://example.com', '/path', {})).toEqual(
    'http://example.com/path',
  );

  // Test with parameters
  expect(
    makeUrl('http://example.com', '/path', {
      param1: 'value1',
      param2: 'value2',
    }),
  ).toEqual('http://example.com/path?param1=value1&param2=value2');

  // Test with array parameters
  expect(
    makeUrl('http://example.com', '/path', {
      param: ['value1', 'value2'],
    }),
  ).toEqual('http://example.com/path?param=value1&param=value2');

  // Test with undefined parameters (should be skipped)
  expect(
    makeUrl('http://example.com', '/path', {
      param1: 'value1',
      param2: undefined,
    }),
  ).toEqual('http://example.com/path?param1=value1');

  // Test with absolute URL and no base URL
  expect(makeUrl(undefined, 'http://example.com/path', {})).toEqual(
    'http://example.com/path',
  );

  // Test error case - no base URL and relative path
  expect(() => makeUrl(undefined, '/path', {})).toThrow();
});

test(unitTest('createRequestHeaders creates correct headers'), () => {
  // Test GET request headers
  const getHeaders = createRequestHeaders(HttpMethod.GET);
  expect(getHeaders.Accept).toEqual(ContentType.APPLICATION_JSON);
  expect(getHeaders[HttpHeader.CONTENT_TYPE]).toBeUndefined();

  // Test POST request headers
  const postHeaders = createRequestHeaders(HttpMethod.POST);
  expect(postHeaders.Accept).toEqual(ContentType.APPLICATION_JSON);
  expect(postHeaders[HttpHeader.CONTENT_TYPE]).toEqual(
    `${ContentType.APPLICATION_JSON};charset=utf-8`,
  );

  // Test with custom headers
  const customHeaders = createRequestHeaders(HttpMethod.GET, {
    'Custom-Header': 'custom-value',
  });
  expect(customHeaders.Accept).toEqual(ContentType.APPLICATION_JSON);
  expect(customHeaders['Custom-Header']).toEqual('custom-value');
});

test(unitTest('mergeRequestHeaders merges headers correctly'), () => {
  const headers1 = {
    'Header-1': 'value1',
    'Common-Header': 'value1',
  };
  const headers2 = {
    'Header-2': 'value2',
    'Common-Header': 'value2',
  };

  const merged = mergeRequestHeaders(headers1, headers2);
  expect(merged['Header-1']).toEqual('value1');
  expect(merged['Header-2']).toEqual('value2');
  expect(merged['Common-Header']).toEqual('value2'); // Second header overrides first

  // Test with undefined headers
  expect(mergeRequestHeaders(undefined, headers2)).toEqual(headers2);
  expect(mergeRequestHeaders(headers1, undefined)).toEqual(headers1);
  expect(mergeRequestHeaders(undefined, undefined)).toEqual({});
});

test(unitTest('NetworkClient.get makes correct request'), async () => {
  const mockResponseData = { data: 'test data' };
  mockFetch.mockResolvedValueOnce(createMockResponse(200, mockResponseData));

  const client = new NetworkClient({ baseUrl: 'http://example.com' });
  const result = await client.get('/test', {}, {}, { param: 'value' });

  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(mockFetch).toHaveBeenCalledWith(
    'http://example.com/test?param=value',
    expect.objectContaining({
      method: HttpMethod.GET,
      headers: expect.objectContaining({
        Accept: ContentType.APPLICATION_JSON,
      }),
    }),
  );
  expect(result).toEqual(mockResponseData);
});

test(unitTest('NetworkClient.post makes correct request'), async () => {
  const requestData = { request: 'data' };
  const mockResponseData = { response: 'data' };
  mockFetch.mockResolvedValueOnce(createMockResponse(200, mockResponseData));

  const client = new NetworkClient({ baseUrl: 'http://example.com' });
  const result = await client.post('/test', requestData);

  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(mockFetch).toHaveBeenCalledWith(
    'http://example.com/test',
    expect.objectContaining({
      method: HttpMethod.POST,
      body: JSON.stringify(requestData),
      headers: expect.objectContaining({
        Accept: ContentType.APPLICATION_JSON,
        'Content-Type': `${ContentType.APPLICATION_JSON};charset=utf-8`,
      }),
    }),
  );
  expect(result).toEqual(mockResponseData);
});

test(unitTest('NetworkClient handles error responses'), async () => {
  const errorResponse = {
    message: 'Error message',
    details: 'Error details',
  };

  // Need to mock fetch twice since we have two assertions
  mockFetch.mockResolvedValueOnce(createMockResponse(400, errorResponse));
  mockFetch.mockResolvedValueOnce(createMockResponse(400, errorResponse));

  const client = new NetworkClient({ baseUrl: 'http://example.com' });

  await expect(client.get('/test')).rejects.toBeInstanceOf(NetworkClientError);
  await expect(client.get('/test')).rejects.toHaveProperty(
    'message',
    'Error message',
  );
});

test(unitTest('NetworkClient handles retry for CORS errors'), async () => {
  // First call throws TypeError (CORS error)
  mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

  // Second call succeeds
  const mockResponseData = { data: 'test data' };
  mockFetch.mockResolvedValueOnce(createMockResponse(200, mockResponseData));

  const client = new NetworkClient({ baseUrl: 'http://example.com' });
  const result = await client.get('/test');

  expect(mockFetch).toHaveBeenCalledTimes(2);
  expect(result).toEqual(mockResponseData);
});

test(
  unitTest('NetworkClient handles 401 Unauthorized with retry'),
  async () => {
    // First call returns 401
    mockFetch.mockResolvedValueOnce(
      createMockResponse(401, { message: 'Unauthorized' }),
    );

    // Second call succeeds
    const mockResponseData = { data: 'test data' };
    mockFetch.mockResolvedValueOnce(createMockResponse(200, mockResponseData));

    const client = new NetworkClient({ baseUrl: 'http://example.com' });
    const result = await client.get('/test');

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toEqual(mockResponseData);
  },
);
