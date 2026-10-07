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

import { describe, expect, jest, test } from '@jest/globals';
import {
  EmitRole,
  func,
  type IR,
  lambda,
  literal,
  type ModelContext,
  QueryEmitter,
  Schema,
  storeAccessor,
} from '@finos/legend-cube';
import {
  NetworkClientError,
  type PlainObject,
  TracerService,
} from '@finos/legend-shared';
import {
  type AccessorPath,
  CubeEngineError,
  CubeEngineErrorKind,
} from '../../../../CubeEngine.js';
import {
  NORTHWIND_RUNTIME,
  sliceQuery,
} from '../../../../../__test-utils__/CubeNorthwindTestQueries.js';
import { V1_EngineServerClient } from '@finos/legend-graph';
import { buildCubeEngine } from '../../CubeEngineBuilder.js';
import { V1_LegendCubeEngine } from '../V1_LegendCubeEngine.js';
import { V1_buildCubeSchema } from '../V1_CubeRelationTypeAdapter.js';

const MODEL: ModelContext = Object.freeze({
  _type: 'text',
  code: '###Relational\nDatabase test::Db ()',
});
const ACCESSOR: AccessorPath = ['test::Db', 'S', 'T'];

const newEngine = (): V1_LegendCubeEngine =>
  new V1_LegendCubeEngine(
    { baseUrl: 'http://localhost:6300/api' },
    new TracerService(),
  );

/** A relation type of one Integer column, with the type parameters given */
const relationType = (
  name: string,
  typeVariableValues: unknown[] = [],
): PlainObject => ({
  _type: 'relationType',
  columns: [
    {
      name,
      genericType: {
        rawType: { _type: 'packageableType', fullPath: 'Integer' },
        typeArguments: [],
        multiplicityArguments: [],
        typeVariableValues,
      },
      multiplicity: { lowerBound: 1, upperBound: 1 },
    },
  ],
});

/** A response body as the client reads it: parsed JSON, where `__proto__` is a key like any other */
const answer = (json: string): never => JSON.parse(json) as never;

const networkError = (payload: unknown): NetworkClientError =>
  new NetworkClientError(
    {
      status: 400,
      statusText: 'Bad Request',
      url: 'http://engine',
    } as Response,
    payload as NetworkClientError['payload'],
  );

/** A table accessor's prefix lambda, as typing sends it */
const ACCESSOR_LAMBDA = lambda([], [storeAccessor(ACCESSOR)]);

/** A lambda with an integer past 2^53, which a JS number can't hold */
const UNSAFE_INTEGER_LAMBDA = lambda(
  [],
  [
    func('limit', [
      storeAccessor(ACCESSOR),
      literal({ kind: 'integer', value: '9007199254740993' }),
    ]),
  ],
);

/** The execution lambda of the slice, captured at `filter101` */
const SLICE_EXECUTION = new QueryEmitter(sliceQuery()).emitExecutionLambda({
  rowLimit: 1000,
  runtime: NORTHWIND_RUNTIME,
});

const RESULT_TEXT = `{"builder": {"_type":"tdsBuilder","columns":[{"name":"ID","type":"Integer"}]}, "activities": [{"_type":"relational","sql":"select ID"}], "result" : {"columns" : ["ID"], "rows" : [{"values": [9007199254740993]}]}}`;

const responseOf = (text: string): Response =>
  ({ ok: true, status: 200, text: async () => text }) as Response;

describe('Legend Cube engine: wiring', () => {
  test('Builds an engine whose client has a tracer, so its calls get as far as the network', async () => {
    const engine = buildCubeEngine(
      { baseUrl: 'http://localhost:6300/api' },
      new TracerService(),
    );
    expect(engine).toBeInstanceOf(V1_LegendCubeEngine);
    // the test environment refuses real network calls, after the tracer's check
    const error = await engine
      .loadModel(MODEL)
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(CubeEngineError);
    expect((error as CubeEngineError).kind).toBe(CubeEngineErrorKind.NETWORK);
    expect((error as CubeEngineError).detail).not.toContain('Tracer service');
    // without one, a client fails before any request
    await expect(
      new V1_EngineServerClient({
        baseUrl: 'http://localhost:6300/api',
      }).grammarToJSON_model('x'),
    ).rejects.toThrow('Tracer service has not been set');
  });
});

