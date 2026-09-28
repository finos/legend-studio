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
  TEST_DATA__LightQueries,
  TEST_DATA__MappingModelCoverage,
  TEST_DATA__SubtypeInfo,
} from './TEST_DATA__EngineResponses.js';
import {
  executeQuery,
  isTDSExecutionResult,
  toCSV,
  UnsupportedQueryError,
  type TDSExecutionResult,
} from './MockExecution.js';
import {
  asLambda,
  getQueryExpression,
  getValue,
  type V1_AppliedFunction,
  type V1_ExecuteInput,
  type V1_ValueSpecification,
} from './QueryProtocol.js';

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

/** The query builder's row limit on typeahead suggestions. */
const TYPEAHEAD_SEARCH_LIMIT = 10;

const isFunctionNamed = (
  node: V1_ValueSpecification | undefined,
  name: string,
): node is V1_AppliedFunction =>
  node?._type === 'func' &&
  ((node as V1_AppliedFunction).function === name ||
    (node as V1_AppliedFunction).function.endsWith(`::${name}`));

/**
 * Whether an execution is a value editor's typeahead lookup rather than a
 * query run: the app looks up suggestions for a filter value through the
 * execute endpoint too, with no flag to tell them apart but their shape —
 * `...->filter(row|$row.getString('<column>')->startsWith('<typed>'))
 * ->distinct()->take(10)`.
 */
const isTypeaheadLookup = (input: V1_ExecuteInput): boolean => {
  const take = getQueryExpression(input.function);
  if (!isFunctionNamed(take, 'take')) {
    return false;
  }
  const [distinct, limit] = take.parameters;
  if (
    limit?._type !== 'integer' ||
    getValue(limit) !== TYPEAHEAD_SEARCH_LIMIT ||
    !isFunctionNamed(distinct, 'distinct')
  ) {
    return false;
  }
  const [filter] = distinct.parameters;
  const condition = isFunctionNamed(filter, 'filter')
    ? filter.parameters[1]
    : undefined;
  return (
    condition?._type === 'lambda' &&
    isFunctionNamed(asLambda(condition).body[0], 'startsWith')
  );
};

/**
 * A minimal but well-formed relational execution plan for a query, as the
 * engine's plan generation returns it: a TDS instantiation over the single
 * SQL query the mock "runs" (see `MockExecution.ts`), against the test
 * project's database.
 */
const buildExecutionPlan = (result: TDSExecutionResult): object => ({
  _type: 'simple',
  authDependent: false,
  rootExecutionNode: {
    _type: 'relationalTdsInstantiation',
    authDependent: false,
    executionNodes: [
      {
        _type: 'sql',
        authDependent: false,
        connection: {
          _type: 'RelationalDatabaseConnection',
          authenticationStrategy: { _type: 'h2Default' },
          datasourceSpecification: {
            _type: 'h2Local',
            testDataSetupSqls: [],
          },
          element: 'test::CovidDataStore',
          postProcessorWithParameter: [],
          postProcessors: [],
          type: 'H2',
        },
        executionNodes: [],
        resultColumns: result.builder.columns.map((column) => ({
          label: `"${column.name}"`,
          dataType: column.relationalType,
        })),
        resultType: {
          _type: 'dataType',
          dataType: 'meta::pure::metamodel::type::Any',
        },
        sqlQuery: result.activities[0]?.sql ?? '',
      },
    ],
    resultSizeRange: { lowerBound: 0 },
    resultType: {
      _type: 'tds',
      tdsColumns: result.builder.columns.map((column) => ({
        name: column.name,
        type: column.type,
        relationalType: column.relationalType,
      })),
    },
  },
  serializer: { name: 'pure', version: 'vX_X_X' },
  templateFunctions: [],
});

type ValueSpecificationJSON = Record<string, unknown> & { _type: string };

