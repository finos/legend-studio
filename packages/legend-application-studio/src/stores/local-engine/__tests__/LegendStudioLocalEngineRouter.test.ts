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
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  jest,
  test,
} from '@jest/globals';
import { ApplicationStore } from '@finos/legend-application';
import {
  GraphManagerState,
  ParserError,
  type LocalEngineRequest,
  type LocalEngineResponse,
} from '@finos/legend-graph';
import { assertErrorThrown, guaranteeNonNullable } from '@finos/legend-shared';
import { unitTest } from '@finos/legend-shared/test';
import { LegendStudioPluginManager } from '../../../application/LegendStudioPluginManager.js';
import { LegendStudioApplicationPlugin } from '../../LegendStudioApplicationPlugin.js';
import type { LegendStudioApplicationStore } from '../../LegendStudioBaseStore.js';
import { TEST__getLegendStudioApplicationConfig } from '../../__test-utils__/LegendStudioApplicationTestUtils.js';
import type { LegendStudioLocalEngine } from '../LegendStudioLocalEngine.js';
import {
  LegendStudioLocalEngineRouter,
  collectLocalEngines,
} from '../LegendStudioLocalEngineRouter.js';
import { LEGEND_STUDIO_APP_EVENT } from '../../../__lib__/LegendStudioEvent.js';
import { LEGEND_STUDIO_SETTING_KEY } from '../../../__lib__/LegendStudioSetting.js';

const ENGINE_URL = 'http://engine.test/api';
const PARSE_ROUTE = 'grammar/grammarToJson/model';
const COMPOSE_ROUTE = 'grammar/jsonToGrammar/model';
const COMPILE_ROUTE = 'compilation/compile';
const MODEL_TEXT = 'Class model::Secret {}';
const EMPTY_MODEL = '{"_type":"data","elements":[]}';
const PARSER_ERROR = JSON.stringify({
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
});
const REFUSAL = JSON.stringify({ message: 'not supported here' });

class TEST__LocalEnginePlugin extends LegendStudioApplicationPlugin {
  readonly engines: LegendStudioLocalEngine[];

  constructor(engines: LegendStudioLocalEngine[]) {
    super('test-local-engine-plugin', '0.0.0');
    this.engines = engines;
  }

  override getExtraLocalEngines(): LegendStudioLocalEngine[] {
    return this.engines;
  }
}

type StandInEngine = LegendStudioLocalEngine & {
  calls: { route: string; request: LocalEngineRequest }[];
};

/**
 * A stand-in local engine: it answers each route with the given answer, and
 * treats an answer whose body is `REFUSAL` as a refusal
 */
const createStandInEngine = (
  answers: Record<string, LocalEngineResponse | Error>,
  options?: {
    key?: string;
    isAvailable?: () => Promise<boolean>;
  },
): StandInEngine => {
  const calls: StandInEngine['calls'] = [];
  return {
    key: options?.key ?? 'stand-in',
    label: 'Stand-in engine',
    supportedRoutes: Object.keys(answers),
    calls,
    answer: (route, request) => {
      calls.push({ route, request });
      const answer = guaranteeNonNullable(answers[route]);
      return answer instanceof Error
        ? Promise.reject(answer)
        : Promise.resolve(answer);
    },
    ...(options?.isAvailable ? { isAvailable: options.isAvailable } : {}),
    isRefusal: (response) => response.body === REFUSAL,
  };
};

const createApplicationStore = (
  engines: LegendStudioLocalEngine[],
  local: object | undefined,
): LegendStudioApplicationStore => {
  const pluginManager = LegendStudioPluginManager.create();
  pluginManager.usePlugins([new TEST__LocalEnginePlugin(engines)]).install();
  return new ApplicationStore(
    TEST__getLegendStudioApplicationConfig({
      engine: { url: ENGINE_URL, local },
    }),
    pluginManager,
  );
};

/**
 * A session as the editor creates it: the router, through the real plugin
 * manager, given to the graph manager's engine client
 */
const createSession = async (
  engines: LegendStudioLocalEngine[],
  local: object | undefined,
  options?: { supportsWebAssemblyGC?: boolean },
): Promise<{
  applicationStore: LegendStudioApplicationStore;
  router: LegendStudioLocalEngineRouter | undefined;
  graphManagerState: GraphManagerState;
}> => {
  const applicationStore = createApplicationStore(engines, local);
  const router = LegendStudioLocalEngineRouter.create(applicationStore, {
    supportsWebAssemblyGC: () => options?.supportsWebAssemblyGC ?? true,
  });
  const graphManagerState = new GraphManagerState(
    applicationStore.pluginManager,
    applicationStore.logService,
  );
  await graphManagerState.graphManager.initialize({
    env: 'test',
    tabSize: 2,
    clientConfig: { baseUrl: ENGINE_URL, localEngineRouter: router },
    TEMPORARY__classifierPathMapping: [],
    TEMPORARY__subtypeInfo: {
      storeSubtypes: [],
      functionActivatorSubtypes: [],
    },
  });
  return { applicationStore, router, graphManagerState };
};

