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
import { ENGINE_TEST_SUPPORT_API_URL } from '@finos/legend-graph/test';
import { NetworkClientError, TracerService } from '@finos/legend-shared';
import { AxiosError } from 'axios';
import { CUBE_ENGINE_TEST__schemaExploration } from '../../../../../__test-utils__/CubeConnectionTestSupport.js';
import { V1_LegendCubeConnectionExplorer } from '../V1_LegendCubeConnectionExplorer.js';

// The real connection explorer, its client's schema exploration routed to the
// engine on :6300 (PLAN §3.4): the test environment refuses network calls.
// A failed call is thrown as the client throws it.

/** A helper's non-2xx response, rethrown as the client throws it */
const rethrowAsClientError = (error: unknown): never => {
  if (error instanceof AxiosError && error.response) {
    throw new NetworkClientError(
      {
        status: error.response.status,
        statusText: String(error.response.status),
        url: ENGINE_TEST_SUPPORT_API_URL,
      } as Response,
      error.response.data as NetworkClientError['payload'],
    );
  }
  throw error;
};

/** Build one per test (in `beforeEach`): the spy is restored after each test */
export const V1_createEngineBackedCubeConnectionExplorer = (): {
  explorer: V1_LegendCubeConnectionExplorer;
  calls: { buildDatabase: jest.Mock };
} => {
  const explorer = new V1_LegendCubeConnectionExplorer(
    { baseUrl: ENGINE_TEST_SUPPORT_API_URL },
    new TracerService(),
  );
  const buildDatabase = jest
    .spyOn(explorer.client, 'buildDatabase')
    .mockImplementation(async (input) =>
      CUBE_ENGINE_TEST__schemaExploration(input).catch(rethrowAsClientError),
    );
  return {
    explorer,
    calls: { buildDatabase: buildDatabase as unknown as jest.Mock },
  };
};