/**
 * Render a value specification as Pure grammar, like the engine does — for
 * literals and lists of them, e.g. `'Death'`, `250`, `%2021-04-05` or
 * `['Active', 'Death']`. Returns `undefined` for anything else.
 *
 * Rendering (and parsing, see {@link parseValueSpecification}) literals for
 * real means a parameter value saved with a query reads like the `p:` URL
 * overrides a user types, so both go through the same path on load.
 */
const renderValueSpecification = (
  json: ValueSpecificationJSON,
): string | undefined => {
  switch (json._type) {
    case 'string':
      return `'${String(json.value).replace(/['\\]/g, '\\$&')}'`;
    case 'integer':
    case 'float':
    case 'decimal':
    case 'boolean':
      return String(json.value);
    case 'strictDate':
    case 'dateTime':
      return `%${String(json.value)}`;
    case 'collection': {
      const values = (json.values as ValueSpecificationJSON[]).map(
        renderValueSpecification,
      );
      return values.every((value) => value !== undefined)
        ? `[${values.join(', ')}]`
        : undefined;
    }
    default:
      return undefined;
  }
};

/** Split a list's grammar on the commas between its elements. */
const splitListElements = (text: string): string[] => {
  const elements: string[] = [];
  let current = '';
  let quoted = false;
  for (let idx = 0; idx < text.length; idx++) {
    const char = text.charAt(idx);
    if (char === '\\' && quoted) {
      current += char + text.charAt((idx += 1));
    } else if (char === "'") {
      quoted = !quoted;
      current += char;
    } else if (char === ',' && !quoted) {
      elements.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  return current.trim() ? [...elements, current] : elements;
};

/**
 * Parse the Pure grammar of a literal, or a list of them, into its value
 * specification — the inverse of {@link renderValueSpecification}.
 */
const parseValueSpecification = (
  text: string,
): ValueSpecificationJSON | undefined => {
  const grammar = text.trim();
  const string = /^'(?<content>(?:[^'\\]|\\.)*)'$/s.exec(grammar);
  if (string) {
    return {
      _type: 'string',
      value: (string.groups?.content ?? '').replace(
        /\\(?<escaped>.)/g,
        '$<escaped>',
      ),
    };
  }
  const date = /^%(?<date>\d{4}-\d{2}-\d{2})(?<time>T.+)?$/.exec(grammar);
  if (date?.groups?.date) {
    return {
      _type: date.groups.time ? 'dateTime' : 'strictDate',
      value: `${date.groups.date}${date.groups.time ?? ''}`,
    };
  }
  if (grammar === 'true' || grammar === 'false') {
    return { _type: 'boolean', value: grammar === 'true' };
  }
  if (/^-?\d+$/.test(grammar)) {
    return { _type: 'integer', value: Number(grammar) };
  }
  if (/^-?\d*\.\d+$/.test(grammar)) {
    return { _type: 'float', value: Number(grammar) };
  }
  const list = /^\[(?<elements>.*)\]$/s.exec(grammar);
  if (list) {
    const values = splitListElements(list.groups?.elements ?? '').map(
      parseValueSpecification,
    );
    return values.every((value) => value !== undefined)
      ? {
          _type: 'collection',
          multiplicity: {
            lowerBound: values.length,
            upperBound: values.length,
          },
          values,
        }
      : undefined;
  }
  return undefined;
};

/**
 * Evaluate a query against the mock data (see `MockExecution.ts`), or
 * answer like the engine would if the mock can't: with an error naming what
 * it can't evaluate. There is deliberately no canned fallback result — rows
 * the query didn't produce would let a test pass whatever the app sent.
 */
