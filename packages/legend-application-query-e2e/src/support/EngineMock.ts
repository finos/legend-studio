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
  TEST_DATA__MappingModelCoverage,
  TEST_DATA__SubtypeInfo,
} from './TEST_DATA__EngineResponses.js';
import {
  executeQuery,
  toCSV,
  UnsupportedQueryError,
  type TDSExecutionResult,
} from './MockExecution.js';
import type { V1_ExecuteInput } from './QueryProtocol.js';

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
 * Answer an execution like the engine would, evaluating the query against
 * the mock data (see `MockExecution.ts`). Queries using Pure the mock can't
 * evaluate — aggregations, window columns, graph fetch... — get the canned
 * {@link TEST_DATA__ExecutionResult} instead, whatever they ask for.
 */
const evaluateQuery = (input: V1_ExecuteInput): TDSExecutionResult => {
  try {
    return executeQuery(input);
  } catch (error) {
    if (error instanceof UnsupportedQueryError) {
      return TEST_DATA__ExecutionResult as TDSExecutionResult;
    }
    throw error;
  }
};

/**
 * A saved query as held by the mock query store: the `V1_Query` JSON the app
 * sent, plus the fields the engine itself stamps on it.
 */
export interface StoredQuery extends Record<string, unknown> {
  id: string;
  name: string;
  owner?: string | undefined;
  createdAt?: number | undefined;
  lastUpdatedAt?: number | undefined;
  /** Set on earlier revisions only, as served by the history endpoint. */
  version?: string | undefined;
}

interface QuerySearchSpecification {
  searchTermSpecification?: { searchTerm: string; exactMatchName?: boolean };
  showCurrentUserQueriesOnly?: boolean;
  limit?: number;
}

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
  /** `V1_Query` bodies sent to update (overwrite) a saved query, in order. */
  updatedQueries: StoredQuery[];
  /** Ids of the saved queries deleted, in order. */
  deletedQueryIds: string[];
  /**
   * Engine endpoints forced to fail, keyed by path (e.g.
   * `pure/v1/execution/execute`). Populate this to drive the app's error
   * handling — see `QueryBuilderErrorHandling.spec.ts`.
   */
  failures: Map<string, { status: number; message: string }>;
}

/**
 * Intercept Legend Engine calls at the browser level and serve mock
 * responses, so tests are deterministic and require no engine backend.
 * Returns the payloads the app sent, for specs that assert on them.
 *
 * The mock is stateful per test page to support the saved-query lifecycle:
 * - created queries are stored in-memory and served back by id, and are
 *   found by query search alongside the fixture's own queries
 * - updating a query archives its previous content as a numbered revision,
 *   served by the history endpoint (so history and revert can be exercised)
 * - deleted queries are gone: loading one fails like the engine would
 * - lambda protocol JSON sent to `jsonToGrammar/lambda` (on save) is stored
 *   against a generated placeholder "grammar" string, and served back as
 *   JSON when `grammarToJson/lambda` is later called with that placeholder
 *   (on load) — so the app's own serialization round-trips without the mock
 *   needing a real Pure grammar parser.
 *
 * Pass `coreOptions` to override the app's core options (`extensions.core`
 * in `config.json`), e.g. to turn on features behind
 * `NonProductionFeatureFlag`.
 */