const LOCAL_ON = {
  mode: 'on',
  routes: [PARSE_ROUTE, COMPOSE_ROUTE, COMPILE_ROUTE],
};

/**
 * jsdom has no `Response`, which the engine client builds from a local
 * engine's answer, as a browser does. This stand-in has what the client's
 * response handling reads.
 */
class TEST__Response {
  readonly status: number;
  readonly statusText = '';
  readonly url = '';
  readonly headers = new Headers();
  private readonly body: string;

  constructor(body?: string | null, init?: { status?: number }) {
    this.body = body ?? '';
    this.status = init?.status ?? 200;
  }

  get ok(): boolean {
    return this.status >= 200 && this.status < 300;
  }

  text(): Promise<string> {
    return Promise.resolve(this.body);
  }

  json(): Promise<unknown> {
    return Promise.resolve(JSON.parse(this.body));
  }
}

const originalResponse = (globalThis as { Response?: unknown }).Response;
beforeAll(() => {
  (globalThis as { Response?: unknown }).Response =
    originalResponse ?? TEST__Response;
});
afterAll(() => {
  (globalThis as { Response?: unknown }).Response = originalResponse;
});

let fetchSpy: jest.SpiedFunction<typeof globalThis.fetch>;
const serverUrls = (): string[] =>
  fetchSpy.mock.calls.map(([url]) => String(url));