const answerQuery = async (
  route: Route,
  input: V1_ExecuteInput,
  answer: (result: ReturnType<typeof executeQuery>) => Promise<void>,
): Promise<void> => {
  let result: ReturnType<typeof executeQuery>;
  try {
    result = executeQuery(input);
  } catch (error) {
    if (error instanceof UnsupportedQueryError) {
      await route.fulfill({
        status: 501,
        headers: { ...CORS_HEADERS },
        json: {
          message: `Unsupported query in e2e engine mock: ${error.message} — extend MockExecution.ts`,
        },
      });
      return;
    }
    throw error;
  }
  await answer(result);
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
  /**
   * `V1_ExecuteInput` bodies of the queries executed — run, or exported — in
   * order. Typeahead lookups also go through the execute endpoint but are
   * recorded apart, in {@link typeaheadInputs}, so this holds only what the
   * user asked to execute.
   */
  executeInputs: Record<string, unknown>[];
  /** `V1_ExecuteInput` bodies of value editors' typeahead lookups, in order. */
  typeaheadInputs: Record<string, unknown>[];
  /** `V1_ExecuteInput` bodies posted to generate (or debug) a plan, in order. */
  planInputs: Record<string, unknown>[];
  /** Lambda protocol JSON posted to `jsonToGrammar/lambda`, in order. */
  lambdas: Record<string, unknown>[];
  /** Lambdas sent to compile (`lambdaReturnType`), in order. */
  compiledLambdas: Record<string, unknown>[];
  /** Users whose running executions the app asked to cancel, in order. */
  cancelledExecutionUsers: string[];
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
  /**
   * Engine endpoints whose responses are held back until the promise
   * settles, keyed by path. Use {@link holdEngineEndpoint} to populate it, to
   * exercise what the app does while a call is in flight.
   */
  holds: Map<string, Promise<void>>;
}

/**
 * Hold back the engine's responses on `path` (e.g.
 * `pure/v1/execution/execute`) until the returned function is called — to
 * test what the app shows while a call is slow, or lets the user do about it.
 */