describe('Legend Cube engine: model kinds', () => {
  test.each<[string, ModelContext]>([
    ['pointer', { _type: 'pointer', sdlcInfo: {} }],
    ['data', { _type: 'data', elements: [] }],
    ['combination', { _type: 'combination', models: [] }],
    // a kind it doesn't know, even one carrying Pure text
    ['mystery', { ...MODEL, _type: 'mystery' }],
  ])(
    'Refuses a model of kind %s for every call, without calling the engine',
    async (type, model) => {
      const engine = newEngine();
      const parse = jest.spyOn(engine.client, 'grammarToJSON_model');
      const batch = jest.spyOn(engine.client, 'batchLambdasRelationType');
      const run = jest.spyOn(engine.client, 'runQuery');
      const message = `This cube's model kind "${type}" isn't supported yet.`;
      await expect(engine.loadModel(model)).rejects.toMatchObject({
        kind: CubeEngineErrorKind.UNSUPPORTED_MODEL,
        detail: message,
      });
      const resolved = await engine.resolveSchemas(
        model,
        new Map([['relational101', ACCESSOR]]),
      );
      const typed = await engine.typeLambdas(
        model,
        new Map([['join101', ACCESSOR_LAMBDA]]),
      );
      [
        [resolved.get('relational101'), 'relational101'] as const,
        [typed.get('join101'), 'join101'] as const,
      ].forEach(([error, nodeId]) => {
        expect(error).toBeInstanceOf(CubeEngineError);
        expect(error).toMatchObject({
          kind: CubeEngineErrorKind.UNSUPPORTED_MODEL,
          nodeId,
          detail: message,
        });
      });
      await expect(
        engine.execute(model, SLICE_EXECUTION),
      ).rejects.toMatchObject({
        kind: CubeEngineErrorKind.UNSUPPORTED_MODEL,
        nodeId: 'filter101',
        detail: message,
      });
      expect(parse).not.toHaveBeenCalled();
      expect(batch).not.toHaveBeenCalled();
      expect(run).not.toHaveBeenCalled();
    },
  );

  test('Refuses a text model without its text', async () => {
    await expect(newEngine().loadModel({ _type: 'text' })).rejects.toThrow(
      `This cube's model kind "text" isn't supported yet.`,
    );
  });
});

describe('Legend Cube engine: model outline', () => {
  test("Parses a model's text once to read its outline", async () => {
    const engine = newEngine();
    const parse = jest
      .spyOn(engine.client, 'grammarToJSON_model')
      .mockResolvedValue({ _type: 'data', elements: [] });
    expect(await engine.loadModel(MODEL)).toEqual({
      databases: [],
      runtimes: [],
    });
    expect(parse).toHaveBeenCalledTimes(1);
    expect(parse).toHaveBeenCalledWith(MODEL.code);
  });
});

