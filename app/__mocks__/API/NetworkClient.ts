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

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/**
 * Mocking network client by default to prevent any potential outbound network call, we also mocked the tracing methods
 * so there is no need to mock the tracing client
 *
 * NOTE: we return {} by default, where appropriate, tester need to mock/stub/spy the `request` method to return
 * accordingly. Preferably, the tester should use `spyOn` for methods in the actual API clients, such as `sdlcClient`
 * or `executionSdlc` as that is more explicit and readable. For example, compare the following approaches:
 *
 *    // approach 1: mock `request`
 *    client.request = jest.fn().mockResolvedValueOnce(true)mockResolvedValueOnce([]).mockResolvedValueOnce([]);
 *
 *    // approach 2: spyOn actual API call
 *    jest.spyOn(sdlcClient, 'isAuthorized').mockResolvedValueOnce(true);
 *    jest.spyOn(sdlcClient, 'getProjects').mockResolvedValueOnce([]);
 *    jest.spyOn(sdlcClient, 'getProjects').mockResolvedValueOnce([]);
 *
 * The latter is more clear (also it does proper API method name and return type checking)
 */
const originalNetworkClient = jest.requireActual('API/NetworkClient');

export const mergeRequestHeaders = originalNetworkClient.mergeRequestHeaders;
export const ContentType = originalNetworkClient.ContentType;
export const CHARSET = originalNetworkClient.CHARSET;

export const client = {
  ...originalNetworkClient,
  configured: true,
  get: jest.fn().mockImplementation(async () => Promise.resolve({})),
  put: jest.fn().mockImplementation(async () => Promise.resolve({})),
  post: jest.fn().mockImplementation(async () => Promise.resolve({})),
  delete: jest.fn().mockImplementation(async () => Promise.resolve({})),
  getWithTracing: jest.fn().mockImplementation(async () => Promise.resolve({})),
  putwithTracing: jest.fn().mockImplementation(async () => Promise.resolve({})),
  postWithTracing: jest.fn().mockImplementation(async () => Promise.resolve({})),
  deleteWithTracing: jest.fn().mockImplementation(async () => Promise.resolve({})),
  request: jest.fn().mockImplementation(async () => Promise.resolve({})),
};