export const holdEngineEndpoint = (
  captured: CapturedEngineRequests,
  path: string,
): (() => void) => {
  let release: () => void = () => undefined;
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
 * - a query's parameter values round-trip the same way, except literals,
 *   which are rendered and parsed as real grammar (e.g. `'Death'`), as the
 *   `p:` parameter overrides of a query's URL are.
 *
 * Queries are evaluated against the mock data (see `MockExecution.ts`):
 * one the mock can't evaluate fails loudly rather than answering with rows
 * it didn't select. Compiling, plan generation and cancelling executions are
 * answered too; `failures` and `holds` (see {@link CapturedEngineRequests})
 * make any endpoint fail, or hang, on demand.
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
    typeaheadInputs: [],
    planInputs: [],
    lambdas: [],
    compiledLambdas: [],
    cancelledExecutionUsers: [],
    updatedQueries: [],
    deletedQueryIds: [],
    failures: new Map(),
    holds: new Map(),
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
  // the JSON behind each placeholder "grammar" string handed out
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
  const getEndpoint = (request: Request): string =>
    engineApiUrlPattern.exec(request.url())?.groups?.endpoint ?? '';
  // strip query parameters (e.g. `?renderStyle=PRETTY`)
  const getPath = (request: Request): string =>
    getEndpoint(request).split('?')[0] ?? '';

  const respond = async (route: Route): Promise<void> => {
    const request = route.request();
    const endpoint = getEndpoint(request);
    const path = getPath(request);

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
        (isTypeaheadLookup(input)
          ? captured.typeaheadInputs
          : captured.executeInputs
        ).push(input as unknown as Record<string, unknown>);
        await answerQuery(route, input, async (result) => {
          // exports ask for a serialized result, e.g. CSV, to download
          const format = new URL(request.url()).searchParams.get(
            'serializationFormat',
          );
          if (
            format &&
            format !== 'PURE_TDSOBJECT' &&
            isTDSExecutionResult(result)
          ) {
            await route.fulfill({
              body: toCSV(result),
              contentType: 'text/csv',
              headers: { ...CORS_HEADERS },
            });
            return;
          }
          await fulfillJson(route, result);
        });
        return;
      }
      // the plan the engine would execute a query with (and, when debugging,
      // how it came to it) — here, over the query the mock would "run"
      case 'pure/v1/execution/generatePlan':
      case 'pure/v1/execution/generatePlan/debug': {
        const input = JSON.parse(getRequestBody(request)) as V1_ExecuteInput;
        captured.planInputs.push(input as unknown as Record<string, unknown>);
        await answerQuery(route, input, async (result) => {
          if (!isTDSExecutionResult(result)) {
            throw new Error(
              '[engine mock] plans are only generated for TDS queries',
            );
          }
          const plan = buildExecutionPlan(result);
          await fulfillJson(
            route,
            path.endsWith('/debug')
              ? {
                  plan,
                  debug: [
                    '-- plan generated by the e2e engine mock',
                    `-- routing ${input.mapping}`,
                  ],
                }
              : plan,
          );
        });
        return;
      }
      // compiling a query: a lambda compiles to its return type, a failure
      // is a `400` carrying the compilation error (drive it via `failures`)
      case 'pure/v1/compilation/lambdaReturnType': {
        const { lambda } = JSON.parse(getRequestBody(request)) as {
          lambda: Record<string, unknown>;
        };
        captured.compiledLambdas.push(lambda);
        await fulfillJson(route, {
          returnType: 'meta::pure::tds::TabularDataSet',
        });
        return;
      }
      // stopping a running query cancels the user's executions
      case 'server/v1/executionManager/cancelUserExecution':
        captured.cancelledExecutionUsers.push(
          new URL(request.url()).searchParams.get('userID') ?? '',
        );
        await fulfillText(route, 'cancelled');
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
      // value specifications -> Pure grammar, keyed by name (called when
      // saving a query's parameter values): literals render as real grammar,
      // anything else as a placeholder served back on load
      case 'pure/v1/grammar/jsonToGrammar/valueSpecification/batch': {
        const input = JSON.parse(getRequestBody(request)) as Record<
          string,
          ValueSpecificationJSON
        >;
        await fulfillJson(
          route,
          Object.fromEntries(
            Object.entries(input).map(([name, json]) => {
              const grammar = renderValueSpecification(json);
              if (grammar !== undefined) {
                return [name, grammar];
              }
              const placeholder = `e2e_mock_value_${(lambdaCounter += 1)}`;
              savedLambdas.set(placeholder, JSON.stringify(json));
              return [name, placeholder];
            }),
          ),
        );
        return;
      }
      // Pure grammar -> value specifications, keyed by name (called when
      // loading a query's saved, or URL-given, parameter values)
      case 'pure/v1/grammar/grammarToJson/valueSpecification/batch': {
        const input = JSON.parse(getRequestBody(request)) as Record<
          string,
          { value: string }
        >;
        const result: Record<string, unknown> = {};
        const errors: Record<string, unknown> = {};
        Object.entries(input).forEach(([name, { value }]) => {
          const saved = savedLambdas.get(value);
          const json =
            saved === undefined
              ? parseValueSpecification(value)
              : (JSON.parse(saved) as unknown);
          if (json === undefined) {
            errors[name] = {
              message: `[engine mock] can't parse '${value}': only literals are supported`,
            };
          } else {
            result[name] = json;
          }
        });
        await fulfillJson(route, { result, errors });
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
  };

  await page.route(engineApiUrlPattern, async (route) => {
    // endpoints a test holds back, to see what the app does meanwhile
    const hold =
      route.request().method() === 'OPTIONS'
        ? undefined
        : captured.holds.get(getPath(route.request()));
    if (hold) {
      await hold;
      // the app may have given up on the call meanwhile, e.g. when the user
      // stopped a query, leaving the response nowhere to go
      await respond(route).catch(() => undefined);
      return;
    }
    await respond(route);
  });

  return captured;
};
