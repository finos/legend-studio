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

import { inflateSync } from 'node:zlib';
import type { Request, Route } from '@playwright/test';

/** Where the Studio dev server serves the app from. */
export const APP_ORIGIN = 'http://localhost:9000';

/**
 * The CORS headers a backend on another port must send back for the app's
 * calls to go through (the app sends credentials, so no wildcard origin).
 */
export const corsHeaders = (request: Request): Record<string, string> => ({
  'access-control-allow-origin': APP_ORIGIN,
  'access-control-allow-credentials': 'true',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers':
    request.headers()['access-control-request-headers'] ??
    'content-type,accept',
});

/**
 * An error response shaped like the Legend backends' (`{ status, message }`),
 * whose `message` the app shows the user.
 */
export const fulfillError = (
  route: Route,
  status: number,
  message: string,
): Promise<void> =>
  route.fulfill({
    status,
    headers: corsHeaders(route.request()),
    json: { status, message },
  });

/**
 * The part of a backend URL after `/api/`, without query parameters, e.g.
 * `pure/v1/compilation/compile`.
 */
export const getApiPath = (request: Request): string =>
  /\/api\/(?<path>[^?]*)/u.exec(request.url())?.groups?.path ?? '';

/**
 * The app zlib-deflates request payloads to some engine endpoints (see
 * `compressData` in `@finos/legend-shared` network utils) — inflate when
 * needed to read them.
 */
export const getRequestBody = (request: Request): string => {
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