beforeEach(() => {
  // the engine server's answer: an empty model, or a passing compile
  fetchSpy = jest.spyOn(globalThis, 'fetch');
  fetchSpy.mockImplementation(() => Promise.resolve(new Response(EMPTY_MODEL)));
  localStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

const catchError = async (promise: Promise<unknown>): Promise<Error> => {
  try {
    await promise;
  } catch (error) {
    assertErrorThrown(error);
    return error;
  }
  throw new Error('Expected the call to fail');
};

describe(unitTest('Local engine: routing'), () => {
  test('a listed and supported route goes local; every other route goes to the server', async () => {
    const engine = createStandInEngine({
      [PARSE_ROUTE]: { status: 200, body: EMPTY_MODEL },
      [COMPOSE_ROUTE]: { status: 200, body: '// composed locally' },
    });
    const { router, graphManagerState } = await createSession([engine], {
      mode: 'on',
      // compose is supported but not listed; compile is listed but not supported
      routes: [PARSE_ROUTE, COMPILE_ROUTE],
    });
    const graphManager = graphManagerState.graphManager;

    expect(Array.from(guaranteeNonNullable(router).routes)).toEqual([
      PARSE_ROUTE,
    ]);
    fetchSpy.mockClear();
    expect(await graphManager.pureCodeToEntities(MODEL_TEXT)).toEqual([]);
    expect(engine.calls.map((call) => call.route)).toEqual([PARSE_ROUTE]);
    expect(engine.calls[0]?.request.body).toEqual(MODEL_TEXT);
    expect(fetchSpy).not.toHaveBeenCalled();

    fetchSpy.mockImplementation(() =>
      Promise.resolve(new Response('// composed by the server')),
    );
    expect(await graphManager.entitiesToPureCode([])).toEqual(
      '// composed by the server',
    );
    fetchSpy.mockImplementation(() => Promise.resolve(new Response('{}')));
    await graphManager.compileEntities([]);
    expect(serverUrls()).toEqual([
      `${ENGINE_URL}/pure/v1/grammar/jsonToGrammar/model?renderStyle=STANDARD`,
      `${ENGINE_URL}/pure/v1/compilation/compile`,
    ]);
    expect(engine.calls).toHaveLength(1);
  });

  test('mode off, an unknown mode or no local block keeps every call on the server', () => {
    const engine = createStandInEngine({
      [PARSE_ROUTE]: { status: 200, body: EMPTY_MODEL },
    });
    [
      undefined,
      { routes: [PARSE_ROUTE] },
      { mode: 'off', routes: [PARSE_ROUTE] },
      { mode: 'auto', routes: [PARSE_ROUTE] },
    ].forEach((local) =>
      expect(
        LegendStudioLocalEngineRouter.create(
          createApplicationStore([engine], local),
        ),
      ).toBeUndefined(),
    );
  });

  test('no plugin, or no listed route the engine supports, keeps every call on the server', () => {
    expect(
      LegendStudioLocalEngineRouter.create(
        createApplicationStore([], LOCAL_ON),
      ),
    ).toBeUndefined();
    expect(
      LegendStudioLocalEngineRouter.create(
        createApplicationStore(
          [
            createStandInEngine({
              'grammar/grammarToJson/lambda': { status: 200, body: '{}' },
            }),
          ],
          LOCAL_ON,
        ),
      ),
    ).toBeUndefined();
  });

  test('with several engines, the configuration names the one to use', () => {
    const first = createStandInEngine(
      { [PARSE_ROUTE]: { status: 200, body: EMPTY_MODEL } },
      { key: 'first' },
    );
    const second = createStandInEngine(
      { [PARSE_ROUTE]: { status: 200, body: EMPTY_MODEL } },
      { key: 'second' },
    );
    expect(
      LegendStudioLocalEngineRouter.create(
        createApplicationStore([first, second], LOCAL_ON),
      ),
    ).toBeUndefined();
    expect(
      LegendStudioLocalEngineRouter.create(
        createApplicationStore([first, second], {
          ...LOCAL_ON,
          engine: 'second',
        }),
      )?.engine,
    ).toBe(second);
  });

  test('empty and duplicate engine keys are refused', () => {
    const answers = { [PARSE_ROUTE]: { status: 200, body: EMPTY_MODEL } };
    expect(() =>
      collectLocalEngines([
        new TEST__LocalEnginePlugin([
          createStandInEngine(answers, { key: '' }),
        ]),
      ]),
    ).toThrow(/key is empty/);
    expect(() =>
      collectLocalEngines([
        new TEST__LocalEnginePlugin([createStandInEngine(answers)]),
        new TEST__LocalEnginePlugin([createStandInEngine(answers)]),
      ]),
    ).toThrow(/more than one local engine has key 'stand-in'/);
  });

  test("the Dev Tool switch keeps this browser's calls on the server", async () => {
    const engine = createStandInEngine({
      [PARSE_ROUTE]: { status: 200, body: EMPTY_MODEL },
    });
    const { applicationStore, router, graphManagerState } = await createSession(
      [engine],
      LOCAL_ON,
    );
    guaranteeNonNullable(router).setTurnedOffInThisBrowser(true);
    fetchSpy.mockClear();
    await graphManagerState.graphManager.pureCodeToEntities(MODEL_TEXT);

    expect(engine.calls).toHaveLength(0);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(
      applicationStore.settingService.getBooleanValue(
        LEGEND_STUDIO_SETTING_KEY.ENGINE_LOCAL_ENGINE_OFF,
      ),
    ).toBe(true);

    // the next session in this browser remembers it
    const next = await createSession([engine], LOCAL_ON);
    expect(next.router?.isTurnedOffInThisBrowser).toBe(true);
    expect(next.router?.isLocalRoute(PARSE_ROUTE)).toBe(false);
  });

  test('a browser without WebAssembly GC keeps the calls on the server, checked once', async () => {
    const engine = createStandInEngine({
      [PARSE_ROUTE]: { status: 200, body: EMPTY_MODEL },
    });
    const { applicationStore, graphManagerState } = await createSession(
      [engine],
      LOCAL_ON,
      { supportsWebAssemblyGC: false },
    );
    const logEvent = jest.spyOn(applicationStore.telemetryService, 'logEvent');
    fetchSpy.mockClear();
    await graphManagerState.graphManager.pureCodeToEntities(MODEL_TEXT);
    await graphManagerState.graphManager.pureCodeToEntities(MODEL_TEXT);

    expect(engine.calls).toHaveLength(0);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(logEvent.mock.calls).toEqual([
      [
        LEGEND_STUDIO_APP_EVENT.LOCAL_ENGINE_UNAVAILABLE,
        {
          sourceInfo: undefined,
          engineKey: 'stand-in',
          reason: 'no-webassembly-gc',
        },
      ],
    ]);
  });

  test('an engine that is not available keeps the calls on the server', async () => {
    const isAvailable = jest.fn(() => Promise.resolve(false));
    const engine = createStandInEngine(
      { [PARSE_ROUTE]: { status: 200, body: EMPTY_MODEL } },
      { isAvailable },
    );
    const { graphManagerState } = await createSession([engine], LOCAL_ON);
    fetchSpy.mockClear();
    await Promise.all([
      graphManagerState.graphManager.pureCodeToEntities(MODEL_TEXT),
      graphManagerState.graphManager.pureCodeToEntities(MODEL_TEXT),
    ]);

    expect(isAvailable).toHaveBeenCalledTimes(1);
    expect(engine.calls).toHaveLength(0);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

describe(unitTest('Local engine: failures'), () => {
  test("a local error is the same error as the server's", async () => {
    const engine = createStandInEngine({
      [PARSE_ROUTE]: { status: 400, body: PARSER_ERROR },
    });
    const local = await createSession([engine], LOCAL_ON);
    const localError = await catchError(
      local.graphManagerState.graphManager.pureCodeToEntities('Clas a::A {}'),
    );
    const server = await createSession([], undefined);
    fetchSpy.mockImplementation(() =>
      Promise.resolve(new Response(PARSER_ERROR, { status: 400 })),
    );
    const serverError = await catchError(
      server.graphManagerState.graphManager.pureCodeToEntities('Clas a::A {}'),
    );

    expect(localError).toBeInstanceOf(ParserError);
    expect(serverError).toBeInstanceOf(ParserError);
    expect(localError.message).toEqual(serverError.message);
    expect((localError as ParserError).sourceInformation).toEqual(
      (serverError as ParserError).sourceInformation,
    );
    expect((localError as ParserError).sourceInformation?.startColumn).toEqual(
      1,
    );
    // an error in the user's model is not a refusal: local mode stays on
    expect(local.router?.hasLeftLocalMode).toBe(false);
  });

  test('a refusal reruns the call on the server and turns local mode off, with one notice', async () => {
    const engine = createStandInEngine({
      [PARSE_ROUTE]: { status: 400, body: REFUSAL },
    });
    const { applicationStore, router, graphManagerState } = await createSession(
      [engine],
      LOCAL_ON,
    );
    const notifyWarning = jest.spyOn(
      applicationStore.notificationService,
      'notifyWarning',
    );
    fetchSpy.mockClear();
    await Promise.all([
      graphManagerState.graphManager.pureCodeToEntities(MODEL_TEXT),
      graphManagerState.graphManager.pureCodeToEntities(MODEL_TEXT),
    ]);
    await graphManagerState.graphManager.pureCodeToEntities(MODEL_TEXT);

    // both concurrent calls were refused and rerun; the third never went local
    expect(engine.calls).toHaveLength(2);
    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(router?.hasLeftLocalMode).toBe(true);
    expect(router?.isLocalRoute(PARSE_ROUTE)).toBe(false);
    expect(notifyWarning).toHaveBeenCalledTimes(1);
  });

  test('a thrown error is shown as it is, not rerun on the server', async () => {
    const engine = createStandInEngine({
      [PARSE_ROUTE]: new Error('worker crashed'),
    });
    const { router, graphManagerState } = await createSession(
      [engine],
      LOCAL_ON,
    );
    fetchSpy.mockClear();
    const error = await catchError(
      graphManagerState.graphManager.pureCodeToEntities(MODEL_TEXT),
    );

    expect(error.message).toEqual('worker crashed');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(router?.hasLeftLocalMode).toBe(false);
  });
});

describe(unitTest('Local engine: telemetry'), () => {
  test('each local call records its route, engine, time and outcome, never its content', async () => {
    const engine = createStandInEngine({
      [PARSE_ROUTE]: { status: 200, body: EMPTY_MODEL },
      [COMPOSE_ROUTE]: { status: 400, body: REFUSAL },
    });
    const { applicationStore, graphManagerState } = await createSession(
      [engine],
      LOCAL_ON,
    );
    const logEvent = jest.spyOn(applicationStore.telemetryService, 'logEvent');
    await graphManagerState.graphManager.pureCodeToEntities(MODEL_TEXT);
    await graphManagerState.graphManager.entitiesToPureCode([]);

    const calls = logEvent.mock.calls.filter(
      ([event]) => event === LEGEND_STUDIO_APP_EVENT.LOCAL_ENGINE_CALL,
    );
    expect(calls.map(([, data]) => data)).toEqual([
      {
        sourceInfo: undefined,
        route: PARSE_ROUTE,
        engineKey: 'stand-in',
        durationMs: expect.any(Number),
        outcome: 'succeeded',
        status: 200,
      },
      {
        sourceInfo: undefined,
        route: COMPOSE_ROUTE,
        engineKey: 'stand-in',
        durationMs: expect.any(Number),
        outcome: 'refused',
        status: 400,
      },
    ]);
    expect(JSON.stringify(logEvent.mock.calls)).not.toContain('Secret');
  });
});