export const setupEngineMock = async (
  page: Page,
  { coreOptions }: { coreOptions?: Record<string, unknown> } = {},
): Promise<CapturedEngineRequests> => {
  const captured: CapturedEngineRequests = {
    executeInputs: [],
    lambdas: [],
    updatedQueries: [],
    deletedQueryIds: [],
    failures: new Map(),
  };

  // reroute the app's engine URL to the dead mock port
  await page.route(/\/query\/config\.json$/, async (route) => {
    const response = await route.fetch();
    const config = (await response.json()) as {
      engine: { url: string };
      extensions?: { core?: Record<string, unknown> };
    };
    config.engine.url = `http://localhost:${MOCK_ENGINE_PORT}/api`;
    if (coreOptions) {
      config.extensions = {
        ...config.extensions,
        core: { ...config.extensions?.core, ...coreOptions },
      };
    }
    await route.fulfill({ json: config });
  });

  // per-page state for the saved-query lifecycle
  const savedQueries = new Map<string, StoredQuery>();
  // earlier revisions of each saved query, oldest first
  const queryRevisions = new Map<string, StoredQuery[]>();
  const savedLambdas = new Map<string, string>();
  let lambdaCounter = 0;

  // like the engine: match the search term against query names (exactly, if
  // asked) or ids, and optionally restrict to the current user's queries
  const searchQueries = (spec: QuerySearchSpecification): StoredQuery[] => {
    const term = spec.searchTermSpecification?.searchTerm.toLowerCase();
    const exact = Boolean(spec.searchTermSpecification?.exactMatchName);
    const matches = [
      ...(TEST_DATA__LightQueries as StoredQuery[]),
      ...savedQueries.values(),
    ].filter(
      (query) =>
        (!term ||
          (exact
            ? query.name.toLowerCase() === term
            : query.name.toLowerCase().includes(term) ||
              query.id.toLowerCase().includes(term))) &&
        (!spec.showCurrentUserQueriesOnly ||
          query.owner === TEST_DATA__CurrentUser),
    );
    return spec.limit === undefined ? matches : matches.slice(0, spec.limit);
  };

  const queryNotFound = (route: Route, queryId: string): Promise<void> =>
    route.fulfill({
      status: 404,
      headers: { ...CORS_HEADERS },
      json: { message: `Can't find query with ID '${queryId}'` },
    });

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

    // endpoints a test has forced to fail, so the app's error handling runs
    const failure = captured.failures.get(path);
    if (failure) {
      await route.fulfill({
        status: failure.status,
        headers: { ...CORS_HEADERS },
        json: { status: failure.status, message: failure.message },
      });
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
        await fulfillJson(
          route,
          searchQueries(
            JSON.parse(getRequestBody(request)) as QuerySearchSpecification,
          ),
        );
        return;
      // which properties a mapping maps, for queries built on a mapping
      case 'pure/v1/analytics/mapping/modelCoverage': {
        const { mapping } = JSON.parse(getRequestBody(request)) as {
          mapping: string;
        };
        if (mapping === 'test::CovidDataMapping') {
          await fulfillJson(route, TEST_DATA__MappingModelCoverage);
          return;
        }
        break;
      }
      case 'pure/v1/execution/execute': {
        const input = JSON.parse(getRequestBody(request)) as V1_ExecuteInput;
        captured.executeInputs.push(
          input as unknown as Record<string, unknown>,
        );
        const result = evaluateQuery(input);
        // exports ask for a serialized result, e.g. CSV, to download
        const format = new URL(request.url()).searchParams.get(
          'serializationFormat',
        );
        if (format && format !== 'PURE_TDSOBJECT') {
          await route.fulfill({
            body: toCSV(result),
            contentType: 'text/csv',
            headers: { ...CORS_HEADERS },
          });
          return;
        }
        await fulfillJson(route, result);
        return;
      }
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
    // query CRUD: the engine stamps ownership and timestamps on the query
    if (path === 'pure/v1/query' && request.method() === 'POST') {
      const now = Date.now();
      const query: StoredQuery = {
        ...(JSON.parse(request.postData() ?? '{}') as StoredQuery),
        owner: TEST_DATA__CurrentUser,
        createdAt: now,
        lastUpdatedAt: now,
      };
      savedQueries.set(query.id, query);
      await fulfillJson(route, query);
      return;
    }
    // earlier revisions, or just the one asked for by `?version=`
    const historyMatch = /^pure\/v1\/query\/(?<id>[^/]+)\/history$/.exec(path);
    if (historyMatch?.groups?.id && request.method() === 'GET') {
      const queryId = decodeURIComponent(historyMatch.groups.id);
      const version = new URL(request.url()).searchParams.get('version');
      const revisions = queryRevisions.get(queryId) ?? [];
      await fulfillJson(
        route,
        version === null
          ? revisions
          : revisions.filter((revision) => revision.version === version),
      );
      return;
    }
    const queryMatch = /^pure\/v1\/query\/(?<id>[^/]+)$/.exec(path);
    if (
      queryMatch?.groups?.id &&
      ['GET', 'PUT', 'DELETE'].includes(request.method())
    ) {
      const queryId = decodeURIComponent(queryMatch.groups.id);
      const query = savedQueries.get(queryId);
      if (!query) {
        await queryNotFound(route, queryId);
        return;
      }
      if (request.method() === 'GET') {
        await fulfillJson(route, query);
        return;
      }
      if (request.method() === 'PUT') {
        const update = JSON.parse(request.postData() ?? '{}') as StoredQuery;
        captured.updatedQueries.push(update);
        const revisions = queryRevisions.get(queryId) ?? [];
        revisions.push({ ...query, version: String(revisions.length + 1) });
        queryRevisions.set(queryId, revisions);
        const updated: StoredQuery = {
          ...update,
          owner: query.owner,
          createdAt: query.createdAt,
          lastUpdatedAt: Date.now(),
        };
        savedQueries.set(queryId, updated);
        await fulfillJson(route, updated);
        return;
      }
      if (request.method() === 'DELETE') {
        captured.deletedQueryIds.push(queryId);
        savedQueries.delete(queryId);
        queryRevisions.delete(queryId);
        await fulfillJson(route, query);
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
