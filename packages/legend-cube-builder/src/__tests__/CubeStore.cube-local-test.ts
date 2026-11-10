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

import { jest } from '@jest/globals';
import { NetworkClientError, TracerService } from '@finos/legend-shared';
import axios, { AxiosError, type Method } from 'axios';
import { runCubeStoreContract } from '../__test-utils__/CubeStoreContract.js';
import { V1_LegendCubeStore } from '../graph-manager/protocol/pure/v1/V1_LegendCubeStore.js';

// The engine's Cube store (PLAN §11.13), run by hand against an engine that
// has one: the development store on :6301 (an engine built from
// legend-engine's Cube store branch, against an in-memory Mongo; PLAN §11.13,
// M8.3). Locally every caller is `anonymous`, so the owners case is left to
// the in-memory store's run. Another engine with the store: change the URL.
//   TEST_GROUP=cube-local yarn workspace @finos/legend-cube-builder test CubeStore

const STORE_ENGINE_URL = 'http://localhost:6301/api';

/** The store's client over axios (the repo's Jest setup blocks fetch), failing as the client does */
const createStore = (): V1_LegendCubeStore => {
  const store = new V1_LegendCubeStore(
    { baseUrl: STORE_ENGINE_URL },
    new TracerService(),
  );
  const send =
    (method: Method) =>
    async (
      url: string,
      data?: unknown,
      _options?: unknown,
      _headers?: unknown,
      parameters?: unknown,
    ): Promise<never> => {
      try {
        return (
          await axios.request({
            method,
            url,
            data,
            params: parameters,
          })
        ).data as never;
      } catch (error) {
        if (error instanceof AxiosError && error.response) {
          throw new NetworkClientError(
            {
              status: error.response.status,
              statusText: String(error.response.status),
              url,
            } as Response,
            error.response.data as NetworkClientError['payload'],
          );
        }
        throw error;
      }
    };
  jest
    .spyOn(store.client, 'get')
    .mockImplementation((url, _options, _headers, parameters) =>
      send('GET')(url, undefined, undefined, undefined, parameters),
    );
  jest.spyOn(store.client, 'post').mockImplementation(send('POST'));
  jest.spyOn(store.client, 'put').mockImplementation(send('PUT'));
  jest.spyOn(store.client, 'delete').mockImplementation(send('DELETE'));
  return store;
};

runCubeStoreContract(`the engine's, on ${STORE_ENGINE_URL}`, () => ({
  store: createStore(),
  user: 'anonymous',
}));
