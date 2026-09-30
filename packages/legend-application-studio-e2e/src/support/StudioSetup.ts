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
import { corsHeaders, fulfillError, getApiPath } from './MockUtils.js';
import {
  ENGINE_URL,
  installEngineSpy,
  type CapturedEngineCalls,
} from './EngineSpy.js';
import {
  installSDLCMock,
  MOCK_SDLC_URL,
  type CapturedSDLCRequests,
} from './SDLCMock.js';
import {
  TEST_DATA__Entities,
  TEST_DATA__ProjectConfiguration,
  type Entity,
} from './TEST_DATA__SDLC.js';

/** Where the app's depot and showcase calls go; nothing listens there. */
const MOCK_DEPOT_URL = 'http://localhost:6198/depot/api';
const MOCK_SHOWCASE_URL = 'http://localhost:6197/api';

export interface StudioBackends {
  sdlc: CapturedSDLCRequests;
  engine: CapturedEngineCalls;
  /**
   * Calls to the mocked backends (SDLC, depot, showcase) that no handler
   * answered — each got a `501` naming it. Assert this stays empty.
   */
  unmockedCalls: string[];
}

/** The classifier path SDLC stores each kind of element under. */
const CLASSIFIER_PATHS: Record<string, string> = {
  class: 'meta::pure::metamodel::type::Class',
  Enumeration: 'meta::pure::metamodel::type::Enumeration',
  association: 'meta::pure::metamodel::relationship::Association',
  function: 'meta::pure::metamodel::function::ConcreteFunctionDefinition',
  profile: 'meta::pure::metamodel::extension::Profile',
};

/**
 * The SDLC entities for a model written in grammar, as the real engine
 * parses it — so test models with logic in them (derived properties,
 * constraints, functions) can be written readably, rather than as protocol
 * JSON.
 */
export const grammarToEntities = async (grammar: string): Promise<Entity[]> => {
  const response = await fetch(
    `${ENGINE_URL}/pure/v1/grammar/grammarToJson/model?returnSourceInformation=false`,
    {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: grammar,
    },
  );
  const json = (await response.json()) as {
    message?: string;
    elements?: Record<string, unknown>[];
  };
  if (!response.ok || !json.elements) {
    throw new Error(`Can't parse the test model: ${json.message}`);
  }
  return json.elements
    .filter((content) => content._type !== 'sectionIndex')
    .map((content) => {
      const type = String(content._type);
      const classifierPath = CLASSIFIER_PATHS[type];
      if (!classifierPath) {
        throw new Error(
          `No classifier path known for '${type}' elements: add it to CLASSIFIER_PATHS`,
        );
      }
      return {
        path: `${String(content.package)}::${String(content.name)}`,
        classifierPath,
        content,
      };
    });
};

/**
 * Wire the app's backends up for a test, before it navigates — for every
 * tab of the test's browser context, so a tab the app opens (e.g. the full
 * editor, from strict text mode) shares them, SDLC state included:
 * - SDLC: an in-memory SDLC holding the workspace every test opens, starting
 *   with `entities` (the model in `TEST_DATA__SDLC.ts` unless given), or the
 *   model written in `grammar` — see `SDLCMock.ts`
 * - engine: the real engine, with every call recorded, and failures or holds
 *   on demand — see `EngineSpy.ts`
 * - depot and showcase: stubbed; the test project has no published versions
 *   or dependencies, and there are no showcases
 *
 * Pass `entities` a model the form editors can't build (e.g. a property of
 * an unknown type) to open a workspace in a broken state.
 */
export const setupStudio = async (
  page: Page,
  options: { entities?: Entity[]; grammar?: string } = {},
): Promise<StudioBackends> => {
  const entities =
    options.grammar !== undefined
      ? await grammarToEntities(options.grammar)
      : (options.entities ?? TEST_DATA__Entities);
  const unmockedCalls: string[] = [];

  await page.context().route(/\/studio\/config\.json$/u, async (route) => {
    const response = await route.fetch();
    const config = (await response.json()) as Record<
      string,
      { url: string } | undefined
    >;
    await route.fulfill({
      json: {
        ...config,
        sdlc: { ...config.sdlc, url: MOCK_SDLC_URL },
        engine: { ...config.engine, url: ENGINE_URL },
        depot: { ...config.depot, url: MOCK_DEPOT_URL },
        showcase: { ...config.showcase, url: MOCK_SHOWCASE_URL },
      },
    });
  });

  const stub =
    (backend: string, answers: Record<string, unknown>) =>
    async (route: Route): Promise<void> => {
      const request = route.request();
      if (request.method() === 'OPTIONS') {
        await route.fulfill({ status: 204, headers: corsHeaders(request) });
        return;
      }
      const path = getApiPath(request);
      if (request.method() === 'GET' && path in answers) {
        await route.fulfill({
          json: answers[path],
          headers: corsHeaders(request),
        });
        return;
      }
      const call = `${request.method()} ${backend} /api/${path}`;
      unmockedCalls.push(call);
      await fulfillError(
        route,
        501,
        `Unmocked ${backend} endpoint called in e2e test: ${call} — add a handler in StudioSetup.ts`,
      );
    };
  const { groupId, artifactId } = TEST_DATA__ProjectConfiguration;
  await page
    .context()
    .route(
      `${MOCK_DEPOT_URL}/**`,
      stub('depot', { [`projects/${groupId}/${artifactId}/versions`]: [] }),
    );
  await page
    .context()
    .route(`${MOCK_SHOWCASE_URL}/**`, stub('showcase', { showcases: [] }));

  const sdlc = await installSDLCMock(page, entities, (call) =>
    unmockedCalls.push(call),
  );
  const engine = await installEngineSpy(page);

  return { sdlc, engine, unmockedCalls };
};
