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

import { inflateSync } from 'node:zlib';
import type { Page, Request, Route } from '@playwright/test';
import {
  TEST_DATA__ClassifierPathMap,
  TEST_DATA__CurrentUser,
  TEST_DATA__ExecutionResult,
  TEST_DATA__LightQueries,
  TEST_DATA__SubtypeInfo,
} from './TEST_DATA__EngineResponses.js';

/**
 * The app's engine URL is rerouted (via `config.json` interception) to this
 * port, where nothing listens: every engine call must be answered by the
 * browser-level mocks below. This guarantees local runs behave exactly like
 * CI, even when a real engine instance is running on the configured engine
 * port (6300) during development — a real engine can never mask a missing
 * mock.
 */
const MOCK_ENGINE_PORT = 6399;

const CORS_HEADERS = {
  'access-control-allow-origin': 'http://localhost:9001',
  'access-control-allow-credentials': 'true',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'content-type,accept',
};

const fulfillJson = (route: Route, json: unknown): Promise<void> =>
  route.fulfill({ json, headers: { ...CORS_HEADERS } });

const fulfillText = (route: Route, body: string): Promise<void> =>
  route.fulfill({
    body,
    contentType: 'text/plain',
    headers: { ...CORS_HEADERS },
  });

/**
 * The app zlib-deflates request payloads to some engine endpoints (see
 * `compressData` in `@finos/legend-shared` network utils) — inflate when
 * needed to read them.
 */
const getRequestBody = (request: Request): string => {
  const buffer = request.postDataBuffer();
  if (!buffer) {
    return '';
  }
  try {
    return inflateSync(buffer).toString('utf-8');
  } catch {
    // not compressed
    return buffer.toString('utf-8');
  }
};

/**
 * Payloads the app sent to the engine during a test, recorded so specs can
 * assert on what the query builder actually produced (see
 * `QueryBuilderProtocol.spec.ts`). The object is mutated in place, so a spec
 * reads it after driving the UI.
 */
export interface CapturedEngineRequests {
  /** `V1_ExecuteInput` bodies posted to the execute endpoint, in order. */
  executeInputs: Record<string, unknown>[];
  /** Lambda protocol JSON posted to `jsonToGrammar/lambda`, in order. */
  lambdas: Record<string, unknown>[];
}

/**
 * Intercept Legend Engine calls at the browser level and serve mock
 * responses, so tests are deterministic and require no engine backend.
 * Returns the payloads the app sent, for specs that assert on them.
 *
 * The mock is stateful per test page to support the save/load round-trip:
 * - created queries are stored in-memory and served back by id
 * - lambda protocol JSON sent to `jsonToGrammar/lambda` (on save) is stored
 *   against a generated placeholder "grammar" string, and served back as
 *   JSON when `grammarToJson/lambda` is later called with that placeholder
 *   (on load) — so the app's own serialization round-trips without the mock
 *   needing a real Pure grammar parser.
 */
export const setupEngineMock = async (
  page: Page,
): Promise<CapturedEngineRequests> => {
  const captured: CapturedEngineRequests = { executeInputs: [], lambdas: [] };

  // reroute the app's engine URL to the dead mock port
  await page.route(/\/query\/config\.json$/, async (route) => {
    const response = await route.fetch();
    const config = (await response.json()) as { engine: { url: string } };
    config.engine.url = `http://localhost:${MOCK_ENGINE_PORT}/api`;
    await route.fulfill({ json: config });
  });

  // per-page state for the save/load round-trip
  const savedQueries = new Map<string, { id: string }>();
  const savedLambdas = new Map<string, string>();
  let lambdaCounter = 0;

  const engineApiUrlPattern = new RegExp(
    `:${MOCK_ENGINE_PORT}/api/(?<endpoint>.*)$`,
  );
  await page.route(engineApiUrlPattern, async (route) => {
    const request = route.request();
    const endpoint =
      engineApiUrlPattern.exec(request.url())?.groups?.endpoint ?? '';
    // strip query parameters (e.g. `?renderStyle=PRETTY`)
    const path = endpoint.split('?')[0] ?? '';

    // CORS preflight
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: { ...CORS_HEADERS } });
      return;
    }

    switch (path) {
      case 'server/v1/currentUser':
        await fulfillJson(route, TEST_DATA__CurrentUser);
        return;
      case 'pure/v1/protocol/pure/getClassifierPathMap':
        await fulfillJson(route, TEST_DATA__ClassifierPathMap);
        return;
      case 'pure/v1/protocol/pure/getSubtypeInfo':
        await fulfillJson(route, TEST_DATA__SubtypeInfo);
        return;
      case 'pure/v1/query/search':
        await fulfillJson(route, TEST_DATA__LightQueries);
        return;
      case 'pure/v1/execution/execute':
        captured.executeInputs.push(
          JSON.parse(getRequestBody(request)) as Record<string, unknown>,
        );
        await fulfillJson(route, TEST_DATA__ExecutionResult);
        return;
      // lambda protocol JSON -> Pure grammar text (called when saving)
      case 'pure/v1/grammar/jsonToGrammar/lambda': {
        const lambdaJson = getRequestBody(request);
        captured.lambdas.push(
          JSON.parse(lambdaJson) as Record<string, unknown>,
        );
        const placeholder = `e2e_mock_lambda_${(lambdaCounter += 1)}`;
        savedLambdas.set(placeholder, lambdaJson);
        await fulfillText(route, placeholder);
        return;
      }
      // Pure grammar text -> lambda protocol JSON (called when loading)
      case 'pure/v1/grammar/grammarToJson/lambda': {
        const grammarText = getRequestBody(request);
        const lambdaJson = savedLambdas.get(grammarText);
        if (lambdaJson !== undefined) {
          await fulfillJson(route, JSON.parse(lambdaJson));
          return;
        }
        break;
      }
      default:
        break;
    }
    // recently-viewed queries, potentially with query params
    if (path.startsWith('pure/v1/query/batch')) {
      await fulfillJson(route, []);
      return;
    }
    // query CRUD (save/load round-trip)
    if (path === 'pure/v1/query' && request.method() === 'POST') {
      const query = JSON.parse(request.postData() ?? '{}') as { id: string };
      savedQueries.set(query.id, query);
      await fulfillJson(route, query);
      return;
    }
    if (path.startsWith('pure/v1/query/')) {
      const queryId = path.substring('pure/v1/query/'.length);
      const query = savedQueries.get(queryId);
      if (request.method() === 'GET' && query) {
        await fulfillJson(route, query);
        return;
      }
      if (request.method() === 'PUT') {
        const updated = JSON.parse(request.postData() ?? '{}') as {
          id: string;
        };
        savedQueries.set(queryId, updated);
        await fulfillJson(route, updated);
        return;
      }
    }

    // Fail loudly on unmocked engine endpoints so missing mocks surface
    // immediately (locally and in CI alike). To support a new flow, add a
    // handler above and its payload to `TEST_DATA__EngineResponses.ts`.
    await route.fulfill({
      status: 501,
      headers: { ...CORS_HEADERS },
      json: {
        message: `Unmocked engine endpoint called in e2e test: ${request.method()} /api/${endpoint} — add a handler in EngineMock.ts`,
      },
    });
  });

  return captured;
};
