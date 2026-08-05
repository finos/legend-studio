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

import type { Page, Route } from '@playwright/test';
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

/**
 * Intercept Legend Engine calls at the browser level and serve mock
 * responses, so tests are deterministic and require no engine backend.
 */
export const setupEngineMock = async (page: Page): Promise<void> => {
  // reroute the app's engine URL to the dead mock port
  await page.route(/\/query\/config\.json$/, async (route) => {
    const response = await route.fetch();
    const config = (await response.json()) as { engine: { url: string } };
    config.engine.url = `http://localhost:${MOCK_ENGINE_PORT}/api`;
    await route.fulfill({ json: config });
  });

  const engineApiUrlPattern = new RegExp(
    `:${MOCK_ENGINE_PORT}/api/(?<endpoint>.*)$`,
  );
  await page.route(engineApiUrlPattern, async (route) => {
    const request = route.request();
    const endpoint =
      engineApiUrlPattern.exec(request.url())?.groups?.endpoint ?? '';

    // CORS preflight
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: { ...CORS_HEADERS } });
      return;
    }

    switch (endpoint) {
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
        await fulfillJson(route, TEST_DATA__ExecutionResult);
        return;
      default:
        break;
    }
    // recently-viewed queries, potentially with query params
    if (endpoint.startsWith('pure/v1/query/batch')) {
      await fulfillJson(route, []);
      return;
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
};
