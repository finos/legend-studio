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

import {
  test,
  describe,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  NetworkClientError,
  TracerService,
  assertErrorThrown,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { V1_EngineServerClient } from '../V1_EngineServerClient.js';
import { V1_RenderStyle } from '../grammar/V1_RenderStyle.js';
import type {
  LocalEngineRequest,
  LocalEngineResponse,
  LocalEngineRouter,
} from '../../../../../action/LocalEngine.js';

const BASE_URL = 'http://engine.test/api';
const PARSE_ROUTE = 'grammar/grammarToJson/model';
const COMPOSE_ROUTE = 'grammar/jsonToGrammar/model';
const PARSER_ERROR = {
  errorType: 'PARSER',
  code: 0,
  status: 'error',
  message: "Unexpected token 'Clas'",
  sourceInformation: {
    sourceId: '',
    startLine: 1,
    startColumn: 1,
    endLine: 1,
    endColumn: 4,
  },
};

let fetchSpy: jest.SpiedFunction<typeof globalThis.fetch>;

beforeEach(() => {
  fetchSpy = jest.spyOn(globalThis, 'fetch');
  fetchSpy.mockResolvedValue(new Response('{"fromServer":true}'));
});

afterEach(() => {
  jest.restoreAllMocks();
});

type StandInRouter = LocalEngineRouter & {
  calls: { route: string; request: LocalEngineRequest }[];
};

const createRouter = (
  localRoutes: string[],
  answer: (route: string) => LocalEngineResponse | undefined,
): StandInRouter => {
  const calls: StandInRouter['calls'] = [];
  return {
    calls,
    isLocalRoute: (route) => localRoutes.includes(route),
    answer: (route, request) => {
      calls.push({ route, request });
      return Promise.resolve(answer(route));
    },
  };
};

const createClient = (
  localEngineRouter?: LocalEngineRouter | undefined,
): V1_EngineServerClient => {
  const client = new V1_EngineServerClient({
    baseUrl: BASE_URL,
    enableCompression: true,
    localEngineRouter,
  });
  client.setTracerService(new TracerService());
  return client;
};

const catchError = async (promise: Promise<unknown>): Promise<Error> => {
  try {
    await promise;
  } catch (error) {
    assertErrorThrown(error);
    return error;
  }
  throw new Error('Expected the call to fail');
};

describe(unitTest('V1_EngineServerClient - local mode'), () => {
  test('a local route is answered by the local engine, uncompressed', async () => {
    const router = createRouter([PARSE_ROUTE], () => ({
      status: 200,
      body: '{"_type":"data","elements":[]}',
    }));
    const result = await createClient(router).grammarToJSON_model(
      'Class a::A {}',
      'my-source',
      undefined,
      true,
    );

    expect(result).toEqual({ _type: 'data', elements: [] });
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(router.calls).toEqual([
      {
        route: PARSE_ROUTE,
        request: {
          query: { sourceId: 'my-source', returnSourceInformation: 'true' },
          body: 'Class a::A {}',
        },
      },
    ]);
  });

  test('an object body is sent as JSON, and a text answer is read as text', async () => {
    const router = createRouter([COMPOSE_ROUTE], () => ({
      status: 200,
      body: 'Class a::A\n{\n}\n',
    }));
    const result = await createClient(router).JSONToGrammar_model(
      { _type: 'data', elements: [] },
      V1_RenderStyle.PRETTY,
    );

    expect(result).toEqual('Class a::A\n{\n}\n');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(router.calls[0]?.request).toEqual({
      query: { renderStyle: 'PRETTY' },
      body: '{"_type":"data","elements":[]}',
    });
  });

  test('a route the router does not take goes to the engine server', async () => {
    const router = createRouter([PARSE_ROUTE], () => ({
      status: 200,
      body: '{}',
    }));
    const result = await createClient(router).compile({});

    expect(result).toEqual({ fromServer: true });
    expect(router.calls).toHaveLength(0);
    expect(String(guaranteeNonNullable(fetchSpy.mock.calls[0])[0])).toEqual(
      `${BASE_URL}/pure/v1/compilation/compile`,
    );
  });

  test('a call outside pure/v1 is never offered to the router', async () => {
    const isLocalRoute = jest.fn(() => true);
    const router: LocalEngineRouter = {
      isLocalRoute,
      answer: () => Promise.resolve({ status: 200, body: '"local"' }),
    };
    await createClient(router).getCurrentUserId();

    expect(isLocalRoute).not.toHaveBeenCalled();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test('no answer from the router sends the call to the engine server', async () => {
    const router = createRouter([PARSE_ROUTE], () => undefined);
    const result = await createClient(router).grammarToJSON_model('');

    expect(result).toEqual({ fromServer: true });
    expect(router.calls).toHaveLength(1);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test("a local error answer becomes the same error as the server's", async () => {
    const body = JSON.stringify(PARSER_ERROR);
    const localError = await catchError(
      createClient(
        createRouter([PARSE_ROUTE], () => ({ status: 400, body })),
      ).grammarToJSON_model('Clas a::A {}'),
    );
    fetchSpy.mockResolvedValue(new Response(body, { status: 400 }));
    const serverError = await catchError(
      createClient().grammarToJSON_model('Clas a::A {}'),
    );

    expect(localError).toBeInstanceOf(NetworkClientError);
    expect(serverError).toBeInstanceOf(NetworkClientError);
    const local = localError as NetworkClientError;
    const server = serverError as NetworkClientError;
    expect(local.message).toEqual(server.message);
    expect(local.payload).toEqual(server.payload);
    expect(local.payload).toEqual(PARSER_ERROR);
    expect(local.response.status).toEqual(400);
    expect(local.response.url).toEqual(
      `${BASE_URL}/pure/v1/grammar/grammarToJson/model`,
    );
  });

  test('an answer with an invalid status is refused', async () => {
    const error = await catchError(
      createClient(
        createRouter([PARSE_ROUTE], () => ({ status: 0, body: '' })),
      ).grammarToJSON_model(''),
    );

    expect(error.message).toContain('invalid HTTP status');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