describe('Legend Cube engine: typing', () => {
  test('Types every table in one call, sending the saved model as it is', async () => {
    const engine = newEngine();
    const type = jest
      .spyOn(engine.client, 'batchLambdasRelationType')
      .mockResolvedValue({
        result: {
          relational101: relationType('A'),
          relational102: relationType('B'),
        },
      } as never);
    const typed = await engine.resolveSchemas(
      MODEL,
      new Map([
        ['relational101', ACCESSOR],
        ['relational102', ['test::Db', 'S', '"U.V"']],
      ]),
    );
    expect(type).toHaveBeenCalledTimes(1);
    const body = JSON.parse(type.mock.calls[0]?.[0] as unknown as string) as {
      model: unknown;
      lambdas: Record<string, { body: [{ value: { path: string[] } }] }>;
    };
    expect(body.model).toEqual(MODEL);
    expect(body.lambdas.relational102?.body[0].value.path).toEqual([
      'test::Db',
      'S',
      '"U.V"',
    ]);
    expect(
      [...typed].map(([nodeId, schema]) => [
        nodeId,
        (schema as Schema).columns.map((column) => column.name),
      ]),
    ).toEqual([
      ['relational101', ['A']],
      ['relational102', ['B']],
    ]);
  });

  test('Reads the results under `results` too', async () => {
    const engine = newEngine();
    jest
      .spyOn(engine.client, 'batchLambdasRelationType')
      .mockResolvedValue({ results: { n: relationType('A') } } as never);
    expect(
      (
        await engine.typeLambdas(
          MODEL,
          new Map([['n', lambda([], [storeAccessor(ACCESSOR)])]]),
        )
      ).get('n'),
    ).toBeInstanceOf(Schema);
  });

  test('Gives each key its own error, on the node its stamp names or else on the key', async () => {
    const engine = newEngine();
    const type = jest
      .spyOn(engine.client, 'batchLambdasRelationType')
      .mockResolvedValue({
        result: { good: relationType('A') },
        errors: {
          bad: { message: 'Match failure: BinaryObject instanceOf Binary' },
          stamped: {
            message: "Can't find the column 'X'",
            sourceInformation: { sourceId: 'cube:filter101:column' },
          },
        },
      } as never);
    const ir = lambda([], [storeAccessor(ACCESSOR)]);
    const typed = await engine.typeLambdas(
      MODEL,
      new Map([
        ['good', ir],
        ['bad', ir],
        ['stamped', ir],
        ['missing', ir],
      ]),
    );
    // every lambda goes in the one call
    expect(type).toHaveBeenCalledTimes(1);
    expect(
      Object.keys(
        (
          JSON.parse(type.mock.calls[0]?.[0] as unknown as string) as {
            lambdas: PlainObject;
          }
        ).lambdas,
      ),
    ).toEqual(['good', 'bad', 'stamped', 'missing']);
    expect(typed.get('good')).toBeInstanceOf(Schema);
    expect(typed.get('bad')).toMatchObject({
      kind: CubeEngineErrorKind.COMPILE,
      nodeId: 'bad',
      firstLine: 'Match failure: BinaryObject instanceOf Binary',
    });
    expect(typed.get('stamped')).toMatchObject({
      nodeId: 'filter101',
      role: 'column',
    });
    expect(typed.get('missing')).toMatchObject({
      kind: CubeEngineErrorKind.NETWORK,
      nodeId: 'missing',
    });
  });

  test("Gives a key whose type it can't read its own error, and still types the others", async () => {
    const engine = newEngine();
    const unreadable = {
      bad: relationType('C', [{ _type: 'string', value: '5' }]),
      // as the engine types `extend(~'': r|1)`
      unnamed: relationType(''),
    };
    jest.spyOn(engine.client, 'batchLambdasRelationType').mockResolvedValue({
      result: { good: relationType('A'), ...unreadable },
    } as never);
    const typed = await engine.typeLambdas(
      MODEL,
      new Map([
        ['good', ACCESSOR_LAMBDA],
        ['bad', ACCESSOR_LAMBDA],
        ['unnamed', ACCESSOR_LAMBDA],
      ]),
    );
    expect(typed.get('good')).toBeInstanceOf(Schema);
    Object.entries(unreadable).forEach(([nodeId, type]) => {
      // the key's error says what the relation type adapter says of its type
      let refusal: unknown;
      try {
        V1_buildCubeSchema(type);
      } catch (error) {
        refusal = error;
      }
      expect(refusal).toBeInstanceOf(Error);
      expect(typed.get(nodeId)).toBeInstanceOf(CubeEngineError);
      expect(typed.get(nodeId)).toMatchObject({
        kind: CubeEngineErrorKind.COMPILE,
        nodeId,
        detail: (refusal as Error).message,
      });
    });
  });

  test('Reads a key named like a member of every object from what the engine sent for that key alone', async () => {
    const engine = newEngine();
    jest
      .spyOn(engine.client, 'batchLambdasRelationType')
      // the engine's answer when a key fails: no `result` at all
      .mockResolvedValueOnce(
        answer(`{"errors": {
          "__proto__": {"message": "Can't find the table of __proto__"},
          "constructor": {"message": "Can't find the table of constructor"},
          "toString": {"message": "Can't find the table of toString"}
        }}`),
      )
      .mockResolvedValueOnce(
        answer(`{"result": {
          "__proto__": ${JSON.stringify(relationType('A'))},
          "constructor": ${JSON.stringify(relationType('B'))}
        }}`),
      );
    const failed = await engine.typeLambdas(
      MODEL,
      new Map(
        ['__proto__', 'constructor', 'toString', 'valueOf'].map((nodeId) => [
          nodeId,
          ACCESSOR_LAMBDA,
        ]),
      ),
    );
    expect(
      [...failed].map(([nodeId, entry]) =>
        entry instanceof CubeEngineError
          ? [nodeId, entry.kind, entry.nodeId, entry.firstLine]
          : [nodeId, 'a schema'],
      ),
    ).toEqual([
      [
        '__proto__',
        CubeEngineErrorKind.COMPILE,
        '__proto__',
        "Can't find the table of __proto__",
      ],
      [
        'constructor',
        CubeEngineErrorKind.COMPILE,
        'constructor',
        "Can't find the table of constructor",
      ],
      [
        'toString',
        CubeEngineErrorKind.COMPILE,
        'toString',
        "Can't find the table of toString",
      ],
      [
        'valueOf',
        CubeEngineErrorKind.NETWORK,
        'valueOf',
        'The engine gave no type for this node',
      ],
    ]);
    const typed = await engine.typeLambdas(
      MODEL,
      new Map([
        ['__proto__', ACCESSOR_LAMBDA],
        ['constructor', ACCESSOR_LAMBDA],
      ]),
    );
    expect(
      [...typed].map(([nodeId, schema]) => [
        nodeId,
        (schema as Schema).columns.map((column) => column.name),
      ]),
    ).toEqual([
      ['__proto__', ['A']],
      ['constructor', ['B']],
    ]);
  });

  test('Never reads a type or an error that a key only inherits', async () => {
    const engine = newEngine();
    jest.spyOn(engine.client, 'batchLambdasRelationType').mockResolvedValue({
      // what a polluted prototype would give every map, not what the engine sends
      result: Object.create({ typed: relationType('A') }) as PlainObject,
      errors: Object.create({
        failed: { message: "Can't find the table" },
      }) as PlainObject,
    } as never);
    const typed = await engine.typeLambdas(
      MODEL,
      new Map([
        ['typed', ACCESSOR_LAMBDA],
        ['failed', ACCESSOR_LAMBDA],
      ]),
    );
    expect(
      [...typed].map(([nodeId, entry]) =>
        entry instanceof CubeEngineError
          ? [nodeId, entry.kind, entry.nodeId, entry.firstLine]
          : [nodeId, 'a schema'],
      ),
    ).toEqual([
      [
        'typed',
        CubeEngineErrorKind.NETWORK,
        'typed',
        'The engine gave no type for this node',
      ],
      [
        'failed',
        CubeEngineErrorKind.NETWORK,
        'failed',
        'The engine gave no type for this node',
      ],
    ]);
  });

  test('Gives every key the error of a call that fails as a whole', async () => {
    const engine = newEngine();
    jest
      .spyOn(engine.client, 'batchLambdasRelationType')
      .mockRejectedValue(networkError({ message: 'Model does not compile' }));
    const typed = await engine.resolveSchemas(
      MODEL,
      new Map([
        ['a', ACCESSOR],
        ['b', ACCESSOR],
      ]),
    );
    expect(
      [...typed.values()].map((error) => (error as CubeEngineError).nodeId),
    ).toEqual(['a', 'b']);
    expect(
      [...typed.values()].every(
        (error) =>
          (error as CubeEngineError).firstLine === 'Model does not compile',
      ),
    ).toBe(true);
  });

  test('Makes no call for nothing to type', async () => {
    const engine = newEngine();
    const type = jest.spyOn(engine.client, 'batchLambdasRelationType');
    expect((await engine.resolveSchemas(MODEL, new Map())).size).toBe(0);
    expect(type).not.toHaveBeenCalled();
  });

  test('Sends numbers digit for digit', async () => {
    const engine = newEngine();
    const type = jest
      .spyOn(engine.client, 'batchLambdasRelationType')
      .mockResolvedValue({ result: {} } as never);
    await engine.typeLambdas(
      MODEL,
      new Map<string, IR>([['n', UNSAFE_INTEGER_LAMBDA]]),
    );
    expect(type.mock.calls[0]?.[0]).toContain('"value":9007199254740993');
  });

  test('Stamps a table accessor with its node, so its errors land there', async () => {
    const engine = newEngine();
    const type = jest
      .spyOn(engine.client, 'batchLambdasRelationType')
      .mockResolvedValue({ result: {} } as never);
    await engine.resolveSchemas(MODEL, new Map([['relational101', ACCESSOR]]));
    expect(type.mock.calls[0]?.[0]).toContain(
      `"sourceId":"cube:relational101:${EmitRole.ACCESSOR}"`,
    );
  });
});

