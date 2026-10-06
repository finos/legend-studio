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
import { ENGINE_TEST_SUPPORT__grammarToJSON_model } from '@finos/legend-graph/test';
import {
  NetworkClientError,
  type PlainObject,
  TracerService,
} from '@finos/legend-shared';
import { AxiosError } from 'axios';
import {
  CUBE_ENGINE_TEST__execute,
  CUBE_ENGINE_TEST__jsonToGrammar_lambda,
  CUBE_ENGINE_TEST__lambdaRelationTypeBatch,
} from '../../../../../__test-utils__/CubeEngineTestSupport.js';
import { V1_LegendCubeEngine } from '../V1_LegendCubeEngine.js';

// The real Cube engine, its client's calls routed to the engine on :6300 by
// Cube's own test helpers (PLAN §3.4): the test environment refuses network
// calls, and the execute helper hands back the body unread, so the lossless
// reader runs as in the browser

/** A failed call, as the engine client throws it: a `NetworkClientError` with the engine's payload */
const clientError = (status: number, payload: unknown): NetworkClientError =>
  new NetworkClientError(
    {
      status,
      statusText: String(status),
      url: 'http://localhost:6300/api',
    } as Response,
    payload as NetworkClientError['payload'],
  );

const rethrowAsClientError = (error: unknown): never => {
  if (error instanceof AxiosError && error.response) {
    throw clientError(error.response.status, error.response.data);
  }
  throw error;
};

const parseOrText = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

export const V1_createEngineBackedCubeEngine = (): {
  engine: V1_LegendCubeEngine;
  calls: Record<
    'grammarToJSON_model' | 'batchLambdasRelationType' | 'runQuery',
    jest.Mock
  >;
} => {
  const engine = new V1_LegendCubeEngine(
    { baseUrl: 'http://localhost:6300/api' },
    new TracerService(),
  );
  const { client } = engine;
  const grammarToJSON_model = jest
    .spyOn(client, 'grammarToJSON_model')
    .mockImplementation(
      async (code: string) =>
        (await ENGINE_TEST_SUPPORT__grammarToJSON_model(code)) as PlainObject,
    );
  const batchLambdasRelationType = jest
    .spyOn(client, 'batchLambdasRelationType')
    .mockImplementation(
      async (input) =>
        (await CUBE_ENGINE_TEST__lambdaRelationTypeBatch(input).catch(
          rethrowAsClientError,
        )) as never,
    );
  const runQuery = jest
    .spyOn(client, 'runQuery')
    .mockImplementation(async (input) => {
      const response = await CUBE_ENGINE_TEST__execute(
        input as unknown as string,
      );
      if (!response.ok) {
        throw clientError(response.status, parseOrText(await response.text()));
      }
      return response as unknown as Response;
    });
  jest
    .spyOn(client, 'JSONToGrammar_lambda')
    .mockImplementation(async (lambda, renderStyle) =>
      CUBE_ENGINE_TEST__jsonToGrammar_lambda(lambda, renderStyle),
    );
  return {
    engine,
    calls: {
      grammarToJSON_model: grammarToJSON_model as unknown as jest.Mock,
      batchLambdasRelationType:
        batchLambdasRelationType as unknown as jest.Mock,
      runQuery: runQuery as unknown as jest.Mock,
    },
  };
};
