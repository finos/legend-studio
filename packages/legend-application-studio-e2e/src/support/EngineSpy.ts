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

import type { Page, Route } from '@playwright/test';
import {
  corsHeaders,
  fulfillError,
  getApiPath,
  getRequestBody,
} from './MockUtils.js';
import type { BackendFailure } from './SDLCMock.js';

/** The real engine every test runs against (see `playwright.config.ts`). */
export const ENGINE_URL = 'http://localhost:6300/api';

/**
 * The first call after the engine starts can take a while (class loading,
 * JIT), well beyond the default for a proxied request.
 */
const ENGINE_CALL_TIMEOUT = 120_000;

export interface EngineCall {
  method: string;
  /** Path after `/api/`, e.g. `pure/v1/grammar/grammarToJson/model`. */
  path: string;
  /** The request payload, inflated if the app compressed it. */
  body: string;
  /** The engine's response status, once it answered. */
  status?: number;
}

/**
 * The calls the app made to the engine during a test, and knobs to make the
 * engine misbehave.
 */
export interface CapturedEngineCalls {
  calls: EngineCall[];
  /**
   * Endpoints (paths after `/api/`, e.g. `pure/v1/compilation/compile`) to
   * answer with an error instead of calling the engine, until the entry is
   * deleted.
   */
  failures: Map<string, BackendFailure>;
  /**
   * Endpoints whose calls are held back until the promise settles, to see
   * what the app does meanwhile — see {@link holdEngineEndpoint}.
   */
  holds: Map<string, Promise<void>>;
}

/**
 * Pass every engine call `page` makes through to the real engine, recording
 * it (see {@link CapturedEngineCalls}) — unless a test made its endpoint fail
 * or hang.
 *
 * Calls are made from the test runner rather than the browser, and their
 * responses handed back with CORS headers, so the engine's own CORS setup
 * doesn't matter.
 */
export const installEngineSpy = async (
  page: Page,
): Promise<CapturedEngineCalls> => {
  const captured: CapturedEngineCalls = {
    calls: [],
    failures: new Map(),
    holds: new Map(),
  };

  const respond = async (route: Route): Promise<void> => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: corsHeaders(request) });
      return;
    }
    const path = getApiPath(request);
    const call: EngineCall = {
      method: request.method(),
      path,
      body: getRequestBody(request),
    };
    captured.calls.push(call);

    const hold = captured.holds.get(path);
    if (hold) {
      await hold;
    }
    const failure = captured.failures.get(path);
    if (failure) {
      call.status = failure.status;
      await fulfillError(route, failure.status, failure.message);
      return;
    }
    let response;
    try {
      response = await route.fetch({ timeout: ENGINE_CALL_TIMEOUT });
    } catch {
      // the engine is down: let the app see it as such
      await route.abort('connectionrefused');
      return;
    }
    call.status = response.status();
    await route.fulfill({
      response,
      headers: { ...response.headers(), ...corsHeaders(request) },
    });
  };

  await page.context().route(`${ENGINE_URL}/**`, (route) =>
    // the page may be gone by the time the engine answers (e.g. the test
    // ended during a held call), leaving the response nowhere to go
    respond(route).catch(() => undefined),
  );

  return captured;
};

/**
 * Hold back the engine's answers to `path` (e.g.
 * `pure/v1/compilation/compile`) until the returned function is called.
 */
export const holdEngineEndpoint = (
  captured: CapturedEngineCalls,
  path: string,
): (() => void) => {
  let release = (): void => undefined;
  captured.holds.set(
    path,
    new Promise<void>((resolve) => {
      release = resolve;
    }),
  );
  return () => {
    captured.holds.delete(path);
    release();
  };
};

/** The calls made to `path` so far, oldest first. */
export const getEngineCalls = (
  captured: CapturedEngineCalls,
  path: string,
): EngineCall[] => captured.calls.filter((call) => call.path === path);