describe('Legend Cube engine: execution', () => {
  test('Runs a lambda with the saved model and no runtime of its own, reading the result losslessly', async () => {
    const engine = newEngine();
    const run = jest
      .spyOn(engine.client, 'runQuery')
      .mockResolvedValue(responseOf(RESULT_TEXT));
    const abortController = new AbortController();
    const result = await engine.execute(MODEL, SLICE_EXECUTION, {
      abortController,
    });
    expect(result).toMatchObject({
      columns: ['ID'],
      rows: [['9007199254740993']],
      sql: ['select ID'],
    });
    const [body, options] = run.mock.calls[0] ?? [];
    expect(options).toEqual({ returnAsResponse: true, abortController });
    // the caller's own controller, so aborting it cancels the request (`toEqual`
    // finds any two controllers equal, and Jest can't print one to compare)
    expect(options?.abortController === abortController).toBe(true);
    const sent = JSON.parse(body as unknown as string) as PlainObject;
    expect(Object.keys(sent).sort()).toEqual([
      'clientVersion',
      'context',
      'function',
      'model',
      'parameterValues',
    ]);
    expect(sent.model).toEqual(MODEL);
    expect(sent.context).toEqual({ _type: 'BaseExecutionContext' });
  });

  test('Sends numbers to run digit for digit', async () => {
    const engine = newEngine();
    const run = jest
      .spyOn(engine.client, 'runQuery')
      .mockResolvedValue(responseOf(RESULT_TEXT));
    await engine.execute(MODEL, UNSAFE_INTEGER_LAMBDA);
    expect(run.mock.calls[0]?.[0]).toContain('"value":9007199254740993');
  });

  test('Sends the stamps of the nodes it runs, so their errors land on them', async () => {
    const engine = newEngine();
    const run = jest
      .spyOn(engine.client, 'runQuery')
      .mockResolvedValue(responseOf(RESULT_TEXT));
    await engine.execute(MODEL, SLICE_EXECUTION);
    const body = run.mock.calls[0]?.[0] as unknown as string;
    [
      `cube:relational101:${EmitRole.ACCESSOR}`,
      `cube:relational102:${EmitRole.ACCESSOR}`,
      `cube:join101:${EmitRole.KEY}`,
      `cube:filter101:${EmitRole.COLUMN}`,
    ].forEach((sourceId) => expect(body).toContain(`"sourceId":"${sourceId}"`));
  });

  test('Times a run from before its request to after its result', async () => {
    const engine = newEngine();
    let now = 1_000_000;
    jest.spyOn(Date, 'now').mockImplementation(() => now);
    jest.spyOn(engine.client, 'runQuery').mockImplementation(async () => {
      now += 250;
      return responseOf(RESULT_TEXT);
    });
    expect((await engine.execute(MODEL, SLICE_EXECUTION)).durationMs).toBe(250);
  });

  test('Cancels the request when the caller aborts the run', async () => {
    const engine = newEngine();
    let requested: (init: RequestInit | undefined) => void = () => undefined;
    const request = new Promise<RequestInit | undefined>((resolve) => {
      requested = resolve;
    });
    jest.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
      requested(init);
      // pending until its signal aborts, as a real request is
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () =>
          reject(new DOMException('The operation was aborted.', 'AbortError')),
        );
      });
    });
    const abortController = new AbortController();
    const outcome = engine
      .execute(MODEL, SLICE_EXECUTION, { abortController })
      .catch((error: unknown) => error);
    const first = await Promise.race([
      request.then((init) => ({ init })),
      outcome.then((error) => ({ error })),
    ]);
    if ('error' in first) {
      // a run that ends before its request fails here, with its own error
      throw first.error;
    }
    abortController.abort();
    expect(first.init?.signal?.aborted).toBe(true);
    const error = await outcome;
    expect(error).toBeInstanceOf(CubeEngineError);
    expect(error).toMatchObject({ nodeId: 'filter101' });
  });

  test("Places a failed run's error on its stamped node, or else on the node run", async () => {
    const engine = newEngine();
    const run = jest
      .spyOn(engine.client, 'runQuery')
      .mockRejectedValueOnce(
        networkError({
          errorType: 'COMPILATION',
          message: "Can't find the column 'X'",
          sourceInformation: { sourceId: 'cube:join101:key' },
        }),
      )
      .mockRejectedValueOnce(networkError({ message: 'Table not found' }));
    await expect(engine.execute(MODEL, SLICE_EXECUTION)).rejects.toMatchObject({
      kind: CubeEngineErrorKind.COMPILE,
      nodeId: 'join101',
    });
    await expect(engine.execute(MODEL, SLICE_EXECUTION)).rejects.toMatchObject({
      kind: CubeEngineErrorKind.EXECUTION,
      nodeId: 'filter101',
      firstLine: 'Table not found',
    });
    expect(run).toHaveBeenCalledTimes(2);
  });

  test('Reports a response it cannot read as an execution error on the node run', async () => {
    const engine = newEngine();
    jest
      .spyOn(engine.client, 'runQuery')
      .mockResolvedValue(
        responseOf('{"result": java.lang.NullPointerException'),
      );
    await expect(engine.execute(MODEL, SLICE_EXECUTION)).rejects.toMatchObject({
      kind: CubeEngineErrorKind.EXECUTION,
      nodeId: 'filter101',
    });
  });
});

describe('Legend Cube engine: Pure text', () => {
  test('Renders a lambda as pretty Pure text', async () => {
    const engine = newEngine();
    const render = jest
      .spyOn(engine.client, 'JSONToGrammar_lambda')
      .mockResolvedValue('|1');
    expect(
      await engine.renderPure(
        lambda([], [literal({ kind: 'integer', value: '1' })]),
      ),
    ).toBe('|1');
    expect(render.mock.calls[0]?.[1]).toBe('PRETTY');
  });

  test('Sends the lambda as text, so its numbers keep every digit', async () => {
    const engine = newEngine();
    const render = jest
      .spyOn(engine.client, 'JSONToGrammar_lambda')
      .mockResolvedValue('|9007199254740993');
    await engine.renderPure(
      lambda([], [literal({ kind: 'integer', value: '9007199254740993' })]),
    );
    const body = render.mock.calls[0]?.[0] as unknown;
    expect(typeof body).toBe('string');
    expect(body as string).toMatch(/"value":9007199254740993[,}]/u);
  });
});
