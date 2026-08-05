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
  TEST_DATA__LightQueries,
  TEST_DATA__SubtypeInfo,
} from './TEST_DATA__EngineResponses.js';

// Must match the engine URL configured in
// `legend-application-query-deployment/dev/config.json`
const ENGINE_PORT = 6300;

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
 * responses. This keeps tests deterministic regardless of whether a real
 * engine instance is running on the engine port (e.g. during local
 * development), and lets CI run without an engine backend altogether.
 */
export const setupEngineMock = async (
  page: Page,
  port = ENGINE_PORT,
): Promise<void> => {
  const engineApiUrlPattern = new RegExp(`:${port}/api/(?<endpoint>.*)$`);
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
      default:
        break;
    }
    // recently-viewed queries, potentially with query params
    if (endpoint.startsWith('pure/v1/query/batch')) {
      await fulfillJson(route, []);
      return;
    }

    // Let unmocked engine calls through: during local development a real
    // engine may answer them; in CI they will fail visibly, surfacing the
    // missing mock.
    await route.continue();
  });
};
